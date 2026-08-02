/**
 * Feature 5 — Trip Catalog Management
 * Spec: features/feature-5-trip-catalog-management.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  assignOrgRole,
  findRole,
} from "./helpers.js";

const tripPayload = (orgId, overrides = {}) => ({
  orgId,
  name: "Summer Outreach",
  status: "active",
  startDate: "2026-07-01",
  endDate: "2026-07-14",
  participantCost: 2500,
  city: "Nairobi",
  country: "KE",
  ...overrides,
});

describe("Feature 5 — Trip Catalog Management", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-5.1 — Create and edit trips", () => {
    it("Org Admin creates an active trip", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "trip-creator@example.com",
        orgName: "Trip Org",
      });

      const response = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send(tripPayload(org.id));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        orgId: org.id,
        name: "Summer Outreach",
        status: "active",
        startDate: "2026-07-01",
        endDate: "2026-07-14",
      });
      expect(Number(response.body.participantCost)).toBe(2500);

      const stored = await db.trip.findByPk(response.body.id);
      expect(stored).not.toBeNull();
      expect(stored.orgId).toBe(org.id);
      expect(stored.status).toBe("active");
    });

    it("Non-admin participant cannot create a trip", async () => {
      const { org } = await createOrgAdminUser({
        email: "org-for-participant@example.com",
      });
      const participant = await registerUser({
        email: "participant-only@example.com",
        firstName: "Pat",
        lastName: "Participant",
        orgIds: [org.id],
      });

      const response = await request(app)
        .post("/trips/trips")
        .set(participant.authHeader)
        .send(tripPayload(org.id, { name: "Denied Trip" }));

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Forbidden/i);
    });
  });

  describe("US-5.2 — View trip detail and list", () => {
    it("Trip Leader opens trip detail", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "leader-setup-admin@example.com",
      });
      const leader = await registerUser({
        email: "trip-leader@example.com",
        firstName: "Lee",
        lastName: "Leader",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leader.user.personId, "Trip Leader");

      const create = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send(
          tripPayload(org.id, {
            name: "Leader Trip",
            leaderPeopleIds: [leader.user.personId],
          })
        );

      expect(create.status).toBe(200);

      const detail = await request(app)
        .get(`/trips/trips/${create.body.id}`)
        .set(leader.authHeader);

      expect(detail.status).toBe(200);
      expect(detail.body).toMatchObject({
        id: create.body.id,
        name: "Leader Trip",
        orgId: org.id,
      });
    });
  });

  describe("US-5.3 — Upload trip image and assign leaders", () => {
    it("Org Admin assigns leaders on create", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "assign-leaders-admin@example.com",
      });
      const leaderA = await registerUser({
        email: "leader-a@example.com",
        firstName: "Ann",
        lastName: "Leader",
        orgIds: [org.id],
      });
      const leaderB = await registerUser({
        email: "leader-b@example.com",
        firstName: "Bob",
        lastName: "Leader",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leaderA.user.personId, "Trip Leader");
      await assignOrgRole(org.id, leaderB.user.personId, "Trip Leader");

      const tripLeaderRole = await findRole("Trip Leader");

      const response = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send(
          tripPayload(org.id, {
            name: "Multi-Leader Trip",
            leaderPeopleIds: [leaderA.user.personId, leaderB.user.personId],
          })
        );

      expect(response.status).toBe(200);
      expect(response.body.leaderPeopleIds).toEqual(
        expect.arrayContaining([leaderA.user.personId, leaderB.user.personId])
      );
      expect(response.body.leaderPeopleIds).toHaveLength(2);

      const rows = await db.tripPeopleRole.findAll({
        where: {
          tripId: response.body.id,
          roleId: tripLeaderRole.id,
        },
      });
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.status === "approved")).toBe(true);
      expect(rows.map((r) => r.peopleId)).toEqual(
        expect.arrayContaining([leaderA.user.personId, leaderB.user.personId])
      );
    });
  });
});
