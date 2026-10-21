/**
 * Feature 37 — Person Bio Below Birthdate
 * Spec: features/feature-37-person-bio-below-birthdate.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EditPersonDialog from "../src/components/EditPersonDialog.vue";
import PersonServices from "../src/services/personServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import RoleServices from "../src/services/roleServices.js";
import OrgPeopleRoleServices from "../src/services/orgPeopleRoleServices.js";
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

/**
 * Feature 71 — System Admin Only Password and Login Email Changes
 * Spec: features/feature-71-system-admin-only-account-changes.md
 */
describe("Feature 71 — System Admin Only Password and Login Email Changes", () => {
  const signInAs = (isAdmin) =>
    Utils.setStore("user", {
      userId: 1,
      personId: 1,
      email: "staff@example.com",
      isAdmin,
      token: "t",
      orgRoles: isAdmin ? [] : [{ orgId: 3, roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });

  const openForMember = async () => {
    const { wrapper } = await mountWithPlugins(EditPersonDialog, {
      props: { modelValue: false, personId: 5 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    OrganizationServices.getAllForMenu.mockResolvedValue({ data: [] });
    RoleServices.getAll.mockResolvedValue({ data: [] });
    OrgPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
    PersonServices.get.mockResolvedValue({
      data: { id: 5, userId: 9, firstName: "Ana", lastName: "Lopez", email: "ana@example.org", version: 1 },
    });
  });

  describe("US-71.1 — Only System Admins set other people's passwords", () => {
    const ADMIN_PASSWORD_HINT = "Optional. Leave blank to keep the current password.";

    it("Edit person shows New password only to System Admins", async () => {
      signInAs(false);
      const orgAdminView = await openForMember();
      expect(orgAdminView.text()).not.toContain(ADMIN_PASSWORD_HINT);
      orgAdminView.unmount();

      signInAs(true);
      const systemAdminView = await openForMember();
      expect(systemAdminView.text()).toContain(ADMIN_PASSWORD_HINT);
      systemAdminView.unmount();
    });
  });

  describe("US-71.2 — Only System Admins change login emails", () => {
    it("Edit person locks the login email for Org Admins", async () => {
      signInAs(false);
      const orgAdminView = await openForMember();
      expect(orgAdminView.find("input[type='email']").attributes("readonly")).toBeDefined();
      expect(orgAdminView.text()).toContain("Only a System Admin can change a login email.");
      orgAdminView.unmount();

      signInAs(true);
      const systemAdminView = await openForMember();
      expect(systemAdminView.find("input[type='email']").attributes("readonly")).toBeUndefined();
      expect(systemAdminView.text()).toContain("Updates the linked user login email");
      systemAdminView.unmount();
    });
  });
});
