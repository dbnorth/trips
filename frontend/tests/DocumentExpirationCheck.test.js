/**
 * Feature 115 — Document Expiration Check
 * Spec: features/feature-115-document-expiration-check.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import DocumentTypeFormDialog from "../src/components/DocumentTypeFormDialog.vue";
import DocumentTypesList from "../src/views/DocumentTypesList.vue";
import ViewTripApplicationDialog from "../src/components/ViewTripApplicationDialog.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { get: vi.fn(), getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: {
    get: vi.fn(),
    update: vi.fn(),
    documentReview: vi.fn(),
    setDocumentReviewed: vi.fn(),
    viewDocument: vi.fn(),
    viewSpecialization: vi.fn(),
  },
}));
vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn(), getBrowseTrip: vi.fn(), getApplication: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(), getPictureUrl: vi.fn(() => null) },
}));
vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })), view: vi.fn() },
}));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({
  default: { getAll: vi.fn(() => Promise.resolve({ data: [] })) },
}));

const dialogStub = { template: "<div><slot /></div>" };

const findBtn = (wrapper, text) =>
  wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === text);

describe("Feature 115 — Document Expiration Check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-115.1 — Choose how a document's expiration is checked", () => {
    it("Expiration check shows only with an expiration date", async () => {
      const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
        props: { modelValue: true },
        global: { stubs: { VDialog: dialogStub } },
      });
      await flushPromises();

      const select = () =>
        wrapper.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === "Expiration check");
      expect(select().props("modelValue")).toBe("trip_end");
      expect(select().props("items").map((item) => item.title)).toEqual([
        "After trip end date",
        "On or after trip end date",
        "90 days after trip end date",
        "180 days after trip end date",
      ]);

      wrapper
        .findAllComponents({ name: "VCheckbox" })
        .find((c) => c.props("label") === "Has Expiration Date")
        .vm.$emit("update:modelValue", false);
      await flushPromises();

      expect(select()).toBeUndefined();
      wrapper.unmount();
    });

    it("Document types list shows the expiration check", async () => {
      DocumentTypeServices.getAll.mockResolvedValue({
        data: [
          { id: 1, orgId: 4, description: "RN License", type: "medical_license", hasExpirationDate: true, expirationCheck: "trip_end_90" },
          { id: 2, orgId: 4, description: "Diploma", type: "diploma", hasExpirationDate: false, expirationCheck: "trip_end" },
        ],
      });
      Utils.setStore("user", {
        userId: 2,
        personId: 2,
        isAdmin: false,
        token: "t",
        orgRoles: [{ orgId: 4, orgName: "Hope Missions", roleName: "Org Admin" }],
        tripRoles: [],
        currentOrgId: 4,
        currentOrgName: "Hope Missions",
      });

      const { wrapper } = await mountWithPlugins(DocumentTypesList, {
        global: { stubs: { DocumentTypeFormDialog: true } },
      });
      await flushPromises();

      const rows = wrapper.findAll("tbody tr").map((tr) => tr.findAll("td").map((td) => td.text()));
      expect(wrapper.text()).toContain("Expiration check");
      expect(rows.find((cells) => cells[0] === "RN License")[2]).toBe("90 days after trip end date");
      expect(rows.find((cells) => cells[0] === "Diploma")[2]).toBe("—");
      wrapper.unmount();
    });
  });

  describe("US-115.3 — Approve only when documents meet the expiration check", () => {
    it("Approve App disabled while documents miss the check", async () => {
      TripPeopleRoleServices.get.mockResolvedValue({
        data: {
          id: 1,
          tripId: 42,
          peopleId: 5,
          status: "pre_approved",
          version: 1,
          role: { roleName: "Trip Participant" },
          person: { firstName: "Maria", lastName: "Lopez" },
        },
      });
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: { approvalBlockers: ["RN License: not uploaded"] },
      });

      const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
        props: { modelValue: false, participantId: 1, mode: "approve" },
        global: { stubs: { VDialog: dialogStub } },
      });
      await wrapper.setProps({ modelValue: true });
      await flushPromises();

      const blockers = wrapper.find('[data-testid="approval-blockers"]');
      expect(blockers.findAll("li").map((li) => li.text())).toEqual(["RN License: not uploaded"]);
      expect(findBtn(wrapper, "Approve App").props("disabled")).toBe(true);
      wrapper.unmount();
    });
  });
});
