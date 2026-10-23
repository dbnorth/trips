import db from "../models/index.js";
import { Op } from "sequelize";
import {
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
  parseOrganizationScopeHeader,
  ROLE_ORG_ADMIN,
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
} from "../authorization/accessControl.js";
import {
  attachmentsAreValid,
  buildTokenValues,
  recipientsAreValid,
  senderIsValid,
  substituteRecipients,
  substituteTokens,
} from "../utils/emailTokenValues.js";
import { loadAttachments } from "../utils/emailDelivery.js";

const EmailTemplate = db.emailTemplate;
const EmailType = db.emailType;
const Trip = db.trip;
const Organization = db.organization;
const FUNCTION_CODES = ["Scheduled", "Send Now", "Trip Participant", "Person"];
const PERSON_ON_TRIP = "Person templates cannot belong to a trip.";
const SCHEDULE_RULES = ["daily", "weekly", "before-start"];
const templateFields = [
  "tripId",
  "fromEmail",
  "functionCode",
  "subject",
  "content",
  "attachment",
  "emailTypeId",
  "emailBody",
  "toAddress",
];

const getOrgAdminOrgIds = (req) => [
  ...new Set(
    (req.user?.orgRoles || [])
      .filter((r) => r.role?.roleName === ROLE_ORG_ADMIN)
      .map((r) => Number(r.orgId))
  ),
];

const getTripLeaderTripIds = (req, orgId = null) => {
  const roles = (req.user?.tripRoles || []).filter(
    (r) => r.role?.roleName === ROLE_TRIP_LEADER && r.status === "approved"
  );
  const ids = roles
    .filter((r) => {
      if (orgId == null || orgId === "") return true;
      const tripOrgId = r.trip?.orgId;
      return tripOrgId != null && Number(tripOrgId) === Number(orgId);
    })
    .map((r) => Number(r.tripId));
  return [...new Set(ids)];
};

const resolveTemplateOrgId = (req, bodyOrgId) => {
  if (bodyOrgId != null && bodyOrgId !== "") {
    return Number(bodyOrgId);
  }
  const scoped = parseOrganizationScopeHeader(req);
  if (isSystemAdmin(req)) return scoped;
  const adminOrgIds = getOrgAdminOrgIds(req);
  if (scoped != null && adminOrgIds.includes(scoped)) return scoped;
  if (adminOrgIds.length === 1) return adminOrgIds[0];
  return scoped ?? adminOrgIds[0] ?? null;
};

const resolveCreateOrgId = (req) => {
  if (Object.prototype.hasOwnProperty.call(req.body, "orgId")) {
    const raw = req.body.orgId;
    if (raw == null || raw === "") {
      if (!isSystemAdmin(req)) return { error: { status: 403, message: "Forbidden." } };
      return { orgId: null };
    }
    return { orgId: Number(raw) };
  }
  const orgId = resolveTemplateOrgId(req);
  if (orgId == null && !isSystemAdmin(req)) {
    return { error: { status: 400, message: "Organization is required." } };
  }
  return { orgId };
};

const canManageTemplate = (req, template) => {
  if (template.orgId == null) return isSystemAdmin(req);
  if (isOrgAdminForOrg(req, template.orgId)) return true;
  if (template.tripId != null && isTripLeaderForTrip(req, template.tripId)) return true;
  return false;
};

const loadTemplate = (id) =>
  EmailTemplate.findByPk(id, {
    include: [
      { model: Trip, as: "trip", attributes: ["id", "name", "orgId"] },
      { model: Organization, attributes: ["id", "name"] },
      { model: EmailType, attributes: ["id", "typeCode", "description", "eventCode"] },
    ],
  });

const validateTripForOrg = async (tripId, orgId) => {
  if (tripId == null || tripId === "") return { ok: true, tripId: null };
  if (orgId == null) {
    return { ok: false, status: 400, message: "Trip cannot be set on a global template." };
  }
  const trip = await Trip.findByPk(tripId, { attributes: ["id", "orgId"] });
  if (!trip) return { ok: false, status: 400, message: "Trip not found." };
  if (Number(trip.orgId) !== Number(orgId)) {
    return { ok: false, status: 400, message: "Trip must belong to the selected organization." };
  }
  return { ok: true, tripId: trip.id };
};

const pickTemplatePayload = (body) => {
  const payload = {};
  for (const key of templateFields) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const val = body[key];
    if (key === "tripId" || key === "emailTypeId") {
      payload[key] = val == null || val === "" ? null : Number(val);
    } else if (typeof val === "string") {
      payload[key] = val.trim() || null;
    } else {
      payload[key] = val ?? null;
    }
  }
  return payload;
};

