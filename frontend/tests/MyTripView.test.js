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
    downloadArrivalPdf: vi.fn(),
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
  default: { startParticipantCheckout: vi.fn() },
}));

vi.mock("../src/utils/stripeDonations.js", async (importOriginal) => ({
  ...(await importOriginal()),
  goToStripe: vi.fn(),
}));

import TripServices from "../src/services/tripServices.js";
import DonationServices from "../src/services/donationServices.js";
import MoneyInput from "../src/components/MoneyInput.vue";
import PersonServices from "../src/services/personServices.js";
import { goToStripe } from "../src/utils/stripeDonations.js";

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
const openTripCosts = async (wrapper) => {
  const title = wrapper.get('[data-testid="my-trip-costs"] .v-expansion-panel-title');
  if (title.attributes("aria-expanded") !== "true") {
    await title.trigger("click");
    await flushPromises();
  }
};

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
      expect(myLink.classes()).toEqual(expect.arrayContaining(["font-weight-bold", "home-trip-card__name"]));
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

      const openMyTrip = home
        .findAll('[data-testid="my-trip-card"]')
        .find((card) => card.text().includes("Guatemala Clinic"))
        .findAll("button")
        .find((item) => item.text().trim() === "Open My Trip");
      await openMyTrip.trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe("/my-trips/7");
      await router.push("/home");
      await home.get('[data-testid="available-trip-name-link"]').trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe("/browse-trips/8");
      home.unmount();

      signedUp();
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
      const summary = section(wrapper, "my-trip-summary").text();
      expect(summary).toContain("Antigua, Guatemala");
      expect(section(wrapper, "my-trip-date-line").text()).toContain("01/10/2027 – 01/20/2027");
      expect(summary).not.toContain("active");
      expect(summary).toContain("Lena Leader");
      expect(wrapper.text()).not.toContain("Free clinic week");
      expect(section(wrapper, "my-trip-trip-info").exists()).toBe(false);
      expect(section(wrapper, "my-trip-trip-name").text()).toBe("Guatemala Clinic");
      expect(section(wrapper, "my-trip-trip-name").classes()).toEqual(
        expect.arrayContaining(["my-trip__name", "font-weight-bold"])
      );
      expect(wrapper.findComponent({ name: "DonorTripHeading" }).exists()).toBe(false);
      expect(wrapper.text()).not.toContain("Team roles needed");
      expect(wrapper.text()).not.toContain("Participant cost");
      wrapper.unmount();
    });

    it("Browse page stays for prospective applicants", async () => {
      notSignedUp();
      const { wrapper, router } = await mountPage(TripBrowseView, "/browse-trips/7");

      expect(router.currentRoute.value.fullPath).toBe("/browse-trips/7");
      expect(button(wrapper, "Apply for this trip")).toBeTruthy();
      expect(wrapper.findComponent({ name: "DonorTripHeading" }).exists()).toBe(false);
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
      await openTripCosts(wrapper);

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
      DonationServices.startParticipantCheckout.mockResolvedValue({ data: { checkoutUrl: "https://checkout.stripe.com/c/pay/cs_1" } });
      signedUp({ onlineDonations: true });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      const line = section(wrapper, "my-trip-actions");
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
      await button(dialog, "Pay with Stripe").trigger("click");
      await flushPromises();

      expect(DonationServices.startParticipantCheckout).toHaveBeenCalledWith({
        tripId: 7,
        personId: 5,
        amount: 250,
        paymentMethod: "card",
        returnPath: "/my-trips/7",
      });
      expect(goToStripe).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_1");
      wrapper.unmount();

      signedUp({ status: "pre_approved" });
      const preApproved = await mountPage(MyTripView, "/my-trips/7");
      const preApprovedLine = section(preApproved.wrapper, "my-trip-actions");
      expect(button(preApprovedLine, "View donations")).toBeTruthy();
      expect(button(preApprovedLine, "Make Donation")).toBeTruthy();
      expect(preApproved.wrapper.text()).toContain("My fundraising page");
      preApproved.wrapper.unmount();

      signedUp({ status: "incomplete" });
      const pending = await mountPage(MyTripView, "/my-trips/7");
      const pendingLine = section(pending.wrapper, "my-trip-actions");
      expect(button(pendingLine, "View donations")).toBeTruthy();
      expect(button(pendingLine, "Make Donation")).toBeUndefined();
      expect(pending.wrapper.text()).not.toContain("My fundraising page");
      pending.wrapper.unmount();
    });

    it("Deposit and donation message below the financial info", async () => {
      const fundingText = async (info, tripFields) => {
        signedUp(info, tripFields);
        const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
        const bar = section(wrapper, "my-trip-funding-message");
        const text = bar.exists() ? bar.text() : null;
        if (bar.exists()) {
          expect(section(wrapper, "my-trip-money-line").element.nextElementSibling).toBe(bar.element);
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
      expect(section(wrapper, "my-trip-money-line").text()).toBe("Donations $1,000.00. Balance not yet available.");
      await openTripCosts(wrapper);

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

      const summary = section(wrapper, "my-trip-summary");
      expect(summary.find('[data-testid="my-trip-room"]').exists()).toBe(true);
      expect(summary.find('[data-testid="my-trip-flights"]').exists()).toBe(true);
      expect(section(wrapper, "my-trip-room").text()).toContain("Your room will appear here after staff assign it.");
      const flights = section(wrapper, "my-trip-flights");
      expect(flights.text()).toContain("Your flights will appear here after staff enter them.");
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
      expect(room).toContain("Hotel Antigua · Double · Rita Gomez · 01/10/2027 – 01/15/2027");
      const flights = section(wrapper, "my-trip-flights").text();
      expect(flights).toContain("American Airlines 100 · DFW 01/10/2027 8:30 AM → GUA 01/10/2027 12:00 PM");
      expect(flights).not.toContain("Your flights will appear here after staff enter them.");
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

    it("My Trip does not offer Add Flights", async () => {
      signedUp({ flightPurchaseOption: "self" });
      const empty = await mountPage(MyTripView, "/my-trips/7");
      const noSegments = section(empty.wrapper, "my-trip-flights");
      expect(noSegments.text()).toContain("Your flights will appear here after staff enter them.");
      expect(button(noSegments, "Add Flights")).toBeUndefined();
      expect(empty.wrapper.findComponent({ name: "FlightSegmentsDialog" }).props("modelValue")).toBe(false);
      empty.wrapper.unmount();
    });

    it("My Trip does not offer Edit Flights", async () => {
      signedUp({ flightPurchaseOption: "self", flightSegments: [ARRIVAL] });
      const filled = await mountPage(MyTripView, "/my-trips/7");
      const withSegments = section(filled.wrapper, "my-trip-flights");
      expect(withSegments.text()).toContain("American Airlines");
      expect(button(withSegments, "Edit Flights")).toBeUndefined();
      expect(filled.wrapper.findComponent({ name: "FlightSegmentsDialog" }).props("modelValue")).toBe(false);
      filled.wrapper.unmount();
    });
  });
});

