/**
 * Feature 68 — Add Person and Create Account Refuse an Email That Already Exists
 * Spec: features/feature-68-add-person-existing-email.md
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
  findRole,
} from "./helpers.js";

const EXISTS_MESSAGE = "A person with this email already exists.";

const signIn = (email, password) => request(app).post("/trips/login").send({ email, password });

/** A registered user in their own organization. */
const createExistingUser = async () => {
  const otherOrg = await createOrganization("Other Org");
  const victim = await registerUser({
    email: "taken@example.com",
    password: "original-pass",
    firstName: "Victim",
    lastName: "Original",
    orgIds: [otherOrg.id],
  });
  return victim;
};

describe("Feature 68 — Add Person and Create Account Refuse an Email That Already Exists", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-68.1 — Adding a person never changes an existing account", () => {
    it("Add person with an existing user's email is refused and changes nothing", async () => {
      const victim = await createExistingUser();
      const { authHeader, org } = await createOrgAdminUser({ email: "admin@example.com" });
      const participantRole = await findRole("Trip Participant");

      const response = await request(app)
        .post("/trips/people")
        .set(authHeader)
        .send({
          firstName: "Victim",
          lastName: "Changed",
          email: "taken@example.com",
          password: "attacker-pass",
          orgId: org.id,
          roleId: participantRole.id,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(EXISTS_MESSAGE);
      expect((await signIn("taken@example.com", "original-pass")).status).toBe(200);
      expect((await signIn("taken@example.com", "attacker-pass")).status).toBe(401);
      const person = await db.person.findByPk(victim.user.personId);
      expect(person.lastName).toBe("Original");
      const membership = await db.orgPeopleRole.findOne({
        where: { peopleId: victim.user.personId, orgId: org.id },
      });
      expect(membership).toBeNull();
    });

    it("Add person with the email of a person without a login is refused", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "admin@example.com" });
      const participantRole = await findRole("Trip Participant");
      await db.person.create({ firstName: "No", lastName: "Login", email: "nologin@example.com" });

      const response = await request(app)
        .post("/trips/people")
        .set(authHeader)
        .send({
          firstName: "No",
          lastName: "Login",
          email: "nologin@example.com",
          orgId: org.id,
          roleId: participantRole.id,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(EXISTS_MESSAGE);
      expect(await db.person.count({ where: { email: "nologin@example.com" } })).toBe(1);
      expect(await db.user.count({ where: { email: "nologin@example.com" } })).toBe(0);
    });

    it("Email match ignores case and spaces", async () => {
      await createExistingUser();
      const { authHeader, org } = await createOrgAdminUser({ email: "admin@example.com" });
      const participantRole = await findRole("Trip Participant");

      const response = await request(app)
        .post("/trips/people")
        .set(authHeader)
        .send({
          firstName: "Victim",
          lastName: "Original",
          email: " Taken@Example.COM ",
          orgId: org.id,
          roleId: participantRole.id,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(EXISTS_MESSAGE);
    });

    it("System Admin adding an existing email is refused", async () => {
      const victim = await createExistingUser();
      const { authHeader } = await createSystemAdminUser({ email: "sysadmin@example.com" });

      const response = await request(app)
        .post("/trips/people")
        .set(authHeader)
        .send({
          firstName: "Victim",
          lastName: "Original",
          email: "taken@example.com",
          password: "attacker-pass",
          isAdmin: true,
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(EXISTS_MESSAGE);
      expect((await signIn("taken@example.com", "original-pass")).status).toBe(200);
      const user = await db.user.findByPk(victim.user.userId);
      expect(user.isAdmin).toBe(false);
    });

    it("Add person with a new email still creates the person", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "admin@example.com" });
      const participantRole = await findRole("Trip Participant");

      const response = await request(app)
        .post("/trips/people")
        .set(authHeader)
        .send({
          firstName: "Brand",
          lastName: "New",
          email: "brand.new@example.com",
          orgId: org.id,
          roleId: participantRole.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Person created.");
      const person = await db.person.findOne({ where: { email: "brand.new@example.com" } });
      expect(person).not.toBeNull();
      const membership = await db.orgPeopleRole.findOne({
        where: { peopleId: person.id, orgId: org.id },
      });
      expect(membership.roleId).toBe(participantRole.id);
    });
  });

  describe("US-68.3 — Creating an account never changes an existing account", () => {
    const ACCOUNT_EXISTS = "An account with this email already exists. Please log in instead.";

    it("Creating an account with an email already used is refused and changes nothing", async () => {
      const victim = await createExistingUser();
      const newOrg = await createOrganization("New Org");

      const response = await registerUser({
        email: "taken@example.com",
        password: "attacker-pass",
        firstName: "Victim",
        lastName: "Changed",
        orgIds: [newOrg.id],
      });

      expect(response.response.status).toBe(409);
      expect(response.response.body.message).toBe(ACCOUNT_EXISTS);
      expect(response.token).toBeUndefined();
      expect((await signIn("taken@example.com", "original-pass")).status).toBe(200);
      expect((await signIn("taken@example.com", "attacker-pass")).status).toBe(401);
      const person = await db.person.findByPk(victim.user.personId);
      expect(person.lastName).toBe("Original");
      const membership = await db.orgPeopleRole.findOne({
        where: { peopleId: victim.user.personId, orgId: newOrg.id },
      });
      expect(membership).toBeNull();
    });

    it("Creating an account with the email of a person without a login is refused", async () => {
      await db.person.create({ firstName: "No", lastName: "Login", email: "nologin@example.com" });

      const response = await registerUser({
        email: "nologin@example.com",
        password: "attacker-pass",
        firstName: "No",
        lastName: "Login",
      });

      expect(response.response.status).toBe(409);
      expect(response.response.body.message).toBe(ACCOUNT_EXISTS);
      expect(await db.person.count({ where: { email: "nologin@example.com" } })).toBe(1);
      expect(await db.user.count({ where: { email: "nologin@example.com" } })).toBe(0);
    });

    it("Create account email match ignores case and spaces", async () => {
      await createExistingUser();

      const response = await registerUser({
        email: " Taken@Example.COM ",
        password: "attacker-pass",
        firstName: "Victim",
        lastName: "Original",
      });

      expect(response.response.status).toBe(409);
      expect(response.response.body.message).toBe(ACCOUNT_EXISTS);
      expect((await signIn("taken@example.com", "original-pass")).status).toBe(200);
    });
  });
});