const listIncludes = [
  { model: Trip, attributes: ["id", "name", "orgId"] },
  { model: Organization, attributes: ["id", "name"] },
  { model: EmailType, attributes: ["id", "typeCode", "description", "eventCode"] },
];

const hasFeature39Fields = (body) =>
  Object.prototype.hasOwnProperty.call(body, "emailTypeId") ||
  Object.prototype.hasOwnProperty.call(body, "emailBody");

const trimRequired = (val) => (typeof val === "string" ? val.trim() : "");

const ATTACHMENT_INVALID = "Attachment may only list attachment tokens.";

const attachmentError = async (body) =>
  Object.prototype.hasOwnProperty.call(body, "attachment") && !(await attachmentsAreValid(body.attachment))
    ? ATTACHMENT_INVALID
    : null;

const validateSchedule = (body, functionCode) => {
  if (functionCode !== "Scheduled") {
    return { schedule: { scheduleRule: null, scheduleDaysBefore: null } };
  }
  const scheduleRule = trimRequired(body.scheduleRule);
  if (!SCHEDULE_RULES.includes(scheduleRule)) {
    return { error: { status: 400, message: "Schedule is required for scheduled templates." } };
  }
  if (scheduleRule !== "before-start") {
    return { schedule: { scheduleRule, scheduleDaysBefore: null } };
  }
  const raw = body.scheduleDaysBefore;
  const days = Number(raw);
  if (raw == null || String(raw).trim() === "" || !Number.isInteger(days) || days < 1 || days > 365) {
    return {
      error: { status: 400, message: "Days before trip start must be a whole number from 1 to 365." },
    };
  }
  return { schedule: { scheduleRule, scheduleDaysBefore: days } };
};

const validateOrganizationTemplateFields = async (body) => {
  const typeRaw = body.emailTypeId;
  if (typeRaw == null || typeRaw === "") {
    return { error: { status: 400, message: "Email type is required." } };
  }
  const emailType = await EmailType.findByPk(Number(typeRaw));
  if (!emailType) {
    return { error: { status: 400, message: "Email type is required." } };
  }
  const functionCode = trimRequired(body.functionCode);
  if (!FUNCTION_CODES.includes(functionCode)) {
    return { error: { status: 400, message: "Function code must be Scheduled, Send Now, Trip Participant, or Person." } };
  }
  const { schedule, error: scheduleError } = validateSchedule(body, functionCode);
  if (scheduleError) return { error: scheduleError };
  if (!trimRequired(body.subject)) {
    return { error: { status: 400, message: "Subject is required." } };
  }
  if (!trimRequired(body.fromEmail)) {
    return { error: { status: 400, message: "From email is required." } };
  }
  if (!(await senderIsValid(body.fromEmail))) {
    return {
      error: { status: 400, message: "From email must be an email address or an email token." },
    };
  }
  const toAddress = trimRequired(body.toAddress);
  if (!toAddress) {
    return { error: { status: 400, message: "To is required." } };
  }
  if (!(await recipientsAreValid(toAddress))) {
    return {
      error: {
        status: 400,
        message: "To must list email addresses or email tokens, separated by commas.",
      },
    };
  }
  if (!trimRequired(body.emailBody)) {
    return { error: { status: 400, message: "Email body is required." } };
  }
  return { ok: true, schedule };
};

const copySourceAttributes = [
  "id",
  "functionCode",
  "fromEmail",
  "toAddress",
  "subject",
  "content",
  "attachment",
  "scheduleRule",
  "scheduleDaysBefore",
];

