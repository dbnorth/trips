/**
 * Feature 59 — Document Type Specialization List
 * Spec: features/feature-59-document-type-specialization-list.md
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
  createSystemAdminUser,
  completePersonProfile,
  TINY_PNG,
  createDocumentType,
  createOrganization,
} from "./helpers.js";

const applicationBody = (tripWorkerRoleId, signatureName) => ({
  tripWorkerRoleId,
  willSelfFund: true,
  flightPurchaseOption: "self",
  willRaiseFunds: false,
  hasPreferredRoommate: false,
  isPregnant: false,
  agreementAccepted: true,
  agreementSignatureName: signatureName,
});

const addBoardCertification = async (names, orgId) => {
  const documentType = await createDocumentType({
    orgId,
    type: "certification",
    description: "Board certification",
    allowSpecialization: true,
  });
  const list = {};
  for (const name of names) {
    list[name] = await db.documentTypeSpecialization.create({
      documentTypeId: documentType.id,
      name,
    });
  }
  return { documentType, list };
};

const createTripWithRole = async (authHeader, orgId, { requiredDocumentTypeIds, requiredSpecializationIds }) => {
  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId,
      name: "Pediatric Clinic",
      status: "active",
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      participantCost: 1800,
    });
  expect(trip.status).toBe(200);

  const workerRole = await request(app)
    .post("/trips/worker-roles")
    .set(authHeader)
    .send({ orgId, name: "Pediatric Nurse", requiredDocumentTypeIds, requiredSpecializationIds });
  expect(workerRole.status).toBe(200);

  const tripWorkerRole = await request(app)
    .post("/trips/trip-worker-roles")
    .set(authHeader)
    .send({ tripId: trip.body.id, workerRoleId: workerRole.body.id, quantity: 2 });
  expect(tripWorkerRole.status).toBe(200);

  return { trip: trip.body, tripWorkerRole: tripWorkerRole.body };
};

describe("Feature 59 — Document Type Specialization List", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-59.1 — Keep a list of specializations on a document type", () => {
    it("Specialization list is saved on the document type", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "list-admin@example.com" });

      const create = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({ orgId: (await createOrganization()).id,
          type: "certification",
          description: "Board certification",
          allowSpecialization: true,
          specializations: [{ name: " Pediatrics " }, { name: "Emergency" }],
        });
      expect(create.status).toBe(200);

      const loaded = await request(app)
        .get(`/trips/document-types/${create.body.id}`)
        .set(authHeader);
      expect(loaded.status).toBe(200);
      expect(loaded.body.specializations.map((s) => s.name)).toEqual(["Emergency", "Pediatrics"]);
      const emergency = loaded.body.specializations.find((s) => s.name === "Emergency");

      const update = await request(app)
        .put(`/trips/document-types/${create.body.id}`)
        .set(authHeader)
        .send({
          allowSpecialization: true,
          specializations: [{ id: emergency.id, name: "Emergency Medicine" }],
        });
      expect(update.status).toBe(200);

      const reloaded = await request(app)
        .get(`/trips/document-types/${create.body.id}`)
        .set(authHeader);
      expect(reloaded.body.specializations).toEqual([
        { id: emergency.id, name: "Emergency Medicine" },
      ]);

      const list = await request(app).get("/trips/document-types").set(authHeader);
      expect(list.body.find((d) => d.id === create.body.id).specializations).toEqual([
        { id: emergency.id, name: "Emergency Medicine" },
      ]);

      const duplicate = await request(app)
        .put(`/trips/document-types/${create.body.id}`)
        .set(authHeader)
        .send({
          specializations: [{ id: emergency.id, name: "Emergency Medicine" }, { name: "emergency medicine" }],
        });
      expect(duplicate.status).toBe(400);
    });

    it("Allow Specialization needs at least one specialization", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "needs-one-admin@example.com" });

      const response = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({ orgId: (await createOrganization()).id,
          type: "certification",
          description: "Board certification",
          allowSpecialization: true,
          specializations: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Add at least one specialization.");
    });

    it("A specialization in use cannot be removed", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "in-use-admin@example.com" });
      const ana = await registerUser({ email: "ana-in-use@example.com" });
      const { documentType, list } = await addBoardCertification(["Pediatrics", "Emergency"]);
      const document = await db.personDocument.create({
        personId: ana.user.personId,
        documentTypeId: documentType.id,
        countryIssued: "US",
        expirationDate: "2030-01-15",
      });
      await db.personDocumentSpecialization.create({
        personDocumentId: document.id,
        documentTypeSpecializationId: list.Pediatrics.id,
        specializationDate: "2024-03-01",
        documentFileName: "people/pediatrics.png",
      });

      const response = await request(app)
        .put(`/trips/document-types/${documentType.id}`)
        .set(authHeader)
        .send({
          description: "Board certification renamed",
          specializations: [{ id: list.Emergency.id, name: "Emergency" }],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Pediatrics is in use and cannot be removed.");
      const names = (
        await db.documentTypeSpecialization.findAll({ where: { documentTypeId: documentType.id } })
      ).map((s) => s.name);
      expect(names).toEqual(expect.arrayContaining(["Pediatrics", "Emergency"]));
      expect((await db.documentType.findByPk(documentType.id)).description).toBe("Board certification");
    });
  });

  describe("US-59.2 — Require specializations on a worker role", () => {
    it("Worker role saves required specializations", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "role-spec-admin@example.com" });
      const { documentType, list } = await addBoardCertification(["Pediatrics", "Emergency"], org.id);

      const create = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Pediatric Nurse",
          requiredDocumentTypeIds: [documentType.id],
          requiredSpecializationIds: [list.Pediatrics.id],
        });
      expect(create.status).toBe(200);

      const loaded = await request(app)
        .get(`/trips/worker-roles/${create.body.id}`)
        .set(authHeader);
      expect(loaded.status).toBe(200);
      expect(loaded.body.requiredSpecializationIds).toEqual([list.Pediatrics.id]);
      expect(loaded.body.requiredSpecializations).toEqual([
        { id: list.Pediatrics.id, name: "Pediatrics", documentTypeId: documentType.id },
      ]);

      const update = await request(app)
        .put(`/trips/worker-roles/${create.body.id}`)
        .set(authHeader)
        .send({ requiredDocumentTypeIds: [] });
      expect(update.status).toBe(200);

      const reloaded = await request(app)
        .get(`/trips/worker-roles/${create.body.id}`)
        .set(authHeader);
      expect(reloaded.body.requiredSpecializationIds).toEqual([]);
      expect(reloaded.body.requiredSpecializations).toEqual([]);
    });

    it("Required specialization must belong to a required document", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "role-spec-bad-admin@example.com" });
      const { list } = await addBoardCertification(["Pediatrics"], org.id);

      const response = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Pediatric Nurse",
          requiredDocumentTypeIds: [],
          requiredSpecializationIds: [list.Pediatrics.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Required specializations must belong to a required document."
      );
    });
  });

  describe("US-59.3 — Add specializations from the list on my profile", () => {
    it("Person document saves specializations from the list", async () => {
      const { authHeader, user } = await registerUser({ email: "person-spec@example.com" });
      const { documentType, list } = await addBoardCertification(["Pediatrics"]);

      const upload = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(documentType.id))
        .field("expirationDate", "2030-01-15")
        .field(
          "specializations",
          JSON.stringify([{ documentTypeSpecializationId: list.Pediatrics.id, date: "2024-03-01" }])
        )
        .attach("specializationFiles", TINY_PNG, { filename: "pediatrics.png", contentType: "image/png" });

      expect(upload.status).toBe(200);
      expect(upload.body.specializations).toEqual([
        expect.objectContaining({
          documentTypeSpecializationId: list.Pediatrics.id,
          name: "Pediatrics",
          date: "2024-03-01",
        }),
      ]);
    });

    it("Specialization not in the type's list is rejected", async () => {
      const { authHeader, user } = await registerUser({ email: "person-spec-other@example.com" });
      const diploma = await createDocumentType({
        type: "diploma",
        description: "Diploma",
        allowSpecialization: true,
      });
      const nursing = await db.documentTypeSpecialization.create({
        documentTypeId: diploma.id,
        name: "Nursing",
      });
      const { documentType } = await addBoardCertification(["Pediatrics"]);

      const upload = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(documentType.id))
        .field("expirationDate", "2030-01-15")
        .field(
          "specializations",
          JSON.stringify([{ documentTypeSpecializationId: nursing.id, date: "2024-03-01" }])
        )
        .attach("specializationFiles", TINY_PNG, { filename: "nursing.png", contentType: "image/png" });

      expect(upload.status).toBe(400);
      expect(upload.body.message).toBe("Specialization is not in the list for this document type.");
    });

    it("The same specialization cannot be added twice", async () => {
      const { authHeader, user } = await registerUser({ email: "person-spec-twice@example.com" });
      const { documentType, list } = await addBoardCertification(["Pediatrics"]);

      const upload = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(documentType.id))
        .field("expirationDate", "2030-01-15")
        .field(
          "specializations",
          JSON.stringify([
            { documentTypeSpecializationId: list.Pediatrics.id, date: "2024-03-01" },
            { documentTypeSpecializationId: list.Pediatrics.id, date: "2024-04-01" },
          ])
        )
        .attach("specializationFiles", TINY_PNG, { filename: "one.png", contentType: "image/png" })
        .attach("specializationFiles", TINY_PNG, { filename: "two.png", contentType: "image/png" });

      expect(upload.status).toBe(400);
      expect(upload.body.message).toBe("Each specialization can be added only once per document.");
    });
  });

  describe("US-59.4 — Application checks require the role's specializations", () => {
    it("Application stays incomplete until the required specialization is added", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "gate-spec-admin@example.com" });
      const { documentType, list } = await addBoardCertification(["Pediatrics"], org.id);
      const { trip, tripWorkerRole } = await createTripWithRole(authHeader, org.id, {
        requiredDocumentTypeIds: [documentType.id],
        requiredSpecializationIds: [list.Pediatrics.id],
      });
      const applicant = await registerUser({ email: "gate-spec-app@example.com", orgIds: [org.id] });
      await completePersonProfile(applicant.user.personId);
      const document = await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: documentType.id,
        countryIssued: "US",
        expirationDate: "2030-01-15",
        documentFileName: "people/board.png",
      });

      const incomplete = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send(applicationBody(tripWorkerRole.id, "Spec Applicant"));
      expect(incomplete.status).toBe(200);
      expect(incomplete.body.applicationStatus).toBe("incomplete");

      await db.personDocumentSpecialization.create({
        personDocumentId: document.id,
        documentTypeSpecializationId: list.Pediatrics.id,
        specializationDate: "2024-03-01",
        documentFileName: "people/pediatrics.png",
      });

      const applied = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(applicant.authHeader)
        .send({
          ...applicationBody(tripWorkerRole.id, "Spec Applicant"),
          version: incomplete.body.assignment.version,
        });
      expect(applied.status).toBe(200);
      expect(applied.body.applicationStatus).toBe("applied");
    });

    it("Missing specializations are named in the missing items", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "missing-spec-admin@example.com" });
      const { documentType, list } = await addBoardCertification(["Pediatrics", "Emergency"], org.id);
      const { trip, tripWorkerRole } = await createTripWithRole(authHeader, org.id, {
        requiredDocumentTypeIds: [documentType.id],
        requiredSpecializationIds: [list.Pediatrics.id, list.Emergency.id],
      });
      const applicant = await registerUser({ email: "missing-spec-app@example.com", orgIds: [org.id] });
      await completePersonProfile(applicant.user.personId);
      const document = await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: documentType.id,
        countryIssued: "US",
        expirationDate: "2030-01-15",
        documentFileName: "people/board.png",
      });
      await db.personDocumentSpecialization.create({
        personDocumentId: document.id,
        documentTypeSpecializationId: list.Emergency.id,
        specializationDate: "2024-03-01",
        documentFileName: "people/emergency.png",
      });
      const apply = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send(applicationBody(tripWorkerRole.id, "Missing Spec Applicant"));
      expect(apply.status).toBe(200);

      const status = await request(app).get(`/trips/trips/${trip.id}/status`).set(authHeader);

      expect(status.status).toBe(200);
      const row = status.body.participants.find(
        (p) => Number(p.peopleId) === Number(applicant.user.personId)
      );
      expect(row.missingItems).toContain("Required role document(s): Board certification (Pediatrics)");
    });
  });

  describe("US-59.5 — Worker roles no longer have License required", () => {
    it("License required is removed from worker roles", async () => {
      await db.sequelize.query(
        "ALTER TABLE workerRoles ADD COLUMN licenseRequired TINYINT(1) NOT NULL DEFAULT 0"
      );
      await ensureSchema();
      const [cols] = await db.sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'workerRoles' AND COLUMN_NAME = 'licenseRequired'`
      );
      expect(cols).toHaveLength(0);

      const { authHeader, org } = await createOrgAdminUser({ email: "no-license-admin@example.com" });
      const create = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({ orgId: org.id, name: "Nurse", licenseRequired: true });

      expect(create.status).toBe(200);
      expect(create.body).not.toHaveProperty("licenseRequired");
    });
  });
});
