import db from "../models/index.js";
import {
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
} from "../authorization/accessControl.js";
import { normalizeEmail } from "../utils/userPerson.js";
import { daysLimitMessage, TRIP_OPTION_DAYS_MESSAGES } from "../utils/tripDays.js";
import {
  chooseNoteOptions,
  isFlightOption,
  isNameTagOption,
  normalizeText,
  parseAllergies,
  parseEmergencyContact,
  parseMoney,
  parseSheetDate,
  parseSheetPhone,
  readTripMaster,
} from "../utils/tripMasterCsv.js";

export const FILE_MESSAGE = "Choose a CSV file up to 5 MB.";
const MISSING_ROLES_MESSAGE = "Add these worker roles to the trip, then import again.";
const TEAM_LEADER = "team leader";

const isBlank = (value) => value == null || value === "";

const sameName = (person, row) =>
  normalizeText(person.firstName) === normalizeText(row.firstName) &&
  normalizeText(person.lastName) === normalizeText(row.lastName);

const unread = (label, raw) => `${label} "${raw}" wasn't read.`;

/** Person fields the row gives, and a note for each value that couldn't be read. */
const readPersonFields = (row, notes) => {
  const fields = {
    firstName: row.firstName,
    middleName: row.middleName,
    lastName: row.lastName,
    email: normalizeEmail(row.email),
    addLine1: row.address,
    city: row.city,
    state_prov: row.state,
    postalCode: row.zip,
  };
  if (row.address || row.city || row.state || row.zip) fields.country = "US";

  if (row.birthDate) {
    fields.birthDate = parseSheetDate(row.birthDate, { birthDate: true });
    if (!fields.birthDate) notes.push(unread("date of birth", row.birthDate));
  }
  if (row.phone) {
    const phone = parseSheetPhone(row.phone);
    if (phone) Object.assign(fields, { phoneContryCode: "1", phoneNumber: phone });
    else notes.push(unread("phone", row.phone));
  }
  const gender = normalizeText(row.gender);
  if (gender === "male" || gender === "female") fields.gender = gender;

  if (row.emergencyContact) {
    const contact = parseEmergencyContact(row.emergencyContact);
    fields.emergencyContactName = contact.name;
    if (contact.phone) {
      fields.emergencyContactPhoneCountryCode = "1";
      fields.emergencyContactPhoneNumber = contact.phone;
    }
  }
  const allergies = parseAllergies(row.allergies);
  if (allergies) {
    fields.hasAllergies = allergies.hasAllergies;
    if (allergies.description) fields.allergiesDescription = allergies.description;
  }
  if (row.church && normalizeText(row.church) !== "n/a") fields.currentChurchHome = row.church;

  return Object.fromEntries(Object.entries(fields).filter(([, value]) => !isBlank(value)));
};

const readMoney = (raw, label, notes) => {
  if (!raw) return null;
  const amount = parseMoney(raw);
  if (amount == null) notes.push(unread(label, raw));
  return amount;
};

/** A person with the row's email and name, or (without an email) one already on the trip with the name. */
const findPerson = async (trip, row, email, transaction) => {
  if (email) {
    const people = await db.person.findAll({ where: { email }, order: [["id", "ASC"]], transaction });
    return people.find((person) => sameName(person, row)) || null;
  }
  const assignments = await db.tripPeopleRole.findAll({
    where: { tripId: trip.id },
    include: [{ model: db.person, as: "person" }],
    order: [["id", "ASC"]],
    transaction,
  });
  return assignments.map((a) => a.person).find((person) => person && sameName(person, row)) || null;
};

const fillBlanks = async (record, fields, transaction) => {
  const blanks = Object.fromEntries(Object.entries(fields).filter(([key]) => isBlank(record[key])));
  if (Object.keys(blanks).length) await record.update(blanks, { transaction });
};

const ensureOrgRole = async (orgId, peopleId, roleId, transaction) => {
  const existing = await db.orgPeopleRole.findOne({ where: { orgId, peopleId, roleId }, transaction });
  if (!existing) await db.orgPeopleRole.create({ orgId, peopleId, roleId }, { transaction });
};

/**
 * The trip's worker roles by lower-case name, sized for the main-section positions,
 * or the positions with no trip role (nothing is changed then).
 */
