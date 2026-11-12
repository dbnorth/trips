import { Op } from "sequelize";
import db from "../models/index.js";
import {
  isSystemAdmin,
  parseOrganizationScopeHeader,
  ROLE_ORG_ADMIN,
} from "../authorization/accessControl.js";
import { buildTemplateMessage, sendTemplateEmail } from "../utils/emailDelivery.js";
import { emailBodyIsBlank } from "../utils/emailHtml.js";
import { countedDonations } from "../utils/donationCounting.js";
import { donationCalendarYear, emailCalendarYear } from "../utils/emailTokenValues.js";

const DONOR = "Donor";
const exports = {};

const badRequest = (message) => ({ error: { status: 400, message } });

/** The acting organization when the user may email its donors; otherwise sends the error and returns null. */
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

const donorName = (donor) =>
  donor?.donorType === "organization"
    ? String(donor.organizationName || "").trim()
    : [donor?.firstName, donor?.lastName].filter(Boolean).join(" ").trim();

const byShownName = (a, b) => {
  const name = (donor) =>
    donor.donorType === "organization"
      ? String(donor.organizationName || "")
      : `${donor.lastName || ""}\n${donor.firstName || ""}`;
  return name(a).localeCompare(name(b), undefined, { sensitivity: "base" }) || a.id - b.id;
};

const hasEmail = (donor) => String(donor?.email || "").trim() !== "";

const sendable = (donor) => donor && donor.status !== "dontcontact" && hasEmail(donor);

const sendError = (res, { error }) => res.status(error.status).send({ message: error.message });

const loadTemplate = async (orgId, emailTemplateId) => {
  const template = await db.emailTemplate.findOne({
    where: { id: emailTemplateId, orgId, tripId: null, functionCode: DONOR },
  });
  if (!template) return badRequest("Choose a template for this organization.");
  return { template };
};

const readMessage = async (orgId, body) => {
  const chosen = await loadTemplate(orgId, body?.emailTemplateId);
  if (chosen.error) return chosen;
  const subject = String(body?.subject ?? "").trim();
  if (!subject) return badRequest("Subject is required.");
  const emailBody = body?.emailBody ?? "";
  if (emailBodyIsBlank(emailBody)) return badRequest("Email body is required.");
  return { ...chosen, subject, emailBody };
};

/** Donors of the organization who can be emailed, narrowed by the dialog's choice. */
const loadRecipients = async (orgId, body) => {
  const scope = body?.scope;
  if (scope !== "all" && scope !== "this-year" && scope !== "trip") return badRequest("Choose a trip.");

  const donors = await db.donor.findAll({ where: { orgId } });
  let matched = donors.filter(sendable);

  if (scope === "this-year" || scope === "trip") {
    let tripId = null;
    if (scope === "trip") {
      tripId = Number(body?.tripId);
      if (!tripId) return badRequest("Choose a trip.");
      const trip = await db.trip.findOne({ where: { id: tripId, orgId }, attributes: ["id"] });
      if (!trip) return badRequest("Trips must belong to this organization.");
    }
    const year = emailCalendarYear();
    const rows = await db.tripDonation.findAll({
      where: countedDonations(tripId ? { tripId } : {}),
      include: [{ model: db.trip, as: "trip", where: { orgId }, attributes: ["id", "orgId"] }],
      attributes: ["id", "donorId", "dateTime"],
    });
    const donorIds = new Set();
    for (const row of rows) {
      if (scope === "this-year" && donationCalendarYear(row.dateTime) !== year) continue;
      if (row.donorId != null) donorIds.add(row.donorId);
    }
    matched = matched.filter((donor) => donorIds.has(donor.id));
  }

  return { donors: matched.sort(byShownName) };
};

const checkedDonors = async (orgId, donorIds) => {
  const ids = [...new Set((Array.isArray(donorIds) ? donorIds : []).map(Number))].filter((id) => id);
  if (!ids.length) return badRequest("No donors to send to.");
  const donors = await db.donor.findAll({ where: { id: { [Op.in]: ids } } });
  const byId = new Map(donors.map((donor) => [donor.id, donor]));
  const chosen = ids.map((id) => byId.get(id) || null);
  if (chosen.some((donor) => !donor || Number(donor.orgId) !== Number(orgId))) {
    return badRequest("Donors must belong to this organization.");
  }
  if (chosen.some((donor) => donor.status === "dontcontact")) {
    return badRequest("Donors marked No Email can't be emailed.");
  }
  if (chosen.some((donor) => !hasEmail(donor))) {
    return badRequest("Enter an email address for every selected donor.");
  }
  return { donors: chosen };
};

exports.options = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const templates = await db.emailTemplate.findAll({
      where: { orgId, tripId: null, functionCode: DONOR },
      attributes: ["id", "subject", "emailBody", "fromEmail"],
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
    res.send({ templates, trips });
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
    res.send(
      selection.donors.map((donor) => ({
        id: donor.id,
        firstName: donor.firstName,
        lastName: donor.lastName,
        organizationName: donor.organizationName,
        donorType: donor.donorType,
        email: donor.email,
      }))
    );
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.preview = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const request = await readMessage(orgId, req.body);
    if (request.error) return sendError(res, request);
    const donor = await db.donor.findOne({ where: { id: req.body?.donorId, orgId } });
    if (!sendable(donor)) {
      return res.status(400).send({ message: "Preview donor must be one of the recipients." });
    }
    const { message, reason, previewHtml } = await buildTemplateMessage({
      template: request.template,
      tripId: null,
      personId: null,
      toEmail: donor.email,
      subject: request.subject,
      emailBody: request.emailBody,
      donorId: donor.id,
    });
    if (!message) return res.status(400).send({ message: reason });
    res.send({
      from: message.from,
      replyTo: message.replyTo ?? null,
      to: message.to,
      subject: message.subject,
      body: previewHtml,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.send = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const request = await readMessage(orgId, req.body);
    if (request.error) return sendError(res, request);
    const selection = await checkedDonors(orgId, req.body?.donorIds);
    if (selection.error) return sendError(res, selection);

    const counts = { sent: 0, skipped: 0, failed: 0 };
    const results = [];
    for (const donor of selection.donors) {
      const result = await sendTemplateEmail({
        template: request.template,
        tripId: null,
        personId: null,
        toEmail: donor.email,
        subject: request.subject,
        emailBody: request.emailBody,
        donorId: donor.id,
      });
      counts[result.status] += 1;
      results.push({
        donorId: donor.id,
        name: donorName(donor),
        status: result.status,
        ...(result.reason ? { reason: result.reason } : {}),
      });
    }
    res.send({ ...counts, results });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
