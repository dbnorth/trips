import { Op } from "sequelize";
import db from "../models/index.js";
import { ROLE_TRIP_LEADER } from "../authorization/accessControl.js";
import { amountOwed, loadSelectedTripOptions, participantTotals } from "./participantTotals.js";
import { arrivalPdfName, loadTripWithArrivalPdf } from "./tripArrivalPdf.js";

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
  { valueSource: "trip.arrivalPdf", label: "Trip arrival PDF" },
  { valueSource: "participant.firstName", label: "Participant first name" },
  { valueSource: "participant.lastName", label: "Participant last name" },
  { valueSource: "participant.preferredName", label: "Participant preferred name" },
  { valueSource: "participant.email", label: "Participant email" },
  { valueSource: "participant.amountRaised", label: "Participant amount raised" },
  { valueSource: "participant.amountOwed", label: "Participant amount owed" },
  { valueSource: "participant.tripRole", label: "Participant trip role" },
  { valueSource: "participant.tripCost", label: "Participant trip cost" },
  { valueSource: "participant.tripOptions", label: "Participant trip options" },
  { valueSource: "participant.tripOptionsTotal", label: "Participant trip options total" },
  { valueSource: "participant.airfare", label: "Participant trip airfare" },
  { valueSource: "participant.addonExpenses", label: "Participant add-on expenses" },
  { valueSource: "participant.addonExpensesTotal", label: "Participant add-on expenses total" },
  { valueSource: "participant.totalTripCost", label: "Participant total trip cost" },
  { valueSource: "participant.donations", label: "Participant donations" },
  { valueSource: "participant.donationsTotal", label: "Participant donations total" },
  { valueSource: "participant.tripDonations", label: "Participant trip donations" },
  { valueSource: "participant.tripDonationsTotal", label: "Participant trip donations total" },
  { valueSource: "participant.balanceDue", label: "Participant balance due" },
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

/** Value sources that name a file a template can attach. */
export const ATTACHMENT_VALUE_SOURCES = new Set(["trip.arrivalPdf"]);

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

/**
 * Amount a participant has raised for a trip, their total trip cost, and what they still owe
 * (`null` when the cost is unknown).
 */
export const participantAmounts = async (trip, personId, assignment) => {
  const raised = Number(
    (await db.tripDonation.sum("amount", { where: { tripId: trip.id, personId } })) || 0
  );
  const { totalTripCost } = await participantTotals(trip, assignment);
  return { raised, total: totalTripCost, owed: amountOwed(totalTripCost, raised) };
};

/** Calendar date (`YYYY-MM-DD`) of a timestamp in the app's email time zone. */
const localDate = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.SCHEDULED_EMAIL_TIMEZONE || "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

const sumAmounts = (amounts) => amounts.reduce((total, amount) => total + amount, 0);

/**
 * The participant's donations for a trip, oldest first, split into participant donations
 * (donor email matches the participant's email) and trip donations (all others).
 */
const loadDonationsBySource = async (tripId, person) => {
  const rows = await db.tripDonation.findAll({
    where: { tripId, personId: person.id },
    include: [{ model: db.donor, as: "donor", attributes: ["personId"] }],
    order: [
      ["dateTime", "ASC"],
      ["id", "ASC"],
    ],
  });
  const own = [];
  const others = [];
  for (const row of rows) {
    const entry = { date: localDate(row.dateTime), amount: Number(row.amount) || 0 };
    (Number(row.donor?.personId) === Number(person.id) ? own : others).push(entry);
  }
  return { own, others };
};

const amountLines = (entries, label) =>
  entries.map((entry) => `${label(entry)}: ${formatMoney(entry.amount)}`).join("\n");

