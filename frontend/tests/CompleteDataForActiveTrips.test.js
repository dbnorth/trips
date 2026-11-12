/**
 * Feature 121 — Complete Data for Active Trips
 * Spec: features/feature-121-complete-data-for-active-trips.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import EditPersonDialog from "../src/components/EditPersonDialog.vue";
import EditTripApplicationView from "../src/views/EditTripApplicationView.vue";
import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import AirportServices from "../src/services/airportServices.js";
import AirlineServices from "../src/services/airlineServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import RoleServices from "../src/services/roleServices.js";
import OrgPeopleRoleServices from "../src/services/orgPeopleRoleServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getApplication: vi.fn(), updateApplication: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), getPictureUrl: vi.fn(() => "") },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/documentTypeServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/airportServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/airlineServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn(), getAllForMenu: vi.fn() },
}));
vi.mock("../src/services/roleServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/orgPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
}));
vi.mock("../src/components/AddressFields.vue", () => ({
  default: { name: "AddressFields", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/PersonDocumentsCard.vue", () => ({
  default: { name: "PersonDocumentsCard", template: "<div />", props: ["personId"] },
}));
vi.mock("../src/components/PhoneInput.vue", () => ({
  default: { name: "PhoneInput", template: "<div />", props: ["modelValue", "label"] },
}));
vi.mock("../src/components/PhoneCountryCodeInput.vue", () => ({
  default: { name: "PhoneCountryCodeInput", template: "<div />", props: ["modelValue", "label"] },
}));

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const PAT = {
  id: 5,
  userId: 5,
  firstName: "Pat",
  middleName: "Ann",
  lastName: "Lee",
  email: "pat@example.org",
  addLine1: "1 Main St",
  city: "Tulsa",
  country: "United States",
  state_prov: "OK",
  postalCode: "74101",
  phoneContryCode: "+1",
  phoneNumber: "5555550100",
  birthDate: "1990-01-01",
  gender: "female",
  emergencyContactName: "Sam Lee",
  emergencyContactPhoneCountryCode: "+1",
  emergencyContactPhoneNumber: "5555550101",
  emergencyContactRelationship: "Spouse",
  hasAllergies: false,
  takesMedication: false,
  speaksOtherLanguage: false,
  currentChurchHome: "Grace Church",
  currentChurchHomeCity: "Tulsa",
  currentChurchHomeStateProv: "OK",
  version: 1,
};

const TRIP = {
  id: 42,
  name: "Guatemala Clinic",
  orgId: 10,
  organization: { name: "Hope Missions" },
  startDate: dateFromToday(60),
  endDate: dateFromToday(70),
};

const FUNDING = "Funding (self-fund and/or raise funds)";

describe("Feature 121 — Complete Data for Active Trips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", { personId: 5, userId: 5, email: "pat@example.org", token: "tok", orgRoles: [], tripRoles: [] });
    PersonServices.get.mockResolvedValue({ data: PAT });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
    DocumentTypeServices.getAll.mockResolvedValue({ data: [] });
    AirportServices.getAll.mockResolvedValue({ data: [] });
    AirlineServices.getAll.mockResolvedValue({ data: [] });
    OrganizationServices.getAllForMenu.mockResolvedValue({ data: [] });
    RoleServices.getAll.mockResolvedValue({ data: [] });
    OrgPeopleRoleServices.getAll.mockResolvedValue({ data: [] });
  });

  describe("US-121.1 — My profile stays complete while I'm on a trip", () => {
    it("Profile with missing information is refused while on an active trip", async () => {
      const message =
        "This profile is on an active trip and can't be saved with missing information. Missing: Phone number.";
      PersonServices.update.mockRejectedValue({
        response: { status: 400, data: { message, missingItems: ["Phone number"] } },
      });
      const { wrapper } = await mountWithPlugins(EditPersonDialog, {
        props: { modelValue: false, personId: 5 },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      await wrapper.findAll("button").find((b) => b.text() === "Save").trigger("click");
      await flushPromises();

      expect(PersonServices.update).toHaveBeenCalledTimes(1);
      const top = wrapper.find('[data-testid="missing-information-top"]');
      expect(top.text()).toContain(
        "This profile is on an active trip and can't be saved with missing information."
      );
      expect(top.findAll("li").map((li) => li.text())).toEqual(["Phone number"]);
      expect(wrapper.text()).toContain(message);
      expect(wrapper.emitted("saved")).toBeUndefined();
      wrapper.unmount();
    });

    it("The profile dialog lists missing information at the top", async () => {
      PersonServices.get.mockResolvedValue({
        data: { ...PAT, emergencyContactRelationship: null, currentChurchHomeCity: null },
      });
      const { wrapper } = await mountWithPlugins(EditPersonDialog, {
        props: { modelValue: false, personId: 5 },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      const missingItems = () =>
        wrapper.find('[data-testid="missing-profile-fields-top"]').findAll("li").map((li) => li.text());
      expect(missingItems()).toEqual(["Emergency contact relationship", "Current church home city"]);

      const churchCity = wrapper.findAllComponents({ name: "VTextField" }).find((c) => c.props("label") === "Church city");
      await churchCity.find("input").setValue("Tulsa");
      expect(missingItems()).toEqual(["Emergency contact relationship"]);
      wrapper.unmount();
    });

    it("A complete profile shows no missing list", async () => {
      const { wrapper } = await mountWithPlugins(EditPersonDialog, {
        props: { modelValue: false, personId: 5 },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      expect(wrapper.find('[data-testid="missing-profile-fields-top"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("US-121.2 — My Pre-Approved application stays complete", () => {
    const openApplication = async (application) => {
      TripServices.getApplication.mockResolvedValue({
        data: {
          trip: TRIP,
          rolesNeeded: [{ id: 3, workerRoleName: "Nurse", availableCount: 1 }],
          application: {
            id: 77,
            version: 2,
            tripWorkerRoleId: 3,
            flightPurchaseOption: "self",
            hasPreferredRoommate: false,
            isPregnant: false,
            willSelfFund: false,
            willRaiseFunds: false,
            ...application,
          },
          canEdit: true,
          travelOptions: [],
        },
      });
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:pathMatch(.*)*", name: "any", component: { template: "<div />" } }],
      });
      const { wrapper } = await mountWithPlugins(EditTripApplicationView, {
        props: { tripId: 42 },
        router,
        global: {
          stubs: {
            DonorTripHeading: true,
            EditPersonDialog: true,
            PersonProfileFields: true,
            VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
          },
        },
      });
      await flushPromises();
      return wrapper;
    };

    it("A Pre-Approved application with a missing answer can't be saved", async () => {
      const wrapper = await openApplication({ status: "pre_approved" });

      const primary = wrapper.find('[data-testid="application-primary-action"]');
      expect(primary.text()).toBe("Update Application");
      expect(primary.attributes("disabled")).toBeDefined();
      expect(wrapper.text()).toContain(FUNDING);
      wrapper.unmount();
    });

    it("An Incomplete application can still be saved incomplete", async () => {
      TripServices.updateApplication.mockResolvedValue({
        data: { application: { id: 77, status: "incomplete", version: 3 }, applicationStatus: "incomplete" },
      });
      const wrapper = await openApplication({ status: "incomplete" });

      const primary = wrapper.find('[data-testid="application-primary-action"]');
      expect(primary.text()).toBe("Save Incomplete Application");
      expect(primary.attributes("disabled")).toBeUndefined();
      await primary.trigger("click");
      await flushPromises();
      await wrapper.find('[data-testid="incomplete-save-ok"]').trigger("click");
      await flushPromises();

      expect(TripServices.updateApplication).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });
  });
});
