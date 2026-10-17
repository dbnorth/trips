/**
 * Feature 46 — Email Trip Team
 * Spec: features/feature-46-email-trip-team.md
 */

import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { sendEventEmails } from "../app/utils/eventEmails.js";
import { runScheduledEmails } from "../app/utils/scheduledEmails.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

describe("Feature 46 — Email Trip Team", () => {
  let admin;
  let org;
  let trip;
  let participantRole;
  let personCount;

  const createEmailType = (eventCode) =>
    db.emailType.create({ typeCode: eventCode, description: `Type ${eventCode}`, eventCode });

  const addTemplate = async (fields = {}) =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: (await createEmailType(`type-${Math.random()}`)).id,
      functionCode: "Trip Participant",
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: "Team update",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}.",
      ...fields,
    });

  const addParticipant = async (status, { email, tripId = trip.id, roleName } = {}) => {
    personCount += 1;
    const person = await db.person.create({
      firstName: `Pat${personCount}`,
      lastName: "Lopez",
      email: email === undefined ? `pat${personCount}@example.org` : email,
    });
    await db.tripPeopleRole.create({
      tripId,
      peopleId: person.id,
      roleId: roleName ? (await findRole(roleName)).id : participantRole.id,
      status,
    });
    return person;
  };

  const addLeader = () => addParticipant("approved", { roleName: "Trip Leader" });

  // Sign-ins also write "Login" rows to the email log.
  const sentEmails = () =>
    db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] });

  const sentTo = async () => (await sentEmails()).map((log) => log.toEmail);

  const sendTeamEmail = (template, body = {}, auth = admin.authHeader) =>
    request(app)
      .post(`/trips/trips/${trip.id}/team-email`)
      .set(auth)
      .send({
        emailTemplateId: template.id,
        subject: template.subject,
        emailBody: template.emailBody,
        sendTo: "potential",
        ...body,
      });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    personCount = 0;
    admin = await createOrgAdminUser({ email: "team-admin@example.com" });
    org = admin.org;
    await org.update({ email: "office@example.org" });
    participantRole = await findRole("Trip Participant");
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2026-12-01",
      endDate: "2026-12-10",
    });
    for (const [tokenCode, valueSource] of [
      ["PARTICIPANT_EMAIL", "participant.email"],
      ["PARTICIPANT_FIRST_NAME", "participant.firstName"],
      ["ORG_EMAIL", "organization.email"],
    ]) {
      await db.emailToken.create({ tokenCode, description: tokenCode, valueSource });
    }
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-46.1 — Mark templates for emailing the trip team", () => {
    it("Trip Participant template saves with no schedule", async () => {
      const emailType = await createEmailType("team-update");

      const create = await request(app)
        .post("/trips/email-templates")
        .set(admin.authHeader)
        .send({
          orgId: org.id,
          emailTypeId: emailType.id,
          functionCode: "Trip Participant",
          scheduleRule: "weekly",
          subject: "Team update",
          fromEmail: "office@example.org",
          toAddress: "{{PARTICIPANT_EMAIL}}",
          emailBody: "Hello team.",
        });

      expect(create.status).toBe(200);
      const saved = await db.emailTemplate.findByPk(create.body.id);
      expect(saved.functionCode).toBe("Trip Participant");
      expect(saved.scheduleRule).toBeNull();
      expect(saved.scheduleDaysBefore).toBeNull();
    });

    it("Trip Participant templates are not sent automatically", async () => {
      await db.emailTemplate.create({
        orgId: org.id,
        emailTypeId: (await createEmailType("application-approved")).id,
        functionCode: "Trip Participant",
        fromEmail: "office@example.org",
        toAddress: "{{PARTICIPANT_EMAIL}}",
        subject: "Approved",
        emailBody: "Hello.",
      });
      await db.emailTemplate.create({
        orgId: org.id,
        emailTypeId: (await createEmailType("pre-departure")).id,
        functionCode: "Trip Participant",
        scheduleRule: "daily",
        fromEmail: "office@example.org",
        toAddress: "{{PARTICIPANT_EMAIL}}",
        subject: "Get ready",
        emailBody: "Hello.",
      });
      const person = await addParticipant("approved");

      await sendEventEmails({ eventCode: "application-approved", tripId: trip.id, personId: person.id });
      await runScheduledEmails({ date: "2026-11-03", output: () => {} });

      expect(await sentEmails()).toEqual([]);
    });
  });

  describe("US-46.2 — Open the team email dialog from the trip page", () => {
    it("Dialog lists the trip's and organization's Trip Participant templates", async () => {
      const tripTemplate = await addTemplate({ tripId: trip.id, subject: "Trip packing list" });
      const orgTemplate = await addTemplate({ subject: "Org welcome" });
      await addTemplate({ functionCode: "Send Now", subject: "Send now template" });
      const otherOrg = await db.organization.create({ name: "Other Org" });
      await addTemplate({ orgId: otherOrg.id, subject: "Other org template" });

      const leader = await registerUser({ email: "leader@example.org", orgIds: [org.id] });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: leader.user.personId,
        roleId: (await findRole("Trip Leader")).id,
        status: "approved",
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/team-email/templates`)
        .set(leader.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((t) => t.id).sort()).toEqual([tripTemplate.id, orgTemplate.id].sort());
    });

    it("Participants cannot email the team", async () => {
      const template = await addTemplate();
      const member = await registerUser({ email: "member@example.org", orgIds: [org.id] });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: member.user.personId,
        roleId: participantRole.id,
        status: "approved",
      });

      const templates = await request(app)
        .get(`/trips/trips/${trip.id}/team-email/templates`)
        .set(member.authHeader);
      const preview = await request(app)
        .post(`/trips/trips/${trip.id}/team-email/preview`)
        .set(member.authHeader)
        .send({
          emailTemplateId: template.id,
          subject: "Hi",
          emailBody: "Hi",
          sendTo: "potential",
          personId: member.user.personId,
        });
      const send = await sendTeamEmail(template, {}, member.authHeader);

      expect([templates.status, preview.status, send.status]).toEqual([403, 403, 403]);
      expect(await sentEmails()).toEqual([]);
    });
  });

  describe("US-46.3 — Choose who gets the email", () => {
    it("All potential participants includes Trip Leaders and excludes declined and cancelled", async () => {
      const template = await addTemplate();
      const incomplete = await addParticipant("incomplete");
      const applied = await addParticipant("applied");
      const approved = await addParticipant("approved");
      await addParticipant("declined");
      await addParticipant("cancelled");
      const leader = await addLeader();

      const response = await sendTeamEmail(template, { sendTo: "potential" });

      expect(response.status).toBe(200);
      expect(response.body.sent).toBe(4);
      expect(await sentTo()).toEqual([incomplete.email, applied.email, approved.email, leader.email]);
    });

    it("All accepted participants sends only to approved", async () => {
      const template = await addTemplate();
      await addParticipant("applied");
      const approved = await addParticipant("approved");
      await addLeader();

      const response = await sendTeamEmail(template, { sendTo: "accepted" });

      expect(response.status).toBe(200);
      expect(await sentTo()).toEqual([approved.email]);
    });

    it("Selected participants sends only to those chosen", async () => {
      const template = await addTemplate();
      const first = await addParticipant("incomplete");
      await addParticipant("applied");
      const leader = await addLeader();

      const response = await sendTeamEmail(template, {
        sendTo: "selected",
        personIds: [first.id, leader.id],
      });

      expect(response.status).toBe(200);
      expect(await sentTo()).toEqual([first.email, leader.email]);
    });

    it("Selected participants must be potential participants on the trip", async () => {
      const template = await addTemplate();
      await addParticipant("approved");
      const declined = await addParticipant("declined");
      const otherTrip = await db.trip.create({ orgId: org.id, name: "Kenya Build" });
      const elsewhere = await addParticipant("approved", { tripId: otherTrip.id });

      for (const person of [declined, elsewhere]) {
        const response = await sendTeamEmail(template, { sendTo: "selected", personIds: [person.id] });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe(
          "Selected participants must be potential participants on this trip."
        );
      }
      expect(await sentEmails()).toEqual([]);
    });
  });

  describe("US-46.4 — Preview the email before sending", () => {
    it("Preview shows the email as it will be sent", async () => {
      const template = await addTemplate({ fromEmail: "{{ORG_EMAIL}}" });
      const pat = await db.person.create({ firstName: "Pat", lastName: "Lopez", email: "pat@example.org" });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: pat.id,
        roleId: participantRole.id,
        status: "approved",
      });

      const response = await request(app)
        .post(`/trips/trips/${trip.id}/team-email/preview`)
        .set(admin.authHeader)
        .send({
          emailTemplateId: template.id,
          subject: "Hello {{PARTICIPANT_FIRST_NAME}}",
          emailBody: "See you soon, {{PARTICIPANT_FIRST_NAME}}.",
          sendTo: "potential",
          personId: pat.id,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        from: '"Admin Org via Mission Trips" <notifications@missiontrips.app>',
        replyTo: "office@example.org",
        to: "pat@example.org",
        subject: "Hello Pat",
        body: "See you soon, Pat.",
      });
      expect(await sentEmails()).toEqual([]);
    });
  });

  describe("US-46.5 — Send the email now", () => {
    it("Send uses the edited subject and body and leaves the template unchanged", async () => {
      const template = await addTemplate({ subject: "Team update" });
      const first = await addParticipant("approved");
      const second = await addParticipant("approved");

      const response = await sendTeamEmail(template, {
        sendTo: "selected",
        personIds: [first.id, second.id],
        subject: "Packing list",
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ sent: 2, skipped: 0, failed: 0 });
      const logs = await sentEmails();
      expect(
        logs.map((log) => ({
          toEmail: log.toEmail,
          subject: log.subject,
          emailTemplateId: log.emailTemplateId,
          tripId: log.tripId,
          personId: log.personId,
        }))
      ).toEqual([
        { toEmail: first.email, subject: "Packing list", emailTemplateId: template.id, tripId: trip.id, personId: first.id },
        { toEmail: second.email, subject: "Packing list", emailTemplateId: template.id, tripId: trip.id, personId: second.id },
      ]);
      expect((await db.emailTemplate.findByPk(template.id)).subject).toBe("Team update");
    });

    it("One failed email does not stop the others", async () => {
      const template = await addTemplate();
      const noEmail = await addParticipant("approved", { email: null });
      const withEmail = await addParticipant("approved");

      const response = await sendTeamEmail(template, {
        sendTo: "selected",
        personIds: [noEmail.id, withEmail.id],
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ sent: 1, skipped: 1, failed: 0 });
      expect(response.body.results).toContainEqual(
        expect.objectContaining({ personId: noEmail.id, status: "skipped", reason: "No recipients." })
      );
      expect(await sentTo()).toEqual([withEmail.email]);
    });
  });
});
