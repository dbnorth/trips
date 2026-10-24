/**
 * Feature 85 — Agent Role
 * Spec: features/feature-85-agent-role.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Home from "../src/views/Home.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getBrowseTrips: vi.fn(),
    getMyBrowseTrips: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/dashboardServices.js", () => ({
  default: { org: vi.fn(), trip: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: {},
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";
import DashboardServices from "../src/services/dashboardServices.js";

const HOPE_ID = 3;

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const mountHome = async () => {
  const { wrapper, router } = await mountWithPlugins(Home, {
    global: {
      stubs: {
        ApplyTripDialog: true,
        FlightSegmentsDialog: true,
        ParticipantDonateDialog: true,
        EditPersonDialog: true,
        EditTripDialog: true,
        EditOrganizationDialog: true,
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
};

const tripRow = (wrapper, name) =>
  wrapper.findAll("tr").find((tr) => tr.find("td").exists() && tr.find("td").text() === name);

describe("Feature 85 — Agent Role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", {
      personId: 9,
      isAdmin: false,
      orgRoles: [{ orgId: HOPE_ID, orgName: "Hope Missions", roleName: "Agent" }],
      tripRoles: [],
    });
    TripServices.getAll.mockResolvedValue({
      data: [
        { id: 1, orgId: HOPE_ID, name: "Guatemala Clinic 2027", location: "Guatemala", status: "active", startDate: dateFromToday(30), endDate: dateFromToday(40) },
        { id: 2, orgId: HOPE_ID, name: "Honduras 2025", location: "Honduras", status: "active", startDate: dateFromToday(-400), endDate: dateFromToday(-390) },
      ],
    });
  });

  describe("US-85.2 — An Agent's Home lists the organization's trips", () => {
    it("An Agent's Home lists the organization's trips with only a Flights action", async () => {
      const { wrapper, router } = await mountHome();

      expect(wrapper.find("h1").text()).toBe("Hope Missions");
      expect(wrapper.findAll("button").some((b) => b.text().trim() === "Edit")).toBe(false);
      expect(wrapper.text()).not.toContain("Organization trips page");

      expect(wrapper.text()).toContain("Organization Trips");
      const row = tripRow(wrapper, "Guatemala Clinic 2027");
      expect(row).toBeTruthy();
      expect(tripRow(wrapper, "Honduras 2025")).toBeUndefined();

      const actions = row.findAll("button").map((b) => b.attributes("aria-label"));
      expect(actions).toEqual(["Flights"]);

      await row.find('button[aria-label="Flights"]').trigger("click");
      await vi.waitFor(() => {
        expect(router.currentRoute.value.name).toBe("tripFlights");
      });
      expect(router.currentRoute.value.params.tripId).toBe("1");

      await router.push({ name: "home" });
      await wrapper.find('input[type="checkbox"]').setValue(true);
      await flushPromises();
      expect(tripRow(wrapper, "Honduras 2025")).toBeTruthy();
    });

    it("An Agent's Home has no trips to apply for", async () => {
      const { wrapper } = await mountHome();

      expect(wrapper.text()).not.toContain("My Trips");
      expect(wrapper.text()).not.toContain("Trips you can apply for");
      expect(wrapper.text()).not.toContain("Please update your profile to continue.");
      expect(TripServices.getBrowseTrips).not.toHaveBeenCalled();
      expect(TripServices.getMyBrowseTrips).not.toHaveBeenCalled();
      expect(PersonServices.get).not.toHaveBeenCalled();
      expect(DashboardServices.org).not.toHaveBeenCalled();
      expect(wrapper.text()).not.toContain("Export participants CSV");
    });
  });
});
