import db from "../models/index.js";
import {
  isSystemAdmin,
  parseOrganizationScopeHeader,
  ROLE_ORG_ADMIN,
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
} from "../authorization/accessControl.js";
import { buildTemplateMessage, sendTemplateEmail } from "../utils/emailDelivery.js";

const PERSON = "Person";
const TRIP_PARTICIPANT = "Trip Participant";

const exports = {};

const badRequest = (message) => ({ error: { status: 400, message } });

/** The acting organization when the user may email its people; otherwise sends the error response and returns null. */
const loadActingOrgId = (req, res) => {
  const scoped = parseOrganizationScopeHeader(req);
  let orgId = scoped;
  if (!isSystemAdmin(req)) {
    const adminOrgIds = [
      ...new Set(
        (req.user?.orgRoles || [])
          .filter((r) => r.role?.roleName === ROLE_ORG_ADMIN)
          .map((r) => Number(r.orgId))
      ),
    ];
    if (scoped == null && adminOrgIds.length === 1) orgId = adminOrgIds[0];
    if (!adminOrgIds.length || (orgId != null && !adminOrgIds.includes(orgId))) {
      res.status(403).send({ message: "Forbidden." });
      return null;
    }
  }
  if (orgId == null) {
    res.status(400).send({ message: "Select an organization in the menu bar." });
    return null;
  }
  return orgId;
};

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();

const byLastThenFirst = (a, b) =>
  String(a.lastName || "").localeCompare(String(b.lastName || ""), undefined, { sensitivity: "base" }) ||
  String(a.firstName || "").localeCompare(String(b.firstName || ""), undefined, { sensitivity: "base" }) ||
  a.id - b.id;

const selectedIds = (value) =>
  Array.isArray(value) ? [...new Set(value.map(Number))] : [];

/** Approved Trip Participants and Trip Leaders on the selected trips with a selected worker role, each person once. */
const loadRecipients = async (orgId, body) => {
  const orgTrips = await db.trip.findAll({ where: { orgId }, attributes: ["id"] });
  const orgTripIds = orgTrips.map((t) => t.id);

  let tripIds = orgTripIds;
  if (body?.tripIds !== "all") {
    tripIds = selectedIds(body?.tripIds);
    if (!tripIds.length) return badRequest("Choose at least one trip.");
    if (tripIds.some((id) => !orgTripIds.includes(id))) {
      return badRequest("Trips must belong to this organization.");
    }
  }

  const where = { tripId: tripIds, status: "approved" };
  if (body?.workerRoleIds !== "all") {
    const roleIds = selectedIds(body?.workerRoleIds);
    if (!roleIds.length) return badRequest("Choose at least one role.");
    const tripRoles = tripIds.length
      ? await db.tripWorkerRole.findAll({
          where: { tripId: tripIds },
          attributes: ["id", "workerRoleId"],
        })
      : [];
    const onTrips = new Set(tripRoles.map((r) => r.workerRoleId));
    if (roleIds.some((id) => !onTrips.has(id))) {
      return badRequest("Roles must be on the selected trips.");
    }
    where.tripWorkerRoleId = tripRoles.filter((r) => roleIds.includes(r.workerRoleId)).map((r) => r.id);
  }

  const memberRoles = await db.role.findAll({
    where: { roleName: [ROLE_TRIP_PARTICIPANT, ROLE_TRIP_LEADER] },
    attributes: ["id"],
  });
  const assignments = tripIds.length
    ? await db.tripPeopleRole.findAll({
        where: { ...where, roleId: memberRoles.map((r) => r.id) },
        include: [{ model: db.person, as: "person", attributes: ["id", "firstName", "lastName", "email"] }],
      })
    : [];
  const byId = new Map();
  for (const { person } of assignments) {
    if (person && !byId.has(person.id)) byId.set(person.id, person);
  }
  return { orgTripIds, tripIds, people: [...byId.values()].sort(byLastThenFirst) };
};

/**
 * The organization's Person template, or a Trip Participant template of the single selected trip
 * (with that trip for its tokens).
 */
