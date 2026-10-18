/**
 * Feature 45 — Send Now Event Emails
 * Spec: features/feature-45-send-now-event-emails.md
 */

import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { emailTransport } from "../app/utils/emailDelivery.js";
import { sendEventEmails } from "../app/utils/eventEmails.js";
import { runScheduledEmails } from "../app/utils/scheduledEmails.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  completePersonProfile,
} from "./helpers.js";

describe("Feature 45 — Send Now Event Emails", () => {
  let admin;
  let org;
  let participantRole;
  const originalCreate = emailTransport.create;
  const originalMode = process.env.EMAIL_MODE;

  const createEmailType = (eventCode) =>
    db.emailType.create({ typeCode: eventCode, description: `Type ${eventCode}`, eventCode });

  const addTemplate = async (eventCode, subject, fields = {}) =>
    db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: (await createEmailType(eventCode)).id,
      functionCode: "Send Now",
      fromEmail: "office@example.org",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject,
      emailBody: "Hello.",
      ...fields,
    });

  const createTrip = (fields = {}) =>
    db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2026-12-01",
      endDate: "2026-12-10",
      ...fields,
    });

  const createPerson = (email = "pat@example.org") =>
    db.person.create({ firstName: "Pat", lastName: "Lopez", email });

  const addAssignment = (trip, person, status, roleId = participantRole.id) =>
    db.tripPeopleRole.create({ tripId: trip.id, peopleId: person.id, roleId, status });

  // Sign-ins also write "Login" rows to the email log.
  const sentEmails = () =>
    db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] });

  const sentSubjects = async () => (await sentEmails()).map((log) => log.subject);

  const staffDonation = (trip, person, amount) =>
    request(app)
      .post("/trips/donations")
      .set(admin.authHeader)
      .send({
        tripId: trip.id,
        personId: person.id,
        amount,
        dateTime: "2026-10-15T14:00:00.000Z",
        donor: { firstName: "Dana", lastName: "Donor", status: "active" },
      });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "event-admin@example.com" });
    org = admin.org;
    participantRole = await findRole("Trip Participant");
    await db.emailToken.create({
      tokenCode: "PARTICIPANT_EMAIL",
      description: "Participant email",
      valueSource: "participant.email",
    });
  });

  afterEach(async () => {
    process.env.EMAIL_MODE = originalMode;
    emailTransport.create = originalCreate;
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-45.1 — Send the templates for an event", () => {
    it("Event email uses the trip template over the organization template", async () => {
      const trip = await createTrip();
      const orgTemplate = await addTemplate("application-approved", "Org approved");
      await db.emailTemplate.create({
        orgId: org.id,
        tripId: trip.id,
        emailTypeId: orgTemplate.emailTypeId,
        functionCode: "Send Now",
        fromEmail: "office@example.org",
        toAddress: "{{PARTICIPANT_EMAIL}}",
        subject: "Trip approved",
        emailBody: "Hello.",
      });
      const person = await createPerson();

      await sendEventEmails({ eventCode: "application-approved", tripId: trip.id, personId: person.id });

      expect(await sentSubjects()).toEqual(["Trip approved"]);
    });

    it("Event with no Send Now template sends nothing", async () => {
      const trip = await createTrip();
      const person = await createPerson();

      const results = await sendEventEmails({
        eventCode: "application-approved",
        tripId: trip.id,
        personId: person.id,
      });

      expect(results).toEqual([]);
      expect(await sentSubjects()).toEqual([]);
    });

    it("Scheduled templates are not sent by events", async () => {
      await addTemplate("application-approved", "Scheduled approved", {
        functionCode: "Scheduled",
        scheduleRule: "daily",
      });
      const trip = await createTrip();
      const person = await createPerson();

      await sendEventEmails({ eventCode: "application-approved", tripId: trip.id, personId: person.id });

      expect(await sentSubjects()).toEqual([]);
    });
  });

  describe("US-45.2 — Email participants when their application changes", () => {
    it("Adding an incomplete application sends Application started", async () => {
      await addTemplate("application-started", "Application started");
      const trip = await createTrip();
      const person = await createPerson();

      const response = await request(app)
        .post("/trips/trip-people-roles")
        .set(admin.authHeader)
        .send({ tripId: trip.id, peopleId: person.id, roleId: participantRole.id });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("incomplete");
      expect(await sentSubjects()).toEqual(["Application started"]);
    });

    it("Application moving to applied sends Application received", async () => {
      await addTemplate("application-submitted", "Application received");
      const trip = await createTrip({ participantCost: 1800 });
      const workerRole = await db.workerRole.create({
        orgId: org.id,
        name: "General Team",
      });
      const tripWorkerRole = await db.tripWorkerRole.create({
        tripId: trip.id,
        workerRoleId: workerRole.id,
        quantity: 5,
      });
      const applicant = await registerUser({ email: "applicant@example.org", orgIds: [org.id] });
      await completePersonProfile(applicant.user.personId);
      const application = {
        tripWorkerRoleId: tripWorkerRole.id,
        willSelfFund: false,
        flightPurchaseOption: "self",
        willRaiseFunds: false,
        hasPreferredRoommate: false,
        isPregnant: false,
      };

      const started = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send(application);
      expect(started.body.applicationStatus).toBe("incomplete");
      expect(await sentSubjects()).toEqual([]);

      const submitted = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(applicant.authHeader)
        .send({ ...application, willSelfFund: true, version: started.body.assignment.version });

      expect(submitted.status).toBe(200);
      expect(submitted.body.applicationStatus).toBe("applied");
      const logs = await sentEmails();
      expect(logs.map((log) => log.subject)).toEqual(["Application received"]);
      expect(logs[0].toEmail).toBe("applicant@example.org");
    });

    it("Approving an application sends Application approved", async () => {
      await addTemplate("application-approved", "Application approved");
      const trip = await createTrip();
      const person = await createPerson();
      const assignment = await addAssignment(trip, person, "applied");

      const response = await request(app)
        .put(`/trips/trip-people-roles/${assignment.id}`)
        .set(admin.authHeader)
        .send({ status: "approved", version: assignment.version });

      expect(response.status).toBe(200);
      const logs = await sentEmails();
      expect(logs.map((log) => log.subject)).toEqual(["Application approved"]);
      expect(logs[0].toEmail).toBe(person.email);
    });

    it("Saving an approved application again sends nothing", async () => {
      await addTemplate("application-approved", "Application approved");
      const trip = await createTrip();
      const assignment = await addAssignment(trip, await createPerson(), "approved");

      const response = await request(app)
        .put(`/trips/trip-people-roles/${assignment.id}`)
        .set(admin.authHeader)
        .send({ status: "approved", version: assignment.version });

      expect(response.status).toBe(200);
      expect(await sentSubjects()).toEqual([]);
    });

    it("Trip Leader assignments send no application emails", async () => {
      await addTemplate("application-approved", "Application approved");
      const trip = await createTrip();
      const leaderRole = await findRole("Trip Leader");

      const response = await request(app)
        .post("/trips/trip-people-roles")
        .set(admin.authHeader)
        .send({
          tripId: trip.id,
          peopleId: (await createPerson()).id,
          roleId: leaderRole.id,
          status: "approved",
        });

      expect(response.status).toBe(200);
      expect(await sentSubjects()).toEqual([]);
    });
  });

  describe("US-45.3 — Email participants when donations come in", () => {
    it("Donation for a participant sends Donation received", async () => {
      await addTemplate("donation-received", "Donation received");
      const trip = await createTrip();
      const person = await createPerson();
      await addAssignment(trip, person, "approved");

      const response = await request(app)
        .post("/trips/public/donations")
        .send({ tripId: trip.id, personId: person.id, amount: 50, donor: { firstName: "Dana" } });

      expect(response.status).toBe(200);
      const logs = await sentEmails();
      expect(logs.map((log) => log.subject)).toEqual(["Donation received"]);
      expect(logs[0].toEmail).toBe(person.email);
    });

    it("Donation reaching the deposit sends Deposit received", async () => {
      await addTemplate("deposit-received", "Deposit received");
      const trip = await createTrip({ deposit: 500 });
      const person = await createPerson();
      await addAssignment(trip, person, "approved");
      await db.tripDonation.create({ tripId: trip.id, personId: person.id, amount: 400 });

      expect((await staffDonation(trip, person, 200)).status).toBe(200);
      expect(await sentSubjects()).toEqual(["Deposit received"]);

      expect((await staffDonation(trip, person, 100)).status).toBe(200);
      expect(await sentSubjects()).toEqual(["Deposit received"]);
    });

    it("Donation paying in full sends Trip fully paid", async () => {
      await addTemplate("payment-complete", "Trip fully paid");
      const trip = await createTrip({ participantCost: 2000 });
      const person = await createPerson();
      await addAssignment(trip, person, "approved");
      await db.tripDonation.create({ tripId: trip.id, personId: person.id, amount: 1500 });

      expect((await staffDonation(trip, person, 500)).status).toBe(200);

      expect(await sentSubjects()).toEqual(["Trip fully paid"]);
    });

    it("One donation sends every event it causes", async () => {
      await addTemplate("donation-received", "Donation received");
      await addTemplate("deposit-received", "Deposit received");
      await addTemplate("payment-complete", "Trip fully paid");
      const trip = await createTrip({ participantCost: 2000, deposit: 500 });
      const person = await createPerson();
      await addAssignment(trip, person, "approved");

      expect((await staffDonation(trip, person, 2000)).status).toBe(200);

      expect(await sentSubjects()).toEqual([
        "Donation received",
        "Deposit received",
        "Trip fully paid",
      ]);
    });

    it("Donation without a participant sends nothing", async () => {
      await addTemplate("donation-received", "Donation received");
      const trip = await createTrip();

      const response = await request(app)
        .post("/trips/public/donations")
        .send({ tripId: trip.id, amount: 50, donor: { firstName: "Dana" } });

      expect(response.status).toBe(200);
      expect(await sentSubjects()).toEqual([]);
    });
  });

  describe("US-45.4 — Keep working when email fails", () => {
    it("A failed event email does not block the save", async () => {
      await addTemplate("application-approved", "Application approved");
      const trip = await createTrip();
      const assignment = await addAssignment(trip, await createPerson(), "applied");
      process.env.EMAIL_MODE = "smtp";
      emailTransport.create = () => ({
        sendMail: async () => {
          throw new Error("Connection refused");
        },
      });

      const response = await request(app)
        .put(`/trips/trip-people-roles/${assignment.id}`)
        .set(admin.authHeader)
        .send({ status: "approved", version: assignment.version });

      expect(response.status).toBe(200);
      expect((await db.tripPeopleRole.findByPk(assignment.id)).status).toBe("approved");
      expect(await sentEmails()).toEqual([]);
    });
  });

  describe("US-45.5 — Tell which email went to whom", () => {
    const logSource = (log) => ({
      emailTemplateId: log.emailTemplateId,
      tripId: log.tripId,
      personId: log.personId,
    });

    it("Event email log row records the template, trip, and participant", async () => {
      const template = await addTemplate("application-approved", "Application approved");
      const trip = await createTrip();
      const person = await createPerson();

      await sendEventEmails({ eventCode: "application-approved", tripId: trip.id, personId: person.id });

      expect((await sentEmails()).map(logSource)).toEqual([
        { emailTemplateId: template.id, tripId: trip.id, personId: person.id },
      ]);
    });

    it("Scheduled email log row records the template, trip, and participant", async () => {
      const template = await addTemplate("pre-departure", "Get ready", {
        functionCode: "Scheduled",
        scheduleRule: "daily",
      });
      const trip = await createTrip();
      const person = await createPerson();
      await addAssignment(trip, person, "approved");

      await runScheduledEmails({ date: "2026-11-03", output: () => {} });

      expect((await sentEmails()).map(logSource)).toEqual([
        { emailTemplateId: template.id, tripId: trip.id, personId: person.id },
      ]);
    });

    it("Deleting a template keeps its email log rows", async () => {
      const template = await addTemplate("application-approved", "Application approved");
      const trip = await createTrip();
      const person = await createPerson();
      await sendEventEmails({ eventCode: "application-approved", tripId: trip.id, personId: person.id });

      await template.destroy();

      const logs = await sentEmails();
      expect(logs).toHaveLength(1);
      expect(logs[0].toEmail).toBe(person.email);
      expect(logs[0].subject).toBe("Application approved");
      expect(logs[0].emailTemplateId).toBeNull();
    });
  });
});
