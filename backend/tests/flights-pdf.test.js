/**
 * Feature 55 — Flights PDF
 * Spec: features/feature-55-flights-pdf.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { buildFlightsData, renderFlightsPdf } from "../app/utils/flightsPdf.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("Feature 55 — Flights PDF", () => {
  let admin;
  let trip;
  let airports;
  let airline;

  const addPerson = (firstName, lastName, extra = {}) =>
    db.person.create({ firstName, lastName, email: `${firstName.toLowerCase()}@example.org`, ...extra });

  const addAssignment = async (person, { status = "approved", flightPurchaseOption = null } = {}) =>
    db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.id,
      roleId: (await findRole("Trip Participant")).id,
      status,
      flightPurchaseOption,
    });

  /** Segments: [segmentType, segmentNumber, flightNumber, from, departureDate, departureTime, to, arrivalDate, arrivalTime]. */
  const addFlight = async (assignment, segments) => {
    const flight = await db.tripFlight.create({ tripPeopleRoleId: assignment.id });
    for (const [segmentType, segmentNumber, flightNumber, from, departureDate, departureTime, to, arrivalDate, arrivalTime] of segments) {
      await db.tripFlightSegment.create({
        tripFlightId: flight.id,
        segmentType,
        segmentNumber,
        airlineId: airline.id,
        flightNumber,
        departureAirportId: airports[from].id,
        departureDate,
        departureTime,
        arrivalAirportId: airports[to].id,
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
    airports = {};
    for (const [code, city] of [
      ["DFW", "Dallas"],
      ["MIA", "Miami"],
      ["GUA", "Guatemala City"],
    ]) {
      airports[code] = await db.airport.create({ code, airportName: `${city} airport`, city, country: "XX" });
    }
    airline = await db.airline.create({ code: "AA", name: "American Airlines" });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-55.1 — Download the trip's flights as a PDF", () => {
    it("Flights data for the PDF", async () => {
      const ana = await addPerson("Ana", "Lopez", { middleName: "Maria" });
      const assignment = await addAssignment(ana, { flightPurchaseOption: "organization" });
      await addFlight(assignment, [
        ["return", 1, "AA300", "GUA", "2027-01-09", "13:00", "DFW", "2027-01-09", "18:30"],
        ["arrival", 2, "AA200", "MIA", "2027-01-02", "12:30", "GUA", "2027-01-02", "15:45"],
        ["arrival", 1, "AA100", "DFW", "2027-01-02", "06:15", "MIA", "2027-01-02", "10:05"],
      ]);

      const data = await buildFlightsData(trip.id);

      expect(data.organization).toEqual({ name: "Hope Mission", logoFile: null });
      expect(data.trip).toEqual({ name: "Guatemala Clinic", dates: "January 2, 2027 to January 9, 2027" });
      expect(data.participants).toEqual([
        {
          name: "Ana Maria Lopez",
          bookedBy: "Org",
          arrival: [
            {
              airline: "American Airlines",
              flightNumber: "AA100",
              from: "DFW",
              departure: "Saturday 01/02/2027 6:15 AM",
              to: "MIA",
              arrival: "Saturday 01/02/2027 10:05 AM",
            },
            {
              airline: "American Airlines",
              flightNumber: "AA200",
              from: "MIA",
              departure: "Saturday 01/02/2027 12:30 PM",
              to: "GUA",
              arrival: "Saturday 01/02/2027 3:45 PM",
            },
          ],
          return: [
            {
              airline: "American Airlines",
              flightNumber: "AA300",
              from: "GUA",
              departure: "Saturday 01/09/2027 1:00 PM",
              to: "DFW",
              arrival: "Saturday 01/09/2027 6:30 PM",
            },
          ],
        },
      ]);
    });

    it("Booked by values", async () => {
      await addAssignment(await addPerson("Ana", "Lopez"), { flightPurchaseOption: "organization" });
      await addAssignment(await addPerson("Ben", "Cruz"), { flightPurchaseOption: "self" });
      await addAssignment(await addPerson("Carl", "Diaz"));

      const data = await buildFlightsData(trip.id);

      expect(data.participants.map((p) => [p.name, p.bookedBy])).toEqual([
        ["Ben Cruz", "Participant"],
        ["Carl Diaz", ""],
        ["Ana Lopez", "Org"],
      ]);
    });

    it("Participants are ordered by name and only eligible participants are listed", async () => {
      await addAssignment(await addPerson("Dana", "Ruiz"), { status: "approved" });
      await addAssignment(await addPerson("Ben", "Cruz"), { status: "applied" });
      await addAssignment(await addPerson("Ana", "Lopez"), { status: "incomplete" });
      await addAssignment(await addPerson("Eve", "Soto"), { status: "cancelled" });

      const data = await buildFlightsData(trip.id);

      expect(data.participants.map((p) => p.name)).toEqual(["Ben Cruz", "Ana Lopez", "Dana Ruiz"]);
    });

    it("Participant without segments", async () => {
      await addAssignment(await addPerson("Carl", "Diaz"));

      const data = await buildFlightsData(trip.id);

      expect(data.participants).toEqual([{ name: "Carl Diaz", bookedBy: "", arrival: [], return: [] }]);
      const pdf = await renderFlightsPdf(data);
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("No participants", async () => {
      const data = await buildFlightsData(trip.id);

      expect(data.trip.name).toBe("Guatemala Clinic");
      expect(data.participants).toEqual([]);
    });

    it("Staff download the PDF", async () => {
      const assignment = await addAssignment(await addPerson("Ana", "Lopez"), {
        flightPurchaseOption: "organization",
      });
      await addFlight(assignment, [
        ["arrival", 1, "AA100", "DFW", "2027-01-02", "06:15", "GUA", "2027-01-02", "15:45"],
      ]);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/flights/pdf`)
        .set(admin.authHeader)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toContain('filename="Flights - Guatemala Clinic.pdf"');
      expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("Participants cannot download the PDF", async () => {
      const participant = await registerUser({
        email: "pat@example.org",
        firstName: "Pat",
        lastName: "Participant",
        orgIds: [admin.org.id],
      });
      await addAssignment({ id: participant.user.personId });

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/flights/pdf`)
        .set(participant.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
