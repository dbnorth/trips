import db from "../models/index.js";
import { ROLE_TRIP_LEADER, ROLE_TRIP_PARTICIPANT } from "../authorization/accessControl.js";

const getTripLeaderRoleId = async () => {
  const role = await db.role.findOne({ where: { roleName: ROLE_TRIP_LEADER } });
  if (!role) throw new Error("Trip Leader role not found.");
  return role.id;
};

export const getOrgTripLeaderPeopleIds = async (orgId) => {
  const roleId = await getTripLeaderRoleId();
  const links = await db.orgPeopleRole.findAll({
    where: { orgId, roleId },
    attributes: ["peopleId"],
  });
  return new Set(links.map((l) => Number(l.peopleId)));
};

export const getTripLeaderPeopleIds = async (tripId) => {
  const roleId = await getTripLeaderRoleId();
  const rows = await db.tripPeopleRole.findAll({
    where: { tripId, roleId },
    attributes: ["peopleId"],
  });
  return rows.map((r) => Number(r.peopleId));
};

const formatPersonName = (person) =>
  [person?.firstName, person?.middleName, person?.lastName].filter(Boolean).join(" ").trim();

const getTripMemberRoleIds = async () => {
  const roles = await db.role.findAll({
    where: {
      roleName: { [db.Sequelize.Op.in]: [ROLE_TRIP_LEADER, ROLE_TRIP_PARTICIPANT] },
    },
    attributes: ["id"],
  });
  return roles.map((r) => r.id);
};

const getActiveTripMemberRows = async (tripIds, statuses = ["approved"]) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  if (!ids.length) return [];

  const roleIds = await getTripMemberRoleIds();
  if (!roleIds.length) return [];

  return db.tripPeopleRole.findAll({
    where: { tripId: ids, status: statuses, roleId: roleIds },
    attributes: ["id", "tripId", "peopleId", "participantCost", "flightPurchaseOption", "tripWorkerRoleId", "status"],
    raw: true,
  });
};

/** Ordered trip leaders with contact fields for participant-facing views. */
export const getTripLeadersForDisplay = async (tripId) => {
  const roleId = await getTripLeaderRoleId();
  const rows = await db.tripPeopleRole.findAll({
    where: { tripId, roleId, status: "approved" },
    include: [
      {
        model: db.person,
        as: "person",
        attributes: ["id", "firstName", "middleName", "lastName", "email", "picture"],
      },
    ],
    order: [["id", "ASC"]],
  });

  return rows
    .filter((row) => row.person)
    .map((row) => {
      const person = row.person;
      return {
        id: person.id,
        firstName: person.firstName || "",
        middleName: person.middleName || "",
        lastName: person.lastName || "",
        name: formatPersonName(person) || "Trip Leader",
        email: person.email || null,
        picture: person.picture || null,
      };
    });
};

/** Map tripId -> ordered leader display names for list views. */
export const getTripLeaderNamesByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const roleId = await getTripLeaderRoleId();
  const rows = await db.tripPeopleRole.findAll({
    where: { tripId: ids, roleId },
    include: [{ model: db.person, as: "person", attributes: ["firstName", "middleName", "lastName"] }],
    order: [["tripId", "ASC"], ["id", "ASC"]],
  });

  for (const row of rows) {
    if (!row.person) continue;
    const name = formatPersonName(row.person);
    if (!name) continue;
    const list = map.get(row.tripId) || [];
    list.push(name);
    map.set(row.tripId, list);
  }

  return map;
};

const countTripMembersByTripIds = async (tripIds, statuses) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const rows = await getActiveTripMemberRows(ids, statuses);

  for (const id of ids) map.set(id, 0);
  for (const row of rows) {
    const tid = Number(row.tripId);
    map.set(tid, (map.get(tid) || 0) + 1);
  }

  return map;
};

/** Map tripId -> count of active trip leaders and participants on the trip. */
export const getActiveParticipantCountsByTripIds = (tripIds) => countTripMembersByTripIds(tripIds, ["approved"]);

/** Map tripId -> { incomplete, pre_approved, approved } counts of Trip Participants (not leaders) on the trip. */
export const getParticipantStatusCountsByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const role = await db.role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } });
  for (const id of ids) map.set(id, { incomplete: 0, pre_approved: 0, approved: 0 });
  if (!role) return map;

  const rows = await db.tripPeopleRole.findAll({
    where: { tripId: ids, roleId: role.id, status: ["incomplete", "pre_approved", "approved"] },
    attributes: ["tripId", "status"],
    raw: true,
  });
  for (const row of rows) map.get(Number(row.tripId))[row.status] += 1;

  return map;
};

/**
 * Map tripId -> { totalRoles, unfilledRoles }: the sum of the trip's role quantities, and each role
 * with fewer pre-approved / approved members than its quantity as { name, needed }, by name.
 */
