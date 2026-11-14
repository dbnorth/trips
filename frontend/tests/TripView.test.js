/**
 * Feature 46 — Email Trip Team
 * Spec: features/feature-46-email-trip-team.md
 *
 * Feature 58 — Participant Documents PDF
 * Spec: features/feature-58-participant-documents-pdf.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import TripView from "../src/views/TripView.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import ExportServices from "../src/services/exportServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn(), getStatus: vi.fn() },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/donationServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/exportServices.js", () => ({
  default: { participantsCsv: vi.fn(), participantDocumentsPdf: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { getPictureUrl: vi.fn(() => null) },
}));

const { stubDialog } = vi.hoisted(() => ({
  stubDialog: (name, props = ["modelValue"]) => ({
    default: { name, template: "<div />", props },
  }),
}));
vi.mock("../src/components/AddTripParticipantDialog.vue", () => stubDialog("AddTripParticipantDialog"));
vi.mock("../src/components/EditTripParticipantDialog.vue", () => stubDialog("EditTripParticipantDialog"));
vi.mock("../src/components/ParticipantDonationsDialog.vue", () => stubDialog("ParticipantDonationsDialog"));
vi.mock("../src/components/EditTripDialog.vue", () => stubDialog("EditTripDialog"));
vi.mock("../src/components/ViewPersonProfileDialog.vue", () => stubDialog("ViewPersonProfileDialog"));
vi.mock("../src/components/ViewTripApplicationDialog.vue", () => stubDialog("ViewTripApplicationDialog"));
vi.mock("../src/components/ConfirmDialog.vue", () => stubDialog("ConfirmDialog"));
vi.mock("../src/components/TripTeamEmailDialog.vue", () =>
  stubDialog("TripTeamEmailDialog", ["modelValue", "tripId", "participants"])
);

const Stub = { template: "<div />" };

describe("Feature 46 — Email Trip Team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [{ id: 1, peopleId: 5, status: "approved", role: { roleName: "Trip Participant" } }],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Email team button opens the dialog", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const dialog = () => wrapper.findComponent({ name: "TripTeamEmailDialog" });
    expect(dialog().props("modelValue")).toBe(false);

    const emailBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Email team");
    expect(emailBtn).toBeTruthy();
    await emailBtn.trigger("click");
    await flushPromises();

    expect(dialog().props("modelValue")).toBe(true);
    expect(dialog().props("tripId")).toBe("42");
    expect(dialog().props("participants")).toHaveLength(1);

    wrapper.unmount();
  });
});

describe("Feature 110 — Update Trip View", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({
      data: [{ id: 1, setNumber: 1, description: "Private room", priceAdjustment: 250 }],
    });
  });

  it("Trip options opens and closes from its heading row", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const toggle = wrapper.find('[data-testid="trip-options-toggle"]');
    const content = () => wrapper.find('[data-testid="trip-options-content"]');
    const shown = () => !(content().attributes("style") || "").includes("display: none");

    expect(toggle.text()).toContain("Trip options");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(shown()).toBe(false);

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(shown()).toBe(true);
    expect(content().text()).toContain("Private room");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(shown()).toBe(false);
    wrapper.unmount();
  });

  it("The participants table has the Trip Status participant columns", async () => {
    TripServices.get.mockResolvedValue({
      data: {
        id: 42,
        name: "Guatemala Clinic",
        orgId: 10,
        status: "active",
        leaderNames: [],
        organization: { id: 10, name: "Hope Missions" },
      },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 7,
          peopleId: 5,
          status: "pre_approved",
          flightPurchaseOption: "organization",
          person: { id: 5, firstName: "Ava", lastName: "Reed" },
          role: { roleName: "Trip Participant" },
          donationTotal: 500,
          totalTripCost: 2000,
        },
      ],
    });
    TripServices.getStatus.mockResolvedValue({
      data: {
        participants: [
          { id: 7, missingItems: ["Passport"], amountOwed: 1500, selectedTravelOptionIds: [1] },
        ],
      },
    });
    TripTravelOptionServices.getAll.mockResolvedValue({
      data: [
        { id: 1, setNumber: 1, description: "Private room", priceAdjustment: 250 },
        { id: 2, setNumber: 1, description: "Shared room", priceAdjustment: 0 },
      ],
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: Stub,
          VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();

    const table = wrapper.findAll("table").find((t) => t.text().includes("Ava Reed"));
    const headers = table.findAll("th").map((th) => th.text().trim());
    expect(headers).toEqual(
      expect.arrayContaining([
        "Booked by",
        "Missing items",
        "Amount owed",
        "Private room (Set 1)",
        "Shared room (Set 1)",
      ])
    );
    expect(headers).not.toContain("Amount raised");
    expect(headers).not.toContain("Worker role");
    expect(headers).not.toContain("Participant cost");

    const cells = table.find("tbody tr").findAll("td");
    const cell = (title) => cells[headers.indexOf(title)].text().trim();
    expect(cell("Booked by")).toBe("Hope Missions");
    expect(cells[headers.indexOf("Missing items")].find('[data-testid="missing-items-list"]').text()).toContain(
      "Passport"
    );
    expect(cell("Amount owed")).toBe("$1,500.00");
    expect(cell("Private room (Set 1)")).toBe("Yes");
    expect(cell("Shared room (Set 1)")).toBe("—");
    wrapper.unmount();
  });

  it("The Role column shows Trip Leader with any worker role", async () => {
    const member = (id, firstName, roleName, workerRoleName) => ({
      id,
      peopleId: id,
      status: "approved",
      person: { id, firstName, lastName: "Test" },
      role: { roleName },
      tripWorkerRole: workerRoleName ? { workerRole: { name: workerRoleName } } : null,
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        member(1, "Lee", "Trip Leader", "Nurse"),
        member(2, "Lia", "Trip Leader", null),
        member(3, "Ava", "Trip Participant", "Doctor"),
        member(4, "Ned", "Trip Participant", null),
      ],
    });
    TripServices.getStatus.mockResolvedValue({ data: { participants: [] } });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const table = wrapper.findAll("table").find((t) => t.text().includes("Lee Test"));
    const headers = table.findAll("th").map((th) => th.text().trim());
    expect(headers[1]).toBe("Trip Status");
    expect(headers[2]).toBe("Role");
    expect(headers).not.toContain("Worker role");
    const roleOf = (name) =>
      table
        .findAll("tbody tr")
        .find((tr) => tr.text().includes(name))
        .findAll("td")[headers.indexOf("Role")]
        .text()
        .trim();
    expect(roleOf("Lee Test")).toBe("Trip Leader, Nurse");
    expect(roleOf("Lia Test")).toBe("Trip Leader");
    expect(roleOf("Ava Test")).toBe("Doctor");
    expect(roleOf("Ned Test")).toBe("—");
    wrapper.unmount();
  });

  it("The trip page shows whether the trip is ready", async () => {
    const prepStatus = {
      rolesFilled: true,
      participantsApproved: false,
      fundsRaised: true,
      flightsEntered: false,
      roomListComplete: true,
    };
    TripServices.getStatus.mockResolvedValue({ data: { participants: [], prepStatus } });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const mountView = async () => {
      const { wrapper } = await mountWithPlugins(TripView, {
        props: { tripId: "42" },
        router,
        global: { stubs: { TripWorkerRolesCard: Stub } },
      });
      await flushPromises();
      return wrapper;
    };

    let wrapper = await mountView();
    const cards = wrapper.findAll(".v-card");
    expect(cards[1].attributes("data-testid")).toBe("trip-readiness");
    const title = wrapper.find('[data-testid="trip-readiness-title"]');
    expect(title.text()).toBe("Trip Not Ready");
    expect(title.classes()).toContain("text-error");
    const lines = wrapper.findAll('[data-testid="trip-readiness-list"] > div');
    expect(lines.map((line) => line.text().trim())).toEqual([
      "All roles filled",
      "All participants approved",
      "All funds raised",
      "Flights entered for all participants",
      "Room list includes all participants",
    ]);
    expect(lines.map((line) => line.find(".v-icon").attributes("aria-label"))).toEqual([
      "Complete",
      "Not complete",
      "Complete",
      "Not complete",
      "Complete",
    ]);
    wrapper.unmount();

    TripServices.getStatus.mockResolvedValue({
      data: {
        participants: [],
        prepStatus: { ...prepStatus, participantsApproved: true, flightsEntered: true },
      },
    });
    wrapper = await mountView();
    const readyTitle = wrapper.find('[data-testid="trip-readiness-title"]');
    expect(readyTitle.text()).toBe("Trip Ready");
    expect(readyTitle.classes()).toContain("text-success");
    wrapper.unmount();
  });

  it("The Trip Status page is removed", async () => {
    const { default: appRouter } = await import("../src/router.js");
    expect(appRouter.hasRoute("tripStatus")).toBe(false);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    expect(wrapper.findAll("button").some((b) => b.text().trim() === "Trip Status")).toBe(false);
    wrapper.unmount();
  });

  it("The participants table keeps Name and Actions in view while scrolling", async () => {
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [{ id: 7, peopleId: 5, status: "approved", person: { id: 5, firstName: "Ava", lastName: "Reed" } }],
    });
    TripServices.getStatus.mockResolvedValue({ data: { participants: [] } });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const table = wrapper.findAll("table").find((t) => t.text().includes("Ava Reed"));
    const ths = table.findAll("th");
    const headerCells = (cls) => ths.filter((th) => th.classes().includes(cls)).map((th) => th.text().trim());
    expect(headerCells("v-data-table-column--fixed")).toEqual(["Name"]);
    expect(headerCells("v-data-table-column--fixed-end")).toEqual(["Actions"]);

    const tds = table.find("tbody tr").findAll("td");
    expect(tds[0].classes()).toContain("v-data-table-column--fixed");
    expect(tds[0].text()).toContain("Ava Reed");
    expect(tds[tds.length - 1].classes()).toContain("v-data-table-column--fixed-end");
    wrapper.unmount();
  });
});

describe("Feature 58 — Participant Documents PDF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 7,
          peopleId: 5,
          status: "approved",
          role: { roleName: "Trip Participant" },
          person: { id: 5, firstName: "Ana", middleName: "Maria", lastName: "Lopez" },
        },
      ],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    ExportServices.participantDocumentsPdf.mockResolvedValue();
  });

  it("Documents PDF action on the participant row", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const button = wrapper.find('button[aria-label="Documents PDF"]');
    expect(button).toBeTruthy();
    await button.trigger("click");
    await flushPromises();

    expect(ExportServices.participantDocumentsPdf).toHaveBeenCalledWith("42", 7, "Ana Lopez");

    wrapper.unmount();
  });
});

/**
 * Feature 74 — Trip Add-on Expenses
 * Spec: features/feature-74-trip-addon-expenses.md
 */
