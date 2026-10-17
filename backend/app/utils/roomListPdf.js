import db from "../models/index.js";
import { formatDate } from "./emailTokenValues.js";
import {
  orBlank,
  joinParts,
  organizationHeader,
  formatFlightDateTime,
  drawOrganizationHeader,
  drawInfoBlock,
  rowHeight,
  drawRow,
  renderPdf,
} from "./pdf.js";

const compareRoomNumbers = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

/** Latest-expiring passport document per person id. */
const loadPassports = async (personIds) => {
  if (!personIds.length) return new Map();
  const documents = await db.personDocument.findAll({
    where: { personId: personIds },
    include: [{ model: db.documentType, as: "documentType", where: { type: "passport" }, attributes: [] }],
    order: [
      ["expirationDate", "DESC"],
      ["id", "DESC"],
    ],
  });
  const byPerson = new Map();
  for (const document of documents) {
    if (!byPerson.has(document.personId)) byPerson.set(document.personId, document);
  }
  return byPerson;
};

/** Arrival date and time of the last Arrival segment, e.g. "Saturday 01/02/2027 3:45 PM". */
const flightArrival = (flight) => {
  const segments = flight?.segments || [];
  if (!segments.length) return "";
  const last = segments.reduce((a, b) => (b.segmentNumber > a.segmentNumber ? b : a));
  return formatFlightDateTime(last.arrivalDate, last.arrivalTime);
};

/** Trip info, hotel info, and room assignment rows ordered by room number, then last and first name. */
export const buildRoomListData = async (tripId) => {
  const trip = await db.trip.findByPk(tripId, {
    include: [{ model: db.organization, as: "organization", attributes: ["name", "logo"] }],
  });
  if (!trip) return null;

  const roomingList = await db.tripRoomingList.findOne({
    where: { tripId },
    include: [
      {
        model: db.tripRoom,
        as: "rooms",
        include: [
          {
            model: db.tripRoomAssignment,
            as: "assignments",
            include: [
              {
                model: db.tripPeopleRole,
                as: "tripPeopleRole",
                include: [
                  {
                    model: db.person,
                    as: "person",
                    attributes: ["id", "firstName", "middleName", "lastName", "email"],
                  },
                  {
                    model: db.tripFlight,
                    as: "flight",
                    attributes: ["id"],
                    include: [
                      {
                        model: db.tripFlightSegment,
                        as: "segments",
                        where: { segmentType: "arrival" },
                        required: false,
                        attributes: ["segmentNumber", "arrivalDate", "arrivalTime"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const assigned = [];
  for (const room of roomingList?.rooms || []) {
    for (const assignment of room.assignments || []) {
      const person = assignment.tripPeopleRole?.person;
      if (person) assigned.push({ room, person, flight: assignment.tripPeopleRole.flight });
    }
  }
  assigned.sort(
    (a, b) =>
      compareRoomNumbers(a.room.roomNumber, b.room.roomNumber) ||
      String(a.person.lastName || "").localeCompare(String(b.person.lastName || "")) ||
      String(a.person.firstName || "").localeCompare(String(b.person.firstName || ""))
  );

  const passports = await loadPassports([...new Set(assigned.map(({ person }) => person.id))]);

  return {
    organization: organizationHeader(trip.organization),
    trip: {
      name: orBlank(trip.name),
      location: orBlank(joinParts([trip.location, trip.city, trip.country], ", ")),
      dates: orBlank(joinParts([formatDate(trip.startDate), formatDate(trip.endDate)], " to ")),
    },
    hotel: {
      hotelName: orBlank(roomingList?.hotelName),
      checkInDate: orBlank(formatDate(roomingList?.checkInDate)),
      notes: orBlank(roomingList?.notes),
    },
    rows: assigned.map(({ room, person, flight }) => {
      const passport = passports.get(person.id);
      return {
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        numberOfNights: room.numberOfNights,
        name: joinParts([person.firstName, person.middleName, person.lastName], " "),
        passportNumber: passport?.documentNumber || "",
        passportExpiration: passport ? formatDate(passport.expirationDate) : "",
        flightArrival: flightArrival(flight),
        email: person.email || "",
      };
    }),
  };
};

const COLUMNS = [
  { key: "roomNumber", label: "Room", width: 45 },
  { key: "roomType", label: "Type", width: 55 },
  { key: "numberOfNights", label: "Nights", width: 40 },
  { key: "name", label: "Name", width: 110 },
  { key: "passportNumber", label: "Passport number", width: 90 },
  { key: "passportExpiration", label: "Passport expiration", width: 100 },
  { key: "flightArrival", label: "Flight arrival", width: 145 },
  { key: "email", label: "Email", width: 135 },
];

/** Render the room list data as a PDF and resolve with its bytes. */
export const renderRoomListPdf = (data) =>
  renderPdf((doc) => {
    drawOrganizationHeader(doc, data.organization);
    doc.font("Helvetica-Bold").fontSize(18).text("Room List");
    doc.moveDown(0.6);
    drawInfoBlock(doc, "Trip", [
      ["Trip", data.trip.name],
      ["Location", data.trip.location],
      ["Dates", data.trip.dates],
    ]);
    drawInfoBlock(doc, "Hotel", [
      ["Hotel", data.hotel.hotelName],
      ["Check-in", data.hotel.checkInDate],
      ["Notes", data.hotel.notes],
    ]);

    doc.font("Helvetica-Bold").fontSize(12).text("Room assignments");
    doc.moveDown(0.3);

    if (!data.rows.length) {
      doc.font("Helvetica").fontSize(10).text("No room assignments.");
      return;
    }

    const headerValues = COLUMNS.map((column) => column.label);
    const bottom = doc.page.height - doc.page.margins.bottom;
    let y = drawRow(doc, COLUMNS, headerValues, doc.y, { bold: true });
    for (const row of data.rows) {
      const values = COLUMNS.map((column) => String(row[column.key] ?? ""));
      doc.font("Helvetica").fontSize(9);
      if (y + rowHeight(doc, COLUMNS, values) > bottom) {
        doc.addPage();
        y = drawRow(doc, COLUMNS, headerValues, doc.page.margins.top, { bold: true });
      }
      y = drawRow(doc, COLUMNS, values, y);
    }
  });
