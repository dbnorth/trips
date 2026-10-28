/**
 * Feature 93 — Org Admins Edit Their Organization
 * Spec: features/feature-93-org-admin-edit-organization.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrganization,
  createOrgAdminUser,
  assignOrgRole,
} from "./helpers.js";

describe("Feature 93 — Org Admins Edit Their Organization", () => {
  let omar;
  let hope;
  let grace;
  let mercy;

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    hope = await db.organization.create({ name: "Hope Missions", subdomain: "hope" });
    grace = await createOrganization("Grace Clinics");
    mercy = await createOrganization("Mercy Teams");
    omar = await createOrgAdminUser({ email: "omar@example.org", org: hope });
    await assignOrgRole(grace.id, omar.user.personId, "Org Admin");
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-93.1 — Org Admins open Organizations from the menu bar", () => {
    it("Org Admins list only their organizations", async () => {
      const list = await request(app).get("/trips/organizations").set(omar.authHeader);

      expect(list.status).toBe(200);
      expect(list.body.map((org) => org.name)).toEqual(["Grace Clinics", "Hope Missions"]);
    });
  });

  describe("US-93.2 — Org Admins edit only their own organization", () => {
    it("The API refuses other organizations", async () => {
      const refused = await request(app)
        .put(`/trips/organizations/${mercy.id}`)
        .set(omar.authHeader)
        .send({ email: "taken@mercy.org" });
      expect(refused.status).toBe(403);
      expect(refused.body.message).toBe("Forbidden.");
      await mercy.reload();
      expect(mercy.email).toBeNull();

      const saved = await request(app)
        .put(`/trips/organizations/${hope.id}`)
        .set(omar.authHeader)
        .send({ email: "office@hopemissions.org", subdomain: "changed" });
      expect(saved.status).toBe(200);
      await hope.reload();
      expect(hope.email).toBe("office@hopemissions.org");
      expect(hope.subdomain).toBe("hope");

      const create = await request(app)
        .post("/trips/organizations")
        .set(omar.authHeader)
        .send({ name: "Omar's Org" });
      expect(create.status).toBe(403);
    });
  });
});
