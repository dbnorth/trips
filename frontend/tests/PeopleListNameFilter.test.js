/**
 * Feature 98 — Fix: Clearing the People Name Filter
 * Spec: features/feature-98-fix-people-name-filter-clear.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import PeopleList from "../src/views/PeopleList.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { getAll: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";

describe("Feature 98 — Fix: Clearing the People Name Filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.getAll.mockResolvedValue({ data: [] });
    PersonServices.getAll.mockResolvedValue({
      data: [
        { id: 1, firstName: "Ana", lastName: "Lopez", email: "ana@example.org" },
        { id: 2, firstName: "Ben", lastName: "Ruiz", email: "ben@example.org" },
      ],
    });
    Utils.setStore("user", {
      token: "t",
      isAdmin: true,
      actingOrganizationId: 3,
      currentOrgId: 3,
      currentOrgName: "Hope Missions",
    });
  });

  afterEach(() => {
    Utils.removeItem("user");
  });

  const listedNames = (wrapper) =>
    wrapper.findAll("tbody tr").map((row) => row.find("td").text());

  describe("US-98.1 — Clear the name filter with the X", () => {
    it("Clearing the name filter shows everyone again", async () => {
      const { wrapper } = await mountWithPlugins(PeopleList);
      await flushPromises();
      const nameField = wrapper.findAllComponents({ name: "VTextField" }).find((f) => f.props("label") === "Name");
      const input = nameField.find("input");

      await input.setValue("Ana");
      expect(listedNames(wrapper)).toEqual(["Ana Lopez"]);

      await nameField.find(".v-field__clearable .v-icon").trigger("click");
      await flushPromises();

      expect(input.element.value).toBe("");
      expect(listedNames(wrapper)).toEqual(["Ana Lopez", "Ben Ruiz"]);

      await input.setValue("Ben");
      expect(listedNames(wrapper)).toEqual(["Ben Ruiz"]);
    });
  });
});
