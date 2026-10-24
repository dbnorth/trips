/**
 * Feature 86 — Flight Itinerary Email
 * Spec: features/feature-86-flight-itinerary-email.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import TripFlightsView from "../src/views/TripFlightsView.vue";
import FlightSegmentsDialog from "../src/components/FlightSegmentsDialog.vue";
import TripTeamEmailDialog from "../src/components/TripTeamEmailDialog.vue";
import TripServices from "../src/services/tripServices.js";
import AirportServices from "../src/services/airportServices.js";
import AirlineServices from "../src/services/airlineServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getFlights: vi.fn(),
    getFlightSegments: vi.fn(),
    updateFlightSegments: vi.fn(),
    getFlightItineraryEmailTemplates: vi.fn(),
    previewFlightItineraryEmail: vi.fn(),
    sendFlightItineraryEmail: vi.fn(),
  },
}));

vi.mock("../src/services/airportServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/airlineServices.js", () => ({
  default: { getAll: vi.fn() },
}));

const Stub = { template: "<div />" };
const DialogStub = { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' };

const tomUser = {
  email: "tom@example.com",
  userId: 2,
  personId: 2,
  token: "tok",
  isAdmin: false,
  orgRoles: [],
  tripRoles: [{ tripId: 42, roleName: "Trip Leader" }],
};

const participant = (tripPeopleRoleId, peopleId, firstName, lastName) => ({
  tripPeopleRoleId,
  peopleId,
  firstName,
  lastName,
  roleName: "Trip Participant",
  status: "approved",
  purchased: false,
  cost: null,
  comments: "",
  segmentCount: 0,
  initialDeparture: null,
  finalArrival: null,
});

describe("Feature 86 — Flight Itinerary Email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    TripServices.getFlights.mockResolvedValue({
      data: {
        trip: { id: 42, name: "Guatemala Clinic 2027", startDate: "2027-03-01", endDate: "2027-03-10" },
        participants: [participant(101, 55, "Ana", "Lopez"), participant(102, 56, "Ben", "Cruz")],
      },
    });
    TripServices.getFlightItineraryEmailTemplates.mockResolvedValue({
      data: [{ id: 9, tripId: null, subject: "Your {{TRIP_NAME}} flight itinerary", emailBody: "Hi" }],
    });
    TripServices.getFlightSegments.mockResolvedValue({
      data: {
        confirmationNumber: "QX7P2M",
        segments: [
          {
            segmentType: "arrival",
            segmentNumber: 1,
            departureAirportCode: "BNA",
            airlineCode: "AA",
            flightNumber: "100",
            departureDate: "2027-03-01",
            departureTime: "08:00",
            arrivalAirportCode: "MIA",
            arrivalDate: "2027-03-01",
            arrivalTime: "11:00",
          },
        ],
      },
    });
    TripServices.updateFlightSegments.mockResolvedValue({ data: { segments: [] } });
    AirportServices.getAll.mockResolvedValue({ data: [] });
    AirlineServices.getAll.mockResolvedValue({ data: [] });
  });

  const button = (wrapper, text) => wrapper.findAll("button").find((b) => b.text().trim() === text);

  it("The Flights page opens Email flight itinerary", async () => {
    Utils.setStore("user", tomUser);
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
      global: { stubs: { VDialog: DialogStub } },
    });
    await flushPromises();

    const emailButton = button(wrapper, "Email flight itinerary");
    const pdfButton = button(wrapper, "Flights PDF");
    expect(emailButton).toBeTruthy();
    expect(emailButton.element.parentElement).toBe(pdfButton.element.parentElement);

    await emailButton.trigger("click");
    await flushPromises();

    const dialog = wrapper.findComponent(TripTeamEmailDialog);
    expect(dialog.props("modelValue")).toBe(true);
    expect(dialog.props("kind")).toBe("flightItinerary");
    expect(dialog.text()).toContain("Email flight itinerary");
    expect(TripServices.getFlightItineraryEmailTemplates).toHaveBeenCalledWith("42");
    const templateSelect = dialog
      .findAllComponents({ name: "VSelect" })
      .find((c) => c.props("label") === "Email template");
    expect(templateSelect.props("items")).toEqual([{ title: "Your {{TRIP_NAME}} flight itinerary", value: 9 }]);
    for (const label of ["All potential participants", "All accepted participants", "Selected participants"]) {
      expect(dialog.text()).toContain(label);
    }
    expect(dialog.text()).toContain("Recipients: 2 participants");

    wrapper.unmount();
  });

  it("The Flight segments dialog has a Confirmation number", async () => {
    const { wrapper } = await mountWithPlugins(FlightSegmentsDialog, {
      props: {
        modelValue: false,
        tripId: 42,
        tripPeopleRoleId: 101,
        participantName: "Ana Lopez",
        tripStartDate: "2027-03-01",
        tripEndDate: "2027-03-10",
      },
      global: { stubs: { VDialog: DialogStub } },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    const field = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Confirmation number");
    expect(field.props("modelValue")).toBe("QX7P2M");
    const html = wrapper.html();
    expect(html.indexOf('data-testid="flight-confirmation-number"')).toBeLessThan(html.indexOf("Arrival Flight"));

    field.vm.$emit("update:modelValue", "QX7P2N");
    await flushPromises();
    await button(wrapper, "Save").trigger("click");
    await flushPromises();

    expect(TripServices.updateFlightSegments).toHaveBeenCalledWith(
      42,
      101,
      expect.objectContaining({ confirmationNumber: "QX7P2N" })
    );

    wrapper.unmount();
  });
});
