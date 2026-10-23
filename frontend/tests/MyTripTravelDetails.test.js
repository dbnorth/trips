/**
 * Feature 74 — Trip Add-on Expenses
 * Spec: features/feature-74-trip-addon-expenses.md
 * Feature 76 — Trip Arrival Info
 * Spec: features/feature-76-trip-arrival-info.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripBrowseView from "../src/views/TripBrowseView.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getBrowseTrip: vi.fn(), cancelApplication: vi.fn(), openArrivalPdf: vi.fn() },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { getPictureUrl: vi.fn(() => null) },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";

describe("Feature 74 — Trip Add-on Expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Nora", lastName: "Diaz", orgRoles: [], tripRoles: [] });
  });

  describe("US-74.4 — Participants see their add-on expenses", () => {
    it("My Trip Info shows add-on expenses and the total trip cost", async () => {
      TripServices.getBrowseTrip.mockResolvedValue({
        data: {
          trip: {
            id: 7,
            orgId: 3,
            name: "Guatemala Hospital Ezel",
            status: "active",
            startDate: "2027-01-10",
            endDate: "2027-01-20",
          },
          rolesNeeded: [],
          alreadyApplied: true,
          applicationStatus: "approved",
          tripLeaders: [],
          myTripInfo: {
            status: "approved",
            workerRoleName: "Nurse",
            participantCost: 2250,
            totalTripCost: 3575,
            addonExpenses: [
              { description: "Travel insurance", cost: 75 },
              { description: "Antigua weekend excursion", cost: 400 },
            ],
            donationTotal: 0,
            donationRecipients: [],
            tripPeopleRoleId: 40,
            nextActions: [],
            room: null,
            flightPurchaseOption: "organization",
            flightSegments: [],
            selectedTravelOptions: [{ id: 1, description: "Private room", setNumber: 1, priceAdjustment: 250 }],
          },
        },
      });
      const { wrapper } = await mountWithPlugins(TripBrowseView, {
        props: { tripId: "7" },
        global: {
          stubs: {
            VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
            DonorTripHeading: true,
            ApplyTripDialog: true,
            FlightSegmentsDialog: true,
            ParticipantDonationsDialog: true,
            ParticipantDonateDialog: true,
          },
        },
      });
      await flushPromises();

      const items = wrapper
        .findAll('[data-testid="my-trip-addon-expenses"] li')
        .map((li) => li.text());
      expect(items).toEqual(["Travel insurance ($75.00)", "Antigua weekend excursion ($400.00)"]);
      const text = wrapper.text();
      expect(text.indexOf("Add-on expenses")).toBeGreaterThan(text.indexOf("Trip options"));
      expect(wrapper.find('[data-testid="my-trip-cost"]').text()).toBe("$3,575.00");

      wrapper.unmount();
    });
  });
});

describe("Feature 76 — Trip Arrival Info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Ana", lastName: "Lopez", orgRoles: [], tripRoles: [] });
  });

  describe("US-76.5 — Approved participants open the arrival PDF", () => {
    it("My Trip Info shows the Trip Arrival PDF link", async () => {
      TripServices.getBrowseTrip.mockResolvedValue({
        data: {
          trip: {
            id: 7,
            orgId: 3,
            name: "Guatemala Clinic",
            status: "active",
            startDate: "2027-03-10",
            endDate: "2027-03-17",
          },
          rolesNeeded: [],
          alreadyApplied: true,
          applicationStatus: "approved",
          tripLeaders: [],
          myTripInfo: {
            status: "approved",
            workerRoleName: "Nurse",
            participantCost: 2000,
            totalTripCost: 2000,
            addonExpenses: [],
            donationTotal: 0,
            donationRecipients: [],
            tripPeopleRoleId: 40,
            nextActions: [],
            room: null,
            flightPurchaseOption: "organization",
            flightSegments: [],
            selectedTravelOptions: [],
            hasArrivalPdf: true,
          },
        },
      });
      const { wrapper } = await mountWithPlugins(TripBrowseView, {
        props: { tripId: "7" },
        global: {
          stubs: {
            VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
            DonorTripHeading: true,
            ApplyTripDialog: true,
            FlightSegmentsDialog: true,
            ParticipantDonationsDialog: true,
            ParticipantDonateDialog: true,
          },
        },
      });
      await flushPromises();

      const section = wrapper.find('[data-testid="my-trip-arrival-info"]');
      expect(section.find("h3").text()).toBe("Trip arrival info");
      const link = section.find('[data-testid="my-trip-arrival-link"]');
      expect(link.text()).toBe("Trip Arrival - Guatemala Clinic.pdf");
      await link.trigger("click");
      expect(TripServices.openArrivalPdf).toHaveBeenCalledWith(7);

      wrapper.unmount();
    });
  });
});
