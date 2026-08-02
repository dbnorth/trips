/**
 * Feature 3 — Organizations & Agreements
 * Spec: features/feature-3-organizations-and-agreements.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  TINY_PNG,
} from "./helpers.js";

describe("Feature 3 — Organizations & Agreements", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-3.1 — Administer organizations", () => {
    it("System Admin creates an organization", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "create-org@example.com",
      });

      const create = await request(app)
        .post("/trips/organizations")
        .set(authHeader)
        .send({ name: "New Ministry" });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({ name: "New Ministry" });
      expect(create.body.id).toBeDefined();

      const list = await request(app).get("/trips/organizations").set(authHeader);

      expect(list.status).toBe(200);
      expect(list.body.map((o) => o.id)).toContain(create.body.id);
      expect(list.body.find((o) => o.id === create.body.id).name).toBe("New Ministry");
    });

    it("Non-admin cannot create an organization", async () => {
      const { authHeader } = await registerUser({
        email: "not-sysadmin@example.com",
      });

      const response = await request(app)
        .post("/trips/organizations")
        .set(authHeader)
        .send({ name: "Denied Org" });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Forbidden/i);
    });
  });

  describe("US-3.2 — Org Admin updates org profile and logo", () => {
    it("Org Admin updates branding color and logo", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "branding@example.com",
        orgName: "Brand Org",
      });

      const update = await request(app)
        .put(`/trips/organizations/${org.id}`)
        .set(authHeader)
        .send({ version: 0, colorFamily: "teal" });

      expect(update.status).toBe(200);
      expect(update.body.colorFamily).toBe("teal");

      const logo = await request(app)
        .put(`/trips/organizations/${org.id}/logo`)
        .set(authHeader)
        .attach("logo", TINY_PNG, { filename: "logo.png", contentType: "image/png" });

      expect(logo.status).toBe(200);
      expect(logo.body.logo).toMatch(/^logos\//);

      const stored = await db.organization.findByPk(org.id);
      expect(stored.colorFamily).toBe("teal");
      expect(stored.logo).toBe(logo.body.logo);
    });
  });

  describe("US-3.3 — Manage participant agreement", () => {
    it("Org Admin saves agreement markdown", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "agreement@example.com",
        orgName: "Agreement Org",
      });
      const markdown = "# Participant Agreement\n\nI agree to the terms.";

      const save = await request(app)
        .put(`/trips/organizations/${org.id}/agreement`)
        .set(authHeader)
        .send({ content: markdown });

      expect(save.status).toBe(200);
      expect(save.body.content).toBe(markdown);
      expect(save.body.exists).toBe(true);
      expect(save.body.agreementFileName).toMatch(/participant-agreement/);

      const get = await request(app)
        .get(`/trips/organizations/${org.id}/agreement`)
        .set(authHeader);

      expect(get.status).toBe(200);
      expect(get.body.content).toBe(markdown);
      expect(get.body.exists).toBe(true);
    });
  });
});
