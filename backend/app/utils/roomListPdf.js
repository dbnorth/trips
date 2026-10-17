import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import db from "../models/index.js";
import { formatDate } from "./emailTokenValues.js";

const IMAGES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../images");
const PDF_LOGO_EXTENSIONS = [".png", ".jpg", ".jpeg"];

/** Absolute path of the organization logo when it is a PNG or JPEG file that exists. */
const logoFilePath = (logo) => {
  if (!logo || !PDF_LOGO_EXTENSIONS.includes(path.extname(logo).toLowerCase())) return null;
  const file = path.join(IMAGES_DIR, logo);
  if (!file.startsWith(IMAGES_DIR + path.sep)) return null;
  return fs.existsSync(file) ? file : null;
};

const BLANK = "—";
const orBlank = (value) => (value == null || String(value).trim() === "" ? BLANK : String(value));
const joinParts = (parts, separator) =>
  parts.map((part) => (part == null ? "" : String(part).trim())).filter(Boolean).join(separator);

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

/** "15:45" → "3:45 PM"; values that are not HH:MM are returned as entered. */
const formatTime12 = (value) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || "").trim());
  if (!match) return String(value || "").trim();
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? "AM" : "PM"}`;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2027-01-02" → "Saturday 01/02/2027". */
const formatWeekdayDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return "";
  const [, year, month, day] = match;
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()];
  return `${weekday} ${month}/${day}/${year}`;
};

/** Arrival date and time of the last Arrival segment, e.g. "Saturday 01/02/2027 3:45 PM". */
const flightArrival = (flight) => {
  const segments = flight?.segments || [];
  if (!segments.length) return "";
  const last = segments.reduce((a, b) => (b.segmentNumber > a.segmentNumber ? b : a));
  return joinParts([formatWeekdayDate(last.arrivalDate), formatTime12(last.arrivalTime)], " ");
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
    organization: {
      name: orBlank(trip.organization?.name),
      logoFile: logoFilePath(trip.organization?.logo),
    },
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
const CELL_PADDING = 4;

const drawInfoBlock = (doc, heading, lines) => {
  doc.font("Helvetica-Bold").fontSize(12).text(heading);
  doc.moveDown(0.2);
  for (const [label, value] of lines) {
    doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(value);
  }
  doc.moveDown(0.8);
};

const LOGO_SIZE = 48;

const drawOrganizationHeader = (doc, organization) => {
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  let nameX = left;
  if (organization.logoFile) {
    try {
      doc.image(organization.logoFile, left, top, { fit: [LOGO_SIZE, LOGO_SIZE], valign: "center" });
      nameX = left + LOGO_SIZE + 12;
    } catch {
      nameX = left;
    }
  }
  doc.font("Helvetica-Bold").fontSize(16);
  const nameHeight = doc.heightOfString(organization.name, { width: 500 });
  doc.text(organization.name, nameX, top + Math.max(0, (LOGO_SIZE - nameHeight) / 2), { width: 500 });
  doc.x = left;
  doc.y = top + LOGO_SIZE + 12;
};

const rowHeight = (doc, values) =>
  Math.max(
    ...COLUMNS.map((column, index) =>
      doc.heightOfString(values[index], { width: column.width - CELL_PADDING * 2 })
    )
  ) +
  CELL_PADDING * 2;

const drawRow = (doc, values, y, { bold = false } = {}) => {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
  const height = rowHeight(doc, values);
  let x = doc.page.margins.left;
  for (const [index, column] of COLUMNS.entries()) {
    doc.text(values[index], x + CELL_PADDING, y + CELL_PADDING, {
      width: column.width - CELL_PADDING * 2,
    });
    x += column.width;
  }
  doc
    .moveTo(doc.page.margins.left, y + height)
    .lineTo(x, y + height)
    .lineWidth(0.5)
    .strokeColor("#999999")
    .stroke();
  return y + height;
};

/** Render the room list data as a PDF and resolve with its bytes. */
export const renderRoomListPdf = (data) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", layout: "landscape", margin: 36 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

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
      doc.end();
      return;
    }

    const headerValues = COLUMNS.map((column) => column.label);
    const bottom = doc.page.height - doc.page.margins.bottom;
    let y = drawRow(doc, headerValues, doc.y, { bold: true });
    for (const row of data.rows) {
      const values = COLUMNS.map((column) => String(row[column.key] ?? ""));
      doc.font("Helvetica").fontSize(9);
      if (y + rowHeight(doc, values) > bottom) {
        doc.addPage();
        y = drawRow(doc, headerValues, doc.page.margins.top, { bold: true });
      }
      y = drawRow(doc, values, y);
    }
    doc.end();
  });
