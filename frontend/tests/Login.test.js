/**
 * Feature 1 — User Authentication & Sessions
 * Spec: features/feature-1-user-authentication.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Login from "../src/views/Login.vue";
import authServices from "../src/services/authServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    loginUser: vi.fn(),
    registerUser: vi.fn(),
    getRegisterOrganizations: vi.fn().mockResolvedValue({ data: [] }),
    logoutUser: vi.fn(),
    changePassword: vi.fn(),
    me: vi.fn(),
  },
}));

const authPayload = {
  email: "jane@example.com",
  userId: 1,
  personId: 2,
  firstName: "Jane",
  lastName: "Doe",
  token: "test-token",
  isAdmin: false,
  orgRoles: [],
  tripRoles: [],
};

const clickByText = async (wrapper, text) => {
  const btn = wrapper.findAll("button").find((b) => b.text().trim() === text);
  expect(btn, `button "${text}"`).toBeTruthy();
  await btn.trigger("click");
  await flushPromises();
};

describe("Feature 1 — Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authServices.getRegisterOrganizations.mockResolvedValue({ data: [] });
  });

  describe("US-1.1 — Register an account", () => {
    it("User registers with valid information", async () => {
      authServices.registerUser.mockResolvedValue({ data: authPayload });

      const { wrapper, router } = await mountWithPlugins(Login);
      const pushSpy = vi.spyOn(router, "push");
      await clickByText(wrapper, "Add person / create account");

      const fields = wrapper.findAllComponents({ name: "VTextField" });
      expect(fields.length).toBeGreaterThanOrEqual(5);
      await fields[0].vm.$emit("update:modelValue", "Jane");
      await fields[1].vm.$emit("update:modelValue", "Doe");
      await fields[2].vm.$emit("update:modelValue", "jane@example.com");
      await fields[3].vm.$emit("update:modelValue", "password123");
      await fields[4].vm.$emit("update:modelValue", "password123");
      await flushPromises();

      await clickByText(wrapper, "Create account");

      expect(authServices.registerUser).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "password123",
        orgIds: [],
      });
      expect(Utils.getStore("user")?.token).toBe("test-token");
      expect(pushSpy).toHaveBeenCalledWith({ name: "home" });
    });

    it("User registers with password mismatch (client)", async () => {
      const { wrapper } = await mountWithPlugins(Login);
      await clickByText(wrapper, "Add person / create account");

      const fields = wrapper.findAllComponents({ name: "VTextField" });
      await fields[0].vm.$emit("update:modelValue", "Jane");
      await fields[1].vm.$emit("update:modelValue", "Doe");
      await fields[2].vm.$emit("update:modelValue", "jane@example.com");
      await fields[3].vm.$emit("update:modelValue", "password123");
      await fields[4].vm.$emit("update:modelValue", "different");
      await flushPromises();

      await clickByText(wrapper, "Create account");

      expect(authServices.registerUser).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("Passwords do not match.");
    });
  });

  describe("US-1.2 — Sign in with email and password", () => {
    it("User signs in with valid credentials", async () => {
      authServices.loginUser.mockResolvedValue({ data: authPayload });

      const { wrapper, router } = await mountWithPlugins(Login);
      const fields = wrapper.findAllComponents({ name: "VTextField" });
      await fields[0].vm.$emit("update:modelValue", "jane@example.com");
      await fields[1].vm.$emit("update:modelValue", "password123");
      await flushPromises();

      await clickByText(wrapper, "Sign in");

      expect(authServices.loginUser).toHaveBeenCalledWith({
        email: "jane@example.com",
        password: "password123",
      });
      expect(Utils.getStore("user")?.token).toBe("test-token");
      expect(router.currentRoute.value.name).toBe("home");
    });

    it("User signs in with invalid password", async () => {
      authServices.loginUser.mockRejectedValue({
        response: { data: { message: "Invalid email or password." } },
      });

      const { wrapper } = await mountWithPlugins(Login);
      const fields = wrapper.findAllComponents({ name: "VTextField" });
      await fields[0].vm.$emit("update:modelValue", "jane@example.com");
      await fields[1].vm.$emit("update:modelValue", "wrongpassword");
      await flushPromises();

      await clickByText(wrapper, "Sign in");

      expect(wrapper.text()).toContain("Invalid email or password.");
      expect(Utils.getStore("user")).toBeNull();
    });
  });

  describe("US-1.4 — Sign out and change password", () => {
    it("User signs out", async () => {
      Utils.setStore("user", authPayload);
      authServices.logoutUser.mockResolvedValue({ data: { message: "ok" } });

      await authServices.logoutUser(Utils.getStore("user"));
      Utils.removeItem("user");

      expect(authServices.logoutUser).toHaveBeenCalledWith(authPayload);
      expect(Utils.getStore("user")).toBeNull();
    });
  });
});
