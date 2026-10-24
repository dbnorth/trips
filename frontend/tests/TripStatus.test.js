/**
 * Feature 28 — View Trip Status
 * Spec: features/feature-28-view-trip-status.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import TripView from "../src/views/TripView.vue";
import TripStatusView from "../src/views/TripStatusView.vue";
import TripsList from "../src/views/TripsList.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import TripWorkerRoleServices from "../src/services/tripWorkerRoleServices.js";
import PersonServices from "../src/services/personServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    get: vi.fn(),
    getAll: vi.fn(),
    getStatus: vi.fn(),
  },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/donationServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/tripTravelOptionServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/tripWorkerRoleServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: {
    downloadParticipantsCsv: vi.fn(),
  },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: {
    get: vi.fn(),
    getPictureUrl: vi.fn(() => null),
  },
}));

vi.mock("../src/components/AddTripParticipantDialog.vue", () => ({
  default: { name: "AddTripParticipantDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/EditTripParticipantDialog.vue", () => ({
  default: { name: "EditTripParticipantDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/ParticipantDonationsDialog.vue", () => ({
  default: { name: "ParticipantDonationsDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/EditTripDialog.vue", () => ({
  default: { name: "EditTripDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/ViewPersonProfileDialog.vue", () => ({
  default: { name: "ViewPersonProfileDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/ViewTripApplicationDialog.vue", () => ({
  default: { name: "ViewTripApplicationDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/ConfirmDialog.vue", () => ({
  default: { name: "ConfirmDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/AddTripDialog.vue", () => ({
  default: { name: "AddTripDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/CopyTripDialog.vue", () => ({
  default: { name: "CopyTripDialog", template: "<div />", props: ["modelValue", "trips"] },
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

describe("Feature 28 — View Trip Status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    TripServices.get.mockResolvedValue({
      data: {
        id: 42,
        name: "Status Demo Trip",
        orgId: 10,
        status: "active",
        organization: { name: "Hope Mission" },
        participantCost: 1000,
        leaderNames: [],
      },
    });
    TripServices.getAll.mockResolvedValue({
      data: [{ id: 42, name: "Status Demo Trip", startDate: "2026-07-01", endDate: "2026-07-14" }],
    });
    OrganizationServices.get.mockResolvedValue({ data: { id: 10, name: "Hope Mission" } });
    TripPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    TripWorkerRoleServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Staff opens Trip Status from trip View page", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/trips/:tripId/status",
          name: "tripStatus",
          component: Stub,
          props: true,
        },
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: { template: "<div />" },
        },
      },
    });
    await flushPromises();

    const statusBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Trip Status");
    expect(statusBtn).toBeTruthy();

    await statusBtn.trigger("click");
    await flushPromises();
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe("tripStatus");
    });
    expect(String(router.currentRoute.value.params.tripId)).toBe("42");
  });

  it("Staff opens Trip Status from trips list", async () => {
    Utils.setStore("user", orgAdminUser);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips", name: "trips", component: TripsList },
        {
          path: "/trips/:tripId/status",
          name: "tripStatus",
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
      global: {
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const statusBtn = wrapper.find('button[aria-label="Status"]');
    expect(statusBtn).toBeTruthy();

    await statusBtn.trigger("click");
    await flushPromises();
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe("tripStatus");
    });
    expect(String(router.currentRoute.value.params.tripId)).toBe("42");
  });

  it("Clicking a participant name opens contact info", async () => {
    TripServices.getStatus.mockResolvedValue({
      data: {
        trip: {
          id: 42,
          name: "Status Demo Trip",
          organizationName: "Hope Mission",
          status: "active",
          participantCost: 1000,
        },
        rolesNeeded: [],
        travelOptions: [],
        participants: [
          {
            id: 7,
            peopleId: 99,
            displayName: "Ada Applicant",
            status: "incomplete",
            workerRoleName: "Nurse",
            missingItems: ["Profile is not complete"],
            amountOwed: 750,
            amountRaised: 250,
            selectedTravelOptionIds: [],
          },
        ],
      },
    });
    PersonServices.get.mockResolvedValue({
      data: {
        id: 99,
        firstName: "Ada",
        lastName: "Applicant",
        email: "ada@example.com",
        phoneContryCode: "1",
        phoneNumber: "5551234567",
        addLine1: "123 Main St",
        city: "Austin",
        state_prov: "TX",
        postalCode: "78701",
        country: "US",
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/trips/:tripId/status",
          name: "tripStatus",
          component: TripStatusView,
          props: true,
        },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "tripStatus", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripStatusView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const nameBtn = wrapper.findAll("button").find((b) => b.text().includes("Ada Applicant"));
    expect(nameBtn).toBeTruthy();
    await nameBtn.trigger("click");
    await flushPromises();

    expect(PersonServices.get).toHaveBeenCalledWith(99);
    const text = wrapper.text();
    expect(text).toContain("ada@example.com");
    expect(text).toContain("123 Main St");
    expect(text).toMatch(/555/);
    expect(text).toContain("Close");
  });

  describe("Feature 73 — US-73.1 See who books each participant's flight", () => {
    it("Trip Status board shows Booked by", async () => {
      const participant = (id, displayName, flightPurchaseOption) => ({
        id,
        peopleId: id,
        displayName,
        status: "applied",
        workerRoleName: "Nurse",
        flightPurchaseOption,
        missingItems: [],
        amountOwed: 0,
        amountRaised: 0,
        selectedTravelOptionIds: [],
      });
      TripServices.getStatus.mockResolvedValue({
        data: {
          trip: {
            id: 42,
            name: "Guatemala Hospital Ezel",
            organizationName: "Test Mission Org",
            status: "active",
            participantCost: 2000,
          },
          rolesNeeded: [],
          travelOptions: [],
          participants: [
            participant(1, "Nora Booked", "organization"),
            participant(2, "Rita Booked", "self"),
            participant(3, "Hank Booked", null),
          ],
        },
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/trips/:tripId/status", name: "tripStatus", component: TripStatusView, props: true },
          { path: "/home", name: "home", component: Stub },
        ],
      });
      await router.push({ name: "tripStatus", params: { tripId: "42" } });
      await router.isReady();

      const { wrapper } = await mountWithPlugins(TripStatusView, {
        props: { tripId: "42" },
        router,
      });
      await flushPromises();

      const headers = wrapper.findAll("th").map((th) => th.text().trim());
      const roleIndex = headers.indexOf("Role", headers.indexOf("Participant"));
      expect(headers[roleIndex + 1]).toBe("Booked by");
      const rowText = (name) =>
        wrapper.findAll("tbody tr").find((tr) => tr.text().includes(name)).text();
      expect(rowText("Nora Booked")).toContain("Test Mission Org");
      expect(rowText("Rita Booked")).toContain("Participant");
      expect(rowText("Hank Booked")).toContain("Not chosen");
    });
  });

  describe("Feature 74 — US-74.2 Every total includes add-on expenses", () => {
    it("Trip Status shows each participant's total cost with its details", async () => {
      const costBreakdown = {
        tripCost: 2000,
        tripOptions: [{ description: "Private room", amount: 250 }],
        adjustment: 0,
        addonExpenses: [{ description: "Travel insurance", amount: 75 }],
        airfare: 850,
        totalTripCost: 3175,
      };
      TripServices.getStatus.mockResolvedValue({
        data: {
          trip: { id: 42, name: "Guatemala Hospital Ezel", status: "active", participantCost: 2000 },
          rolesNeeded: [],
          travelOptions: [],
          participants: [
            {
              id: 1,
              peopleId: 1,
              displayName: "Nora Diaz",
              status: "approved",
              missingItems: [],
              participantCost: 2250,
              totalTripCost: 3175,
              costBreakdown,
              amountOwed: 2175,
              amountRaised: 1000,
              selectedTravelOptionIds: [],
            },
          ],
        },
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/trips/:tripId/status", name: "tripStatus", component: TripStatusView, props: true },
          { path: "/home", name: "home", component: Stub },
        ],
      });
      await router.push({ name: "tripStatus", params: { tripId: "42" } });
      await router.isReady();

      const { wrapper } = await mountWithPlugins(TripStatusView, {
        props: { tripId: "42" },
        router,
        global: {
          stubs: { VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' } },
        },
      });
      await flushPromises();

      const headers = wrapper.findAll("th").map((th) => th.text().trim());
      const totalIndex = headers.indexOf("Total cost");
      expect(headers.slice(totalIndex + 1, totalIndex + 3)).toEqual(["Amount raised", "Amount owed"]);
      const cell = wrapper.find("tbody tr").findAll("td")[totalIndex];
      expect(cell.find('[data-testid="total-cost-info"]').exists()).toBe(true);
      const lines = cell
        .findAll('[data-testid="total-cost-breakdown"] > div')
        .map((line) => line.findAll("span").map((s) => s.text().trim()));
      expect(lines).toEqual([
        ["Trip cost", "$2,000.00"],
        ["Trip option: Private room", "$250.00"],
        ["Add-on: Travel insurance", "$75.00"],
        ["Flight", "$850.00"],
        ["Total", "$3,175.00"],
      ]);
    });
  });
});

/**
 * Feature 79 — Planned Arrival and Departure on Flights
 * Spec: features/feature-79-flights-planned-dates.md
 */
