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

const ELIGIBLE_STATUSES = ["incomplete", "applied", "approved"];
const BOOKED_BY = { organization: "Org", self: "Participant" };

const segmentRow = (segment) => ({
  airline: segment.airline?.name || "",
  flightNumber: segment.flightNumber || "",
  from: segment.departureAirport?.code || "",
  departure: formatFlightDateTime(segment.departureDate, segment.departureTime),
  to: segment.arrivalAirport?.code || "",
  arrival: formatFlightDateTime(segment.arrivalDate, segment.arrivalTime),
});

const segmentsOfType = (segments, type) =>
  segments
    .filter((segment) => (segment.segmentType || "arrival") === type)
    .sort((a, b) => a.segmentNumber - b.segmentNumber)
    .map(segmentRow);

/** Trip info and one block per eligible participant (last, first name order) with Arrival and Return segments. */
export const buildFlightsData = async (tripId) => {
  const trip = await db.trip.findByPk(tripId, {
    include: [{ model: db.organization, as: "organization", attributes: ["name", "logo"] }],
  });
  if (!trip) return null;

  const assignments = await db.tripPeopleRole.findAll({
    where: { tripId, status: ELIGIBLE_STATUSES },
    attributes: ["id", "flightPurchaseOption"],
    include: [
      { model: db.person, as: "person", attributes: ["id", "firstName", "middleName", "lastName"] },
      {
        model: db.tripFlight,
        as: "flight",
        attributes: ["id"],
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
      },
    ],
  });

  const participants = assignments
    .filter((assignment) => assignment.person)
    .sort(
      (a, b) =>
        String(a.person.lastName || "").localeCompare(String(b.person.lastName || "")) ||
        String(a.person.firstName || "").localeCompare(String(b.person.firstName || "")) ||
        a.id - b.id
    )
    .map((assignment) => {
      const segments = assignment.flight?.segments || [];
      return {
        name: joinParts([assignment.person.firstName, assignment.person.middleName, assignment.person.lastName], " "),
        bookedBy: BOOKED_BY[assignment.flightPurchaseOption] || "",
        arrival: segmentsOfType(segments, "arrival"),
        return: segmentsOfType(segments, "return"),
      };
    });

  return {
    organization: organizationHeader(trip.organization),
    trip: {
      name: orBlank(trip.name),
      dates: orBlank(joinParts([formatDate(trip.startDate), formatDate(trip.endDate)], " to ")),
    },
    participants,
  };
};

const COLUMNS = [
  { key: "participant", label: "Participant", width: 105 },
  { key: "bookedBy", label: "Booked by", width: 60 },
  { key: "flight", label: "Flight", width: 45 },
  { key: "airline", label: "Airline", width: 95 },
  { key: "flightNumber", label: "Flight number", width: 55 },
  { key: "from", label: "From", width: 35 },
  { key: "departure", label: "Departure", width: 145 },
  { key: "to", label: "To", width: 35 },
  { key: "arrival", label: "Arrival", width: 145 },
];

/** Table rows for a participant: Arrival segments then Return segments, a blank row for a type with none. */
const blockRows = (participant) => {
  const rows = [];
  for (const [flight, segments] of [
    ["Arrival", participant.arrival],
    ["Return", participant.return],
  ]) {
    for (const segment of segments.length ? segments : [{}]) rows.push({ flight, ...segment });
  }
  rows[0] = { ...rows[0], participant: participant.name, bookedBy: participant.bookedBy };
  return rows;
};

/** Render the flights data as a PDF and resolve with its bytes. */
export const renderFlightsPdf = (data) =>
  renderPdf((doc) => {
    drawOrganizationHeader(doc, data.organization);
    doc.font("Helvetica-Bold").fontSize(18).text("Flights");
    doc.moveDown(0.6);
    drawInfoBlock(doc, "Trip", [
      ["Trip", data.trip.name],
      ["Dates", data.trip.dates],
    ]);

    if (!data.participants.length) {
      doc.font("Helvetica").fontSize(10).text("No participants.");
      return;
    }

    const headerValues = COLUMNS.map((column) => column.label);
    const bottom = doc.page.height - doc.page.margins.bottom;
    let y = drawRow(doc, COLUMNS, headerValues, doc.y, { bold: true, lineColor: "#555555" });
    for (const participant of data.participants) {
      const rows = blockRows(participant);
      for (const [index, row] of rows.entries()) {
        const values = COLUMNS.map((column) => String(row[column.key] ?? ""));
        doc.font("Helvetica").fontSize(9);
        if (y + rowHeight(doc, COLUMNS, values) > bottom) {
          doc.addPage();
          y = drawRow(doc, COLUMNS, headerValues, doc.page.margins.top, { bold: true, lineColor: "#555555" });
        }
        const lastInBlock = index === rows.length - 1;
        y = drawRow(doc, COLUMNS, values, y, { lineColor: lastInBlock ? "#555555" : "#dddddd" });
      }
    }
  });