describe("Feature 74 — Trip Add-on Expenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Hospital Ezel", orgId: 10, status: "active", participantCost: 2000, leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 40,
          peopleId: 5,
          status: "approved",
          participantCost: 2250,
          totalTripCost: 3575,
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
          role: { roleName: "Trip Participant" },
          person: { id: 5, firstName: "Nora", lastName: "Diaz" },
        },
      ],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  it("View Trip shows each participant's total cost", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const headers = wrapper.findAll("th").map((th) => th.text().trim());
    const totalIndex = headers.indexOf("Total cost");
    expect(totalIndex).toBeGreaterThan(-1);
    const cells = wrapper.find("tbody tr").findAll("td").map((td) => td.text().trim());
    expect(cells[totalIndex]).toBe("$3,575.00");

    wrapper.unmount();
  });

  it("Total cost icon lists the participant's cost details", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: Stub,
          VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="total-cost-info"]').exists()).toBe(true);
    const lines = wrapper
      .findAll('[data-testid="total-cost-breakdown"] > div')
      .map((line) => line.findAll("span").map((s) => s.text().trim()));
    expect(lines).toEqual([
      ["Trip cost", "$2,000.00"],
      ["Trip option: Private room", "$250.00"],
      ["Add-on: Travel insurance", "$75.00"],
      ["Add-on: Antigua weekend excursion", "$400.00"],
      ["Flight", "$850.00"],
      ["Total", "$3,575.00"],
    ]);

    wrapper.unmount();
  });
});

