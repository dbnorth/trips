/**
 * Feature 95 — Role Availability on Public Trip Pages
 * Spec: features/feature-95-public-trip-role-availability.md
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
    getBrowseTrip: vi.fn(),
    getOrgTrips: vi.fn(),
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

const ORG_ID = 3;
const PERSON_ID = 5;

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const tripToApplyFor = (id, name, roleAvailability, myReservedTripWorkerRoleId = null) => ({
  id,
  name,
  orgId: ORG_ID,
  status: "active",
  startDate: dateFromToday(30),
  endDate: dateFromToday(40),
  alreadyApplied: false,
  applicationStatus: null,
  roleAvailability,
  myReservedTripWorkerRoleId,
});

const mountHome = async (browseTrips) => {
  TripServices.getBrowseTrips.mockResolvedValue({ data: browseTrips });
  const { wrapper } = await mountWithPlugins(Home, {
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
  return wrapper;
};

const tripRow = (wrapper, name) =>
  wrapper.findAll("tr").find((tr) => tr.find("td").exists() && tr.find("td").text() === name);

const buttonTexts = (row) => row.findAll("button").map((b) => b.text().trim());

describe("Feature 95 — US-95.1 Visitors see how many positions are open before applying", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", {
      personId: PERSON_ID,
      firstName: "Ben",
      lastName: "Baker",
      orgRoles: [],
      tripRoles: [{ roleName: "Trip Participant", tripId: 99, orgId: ORG_ID, orgName: "Hope Missions" }],
    });
    PersonServices.get.mockResolvedValue({ data: { id: PERSON_ID, firstName: "Ben", lastName: "Baker" } });
    TripServices.getMyBrowseTrips.mockResolvedValue({ data: [] });
  });

  it("Home shows availability and Apply only when the person can apply", async () => {
    const wrapper = await mountHome([
      tripToApplyFor(1, "Guatemala Clinic", { reserved: 2, open: 4 }),
      tripToApplyFor(2, "Honduras Clinic", { reserved: 2, open: 0 }),
      tripToApplyFor(3, "Peru Clinic", { reserved: 0, open: 0 }),
      tripToApplyFor(4, "Haiti Clinic", { reserved: 2, open: 0 }, 41),
    ]);

    const open = tripRow(wrapper, "Guatemala Clinic");
    expect(open.find('[data-testid="role-availability"]').text()).toBe(
      "6 positions available (2 reserved, 4 open)"
    );
    expect(buttonTexts(open)).toEqual(["View", "Apply"]);

    const reservedOnly = tripRow(wrapper, "Honduras Clinic");
    expect(reservedOnly.find('[data-testid="role-availability"]').text()).toBe(
      "2 positions available (2 reserved)"
    );
    expect(buttonTexts(reservedOnly)).toEqual(["View"]);

    const full = tripRow(wrapper, "Peru Clinic");
    expect(full.find('[data-testid="role-availability"]').text()).toBe("No roles available");
    expect(buttonTexts(full)).toEqual(["View"]);

    const reservedForBen = tripRow(wrapper, "Haiti Clinic");
    expect(reservedForBen.find('[data-testid="role-availability"]').text()).toBe(
      "2 positions available (2 reserved)"
    );
    expect(buttonTexts(reservedForBen)).toEqual(["View", "Apply for Reserved"]);

    await open.findAll("button").find((b) => b.text().trim() === "Apply").trigger("click");
    await flushPromises();
    const apply = wrapper.findComponent({ name: "ApplyTripDialog" });
    expect(apply.props("modelValue")).toBe(true);
    expect(apply.props("tripId")).toBe(1);

    wrapper.unmount();
  });
});
