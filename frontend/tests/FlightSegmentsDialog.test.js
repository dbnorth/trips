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
