/**
 * Feature 27 — Application Submit Unavailable Info Message
 * Spec: features/feature-27-application-submit-unavailable-info.md
 * Feature 47 — Simplify Application Warnings
 * Spec: features/feature-47-simplify-application-warnings.md
 * Feature 56 — Reserved Role Emails
 * Spec: features/feature-56-reserved-role-emails.md
 * Feature 57 — Document Type Has Expiration Date
 * Spec: features/feature-57-document-type-expiration-date.md
 * Feature 59 — Document Type Specialization List
 * Spec: features/feature-59-document-type-specialization-list.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ApplicationSubmitUnavailableAlert from "../src/components/ApplicationSubmitUnavailableAlert.vue";
import ApplyTripDialog from "../src/components/ApplyTripDialog.vue";
import {
  canShowPrimarySubmitButton,
  getIncompleteSubmitReasons,
  getSubmitUnavailableReasons,
} from "../src/utils/applicationSubmitAvailability.js";
import { getMissingProfileFields } from "../src/utils/personProfile.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getBrowseTrip: vi.fn(), getApplication: vi.fn(), applyToTrip: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn() },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";

describe("Feature 27 — Application Submit Unavailable Info Message", () => {
  describe("US-27.1 — See why Submit / Save is not available", () => {
    it("Info lists reasons when primary button is hidden", async () => {
      const reasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: false,
        applicationStatus: "cancelled",
        availableRolesCount: 0,
      });

      expect(canShowPrimarySubmitButton({
        loading: false,
        tripReady: true,
        canEdit: false,
        availableRolesCount: 0,
      })).toBe(false);

      expect(reasons).toEqual([
        "This application cannot be saved while its status is Cancelled.",
        "There are no trip roles with available positions.",
      ]);

      const { wrapper } = await mountWithPlugins(ApplicationSubmitUnavailableAlert, {
        props: { reasons },
      });
      await flushPromises();

      expect(wrapper.text()).toContain("This application cannot be saved or submitted yet:");
      expect(wrapper.text()).toContain(
        "This application cannot be saved while its status is Cancelled."
      );
      expect(wrapper.text()).toContain("There are no trip roles with available positions.");
      wrapper.unmount();
    });

    it("Alert clears when the primary button returns", async () => {
      const hiddenReasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: false,
        applicationStatus: "approved",
        availableRolesCount: 2,
      });
      expect(hiddenReasons.length).toBeGreaterThan(0);
      expect(
        canShowPrimarySubmitButton({
          loading: false,
          tripReady: true,
          canEdit: false,
          availableRolesCount: 2,
        })
      ).toBe(false);

      const clearedReasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: true,
        applicationStatus: "incomplete",
        availableRolesCount: 2,
      });
      expect(clearedReasons).toEqual([]);
      expect(
        canShowPrimarySubmitButton({
          loading: false,
          tripReady: true,
          canEdit: true,
          availableRolesCount: 2,
        })
      ).toBe(true);

      const { wrapper } = await mountWithPlugins(ApplicationSubmitUnavailableAlert, {
        props: { reasons: clearedReasons },
      });
      await flushPromises();
      expect(wrapper.text()).not.toContain("This application cannot be saved or submitted yet:");
      wrapper.unmount();
    });

    it("Incomplete editable application still shows Save Incomplete", () => {
      const reasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: true,
        applicationStatus: "incomplete",
        availableRolesCount: 1,
      });

      expect(reasons).toEqual([]);
      expect(
        canShowPrimarySubmitButton({
          loading: false,
          tripReady: true,
          canEdit: true,
          availableRolesCount: 1,
        })
      ).toBe(true);
    });

    it("Completion warning lists profile and incomplete application fields", async () => {
      const reasons = getIncompleteSubmitReasons({
        profileComplete: false,
        tripWorkerRoleId: null,
        willSelfFund: false,
        willRaiseFunds: false,
        agreementRequired: true,
        agreementAccepted: false,
        personDocumentsUploaded: true,
        requiredRoleDocumentUploaded: true,
        requiredPassportUploaded: true,
        travelOptionsComplete: true,
      });

      expect(reasons[0]).toBe("Profile is not complete");
      expect(reasons).toContain("Trip role");
      expect(reasons).toContain("Funding (self-fund and/or raise funds)");
      expect(reasons).toContain("Participant agreement");

      const { wrapper } = await mountWithPlugins(ApplicationSubmitUnavailableAlert, {
        props: {
          reasons,
          intro: "Complete the following to submit your application:",
        },
      });
      await flushPromises();
      expect(wrapper.text()).toContain("Complete the following to submit your application:");
      expect(wrapper.text()).toContain("Profile is not complete");
      expect(wrapper.text()).toContain("Trip role");
      wrapper.unmount();
    });
  });
});

describe("Feature 47 — Simplify Application Warnings", () => {
  const PROFILE_MESSAGE = "Your profile needs to be completed before this application can be submitted.";
  const CHECKLIST_INTRO = "Complete the following to submit your application:";
  const TRIP = { id: 42, orgId: 1, name: "Clinic Trip", startDate: "2026-12-01", endDate: "2026-12-10" };
  const OPEN_ROLE = { id: 3, availableCount: 2, workerRole: { name: "Nurse" } };
  const INCOMPLETE_PERSON = { id: 5, firstName: "Ana", lastName: "Lopez" };
  const COMPLETE_PERSON = {
    ...INCOMPLETE_PERSON,
    middleName: "Maria",
    email: "ana@example.org",
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
  };

  const browseTrip = (data) =>
    TripServices.getBrowseTrip.mockResolvedValue({
      data: { trip: TRIP, rolesNeeded: [OPEN_ROLE], travelOptions: [], alreadyApplied: false, ...data },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("user", JSON.stringify({ personId: 5 }));
    PersonServices.get.mockResolvedValue({ data: INCOMPLETE_PERSON });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
    browseTrip();
  });

  afterEach(() => {
    window.localStorage.removeItem("user");
  });

  const openDialog = async () => {
    const { wrapper } = await mountWithPlugins(ApplyTripDialog, {
      props: { modelValue: false, tripId: 42 },
      global: {
        stubs: {
          VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
          PersonProfileFields: true,
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
    return wrapper;
  };

  describe("US-47.1 — Short incomplete-profile box", () => {
    it("Incomplete-profile box shows the message and button without a field list", async () => {
      const wrapper = await openDialog();

      const profileAlert = wrapper
        .findAllComponents({ name: "VAlert" })
        .find((a) => a.text().includes(PROFILE_MESSAGE));
      expect(profileAlert).toBeTruthy();
      expect(profileAlert.text()).toContain("Update profile");
      expect(profileAlert.find("ul").exists()).toBe(false);
      for (const field of getMissingProfileFields(INCOMPLETE_PERSON, { orgId: TRIP.orgId })) {
        expect(profileAlert.text()).not.toContain(field);
      }
      wrapper.unmount();
    });

    it("Saving the profile from the application re-checks the profile", async () => {
      const wrapper = await openDialog();
      expect(wrapper.text()).toContain(PROFILE_MESSAGE);

      PersonServices.get.mockResolvedValue({ data: COMPLETE_PERSON });
      wrapper.findComponent({ name: "EditPersonDialog" }).vm.$emit("saved");
      await flushPromises();

      expect(PersonServices.get).toHaveBeenCalledTimes(2);
      expect(wrapper.text()).not.toContain(PROFILE_MESSAGE);
      wrapper.unmount();
    });
  });

  describe("US-47.2 — No missing-items list on a first application", () => {
    it("First application does not show the missing-items checklist", async () => {
      const wrapper = await openDialog();

      expect(wrapper.text()).not.toContain(CHECKLIST_INTRO);
      expect(wrapper.text()).toContain("Save Incomplete Application");
      wrapper.unmount();
    });

    it("Saved incomplete application shows the missing-items checklist", async () => {
      browseTrip({ alreadyApplied: true, applicationStatus: "incomplete" });
      TripServices.getApplication.mockResolvedValue({
        data: {
          trip: TRIP,
          rolesNeeded: [OPEN_ROLE],
          travelOptions: [],
          canEdit: true,
          applicationStatus: "incomplete",
          application: { status: "incomplete", tripWorkerRoleId: null },
        },
      });
      const wrapper = await openDialog();

      expect(wrapper.text()).toContain(CHECKLIST_INTRO);
      expect(wrapper.text()).toContain("Profile is not complete");
      expect(wrapper.text()).toContain("Trip role");
      wrapper.unmount();
    });

    it("First application still shows why it cannot be saved", async () => {
      browseTrip({ rolesNeeded: [{ ...OPEN_ROLE, availableCount: 0 }] });
      const wrapper = await openDialog();

      expect(wrapper.text()).toContain("This application cannot be saved or submitted yet:");
      expect(wrapper.text()).toContain("There are no trip roles with available positions.");
      expect(wrapper.text()).not.toContain(CHECKLIST_INTRO);
      wrapper.unmount();
    });
  });

  describe("US-47.3 — Profile health answers are display-only on the application", () => {
    it("Update profile in the health section opens the profile", async () => {
      const wrapper = await openDialog();
      const profileDialog = () => wrapper.findComponent({ name: "EditPersonDialog" });
      expect(profileDialog().props("modelValue")).toBe(false);

      wrapper.findComponent({ name: "PersonProfileFields" }).vm.$emit("update-profile");
      await flushPromises();

      expect(profileDialog().props("modelValue")).toBe(true);
      wrapper.unmount();
    });

    it("Saving the application does not update the profile", async () => {
      TripServices.applyToTrip.mockResolvedValue({ data: {} });
      const wrapper = await openDialog();

      wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Trip role")
        .vm.$emit("update:modelValue", OPEN_ROLE.id);
      await flushPromises();
      await wrapper
        .findAll("button")
        .find((b) => b.text() === "Save Incomplete Application")
        .trigger("click");
      await flushPromises();

      expect(TripServices.applyToTrip).toHaveBeenCalledTimes(1);
      expect(PersonServices.update).not.toHaveBeenCalled();
      wrapper.unmount();
    });
  });

  describe("Feature 56 — US-56.2 Reserved person applies into the reserved role", () => {
    it("Apply dialog locks the reserved role", async () => {
      browseTrip({
        rolesNeeded: [{ ...OPEN_ROLE, availableCount: 0 }, { id: 4, availableCount: 1, workerRole: { name: "Driver" } }],
        myReservedTripWorkerRoleId: OPEN_ROLE.id,
      });
      const wrapper = await openDialog();

      const select = wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Trip role");
      expect(select.props("items").map((i) => i.value)).toEqual([OPEN_ROLE.id]);
      expect(select.props("modelValue")).toBe(OPEN_ROLE.id);
      expect(select.props("disabled")).toBe(true);
      expect(select.props("hint")).toBe("This role is reserved for you.");
      wrapper.unmount();
    });
  });

  describe("Feature 57 — US-57.3 Application document checks skip expiration", () => {
    it("Missing-document message leaves out expiration wording", async () => {
      browseTrip({
        rolesNeeded: [
          {
            ...OPEN_ROLE,
            workerRole: {
              name: "Nurse",
              requiredDocumentTypes: [
                { id: 9, description: "Diploma", type: "diploma", hasExpirationDate: false },
              ],
            },
          },
        ],
      });
      const wrapper = await openDialog();

      wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Trip role")
        .vm.$emit("update:modelValue", OPEN_ROLE.id);
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Upload the following required documents before submitting your application: Diploma."
      );
      expect(wrapper.text()).not.toContain("expiration date");
      wrapper.unmount();
    });
  });

  describe("Feature 59 — US-59.4 Application checks require the role's specializations", () => {
    it("Apply dialog names the missing specialization", async () => {
      browseTrip({
        rolesNeeded: [
          {
            ...OPEN_ROLE,
            workerRole: {
              name: "Pediatric Nurse",
              requiredDocumentTypes: [
                {
                  id: 7,
                  description: "Board certification",
                  type: "certification",
                  hasExpirationDate: true,
                  allowSpecialization: true,
                },
              ],
              requiredSpecializations: [{ id: 71, name: "Pediatrics", documentTypeId: 7 }],
            },
          },
        ],
      });
      PersonDocumentServices.getAll.mockResolvedValue({
        data: [
          {
            id: 1,
            documentTypeId: 7,
            expirationDate: "2030-01-01",
            documentFileName: "people/board.png",
            documentType: { id: 7, hasExpirationDate: true },
            specializations: [],
          },
        ],
      });
      const wrapper = await openDialog();

      wrapper
        .findAllComponents({ name: "VSelect" })
        .find((c) => c.props("label") === "Trip role")
        .vm.$emit("update:modelValue", OPEN_ROLE.id);
      await flushPromises();

      expect(wrapper.text()).toContain(
        "Upload the following required documents with an expiration date past the end of the trip (2026-12-10) before submitting your application: Board certification (Pediatrics)."
      );
      wrapper.unmount();
    });
  });
});
