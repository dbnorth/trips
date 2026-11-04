/**
 * Feature 111 — Menu Bar Stops Listening When It Closes
 * Spec: features/feature-111-menu-bar-listener-cleanup.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MenuBar from "../src/components/MenuBar.vue";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    get: vi.fn(),
    getAllForMenu: vi.fn(),
    getLogoUrl: vi.fn(() => null),
  },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { logoutUser: vi.fn(), me: vi.fn() },
}));

vi.mock("../src/components/EditPersonDialog.vue", () => ({
  default: { name: "EditPersonDialog", template: "<div />" },
}));

const ORGS = { 4: "Hope Missions", 5: "Grace Clinics" };

const olivia = {
  userId: 2,
  personId: 2,
  email: "olivia@example.org",
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

const mountMenu = async () => {
  const { wrapper } = await mountWithPlugins(MenuBar, {
    global: {
      stubs: {
        VAppBar: { template: "<div><slot /></div>" },
        VBtn: { props: ["to"], template: "<button><slot /></button>" },
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const fire = async (...names) => {
  for (const name of names) window.dispatchEvent(new CustomEvent(name));
  await flushPromises();
};

describe("Feature 111 — Menu Bar Stops Listening When It Closes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    OrganizationServices.get.mockImplementation((id) =>
      Promise.resolve({ data: { id: Number(id), name: ORGS[id], logo: null } })
    );
    OrganizationServices.getAllForMenu.mockResolvedValue({ data: [] });
    Utils.setStore("user", olivia);
  });

  describe("US-111.1 — The menu doesn't keep working after it closes", () => {
    it("A closed menu ignores later events", async () => {
      const menu = await mountMenu();
      expect(OrganizationServices.get).toHaveBeenCalled();
      menu.unmount();
      OrganizationServices.get.mockClear();
      const storedBefore = localStorage.getItem("user");

      await fire("user-logged-in", "user-updated", "organizations-updated");

      expect(OrganizationServices.get).not.toHaveBeenCalled();
      expect(OrganizationServices.getAllForMenu).not.toHaveBeenCalled();
      expect(localStorage.getItem("user")).toBe(storedBefore);
    });

    it("Logging out and back in leaves one menu listening", async () => {
      (await mountMenu()).unmount();
      (await mountMenu()).unmount();
      const menu = await mountMenu();
      OrganizationServices.get.mockClear();

      await fire("user-updated");

      expect(OrganizationServices.get).toHaveBeenCalledTimes(1);
      menu.unmount();
    });

    it("The visible menu still updates", async () => {
      const menu = await mountMenu();
      expect(menu.text()).toContain("Hope Missions");

      Utils.setStore("user", { ...Utils.getStore("user"), currentOrgId: 5, currentOrgName: "Grace Clinics" });
      await fire("user-updated");
      expect(menu.text()).toContain("Grace Clinics");
      expect(menu.text()).not.toContain("Hope Missions");

      await fire("user-logged-out");
      expect(menu.text()).toBe("");
      menu.unmount();
    });
  });
});
