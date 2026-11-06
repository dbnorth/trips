import db from "../models/index.js";

const ACTIVE_APPLICATION_STATUSES = ["pre_approved", "approved"];

const todayDateOnly = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** A trip stays active through its end date (its start date when it has no end date) — Feature 121. */
export const isTripActive = (trip) => {
  const lastDay = String(trip?.endDate || trip?.startDate || "").slice(0, 10);
  return !!lastDay && lastDay >= todayDateOnly();
};

export const isActiveApplicationStatus = (status) => ACTIVE_APPLICATION_STATUSES.includes(status);

/** Organizations of the active trips the person is Pre-Approved or Approved on (any trip role). */
export const activeTripOrgIds = async (personId) => {
  const rows = await db.tripPeopleRole.findAll({
    where: { peopleId: personId, status: ACTIVE_APPLICATION_STATUSES },
    attributes: ["id"],
    include: [{ model: db.trip, as: "trip", attributes: ["orgId", "startDate", "endDate"] }],
  });
  return [
    ...new Set(rows.filter((row) => isTripActive(row.trip)).map((row) => Number(row.trip.orgId))),
  ];
};

export const missingInformationMessage = (prefix, missingItems) =>
  `${prefix} Missing: ${missingItems.join(", ")}.`;

export const ACTIVE_TRIP_PROFILE_PREFIX =
  "This profile is on an active trip and can't be saved with missing information.";
export const ACTIVE_TRIP_APPLICATION_PREFIX =
  "This Pre-Approved application can't be saved with missing information.";
export const ACTIVE_TRIP_ROLE_MESSAGE =
  "Trip role is required while the application is Pre-Approved or Approved on an active trip.";