export const getTripRoleTotalsByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const roles = await db.tripWorkerRole.findAll({
    where: { tripId: ids },
    attributes: ["id", "tripId", "quantity"],
    include: [{ model: db.workerRole, as: "workerRole", attributes: ["name"] }],
  });
  const members = await getActiveTripMemberRows(ids, ["pre_approved", "approved"]);
  const filled = new Map();
  for (const row of members) {
    const roleId = Number(row.tripWorkerRoleId);
    if (row.tripWorkerRoleId != null) filled.set(roleId, (filled.get(roleId) || 0) + 1);
  }

  for (const id of ids) map.set(id, { totalRoles: 0, unfilledRoles: [] });
  for (const role of roles) {
    const totals = map.get(Number(role.tripId));
    const quantity = Number(role.quantity || 0);
    totals.totalRoles += quantity;
    const needed = quantity - (filled.get(Number(role.id)) || 0);
    if (needed > 0) totals.unfilledRoles.push({ name: role.workerRole?.name || "—", needed });
  }
  for (const totals of map.values()) totals.unfilledRoles.sort((a, b) => a.name.localeCompare(b.name));

  return map;
};

/**
 * Map tripId -> { participantsApproved, flightsEntered, roomListComplete } over the trip's incomplete,
 * pre-approved, and approved Trip Leaders / Trip Participants; each is false when there are none.
 */
export const getTripPrepByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const participants = await getActiveTripMemberRows(ids, ["incomplete", "pre_approved", "approved"]);
  const participantIds = participants.map((row) => row.id);
  const segments = participantIds.length
    ? await db.tripFlightSegment.findAll({
        attributes: ["segmentType"],
        include: [
          {
            model: db.tripFlight,
            as: "flight",
            attributes: ["tripPeopleRoleId"],
            where: { tripPeopleRoleId: participantIds },
          },
        ],
        raw: true,
      })
    : [];
  const assignments = participantIds.length
    ? await db.tripRoomAssignment.findAll({
        where: { tripPeopleRoleId: participantIds },
        attributes: ["tripPeopleRoleId"],
        raw: true,
      })
    : [];

  const segmentTypesById = new Map();
  for (const row of segments) {
    const id = Number(row["flight.tripPeopleRoleId"]);
    if (!segmentTypesById.has(id)) segmentTypesById.set(id, new Set());
    segmentTypesById.get(id).add(row.segmentType);
  }
  const roomedIds = new Set(assignments.map((row) => Number(row.tripPeopleRoleId)));

  const participantsByTripId = new Map(ids.map((id) => [id, []]));
  for (const row of participants) participantsByTripId.get(Number(row.tripId))?.push(row);

  for (const [tripId, rows] of participantsByTripId) {
    const hasParticipants = rows.length > 0;
    const hasFlights = (row) => {
      const types = segmentTypesById.get(Number(row.id));
      return !!types && types.has("arrival") && types.has("return");
    };
    map.set(tripId, {
      participantsApproved: hasParticipants && rows.every((row) => row.status === "approved"),
      flightsEntered: hasParticipants && rows.every(hasFlights),
      roomListComplete: hasParticipants && rows.every((row) => roomedIds.has(Number(row.id))),
    });
  }

  return map;
};

/** Map tripId -> sum of total trip costs (cost + organization-booked airfare + add-ons) for pre-approved and approved members. */
export const getActiveParticipantTotalCostsByTripIds = async (trips) => {
  const list = trips || [];
  const ids = list.map((t) => Number(t.id)).filter((id) => !Number.isNaN(id));
  const map = new Map();
  if (!ids.length) return map;

  const defaultCostByTripId = new Map(
    list.map((t) => [
      Number(t.id),
      t.participantCost != null && t.participantCost !== "" ? Number(t.participantCost) : null,
    ])
  );

  const rows = await getActiveTripMemberRows(ids, ["pre_approved", "approved"]);
  const rowIds = rows.map((row) => row.id);
  const orgBookedIds = rows.filter((row) => row.flightPurchaseOption === "organization").map((row) => row.id);
  const addonRows = rowIds.length
    ? await db.tripPeopleRoleExpense.findAll({
        where: { tripPeopleRoleId: rowIds },
        attributes: ["tripPeopleRoleId", "cost"],
        raw: true,
      })
    : [];
  const flightRows = orgBookedIds.length
    ? await db.tripFlight.findAll({
        where: { tripPeopleRoleId: orgBookedIds },
        attributes: ["tripPeopleRoleId", "cost"],
        raw: true,
      })
    : [];
  const extrasByRowId = new Map();
  for (const extra of [...addonRows, ...flightRows]) {
    const id = Number(extra.tripPeopleRoleId);
    extrasByRowId.set(id, (extrasByRowId.get(id) || 0) + (Number(extra.cost) || 0));
  }

  for (const id of ids) map.set(id, 0);
  for (const row of rows) {
    const tid = Number(row.tripId);
    const cost =
      row.participantCost != null && row.participantCost !== ""
        ? Number(row.participantCost)
        : defaultCostByTripId.get(tid);
    if (cost == null || Number.isNaN(cost)) continue;
    const total = cost + (extrasByRowId.get(Number(row.id)) || 0);
    map.set(tid, Math.round(((map.get(tid) || 0) + total) * 100) / 100);
  }

  return map;
};

