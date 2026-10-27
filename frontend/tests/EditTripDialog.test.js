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
  default: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
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

/**
 * Feature 78 — Days Before and After the Trip
 * Spec: features/feature-78-days-before-after-trip.md
 */
describe("Feature 78 — Days Before and After the Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "omar@example.org",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Hope Missions", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
    TripServices.get.mockResolvedValue({
      data: { id: 7, orgId: 3, name: "Guatemala Clinic", status: "active", version: 1, leaderPeopleIds: [] },
    });
    PersonServices.getOrgTripLeaders.mockResolvedValue({ data: [] });
    WorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({
      data: [
        { id: 1, description: "Arrive early", priceAdjustment: "0.00", setNumber: 1, daysBefore: 2, daysAfter: 0 },
        { id: 2, description: "Arrive on time", priceAdjustment: "0.00", setNumber: 1, daysBefore: 0, daysAfter: 0 },
      ],
    });
  });

  describe("US-78.1 — Staff set days on trip options", () => {
    it("Edit trip shows days on trip options", async () => {
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

      const headers = wrapper.findAll("thead th").map((th) => th.text());
      expect(headers).toContain("Days before");
      expect(headers).toContain("Days after");
      const row = wrapper
        .findAll("tbody tr")
        .find((tr) => tr.findAll("input").some((input) => input.element.value === "Arrive early"));
      expect(row.find('[data-testid="travel-option-days-before"] input').element.value).toBe("2");
      expect(row.find('[data-testid="travel-option-days-after"] input').element.value).toBe("0");
      wrapper.unmount();
    });
  });
});

/**
 * Feature 89 — Negative Trip Days and Wider Option Descriptions
 * Spec: features/feature-89-negative-trip-days.md
 */
describe("Feature 89 — Negative Trip Days and Wider Option Descriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "omar@example.org",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Hope Missions", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
    TripServices.get.mockResolvedValue({
      data: {
        id: 7,
        orgId: 3,
        name: "Clinica Ezell Hospital - January 2027",
        status: "active",
        version: 1,
        leaderPeopleIds: [],
      },
    });
    TripServices.update.mockResolvedValue({ data: { version: 2 } });
    PersonServices.getOrgTripLeaders.mockResolvedValue({ data: [] });
    WorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
          description: "Antigua Trip - stay Friday night",
          priceAdjustment: "200.00",
          setNumber: 4,
          daysBefore: 0,
          daysAfter: 0,
        },
        { id: 2, description: "Depart Friday", priceAdjustment: "150.00", setNumber: 4, daysBefore: 0, daysAfter: 0 },
      ],
    });
    TripTravelOptionServices.update.mockResolvedValue({ data: {} });
  });

  const mountDialog = async () => {
    const { wrapper } = await mountWithPlugins(EditTripDialog, {
      props: { modelValue: false, tripId: 7 },
      global: {
        plugins: [vuetify],
        stubs: {
          VDialog: {
            props: ["modelValue", "maxWidth"],
            template: '<div v-if="modelValue !== false" :data-max-width="maxWidth"><slot /></div>',
          },
        },
      },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    return wrapper;
  };

  describe("US-89.1 — Staff give days that shorten the trip", () => {
    it("Travel option days accept negative numbers", async () => {
      const wrapper = await mountDialog();
      const departFriday = wrapper
        .findAll("tbody tr")
        .find((tr) => tr.findAll("input").some((input) => input.element.value === "Depart Friday"));
      const daysAfter = departFriday.find('[data-testid="travel-option-days-after"] input');
      const save = () => wrapper.findAll("button").find((b) => b.text() === "Save").trigger("click");

      await daysAfter.setValue("-366");
      await save();
      await flushPromises();
      expect(wrapper.text()).toContain("Days before and after must be whole numbers from -365 to 365.");
      expect(TripTravelOptionServices.update).not.toHaveBeenCalled();

      await daysAfter.setValue("-1");
      await save();
      await flushPromises();
      expect(TripTravelOptionServices.update).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ description: "Depart Friday", daysBefore: 0, daysAfter: -1 })
      );
      wrapper.unmount();
    });
  });

  describe("US-89.2 — Travel option descriptions are readable in Edit trip", () => {
    it("The travel option Description is wide", async () => {
      const wrapper = await mountDialog();

      expect(wrapper.find("[data-max-width]").attributes("data-max-width")).toBe("1000");
      expect(wrapper.find('[data-testid="travel-option-description-header"]').attributes("style")).toContain(
        "min-width: 360px"
      );
      expect(wrapper.find('[data-testid="add-travel-option-description"]').attributes("style")).toContain(
        "min-width: 360px"
      );
      wrapper.unmount();
    });
  });
});
