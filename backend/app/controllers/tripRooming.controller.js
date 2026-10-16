import db from "../models/index.js";
import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
} from "../authorization/accessControl.js";
import { TRIP_ROOM_TYPES } from "../models/tripRoom.model.js";

const Trip = db.trip;
const TripPeopleRole = db.tripPeopleRole;
const TripRoomingList = db.tripRoomingList;
const TripRoom = db.tripRoom;
const TripRoomAssignment = db.tripRoomAssignment;
const Op = db.Sequelize.Op;

const ELIGIBLE_STATUSES = ["incomplete", "applied", "approved"];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const canManageTripRooming = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return { ok: false, status: 404, trip: null };
  if (isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req)) {
    return { ok: true, trip: access.trip };
  }
  if (isTripLeaderForTrip(req, tripId)) {
    return { ok: true, trip: access.trip };
  }
  return { ok: false, status: 403, trip: access.trip };
};

const forbid = (res, manage) =>
  res.status(manage.status).send({
    message: manage.status === 404 ? "Trip not found." : "Forbidden.",
  });

const normalizeRoomNumber = (value) => {
  if (value == null) return "";
  return String(value).trim();
};

const buildRoomingPayload = async (tripId) => {
  const trip = await Trip.findByPk(tripId, {
    attributes: ["id", "name", "startDate", "endDate"],
  });
  if (!trip) return null;
  const tripJson = trip.toJSON();

  const roomingList = await TripRoomingList.findOne({
    where: { tripId },
    include: [
      {
        model: TripRoom,
        as: "rooms",
        include: [
          {
            model: TripRoomAssignment,
            as: "assignments",
            attributes: ["id", "tripPeopleRoleId"],
          },
        ],
      },
    ],
  });

  const rooms = (roomingList?.rooms || []).map((room) => {
    const json = room.toJSON();
    return {
      id: json.id,
      roomNumber: json.roomNumber,
      roomType: json.roomType,
      numberOfNights: json.numberOfNights,
      assignmentTripPeopleRoleIds: (json.assignments || []).map((a) => a.tripPeopleRoleId),
    };
  });

  const assignmentByTprId = new Map();
  for (const room of rooms) {
    for (const tprId of room.assignmentTripPeopleRoleIds) {
      assignmentByTprId.set(Number(tprId), {
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        numberOfNights: room.numberOfNights,
      });
    }
  }

  const assignments = await TripPeopleRole.findAll({
    where: { tripId, status: { [Op.in]: ELIGIBLE_STATUSES } },
    include: [
      {
        model: db.person,
        as: "person",
        attributes: ["id", "firstName", "lastName"],
      },
    ],
    order: [["id", "ASC"]],
  });

  const participants = assignments.map((row) => {
    const json = row.toJSON();
    const assigned = assignmentByTprId.get(Number(json.id)) || null;
    return {
      tripPeopleRoleId: json.id,
      peopleId: json.peopleId,
      firstName: json.person?.firstName || "",
      lastName: json.person?.lastName || "",
      hasPreferredRoommate: !!json.hasPreferredRoommate,
      preferredRoommateNames: json.preferredRoommateNames || null,
      roomNumber: assigned?.roomNumber ?? null,
      roomType: assigned?.roomType ?? null,
      numberOfNights: assigned?.numberOfNights ?? null,
    };
  });

  return {
    trip: {
      id: tripJson.id,
      name: tripJson.name,
      startDate: tripJson.startDate,
      endDate: tripJson.endDate,
    },
    roomingList: roomingList
      ? {
          id: roomingList.id,
          hotelName: roomingList.hotelName || "",
          checkInDate: roomingList.checkInDate || null,
          notes: roomingList.notes || "",
        }
      : null,
    rooms,
    participants,
  };
};

const parseAssignments = (bodyAssignments, eligibleIds) => {
  const assigned = [];
  for (const row of bodyAssignments || []) {
    const tripPeopleRoleId = Number(row.tripPeopleRoleId);
    if (!Number.isFinite(tripPeopleRoleId) || !eligibleIds.has(tripPeopleRoleId)) {
      return {
        ok: false,
        message: "One or more assignments reference an invalid participant for this trip.",
      };
    }
    const roomNumber = normalizeRoomNumber(row.roomNumber);
    if (!roomNumber) continue;

    const roomType = row.roomType != null ? String(row.roomType).trim() : "";
    if (!TRIP_ROOM_TYPES.includes(roomType)) {
      return {
        ok: false,
        message: `Room type must be one of: ${TRIP_ROOM_TYPES.join(", ")}.`,
      };
    }

    const nights = Number(row.numberOfNights);
    if (!Number.isInteger(nights) || nights <= 0) {
      return {
        ok: false,
        message: `Number of nights must be a positive integer for room ${roomNumber}.`,
      };
    }

    assigned.push({ tripPeopleRoleId, roomNumber, roomType, numberOfNights: nights });
  }
  return { ok: true, assigned };
};

