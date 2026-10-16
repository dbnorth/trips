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
  { valueSource: "primaryLeader.firstName", label: "Primary trip leader first name" },
  { valueSource: "primaryLeader.lastName", label: "Primary trip leader last name" },
  { valueSource: "primaryLeader.preferredName", label: "Primary trip leader preferred name" },
  { valueSource: "primaryLeader.email", label: "Primary trip leader email" },
  { valueSource: "primaryLeader.phone", label: "Primary trip leader phone" },
];

export const VALUE_SOURCE_KEYS = new Set(VALUE_SOURCES.map((s) => s.valueSource));

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
  if (trip && person) {
    const assignment = await db.tripPeopleRole.findOne({
      where: { tripId: trip.id, peopleId: person.id },
      order: [["id", "ASC"]],
    });
    const raised = Number(
      (await db.tripDonation.sum("amount", { where: { tripId: trip.id, personId: person.id } })) || 0
    );
    amountRaised = formatMoney(raised);
    const costRaw =
      assignment?.participantCost != null && assignment.participantCost !== ""
        ? assignment.participantCost
        : trip.participantCost;
    if (costRaw != null && costRaw !== "" && !Number.isNaN(Number(costRaw))) {
      amountOwed = formatMoney(Math.max(0, Number(costRaw) - raised));
    }
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
