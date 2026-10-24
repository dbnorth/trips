/**
 * Feature 84 — Application Flight Notes
 * Spec: features/feature-84-application-flight-notes.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import EditTripApplicationView from "../src/views/EditTripApplicationView.vue";
import ViewTripApplicationDialog from "../src/components/ViewTripApplicationDialog.vue";
import FlightSegmentsDialog from "../src/components/FlightSegmentsDialog.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import PersonServices from "../src/services/personServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import AirportServices from "../src/services/airportServices.js";
import AirlineServices from "../src/services/airlineServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getApplication: vi.fn(), updateApplication: vi.fn(), getFlightSegments: vi.fn() },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), cancel: vi.fn(), uncancel: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({ default: { get: vi.fn() } }));
vi.mock("../src/services/personDocumentServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/documentTypeServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/airportServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/airlineServices.js", () => ({ default: { getAll: vi.fn() } }));

const NOTES = "Flying from Nashville, back to Memphis";
const DialogStub = { template: "<div><slot /></div>" };

describe("Feature 84 — Application Flight Notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    AirportServices.getAll.mockResolvedValue({ data: [] });
    AirlineServices.getAll.mockResolvedValue({ data: [] });
  });

  describe("US-84.2 — Participants and staff see and edit flight notes", () => {
    it("The application form shows Flight notes under Flight purchase", async () => {
      Utils.setStore("user", { personId: 5, userId: 5, email: "ana@example.org", token: "tok" });
      const application = {
        id: 77,
        status: "incomplete",
        version: 2,
        tripWorkerRoleId: 3,
        flightPurchaseOption: "self",
        flightNotes: NOTES,
      };
      TripServices.getApplication.mockResolvedValue({
        data: {
          trip: { id: 42, name: "Guatemala Clinic 2027", orgId: 10, organization: { name: "Hope Missions" } },
          rolesNeeded: [{ id: 3, workerRoleName: "RN Circulator", availableCount: 1 }],
          application,
          canEdit: true,
          travelOptions: [],
        },
      });
      TripServices.updateApplication.mockResolvedValue({ data: { application, applicationStatus: "incomplete" } });
      PersonServices.get.mockResolvedValue({ data: { id: 5, firstName: "Ana", lastName: "Lopez" } });
      PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
      DocumentTypeServices.getAll.mockResolvedValue({ data: [] });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:pathMatch(.*)*", name: "any", component: { template: "<div />" } }],
      });

      const { wrapper } = await mountWithPlugins(EditTripApplicationView, {
        props: { tripId: 42 },
        router,
        global: { stubs: { DonorTripHeading: true, EditPersonDialog: true, PersonProfileFields: true } },
      });
      await flushPromises();

      const notes = wrapper.find('[data-testid="flight-notes"] textarea');
      expect(notes.element.value).toBe(NOTES);
      const text = wrapper.text();
      expect(text.indexOf("Arrange for and purchase my own air travel")).toBeLessThan(text.indexOf("Flight notes"));

      await notes.setValue("  Flying from Columbus  ");
      await wrapper.vm.save();
      await flushPromises();
      expect(TripServices.updateApplication).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ flightNotes: "Flying from Columbus" })
      );
      wrapper.unmount();
    });

    it("Staff see flight notes on the application", async () => {
      TripPeopleRoleServices.get.mockResolvedValue({
        data: {
          id: 77,
          status: "applied",
          version: 1,
          person: { firstName: "Ana", lastName: "Lopez" },
          flightPurchaseOption: "self",
          flightNotes: NOTES,
        },
      });
      const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
        props: { modelValue: false, participantId: 77, mode: "view" },
        global: { stubs: { VDialog: DialogStub } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      const row = wrapper.findAll("tr").find((tr) => tr.text().startsWith("Flight notes"));
      expect(row.text()).toBe(`Flight notes${NOTES}`);
      wrapper.unmount();
    });

    it("The Flight segments dialog shows flight notes below the request", async () => {
      const openDialog = async (data) => {
        TripServices.getFlightSegments.mockResolvedValueOnce({
          data: { tripPeopleRoleId: 201, organizationName: "Hope Missions", segments: [], flightNotes: NOTES, ...data },
        });
        const { wrapper } = await mountWithPlugins(FlightSegmentsDialog, {
          props: { modelValue: false, tripId: 42, tripPeopleRoleId: 201, participantName: "Ana Lopez" },
          global: { stubs: { VDialog: DialogStub } },
        });
        await wrapper.setProps({ modelValue: true });
        await flushPromises();
        return wrapper.find('[data-testid="flight-segments-plan"]');
      };

      const orgBooked = await openDialog({
        flightPurchaseOption: "organization",
        flightPurchasePreferences: { departureAirportCode: "BNA" },
        flightPurchasePreferencesText: "Departure BNA (Nashville)",
      });
      const requested = orgBooked.find('[data-testid="flight-requested"]');
      expect(requested.text()).toBe("Requested: Departure BNA (Nashville)");
      const notes = orgBooked.find('[data-testid="flight-notes"]');
      expect(notes.text()).toBe(`Flight notes: ${NOTES}`);
      expect(requested.element.nextElementSibling).toBe(notes.element);

      const selfBooked = await openDialog({ flightPurchaseOption: "self", flightPurchasePreferencesText: null });
      expect(selfBooked.find('[data-testid="flight-requested"]').exists()).toBe(false);
      expect(selfBooked.find('[data-testid="flight-notes"]').text()).toBe(`Flight notes: ${NOTES}`);
    });
  });
});
