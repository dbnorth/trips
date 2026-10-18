/**
 * Feature 56 — Reserved Role Emails
 * Spec: features/feature-56-reserved-role-emails.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripWorkerRolesCard from "../src/components/TripWorkerRolesCard.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/workerRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/tripWorkerRoleServices.js", () => ({
  default: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), getReservations: vi.fn() },
}));

import WorkerRoleServices from "../src/services/workerRoleServices.js";
import TripWorkerRoleServices from "../src/services/tripWorkerRoleServices.js";

describe("Feature 56 — Reserved Role Emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    WorkerRoleServices.getAll.mockResolvedValue({ data: [{ id: 11, name: "Driver" }] });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripWorkerRoleServices.getReservations.mockResolvedValue({ data: [] });
  });

  const mountCard = () =>
    mountWithPlugins(TripWorkerRolesCard, {
      props: { tripId: 7, orgId: 3 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' } },
      },
    });

  describe("US-56.1 — Reserve role slots by email", () => {
    it("Trip page shows reserved emails under each role", async () => {
      TripWorkerRoleServices.getAll.mockResolvedValue({
        data: [
          { id: 3, workerRoleId: 10, quantity: 3, workerRole: { name: "Nurse", description: "Registered nurse" } },
          { id: 4, workerRoleId: 11, quantity: 1, workerRole: { name: "Driver" } },
        ],
      });
      TripWorkerRoleServices.getReservations.mockImplementation(async (id) => ({
        data: id === 3 ? [{ email: "ana@example.org" }, { email: "ben@example.org" }] : [],
      }));
      const { wrapper } = await mountCard();
      await flushPromises();

      const roleCell = (name) =>
        wrapper
          .findAll("tbody tr")
          .find((tr) => tr.text().includes(name))
          .findAll("td")[0]
          .findAll("div")
          .map((d) => d.text());
      expect(roleCell("Nurse")).toEqual([
        "Nurse",
        "Registered nurse",
        "Reserved emails: ana@example.org, ben@example.org",
      ]);
      expect(roleCell("Driver")).toEqual(["Driver", "Reserved emails: —"]);
      wrapper.unmount();
    });

    it("Trip page Add Role dialog adds a role with reserved emails", async () => {
      const { wrapper } = await mountCard();
      await flushPromises();
      const button = (text) => wrapper.findAll("button").find((b) => b.text() === text);
      const fill = async () => {
        wrapper
          .findAllComponents({ name: "VSelect" })
          .find((c) => c.props("label") === "Worker role")
          .vm.$emit("update:modelValue", 11);
        wrapper
          .findAllComponents({ name: "VTextField" })
          .find((c) => c.props("label") === "Number Needed")
          .vm.$emit("update:modelValue", 2);
        wrapper
          .findAllComponents({ name: "VTextarea" })
          .find((c) => c.props("label") === "Reserved emails (optional)")
          .vm.$emit("update:modelValue", "ana@example.org, ben@example.org");
        await flushPromises();
      };

      expect(wrapper.text()).not.toContain("Reserved emails (optional)");
      await button("Add role").trigger("click");
      await flushPromises();

      TripWorkerRoleServices.create.mockRejectedValueOnce({
        response: { data: { message: "ana@example.org has already applied for this trip." } },
      });
      await fill();
      await button("Add").trigger("click");
      await flushPromises();
      expect(wrapper.text()).toContain("ana@example.org has already applied for this trip.");
      expect(wrapper.text()).toContain("Reserved emails (optional)");

      TripWorkerRoleServices.create.mockResolvedValueOnce({ data: {} });
      await button("Add").trigger("click");
      await flushPromises();

      expect(TripWorkerRoleServices.create).toHaveBeenLastCalledWith({
        tripId: 7,
        workerRoleId: 11,
        quantity: 2,
        emails: ["ana@example.org", "ben@example.org"],
      });
      expect(wrapper.text()).not.toContain("Reserved emails (optional)");
      expect(TripWorkerRoleServices.getAll).toHaveBeenCalledTimes(2);
      wrapper.unmount();
    });
  });
});
