/**
 * Feature 38 — Trip Deposit
 * Spec: features/feature-38-trip-deposit.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import AddTripDialog from "../src/components/AddTripDialog.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { create: vi.fn(), update: vi.fn(), uploadImage: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/workerRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/tripWorkerRoleServices.js", () => ({
  default: { create: vi.fn() },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { getAll: vi.fn() },
}));

describe("Feature 38 — Trip Deposit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 1,
      personId: 1,
      email: "staff@example.com",
      isAdmin: false,
      token: "t",
      orgRoles: [],
      tripRoles: [],
      currentOrgId: null,
    });
  });

  it("Trip form shows Deposit after Participant cost", async () => {
    const { wrapper } = await mountWithPlugins(AddTripDialog, {
      props: { modelValue: true },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const labels = wrapper.findAllComponents({ name: "MoneyInput" }).map((c) => c.props("label"));
    const cost = labels.indexOf("Participant cost");
    const deposit = labels.indexOf("Deposit");
    expect(cost).toBeGreaterThan(-1);
    expect(deposit).toBe(cost + 1);

    wrapper.unmount();
  });
});
