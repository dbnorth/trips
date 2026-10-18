/**
 * Feature 56 — Reserved Role Emails
 * Spec: features/feature-56-reserved-role-emails.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EditTripDialog from "../src/components/EditTripDialog.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), uploadImage: vi.fn(), getImageUrl: vi.fn() },
}));
vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/workerRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/tripWorkerRoleServices.js", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getReservations: vi.fn(),
  },
}));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { getOrgTripLeaders: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";
import WorkerRoleServices from "../src/services/workerRoleServices.js";
import TripWorkerRoleServices from "../src/services/tripWorkerRoleServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import PersonServices from "../src/services/personServices.js";

describe("Feature 56 — Reserved Role Emails", () => {
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
    TripServices.get.mockResolvedValue({
      data: { id: 7, orgId: 3, name: "Guatemala Clinic", status: "active", version: 1, leaderPeopleIds: [] },
    });
    TripServices.update.mockResolvedValue({ data: {} });
    PersonServices.getOrgTripLeaders.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    WorkerRoleServices.getAll.mockResolvedValue({
      data: [
        { id: 10, name: "Nurse" },
        { id: 11, name: "Driver" },
      ],
    });
    TripWorkerRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 3,
          workerRoleId: 10,
          quantity: 3,
          reservedCount: 1,
          availableCount: 2,
          workerRole: { name: "Nurse" },
        },
      ],
    });
    TripWorkerRoleServices.getReservations.mockResolvedValue({
      data: [{ id: 1, email: "carl@example.org", filled: false }],
    });
    TripWorkerRoleServices.create.mockResolvedValue({
      data: { id: 4, workerRoleId: 11, quantity: 2, reservedCount: 1, availableCount: 1, workerRole: { name: "Driver" } },
    });
  });

  describe("US-56.1 — Reserve role slots by email", () => {
    it("Edit trip reserves emails for existing and new roles", async () => {
      const { wrapper } = await mountWithPlugins(EditTripDialog, {
        props: { modelValue: false, tripId: 7 },
        global: {
          plugins: [vuetify],
          stubs: {
            VDialog: { props: ["modelValue"], template: '<div v-if="modelValue !== false"><slot /></div>' },
          },
        },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      const rows = () => wrapper.findAll("tbody tr").map((tr) => tr.text());
      const nurseRow = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Nurse"));
      expect(wrapper.findAll("thead th").map((th) => th.text())).not.toContain("Reserved");
      expect(rows()[rows().indexOf(nurseRow.text()) + 1]).toBe("Reserved emails: carl@example.org");
      TripWorkerRoleServices.getReservations.mockClear();
      await nurseRow.findAll("button").find((b) => b.text() === "Reserved emails").trigger("click");
      await flushPromises();
      expect(TripWorkerRoleServices.getReservations).toHaveBeenCalledWith(3);

      expect(wrapper.text()).not.toContain("Reserved emails (optional)");
      await wrapper.findAll("button").find((b) => b.text() === "Add role").trigger("click");
      await flushPromises();
      wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Worker role")
        .vm.$emit("update:modelValue", 11);
      wrapper
        .findAllComponents({ name: "VTextarea" })
        .find((c) => c.props("label") === "Reserved emails (optional)")
        .vm.$emit("update:modelValue", "ana@example.org, ben@example.org");
      wrapper
        .findAllComponents({ name: "VTextField" })
        .find((c) => c.props("label") === "Number Needed")
        .vm.$emit("update:modelValue", 2);
      await flushPromises();
      await wrapper.findAll("button").find((b) => b.text() === "Add").trigger("click");
      await flushPromises();
      expect(wrapper.text()).not.toContain("Reserved emails (optional)");
      const driverIndex = rows().findIndex((text) => text.startsWith("Driver"));
      expect(rows()[driverIndex + 1]).toBe("Reserved emails: ana@example.org, ben@example.org");

      await wrapper.findAll("button").find((b) => b.text() === "Save").trigger("click");
      await flushPromises();

      expect(TripWorkerRoleServices.create).toHaveBeenCalledWith({
        tripId: 7,
        workerRoleId: 11,
        quantity: 2,
        emails: ["ana@example.org", "ben@example.org"],
      });
      wrapper.unmount();
    });

    it("Edit trip blocks saving a role with more reserved emails than Number Needed", async () => {
      TripWorkerRoleServices.getReservations.mockResolvedValue({
        data: [
          { id: 1, email: "carl@example.org", filled: false },
          { id: 2, email: "dana@example.org", filled: false },
        ],
      });
      const { wrapper } = await mountWithPlugins(EditTripDialog, {
        props: { modelValue: false, tripId: 7 },
        global: {
          plugins: [vuetify],
          stubs: {
            VDialog: { props: ["modelValue"], template: '<div v-if="modelValue !== false"><slot /></div>' },
          },
        },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      wrapper
        .findAll("tbody tr")
        .find((tr) => tr.text().includes("Nurse"))
        .findComponent({ name: "VTextField" })
        .vm.$emit("update:modelValue", 1);
      await flushPromises();
      await wrapper.findAll("button").find((b) => b.text() === "Save").trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Nurse: Reserved emails (2) cannot be more than Number Needed (1).");
      expect(TripServices.update).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  });
});
