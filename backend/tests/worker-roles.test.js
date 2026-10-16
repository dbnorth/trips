/**
 * Feature 6 — Worker Roles & Travel Options
 * Spec: features/feature-6-worker-roles-and-travel-options.md
 *
 * Feature 25 — Worker Role Required Documents
 * Spec: features/feature-25-worker-role-required-documents.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  assignOrgRole,
} from "./helpers.js";

const createTripAsAdmin = async (authHeader, orgId, overrides = {}) => {
  const response = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId,
      name: "Staffing Trip",
      status: "active",
      startDate: "2026-08-01",
      endDate: "2026-08-14",
      participantCost: 2000,
      ...overrides,
    });
  expect(response.status).toBe(200);
  return response.body;
};

describe("Feature 6 — Worker Roles & Travel Options", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-6.1 — Manage organization worker roles", () => {
    it("Org Admin creates a worker role requiring a license", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "worker-role-admin@example.com",
        orgName: "Clinic Org",
      });
      const docType = await db.documentType.create({
        type: "medical_licence",
        description: "Medical Licence",
      });

      const create = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Nurse",
          description: "Licensed nursing staff",
          licenseRequired: true,
          documentTypeId: docType.id,
          status: "active",
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        orgId: org.id,
        name: "Nurse",
        licenseRequired: true,
        status: "active",
      });
      expect(create.body.requiredDocumentTypeIds).toEqual([docType.id]);
      expect(create.body.requiredDocumentTypes.map((d) => d.id)).toEqual([docType.id]);
      expect(create.body.documentTypeId).toBeNull();

      const list = await request(app)
        .get("/trips/worker-roles")
        .query({ orgId: org.id })
        .set(authHeader);

      expect(list.status).toBe(200);
      expect(list.body.map((r) => r.id)).toContain(create.body.id);
    });

    it("Org Admin saves multiple required documents on a worker role", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "multi-docs-admin@example.com",
      });
      const typeA = await db.documentType.create({
        type: "medical_licence",
        description: "RN License",
      });
      const typeB = await db.documentType.create({
        type: "certification",
        description: "First Aid",
      });

      const create = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Clinical Lead",
          licenseRequired: false,
          requiredDocumentTypeIds: [typeA.id, typeB.id],
        });

      expect(create.status).toBe(200);
      expect(create.body.licenseRequired).toBe(false);
      expect(create.body.requiredDocumentTypeIds.sort()).toEqual([typeA.id, typeB.id].sort());

      const get = await request(app)
        .get(`/trips/worker-roles/${create.body.id}`)
        .set(authHeader);
      expect(get.status).toBe(200);
      expect(get.body.requiredDocumentTypeIds.sort()).toEqual([typeA.id, typeB.id].sort());
    });

    it("Required documents can be cleared", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "clear-docs-admin@example.com",
      });
      const typeA = await db.documentType.create({
        type: "passport",
        description: "Passport",
      });

      const create = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Helper",
          requiredDocumentTypeIds: [typeA.id],
        });
      expect(create.status).toBe(200);
      expect(create.body.requiredDocumentTypeIds).toEqual([typeA.id]);

      const updated = await request(app)
        .put(`/trips/worker-roles/${create.body.id}`)
        .set(authHeader)
        .send({
          name: "Helper",
          requiredDocumentTypeIds: [],
        });

      expect(updated.status).toBe(200);
      expect(updated.body.requiredDocumentTypeIds).toEqual([]);
      expect(updated.body.requiredDocumentTypes).toEqual([]);
    });

    it("Existing documentTypeId is migrated into required documents", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "migrate-docs-admin@example.com",
      });
      const docType = await db.documentType.create({
        type: "medical_licence",
        description: "Legacy Licence",
      });
      const role = await db.workerRole.create({
        orgId: org.id,
        name: "Legacy Nurse",
        licenseRequired: true,
        documentTypeId: docType.id,
        status: "active",
      });

      await ensureSchema();

      const joins = await db.workerRoleDocumentType.findAll({
        where: { workerRoleId: role.id },
      });
      expect(joins).toHaveLength(1);
      expect(joins[0].documentTypeId).toBe(docType.id);

      const get = await request(app)
        .get(`/trips/worker-roles/${role.id}`)
        .set(authHeader);
      expect(get.status).toBe(200);
      expect(get.body.requiredDocumentTypeIds).toEqual([docType.id]);
    });
  });

  describe("US-6.2 — Set trip team role needs", () => {
    it("Trip Leader adds a trip worker role quantity", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "twr-admin@example.com",
      });
      const leader = await registerUser({
        email: "twr-leader@example.com",
        firstName: "Trip",
        lastName: "Leader",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leader.user.personId, "Trip Leader");

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Builder",
          licenseRequired: false,
        });
      expect(workerRole.status).toBe(200);

      const trip = await createTripAsAdmin(authHeader, org.id, {
        name: "Build Trip",
        leaderPeopleIds: [leader.user.personId],
      });

      const create = await request(app)
        .post("/trips/trip-worker-roles")
        .set(leader.authHeader)
        .send({
          tripId: trip.id,
          workerRoleId: workerRole.body.id,
          quantity: 3,
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        tripId: trip.id,
        workerRoleId: workerRole.body.id,
        quantity: 3,
      });

      const list = await request(app)
        .get("/trips/trip-worker-roles")
        .query({ tripId: trip.id })
        .set(leader.authHeader);

      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({
        id: create.body.id,
        quantity: 3,
        workerRoleId: workerRole.body.id,
      });
    });
  });

  describe("US-6.3 — Configure trip travel options", () => {
    it("Org Admin adds two options in the same set", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "travel-admin@example.com",
      });
      const trip = await createTripAsAdmin(authHeader, org.id, {
        name: "Travel Options Trip",
      });

      const optionA = await request(app)
        .post("/trips/trip-travel-options")
        .set(authHeader)
        .send({
          tripId: trip.id,
          description: "Fly with group",
          priceAdjustment: 0,
          setNumber: 1,
        });
      const optionB = await request(app)
        .post("/trips/trip-travel-options")
        .set(authHeader)
        .send({
          tripId: trip.id,
          description: "Arrive early",
          priceAdjustment: 150.5,
          setNumber: 1,
        });

      expect(optionA.status).toBe(200);
      expect(optionB.status).toBe(200);
      expect(optionA.body.setNumber).toBe(1);
      expect(optionB.body.setNumber).toBe(1);
      expect(Number(optionA.body.priceAdjustment)).toBe(0);
      expect(Number(optionB.body.priceAdjustment)).toBe(150.5);

      const list = await request(app)
        .get("/trips/trip-travel-options")
        .query({ tripId: trip.id })
        .set(authHeader);

      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(2);
      expect(list.body.every((o) => o.setNumber === 1)).toBe(true);
      expect(list.body.map((o) => o.description)).toEqual(
        expect.arrayContaining(["Fly with group", "Arrive early"])
      );
    });
  });
});
