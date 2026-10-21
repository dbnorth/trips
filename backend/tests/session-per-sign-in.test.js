/**
 * Feature 72 — New Session for Every Sign-In
 * Spec: features/feature-72-new-session-per-sign-in.md
 */

import { jest } from "@jest/globals";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser } from "./helpers.js";

describe("Feature 72 — New Session for Every Sign-In", () => {
  let ana;

  const signIn = async () => {
    const res = await request(app)
      .post("/trips/login")
      .send({ email: "ana@example.org", password: "right-pass1" });
    expect(res.status).toBe(200);
    return res.body.token;
  };

  const me = (token) => request(app).get("/trips/me").set({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    ana = await registerUser({
      email: "ana@example.org",
      firstName: "Ana",
      lastName: "Lopez",
      password: "right-pass1",
    });
    await db.session.destroy({ where: { userId: ana.user.userId } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("US-72.1 — Each sign-in gets its own session", () => {
    it("Signing in twice gives two different tokens", async () => {
      const first = await signIn();
      const second = await signIn();

      expect(second).not.toBe(first);
      expect(await db.session.count({ where: { userId: ana.user.userId } })).toBe(2);
      expect((await me(first)).status).toBe(200);
      expect((await me(second)).status).toBe(200);
    });

    it("Signing in never returns an earlier token", async () => {
      const t1 = await signIn();
      expect((await me(t1)).status).toBe(200);

      const t2 = await signIn();

      expect(t2).not.toBe(t1);
    });

    it("Two sign-ins in the same second get different tokens", async () => {
      const fixed = Date.now();
      jest.spyOn(Date, "now").mockReturnValue(fixed);

      const first = await signIn();
      const second = await signIn();

      expect(second).not.toBe(first);
    });

    it("Signing out on one device keeps the other signed in", async () => {
      const t1 = await signIn();
      const t2 = await signIn();

      const out = await request(app).post("/trips/logout").send({ token: t1 });

      expect(out.status).toBe(200);
      expect((await me(t1)).status).toBe(401);
      expect((await me(t2)).status).toBe(200);
    });

    it("Sign-in removes expired and ended sessions", async () => {
      const userId = ana.user.userId;
      const hourAhead = new Date(Date.now() + 60 * 60 * 1000);
      const expired = await db.session.create({
        token: "expired-token",
        email: "ana@example.org",
        expirationDate: new Date(Date.now() - 60 * 1000),
        userId,
      });
      const ended = await db.session.create({
        token: "",
        email: "ana@example.org",
        expirationDate: hourAhead,
        userId,
      });
      const live = await db.session.create({
        token: "live-token",
        email: "ana@example.org",
        expirationDate: hourAhead,
        userId,
      });

      const token = await signIn();

      const rows = await db.session.findAll({ where: { userId } });
      const ids = rows.map((r) => r.id);
      expect(ids).not.toContain(expired.id);
      expect(ids).not.toContain(ended.id);
      expect(ids).toContain(live.id);
      expect(rows.map((r) => r.token)).toContain(token);
      expect(rows).toHaveLength(2);
    });
  });
});
