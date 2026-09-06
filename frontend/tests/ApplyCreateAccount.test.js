/**
 * Feature 1 — User Authentication & Sessions
 * Spec: features/feature-1-user-authentication.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ApplyCreateAccountView from "../src/views/ApplyCreateAccountView.vue";
import authServices from "../src/services/authServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, createFeature1Router } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    getRegisterOrganizations: vi.fn(),
    logoutUser: vi.fn(),
  },
}));

async function fillApplyForm(wrapper, values) {
  const inputs = wrapper.findAll("input");
  // order: first, middle, last, email, password, confirm
  await inputs[0].setValue(values.firstName);
  await inputs[1].setValue(values.middleName ?? "");
  await inputs[2].setValue(values.lastName);
  await inputs[3].setValue(values.email);
  await inputs[4].setValue(values.password);
  await inputs[5].setValue(values.confirmPassword);
  await flushPromises();
}

describe("Feature 1 — Apply create account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-1.1 — Register an account", () => {
    it("User registers with password too short", async () => {
      const router = await createFeature1Router("/");
      await router.push({
        name: "applyCreateAccount",
        query: { tripId: "9", orgId: "2" },
      });
      await router.isReady();

      const { wrapper } = await mountWithPlugins(ApplyCreateAccountView, { router });
      await fillApplyForm(wrapper, {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "short",
        confirmPassword: "short",
      });

      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(authServices.registerUser).not.toHaveBeenCalled();
      expect(wrapper.text()).toMatch(/at least 8 characters/i);
    });
  });

  describe("US-1.6 — Apply-funnel sign-in and create account", () => {
    it("Applicant creates account from apply flow", async () => {
      authServices.registerUser.mockResolvedValue({
        data: {
          email: "applicant@example.com",
          userId: 5,
          personId: 6,
          token: "apply-token",
          isAdmin: false,
          firstName: "Ann",
          lastName: "Applicant",
          orgRoles: [{ orgId: 2, roleName: "Trip Participant", orgName: "Org" }],
          tripRoles: [],
        },
      });

      const router = await createFeature1Router("/");
      await router.push({
        name: "applyCreateAccount",
        query: { tripId: "9", orgId: "2", org: "Org" },
      });
      await router.isReady();

      const { wrapper } = await mountWithPlugins(ApplyCreateAccountView, { router });
      await fillApplyForm(wrapper, {
        firstName: "Ann",
        lastName: "Applicant",
        email: "applicant@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(authServices.registerUser).toHaveBeenCalledWith({
        firstName: "Ann",
        middleName: null,
        lastName: "Applicant",
        email: "applicant@example.com",
        password: "password123",
        orgIds: [2],
      });
      expect(Utils.getStore("user")?.token).toBe("apply-token");
      expect(router.currentRoute.value.name).toBe("tripBrowse");
      expect(router.currentRoute.value.params.tripId).toBe("9");
    });
  });
});
