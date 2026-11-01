/**
 * Feature 99 — Org Admins Assign Organization Roles
 * Spec: features/feature-99-org-admin-assign-roles.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import ensureSchema from "../app/scripts/ensureSchema.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  createOrganization,
  findRole,
} from "./helpers.js";

const LAST_ORG_ADMIN = "An organization must keep at least one Org Admin.";

const roleId = async (roleName) => (await findRole(roleName)).id;

/** Olivia is the only Org Admin of Hope Missions; Ana is in Hope Missions and Grace Outreach; Ben only in Grace Outreach. */
const setup = async () => {
  await ensureSchema();
  const olivia = await createOrgAdminUser({ email: "f99-olivia@example.com", orgName: "Hope Missions" });
  const hope = olivia.org;
  const grace = await createOrganization("Grace Outreach");

  const ana = await registerUser({ email: "f99-ana@example.com", firstName: "Ana", lastName: "Lopez" });
  const anaHope = await db.orgPeopleRole.create({
    orgId: hope.id,
    peopleId: ana.user.personId,
    roleId: await roleId("Trip Participant"),
  });
  const anaGrace = await db.orgPeopleRole.create({
    orgId: grace.id,
    peopleId: ana.user.personId,
    roleId: await roleId("Trip Leader"),
  });

  const ben = await registerUser({ email: "f99-ben@example.com", firstName: "Ben", lastName: "Ruiz" });
  await db.orgPeopleRole.create({
    orgId: grace.id,
    peopleId: ben.user.personId,
    roleId: await roleId("Pending User"),
  });

  const oliviaAdminRow = await db.orgPeopleRole.findOne({
    where: { orgId: hope.id, peopleId: olivia.user.personId },
  });

  return { olivia, hope, grace, ana, anaHope, anaGrace, ben, oliviaAdminRow };
};

const rolesIn = async (orgId, peopleId) => {
  const rows = await db.orgPeopleRole.findAll({
    where: { orgId, peopleId },
    include: [{ model: db.role, as: "role" }],
  });
  return rows.map((r) => r.role.roleName).sort();
};

describe("Feature 99 — Org Admins Assign Organization Roles", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-99.1 — Org Admin adds roles to people in their organization", () => {
    it("An Org Admin lists only their organization's roles for a person", async () => {
      const { olivia, hope, ana } = await setup();

      const res = await request(app)
        .get("/trips/org-people-roles")
        .query({ peopleId: ana.user.personId })
        .set(olivia.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.map((r) => [r.orgId, r.role.roleName])).toEqual([[hope.id, "Trip Participant"]]);
    });

    it("An Org Admin adds any role to a person in their organization", async () => {
      const { olivia, hope, ana } = await setup();

      for (const roleName of ["Org Admin", "Trip Leader", "Pending User", "Agent"]) {
        const res = await request(app)
          .post("/trips/org-people-roles")
          .set(olivia.authHeader)
          .send({ orgId: hope.id, peopleId: ana.user.personId, roleId: await roleId(roleName) });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Organization role added.");
      }

      expect(await rolesIn(hope.id, ana.user.personId)).toEqual(
        ["Agent", "Org Admin", "Pending User", "Trip Leader", "Trip Participant"]
      );
    });
  });

  describe("US-99.2 — Org Admin removes roles, keeping at least one Org Admin", () => {
    it("An Org Admin removes a role", async () => {
      const { olivia, hope, ana } = await setup();
      const leader = await db.orgPeopleRole.create({
        orgId: hope.id,
        peopleId: ana.user.personId,
        roleId: await roleId("Trip Leader"),
      });

      const res = await request(app).delete(`/trips/org-people-roles/${leader.id}`).set(olivia.authHeader);

      expect(res.status).toBe(200);
      expect(await rolesIn(hope.id, ana.user.personId)).toEqual(["Trip Participant"]);
    });

    it("The last Org Admin role cannot be removed", async () => {
      const { olivia, hope, oliviaAdminRow } = await setup();
      const sys = await createSystemAdminUser({ email: "f99-sys@example.com" });

      for (const authHeader of [olivia.authHeader, sys.authHeader]) {
        const removed = await request(app)
          .delete(`/trips/org-people-roles/${oliviaAdminRow.id}`)
          .set(authHeader);
        expect(removed.status).toBe(400);
        expect(removed.body.message).toBe(LAST_ORG_ADMIN);

        const changed = await request(app)
          .put(`/trips/org-people-roles/${oliviaAdminRow.id}`)
          .set(authHeader)
          .send({ roleId: await roleId("Trip Leader") });
        expect(changed.status).toBe(400);
        expect(changed.body.message).toBe(LAST_ORG_ADMIN);
      }

      expect(await rolesIn(hope.id, olivia.user.personId)).toEqual(["Org Admin"]);
    });

    it("An Org Admin role can be removed while another remains", async () => {
      const { olivia, hope, ana, oliviaAdminRow } = await setup();
      const made = await request(app)
        .post("/trips/org-people-roles")
        .set(olivia.authHeader)
        .send({ orgId: hope.id, peopleId: ana.user.personId, roleId: await roleId("Org Admin") });
      expect(made.status).toBe(200);

      const res = await request(app)
        .delete(`/trips/org-people-roles/${oliviaAdminRow.id}`)
        .set(olivia.authHeader);

      expect(res.status).toBe(200);
      expect(await rolesIn(hope.id, olivia.user.personId)).toEqual([]);
      expect(await rolesIn(hope.id, ana.user.personId)).toEqual(["Org Admin", "Trip Participant"]);
    });
  });

  describe("US-99.3 — Org Admins stay inside their own organizations", () => {
    it("An Org Admin cannot change roles in another organization", async () => {
      const { olivia, grace, ana, anaHope, anaGrace } = await setup();

      const added = await request(app)
        .post("/trips/org-people-roles")
        .set(olivia.authHeader)
        .send({ orgId: grace.id, peopleId: ana.user.personId, roleId: await roleId("Agent") });
      expect(added.status).toBe(403);
      expect(added.body.message).toBe("Forbidden.");

      const removed = await request(app).delete(`/trips/org-people-roles/${anaGrace.id}`).set(olivia.authHeader);
      expect(removed.status).toBe(403);

      const moved = await request(app)
        .put(`/trips/org-people-roles/${anaHope.id}`)
        .set(olivia.authHeader)
        .send({ orgId: grace.id });
      expect(moved.status).toBe(403);

      expect(await rolesIn(grace.id, ana.user.personId)).toEqual(["Trip Leader"]);
      expect((await db.orgPeopleRole.findByPk(anaHope.id)).orgId).toBe(anaHope.orgId);
    });

    it("An Org Admin cannot add roles to someone outside their organization", async () => {
      const { olivia, hope, ben } = await setup();

      const res = await request(app)
        .post("/trips/org-people-roles")
        .set(olivia.authHeader)
        .send({ orgId: hope.id, peopleId: ben.user.personId, roleId: await roleId("Trip Participant") });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
      expect(await rolesIn(hope.id, ben.user.personId)).toEqual([]);
    });

    it("People who aren't Org Admins still cannot list a person's roles", async () => {
      const { ana, ben } = await setup();

      const res = await request(app)
        .get("/trips/org-people-roles")
        .query({ peopleId: ben.user.personId })
        .set(ana.authHeader);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden.");
    });
  });
});
