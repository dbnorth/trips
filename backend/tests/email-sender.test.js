/**
 * Feature 51 — Send Email "via Mission Trips"
 * Spec: features/feature-51-sender-via-mission-trips.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import addressparser from "nodemailer/lib/addressparser/index.js";
import app from "../server.js";
import db from "../app/models/index.js";
import { sendTemplateEmail } from "../app/utils/emailDelivery.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

describe('Feature 51 — Send Email "via Mission Trips"', () => {
  let savedMode;
  let savedDir;
  let mailDir;

  const readOnlyMailFile = () => {
    const files = fs.readdirSync(mailDir);
    expect(files).toHaveLength(1);
    return fs.readFileSync(path.join(mailDir, files[0]), "utf8");
  };

  const createTrip = async ({ orgName = "Hope Mission", orgEmail = "office@example.org" } = {}) => {
    const org = await db.organization.create({ name: orgName, email: orgEmail });
    const trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic" });
    const ana = await db.person.create({
      firstName: "Ana",
      lastName: "Lopez",
      email: "ana@example.org",
    });
    return { org, trip, ana };
  };

  const addPrimaryLeader = async (trip) => {
    const john = await db.person.create({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@gmail.com",
    });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: john.id,
      roleId: (await findRole("Trip Leader")).id,
      status: "approved",
      isPrimaryLeader: true,
    });
    return john;
  };

  const sendFrom = async (fromEmail, { org, trip, ana }) =>
    sendTemplateEmail({
      template: {
        orgId: org.id,
        fromEmail,
        toAddress: "{{PARTICIPANT_EMAIL}}",
        subject: "Welcome",
        emailBody: "See you soon.",
      },
      tripId: trip.id,
      personId: ana.id,
    });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedMode = process.env.EMAIL_MODE;
    savedDir = process.env.EMAIL_FILE_DIR;
    mailDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trips-mail-")), "mail");
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = mailDir;
    for (const [tokenCode, valueSource] of [
      ["ORG_EMAIL", "organization.email"],
      ["PARTICIPANT_EMAIL", "participant.email"],
      ["PARTICIPANT_FIRST_NAME", "participant.firstName"],
      ["PRIMARY_TRIP_LEADER_EMAIL", "primaryLeader.email"],
    ]) {
      await db.emailToken.create({ tokenCode, description: tokenCode, valueSource });
    }
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

  describe("US-51.1 — Every email comes from Mission Trips on behalf of the real sender", () => {
    it("Primary trip leader sender", async () => {
      const context = await createTrip();
      await addPrimaryLeader(context.trip);

      const result = await sendFrom("{{PRIMARY_TRIP_LEADER_EMAIL}}", context);

      const file = readOnlyMailFile();
      expect(file).toContain('From: "John Doe via Mission Trips" <notifications@missiontrips.app>\n');
      expect(file).toContain("Reply-To: john.doe@gmail.com\n");
      const log = await db.emailLog.findByPk(result.emailLogId);
      expect(log.fromEmail).toBe('"John Doe via Mission Trips" <notifications@missiontrips.app>');
    });

    it("Organization sender", async () => {
      const context = await createTrip();

      await sendFrom("{{ORG_EMAIL}}", context);

      const file = readOnlyMailFile();
      expect(file).toContain(
        'From: "Hope Mission via Mission Trips" <notifications@missiontrips.app>\n'
      );
      expect(file).toContain("Reply-To: office@example.org\n");
    });

    it("Participant sender", async () => {
      const context = await createTrip();

      await sendFrom("{{PARTICIPANT_EMAIL}}", context);

      const file = readOnlyMailFile();
      expect(file).toContain('From: "Ana Lopez via Mission Trips" <notifications@missiontrips.app>\n');
      expect(file).toContain("Reply-To: ana@example.org\n");
    });

    it("Typed address that matches the organization", async () => {
      const context = await createTrip();

      await sendFrom("Office@Example.org", context);

      const file = readOnlyMailFile();
      expect(file).toContain(
        'From: "Hope Mission via Mission Trips" <notifications@missiontrips.app>\n'
      );
      expect(file).toContain("Reply-To: Office@Example.org\n");
    });

    it("Typed address that matches no one", async () => {
      const context = await createTrip();

      await sendFrom("someone@else.org", context);

      const file = readOnlyMailFile();
      expect(file).toContain('From: "Mission Trips" <notifications@missiontrips.app>\n');
      expect(file).toContain("Reply-To: someone@else.org\n");
    });

    it("Sender name with special characters", async () => {
      const context = await createTrip({ orgName: 'Smith, Jones & "Co"' });

      const result = await sendFrom("{{ORG_EMAIL}}", context);

      const log = await db.emailLog.findByPk(result.emailLogId);
      expect(addressparser(log.fromEmail)).toEqual([
        { name: 'Smith, Jones & "Co" via Mission Trips', address: "notifications@missiontrips.app" },
      ]);
    });

    it("Team email preview shows the sender", async () => {
      const admin = await createOrgAdminUser({ email: "sender-admin@example.com" });
      await admin.org.update({ name: "Hope Mission", email: "office@example.org" });
      const trip = await db.trip.create({
        orgId: admin.org.id,
        name: "Guatemala Clinic",
        status: "active",
      });
      const pat = await db.person.create({
        firstName: "Pat",
        lastName: "Lopez",
        email: "pat@example.org",
      });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: pat.id,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
      });
      const emailType = await db.emailType.create({
        typeCode: "team-update",
        description: "Team update",
        eventCode: "team-email",
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
        .post(`/trips/trips/${trip.id}/team-email/preview`)
        .set(admin.authHeader)
        .send({
          emailTemplateId: template.id,
          subject: template.subject,
          emailBody: template.emailBody,
          sendTo: "potential",
          personId: pat.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.from).toBe(
        '"Hope Mission via Mission Trips" <notifications@missiontrips.app>'
      );
      expect(response.body.replyTo).toBe("office@example.org");
    });
  });
});
