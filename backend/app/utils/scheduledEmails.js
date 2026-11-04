import { Op } from "sequelize";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { ROLE_TRIP_PARTICIPANT } from "../authorization/accessControl.js";
import { sendTemplateEmail } from "./emailDelivery.js";
import { loadMissingTripDocuments } from "./myTripNextActions.js";
import {
  buildTokenValues,
  participantAmounts,
  substituteRecipients,
  substituteTokens,
} from "./emailTokenValues.js";

const SCHEDULE_RULES = ["daily", "weekly", "before-start"];
const WEEKLY_DAY = 2; // Tuesday
const JOB_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toUtcDate = (date) => new Date(`${date}T00:00:00Z`);

export const isValidJobDate = (value) => {
  if (!JOB_DATE_PATTERN.test(value || "")) return false;
  const parsed = toUtcDate(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const todayInTimeZone = (timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (date, days) => {
  const parsed = toUtcDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
};

const isDue = (template, trip, date) => {
  if (template.scheduleRule === "daily") return true;
  if (template.scheduleRule === "weekly") return toUtcDate(date).getUTCDay() === WEEKLY_DAY;
  if (template.scheduleRule === "before-start") {
    return !!trip.startDate && trip.startDate === addDays(date, template.scheduleDaysBefore);
  }
  return false;
};

const isApproved = (assignment) => assignment.status === "approved";

/** Which trip participants receive each email type, keyed by the email type's event code. */
const RECIPIENT_RULES = {
  "application-incomplete": async (trip, assignment) => assignment.status === "incomplete",
  "documents-missing": async (trip, assignment) =>
    assignment.status === "pre_approved" && (await loadMissingTripDocuments(assignment, trip)).length > 0,
  "deposit-due": async (trip, assignment) => {
    const deposit = Number(trip.deposit);
    if (!isApproved(assignment) || !(deposit > 0)) return false;
    const { raised } = await participantAmounts(trip, assignment.peopleId, assignment);
    return raised < deposit;
  },
  "payment-due": async (trip, assignment) => {
    if (!isApproved(assignment)) return false;
    const { owed } = await participantAmounts(trip, assignment.peopleId, assignment);
    return owed != null && owed > 0;
  },
  "pre-departure": async (trip, assignment) => isApproved(assignment),
  "trip-arrival": async (trip, assignment) => isApproved(assignment),
};

/** The trip's own templates, plus its organization's templates for email types the trip has none of. */
const templatesForTrip = (templates, trip) => {
  const tripTemplates = templates.filter((t) => Number(t.tripId) === Number(trip.id));
  const tripTypeIds = new Set(tripTemplates.map((t) => t.emailTypeId));
  const orgTemplates = templates.filter(
    (t) =>
      t.tripId == null &&
      Number(t.orgId) === Number(trip.orgId) &&
      !tripTypeIds.has(t.emailTypeId)
  );
  return [...tripTemplates, ...orgTemplates];
};

/** The trip's Scheduled templates whose email type has a recipient rule, the trip's own over its organization's. */
export const scheduledTemplatesForTrip = async (trip) => {
  const templates = await db.emailTemplate.findAll({
    where: {
      functionCode: "Scheduled",
      [Op.or]: [{ tripId: trip.id }, { tripId: null, orgId: trip.orgId }],
    },
    include: [
      {
        model: db.emailType,
        attributes: ["id", "description", "eventCode"],
        where: { eventCode: Object.keys(RECIPIENT_RULES) },
      },
    ],
  });
  return templatesForTrip(templates, trip);
};

/** The people on the trip that a Scheduled template's recipient rule picks now, each once, by assignment. */
export const scheduledRecipients = async (tripRef, template) => {
  const isRecipient = RECIPIENT_RULES[template.emailType?.eventCode];
  const participantRole = await db.role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } });
  const trip = await db.trip.findByPk(tripRef.id);
  if (!isRecipient || !participantRole || !trip) return [];
  const assignments = await db.tripPeopleRole.findAll({
    where: { tripId: trip.id, roleId: participantRole.id },
    include: [{ model: db.person, as: "person" }],
    order: [["id", "ASC"]],
  });
  const people = new Map();
  for (const assignment of assignments) {
    if (!assignment.person || people.has(assignment.person.id)) continue;
    if (await isRecipient(trip, assignment)) people.set(assignment.person.id, assignment.person);
  }
  return [...people.values()];
};

