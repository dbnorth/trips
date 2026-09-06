/**
 * Feature 5 — Trip Catalog Management
 * Spec: features/feature-5-trip-catalog-management.md
 *
 * Feature 21 — Copy Trip
 * Spec: features/feature-21-copy-trip.md
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
  completePersonProfile,
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

  describe("Feature 21 — Copy Trip", () => {
    it("Copy creates trip with leaders, roles, and travel options", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "copy-trip-admin@example.com",
      });
      const leader = await registerUser({
        email: "copy-trip-leader@example.com",
        firstName: "Copy",
        lastName: "Leader",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leader.user.personId, "Trip Leader");

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Nurse",
          licenseRequired: false,
        });
      expect(workerRole.status).toBe(200);

      const source = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send(
          tripPayload(org.id, {
            name: "Source Trip",
            location: "Clinic",
            description: "Source description",
            facebookPage: "https://facebook.com/source",
            instagramId: "source_ig",
            leaderPeopleIds: [leader.user.personId],
          })
        );
      expect(source.status).toBe(200);

      const tripWorkerRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(authHeader)
        .send({
          tripId: source.body.id,
          workerRoleId: workerRole.body.id,
          quantity: 2,
        });
      expect(tripWorkerRole.status).toBe(200);

      const travelOption = await request(app)
        .post("/trips/trip-travel-options")
        .set(authHeader)
        .send({
          tripId: source.body.id,
          description: "Fly with group",
          priceAdjustment: 100,
          setNumber: 1,
        });
      expect(travelOption.status).toBe(200);

      const participant = await registerUser({
        email: "copy-trip-participant@example.com",
        firstName: "Pat",
        lastName: "Participant",
        orgIds: [org.id],
      });
      await completePersonProfile(participant.user.personId);
      const participantRole = await findRole("Trip Participant");
      const assignment = await request(app)
        .post("/trips/trip-people-roles")
        .set(authHeader)
        .send({
          tripId: source.body.id,
          peopleId: participant.user.personId,
          roleId: participantRole.id,
          status: "approved",
        });
      expect(assignment.status).toBe(200);

      const donation = await request(app)
        .post("/trips/donations")
        .set(authHeader)
        .send({
          tripId: source.body.id,
          personId: participant.user.personId,
          amount: 50,
          dateTime: "2026-07-02T14:00:00.000Z",
          paymentInfo: "Cash",
          donor: {
            firstName: "Dana",
            lastName: "Donor",
            email: "copy.donor@example.com",
            status: "active",
          },
        });
      expect(donation.status).toBe(200);

      const sourceBefore = await db.trip.findByPk(source.body.id);

      const copy = await request(app)
        .post(`/trips/trips/${source.body.id}/copy`)
        .set(authHeader)
        .send({ name: "Copied Trip" });

      expect(copy.status).toBe(201);
      expect(copy.body).toMatchObject({
        orgId: org.id,
        name: "Copied Trip",
        status: "active",
        location: "Clinic",
        city: "Nairobi",
        country: "KE",
        description: "Source description",
        facebookPage: "https://facebook.com/source",
        instagramId: "source_ig",
        startDate: "2026-07-01",
        endDate: "2026-07-14",
      });
      expect(Number(copy.body.participantCost)).toBe(2500);
      expect(copy.body.id).not.toBe(source.body.id);
      expect(copy.body.leaderPeopleIds).toEqual([leader.user.personId]);
      expect(copy.body.version).toBe(0);

      const copiedWorkerRoles = await db.tripWorkerRole.findAll({
        where: { tripId: copy.body.id },
      });
      expect(copiedWorkerRoles).toHaveLength(1);
      expect(copiedWorkerRoles[0]).toMatchObject({
        workerRoleId: workerRole.body.id,
        quantity: 2,
      });

      const copiedTravelOptions = await db.tripTravelOption.findAll({
        where: { tripId: copy.body.id },
      });
      expect(copiedTravelOptions).toHaveLength(1);
      expect(copiedTravelOptions[0]).toMatchObject({
        description: "Fly with group",
        setNumber: 1,
      });
      expect(Number(copiedTravelOptions[0].priceAdjustment)).toBe(100);

      const tripLeaderRole = await findRole("Trip Leader");
      const copiedPeopleRoles = await db.tripPeopleRole.findAll({
        where: { tripId: copy.body.id },
      });
      expect(copiedPeopleRoles).toHaveLength(1);
      expect(copiedPeopleRoles[0]).toMatchObject({
        peopleId: leader.user.personId,
        roleId: tripLeaderRole.id,
        status: "approved",
      });

      const copiedDonations = await db.tripDonation.findAll({
        where: { tripId: copy.body.id },
      });
      expect(copiedDonations).toHaveLength(0);

      const sourceAfter = await db.trip.findByPk(source.body.id);
      expect(sourceAfter.name).toBe(sourceBefore.name);
      expect(sourceAfter.version).toBe(sourceBefore.version);

      const sourcePeopleRoles = await db.tripPeopleRole.findAll({
        where: { tripId: source.body.id },
      });
      expect(sourcePeopleRoles).toHaveLength(2);

      const sourceDonations = await db.tripDonation.findAll({
        where: { tripId: source.body.id },
      });
      expect(sourceDonations).toHaveLength(1);
    });

    it("Blank name is rejected", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "copy-blank-name@example.com",
      });
      const source = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send(tripPayload(org.id, { name: "Blank Copy Source" }));
      expect(source.status).toBe(200);

      const beforeCount = await db.trip.count();

      const copy = await request(app)
        .post(`/trips/trips/${source.body.id}/copy`)
        .set(authHeader)
        .send({ name: "   " });

      expect(copy.status).toBe(400);
      expect(copy.body.message).toMatch(/Name is required/i);
      expect(await db.trip.count()).toBe(beforeCount);
    });
  });
});
