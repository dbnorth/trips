/**
 * Feature 71 — System Admin Only Password and Login Email Changes
 * Spec: features/feature-71-system-admin-only-account-changes.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrganization,
  createOrgAdminUser,
  createSystemAdminUser,
  assignOrgRole,
} from "./helpers.js";

const PASSWORD_FORBIDDEN = "Forbidden. System admin required to set a password.";
const EMAIL_FORBIDDEN = "Forbidden. System admin required to change a login email.";

describe("Feature 71 — System Admin Only Password and Login Email Changes", () => {
  let orgA;
  let orgAdmin;
  let ana;

  const login = (email, password) => request(app).post("/trips/login").send({ email, password });

  const updatePerson = (personId, authHeader, body) =>
    request(app).put(`/trips/people/${personId}`).set(authHeader).send(body);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    orgA = await createOrganization("Org A");
    orgAdmin = await createOrgAdminUser({ email: "admin.a@example.org", org: orgA });
    ana = await registerUser({
      email: "ana@example.org",
      firstName: "Ana",
      lastName: "Lopez",
      password: "old-password1",
      orgIds: [orgA.id],
    });
  });

  describe("US-71.1 — Only System Admins set other people's passwords", () => {
    it("Org Admin cannot set a member's password", async () => {
      const res = await updatePerson(ana.user.personId, orgAdmin.authHeader, { password: "taken-over-1" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(PASSWORD_FORBIDDEN);
      expect((await login("ana@example.org", "old-password1")).status).toBe(200);
      expect((await login("ana@example.org", "taken-over-1")).status).toBe(401);
    });

    it("Org Admin cannot set a System Admin's password", async () => {
      const sys = await createSystemAdminUser({ email: "sys@example.org" });
      await assignOrgRole(orgA.id, sys.user.personId, "Trip Participant");

      const res = await updatePerson(sys.user.personId, orgAdmin.authHeader, { password: "taken-over-1" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(PASSWORD_FORBIDDEN);
      expect((await login("sys@example.org", "taken-over-1")).status).toBe(401);
    });

    it("A refused password change saves nothing", async () => {
      const res = await updatePerson(ana.user.personId, orgAdmin.authHeader, {
        firstName: "Changed",
        password: "taken-over-1",
      });

      expect(res.status).toBe(403);
      const person = await db.person.findByPk(ana.user.personId);
      expect(person.firstName).toBe("Ana");
    });

    it("System Admin sets a password and the person is signed out", async () => {
      const sys = await createSystemAdminUser({ email: "sys@example.org" });

      const res = await updatePerson(ana.user.personId, sys.authHeader, { password: "new-password1" });

      expect(res.status).toBe(200);
      expect((await request(app).get("/trips/me").set(ana.authHeader)).status).toBe(401);
      expect((await login("ana@example.org", "new-password1")).status).toBe(200);
    });
  });

  describe("US-71.2 — Only System Admins change login emails", () => {
    it("Org Admin cannot change a member's login email", async () => {
      const res = await updatePerson(ana.user.personId, orgAdmin.authHeader, { email: "attacker@example.org" });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(EMAIL_FORBIDDEN);
      expect((await login("ana@example.org", "old-password1")).status).toBe(200);
      expect(await db.user.findOne({ where: { email: "attacker@example.org" } })).toBeNull();
    });

    it("Org Admin saves a member with the same email", async () => {
      const res = await updatePerson(ana.user.personId, orgAdmin.authHeader, {
        email: " Ana@Example.ORG ",
        phoneNumber: "5551234567",
      });

      expect(res.status).toBe(200);
      const person = await db.person.findByPk(ana.user.personId);
      expect(person.phoneNumber).toBe("5551234567");
    });

    it("Org Admin can change the email of a person without a login account", async () => {
      const person = await db.person.create({ firstName: "No", lastName: "Login", email: "old@example.org" });
      await assignOrgRole(orgA.id, person.id, "Trip Participant");

      const res = await updatePerson(person.id, orgAdmin.authHeader, { email: "new@example.org" });

      expect(res.status).toBe(200);
      expect((await db.person.findByPk(person.id)).email).toBe("new@example.org");
    });

    it("A user can change their own login email", async () => {
      const res = await updatePerson(ana.user.personId, ana.authHeader, { email: "ana.new@example.org" });

      expect(res.status).toBe(200);
      expect((await login("ana.new@example.org", "old-password1")).status).toBe(200);
    });

    it("System Admin can change a login email", async () => {
      const sys = await createSystemAdminUser({ email: "sys@example.org" });

      const res = await updatePerson(ana.user.personId, sys.authHeader, { email: "ana.new@example.org" });

      expect(res.status).toBe(200);
      expect((await login("ana.new@example.org", "old-password1")).status).toBe(200);
    });
  });
});
