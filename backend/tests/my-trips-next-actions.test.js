/**
 * Feature 60 — My Trips Next Actions
 * Spec: features/feature-60-my-trips-next-actions.md
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
} from "./helpers.js";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const createTrip = (orgId, fields = {}) =>
  db.trip.create({
    orgId,
    name: "Guatemala Clinic",
    status: "active",
    startDate: dateFromToday(60),
    endDate: dateFromToday(70),
    participantCost: 1800,
    ...fields,
  });

const createAssignment = async (tripId, peopleId, fields = {}) => {
  const role = await findRole("Trip Participant");
  return db.tripPeopleRole.create({ tripId, peopleId, roleId: role.id, ...fields });
};

const setupParticipant = async (email = "ada@example.com") => {
  const org = await createOrganization("Hope Mission");
  const ada = await registerUser({ email, firstName: "Ada", lastName: "Applicant", orgIds: [org.id] });
  await completePersonProfile(ada.user.personId);
  return { org, ada };
};

const loadMyTrips = async (ada, orgId) => {
  const res = await request(app)
    .get("/trips/trips/browse/mine")
    .query({ orgId })
    .set(ada.authHeader);
  expect(res.status).toBe(200);
  return res.body;
};

const nextActionsFor = (trips, tripId) =>
  trips.find((t) => Number(t.id) === Number(tripId))?.nextActions;

const arrivalSegment = {
  segmentType: "arrival",
  segmentNumber: 1,
  departureAirportCode: "DFW",
  airlineCode: "AA",
  flightNumber: "100",
  departureDate: dateFromToday(60),
  departureTime: "08:30",
  arrivalAirportCode: "GUA",
  arrivalDate: dateFromToday(60),
  arrivalTime: "12:00",
};

const seedAirportsAirlines = async () => {
  await db.airport.create({ code: "DFW", airportName: "Dallas/Fort Worth", city: "Dallas", country: "US" });
  await db.airport.create({ code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" });
  await db.airline.create({ code: "AA", name: "American Airlines" });
};

describe("Feature 60 — My Trips Next Actions", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-60.1 — See what to do next on each upcoming trip", () => {
    it("My trips returns next actions for upcoming trips only", async () => {
      const { org, ada } = await setupParticipant();
      const upcoming = await createTrip(org.id);
      const past = await createTrip(org.id, {
        name: "Last Month",
        startDate: dateFromToday(-40),
        endDate: dateFromToday(-30),
      });
      const upcomingAssignment = await createAssignment(upcoming.id, ada.user.personId, { status: "applied" });
      await createAssignment(past.id, ada.user.personId, { status: "incomplete" });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, upcoming.id)).toEqual([{ code: "wait-approval" }]);
      expect(nextActionsFor(trips, past.id)).toEqual([]);
      expect(trips.find((t) => t.id === upcoming.id).tripPeopleRoleId).toBe(upcomingAssignment.id);
    });

    it("Cancelled application has no next actions", async () => {
      const { org, ada } = await setupParticipant("cancelled@example.com");
      const trip = await createTrip(org.id);
      await createAssignment(trip.id, ada.user.personId, { status: "cancelled" });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([]);
    });
  });

  describe("US-60.2 — Complete an incomplete application", () => {
    it("Incomplete application lists missing documents", async () => {
      const { org, ada } = await setupParticipant("missing-docs@example.com");
      const trip = await createTrip(org.id, { requirePassport: true });
      const board = await db.documentType.create({
        type: "certification",
        description: "Board certification",
        allowSpecialization: true,
      });
      const pediatrics = await db.documentTypeSpecialization.create({
        documentTypeId: board.id,
        name: "Pediatrics",
      });
      const workerRole = await db.workerRole.create({ orgId: org.id, name: "Pediatric Nurse" });
      await db.workerRoleDocumentType.create({ workerRoleId: workerRole.id, documentTypeId: board.id });
      await db.workerRoleSpecialization.create({
        workerRoleId: workerRole.id,
        documentTypeSpecializationId: pediatrics.id,
      });
      const tripWorkerRole = await db.tripWorkerRole.create({
        tripId: trip.id,
        workerRoleId: workerRole.id,
        quantity: 2,
      });
      await createAssignment(trip.id, ada.user.personId, {
        status: "incomplete",
        tripWorkerRoleId: tripWorkerRole.id,
      });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([
        {
          code: "complete-application",
          missingDocuments: ["Board certification (Pediatrics)", "Passport"],
        },
      ]);
    });

    it("Incomplete application with nothing missing is asked to submit", async () => {
      const { org, ada } = await setupParticipant("submit@example.com");
      const trip = await createTrip(org.id);
      const workerRole = await db.workerRole.create({ orgId: org.id, name: "Helper" });
      const tripWorkerRole = await db.tripWorkerRole.create({
        tripId: trip.id,
        workerRoleId: workerRole.id,
        quantity: 2,
      });
      await createAssignment(trip.id, ada.user.personId, {
        status: "incomplete",
        tripWorkerRoleId: tripWorkerRole.id,
        willSelfFund: true,
        flightPurchaseOption: "self",
        isPregnant: false,
      });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([{ code: "submit-application" }]);
    });

    it("Passport required by the role and the trip is listed once", async () => {
      const { org, ada } = await setupParticipant("passport-once@example.com");
      const trip = await createTrip(org.id, { requirePassport: true });
      const passport = await db.documentType.create({ type: "passport", description: "Passport" });
      const workerRole = await db.workerRole.create({ orgId: org.id, name: "Translator" });
      await db.workerRoleDocumentType.create({ workerRoleId: workerRole.id, documentTypeId: passport.id });
      const tripWorkerRole = await db.tripWorkerRole.create({
        tripId: trip.id,
        workerRoleId: workerRole.id,
        quantity: 2,
      });
      await createAssignment(trip.id, ada.user.personId, {
        status: "incomplete",
        tripWorkerRoleId: tripWorkerRole.id,
      });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([
        { code: "complete-application", missingDocuments: ["Passport"] },
      ]);
    });
  });

  describe("US-60.3 — Pay the deposit and the rest of the trip cost", () => {
    it("Approved participant below the deposit is asked for the deposit", async () => {
      const { org, ada } = await setupParticipant("deposit@example.com");
      const trip = await createTrip(org.id, { deposit: 500 });
      await createAssignment(trip.id, ada.user.personId, { status: "approved" });
      await db.tripDonation.create({ tripId: trip.id, personId: ada.user.personId, amount: 200 });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([
        { code: "make-deposit", amountRaised: 200, deposit: 500 },
      ]);
    });

    it("Approved participant past the deposit is asked for the rest", async () => {
      const { org, ada } = await setupParticipant("rest@example.com");
      const trip = await createTrip(org.id, { deposit: 500 });
      await createAssignment(trip.id, ada.user.personId, { status: "approved" });
      await db.tripDonation.create({ tripId: trip.id, personId: ada.user.personId, amount: 500 });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([{ code: "make-donation", amountOwed: 1300 }]);
    });

    it("Fully paid participant has no payment action", async () => {
      const { org, ada } = await setupParticipant("paid@example.com");
      const trip = await createTrip(org.id, { deposit: 500 });
      await createAssignment(trip.id, ada.user.personId, { status: "approved" });
      await db.tripDonation.create({ tripId: trip.id, personId: ada.user.personId, amount: 1800 });

      const trips = await loadMyTrips(ada, org.id);

      const codes = nextActionsFor(trips, trip.id).map((a) => a.code);
      expect(codes).not.toContain("make-deposit");
      expect(codes).not.toContain("make-donation");
    });

    it("Fully ready participant is all ready", async () => {
      const { org, ada } = await setupParticipant("ready@example.com");
      const trip = await createTrip(org.id, { deposit: 500 });
      await createAssignment(trip.id, ada.user.personId, {
        status: "approved",
        flightPurchaseOption: "organization",
      });
      await db.tripDonation.create({ tripId: trip.id, personId: ada.user.personId, amount: 1800 });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([{ code: "all-ready" }]);
    });
  });

  describe("US-60.4 — Enter my own flight info", () => {
    it("Self-purchase participant without segments is asked for flights", async () => {
      const { org, ada } = await setupParticipant("flights@example.com");
      const trip = await createTrip(org.id);
      await createAssignment(trip.id, ada.user.personId, {
        status: "approved",
        flightPurchaseOption: "self",
      });
      await db.tripDonation.create({ tripId: trip.id, personId: ada.user.personId, amount: 1800 });

      const trips = await loadMyTrips(ada, org.id);

      expect(nextActionsFor(trips, trip.id)).toEqual([{ code: "enter-flights" }]);
    });

    it("Participant saves their own flight segments", async () => {
      await seedAirportsAirlines();
      const { org, ada } = await setupParticipant("own-segments@example.com");
      const trip = await createTrip(org.id);
      const assignment = await createAssignment(trip.id, ada.user.personId, {
        status: "approved",
        flightPurchaseOption: "self",
      });

      const res = await request(app)
        .put(`/trips/trips/${trip.id}/flights/${assignment.id}/segments`)
        .set(ada.authHeader)
        .send({ segments: [arrivalSegment] });

      expect(res.status).toBe(200);
      expect(res.body.segments).toHaveLength(1);
      expect(res.body.segments[0]).toMatchObject({ segmentType: "arrival", flightNumber: "100" });
      const trips = await loadMyTrips(ada, org.id);
      expect(nextActionsFor(trips, trip.id).map((a) => a.code)).not.toContain("enter-flights");
    });

    it("Participant cannot change segments when the organization buys the ticket", async () => {
      await seedAirportsAirlines();
      const { org, ada } = await setupParticipant("org-buys@example.com");
      const trip = await createTrip(org.id);
      const assignment = await createAssignment(trip.id, ada.user.personId, {
        status: "approved",
        flightPurchaseOption: "organization",
      });

      const res = await request(app)
        .put(`/trips/trips/${trip.id}/flights/${assignment.id}/segments`)
        .set(ada.authHeader)
        .send({ segments: [arrivalSegment] });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
    });

    it("Participant cannot read another participant's segments", async () => {
      const { org, ada } = await setupParticipant("reader@example.com");
      const trip = await createTrip(org.id);
      await createAssignment(trip.id, ada.user.personId, { status: "approved" });
      const bob = await registerUser({
        email: "bob@example.com",
        firstName: "Bob",
        lastName: "Builder",
        orgIds: [org.id],
      });
      const bobAssignment = await createAssignment(trip.id, bob.user.personId, {
        status: "approved",
        flightPurchaseOption: "self",
      });

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/flights/${bobAssignment.id}/segments`)
        .set(ada.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
    });
  });
});
