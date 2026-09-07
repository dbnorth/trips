/**
 * Feature 30 — Participant Flights
 * Spec: features/feature-30-participant-flights.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import TripsList from "../src/views/TripsList.vue";
import TripFlightsView from "../src/views/TripFlightsView.vue";
import FlightSegmentsDialog from "../src/components/FlightSegmentsDialog.vue";
import TripServices from "../src/services/tripServices.js";
import AirportServices from "../src/services/airportServices.js";
import AirlineServices from "../src/services/airlineServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getAll: vi.fn(),
    getFlights: vi.fn(),
    updateFlight: vi.fn(),
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

vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/components/AddTripDialog.vue", () => ({
  default: { name: "AddTripDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/CopyTripDialog.vue", () => ({
  default: { name: "CopyTripDialog", template: "<div />", props: ["modelValue", "trips"] },
}));
vi.mock("../src/components/EditTripDialog.vue", () => ({
  default: {
    name: "EditTripDialog",
    template: "<div />",
    props: ["modelValue", "tripId"],
  },
}));

const Stub = { template: "<div />" };

const orgAdminUser = {
  email: "admin@example.com",
  userId: 1,
  personId: 1,
  token: "tok",
  isAdmin: false,
  currentOrgId: 10,
  currentOrgName: "Hope Mission",
  orgRoles: [{ orgId: 10, orgName: "Hope Mission", roleName: "Org Admin" }],
  tripRoles: [],
};

describe("Feature 30 — Participant Flights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    TripServices.getAll.mockResolvedValue({
      data: [{ id: 42, name: "Summer Outreach", startDate: "2026-07-01", endDate: "2026-07-14" }],
    });
    OrganizationServices.get.mockResolvedValue({ data: { id: 10, name: "Hope Mission" } });
    TripServices.getFlights.mockResolvedValue({
      data: {
        trip: { id: 42, name: "Summer Outreach", startDate: "2026-07-01", endDate: "2026-07-14" },
        participants: [
          {
            tripPeopleRoleId: 101,
            peopleId: 55,
            firstName: "Ada",
            lastName: "Applicant",
            purchased: false,
            cost: null,
            comments: "",
            segmentCount: 0,
            initialDeparture: null,
            finalArrival: null,
          },
        ],
      },
    });
    TripServices.getFlightSegments.mockResolvedValue({ data: { segments: [] } });
    TripServices.updateFlightSegments.mockResolvedValue({
      data: {
        segments: [
          {
            segmentNumber: 1,
            departureAirportCode: "DFW",
            airlineCode: "AA",
            flightNumber: "100",
            departureDate: "2026-07-01",
            departureTime: "08:30",
            arrivalAirportCode: "GUA",
            arrivalDate: "2026-07-01",
            arrivalTime: "16:45",
          },
        ],
        initialDeparture: { date: "2026-07-01", time: "08:30", city: "Dallas" },
        finalArrival: { date: "2026-07-01", time: "16:45", city: "Guatemala City" },
      },
    });
    AirportServices.getAll.mockResolvedValue({
      data: [
        { id: 1, code: "DFW", city: "Dallas", airportName: "DFW" },
        { id: 2, code: "GUA", city: "Guatemala City", airportName: "GUA" },
      ],
    });
    AirlineServices.getAll.mockResolvedValue({
      data: [{ id: 1, code: "AA", name: "American Airlines" }],
    });
  });

  it("Staff opens Flights from trips list", async () => {
    Utils.setStore("user", orgAdminUser);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips", name: "trips", component: TripsList },
        {
          path: "/trips/:tripId/flights",
          name: "tripFlights",
          component: Stub,
          props: true,
        },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "trips" });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripsList, {
      router,
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await flushPromises();

    const btn = wrapper.findAll("button").find((b) => b.text().trim() === "Flights");
    expect(btn).toBeTruthy();
    await btn.trigger("click");
    await flushPromises();
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe("tripFlights");
    });
    expect(String(router.currentRoute.value.params.tripId)).toBe("42");
  });

  it("Flight segments dialog add and delete", async () => {
    Utils.setStore("user", orgAdminUser);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/trips/:tripId/flights",
          name: "tripFlights",
          component: TripFlightsView,
          props: true,
        },
        { path: "/trips", name: "trips", component: Stub },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "tripFlights", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripFlightsView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await flushPromises();

    const segBtn = wrapper
      .findAll("button")
      .find((b) => b.text().trim() === "Flight segments");
    expect(segBtn).toBeTruthy();
    await segBtn.trigger("click");
    await flushPromises();

    const dialog = wrapper.findComponent(FlightSegmentsDialog);
    expect(dialog.exists()).toBe(true);
    expect(dialog.props("modelValue")).toBe(true);

    await dialog.vm.addSegment();
    dialog.vm.segments[0].departureAirportCode = "DFW";
    dialog.vm.segments[0].arrivalAirportCode = "GUA";
    dialog.vm.segments[0].airlineCode = "AA";
    dialog.vm.segments[0].flightNumber = "100";
    dialog.vm.segments[0].departureDate = "2026-07-01";
    dialog.vm.segments[0].departureTime = "08:30";
    dialog.vm.segments[0].arrivalDate = "2026-07-01";
    dialog.vm.segments[0].arrivalTime = "16:45";
    await dialog.vm.save();
    await flushPromises();

    expect(TripServices.updateFlightSegments).toHaveBeenCalled();
    expect(TripServices.getFlights).toHaveBeenCalled();

    // reopen and delete
    TripServices.getFlightSegments.mockResolvedValueOnce({
      data: {
        segments: [
          {
            segmentNumber: 1,
            departureAirportCode: "DFW",
            airlineCode: "AA",
            flightNumber: "100",
            departureDate: "2026-07-01",
            departureTime: "08:30",
            arrivalAirportCode: "GUA",
            arrivalDate: "2026-07-01",
            arrivalTime: "16:45",
          },
        ],
      },
    });
    await segBtn.trigger("click");
    await flushPromises();
    const dialog2 = wrapper.findComponent(FlightSegmentsDialog);
    expect(dialog2.vm.segments.length).toBe(1);
    dialog2.vm.removeSegment(0);
    expect(dialog2.vm.segments.length).toBe(0);
    await dialog2.vm.save();
    await flushPromises();
    expect(TripServices.updateFlightSegments).toHaveBeenCalledWith("42", 101, { segments: [] });
  });
});
