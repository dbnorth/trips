/**
 * Feature 116 — Home Welcome Greeting
 * Spec: features/feature-116-home-welcome-greeting.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Home from "../src/views/Home.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getBrowseTrips: vi.fn(() => Promise.resolve({ data: [] })),
    getMyBrowseTrips: vi.fn(() => Promise.resolve({ data: [] })),
    getAll: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/dashboardServices.js", () => ({
  default: { org: vi.fn(), trip: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: { id: 3, name: "Hope Missions" } })) },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: {},
}));

import PersonServices from "../src/services/personServices.js";
import AuthServices from "../src/services/authServices.js";

const HOPE_ID = 3;

const maria = {
  personId: 5,
  firstName: "Maria",
  lastName: "Lopez",
  isAdmin: false,
  orgRoles: [{ orgId: HOPE_ID, orgName: "Hope Missions", roleName: "Trip Participant" }],
  tripRoles: [{ roleName: "Trip Participant", tripId: 99, orgId: HOPE_ID, orgName: "Hope Missions" }],
};

const olivia = {
  personId: 6,
  firstName: "Olivia",
  lastName: "Chen",
  isAdmin: false,
  orgRoles: [{ orgId: HOPE_ID, orgName: "Hope Missions", roleName: "Org Admin" }],
  tripRoles: [],
  currentOrgId: HOPE_ID,
  currentOrgName: "Hope Missions",
};

const mountHome = async () => {
  const { wrapper } = await mountWithPlugins(Home, {
    global: {
      stubs: {
        RouterLink: true,
        ApplyTripDialog: true,
        FlightSegmentsDialog: true,
        ParticipantDonateDialog: true,
        EditPersonDialog: { name: "EditPersonDialog", template: "<div />" },
        EditTripDialog: true,
        EditOrganizationDialog: true,
        TripsTable: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const firstHeading = (wrapper) => wrapper.find("h1, h2, h3");

describe("Feature 116 — Home Welcome Greeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    PersonServices.get.mockResolvedValue({
      data: { id: 5, firstName: "Maria", lastName: "Lopez" },
    });
  });

  describe("US-116.1 — Be welcomed by name on Home", () => {
    it("Trip participant is welcomed by first name", async () => {
      Utils.setStore("user", maria);
      const wrapper = await mountHome();

      expect(firstHeading(wrapper).text()).toBe("Welcome, Maria!");
      expect(firstHeading(wrapper).attributes("data-testid")).toBe("welcome-greeting");
      expect(wrapper.text().indexOf("Welcome, Maria!")).toBeLessThan(wrapper.text().indexOf("My Trips"));
      wrapper.unmount();
    });

    it("Staff are welcomed too", async () => {
      Utils.setStore("user", olivia);
      const wrapper = await mountHome();

      const headings = wrapper.findAll("h1").map((h) => h.text());
      expect(headings[0]).toBe("Welcome, Olivia!");
      expect(headings).toContain("Hope Missions");
      expect(headings.indexOf("Welcome, Olivia!")).toBeLessThan(headings.indexOf("Hope Missions"));
      wrapper.unmount();
    });

    it("Blank first name shows a plain welcome", async () => {
      Utils.setStore("user", {
        personId: null,
        firstName: "  ",
        isAdmin: true,
        orgRoles: [],
        tripRoles: [],
      });
      const wrapper = await mountHome();

      expect(firstHeading(wrapper).text()).toBe("Welcome!");
      wrapper.unmount();
    });

    it("Greeting follows a profile name change", async () => {
      Utils.setStore("user", maria);
      AuthServices.me.mockResolvedValue({ data: { ...maria, firstName: "Mari" } });
      const wrapper = await mountHome();
      expect(firstHeading(wrapper).text()).toBe("Welcome, Maria!");

      wrapper.findComponent({ name: "EditPersonDialog" }).vm.$emit("saved");
      await flushPromises();

      expect(firstHeading(wrapper).text()).toBe("Welcome, Mari!");
      wrapper.unmount();
    });
  });
});
