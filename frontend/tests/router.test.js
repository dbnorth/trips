/**
 * Feature 1 — User Authentication & Sessions
 * Spec: features/feature-1-user-authentication.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import Utils from "../src/config/utils.js";
import { createFeature1Router } from "./testUtils.js";

describe("Feature 1 — Router guards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("US-1.5 — Guard protected routes and APIs", () => {
    it("Unauthenticated user opens home", async () => {
      const router = await createFeature1Router("/login");
      await router.push({ name: "home" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("login");
    });
  });

  describe("US-1.6 — Apply-funnel sign-in and create account", () => {
    it("Already signed-in user hits apply sign-in", async () => {
      Utils.setStore("user", {
        email: "jane@example.com",
        userId: 1,
        token: "tok",
        isAdmin: false,
        orgRoles: [{ orgId: 1, roleName: "Trip Participant" }],
        tripRoles: [],
      });

      const router = await createFeature1Router("/login");
      await router.push({ name: "applyAuth", query: { tripId: "42", orgId: "1" } });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("tripBrowse");
      expect(router.currentRoute.value.params.tripId).toBe("42");
    });

    it("Applicant creates account from apply flow", async () => {
      // Routing after register is handled in ApplyCreateAccountView; guard allows unauthenticated access
      const router = await createFeature1Router("/login");
      await router.push({
        name: "applyCreateAccount",
        query: { tripId: "7", orgId: "3" },
      });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("applyCreateAccount");
      expect(router.currentRoute.value.query.tripId).toBe("7");
    });
  });
});

describe("Feature 7 — Router guards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("US-7.1 — Browse and apply to trips", () => {
    it("System admin cannot browse-apply", async () => {
      Utils.setStore("user", {
        email: "admin@example.com",
        userId: 99,
        token: "tok",
        isAdmin: true,
        orgRoles: [],
        tripRoles: [],
      });

      const router = await createFeature1Router("/home");
      await router.push({ name: "tripBrowse", params: { tripId: "5" } });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("home");
    });
  });
});

describe("Feature 10 — Router guards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("US-10.1 — Manage email templates", () => {
    it("Unauthorized user cannot open templates page", async () => {
      Utils.setStore("user", {
        email: "participant@example.com",
        userId: 12,
        token: "tok",
        isAdmin: false,
        orgRoles: [{ orgId: 1, roleName: "Trip Participant" }],
        tripRoles: [],
      });

      const router = await createFeature1Router("/home");
      await router.push({ name: "templates" });
      await router.isReady();

      expect(router.currentRoute.value.name).toBe("home");
    });
  });
});
