/**
 * Feature 103 — Keep Trip Roles That Have Participants
 * Spec: features/feature-103-keep-roles-with-participants.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EditTripDialog from "../src/components/EditTripDialog.vue";
import TripWorkerRolesCard from "../src/components/TripWorkerRolesCard.vue";
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

const dialogStub = {
  VDialog: { props: ["modelValue"], template: '<div v-if="modelValue !== false"><slot /></div>' },
};

const rowFor = (wrapper, name) =>
  wrapper.findAll("tbody tr").find((tr) => tr.text().startsWith(name));

describe("Feature 103 — Keep Trip Roles That Have Participants", () => {
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
      data: { id: 7, orgId: 3, name: "Guatemala Clinic 2027", status: "active", version: 1, leaderPeopleIds: [] },
    });
    PersonServices.getOrgTripLeaders.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    WorkerRoleServices.getAll.mockResolvedValue({
      data: [
        { id: 10, name: "Nurse" },
        { id: 11, name: "Dentist" },
        { id: 12, name: "Pharmacist" },
      ],
    });
    TripWorkerRoleServices.getAll.mockResolvedValue({
      data: [
        { id: 3, workerRoleId: 10, quantity: 2, signedUpCount: 1, availableCount: 1, workerRole: { name: "Nurse" } },
        { id: 4, workerRoleId: 11, quantity: 2, signedUpCount: 0, availableCount: 2, workerRole: { name: "Dentist" } },
      ],
    });
    TripWorkerRoleServices.getReservations.mockResolvedValue({ data: [] });
  });

  describe("US-103.1 — Roles with people in them can't be removed", () => {
    it("Team roles card hides Remove on a role with active participants", async () => {
      const { wrapper } = await mountWithPlugins(TripWorkerRolesCard, {
        props: { tripId: 7, orgId: 3 },
        global: { plugins: [vuetify], stubs: dialogStub },
      });
      await flushPromises();

      const hasRemove = (name) => rowFor(wrapper, name).find('button[aria-label="Remove"]').exists();
      expect(hasRemove("Nurse")).toBe(false);
      expect(hasRemove("Dentist")).toBe(true);
      wrapper.unmount();
    });

    it("Edit trip hides Remove on a role with active participants", async () => {
      const { wrapper } = await mountWithPlugins(EditTripDialog, {
        props: { modelValue: false, tripId: 7 },
        global: { plugins: [vuetify], stubs: dialogStub },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      const hasRemove = (name) =>
        rowFor(wrapper, name).findAll("button").some((b) => b.text() === "Remove");
      expect(hasRemove("Nurse")).toBe(false);
      expect(hasRemove("Dentist")).toBe(true);

      await wrapper.findAll("button").find((b) => b.text() === "Add role").trigger("click");
      await flushPromises();
      wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Worker role")
        .vm.$emit("update:modelValue", 12);
      await flushPromises();
      await wrapper.findAll("button").find((b) => b.text() === "Add").trigger("click");
      await flushPromises();

      expect(hasRemove("Pharmacist")).toBe(true);
      wrapper.unmount();
    });
  });
});
