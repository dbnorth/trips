import db from "../models/index.js";
import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
} from "../authorization/accessControl.js";
import { buildTemplateMessage, sendTemplateEmail } from "../utils/emailDelivery.js";
import { cleanEmailBody, emailBodyIsBlank, pictureRuleError } from "../utils/emailHtml.js";

const Op = db.Sequelize.Op;
const FUNCTION_CODE = "Trip Participant";
const POTENTIAL = {
  roleNames: [ROLE_TRIP_PARTICIPANT, ROLE_TRIP_LEADER],
  statuses: ["incomplete", "applied", "approved"],
};
const SEND_TO = {
  potential: POTENTIAL,
  accepted: { roleNames: [ROLE_TRIP_PARTICIPANT], statuses: ["approved"] },
  selected: POTENTIAL,
};

const exports = {};

/** The trip when the user may email its team; otherwise sends the error response and returns null. */
const loadTripForTeamEmail = async (req, res) => {
  const access = await canAccessTrip(req, req.params.id);
  if (!access.trip) {
    res.status(404).send({ message: "Trip not found." });
    return null;
  }
  const { trip } = access;
  const allowed =
    isSystemAdmin(req) || isOrgAdminForOrg(req, trip.orgId) || isTripLeaderForTrip(req, trip.id);
  if (!allowed) {
    res.status(403).send({ message: "Forbidden." });
    return null;
  }
  return trip;
};

const tripTemplatesWhere = (trip) => ({
  functionCode: FUNCTION_CODE,
  [Op.or]: [{ tripId: trip.id }, { tripId: null, orgId: trip.orgId }],
});

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();

const badRequest = (message) => ({ error: { status: 400, message } });

/** Validate a preview or send body: the template, edited subject and body, and the recipients' people. */
const readTeamEmailRequest = async (trip, body) => {
  const template = body.emailTemplateId
    ? await db.emailTemplate.findOne({
        where: { id: Number(body.emailTemplateId), ...tripTemplatesWhere(trip) },
      })
    : null;
  if (!template) return badRequest("Choose a Trip Participant template for this trip.");

  const subject = typeof body.subject === "string" ? body.subject : "";
  const emailBody = cleanEmailBody(typeof body.emailBody === "string" ? body.emailBody : "");
  if (!subject.trim()) return badRequest("Subject is required.");
  if (emailBodyIsBlank(emailBody)) return badRequest("Email body is required.");
  const pictureError = await pictureRuleError(emailBody, trip.orgId);
  if (pictureError) return badRequest(pictureError);

  const sendTo = SEND_TO[body.sendTo];
  if (!sendTo) return badRequest("Send to must be potential, accepted, or selected.");

  const roles = await db.role.findAll({ where: { roleName: sendTo.roleNames } });
  const assignments = await db.tripPeopleRole.findAll({
    where: { tripId: trip.id, roleId: roles.map((r) => r.id), status: sendTo.statuses },
    include: [{ model: db.person, as: "person", attributes: ["id", "firstName", "lastName", "email"] }],
    order: [["id", "ASC"]],
  });
  const byId = new Map();
  for (const { person } of assignments) {
    if (person && !byId.has(person.id)) byId.set(person.id, person);
  }
  let people = [...byId.values()];

  if (body.sendTo === "selected") {
    const ids = Array.isArray(body.personIds) ? body.personIds.map(Number) : [];
    const potentialIds = new Set(people.map((p) => p.id));
    if (!ids.length) return badRequest("Choose at least one participant.");
    if (ids.some((id) => !potentialIds.has(id))) {
      return badRequest("Selected participants must be potential participants on this trip.");
    }
    people = people.filter((p) => ids.includes(p.id));
  }
  if (!people.length) return badRequest("No participants to send to.");

  return { template, subject, emailBody, people };
};

const messageOptions = (trip, request, person) => ({
  template: request.template,
  tripId: trip.id,
  personId: person.id,
  toEmail: person.email ?? "",
  subject: request.subject,
  emailBody: request.emailBody,
});

exports.findTemplates = async (req, res) => {
  try {
    const trip = await loadTripForTeamEmail(req, res);
    if (!trip) return;
    const data = await db.emailTemplate.findAll({
      where: tripTemplatesWhere(trip),
      attributes: ["id", "tripId", "subject", "emailBody", "fromEmail", "emailTypeId"],
      order: [
        ["subject", "ASC"],
        ["id", "ASC"],
      ],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const trip = await loadTripForTeamEmail(req, res);
    if (!trip) return;
    const request = await readTeamEmailRequest(trip, req.body);
    if (request.error) return res.status(request.error.status).send({ message: request.error.message });
    const person = request.people.find((p) => p.id === Number(req.body.personId));
    if (!person) {
      return res.status(400).send({ message: "Preview participant must be one of the recipients." });
    }
    const { message, reason, previewHtml, attachmentError, pictureError } =
      await buildTemplateMessage(messageOptions(trip, request, person));
    if (!message) return res.status(400).send({ message: reason });
    res.send({
      from: message.from,
      replyTo: message.replyTo ?? null,
      to: message.to,
      subject: message.subject,
      body: previewHtml,
      attachments: (message.attachments ?? []).filter((file) => !file.cid).map((file) => file.filename),
      attachmentError,
      pictureError,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.send = async (req, res) => {
  try {
    const trip = await loadTripForTeamEmail(req, res);
    if (!trip) return;
    const request = await readTeamEmailRequest(trip, req.body);
    if (request.error) return res.status(request.error.status).send({ message: request.error.message });

    const counts = { sent: 0, skipped: 0, failed: 0 };
    const results = [];
    for (const person of request.people) {
      const result = await sendTemplateEmail(messageOptions(trip, request, person));
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