/**
 * Feature 78 — Days Before and After the Trip
 * Spec: features/feature-78-days-before-after-trip.md
 */
describe("Feature 78 — Days Before and After the Trip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 40,
          peopleId: 5,
          status: "approved",
          arrivalDate: "2026-06-07",
          departureDate: "2026-06-18",
          arrivalAdjustments: [
            { type: "option", description: "Arrive early", days: 2 },
            { type: "addon", description: "Extra hotel night", days: 1 },
          ],
          departureAdjustments: [{ type: "addon", description: "Extra hotel night", days: 1 }],
          role: { roleName: "Trip Participant" },
          person: { id: 5, firstName: "Ana", lastName: "Lopez" },
        },
        {
          id: 41,
          peopleId: 6,
          status: "approved",
          arrivalDate: "2026-06-10",
          departureDate: "2026-06-17",
          arrivalAdjustments: [],
          departureAdjustments: [],
          role: { roleName: "Trip Participant" },
          person: { id: 6, firstName: "Ben", lastName: "Ruiz" },
        },
      ],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  it("View Trip shows Arrives and Departs", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: Stub,
          VTooltip: { template: '<div class="tooltip-stub"><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();

    const headers = wrapper.findAll("th").map((th) => th.text().trim());
    const arrivesIndex = headers.indexOf("Arrives");
    expect(arrivesIndex).toBe(headers.indexOf("Status") + 1);
    expect(headers[arrivesIndex + 1]).toBe("Departs");
    const rowCells = (name) =>
      wrapper
        .findAll("tbody tr")
        .find((tr) => tr.text().includes(name))
        .findAll("td");
    const [arrives, departs] = rowCells("Ana").slice(arrivesIndex, arrivesIndex + 2);
    const tooltipLines = (cell) =>
      cell
        .findAll('[data-testid="date-adjustments"] > div')
        .map((line) => line.findAll("span").map((s) => s.text().trim()));
    expect(arrives.text()).toContain("06/07/2026");
    expect(arrives.find('[data-testid="date-adjustment-info"]').exists()).toBe(true);
    expect(tooltipLines(arrives)).toEqual([
      ["Trip option: Arrive early", "2 days before"],
      ["Add-on: Extra hotel night", "1 day before"],
    ]);
    expect(departs.text()).toContain("06/18/2026");
    expect(tooltipLines(departs)).toEqual([["Add-on: Extra hotel night", "1 day after"]]);

    const benCells = rowCells("Ben").slice(arrivesIndex, arrivesIndex + 2);
    expect(benCells.map((td) => td.text().trim())).toEqual(["06/10/2026", "06/17/2026"]);
    expect(benCells.some((td) => td.find('[data-testid="date-adjustment-info"]').exists())).toBe(false);

    wrapper.unmount();
  });

  /**
   * Feature 79 — Planned Arrival and Departure on Flights
   * Spec: features/feature-79-flights-planned-dates.md
   */
  it("View Trip warns when flights differ from the plan", async () => {
    const roster = (await TripPeopleRoleServices.getAll()).data;
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        { ...roster[0], flightArrivalDate: "2026-06-08", flightDepartureDate: "2026-06-18" },
        { ...roster[1], flightArrivalDate: null, flightDepartureDate: null },
      ],
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: Stub,
          VTooltip: { template: '<div class="tooltip-stub"><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();

    const headers = wrapper.findAll("th").map((th) => th.text().trim());
    const arrivesIndex = headers.indexOf("Arrives");
    const rowCells = (name) =>
      wrapper
        .findAll("tbody tr")
        .find((tr) => tr.text().includes(name))
        .findAll("td")
        .slice(arrivesIndex, arrivesIndex + 2);
    const [arrives, departs] = rowCells("Ana");
    expect(arrives.find('[data-testid="date-flight-mismatch"]').text()).toBe("Arrival flight lands 06/08/2026");
    expect(departs.find('[data-testid="date-flight-warning"]').exists()).toBe(false);
    expect(rowCells("Ben").some((td) => td.find('[data-testid="date-flight-warning"]').exists())).toBe(false);

    wrapper.unmount();
  });
});

