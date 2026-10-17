import { Op } from "sequelize";
import db from "../models/index.js";
import { ROLE_TRIP_LEADER } from "../authorization/accessControl.js";

export const VALUE_SOURCES = [
  { valueSource: "organization.name", label: "Organization name" },
  { valueSource: "organization.email", label: "Organization email" },
  { valueSource: "organization.phone", label: "Organization phone" },
  { valueSource: "organization.websiteUrl", label: "Organization website" },
  { valueSource: "trip.name", label: "Trip name" },
  { valueSource: "trip.location", label: "Trip location" },
  { valueSource: "trip.startDate", label: "Trip start date" },
  { valueSource: "trip.endDate", label: "Trip end date" },
  { valueSource: "trip.participantCost", label: "Trip participant cost" },
  { valueSource: "trip.deposit", label: "Trip deposit" },
  { valueSource: "participant.firstName", label: "Participant first name" },
  { valueSource: "participant.lastName", label: "Participant last name" },
  { valueSource: "participant.preferredName", label: "Participant preferred name" },
  { valueSource: "participant.email", label: "Participant email" },
  { valueSource: "participant.amountRaised", label: "Participant amount raised" },
  { valueSource: "participant.amountOwed", label: "Participant amount owed" },
  { valueSource: "participant.tripRole", label: "Participant trip role" },
  { valueSource: "primaryLeader.firstName", label: "Primary trip leader first name" },
  { valueSource: "primaryLeader.lastName", label: "Primary trip leader last name" },
  { valueSource: "primaryLeader.preferredName", label: "Primary trip leader preferred name" },
  { valueSource: "primaryLeader.email", label: "Primary trip leader email" },
  { valueSource: "primaryLeader.phone", label: "Primary trip leader phone" },
];

export const VALUE_SOURCE_KEYS = new Set(VALUE_SOURCES.map((s) => s.valueSource));

export const EMAIL_VALUE_SOURCES = new Set([
  "organization.email",
  "participant.email",
  "primaryLeader.email",
]);

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SINGLE_TOKEN_PATTERN = /^\{\{([A-Z][A-Z0-9_]*)\}\}$/;

export const TOKEN_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const TOKEN_PATTERN = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const text = (value) => (value == null ? "" : String(value));

export const formatDate = (value) => {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return "";
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return "";
  return `${month} ${Number(match[3])}, ${match[1]}`;
};

const moneyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (value) => {
  if (value == null || value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return moneyFormat.format(num);
};

export const formatPhone = (countryCode, number) => {
  if (!number) return "";
  const code = text(countryCode).replace(/^\+/, "").trim();
  return code ? `+${code} ${number}` : String(number);
};

const preferredName = (person) => {
  if (!person) return "";
  if (person.preferredName) return person.preferredName;
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
};

const loadPrimaryLeader = async (tripId) => {
  const role = await db.role.findOne({ where: { roleName: ROLE_TRIP_LEADER } });
  if (!role) return null;
  const row = await db.tripPeopleRole.findOne({
    where: { tripId, roleId: role.id, isPrimaryLeader: true },
    include: [{ model: db.person, as: "person" }],
  });
  return row?.person || null;
};

/** Worker role name on the person's earliest assignment on the trip that has a trip role. */
const loadParticipantTripRole = async (tripId, personId) => {
  const row = await db.tripPeopleRole.findOne({
    where: { tripId, peopleId: personId, tripWorkerRoleId: { [Op.ne]: null } },
    include: [
      {
        model: db.tripWorkerRole,
        as: "tripWorkerRole",
        include: [{ model: db.workerRole, as: "workerRole" }],
      },
    ],
    order: [["id", "ASC"]],
  });
  return row?.tripWorkerRole?.workerRole?.name || "";
};

/** A participant's trip cost (`null` when unknown). The assignment's participant cost overrides the trip's. */
export const participantCost = (trip, assignment) => {
  const costRaw =
    assignment?.participantCost != null && assignment.participantCost !== ""
      ? assignment.participantCost
      : trip.participantCost;
  return costRaw != null && costRaw !== "" && !Number.isNaN(Number(costRaw)) ? Number(costRaw) : null;
};

/** Amount a participant has raised for a trip, and what they still owe (`null` when the cost is unknown). */
export const participantAmounts = async (trip, personId, assignment) => {
  const raised = Number(
    (await db.tripDonation.sum("amount", { where: { tripId: trip.id, personId } })) || 0
  );
  const cost = participantCost(trip, assignment);
  return { raised, owed: cost == null ? null : Math.max(0, cost - raised) };
};

/**
 * Build the value for every value source from an organization and an optional trip and participant.
 * Missing data yields empty text.
 */
export const buildSourceValues = async ({ orgId, tripId = null, personId = null }) => {
  const org = orgId != null ? await db.organization.findByPk(orgId) : null;
  const trip = tripId != null ? await db.trip.findByPk(tripId) : null;
  const person = trip && personId != null ? await db.person.findByPk(personId) : null;
  const leader = trip ? await loadPrimaryLeader(trip.id) : null;

  let amountRaised = "";
  let amountOwed = "";
  let tripRole = "";
  if (trip && person) {
    tripRole = await loadParticipantTripRole(trip.id, person.id);
    const assignment = await db.tripPeopleRole.findOne({
      where: { tripId: trip.id, peopleId: person.id },
      order: [["id", "ASC"]],
    });
    const { raised, owed } = await participantAmounts(trip, person.id, assignment);
    amountRaised = formatMoney(raised);
    if (owed != null) amountOwed = formatMoney(owed);
  }

  return {
    "organization.name": text(org?.name),
    "organization.email": text(org?.email),
    "organization.phone": formatPhone(org?.phoneContryCode, org?.phoneNumber),
    "organization.websiteUrl": text(org?.websiteUrl),
    "trip.name": text(trip?.name),
    "trip.location": text(trip?.location),
    "trip.startDate": formatDate(trip?.startDate),
    "trip.endDate": formatDate(trip?.endDate),
    "trip.participantCost": formatMoney(trip?.participantCost),
    "trip.deposit": formatMoney(trip?.deposit),
    "participant.firstName": text(person?.firstName),
    "participant.lastName": text(person?.lastName),
    "participant.preferredName": preferredName(person),
    "participant.email": text(person?.email),
    "participant.amountRaised": amountRaised,
    "participant.amountOwed": amountOwed,
    "participant.tripRole": tripRole,
    "primaryLeader.firstName": text(leader?.firstName),
    "primaryLeader.lastName": text(leader?.lastName),
    "primaryLeader.preferredName": preferredName(leader),
    "primaryLeader.email": text(leader?.email),
    "primaryLeader.phone": formatPhone(leader?.phoneContryCode, leader?.phoneNumber),
  };
};

/** Map each catalog token code to its value for this organization, trip, and participant. */
export const buildTokenValues = async (context) => {
  const sourceValues = await buildSourceValues(context);
  const tokens = await db.emailToken.findAll({ attributes: ["tokenCode", "valueSource"] });
  const values = {};
  for (const token of tokens) {
    values[token.tokenCode] = sourceValues[token.valueSource] ?? "";
  }
  return values;
};

/** Replace `{{TOKEN_CODE}}` with its value; symbols that are not catalog tokens stay as written. */
export const substituteTokens = (input, values) =>
  text(input).replace(TOKEN_PATTERN, (match, code) =>
    Object.prototype.hasOwnProperty.call(values, code) ? values[code] : match
  );

const splitRecipients = (toAddress) => text(toAddress).split(",").map((entry) => entry.trim());

const loadEmailTokenCodes = async () =>
  new Set(
    (await db.emailToken.findAll({ attributes: ["tokenCode", "valueSource"] }))
      .filter((token) => EMAIL_VALUE_SOURCES.has(token.valueSource))
      .map((token) => token.tokenCode)
  );

const isEmailEntry = (entry, emailTokenCodes) => {
  const token = SINGLE_TOKEN_PATTERN.exec(entry);
  if (token) return emailTokenCodes.has(token[1]);
  return EMAIL_ADDRESS_PATTERN.test(entry);
};

/** True when every comma-separated recipient is an email address or a catalog token whose value is an email. */
export const recipientsAreValid = async (toAddress) => {
  const entries = splitRecipients(toAddress);
  if (!entries.length || entries.some((entry) => !entry)) return false;
  const emailTokenCodes = await loadEmailTokenCodes();
  return entries.every((entry) => isEmailEntry(entry, emailTokenCodes));
};

/** True when the sender is exactly one email address or one catalog token whose value is an email. */
export const senderIsValid = async (fromEmail) => {
  const entry = text(fromEmail).trim();
  if (!entry || entry.includes(",")) return false;
  return isEmailEntry(entry, await loadEmailTokenCodes());
};

/** Replace tokens in each recipient and leave out recipients that come out empty. */
export const substituteRecipients = (toAddress, values) =>
  splitRecipients(toAddress)
    .map((entry) => substituteTokens(entry, values).trim())
    .filter(Boolean)
    .join(", ");
