/**
 * Feature 30 — Participant Flights
 * Spec: features/feature-30-participant-flights.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  findRole,
  completePersonProfile,
} from "./helpers.js";

const seedAirportsAirlines = async (adminAuth) => {
  const dfw = await request(app)
    .post("/trips/airports")
    .set(adminAuth)
    .send({ code: "DFW", airportName: "Dallas/Fort Worth", city: "Dallas", country: "US" });
  expect(dfw.status).toBe(200);

  const mia = await request(app)
    .post("/trips/airports")
    .set(adminAuth)
    .send({ code: "MIA", airportName: "Miami Intl", city: "Miami", country: "US" });
  expect(mia.status).toBe(200);

  const gua = await request(app)
    .post("/trips/airports")
    .set(adminAuth)
    .send({
      code: "GUA",
      airportName: "La Aurora",
      city: "Guatemala City",
      country: "GT",
    });
  expect(gua.status).toBe(200);

  const aa = await request(app)
    .post("/trips/airlines")
    .set(adminAuth)
    .send({ code: "AA", name: "American Airlines" });
  expect(aa.status).toBe(200);

  return { dfw: dfw.body, mia: mia.body, gua: gua.body, aa: aa.body };
};

const setupTripWithAda = async ({
  adminEmail = "flights-admin@example.com",
  withCancelled = false,
} = {}) => {
  const { authHeader, org } = await createOrgAdminUser({ email: adminEmail });
  const sys = await createSystemAdminUser({ email: `${adminEmail}-sys@example.com` });
  await seedAirportsAirlines(sys.authHeader);

  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId: org.id,
      name: "Summer Outreach",
      status: "active",
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      participantCost: 1000,
    });
  expect(trip.status).toBe(200);

  const participantRole = await findRole("Trip Participant");
  const ada = await registerUser({
    email: `${adminEmail}-ada@example.com`,
    firstName: "Ada",
    lastName: "Applicant",
    orgIds: [org.id],
  });
  await completePersonProfile(ada.user.personId);

  const adaAssignment = await request(app)
    .post("/trips/trip-people-roles")
    .set(authHeader)
    .send({
      tripId: trip.body.id,
      peopleId: ada.user.personId,
      roleId: participantRole.id,
      status: "approved",
      willSelfFund: true,
    });
  expect(adaAssignment.status).toBe(200);

  let cancelledAssignment = null;
  if (withCancelled) {
    const bob = await registerUser({
      email: `${adminEmail}-bob@example.com`,
      firstName: "Bob",
      lastName: "Cancelled",
      orgIds: [org.id],
    });
    await completePersonProfile(bob.user.personId);
    cancelledAssignment = await request(app)
      .post("/trips/trip-people-roles")
      .set(authHeader)
      .send({
        tripId: trip.body.id,
        peopleId: bob.user.personId,
        roleId: participantRole.id,
        status: "cancelled",
        willSelfFund: true,
      });
    expect(cancelledAssignment.status).toBe(200);
  }

  return {
    authHeader,
    sysAuth: sys.authHeader,
    org,
    trip: trip.body,
    ada,
    adaAssignment: adaAssignment.body,
    cancelledAssignment: cancelledAssignment?.body || null,
  };
};

describe("Feature 30 — Participant Flights", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-30.1 — Open flights from trips list", () => {
    it("Unauthorized user cannot open trip flights", async () => {
      const { trip } = await setupTripWithAda({ adminEmail: "flights-forbid@example.com" });
      const outsider = await registerUser({
        email: "flights-outsider@example.com",
        firstName: "Out",
        lastName: "Sider",
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/flights`)
        .set(outsider.authHeader);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe("US-30.2 — See participant flight summary board", () => {
    it("Page lists eligible participants with itinerary summary", async () => {
      const { authHeader, trip, adaAssignment } = await setupTripWithAda({
        adminEmail: "flights-summary@example.com",
      });

      await request(app)
        .put(`/trips/trips/${trip.id}/flights/${adaAssignment.id}`)
        .set(authHeader)
        .send({ purchased: true, cost: 850, comments: "Booked via agency" });

      const segments = await request(app)
        .put(`/trips/trips/${trip.id}/flights/${adaAssignment.id}/segments`)
        .set(authHeader)
        .send({
          segments: [
            {
              segmentNumber: 1,
              departureAirportCode: "DFW",
              airlineCode: "AA",
              flightNumber: "100",
              departureDate: "2026-07-01",
              departureTime: "08:30",
              arrivalAirportCode: "MIA",
              arrivalDate: "2026-07-01",
              arrivalTime: "12:00",
              cabinClass: "Economy",
              seatNumber: "12A",
            },
            {
              segmentNumber: 2,
              departureAirportCode: "MIA",
              airlineCode: "AA",
              flightNumber: "200",
              departureDate: "2026-07-01",
              departureTime: "14:00",
              arrivalAirportCode: "GUA",
              arrivalDate: "2026-07-01",
              arrivalTime: "16:45",
              cabinClass: "Economy",
              seatNumber: "14C",
            },
          ],
        });
      expect(segments.status).toBe(200);
      expect(segments.body.segments[0]).toMatchObject({
        cabinClass: "Economy",
        seatNumber: "12A",
      });
      expect(segments.body.segments[1]).toMatchObject({
        cabinClass: "Economy",
        seatNumber: "14C",
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/flights`)
        .set(authHeader);

      expect(response.status).toBe(200);
      const ada = response.body.participants.find(
        (p) => Number(p.tripPeopleRoleId) === Number(adaAssignment.id)
      );
      expect(ada.purchased).toBe(true);
      expect(ada.cost).toBe(850);
      expect(ada.initialDeparture).toMatchObject({
        date: "2026-07-01",
        time: "08:30",
        city: "Dallas",
      });
      expect(ada.finalArrival).toMatchObject({
        date: "2026-07-01",
        time: "16:45",
        city: "Guatemala City",
      });
    });

    it("Flights board shows application purchase option and org preferences", async () => {
      const { authHeader, sysAuth, trip, adaAssignment, org } = await setupTripWithAda({
        adminEmail: "flights-purchase-pref@example.com",
      });

      const dep = await request(app)
        .post("/trips/airports")
        .set(sysAuth)
        .send({ code: "ORD", airportName: "O'Hare", city: "Chicago", country: "US" });
      expect(dep.status).toBe(200);
      const ret = await request(app)
        .post("/trips/airports")
        .set(sysAuth)
        .send({ code: "ATL", airportName: "Hartsfield", city: "Atlanta", country: "US" });
      expect(ret.status).toBe(200);
      const airline = await request(app)
        .post("/trips/airlines")
        .set(sysAuth)
        .send({ code: "DL", name: "Delta Air Lines" });
      expect(airline.status).toBe(200);

      await db.tripPeopleRole.update(
        {
          flightPurchaseOption: "organization",
          preferredDepartureAirportId: dep.body.id,
          preferredReturnAirportId: ret.body.id,
          preferredCabinClass: "Economy",
          preferredAirlineId: airline.body.id,
        },
        { where: { id: adaAssignment.id } }
      );

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/flights`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.trip.organizationName).toBe(org.name);
      const ada = response.body.participants.find(
        (p) => Number(p.tripPeopleRoleId) === Number(adaAssignment.id)
      );
      expect(ada.flightPurchaseOption).toBe("organization");
      expect(ada.flightPurchasePreferencesText).toMatch(/Departure ORD/);
      expect(ada.flightPurchasePreferencesText).toMatch(/Return ATL/);
      expect(ada.flightPurchasePreferencesText).toMatch(/Class Economy/);
      expect(ada.flightPurchasePreferencesText).toMatch(/Airline DL/);
    });

    it("Cancelled participant is not listed", async () => {
      const { authHeader, trip, cancelledAssignment } = await setupTripWithAda({
        adminEmail: "flights-cancel@example.com",
        withCancelled: true,
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/flights`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(
        response.body.participants.some(
          (p) => Number(p.tripPeopleRoleId) === Number(cancelledAssignment.id)
        )
      ).toBe(false);
    });
  });

  describe("US-30.3 — Edit flight header and manage segments in a dialog", () => {
    it("Staff saves purchased and cost", async () => {
      const { authHeader, trip, adaAssignment } = await setupTripWithAda({
        adminEmail: "flights-save@example.com",
      });

      const save = await request(app)
        .put(`/trips/trips/${trip.id}/flights/${adaAssignment.id}`)
        .set(authHeader)
        .send({ purchased: true, cost: 500, comments: "" });
      expect(save.status).toBe(200);

      const reload = await request(app)
        .get(`/trips/trips/${trip.id}/flights`)
        .set(authHeader);
      const ada = reload.body.participants.find(
        (p) => Number(p.tripPeopleRoleId) === Number(adaAssignment.id)
      );
      expect(ada.purchased).toBe(true);
      expect(ada.cost).toBe(500);
    });
  });

  describe("US-30.4 — Maintain Airport and Airline code catalogs", () => {
    it("System admin creates an airport", async () => {
      const sys = await createSystemAdminUser({ email: "flights-airport-sys@example.com" });
      const create = await request(app)
        .post("/trips/airports")
        .set(sys.authHeader)
        .send({
          code: "DFW",
          airportName: "Dallas/Fort Worth",
          city: "Dallas",
          country: "US",
        });
      expect(create.status).toBe(200);

      const list = await request(app).get("/trips/airports").set(sys.authHeader);
      expect(list.status).toBe(200);
      expect(list.body.some((a) => a.code === "DFW" && a.city === "Dallas")).toBe(true);
    });

    it("Segment rejects unknown airport code", async () => {
      const { authHeader, trip, adaAssignment } = await setupTripWithAda({
        adminEmail: "flights-badcode@example.com",
      });

      const response = await request(app)
        .put(`/trips/trips/${trip.id}/flights/${adaAssignment.id}/segments`)
        .set(authHeader)
        .send({
          segments: [
            {
              segmentNumber: 1,
              departureAirportCode: "ZZZ",
              airlineCode: "AA",
              flightNumber: "1",
              departureDate: "2026-07-01",
              departureTime: "08:00",
              arrivalAirportCode: "GUA",
              arrivalDate: "2026-07-01",
              arrivalTime: "12:00",
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/Unknown departure airport/i);
    });
  });
});
