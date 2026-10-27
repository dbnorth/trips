/**
 * Feature 54 — Room List PDF
 * Spec: features/feature-54-room-list-pdf.md
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { buildRoomListData } from "../app/utils/roomListPdf.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  TINY_PNG,
} from "./helpers.js";

const LOGOS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../images/logos");
const TEST_LOGO = "logos/room-list-pdf-test-logo.png";
const TEST_LOGO_FILE = path.join(LOGOS_DIR, "room-list-pdf-test-logo.png");

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("Feature 54 — Room List PDF", () => {
  let admin;
  let trip;
  let passportType;

  const addPerson = (firstName, lastName, extra = {}) =>
    db.person.create({ firstName, lastName, email: `${firstName.toLowerCase()}@example.org`, ...extra });

  const addAssignment = async (personId) =>
    db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: personId,
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });

  const addRoomingList = (fields = {}) =>
    db.tripRoomingList.create({
      tripId: trip.id,
      hotelName: "Hotel Casa Santo Domingo",
      checkInDate: "2027-01-02",
      notes: "Late arrival",
      ...fields,
    });

  /** Put each person in the given room, creating the room on first use. */
  const assignRooms = async (roomingList, entries) => {
    const rooms = new Map();
    for (const { roomNumber, person, roomType = "Double", numberOfNights = 7 } of entries) {
      if (!rooms.has(roomNumber)) {
        rooms.set(
          roomNumber,
          await db.tripRoom.create({
            tripRoomingListId: roomingList.id,
            roomNumber,
            roomType,
            numberOfNights,
          })
        );
      }
      const assignment = await addAssignment(person.id);
      await db.tripRoomAssignment.create({
        tripRoomId: rooms.get(roomNumber).id,
        tripPeopleRoleId: assignment.id,
      });
    }
  };

  const addPassport = (person, documentNumber, expirationDate) =>
    db.personDocument.create({
      personId: person.id,
      documentTypeId: passportType.id,
      documentNumber,
      expirationDate,
      countryIssued: "US",
    });

  /** Flight for the person's assignment on the trip with segments [segmentType, segmentNumber, arrivalDate, arrivalTime]. */
  const addFlight = async (person, segments) => {
    const assignment = await db.tripPeopleRole.findOne({ where: { tripId: trip.id, peopleId: person.id } });
    const [airport] = await db.airport.findOrCreate({
      where: { code: "GUA" },
      defaults: { airportName: "La Aurora", city: "Guatemala City", country: "GT" },
    });
    const [airline] = await db.airline.findOrCreate({ where: { code: "AA" }, defaults: { name: "American Airlines" } });
    const flight = await db.tripFlight.create({ tripPeopleRoleId: assignment.id });
    for (const [segmentType, segmentNumber, arrivalDate, arrivalTime] of segments) {
      await db.tripFlightSegment.create({
        tripFlightId: flight.id,
        segmentType,
        segmentNumber,
        departureAirportId: airport.id,
        airlineId: airline.id,
        flightNumber: `AA${segmentNumber}`,
        departureDate: arrivalDate,
        departureTime: "08:00",
        arrivalAirportId: airport.id,
        arrivalDate,
        arrivalTime,
      });
    }
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "admin@example.org", orgName: "Hope Mission" });
    trip = await db.trip.create({
      orgId: admin.org.id,
      name: "Guatemala Clinic",
      location: "Antigua",
      country: "Guatemala",
      startDate: "2027-01-02",
      endDate: "2027-01-09",
      status: "active",
    });
    passportType = await db.documentType.create({ orgId: admin.org.id, description: "Passport", type: "passport" });
  });

  afterEach(async () => {
    fs.rmSync(TEST_LOGO_FILE, { force: true });
    await resetTestDatabase();
  });

  const useTestLogo = async () => {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
    fs.writeFileSync(TEST_LOGO_FILE, TINY_PNG);
    await admin.org.update({ logo: TEST_LOGO });
  };

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-54.1 — Download the room list as a PDF", () => {
    it("Room list data for the PDF", async () => {
      const ana = await addPerson("Ana", "Lopez", { middleName: "Maria" });
      await addPassport(ana, "P1234567", "2031-06-15");
      await assignRooms(await addRoomingList(), [{ roomNumber: "12", person: ana }]);

      const data = await buildRoomListData(trip.id);

      expect(data.organization).toEqual({ name: "Hope Mission", logoFile: null });
      expect(data.trip).toEqual({
        name: "Guatemala Clinic",
        location: "Antigua, Guatemala",
        dates: "January 2, 2027 to January 9, 2027",
      });
      expect(data.hotel).toEqual({
        hotelName: "Hotel Casa Santo Domingo",
        checkInDate: "January 2, 2027",
        notes: "Late arrival",
      });
      expect(data.rows).toEqual([
        {
          roomNumber: "12",
          roomType: "Double",
          numberOfNights: 7,
          name: "Ana Maria Lopez",
          passportNumber: "P1234567",
          passportExpiration: "June 15, 2031",
          flightArrival: "",
          email: "ana@example.org",
        },
      ]);
    });

    it("Organization logo in the header", async () => {
      await useTestLogo();

      const data = await buildRoomListData(trip.id);

      expect(data.organization).toEqual({ name: "Hope Mission", logoFile: TEST_LOGO_FILE });
    });

    it("Logo the PDF cannot show", async () => {
      await admin.org.update({ logo: "logos/org-logo.gif" });

      const data = await buildRoomListData(trip.id);

      expect(data.organization).toEqual({ name: "Hope Mission", logoFile: null });
    });

    it("Rows are ordered by room number", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const ben = await addPerson("Ben", "Cruz");
      const carl = await addPerson("Carl", "Diaz");
      const dana = await addPerson("Dana", "Ruiz");
      await assignRooms(await addRoomingList(), [
        { roomNumber: "10", person: carl },
        { roomNumber: "101", person: dana },
        { roomNumber: "2", person: ana },
        { roomNumber: "2", person: ben },
      ]);

      const data = await buildRoomListData(trip.id);

      expect(data.rows.map((row) => [row.roomNumber, row.name])).toEqual([
        ["2", "Ben Cruz"],
        ["2", "Ana Lopez"],
        ["10", "Carl Diaz"],
        ["101", "Dana Ruiz"],
      ]);
    });

    it("The latest passport is used", async () => {
      const ana = await addPerson("Ana", "Lopez");
      await addPassport(ana, "OLD111", "2027-03-01");
      await addPassport(ana, "NEW222", "2031-06-15");
      await assignRooms(await addRoomingList(), [{ roomNumber: "12", person: ana }]);

      const data = await buildRoomListData(trip.id);

      expect(data.rows[0]).toMatchObject({
        passportNumber: "NEW222",
        passportExpiration: "June 15, 2031",
      });
    });

    it("No passport document", async () => {
      const ben = await addPerson("Ben", "Cruz");
      await assignRooms(await addRoomingList(), [{ roomNumber: "3", person: ben }]);

      const data = await buildRoomListData(trip.id);

      expect(data.rows[0]).toMatchObject({ passportNumber: "", passportExpiration: "" });
    });

    it("Flight arrival from the last arrival segment", async () => {
      const ana = await addPerson("Ana", "Lopez");
      await assignRooms(await addRoomingList(), [{ roomNumber: "12", person: ana }]);
      await addFlight(ana, [
        ["arrival", 1, "2027-01-01", "22:10"],
        ["arrival", 2, "2027-01-02", "15:45"],
        ["return", 1, "2027-01-09", "18:30"],
      ]);

      const data = await buildRoomListData(trip.id);

      expect(data.rows[0].flightArrival).toBe("Saturday 01/02/2027 3:45 PM");
    });

    it("Flight arrival at midnight and noon", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const ben = await addPerson("Ben", "Cruz");
      await assignRooms(await addRoomingList(), [
        { roomNumber: "1", person: ana },
        { roomNumber: "2", person: ben },
      ]);
      await addFlight(ana, [["arrival", 1, "2027-01-02", "00:05"]]);
      await addFlight(ben, [["arrival", 1, "2027-01-02", "12:00"]]);

      const data = await buildRoomListData(trip.id);

      expect(data.rows.map((row) => [row.name, row.flightArrival])).toEqual([
        ["Ana Lopez", "Saturday 01/02/2027 12:05 AM"],
        ["Ben Cruz", "Saturday 01/02/2027 12:00 PM"],
      ]);
    });

    it("No flight", async () => {
      const ben = await addPerson("Ben", "Cruz");
      await assignRooms(await addRoomingList(), [{ roomNumber: "3", person: ben }]);

      const data = await buildRoomListData(trip.id);

      expect(data.rows[0].flightArrival).toBe("");
    });

    it("No room assignments", async () => {
      const data = await buildRoomListData(trip.id);

      expect(data.trip.name).toBe("Guatemala Clinic");
      expect(data.hotel).toEqual({ hotelName: "—", checkInDate: "—", notes: "—" });
      expect(data.rows).toEqual([]);
    });

    it("Staff download the PDF", async () => {
      await useTestLogo();
      const ana = await addPerson("Ana", "Lopez");
      await assignRooms(await addRoomingList(), [{ roomNumber: "12", person: ana }]);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/rooming/pdf`)
        .set(admin.authHeader)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toContain(
        'filename="Room List - Guatemala Clinic.pdf"'
      );
      expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("Participants cannot download the PDF", async () => {
      const participant = await registerUser({
        email: "pat@example.org",
        firstName: "Pat",
        lastName: "Participant",
        orgIds: [admin.org.id],
      });
      await addAssignment(participant.user.personId);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/rooming/pdf`)
        .set(participant.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
