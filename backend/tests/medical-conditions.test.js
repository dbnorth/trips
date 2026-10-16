/**
 * Feature 17 — Organization Medical Conditions & Person Selections
 * Spec: features/feature-17-org-medical-conditions.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createOrganization,
  completePersonProfile,
} from "./helpers.js";

describe("Feature 17 — Organization Medical Conditions & Person Selections", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-17.1 — Maintain organization medical conditions", () => {
    it("Org Admin creates a medical condition", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "med-admin-a@example.com",
        orgName: "Org A",
      });
      const orgB = await createOrganization("Org B");
      const { authHeader: authB } = await createOrgAdminUser({
        email: "med-admin-b@example.com",
        org: orgB,
      });

      const create = await request(app)
        .post("/trips/medical-conditions")
        .set(authHeader)
        .send({ orgId: org.id, name: "Diabetes" });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({ orgId: org.id, name: "Diabetes" });

      const listA = await request(app)
        .get("/trips/medical-conditions")
        .query({ orgId: org.id })
        .set(authHeader);
      expect(listA.status).toBe(200);
      expect(listA.body.map((r) => r.name)).toContain("Diabetes");

      const listB = await request(app)
        .get("/trips/medical-conditions")
        .query({ orgId: orgB.id })
        .set(authB);
      expect(listB.status).toBe(200);
      expect(listB.body.map((r) => r.name)).not.toContain("Diabetes");
    });

    it("Duplicate condition name in the same org is rejected", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "med-dup@example.com",
        orgName: "Dup Org",
      });

      const first = await request(app)
        .post("/trips/medical-conditions")
        .set(authHeader)
        .send({ orgId: org.id, name: "Asthma" });
      expect(first.status).toBe(200);

      const dup = await request(app)
        .post("/trips/medical-conditions")
        .set(authHeader)
        .send({ orgId: org.id, name: "asthma" });
      expect(dup.status).toBe(409);
      expect(dup.body.message).toMatch(/already exists/i);
    });

    it("Name longer than 50 characters is rejected", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "med-len@example.com",
        orgName: "Len Org",
      });

      const create = await request(app)
        .post("/trips/medical-conditions")
        .set(authHeader)
        .send({ orgId: org.id, name: "A".repeat(51) });

      expect(create.status).toBe(400);
      expect(create.body.message).toMatch(/50/i);
    });
  });

  describe("US-17.2 — Select medical conditions when taking medication", () => {
    it("Selected conditions are saved on the person", async () => {
      const { authHeader, org, user } = await createOrgAdminUser({
        email: "med-person@example.com",
        orgName: "Select Org",
      });
      const personId = user.personId;

      const condition = await request(app)
        .post("/trips/medical-conditions")
        .set(authHeader)
        .send({ orgId: org.id, name: "Diabetes" });
      expect(condition.status).toBe(200);

      await completePersonProfile(personId, { takesMedication: true });
      const person = await db.person.findByPk(personId);

      const update = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          takesMedication: true,
          medicalConditionIds: [condition.body.id],
          orgId: org.id,
          version: person.version,
        });

      expect(update.status).toBe(200);
      expect(update.body.medicalConditionIds).toContain(condition.body.id);
      expect(update.body.medicalConditions.map((c) => c.name)).toContain("Diabetes");

      const get = await request(app)
        .get(`/trips/people/${personId}`)
        .query({ orgId: org.id })
        .set(authHeader);
      expect(get.status).toBe(200);
      expect(get.body.medicalConditionIds).toContain(condition.body.id);
    });
  });

  describe("US-17.3 — Reload prior selections on a later application", () => {
    it("Prior selections reload on another trip in the same org", async () => {
      const { authHeader, org, user } = await createOrgAdminUser({
        email: "med-reload@example.com",
        orgName: "Reload Org",
      });
      const personId = user.personId;

      const condition = await request(app)
        .post("/trips/medical-conditions")
        .set(authHeader)
        .send({ orgId: org.id, name: "Diabetes" });
      expect(condition.status).toBe(200);

      await completePersonProfile(personId, { takesMedication: true });
      const person = await db.person.findByPk(personId);

      const save = await request(app)
        .put(`/trips/people/${personId}`)
        .set(authHeader)
        .send({
          takesMedication: true,
          medicalConditionIds: [condition.body.id],
          orgId: org.id,
          version: person.version,
        });
      expect(save.status).toBe(200);

      // Simulate loading profile again for another trip in the same org
      const reload = await request(app)
        .get(`/trips/people/${personId}`)
        .query({ orgId: org.id })
        .set(authHeader);

      expect(reload.status).toBe(200);
      expect(reload.body.takesMedication).toBe(true);
      expect(reload.body.medicalConditionIds).toEqual(
        expect.arrayContaining([condition.body.id])
      );
      expect(reload.body.medicalConditions.map((c) => c.name)).toContain("Diabetes");
    });
  });
});
