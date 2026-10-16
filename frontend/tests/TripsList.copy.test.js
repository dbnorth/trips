/**
 * Feature 21 — Copy Trip
 * Spec: features/feature-21-copy-trip.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripsList from "../src/views/TripsList.vue";
import CopyTripDialog from "../src/components/CopyTripDialog.vue";
import TripServices from "../src/services/tripServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getAll: vi.fn(),
    copy: vi.fn(),
  },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../src/components/AddTripDialog.vue", () => ({
  default: { name: "AddTripDialog", template: "<div />", props: ["modelValue"] },
}));

vi.mock("../src/components/EditTripDialog.vue", () => ({
  default: {
    name: "EditTripDialog",
    template: "<div />",
    props: ["modelValue", "tripId"],
  },
}));

const dialogStub = { template: "<div><slot /></div>" };

const orgAdminUser = {
  email: "admin@example.com",
  userId: 1,
  personId: 1,
  token: "tok",
  isAdmin: false,
  currentOrgId: 10,
  currentOrgName: "Hope Mission",
  orgRoles: [{ orgId: 10, orgName: "Hope Mission", roleName: "Org Admin" }],
  tripRoles: [],
};

const systemAdminNoOrg = {
  email: "sys@example.com",
  userId: 2,
  personId: 2,
  token: "tok",
  isAdmin: true,
  actingOrganizationId: null,
  currentOrgId: null,
  orgRoles: [],
  tripRoles: [],
};

describe("Feature 21 — Copy Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    TripServices.getAll.mockResolvedValue({
      data: [{ id: 1, name: "Source Trip", startDate: "2026-07-01", endDate: "2026-07-14" }],
    });
    OrganizationServices.get.mockResolvedValue({ data: { id: 10, name: "Hope Mission" } });
  });

  it("Copy button opens dialog with name and trip dropdown", async () => {
    Utils.setStore("user", orgAdminUser);

    const { wrapper } = await mountWithPlugins(TripsList, {
      global: {
        stubs: { VDialog: dialogStub },
      },
    });
    await flushPromises();

    const copyBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Copy");
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.attributes("disabled")).toBeUndefined();

    await copyBtn.trigger("click");
    await flushPromises();

    const dialog = wrapper.findComponent(CopyTripDialog);
    expect(dialog.exists()).toBe(true);
    expect(dialog.props("modelValue")).toBe(true);
    expect(dialog.props("trips").map((t) => t.name)).toContain("Source Trip");

    const labels = dialog.findAllComponents({ name: "VTextField" }).map((c) => c.props("label"));
    expect(labels).toContain("Name");
    const selects = dialog.findAllComponents({ name: "VSelect" }).map((c) => c.props("label"));
    expect(selects).toContain("Trip to copy");
    expect(dialog.text()).toContain("Copy trip");

    wrapper.unmount();
  });

  it("Copy is disabled when Add trip is disabled", async () => {
    Utils.setStore("user", systemAdminNoOrg);

    const { wrapper } = await mountWithPlugins(TripsList);
    await flushPromises();

    const buttons = wrapper.findAll("button");
    const copyBtn = buttons.find((b) => b.text().trim() === "Copy");
    const addBtn = buttons.find((b) => b.text().trim() === "Add trip");

    expect(copyBtn).toBeTruthy();
    expect(addBtn).toBeTruthy();
    expect(copyBtn.attributes("disabled")).toBeDefined();
    expect(addBtn.attributes("disabled")).toBeDefined();

    wrapper.unmount();
  });

  it("Blank name is rejected", async () => {
    TripServices.copy.mockResolvedValue({ data: { id: 99 } });

    const { wrapper } = await mountWithPlugins(CopyTripDialog, {
      props: {
        modelValue: true,
        trips: [{ id: 1, name: "Source Trip" }],
      },
      global: {
        stubs: { VDialog: dialogStub },
      },
    });
    await flushPromises();

    const nameField = wrapper.findAllComponents({ name: "VTextField" }).find((c) => c.props("label") === "Name");
    await nameField.vm.$emit("update:modelValue", "   ");
    await flushPromises();

    const copyAction = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === "Copy");
    expect(copyAction).toBeTruthy();
    await copyAction.trigger("click");
    await flushPromises();

    expect(TripServices.copy).not.toHaveBeenCalled();
    expect(wrapper.text()).toMatch(/Name is required/i);

    wrapper.unmount();
  });
});
