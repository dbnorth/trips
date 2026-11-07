/**
 * Feature 124 — Expired Document Marker
 * Spec: features/feature-124-expired-document-marker.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ReviewDocumentsDialog from "../src/components/ReviewDocumentsDialog.vue";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { documentReview: vi.fn(), setDocumentReviewed: vi.fn(), viewDocument: vi.fn() },
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

const localDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const profileDoc = (id, fields = {}) => ({
  id,
  documentTypeId: 2,
  documentType: { description: "Passport", type: "passport" },
  documentFileName: `people/${id}.png`,
  reviewed: false,
  reloadRequestedAt: null,
  ...fields,
});

const mountProfile = async (documents, props = {}) => {
  PersonDocumentServices.getAll.mockResolvedValue({ data: documents });
  const { wrapper } = await mountWithPlugins(PersonDocumentsCard, {
    props: { personId: 5, ...props },
    global: { stubs: { VDialog: dialogStub } },
  });
  await flushPromises();
  return wrapper;
};

const rowLabels = (row) => row.findAllComponents({ name: "VBtn" }).map((b) => b.text().trim());

describe("Feature 124 — Expired Document Marker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("US-124.1 — See expired documents on my profile", () => {
    it("Document expiring today shows as expired", async () => {
      const wrapper = await mountProfile([profileDoc(11, { expirationDate: localDate(0) })]);

      const row = wrapper.findAll("tbody tr")[0];
      expect(row.find('[data-testid="document-expired"]').text()).toBe("Expired");
      wrapper.unmount();
    });

    it("Document expiring tomorrow is not expired", async () => {
      const wrapper = await mountProfile([
        profileDoc(11, { expirationDate: localDate(1) }),
        profileDoc(12, { documentType: { description: "Diploma", type: "diploma" }, expirationDate: null }),
      ]);

      const rows = wrapper.findAll("tbody tr");
      expect(rows).toHaveLength(2);
      expect(wrapper.find('[data-testid="document-expired"]').exists()).toBe(false);
      wrapper.unmount();
    });

    it("Replaced document stays expired", async () => {
      const wrapper = await mountProfile([
        profileDoc(11, { expirationDate: localDate(-30), reviewed: true }),
        profileDoc(12, { expirationDate: localDate(5 * 365) }),
      ]);

      const rows = wrapper.findAll("tbody tr");
      expect(rows[0].find('[data-testid="document-expired"]').text()).toBe("Expired");
      expect(rowLabels(rows[0])).toEqual(["View", "Download"]);
      expect(rows[1].find('[data-testid="document-expired"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("US-124.2 — See expired documents when reviewing and applying", () => {
    it("Review documents shows expired documents", async () => {
      const reviewDoc = (id, expirationDate) => ({
        id,
        documentTypeId: 2,
        description: "Passport",
        documentNumber: `P${id}`,
        expirationDate,
        hasExpirationDate: true,
        hasFile: true,
        reviewed: false,
        reloadRequestedAt: null,
        current: false,
        specializations: [],
      });
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: {
          workerRoleName: "Nurse",
          requirements: [
            {
              key: "passport",
              label: "Passport",
              requiredSpecializations: [],
              documents: [reviewDoc(14, localDate(365)), reviewDoc(12, localDate(0))],
            },
          ],
          approvalBlockers: [],
          documentTypes: [],
        },
      });
      const { wrapper } = await mountWithPlugins(ReviewDocumentsDialog, {
        props: { modelValue: true, participant: { id: 1, person: { firstName: "Pat", lastName: "Lee" } } },
        global: { stubs: { VDialog: dialogStub } },
      });
      await flushPromises();

      const docs = wrapper.findAll('[data-testid="review-document"]');
      expect(docs[0].find('[data-testid="document-expired"]').exists()).toBe(false);
      expect(docs[1].find('[data-testid="document-expired"]').text()).toBe("Expired");
      wrapper.unmount();
    });

    it("Doctor Permission line shows expired documents", async () => {
      const wrapper = await mountProfile(
        [
          profileDoc(21, {
            documentType: { description: "Doctor Permission", type: "doctor_permission", hasExpirationDate: true },
            expirationDate: localDate(0),
          }),
        ],
        { orgId: 10, onlyType: "doctor_permission", validThrough: localDate(-1) }
      );

      const line = wrapper.find('[data-testid="only-type-documents"]');
      expect(line.text()).toContain("Doctor Permission uploaded");
      expect(line.find('[data-testid="document-expired"]').text()).toBe("Expired");
      wrapper.unmount();
    });
  });
});
