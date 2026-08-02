/**
 * Feature 11 — People Directory Includes All Persons for System Admin
 * Spec: features/feature-11-people-list-all-orgs-includes-admin.md
 * Feature 2 — People & Org Membership
 * Spec: features/feature-2-people-and-org-membership.md
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
  createOrgAdminUser,
  assignOrgRole,
  findRole,
  TINY_PNG,
} from "./helpers.js";

describe("Feature 2 — People & Org Membership", () => {
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
  describe("US-2.1 — Manage people directory", () => {
    it("Org Admin lists people in scope", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "lister@example.com",
        orgName: "List Org",
      });

      const otherOrg = await createOrganization("Other Org");
      const outsider = await registerUser({
        email: "outsider@example.com",
        firstName: "Out",
        lastName: "Sider",
        orgIds: [otherOrg.id],
      });

      const insider = await registerUser({
        email: "insider@example.com",
        firstName: "In",
        lastName: "Sider",
        orgIds: [org.id],
      });

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
      const ids = response.body.map((p) => p.id);
      expect(ids).toContain(insider.user.personId);
      expect(ids).not.toContain(outsider.user.personId);
    });

    it("Org Admin creates a person", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "creator@example.com",
      });
      const participantRole = await findRole("Trip Participant");

      const response = await request(app)
        .post("/trips/people")
        .set(authHeader)
        .send({
          firstName: "New",
          lastName: "Person",
          email: "new.person@example.com",
          orgId: org.id,
          roleId: participantRole.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.person).toMatchObject({
        firstName: "New",
        lastName: "Person",
        email: "new.person@example.com",
      });

      const stored = await db.person.findOne({ where: { email: "new.person@example.com" } });
      expect(stored).not.toBeNull();

      const membership = await db.orgPeopleRole.findOne({
        where: { peopleId: stored.id, orgId: org.id },
      });
      expect(membership).not.toBeNull();
      expect(membership.roleId).toBe(participantRole.id);
    });
  });

  describe("US-2.2 — Complete and update my profile", () => {
    it("User updates own profile", async () => {
      const { authHeader, user } = await registerUser({
        email: "profile@example.com",
        firstName: "Pat",
        lastName: "Profile",
      });

      const response = await request(app)
        .put(`/trips/people/${user.personId}`)
        .set(authHeader)
        .send({
          version: 0,
          addLine1: "123 Main St",
          city: "Springfield",
          country: "US",
          state_prov: "IL",
          postalCode: "62701",
          phoneContryCode: "1",
          phoneNumber: "5551234567",
          birthDate: "1990-05-15",
          gender: "female",
          emergencyContactName: "Sam Profile",
          emergencyContactPhoneCountryCode: "1",
          emergencyContactPhoneNumber: "5559876543",
          hasAllergies: false,
          currentChurchHome: "First Church",
          currentChurchHomeCity: "Springfield",
          currentChurchHomeStateProv: "IL",
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        addLine1: "123 Main St",
        city: "Springfield",
        emergencyContactName: "Sam Profile",
        version: 1,
      });

      const get = await request(app)
        .get(`/trips/people/${user.personId}`)
        .set(authHeader);
      expect(get.status).toBe(200);
      expect(get.body.city).toBe("Springfield");
      expect(get.body.emergencyContactName).toBe("Sam Profile");
    });

    it("User uploads a profile picture", async () => {
      const { authHeader, user } = await registerUser({
        email: "picture@example.com",
      });

      const response = await request(app)
        .put(`/trips/people/${user.personId}/picture`)
        .set(authHeader)
        .attach("picture", TINY_PNG, { filename: "avatar.png", contentType: "image/png" });

      expect(response.status).toBe(200);
      expect(response.body.picture).toMatch(/^people\/person-/);

      const person = await db.person.findByPk(user.personId);
      expect(person.picture).toBe(response.body.picture);
    });
  });

  describe("US-2.3 — Assign organization roles", () => {
    it("Assign Trip Leader org role", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "roleadmin@example.com",
      });
      const member = await registerUser({
        email: "leader.candidate@example.com",
        firstName: "Lee",
        lastName: "Leader",
        orgIds: [org.id],
      });
      const tripLeaderRole = await findRole("Trip Leader");

      const response = await request(app)
        .post("/trips/org-people-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          peopleId: member.user.personId,
          roleId: tripLeaderRole.id,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        orgId: org.id,
        peopleId: member.user.personId,
        roleId: tripLeaderRole.id,
      });
      expect(response.body.role?.roleName || response.body.roleName).toBeTruthy();

      const leaders = await request(app)
        .get("/trips/people/org-trip-leaders")
        .query({ orgId: org.id })
        .set(authHeader);

      expect(leaders.status).toBe(200);
      const leaderIds = leaders.body.map((p) => p.id);
      expect(leaderIds).toContain(member.user.personId);
    });
  });

  describe("US-2.4 — System admin user utilities", () => {
    it("Non-admin cannot list users", async () => {
      const { authHeader } = await registerUser({
        email: "notadmin@example.com",
      });

      const response = await request(app).get("/trips/users").set(authHeader);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Forbidden/i);
    });
  });
});
