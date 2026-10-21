/**
 * Feature 70 — Email Password Reset and Failed Sign-In Limits (reset)
 * Spec: features/feature-70-password-reset-and-login-limits.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

const SENT_MESSAGE =
  "If an account exists for that email, we sent a link to reset your password. The link expires in 1 hour.";
const INVALID_MESSAGE = "This reset link is invalid or has expired. Please request a new one.";

describe("Feature 70 — Email Password Reset", () => {
  let savedMode;
  let savedDir;
  let savedAppUrl;
  let mailDir;
  let ana;

  const mailFiles = () => (fs.existsSync(mailDir) ? fs.readdirSync(mailDir) : []);
  const readMail = (file) => fs.readFileSync(path.join(mailDir, file), "utf8");
  const tokenFrom = (mail) => /\/reset-password\?token=([A-Za-z0-9_-]+)/.exec(mail)?.[1];

  const forgot = (email) => request(app).post("/trips/forgot-password").send({ email });

  /** Request a reset link for Ana and return the token from the email it sent. */
  const requestToken = async () => {
    const before = new Set(mailFiles());
    expect((await forgot("ana@example.org")).status).toBe(200);
    const sent = mailFiles().filter((file) => !before.has(file));
    expect(sent).toHaveLength(1);
    return tokenFrom(readMail(sent[0]));
  };
  const reset = (body) => request(app).post("/trips/reset-password").send(body);
  const login = (email, password) => request(app).post("/trips/login").send({ email, password });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedMode = process.env.EMAIL_MODE;
    savedDir = process.env.EMAIL_FILE_DIR;
    savedAppUrl = process.env.APP_URL;
    mailDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "trips-reset-")), "mail");
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = mailDir;
    process.env.APP_URL = "https://trips.example.org";
    ana = await registerUser({
      email: "ana@example.org",
      firstName: "Ana",
      lastName: "Lopez",
      password: "old-password",
    });
  });

  afterEach(async () => {
    process.env.EMAIL_MODE = savedMode;
    process.env.EMAIL_FILE_DIR = savedDir;
    if (savedAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = savedAppUrl;
    fs.rmSync(path.dirname(mailDir), { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-70.1 — Reset a forgotten password by email", () => {
    it("Request a reset link for my account", async () => {
      const res = await forgot(" Ana@Example.ORG ");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(SENT_MESSAGE);
      expect(mailFiles()).toHaveLength(1);
      const mail = readMail(mailFiles()[0]);
      expect(mail).toContain("To: ana@example.org");
      expect(mail).toContain("Subject: Reset your Mission Trips password");
      expect(mail).toContain("\n\nHi Ana,\n");
      expect(mail).toContain("https://trips.example.org/reset-password?token=");

      const token = tokenFrom(mail);
      const stored = await db.passwordResetToken.findOne({ where: { userId: ana.user.userId } });
      expect(stored.tokenHash).toBe(crypto.createHash("sha256").update(token).digest("hex"));
      expect(stored.tokenHash).not.toContain(token);

      const log = await db.emailLog.findOne({ where: { subject: "Reset your Mission Trips password" } });
      expect(log.toEmail).toBe("ana@example.org");
      expect(log.content).toContain("[reset link]");
      expect(log.content).not.toContain(token);
    });

    it("Reset the password with the emailed link", async () => {
      const token = await requestToken();

      const res = await reset({ token, newPassword: "new-password1" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Your password has been reset. Please sign in.");
      expect((await login("ana@example.org", "new-password1")).status).toBe(200);
      expect((await login("ana@example.org", "old-password")).status).toBe(401);
    });

    it("A reset signs out every session", async () => {
      await db.session.create({
        token: "second-device-token",
        email: "ana@example.org",
        expirationDate: new Date(Date.now() + 60 * 60 * 1000),
        userId: ana.user.userId,
      });
      const me = (token) => request(app).get("/trips/me").set({ Authorization: `Bearer ${token}` });
      expect((await me(ana.token)).status).toBe(200);
      expect((await me("second-device-token")).status).toBe(200);

      const token = await requestToken();
      expect((await reset({ token, newPassword: "new-password1" })).status).toBe(200);

      expect((await me(ana.token)).status).toBe(401);
      expect((await me("second-device-token")).status).toBe(401);
    });
  });

  describe("US-70.2 — Reset links cannot be misused", () => {
    it("Reset request for an unknown email reveals nothing", async () => {
      await db.person.create({ firstName: "No", lastName: "Login", email: "nologin@example.org" });

      for (const email of ["nobody@example.org", "nologin@example.org"]) {
        const res = await forgot(email);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe(SENT_MESSAGE);
      }
      expect(mailFiles()).toHaveLength(0);
      expect(await db.passwordResetToken.count()).toBe(0);
    });

    it("Expired link is refused", async () => {
      const token = await requestToken();
      await db.passwordResetToken.update(
        { expiresAt: new Date(Date.now() - 60 * 1000) },
        { where: { userId: ana.user.userId } }
      );

      const res = await reset({ token, newPassword: "new-password1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(INVALID_MESSAGE);
      expect((await login("ana@example.org", "old-password")).status).toBe(200);
    });

    it("Link works only once", async () => {
      const token = await requestToken();
      expect((await reset({ token, newPassword: "new-password1" })).status).toBe(200);

      const res = await reset({ token, newPassword: "another-pass1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(INVALID_MESSAGE);
      expect((await login("ana@example.org", "new-password1")).status).toBe(200);
    });

    it("A newer link replaces the older one", async () => {
      const first = await requestToken();
      const second = await requestToken();
      expect(second).not.toBe(first);

      const old = await reset({ token: first, newPassword: "new-password1" });
      expect(old.status).toBe(400);
      expect(old.body.message).toBe(INVALID_MESSAGE);

      expect((await reset({ token: second, newPassword: "new-password1" })).status).toBe(200);
    });

    it("Reset emails are capped per hour", async () => {
      for (let i = 0; i < 3; i += 1) await forgot("ana@example.org");
      expect(mailFiles()).toHaveLength(3);

      const res = await forgot("ana@example.org");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe(SENT_MESSAGE);
      expect(mailFiles()).toHaveLength(3);
    });

    it("Short new password is refused", async () => {
      const token = await requestToken();

      const res = await reset({ token, newPassword: "short" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password must be at least 8 characters.");
      expect((await reset({ token, newPassword: "new-password1" })).status).toBe(200);
    });

    it("Email-only reset no longer works", async () => {
      const res = await reset({ email: "ana@example.org", newPassword: "attacker-pass" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(INVALID_MESSAGE);
      expect((await login("ana@example.org", "old-password")).status).toBe(200);
      expect((await login("ana@example.org", "attacker-pass")).status).toBe(401);
    });
  });
});
