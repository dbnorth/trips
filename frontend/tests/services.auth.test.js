/**
 * Feature 1 — User Authentication & Sessions
 * Spec: features/feature-1-user-authentication.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import Utils from "../src/config/utils.js";

const push = vi.fn();

vi.mock("../src/router.js", () => ({
  default: { push },
  applyAuthGuards: vi.fn(),
}));

describe("Feature 1 — Axios session handling", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    push.mockClear();
  });

  describe("US-1.3 — Persist session in the browser", () => {
    it("Authenticated API request includes Bearer token", async () => {
      Utils.setStore("user", {
        email: "jane@example.com",
        token: "abc-token",
        orgRoles: [],
        tripRoles: [],
      });

      const apiClient = (await import("../src/services/services.js")).default;
      const handler = apiClient.interceptors.request.handlers[0].fulfilled;
      const config = await handler({
        headers: {},
        data: { ping: true },
      });

      expect(config.headers.Authorization).toBe("Bearer abc-token");
    });

    it("Expired token clears session", async () => {
      Utils.setStore("user", {
        email: "jane@example.com",
        token: "dead-token",
        orgRoles: [],
        tripRoles: [],
      });

      const apiClient = (await import("../src/services/services.js")).default;
      const transform = apiClient.defaults.transformResponse;
      const transformFn = Array.isArray(transform) ? transform[0] : transform;

      const parsed = transformFn(
        JSON.stringify({ message: "Unauthorized! Invalid or expired token." })
      );

      expect(parsed.message).toMatch(/Unauthorized/);
      expect(Utils.getStore("user")).toBeNull();
      expect(push).toHaveBeenCalledWith({ name: "login" });
    });
  });
});
