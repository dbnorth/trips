/**
 * Feature 105 — Delete Unused Worker Roles
 * Spec: features/feature-105-delete-unused-worker-roles.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createDocumentType,
} from "./helpers.js";

describe("Feature 105 — Delete Unused Worker Roles", () => {
  let olivia;
  let rnLicense;
  let dentalLicense;
  let pediatrics;
  let nurse;
  let dentist;
  let tripNurse;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    olivia = await createOrgAdminUser({ email: "olivia@example.org", orgName: "Mission Health" });
    const orgId = olivia.org.id;
    rnLicense = await createDocumentType({
      orgId,
      type: "medical_licence",
      description: "RN License",
      allowSpecialization: true,
    });
    dentalLicense = await createDocumentType({ orgId, type: "medical_licence", description: "Dental License" });
    pediatrics = await db.documentTypeSpecialization.create({ documentTypeId: rnLicense.id, name: "Pediatrics" });

    const createRole = (body) =>
      request(app).post("/trips/worker-roles").set(olivia.authHeader).send({ orgId, ...body });
    nurse = (
      await createRole({
        name: "Nurse",
        requiredDocumentTypeIds: [rnLicense.id],
        requiredSpecializationIds: [pediatrics.id],
      })
    ).body;
    dentist = (
      await createRole({ name: "Dentist", requiredDocumentTypeIds: [rnLicense.id, dentalLicense.id] })
    ).body;

    const trip = await db.trip.create({
      orgId,
      name: "Guatemala Clinic 2027",
      status: "active",
      startDate: "2027-01-16",
      endDate: "2027-01-23",
      participantCost: 950,
    });
    tripNurse = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: nurse.id, quantity: 3 });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-105.1 — Delete a worker role no trip uses", () => {
    it("Deleting a role removes its required documents but keeps the document types", async () => {
      const response = await request(app)
        .delete(`/trips/worker-roles/${dentist.id}`)
        .set(olivia.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Worker role deleted.");
      expect(await db.workerRole.findByPk(dentist.id)).toBeNull();
      expect(await db.workerRoleDocumentType.count({ where: { workerRoleId: dentist.id } })).toBe(0);
      expect(await db.documentType.findByPk(rnLicense.id)).not.toBeNull();
      expect(await db.documentType.findByPk(dentalLicense.id)).not.toBeNull();

      const nurseNow = await request(app).get(`/trips/worker-roles/${nurse.id}`).set(olivia.authHeader);
      expect(nurseNow.body.requiredDocumentTypeIds).toEqual([rnLicense.id]);
      expect(nurseNow.body.requiredSpecializationIds).toEqual([pediatrics.id]);
    });
  });

  describe("US-105.2 — Roles used on trips can't be deleted", () => {
    it("The API refuses to delete a role used on a trip", async () => {
      const response = await request(app)
        .delete(`/trips/worker-roles/${nurse.id}`)
        .set(olivia.authHeader);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("This role is used on a trip and cannot be deleted.");
      expect(await db.workerRole.findByPk(nurse.id)).not.toBeNull();
      expect(await db.workerRoleDocumentType.count({ where: { workerRoleId: nurse.id } })).toBe(1);
      expect(await db.workerRoleSpecialization.count({ where: { workerRoleId: nurse.id } })).toBe(1);
      expect(await db.tripWorkerRole.findByPk(tripNurse.id)).not.toBeNull();
    });

    it("The worker roles list says which roles are in use", async () => {
      const list = await request(app)
        .get("/trips/worker-roles")
        .query({ orgId: olivia.org.id })
        .set(olivia.authHeader);

      expect(list.status).toBe(200);
      const byName = Object.fromEntries(list.body.map((r) => [r.name, r.inUse]));
      expect(byName).toEqual({ Nurse: true, Dentist: false });

      const one = await request(app).get(`/trips/worker-roles/${dentist.id}`).set(olivia.authHeader);
      expect(one.body.inUse).toBe(false);
    });
  });
});