/**
 * Feature 126 — Trip Arrival Document Download
 * Spec: features/feature-126-trip-arrival-download.md
 */
describe("Feature 126 — Trip Arrival Document Download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Pat", lastName: "Lee", orgRoles: [], tripRoles: [] });
  });

  const downloadButton = (wrapper) => button(section(wrapper, "my-trip-summary"), "Download Trip Arrival Document");

  describe("US-126.1 — Download the trip arrival document", () => {
    it("Approved participant sees the download button above Trip Leaders", async () => {
      signedUp({ hasArrivalPdf: true });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      const summary = section(wrapper, "my-trip-summary");
      expect(downloadButton(wrapper)).toBeTruthy();
      const html = summary.html();
      expect(html.indexOf("Download Trip Arrival Document")).toBeLessThan(html.indexOf("Trip Leaders"));
      expect(html.indexOf("my-trip-date-line")).toBeLessThan(html.indexOf("Trip Leaders"));
      expect(wrapper.text()).not.toContain("Trip arrival info");
      wrapper.unmount();
    });

    it("No download button without the PDF or approval", async () => {
      for (const info of [{ status: "pre_approved", hasArrivalPdf: false }, { hasArrivalPdf: false }, {}]) {
        signedUp(info);
        const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
        expect(downloadButton(wrapper)).toBeUndefined();
        expect(wrapper.text()).not.toContain("Download Trip Arrival Document");
        wrapper.unmount();
      }
    });

    it("Download saves the Trip Arrival PDF", async () => {
      TripServices.downloadArrivalPdf.mockResolvedValue();
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
      signedUp({ hasArrivalPdf: true });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      await downloadButton(wrapper).trigger("click");
      await flushPromises();
      expect(TripServices.downloadArrivalPdf).toHaveBeenCalledWith(7, "Trip Arrival - Guatemala Clinic.pdf");
      expect(openSpy).not.toHaveBeenCalled();
      expect(wrapper.text()).not.toContain("Unable to download the Trip Arrival Document.");
      openSpy.mockRestore();
      wrapper.unmount();
    });

    it("Download failure shows an error", async () => {
      TripServices.downloadArrivalPdf.mockRejectedValue(new Error("Not found"));
      signedUp({ hasArrivalPdf: true });
      const { wrapper } = await mountPage(MyTripView, "/my-trips/7");

      await downloadButton(wrapper).trigger("click");
      await flushPromises();
      expect(section(wrapper, "my-trip-arrival-download").text()).toContain(
        "Unable to download the Trip Arrival Document."
      );
      wrapper.unmount();
    });
  });
});

