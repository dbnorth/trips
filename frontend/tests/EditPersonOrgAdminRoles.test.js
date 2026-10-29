/**
 * Feature 99 — Org Admins Assign Organization Roles
 * Spec: features/feature-99-org-admin-assign-roles.md
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
  default: { get: vi.fn(), getPictureUrl: vi.fn(() => "") },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn(), getAllForMenu: vi.fn() },
}));

vi.mock("../src/services/roleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/orgPeopleRoleServices.js", () => ({
  default: { getByPerson: vi.fn(), create: vi.fn(), delete: vi.fn() },
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
  default: { name: "PhoneCountryCodeInput", template: "<div />", props: ["modelValue", "label"] },
}));

const HOPE = { id: 3, name: "Hope Missions" };
const ROLES = [
  { id: 1, roleName: "Org Admin" },
  { id: 2, roleName: "Trip Leader" },
  { id: 3, roleName: "Trip Participant" },
  { id: 4, roleName: "Pending User" },
  { id: 5, roleName: "Agent" },
];
const roleRow = (id, peopleId, roleId) => ({
  id,
  orgId: HOPE.id,
  peopleId,
  roleId,
  organization: HOPE,
  role: ROLES.find((r) => r.id === roleId),
});

const OLIVIA = 1;
const ANA = 5;

const open = async (personId) => {
  const { wrapper } = await mountWithPlugins(EditPersonDialog, {
    props: { modelValue: false, personId },
    global: {
      plugins: [vuetify],
      stubs: { VDialog: { template: "<div><slot /></div>" } },
    },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
};

const select = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VSelect" }).find((s) => s.props("label") === label);

const button = (wrapper, text) => wrapper.findAll("button").find((b) => b.text() === text);

describe("Feature 99 — Org Admins Assign Organization Roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 1,
      personId: OLIVIA,
      email: "olivia@example.org",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: HOPE.id, orgName: HOPE.name, roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: HOPE.id,
    });
    RoleServices.getAll.mockResolvedValue({ data: ROLES });
    PersonServices.get.mockImplementation((id) =>
      Promise.resolve({
        data:
          Number(id) === OLIVIA
            ? { id: OLIVIA, userId: 1, firstName: "Olivia", lastName: "Admin", email: "olivia@example.org", version: 1 }
            : { id: ANA, userId: 9, firstName: "Ana", lastName: "Lopez", email: "ana@example.org", version: 1 },
      })
    );
    OrgPeopleRoleServices.getByPerson.mockImplementation((id) =>
      Promise.resolve({
        data: Number(id) === OLIVIA ? [roleRow(10, OLIVIA, 1)] : [roleRow(20, ANA, 3)],
      })
    );
  });

  describe("US-99.1 — Org Admin adds roles to people in their organization", () => {
    it("An Org Admin sees the Organizations section for their organization", async () => {
      const wrapper = await open(ANA);

      expect(OrgPeopleRoleServices.getByPerson).toHaveBeenCalledWith(ANA);
      expect(OrganizationServices.getAllForMenu).not.toHaveBeenCalled();
      const rows = wrapper.findAll("tbody tr").map((tr) => tr.text());
      expect(rows).toEqual([expect.stringContaining("Hope Missions")]);
      expect(rows[0]).toContain("Trip Participant");
      expect(wrapper.text()).not.toContain("Grace Outreach");

      expect(select(wrapper, "Organization").props("items")).toEqual([HOPE]);
      expect(select(wrapper, "Organization").props("modelValue")).toBeNull();
      expect(select(wrapper, "Role").props("items").map((r) => r.roleName)).toEqual([
        "Org Admin",
        "Trip Leader",
        "Trip Participant",
        "Pending User",
        "Agent",
      ]);
      wrapper.unmount();
    });

    it("Add role saves from the dialog", async () => {
      const wrapper = await open(ANA);
      OrgPeopleRoleServices.create.mockResolvedValue({ data: { message: "Organization role added." } });
      OrgPeopleRoleServices.getByPerson.mockResolvedValue({
        data: [roleRow(20, ANA, 3), roleRow(21, ANA, 2)],
      });

      await select(wrapper, "Organization").vm.$emit("update:modelValue", HOPE.id);
      await select(wrapper, "Role").vm.$emit("update:modelValue", 2);
      await button(wrapper, "Add role").trigger("click");
      await flushPromises();

      expect(OrgPeopleRoleServices.create).toHaveBeenCalledWith({ peopleId: ANA, orgId: HOPE.id, roleId: 2 });
      expect(wrapper.findAll("tbody tr").some((tr) => tr.text().includes("Trip Leader"))).toBe(true);
      expect(wrapper.text()).toContain("Organization role added.");
      wrapper.unmount();
    });
  });

  describe("US-99.2 — Org Admin removes roles, keeping at least one Org Admin", () => {
    it("A refused removal shows the message in the dialog", async () => {
      const wrapper = await open(OLIVIA);
      OrgPeopleRoleServices.delete.mockRejectedValue({
        response: { status: 400, data: { message: "An organization must keep at least one Org Admin." } },
      });

      await button(wrapper, "Remove").trigger("click");
      await flushPromises();

      expect(OrgPeopleRoleServices.delete).toHaveBeenCalledWith(10);
      expect(wrapper.text()).toContain("An organization must keep at least one Org Admin.");
      expect(wrapper.findAll("tbody tr").some((tr) => tr.text().includes("Org Admin"))).toBe(true);
      wrapper.unmount();
    });
  });

  describe("US-99.3 — Org Admins stay inside their own organizations", () => {
    it("An Org Admin does not see the System administrator switch", async () => {
      const wrapper = await open(ANA);
      expect(wrapper.text()).not.toContain("System administrator");
      wrapper.unmount();
    });
  });
});
