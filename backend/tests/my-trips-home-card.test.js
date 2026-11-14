/**
 * Feature 138 — Participant Home Trip Cards
 * Spec: features/feature-138-participant-home-trip-cards.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrganization,
  findRole,
  completePersonProfile,
  createDocumentType,
} from "./helpers.js";

describe("Feature 138 — Participant Home Trip Cards", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  it("My trips include the home card summary", async () => {
    const org = await createOrganization("Hope Mission");
    const ada = await registerUser({
      email: "home-card@example.com",
      firstName: "Ada",
      lastName: "Applicant",
      orgIds: [org.id],
    });
    await completePersonProfile(ada.user.personId);
    const trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2027-06-08",
      endDate: "2027-06-18",
      participantCost: 1200,
      requirePassport: true,
    });
    const role = await findRole("Trip Participant");
    const workerRole = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    const tripWorkerRole = await db.tripWorkerRole.create({
      tripId: trip.id,
      workerRoleId: workerRole.id,
      quantity: 2,
    });
    const assignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ada.user.personId,
      roleId: role.id,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "approved",
      flightPurchaseOption: "self",
      willSelfFund: true,
      isPregnant: false,
    });
    const passport = await createDocumentType({
      type: "passport",
      description: "Passport",
      orgId: org.id,
    });
    await db.personDocument.create({
      personId: ada.user.personId,
      documentTypeId: passport.id,
      countryIssued: "US",
      issueDate: "2020-01-01",
      expirationDate: "2030-01-01",
      documentFileName: "passport.pdf",
    });
    await db.tripDonation.create({
      tripId: trip.id,
      personId: ada.user.personId,
      amount: 1200,
      dateTime: new Date("2026-11-01T12:00:00Z"),
    });
    const okc = await db.airport.create({
      code: "OKC",
      airportName: "Will Rogers",
      city: "Oklahoma City",
      country: "US",
    });
    const ric = await db.airport.create({
      code: "RIC",
      airportName: "Richmond",
      city: "Richmond",
      country: "US",
    });
    const airline = await db.airline.create({ code: "AA", name: "American Airlines" });
    const flight = await db.tripFlight.create({ tripPeopleRoleId: assignment.id });
    const segment = (fields) =>
      db.tripFlightSegment.create({
        tripFlightId: flight.id,
        airlineId: airline.id,
        flightNumber: "100",
        arrivalAirportId: ric.id,
        arrivalDate: "2026-04-22",
        arrivalTime: "21:00",
        ...fields,
      });
    await segment({
      segmentType: "arrival",
      segmentNumber: 2,
      departureAirportId: ric.id,
      departureDate: "2026-04-22",
      departureTime: "23:00",
    });
    await segment({
      segmentType: "return",
      segmentNumber: 1,
      departureAirportId: ric.id,
      departureDate: "2026-04-26",
      departureTime: "19:00",
    });
    await segment({
      segmentType: "arrival",
      segmentNumber: 1,
      departureAirportId: okc.id,
      departureDate: "2026-04-22",
      departureTime: "18:03",
    });

    const res = await request(app)
      .get("/trips/trips/browse/mine")
      .query({ orgId: org.id })
      .set(ada.authHeader);

    expect(res.status).toBe(200);
    const mine = res.body.find((item) => item.id === trip.id);
    expect(mine.workerRoleName).toBe("Nurse");
    expect(mine.homeCard).toEqual({
      amountRaised: 1200,
      totalTripCost: 1200,
      documentsUploaded: 1,
      documentsRequired: 1,
      departure: { airportCode: "OKC", date: "2026-04-22", time: "18:03" },
    });
  });
});
