/**
 * Feature 70 — Email Password Reset and Failed Sign-In Limits (limits)
 * Spec: features/feature-70-password-reset-and-login-limits.md
 */

import crypto from "crypto";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

const LOCKED_MESSAGE =
  "Too many failed sign-in attempts. Try again in 15 minutes or reset your password.";
const TOO_MANY_MESSAGE = "Too many attempts. Please try again later.";

describe("Feature 70 — Failed Sign-In Limits", () => {
  let ana;

  const login = (password, { email = "ana@example.org", ip = "198.51.100.10" } = {}) =>
    request(app).post("/trips/login").set("X-Forwarded-For", ip).send({ email, password });

  const failTimes = async (count) => {
    for (let i = 0; i < count; i += 1) {
      const res = await login("wrong-password");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password.");
    }
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    ana = await registerUser({
      email: "ana@example.org",
      firstName: "Ana",
      lastName: "Lopez",
      password: "right-pass1",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-70.3 — Repeated wrong passwords are stopped", () => {
    it("Five wrong passwords lock the account", async () => {
      await failTimes(5);

      const res = await login("right-pass1");

      expect(res.status).toBe(429);
      expect(res.body.message).toBe(LOCKED_MESSAGE);
      const user = await db.user.unscoped().findByPk(ana.user.userId);
      expect(user.lockedUntil.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    });

    it("The lock ends after 15 minutes", async () => {
      await failTimes(5);
      expect((await login("right-pass1")).status).toBe(429);
      await db.user.update(
        { lockedUntil: new Date(Date.now() - 1000) },
        { where: { id: ana.user.userId } }
      );

      const res = await login("right-pass1");

      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it("A successful sign-in clears the count", async () => {
      await failTimes(4);
      expect((await login("right-pass1")).status).toBe(200);

      await failTimes(4);

      expect((await login("right-pass1")).status).toBe(200);
      const user = await db.user.unscoped().findByPk(ana.user.userId);
      expect(user.failedLoginCount).toBe(0);
      expect(user.lockedUntil).toBeNull();
    });

    it("Resetting the password unlocks the account", async () => {
      await failTimes(5);
      expect((await login("right-pass1")).status).toBe(429);
      const token = crypto.randomBytes(32).toString("base64url");
      await db.passwordResetToken.create({
        userId: ana.user.userId,
        tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const reset = await request(app)
        .post("/trips/reset-password")
        .send({ token, newPassword: "new-password1" });
      expect(reset.status).toBe(200);

      expect((await login("new-password1")).status).toBe(200);
    });

    it("Too many failed sign-ins from one IP address are slowed", async () => {
      const ip = "203.0.113.7";
      for (let i = 0; i < 20; i += 1) {
        const res = await login("wrong-password", { email: `nobody${i}@example.org`, ip });
        expect(res.status).toBe(401);
      }

      const res = await login("right-pass1", { ip });

      expect(res.status).toBe(429);
      expect(res.body.message).toBe(TOO_MANY_MESSAGE);
      expect((await login("right-pass1", { ip: "203.0.113.8" })).status).toBe(200);
    });

    it("Too many reset requests from one IP address are slowed", async () => {
      const ip = "203.0.113.9";
      const forgot = (email) =>
        request(app).post("/trips/forgot-password").set("X-Forwarded-For", ip).send({ email });
      for (let i = 0; i < 10; i += 1) {
        expect((await forgot(`nobody${i}@example.org`)).status).toBe(200);
      }

      const res = await forgot("ana@example.org");

      expect(res.status).toBe(429);
      expect(res.body.message).toBe(TOO_MANY_MESSAGE);
    });
  });
});
