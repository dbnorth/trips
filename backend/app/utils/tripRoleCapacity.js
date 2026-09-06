import { Op } from "sequelize";
import db from "../models/index.js";

const TripPeopleRole = db.tripPeopleRole;

/** Statuses that occupy a trip worker-role capacity slot (Feature 26). */
export const ROLE_OCCUPYING_STATUSES = ["incomplete", "applied", "approved"];

/**
 * Count applications that occupy a role slot, keyed by tripWorkerRoleId.
 * Cancelled and declined do not count.
 */
export const signedUpCountsByTripWorkerRoleId = async (tripId) => {
  const rows = await TripPeopleRole.findAll({
    where: {
      tripId,
      status: { [Op.in]: ROLE_OCCUPYING_STATUSES },
      tripWorkerRoleId: { [Op.ne]: null },
    },
    attributes: ["tripWorkerRoleId"],
  });
  const counts = new Map();
  for (const row of rows) {
    const id = Number(row.tripWorkerRoleId);
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
};

export const availableCountForRole = (quantity, signedUpCount) =>
  Math.max(0, (Number(quantity) || 0) - (Number(signedUpCount) || 0));

/**
 * Attach signedUpCount / availableCount to trip-worker-role rows for a trip.
 */
export const withCapacityFields = async (tripId, roles) => {
  const counts = await signedUpCountsByTripWorkerRoleId(tripId);
  return (roles || []).map((role) => {
    const plain = typeof role.toJSON === "function" ? role.toJSON() : { ...role };
    const signedUpCount = counts.get(Number(plain.id)) || 0;
    return {
      ...plain,
      signedUpCount,
      availableCount: availableCountForRole(plain.quantity, signedUpCount),
    };
  });
};
