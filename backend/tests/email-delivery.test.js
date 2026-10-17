/**
 * Feature 43 — Email Delivery
 * Spec: features/feature-43-email-delivery.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import db from "../app/models/index.js";
import { emailTransport, sendTemplateEmail } from "../app/utils/emailDelivery.js";
import { syncTestDatabase, resetTestDatabase } from "./helpers.js";

const EMAIL_KEYS = [
  "EMAIL_MODE",
  "EMAIL_FILE_DIR",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
];

const addToken = (tokenCode, valueSource) =>
  db.emailToken.create({ tokenCode, description: tokenCode, valueSource });

const createTripParticipant = async ({
  orgEmail = "office@example.org",
  personEmail = "ana@example.org",
} = {}) => {
  const org = await db.organization.create({ name: "Delivery Org", email: orgEmail });
  const trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic" });
  const person = await db.person.create({ firstName: "Ana", lastName: "Lopez", email: personEmail });
  return { org, trip, person };
};

const templateFor = (org, fields = {}) => ({
  orgId: org.id,
  fromEmail: "office@example.org",
  toAddress: "{{PARTICIPANT_EMAIL}}",
  subject: "Welcome {{PARTICIPANT_FIRST_NAME}}",
  emailBody: "See you in {{TRIP_NAME}}.",
  ...fields,
});

describe("Feature 43 — Email Delivery", () => {
  let savedEnv;
  let mailDir;
  const originalCreate = emailTransport.create;

  const mailFiles = () => (fs.existsSync(mailDir) ? fs.readdirSync(mailDir) : []);
  const readOnlyMailFile = () => {
    const files = mailFiles();
    expect(files).toHaveLength(1);
    return fs.readFileSync(path.join(mailDir, files[0]), "utf8");
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    for (const key of EMAIL_KEYS) delete process.env[key];
    mailDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trips-mail-")), "mail");
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = mailDir;
    await addToken("PARTICIPANT_EMAIL", "participant.email");
    await addToken("PARTICIPANT_FIRST_NAME", "participant.firstName");
    await addToken("TRIP_NAME", "trip.name");
    await addToken("ORG_EMAIL", "organization.email");
  });

  afterEach(async () => {
    for (const key of EMAIL_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    emailTransport.create = originalCreate;
    fs.rmSync(path.dirname(mailDir), { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-43.1 — Send a template email to a participant", () => {
    it("Template email fills in tokens", async () => {
      const { org, trip, person } = await createTripParticipant();

      const result = await sendTemplateEmail({
        template: templateFor(org),
        tripId: trip.id,
        personId: person.id,
      });

      expect(result.status).toBe("sent");
      const file = readOnlyMailFile();
      expect(file).toContain("To: ana@example.org\n");
      expect(file).toContain("Subject: Welcome Ana\n");
      expect(file).toContain("See you in Guatemala Clinic.");
    });

    it("Sent email is recorded in the email log", async () => {
      const { org, trip, person } = await createTripParticipant();

      const result = await sendTemplateEmail({
        template: templateFor(org),
        tripId: trip.id,
        personId: person.id,
      });

      const log = await db.emailLog.findByPk(result.emailLogId);
      expect(log.toEmail).toBe("ana@example.org");
      expect(log.fromEmail).toBe('"Delivery Org via Mission Trips" <notifications@missiontrips.app>');
      expect(log.subject).toBe("Welcome Ana");
      expect(log.content).toBe("See you in Guatemala Clinic.");
      expect(log.emailId).toBe(mailFiles()[0]);
    });

    it("Email with no recipients is not sent", async () => {
      const { org, trip, person } = await createTripParticipant({ personEmail: null });

      const result = await sendTemplateEmail({
        template: templateFor(org),
        tripId: trip.id,
        personId: person.id,
      });

      expect(result).toEqual({ status: "skipped", reason: "No recipients." });
      expect(mailFiles()).toHaveLength(0);
      expect(await db.emailLog.count()).toBe(0);
    });

    it("Email with no sender is not sent", async () => {
      const { org, trip, person } = await createTripParticipant({ orgEmail: null });

      const result = await sendTemplateEmail({
        template: templateFor(org, { fromEmail: "{{ORG_EMAIL}}" }),
        tripId: trip.id,
        personId: person.id,
      });

      expect(result).toEqual({ status: "skipped", reason: "No sender." });
      expect(mailFiles()).toHaveLength(0);
      expect(await db.emailLog.count()).toBe(0);
    });

    it("Failed send is not logged", async () => {
      const { org, trip, person } = await createTripParticipant();
      emailTransport.create = () => ({
        sendMail: async () => {
          throw new Error("Mail server rejected the message.");
        },
      });
      process.env.EMAIL_MODE = "smtp";

      const result = await sendTemplateEmail({
        template: templateFor(org),
        tripId: trip.id,
        personId: person.id,
      });

      expect(result).toEqual({ status: "failed", reason: "Mail server rejected the message." });
      expect(await db.emailLog.count()).toBe(0);
    });
  });

  describe("US-43.2 — See development emails as text files", () => {
    it("File mode writes the email to a text file", async () => {
      const { org, trip, person } = await createTripParticipant();

      await sendTemplateEmail({ template: templateFor(org), tripId: trip.id, personId: person.id });

      const files = mailFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^\d{8}-\d{6}-\d{3}-[0-9a-f]{6}\.txt$/);
      const lines = readOnlyMailFile().split("\n");
      expect(lines[0]).toMatch(/^Date: /);
      expect(lines.slice(1)).toEqual([
        'From: "Delivery Org via Mission Trips" <notifications@missiontrips.app>',
        "Reply-To: office@example.org",
        "To: ana@example.org",
        "Subject: Welcome Ana",
        "",
        "See you in Guatemala Clinic.",
      ]);
    });

    it("Unknown mode uses file mode", async () => {
      const { org, trip, person } = await createTripParticipant();
      process.env.EMAIL_MODE = "smpt";

      await sendTemplateEmail({ template: templateFor(org), tripId: trip.id, personId: person.id });

      expect(mailFiles()).toHaveLength(1);
    });
  });

  describe("US-43.3 — Send through the production mail server", () => {
    it("Smtp mode sends through the configured mail server", async () => {
      const { org, trip, person } = await createTripParticipant();
      const transportOptions = [];
      const sentMessages = [];
      emailTransport.create = (options) => {
        transportOptions.push(options);
        return {
          sendMail: async (message) => {
            sentMessages.push(message);
            return { messageId: "<abc@localhost>" };
          },
        };
      };
      Object.assign(process.env, { EMAIL_MODE: "smtp", SMTP_HOST: "localhost", SMTP_PORT: "25" });

      const result = await sendTemplateEmail({
        template: templateFor(org),
        tripId: trip.id,
        personId: person.id,
      });

      expect(transportOptions).toEqual([{ host: "localhost", port: 25, secure: false }]);
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0].to).toBe("ana@example.org");
      expect(mailFiles()).toHaveLength(0);
      const log = await db.emailLog.findByPk(result.emailLogId);
      expect(log.emailId).toBe("<abc@localhost>");
    });
  });
});
