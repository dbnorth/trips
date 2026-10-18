/**
 * Feature 61 — Trip Page My Travel Details
 * Spec: features/feature-61-trip-page-my-travel-details.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripBrowseView from "../src/views/TripBrowseView.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getBrowseTrip: vi.fn(), cancelApplication: vi.fn() },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { getPictureUrl: vi.fn(() => null) },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";

const ARRIVAL = {
  segmentType: "arrival",
  segmentNumber: 1,
  airlineName: "American Airlines",
  flightNumber: "100",
  departureAirportCode: "DFW",
  departureDate: "2027-01-10",
  departureTime: "08:30",
  arrivalAirportCode: "GUA",
  arrivalDate: "2027-01-10",
  arrivalTime: "12:00",
};

const NamedStub = (name) => ({
  name,
  props: ["modelValue", "tripId", "tripPeopleRoleId"],
  template: "<div />",
});

const mockTrip = (myTripInfo) =>
  TripServices.getBrowseTrip.mockResolvedValue({
    data: {
      trip: { id: 7, orgId: 3, name: "Guatemala Clinic", status: "active", startDate: "2027-01-10", endDate: "2027-01-20" },
      rolesNeeded: [],
      alreadyApplied: true,
      applicationStatus: "approved",
      tripLeaders: [],
      myTripInfo: {
        status: "approved",
        workerRoleName: "Nurse",
        participantCost: 1800,
        donationTotal: 0,
        donationRecipients: [],
        tripPeopleRoleId: 70,
        nextActions: [],
        room: null,
        flightPurchaseOption: "organization",
        flightSegments: [],
        selectedTravelOptions: [],
        ...myTripInfo,
      },
    },
  });

const mountView = async () => {
  const { wrapper } = await mountWithPlugins(TripBrowseView, {
    props: { tripId: "7" },
    global: {
      stubs: {
        VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        DonorTripHeading: true,
        ApplyTripDialog: NamedStub("ApplyTripDialog"),
        FlightSegmentsDialog: NamedStub("FlightSegmentsDialog"),
        ParticipantDonationsDialog: true,
        ParticipantDonateDialog: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const button = (el, text) => el.findAll("button").find((b) => b.text().trim() === text);

describe("Feature 61 — Trip Page My Travel Details", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Ana", lastName: "Lopez", orgRoles: [], tripRoles: [] });
  });

  describe("US-61.1 — See my room on the trip page", () => {
    it("Trip page shows my room", async () => {
      mockTrip({
        room: {
          hotelName: "Hotel Casa",
          roomType: "Double",
          roommates: ["Ben Ruiz"],
          checkInDate: "2027-01-10",
          checkOutDate: "2027-01-15",
        },
      });
      const wrapper = await mountView();

      const room = wrapper.find('[data-testid="my-trip-room"]').text();
      expect(room).toContain("Hotel Casa");
      expect(room).toContain("Double");
      expect(room).toContain("Ben Ruiz");
      expect(room).toContain("01/10/2027");
      expect(room).toContain("01/15/2027");

      wrapper.unmount();
    });
  });

  describe("US-61.1 — Fundraising link", () => {
    it("Approved participant sees my fundraising link", async () => {
      const writeText = vi.fn().mockResolvedValue();
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      mockTrip({});
      const wrapper = await mountView();

      const link = wrapper.findAll("a").find((a) => a.text().trim() === "My fundraising page");
      expect(link.attributes("href")).toBe("/donate/trip/Guatemala_Clinic/participant/Ana_Lopez");
      expect(link.attributes("target")).toBe("_blank");

      await button(wrapper, "Copy link").trigger("click");
      await flushPromises();
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/donate/trip/Guatemala_Clinic/participant/Ana_Lopez`
      );
      expect(wrapper.text()).toContain("Link copied.");

      wrapper.unmount();
    });

    it("No fundraising link before approval", async () => {
      mockTrip({ status: "applied" });
      const wrapper = await mountView();

      expect(wrapper.findAll("a").find((a) => a.text().trim() === "My fundraising page")).toBeUndefined();
      expect(button(wrapper, "Copy link")).toBeUndefined();

      wrapper.unmount();
    });
  });

  describe("US-61.2 — See my flights on the trip page", () => {
    it("Self-purchase participant can edit flights from the trip page", async () => {
      mockTrip({ flightPurchaseOption: "self", flightSegments: [ARRIVAL] });
      const wrapper = await mountView();

      const flights = wrapper.find('[data-testid="my-trip-flights"]');
      const text = flights.text();
      expect(text).toContain("American Airlines");
      expect(text).toContain("100");
      expect(text).toContain("DFW");
      expect(text).toContain("GUA");
      expect(text).toContain("01/10/2027 8:30 AM");

      await button(flights, "Edit Flights").trigger("click");
      await flushPromises();
      const dialog = wrapper.findComponent({ name: "FlightSegmentsDialog" });
      expect(dialog.props("modelValue")).toBe(true);
      expect(dialog.props("tripPeopleRoleId")).toBe(70);

      wrapper.unmount();
    });

    it("Organization-purchase participant sees flights without Edit Flights", async () => {
      mockTrip({ flightPurchaseOption: "organization", flightSegments: [ARRIVAL] });
      const wrapper = await mountView();

      const flights = wrapper.find('[data-testid="my-trip-flights"]');
      expect(flights.text()).toContain("American Airlines");
      expect(button(flights, "Edit Flights")).toBeUndefined();

      wrapper.unmount();
    });
  });

  describe("US-61.3 — See my selected trip options on the trip page", () => {
    it("Trip page shows my selected trip options", async () => {
      mockTrip({
        selectedTravelOptions: [
          { id: 1, description: "Extra beach day", setNumber: 1, priceAdjustment: 150 },
          { id: 2, description: "City tour", setNumber: 2, priceAdjustment: 0 },
        ],
      });
      const wrapper = await mountView();

      const items = wrapper.findAll('[data-testid="my-trip-options"] li').map((li) => li.text());
      expect(items).toEqual(["Extra beach day (+$150.00)", "City tour"]);

      wrapper.unmount();
    });
  });
});
