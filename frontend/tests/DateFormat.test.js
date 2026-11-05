/**
 * Feature 101 — MM/DD/YYYY Dates
 * Spec: features/feature-101-mm-dd-yyyy-dates.md
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { formatDate, formatDateTime, formatDateRange } from "../src/utils/dateFormat.js";
import { toUrlSlug } from "../src/utils/donateUrls.js";
import TripsList from "../src/views/TripsList.vue";
import TripView from "../src/views/TripView.vue";
import DonorTripPage from "../src/views/DonorTripPage.vue";
import DonationsList from "../src/views/DonationsList.vue";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import ViewTripApplicationDialog from "../src/components/ViewTripApplicationDialog.vue";
import TripServices from "../src/services/tripServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import PublicServices from "../src/services/publicServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn(), getAll: vi.fn(), getStatus: vi.fn(), getImageUrl: vi.fn(() => null) },
}));
vi.mock("../src/services/organizationServices.js", () => ({
  default: { get: vi.fn(), getLogoUrl: vi.fn(() => null) },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { get: vi.fn(), getAll: vi.fn() },
}));
vi.mock("../src/services/donationServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/exportServices.js", () => ({
  default: {},
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), getPictureUrl: vi.fn(() => null) },
}));
vi.mock("../src/services/publicServices.js", () => ({
  default: { getTripBySlug: vi.fn(), donate: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn() },
}));

const { stubDialog } = vi.hoisted(() => ({
  stubDialog: (name) => ({ default: { name, template: "<div />", props: ["modelValue"] } }),
}));
vi.mock("../src/components/AddTripDialog.vue", () => stubDialog("AddTripDialog"));
vi.mock("../src/components/CopyTripDialog.vue", () => stubDialog("CopyTripDialog"));
vi.mock("../src/components/EditTripDialog.vue", () => stubDialog("EditTripDialog"));
vi.mock("../src/components/ImportTripMasterDialog.vue", () => stubDialog("ImportTripMasterDialog"));
vi.mock("../src/components/AddTripParticipantDialog.vue", () => stubDialog("AddTripParticipantDialog"));
vi.mock("../src/components/EditTripParticipantDialog.vue", () => stubDialog("EditTripParticipantDialog"));
vi.mock("../src/components/ParticipantDonationsDialog.vue", () => stubDialog("ParticipantDonationsDialog"));
vi.mock("../src/components/ViewPersonProfileDialog.vue", () => stubDialog("ViewPersonProfileDialog"));
vi.mock("../src/components/ConfirmDialog.vue", () => stubDialog("ConfirmDialog"));
vi.mock("../src/components/TripTeamEmailDialog.vue", () => stubDialog("TripTeamEmailDialog"));
vi.mock("../src/components/DonationFormDialog.vue", () => stubDialog("DonationFormDialog"));

const Stub = { template: "<div />" };
const ORG_ID = 10;
const TRIP = {
  id: 42,
  name: "Guatemala Clinic 2027",
  orgId: ORG_ID,
  status: "active",
  startDate: "2027-03-01",
  endDate: "2027-03-10",
  organization: { name: "Hope Mission" },
  leaderNames: [],
};
const orgAdminUser = {
  email: "admin@example.com",
  userId: 1,
  personId: 1,
  token: "tok",
  isAdmin: false,
  currentOrgId: ORG_ID,
  currentOrgName: "Hope Mission",
  orgRoles: [{ orgId: ORG_ID, orgName: "Hope Mission", roleName: "Org Admin" }],
  tripRoles: [],
};

const tripRouter = async (name, path, component, params) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path, name, component, props: true },
      { path: "/home", name: "home", component: Stub },
      { path: "/trips", name: "trips", component: Stub },
      { path: "/donate/trip/:tripSlug/:personSlug", name: "donorParticipant", component: Stub, props: true },
    ],
  });
  await router.push({ name, params });
  await router.isReady();
  return router;
};

describe("Feature 101 — MM/DD/YYYY Dates", () => {
  const savedTimeZone = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  afterAll(() => {
    process.env.TZ = savedTimeZone;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-101.1 — Dates on screens read MM/DD/YYYY", () => {
    it("The date helpers write MM/DD/YYYY", () => {
      expect(formatDate("2027-03-01")).toBe("03/01/2027");
      expect(formatDateTime(new Date(2027, 0, 15, 14, 30).toISOString())).toBe("01/15/2027 2:30 PM");
      expect(formatDateRange("2027-03-01", "2027-03-10")).toBe("03/01/2027 – 03/10/2027");
      expect(formatDate(null)).toBe("");
      expect(formatDateTime("")).toBe("");
      expect(formatDateRange(null, undefined)).toBe("");
    });

    it("The Trips list shows trip dates as MM/DD/YYYY", async () => {
      Utils.setStore("user", orgAdminUser);
      TripServices.getAll.mockResolvedValue({ data: [TRIP] });
      OrganizationServices.get.mockResolvedValue({ data: { id: ORG_ID, name: "Hope Mission" } });

      const { wrapper } = await mountWithPlugins(TripsList);
      await flushPromises();

      const headers = wrapper.findAll("th").map((th) => th.text().trim());
      const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Guatemala Clinic 2027"));
      expect(row.findAll("td")[headers.indexOf("Dates")].text()).toBe("03/01/2027 – 03/10/2027");

      wrapper.unmount();
    });

    it("View trip shows MM/DD/YYYY dates", async () => {
      TripServices.get.mockResolvedValue({ data: TRIP });
      TripPeopleRoleServices.getAll.mockResolvedValue({
        data: [
          {
            id: 7,
            peopleId: 5,
            status: "approved",
            role: { roleName: "Trip Participant" },
            person: { id: 5, firstName: "Ana", lastName: "Lopez" },
            arrivalDate: "2027-03-01",
            departureDate: "2027-03-10",
          },
        ],
      });
      DonationServices.getAll.mockResolvedValue({ data: [] });
      TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
      const router = await tripRouter("tripView", "/trips/:tripId", TripView, { tripId: "42" });

      const { wrapper } = await mountWithPlugins(TripView, {
        props: { tripId: "42" },
        router,
        global: { stubs: { TripWorkerRolesCard: Stub } },
      });
      await flushPromises();

      expect(wrapper.text()).toContain("Dates: 03/01/2027 – 03/10/2027");
      const table = wrapper.findAll("table").find((t) => t.text().includes("Arrives"));
      const headers = table.findAll("th").map((th) => th.text().trim());
      const cells = table.find("tbody tr").findAll("td");
      expect(cells[headers.indexOf("Arrives")].text()).toBe("03/01/2027");
      expect(cells[headers.indexOf("Departs")].text()).toBe("03/10/2027");

      wrapper.unmount();
    });

    it("Date columns still sort by date", async () => {
      const participant = (id, firstName, lastName, arrivalDate) => ({
        id,
        peopleId: id,
        status: "approved",
        person: { id, firstName, lastName },
        arrivalDate,
        departureDate: "2027-01-10",
      });
      TripServices.get.mockResolvedValue({ data: TRIP });
      TripServices.getStatus.mockResolvedValue({ data: { participants: [] } });
      TripPeopleRoleServices.getAll.mockResolvedValue({
        data: [participant(1, "Ana", "Lopez", "2027-01-02"), participant(2, "Ben", "Cruz", "2026-12-30")],
      });
      DonationServices.getAll.mockResolvedValue({ data: [] });
      TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
      const router = await tripRouter("tripView", "/trips/:tripId", TripView, { tripId: "42" });

      const { wrapper } = await mountWithPlugins(TripView, {
        props: { tripId: "42" },
        router,
        global: { stubs: { TripWorkerRolesCard: Stub } },
      });
      await flushPromises();

      const table = wrapper.findAll("table").find((t) => t.text().includes("Arrives"));
      const headers = table.findAll("th");
      const headerText = headers.map((th) => th.text().trim());
      const nameIndex = headerText.indexOf("Name");
      const arrivesIndex = headerText.indexOf("Arrives");
      await headers[arrivesIndex].trigger("click");
      await flushPromises();

      const rows = table.findAll("tbody tr").map((tr) => {
        const cells = tr.findAll("td");
        return [cells[nameIndex].text().trim(), cells[arrivesIndex].text()];
      });
      expect(rows).toEqual([
        ["Ben Cruz", "12/30/2026"],
        ["Ana Lopez", "01/02/2027"],
      ]);

      wrapper.unmount();
    });

    it("The public donation page heading shows MM/DD/YYYY", async () => {
      PublicServices.getTripBySlug.mockResolvedValue({ data: { trip: TRIP, participants: [] } });
      const tripSlug = toUrlSlug(TRIP.name);
      const router = await tripRouter("donorTrip", "/donate/trip/:tripSlug", DonorTripPage, { tripSlug });

      const { wrapper } = await mountWithPlugins(DonorTripPage, { props: { tripSlug }, router });
      await flushPromises();

      expect(wrapper.text()).toContain("03/01/2027 – 03/10/2027");

      wrapper.unmount();
    });

    it("Person documents show MM/DD/YYYY", async () => {
      const passport = { id: 1, description: "Passport", type: "passport", hasExpirationDate: true };
      DocumentTypeServices.getAll.mockResolvedValue({ data: [passport] });
      PersonDocumentServices.getAll.mockResolvedValue({
        data: [
          {
            id: 44,
            documentTypeId: 1,
            documentNumber: "P999",
            countryIssued: "US",
            issueDate: "2020-05-04",
            expirationDate: "2030-05-03",
            documentFileName: "people/passport.png",
            documentType: passport,
          },
        ],
      });

      const { wrapper } = await mountWithPlugins(PersonDocumentsCard, { props: { personId: 5 } });
      await flushPromises();

      const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Passport"));
      const cells = row.findAll("td").map((td) => td.text().trim());
      expect(cells).toContain("05/04/2020");
      expect(cells).toContain("05/03/2030");

      wrapper.unmount();
    });

    it("Donation dates show the date and time", async () => {
      Utils.setStore("user", orgAdminUser);
      TripServices.getAll.mockResolvedValue({ data: [{ ...TRIP, participantCost: 1500 }] });
      TripPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
      DonationServices.getAll.mockResolvedValue({
        data: [
          {
            id: 1,
            dateTime: new Date(2027, 0, 15, 14, 30).toISOString(),
            amount: 25,
            donor: { firstName: "Pat", lastName: "Giver" },
          },
        ],
      });

      const { wrapper } = await mountWithPlugins(DonationsList);
      await flushPromises();

      const headers = wrapper.findAll("th").map((th) => th.text().trim());
      const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Pat Giver"));
      expect(row.findAll("td")[headers.indexOf("Date")].text()).toBe("01/15/2027 2:30 PM");

      wrapper.unmount();
    });

    it("Agreement dates show the date and time", async () => {
      TripPeopleRoleServices.get.mockResolvedValue({
        data: {
          id: 7,
          status: "pre_approved",
          version: 1,
          person: { firstName: "Ana", lastName: "Lopez" },
          agreementAccepted: true,
          agreementSignatureName: "Ana Lopez",
          agreementDate: new Date(2027, 0, 5, 9, 5).toISOString(),
        },
      });

      const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
        props: { modelValue: false, participantId: 7, mode: "view" },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();
      await nextTick();

      const row = wrapper.findAll("tr").find((tr) => tr.text().includes("Agreement date"));
      expect(row.text()).toContain("01/05/2027 9:05 AM");

      wrapper.unmount();
    });
  });
});