/** Record one send of a Scheduled template for a person on a date, updating that day's row when there is one. */
export const recordScheduledSend = async ({ emailTemplateId, tripId, personId, sendDate }, result) => {
  const key = { emailTemplateId, tripId, personId, sendDate };
  const fields = {
    status: result.status,
    reason: result.reason ? String(result.reason).slice(0, 1000) : null,
    emailLogId: result.emailLogId ?? null,
  };
  const existing = await db.scheduledEmailSend.findOne({ where: key });
  if (existing) await existing.update(fields);
  else await db.scheduledEmailSend.create({ ...key, ...fields });
};

const describeEmail = async (date, trip, template, assignment) => {
  const values = await buildTokenValues({
    orgId: template.orgId,
    tripId: trip.id,
    personId: assignment.peopleId,
  });
  const person = assignment.person;
  const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ");
  return [
    date,
    trip.name,
    name,
    template.emailType.description,
    `To: ${substituteRecipients(template.toAddress, values)}`,
    `Subject: ${substituteTokens(template.subject, values)}`,
  ].join(" | ");
};

const sendSafely = async (template, tripId, personId) => {
  try {
    return await sendTemplateEmail({ template, tripId, personId });
  } catch (err) {
    logger.error(`Scheduled email ${template.id} to person ${personId} failed: ${err.message}`);
    return { status: "failed", reason: err.message };
  }
};

/**
 * Send every scheduled template due on `date` (YYYY-MM-DD) to the participants its email type is for.
 * With `dryRun`, print what would be sent and send or record nothing.
 */
export const runScheduledEmails = async ({ date, dryRun = false, output = console.log }) => {
  const participantRole = await db.role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } });
  const templates = await db.emailTemplate.findAll({
    where: {
      functionCode: "Scheduled",
      scheduleRule: { [Op.in]: SCHEDULE_RULES },
      orgId: { [Op.ne]: null },
    },
    include: [{ model: db.emailType, attributes: ["id", "description", "eventCode"] }],
  });
  const trips = await db.trip.findAll({
    where: {
      status: "active",
      [Op.or]: [{ startDate: null }, { startDate: { [Op.gt]: date } }],
    },
  });

  const counts = { sent: 0, skipped: 0, failed: 0 };
  let planned = 0;

  for (const trip of trips) {
    const due = templatesForTrip(templates, trip).filter(
      (t) => RECIPIENT_RULES[t.emailType?.eventCode] && isDue(t, trip, date)
    );
    if (!due.length || !participantRole) continue;

    const assignments = await db.tripPeopleRole.findAll({
      where: { tripId: trip.id, roleId: participantRole.id },
      include: [{ model: db.person, as: "person" }],
    });

    for (const template of due) {
      const isRecipient = RECIPIENT_RULES[template.emailType.eventCode];
      for (const assignment of assignments) {
        if (!(await isRecipient(trip, assignment))) continue;

        const key = {
          emailTemplateId: template.id,
          tripId: trip.id,
          personId: assignment.peopleId,
          sendDate: date,
        };
        const existing = await db.scheduledEmailSend.findOne({ where: key });
        if (existing && existing.status !== "failed") continue;

        if (dryRun) {
          output(await describeEmail(date, trip, template, assignment));
          planned += 1;
          continue;
        }

        const result = await sendSafely(template, trip.id, assignment.peopleId);
        const fields = {
          status: result.status,
          reason: result.reason ? String(result.reason).slice(0, 1000) : null,
          emailLogId: result.emailLogId ?? null,
        };
        if (existing) await existing.update(fields);
        else await db.scheduledEmailSend.create({ ...key, ...fields });
        counts[result.status] += 1;
      }
    }
  }

  const summary = dryRun
    ? `Dry run for ${date}: ${planned} scheduled emails would be sent.`
    : `Scheduled emails for ${date}: ${counts.sent} sent, ${counts.skipped} skipped, ${counts.failed} failed.`;
  logger.info(summary);
  output(summary);
  return { ...counts, planned };
};
