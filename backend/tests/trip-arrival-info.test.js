/**
 * Feature 76 — Trip Arrival Info
 * Spec: features/feature-76-trip-arrival-info.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { emailTransport } from "../app/utils/emailDelivery.js";
import { runScheduledEmails } from "../app/utils/scheduledEmails.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  TINY_PNG,
} from "./helpers.js";

const ARRIVAL_DIR = path.resolve("documents", "trips");
const EMAIL_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR", "SMTP_USER", "SMTP_PASSWORD_SECRET_ID"];
const PDF_ONE = Buffer.from("%PDF-1.4 first arrival info");
const PDF_TWO = Buffer.from("%PDF-1.4 second arrival info");
const PDF_NAME = "Trip Arrival - Guatemala Clinic.pdf";

const binary = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

const arrivalFiles = () => (fs.existsSync(ARRIVAL_DIR) ? fs.readdirSync(ARRIVAL_DIR) : []);

describe("Feature 76 — Trip Arrival Info", () => {
  let savedEnv;
  let mailRoot;
  let filesBefore;
  let originalCreate;
  let smtpMessages;
  let admin;
  let org;
  let trip;
  let tess;
  let ana;
  let ben;
  let cara;
  let olga;

  const addMember = async (email, firstName, status, roleName = "Trip Participant") => {
    const reg = await registerUser({ email, firstName, lastName: "Lopez", orgIds: [org.id] });
    await db.person.update({ email }, { where: { id: reg.user.personId } });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: reg.user.personId,
      roleId: (await findRole(roleName)).id,
      status,
    });
    return reg;
  };

  const uploadPdf = (auth, content = PDF_ONE, filename = "arrival.pdf", contentType = "application/pdf") =>
    request(app)
      .post(`/trips/trips/${trip.id}/arrival-pdf`)
      .set(auth)
      .attach("file", content, { filename, contentType });

  const openPdf = (auth) =>
    request(app).get(`/trips/trips/${trip.id}/arrival-pdf`).set(auth).buffer(true).parse(binary);

  const storedFileName = async () =>
    (await db.trip.unscoped().findByPk(trip.id)).arrivalPdfFileName;

  const addTemplate = async (fields = {}) => {
    const emailType = await db.emailType.create({
      typeCode: `type-${Math.random()}`,
      description: "Trip arrival info",
      eventCode: "team-email",
    });
    return db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: "Trip Participant",
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      attachment: "{{TRIP_ARRIVAL_PDF}}",
      subject: "Arrival information for {{TRIP_NAME}}",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}, see {{TRIP_ARRIVAL_PDF}}.",
      ...fields,
    });
  };

  const sendTeamEmail = (template) =>
    request(app).post(`/trips/trips/${trip.id}/team-email`).set(tess.authHeader).send({
      emailTemplateId: template.id,
      subject: template.subject,
      emailBody: template.emailBody,
      sendTo: "accepted",
    });

  const useSmtp = () => {
    process.env.EMAIL_MODE = "smtp";
    emailTransport.create = () => ({
      sendMail: async (message) => {
        smtpMessages.push(message);
        return { messageId: `id-${smtpMessages.length}` };
      },
    });
  };

  const templateBody = (fields = {}) => ({
    orgId: org.id,
    functionCode: "Trip Participant",
    subject: "Arrival information",
    fromEmail: "{{ORG_EMAIL}}",
    toAddress: "{{PARTICIPANT_EMAIL}}",
    emailBody: "Your arrival information is attached.",
    ...fields,
  });

  beforeAll(async () => {
    await syncTestDatabase();
    originalCreate = emailTransport.create;
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    for (const key of EMAIL_KEYS) delete process.env[key];
    mailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trips-arrival-"));
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = path.join(mailRoot, "mail");
    smtpMessages = [];
    filesBefore = new Set(arrivalFiles());

    admin = await createOrgAdminUser({ email: "arrival-admin@example.org", orgName: "Hope Missions" });
    org = admin.org;
    await org.update({ email: "office@hope.org" });
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2027-03-10",
      endDate: "2027-03-17",
    });
    tess = await addMember("tess@example.org", "Tess", "approved", "Trip Leader");
    ana = await addMember("ana@example.org", "Ana", "approved");
    ben = await addMember("ben@example.org", "Ben", "approved");
    cara = await addMember("cara@example.org", "Cara", "applied");
    olga = await createOrgAdminUser({ email: "olga@example.org", orgName: "Other Org" });
    for (const [tokenCode, valueSource] of [
      ["ORG_EMAIL", "organization.email"],
      ["PARTICIPANT_EMAIL", "participant.email"],
      ["PARTICIPANT_FIRST_NAME", "participant.firstName"],
      ["TRIP_NAME", "trip.name"],
      ["TRIP_ARRIVAL_PDF", "trip.arrivalPdf"],
    ]) {
      await db.emailToken.create({ tokenCode, description: tokenCode, valueSource });
    }
  });

  afterEach(async () => {
    emailTransport.create = originalCreate;
    for (const key of EMAIL_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(mailRoot, { recursive: true, force: true });
    for (const name of arrivalFiles()) {
      if (!filesBefore.has(name)) fs.rmSync(path.join(ARRIVAL_DIR, name), { force: true });
    }
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-76.1 — Staff upload a trip's arrival PDF", () => {
    it("Staff upload a Trip Arrival PDF", async () => {
      const upload = await uploadPdf(tess.authHeader);

      expect(upload.status).toBe(200);
      expect(upload.body).toEqual({ hasArrivalPdf: true });
      const fileName = await storedFileName();
      expect(fileName).toMatch(new RegExp(`^trip-${trip.id}-arrival-\\d+\\.pdf$`));
      expect(fs.readFileSync(path.join(ARRIVAL_DIR, fileName))).toEqual(PDF_ONE);
      const detail = await request(app).get(`/trips/trips/${trip.id}`).set(admin.authHeader);
      expect(detail.body.hasArrivalPdf).toBe(true);
      expect(detail.body).not.toHaveProperty("arrivalPdfFileName");
    });

    it("Replacing the Trip Arrival PDF keeps only the new file", async () => {
      await uploadPdf(tess.authHeader, PDF_ONE);
      const first = await storedFileName();
      await new Promise((resolve) => setTimeout(resolve, 5));

      const replace = await uploadPdf(admin.authHeader, PDF_TWO);

      expect(replace.status).toBe(200);
      const opened = await openPdf(tess.authHeader);
      expect(opened.body).toEqual(PDF_TWO);
      expect(fs.existsSync(path.join(ARRIVAL_DIR, first))).toBe(false);
    });

    it("Only a PDF can be uploaded", async () => {
      await uploadPdf(tess.authHeader, PDF_ONE);
      const before = await storedFileName();

      const upload = await uploadPdf(tess.authHeader, TINY_PNG, "arrival.png", "image/png");

      expect(upload.status).toBe(400);
      expect(upload.body.message).toBe("Upload a PDF file.");
      expect(await storedFileName()).toBe(before);
    });

    it("Staff remove the Trip Arrival PDF", async () => {
      await uploadPdf(tess.authHeader);
      const fileName = await storedFileName();

      const remove = await request(app)
        .delete(`/trips/trips/${trip.id}/arrival-pdf`)
        .set(tess.authHeader);

      expect(remove.status).toBe(200);
      expect(fs.existsSync(path.join(ARRIVAL_DIR, fileName))).toBe(false);
      const detail = await request(app).get(`/trips/trips/${trip.id}`).set(admin.authHeader);
      expect(detail.body.hasArrivalPdf).toBe(false);
    });

    it("Who can open the Trip Arrival PDF", async () => {
      await uploadPdf(tess.authHeader);

      for (const member of [tess, ana]) {
        const opened = await openPdf(member.authHeader);
        expect(opened.status).toBe(200);
        expect(opened.headers["content-type"]).toBe("application/pdf");
        expect(opened.headers["content-disposition"]).toContain(`inline; filename="${PDF_NAME}"`);
        expect(opened.body).toEqual(PDF_ONE);
      }
      expect((await openPdf(cara.authHeader)).status).toBe(403);
      expect((await openPdf(olga.authHeader)).status).toBe(403);
      expect((await uploadPdf(ana.authHeader)).status).toBe(403);
    });
  });

  describe("US-76.2 — Templates name attachments with tokens", () => {
    it("A template saves an attachment token", async () => {
      const emailType = await db.emailType.create({
        typeCode: "trip-arrival",
        description: "Trip arrival info",
        eventCode: "team-email",
      });

      const create = await request(app)
        .post("/trips/email-templates")
        .set(admin.authHeader)
        .send(templateBody({ emailTypeId: emailType.id, attachment: "{{TRIP_ARRIVAL_PDF}}" }));

      expect(create.status).toBe(200);
      expect((await db.emailTemplate.findByPk(create.body.id)).attachment).toBe("{{TRIP_ARRIVAL_PDF}}");
    });

    it("Attachment accepts only attachment tokens", async () => {
      const emailType = await db.emailType.create({
        typeCode: "trip-arrival",
        description: "Trip arrival info",
        eventCode: "team-email",
      });

      const create = await request(app)
        .post("/trips/email-templates")
        .set(admin.authHeader)
        .send(templateBody({ emailTypeId: emailType.id, attachment: "{{TRIP_NAME}}" }));

      expect(create.status).toBe(400);
      expect(create.body.message).toBe("Attachment may only list attachment tokens.");
    });
  });

  describe("US-76.3 — Emails carry the arrival PDF", () => {
    it("Email team sends the Trip Arrival PDF as an attachment", async () => {
      await uploadPdf(tess.authHeader);
      const template = await addTemplate();
      useSmtp();

      const send = await sendTeamEmail(template);

      expect(send.status).toBe(200);
      expect(send.body).toMatchObject({ sent: 2, skipped: 0, failed: 0 });
      expect(smtpMessages.map((m) => m.to).sort()).toEqual(["ana@example.org", "ben@example.org"]);
      for (const message of smtpMessages) {
        expect(message.attachments).toEqual([
          { filename: PDF_NAME, content: PDF_ONE, contentType: "application/pdf" },
        ]);
      }
    });

    it("A missing Trip Arrival PDF skips the email", async () => {
      const template = await addTemplate();

      const send = await sendTeamEmail(template);

      expect(send.status).toBe(200);
      expect(send.body).toMatchObject({ sent: 0, skipped: 2, failed: 0 });
      expect(send.body.results.map((r) => r.reason)).toEqual([
        "Trip arrival PDF is missing.",
        "Trip arrival PDF is missing.",
      ]);
      const logs = await db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } } });
      expect(logs).toEqual([]);
    });

    it("File mode lists the attachment", async () => {
      await uploadPdf(tess.authHeader);
      const template = await addTemplate();

      const send = await sendTeamEmail(template);

      expect(send.body.sent).toBe(2);
      const dir = process.env.EMAIL_FILE_DIR;
      const file = fs.readdirSync(dir).map((name) => fs.readFileSync(path.join(dir, name), "utf8"))[0];
      const lines = file.split("\n");
      const subjectAt = lines.findIndex((line) => line.startsWith("Subject: "));
      expect(lines[subjectAt + 1]).toBe(`Attachments: ${PDF_NAME}`);
    });

    it("Preview lists the attachment", async () => {
      await uploadPdf(tess.authHeader);

      const preview = await request(app)
        .post("/trips/email-templates/preview")
        .set(admin.authHeader)
        .send({
          orgId: org.id,
          tripId: trip.id,
          personId: ana.user.personId,
          fromEmail: "{{ORG_EMAIL}}",
          toAddress: "{{PARTICIPANT_EMAIL}}",
          subject: "Arrival",
          emailBody: "See {{TRIP_ARRIVAL_PDF}}",
          attachment: "{{TRIP_ARRIVAL_PDF}}",
        });

      expect(preview.status).toBe(200);
      expect(preview.body.attachments).toEqual([PDF_NAME]);
      expect(preview.body.attachmentError).toBeNull();
      expect(preview.body.emailBody).toBe(`See ${PDF_NAME}`);
    });
  });

  describe("US-76.4 — Trip Arrival templates are seeded", () => {
    it("Seed adds the Trip Arrival token, types, and templates", async () => {
      await db.emailToken.destroy({ where: {} });
      const seedOrg = await db.organization.create({
        name: "Health Talents International",
        email: "info@example.org",
      });

      await seedEmailTypes();
      await seedEmailTokens();
      await seedEmailTemplates();

      const token = await db.emailToken.findOne({ where: { tokenCode: "TRIP_ARRIVAL_PDF" } });
      expect(token.valueSource).toBe("trip.arrivalPdf");
      const templates = await db.emailTemplate.findAll({
        where: { orgId: seedOrg.id },
        include: [{ model: db.emailType, where: { typeCode: ["trip-arrival", "trip-arrival-scheduled"] } }],
      });
      const byType = Object.fromEntries(templates.map((t) => [t.emailType.typeCode, t]));
      expect(byType["trip-arrival"]).toMatchObject({
        functionCode: "Trip Participant",
        attachment: "{{TRIP_ARRIVAL_PDF}}",
      });
      expect(byType["trip-arrival"].emailType.eventCode).toBe("team-email");
      expect(byType["trip-arrival-scheduled"]).toMatchObject({
        functionCode: "Scheduled",
        scheduleRule: "before-start",
        scheduleDaysBefore: 3,
        attachment: "{{TRIP_ARRIVAL_PDF}}",
      });
      expect(byType["trip-arrival-scheduled"].emailType.eventCode).toBe("trip-arrival");
    });

    it("Scheduled Trip Arrival email goes to approved participants", async () => {
      await uploadPdf(tess.authHeader);
      const emailType = await db.emailType.create({
        typeCode: "trip-arrival-scheduled",
        description: "Trip arrival info (scheduled)",
        eventCode: "trip-arrival",
      });
      await addTemplate({
        emailTypeId: emailType.id,
        functionCode: "Scheduled",
        scheduleRule: "before-start",
        scheduleDaysBefore: 3,
      });
      useSmtp();

      await runScheduledEmails({ date: "2027-03-07", output: () => {} });

      expect(smtpMessages.map((m) => m.to).sort()).toEqual(["ana@example.org", "ben@example.org"]);
      for (const message of smtpMessages) {
        expect(message.attachments.map((file) => file.filename)).toEqual([PDF_NAME]);
      }
    });
  });

  describe("US-76.5 — Approved participants open the arrival PDF", () => {
    it("My Trip Info offers the Trip Arrival PDF to approved members", async () => {
      await uploadPdf(tess.authHeader);

      const anaPage = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader);
      const caraPage = await request(app).get(`/trips/trips/browse/${trip.id}`).set(cara.authHeader);

      expect(anaPage.body.myTripInfo.hasArrivalPdf).toBe(true);
      expect(caraPage.body.myTripInfo.hasArrivalPdf).toBe(false);
      expect(anaPage.body.trip).not.toHaveProperty("arrivalPdfFileName");
    });
  });
});
