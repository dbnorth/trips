/**
 * Feature 73 — Flight "Booked by" Indicator
 * Spec: features/feature-73-flight-booked-by-indicator.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import FlightSegmentsDialog from "../src/components/FlightSegmentsDialog.vue";
import TripServices from "../src/services/tripServices.js";
import AirportServices from "../src/services/airportServices.js";
import AirlineServices from "../src/services/airlineServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getFlightSegments: vi.fn(),
    updateFlightSegments: vi.fn(),
  },
}));

vi.mock("../src/services/airportServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/airlineServices.js", () => ({
  default: { getAll: vi.fn() },
}));

const openDialog = async (participantName) => {
  const { wrapper } = await mountWithPlugins(FlightSegmentsDialog, {
    props: {
      modelValue: false,
      tripId: 42,
      tripPeopleRoleId: 201,
      participantName,
      tripStartDate: "2027-03-06",
      tripEndDate: "2027-03-13",
    },
    global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
};

describe("Feature 73 — Flight Booked by Indicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AirportServices.getAll.mockResolvedValue({ data: [] });
    AirlineServices.getAll.mockResolvedValue({ data: [] });
  });

  describe("US-73.1 — See who books each participant's flight", () => {
    it("Flight segments dialog shows Booked by under the heading", async () => {
      TripServices.getFlightSegments.mockResolvedValueOnce({
        data: {
          tripPeopleRoleId: 201,
          flightPurchaseOption: "organization",
          organizationName: "Test Mission Org",
          segments: [],
        },
      });
      const nora = await openDialog("Nora Booked");
      expect(nora.text()).toContain("Flight segments — Nora Booked");
      expect(nora.text()).toContain("Booked by: Test Mission Org");

      TripServices.getFlightSegments.mockResolvedValueOnce({
        data: {
          tripPeopleRoleId: 201,
          flightPurchaseOption: "self",
          organizationName: "Test Mission Org",
          segments: [],
        },
      });
      const rita = await openDialog("Rita Booked");
      expect(rita.text()).toContain("Booked by: Participant");
    });
  });
});

/**
 * Feature 79 — Planned Arrival and Departure on Flights
 * Spec: features/feature-79-flights-planned-dates.md
 */
