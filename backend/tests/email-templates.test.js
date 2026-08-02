/**
 * Feature 10 — Email Templates
 * Spec: features/feature-10-email-templates.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
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
});