describe("Feature 79 — Planned Arrival and Departure on Flights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Trip Status board shows Arrives and Departs with the warning", async () => {
    TripServices.getStatus.mockResolvedValue({
      data: {
        trip: { id: 42, name: "Guatemala Clinic", organizationName: "Hope Missions", status: "active" },
        rolesNeeded: [],
        travelOptions: [],
        participants: [
          {
            id: 1,
            peopleId: 1,
            displayName: "Ana Lopez",
            status: "approved",
            workerRoleName: "Nurse",
            flightPurchaseOption: "organization",
            missingItems: [],
            amountOwed: 0,
            amountRaised: 0,
            selectedTravelOptionIds: [],
            arrivalDate: "2027-06-07",
            departureDate: "2027-06-18",
            arrivalAdjustments: [{ type: "option", description: "Arrive early", days: 2 }],
            departureAdjustments: [{ type: "addon", description: "Extra hotel night", days: 1 }],
            flightArrivalDate: "2027-06-08",
            flightDepartureDate: "2027-06-18",
          },
        ],
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId/status", name: "tripStatus", component: TripStatusView, props: true },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "tripStatus", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripStatusView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: { VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' } },
      },
    });
    await flushPromises();

    const headers = wrapper.findAll("th").map((th) => th.text().trim());
    const bookedBy = headers.indexOf("Booked by");
    expect(headers.slice(bookedBy + 1, bookedBy + 3)).toEqual(["Arrives", "Departs"]);
    const row = wrapper.find("tbody tr").findAll("td");
    const arrives = row[bookedBy + 1];
    const departs = row[bookedBy + 2];
    expect(arrives.text()).toContain("06/07/2027");
    expect(arrives.find('[data-testid="date-adjustment-info"]').exists()).toBe(true);
    expect(arrives.find('[data-testid="date-flight-mismatch"]').text()).toBe("Arrival flight lands 06/08/2027");
    expect(departs.text()).toContain("06/18/2027");
    expect(departs.find('[data-testid="date-flight-warning"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
