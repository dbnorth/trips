/**
 * Feature 10 — Email Templates
 * Spec: features/feature-10-email-templates.md
 * Feature 41 — Email Template To Address
 * Spec: features/feature-41-email-template-to-address.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  createSystemAdminUser,
  registerUser,
  assignOrgRole,
  findRole,
} from "./helpers.js";

describe("Feature 10 — Email Templates", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-10.1 — Manage email templates", () => {
    it("Org Admin creates an email template", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "template-admin@example.com",
        orgName: "Template Org",
      });

      const create = await request(app)
        .post("/trips/email-templates")
        .set(authHeader)
        .send({
          orgId: org.id,
          functionCode: "welcome",
          fromEmail: "noreply@example.com",
          subject: "Welcome to the trip",
          content: "Hello {{firstName}}, thanks for applying.",
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        orgId: org.id,
        functionCode: "welcome",
        fromEmail: "noreply@example.com",
        subject: "Welcome to the trip",
        content: "Hello {{firstName}}, thanks for applying.",
      });

      const list = await request(app).get("/trips/email-templates").set(authHeader);

      expect(list.status).toBe(200);
      expect(list.body.map((t) => t.id)).toContain(create.body.id);
      expect(list.body.find((t) => t.id === create.body.id).orgId).toBe(org.id);
    });
  });

  describe("US-10.2 — Copy template sources", () => {
    it("Staff loads copy-sources", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "copy-sources-admin@example.com",
        orgName: "Copy Sources Org",
      });

      await db.emailTemplate.create({
        orgId: null,
        tripId: null,
        functionCode: "global_welcome",
        fromEmail: "global@example.com",
        subject: "Global welcome",
        content: "System welcome body",
      });

      const orgTemplate = await request(app)
        .post("/trips/email-templates")
        .set(authHeader)
        .send({
          orgId: org.id,
          functionCode: "org_reminder",
          subject: "Org reminder",
          content: "Please complete your profile.",
        });
      expect(orgTemplate.status).toBe(200);

      const globalSources = await request(app)
        .get("/trips/email-templates/copy-sources")
        .set(authHeader);

      expect(globalSources.status).toBe(200);
      expect(Array.isArray(globalSources.body)).toBe(true);
      expect(globalSources.body.map((t) => t.functionCode)).toContain("global_welcome");
      expect(globalSources.body[0]).toEqual(
        expect.objectContaining({
          functionCode: expect.any(String),
          subject: expect.any(String),
        })
      );

      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Copy Source Trip",
          status: "active",
          startDate: "2026-10-01",
          endDate: "2026-10-10",
          participantCost: 1000,
        });
      expect(trip.status).toBe(200);

      const orgSources = await request(app)
        .get("/trips/email-templates/copy-sources")
        .query({ tripId: trip.body.id })
        .set(authHeader);

      expect(orgSources.status).toBe(200);
      expect(Array.isArray(orgSources.body)).toBe(true);
      expect(orgSources.body.map((t) => t.id)).toContain(orgTemplate.body.id);
      expect(orgSources.body.every((t) => t.functionCode)).toBe(true);
    });
  });

  describe("Feature 39 — Email Types and Organization Email Templates", () => {
    describe("US-39.2 — Maintain an organization email template", () => {
      it("Organization email template is saved", async () => {
        const sys = await createSystemAdminUser({
          email: "template-type-admin@example.com",
        });
        const emailType = await request(app)
          .post("/trips/email-types")
          .set(sys.authHeader)
          .send({
            typeCode: "apply-received",
            description: "Application received",
            eventCode: "application-submitted",
          });
        expect(emailType.status).toBe(200);

        const { authHeader, org } = await createOrgAdminUser({
          email: "org-template-admin@example.com",
          orgName: "Template Org",
        });

        const create = await request(app)
          .post("/trips/email-templates")
          .set(authHeader)
          .send({
            orgId: org.id,
            emailTypeId: emailType.body.id,
            functionCode: "Send Now",
            subject: "Application received",
            fromEmail: "trips@example.com",
            toAddress: "applicant@example.com",
            emailBody: "We received your application.",
          });

        expect(create.status).toBe(200);

        const loaded = await request(app)
          .get(`/trips/email-templates/${create.body.id}`)
          .set(authHeader);

        expect(loaded.status).toBe(200);
        expect(loaded.body.orgId).toBe(org.id);
        expect(loaded.body.emailTypeId).toBe(emailType.body.id);
        expect(loaded.body.emailType).toMatchObject({
          id: emailType.body.id,
          description: "Application received",
        });
        expect(loaded.body.functionCode).toBe("Send Now");
        expect(loaded.body.subject).toBe("Application received");
        expect(loaded.body.fromEmail).toBe("trips@example.com");
        expect(loaded.body.emailBody).toBe("We received your application.");
      });
    });
  });

  describe("Feature 40 — Email Template Tokens and Preview", () => {
    const addToken = (tokenCode, valueSource) =>
      db.emailToken.create({ tokenCode, description: tokenCode, valueSource });

    const setupTripWithParticipant = async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "preview-admin@example.com",
        orgName: "Preview Org",
      });
      const leaderA = await registerUser({
        email: "preview-leader-a@example.com",
        firstName: "Ann",
        lastName: "Leader",
        orgIds: [org.id],
      });
      const leaderB = await registerUser({
        email: "preview-leader-b@example.com",
        firstName: "Bob",
        lastName: "Leader",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leaderA.user.personId, "Trip Leader");
      await assignOrgRole(org.id, leaderB.user.personId, "Trip Leader");

      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Guatemala Clinic",
          status: "active",
          startDate: "2026-10-01",
          endDate: "2026-10-10",
          participantCost: 1000,
          leaderPeopleIds: [leaderA.user.personId, leaderB.user.personId],
          primaryLeaderPeopleId: leaderB.user.personId,
        });
      expect(trip.status).toBe(200);

      const participant = await registerUser({
        email: "preview-participant@example.com",
        firstName: "Pat",
        lastName: "Smith",
        orgIds: [org.id],
      });
      const participantRole = await findRole("Trip Participant");
      await db.tripPeopleRole.create({
        tripId: trip.body.id,
        peopleId: participant.user.personId,
        roleId: participantRole.id,
        status: "incomplete",
      });

      return { authHeader, org, trip: trip.body, participant };
    };

    describe("US-40.4 — Preview a template with values filled in", () => {
      it("Preview replaces tokens with trip, participant, and leader values", async () => {
        await addToken("TRIP_NAME", "trip.name");
        await addToken("PARTICIPANT_FIRST_NAME", "participant.firstName");
        await addToken("TRIP_LEADER_EMAIL", "primaryLeader.email");
        const { authHeader, org, trip, participant } = await setupTripWithParticipant();

        const preview = await request(app)
          .post("/trips/email-templates/preview")
          .set(authHeader)
          .send({
            orgId: org.id,
            tripId: trip.id,
            personId: participant.user.personId,
            subject: "{{TRIP_NAME}} update",
            emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}, contact {{TRIP_LEADER_EMAIL}}",
          });

        expect(preview.status).toBe(200);
        expect(preview.body.subject).toBe("Guatemala Clinic update");
        expect(preview.body.emailBody).toBe(
          "Hi Pat, contact preview-leader-b@example.com"
        );
      });

      it("Unknown token stays as written", async () => {
        const { authHeader, org, trip } = await setupTripWithParticipant();

        const preview = await request(app)
          .post("/trips/email-templates/preview")
          .set(authHeader)
          .send({
            orgId: org.id,
            tripId: trip.id,
            subject: "Hello",
            emailBody: "Hello {{NOT_A_TOKEN}}",
          });

        expect(preview.status).toBe(200);
        expect(preview.body.emailBody).toBe("Hello {{NOT_A_TOKEN}}");
      });
    });

    describe("Feature 41 — Email Template To Address", () => {
      const setupTemplateAuthoring = async () => {
        const sys = await createSystemAdminUser({ email: "to-type-admin@example.com" });
        const emailType = await request(app)
          .post("/trips/email-types")
          .set(sys.authHeader)
          .send({
            typeCode: "apply-received",
            description: "Application received",
            eventCode: "application-submitted",
          });
        expect(emailType.status).toBe(200);
        const { authHeader, org } = await createOrgAdminUser({
          email: "to-org-admin@example.com",
          orgName: "To Org",
        });
        const templateBody = (toAddress, fromEmail = "trips@example.com") => ({
          orgId: org.id,
          emailTypeId: emailType.body.id,
          functionCode: "Send Now",
          subject: "Application received",
          fromEmail,
          toAddress,
          emailBody: "We received your application.",
        });
        return { authHeader, templateBody };
      };

      describe("US-41.1 — Set who a template is sent to", () => {
        it("To is saved", async () => {
          await addToken("PARTICIPANT_EMAIL", "participant.email");
          const { authHeader, templateBody } = await setupTemplateAuthoring();

          const create = await request(app)
            .post("/trips/email-templates")
            .set(authHeader)
            .send(templateBody("{{PARTICIPANT_EMAIL}}, office@example.org"));
          expect(create.status).toBe(200);

          const loaded = await request(app)
            .get(`/trips/email-templates/${create.body.id}`)
            .set(authHeader);
          expect(loaded.status).toBe(200);
          expect(loaded.body.toAddress).toBe("{{PARTICIPANT_EMAIL}}, office@example.org");
        });

        it("To is required", async () => {
          const { authHeader, templateBody } = await setupTemplateAuthoring();

          const create = await request(app)
            .post("/trips/email-templates")
            .set(authHeader)
            .send(templateBody("  "));

          expect(create.status).toBe(400);
          expect(create.body.message).toBe("To is required.");
        });

        it("To rejects a recipient that is not an email or email token", async () => {
          await addToken("TRIP_NAME", "trip.name");
          const { authHeader, templateBody } = await setupTemplateAuthoring();

          for (const toAddress of ["{{TRIP_NAME}}", "participant", "a@example.org,,b@example.org"]) {
            const create = await request(app)
              .post("/trips/email-templates")
              .set(authHeader)
              .send(templateBody(toAddress));
            expect(create.status).toBe(400);
            expect(create.body.message).toBe(
              "To must list email addresses or email tokens, separated by commas."
            );
          }
        });
      });

      describe("US-41.3 — Preview the recipients", () => {
        it("Preview replaces tokens in To", async () => {
          await addToken("PARTICIPANT_EMAIL", "participant.email");
          const { authHeader, org, trip, participant } = await setupTripWithParticipant();

          const preview = await request(app)
            .post("/trips/email-templates/preview")
            .set(authHeader)
            .send({
              orgId: org.id,
              tripId: trip.id,
              personId: participant.user.personId,
              toAddress: "{{PARTICIPANT_EMAIL}}, office@example.org",
              subject: "Hello",
              emailBody: "Hello",
            });

          expect(preview.status).toBe(200);
          expect(preview.body.toAddress).toBe(
            "preview-participant@example.com, office@example.org"
          );
        });
      });

      describe("US-41.4 — Send from an email token", () => {
        it("From email accepts an email token", async () => {
          await addToken("ORG_EMAIL", "organization.email");
          const { authHeader, templateBody } = await setupTemplateAuthoring();

          const create = await request(app)
            .post("/trips/email-templates")
            .set(authHeader)
            .send(templateBody("applicant@example.com", "{{ORG_EMAIL}}"));
          expect(create.status).toBe(200);

          const loaded = await request(app)
            .get(`/trips/email-templates/${create.body.id}`)
            .set(authHeader);
          expect(loaded.status).toBe(200);
          expect(loaded.body.fromEmail).toBe("{{ORG_EMAIL}}");
        });

        it("From email rejects two senders", async () => {
          const { authHeader, templateBody } = await setupTemplateAuthoring();

          const create = await request(app)
            .post("/trips/email-templates")
            .set(authHeader)
            .send(templateBody("applicant@example.com", "a@example.org, b@example.org"));

          expect(create.status).toBe(400);
          expect(create.body.message).toBe(
            "From email must be an email address or an email token."
          );
        });

        it("Preview replaces the token in From email", async () => {
          await addToken("ORG_EMAIL", "organization.email");
          const { authHeader, org, trip } = await setupTripWithParticipant();
          await db.organization.update({ email: "office@example.org" }, { where: { id: org.id } });

          const preview = await request(app)
            .post("/trips/email-templates/preview")
            .set(authHeader)
            .send({
              orgId: org.id,
              tripId: trip.id,
              fromEmail: "{{ORG_EMAIL}}",
              toAddress: "applicant@example.com",
              subject: "Hello",
              emailBody: "Hello",
            });

          expect(preview.status).toBe(200);
          expect(preview.body.fromEmail).toBe("office@example.org");
        });
      });
    });
  });
});