/**
 * Feature 89 — Negative Trip Days and Wider Option Descriptions
 * Spec: features/feature-89-negative-trip-days.md
 */
describe("Feature 89 — Negative Trip Days", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Clinica Ezell Hospital - January 2027", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 40,
          peopleId: 5,
          status: "approved",
          arrivalDate: "2027-01-17",
          departureDate: "2027-01-21",
          arrivalAdjustments: [{ type: "addon", description: "Late arrival", days: -1 }],
          departureAdjustments: [{ type: "option", description: "Depart Friday", days: -2 }],
          role: { roleName: "Trip Participant" },
          person: { id: 5, firstName: "Ana", lastName: "Lopez" },
        },
      ],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Negative days show later and earlier", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: Stub,
          VTooltip: { template: '<div class="tooltip-stub"><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();

    const headers = wrapper.findAll("th").map((th) => th.text().trim());
    const arrivesIndex = headers.indexOf("Arrives");
    const [arrives, departs] = wrapper
      .findAll("tbody tr")
      .find((tr) => tr.text().includes("Ana"))
      .findAll("td")
      .slice(arrivesIndex, arrivesIndex + 2);
    const tooltipLines = (cell) =>
      cell
        .findAll('[data-testid="date-adjustments"] > div')
        .map((line) => line.findAll("span").map((s) => s.text().trim()));
    expect(arrives.text()).toContain("01/17/2027");
    expect(tooltipLines(arrives)).toEqual([["Add-on: Late arrival", "1 day later"]]);
    expect(departs.text()).toContain("01/21/2027");
    expect(tooltipLines(departs)).toEqual([["Trip option: Depart Friday", "2 days earlier"]]);

    wrapper.unmount();
  });
});

