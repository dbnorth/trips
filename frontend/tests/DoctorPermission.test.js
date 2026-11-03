/**
 * Feature 102 — Doctor Permission Document When Pregnant
 * Spec: features/feature-102-pregnancy-doctor-permission.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ApplyTripDialog from "../src/components/ApplyTripDialog.vue";
import DocumentTypeFormDialog from "../src/components/DocumentTypeFormDialog.vue";
import { documentTypeLabel } from "../src/utils/documentTypes.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getBrowseTrip: vi.fn(), getApplication: vi.fn(), applyToTrip: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn() },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(), create: vi.fn(), view: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("../src/services/medicalConditionServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/languageServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));

import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";

const MISSING_MESSAGE = "Upload a Doctor Permission document before your application can be approved.";
const TRIP = {
  id: 42,
  orgId: 1,
  name: "Guatemala Clinic 2027",
  startDate: "2027-03-01",
  endDate: "2027-03-10",
  requiresDoctorPermissionWhenPregnant: true,
  doctorPermissionHasExpiration: false,
};
const CLEARANCE_TYPE = {
  id: 11,
  orgId: 1,
  type: "doctor_permission",
  description: "Doctor clearance letter",
  hasExpirationDate: false,
};
const ANA = {
  id: 5,
  firstName: "Ana",
  middleName: "Maria",
  lastName: "Lopez",
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

const DOCTOR_MESSAGE =
  "You must provide a document from your doctor that says it is safe for you to travel on the trip dates.";

const openApplyAsPregnant = async () => {
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
  const health = wrapper.findComponent({ name: "PersonProfileFields" });
  health.vm.$emit("update:modelValue", {
    ...health.props("modelValue"),
    isPregnant: true,
    pregnancyDueDate: "2027-06-01",
  });
  await flushPromises();
  return wrapper;
};

const findButton = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === label);

const findField = (wrapper, name, label) =>
  wrapper.findAllComponents({ name }).find((c) => c.props("label") === label);

describe("Feature 102 — Doctor Permission Document When Pregnant", () => {
  describe("US-102.1 — Staff set up a Doctor Permission document type", () => {
    it("Doctor Permission is a document type Type", async () => {
      const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
        props: { modelValue: true },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await flushPromises();

      const typeSelect = findField(wrapper, "VSelect", "Type");
      expect(typeSelect.props("items")).toContainEqual({
        title: "Doctor Permission",
        value: "doctor_permission",
      });
      expect(documentTypeLabel("doctor_permission")).toBe("Doctor Permission");
      wrapper.unmount();
    });
  });

  describe("US-102.2 — Pregnant applicants must upload a Doctor Permission document", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      window.localStorage.setItem("user", JSON.stringify({ personId: 5 }));
      PersonServices.get.mockResolvedValue({ data: ANA });
      PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
      DocumentTypeServices.getAll.mockResolvedValue({ data: [CLEARANCE_TYPE] });
      TripServices.getBrowseTrip.mockResolvedValue({
        data: {
          trip: TRIP,
          rolesNeeded: [{ id: 3, availableCount: 2, workerRole: { name: "Nurse" } }],
          travelOptions: [],
          alreadyApplied: false,
        },
      });
    });

    afterEach(() => {
      window.localStorage.removeItem("user");
    });

    it("The application says what is missing", async () => {
      const wrapper = await openApplyAsPregnant();

      expect(wrapper.text()).toContain(MISSING_MESSAGE);
      expect(wrapper.text()).toContain(DOCTOR_MESSAGE);
      expect(wrapper.text()).toContain("Save Incomplete Application");
      expect(wrapper.text()).not.toContain("Submit Application");
      wrapper.unmount();
    });

    it("Upload the Doctor Permission document on the application", async () => {
      const uploaded = {
        id: 70,
        personId: 5,
        documentTypeId: CLEARANCE_TYPE.id,
        documentType: CLEARANCE_TYPE,
        expirationDate: "2027-03-10",
        documentFileName: "people/clearance.pdf",
      };
      PersonDocumentServices.create.mockImplementation(async () => {
        PersonDocumentServices.getAll.mockResolvedValue({ data: [uploaded] });
        return { data: uploaded };
      });
      const wrapper = await openApplyAsPregnant();

      await findButton(wrapper, "Upload Doctor Permission document").trigger("click");
      await flushPromises();

      const typeSelect = findField(wrapper, "VSelect", "Document type");
      expect(typeSelect.props("modelValue")).toBe(CLEARANCE_TYPE.id);
      expect(typeSelect.props("items")).toEqual([{ title: "Doctor clearance letter", value: 11 }]);
      expect(findField(wrapper, "VTextField", "Expiration date")).toBeUndefined();

      const file = new File(["%PDF"], "clearance.pdf", { type: "application/pdf" });
      findField(wrapper, "VFileInput", "Upload Doctor clearance letter").vm.$emit(
        "update:modelValue",
        file
      );
      findField(wrapper, "VTextField", "Issue date").vm.$emit("update:modelValue", "2026-10-15");
      await flushPromises();
      await findButton(wrapper, "Save").trigger("click");
      await flushPromises();

      expect(PersonDocumentServices.create).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ documentTypeId: CLEARANCE_TYPE.id, file, expirationDate: "2027-03-10" })
      );
      expect(findField(wrapper, "VSelect", "Document type")).toBeUndefined();
      const area = wrapper.find('[data-testid="only-type-documents"]');
      expect(area.text()).toContain("Doctor clearance letter uploaded");
      expect(area.text()).toContain("expires 03/10/2027");
      expect(area.text()).toContain("View");
      expect(findButton(wrapper, "Upload Doctor Permission document")).toBeUndefined();
      expect(wrapper.text()).not.toContain(MISSING_MESSAGE);
      expect(wrapper.text()).not.toContain(DOCTOR_MESSAGE);
      wrapper.unmount();
    });
  });
});
