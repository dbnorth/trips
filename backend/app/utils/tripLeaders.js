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

const getActiveTripMemberRows = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  if (!ids.length) return [];

  const roleIds = await getTripMemberRoleIds();
  if (!roleIds.length) return [];

  return db.tripPeopleRole.findAll({
    where: { tripId: ids, status: "approved", roleId: roleIds },
    attributes: ["id", "tripId", "peopleId", "participantCost", "flightPurchaseOption"],
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

/** Map tripId -> count of active trip leaders and participants on the trip. */
export const getActiveParticipantCountsByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const rows = await getActiveTripMemberRows(ids);

  for (const id of ids) map.set(id, 0);
  for (const row of rows) {
    const tid = Number(row.tripId);
    map.set(tid, (map.get(tid) || 0) + 1);
  }

  return map;
};

/** Map tripId -> sum of total trip costs (cost + organization-booked airfare + add-ons) for active members. */
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

  const rows = await getActiveTripMemberRows(ids);
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

/** Map tripId -> donation total for active leaders/participants and general trip gifts. */
export const getDonationTotalsByTripIds = async (tripIds) => {
  const ids = [...new Set((tripIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)))];
  const map = new Map();
  if (!ids.length) return map;

  const memberRows = await getActiveTripMemberRows(ids);
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
