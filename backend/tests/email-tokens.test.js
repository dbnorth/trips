/**
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
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

describe("Feature 40 — Email Template Tokens and Preview", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
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
