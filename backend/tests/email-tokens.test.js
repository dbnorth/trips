/**
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
 * Feature 48 — Participant Trip Role Email Token
 * Spec: features/feature-48-participant-trip-role-token.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { sendTemplateEmail } from "../app/utils/emailDelivery.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createSystemAdminUser,
  createOrgAdminUser,
  findRole,
  registerUser,
} from "./helpers.js";

afterAll(async () => {
  await db.sequelize.close();
});

describe("Feature 40 — Email Template Tokens and Preview", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  describe("US-40.1 — Maintain the token catalog", () => {
    it("Token is saved", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "token-admin@example.com" });

      const create = await request(app)
        .post("/trips/email-tokens")
        .set(authHeader)
        .send({
          tokenCode: "TRIP_LEADER_EMAIL",
          description: "Primary trip leader email",
          valueSource: "primaryLeader.email",
        });

      expect(create.status).toBe(200);

      const loaded = await request(app)
        .get(`/trips/email-tokens/${create.body.id}`)
        .set(authHeader);

      expect(loaded.status).toBe(200);
      expect(loaded.body).toMatchObject({
        tokenCode: "TRIP_LEADER_EMAIL",
        description: "Primary trip leader email",
        valueSource: "primaryLeader.email",
      });
    });

    it("A non-admin cannot create a token", async () => {
      const { authHeader } = await registerUser({ email: "token-user@example.com" });

      const create = await request(app)
        .post("/trips/email-tokens")
        .set(authHeader)
        .send({
          tokenCode: "TRIP_NAME",
          description: "Trip name",
          valueSource: "trip.name",
        });

      expect(create.status).toBe(403);
    });

    it("Token code must use capital letters, digits, and underscores", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "token-code-admin@example.com" });

      const create = await request(app)
        .post("/trips/email-tokens")
        .set(authHeader)
        .send({
          tokenCode: "trip leader",
          description: "Trip leader",
          valueSource: "primaryLeader.email",
        });

      expect(create.status).toBe(400);
      expect(await db.emailToken.count()).toBe(0);
    });
  });
});

describe("Feature 48 — Participant Trip Role Email Token", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  const addTripRoleToken = () =>
    db.emailToken.create({
      tokenCode: "PARTICIPANT_TRIP_ROLE",
      description: "Participant trip role",
      valueSource: "participant.tripRole",
    });

  const setupNurseApplicant = async () => {
    const { authHeader, org } = await createOrgAdminUser({
      email: "role-token-admin@example.com",
      orgName: "Role Token Org",
    });
    const trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic" });
    const nurse = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    const tripRole = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: nurse.id });
    const person = await db.person.create({
      firstName: "Pat",
      lastName: "Smith",
      email: "pat@example.org",
    });
    const participantRole = await findRole("Trip Participant");
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: person.id,
      roleId: participantRole.id,
      tripWorkerRoleId: tripRole.id,
      status: "applied",
    });
    return { authHeader, org, trip, person };
  };

  describe("US-48.1 — Use the participant's trip role in an email", () => {
    it("Participant trip role is a value source", async () => {
      const { authHeader } = await createSystemAdminUser({ email: "role-sources@example.com" });

      const res = await request(app).get("/trips/email-tokens/value-sources").set(authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toContainEqual({
        valueSource: "participant.tripRole",
        label: "Participant trip role",
      });
    });

    it("Preview fills the participant's trip role", async () => {
      await addTripRoleToken();
      const { authHeader, org, trip, person } = await setupNurseApplicant();

      const preview = await request(app)
        .post("/trips/email-templates/preview")
        .set(authHeader)
        .send({
          orgId: org.id,
          tripId: trip.id,
          personId: person.id,
          subject: "Your role",
          emailBody: "Role: {{PARTICIPANT_TRIP_ROLE}}",
        });

      expect(preview.status).toBe(200);
      expect(preview.body.emailBody).toBe("Role: Nurse");
    });

    it("Participant trip role is empty without a participant", async () => {
      await addTripRoleToken();
      const { authHeader, org, trip } = await setupNurseApplicant();

      const preview = await request(app)
        .post("/trips/email-templates/preview")
        .set(authHeader)
        .send({
          orgId: org.id,
          tripId: trip.id,
          subject: "Your role",
          emailBody: "Role: {{PARTICIPANT_TRIP_ROLE}}",
        });

      expect(preview.status).toBe(200);
      expect(preview.body.emailBody).toBe("Role: ");
    });

    it("Sent email fills the participant's trip role", async () => {
      await addTripRoleToken();
      const { org, trip, person } = await setupNurseApplicant();

      const result = await sendTemplateEmail({
        template: {
          id: null,
          orgId: org.id,
          fromEmail: "office@example.org",
          toAddress: "pat@example.org",
          subject: "You are our {{PARTICIPANT_TRIP_ROLE}}",
          emailBody: "Thanks for serving.",
        },
        tripId: trip.id,
        personId: person.id,
      });

      expect(result.status).toBe("sent");
      const log = await db.emailLog.findByPk(result.emailLogId);
      expect(log.subject).toBe("You are our Nurse");
    });
  });
});