describe("Feature 79 — Planned Arrival and Departure on Flights", () => {
  const REQUESTED =
    "Departure DFW (Dallas) · Return DFW (Dallas) · Class Economy · Airline AA — American Airlines · Refundable";

  const segmentsResponse = (overrides = {}) => ({
    data: {
      tripPeopleRoleId: 201,
      flightPurchaseOption: "organization",
      organizationName: "Hope Missions",
      arrivalDate: "2027-06-07",
      departureDate: "2027-06-18",
      flightPurchasePreferences: { departureAirportCode: "DFW", returnAirportCode: "DFW" },
      flightPurchasePreferencesText: REQUESTED,
      segments: [],
      ...overrides,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    AirportServices.getAll.mockResolvedValue({ data: [] });
    AirlineServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Flight segments dialog shows the plan", async () => {
    TripServices.getFlightSegments.mockResolvedValueOnce(segmentsResponse());
    const ana = await openDialog("Ana Lopez");
    const plan = ana.find('[data-testid="flight-segments-plan"]');
    expect(plan.find('[data-testid="planned-arrival"]').text()).toBe("Planned arrival: 06/07/2027");
    expect(plan.find('[data-testid="planned-departure"]').text()).toBe("Planned departure: 06/18/2027");
    expect(plan.find('[data-testid="flight-requested"]').text()).toBe(`Requested: ${REQUESTED}`);
    expect(ana.text().indexOf("Planned arrival")).toBeLessThan(ana.text().indexOf("Arrival Flight"));

    TripServices.getFlightSegments.mockResolvedValueOnce(
      segmentsResponse({ flightPurchaseOption: "self", flightPurchasePreferencesText: null })
    );
    const ben = await openDialog("Ben Ruiz");
    expect(ben.find('[data-testid="planned-arrival"]').exists()).toBe(true);
    expect(ben.find('[data-testid="flight-requested"]').exists()).toBe(false);
  });

  it("New segments default to the planned dates", async () => {
    TripServices.getFlightSegments.mockResolvedValueOnce(segmentsResponse());
    const wrapper = await openDialog("Ana Lopez");

    wrapper.vm.addSegment("arrival");
    wrapper.vm.addSegment("return");
    const [arrival, ret] = wrapper.vm.segments;
    expect([arrival.departureDate, arrival.arrivalDate]).toEqual(["2027-06-07", "2027-06-07"]);
    expect([ret.departureDate, ret.arrivalDate]).toEqual(["2027-06-18", "2027-06-18"]);
  });

  it("New Arrival segment departs from the requested airport", async () => {
    TripServices.getFlightSegments.mockResolvedValueOnce(segmentsResponse());
    const ana = await openDialog("Ana Lopez");
    ana.vm.addSegment("arrival");
    expect(ana.vm.segments[0].departureAirportCode).toBe("DFW");

    TripServices.getFlightSegments.mockResolvedValueOnce(
      segmentsResponse({
        flightPurchaseOption: "self",
        flightPurchasePreferences: null,
        flightPurchasePreferencesText: null,
      })
    );
    const ben = await openDialog("Ben Ruiz");
    ben.vm.addSegment("arrival");
    expect(ben.vm.segments[0].departureAirportCode).toBeNull();
  });

  it("Flight segments dialog warns when airports differ from the request", async () => {
    const segment = (segmentType, from, to) => ({
      segmentType,
      segmentNumber: 1,
      departureAirportCode: from,
      airlineCode: "AA",
      flightNumber: "1",
      departureDate: "2027-06-07",
      departureTime: "08:00",
      arrivalAirportCode: to,
      arrivalDate: "2027-06-07",
      arrivalTime: "12:00",
    });
    TripServices.getFlightSegments.mockResolvedValueOnce(
      segmentsResponse({ segments: [segment("arrival", "DFW", "GUA"), segment("return", "GUA", "IAH")] })
    );
    const wrapper = await openDialog("Ana Lopez");
    const warnings = () =>
      wrapper.findAll('[data-testid="airport-warning-message"]').map((w) => w.text().trim());
    expect(warnings()).toEqual(["Return flight arrives at IAH, but DFW was requested."]);

    wrapper.vm.segments[1].arrivalAirportCode = "DFW";
    await flushPromises();
    expect(warnings()).toEqual([]);
  });
});

describe("Feature 136 — Trip View Flight Itinerary", () => {
  const EMAIL = `Your itinerary
American Airlines AA 100
Departs Dallas (DFW) on June 1, 2027 at 8:30 AM
Arrives Guatemala City (GUA) at 12:00 PM
Thank you for flying with us.
AA 200 leaves GUA on June 8, 2027 at 2:00 PM and arrives DFW at 6:30 PM.`;

  beforeEach(() => {
    vi.clearAllMocks();
    AirportServices.getAll.mockResolvedValue({
      data: [
        { code: "DFW", city: "Dallas", airportName: "Dallas", country: "US" },
        { code: "GUA", city: "Guatemala City", airportName: "La Aurora", country: "GT" },
      ],
    });
    AirlineServices.getAll.mockResolvedValue({ data: [{ code: "AA", name: "American Airlines" }] });
    TripServices.getFlightSegments.mockResolvedValue({
      data: {
        tripPeopleRoleId: 201,
        flightPurchaseOption: "self",
        organizationName: "Hope Missions",
        departureDate: "2027-06-08",
        arrivalDate: "2027-06-01",
        confirmationNumber: "ABC123",
        segments: [],
      },
    });
  });

  it("An airline email is shown and loaded", async () => {
    const wrapper = await openDialog("Ava Reed");
    await wrapper.find('[data-testid="load-from-text"]').trigger("click");
    await wrapper.find('[data-testid="itinerary-text"] textarea').setValue(EMAIL);
    await flushPromises();

    const parsed = wrapper.find('[data-testid="parsed-itinerary"] textarea').element.value;
    expect(parsed).toContain("AA 100: DFW 06/01/2027 8:30 AM to GUA 06/01/2027 12:00 PM");
    expect(parsed).toContain("AA 200: GUA 06/08/2027 2:00 PM to DFW 06/08/2027 6:30 PM");

    await wrapper.find('[data-testid="load-itinerary"]').trigger("click");
    expect(wrapper.find('[data-testid="itinerary-text"]').exists()).toBe(false);
    expect(wrapper.vm.segments).toEqual([
      expect.objectContaining({
        segmentType: "arrival",
        segmentNumber: 1,
        airlineCode: "AA",
        flightNumber: "100",
        departureAirportCode: "DFW",
        arrivalAirportCode: "GUA",
        departureDate: "2027-06-01",
        departureTime: "08:30",
        arrivalTime: "12:00",
        cabinClass: "",
        seatNumber: "",
      }),
      expect.objectContaining({
        segmentType: "return",
        segmentNumber: 1,
        airlineCode: "AA",
        flightNumber: "200",
        departureAirportCode: "GUA",
        arrivalAirportCode: "DFW",
        departureDate: "2027-06-08",
        departureTime: "14:00",
        arrivalTime: "18:30",
      }),
    ]);
    expect(wrapper.vm.confirmationNumber).toBe("ABC123");
    expect(TripServices.updateFlightSegments).not.toHaveBeenCalled();
  });
});