const groupRooms = (assigned) => {
  const groups = new Map();
  for (const row of assigned) {
    const key = row.roomNumber;
    if (!groups.has(key)) {
      groups.set(key, {
        roomNumber: key,
        roomType: row.roomType,
        numberOfNights: row.numberOfNights,
        tripPeopleRoleIds: [row.tripPeopleRoleId],
      });
      continue;
    }
    const group = groups.get(key);
    if (group.roomType !== row.roomType) {
      return {
        ok: false,
        message: `Conflicting room type for room ${key}. All assignees must use the same room type.`,
      };
    }
    if (group.numberOfNights !== row.numberOfNights) {
      return {
        ok: false,
        message: `Conflicting number of nights for room ${key}. All assignees must use the same nights.`,
      };
    }
    group.tripPeopleRoleIds.push(row.tripPeopleRoleId);
  }
  return { ok: true, rooms: [...groups.values()] };
};

const exports = {};

exports.findRooming = async (req, res) => {
  try {
    const tripId = req.params.id;
    const manage = await canManageTripRooming(req, tripId);
    if (!manage.ok) return forbid(res, manage);

    const payload = await buildRoomingPayload(tripId);
    if (!payload) return res.status(404).send({ message: "Trip not found." });
    res.send(payload);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.updateRooming = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const tripId = req.params.id;
    const manage = await canManageTripRooming(req, tripId);
    if (!manage.ok) {
      await transaction.rollback();
      return forbid(res, manage);
    }

    const eligibleRows = await TripPeopleRole.findAll({
      where: { tripId, status: { [Op.in]: ELIGIBLE_STATUSES } },
      attributes: ["id"],
      transaction,
    });
    const eligibleIds = new Set(eligibleRows.map((r) => Number(r.id)));

    const parsed = parseAssignments(req.body.assignments, eligibleIds);
    if (!parsed.ok) {
      await transaction.rollback();
      return res.status(400).send({ message: parsed.message });
    }

    const grouped = groupRooms(parsed.assigned);
    if (!grouped.ok) {
      await transaction.rollback();
      return res.status(400).send({ message: grouped.message });
    }

    const hotelName =
      req.body.hotelName != null ? String(req.body.hotelName).trim() : "";
    const notes = req.body.notes != null ? String(req.body.notes) : "";
    let checkInDate = req.body.checkInDate;
    if (checkInDate != null && checkInDate !== "") {
      checkInDate = String(checkInDate).slice(0, 10);
      if (!DATE_ONLY.test(checkInDate)) {
        await transaction.rollback();
        return res.status(400).send({ message: "Start date must be a valid date." });
      }
    } else {
      checkInDate = null;
    }

    if (parsed.assigned.length > 0) {
      if (!hotelName) {
        await transaction.rollback();
        return res.status(400).send({ message: "Hotel name is required when rooms are assigned." });
      }
      if (!checkInDate) {
        await transaction.rollback();
        return res
          .status(400)
          .send({ message: "Start date is required when rooms are assigned." });
      }
    }

    let roomingList = await TripRoomingList.findOne({ where: { tripId }, transaction });
    if (!roomingList) {
      roomingList = await TripRoomingList.create(
        { tripId, hotelName: hotelName || null, checkInDate, notes: notes || null },
        { transaction }
      );
    } else {
      await roomingList.update(
        { hotelName: hotelName || null, checkInDate, notes: notes || null },
        { transaction }
      );
    }

    const existingRooms = await TripRoom.findAll({
      where: { tripRoomingListId: roomingList.id },
      include: [{ model: TripRoomAssignment, as: "assignments" }],
      transaction,
    });

    for (const room of existingRooms) {
      await TripRoomAssignment.destroy({ where: { tripRoomId: room.id }, transaction });
      await room.destroy({ transaction });
    }

    for (const roomDef of grouped.rooms) {
      const room = await TripRoom.create(
        {
          tripRoomingListId: roomingList.id,
          roomNumber: roomDef.roomNumber,
          roomType: roomDef.roomType,
          numberOfNights: roomDef.numberOfNights,
        },
        { transaction }
      );
      for (const tripPeopleRoleId of roomDef.tripPeopleRoleIds) {
        await TripRoomAssignment.create(
          { tripRoomId: room.id, tripPeopleRoleId },
          { transaction }
        );
      }
    }

    await transaction.commit();
    const payload = await buildRoomingPayload(tripId);
    res.send(payload);
  } catch (err) {
    await transaction.rollback();
    res.status(500).send({ message: err.message });
  }
};

export default exports;
