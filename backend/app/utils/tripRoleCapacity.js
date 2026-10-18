import { Op } from "sequelize";
import db from "../models/index.js";

const TripPeopleRole = db.tripPeopleRole;
const TripWorkerRoleReservation = db.tripWorkerRoleReservation;

/** Statuses that occupy a trip worker-role capacity slot (Feature 26). */
export const ROLE_OCCUPYING_STATUSES = ["incomplete", "applied", "approved"];

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

/** Applications that occupy a role slot on the trip, with the applicant's email. */
export const loadOccupyingAssignments = (tripId) =>
  TripPeopleRole.findAll({
    where: {
      tripId,
      status: { [Op.in]: ROLE_OCCUPYING_STATUSES },
      tripWorkerRoleId: { [Op.ne]: null },
    },
    attributes: ["id", "tripWorkerRoleId", "status"],
    include: [{ model: db.person, as: "person", attributes: ["id", "firstName", "lastName", "email"] }],
  });

/** True when a reservation is filled by an occupying application for its role (Feature 56 FR-004). */
const isReservationFilled = (reservation, assignments) =>
  assignments.some(
    (a) =>
      Number(a.tripWorkerRoleId) === Number(reservation.tripWorkerRoleId) &&
      normalizeEmail(a.person?.email) === reservation.email
  );

/**
 * Signed-up counts (occupying applications; cancelled and declined do not count) and
 * reserved counts (unfilled reservations), keyed by tripWorkerRoleId.
 */
export const roleOccupancyByTripWorkerRoleId = async (tripId) => {
  const [assignments, reservations] = await Promise.all([
    loadOccupyingAssignments(tripId),
    TripWorkerRoleReservation.findAll({ where: { tripId } }),
  ]);
  const signedUp = new Map();
  for (const row of assignments) {
    const id = Number(row.tripWorkerRoleId);
    signedUp.set(id, (signedUp.get(id) || 0) + 1);
  }
  const reserved = new Map();
  for (const reservation of reservations) {
    if (isReservationFilled(reservation, assignments)) continue;
    const id = Number(reservation.tripWorkerRoleId);
    reserved.set(id, (reserved.get(id) || 0) + 1);
  }
  return { signedUp, reserved };
};

export const availableCountForRole = (quantity, signedUpCount, reservedCount = 0) =>
  Math.max(0, (Number(quantity) || 0) - (Number(signedUpCount) || 0) - (Number(reservedCount) || 0));

/**
 * Attach signedUpCount / reservedCount / availableCount to trip-worker-role rows for a trip.
 */
export const withCapacityFields = async (tripId, roles) => {
  const { signedUp, reserved } = await roleOccupancyByTripWorkerRoleId(tripId);
  return (roles || []).map((role) => {
    const plain = typeof role.toJSON === "function" ? role.toJSON() : { ...role };
    const signedUpCount = signedUp.get(Number(plain.id)) || 0;
    const reservedCount = reserved.get(Number(plain.id)) || 0;
    return {
      ...plain,
      signedUpCount,
      reservedCount,
      availableCount: availableCountForRole(plain.quantity, signedUpCount, reservedCount),
    };
  });
};

/** The reservation on the trip matching the person's email, or null. */
export const findReservationForPerson = async (tripId, peopleId) => {
  if (!peopleId) return null;
  const person = await db.person.findByPk(peopleId, { attributes: ["email"] });
  const email = normalizeEmail(person?.email);
  if (!email) return null;
  return TripWorkerRoleReservation.findOne({ where: { tripId, email } });
};
