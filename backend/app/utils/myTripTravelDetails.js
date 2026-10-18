import db from "../models/index.js";

const SHOWN_STATUSES = ["incomplete", "applied", "approved"];
const SEGMENT_TYPE_ORDER = { arrival: 0, return: 1 };

const addDays = (dateOnly, days) => {
  if (!dateOnly) return null;
  const d = new Date(`${String(dateOnly).slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
};

const personName = (person) => [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();

const loadRoom = async (tripPeopleRoleId) => {
  const assignment = await db.tripRoomAssignment.findOne({
    where: { tripPeopleRoleId },
    include: [
      {
        model: db.tripRoom,
        as: "room",
        include: [
          { model: db.tripRoomingList, as: "roomingList" },
          {
            model: db.tripRoomAssignment,
            as: "assignments",
            include: [
              {
                model: db.tripPeopleRole,
                as: "tripPeopleRole",
                attributes: ["id"],
                include: [{ model: db.person, as: "person", attributes: ["firstName", "lastName"] }],
              },
            ],
          },
        ],
      },
    ],
  });
  const room = assignment?.room;
  if (!room) return null;
  const roommates = (room.assignments || [])
    .filter((a) => Number(a.tripPeopleRoleId) !== Number(tripPeopleRoleId))
    .map((a) => a.tripPeopleRole?.person)
    .filter(Boolean)
    .sort(
      (a, b) =>
        String(a.lastName || "").localeCompare(String(b.lastName || "")) ||
        String(a.firstName || "").localeCompare(String(b.firstName || ""))
    )
    .map(personName)
    .filter(Boolean);
  const checkInDate = room.roomingList?.checkInDate || null;
  return {
    hotelName: room.roomingList?.hotelName || null,
    roomType: room.roomType,
    roommates,
    checkInDate,
    checkOutDate: checkInDate ? addDays(checkInDate, room.numberOfNights) : null,
  };
};

const loadFlightSegments = async (tripPeopleRoleId) => {
  const flight = await db.tripFlight.findOne({
    where: { tripPeopleRoleId },
    include: [
      {
        model: db.tripFlightSegment,
        as: "segments",
        include: [
          { model: db.airline, as: "airline", attributes: ["name"] },
          { model: db.airport, as: "departureAirport", attributes: ["code"] },
          { model: db.airport, as: "arrivalAirport", attributes: ["code"] },
        ],
      },
    ],
  });
  return (flight?.segments || [])
    .map((s) => ({
      segmentType: s.segmentType,
      segmentNumber: s.segmentNumber,
      airlineName: s.airline?.name || null,
      flightNumber: s.flightNumber,
      departureAirportCode: s.departureAirport?.code || null,
      departureDate: s.departureDate,
      departureTime: s.departureTime,
      arrivalAirportCode: s.arrivalAirport?.code || null,
      arrivalDate: s.arrivalDate,
      arrivalTime: s.arrivalTime,
    }))
    .sort(
      (a, b) =>
        (SEGMENT_TYPE_ORDER[a.segmentType] ?? 9) - (SEGMENT_TYPE_ORDER[b.segmentType] ?? 9) ||
        Number(a.segmentNumber) - Number(b.segmentNumber)
    );
};

const loadSelectedTravelOptions = async (tripPeopleRoleId) => {
  const rows = await db.tripPeopleRoleOption.findAll({
    where: { tripPeopleRoleId, selected: true },
    include: [{ model: db.tripTravelOption, as: "tripTravelOption" }],
  });
  return rows
    .map((row) => row.tripTravelOption)
    .filter(Boolean)
    .map((o) => ({
      id: o.id,
      description: o.description,
      setNumber: Number(o.setNumber),
      priceAdjustment: Number(o.priceAdjustment) || 0,
    }))
    .sort((a, b) => a.setNumber - b.setNumber || a.id - b.id);
};

/** Room, flights, and selected trip options for the signed-in person's assignment (Feature 61). */
export const loadMyTripTravelDetails = async (assignment) => {
  if (!SHOWN_STATUSES.includes(assignment.status)) {
    return { room: null, flightPurchaseOption: null, flightSegments: [], selectedTravelOptions: [] };
  }
  return {
    room: await loadRoom(assignment.id),
    flightPurchaseOption: assignment.flightPurchaseOption || null,
    flightSegments: await loadFlightSegments(assignment.id),
    selectedTravelOptions: await loadSelectedTravelOptions(assignment.id),
  };
};
