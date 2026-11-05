/**
 * Feature 74 — Trip Add-on Expenses
 * Spec: features/feature-74-trip-addon-expenses.md
 * Feature 76 — Trip Arrival Info
 * Spec: features/feature-76-trip-arrival-info.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MyTripView from "../src/views/MyTripView.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getBrowseTrip: vi.fn(),
    cancelApplication: vi.fn(),
    openArrivalPdf: vi.fn(),
    getImageUrl: vi.fn(() => null),
  },
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
            costBreakdown: {
              tripCost: 2000,
              tripOptions: [{ description: "Private room", amount: 250 }],
              adjustment: 0,
              addonExpenses: [
                { description: "Travel insurance", amount: 75 },
                { description: "Antigua weekend excursion", amount: 400 },
              ],
              airfare: 850,
              totalTripCost: 3575,
            },
            amountOwed: 3575,
          },
        },
      });
      const { wrapper } = await mountWithPlugins(MyTripView, {
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

      const financial = wrapper.find('[data-testid="my-trip-financial"]').text();
      expect(financial).toContain("Add-on: Travel insurance$75.00");
      expect(financial).toContain("Add-on: Antigua weekend excursion$400.00");
      expect(financial.indexOf("Add-on: Travel insurance")).toBeGreaterThan(financial.indexOf("Trip option: Private room"));
      expect(wrapper.find('[data-testid="my-trip-total"]').text()).toBe("$3,575.00");

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
      const { wrapper } = await mountWithPlugins(MyTripView, {
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

/**
 * Feature 78 — Days Before and After the Trip
 * Spec: features/feature-78-days-before-after-trip.md
 */
describe("Feature 78 — Days Before and After the Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Ana", lastName: "Lopez", orgRoles: [], tripRoles: [] });
  });

  describe("US-78.4 — See each participant's arrival and departure dates", () => {
    it("My Trip Info shows my arrival and departure", async () => {
      TripServices.getBrowseTrip.mockResolvedValue({
        data: {
          trip: {
            id: 7,
            orgId: 3,
            name: "Guatemala Clinic",
            status: "active",
            startDate: "2026-06-10",
            endDate: "2026-06-17",
          },
          rolesNeeded: [],
          alreadyApplied: true,
          applicationStatus: "approved",
          tripLeaders: [],
          myTripInfo: {
            status: "approved",
            workerRoleName: "Nurse",
            participantCost: 1500,
            totalTripCost: 1580,
            addonExpenses: [{ description: "Extra hotel night", cost: 80, daysBefore: 1, daysAfter: 1 }],
            arrivalDate: "2026-06-07",
            departureDate: "2026-06-18",
            donationTotal: 0,
            donationRecipients: [],
            tripPeopleRoleId: 40,
            nextActions: [],
            room: null,
            flightPurchaseOption: "self",
            flightSegments: [],
            selectedTravelOptions: [],
          },
        },
      });
      const { wrapper } = await mountWithPlugins(MyTripView, {
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

      const dates = wrapper.find('[data-testid="my-trip-dates"]');
      expect(dates.text()).toContain("Arrive");
      expect(dates.text()).toContain("Depart");
      expect(wrapper.find('[data-testid="my-trip-arrive"]').text()).toBe("06/07/2026");
      expect(wrapper.find('[data-testid="my-trip-depart"]').text()).toBe("06/18/2026");

      wrapper.unmount();
    });
  });
});
