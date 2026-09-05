/**
 * Feature 14 — Add Person Role Dropdown Does Not Crash
 * Spec: features/feature-14-add-person-role-select-fix.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import AddPersonDialog from "../src/components/AddPersonDialog.vue";
import RoleServices from "../src/services/roleServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/roleServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock("../src/components/AddressFields.vue", () => ({
  default: { name: "AddressFields", template: "<div />", props: ["modelValue"] },
}));

vi.mock("../src/components/PersonProfileFields.vue", () => ({
  default: { name: "PersonProfileFields", template: "<div />", props: ["modelValue"] },
}));

vi.mock("../src/components/PhoneInput.vue", () => ({
  default: { name: "PhoneInput", template: "<div />", props: ["modelValue", "label"] },
}));

vi.mock("../src/components/PhoneCountryCodeInput.vue", () => ({
  default: {
    name: "PhoneCountryCodeInput",
    template: "<div />",
    props: ["modelValue", "label"],
  },
}));

const roles = [
  {
    id: 1,
    roleName: "Pending User",
    roleDescription: "Awaiting organization approval",
  },
  {
    id: 2,
    roleName: "Trip Participant",
    roleDescription: null,
  },
];

/** Stub matches Vuetify 4 `#item` shape: `item` is the raw object (not `item.raw`). */
const VSelectStub = {
  name: "VSelect",
  props: {
    modelValue: { default: null },
    items: { type: Array, default: () => [] },
    label: { type: String, default: "" },
    itemTitle: { type: String, default: "title" },
    itemValue: { type: String, default: "value" },
    density: { type: String, default: undefined },
  },
  emits: ["update:modelValue"],
  template: `
    <div class="v-select-stub" :data-label="label">
      <button type="button" class="open-menu" @click="open = true">Open {{ label }}</button>
      <div v-if="open" class="menu">
        <div v-for="raw in items" :key="raw[itemValue] ?? raw.id" class="menu-item">
          <slot name="item" :props="{ title: raw[itemTitle] }" :item="raw" />
        </div>
      </div>
    </div>
  `,
  data: () => ({ open: false }),
};

describe("Feature 14 — Add Person Role select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      email: "admin@example.com",
      userId: 1,
      personId: 1,
      token: "tok",
      isAdmin: true,
      orgRoles: [],
      tripRoles: [],
      currentOrgId: 3,
    });
    RoleServices.getAll.mockResolvedValue({ data: roles });
    OrganizationServices.getAll.mockResolvedValue({
      data: [{ id: 3, name: "Hope Mission" }],
    });
  });

  describe("US-14.1 — Open Role select when adding a person", () => {
    it("Admin opens Role dropdown on Add person", async () => {
      const { wrapper } = await mountWithPlugins(AddPersonDialog, {
        props: { modelValue: false },
        global: {
          plugins: [vuetify],
          stubs: {
            VSelect: VSelectStub,
            VDialog: { template: "<div><slot /></div>" },
          },
        },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      const roleStub = wrapper
        .findAll(".v-select-stub")
        .find((n) => n.attributes("data-label") === "Role");
      expect(roleStub).toBeTruthy();

      expect(() => {
        roleStub.find(".open-menu").trigger("click");
      }).not.toThrow();
      await flushPromises();

      const listItems = roleStub.findAllComponents({ name: "VListItem" });
      expect(listItems.length).toBe(2);
      expect(listItems[0].props("title")).toBe("Pending User");
      expect(listItems[0].props("subtitle")).toBe("Awaiting organization approval");
      expect(listItems[1].props("title")).toBe("Trip Participant");
    });
  });
});
