/**
 * Feature 107 — Spell "License" the US Way
 * Spec: features/feature-107-license-spelling.md
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import { syncTestDatabase, resetTestDatabase, createOrgAdminUser } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TYPE_MESSAGE = "Type must be medical_license, passport, certification, diploma, or doctor_permission.";

const typeColumn = async () => {
  const [rows] = await db.sequelize.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentTypes' AND COLUMN_NAME = 'type'`
  );
  return rows[0].COLUMN_TYPE;
};

describe("Feature 107 — Spell License the US Way", () => {
  let olivia;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    olivia = await createOrgAdminUser({ email: "olivia@example.org", orgName: "Mission Health" });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-107.1 — Document types say License", () => {
    it("The API takes medical_license and refuses medical_licence", async () => {
      const create = (type) =>
        request(app)
          .post("/trips/document-types")
          .set(olivia.authHeader)
          .send({ orgId: olivia.org.id, description: "Registered Nurse License (RN)", type });

      const ok = await create("medical_license");
      expect(ok.status).toBe(200);
      expect(ok.body.type).toBe("medical_license");

      const old = await create("medical_licence");
      expect(old.status).toBe(400);
      expect(old.body.message).toBe(TYPE_MESSAGE);
    });
  });

  describe("US-107.2 — Existing data is fixed on update", () => {
    it("Startup moves stored medical_licence types to medical_license", async () => {
      await db.sequelize.query(
        `ALTER TABLE documentTypes MODIFY COLUMN type
         ENUM('medical_licence', 'passport', 'certification', 'diploma', 'doctor_permission') NOT NULL`
      );
      await db.sequelize.query(
        `INSERT INTO documentTypes (orgId, description, type, createdAt, updatedAt) VALUES
         (:orgId, 'Registered Nurse License (RN)', 'medical_licence', NOW(), NOW()),
         (:orgId, 'Licensed Practical Nurse License (LPN)', 'medical_licence', NOW(), NOW()),
         (:orgId, 'Passport', 'passport', NOW(), NOW())`,
        { replacements: { orgId: olivia.org.id } }
      );

      await ensureSchema();

      const types = await db.documentType.findAll({ where: { orgId: olivia.org.id }, order: [["id", "ASC"]] });
      expect(types.map((t) => t.type)).toEqual(["medical_license", "medical_license", "passport"]);
      expect(await typeColumn()).not.toContain("medical_licence");
      expect(await typeColumn()).toContain("'medical_license'");

      await ensureSchema();
      const again = await db.documentType.findAll({ where: { orgId: olivia.org.id }, order: [["id", "ASC"]] });
      expect(again.map((t) => t.type)).toEqual(["medical_license", "medical_license", "passport"]);
    });

    it("Startup fixes Licence in existing descriptions", async () => {
      const orgId = olivia.org.id;
      const rn = await db.documentType.create({
        orgId,
        description: "Registered Nurse Licence (RN)",
        type: "medical_license",
      });
      const lpn = await db.documentType.create({
        orgId,
        description: "Licenced Practical Nurse Licence (LPN)",
        type: "medical_license",
      });
      const lower = await db.documentType.create({
        orgId,
        description: "nursing licence, licenced in Texas",
        type: "medical_license",
      });
      const caps = await db.documentType.create({ orgId, description: "LICENCE CARD", type: "certification" });
      const passport = await db.documentType.create({ orgId, description: "Passport", type: "passport" });

      await ensureSchema();
      const descriptions = async () =>
        Promise.all([rn, lpn, lower, caps, passport].map(async (t) => (await t.reload()).description));

      expect(await descriptions()).toEqual([
        "Registered Nurse License (RN)",
        "Licensed Practical Nurse License (LPN)",
        "nursing license, licensed in Texas",
        "LICENCE CARD",
        "Passport",
      ]);

      await ensureSchema();
      expect(await descriptions()).toEqual([
        "Registered Nurse License (RN)",
        "Licensed Practical Nurse License (LPN)",
        "nursing license, licensed in Texas",
        "LICENCE CARD",
        "Passport",
      ]);
    });

    it("Seed data spells License", async () => {
      const seed = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../app/data/documentTypes.json"), "utf8")
      );
      for (const type of seed) {
        expect(type.description).not.toMatch(/licen[c]e/i);
        expect(type.type).not.toMatch(/licen[c]e/i);
        if (/license/i.test(type.description)) expect(type.type).toBe("medical_license");
      }
      expect(seed.map((t) => t.description)).toContain("Licensed Practical Nurse License (LPN)");

      await db.organization.findOrCreate({ where: { id: 1 }, defaults: { name: "Organization One" } });
      await db.documentType.destroy({ where: { orgId: 1 } });
      await ensureSchema();
      const medical = await db.documentType.findOne({ where: { orgId: 1, type: "medical_license" } });
      expect(medical.description).toBe("Medical License");
    });
  });
});