describe("Feature 120 — Updated Document Processing", () => {
  it("The trip page shows when every trip document is reviewed", async () => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        { id: 7, peopleId: 5, status: "pre_approved", person: { id: 5, firstName: "Ava", lastName: "Reed" } },
        { id: 8, peopleId: 6, status: "pre_approved", person: { id: 6, firstName: "Pat", lastName: "Lee" } },
        { id: 9, peopleId: 7, status: "pre_approved", person: { id: 7, firstName: "Kim", lastName: "Cho" } },
      ],
    });
    TripServices.getStatus.mockResolvedValue({
      data: {
        participants: [
          { id: 7, missingItems: [], documentsReviewed: true, documentsToReview: false },
          { id: 8, missingItems: [], documentsReviewed: false, documentsToReview: false },
          { id: 9, missingItems: [], documentsReviewed: false, documentsToReview: true },
        ],
      },
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const reviewAction = (name) =>
      wrapper
        .findAll("tbody tr")
        .find((tr) => tr.text().includes(name))
        .find('[data-testid="review-documents-action"]');
    expect(reviewAction("Ava").classes()).toContain("text-success");
    expect(reviewAction("Pat").classes()).not.toContain("text-success");
    expect(reviewAction("Pat").classes()).not.toContain("text-warning");
    expect(reviewAction("Kim").classes()).toContain("text-warning");

    wrapper.unmount();
  });
});

/**
 * Feature 122 — Approve Action Colors
 * Spec: features/feature-122-approve-action-colors.md
 */
