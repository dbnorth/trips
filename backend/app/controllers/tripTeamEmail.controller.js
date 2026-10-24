import db from "../models/index.js";
import {
  canAccessTrip,
  isAgentForOrg,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
} from "../authorization/accessControl.js";
import { buildTemplateMessage, sendTemplateEmail } from "../utils/emailDelivery.js";
import { cleanEmailBody, emailBodyIsBlank, pictureRuleError } from "../utils/emailHtml.js";
import { loadParticipantFlight } from "../utils/emailTokenValues.js";

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

const tripTemplatesWhere = (trip) => ({
  functionCode: FUNCTION_CODE,
  [Op.or]: [{ tripId: trip.id }, { tripId: null, orgId: trip.orgId }],
});

const canEmailTeam = (req, trip) =>
  isSystemAdmin(req) || isOrgAdminForOrg(req, trip.orgId) || isTripLeaderForTrip(req, trip.id);

/** Email team (Feature 46): any Trip Participant template, trip staff only. */
const TEAM_EMAIL = {
  canSend: canEmailTeam,
  templatesWhere: async (trip) => tripTemplatesWhere(trip),
  templateError: "Choose a Trip Participant template for this trip.",
  skipReason: async () => null,
};

/** Email flight itinerary (Feature 86): Flight itinerary templates, everyone who can open the Flights page. */
const FLIGHT_ITINERARY_EMAIL = {
  canSend: (req, trip) => canEmailTeam(req, trip) || isAgentForOrg(req, trip.orgId),
  templatesWhere: async (trip) => {
    const type = await db.emailType.findOne({ where: { typeCode: "flight-itinerary" } });
    return { ...tripTemplatesWhere(trip), emailTypeId: type ? type.id : [] };
  },
  templateError: "Choose a flight itinerary template for this trip.",
  skipReason: async (trip, person) =>
    (await loadParticipantFlight(trip.id, person.id)) ? null : "No flight segments.",
};

/** The trip when the user may send this kind of email; otherwise sends the error response and returns null. */
const loadTripForEmail = async (kind, req, res) => {
  const access = await canAccessTrip(req, req.params.id);
  if (!access.trip) {
    res.status(404).send({ message: "Trip not found." });
    return null;
  }
  const { trip } = access;
  if (!kind.canSend(req, trip)) {
    res.status(403).send({ message: "Forbidden." });
    return null;
  }
  return trip;
};

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();

const badRequest = (message) => ({ error: { status: 400, message } });

/** Validate a preview or send body: the template, edited subject and body, and the recipients' people. */
const readTeamEmailRequest = async (kind, trip, body) => {
  const template = body.emailTemplateId
    ? await db.emailTemplate.findOne({
        where: { id: Number(body.emailTemplateId), ...(await kind.templatesWhere(trip)) },
      })
    : null;
  if (!template) return badRequest(kind.templateError);

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

const findTemplates = (kind) => async (req, res) => {
  try {
    const trip = await loadTripForEmail(kind, req, res);
    if (!trip) return;
    const data = await db.emailTemplate.findAll({
      where: await kind.templatesWhere(trip),
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

const preview = (kind) => async (req, res) => {
  try {
    const trip = await loadTripForEmail(kind, req, res);
    if (!trip) return;
    const request = await readTeamEmailRequest(kind, trip, req.body);
    if (request.error) return res.status(request.error.status).send({ message: request.error.message });
    const person = request.people.find((p) => p.id === Number(req.body.personId));
    if (!person) {
      return res.status(400).send({ message: "Preview participant must be one of the recipients." });
    }
    const skipReason = await kind.skipReason(trip, person);
    if (skipReason) return res.status(400).send({ message: skipReason });
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

const send = (kind) => async (req, res) => {
  try {
    const trip = await loadTripForEmail(kind, req, res);
    if (!trip) return;
    const request = await readTeamEmailRequest(kind, trip, req.body);
    if (request.error) return res.status(request.error.status).send({ message: request.error.message });

    const counts = { sent: 0, skipped: 0, failed: 0 };
    const results = [];
    for (const person of request.people) {
      const skipReason = await kind.skipReason(trip, person);
      const result = skipReason
        ? { status: "skipped", reason: skipReason }
        : await sendTemplateEmail(messageOptions(trip, request, person));
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

exports.findTemplates = findTemplates(TEAM_EMAIL);
exports.preview = preview(TEAM_EMAIL);
exports.send = send(TEAM_EMAIL);
exports.findFlightItineraryTemplates = findTemplates(FLIGHT_ITINERARY_EMAIL);
exports.previewFlightItinerary = preview(FLIGHT_ITINERARY_EMAIL);
exports.sendFlightItinerary = send(FLIGHT_ITINERARY_EMAIL);

export default exports;
