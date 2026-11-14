/**
 * Feature 138 — Participant Home Trip Cards
 * Spec: features/feature-138-participant-home-trip-cards.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
    getImageUrl: (image) => (image ? `http://images.test/${image}` : null),
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

const mountHome = async () => {
  const { wrapper, router } = await mountWithPlugins(Home, {
    global: {
      stubs: {
        VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        ApplyTripDialog: { name: "ApplyTripDialog", props: ["modelValue", "tripId"], template: "<div />" },
        EditPersonDialog: true,
        EditTripDialog: true,
        EditOrganizationDialog: true,
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
};

const myCard = (wrapper, name) =>
  wrapper.findAll('[data-testid="my-trip-card"]').find((card) => card.text().includes(name));

const applyCard = (wrapper, name) =>
  wrapper.findAll('[data-testid="available-trip-card"]').find((card) => card.text().includes(name));

const button = (el, text) => el.findAll("button").find((item) => item.text().trim() === text);

describe("Feature 138 — Participant Home Trip Cards", () => {
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
    PersonServices.get.mockResolvedValue({
      data: {
        id: PERSON_ID,
        firstName: "Ana",
        middleName: "M",
        lastName: "Lopez",
        email: "ana@example.com",
        addLine1: "1 Main",
        city: "Dallas",
        country: "US",
        state_prov: "TX",
        postalCode: "75001",
        phoneContryCode: "1",
        phoneNumber: "555",
        birthDate: "1990-01-01",
        gender: "Female",
        emergencyContactName: "Pat",
        emergencyContactPhoneCountryCode: "1",
        emergencyContactPhoneNumber: "555",
        emergencyContactRelationship: "Mother",
        currentChurchHome: "Grace",
        currentChurchHomeCity: "Dallas",
        currentChurchHomeStateProv: "TX",
        hasAllergies: false,
        takesMedication: false,
        speaksOtherLanguage: false,
      },
    });
    TripServices.getBrowseTrips.mockResolvedValue({ data: [] });
    TripServices.getMyBrowseTrips.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Home does not title the section or name the one organization", async () => {
    const { wrapper } = await mountHome();
    expect(wrapper.findAll("h2").some((heading) => heading.text() === "Trips")).toBe(false);
    expect(wrapper.text()).not.toContain("Helping Hands");
    wrapper.unmount();
  });

  it("The soonest trip is the first card", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 30, 12));
    TripServices.getMyBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 2,
          name: "Honduras Clinic",
          location: "Tegucigalpa",
          startDate: "2027-07-01",
          endDate: "2027-07-10",
          alreadyApplied: true,
          applicationStatus: "approved",
          nextActions: [{ code: "all-ready" }],
        },
        {
          id: 1,
          name: "Guatemala Clinic",
          location: "Antigua",
          startDate: "2027-06-08",
          endDate: "2027-06-18",
          alreadyApplied: true,
          applicationStatus: "pre_approved",
          workerRoleName: "Nurse",
          nextActions: [{ code: "wait-approval" }],
        },
      ],
    });

    const { wrapper } = await mountHome();
    const cards = wrapper.findAll('[data-testid="my-trip-card"]');
    expect(cards[0].text()).toContain("Guatemala Clinic");
    expect(cards[0].text()).toContain("Antigua");
    expect(cards[0].get('[data-testid="my-trip-role"]').text()).toBe("Role: Nurse");
    expect(cards[0].text()).toContain("06/08/2027 – 06/18/2027 · 160 days away");
    expect(cards[0].text()).toContain("Pre-Approved");
    expect(cards[0].text()).toContain("Waiting on approval.");
    expect(cards[1].text()).toContain("Honduras Clinic");
    wrapper.unmount();
  });

  it("Open My Trip opens the trip", async () => {
    TripServices.getMyBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 42,
          name: "Guatemala Clinic",
          startDate: "2027-06-08",
          endDate: "2027-06-18",
          alreadyApplied: true,
          applicationStatus: "approved",
          nextActions: [],
        },
      ],
    });
    const { wrapper, router } = await mountHome();
    await button(myCard(wrapper, "Guatemala Clinic"), "Open My Trip").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("myTrip");
    expect(router.currentRoute.value.params.tripId).toBe("42");
    wrapper.unmount();
  });

  it("Cancel App is on the button row", async () => {
    TripServices.getMyBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Guatemala Clinic",
          startDate: "2027-06-08",
          endDate: "2027-06-18",
          alreadyApplied: true,
          applicationStatus: "incomplete",
          nextActions: [{ code: "submit-application" }],
        },
      ],
    });
    const { wrapper } = await mountHome();
    const card = myCard(wrapper, "Guatemala Clinic");
    expect(card.text()).toContain("Submit your application.");
    expect(button(card, "Submit App")).toBeTruthy();
    expect(button(card, "More")).toBeUndefined();
    expect(button(card, "Cancel App")).toBeTruthy();
    expect(button(card, "Open My Trip")).toBeTruthy();
    await button(card, "Cancel App").trigger("click");
    await flushPromises();
    const confirm = wrapper
      .findAllComponents(ConfirmDialog)
      .find((item) => String(item.props("message")).startsWith("Cancel this application?"));
    expect(confirm.props("modelValue")).toBe(true);
    wrapper.unmount();
  });

  it("Past trips follow upcoming trips", async () => {
    TripServices.getMyBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 2,
          name: "Last Year",
          startDate: "2020-01-01",
          endDate: "2020-01-10",
          alreadyApplied: true,
          applicationStatus: "approved",
          nextActions: [],
        },
        {
          id: 1,
          name: "Guatemala Clinic",
          startDate: "2027-06-08",
          endDate: "2027-06-18",
          alreadyApplied: true,
          applicationStatus: "approved",
          nextActions: [{ code: "all-ready" }],
        },
      ],
    });
    const { wrapper } = await mountHome();
    expect(wrapper.text()).not.toContain("Last Year");
    const showAll = wrapper.findAllComponents({ name: "VCheckbox" }).find((item) => item.props("label") === "Show all my trips");
    await showAll.setValue(true);
    await flushPromises();
    const cards = wrapper.findAll('[data-testid="my-trip-card"]');
    expect(cards[0].text()).toContain("Guatemala Clinic");
    expect(cards[1].text()).toContain("Last Year");
    expect(cards[1].text()).toContain("Ended");
    wrapper.unmount();
  });

  it("A ready trip shows money, documents, and the departure", async () => {
    TripServices.getMyBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Guatemala Clinic",
          startDate: "2027-06-08",
          endDate: "2027-06-18",
          alreadyApplied: true,
          applicationStatus: "approved",
          nextActions: [{ code: "all-ready" }],
          homeCard: {
            amountRaised: 1200,
            totalTripCost: 1200,
            documentsUploaded: 3,
            documentsRequired: 3,
            departure: { airportCode: "OKC", date: "2026-04-22", time: "18:03" },
          },
        },
      ],
    });
    const { wrapper } = await mountHome();
    const lines = myCard(wrapper, "Guatemala Clinic").get('[data-testid="home-card-lines"]').text();
    expect(lines).toContain("$1,200.00 raised of $1,200.00.");
    expect(lines).toContain("3 of 3 documents uploaded.");
    expect(lines).toContain("Departs OKC 04/22/2026 6:03 PM.");
    const status = myCard(wrapper, "Guatemala Clinic").get('[data-testid="my-trip-status"]');
    expect(status.text()).toBe("Approved");
    expect(status.attributes("style")).toContain("background-color: rgb(46, 125, 50)");
    expect(status.attributes("style")).toContain("color: rgb(255, 255, 255)");
    wrapper.unmount();
  });

  it("The next step already states the money and the missing documents", async () => {
    TripServices.getMyBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Guatemala Clinic",
          startDate: "2027-06-08",
          endDate: "2027-06-18",
          alreadyApplied: true,
          applicationStatus: "pre_approved",
          nextActions: [
            { code: "upload-documents", missingDocuments: ["Passport"], dueDate: "2027-03-10" },
            { code: "make-deposit", amountRaised: 400, deposit: 500 },
          ],
          homeCard: {
            amountRaised: 400,
            totalTripCost: 1200,
            documentsUploaded: 1,
            documentsRequired: 3,
            departure: null,
          },
        },
      ],
    });
    const { wrapper } = await mountHome();
    const card = myCard(wrapper, "Guatemala Clinic");
    expect(card.text()).toContain("Make your deposit: $400.00 raised of $500.00.");
    expect(card.text()).toContain("Missing: Passport.");
    expect(card.text()).not.toContain("raised of $1,200.00");
    expect(card.text()).not.toContain("documents uploaded");
    wrapper.unmount();
  });

  it("An open trip comes before a full trip", async () => {
    TripServices.getBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 2,
          name: "Clinic B",
          location: "Lima",
          startDate: "2027-05-01",
          endDate: "2027-05-10",
          alreadyApplied: false,
          roleAvailability: { reserved: 0, open: 0 },
          myReservedTripWorkerRoleId: null,
        },
        {
          id: 1,
          name: "Clinic A",
          location: "Antigua",
          startDate: "2027-06-01",
          endDate: "2027-06-10",
          alreadyApplied: false,
          roleAvailability: { reserved: 1, open: 3 },
          myReservedTripWorkerRoleId: null,
        },
      ],
    });
    const { wrapper } = await mountHome();
    const cards = wrapper.findAll('[data-testid="available-trip-card"]');
    expect(cards[0].text()).toContain("Clinic A");
    expect(cards[0].text()).toContain("4 positions available (1 reserved, 3 open)");
    expect(button(cards[0], "Apply")).toBeTruthy();
    expect(cards[1].text()).toContain("Clinic B");
    expect(cards[1].text()).toContain("No roles available");
    expect(button(cards[1], "Apply")).toBeUndefined();
    wrapper.unmount();
  });

  it("The trip picture and name open the trip page", async () => {
    TripServices.getBrowseTrips.mockResolvedValue({
      data: [
        {
          id: 8,
          name: "Clinic A",
          image: "trips/clinic-a.jpg",
          startDate: "2027-06-01",
          endDate: "2027-06-10",
          alreadyApplied: false,
          roleAvailability: { reserved: 0, open: 2 },
          myReservedTripWorkerRoleId: null,
        },
      ],
    });
    const { wrapper, router } = await mountHome();
    const card = applyCard(wrapper, "Clinic A");
    const image = card.get('[data-testid="available-trip-image"]');
    expect(image.attributes("src")).toBe("http://images.test/trips/clinic-a.jpg");
    await card.get('[data-testid="available-trip-name-link"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/browse-trips/8");
    wrapper.unmount();
  });

  it("The warning lists the missing profile fields", async () => {
    PersonServices.get.mockResolvedValue({
      data: {
        id: PERSON_ID,
        firstName: "Ana",
        middleName: "M",
        lastName: "Lopez",
        email: "ana@example.com",
        addLine1: "1 Main",
        city: "Dallas",
        country: "US",
        state_prov: "TX",
        postalCode: "75001",
        phoneContryCode: "1",
        phoneNumber: "",
        birthDate: "1990-01-01",
        gender: "Female",
        emergencyContactName: "",
        emergencyContactPhoneCountryCode: "1",
        emergencyContactPhoneNumber: "555",
        emergencyContactRelationship: "Mother",
        currentChurchHome: "Grace",
        currentChurchHomeCity: "Dallas",
        currentChurchHomeStateProv: "TX",
        hasAllergies: false,
        takesMedication: false,
        speaksOtherLanguage: false,
      },
    });
    const { wrapper } = await mountHome();
    expect(wrapper.text()).toContain("Please update your profile to continue.");
    const missing = wrapper.get('[data-testid="missing-profile-fields"]').text();
    expect(missing).toContain("Phone number");
    expect(missing).toContain("Emergency contact name");
    expect(button(wrapper, "Update profile")).toBeTruthy();
    wrapper.unmount();
  });
});
