import db from "../models/index.js";
import {
  ROLE_TRIP_LEADER,
  ROLE_TRIP_PARTICIPANT,
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
} from "../authorization/accessControl.js";

const Op = db.Sequelize.Op;

export const PERSON_DONOR_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "addLine1",
  "addLine2",
  "city",
  "state_prov",
  "postalCode",
  "country",
  "phoneContryCode",
  "phoneNumber",
];

export const canManageDonations = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return false;
  if (isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req)) return true;
  return isTripLeaderForTrip(req, tripId);
};

/** Donor field values copied from a person. */
export const donorDetailsFromPerson = (person) => {
  const details = {};
  for (const key of PERSON_DONOR_FIELDS) details[key] = person[key] ?? null;
  return details;
};

/** Person has an organization role in the org or an application on one of its trips. */
const isPersonInOrg = async (personId, orgId) => {
  const orgRole = await db.orgPeopleRole.findOne({ where: { orgId, peopleId: personId }, attributes: ["id"] });
  if (orgRole) return true;
  const application = await db.tripPeopleRole.findOne({
    where: { peopleId: personId },
    include: [{ model: db.trip, as: "trip", where: { orgId }, attributes: [] }],
    attributes: ["id"],
  });
  return !!application;
};

/**
 * A person the caller may add as a donor on this trip: the caller manages donations on the trip
 * and the person belongs to the trip's organization (System Admin: any person).
 */
export const findDonatablePerson = async (req, tripId, where) => {
  if (!tripId || !(await canManageDonations(req, tripId))) return null;
  const person = await db.person.findOne({ where });
  if (!person) return null;
  if (isSystemAdmin(req)) return person;
  const trip = await db.trip.findByPk(tripId, { attributes: ["id", "orgId"] });
  return (await isPersonInOrg(person.id, trip.orgId)) ? person : null;
};

/** The person's linked donor, created from `details` (or the person record) when none is linked. */
export const findOrCreateLinkedDonor = async (personId, details = null) => {
  const existing = await db.donor.findOne({ where: { personId } });
  if (existing) return existing;
  const source = details ?? donorDetailsFromPerson(await db.person.findByPk(personId));
  return db.donor.create({ ...source, status: source.status || "active", personId });
};

const approvedMemberRoleInclude = {
  model: db.role,
  as: "role",
  where: { roleName: { [Op.in]: [ROLE_TRIP_PARTICIPANT, ROLE_TRIP_LEADER] } },
  attributes: [],
};

/** Approved Trip Participants and Trip Leaders on the trip, one entry per person. */
export const loadDonationRecipients = async (tripId) => {
  const links = await db.tripPeopleRole.findAll({
    where: { tripId, status: "approved" },
    include: [
      approvedMemberRoleInclude,
      { model: db.person, as: "person", attributes: ["id", "firstName", "lastName"] },
    ],
  });
  const byPerson = new Map();
  for (const link of links) {
    if (link.person && !byPerson.has(link.person.id)) {
      byPerson.set(link.person.id, {
        personId: link.person.id,
        firstName: link.person.firstName,
        lastName: link.person.lastName,
      });
    }
  }
  return [...byPerson.values()];
};

/** Approved Trip Participant or Trip Leader on the trip. */
export const isApprovedTripMember = async (tripId, personId) => {
  const link = await db.tripPeopleRole.findOne({
    where: { tripId, peopleId: personId, status: "approved" },
    include: [approvedMemberRoleInclude],
    attributes: ["id"],
  });
  return !!link;
};
