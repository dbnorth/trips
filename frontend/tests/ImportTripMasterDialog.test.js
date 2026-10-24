/**
 * Feature 80 — Import Trip Master CSV
 * Spec: features/feature-80-trip-master-import.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripsList from "../src/views/TripsList.vue";
import ImportTripMasterDialog from "../src/components/ImportTripMasterDialog.vue";
import TripServices from "../src/services/tripServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn(), importTripMaster: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/components/AddTripDialog.vue", () => ({
  default: { name: "AddTripDialog", template: "<div />", props: ["modelValue"] },
}));

vi.mock("../src/components/CopyTripDialog.vue", () => ({
  default: { name: "CopyTripDialog", template: "<div />", props: ["modelValue", "trips"] },
}));

vi.mock("../src/components/EditTripDialog.vue", () => ({
  default: { name: "EditTripDialog", template: "<div />", props: ["modelValue", "tripId"] },
}));

const dialogStub = { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' };

const omar = {
  email: "omar@example.org",
  userId: 1,
  personId: 1,
  token: "tok",
  isAdmin: false,
  currentOrgId: 10,
  currentOrgName: "Hope Missions",
  orgRoles: [{ orgId: 10, orgName: "Hope Missions", roleName: "Org Admin" }],
  tripRoles: [],
};

const trip = { id: 7, orgId: 10, name: "Guatemala Clinic 2027", startDate: "2027-06-10", endDate: "2027-06-17" };

const buttonNamed = (wrapper, text) => wrapper.findAll("button").find((b) => b.text().trim() === text);

describe("Feature 80 — Import Trip Master CSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    TripServices.getAll.mockResolvedValue({ data: [trip] });
    OrganizationServices.get.mockResolvedValue({ data: { id: 10, name: "Hope Missions" } });
  });

  describe("US-80.1 — Import a Trip Master CSV into a trip", () => {
    it("Trips list imports a Trip Master CSV", async () => {
      Utils.setStore("user", omar);
      TripServices.importTripMaster
        .mockResolvedValueOnce({
          data: {
            rowCount: 6,
            added: 4,
            updated: 1,
            skipped: 1,
            notes: [{ row: 13, name: "Jack Lawler", message: "On the waiting list." }],
          },
        })
        .mockRejectedValueOnce({
          response: { status: 400, data: { message: "This file isn't a Trip Master CSV. Missing columns: E-Mail." } },
        });
      const { wrapper } = await mountWithPlugins(TripsList, { global: { stubs: { VDialog: dialogStub } } });
      await flushPromises();

      await wrapper.find('button[aria-label="Import"]').trigger("click");
      await flushPromises();
      const dialog = wrapper.findComponent(ImportTripMasterDialog);
      expect(dialog.text()).toContain("Import Trip Master CSV");
      expect(dialog.text()).toContain("Guatemala Clinic 2027");
      expect(buttonNamed(dialog, "Import").attributes("disabled")).toBeDefined();

      const file = new File(["Position Required"], "trip-master.csv", { type: "text/csv" });
      await dialog.findComponent({ name: "VFileInput" }).vm.$emit("update:modelValue", [file]);
      await flushPromises();
      await buttonNamed(dialog, "Import").trigger("click");
      await flushPromises();

      expect(TripServices.importTripMaster).toHaveBeenCalledWith(7, file);
      expect(dialog.find('[data-testid="import-summary"]').text()).toContain(
        "Imported 6 rows: 4 people added, 1 updated, 1 skipped."
      );
      expect(dialog.find('[data-testid="import-notes"]').text()).toBe(
        "Row 13 — Jack Lawler: On the waiting list."
      );

      await buttonNamed(dialog, "Import").trigger("click");
      await flushPromises();
      expect(dialog.find('[data-testid="import-error"]').text()).toBe(
        "This file isn't a Trip Master CSV. Missing columns: E-Mail."
      );

      await buttonNamed(dialog, "Close").trigger("click");
      await flushPromises();
      expect(TripServices.getAll).toHaveBeenCalledTimes(2);

      wrapper.unmount();
    });
  });

  describe("US-80.3 — Positions match the trip's worker roles", () => {
    it("Import dialog warns about missing worker roles", async () => {
      TripServices.importTripMaster.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: "Add these worker roles to the trip, then import again.",
            missingRoles: ["RN Circulator", "Scrub Tech"],
          },
        },
      });
      const { wrapper } = await mountWithPlugins(ImportTripMasterDialog, {
        props: { modelValue: true, trip },
        global: { stubs: { VDialog: dialogStub } },
      });

      const file = new File(["Position Required"], "trip-master.csv", { type: "text/csv" });
      await wrapper.findComponent({ name: "VFileInput" }).vm.$emit("update:modelValue", [file]);
      await flushPromises();
      await buttonNamed(wrapper, "Import").trigger("click");
      await flushPromises();

      const warning = wrapper.find('[data-testid="import-missing-roles"]');
      expect(warning.classes()).toContain("v-alert");
      expect(warning.text()).toContain("Add these worker roles to the trip, then import again.");
      expect(warning.findAll("li").map((li) => li.text())).toEqual(["RN Circulator", "Scrub Tech"]);
      expect(wrapper.find('[data-testid="import-error"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="import-summary"]').exists()).toBe(false);

      wrapper.unmount();
    });
  });
});
