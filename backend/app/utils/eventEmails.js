import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { ROLE_TRIP_PARTICIPANT } from "../authorization/accessControl.js";
import { sendTemplateEmail } from "./emailDelivery.js";
import { participantAmounts } from "./emailTokenValues.js";

const CREATED_STATUS_EVENTS = {
  incomplete: "application-started",
  applied: "application-submitted",
  approved: "application-approved",
};

/** The trip's Send Now templates for the event, or its organization's for email types the trip has none of. */
const findEventTemplates = async (eventCode, trip) => {
  const templates = await db.emailTemplate.findAll({
    where: {
      functionCode: "Send Now",
      [Op.or]: [{ tripId: trip.id }, { tripId: null, orgId: trip.orgId }],
    },
    include: [{ model: db.emailType, where: { eventCode }, attributes: ["id", "eventCode"] }],
    order: [["id", "ASC"]],
  });
  const tripTypeIds = new Set(
    templates.filter((t) => t.tripId != null).map((t) => t.emailTypeId)
  );
  return templates.filter((t) => t.tripId != null || !tripTypeIds.has(t.emailTypeId));
};

/** Send every Send Now template for `eventCode` to one participant on one trip. */
export const sendEventEmails = async ({ eventCode, tripId, personId }) => {
  const trip = await db.trip.findByPk(tripId);
  if (!trip) return [];
  const results = [];
  for (const template of await findEventTemplates(eventCode, trip)) {
    results.push(await sendTemplateEmail({ template, tripId: trip.id, personId }));
  }
  return results;
};

const participantRoleId = async () =>
  (await db.role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } }))?.id ?? null;

const withoutFailing = async (label, work) => {
  try {
    await work();
  } catch (err) {
    logger.error(`Event emails for ${label} failed: ${err.message}`);
  }
};

const applicationEventCode = (previousStatus, nextStatus) => {
  if (previousStatus == null) return CREATED_STATUS_EVENTS[nextStatus] ?? null;
  if (previousStatus === nextStatus) return null;
  if (previousStatus === "incomplete" && nextStatus === "applied") return "application-submitted";
  if (nextStatus === "approved") return "application-approved";
  return null;
};

/**
 * Send the application event emails for a saved application.
 * `previousStatus` is `null` for a new application. Never throws.
 */
export const sendApplicationEventEmails = (assignment, previousStatus) =>
  withoutFailing(`application ${assignment.id}`, async () => {
    const eventCode = applicationEventCode(previousStatus, assignment.status);
    if (!eventCode) return;
    const roleId = await participantRoleId();
    if (roleId == null || Number(assignment.roleId) !== Number(roleId)) return;
    await sendEventEmails({ eventCode, tripId: assignment.tripId, personId: assignment.peopleId });
  });

/** Send the donation event emails for a newly created donation. Never throws. */
export const sendDonationEventEmails = (donation) =>
  withoutFailing(`donation ${donation.id}`, async () => {
    if (!donation.personId) return;
    const roleId = await participantRoleId();
    if (roleId == null) return;
    const assignment = await db.tripPeopleRole.findOne({
      where: { tripId: donation.tripId, peopleId: donation.personId, roleId },
    });
    if (!assignment) return;

    const trip = await db.trip.findByPk(donation.tripId);
    const { raised, total } = await participantAmounts(trip, donation.personId, assignment);
    const raisedBefore = raised - Number(donation.amount);
    const eventCodes = ["donation-received"];
    const deposit = Number(trip.deposit);
    if (deposit > 0 && raisedBefore < deposit && raised >= deposit) {
      eventCodes.push("deposit-received");
    }
    if (total != null && total - raisedBefore > 0 && total - raised <= 0) {
      eventCodes.push("payment-complete");
    }

    for (const eventCode of eventCodes) {
      await sendEventEmails({ eventCode, tripId: trip.id, personId: donation.personId });
    }
  });
