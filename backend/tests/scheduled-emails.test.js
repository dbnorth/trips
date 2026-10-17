/**
 * Feature 44 — Daily Scheduled Emails
 * Spec: features/feature-44-daily-scheduled-emails.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import db from "../app/models/index.js";
import { emailTransport } from "../app/utils/emailDelivery.js";
import { runScheduledEmails } from "../app/utils/scheduledEmails.js";
import { syncTestDatabase, resetTestDatabase, findRole } from "./helpers.js";

const TUESDAY = "2026-11-03";
const WEDNESDAY = "2026-11-04";

const EMAIL_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR", "SMTP_HOST", "SMTP_PORT"];

describe("Feature 44 — Daily Scheduled Emails", () => {
  let savedEnv;
  let mailRoot;
  let org;
  let participantRole;
  let personCount;
  const originalCreate = emailTransport.create;

  const createEmailType = (eventCode) =>
    db.emailType.create({ typeCode: eventCode, description: `Type ${eventCode}`, eventCode });

  const createTrip = (fields = {}) =>
    db.trip.create({ orgId: org.id, name: "Guatemala Clinic", startDate: "2026-12-01", ...fields });

  const addParticipant = async (trip, { status = "approved", raised = 0 } = {}) => {
    personCount += 1;
    const person = await db.person.create({
      firstName: `Person${personCount}`,
      lastName: "Lopez",
      email: `person${personCount}@example.org`,
    });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.id,
      roleId: participantRole.id,
      status,
    });
    if (raised) await db.tripDonation.create({ tripId: trip.id, personId: person.id, amount: raised });
    return person;
  };

  const addTemplate = (emailType, fields = {}) =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: "Scheduled",
      scheduleRule: "daily",
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: "Hello",
      emailBody: "See you soon.",
      ...fields,
    });

  const run = (date, options = {}) => runScheduledEmails({ date, output: () => {}, ...options });

  const sentTo = async () =>
    (await db.emailLog.findAll({ order: [["id", "ASC"]] })).map((log) => log.toEmail);

  const useMailServer = (sendMail) => {
    process.env.EMAIL_MODE = "smtp";
    emailTransport.create = () => ({ sendMail });
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    for (const key of EMAIL_KEYS) delete process.env[key];
    mailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trips-scheduled-"));
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = path.join(mailRoot, "mail");
    personCount = 0;
    await db.emailToken.create({
      tokenCode: "PARTICIPANT_EMAIL",
      description: "Participant email",
      valueSource: "participant.email",
    });
    await db.emailToken.create({
      tokenCode: "ORG_EMAIL",
      description: "Organization email",
      valueSource: "organization.email",
    });
    participantRole = await findRole("Trip Participant");
    org = await db.organization.create({ name: "Scheduled Org", email: "office@example.org" });
  });

  afterEach(async () => {
    for (const key of EMAIL_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    emailTransport.create = originalCreate;
    fs.rmSync(mailRoot, { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-44.1 — Send due scheduled emails each morning", () => {
    it("Weekly template sends on Tuesday", async () => {
      await addTemplate(await createEmailType("pre-departure"), { scheduleRule: "weekly" });
      const person = await addParticipant(await createTrip());

      await run(TUESDAY);

      expect(await sentTo()).toEqual([person.email]);
    });

    it("Weekly template does not send on other days", async () => {
      await addTemplate(await createEmailType("pre-departure"), { scheduleRule: "weekly" });
      await addParticipant(await createTrip());

      await run(WEDNESDAY);

      expect(await sentTo()).toEqual([]);
    });

    it("Daily template sends every day", async () => {
      await addTemplate(await createEmailType("pre-departure"), { scheduleRule: "daily" });
      const person = await addParticipant(await createTrip());

      await run(TUESDAY);
      await run(WEDNESDAY);

      expect(await sentTo()).toEqual([person.email, person.email]);
    });

    it("Days-before template sends that many days before trip start", async () => {
      await addTemplate(await createEmailType("pre-departure"), {
        scheduleRule: "before-start",
        scheduleDaysBefore: 5,
      });
      const person = await addParticipant(await createTrip({ startDate: "2026-11-10" }));

      await run("2026-11-05");
      expect(await sentTo()).toEqual([person.email]);

      await run("2026-11-06");
      expect(await sentTo()).toEqual([person.email]);
    });

    it("Trip template replaces the organization template for its trip", async () => {
      const preDeparture = await createEmailType("pre-departure");
      const trip = await createTrip();
      await addTemplate(preDeparture, { scheduleRule: "weekly", subject: "Organization template" });
      await addTemplate(preDeparture, {
        tripId: trip.id,
        scheduleRule: "weekly",
        subject: "Trip template",
      });
      await addParticipant(trip);

      await run(TUESDAY);

      const subjects = (await db.emailLog.findAll()).map((log) => log.subject);
      expect(subjects).toEqual(["Trip template"]);
    });

    it("Started and inactive trips get no scheduled emails", async () => {
      await addTemplate(await createEmailType("pre-departure"), { scheduleRule: "daily" });
      await addParticipant(await createTrip({ startDate: "2026-11-02" }));
      await addParticipant(await createTrip({ startDate: "2026-12-03", status: "inactive" }));

      await run(TUESDAY);

      expect(await sentTo()).toEqual([]);
    });

    it("Send Now templates are not sent by the job", async () => {
      await addTemplate(await createEmailType("pre-departure"), {
        functionCode: "Send Now",
        scheduleRule: "daily",
      });
      await addParticipant(await createTrip());

      await run(TUESDAY);

      expect(await sentTo()).toEqual([]);
    });
  });

  describe("US-44.2 — Send each email type only to the participants it is for", () => {
    it("Incomplete-application reminder goes only to incomplete applications", async () => {
      await addTemplate(await createEmailType("application-incomplete"));
      const trip = await createTrip();
      const incomplete = await addParticipant(trip, { status: "incomplete" });
      await addParticipant(trip, { status: "approved" });

      await run(TUESDAY);

      expect(await sentTo()).toEqual([incomplete.email]);
    });

    it("Deposit reminder goes to approved participants below the deposit", async () => {
      await addTemplate(await createEmailType("deposit-due"));
      const trip = await createTrip({ deposit: 500 });
      const below = await addParticipant(trip, { raised: 100 });
      await addParticipant(trip, { raised: 600 });

      await run(TUESDAY);

      expect(await sentTo()).toEqual([below.email]);
    });

    it("Payment reminder goes to approved participants who owe money", async () => {
      await addTemplate(await createEmailType("payment-due"));
      const trip = await createTrip({ participantCost: 2000 });
      const owes = await addParticipant(trip, { raised: 500 });
      await addParticipant(trip, { raised: 2000 });

      await run(TUESDAY);

      expect(await sentTo()).toEqual([owes.email]);
    });

    it("Email types without a rule send nothing", async () => {
      await addTemplate(await createEmailType("application-approved"));
      await addParticipant(await createTrip());

      await run(TUESDAY);

      expect(await sentTo()).toEqual([]);
    });
  });

  describe("US-44.3 — Run the job safely", () => {
    it("Running twice on the same day sends once", async () => {
      await addTemplate(await createEmailType("pre-departure"));
      const person = await addParticipant(await createTrip());

      await run(TUESDAY);
      await run(TUESDAY);

      expect(await sentTo()).toEqual([person.email]);
      expect(await db.scheduledEmailSend.count()).toBe(1);
    });

    it("Failed email is tried again on the next run", async () => {
      await addTemplate(await createEmailType("pre-departure"));
      const person = await addParticipant(await createTrip());
      let calls = 0;
      useMailServer(async () => {
        calls += 1;
        if (calls === 1) throw new Error("Mail server unavailable.");
        return { messageId: "<retry@localhost>" };
      });

      const first = await run(TUESDAY);
      expect(first.failed).toBe(1);
      expect((await db.scheduledEmailSend.findOne()).status).toBe("failed");

      const second = await run(TUESDAY);
      expect(second.sent).toBe(1);
      const records = await db.scheduledEmailSend.findAll();
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe("sent");
      expect(await sentTo()).toEqual([person.email]);
    });

    it("One failed email does not stop the rest", async () => {
      await addTemplate(await createEmailType("pre-departure"));
      const trip = await createTrip();
      const first = await addParticipant(trip);
      const second = await addParticipant(trip);
      useMailServer(async (message) => {
        if (message.to === first.email) throw new Error("Mailbox unavailable.");
        return { messageId: "<ok@localhost>" };
      });

      const result = await run(TUESDAY);

      expect(result).toMatchObject({ sent: 1, failed: 1 });
      expect(await sentTo()).toEqual([second.email]);
    });

    it("Dry run sends and records nothing", async () => {
      await addTemplate(await createEmailType("pre-departure"), { subject: "Trip soon" });
      const person = await addParticipant(await createTrip());
      const lines = [];

      await run(TUESDAY, { dryRun: true, output: (line) => lines.push(line) });

      expect(lines[0]).toBe(
        `${TUESDAY} | Guatemala Clinic | Person1 Lopez | Type pre-departure | To: ${person.email} | Subject: Trip soon`
      );
      expect(await sentTo()).toEqual([]);
      expect(await db.scheduledEmailSend.count()).toBe(0);
      expect(fs.existsSync(process.env.EMAIL_FILE_DIR)).toBe(false);
    });
  });
});
