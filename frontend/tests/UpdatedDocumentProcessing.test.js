/**
 * Feature 120 — Updated Document Processing
 * Spec: features/feature-120-updated-document-processing.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ReviewDocumentsDialog from "../src/components/ReviewDocumentsDialog.vue";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import { currentDocument, isDoctorPermissionUploaded } from "../src/utils/tripApplicationForm.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: {
    documentReview: vi.fn(),
    setDocumentReviewed: vi.fn(),
    viewDocument: vi.fn(),
    viewSpecialization: vi.fn(),
    updateDocument: vi.fn(),
    requestDocumentReload: vi.fn(),
  },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(), view: vi.fn(), download: vi.fn(), delete: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));
vi.mock("../src/components/CountrySelect.vue", () => ({
  default: { name: "CountrySelect", props: ["modelValue", "label", "defaultEmptyToUs"], template: "<div />" },
}));

const dialogStub = { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' };

const PASSPORT_TYPE = {
  id: 2,
  orgId: 10,
  description: "Passport",
  type: "passport",
  documentNumberRequired: true,
  hasExpirationDate: true,
  allowSpecialization: false,
  specializations: [],
};

const passportDoc = (fields = {}) => ({
  id: 12,
  documentTypeId: 2,
  countryIssued: "US",
  description: "Passport",
  documentNumber: "P123",
  issueDate: "2019-03-14",
  expirationDate: "2029-03-13",
  documentNumberRequired: true,
  hasExpirationDate: true,
  hasFile: true,
  reviewed: false,
  reloadRequestedAt: null,
  current: true,
  specializations: [],
  ...fields,
});

const reviewData = (documents) => ({
  workerRoleName: "Nurse",
  requirements: [{ key: "passport", label: "Passport", requiredSpecializations: [], documents }],
  allDocumentsHaveFiles: true,
  approvalBlockers: [],
  documentTypes: [PASSPORT_TYPE],
});

const findBtn = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === label);

const details = (wrapper) =>
  wrapper.findAll('[data-testid="review-document-details"] span').map((s) => s.text().replace(/\s+/g, " "));

const openReview = async (documents) => {
  TripPeopleRoleServices.documentReview.mockResolvedValue({ data: reviewData(documents) });
  const { wrapper } = await mountWithPlugins(ReviewDocumentsDialog, {
    props: { modelValue: true, participant: { id: 1, person: { firstName: "Pat", middleName: "J", lastName: "Lee" } } },
    global: { stubs: { VDialog: dialogStub } },
  });
  await flushPromises();
  return wrapper;
};

const openViewer = async (wrapper, index = 0) => {
  const doc = wrapper.findAll('[data-testid="review-document"]')[index];
  await findBtn(doc, "View").trigger("click");
  await flushPromises();
  return wrapper.find('[data-testid="review-document-view"]');
};

const mountProfile = async (documents) => {
  PersonDocumentServices.getAll.mockResolvedValue({ data: documents });
  const { wrapper } = await mountWithPlugins(PersonDocumentsCard, {
    props: { personId: 5 },
    global: { stubs: { VDialog: dialogStub } },
  });
  await flushPromises();
  return wrapper;
};

describe("Feature 120 — Updated Document Processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:passport");
    URL.revokeObjectURL = vi.fn();
    TripPeopleRoleServices.viewDocument.mockResolvedValue({
      data: new Blob(["png"], { type: "image/png" }),
      headers: { "content-type": "image/png" },
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("US-120.1 — Fix a document while looking at it", () => {
    it("Staff edit a document under the viewer", async () => {
      const wrapper = await openReview([passportDoc()]);
      const viewer = await openViewer(wrapper);

      await findBtn(viewer, "Edit").trigger("click");
      const section = viewer.find('[data-testid="review-document-edit-section"]');
      expect(section.exists()).toBe(true);
      expect(findBtn(section, "Close")).toBeTruthy();
      expect(findBtn(section, "Save")).toBeTruthy();
      expect(viewer.find("img").attributes("src")).toBe("blob:passport");

      await section.find('[data-testid="review-edit-expiration-date"] input').setValue("2029-03-12");
      TripPeopleRoleServices.updateDocument.mockResolvedValue({ data: {} });
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: reviewData([passportDoc({ expirationDate: "2029-03-12" })]),
      });
      await findBtn(section, "Save").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.updateDocument).toHaveBeenCalledWith(
        1,
        12,
        expect.objectContaining({ documentTypeId: 2, documentNumber: "P123", expirationDate: "2029-03-12" })
      );
      const reopened = wrapper.find('[data-testid="review-document-view"]');
      expect(reopened.find('[data-testid="review-document-edit-section"]').exists()).toBe(false);
      expect(details(wrapper)).toContain("Expiration date: 03/12/2029");
      expect(reopened.find('[data-testid="review-document-notice"]').text()).toBe("Document saved.");

      await findBtn(reopened, "Edit").trigger("click");
      const again = reopened.find('[data-testid="review-document-edit-section"]');
      await again.find('[data-testid="review-edit-number"] input').setValue("P999");
      await findBtn(again, "Close").trigger("click");
      expect(reopened.find('[data-testid="review-document-edit-section"]').exists()).toBe(false);
      expect(details(wrapper)).toContain("Document number: P123");
      expect(TripPeopleRoleServices.updateDocument).toHaveBeenCalledTimes(1);
      wrapper.unmount();
    });

    it("Reviewed documents can't be edited until unticked", async () => {
      const wrapper = await openReview([passportDoc({ reviewed: true })]);
      const viewer = await openViewer(wrapper);

      expect(findBtn(viewer, "Edit").props("disabled")).toBe(true);
      expect(viewer.find('[data-testid="review-document-edit-hint"]').text()).toBe("Untick Reviewed to edit.");
      expect(findBtn(viewer, "Request reload").props("disabled")).toBe(false);
      wrapper.unmount();
    });
  });

  describe("US-120.2 — Ask for a new file", () => {
    it("Request reload sends the email and marks the document", async () => {
      const wrapper = await openReview([passportDoc({ reviewed: true })]);
      const viewer = await openViewer(wrapper);

      await findBtn(viewer, "Request reload").trigger("click");
      const section = viewer.find('[data-testid="review-document-reload-section"]');
      expect(section.exists()).toBe(true);
      await section.find("textarea").setValue("The photo page is blurry.");
      TripPeopleRoleServices.requestDocumentReload.mockResolvedValue({
        data: { id: 12, reviewed: false, reloadRequestedAt: "2026-11-05T15:00:00.000Z", emailSent: true, templateFound: true },
      });
      await findBtn(section, "Send request").trigger("click");
      await flushPromises();

      expect(TripPeopleRoleServices.requestDocumentReload).toHaveBeenCalledWith(1, 12, "The photo page is blurry.");
      expect(viewer.find('[data-testid="review-document-reload-section"]').exists()).toBe(false);
      expect(viewer.find('[data-testid="review-document-notice"]').text()).toBe(
        "Reload requested. Email sent to Pat Lee."
      );
      expect(findBtn(viewer, "Edit").props("disabled")).toBe(false);
      const listed = wrapper.find('[data-testid="review-document"]');
      expect(listed.find('[data-testid="document-reload-requested"]').text()).toMatch(
        /^Reload requested \d{2}\/\d{2}\/2026$/
      );
      expect(listed.find('input[type="checkbox"]').element.checked).toBe(false);

      await findBtn(viewer, "Request reload").trigger("click");
      TripPeopleRoleServices.requestDocumentReload.mockResolvedValue({
        data: { id: 12, reviewed: false, reloadRequestedAt: "2026-11-05T15:00:00.000Z", emailSent: false, templateFound: false },
      });
      await findBtn(viewer.find('[data-testid="review-document-reload-section"]'), "Send request").trigger("click");
      await flushPromises();
      expect(viewer.find('[data-testid="review-document-notice"]').text()).toBe(
        "Reload requested. No email was sent. Add a Send Now template for the Document reload requested email type."
      );
      wrapper.unmount();
    });
  });

  describe("US-120.3 — Reviewed documents stay as reviewed", () => {
    it("Reviewed documents are locked everywhere", async () => {
      const wrapper = await mountProfile([
        {
          id: 12,
          documentTypeId: 2,
          documentType: { description: "Passport" },
          documentFileName: "people/p.png",
          expirationDate: "2029-03-13",
          reviewed: true,
          reloadRequestedAt: null,
        },
        {
          id: 13,
          documentTypeId: 2,
          documentType: { description: "Passport" },
          documentFileName: "people/p2.png",
          expirationDate: "2036-01-31",
          reviewed: false,
          reloadRequestedAt: "2026-11-05T15:00:00.000Z",
        },
      ]);

      const rows = wrapper.findAll("tbody tr");
      const labels = (row) => row.findAllComponents({ name: "VBtn" }).map((b) => b.text().trim());
      expect(labels(rows[0])).toEqual(["View", "Download"]);
      expect(labels(rows[1])).toEqual(["View", "Edit", "Download", "Delete"]);
      expect(rows).toHaveLength(3);
      expect(rows[1].find('[data-testid="document-reload-requested"]').exists()).toBe(false);
      expect(rows[2].find('[data-testid="document-reload-requested"]').text()).toMatch(/^Reload requested /);
      expect(rows[0].find('[data-testid="document-reload-requested"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("Expired documents are marked on the profile", async () => {
      const wrapper = await mountProfile([
        { id: 11, documentTypeId: 1, documentType: { description: "RN License" }, documentFileName: "people/rn.png", expirationDate: "2025-01-31" },
        { id: 12, documentTypeId: 2, documentType: { description: "Passport" }, documentFileName: "people/p.png", expirationDate: "2029-03-13" },
      ]);

      const rows = wrapper.findAll("tbody tr");
      expect(rows[0].find('[data-testid="document-expired"]').text()).toBe("Expired");
      expect(rows[1].find('[data-testid="document-expired"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("US-120.4 — The newest document counts", () => {
    it("The document expiring last is used for the trip", async () => {
      const wrapper = await openReview([
        passportDoc({ id: 14, documentNumber: "P456", expirationDate: "2036-01-31", current: true }),
        passportDoc({ reviewed: true, current: false }),
      ]);

      const docs = wrapper.findAll('[data-testid="review-document"]');
      expect(docs[0].find('[data-testid="review-current-document"]').text()).toBe("Used for this trip");
      expect(docs[1].find('[data-testid="review-current-document"]').exists()).toBe(false);
      wrapper.unmount();

      const older = { id: 1, documentFileName: "a.pdf", issueDate: "2019-03-14", expirationDate: "2029-03-13" };
      const renewed = { id: 2, documentFileName: "b.pdf", issueDate: "2026-02-01", expirationDate: "2036-01-31" };
      const noFile = { id: 3, documentFileName: null, expirationDate: "2040-01-01" };
      expect(currentDocument([older, renewed, noFile])).toBe(renewed);
      const permission = (fields) => ({ documentType: { type: "doctor_permission", hasExpirationDate: true }, ...fields });
      expect(
        isDoctorPermissionUploaded({
          documents: [
            permission({ id: 1, documentFileName: "old.pdf", expirationDate: "2027-12-31" }),
            permission({ id: 2, documentFileName: "new.pdf", issueDate: "2026-06-01", expirationDate: "2027-01-01" }),
          ],
          isPregnant: true,
          doctorPermissionRequired: true,
          compareDate: "2027-03-10",
        })
      ).toBe(true);
    });
  });
});
