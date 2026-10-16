/**
 * Feature 49 — Organization Email Test Mode
 * Spec: features/feature-49-organization-email-test-mode.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { sendTemplateEmail } from "../app/utils/emailDelivery.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createSystemAdminUser,
  findRole,
} from "./helpers.js";

const addToken = (tokenCode, valueSource) =>
  db.emailToken.create({ tokenCode, description: tokenCode, valueSource });

const createTripParticipant = async ({ orgEmail = "office@example.org", testMode = true } = {}) => {
  const org = await db.organization.create({ name: "Test Mode Org", email: orgEmail, testMode });
  const trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic" });
  const person = await db.person.create({
    firstName: "Ana",
    lastName: "Lopez",
    email: "ana@example.org",
  });
  return { org, trip, person };
};

const templateFor = (org) => ({
  orgId: org.id,
  fromEmail: "sender@example.org",
  toAddress: "{{PARTICIPANT_EMAIL}}",
  subject: "Welcome {{PARTICIPANT_FIRST_NAME}}",
  emailBody: "See you in {{TRIP_NAME}}.",
});

describe("Feature 49 — Organization Email Test Mode", () => {
  let savedMode;
  let savedDir;
  let mailDir;

  const mailFiles = () => (fs.existsSync(mailDir) ? fs.readdirSync(mailDir) : []);
  const readMailFiles = () =>
    mailFiles().map((name) => fs.readFileSync(path.join(mailDir, name), "utf8"));

  const sendToAna = async (options) => {
    const { org, trip, person } = await createTripParticipant(options);
    return sendTemplateEmail({ template: templateFor(org), tripId: trip.id, personId: person.id });
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedMode = process.env.EMAIL_MODE;
    savedDir = process.env.EMAIL_FILE_DIR;
    mailDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trips-mail-")), "mail");
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = mailDir;
    await addToken("PARTICIPANT_EMAIL", "participant.email");
    await addToken("PARTICIPANT_FIRST_NAME", "participant.firstName");
    await addToken("TRIP_NAME", "trip.name");
    await addToken("ORG_EMAIL", "organization.email");
  });

  afterEach(async () => {
    process.env.EMAIL_MODE = savedMode;
    process.env.EMAIL_FILE_DIR = savedDir;
    fs.rmSync(path.dirname(mailDir), { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-49.1 — Turn test mode on for an organization", () => {
    it("Test mode is saved", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "testmode@example.com" });

      const update = await request(app)
        .put(`/trips/organizations/${org.id}`)
        .set(authHeader)
        .send({ version: 0, testMode: true });

      expect(update.status).toBe(200);
      const reload = await request(app).get(`/trips/organizations/${org.id}`).set(authHeader);
      expect(reload.body.testMode).toBe(true);
    });

    it("Test mode is off for a new organization", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "testmode-admin@example.com" });

      const create = await request(app)
        .post("/trips/organizations")
        .set(authHeader)
        .send({ name: "New Ministry" });

      expect(create.status).toBe(200);
      const stored = await db.organization.findByPk(create.body.id);
      expect(stored.testMode).toBe(false);
    });
  });

  describe("US-49.2 — Emails go to the organization while in test mode", () => {
    it("Test mode sends to the organization email", async () => {
      const result = await sendToAna();

      expect(result.status).toBe("sent");
      const [file] = readMailFiles();
      expect(file).toContain("To: office@example.org\n");
      expect(file).toContain("Subject: [Test] Welcome Ana\n");
      expect(file).toContain(
        "\n\nTEST MODE - intended for: ana@example.org\n\nSee you in Guatemala Clinic."
      );
      expect(file).not.toContain("To: ana@example.org");
    });

    it("Test mode logs where the email went", async () => {
      const result = await sendToAna();

      const log = await db.emailLog.findByPk(result.emailLogId);
      expect(log.toEmail).toBe("office@example.org");
      expect(log.subject).toBe("[Test] Welcome Ana");
      expect(log.content).toBe(
        "TEST MODE - intended for: ana@example.org\n\nSee you in Guatemala Clinic."
      );
    });

    it("Test mode without an organization email sends nothing", async () => {
      const result = await sendToAna({ orgEmail: null });

      expect(result).toEqual({
        status: "skipped",
        reason: "Test mode: the organization has no email.",
      });
      expect(mailFiles()).toHaveLength(0);
      expect(await db.emailLog.count()).toBe(0);
    });

    it("Test mode off sends to the real recipient", async () => {
      const result = await sendToAna({ testMode: false });

      expect(result.status).toBe("sent");
      const [file] = readMailFiles();
      expect(file).toContain("To: ana@example.org\n");
      expect(file).toContain("Subject: Welcome Ana\n");
      expect(file).not.toContain("TEST MODE");
      expect(file).not.toContain("[Test]");
    });

    it("Team email in test mode goes to the organization email", async () => {
      const admin = await createOrgAdminUser({ email: "team-testmode@example.com" });
      await admin.org.update({ email: "office@example.org", testMode: true });
      const trip = await db.trip.create({
        orgId: admin.org.id,
        name: "Guatemala Clinic",
        status: "active",
        startDate: "2026-12-01",
        endDate: "2026-12-10",
      });
      const participantRole = await findRole("Trip Participant");
      for (const [firstName, email] of [
        ["Pat", "pat@example.org"],
        ["Sam", "sam@example.org"],
      ]) {
        const person = await db.person.create({ firstName, lastName: "Lopez", email });
        await db.tripPeopleRole.create({
          tripId: trip.id,
          peopleId: person.id,
          roleId: participantRole.id,
          status: "applied",
        });
      }
      const emailType = await db.emailType.create({
        typeCode: "team-update",
        description: "Team update",
        eventCode: "team-update",
      });
      const template = await db.emailTemplate.create({
        orgId: admin.org.id,
        tripId: null,
        emailTypeId: emailType.id,
        functionCode: "Trip Participant",
        fromEmail: "{{ORG_EMAIL}}",
        toAddress: "{{PARTICIPANT_EMAIL}}",
        subject: "Team update",
        emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}.",
      });

      const response = await request(app)
        .post(`/trips/trips/${trip.id}/team-email`)
        .set(admin.authHeader)
        .send({
          emailTemplateId: template.id,
          subject: template.subject,
          emailBody: template.emailBody,
          sendTo: "potential",
        });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(2);
      const logs = await db.emailLog.findAll({
        where: { subject: { [Op.ne]: "Login" } },
        order: [["id", "ASC"]],
      });
      expect(logs.map((log) => log.toEmail)).toEqual(["office@example.org", "office@example.org"]);
      expect(logs.map((log) => log.content.split("\n")[0]).sort()).toEqual([
        "TEST MODE - intended for: pat@example.org",
        "TEST MODE - intended for: sam@example.org",
      ]);
    });
  });
});
