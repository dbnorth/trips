/**
 * Feature 96 — Convert HEIC Uploads to JPEG
 * Spec: features/feature-96-heic-to-jpeg-on-upload.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(), view: vi.fn(), download: vi.fn() },
}));

const passport = {
  id: 1,
  description: "Passport",
  type: "passport",
  documentNumberRequired: false,
  hasExpirationDate: true,
};

describe("Feature 96 — Convert HEIC Uploads to JPEG", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentTypeServices.getAll.mockResolvedValue({ data: [passport] });
    PersonDocumentServices.getAll.mockResolvedValue({
      data: [
        {
          id: 7,
          documentTypeId: 1,
          documentType: passport,
          expirationDate: "2031-06-15",
          documentFileName: "people/person-5-1700000000000-B_North.HEIC",
          specializations: [],
        },
      ],
    });
  });

  describe("US-96.1 — HEIC documents can be viewed and downloaded as JPEG", () => {
    it("A leftover HEIC document shows a message instead of the image", async () => {
      const { wrapper } = await mountWithPlugins(PersonDocumentsCard, {
        props: { personId: 5 },
        global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
      });
      await flushPromises();

      const view = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === "View");
      await view.trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("This HEIC file can't be previewed. You can still download it.");
      expect(PersonDocumentServices.view).not.toHaveBeenCalled();
      expect(wrapper.find("img").exists()).toBe(false);
    });
  });
});
