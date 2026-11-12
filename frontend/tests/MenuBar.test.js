/**
 * Feature 130 — Donor Maintenance
 * Spec: features/feature-130-donor-maintenance.md
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

const mountMenu = async (user) => {
  Utils.setStore("user", user);
  const { wrapper } = await mountWithPlugins(MenuBar, {
    global: {
      stubs: {
        VAppBar: { template: "<div><slot /></div>" },
        VBtn: { props: ["to"], template: "<button><slot /></button>" },
      },
    },
  });
  await flushPromises();
  return wrapper.findAll("button").map((button) => button.text());
};

describe("Feature 130 — Donor Maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    OrganizationServices.get.mockResolvedValue({ data: { name: "Hope Mission", logo: null } });
    OrganizationServices.getAllForMenu.mockResolvedValue({ data: [] });
  });

  it("Donors is on the admin menus", async () => {
    const system = await mountMenu({
      userId: 1,
      isAdmin: true,
      token: "t",
      orgRoles: [],
      tripRoles: [],
    });
    const orgAdmin = await mountMenu({
      userId: 2,
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 4, orgName: "Hope Mission", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 4,
    });
    const leader = await mountMenu({
      userId: 3,
      isAdmin: false,
      token: "t",
      orgRoles: [],
      tripRoles: [{ tripId: 9, roleName: "Trip Leader" }],
    });

    expect(system.indexOf("Donors")).toBe(system.indexOf("Donations") + 1);
    expect(orgAdmin.indexOf("Donors")).toBe(orgAdmin.indexOf("Donations") + 1);
    expect(leader).not.toContain("Donors");
  });
});
