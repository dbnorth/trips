/**
 * Feature 37 — Person Bio Below Birthdate
 * Spec: features/feature-37-person-bio-below-birthdate.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EditPersonDialog from "../src/components/EditPersonDialog.vue";
import PersonServices from "../src/services/personServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/personServices.js", () => ({
  default: {
    get: vi.fn(),
    getPictureUrl: vi.fn(() => ""),
  },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn(), getAllForMenu: vi.fn() },
}));

vi.mock("../src/services/roleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/orgPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/components/AddressFields.vue", () => ({
  default: { name: "AddressFields", template: "<div />", props: ["modelValue"] },
}));

vi.mock("../src/components/PersonDocumentsCard.vue", () => ({
  default: { name: "PersonDocumentsCard", template: "<div />", props: ["personId"] },
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

describe("Feature 37 — Person Bio Below Birthdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 1,
      personId: 1,
      email: "staff@example.com",
      isAdmin: false,
      token: "t",
      orgRoles: [],
      tripRoles: [],
      currentOrgId: 3,
    });
    PersonServices.get.mockResolvedValue({
      data: { id: 5, firstName: "Ada", lastName: "Lovelace", version: 1 },
    });
  });

  it("Edit person shows Bio below Birthdate", async () => {
    const { wrapper } = await mountWithPlugins(EditPersonDialog, {
      props: { modelValue: false, personId: 5 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    const text = wrapper.text();
    const birth = text.indexOf("Birthdate");
    const bio = text.indexOf("Bio");
    const emergency = text.indexOf("Emergency contact name");
    expect(birth).toBeGreaterThan(-1);
    expect(bio).toBeGreaterThan(birth);
    expect(emergency).toBeGreaterThan(bio);

    wrapper.unmount();
  });
});
