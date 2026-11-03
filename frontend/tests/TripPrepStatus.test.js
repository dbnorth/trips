/**
 * Feature 109 — Trip Prep Status on the Trip Card
 * Spec: features/feature-109-trip-prep-status.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Home from "../src/views/Home.vue";
import TripServices from "../src/services/tripServices.js";
import Utils from "../src/config/utils.js";
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

const HOPE_ID = 3;
const PREP_LABELS = [
  "All roles filled",
  "All participants approved",
  "All funds raised",
  "Flights entered for all participants",
  "Room list includes all participants",
];

const tripWith = (prepStatus) => ({
  id: 1,
  orgId: HOPE_ID,
  name: "Guatemala Clinic 2027",
  status: "active",
  startDate: "2099-06-10",
  endDate: "2099-06-17",
  leaderNames: [],
  memberCount: 3,
  totalRoles: 3,
  unfilledRoles: [],
  totalParticipantCost: 3000,
  donationTotal: 3000,
  prepStatus,
});

const stubs = {
  RouterLink: true,
  ApplyTripDialog: true,
  EditPersonDialog: true,
  EditOrganizationDialog: true,
  FlightSegmentsDialog: true,
  EditTripDialog: true,
  ImportTripMasterDialog: true,
  VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
};

const prepIn = async () => {
  const { wrapper } = await mountWithPlugins(Home, { global: { stubs } });
  await flushPromises();
  const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Guatemala Clinic 2027"));
  const icon = row.find('[data-testid="trip-prep-info"]');
  const items = row.findAll('[data-testid="trip-prep-list"] > div').map((line) => ({
    label: line.text().trim(),
    complete: line.find(".v-icon").classes().includes("mdi-check-circle"),
  }));
  return { wrapper, icon, items };
};

describe("Feature 109 — Trip Prep Status on the Trip Card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "olivia@example.org",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: HOPE_ID, orgName: "Hope Missions", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: HOPE_ID,
      currentOrgName: "Hope Missions",
    });
    TripServices.getBrowseTrips.mockResolvedValue({ data: [] });
    TripServices.getMyBrowseTrips.mockResolvedValue({ data: [] });
  });

  describe("US-109.1 — See whether a trip is ready", () => {
    it("A fully prepared trip shows a green prep icon", async () => {
      TripServices.getAll.mockResolvedValue({
        data: [
          tripWith({
            rolesFilled: true,
            participantsApproved: true,
            fundsRaised: true,
            flightsEntered: true,
            roomListComplete: true,
          }),
        ],
      });

      const { wrapper, icon, items } = await prepIn();

      expect(icon.exists()).toBe(true);
      expect(icon.attributes("aria-label")).toBe("Trip prep status");
      expect(icon.classes()).toContain("text-success");
      expect(items).toEqual(PREP_LABELS.map((label) => ({ label, complete: true })));
      wrapper.unmount();
    });

    it("An unprepared trip shows a red prep icon with the missing items", async () => {
      TripServices.getAll.mockResolvedValue({
        data: [
          tripWith({
            rolesFilled: false,
            participantsApproved: false,
            fundsRaised: false,
            flightsEntered: false,
            roomListComplete: false,
          }),
        ],
      });

      const { wrapper, icon, items } = await prepIn();

      expect(icon.classes()).toContain("text-error");
      expect(items).toEqual(PREP_LABELS.map((label) => ({ label, complete: false })));
      wrapper.unmount();
    });

    it("One item not complete makes the prep icon red", async () => {
      TripServices.getAll.mockResolvedValue({
        data: [
          tripWith({
            rolesFilled: true,
            participantsApproved: true,
            fundsRaised: false,
            flightsEntered: true,
            roomListComplete: true,
          }),
        ],
      });

      const { wrapper, icon, items } = await prepIn();

      expect(icon.classes()).toContain("text-error");
      expect(items.filter((item) => !item.complete).map((item) => item.label)).toEqual(["All funds raised"]);
      wrapper.unmount();
    });
  });
});
