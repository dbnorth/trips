/**
 * Feature 39 — Email Types and Organization Email Templates
 * Spec: features/feature-39-email-types-and-templates.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createSystemAdminUser,
  registerUser,
} from "./helpers.js";

describe("Feature 39 — Email Types and Organization Email Templates", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-39.1 — Maintain email types", () => {
    it("Email type is saved", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "email-type-admin@example.com",
      });

      const create = await request(app)
        .post("/trips/email-types")
        .set(authHeader)
        .send({
          typeCode: "apply-received",
          description: "Application received",
          eventCode: "application-submitted",
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        typeCode: "apply-received",
        description: "Application received",
        eventCode: "application-submitted",
      });

      const loaded = await request(app)
        .get(`/trips/email-types/${create.body.id}`)
        .set(authHeader);

      expect(loaded.status).toBe(200);
      expect(loaded.body).toMatchObject({
        typeCode: "apply-received",
        description: "Application received",
        eventCode: "application-submitted",
      });
    });

    it("A non-admin cannot create an email type", async () => {
      const { authHeader } = await registerUser({
        email: "email-type-user@example.com",
      });

      const create = await request(app)
        .post("/trips/email-types")
        .set(authHeader)
        .send({
          typeCode: "apply-received",
          description: "Application received",
          eventCode: "application-submitted",
        });

      expect(create.status).toBe(403);
    });
  });
});
