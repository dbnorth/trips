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
  default: { get: vi.fn(), update: vi.fn() },
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
    TripPeopleRoleServices.get.mockResolvedValue({ data: { travelOptions: [] } });
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
    TripPeopleRoleServices.get.mockResolvedValue({ data: { travelOptions: [] } });
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

/**
 * Feature 89 — Negative Trip Days and Wider Option Descriptions
 * Spec: features/feature-89-negative-trip-days.md
 */
describe("Feature 89 — Negative Trip Days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({ data: { id: 7, participantCost: 950 } });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripPeopleRoleServices.get.mockResolvedValue({ data: { travelOptions: [] } });
    TripPeopleRoleServices.update.mockResolvedValue({ data: {} });
  });

  describe("US-89.1 — Staff give days that shorten the trip", () => {
    it("Add-on days accept negative numbers", async () => {
      const { wrapper } = await mountWithPlugins(EditTripParticipantDialog, {
        props: { modelValue: false, participant: { ...NORA, person: { firstName: "Ana", lastName: "Lopez" } } },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      await button(wrapper, "Add expense").trigger("click");
      const inputs = wrapper.find('[data-testid="addon-expense-row"]').findAll("input");
      await inputs[0].setValue("Late arrival");
      await inputs[1].setValue("0");
      await inputs[2].setValue("-1");
      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.update).toHaveBeenCalledWith(
        40,
        expect.objectContaining({
          addonExpenses: [{ description: "Late arrival", cost: 0, daysBefore: -1, daysAfter: 0 }],
        })
      );
      wrapper.unmount();
    });
  });
});

/**
 * Feature 92 — Trip Options in the Participant Edit Dialog
 * Spec: features/feature-92-participant-edit-trip-options.md
 */
