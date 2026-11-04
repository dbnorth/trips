/**
 * Feature 113 — Documents Missing Reminder Email
 * Spec: features/feature-113-documents-missing-email.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import db from "../app/models/index.js";
import { runScheduledEmails } from "../app/utils/scheduledEmails.js";
import { buildTokenValues } from "../app/utils/emailTokenValues.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import { syncTestDatabase, resetTestDatabase, findRole, createDocumentType } from "./helpers.js";

const SEED_TEMPLATES = JSON.parse(
  fs.readFileSync(new URL("../app/data/emailTemplates.json", import.meta.url), "utf8")
);

const TUESDAY = "2026-11-10";
const TUESDAY_AFTER_DUE = "2026-12-22";
const EMAIL_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR"];

describe("Feature 113 — Documents Missing Reminder Email", () => {
  let savedEnv;
  let mailRoot;

  const setupMaria = async ({ status = "pre_approved" } = {}) => {
    const org = await db.organization.create({ name: "Hope Missions", email: "office@example.org" });
    const rnLicense = await createDocumentType({
      orgId: org.id,
      type: "medical_license",
      description: "RN License",
      hasExpirationDate: true,
    });
    const passport = await createDocumentType({
      orgId: org.id,
      type: "passport",
      description: "Passport",
      hasExpirationDate: true,
    });
    const nurse = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    await db.workerRoleDocumentType.create({ workerRoleId: nurse.id, documentTypeId: rnLicense.id });
    const trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2027-03-15",
      endDate: "2027-03-22",
      requirePassport: true,
    });
    const tripWorkerRole = await db.tripWorkerRole.create({
      tripId: trip.id,
      workerRoleId: nurse.id,
      quantity: 2,
    });
    const maria = await db.person.create({ firstName: "Maria", lastName: "Lopez", email: "maria@example.com" });
    const participantRole = await findRole("Trip Participant");
    const assignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: maria.id,
      roleId: participantRole.id,
      tripWorkerRoleId: tripWorkerRole.id,
      status,
    });
    const seed = SEED_TEMPLATES.templates.find((t) => t.typeCode === "documents-missing");
    const emailType = await db.emailType.findOne({ where: { typeCode: "documents-missing" } });
    await db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: seed.functionCode,
      scheduleRule: seed.scheduleRule,
      fromEmail: seed.fromEmail,
      toAddress: seed.toAddress,
      subject: seed.subject,
      emailBody: seed.emailBody,
    });
    return { org, rnLicense, passport, trip, maria, assignment };
  };

  const uploadDocument = (personId, documentType) =>
    db.personDocument.create({
      personId,
      documentTypeId: documentType.id,
      countryIssued: "US",
      expirationDate: "2030-01-01",
      documentFileName: `people/${documentType.type}.png`,
    });

  const run = (date) => runScheduledEmails({ date, output: () => {} });

  const sentTo = async () =>
    (await db.emailLog.findAll({ order: [["id", "ASC"]] })).map((log) => log.toEmail);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    mailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trips-documents-missing-"));
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = path.join(mailRoot, "mail");
    await seedEmailTypes();
    await seedEmailTokens();
  });

  afterEach(async () => {
    for (const key of EMAIL_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(mailRoot, { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-113.1 — Get a weekly reminder to upload my documents", () => {
    it("Pre-approved participant missing documents gets the reminder", async () => {
      const { maria } = await setupMaria();

      await run(TUESDAY);

      expect(await sentTo()).toEqual([maria.email]);
      const file = fs.readdirSync(process.env.EMAIL_FILE_DIR).find((name) => name.endsWith(".txt"));
      const email = fs.readFileSync(path.join(process.env.EMAIL_FILE_DIR, file), "utf8");
      expect(email).toContain("Subject: Reminder: upload your documents for Guatemala Clinic");
      expect(email).toContain("must be uploaded by 12/15/2026");
      expect(email).toContain("\nPassport\n");
    });

    it("No reminder when all documents are uploaded", async () => {
      const { maria, rnLicense, passport } = await setupMaria();
      await uploadDocument(maria.id, rnLicense);
      await uploadDocument(maria.id, passport);

      await run(TUESDAY);

      expect(await sentTo()).toEqual([]);
    });

    it("Only pre-approved applications get the reminder", async () => {
      const { assignment } = await setupMaria();

      for (const status of ["incomplete", "approved", "cancelled", "declined"]) {
        await assignment.update({ status });
        await run(TUESDAY);
      }

      expect(await sentTo()).toEqual([]);
    });

    it("Reminder keeps going after the due date", async () => {
      const { maria, rnLicense } = await setupMaria();
      await uploadDocument(maria.id, rnLicense);

      await run(TUESDAY_AFTER_DUE);

      expect(await sentTo()).toEqual([maria.email]);
    });
  });

  describe("US-113.2 — Write the reminder with the missing documents and due date", () => {
    it("Missing documents token lists each missing document", async () => {
      const { org, trip, maria } = await setupMaria();

      const values = await buildTokenValues({ orgId: org.id, tripId: trip.id, personId: maria.id });

      const lines = values.MISSING_DOCUMENTS.split("\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toMatch(/^RN License/);
      expect(lines[1]).toBe("Passport");
    });

    it("Due date token is 90 days before the trip", async () => {
      const { org, trip } = await setupMaria();

      const values = await buildTokenValues({ orgId: org.id, tripId: trip.id });

      expect(values.DOCUMENTS_DUE_DATE).toBe("12/15/2026");
    });

    it("Tokens are empty when nothing applies", async () => {
      const { org, trip, maria, rnLicense, passport } = await setupMaria();
      await uploadDocument(maria.id, rnLicense);
      await uploadDocument(maria.id, passport);
      const undated = await db.trip.create({ orgId: org.id, name: "Someday Trip", status: "active" });

      const mariaValues = await buildTokenValues({ orgId: org.id, tripId: trip.id, personId: maria.id });
      const undatedValues = await buildTokenValues({ orgId: org.id, tripId: undated.id });

      expect(mariaValues.MISSING_DOCUMENTS).toBe("");
      expect(undatedValues.DOCUMENTS_DUE_DATE).toBe("");
    });
  });

  describe("US-113.3 — Start with a default reminder", () => {
    it("Seed adds the reminder", async () => {
      const seedOrg = await db.organization.create({
        name: "Health Talents International",
        email: "info@example.org",
      });

      await seedEmailTemplates();

      const type = await db.emailType.findOne({ where: { typeCode: "documents-missing" } });
      expect([type.description, type.eventCode]).toEqual(["Documents missing reminder", "documents-missing"]);
      const tokens = await db.emailToken.findAll({
        where: { tokenCode: ["MISSING_DOCUMENTS", "DOCUMENTS_DUE_DATE"] },
        order: [["tokenCode", "ASC"]],
      });
      expect(tokens.map((t) => [t.tokenCode, t.valueSource])).toEqual([
        ["DOCUMENTS_DUE_DATE", "trip.documentsDueDate"],
        ["MISSING_DOCUMENTS", "participant.missingDocuments"],
      ]);
      const template = await db.emailTemplate.findOne({
        where: { orgId: seedOrg.id, emailTypeId: type.id },
      });
      expect([template.functionCode, template.scheduleRule]).toEqual(["Scheduled", "weekly"]);
      expect(template.subject).toBe("Reminder: upload your documents for {{TRIP_NAME}}");

      const counts = async () => [
        await db.emailType.count(),
        await db.emailToken.count(),
        await db.emailTemplate.count(),
      ];
      const before = await counts();
      expect(await seedEmailTypes()).toBe(0);
      expect(await seedEmailTokens()).toBe(0);
      expect((await seedEmailTemplates()).inserted).toBe(0);
      expect(await counts()).toEqual(before);
    });
  });
});
