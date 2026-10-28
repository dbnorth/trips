/**
 * Feature 93 — Org Admins Edit Their Organization
 * Spec: features/feature-93-org-admin-edit-organization.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import OrganizationsList from "../src/views/OrganizationsList.vue";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    getAll: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    uploadLogo: vi.fn(),
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

const HOPE = { id: 4, name: "Hope Missions", email: "info@hopemissions.org", city: "Nashville", version: 0 };
const GRACE = { id: 5, name: "Grace Clinics", email: null, city: null, version: 0 };
const MERCY = { id: 6, name: "Mercy Teams", email: null, city: null, version: 0 };

const omar = {
  userId: 2,
  personId: 2,
  email: "omar@example.org",
  isAdmin: false,
  token: "t",
  orgRoles: [
    { orgId: 4, orgName: "Hope Missions", roleName: "Org Admin" },
    { orgId: 5, orgName: "Grace Clinics", roleName: "Org Admin" },
  ],
  tripRoles: [],
  currentOrgId: 4,
  currentOrgName: "Hope Missions",
};

const tara = {
  userId: 3,
  personId: 3,
  email: "tara@example.org",
  isAdmin: false,
  token: "t",
  orgRoles: [],
  tripRoles: [{ tripId: 9, orgId: 4, orgName: "Hope Missions", roleName: "Trip Leader" }],
  currentOrgId: 4,
};

const sam = { userId: 1, personId: 1, email: "sam@example.org", isAdmin: true, token: "t", orgRoles: [], tripRoles: [] };

const mountMenu = () =>
  mountWithPlugins(MenuBar, {
    global: {
      stubs: {
        VAppBar: { template: "<div><slot /></div>" },
        VBtn: { props: ["to"], template: "<button><slot /></button>" },
      },
    },
  });

const mountList = () =>
  mountWithPlugins(OrganizationsList, {
    global: {
      stubs: {
        VDialog: { template: "<div><slot /></div>" },
        AddOrganizationDialog: { template: "<div />" },
      },
    },
  });

const rowNames = (wrapper) => wrapper.findAll("tbody tr").map((row) => row.findAll("td")[0]?.text());
const button = (wrapper, text) => wrapper.findAll("button").find((b) => b.text().trim() === text);

describe("Feature 93 — Org Admins Edit Their Organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    OrganizationServices.getAll.mockResolvedValue({ data: [GRACE, HOPE] });
    OrganizationServices.get.mockResolvedValue({ data: HOPE });
    OrganizationServices.update.mockResolvedValue({ data: {} });
  });

  describe("US-93.1 — Org Admins open Organizations from the menu bar", () => {
    it("The menu bar shows Organizations to Org Admins", async () => {
      Utils.setStore("user", omar);
      const { wrapper } = await mountMenu();
      await flushPromises();
      expect(wrapper.text()).toContain("Organizations");
      wrapper.unmount();

      Utils.setStore("user", tara);
      const { wrapper: taraMenu } = await mountMenu();
      await flushPromises();
      expect(taraMenu.text()).not.toContain("Organizations");
      taraMenu.unmount();
    });

    it("Non Org Admins are sent home from Organizations", async () => {
      Utils.setStore("user", omar);
      const router = await createTestRouter("/home");
      await router.push("/organizations");
      expect(router.currentRoute.value.name).toBe("organizations");

      Utils.setStore("user", tara);
      await router.push("/home");
      await router.push("/organizations");
      expect(router.currentRoute.value.name).toBe("home");
    });

    it("Org Admins see only their selected organization", async () => {
      Utils.setStore("user", omar);
      const { wrapper } = await mountList();
      await flushPromises();

      expect(rowNames(wrapper)).toEqual(["Hope Missions"]);
      expect(button(wrapper, "Add")).toBeUndefined();

      Utils.setStore("user", { ...omar, currentOrgId: 5, currentOrgName: "Grace Clinics" });
      window.dispatchEvent(new CustomEvent("user-updated"));
      await flushPromises();

      expect(rowNames(wrapper)).toEqual(["Grace Clinics"]);
      expect(wrapper.text()).not.toContain("Mercy Teams");
      wrapper.unmount();
    });

    it("System Admins still see every organization", async () => {
      OrganizationServices.getAll.mockResolvedValue({ data: [GRACE, HOPE, MERCY] });
      Utils.setStore("user", sam);
      const { wrapper } = await mountList();
      await flushPromises();

      expect(rowNames(wrapper)).toEqual(["Grace Clinics", "Hope Missions", "Mercy Teams"]);
      expect(button(wrapper, "Add")).toBeDefined();
      wrapper.unmount();
    });
  });

  describe("US-93.2 — Org Admins edit only their own organization", () => {
    it("An Org Admin edits their organization", async () => {
      Utils.setStore("user", omar);
      const { wrapper } = await mountList();
      await flushPromises();

      await wrapper.find('button[aria-label="Edit"]').trigger("click");
      await flushPromises();
      expect(OrganizationServices.get).toHaveBeenCalledWith(4);
      const labels = wrapper.findAll(".v-label").map((label) => label.text());
      expect(labels).toContain("Email");
      expect(labels).not.toContain("Subdomain");

      const emailField = wrapper
        .findAll(".v-text-field")
        .find((field) => field.find(".v-label").exists() && field.find(".v-label").text() === "Email");
      await emailField.find("input").setValue("office@hopemissions.org");
      OrganizationServices.getAll.mockResolvedValue({
        data: [GRACE, { ...HOPE, email: "office@hopemissions.org" }],
      });
      await button(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(OrganizationServices.update).toHaveBeenCalledWith(
        4,
        expect.objectContaining({ email: "office@hopemissions.org" })
      );
      expect(OrganizationServices.update.mock.calls[0][1]).not.toHaveProperty("subdomain");
      expect(wrapper.text()).toContain("Organization updated.");
      expect(wrapper.text()).toContain("office@hopemissions.org");
      wrapper.unmount();
    });
  });
});
