/**
 * Feature 79 — Planned Arrival and Departure on Flights
 * Spec: features/feature-79-flights-planned-dates.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

describe("Feature 79 — Planned Arrival and Departure on Flights", () => {
  let omar;
  let org;
  let trip;
  let ana;
  let anaAssignment;
  let benAssignment;

  const findParticipant = (list, assignment) =>
    list.find((p) => Number(p.tripPeopleRoleId ?? p.id) === Number(assignment.id));

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    org = omar.org;
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2027-06-10",
      endDate: "2027-06-17",
      participantCost: 1500,
    });
    const workerRole = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    const tripWorkerRole = await db.tripWorkerRole.create({
      tripId: trip.id,
      workerRoleId: workerRole.id,
      quantity: 5,
    });
    const participantRole = await findRole("Trip Participant");
    const arriveEarly = await db.tripTravelOption.create({
      tripId: trip.id,
      description: "Arrive early",
      priceAdjustment: 0,
      setNumber: 1,
      daysBefore: 2,
    });

    const dfw = await db.airport.create({ code: "DFW", airportName: "Dallas/Fort Worth", city: "Dallas", country: "US" });
    const mia = await db.airport.create({ code: "MIA", airportName: "Miami", city: "Miami", country: "US" });
    const gua = await db.airport.create({ code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" });
    const aa = await db.airline.create({ code: "AA", name: "American Airlines" });

    ana = await registerUser({
      email: "ana@example.org",
      firstName: "Ana",
      lastName: "Lopez",
      orgIds: [org.id],
    });
    anaAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.user.personId,
      roleId: participantRole.id,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "approved",
      flightPurchaseOption: "organization",
      preferredDepartureAirportId: dfw.id,
      preferredReturnAirportId: dfw.id,
      preferredCabinClass: "Economy",
      preferredAirlineId: aa.id,
      preferredRefundableTicket: true,
    });
    await db.tripPeopleRoleOption.create({
      tripPeopleRoleId: anaAssignment.id,
      tripTravelOptionId: arriveEarly.id,
      selected: true,
    });
    await db.tripPeopleRoleExpense.create({
      tripPeopleRoleId: anaAssignment.id,
      description: "Extra hotel night",
      cost: 80,
      daysBefore: 1,
      daysAfter: 1,
    });

    const flight = await db.tripFlight.create({ tripPeopleRoleId: anaAssignment.id, purchased: true });
    const segment = (segmentType, segmentNumber, from, to, date) => ({
      tripFlightId: flight.id,
      segmentType,
      segmentNumber,
      departureAirportId: from.id,
      airlineId: aa.id,
      flightNumber: `AA${segmentNumber}`,
      departureDate: date,
      departureTime: "08:00",
      arrivalAirportId: to.id,
      arrivalDate: date,
      arrivalTime: "12:00",
    });
    await db.tripFlightSegment.bulkCreate([
      segment("arrival", 1, dfw, mia, "2027-06-07"),
      segment("arrival", 2, mia, gua, "2027-06-08"),
      segment("return", 1, gua, dfw, "2027-06-18"),
    ]);

    const ben = await db.person.create({ firstName: "Ben", lastName: "Ruiz", email: "ben@example.org" });
    benAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ben.id,
      roleId: participantRole.id,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "approved",
      flightPurchaseOption: "self",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  const anaDates = {
    arrivalDate: "2027-06-07",
    departureDate: "2027-06-18",
    flightArrivalDate: "2027-06-08",
    flightDepartureDate: "2027-06-18",
  };
  const benDates = {
    arrivalDate: "2027-06-10",
    departureDate: "2027-06-17",
    flightArrivalDate: null,
    flightDepartureDate: null,
  };

  describe("US-79.1 — See planned arrival and departure on the Flights page", () => {
    it("Flights board returns planned and flight dates", async () => {
      const res = await request(app).get(`/trips/trips/${trip.id}/flights`).set(omar.authHeader);
      expect(res.status).toBe(200);
      expect(findParticipant(res.body.participants, anaAssignment)).toMatchObject({
        ...anaDates,
        arrivalAdjustments: [
          { type: "option", description: "Arrive early", days: 2 },
          { type: "addon", description: "Extra hotel night", days: 1 },
        ],
        departureAdjustments: [{ type: "addon", description: "Extra hotel night", days: 1 }],
      });
      expect(findParticipant(res.body.participants, benAssignment)).toMatchObject(benDates);
    });
  });

  describe("US-79.2 — Spot flights that do not match the plan", () => {
    it("Trip Status and roster return planned and flight dates", async () => {
      const status = await request(app).get(`/trips/trips/${trip.id}/status`).set(omar.authHeader);
      expect(status.status).toBe(200);
      expect(findParticipant(status.body.participants, anaAssignment)).toMatchObject({
        ...anaDates,
        arrivalAdjustments: [
          { type: "option", description: "Arrive early", days: 2 },
          { type: "addon", description: "Extra hotel night", days: 1 },
        ],
      });
      expect(findParticipant(status.body.participants, benAssignment)).toMatchObject(benDates);

      const roster = await request(app)
        .get("/trips/trip-people-roles")
        .query({ tripId: trip.id })
        .set(omar.authHeader);
      expect(roster.status).toBe(200);
      expect(findParticipant(roster.body, anaAssignment)).toMatchObject(anaDates);
      expect(findParticipant(roster.body, benAssignment)).toMatchObject(benDates);
    });
  });

  describe("US-79.3 — See the plan while entering segments", () => {
    it("Segments return the plan and requested travel info", async () => {
      const res = await request(app)
        .get(`/trips/trips/${trip.id}/flights/${anaAssignment.id}/segments`)
        .set(omar.authHeader);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        arrivalDate: "2027-06-07",
        departureDate: "2027-06-18",
        flightPurchasePreferencesText:
          "Departure DFW (Dallas) · Return DFW (Dallas) · Class Economy · Airline AA — American Airlines · Refundable",
        flightPurchasePreferences: { departureAirportCode: "DFW" },
      });

      const ben = await request(app)
        .get(`/trips/trips/${trip.id}/flights/${benAssignment.id}/segments`)
        .set(omar.authHeader);
      expect(ben.body).toMatchObject({
        arrivalDate: "2027-06-10",
        departureDate: "2027-06-17",
        flightPurchasePreferencesText: null,
      });
    });
  });

  describe("US-79.3 — Requested airports", () => {
    it("Flights board returns the flight airports", async () => {
      const res = await request(app).get(`/trips/trips/${trip.id}/flights`).set(omar.authHeader);
      expect(res.status).toBe(200);
      expect(findParticipant(res.body.participants, anaAssignment)).toMatchObject({
        arrivalFlightOriginCode: "DFW",
        returnFlightDestinationCode: "DFW",
        flightPurchasePreferences: { departureAirportCode: "DFW", returnAirportCode: "DFW" },
      });
      expect(findParticipant(res.body.participants, benAssignment)).toMatchObject({
        arrivalFlightOriginCode: null,
        returnFlightDestinationCode: null,
      });
    });
  });

  describe("US-79.4 — Participant learns their flights do not match", () => {
    it("Next actions include a flight mismatch", async () => {
      const res = await request(app)
        .get("/trips/trips/browse/mine")
        .query({ orgId: org.id })
        .set(ana.authHeader);
      expect(res.status).toBe(200);
      const codes = res.body[0].nextActions.map((action) => action.code);
      expect(res.body[0].nextActions).toContainEqual({
        code: "arrival-flight-mismatch",
        flightDate: "2027-06-08",
        plannedDate: "2027-06-07",
        canEditFlights: false,
      });
      expect(codes).not.toContain("return-flight-mismatch");
      expect(codes).not.toContain("all-ready");

      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader);
      expect(browse.body.myTripInfo.nextActions.map((action) => action.code)).toContain(
        "arrival-flight-mismatch"
      );
    });
  });
});