describe("Feature 122 — Approve Action Colors", () => {
  it("Approve App is orange when ready and View App is green when Approved", async () => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        { id: 7, peopleId: 5, status: "approved", person: { id: 5, firstName: "Ava", lastName: "Cruz" } },
        { id: 8, peopleId: 6, status: "pre_approved", person: { id: 6, firstName: "Pat", lastName: "Lee" } },
        { id: 9, peopleId: 7, status: "pre_approved", person: { id: 7, firstName: "Kim", lastName: "Diaz" } },
        { id: 10, peopleId: 8, status: "incomplete", person: { id: 8, firstName: "Max", lastName: "Hill" } },
      ],
    });
    TripServices.getStatus.mockResolvedValue({
      data: {
        participants: [
          { id: 7, missingItems: [], readyToApprove: false },
          { id: 8, missingItems: [], readyToApprove: true },
          { id: 9, missingItems: [], readyToApprove: false },
          { id: 10, missingItems: [], readyToApprove: false },
        ],
      },
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const applicationAction = (name) =>
      wrapper
        .findAll("tbody tr")
        .find((tr) => tr.text().includes(name))
        .find('[data-testid="application-action"]');
    expect(applicationAction("Ava").attributes("aria-label")).toBe("View App");
    expect(applicationAction("Ava").classes()).toContain("text-success");
    expect(applicationAction("Pat").attributes("aria-label")).toBe("Approve App");
    expect(applicationAction("Pat").classes()).toContain("text-warning");
    for (const name of ["Kim", "Max"]) {
      expect(applicationAction(name).classes()).not.toContain("text-success");
      expect(applicationAction(name).classes()).not.toContain("text-warning");
    }

    wrapper.unmount();
  });
});

/**
 * Feature 127 — Participant Counts
 * Spec: features/feature-127-participant-counts.md
 */
describe("Feature 127 — Participant Counts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [], participantCost: 1500 },
    });
    const row = (id, roleName, status) => ({
      id,
      peopleId: id,
      status,
      role: { roleName },
      person: { id, firstName: `P${id}`, lastName: "Test" },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        row(1, "Trip Participant", "incomplete"),
        row(2, "Trip Participant", "pre_approved"),
        row(3, "Trip Participant", "pre_approved"),
        row(4, "Trip Participant", "approved"),
        row(5, "Trip Participant", "approved"),
        row(6, "Trip Participant", "approved"),
        row(7, "Trip Participant", "declined"),
        row(8, "Trip Participant", "cancelled"),
        row(9, "Trip Leader", "approved"),
      ],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  describe("US-127.2 — Leaders and Participants on View Trip", () => {
    it("View Trip summary shows Leaders and Participants", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
          { path: "/trips", name: "trips", component: Stub },
        ],
      });
      await router.push({ name: "tripView", params: { tripId: "42" } });
      await router.isReady();

      const { wrapper } = await mountWithPlugins(TripView, {
        props: { tripId: "42" },
        router,
        global: {
          stubs: {
            TripWorkerRolesCard: Stub,
            VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
          },
        },
      });
      await flushPromises();

      const summary = wrapper.find('[data-testid="trip-summary"]');
      const labels = summary.findAll(".text-caption").map((el) => el.text().trim());
      expect(labels).toEqual([
        "Leaders",
        "Participants",
        "Cost per participant",
        "Total donations",
        "Donations without participant",
      ]);
      expect(summary.find('[data-testid="trip-summary-leaders"]').text()).toBe("1");
      const participants = summary.find('[data-testid="trip-summary-participants"]');
      expect(participants.find('[data-testid="participant-count"]').text()).toBe("6");
      const lines = participants
        .findAll('[data-testid="participant-count-breakdown"] > div')
        .map((d) => d.text().trim());
      expect(lines).toEqual(["Incomplete: 1", "Pre-approved: 2", "Approved: 3"]);

      wrapper.unmount();
    });
  });
});

describe("Feature 132 — Trip account number", () => {
  it("Trip details shows a saved account number", async () => {
    TripPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", accountNumber: "7712", leaderNames: [] },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("Account number:");
    expect(wrapper.text()).toContain("7712");
    wrapper.unmount();
  });
});