/** Financial statement values for a participant's assignment on a trip. */
const buildFinancialValues = async (trip, person, assignment) => {
  const { participantCost: cost, airfare, addonExpenses, addonTotal, totalTripCost: totalCost } =
    await participantTotals(trip, assignment);
  const options = assignment ? await loadSelectedTripOptions(assignment.id) : [];
  const { own, others } = await loadDonationsBySource(trip.id, person);

  const optionsTotal = sumAmounts(options.map((option) => option.amount));
  const ownTotal = sumAmounts(own.map((entry) => entry.amount));
  const othersTotal = sumAmounts(others.map((entry) => entry.amount));

  return {
    "participant.tripCost": formatMoney(cost),
    "participant.tripOptions": amountLines(options, (option) => option.description),
    "participant.tripOptionsTotal": formatMoney(optionsTotal),
    "participant.airfare": formatMoney(airfare),
    "participant.addonExpenses": amountLines(
      addonExpenses.map((expense) => ({ description: expense.description, amount: expense.cost })),
      (expense) => expense.description
    ),
    "participant.addonExpensesTotal": formatMoney(addonTotal),
    "participant.totalTripCost": formatMoney(totalCost),
    "participant.donations": amountLines(own, (entry) => formatDate(entry.date)),
    "participant.donationsTotal": formatMoney(ownTotal),
    "participant.tripDonations": amountLines(others, (entry) => formatDate(entry.date)),
    "participant.tripDonationsTotal": formatMoney(othersTotal),
    "participant.balanceDue":
      totalCost == null ? "" : formatMoney(Math.max(0, totalCost - ownTotal - othersTotal)),
  };
};

const EMPTY_FINANCIAL_VALUES = {
  "participant.tripCost": "",
  "participant.tripOptions": "",
  "participant.tripOptionsTotal": "",
  "participant.airfare": "",
  "participant.addonExpenses": "",
  "participant.addonExpensesTotal": "",
  "participant.totalTripCost": "",
  "participant.donations": "",
  "participant.donationsTotal": "",
  "participant.tripDonations": "",
  "participant.tripDonationsTotal": "",
  "participant.balanceDue": "",
};

/**
 * Build the value for every value source from an organization and an optional trip and participant.
 * Missing data yields empty text.
 */
export const buildSourceValues = async ({ orgId, tripId = null, personId = null }) => {
  const org = orgId != null ? await db.organization.findByPk(orgId) : null;
  const trip = tripId != null ? await loadTripWithArrivalPdf(tripId) : null;
  const person = personId != null ? await db.person.findByPk(personId) : null;
  const leader = trip ? await loadPrimaryLeader(trip.id) : null;

  let amountRaised = "";
  let amountOwed = "";
  let tripRole = "";
  let financialValues = EMPTY_FINANCIAL_VALUES;
  if (trip && person) {
    tripRole = await loadParticipantTripRole(trip.id, person.id);
    const assignment = await db.tripPeopleRole.findOne({
      where: { tripId: trip.id, peopleId: person.id },
      order: [["id", "ASC"]],
    });
    const { raised, owed } = await participantAmounts(trip, person.id, assignment);
    amountRaised = formatMoney(raised);
    if (owed != null) amountOwed = formatMoney(owed);
    financialValues = await buildFinancialValues(trip, person, assignment);
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
    "trip.arrivalPdf": trip?.arrivalPdfFileName ? arrivalPdfName(trip) : "",
    "participant.firstName": text(person?.firstName),
    "participant.lastName": text(person?.lastName),
    "participant.preferredName": preferredName(person),
    "participant.email": text(person?.email),
    "participant.amountRaised": amountRaised,
    "participant.amountOwed": amountOwed,
    "participant.tripRole": tripRole,
    ...financialValues,
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

/** Attachment token codes in a template's Attachment field, each once, in order. */
export const attachmentTokenCodes = (attachment) => [
  ...new Set(
    text(attachment)
      .split(",")
      .map((entry) => SINGLE_TOKEN_PATTERN.exec(entry.trim())?.[1])
      .filter(Boolean)
  ),
];

/** True when Attachment is blank or lists only catalog tokens whose value source is a file, separated by commas. */
export const attachmentsAreValid = async (attachment) => {
  if (!text(attachment).trim()) return true;
  const entries = text(attachment).split(",").map((entry) => entry.trim());
  const attachmentCodes = new Set(
    (await db.emailToken.findAll({ attributes: ["tokenCode", "valueSource"] }))
      .filter((token) => ATTACHMENT_VALUE_SOURCES.has(token.valueSource))
      .map((token) => token.tokenCode)
  );
  return entries.every((entry) => attachmentCodes.has(SINGLE_TOKEN_PATTERN.exec(entry)?.[1]));
};

/** Replace tokens in each recipient and leave out recipients that come out empty. */
export const substituteRecipients = (toAddress, values) =>
  splitRecipients(toAddress)
    .map((entry) => substituteTokens(entry, values).trim())
    .filter(Boolean)
    .join(", ");
