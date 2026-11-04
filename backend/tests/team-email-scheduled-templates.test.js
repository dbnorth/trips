/**
 * Feature 114 — Scheduled Templates in Email Team
 * Spec: features/feature-114-team-email-scheduled-templates.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { runScheduledEmails, todayInTimeZone } from "../app/utils/scheduledEmails.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createDocumentType,
  findRole,
} from "./helpers.js";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const EMAIL_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR"];

describe("Feature 114 — Scheduled Templates in Email Team", () => {
  let savedEnv;
  let mailRoot;
  let olivia;
  let org;
  let trip;
  let maria;
  let juan;
  let documentsType;
  let documentsTemplate;
  let teamUpdate;

  const addTemplate = (fields) =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}.",
      ...fields,
    });

  const addPerson = async (firstName, status, tripWorkerRoleId) => {
    const person = await db.person.create({
      firstName,
      lastName: "Lopez",
      email: `${firstName.toLowerCase()}@example.org`,
    });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.id,
      roleId: (await findRole("Trip Participant")).id,
      tripWorkerRoleId,
      status,
    });
    return person;
  };

  const upload = (personId, documentType) =>
    db.personDocument.create({
      personId,
      documentTypeId: documentType.id,
      countryIssued: "US",
      expirationDate: "2035-01-01",
      documentFileName: `people/${documentType.type}-${personId}.png`,
    });

  const loadTemplates = () =>
    request(app).get(`/trips/trips/${trip.id}/team-email/templates`).set(olivia.authHeader);

  const sendTeamEmail = (template, body) =>
    request(app)
      .post(`/trips/trips/${trip.id}/team-email`)
      .set(olivia.authHeader)
      .send({ emailTemplateId: template.id, subject: template.subject, emailBody: template.emailBody, ...body });

  // Sign-ins also write "Login" rows to the email log.
  const sentTo = async () =>
    (
      await db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] })
    ).map((log) => log.toEmail);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    mailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trips-team-scheduled-"));
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = path.join(mailRoot, "mail");
    await seedEmailTypes();
    await seedEmailTokens();

    olivia = await createOrgAdminUser({ email: "olivia@example.com", orgName: "Hope Missions" });
    org = olivia.org;
    await org.update({ email: "office@example.org" });
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
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: dateFromToday(120),
      endDate: dateFromToday(127),
      requirePassport: true,
    });
    const tripWorkerRole = await db.tripWorkerRole.create({
      tripId: trip.id,
      workerRoleId: nurse.id,
      quantity: 5,
    });

    maria = await addPerson("Maria", "pre_approved", tripWorkerRole.id);
    await upload(maria.id, rnLicense);
    juan = await addPerson("Juan", "pre_approved", tripWorkerRole.id);
    await upload(juan.id, rnLicense);
    await upload(juan.id, passport);
    await addPerson("Ana", "incomplete", tripWorkerRole.id);

    documentsType = await db.emailType.findOne({ where: { typeCode: "documents-missing" } });
    documentsTemplate = await addTemplate({
      emailTypeId: documentsType.id,
      functionCode: "Scheduled",
      scheduleRule: "daily",
      subject: "Reminder: upload your documents for {{TRIP_NAME}}",
    });
    teamUpdate = await addTemplate({
      emailTypeId: (await db.emailType.findOne({ where: { typeCode: "team-update" } })).id,
      functionCode: "Trip Participant",
      subject: "Team update",
    });
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

  describe("US-114.1 — See the trip's scheduled reminders in Email team", () => {
    it("Scheduled templates listed", async () => {
      const response = await loadTemplates();

      expect(response.status).toBe(200);
      expect(response.body.map((t) => [t.id, t.functionCode])).toEqual([
        [documentsTemplate.id, "Scheduled"],
        [teamUpdate.id, "Trip Participant"],
      ]);
    });

    it("Trip template replaces the organization's", async () => {
      const tripTemplate = await addTemplate({
        tripId: trip.id,
        emailTypeId: documentsType.id,
        functionCode: "Scheduled",
        scheduleRule: "weekly",
        subject: "Guatemala documents",
      });

      const response = await loadTemplates();

      const ids = response.body.map((t) => t.id);
      expect(ids).toContain(tripTemplate.id);
      expect(ids).not.toContain(documentsTemplate.id);
    });

    it("Scheduled template without a rule not listed", async () => {
      const noRule = await addTemplate({
        emailTypeId: (await db.emailType.findOne({ where: { typeCode: "people-update" } })).id,
        functionCode: "Scheduled",
        scheduleRule: "weekly",
        subject: "People update",
      });

      const response = await loadTemplates();

      expect(response.body.map((t) => t.id)).not.toContain(noRule.id);
    });
  });

  describe("US-114.2 — Send a scheduled reminder only to the people it is for", () => {
    it("Recipients are the people the rule picks", async () => {
      const response = await request(app)
        .get(`/trips/trips/${trip.id}/team-email/templates/${documentsTemplate.id}/recipients`)
        .set(olivia.authHeader);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: maria.id, firstName: "Maria", lastName: "Lopez", email: "maria@example.org" },
      ]);

      const notScheduled = await request(app)
        .get(`/trips/trips/${trip.id}/team-email/templates/${teamUpdate.id}/recipients`)
        .set(olivia.authHeader);
      expect(notScheduled.status).toBe(400);
      expect(notScheduled.body.message).toBe("Choose a scheduled template for this trip.");
    });

    it("Send goes only to the rule's people", async () => {
      const response = await sendTeamEmail(documentsTemplate, { sendTo: "rule" });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(1);
      expect(await sentTo()).toEqual(["maria@example.org"]);
    });

    it("Selected participants must be the rule's people", async () => {
      const response = await sendTeamEmail(documentsTemplate, {
        sendTo: "selected",
        personIds: [maria.id, juan.id],
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Selected participants must be participants this email is for.");
      expect(await sentTo()).toEqual([]);
    });

    it("Potential or accepted refused for a scheduled template", async () => {
      for (const sendTo of ["potential", "accepted"]) {
        const response = await sendTeamEmail(documentsTemplate, { sendTo });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe("Send to must be rule or selected for a scheduled template.");
      }
      const tripParticipant = await sendTeamEmail(teamUpdate, { sendTo: "rule" });
      expect(tripParticipant.status).toBe(400);
      expect(tripParticipant.body.message).toBe("Send to must be potential, accepted, or selected.");
    });
  });

  describe("US-114.3 — Don't send the same reminder twice in a day", () => {
    it("Email team send counts as today's scheduled send", async () => {
      const today = todayInTimeZone(process.env.SCHEDULED_EMAIL_TIMEZONE || "America/Chicago");

      await sendTeamEmail(documentsTemplate, { sendTo: "selected", personIds: [maria.id] });
      await runScheduledEmails({ date: today, output: () => {} });

      expect(await sentTo()).toEqual(["maria@example.org"]);
      const recorded = await db.scheduledEmailSend.findAll();
      expect(recorded.map((r) => [r.emailTemplateId, r.personId, r.sendDate, r.status])).toEqual([
        [documentsTemplate.id, maria.id, today, "sent"],
      ]);
    });

    it("Trip Participant template records nothing", async () => {
      const response = await sendTeamEmail(teamUpdate, { sendTo: "potential" });

      expect(response.status).toBe(200);
      expect(await db.scheduledEmailSend.count()).toBe(0);
    });
  });
});