describe("Feature 92 — Trip Options in the Participant Edit Dialog", () => {
  const DEPART_SATURDAY = { id: 1, setNumber: 1, description: "Depart Saturday", priceAdjustment: "0.00", daysBefore: 0, daysAfter: 0 };
  const ANTIGUA = {
    id: 2,
    setNumber: 1,
    description: "Antigua Trip - stay Friday night",
    priceAdjustment: "150.00",
    daysBefore: 0,
    daysAfter: 1,
  };
  const VOLCANO = { id: 3, setNumber: 2, description: "Volcano hike - extra day", priceAdjustment: "75.00", daysBefore: 0, daysAfter: 1 };
  const ANA = { ...NORA, participantCost: "1550.00", person: { firstName: "Ana", lastName: "Lopez" } };
  const BEN = { ...NORA, id: 41, participantCost: null, person: { firstName: "Ben", lastName: "Ortiz" } };

  const withSelected = (selectedIds) =>
    [DEPART_SATURDAY, ANTIGUA, VOLCANO].map((option) => ({ ...option, selected: selectedIds.includes(option.id) }));

  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({ data: { id: 7, participantCost: 1500 } });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
    TripPeopleRoleServices.get.mockResolvedValue({ data: { travelOptions: withSelected([1]) } });
    TripPeopleRoleServices.update.mockResolvedValue({ data: {} });
  });

  const mountDialog = async (participant = ANA) => {
    const { wrapper } = await mountWithPlugins(EditTripParticipantDialog, {
      props: { modelValue: false, participant },
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    return wrapper;
  };

  const optionInput = (wrapper, label) =>
    wrapper
      .find('[data-testid="participant-trip-options"]')
      .findAll(".v-selection-control")
      .find((control) => control.text().includes(label))
      .find("input");

  const choose = async (wrapper, label, checked = true) => {
    await optionInput(wrapper, label).setValue(checked);
    await flushPromises();
  };

  const costInput = (wrapper) => wrapper.find(".money-input input");

  describe("US-92.1 — Staff see and change a participant's trip options", () => {
    it("The Edit dialog shows the participant's trip options", async () => {
      const wrapper = await mountDialog();
      const section = wrapper.find('[data-testid="participant-trip-options"]');

      expect(section.exists()).toBe(true);
      const text = wrapper.text();
      expect(text.indexOf("Trip options")).toBeGreaterThan(text.indexOf("Participant cost"));
      expect(text.indexOf("Trip options")).toBeLessThan(text.indexOf("Add-on expenses"));
      expect(section.text()).toMatch(/Trip Option 1\s+\(required\)/);
      expect(section.text()).toContain("+$150.00");
      expect(section.text()).toContain("Trip Option 2");
      expect(section.text()).toContain("+$75.00");
      expect(section.text()).not.toContain("Trip price");
      expect(optionInput(wrapper, "Depart Saturday").element.checked).toBe(true);
      expect(optionInput(wrapper, "Antigua Trip").element.checked).toBe(false);
      expect(optionInput(wrapper, "Volcano hike").attributes("type")).toBe("checkbox");
      expect(optionInput(wrapper, "Volcano hike").element.checked).toBe(false);
      wrapper.unmount();
    });

    it("Save sends the selected trip options", async () => {
      const wrapper = await mountDialog();

      await choose(wrapper, "Antigua Trip");
      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.update).toHaveBeenCalledWith(
        40,
        expect.objectContaining({ selectedTravelOptionIds: [2], participantCost: 1700 })
      );
      wrapper.unmount();
    });

    it("Two trip options with days after are refused", async () => {
      const wrapper = await mountDialog();

      await choose(wrapper, "Antigua Trip");
      await choose(wrapper, "Volcano hike");
      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Choose only one trip option with days after the trip.");
      expect(TripPeopleRoleServices.update).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it("A trip with no trip options shows no section", async () => {
      TripPeopleRoleServices.get.mockResolvedValue({ data: { travelOptions: [] } });
      const wrapper = await mountDialog();

      expect(wrapper.find('[data-testid="participant-trip-options"]').exists()).toBe(false);
      expect(wrapper.text()).not.toContain("Trip options");

      await button(wrapper, "Save").trigger("click");
      await flushPromises();
      expect(TripPeopleRoleServices.update.mock.calls[0][1]).not.toHaveProperty("selectedTravelOptionIds");
      wrapper.unmount();
    });
  });

  describe("US-92.2 — Changing options updates the participant cost", () => {
    it("Participant cost moves by the price difference", async () => {
      const wrapper = await mountDialog();

      await choose(wrapper, "Antigua Trip");
      expect(costInput(wrapper).element.value).toBe("$1,700.00");

      await choose(wrapper, "Depart Saturday");
      expect(costInput(wrapper).element.value).toBe("$1,550.00");
      wrapper.unmount();
    });

    it("A blank participant cost starts from the trip cost", async () => {
      TripPeopleRoleServices.get.mockResolvedValue({ data: { travelOptions: withSelected([]) } });
      const wrapper = await mountDialog(BEN);

      await choose(wrapper, "Volcano hike");

      expect(costInput(wrapper).element.value).toBe("$1,575.00");
      wrapper.unmount();
    });

    it("Staff may type over the new cost", async () => {
      const wrapper = await mountDialog();

      await choose(wrapper, "Antigua Trip");
      await costInput(wrapper).trigger("focus");
      await costInput(wrapper).setValue("1600.00");
      await costInput(wrapper).trigger("blur");
      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.update).toHaveBeenCalledWith(
        40,
        expect.objectContaining({ selectedTravelOptionIds: [2], participantCost: 1600 })
      );
      wrapper.unmount();
    });
  });

  describe("US-92.3 — Add expense looks like a button", () => {
    it("Add expense is an outlined button", async () => {
      const wrapper = await mountDialog();
      const add = wrapper.find('[data-testid="add-addon-expense"]');

      expect(add.classes()).toContain("v-btn--variant-outlined");
      expect(add.classes()).toContain("text-primary");
      expect(add.classes()).not.toContain("v-btn--size-small");
      expect(add.find(".mdi-plus").exists()).toBe(true);

      await add.trigger("click");
      expect(wrapper.findAll('[data-testid="addon-expense-row"]')).toHaveLength(1);
      wrapper.unmount();
    });
  });
});
