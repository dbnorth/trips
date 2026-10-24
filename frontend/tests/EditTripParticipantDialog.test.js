/**
 * Feature 74 — Trip Add-on Expenses
 * Spec: features/feature-74-trip-addon-expenses.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EditTripParticipantDialog from "../src/components/EditTripParticipantDialog.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import TripWorkerRoleServices from "../src/services/tripWorkerRoleServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { update: vi.fn() },
}));

vi.mock("../src/services/tripWorkerRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

const NORA = {
  id: 40,
  tripId: 7,
  status: "approved",
  tripWorkerRoleId: null,
  participantCost: "2250.00",
  addonExpenses: [],
  version: 3,
  person: { firstName: "Nora", lastName: "Diaz" },
};

const button = (el, text) => el.findAll("button").find((b) => b.text().trim() === text);

describe("Feature 74 — Trip Add-on Expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({ data: { id: 7, participantCost: 2000 } });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripPeopleRoleServices.update.mockResolvedValue({ data: {} });
  });

  describe("US-74.1 — Staff add add-on expenses to a participant", () => {
    it("Edit dialog adds and removes add-on expenses", async () => {
      const { wrapper } = await mountWithPlugins(EditTripParticipantDialog, {
        props: { modelValue: false, participant: NORA },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      await button(wrapper, "Add expense").trigger("click");
      await button(wrapper, "Add expense").trigger("click");
      const rows = wrapper.findAll('[data-testid="addon-expense-row"]');
      expect(rows).toHaveLength(2);
      const fill = async (row, description, cost) => {
        const inputs = row.findAll("input");
        await inputs[0].setValue(description);
        await inputs[1].setValue(cost);
      };
      await fill(rows[0], "Travel insurance", "75");
      await fill(rows[1], "Antigua weekend excursion", "400");
      expect(wrapper.find('[data-testid="addon-total"]').text()).toBe("Add-on total: $475.00");

      await rows[1].find('[data-testid="remove-addon-expense"]').trigger("click");
      expect(wrapper.findAll('[data-testid="addon-expense-row"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="addon-total"]').text()).toBe("Add-on total: $75.00");

      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.update).toHaveBeenCalledWith(
        40,
        expect.objectContaining({
          addonExpenses: [{ description: "Travel insurance", cost: 75, daysBefore: 0, daysAfter: 0 }],
        })
      );

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
    TripServices.get.mockResolvedValue({ data: { id: 7, participantCost: 1500 } });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripPeopleRoleServices.update.mockResolvedValue({ data: {} });
  });

  const mountDialog = async () => {
    const { wrapper } = await mountWithPlugins(EditTripParticipantDialog, {
      props: { modelValue: false, participant: { ...NORA, person: { firstName: "Ana", lastName: "Lopez" } } },
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    return wrapper;
  };

  const fillRow = async (row, values) => {
    const inputs = row.findAll("input");
    for (const [index, value] of values.entries()) await inputs[index].setValue(value);
  };

  describe("US-78.3 — Staff set days on add-on expenses", () => {
    it("Edit dialog saves days on an add-on expense", async () => {
      const wrapper = await mountDialog();

      await button(wrapper, "Add expense").trigger("click");
      await button(wrapper, "Add expense").trigger("click");
      const rows = wrapper.findAll('[data-testid="addon-expense-row"]');
      await fillRow(rows[0], ["Extra hotel night", "80", "", "1"]);
      await fillRow(rows[1], ["Late checkout", "20", "", "1"]);

      await button(wrapper, "Save").trigger("click");
      await flushPromises();
      expect(wrapper.text()).toContain("Only one add-on expense can have days after the trip.");
      expect(TripPeopleRoleServices.update).not.toHaveBeenCalled();

      await rows[1].find('[data-testid="remove-addon-expense"]').trigger("click");
      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.update).toHaveBeenCalledWith(
        40,
        expect.objectContaining({
          addonExpenses: [{ description: "Extra hotel night", cost: 80, daysBefore: 0, daysAfter: 1 }],
        })
      );

      wrapper.unmount();
    });
  });
});
