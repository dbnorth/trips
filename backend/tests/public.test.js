/**
 * Feature 9 — Public Fundraising Pages
 * Spec: features/feature-9-public-fundraising-pages.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
} from "./helpers.js";

const createPublicTripFixture = async ({
  orgName = "Hope Mission",
  tripName = "Summer Outreach",
  withRole = false,
} = {}) => {
  const { authHeader, org } = await createOrgAdminUser({
    email: `public-${Date.now()}@example.com`,
    orgName,
  });

  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId: org.id,
      name: tripName,
      status: "active",
      startDate: "2026-09-01",
      endDate: "2026-09-20",
      participantCost: 1500,
      description: "A public outreach trip",
      city: "Nairobi",
      country: "KE",
    });
  expect(trip.status).toBe(200);

  let tripWorkerRole = null;
  if (withRole) {
    const workerRole = await request(app)
      .post("/trips/worker-roles")
      .set(authHeader)
      .send({
        orgId: org.id,
        name: "Team Member",
        licenseRequired: false,
      });
    expect(workerRole.status).toBe(200);

    const twr = await request(app)
      .post("/trips/trip-worker-roles")
      .set(authHeader)
      .send({
        tripId: trip.body.id,
        workerRoleId: workerRole.body.id,
        quantity: 4,
      });
    expect(twr.status).toBe(200);
    tripWorkerRole = twr.body;
  }

  return { authHeader, org, trip: trip.body, tripWorkerRole };
};

describe("Feature 9 — Public Fundraising Pages", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-9.1 — View public organization and trip pages", () => {
    it("Visitor opens organization trips page by slug", async () => {
      const { org, trip } = await createPublicTripFixture({
        orgName: "Hope Mission",
        tripName: "Open Trip Alpha",
      });

      const response = await request(app).get("/trips/public/orgs/by-name/Hope_Mission");

      expect(response.status).toBe(200);
      expect(response.body.organization).toMatchObject({
        id: org.id,
        name: "Hope Mission",
      });
      expect(response.body.trips.map((t) => t.id)).toContain(trip.id);
      expect(response.body.trips.find((t) => t.id === trip.id).status).toBe("active");
    });

    it("Visitor opens public trip overview", async () => {
      const { trip, tripWorkerRole } = await createPublicTripFixture({
        orgName: "Overview Org",
        tripName: "Summer Outreach",
        withRole: true,
      });

      const response = await request(app).get(
        "/trips/public/trips/by-name/Summer_Outreach/overview"
      );

      expect(response.status).toBe(200);
      expect(response.body.trip).toMatchObject({
        id: trip.id,
        name: "Summer Outreach",
        status: "active",
        description: "A public outreach trip",
      });
      expect(response.body.rolesNeeded.map((r) => r.id)).toContain(tripWorkerRole.id);
      expect(response.body.rolesNeeded.find((r) => r.id === tripWorkerRole.id)).toMatchObject({
        quantity: 4,
        availableCount: 4,
      });
    });
  });

  describe("US-9.2 — Donate on trip or participant pages", () => {
    it("Visitor submits a public donation", async () => {
      const { trip } = await createPublicTripFixture({
        orgName: "Donate Org",
        tripName: "Donate Trip",
      });

      const response = await request(app)
        .post("/trips/public/donations")
        .send({
          tripId: trip.id,
          amount: 75,
          paymentInfo: "Card ending 4242",
          donor: {
            firstName: "Guest",
            lastName: "Giver",
            email: "guest.giver@example.com",
            city: "Dallas",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/thank you/i);
      expect(response.body.donor).toMatchObject({
        firstName: "Guest",
        lastName: "Giver",
        email: "guest.giver@example.com",
      });
      expect(Number(response.body.donation.amount)).toBe(75);
      expect(response.body.donation.tripId).toBe(trip.id);

      const donor = await db.donor.findByPk(response.body.donor.id);
      const donation = await db.tripDonation.findByPk(response.body.donation.id);
      expect(donor).not.toBeNull();
      expect(donation).not.toBeNull();
      expect(donation.donorId).toBe(donor.id);
    });
  });
});
