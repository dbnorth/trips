/**
 * Feature 91 — Document Types by Organization
 * Spec: features/feature-91-org-document-types.md
 */

import fs from "fs";
import path from "path";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createOrganization,
  assignOrgRole,
} from "./helpers.js";

const SAMPLE_LINES = fs.readFileSync(path.resolve("tests/fixtures/trip-master-sample.csv"), "utf8").split("\n");
const LYLE_LINES = [...SAMPLE_LINES.slice(0, 3), SAMPLE_LINES.find((line) => line.includes("lyle@example.org"))];

describe("Feature 91 — Document Types by Organization", () => {
  let omar;
  let hana;
  let hope;
  let healing;

  const setUpOrganizations = async () => {
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    hope = omar.org;
    hana = await createOrgAdminUser({ email: "hana@example.org", orgName: "Healing Hands" });
    healing = hana.org;
  };

  const descriptions = (rows) => rows.map((row) => row.description);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-91.2 — Existing document types move to organization 1", () => {
    it("The update puts existing document types in organization 1", async () => {
      await db.organization.create({ id: 1, name: "Hope Missions" });
      const [fks] = await db.sequelize.query(
        `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentTypes'
           AND COLUMN_NAME = 'orgId' AND REFERENCED_TABLE_NAME IS NOT NULL`
      );
      for (const fk of fks) {
        await db.sequelize.query(`ALTER TABLE documentTypes DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
      }
      await db.sequelize.query("ALTER TABLE documentTypes DROP COLUMN orgId");
      await db.sequelize.query(
        `INSERT INTO documentTypes (description, type, createdAt, updatedAt)
         VALUES ('Passport', 'passport', NOW(), NOW()), ('Nursing License', 'medical_licence', NOW(), NOW())`
      );
      const [[passport], [nursing]] = await Promise.all(
        ["Passport", "Nursing License"].map((description) =>
          db.sequelize.query("SELECT id FROM documentTypes WHERE description = :description", {
            replacements: { description },
          }).then(([rows]) => rows)
        )
      );
      const ana = await registerUser({ email: "ana@example.org", firstName: "Ana", lastName: "Lopez" });
      const anaPassport = await db.personDocument.create({
        personId: ana.user.personId,
        documentTypeId: passport.id,
      });
      const rn = await db.workerRole.create({ orgId: 1, name: "RN" });
      await db.workerRoleDocumentType.create({ workerRoleId: rn.id, documentTypeId: nursing.id });

      await ensureSchema();

      const snapshot = async () => {
        const [types] = await db.sequelize.query(
          "SELECT id, orgId, description FROM documentTypes ORDER BY id"
        );
        const [[column]] = await db.sequelize.query(
          `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentTypes' AND COLUMN_NAME = 'orgId'`
        );
        return { types, nullable: column.IS_NULLABLE };
      };
      const after = await snapshot();
      expect(after.nullable).toBe("NO");
      expect(after.types).toEqual(
        expect.arrayContaining([
          { id: passport.id, orgId: 1, description: "Passport" },
          { id: nursing.id, orgId: 1, description: "Nursing License" },
        ])
      );
      expect(after.types.every((row) => row.orgId === 1)).toBe(true);
      expect((await db.personDocument.findByPk(anaPassport.id)).documentTypeId).toBe(passport.id);
      const rnLinks = await db.workerRoleDocumentType.findAll({ where: { workerRoleId: rn.id } });
      expect(rnLinks.map((link) => link.documentTypeId)).toEqual([nursing.id]);

      await ensureSchema();

      expect(await snapshot()).toEqual(after);
    });
  });

  describe("US-91.1 — Org Admins manage their organization's document types", () => {
    it("An Org Admin manages only their organization's document types", async () => {
      await setUpOrganizations();
      const passport = await db.documentType.create({ orgId: hope.id, description: "Passport", type: "passport" });
      await db.documentType.create({ orgId: hope.id, description: "Nursing License", type: "medical_licence" });

      const empty = await request(app).get("/trips/document-types").query({ orgId: healing.id }).set(hana.authHeader);
      expect(empty.status).toBe(200);
      expect(empty.body).toEqual([]);

      const missingOrg = await request(app)
        .post("/trips/document-types")
        .set(hana.authHeader)
        .send({ description: "CPR Certificate", type: "certification" });
      expect(missingOrg.status).toBe(400);
      expect(missingOrg.body.message).toBe("Organization is required.");

      const otherOrg = await request(app)
        .post("/trips/document-types")
        .set(hana.authHeader)
        .send({ orgId: hope.id, description: "CPR Certificate", type: "certification" });
      expect(otherOrg.status).toBe(403);

      const created = await request(app)
        .post("/trips/document-types")
        .set(hana.authHeader)
        .send({ orgId: healing.id, description: "CPR Certificate", type: "certification" });
      expect(created.status).toBe(200);
      expect(created.body).toMatchObject({ orgId: healing.id, description: "CPR Certificate" });

      for (const call of [
        request(app).get(`/trips/document-types/${passport.id}`),
        request(app).put(`/trips/document-types/${passport.id}`).send({ description: "Pass" }),
        request(app).delete(`/trips/document-types/${passport.id}`),
      ]) {
        const res = await call.set(hana.authHeader);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Forbidden.");
      }

      const moved = await request(app)
        .put(`/trips/document-types/${created.body.id}`)
        .set(hana.authHeader)
        .send({ orgId: hope.id, description: "CPR Card" });
      expect(moved.status).toBe(200);
      expect(moved.body).toMatchObject({ orgId: healing.id, description: "CPR Card" });

      const omarList = await request(app).get("/trips/document-types").query({ orgId: hope.id }).set(omar.authHeader);
      expect(omarList.status).toBe(200);
      expect(descriptions(omarList.body).sort()).toEqual(["Nursing License", "Passport"]);
    });
  });

  describe("US-91.3 — People and worker roles see the right organization's document types", () => {
    it("A person chooses from the document types of their organizations", async () => {
      await setUpOrganizations();
      await db.documentType.create({ orgId: hope.id, description: "Passport", type: "passport" });
      await db.documentType.create({ orgId: hope.id, description: "Nursing License", type: "medical_licence" });
      await db.documentType.create({ orgId: healing.id, description: "CPR Certificate", type: "certification" });
      await db.documentType.create({
        orgId: (await createOrganization("Other Org")).id,
        description: "Diploma",
        type: "diploma",
      });
      const ana = await registerUser({ email: "ana@example.org", firstName: "Ana", lastName: "Lopez", orgIds: [hope.id] });
      await assignOrgRole(healing.id, ana.user.personId, "Trip Participant");
      await assignOrgRole(hope.id, ana.user.personId, "Trip Participant");
      const ben = await registerUser({ email: "ben@example.org", firstName: "Ben", lastName: "Ray", orgIds: [healing.id] });

      const anaTypes = await request(app)
        .get("/trips/document-types")
        .query({ personId: ana.user.personId })
        .set(ana.authHeader);
      expect(anaTypes.status).toBe(200);
      expect(anaTypes.body.map((row) => `${row.description} (${row.organization.name})`)).toEqual([
        "CPR Certificate (Healing Hands)",
        "Nursing License (Hope Missions)",
        "Passport (Hope Missions)",
      ]);

      const benTypes = await request(app)
        .get("/trips/document-types")
        .query({ personId: ben.user.personId })
        .set(ben.authHeader);
      expect(benTypes.status).toBe(200);
      expect(descriptions(benTypes.body)).toEqual(["CPR Certificate"]);

      const benDefault = await request(app).get("/trips/document-types").set(ben.authHeader);
      expect(descriptions(benDefault.body)).toEqual(["CPR Certificate"]);

      const notBens = await request(app)
        .get("/trips/document-types")
        .query({ personId: ana.user.personId })
        .set(ben.authHeader);
      expect(notBens.status).toBe(403);
    });

    it("A worker role requires only its organization's document types", async () => {
      await setUpOrganizations();
      const passport = await db.documentType.create({ orgId: hope.id, description: "Passport", type: "passport" });
      const license = await db.documentType.create({
        orgId: hope.id,
        description: "Nursing License",
        type: "medical_licence",
      });
      const cpr = await db.documentType.create({ orgId: healing.id, description: "CPR Certificate", type: "certification" });

      const offered = await request(app).get("/trips/document-types").query({ orgId: healing.id }).set(hana.authHeader);
      expect(descriptions(offered.body)).toEqual(["CPR Certificate"]);

      const refused = await request(app)
        .post("/trips/worker-roles")
        .set(hana.authHeader)
        .send({ orgId: healing.id, name: "Medic", requiredDocumentTypeIds: [cpr.id, passport.id] });
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe("Required documents must be document types of this organization.");

      const medic = await request(app)
        .post("/trips/worker-roles")
        .set(hana.authHeader)
        .send({ orgId: healing.id, name: "Medic", requiredDocumentTypeIds: [cpr.id] });
      expect(medic.status).toBe(200);

      await db.workerRoleDocumentType.create({ workerRoleId: medic.body.id, documentTypeId: passport.id });
      const kept = await request(app)
        .put(`/trips/worker-roles/${medic.body.id}`)
        .set(hana.authHeader)
        .send({ name: "Medic", requiredDocumentTypeIds: [cpr.id, passport.id] });
      expect(kept.status).toBe(200);
      expect(kept.body.requiredDocumentTypeIds.sort()).toEqual([cpr.id, passport.id].sort());

      const added = await request(app)
        .put(`/trips/worker-roles/${medic.body.id}`)
        .set(hana.authHeader)
        .send({ name: "Medic", requiredDocumentTypeIds: [cpr.id, passport.id, license.id] });
      expect(added.status).toBe(400);
      expect(added.body.message).toBe("Required documents must be document types of this organization.");
    });

    it("The Trip Master import uses the trip organization's passport type", async () => {
      await setUpOrganizations();
      await db.documentType.create({ orgId: hope.id, description: "Passport", type: "passport" });
      const trip = await db.trip.create({
        orgId: healing.id,
        name: "Guatemala Clinic 2027",
        status: "active",
        startDate: "2027-06-10",
        endDate: "2027-06-17",
        participantCost: 950,
      });
      const surgeon = await db.workerRole.create({ orgId: healing.id, name: "General Surgeon" });
      await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: surgeon.id, quantity: 1 });
      const importLyle = () =>
        request(app)
          .post(`/trips/trips/${trip.id}/import-trip-master`)
          .set(hana.authHeader)
          .attach("file", Buffer.from(LYLE_LINES.join("\n")), { filename: "trip-master.csv", contentType: "text/csv" });
      const lylePassports = async () => {
        const lyle = await db.person.findOne({ where: { email: "lyle@example.org" } });
        return db.personDocument.findAll({ where: { personId: lyle.id } });
      };

      const first = await importLyle();
      expect(first.status).toBe(200);
      expect(first.body.notes).toContainEqual(
        expect.objectContaining({
          name: "Lyle Lowry",
          message: "no Passport document type, so the passport wasn't imported.",
        })
      );
      expect(await lylePassports()).toHaveLength(0);

      const healingPassport = await request(app)
        .post("/trips/document-types")
        .set(hana.authHeader)
        .send({ orgId: healing.id, description: "Passport", type: "passport" });
      expect(healingPassport.status).toBe(200);

      const second = await importLyle();
      expect(second.status).toBe(200);
      const passports = await lylePassports();
      expect(passports).toHaveLength(1);
      expect(passports[0].documentTypeId).toBe(healingPassport.body.id);
    });
  });
});
