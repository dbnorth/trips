/**
 * Feature 110 — Update Trip View
 * Spec: features/feature-110-update-trip-view.md
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

describe("Feature 110 — Update Trip View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    WorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripWorkerRoleServices.getReservations.mockResolvedValue({ data: [] });
    TripWorkerRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 3,
          workerRoleId: 10,
          quantity: 2,
          workerRole: {
            name: "Nurse",
            documentTypeId: null,
            documentType: null,
            requiredDocumentTypes: [
              { id: 1, description: "RN License", type: "medical_license" },
              { id: 2, description: "Passport", type: "passport" },
            ],
          },
        },
        {
          id: 4,
          workerRoleId: 11,
          quantity: 1,
          workerRole: { name: "Driver", documentTypeId: null, documentType: null, requiredDocumentTypes: [] },
        },
      ],
    });
  });

  const documentCell = async (roleName) => {
    const { wrapper } = await mountWithPlugins(TripWorkerRolesCard, {
      props: { tripId: 7, orgId: 3 },
      global: { plugins: [vuetify] },
    });
    await flushPromises();
    const headers = wrapper.findAll("thead th").map((th) => th.text().trim());
    const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes(roleName));
    const text = row.findAll("td")[headers.indexOf("Document type")].text().trim();
    wrapper.unmount();
    return text;
  };

  describe("US-110.1 — See which documents each trip role requires", () => {
    it("Trip roles list their required document types", async () => {
      expect(await documentCell("Nurse")).toBe("Passport, RN License");
    });

    it("A role with no required documents shows a dash", async () => {
      expect(await documentCell("Driver")).toBe("—");
    });

    it("Each trip role shows whether its positions are filled", async () => {
      TripWorkerRoleServices.getAll.mockResolvedValue({
        data: [
          { id: 3, workerRoleId: 10, quantity: 2, availableCount: 0, workerRole: { name: "Nurse" } },
          { id: 4, workerRoleId: 11, quantity: 3, availableCount: 2, workerRole: { name: "Driver" } },
        ],
      });
      const { wrapper } = await mountWithPlugins(TripWorkerRolesCard, {
        props: { tripId: 7, orgId: 3 },
        global: { plugins: [vuetify] },
      });
      await flushPromises();
      const headers = wrapper.findAll("thead th").map((th) => th.text().trim());
      expect(headers[headers.length - 1]).toBe("Filled");
      const icon = (name) => {
        const cells = wrapper
          .findAll("tbody tr")
          .find((tr) => tr.text().includes(name))
          .findAll("td");
        return cells[cells.length - 1].find('[data-testid="role-filled-icon"]');
      };

      expect(icon("Nurse").classes()).toEqual(expect.arrayContaining(["mdi-check-circle", "text-success"]));
      expect(icon("Nurse").attributes("aria-label")).toBe("All positions filled");
      expect(icon("Driver").classes()).toEqual(expect.arrayContaining(["mdi-alert-circle", "text-error"]));
      expect(icon("Driver").attributes("aria-label")).toBe("2 positions open");

      TripWorkerRoleServices.update.mockResolvedValue({ data: { id: 4, quantity: 1, availableCount: 0 } });
      const quantity = wrapper
        .findAll("tbody tr")
        .find((tr) => tr.text().includes("Driver"))
        .find('input[type="number"]');
      await quantity.setValue(1);
      await quantity.trigger("change");
      await flushPromises();
      expect(icon("Driver").attributes("aria-label")).toBe("All positions filled");
      wrapper.unmount();
    });

    it("The trip page roles card is titled Team roles", async () => {
      const { wrapper } = await mountWithPlugins(TripWorkerRolesCard, {
        props: { tripId: 7, orgId: 3 },
        global: { plugins: [vuetify] },
      });
      await flushPromises();
      expect(wrapper.find('h2 [data-testid="team-roles-title"]').text()).toBe("Team roles");
      wrapper.unmount();
    });

    it("Team roles opens and closes from its heading row", async () => {
      const { wrapper } = await mountWithPlugins(TripWorkerRolesCard, {
        props: { tripId: 7, orgId: 3 },
        global: { plugins: [vuetify] },
      });
      await flushPromises();
      const toggle = wrapper.find('[data-testid="team-roles-toggle"]');
      const content = () => wrapper.find('[data-testid="team-roles-content"]');
      const shown = () => !(content().attributes("style") || "").includes("display: none");

      expect(toggle.text()).toContain("Team roles");
      expect(toggle.attributes("aria-expanded")).toBe("false");
      expect(shown()).toBe(false);

      await toggle.trigger("click");
      expect(toggle.attributes("aria-expanded")).toBe("true");
      expect(shown()).toBe(true);
      expect(content().text()).toContain("Nurse");

      await toggle.trigger("click");
      expect(toggle.attributes("aria-expanded")).toBe("false");
      expect(shown()).toBe(false);
      wrapper.unmount();
    });
  });
});