const hasFunctionCode = {
  functionCode: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] },
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const orgId = resolveTemplateOrgId(req);
    let leaderTripIds = getTripLeaderTripIds(req, orgId);

    if (isSystemAdmin(req) && orgId == null) {
      const data = await EmailTemplate.findAll({
        where: { orgId: null },
        include: listIncludes,
        order: [
          ["functionCode", "ASC"],
          ["subject", "ASC"],
        ],
      });
      return res.send(data);
    }

    if (orgId && isOrgAdminForOrg(req, orgId)) {
      const data = await EmailTemplate.findAll({
        where: { orgId },
        include: listIncludes,
        order: [
          ["functionCode", "ASC"],
          ["subject", "ASC"],
        ],
      });
      return res.send(data);
    }

    if (leaderTripIds.length) {
      const queryTripId = req.query.tripId;
      let where = { tripId: { [Op.in]: leaderTripIds } };
      if (queryTripId != null && queryTripId !== "") {
        const id = Number(queryTripId);
        if (!leaderTripIds.includes(id)) {
          return res.status(403).send({ message: "Forbidden." });
        }
        where = { tripId: id };
      }

      const data = await EmailTemplate.findAll({
        where,
        include: listIncludes,
        order: [
          ["functionCode", "ASC"],
          ["subject", "ASC"],
        ],
      });
      return res.send(data);
    }

    if (!orgId) return res.send([]);
    return res.status(403).send({ message: "Forbidden." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const template = await loadTemplate(req.params.id);
    if (!template) return res.status(404).send({ message: "Template not found." });
    if (!canManageTemplate(req, template)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    res.send(template);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.copySources = async (req, res) => {
  try {
    const orgId = resolveTemplateOrgId(req);
    const tripId = req.query.tripId;

    if (tripId == null || tripId === "") {
      const data = await EmailTemplate.findAll({
        where: { orgId: null, ...hasFunctionCode },
        attributes: copySourceAttributes,
        order: [
          ["functionCode", "ASC"],
          ["subject", "ASC"],
        ],
      });
      return res.send(data);
    }

    if (!orgId) {
      return res.status(400).send({ message: "Organization is required." });
    }
    const tripIdNum = Number(tripId);
    const canUseOrgSources =
      isOrgAdminForOrg(req, orgId) || isTripLeaderForTrip(req, tripIdNum);
    if (!canUseOrgSources) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const data = await EmailTemplate.findAll({
      where: { orgId, tripId: null, ...hasFunctionCode },
      attributes: copySourceAttributes,
      order: [
        ["functionCode", "ASC"],
        ["subject", "ASC"],
      ],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const feature39 = hasFeature39Fields(req.body);
    if (feature39 && (req.body.orgId == null || req.body.orgId === "")) {
      return res.status(400).send({ message: "Organization is required." });
    }

    const resolved = resolveCreateOrgId(req);
    if (resolved.error) {
      return res.status(resolved.error.status).send({ message: resolved.error.message });
    }
    let { orgId } = resolved;
    const tripId =
      req.body.tripId != null && req.body.tripId !== "" ? Number(req.body.tripId) : null;

    const isOrgAdmin = orgId != null && isOrgAdminForOrg(req, orgId);
    const isLeaderCreate = tripId != null && isTripLeaderForTrip(req, tripId);

    let schedule = {};
    if (feature39) {
      if (orgId == null) {
        return res.status(400).send({ message: "Organization is required." });
      }
      if (!isSystemAdmin(req) && !isOrgAdmin && !isLeaderCreate) {
        return res.status(403).send({ message: "Forbidden." });
      }
      const fields = await validateOrganizationTemplateFields(req.body);
      if (fields.error) {
        return res.status(fields.error.status).send({ message: fields.error.message });
      }
      schedule = fields.schedule;
    } else if (!isOrgAdmin && !isLeaderCreate) {
      return res.status(403).send({ message: "Forbidden." });
    }

    if (!feature39 && !req.body.subject?.trim()) {
      return res.status(400).send({ message: "Subject is required." });
    }
    const createAttachmentError = await attachmentError(req.body);
    if (createAttachmentError) return res.status(400).send({ message: createAttachmentError });

    if (isLeaderCreate && !isOrgAdmin && !isSystemAdmin(req)) {
      const trip = await Trip.findByPk(tripId, { attributes: ["id", "orgId"] });
      if (!trip) return res.status(400).send({ message: "Trip not found." });
      orgId = trip.orgId;
    }

    const tripCheck = await validateTripForOrg(
      isLeaderCreate && !isOrgAdmin ? tripId : req.body.tripId,
      orgId
    );
    if (!tripCheck.ok) return res.status(tripCheck.status).send({ message: tripCheck.message });

    const payload = { ...pickTemplatePayload(req.body), ...schedule };
    if (orgId == null) payload.tripId = null;
    if (isLeaderCreate && !isOrgAdmin) payload.tripId = tripId;
    if (payload.functionCode === "Person" && payload.tripId != null) {
      return res.status(400).send({ message: PERSON_ON_TRIP });
    }

    const data = await EmailTemplate.create({ ...payload, orgId });
    res.send(await loadTemplate(data.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const template = await EmailTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).send({ message: "Template not found." });
    if (!canManageTemplate(req, template)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const feature39 = hasFeature39Fields(req.body);
    let orgId = template.orgId;
    let schedule = {};
    if (feature39) {
      if (Object.prototype.hasOwnProperty.call(req.body, "orgId")) {
        if (req.body.orgId == null || req.body.orgId === "") {
          return res.status(400).send({ message: "Organization is required." });
        }
        orgId = Number(req.body.orgId);
      }
      if (orgId == null) {
        return res.status(400).send({ message: "Organization is required." });
      }
      const orgChanged = template.orgId == null || Number(orgId) !== Number(template.orgId);
      if (orgChanged) {
        if (!isSystemAdmin(req) && !isOrgAdminForOrg(req, orgId)) {
          return res.status(403).send({ message: "Forbidden." });
        }
        if (
          template.orgId != null &&
          !isSystemAdmin(req) &&
          !isOrgAdminForOrg(req, template.orgId)
        ) {
          return res.status(403).send({ message: "Forbidden." });
        }
        if (template.orgId == null && !isSystemAdmin(req)) {
          return res.status(403).send({ message: "Forbidden." });
        }
      }
      const fields = await validateOrganizationTemplateFields(req.body);
      if (fields.error) {
        return res.status(fields.error.status).send({ message: fields.error.message });
      }
      schedule = fields.schedule;
    } else if (Object.prototype.hasOwnProperty.call(req.body, "subject") && !req.body.subject?.trim()) {
      return res.status(400).send({ message: "Subject is required." });
    }
    const updateAttachmentError = await attachmentError(req.body);
    if (updateAttachmentError) return res.status(400).send({ message: updateAttachmentError });

    const tripId = Object.prototype.hasOwnProperty.call(req.body, "tripId")
      ? req.body.tripId
      : template.tripId;
    const tripCheck = await validateTripForOrg(tripId, feature39 ? orgId : template.orgId);
    if (!tripCheck.ok) return res.status(tripCheck.status).send({ message: tripCheck.message });

    const payload = { ...pickTemplatePayload(req.body), ...schedule };
    if (feature39) payload.orgId = orgId;
    if ((feature39 ? orgId : template.orgId) == null) payload.tripId = null;
    const functionCode = payload.functionCode ?? template.functionCode;
    const savedTripId = payload.tripId !== undefined ? payload.tripId : template.tripId;
    if (functionCode === "Person" && savedTripId != null) {
      return res.status(400).send({ message: PERSON_ON_TRIP });
    }

    await template.update(payload);
    res.send(await loadTemplate(template.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const { orgId, tripId, personId, fromEmail, toAddress, subject, emailBody, attachment } =
      req.body || {};
    if (orgId == null || orgId === "") {
      return res.status(400).send({ message: "Organization is required." });
    }
    if (tripId == null || tripId === "") {
      return res.status(400).send({ message: "Trip is required." });
    }
    const trip = await Trip.findByPk(Number(tripId), { attributes: ["id", "orgId"] });
    if (!trip || Number(trip.orgId) !== Number(orgId)) {
      return res.status(400).send({ message: "Trip must belong to the selected organization." });
    }
    const canPreview =
      isSystemAdmin(req) ||
      isOrgAdminForOrg(req, Number(orgId)) ||
      isTripLeaderForTrip(req, trip.id);
    if (!canPreview) return res.status(403).send({ message: "Forbidden." });

    let previewPersonId = null;
    if (personId != null && personId !== "") {
      const participantRole = await db.role.findOne({
        where: { roleName: ROLE_TRIP_PARTICIPANT },
      });
      const application = participantRole
        ? await db.tripPeopleRole.findOne({
            where: { tripId: trip.id, peopleId: Number(personId), roleId: participantRole.id },
          })
        : null;
      if (!application) {
        return res.status(400).send({ message: "Participant must have an application on this trip." });
      }
      previewPersonId = Number(personId);
    }

    const values = await buildTokenValues({
      orgId: Number(orgId),
      tripId: trip.id,
      personId: previewPersonId,
    });
    const { attachments, error } = await loadAttachments(attachment, trip.id);
    res.send({
      fromEmail: substituteTokens(fromEmail, values).trim(),
      toAddress: substituteRecipients(toAddress, values),
      subject: substituteTokens(subject, values),
      emailBody: substituteTokens(emailBody, values),
      attachments: attachments.map((file) => file.filename),
      attachmentError: error ?? null,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const template = await EmailTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).send({ message: "Template not found." });
    if (!canManageTemplate(req, template)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    await template.destroy();
    res.send({ message: "Template deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