const loadTemplate = async (orgId, selection, emailTemplateId) => {
  const template = emailTemplateId ? await db.emailTemplate.findByPk(Number(emailTemplateId)) : null;
  const inOrg =
    template &&
    (template.tripId != null
      ? selection.orgTripIds.includes(template.tripId)
      : Number(template.orgId) === orgId);
  if (inOrg && template.functionCode === PERSON && template.tripId == null) {
    return { template, tripId: null };
  }
  if (inOrg && template.functionCode === TRIP_PARTICIPANT) {
    const [tripId] = selection.tripIds;
    const forTrip =
      selection.tripIds.length === 1 && (template.tripId == null || template.tripId === tripId);
    if (!forTrip) return badRequest("Trip Participant templates need exactly one trip selected.");
    return { template, tripId };
  }
  return badRequest("Choose a template for this organization.");
};

/** Validate a preview or send body: the selection, template, and edited subject and body. */
const readPeopleEmailRequest = async (orgId, body) => {
  const selection = await loadRecipients(orgId, body);
  if (selection.error) return selection;
  const chosen = await loadTemplate(orgId, selection, body?.emailTemplateId);
  if (chosen.error) return chosen;

  const subject = typeof body.subject === "string" ? body.subject : "";
  const emailBody = typeof body.emailBody === "string" ? body.emailBody : "";
  if (!subject.trim()) return badRequest("Subject is required.");
  if (!emailBody.trim()) return badRequest("Email body is required.");
  if (!selection.people.length) return badRequest("No people to send to.");

  return { ...chosen, subject, emailBody, people: selection.people };
};

const messageOptions = (request, person) => ({
  template: request.template,
  tripId: request.tripId,
  personId: person.id,
  toEmail: person.email ?? "",
  subject: request.subject,
  emailBody: request.emailBody,
});

const sendError = (res, { error }) => res.status(error.status).send({ message: error.message });

exports.options = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const templates = await db.emailTemplate.findAll({
      where: { orgId, tripId: null, functionCode: PERSON },
      attributes: ["id", "subject", "emailBody", "fromEmail", "emailTypeId"],
      order: [
        ["subject", "ASC"],
        ["id", "ASC"],
      ],
    });
    const trips = await db.trip.findAll({
      where: { orgId },
      attributes: ["id", "name", "startDate"],
      order: [
        ["startDate", "DESC"],
        ["id", "DESC"],
      ],
    });
    const tripRoles = trips.length
      ? await db.tripWorkerRole.findAll({
          where: { tripId: trips.map((t) => t.id) },
          attributes: ["tripId", "workerRoleId"],
          include: [{ model: db.workerRole, as: "workerRole", attributes: ["id", "name"] }],
        })
      : [];
    const rolesByTrip = new Map();
    for (const row of tripRoles) {
      if (!row.workerRole) continue;
      const roles = rolesByTrip.get(row.tripId) ?? new Map();
      roles.set(row.workerRoleId, { workerRoleId: row.workerRoleId, name: row.workerRole.name });
      rolesByTrip.set(row.tripId, roles);
    }
    res.send({
      templates,
      trips: trips.map((trip) => ({
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        roles: [...(rolesByTrip.get(trip.id)?.values() ?? [])].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      })),
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.recipients = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const selection = await loadRecipients(orgId, req.body);
    if (selection.error) return sendError(res, selection);
    res.send(selection.people.map((person) => ({ personId: person.id, name: personName(person) })));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const request = await readPeopleEmailRequest(orgId, req.body);
    if (request.error) return sendError(res, request);
    const person = request.people.find((p) => p.id === Number(req.body.personId));
    if (!person) {
      return res.status(400).send({ message: "Preview person must be one of the recipients." });
    }
    const { message, reason, attachmentError } = await buildTemplateMessage(
      messageOptions(request, person)
    );
    if (!message) return res.status(400).send({ message: reason });
    res.send({
      from: message.from,
      replyTo: message.replyTo ?? null,
      to: message.to,
      subject: message.subject,
      body: message.text,
      attachments: (message.attachments ?? []).map((file) => file.filename),
      attachmentError,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.send = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const request = await readPeopleEmailRequest(orgId, req.body);
    if (request.error) return sendError(res, request);

    const counts = { sent: 0, skipped: 0, failed: 0 };
    const results = [];
    for (const person of request.people) {
      const result = await sendTemplateEmail(messageOptions(request, person));
      counts[result.status] += 1;
      results.push({
        personId: person.id,
        name: personName(person),
        status: result.status,
        reason: result.reason ?? null,
      });
    }
    res.send({ ...counts, results });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
