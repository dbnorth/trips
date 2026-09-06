/**
 * Feature 1 — User Authentication & Sessions
 * Spec: features/feature-1-user-authentication.md
 */

import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrganization,
} from "./helpers.js";

const validRegistration = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  password: "password123",
};

describe("Feature 1 — User Authentication & Sessions", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-1.1 — Register an account", () => {
    it("User registers with valid information", async () => {
      const response = await request(app).post("/trips/register").send(validRegistration);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: expect.any(Number),
        personId: expect.any(Number),
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Doe",
        token: expect.any(String),
        isAdmin: false,
      });

      const userRecord = await db.user.unscoped().findByPk(response.body.userId);
      expect(userRecord).not.toBeNull();
      expect(await bcrypt.compare("password123", userRecord.password)).toBe(true);

      const person = await db.person.findByPk(response.body.personId);
      expect(person).not.toBeNull();
      expect(person.email).toBe("jane@example.com");

      const sessionCount = await db.session.count({
        where: { userId: response.body.userId, token: response.body.token },
      });
      expect(sessionCount).toBe(1);
    });

    it("User registers with optional organizations", async () => {
      const org = await createOrganization("Alpha Org");

      const response = await request(app)
        .post("/trips/register")
        .send({ ...validRegistration, orgIds: [org.id] });

      expect(response.status).toBe(200);
      expect(response.body.orgRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            orgId: org.id,
            roleName: "Trip Participant",
          }),
        ])
      );

      const memberships = await db.orgPeopleRole.count({
        where: { peopleId: response.body.personId, orgId: org.id },
      });
      expect(memberships).toBe(1);
    });

    it("User registers with duplicate email", async () => {
      await request(app).post("/trips/register").send(validRegistration);

      const response = await request(app)
        .post("/trips/register")
        .send({
          ...validRegistration,
          firstName: "Other",
          lastName: "Person",
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/already exists/i);

      const userCount = await db.user.count({ where: { email: "jane@example.com" } });
      expect(userCount).toBe(1);
    });

    it("User registers with password too short", async () => {
      const response = await request(app)
        .post("/trips/register")
        .send({ ...validRegistration, password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Password must be at least 8 characters.");
    });
  });

  describe("US-1.2 — Sign in with email and password", () => {
    beforeEach(async () => {
      await request(app).post("/trips/register").send(validRegistration);
    });

    it("User signs in with valid credentials", async () => {
      const response = await request(app)
        .post("/trips/login")
        .send({ email: "jane@example.com", password: "password123" });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: expect.any(Number),
        email: "jane@example.com",
        token: expect.any(String),
        orgRoles: expect.any(Array),
        tripRoles: expect.any(Array),
      });
    });

    it("User signs in with invalid password", async () => {
      const response = await request(app)
        .post("/trips/login")
        .send({ email: "jane@example.com", password: "wrongpassword" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid email or password.");
    });
  });

  describe("US-1.3 — Persist session in the browser", () => {
    it("Authenticated API request includes Bearer token", async () => {
      const { token, authHeader } = await registerUser({
        email: "bearer@example.com",
      });

      const response = await request(app).get("/trips/me").set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.token).toBe(token);
      expect(response.body.email).toBe("bearer@example.com");
    });

    it("Expired token clears session", async () => {
      const { response: reg } = await registerUser({ email: "expire@example.com" });
      const session = await db.session.findOne({ where: { userId: reg.body.userId } });
      await session.update({
        token: "",
        expirationDate: new Date(Date.now() - 60_000),
      });

      const response = await request(app)
        .get("/trips/me")
        .set({ Authorization: `Bearer ${reg.body.token}` });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-1.4 — Sign out and change password", () => {
    it("User signs out", async () => {
      const { token, authHeader, response: reg } = await registerUser({
        email: "logout@example.com",
      });

      const response = await request(app)
        .post("/trips/logout")
        .set(authHeader)
        .send({ token });

      expect(response.status).toBe(200);

      const session = await db.session.findOne({ where: { userId: reg.body.userId } });
      expect(session.token).toBe("");

      const me = await request(app).get("/trips/me").set(authHeader);
      expect(me.status).toBe(401);
    });

    it("User changes password", async () => {
      const { authHeader } = await registerUser({
        email: "changepw@example.com",
        password: "password123",
      });

      const change = await request(app)
        .post("/trips/change-password")
        .set(authHeader)
        .send({ currentPassword: "password123", newPassword: "newpassword1" });

      expect(change.status).toBe(200);

      const oldLogin = await request(app)
        .post("/trips/login")
        .send({ email: "changepw@example.com", password: "password123" });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app)
        .post("/trips/login")
        .send({ email: "changepw@example.com", password: "newpassword1" });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.token).toEqual(expect.any(String));
    });
  });

  describe("US-1.5 — Guard protected routes and APIs", () => {
    it("API without token is rejected", async () => {
      const response = await request(app).get("/trips/me");

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/Unauthorized/i);
    });
  });

  describe("US-1.6 — Apply-funnel sign-in and create account", () => {
    it("Applicant creates account from apply flow", async () => {
      const org = await createOrganization("Apply Org");

      const response = await request(app)
        .post("/trips/register")
        .send({
          ...validRegistration,
          email: "applicant@example.com",
          orgIds: [org.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.orgRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ orgId: org.id, roleName: "Trip Participant" }),
        ])
      );
    });
  });

  describe("US-15.2 — Register under a matching subdomain", () => {
    it("Visitor registers on org subdomain and joins that org", async () => {
      const org = await createOrganization("Hope Mission");
      await org.update({ subdomain: "hope" });

      const response = await request(app)
        .post("/trips/register")
        .send({
          ...validRegistration,
          email: "subdomain-user@example.com",
          subdomain: "hope",
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeTruthy();
      expect(response.body.orgRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ orgId: org.id, roleName: "Trip Participant" }),
        ])
      );
    });

    it("Unknown subdomain on register is rejected", async () => {
      const response = await request(app)
        .post("/trips/register")
        .send({
          ...validRegistration,
          email: "unknown-sub@example.com",
          subdomain: "nope",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/subdomain/i);

      const user = await db.user.findOne({ where: { email: "unknown-sub@example.com" } });
      expect(user).toBeNull();
    });
  });

  describe("Feature 20 — Person Middle Name", () => {
    it("Registration saves middle name on the person", async () => {
      const response = await request(app).post("/trips/register").send({
        firstName: "Jane",
        middleName: "Marie",
        lastName: "Doe",
        email: "jane.middle@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.middleName).toBe("Marie");

      const person = await db.person.findByPk(response.body.personId);
      expect(person.middleName).toBe("Marie");

      const get = await request(app)
        .get(`/trips/people/${response.body.personId}`)
        .set({ Authorization: `Bearer ${response.body.token}` });
      expect(get.status).toBe(200);
      expect(get.body.middleName).toBe("Marie");
    });
  });
});
