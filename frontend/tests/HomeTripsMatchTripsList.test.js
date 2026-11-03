/**
 * Feature 108 — Home Organization Trips Match the Trips List
 * Spec: features/feature-108-home-trips-match-trips-list.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Home from "../src/views/Home.vue";
import TripsList from "../src/views/TripsList.vue";
import TripServices from "../src/services/tripServices.js";
import DashboardServices from "../src/services/dashboardServices.js";
import Utils from "../src/config/utils.js";
import { formatDateRange } from "../src/utils/dateFormat.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn(), getBrowseTrips: vi.fn(), getMyBrowseTrips: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: {} })), getPictureUrl: vi.fn(() => null) },
}));
vi.mock("../src/services/dashboardServices.js", () => ({
  default: { org: vi.fn(() => Promise.resolve({ data: {} })), trip: vi.fn() },
}));
vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: { id: 3, name: "Hope Missions" } })) },
}));
vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn(() => Promise.resolve({ data: {} })) },
}));
vi.mock("../src/services/exportServices.js", () => ({ default: {} }));

const { stubDialog } = vi.hoisted(() => ({
  stubDialog: (name, props) => ({ default: { name, template: "<div />", props } }),
}));
vi.mock("../src/components/EditTripDialog.vue", () => stubDialog("EditTripDialog", ["modelValue", "tripId"]));
vi.mock("../src/components/ImportTripMasterDialog.vue", () =>
  stubDialog("ImportTripMasterDialog", ["modelValue", "trip"])
);

const HOPE_ID = 3;
const guatemala = {
  id: 1,
  orgId: HOPE_ID,
  name: "Guatemala Clinic 2027",
  location: "Guatemala",
  status: "active",
  startDate: "2099-06-10",
  endDate: "2099-06-17",
  leaderNames: ["Omar Diaz"],
  activeParticipantCount: 3,
  memberCount: 4,
  preApprovedMemberCount: 1,
  totalRoles: 6,
  unfilledRoles: [
    { name: "Doctor", needed: 1 },
    { name: "Nurse", needed: 2 },
  ],
  totalParticipantCost: 2850,
  donationTotal: 500,
};
const honduras = {
  id: 2,
  orgId: HOPE_ID,
  name: "Honduras 2020",
  location: "Honduras",
  status: "active",
  startDate: "2020-01-13",
  endDate: "2020-01-20",
  leaderNames: [],
  activeParticipantCount: 0,
  memberCount: 0,
  totalRoles: 0,
  unfilledRoles: [],
  totalParticipantCost: 0,
  donationTotal: 0,
};

const stubs = { RouterLink: true, ApplyTripDialog: true, EditPersonDialog: true, EditOrganizationDialog: true, FlightSegmentsDialog: true };
const mount = async (component) => {
  const { wrapper } = await mountWithPlugins(component, { global: { stubs } });
  await flushPromises();
  return wrapper;
};

const tripsCard = (wrapper) =>
  wrapper.findAll(".v-card").find((card) => card.find("h2").exists() && card.find("h2").text() === "Organization Trips");
const headersIn = (el) => el.findAll("th").map((th) => th.text().trim());
const rowFor = (el, name) => el.findAll("tbody tr").find((tr) => tr.text().includes(name));
const actionsIn = (row) => row.findAll("button").map((b) => b.attributes("aria-label"));

const setUser = (roleName) =>
  Utils.setStore("user", {
    userId: 2,
    personId: 2,
    email: "olivia@example.org",
    isAdmin: false,
    token: "t",
    orgRoles: [{ orgId: HOPE_ID, orgName: "Hope Missions", roleName }],
    tripRoles: [],
    currentOrgId: HOPE_ID,
    currentOrgName: "Hope Missions",
  });

describe("Feature 108 — Home Organization Trips Match the Trips List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setUser("Org Admin");
    TripServices.getAll.mockResolvedValue({ data: [guatemala, honduras] });
    TripServices.getBrowseTrips.mockResolvedValue({ data: [] });
    TripServices.getMyBrowseTrips.mockResolvedValue({ data: [] });
  });

  describe("US-108.1 — Home lists trips like the Trips page", () => {
    it("Home Organization Trips shows the Trips page columns", async () => {
      const tripsPage = await mount(TripsList);
      const tripsPageHeaders = headersIn(tripsPage);
      tripsPage.unmount();

      const home = await mount(Home);
      const card = tripsCard(home);
      expect(headersIn(card)).toEqual(tripsPageHeaders);
      expect(headersIn(card)).toEqual([
        "Name",
        "Leaders",
        "Members",
        "Total Roles",
        "Total cost",
        "Total donations",
        "Status",
        "Dates",
        "Actions",
      ]);

      const row = rowFor(card, "Guatemala Clinic 2027");
      const cells = row.findAll("td").map((td) => td.text().trim());
      expect(cells.slice(0, 8)).toEqual([
        "Guatemala Clinic 2027",
        "Omar Diaz",
        "4",
        "6",
        "$2,850.00",
        "$500.00",
        "active",
        formatDateRange("2099-06-10", "2099-06-17"),
      ]);
      expect(row.text()).not.toContain("Donate");
      home.unmount();
    });

    it("Members info shows the pre-approved and approved counts", async () => {
      const { wrapper: home } = await mountWithPlugins(Home, {
        global: {
          stubs: {
            ...stubs,
            VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
          },
        },
      });
      await flushPromises();

      const row = rowFor(tripsCard(home), "Guatemala Clinic 2027");
      expect(row.find('[data-testid="member-count-info"]').exists()).toBe(true);
      const lines = row.findAll('[data-testid="member-count-breakdown"] > div').map((d) => d.text().trim());
      expect(lines).toEqual(["Pre-approved: 1", "Approved: 3"]);
      home.unmount();
    });

    it("Total Roles shows a red info icon listing unfilled roles", async () => {
      const peru = { ...guatemala, id: 3, name: "Peru 2099", unfilledRoles: [] };
      TripServices.getAll.mockResolvedValue({ data: [guatemala, peru] });
      const { wrapper: home } = await mountWithPlugins(Home, {
        global: {
          stubs: {
            ...stubs,
            VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
          },
        },
      });
      await flushPromises();

      const card = tripsCard(home);
      const row = rowFor(card, "Guatemala Clinic 2027");
      const icon = row.find('[data-testid="unfilled-roles-info"]');
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain("text-error");
      const lines = row.findAll('[data-testid="unfilled-roles-list"] > div').map((d) => d.text().trim());
      expect(lines).toEqual(["Doctor: 1 needed", "Nurse: 2 needed"]);

      expect(rowFor(card, "Peru 2099").find('[data-testid="unfilled-roles-info"]').exists()).toBe(false);
      home.unmount();
    });

    it("Home trip rows have the Trips page actions", async () => {
      const tripsPage = await mount(TripsList);
      const tripsPageActions = actionsIn(rowFor(tripsPage, "Guatemala Clinic 2027"));
      tripsPage.unmount();

      const home = await mount(Home);
      const row = rowFor(tripsCard(home), "Guatemala Clinic 2027");
      expect(actionsIn(row)).toEqual(tripsPageActions);
      expect(actionsIn(row)).toEqual(["View", "Status", "Room list", "Flights", "Import", "Edit"]);

      await row.find('button[aria-label="Import"]').trigger("click");
      const importDialog = home.findComponent({ name: "ImportTripMasterDialog" });
      expect(importDialog.props("modelValue")).toBe(true);
      expect(importDialog.props("trip").id).toBe(1);

      await row.find('button[aria-label="Edit"]').trigger("click");
      const editDialog = home.findComponent({ name: "EditTripDialog" });
      expect(editDialog.props("modelValue")).toBe(true);
      expect(editDialog.props("tripId")).toBe(1);

      TripServices.getAll.mockClear();
      editDialog.vm.$emit("saved");
      await flushPromises();
      expect(TripServices.getAll).toHaveBeenCalled();
      home.unmount();
    });

    it("Home keeps Show all trips", async () => {
      const home = await mount(Home);
      const card = tripsCard(home);
      expect(rowFor(card, "Guatemala Clinic 2027")).toBeTruthy();
      expect(rowFor(card, "Honduras 2020")).toBeUndefined();

      await card.find('input[type="checkbox"]').setValue(true);
      await flushPromises();
      expect(rowFor(tripsCard(home), "Honduras 2020")).toBeTruthy();
      home.unmount();
    });

    it("Agents keep their Flights-only trip card", async () => {
      setUser("Agent");
      const home = await mount(Home);
      const card = tripsCard(home);

      expect(headersIn(card)).toEqual(["Name", "Location", "Start", "End", "Status", "Actions"]);
      expect(actionsIn(rowFor(card, "Guatemala Clinic 2027"))).toEqual(["Flights"]);
      home.unmount();
    });

    it("System Admin summary boxes come before Organization Trips", async () => {
      Utils.setStore("user", {
        userId: 1,
        personId: 1,
        email: "admin@example.org",
        isAdmin: true,
        token: "t",
        orgRoles: [],
        tripRoles: [],
        currentOrgId: HOPE_ID,
        currentOrgName: "Hope Missions",
      });
      DashboardServices.org.mockResolvedValue({
        data: { tripCount: 2, activeTrips: 1, peopleCount: 5, donationTotal: 500 },
      });
      const home = await mount(Home);

      const html = home.html();
      expect(html).toContain("Active trips");
      expect(html.indexOf("Active trips")).toBeLessThan(html.indexOf("Organization Trips"));
      expect(rowFor(tripsCard(home), "Guatemala Clinic 2027")).toBeTruthy();
      home.unmount();
    });
  });
});
