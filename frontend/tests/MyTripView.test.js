/**
 * Feature 119 — My Trip Page
 * Spec: features/feature-119-my-trip-page.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import MyTripView from "../src/views/MyTripView.vue";
import TripBrowseView from "../src/views/TripBrowseView.vue";
import Home from "../src/views/Home.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, createTestRouter } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getImageUrl: vi.fn(() => null),
    getBrowseTrip: vi.fn(),
    getBrowseTrips: vi.fn(),
    getMyBrowseTrips: vi.fn(),
    getOrgTrips: vi.fn(),
    getAll: vi.fn(),
    cancelApplication: vi.fn(),
  },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), getPictureUrl: vi.fn(() => null) },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

vi.mock("../src/services/dashboardServices.js", () => ({
  default: { org: vi.fn(), trip: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: {},
}));

vi.mock("../src/services/donationServices.js", () => ({
  default: { createByParticipant: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";
import DonationServices from "../src/services/donationServices.js";
import MoneyInput from "../src/components/MoneyInput.vue";
import PersonServices from "../src/services/personServices.js";

const ORG_ID = 3;
const TRIP = {
  id: 7,
  orgId: ORG_ID,
  name: "Guatemala Clinic",
  location: "Antigua",
  city: "Antigua",
  country: "GT",
  description: "Free clinic week",
  status: "active",
  startDate: "2027-01-10",
  endDate: "2027-01-20",
  participantCost: 1500,
};
const NURSE = { id: 1, quantity: 4, signedUpCount: 1, reservedCount: 0, availableCount: 3, workerRole: { name: "Nurse" } };
const BREAKDOWN = {
  tripCost: 1500,
  tripOptions: [{ description: "Private room", amount: 200 }],
  adjustment: 0,
  addonExpenses: [{ description: "Travel insurance", amount: 75 }],
  airfare: 650,
  totalTripCost: 2425,
};
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

const signedUp = (myTripInfo = {}, tripFields = {}) =>
  TripServices.getBrowseTrip.mockResolvedValue({
    data: {
      trip: { ...TRIP, ...tripFields },
      rolesNeeded: [NURSE],
      alreadyApplied: true,
      applicationStatus: myTripInfo.status || "approved",
      tripLeaders: [{ id: 9, name: "Lena Leader", firstName: "Lena", lastName: "Leader", email: "lena@example.org" }],
      myTripInfo: {
        status: "approved",
        workerRoleName: "Nurse",
        donationTotal: 1000,
        donationRecipients: [],
        tripPeopleRoleId: 70,
        nextActions: [],
        room: null,
        flightPurchaseOption: "organization",
        flightSegments: [],
        costBreakdown: BREAKDOWN,
        amountOwed: 1425,
        ...myTripInfo,
      },
    },
  });

const notSignedUp = () =>
  TripServices.getBrowseTrip.mockResolvedValue({
    data: {
      trip: TRIP,
      rolesNeeded: [NURSE],
      myReservedTripWorkerRoleId: null,
      alreadyApplied: false,
      applicationStatus: null,
      tripLeaders: [],
      myTripInfo: null,
    },
  });

const NamedStub = (name) => ({
  name,
  props: ["modelValue", "tripId", "tripPeopleRoleId"],
  template: "<div />",
});

const STUBS = {
  VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
  DonorTripHeading: true,
  ApplyTripDialog: NamedStub("ApplyTripDialog"),
  FlightSegmentsDialog: NamedStub("FlightSegmentsDialog"),
  ParticipantDonationsDialog: NamedStub("ParticipantDonationsDialog"),
  EditPersonDialog: true,
};

const mountPage = async (component, path) => {
  const router = await createTestRouter(path);
  const { wrapper } = await mountWithPlugins(component, {
    router,
    props: { tripId: "7" },
    global: { stubs: STUBS },
  });
  await flushPromises();
  return { wrapper, router };
};

const button = (el, text) => el.findAll("button").find((b) => b.text().trim() === text);
const section = (wrapper, id) => wrapper.find(`[data-testid="${id}"]`);

describe("Feature 119 — My Trip Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", {
      personId: 5,
      firstName: "Pat",
      lastName: "Lee",
      orgRoles: [],
      tripRoles: [{ roleName: "Trip Participant", tripId: 7, orgId: ORG_ID, orgName: "Hope Missions" }],
    });
  });

  describe("US-119.1 — Open my own trip page", () => {
    it("Status message at the top of My Trip", async () => {
      const cases = [
        [{}, "Congratulations, you have been approved for the trip!", "green-lighten-4"],
        [{ status: "incomplete" }, "Application incomplete. Please update your application and profile as needed.", "amber-lighten-4"],
        [
          { status: "pre_approved", nextActions: [{ code: "upload-documents", missingDocuments: ["Passport"], dueDate: "2026-10-12" }] },
          "You have been Pre-Approved and have a place on the trip, but you still need to complete your documents 90 days prior to the trip.",
          "amber-lighten-4",
        ],
        [
          { status: "pre_approved", nextActions: [{ code: "wait-approval" }] },
          "Your application and documents are complete and will be reviewed.",
          "amber-lighten-4",
        ],
        [{ status: "declined" }, "Your application was not approved for this trip.", "red-lighten-4"],
        [{ status: "cancelled" }, "Your application has been cancelled.", "red-lighten-4"],
      ];
      for (const [info, text, color] of cases) {
        signedUp(info);
        const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
        const alert = section(wrapper, "my-trip-status-message");
        expect(alert.text()).toBe(text);
        expect(alert.classes()).toContain(`bg-${color}`);
        expect(alert.classes()).toContain("text-black");
        expect(alert.classes()).toContain("font-weight-bold");
        expect(wrapper.text()).not.toContain("Application submitted");
        wrapper.unmount();
      }
    });

    it("Trip names on Home link to the trip", async () => {
      PersonServices.get.mockResolvedValue({ data: { id: 5, firstName: "Pat", lastName: "Lee" } });
      TripServices.getBrowseTrips.mockResolvedValue({
        data: [{ ...TRIP, id: 8, name: "Peru Outreach", alreadyApplied: false, startDate: "2099-02-01" }],
      });
      TripServices.getMyBrowseTrips.mockResolvedValue({
        data: [{ ...TRIP, startDate: "2099-01-10", endDate: "2099-01-20", alreadyApplied: true, applicationStatus: "approved", nextActions: [] }],
      });
      const { wrapper: home, router } = await mountWithPlugins(Home, {
        router: await createTestRouter("/home"),
        global: { stubs: { ...STUBS, EditTripDialog: true, EditOrganizationDialog: true } },
      });
      await flushPromises();

      const myLink = section(home, "my-trip-name-link");
      expect(myLink.text()).toBe("Guatemala Clinic");
      expect(myLink.attributes("href")).toBe("/my-trips/7");
      expect(myLink.classes()).toContain("font-weight-bold");
      const availableLink = section(home, "available-trip-name-link");
      expect(availableLink.text()).toBe("Peru Outreach");
      expect(availableLink.attributes("href")).toBe("/browse-trips/8");
      expect(availableLink.classes()).toContain("font-weight-bold");

      await myLink.trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe("/my-trips/7");
      home.unmount();
    });

    it("My Trips View opens My Trip without team roles", async () => {
      PersonServices.get.mockResolvedValue({ data: { id: 5, firstName: "Pat", lastName: "Lee" } });
      TripServices.getBrowseTrips.mockResolvedValue({
        data: [{ ...TRIP, id: 8, name: "Peru Outreach", alreadyApplied: false, startDate: "2099-02-01" }],
      });
      TripServices.getMyBrowseTrips.mockResolvedValue({
        data: [{ ...TRIP, startDate: "2099-01-10", endDate: "2099-01-20", alreadyApplied: true, applicationStatus: "approved", nextActions: [] }],
      });
      const { wrapper: home, router } = await mountWithPlugins(Home, {
        router: await createTestRouter("/home"),
        global: { stubs: { ...STUBS, EditTripDialog: true, EditOrganizationDialog: true } },
      });
      await flushPromises();

      const rowView = (name) =>
        home
          .findAll("tr")
          .find((tr) => tr.find("td").exists() && tr.find("td").text() === name)
          .find('[aria-label="View"]');
      await rowView("Guatemala Clinic").trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe("/my-trips/7");
      await router.push("/home");
      await rowView("Peru Outreach").trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe("/browse-trips/8");
      home.unmount();

      signedUp();
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
      const tripInfo = section(wrapper, "my-trip-trip-info").text();
      expect(tripInfo).toContain("Antigua");
      expect(section(wrapper, "my-trip-trip-dates").text()).toBe("01/10/2027 – 01/20/2027");
      expect(tripInfo).toContain("active");
      expect(tripInfo).toContain("Lena Leader");
      expect(section(wrapper, "my-trip-trip-name").text()).toBe("Guatemala Clinic");
      expect(section(wrapper, "my-trip-trip-name").classes()).toEqual(
        expect.arrayContaining(["text-h4", "font-weight-bold"])
      );
      expect(tripInfo).toContain("Free clinic week");
      expect(tripInfo).toContain("Antigua, Guatemala");
      expect(wrapper.findComponent({ name: "DonorTripHeading" }).props("showTripCard")).toBe(false);
      expect(wrapper.text()).not.toContain("Team roles needed");
      expect(wrapper.text()).not.toContain("Participant cost");
      wrapper.unmount();
    });

    it("Browse page stays for prospective applicants", async () => {
      notSignedUp();
      const { wrapper, router } = await mountPage(TripBrowseView, "/browse-trips/7");

      expect(router.currentRoute.value.fullPath).toBe("/browse-trips/7");
      expect(button(wrapper, "Apply for this trip")).toBeTruthy();
      expect(wrapper.text()).toContain("Team roles needed");
      expect(wrapper.text()).toContain("Nurse");
      expect(section(wrapper, "no-trip-leaders").text()).toBe("No Trip Leader assigned");
      expect(wrapper.find(".v-alert").exists()).toBe(false);
      wrapper.unmount();
    });

    it("No trip leaders shows plain text on My Trip", async () => {
      TripServices.getBrowseTrip.mockResolvedValue({
        data: {
          trip: TRIP,
          rolesNeeded: [NURSE],
          alreadyApplied: true,
          applicationStatus: "approved",
          tripLeaders: [],
          myTripInfo: { status: "approved", nextActions: [], flightSegments: [], costBreakdown: BREAKDOWN, amountOwed: 1425 },
        },
      });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
      expect(section(wrapper, "no-trip-leaders").text()).toBe("No Trip Leader assigned");
      expect(wrapper.text()).not.toContain("No trip leaders have been assigned yet.");
      wrapper.unmount();
    });

    it("Each page sends you to the right one", async () => {
      signedUp();
      const browse = await mountPage(TripBrowseView, "/browse-trips/7");
      expect(browse.router.currentRoute.value.fullPath).toBe("/my-trips/7");
      browse.wrapper.unmount();

      notSignedUp();
      const mine = await mountPage(MyTripView, "/my-trips/7");
      expect(mine.router.currentRoute.value.fullPath).toBe("/browse-trips/7");
      mine.wrapper.unmount();
    });
  });

  describe("US-119.2 — See my trip's money in one place", () => {
    it("Trip financial info lists every cost, total, donations, and balance", async () => {
      signedUp();
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      const rows = wrapper
        .findAll('[data-testid="my-trip-financial"] > div > .d-flex')
        .filter((row) => row.attributes("data-testid") !== "my-trip-donations-line")
        .map((row) => [row.element.firstElementChild.textContent.trim(), row.element.lastElementChild.textContent.trim()]);
      expect(rows).toEqual([
        ["Trip cost", "$1,500.00"],
        ["Trip option: Private room", "$200.00"],
        ["Add-on: Travel insurance", "$75.00"],
        ["Flight", "$650.00"],
        ["Total trip cost", "$2,425.00"],
        ["Balance", "$1,425.00"],
      ]);
      expect(section(wrapper, "my-trip-donations").text()).toBe("$1,000.00");
      const text = wrapper.text();
      expect(text).not.toContain("Your trip cost");
      expect(text).not.toContain("Donations so far");
      expect(section(wrapper, "my-trip-options").exists()).toBe(false);
      expect(section(wrapper, "my-trip-addon-expenses").exists()).toBe(false);
      wrapper.unmount();
    });

    it("Donation buttons on the Donations line", async () => {
      DonationServices.createByParticipant.mockResolvedValue({ data: { id: 1 } });
      signedUp();
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      const line = section(wrapper, "my-trip-donations-line");
      expect(button(line, "View donations")).toBeTruthy();
      expect(button(line, "Make Donation")).toBeTruthy();
      expect(button(wrapper, "Donate")).toBeUndefined();
      expect(wrapper.findAll("button").filter((b) => b.text().trim() === "View donations")).toHaveLength(1);

      await button(line, "View donations").trigger("click");
      await flushPromises();
      expect(wrapper.findComponent({ name: "ParticipantDonationsDialog" }).props("modelValue")).toBe(true);

      await button(line, "Make Donation").trigger("click");
      await flushPromises();
      const dialog = section(wrapper, "make-donation-dialog");
      expect(dialog.text()).toContain("Donate toward your trip balance.");
      dialog.findComponent(MoneyInput).vm.$emit("update:modelValue", "250");
      await dialog.find("textarea").setValue("Check #1001");
      TripServices.getBrowseTrip.mockClear();
      await button(dialog, "Donate").trigger("click");
      await flushPromises();

      expect(DonationServices.createByParticipant).toHaveBeenCalledWith({
        tripId: 7,
        personId: 5,
        amount: 250,
        paymentInfo: "Check #1001",
      });
      expect(wrapper.text()).toContain("Thank you for your donation!");
      expect(TripServices.getBrowseTrip).toHaveBeenCalled();
      wrapper.unmount();

      signedUp({ status: "pre_approved" });
      const preApproved = await mountPage(MyTripView, "/my-trips/7");
      const preApprovedLine = section(preApproved.wrapper, "my-trip-donations-line");
      expect(button(preApprovedLine, "View donations")).toBeTruthy();
      expect(button(preApprovedLine, "Make Donation")).toBeTruthy();
      expect(preApproved.wrapper.text()).toContain("My fundraising page");
      preApproved.wrapper.unmount();

      signedUp({ status: "incomplete" });
      const pending = await mountPage(MyTripView, "/my-trips/7");
      const pendingLine = section(pending.wrapper, "my-trip-donations-line");
      expect(button(pendingLine, "View donations")).toBeTruthy();
      expect(button(pendingLine, "Make Donation")).toBeUndefined();
      expect(pending.wrapper.text()).not.toContain("My fundraising page");
      pending.wrapper.unmount();
    });

    it("Deposit and donation message below the financial info", async () => {
      const fundingText = async (info, tripFields) => {
        signedUp(info, tripFields);
        const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
        const bar = wrapper.find('[data-testid="my-trip-financial"] [data-testid="my-trip-funding-message"]');
        const text = bar.exists() ? bar.text() : null;
        if (bar.exists()) {
          const heading = wrapper.find('[data-testid="my-trip-financial"] h3');
          expect(heading.element.nextElementSibling).toBe(bar.element);
        }
        if (bar.exists()) expect(bar.classes()).toEqual(expect.arrayContaining(["bg-amber-lighten-4", "text-black", "font-weight-bold"]));
        wrapper.unmount();
        return text;
      };

      expect(await fundingText({}, { deposit: 1500 })).toBe("You need to make your trip deposit of $1,500.00.");
      expect(await fundingText({}, { deposit: 0 })).toBe("You need more donations to cover your balance of $1,425.00.");
      expect(await fundingText({ status: "pre_approved" }, { deposit: 500 })).toBe(
        "You need more donations to cover your balance of $1,425.00."
      );
      expect(await fundingText({ amountOwed: 0 }, { deposit: 0 })).toBeNull();
      expect(await fundingText({ status: "incomplete" }, { deposit: 1500 })).toBeNull();

      signedUp({
        nextActions: [{ code: "make-deposit", amountRaised: 1000, deposit: 1500 }, { code: "enter-flights" }],
      });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
      expect(wrapper.text()).toContain("Enter your flight info.");
      expect(wrapper.text()).not.toContain("Make your deposit");
      wrapper.unmount();

      signedUp({ nextActions: [{ code: "make-donation", amountOwed: 1425 }] });
      const onlyFunding = await mountPage(MyTripView, "/my-trips/7");
      expect(onlyFunding.wrapper.text()).not.toContain("Make a donation");
      onlyFunding.wrapper.unmount();
    });

    it("Unknown trip cost", async () => {
      signedUp({
        costBreakdown: { tripCost: null, tripOptions: [], adjustment: 0, addonExpenses: [], airfare: 0, totalTripCost: null },
        amountOwed: null,
      });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      const financial = section(wrapper, "my-trip-financial");
      expect(financial.text()).toContain("Trip costNot yet available");
      expect(section(wrapper, "my-trip-donations").text()).toBe("$1,000.00");
      expect(section(wrapper, "my-trip-balance").text()).toBe("Not yet available");
      expect(section(wrapper, "my-trip-total").exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("US-119.3 — See my room and flights, or know they aren't ready", () => {
    it("Room and flights not yet available", async () => {
      signedUp();
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      expect(section(wrapper, "my-trip-room").text()).toContain("Not yet available");
      const flights = section(wrapper, "my-trip-flights");
      expect(flights.text()).toContain("Not yet available");
      expect(flights.findAll("button")).toHaveLength(0);
      wrapper.unmount();
    });

    it("Room and flights shown when available", async () => {
      signedUp({
        room: {
          hotelName: "Hotel Antigua",
          roomType: "Double",
          roommates: ["Rita Gomez"],
          checkInDate: "2027-01-10",
          checkOutDate: "2027-01-15",
        },
        flightSegments: [ARRIVAL],
      });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      const room = section(wrapper, "my-trip-room").text();
      expect(room).toContain("Hotel Antigua");
      expect(room).toContain("Rita Gomez");
      expect(room).not.toContain("Not yet available");
      const flights = section(wrapper, "my-trip-flights").text();
      expect(flights).toContain("American Airlines");
      expect(flights).not.toContain("Not yet available");
      wrapper.unmount();
    });

    it("Adjusted arrive and depart dates show what moved them", async () => {
      signedUp({
        arrivalDate: "2027-01-07",
        departureDate: "2027-01-21",
        arrivalAdjustments: [
          { type: "option", description: "Arrive early", days: 2 },
          { type: "addon", description: "Extra hotel night", days: 1 },
        ],
        departureAdjustments: [{ type: "addon", description: "Extra hotel night", days: 1 }],
      });
      const router = await createTestRouter("/my-trips/7");
      const { wrapper } = await mountWithPlugins(MyTripView, {
        router,
        props: { tripId: "7" },
        global: {
          stubs: { ...STUBS, VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' } },
        },
      });
      await flushPromises();

      const arrive = section(wrapper, "my-trip-arrive");
      expect(arrive.text()).toContain("01/07/2027");
      expect(arrive.find('[data-testid="date-adjustment-info"]').attributes("aria-label")).toBe("Days before the trip");
      expect(arrive.find('[data-testid="date-adjustments"]').text()).toContain("Trip option: Arrive early2 days before");
      expect(arrive.find('[data-testid="date-adjustments"]').text()).toContain("Add-on: Extra hotel night1 day before");
      const depart = section(wrapper, "my-trip-depart");
      expect(depart.text()).toContain("01/21/2027");
      expect(depart.find('[data-testid="date-adjustments"]').text()).toBe("Add-on: Extra hotel night1 day after");
      wrapper.unmount();

      signedUp({ arrivalDate: "2027-01-10", departureDate: "2027-01-20", arrivalAdjustments: [], departureAdjustments: [] });
      const plain = await mountPage(MyTripView, "/my-trips/7");
      expect(plain.wrapper.find('[data-testid="date-adjustment-info"]').exists()).toBe(false);
      plain.wrapper.unmount();
    });

    it("Self-booked participant adds and edits flights", async () => {
      signedUp({ flightPurchaseOption: "self" });
      const empty = await mountPage(MyTripView, "/my-trips/7");
      const noSegments = section(empty.wrapper, "my-trip-flights");
      expect(noSegments.text()).toContain("Not yet available");
      await button(noSegments, "Add Flights").trigger("click");
      await flushPromises();
      expect(empty.wrapper.findComponent({ name: "FlightSegmentsDialog" }).props("modelValue")).toBe(true);
      empty.wrapper.unmount();

      signedUp({ flightPurchaseOption: "self", flightSegments: [ARRIVAL] });
      const filled = await mountPage(MyTripView, "/my-trips/7");
      const withSegments = section(filled.wrapper, "my-trip-flights");
      expect(withSegments.text()).toContain("American Airlines");
      expect(button(withSegments, "Add Flights")).toBeUndefined();
      await button(withSegments, "Edit Flights").trigger("click");
      await flushPromises();
      expect(filled.wrapper.findComponent({ name: "FlightSegmentsDialog" }).props("modelValue")).toBe(true);
      filled.wrapper.unmount();
    });
  });
});
