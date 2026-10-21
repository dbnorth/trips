/**
 * Feature 70 — Email Password Reset and Failed Sign-In Limits
 * Spec: features/feature-70-password-reset-and-login-limits.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { applyAuthGuards } from "../src/router.js";
import Login from "../src/views/Login.vue";
import ApplyAuthView from "../src/views/ApplyAuthView.vue";
import ForgotPasswordView from "../src/views/ForgotPasswordView.vue";
import ResetPasswordView from "../src/views/ResetPasswordView.vue";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/authServices.js", () => ({
  default: {
    loginUser: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import AuthServices from "../src/services/authServices.js";

const SENT_MESSAGE =
  "If an account exists for that email, we sent a link to reset your password. The link expires in 1 hour.";

const Stub = { template: "<div />" };

const createPasswordRouter = async (initialPath) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "login", component: Stub },
      { path: "/home", name: "home", component: Stub },
      { path: "/forgot-password", name: "forgotPassword", component: Stub },
      { path: "/reset-password", name: "resetPassword", component: Stub },
      { path: "/apply/sign-in", name: "applyAuth", component: Stub },
      { path: "/apply/create-account", name: "applyCreateAccount", component: Stub },
    ],
  });
  applyAuthGuards(router);
  await router.push(initialPath);
  await router.isReady();
  return router;
};

const mountAt = async (component, initialPath) => {
  const router = await createPasswordRouter(initialPath);
  const { wrapper } = await mountWithPlugins(component, { router });
  await flushPromises();
  return { wrapper, router };
};

const button = (wrapper, label) => wrapper.findAll("button, a").find((b) => b.text() === label);

const fillPasswords = async (wrapper, newPassword, confirm) => {
  const inputs = wrapper.findAll("input[type='password']");
  await inputs[0].setValue(newPassword);
  await inputs[1].setValue(confirm);
};

describe("Feature 70 — Email Password Reset and Failed Sign-In Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  describe("US-70.1 — Reset a forgotten password by email", () => {
    it("Forgot password page sends the link and shows the confirmation", async () => {
      AuthServices.forgotPassword.mockResolvedValue({ data: { message: SENT_MESSAGE } });
      const { wrapper } = await mountAt(ForgotPasswordView, "/forgot-password");

      await wrapper.find("input[type='email']").setValue("ana@example.org");
      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(AuthServices.forgotPassword).toHaveBeenCalledWith("ana@example.org");
      expect(wrapper.text()).toContain(SENT_MESSAGE);
      expect(wrapper.find("input[type='email']").exists()).toBe(false);
    });

    it("Reset password page checks the passwords before sending", async () => {
      const { wrapper } = await mountAt(ResetPasswordView, "/reset-password?token=abc123");

      await fillPasswords(wrapper, "new-password1", "different1");
      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(wrapper.text()).toContain("Passwords do not match.");
      expect(AuthServices.resetPassword).not.toHaveBeenCalled();
    });

    it("Reset password page sends me to sign in after a reset", async () => {
      AuthServices.resetPassword.mockResolvedValue({
        data: { message: "Your password has been reset. Please sign in." },
      });
      const { wrapper, router } = await mountAt(ResetPasswordView, "/reset-password?token=abc123");

      await fillPasswords(wrapper, "new-password1", "new-password1");
      await wrapper.find("form").trigger("submit.prevent");
      await flushPromises();

      expect(AuthServices.resetPassword).toHaveBeenCalledWith("abc123", "new-password1");
      expect(router.currentRoute.value.name).toBe("login");

      const login = await mountAt(Login, router.currentRoute.value.fullPath);
      expect(login.wrapper.text()).toContain("Your password has been reset. Please sign in.");
    });

    it("Sign in pages link to Forgot password", async () => {
      const { wrapper, router } = await mountAt(Login, "/");
      await wrapper.find("input[type='email']").setValue("ana@example.org");
      await button(wrapper, "Forgot password?").trigger("click");
      await flushPromises();

      expect(router.currentRoute.value.name).toBe("forgotPassword");
      expect(router.currentRoute.value.query.email).toBe("ana@example.org");
      const forgot = await mountAt(ForgotPasswordView, router.currentRoute.value.fullPath);
      expect(forgot.wrapper.find("input[type='email']").element.value).toBe("ana@example.org");

      const apply = await mountAt(ApplyAuthView, "/apply/sign-in?tripId=7");
      expect(button(apply.wrapper, "Forgot password?")).toBeTruthy();
    });
  });
});
