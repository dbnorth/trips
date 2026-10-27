/**
 * Feature 91 — Document Types by Organization
 * Spec: features/feature-91-org-document-types.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import DocumentTypesList from "../src/views/DocumentTypesList.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    getAllForMenu: vi.fn().mockResolvedValue({ data: [] }),
    getLogoUrl: vi.fn(),
  },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { logoutUser: vi.fn(), me: vi.fn() },
}));

vi.mock("../src/components/EditPersonDialog.vue", () => ({
  default: { name: "EditPersonDialog", template: "<div />" },
}));

vi.mock("../src/components/DocumentTypeFormDialog.vue", () => ({
  default: {
    name: "DocumentTypeFormDialog",
    template: "<div />",
    props: ["modelValue", "documentTypeId", "orgId"],
  },
}));

const hana = {
  userId: 2,
  personId: 2,
  email: "hana@example.org",
  isAdmin: false,
  token: "t",
  orgRoles: [
    { orgId: 4, orgName: "Healing Hands", roleName: "Org Admin" },
    { orgId: 5, orgName: "Clinic Friends", roleName: "Org Admin" },
  ],
  tripRoles: [],
  currentOrgId: 4,
  currentOrgName: "Healing Hands",
};

const participant = {
  userId: 3,
  personId: 3,
  email: "pat@example.org",
  isAdmin: false,
  token: "t",
  orgRoles: [{ orgId: 4, orgName: "Healing Hands", roleName: "Trip Participant" }],
  tripRoles: [{ tripId: 9, orgId: 4, orgName: "Healing Hands", roleName: "Trip Participant" }],
  currentOrgId: 4,
};

const mountMenu = () =>
  mountWithPlugins(MenuBar, {
    global: {
      stubs: {
        VAppBar: { template: "<div><slot /></div>" },
        VBtn: { props: ["to"], template: "<button><slot /></button>" },
      },
    },
  });

describe("Feature 91 — Document Types by Organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    DocumentTypeServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Org Admins see Document types in the menu bar", async () => {
    Utils.setStore("user", hana);
    const { wrapper } = await mountMenu();
    await flushPromises();
    expect(wrapper.text()).toContain("Document types");
    wrapper.unmount();

    Utils.setStore("user", participant);
    const { wrapper: participantMenu } = await mountMenu();
    await flushPromises();
    expect(participantMenu.text()).not.toContain("Document types");
    participantMenu.unmount();

    Utils.setStore("user", hana);
    const router = await createTestRouter("/home");
    await router.push("/document-types");
    expect(router.currentRoute.value.name).toBe("documentTypes");

    Utils.setStore("user", participant);
    await router.push("/home");
    await router.push("/document-types");
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("Document types lists the selected organization's types", async () => {
    DocumentTypeServices.getAll.mockResolvedValue({
      data: [{ id: 7, orgId: 4, description: "CPR Certificate", type: "certification" }],
    });
    Utils.setStore("user", hana);

    const { wrapper } = await mountWithPlugins(DocumentTypesList);
    await flushPromises();

    expect(DocumentTypeServices.getAll).toHaveBeenCalledWith({ orgId: 4 });
    expect(wrapper.text()).toContain("Showing document types for Healing Hands.");
    expect(wrapper.text()).toContain("CPR Certificate");
    expect(wrapper.text()).toContain("Add document type");
    expect(wrapper.findComponent({ name: "DocumentTypeFormDialog" }).props("orgId")).toBe(4);
    wrapper.unmount();

    Utils.setStore("user", participant);
    const { wrapper: notAdmin } = await mountWithPlugins(DocumentTypesList);
    await flushPromises();
    expect(notAdmin.text()).toContain("Only organization admins can manage document types.");
    notAdmin.unmount();

    Utils.setStore("user", { ...hana, isAdmin: true, orgRoles: [], actingOrganizationId: null });
    const { wrapper: sam } = await mountWithPlugins(DocumentTypesList);
    await flushPromises();
    expect(sam.text()).toContain("Select an organization using the menu bar to manage document types.");
    sam.unmount();
  });
});
