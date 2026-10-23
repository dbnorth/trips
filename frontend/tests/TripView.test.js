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
  default: { get: vi.fn() },
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

    const button = wrapper.findAll("button").find((b) => b.text().trim() === "Documents PDF");
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
    expect(totalIndex).toBe(headers.indexOf("Participant cost") + 1);
    const cells = wrapper.find("tbody tr").findAll("td").map((td) => td.text().trim());
    expect(cells[totalIndex - 1]).toBe("$2,250.00");
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
});
