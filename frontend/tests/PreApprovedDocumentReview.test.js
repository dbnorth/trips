/**
 * Feature 104 — Pre-Approved Status and Document Review
 * Spec: features/feature-104-pre-approved-document-review.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import ApplyTripDialog from "../src/components/ApplyTripDialog.vue";
import ViewTripApplicationDialog from "../src/components/ViewTripApplicationDialog.vue";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import TripView from "../src/views/TripView.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import PersonServices from "../src/services/personServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import { tripParticipantStatusLabel } from "../src/utils/tripParticipantStatus.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn(), getBrowseTrip: vi.fn(), getApplication: vi.fn(), applyToTrip: vi.fn() },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: {
    getAll: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    documentReview: vi.fn(),
    setDocumentReviewed: vi.fn(),
    viewDocument: vi.fn(),
    viewSpecialization: vi.fn(),
  },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), getPictureUrl: vi.fn(() => null) },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(), view: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/services/donationServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/authServices.js", () => ({ default: { me: vi.fn(() => Promise.resolve({ data: {} })) } }));

const { stubDialog } = vi.hoisted(() => ({
  stubDialog: (name, props = ["modelValue"]) => ({ default: { name, template: "<div />", props } }),
}));
vi.mock("../src/components/EditTripDialog.vue", () => stubDialog("EditTripDialog", ["modelValue", "tripId"]));
vi.mock("../src/components/AddTripParticipantDialog.vue", () => stubDialog("AddTripParticipantDialog"));
vi.mock("../src/components/EditTripParticipantDialog.vue", () => stubDialog("EditTripParticipantDialog"));
vi.mock("../src/components/ParticipantDonationsDialog.vue", () => stubDialog("ParticipantDonationsDialog"));
vi.mock("../src/components/ViewPersonProfileDialog.vue", () => stubDialog("ViewPersonProfileDialog"));
vi.mock("../src/components/ConfirmDialog.vue", () => stubDialog("ConfirmDialog"));
vi.mock("../src/components/TripTeamEmailDialog.vue", () =>
  stubDialog("TripTeamEmailDialog", ["modelValue", "tripId", "participants"])
);

const dialogStub = { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' };
const Stub = { template: "<div />" };

const TRIP = {
  id: 42,
  orgId: 10,
  name: "Guatemala Clinic 2027",
  status: "active",
  startDate: "2027-03-01",
  endDate: "2027-03-10",
  requirePassport: true,
  leaderNames: [],
};
const RN_LICENSE = { id: 1, description: "RN License", type: "license", hasExpirationDate: false };
const NURSE = { id: 3, availableCount: 2, workerRole: { name: "Nurse", requiredDocumentTypes: [RN_LICENSE] } };
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
const anaRow = (status) => ({
  id: 1,
  peopleId: 5,
  status,
  role: { roleName: "Trip Participant" },
  tripWorkerRole: { workerRole: { name: "Nurse" } },
  person: { id: 5, firstName: "Ana", lastName: "Lopez" },
});

const findBtn = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === label);

const openTripView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
      { path: "/trips", name: "trips", component: Stub },
    ],
  });
  await router.push("/trips/42");
  await router.isReady();
  const { wrapper } = await mountWithPlugins(TripView, {
    props: { tripId: "42" },
    router,
    global: { stubs: { TripWorkerRolesCard: Stub, VDialog: dialogStub } },
  });
  await flushPromises();
  return wrapper;
};

describe("Feature 104 — Pre-Approved Status and Document Review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", { personId: 1, currentOrgId: 10, orgRoles: [], tripRoles: [] });
    TripServices.get.mockResolvedValue({ data: TRIP });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("US-104.1 — Applications are Pre-Approved without documents", () => {
    it("Existing Applied applications become Pre-Approved", async () => {
      expect(tripParticipantStatusLabel("applied")).toBe("Pre-Approved");
      TripPeopleRoleServices.getAll.mockResolvedValue({ data: [anaRow("pre_approved")] });

      const wrapper = await openTripView();

      const row = wrapper.findAll("tr").find((tr) => tr.text().includes("Ana Lopez"));
      expect(row.text()).toContain("Pre-Approved");
      expect(row.text()).not.toContain("pre_approved");
      wrapper.unmount();
    });

    const openSavedApplication = async (status) => {
      localStorage.setItem("user", JSON.stringify({ personId: 5 }));
      PersonServices.get.mockResolvedValue({ data: ANA });
      PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
      TripServices.getBrowseTrip.mockResolvedValue({
        data: { trip: TRIP, rolesNeeded: [NURSE], travelOptions: [], alreadyApplied: true, applicationStatus: status },
      });
      TripServices.getApplication.mockResolvedValue({
        data: {
          trip: TRIP,
          rolesNeeded: [NURSE],
          travelOptions: [],
          canEdit: true,
          applicationStatus: status,
          application: { status, tripWorkerRoleId: NURSE.id, willSelfFund: true, flightPurchaseOption: "self" },
        },
      });

      const { wrapper } = await mountWithPlugins(ApplyTripDialog, {
        props: { modelValue: false, tripId: 42 },
        global: {
          stubs: {
            VDialog: dialogStub,
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

    it("Submit is enabled while documents are missing", async () => {
      const wrapper = await openSavedApplication("incomplete");

      expect(findBtn(wrapper, "Submit Application")).toBeTruthy();
      wrapper.unmount();
    });

    it("Updating a Pre-Approved application says Update Application", async () => {
      const wrapper = await openSavedApplication("pre_approved");

      expect(findBtn(wrapper, "Update Application")).toBeTruthy();
      expect(findBtn(wrapper, "Submit Application")).toBeFalsy();
      wrapper.unmount();
    });
  });

  describe("US-104.2 — Approval needs uploaded, reviewed documents", () => {
    it("Approve App explains what is missing", async () => {
      TripPeopleRoleServices.get.mockResolvedValue({
        data: { ...anaRow("pre_approved"), version: 1, person: { firstName: "Ana", lastName: "Lopez" } },
      });
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: { approvalBlockers: ["RN License: not uploaded", "Passport: not reviewed"] },
      });

      const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
        props: { modelValue: false, participantId: 1, mode: "approve" },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      expect(TripPeopleRoleServices.documentReview).toHaveBeenCalledWith(1);
      const blockers = wrapper.find('[data-testid="approval-blockers"]');
      expect(blockers.text()).toContain("Before approving, these documents need to be uploaded and reviewed:");
      expect(blockers.findAll("li").map((li) => li.text())).toEqual([
        "RN License: not uploaded",
        "Passport: not reviewed",
      ]);
      expect(findBtn(wrapper, "Approve App").props("disabled")).toBe(true);
      wrapper.unmount();
    });
  });

  describe("US-104.3 — Staff review a participant's required documents", () => {
    it("Staff review documents from the Trip View", async () => {
      TripPeopleRoleServices.getAll.mockResolvedValue({ data: [anaRow("pre_approved")] });
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: {
          workerRoleName: "Nurse",
          requirements: [
            {
              key: "document-type-1",
              label: "RN License",
              requiredSpecializations: [
                { id: 71, name: "Emergency" },
                { id: 72, name: "Pediatrics" },
              ],
              documents: [
                {
                  id: 11,
                  description: "RN License",
                  documentNumber: "RN-77",
                  issueDate: "2024-02-01",
                  expirationDate: null,
                  documentNumberRequired: true,
                  hasExpirationDate: false,
                  hasFile: true,
                  reviewed: false,
                  specializations: [
                    { id: 5, documentTypeSpecializationId: 72, name: "Pediatrics", date: "2024-04-15", hasFile: true },
                  ],
                },
              ],
            },
            {
              key: "passport",
              label: "Passport",
              documents: [
                {
                  id: 12,
                  description: "Passport",
                  documentNumber: "P123",
                  issueDate: "2020-06-01",
                  expirationDate: "2030-05-31",
                  documentNumberRequired: true,
                  hasExpirationDate: true,
                  hasFile: true,
                  reviewed: false,
                },
              ],
            },
          ],
          allDocumentsHaveFiles: true,
          approvalBlockers: ["RN License: not reviewed", "Passport: not reviewed"],
        },
      });
      TripPeopleRoleServices.setDocumentReviewed.mockResolvedValue({ data: {} });

      const wrapper = await openTripView();
      const row = wrapper.findAll("tr").find((tr) => tr.text().includes("Ana Lopez"));
      const action = row.find('.v-btn[aria-label="Review documents"]');
      expect(action.find(".v-icon").classes()).toContain("mdi-checkbox-marked-circle-outline");
      await action.trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.documentReview).toHaveBeenCalledWith(1);
      expect(wrapper.text()).toContain("Review documents — Ana Lopez");
      expect(wrapper.find('[data-testid="review-role"]').text().replace(/\s+/g, " ")).toBe("Role: Nurse");
      const requirements = wrapper.findAll('[data-testid="review-requirement"]');
      expect(requirements.map((r) => r.find(".text-subtitle-2").text())).toEqual(["RN License", "Passport"]);
      const documents = wrapper.findAll('[data-testid="review-document"]');
      expect(documents).toHaveLength(2);
      expect(documents[1].text()).toContain("expires 05/31/2030");
      for (const doc of documents) {
        expect(doc.findAllComponents({ name: "VBtn" }).some((b) => b.text().trim() === "View")).toBe(true);
        expect(doc.find('input[type="checkbox"]').element.checked).toBe(false);
      }

      TripPeopleRoleServices.viewDocument.mockResolvedValue({
        data: new Blob(["png"], { type: "image/png" }),
        headers: { "content-type": "image/png" },
      });
      URL.createObjectURL = vi.fn(() => "blob:passport");
      URL.revokeObjectURL = vi.fn();
      await findBtn(documents[1], "View").trigger("click");
      await flushPromises();
      expect(TripPeopleRoleServices.viewDocument).toHaveBeenCalledWith(1, 12);
      const viewer = wrapper.find('[data-testid="review-document-view"]');
      expect(viewer.exists()).toBe(true);
      expect(viewer.text()).toContain("Passport");
      expect(viewer.find("img").attributes("src")).toBe("blob:passport");
      const details = () =>
        wrapper.findAll('[data-testid="review-document-details"] span').map((s) => s.text().replace(/\s+/g, " "));
      expect(details()).toEqual([
        "Document number: P123",
        "Issue date: 06/01/2020",
        "Expiration date: 05/31/2030",
      ]);
      await findBtn(viewer, "Close").trigger("click");
      await flushPromises();
      expect(wrapper.find('[data-testid="review-document-view"]').exists()).toBe(false);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:passport");

      await findBtn(documents[0], "View").trigger("click");
      await flushPromises();
      expect(details()).toEqual(["Document number: RN-77", "Issue date: 02/01/2024"]);
      await findBtn(wrapper.find('[data-testid="review-document-view"]'), "Close").trigger("click");
      await flushPromises();

      const spots = documents[0].findAll('[data-testid="review-specialization"]');
      expect(spots.map((s) => s.text().replace(/\s+/g, " "))).toEqual([
        "Emergency Not added",
        "Pediatrics · 04/15/2024 View",
      ]);
      expect(documents[1].findAll('[data-testid="review-specialization"]')).toHaveLength(0);
      TripPeopleRoleServices.viewSpecialization.mockResolvedValue({
        data: new Blob(["png"], { type: "image/png" }),
        headers: { "content-type": "image/png" },
      });
      await findBtn(spots[1], "View").trigger("click");
      await flushPromises();
      expect(TripPeopleRoleServices.viewSpecialization).toHaveBeenCalledWith(1, 11, 5);
      const specViewer = wrapper.find('[data-testid="review-document-view"]');
      expect(specViewer.text()).toContain("RN License — Pediatrics");
      expect(details()).toEqual(["Specialization date: 04/15/2024"]);
      await findBtn(specViewer, "Close").trigger("click");
      await flushPromises();
      expect(wrapper.text()).toContain("Review documents — Ana Lopez");

      for (const doc of documents) {
        await doc.find('input[type="checkbox"]').setValue(true);
        await flushPromises();
      }
      expect(TripPeopleRoleServices.setDocumentReviewed).toHaveBeenCalledWith(1, 11, true);
      expect(TripPeopleRoleServices.setDocumentReviewed).toHaveBeenCalledWith(1, 12, true);
      wrapper.unmount();
    });

    it("The profile document list shows Reviewed read-only", async () => {
      PersonDocumentServices.getAll.mockResolvedValue({
        data: [
          { id: 12, documentTypeId: 2, documentType: { description: "Passport" }, documentFileName: "people/p.png", reviewed: true },
          { id: 11, documentTypeId: 1, documentType: { description: "RN License" }, documentFileName: "people/rn.png", reviewed: false },
        ],
      });

      const { wrapper } = await mountWithPlugins(PersonDocumentsCard, {
        props: { personId: 5 },
        global: { stubs: { VDialog: dialogStub } },
      });
      await flushPromises();

      const headers = wrapper.findAll("th").map((th) => th.text());
      expect(headers).toContain("Reviewed");
      const boxes = wrapper.findAllComponents({ name: "VCheckboxBtn" });
      expect(boxes.map((b) => b.props("modelValue"))).toEqual([true, false]);
      expect(boxes.every((b) => b.props("readonly"))).toBe(true);
      wrapper.unmount();
    });
  });
});
