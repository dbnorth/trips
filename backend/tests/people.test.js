/**
 * Feature 11 — People Directory Includes All Persons for System Admin
 * Spec: features/feature-11-people-list-all-orgs-includes-admin.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrganization,
  createSystemAdminUser,
  assignOrgRole,
} from "./helpers.js";

describe("Feature 11 — People list all-orgs includes admin", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-11.1 — See myself (and all persons) when listing all orgs", () => {
    it("System admin sees self with all organizations selected", async () => {
      const { authHeader, user } = await createSystemAdminUser({
        email: "self-admin@example.com",
      });

      const memberships = await db.orgPeopleRole.findAll({
        where: { peopleId: user.personId },
      });
      expect(memberships).toHaveLength(0);

      const response = await request(app).get("/trips/people").set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((p) => p.id)).toContain(user.personId);
    });

    it("System admin all-orgs list includes person without org role", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "list-admin@example.com",
      });
      const orphan = await db.person.create({
        firstName: "Orphan",
        lastName: "Person",
        email: "orphan.person@example.com",
      });

      const response = await request(app).get("/trips/people").set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.map((p) => p.id)).toContain(orphan.id);
    });

    it("System admin single-org scope still filters by membership", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "scope-admin@example.com",
      });
      const orgA = await createOrganization("Org A");
      const orgB = await createOrganization("Org B");

      const inB = await registerUser({
        email: "only-in-b@example.com",
        firstName: "Only",
        lastName: "InB",
        orgIds: [orgB.id],
      });
      await assignOrgRole(orgB.id, inB.user.personId, "Trip Participant");

      const inA = await registerUser({
        email: "only-in-a@example.com",
        firstName: "Only",
        lastName: "InA",
        orgIds: [orgA.id],
      });

      const response = await request(app)
        .get("/trips/people")
        .set(authHeader)
        .set("X-Acting-Organization-Id", String(orgA.id));

      expect(response.status).toBe(200);
      const ids = response.body.map((p) => p.id);
      expect(ids).toContain(inA.user.personId);
      expect(ids).not.toContain(inB.user.personId);
    });
  });
});
