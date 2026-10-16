/**
 * Feature 38 — Trip Deposit
 * Spec: features/feature-38-trip-deposit.md
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
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
  default: { getAll: vi.fn(), getOrgTripLeaders: vi.fn() },
}));

import PersonServices from "../src/services/personServices.js";
import WorkerRoleServices from "../src/services/workerRoleServices.js";

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

describe("Feature 40 — Email Template Tokens and Preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "orgadmin@example.com",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Hope Mission", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
    PersonServices.getOrgTripLeaders.mockResolvedValue({
      data: [
        { id: 5, firstName: "Ann", lastName: "Lead" },
        { id: 6, firstName: "Bob", lastName: "Guide" },
      ],
    });
    WorkerRoleServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Trip form shows Primary trip leader", async () => {
    const { wrapper } = await mountWithPlugins(AddTripDialog, {
      props: { modelValue: false },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    const findPrimary = () =>
      wrapper.findAllComponents({ name: "VSelect" }).find((s) => s.props("label") === "Primary trip leader");
    expect(findPrimary()).toBeUndefined();

    const leaders = wrapper
      .findAllComponents({ name: "VAutocomplete" })
      .find((a) => a.props("label") === "Trip leaders");
    leaders.vm.$emit("update:modelValue", [5, 6]);
    await flushPromises();

    const primary = findPrimary();
    expect(primary).toBeTruthy();
    expect(primary.props("items").map((item) => item.title)).toEqual(["Ann Lead", "Bob Guide"]);
    expect(primary.props("modelValue")).toBe(5);

    leaders.vm.$emit("update:modelValue", [6]);
    await flushPromises();
    expect(findPrimary().props("modelValue")).toBe(6);

    wrapper.unmount();
  });
});