/** Map tripId -> donation total for pre-approved / approved leaders and participants and general trip gifts. */
export const getDonationTotalsByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const memberRows = await getActiveTripMemberRows(ids, ["pre_approved", "approved"]);
  const memberPeopleIdsByTripId = new Map(ids.map((id) => [id, new Set()]));
  for (const row of memberRows) {
    memberPeopleIdsByTripId.get(Number(row.tripId))?.add(Number(row.peopleId));
  }

  const donations = await db.tripDonation.findAll({
    where: { tripId: ids },
    attributes: ["tripId", "personId", "amount"],
    raw: true,
  });

  for (const id of ids) map.set(id, 0);
  for (const row of donations) {
    const tid = Number(row.tripId);
    const personId = row.personId != null ? Number(row.personId) : null;
    const memberIds = memberPeopleIdsByTripId.get(tid);
    if (personId != null && !memberIds?.has(personId)) continue;
    map.set(tid, (map.get(tid) || 0) + Number(row.amount || 0));
  }

  return map;
};

export const getTripPrimaryLeaderPeopleId = async (tripId, options = {}) => {
  const roleId = await getTripLeaderRoleId();
  const row = await db.tripPeopleRole.findOne({
    where: { tripId, roleId, isPrimaryLeader: true },
    attributes: ["peopleId"],
    transaction: options.transaction,
  });
  return row ? Number(row.peopleId) : null;
};

export const setTripPrimaryLeader = async (tripId, peopleId, options = {}) => {
  const { transaction } = options;
  const roleId = await getTripLeaderRoleId();
  await db.tripPeopleRole.update(
    { isPrimaryLeader: false },
    { where: { tripId, roleId }, transaction }
  );
  if (peopleId == null) return;
  await db.tripPeopleRole.update(
    { isPrimaryLeader: true },
    { where: { tripId, roleId, peopleId }, transaction }
  );
};

/** Returns a 400 message when `primaryLeaderPeopleId` is not among the leaders, else null. */
export const primaryLeaderError = (primaryLeaderPeopleId, leaderPeopleIds) => {
  if (primaryLeaderPeopleId == null || primaryLeaderPeopleId === "") return null;
  const id = parseInt(primaryLeaderPeopleId, 10);
  const leaders = (Array.isArray(leaderPeopleIds) ? leaderPeopleIds : []).map((v) => parseInt(v, 10));
  if (Number.isNaN(id) || !leaders.includes(id)) {
    return "Primary trip leader must be one of the trip leaders.";
  }
  return null;
};

export const syncTripLeaders = async (tripId, orgId, leaderPeopleIds = [], options = {}) => {
  const { transaction } = options;
  const roleId = await getTripLeaderRoleId();
  const allowedIds = await getOrgTripLeaderPeopleIds(orgId);

  const normalized = [
    ...new Set(
      (Array.isArray(leaderPeopleIds) ? leaderPeopleIds : [])
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id))
    ),
  ];

  for (const peopleId of normalized) {
    if (!allowedIds.has(peopleId)) {
      throw new Error("Selected leaders must have the Trip Leader role for this organization.");
    }
  }

  const existing = await db.tripPeopleRole.findAll({
    where: { tripId, roleId },
    transaction,
  });
  const existingIds = new Set(existing.map((r) => Number(r.peopleId)));
  const desiredIds = new Set(normalized);

  for (const row of existing) {
    if (!desiredIds.has(Number(row.peopleId))) {
      await row.destroy({ transaction });
    }
  }

  for (const peopleId of normalized) {
    if (!existingIds.has(peopleId)) {
      await db.tripPeopleRole.create(
        {
          tripId,
          peopleId,
          roleId,
          status: "approved",
          assiginmentDateTime: new Date(),
        },
        { transaction }
      );
    }
  }

  const requested =
    options.primaryLeaderPeopleId != null && options.primaryLeaderPeopleId !== ""
      ? parseInt(options.primaryLeaderPeopleId, 10)
      : null;
  const primary = normalized.includes(requested) ? requested : normalized[0] ?? null;
  await setTripPrimaryLeader(tripId, primary, { transaction });
};
