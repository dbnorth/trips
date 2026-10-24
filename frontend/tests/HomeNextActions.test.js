/**
 * Feature 60 — My Trips Next Actions
 * Spec: features/feature-60-my-trips-next-actions.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import Home from "../src/views/Home.vue";
import ConfirmDialog from "../src/components/ConfirmDialog.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getBrowseTrips: vi.fn(),
    getMyBrowseTrips: vi.fn(),
    getBrowseTrip: vi.fn(),
    getOrgTrips: vi.fn(),
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/dashboardServices.js", () => ({
  default: { org: vi.fn(), trip: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: {},
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";

const ORG_ID = 3;
const PERSON_ID = 5;

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const myTrip = (id, name, applicationStatus, nextActions) => ({
  id,
  name,
  orgId: ORG_ID,
  startDate: dateFromToday(30),
  endDate: dateFromToday(40),
  alreadyApplied: true,
  applicationStatus,
  tripPeopleRoleId: id * 10,
  nextActions,
});

const NamedStub = (name) => ({
  name,
  props: ["modelValue", "tripId", "tripPeopleRoleId", "participantName", "tripStartDate", "tripEndDate"],
  template: "<div />",
});

const mountHome = async (trips) => {
  TripServices.getMyBrowseTrips.mockResolvedValue({ data: trips });
  const { wrapper } = await mountWithPlugins(Home, {
    global: {
      stubs: {
        VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        ApplyTripDialog: NamedStub("ApplyTripDialog"),
        FlightSegmentsDialog: NamedStub("FlightSegmentsDialog"),
        EditPersonDialog: true,
        EditTripDialog: true,
        EditOrganizationDialog: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const tripRow = (wrapper, name) =>
  wrapper.findAll("tr").find((tr) => tr.find("td").exists() && tr.find("td").text() === name);

const nextActionsRowFor = (wrapper, name) => {
  const rows = wrapper.findAll("tr");
  const index = rows.findIndex((tr) => tr.find("td").exists() && tr.find("td").text() === name);
  const next = rows[index + 1];
  return next?.attributes("data-testid") === "next-actions" ? next : undefined;
};

const toneOf = (row) => row.find('[data-testid="my-trip-next-actions"]').classes();

const button = (el, text) => el.findAll("button").find((b) => b.text().trim() === text);

describe("Feature 60 — My Trips Next Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", {
      personId: PERSON_ID,
      firstName: "Ana",
      lastName: "Lopez",
      orgRoles: [],
      tripRoles: [{ roleName: "Trip Participant", tripId: 1, orgId: ORG_ID, orgName: "Helping Hands" }],
    });
    PersonServices.get.mockResolvedValue({ data: { id: PERSON_ID, firstName: "Ana", lastName: "Lopez" } });
    TripServices.getBrowseTrips.mockResolvedValue({ data: [] });
  });

  it("Home shows next actions under the trip", async () => {
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "applied", [{ code: "wait-approval" }]),
      myTrip(2, "Honduras Clinic", "declined", []),
    ]);

    expect(TripServices.getMyBrowseTrips).toHaveBeenCalledWith(ORG_ID);
    expect(nextActionsRowFor(wrapper, "Guatemala Clinic").text()).toContain("Waiting on approval.");
    expect(nextActionsRowFor(wrapper, "Honduras Clinic")).toBeUndefined();

    wrapper.unmount();
  });

  it("Next-actions rows are highlighted by status", async () => {
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "applied", [{ code: "wait-approval" }]),
      myTrip(2, "Honduras Clinic", "approved", [{ code: "make-donation", amountOwed: 1300 }]),
      myTrip(3, "Peru Clinic", "approved", [{ code: "all-ready" }]),
    ]);

    expect(toneOf(nextActionsRowFor(wrapper, "Guatemala Clinic"))).toContain("my-trip-next-actions--waiting");
    expect(toneOf(nextActionsRowFor(wrapper, "Honduras Clinic"))).toContain("my-trip-next-actions--needed");
    const ready = nextActionsRowFor(wrapper, "Peru Clinic");
    expect(toneOf(ready)).toContain("my-trip-next-actions--ready");
    expect(ready.text()).toContain("You are all ready for the trip.");
    expect(ready.findAll("button")).toHaveLength(0);

    wrapper.unmount();
  });

  it("Complete application buttons open the application dialogs", async () => {
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "incomplete", [
        { code: "complete-application", missingDocuments: ["Board certification (Pediatrics)"] },
      ]),
    ]);

    const actions = nextActionsRowFor(wrapper, "Guatemala Clinic");
    expect(actions.text()).toContain("Complete your application.");
    expect(actions.text()).toContain("Missing documents: Board certification (Pediatrics).");

    const row = tripRow(wrapper, "Guatemala Clinic");
    expect(button(row, "View")).toBeTruthy();
    expect(button(row, "Update App")).toBeUndefined();
    expect(button(row, "Cancel App")).toBeUndefined();

    await button(actions, "Update App").trigger("click");
    await flushPromises();
    const apply = wrapper.findComponent({ name: "ApplyTripDialog" });
    expect(apply.props("modelValue")).toBe(true);
    expect(apply.props("tripId")).toBe(1);

    await button(actions, "Cancel App").trigger("click");
    await flushPromises();
    const confirm = wrapper
      .findAllComponents(ConfirmDialog)
      .find((c) => String(c.props("message")).startsWith("Cancel this application?"));
    expect(confirm.props("modelValue")).toBe(true);

    wrapper.unmount();
  });

  it("Submit App opens the application dialog", async () => {
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "incomplete", [{ code: "submit-application" }]),
    ]);

    const actions = nextActionsRowFor(wrapper, "Guatemala Clinic");
    expect(toneOf(actions)).toContain("my-trip-next-actions--needed");
    expect(actions.text()).toContain("Submit your application.");
    expect(button(actions, "Cancel App")).toBeTruthy();

    const row = tripRow(wrapper, "Guatemala Clinic");
    expect(button(row, "Update App")).toBeUndefined();
    expect(button(row, "Cancel App")).toBeUndefined();

    await button(actions, "Submit App").trigger("click");
    await flushPromises();
    const apply = wrapper.findComponent({ name: "ApplyTripDialog" });
    expect(apply.props("modelValue")).toBe(true);
    expect(apply.props("tripId")).toBe(1);

    expect(TripServices.getMyBrowseTrips).toHaveBeenCalledTimes(1);
    apply.vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(TripServices.getMyBrowseTrips).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it("Donate opens the Donate dialog", async () => {
    TripServices.getBrowseTrip.mockResolvedValue({
      data: {
        myTripInfo: {
          donationRecipients: [
            { personId: 8, firstName: "Ben", lastName: "Ruiz" },
            { personId: PERSON_ID, firstName: "Ana", lastName: "Lopez" },
          ],
        },
      },
    });
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "approved", [
        { code: "make-deposit", amountRaised: 200, deposit: 500 },
      ]),
    ]);

    const actions = nextActionsRowFor(wrapper, "Guatemala Clinic");
    expect(actions.text()).toContain("Make your deposit: $200.00 raised of $500.00.");

    await button(actions, "Donate").trigger("click");
    await flushPromises();

    expect(TripServices.getBrowseTrip).toHaveBeenCalledWith(1);
    const donateTo = wrapper
      .findAllComponents({ name: "VSelect" })
      .find((c) => c.props("label") === "Donate to");
    expect(donateTo.props("items").map((item) => item.title)).toEqual(["Yourself", "Ben Ruiz"]);
    expect(donateTo.props("modelValue")).toBe(PERSON_ID);

    wrapper.unmount();
  });

  it("Enter Flights opens the flight segments dialog", async () => {
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "approved", [{ code: "enter-flights" }]),
    ]);

    const actions = nextActionsRowFor(wrapper, "Guatemala Clinic");
    expect(actions.text()).toContain("Enter your flight info.");

    await button(actions, "Enter Flights").trigger("click");
    await flushPromises();

    const flights = wrapper.findComponent({ name: "FlightSegmentsDialog" });
    expect(flights.props("modelValue")).toBe(true);
    expect(flights.props("tripId")).toBe(1);
    expect(flights.props("tripPeopleRoleId")).toBe(10);
    expect(flights.props("participantName")).toBe("Ana Lopez");

    wrapper.unmount();
  });

  /**
   * Feature 79 — Planned Arrival and Departure on Flights
   * Spec: features/feature-79-flights-planned-dates.md
   */
  it("Home shows the flight mismatch", async () => {
    const mismatch = (canEditFlights) => ({
      code: "arrival-flight-mismatch",
      flightDate: "2027-06-08",
      plannedDate: "2027-06-07",
      canEditFlights,
    });
    const wrapper = await mountHome([
      myTrip(1, "Guatemala Clinic", "approved", [mismatch(false)]),
      myTrip(2, "Honduras Clinic", "approved", [mismatch(true)]),
    ]);

    const orgBooked = nextActionsRowFor(wrapper, "Guatemala Clinic");
    expect(orgBooked.text()).toContain(
      "Your arrival flight lands 06/08/2027, but you are planned to arrive 06/07/2027."
    );
    expect(toneOf(orgBooked)).toContain("my-trip-next-actions--needed");
    expect(button(orgBooked, "Edit Flights")).toBeUndefined();

    const selfBooked = nextActionsRowFor(wrapper, "Honduras Clinic");
    await button(selfBooked, "Edit Flights").trigger("click");
    await flushPromises();
    const flights = wrapper.findComponent({ name: "FlightSegmentsDialog" });
    expect(flights.props("modelValue")).toBe(true);
    expect(flights.props("tripId")).toBe(2);

    wrapper.unmount();
  });
});