describe("Feature 135 — Trip Ready Status", () => {
  const person = (id, firstName) => ({
    id,
    peopleId: id,
    status: "approved",
    person: { id, firstName, lastName: "Lee" },
    role: { roleName: "Trip Participant" },
  });

  it("An approved participant with flights and a room is Trip Ready", async () => {
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [person(1, "Ana"), person(2, "Ben")],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    TripServices.getStatus.mockResolvedValue({
      data: {
        participants: [
          { id: 1, tripReady: true, tripReadyMissing: [] },
          { id: 2, tripReady: false, tripReadyMissing: ["No return flight."] },
        ],
      },
    });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: {
        stubs: {
          TripWorkerRolesCard: Stub,
          VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
        },
      },
    });
    await flushPromises();

    const table = wrapper.findAll("table").find((t) => t.text().includes("Ana Lee"));
    const headers = table.findAll("th").map((th) => th.text().trim());
    expect(headers[0]).toBe("Name");
    expect(headers[1]).toBe("Trip Status");

    const row = (name) => table.findAll("tbody tr").find((tr) => tr.text().includes(name));
    const ana = row("Ana Lee");
    const anaStatus = ana.find('[data-testid="trip-status"]');
    expect(anaStatus.text()).toBe("Trip Ready");
    expect(anaStatus.classes()).toContain("trip-status-ready");
    expect(ana.find('[data-testid="trip-ready-info"]').exists()).toBe(false);

    const ben = row("Ben Lee");
    const benStatus = ben.find('[data-testid="trip-status"]');
    expect(benStatus.text()).toBe("Not Ready");
    expect(benStatus.classes()).toContain("trip-status-not-ready");
    expect(ben.find('[data-testid="trip-ready-info"]').attributes("aria-label")).toBe(
      "Not ready: No return flight."
    );
    expect(ben.find('[data-testid="trip-ready-missing"]').text()).toBe("No return flight.");

    wrapper.unmount();
  });
});

describe("Feature 136 — Trip View Flight Itinerary", () => {
  it("Flight segments opens from the participant row", async () => {
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 7,
          peopleId: 5,
          status: "approved",
          person: { id: 5, firstName: "Ava", lastName: "Reed" },
          role: { roleName: "Trip Participant" },
        },
      ],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    TripServices.getStatus.mockResolvedValue({ data: { participants: [] } });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const edit = wrapper.find('[aria-label="Edit"]');
    const flights = wrapper.find('[aria-label="Flight segments"]');
    expect(flights.exists()).toBe(true);
    expect(edit.element.compareDocumentPosition(flights.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await flights.trigger("click");
    const dialog = wrapper.findComponent({ name: "FlightSegmentsDialog" });
    expect(dialog.props("modelValue")).toBe(true);
    expect(dialog.props("participantName")).toBe("Ava Reed");
    expect(dialog.props("tripPeopleRoleId")).toBe(7);

    wrapper.unmount();
  });
});

describe("Feature 137 — Trip View Flights and Room List", () => {
  const mountTripPage = async () => {
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
    TripServices.getStatus.mockResolvedValue({ data: { participants: [] } });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips/:tripId/flights", name: "tripFlights", component: Stub, props: true },
        { path: "/trips/:tripId/rooming", name: "tripRooming", component: Stub, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();
    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();
    return { wrapper, router };
  };

  const headerButton = (wrapper, label) =>
    wrapper.findAll("button").find((button) => button.text().trim() === label);

  it("Flights opens from the trip page", async () => {
    const { wrapper, router } = await mountTripPage();
    const email = headerButton(wrapper, "Email team");
    const flights = wrapper.get('[data-testid="trip-flights"]');
    expect(email.element.compareDocumentPosition(flights.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await flights.trigger("click");
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("tripFlights"));
    expect(router.currentRoute.value.params.tripId).toBe("42");
    wrapper.unmount();
  });

  it("Room list opens from the trip page", async () => {
    const { wrapper, router } = await mountTripPage();
    const flights = wrapper.get('[data-testid="trip-flights"]');
    const roomList = wrapper.get('[data-testid="trip-room-list"]');
    expect(flights.element.compareDocumentPosition(roomList.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await roomList.trigger("click");
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("tripRooming"));
    expect(router.currentRoute.value.params.tripId).toBe("42");
    wrapper.unmount();
  });
});