const prepareWorkerRoles = async (trip, rows, transaction) => {
  const tripRoles = await db.tripWorkerRole.findAll({
    where: { tripId: trip.id },
    include: [{ model: db.workerRole, as: "workerRole" }],
    transaction,
  });
  const byName = new Map(tripRoles.map((role) => [normalizeText(role.workerRole?.name), role]));

  const counts = new Map();
  for (const row of rows) {
    const key = normalizeText(row.position);
    if (row.section !== "main" || !key || key === TEAM_LEADER) continue;
    const entry = counts.get(key) || { name: row.position, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }

  const missingRoles = [...counts].filter(([key]) => !byName.has(key)).map(([, { name }]) => name);
  if (missingRoles.length) return { missingRoles };

  for (const [key, { count }] of counts) {
    const tripRole = byName.get(key);
    if (tripRole.quantity < count) await tripRole.update({ quantity: count }, { transaction });
  }
  return { byName };
};

const setOf = (option) => (Number(option.setNumber) > 0 ? Number(option.setNumber) : 1);

/** A row needs a name tag unless it answered "Yes"; a file without the column says nothing. */
const needsNameTag = (row) => row.hasNameTag !== undefined && !["yes", "y"].includes(normalizeText(row.hasNameTag));

/**
 * Options the Travel Notes, Flight Fee, and name tag answer pick, in sets the application hasn't
 * answered; returns those selected.
 */
const selectTripOptions = async (assignment, row, flightFee, notes, travelOptions, transaction) => {
  const { chosen, tiedSets } = chooseNoteOptions(row.travelNotes, travelOptions);
  const flightOption = flightFee > 0 ? travelOptions.find(isFlightOption) : null;
  const nameTagOption = needsNameTag(row) ? travelOptions.find(isNameTagOption) : null;
  const candidates = [...chosen, flightOption, nameTagOption].filter(Boolean);
  if (!candidates.length && !tiedSets.length) return [];

  const rows = await db.tripPeopleRoleOption.findAll({ where: { tripPeopleRoleId: assignment.id }, transaction });
  const byId = new Map(travelOptions.map((option) => [Number(option.id), option]));
  const selected = rows
    .filter((r) => r.selected)
    .map((r) => byId.get(Number(r.tripTravelOptionId)))
    .filter(Boolean);
  const answered = (setNumber) => selected.some((option) => setOf(option) === setNumber);

  for (const setNumber of tiedSets) {
    if (!answered(setNumber)) {
      notes.push(`travel notes "${row.travelNotes}" match more than one option in Trip Option ${setNumber}.`);
    }
  }
  const added = [];
  for (const option of candidates) {
    if (answered(setOf(option))) continue;
    const message = daysLimitMessage([...selected, option], TRIP_OPTION_DAYS_MESSAGES);
    if (message) {
      notes.push(`trip option "${option.description}" wasn't selected: ${message}`);
      continue;
    }
    const existing = rows.find((r) => Number(r.tripTravelOptionId) === Number(option.id));
    if (existing) await existing.update({ selected: true }, { transaction });
    else {
      await db.tripPeopleRoleOption.create(
        { tripPeopleRoleId: assignment.id, tripTravelOptionId: option.id, selected: true },
        { transaction }
      );
    }
    selected.push(option);
    added.push(option);
  }
  return added;
};

/** Roommate, flight booking, and trip options go into the application's blank fields only. */
const fillApplication = async (trip, travelOptions, assignment, row, notes, transaction) => {
  const flightFee = readMoney(row.flightFee, "flight fee", notes);

  const changes = {};
  const roommate = normalizeText(row.roommate);
  if (roommate && roommate !== "none" && !assignment.hasPreferredRoommate && isBlank(assignment.preferredRoommateNames)) {
    Object.assign(changes, { hasPreferredRoommate: true, preferredRoommateNames: row.roommate });
  }
  if (flightFee > 0 && isBlank(assignment.flightPurchaseOption)) changes.flightPurchaseOption = "organization";

  const added = await selectTripOptions(assignment, row, flightFee, notes, travelOptions, transaction);
  if (added.length) {
    const base = Number((isBlank(assignment.participantCost) ? trip.participantCost : assignment.participantCost) ?? 0);
    const adjustment = added.reduce((sum, option) => sum + Number(option.priceAdjustment || 0), 0);
    changes.participantCost = Math.round((base + adjustment) * 100) / 100;
  }
  if (Object.keys(changes).length) await assignment.update(changes, { transaction });
};

const addPassport = async (person, row, notes, passportTypes, transaction) => {
  if (!row.passportNumber) return;
  if (!passportTypes.length) {
    notes.push("no Passport document type, so the passport wasn't imported.");
    return;
  }
  const existing = await db.personDocument.count({
    where: { personId: person.id, documentTypeId: passportTypes.map((type) => type.id) },
    transaction,
  });
  if (existing) return;
  let expirationDate = null;
  if (row.passportExpiration) {
    expirationDate = parseSheetDate(row.passportExpiration);
    if (!expirationDate) notes.push(unread("passport expiration date", row.passportExpiration));
  }
  await db.personDocument.create(
    {
      personId: person.id,
      documentTypeId: passportTypes[0].id,
      documentNumber: row.passportNumber,
      expirationDate,
    },
    { transaction }
  );
};

const importRows = async (trip, rows, transaction) => {
  const { byName: tripRoles, missingRoles } = await prepareWorkerRoles(trip, rows, transaction);
  if (missingRoles) return { missingRoles };

  const [leaderRole, participantRole] = await Promise.all(
    [ROLE_TRIP_LEADER, ROLE_TRIP_PARTICIPANT].map((roleName) =>
      db.role.findOne({ where: { roleName }, transaction })
    )
  );
  const passportTypes = await db.documentType.findAll({
    where: { type: "passport" },
    order: [["id", "ASC"]],
    transaction,
  });
  const travelOptions = await db.tripTravelOption.findAll({
    where: { tripId: trip.id },
    order: [
      ["setNumber", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  });
  const summary = { rowCount: 0, added: 0, updated: 0, skipped: 0, notes: [] };

  for (const row of rows) {
    if (!row.firstName || !row.lastName) continue;
    summary.rowCount += 1;
    const name = `${row.firstName} ${row.lastName}`;
    const notes = [];
    if (row.section === "waiting") {
      summary.skipped += 1;
      summary.notes.push({ row: row.row, name, message: "On the waiting list." });
      continue;
    }

    const fields = readPersonFields(row, notes);
    let person = await findPerson(trip, row, fields.email, transaction);
    if (person) {
      await fillBlanks(person, fields, transaction);
      summary.updated += 1;
    } else {
      person = await db.person.create(fields, { transaction });
      summary.added += 1;
    }

    const inOrg = await db.orgPeopleRole.count({ where: { orgId: trip.orgId, peopleId: person.id }, transaction });
    if (!inOrg) await ensureOrgRole(trip.orgId, person.id, participantRole.id, transaction);

    const isLeader = row.section === "main" && normalizeText(row.position) === TEAM_LEADER;
    if (isLeader) await ensureOrgRole(trip.orgId, person.id, leaderRole.id, transaction);

    let assignment = await db.tripPeopleRole.findOne({
      where: { tripId: trip.id, peopleId: person.id },
      order: [["id", "ASC"]],
      transaction,
    });
    if (!assignment && isLeader) {
      const hasPrimary = await db.tripPeopleRole.count({
        where: { tripId: trip.id, roleId: leaderRole.id, isPrimaryLeader: true },
        transaction,
      });
      assignment = await db.tripPeopleRole.create(
        {
          tripId: trip.id,
          peopleId: person.id,
          roleId: leaderRole.id,
          status: "approved",
          isPrimaryLeader: !hasPrimary,
          assiginmentDateTime: new Date(),
        },
        { transaction }
      );
    } else if (!assignment) {
      let status = "cancelled";
      if (row.section === "main") status = normalizeText(row.appReceived) === "x" ? "approved" : "incomplete";
      assignment = await db.tripPeopleRole.create(
        {
          tripId: trip.id,
          peopleId: person.id,
          roleId: participantRole.id,
          tripWorkerRoleId: tripRoles.get(normalizeText(row.position))?.id ?? null,
          status,
          assiginmentDateTime: new Date(),
        },
        { transaction }
      );
    }

    await fillApplication(trip, travelOptions, assignment, row, notes, transaction);
    await addPassport(person, row, notes, passportTypes, transaction);
    for (const message of notes) summary.notes.push({ row: row.row, name, message });
  }
  return summary;
};

const exports = {};

/** Feature 80 — import a Trip Master CSV into the trip (trip staff). */
exports.importTripMaster = async (req, res) => {
  try {
    const trip = await db.trip.findByPk(req.params.id, { attributes: ["id", "orgId", "participantCost"] });
    if (!trip) return res.status(404).send({ message: "Trip not found." });
    const allowed =
      isSystemAdmin(req) || isOrgAdminForOrg(req, trip.orgId) || isTripLeaderForTrip(req, trip.id);
    if (!allowed) return res.status(403).send({ message: "Forbidden." });
    if (!req.file) return res.status(400).send({ message: FILE_MESSAGE });

    const sheet = readTripMaster(req.file.buffer.toString("utf8"));
    if (sheet.missing.length) {
      return res.status(400).send({
        message: `This file isn't a Trip Master CSV. Missing columns: ${sheet.missing.join(", ")}.`,
      });
    }
    const summary = await db.sequelize.transaction((transaction) => importRows(trip, sheet.rows, transaction));
    if (summary.missingRoles) {
      return res.status(400).send({ message: MISSING_ROLES_MESSAGE, missingRoles: summary.missingRoles });
    }
    res.send(summary);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
