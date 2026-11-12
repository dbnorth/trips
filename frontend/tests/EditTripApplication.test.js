/**
 * Feature 129 — Incomplete Application Does Not Hold a Role
 * Spec: features/feature-129-incomplete-does-not-hold-role.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EditTripApplicationView from "../src/views/EditTripApplicationView.vue";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getApplication: vi.fn(),
    updateApplication: vi.fn(),
    applyToTrip: vi.fn(),
  },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), getPictureUrl: vi.fn(() => "") },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/medicalConditionServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/languageServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";

const TRIP = { id: 42, orgId: 1, name: "Clinic Trip", startDate: "2026-12-01", endDate: "2026-12-10" };
const NURSE = { id: 3, availableCount: 2, workerRole: { name: "Nurse" } };
const INCOMPLETE_WARNING =
  "Saving an Incomplete application does not secure your role on the trip. Complete the application and required profile fields to be able to submit the application which will secure the role.";
const SUBMIT_NOTICE =
  "Submitting the application will hold your role on the trip pending review of your documents once they are uploaded.";
const CONFIRM = "Your application data will be saved, but a role on the trip has not yet been secured.";
const COMPLETE_PERSON = {
  id: 5,
  firstName: "Ana",
  lastName: "Lopez",
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

describe("Feature 129 — US-129.1 The application says whether the role is held", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem("user", JSON.stringify({ personId: 5 }));
    PersonServices.get.mockResolvedValue({ data: { id: 5, firstName: "Ana", lastName: "Lopez" } });
  });

  afterEach(() => {
    window.localStorage.removeItem("user");
  });

  const openPage = async (application) => {
    TripServices.getApplication.mockResolvedValue({
      data: {
        trip: TRIP,
        rolesNeeded: [NURSE],
        application,
        canEdit: true,
        travelOptions: [],
      },
    });
    const { wrapper, router } = await mountWithPlugins(EditTripApplicationView, {
      props: { tripId: 42 },
      global: {
        stubs: {
          VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
          DonorTripHeading: true,
          EditPersonDialog: true,
          ParticipantAgreementSection: true,
          TripApplicationTravelOptions: true,
          TripApplicationFlightPurchase: true,
          PersonProfileFields: true,
        },
      },
    });
    await flushPromises();
    return { wrapper, router };
  };

  it("The application page shows the same notices", async () => {
    const incomplete = await openPage({
      id: 77,
      status: "incomplete",
      version: 1,
      tripWorkerRoleId: NURSE.id,
    });
    const warning = incomplete.wrapper.find('[data-testid="application-role-hold-notice"]');
    expect(
      incomplete.wrapper.find('[data-testid="application-questions"]').find('[data-testid="application-role-hold-notice"]').exists()
    ).toBe(false);
    expect(warning.text()).toBe(INCOMPLETE_WARNING);
    incomplete.wrapper.unmount();

    PersonServices.get.mockResolvedValue({ data: COMPLETE_PERSON });
    const ready = await openPage({
      id: 78,
      status: "incomplete",
      version: 1,
      tripWorkerRoleId: NURSE.id,
      willSelfFund: true,
      flightPurchaseOption: "self",
    });
    const notice = ready.wrapper.find('[data-testid="application-role-hold-notice"]');
    expect(notice.text()).toBe(SUBMIT_NOTICE);
    expect(ready.wrapper.text()).not.toContain(INCOMPLETE_WARNING);
    ready.wrapper.unmount();
  });

  it("Save Incomplete Application confirms before it saves", async () => {
    TripServices.updateApplication.mockResolvedValue({
      data: { application: { status: "incomplete" }, message: "Application updated." },
    });
    const { wrapper, router } = await openPage({
      id: 77,
      status: "incomplete",
      version: 1,
      tripWorkerRoleId: NURSE.id,
    });

    await wrapper.find('[data-testid="application-primary-action"]').trigger("click");
    await flushPromises();

    const dialog = wrapper.find('[data-testid="incomplete-save-dialog"]');
    expect(dialog.text()).toContain(CONFIRM);
    expect(dialog.findAll("button").map((b) => b.text().trim())).toEqual(["OK"]);
    expect(TripServices.updateApplication).not.toHaveBeenCalled();

    await dialog.find('[data-testid="incomplete-save-ok"]').trigger("click");
    await flushPromises();

    expect(TripServices.updateApplication).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="incomplete-save-dialog"]').exists()).toBe(false);
    expect(router.currentRoute.value.name).toBe("home");
    wrapper.unmount();
  });
});