/**
 * Feature 139 — My Trip Page Layout
 * Spec: features/feature-139-my-trip-page-layout.md
 */
describe("Feature 139 — My Trip Page Layout", () => {
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

  it("My trip comes before the brochure", async () => {
    signedUp();
    const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
    const text = wrapper.text();
    expect(text).not.toContain("Free clinic week");
    expect(section(wrapper, "my-trip-trip-info").exists()).toBe(false);
    expect(text.match(/Guatemala Clinic/g)).toHaveLength(1);
    expect(section(wrapper, "my-trip-place").text()).toBe("Antigua, Guatemala");
    const summary = section(wrapper, "my-trip-summary").text();
    expect(summary.indexOf("Role: Nurse")).toBeLessThan(summary.indexOf("Lena Leader"));
    const chip = section(wrapper, "my-trip-status");
    expect(chip.text()).toBe("Approved");
    expect(chip.attributes("style")).toContain("background-color: rgb(46, 125, 50)");
    expect(chip.attributes("style")).toContain("color: rgb(255, 255, 255)");
    wrapper.unmount();
  });

  it("The next step stays on the summary", async () => {
    signedUp({ status: "incomplete", nextActions: [{ code: "submit-application" }] });
    const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
    const summary = section(wrapper, "my-trip-summary");
    expect(summary.text()).toContain("Submit your application.");
    expect(button(summary, "Submit App")).toBeTruthy();
    expect(button(summary, "Cancel App")).toBeTruthy();
    wrapper.unmount();
  });

  it("My Trip has no Back to home", async () => {
    signedUp();
    const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
    expect(wrapper.findAll("button").some((item) => item.text().trim() === "Back to home")).toBe(false);
    wrapper.unmount();
  });

  it("The balance is on the summary and the costs start closed", async () => {
    signedUp({ donationTotal: 400, amountOwed: 800, costBreakdown: { ...BREAKDOWN, totalTripCost: 1200 } });
    const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
    const fundingTitle = wrapper.findAll("h3").find((item) => item.text() === "Trip Funding");
    const leadersTitle = wrapper.findAll("h3").find((item) => item.text() === "Trip Leaders");
    expect(fundingTitle.classes()).toEqual(leadersTitle.classes());
    const summaryText = section(wrapper, "my-trip-summary").text();
    expect(summaryText.indexOf("Trip Funding")).toBeLessThan(summaryText.indexOf("My fundraising page"));
    expect(summaryText.indexOf("My fundraising page")).toBeLessThan(summaryText.indexOf("$400.00 raised of $1,200.00. Balance $800.00."));
    expect(section(wrapper, "my-trip-money-line").text()).toBe("$400.00 raised of $1,200.00. Balance $800.00.");
    expect(section(wrapper, "my-trip-funding-message").text()).toBe(
      "You need more donations to cover your balance of $800.00."
    );
    const actions = section(wrapper, "my-trip-actions");
    expect(button(actions, "Make Donation")).toBeTruthy();
    expect(button(actions, "View donations")).toBeTruthy();
    const title = wrapper.get('[data-testid="my-trip-costs"] .v-expansion-panel-title');
    expect(title.attributes("aria-expanded")).toBe("false");
    const costs = wrapper.get('[data-testid="my-trip-costs"] .v-expansion-panel-text');
    expect(costs.isVisible()).toBe(false);
    wrapper.unmount();
  });

  it("Opening Trip costs shows the breakdown", async () => {
    signedUp();
    const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
    await openTripCosts(wrapper);
    const financial = section(wrapper, "my-trip-financial").text();
    expect(financial).toContain("Trip cost");
    expect(financial).toContain("Total trip cost");
    expect(financial).toContain("Donations");
    expect(financial).toContain("Balance");
    wrapper.unmount();
  });

  it("Copy link stays on the row", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    signedUp();
    const { wrapper } = await mountPage(MyTripView, "/my-trips/7");
    await button(section(wrapper, "my-trip-actions"), "Copy link").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Link copied.");
    wrapper.unmount();
  });
});
