/**
 * Feature 62 — Email People
 * Spec: features/feature-62-people-email.md
 */

import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

describe("Feature 62 — Email People", () => {
  let admin;
  let org;
  let auth;
  let participantRole;
  let clinic;
  let build;

  const createEmailType = () =>
    db.emailType.create({
      typeCode: `type-${Math.random()}`,
      description: "People update",
      eventCode: "team-email",
    });

  const addTemplate = async (fields = {}) =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: (await createEmailType()).id,
      functionCode: "Person",
      fromEmail: "{{ORG_EMAIL}}",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: "Newsletter",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}.",
      ...fields,
    });

  const addTrip = (name, startDate) =>
    db.trip.create({ orgId: org.id, name, status: "active", startDate, endDate: startDate });

  const addRole = async (trip, name) => {
    const workerRole =
      (await db.workerRole.findOne({ where: { orgId: org.id, name } })) ||
      (await db.workerRole.create({ orgId: org.id, name }));
    return db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: workerRole.id });
  };

  const addPerson = (firstName, email = `${firstName.toLowerCase()}@example.org`) =>
    db.person.create({ firstName, lastName: "Lopez", email });

  const assign = (person, trip, { status = "approved", tripWorkerRole = null, roleName } = {}) =>
    db.tripPeopleRole
      .create({
        tripId: trip.id,
        peopleId: person.id,
        roleId: participantRole.id,
        status,
        tripWorkerRoleId: tripWorkerRole?.id ?? null,
      })
      .then(async (row) => {
        if (roleName) await row.update({ roleId: (await findRole(roleName)).id });
        return row;
      });

  // Sign-ins also write "Login" rows to the email log.
  const sentEmails = () =>
    db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] });

  const post = (path, body, headers = auth) =>
    request(app).post(`/trips/people-email${path}`).set(headers).send(body);

  const emailBody = (template, fields = {}) => ({
    emailTemplateId: template.id,
    subject: template.subject,
    emailBody: template.emailBody,
    tripIds: "all",
    workerRoleIds: "all",
    ...fields,
  });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "people-admin@example.com", orgName: "Hope Missions" });
    org = admin.org;
    auth = { ...admin.authHeader, "X-Acting-Organization-Id": String(org.id) };
    await org.update({ email: "office@hope.org" });
    participantRole = await findRole("Trip Participant");
    clinic = await addTrip("Guatemala Clinic", "2027-03-01");
    build = await addTrip("Honduras Build", "2026-06-01");
    for (const [tokenCode, valueSource] of [
      ["PARTICIPANT_EMAIL", "participant.email"],
      ["PARTICIPANT_FIRST_NAME", "participant.firstName"],
      ["PARTICIPANT_TRIP_ROLE", "participant.tripRole"],
      ["ORG_EMAIL", "organization.email"],
      ["ORG_NAME", "organization.name"],
      ["TRIP_NAME", "trip.name"],
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

  describe("US-62.1 — Write Person email templates", () => {
    const templateBody = (fields = {}) => ({
      orgId: org.id,
      functionCode: "Person",
      scheduleRule: "weekly",
      subject: "Newsletter",
      fromEmail: "office@hope.org",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      emailBody: "Hello.",
      ...fields,
    });

    it("Org Admin saves a Person template", async () => {
      const emailType = await createEmailType();

      const create = await request(app)
        .post("/trips/email-templates")
        .set(admin.authHeader)
        .send(templateBody({ emailTypeId: emailType.id }));

      expect(create.status).toBe(200);
      const saved = await db.emailTemplate.findByPk(create.body.id);
      expect(saved.functionCode).toBe("Person");
      expect(saved.scheduleRule).toBeNull();
      expect(saved.tripId).toBeNull();
    });

    it("Person template cannot belong to a trip", async () => {
      const emailType = await createEmailType();

      const create = await request(app)
        .post("/trips/email-templates")
        .set(admin.authHeader)
        .send(templateBody({ emailTypeId: emailType.id, tripId: clinic.id }));

      expect(create.status).toBe(400);
      expect(create.body.message).toBe("Person templates cannot belong to a trip.");
    });
  });

  describe("US-62.2 — Choose people by trip and role", () => {
    it("Options list the organization's Person templates, trips, and roles", async () => {
      const person = await addTemplate();
      await addTemplate({ functionCode: "Trip Participant", subject: "Team update" });
      await addRole(clinic, "Nurse");
      await addRole(clinic, "Doctor");
      await addRole(build, "Builder");
      const otherOrg = await db.organization.create({ name: "Other Org" });
      await db.trip.create({ orgId: otherOrg.id, name: "Other Trip" });

      const response = await request(app).get("/trips/people-email/options").set(auth);

      expect(response.status).toBe(200);
      expect(response.body.templates.map((t) => t.id)).toEqual([person.id]);
      expect(response.body.trips.map((t) => [t.name, t.roles.map((r) => r.name)])).toEqual([
        ["Guatemala Clinic", ["Doctor", "Nurse"]],
        ["Honduras Build", ["Builder"]],
      ]);
    });

    it("Recipients by selected trips and roles", async () => {
      const nurse = await addRole(clinic, "Nurse");
      const doctor = await addRole(clinic, "Doctor");
      const builder = await addRole(build, "Builder");
      const ana = await addPerson("Ana");
      await assign(ana, clinic, { tripWorkerRole: nurse });
      await assign(await addPerson("Ben"), clinic, { tripWorkerRole: doctor });
      await assign(await addPerson("Cara"), clinic, { status: "applied", tripWorkerRole: nurse });
      await assign(await addPerson("Dan"), build, { tripWorkerRole: builder });

      const response = await post("/recipients", {
        tripIds: [clinic.id],
        workerRoleIds: [nurse.workerRoleId],
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([{ personId: ana.id, name: "Ana Lopez" }]);
    });

    it("All trips and all roles list each approved participant once", async () => {
      const nurse = await addRole(clinic, "Nurse");
      const builder = await addRole(build, "Builder");
      const ana = await addPerson("Ana");
      await assign(ana, clinic, { tripWorkerRole: nurse });
      await assign(ana, build, { tripWorkerRole: builder });
      const ben = await addPerson("Ben");
      await assign(ben, clinic);
      await assign(await addPerson("Eve"), build, { roleName: "Trip Leader" });

      const response = await post("/recipients", { tripIds: "all", workerRoleIds: "all" });

      expect(response.status).toBe(200);
      expect(response.body.map((r) => r.personId)).toEqual([ana.id, ben.id]);
    });

    it("Trip Leader cannot use people email", async () => {
      const leader = await registerUser({ email: "leader@example.org", orgIds: [org.id] });
      await db.tripPeopleRole.create({
        tripId: clinic.id,
        peopleId: leader.user.personId,
        roleId: (await findRole("Trip Leader")).id,
        status: "approved",
      });

      const response = await request(app)
        .get("/trips/people-email/options")
        .set({ ...leader.authHeader, "X-Acting-Organization-Id": String(org.id) });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Forbidden.");
    });
  });

  describe("US-62.3 — Preview and send the email", () => {
    it("Preview fills person tokens and leaves trip tokens empty", async () => {
      const template = await addTemplate({
        emailBody: "Hi {{PARTICIPANT_FIRST_NAME}} from {{ORG_NAME}}{{TRIP_NAME}}",
      });
      const ana = await addPerson("Ana");
      await assign(ana, clinic);

      const response = await post("/preview", { ...emailBody(template), personId: ana.id });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        from: '"Hope Missions via Mission Trips" <notifications@missiontrips.app>',
        replyTo: "office@hope.org",
        to: "ana@example.org",
        body: "Hi Ana from Hope Missions",
      });
      expect(await sentEmails()).toEqual([]);
    });

    it("Send emails each recipient once and reports results", async () => {
      const template = await addTemplate();
      const ana = await addPerson("Ana");
      await assign(ana, clinic);
      await assign(ana, build);
      const ben = await addPerson("Ben", null);
      await assign(ben, clinic);

      const response = await post("", emailBody(template));

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ sent: 1, skipped: 1, failed: 0 });
      expect(response.body.results).toContainEqual(
        expect.objectContaining({ personId: ben.id, status: "skipped", reason: "No recipients." })
      );
      const logs = await sentEmails();
      expect(logs.map((log) => [log.toEmail, log.personId, log.tripId])).toEqual([
        ["ana@example.org", ana.id, null],
      ]);
    });

    it("Test mode sends to the organization email", async () => {
      await org.update({ testMode: true });
      const template = await addTemplate();
      const ana = await addPerson("Ana");
      await assign(ana, clinic);

      const response = await post("", emailBody(template));

      expect(response.status).toBe(200);
      const [log] = await sentEmails();
      expect(log.toEmail).toBe("office@hope.org");
      expect(log.subject.startsWith("[Test] ")).toBe(true);
    });
  });

  describe("US-62.4 — Use trip templates for a single trip", () => {
    it("Trip template for one trip fills trip tokens", async () => {
      const template = await addTemplate({
        tripId: clinic.id,
        functionCode: "Trip Participant",
        emailBody: "{{TRIP_NAME}}: {{PARTICIPANT_TRIP_ROLE}}",
      });
      const nurse = await addRole(clinic, "Nurse");
      const ana = await addPerson("Ana");
      await assign(ana, clinic, { tripWorkerRole: nurse });
      const body = emailBody(template, { tripIds: [clinic.id] });

      const preview = await post("/preview", { ...body, personId: ana.id });
      const send = await post("", body);

      expect(preview.status).toBe(200);
      expect(preview.body.body).toBe("Guatemala Clinic: Nurse");
      expect(send.status).toBe(200);
      const logs = await sentEmails();
      expect(logs.map((log) => [log.personId, log.tripId])).toEqual([[ana.id, clinic.id]]);
    });

    it("Trip template rejected with more than one trip", async () => {
      const template = await addTemplate({ functionCode: "Trip Participant" });
      await assign(await addPerson("Ana"), clinic);

      const response = await post("", emailBody(template, { tripIds: "all" }));

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Trip Participant templates need exactly one trip selected.");
      expect(await sentEmails()).toEqual([]);
    });
  });
});
