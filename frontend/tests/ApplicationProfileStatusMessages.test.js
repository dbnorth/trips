/**
 * Feature 112 — Application and Profile Status Messages
 * Spec: features/feature-112-application-profile-status-messages.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import MyTripNextActions from "../src/components/MyTripNextActions.vue";
import ApplyTripDialog from "../src/components/ApplyTripDialog.vue";
import EditPersonDialog from "../src/components/EditPersonDialog.vue";
import EditTripApplicationView from "../src/views/EditTripApplicationView.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getBrowseTrip: vi.fn(), getApplication: vi.fn(), applyToTrip: vi.fn(), getMyTripDocuments: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), getPictureUrl: vi.fn(() => "") },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(), create: vi.fn(), view: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/medicalConditionServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/languageServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })), getAllForMenu: vi.fn() },
}));
vi.mock("../src/services/roleServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/orgPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })), create: vi.fn(), delete: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";

const MARIA = {
  id: 5,
  firstName: "Maria",
  middleName: "Ana",
  lastName: "Lopez",
  email: "maria@example.org",
  addLine1: "1 Main St",
  city: "Tulsa",
  country: "United States",
  state_prov: "OK",
  postalCode: "74101",
  phoneContryCode: "+1",
  phoneNumber: "5555550100",
  birthDate: "1990-01-01",
  gender: "female",
  emergencyContactName: "Ben Lopez",
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
const RN_LICENSE = { id: 9, description: "RN License", type: "medical_license", hasExpirationDate: true };
const DOCTOR_PERMISSION = {
  id: 11,
  orgId: 1,
  type: "doctor_permission",
  description: "Doctor clearance letter",
  hasExpirationDate: false,
};
const NURSE = { id: 3, availableCount: 2, workerRole: { name: "Nurse", requiredDocumentTypes: [RN_LICENSE] } };
const TRIP = {
  id: 42,
  orgId: 1,
  name: "Guatemala Clinic",
  startDate: "2027-03-15",
  endDate: "2027-03-25",
  requirePassport: true,
};

const mountActions = (actions) => mountWithPlugins(MyTripNextActions, { props: { actions } });

const openApply = async ({ trip = TRIP } = {}) => {
  TripServices.getBrowseTrip.mockResolvedValue({
    data: { trip, rolesNeeded: [NURSE], travelOptions: [], alreadyApplied: false },
  });
  const { wrapper } = await mountWithPlugins(ApplyTripDialog, {
    props: { modelValue: false, tripId: 42 },
    global: {
      stubs: {
        VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        EditPersonDialog: true,
        ParticipantAgreementSection: true,
        TripApplicationTravelOptions: true,
        TripApplicationFlightPurchase: true,
        DonorTripHeading: true,
      },
    },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  wrapper
    .findAllComponents({ name: "VSelect" })
    .find((c) => c.props("label") === "Trip role")
    .vm.$emit("update:modelValue", NURSE.id);
  await flushPromises();
  return wrapper;
};

const TRIP_DOCUMENTS = [
  {
    tripId: 42,
    tripName: "Guatemala Clinic",
    startDate: "2027-03-15",
    dueDate: "2026-12-15",
    documents: [
      { name: "RN License", uploaded: true, missingText: null },
      { name: "Passport", uploaded: false, missingText: "Passport" },
    ],
  },
];

const openProfile = async (signedInPersonId) => {
  Utils.setStore("user", {
    userId: 1,
    personId: signedInPersonId,
    email: "user@example.org",
    isAdmin: false,
    token: "t",
    orgRoles: signedInPersonId === MARIA.id ? [] : [{ orgId: 1, roleName: "Org Admin" }],
    tripRoles: [],
    currentOrgId: 1,
  });
  const { wrapper } = await mountWithPlugins(EditPersonDialog, {
    props: { modelValue: false, personId: MARIA.id },
    global: {
      stubs: {
        VDialog: { template: "<div><slot /></div>" },
        AddressFields: true,
        PhoneInput: true,
        PhoneCountryCodeInput: true,
        PersonProfileFields: true,
        PersonDocumentsCard: { name: "PersonDocumentsCard", template: "<div><slot /></div>" },
      },
    },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
};

describe("Feature 112 — Application and Profile Status Messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("user", JSON.stringify({ personId: 5 }));
    PersonServices.get.mockResolvedValue({ data: MARIA });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
    DocumentTypeServices.getAll.mockResolvedValue({ data: [] });
    TripServices.getMyTripDocuments.mockResolvedValue({ data: TRIP_DOCUMENTS });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe("US-112.1 — Know what to finish before submitting", () => {
    it("Application questions missing", async () => {
      const { wrapper } = await mountActions([
        { code: "complete-application", applicationIncomplete: true, profileIncomplete: false },
      ]);

      expect(wrapper.text()).toContain("Complete missing information on your application so you can submit your application.");
      expect(wrapper.text()).not.toContain("Missing documents");
      wrapper.unmount();
    });

    it("Profile fields missing", async () => {
      const { wrapper } = await mountActions([
        { code: "complete-application", applicationIncomplete: false, profileIncomplete: true },
      ]);

      expect(wrapper.text()).toContain("Complete missing information on your profile so you can submit your application.");
      wrapper.unmount();
    });

    it("Both missing", async () => {
      const { wrapper } = await mountActions([
        { code: "complete-application", applicationIncomplete: true, profileIncomplete: true },
      ]);

      expect(wrapper.text()).toContain("Complete missing information on your application and profile so you can submit your application.");
      wrapper.unmount();
    });

    it("Update App opens the application", async () => {
      const { wrapper } = await mountActions([
        { code: "complete-application", applicationIncomplete: true, profileIncomplete: true },
      ]);

      expect(wrapper.text()).toContain("Complete missing information on your application and profile so you can submit your application.");
      expect(wrapper.find("a").exists()).toBe(false);
      await wrapper
        .findAll("button")
        .find((b) => b.text().trim() === "Update App")
        .trigger("click");

      expect(wrapper.emitted("update")).toHaveLength(1);
      wrapper.unmount();
    });

    it("Only documents missing is unchanged", async () => {
      const { wrapper } = await mountActions([{ code: "submit-application" }]);

      expect(wrapper.text()).toContain("Submit your application.");
      expect(wrapper.findAll("button").map((b) => b.text().trim())).toContain("Submit App");
      wrapper.unmount();
    });
  });

  describe("US-112.4 — Upload missing documents for a pre-approved application", () => {
    it("Pre-approved missing documents message", async () => {
      const { wrapper } = await mountActions([
        { code: "upload-documents", missingDocuments: ["RN License: add this document", "Passport"], dueDate: "2026-12-15" },
      ]);

      expect(wrapper.text()).toContain(
        "Documents are missing and must be uploaded 90 days before departure (12/15/2026). Missing: RN License: add this document; Passport."
      );
      const buttons = wrapper.findAll("button");
      expect(buttons.map((b) => b.text().trim())).toEqual(["Update Documents", "Update App", "Cancel App"]);
      await buttons[0].trigger("click");
      expect(wrapper.emitted("documents")).toHaveLength(1);
      wrapper.unmount();
    });
  });

  describe("US-112.2 — See which profile fields the application needs", () => {
    it("Missing profile fields listed", async () => {
      PersonServices.get.mockResolvedValue({ data: { ...MARIA, city: "", gender: null } });
      const wrapper = await openApply();

      const profileAlert = wrapper
        .findAllComponents({ name: "VAlert" })
        .find((a) => a.text().includes("Your profile needs to be completed"));
      expect(profileAlert.text()).toContain("Missing: City, Gender.");
      expect(profileAlert.text()).toContain("Update profile");
      wrapper.unmount();
    });

    it("No document alert", async () => {
      const wrapper = await openApply();

      expect(wrapper.text()).not.toContain("update these documents on your profile");
      expect(wrapper.text()).not.toContain("Upload a passport");
      expect(wrapper.text()).not.toContain("Upload a file for every document");
      wrapper.unmount();
    });

    it("Doctor Permission upload stays", async () => {
      DocumentTypeServices.getAll.mockResolvedValue({ data: [DOCTOR_PERMISSION] });
      const wrapper = await openApply({ trip: { ...TRIP, requiresDoctorPermissionWhenPregnant: true } });
      const health = wrapper.findComponent({ name: "PersonProfileFields" });
      health.vm.$emit("update:modelValue", {
        ...health.props("modelValue"),
        isPregnant: true,
        pregnancyDueDate: "2027-06-01",
      });
      await flushPromises();

      expect(wrapper.text()).toContain("Upload Doctor Permission document");
      expect(wrapper.text()).not.toContain("Upload a Doctor Permission document before");
      wrapper.unmount();
    });
  });

  describe("US-112.2 — Update application layout", () => {
    const PROFILE_NOTICE = "Your profile needs to be completed";
    const ROLE_HINT = "Only roles with open positions are listed";

    const openUpdatePage = async () => {
      TripServices.getApplication.mockResolvedValue({
        data: {
          trip: TRIP,
          rolesNeeded: [NURSE],
          application: { id: 77, status: "incomplete", version: 1, tripWorkerRoleId: NURSE.id },
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
            ParticipantAgreementSection: true,
            TripApplicationTravelOptions: true,
            TripApplicationFlightPurchase: true,
          },
        },
      });
      await flushPromises();
      return wrapper;
    };

    it("Profile notice comes after the role", async () => {
      PersonServices.get.mockResolvedValue({ data: { ...MARIA, city: "" } });
      for (const wrapper of [await openApply(), await openUpdatePage()]) {
        const text = wrapper.text();
        expect(text.indexOf(ROLE_HINT)).toBeGreaterThan(-1);
        expect(text.indexOf(PROFILE_NOTICE)).toBeGreaterThan(text.indexOf(ROLE_HINT));
        wrapper.unmount();
      }
    });

    it("Profile update note hidden while the profile notice shows", async () => {
      PersonServices.get.mockResolvedValue({ data: { ...MARIA, city: "" } });
      for (const wrapper of [await openApply(), await openUpdatePage()]) {
        expect(wrapper.text()).toContain(PROFILE_NOTICE);
        expect(wrapper.find('[data-testid="profile-update-note"]').exists()).toBe(false);
        expect(wrapper.findAll("button").filter((b) => b.text().trim() === "Update profile")).toHaveLength(1);
        wrapper.unmount();
      }

      PersonServices.get.mockResolvedValue({ data: MARIA });
      const complete = await openApply();
      expect(complete.text()).not.toContain(PROFILE_NOTICE);
      expect(complete.find('[data-testid="profile-update-note"]').text()).toContain(
        "If your contact information or other personal information has changed"
      );
      complete.unmount();
    });
  });

  describe("US-112.3 — See every document my upcoming trips need", () => {
    it("Required documents listed by trip", async () => {
      const wrapper = await openProfile(MARIA.id);

      const section = wrapper.find('[data-testid="my-trip-documents"]');
      expect(section.text()).toContain(
        "All documents for your trips must be uploaded 90 days before the trip starts."
      );
      const trip = section.find('[data-testid="my-trip-documents-trip"]');
      expect(trip.text()).toContain("Guatemala Clinic — starts 03/15/2027, due 12/15/2026");
      expect(trip.text()).toMatch(/RN License\s*Uploaded/);
      expect(trip.text()).toMatch(/Passport\s*Missing/);
      wrapper.unmount();
    });

    it("Not shown on someone else's profile", async () => {
      const wrapper = await openProfile(1);

      expect(wrapper.find('[data-testid="my-trip-documents"]').exists()).toBe(false);
      expect(TripServices.getMyTripDocuments).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  });
});
