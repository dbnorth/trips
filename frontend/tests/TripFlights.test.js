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
            segmentType: "arrival",
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

    await dialog.vm.addSegment("arrival");
    expect(dialog.vm.segments[0].departureDate).toBe("2026-07-01");
    expect(dialog.vm.segments[0].arrivalDate).toBe("2026-07-01");
    await dialog.vm.addSegment("return");
    expect(dialog.vm.segments[1].departureDate).toBe("2026-07-14");
    expect(dialog.vm.segments[1].arrivalDate).toBe("2026-07-14");
    dialog.vm.segments.splice(1, 1);
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
            segmentType: "arrival",
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

  describe("Feature 73 — US-73.1 See who books each participant's flight", () => {
    it("Flights page shows Booked by", async () => {
      Utils.setStore("user", orgAdminUser);
      const participant = (tripPeopleRoleId, firstName, flightPurchaseOption) => ({
        tripPeopleRoleId,
        peopleId: tripPeopleRoleId,
        firstName,
        lastName: "Booked",
        flightPurchaseOption,
        purchased: false,
        cost: null,
        comments: "",
        segmentCount: 0,
        initialDeparture: null,
        finalArrival: null,
      });
      TripServices.getFlights.mockResolvedValue({
        data: {
          trip: {
            id: 42,
            name: "Guatemala Hospital Ezel",
            organizationName: "Test Mission Org",
            startDate: "2027-03-06",
            endDate: "2027-03-13",
          },
          participants: [
            participant(201, "Nora", "organization"),
            participant(202, "Rita", "self"),
            participant(203, "Hank", null),
          ],
        },
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/trips/:tripId/flights", name: "tripFlights", component: TripFlightsView, props: true },
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

      const headers = wrapper.findAll("th").map((th) => th.text().trim());
      expect(headers).toContain("Booked by");
      expect(headers).not.toContain("Who purchases");
      const rowText = (name) =>
        wrapper.findAll("tbody tr").find((tr) => tr.text().includes(name)).text();
      expect(rowText("Nora")).toContain("Test Mission Org");
      expect(rowText("Rita")).toContain("Participant");
      expect(rowText("Hank")).toContain("Not chosen");
    });
  });
});

/**
 * Feature 79 — Planned Arrival and Departure on Flights
 * Spec: features/feature-79-flights-planned-dates.md
 */
describe("Feature 79 — Planned Arrival and Departure on Flights", () => {
  const participant = (tripPeopleRoleId, firstName, dates) => ({
    tripPeopleRoleId,
    peopleId: tripPeopleRoleId,
    firstName,
    lastName: "Lopez",
    flightPurchaseOption: "organization",
    purchased: false,
    cost: null,
    comments: "",
    segmentCount: 0,
    initialDeparture: null,
    finalArrival: null,
    arrivalAdjustments: [],
    departureAdjustments: [],
    ...dates,
  });

  const mountFlights = async (anaExtra = {}) => {
    Utils.setStore("user", orgAdminUser);
    TripServices.getFlights.mockResolvedValue({
      data: {
        trip: { id: 42, name: "Guatemala Clinic", organizationName: "Hope Missions", startDate: "2027-06-10", endDate: "2027-06-17" },
        participants: [
          participant(201, "Ana", {
            arrivalDate: "2027-06-07",
            departureDate: "2027-06-18",
            arrivalAdjustments: [
              { type: "option", description: "Arrive early", days: 2 },
              { type: "addon", description: "Extra hotel night", days: 1 },
            ],
            departureAdjustments: [{ type: "addon", description: "Extra hotel night", days: 1 }],
            flightArrivalDate: "2027-06-08",
            flightDepartureDate: "2027-06-18",
            ...anaExtra,
          }),
          participant(202, "Ben", {
            arrivalDate: "2027-06-10",
            departureDate: "2027-06-17",
            flightArrivalDate: null,
            flightDepartureDate: null,
          }),
        ],
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId/flights", name: "tripFlights", component: TripFlightsView, props: true },
        { path: "/trips", name: "trips", component: Stub },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "tripFlights", params: { tripId: "42" } });
    await router.isReady();
    const { wrapper } = await mountWithPlugins(TripFlightsView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          VDialog: { template: "<div><slot /></div>" },
          VTooltip: { template: '<div class="tooltip-stub"><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  const cells = (wrapper, name) => {
    const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes(name));
    return {
      arrives: row.find('[data-testid="flights-arrives"]'),
      departs: row.find('[data-testid="flights-departs"]'),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("Flights page shows Arrives and Departs", async () => {
    const wrapper = await mountFlights();

    const headers = wrapper.findAll("th").map((th) => th.text().trim());
    const bookedBy = headers.indexOf("Booked by");
    expect(headers.slice(bookedBy + 1, bookedBy + 3)).toEqual(["Arrives", "Departs"]);

    const { arrives, departs } = cells(wrapper, "Ana");
    expect(arrives.text()).toContain("06/07/2027");
    expect(arrives.find('[data-testid="date-adjustment-info"]').exists()).toBe(true);
    expect(
      arrives
        .findAll('[data-testid="date-adjustments"] > div')
        .map((line) => line.findAll("span").map((s) => s.text().trim()))
    ).toEqual([
      ["Trip option: Arrive early", "2 days before"],
      ["Add-on: Extra hotel night", "1 day before"],
    ]);
    expect(departs.text()).toContain("06/18/2027");

    wrapper.unmount();
  });

  it("Flights page warns when flights differ from the plan", async () => {
    const wrapper = await mountFlights();

    const ana = cells(wrapper, "Ana");
    expect(ana.arrives.find('[data-testid="date-flight-warning"]').exists()).toBe(true);
    expect(ana.arrives.find('[data-testid="date-flight-mismatch"]').text()).toBe(
      "Arrival flight lands 06/08/2027"
    );
    expect(ana.departs.find('[data-testid="date-flight-warning"]').exists()).toBe(false);

    const ben = cells(wrapper, "Ben");
    expect(ben.arrives.find('[data-testid="date-flight-warning"]').exists()).toBe(false);
    expect(ben.departs.find('[data-testid="date-flight-warning"]').exists()).toBe(false);

    wrapper.unmount();
  });

  it("Flights page warns when airports differ from the request", async () => {
    const wrapper = await mountFlights({
      arrivalFlightOriginCode: "MIA",
      returnFlightDestinationCode: "DFW",
      flightPurchasePreferences: { departureAirportCode: "DFW", returnAirportCode: "DFW" },
    });

    const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Ana"));
    const initial = row.find('[data-testid="flights-initial-departure"]');
    expect(initial.find('[data-testid="airport-warning"]').exists()).toBe(true);
    expect(initial.find('[data-testid="airport-warning-message"]').text()).toBe(
      "Arrival flight departs from MIA, but DFW was requested."
    );
    const final = row.find('[data-testid="flights-final-arrival"]');
    expect(final.find('[data-testid="airport-warning"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
