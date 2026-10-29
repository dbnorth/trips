/**
 * Feature 97 — Document File Thumbnail in the Edit Document Dialog
 * Spec: features/feature-97-document-file-thumbnail.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import { pdfFirstPageUrl } from "../src/utils/pdfThumbnail.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/personDocumentServices.js", () => ({
  default: { getAll: vi.fn(), view: vi.fn(), download: vi.fn() },
}));

vi.mock("../src/utils/pdfThumbnail.js", () => ({ pdfFirstPageUrl: vi.fn() }));

const passport = {
  id: 1,
  description: "Passport",
  type: "passport",
  documentNumberRequired: false,
  hasExpirationDate: true,
};

const passportRow = (documentFileName) => ({
  id: 7,
  documentTypeId: 1,
  documentType: passport,
  expirationDate: "2031-06-15",
  documentFileName,
  specializations: [],
});

const mountCard = async (documentFileName) => {
  PersonDocumentServices.getAll.mockResolvedValue({ data: [passportRow(documentFileName)] });
  const { wrapper } = await mountWithPlugins(PersonDocumentsCard, {
    props: { personId: 5 },
    global: {
      stubs: { VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' } },
    },
  });
  await flushPromises();
  return wrapper;
};

const clickButton = async (wrapper, label) => {
  const button = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === label);
  expect(button, label).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
};

const currentFile = (wrapper) => wrapper.find('[data-testid="current-file"]');

describe("Feature 97 — Document File Thumbnail in the Edit Document Dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.revokeObjectURL = vi.fn();
    DocumentTypeServices.getAll.mockResolvedValue({ data: [passport] });
    PersonDocumentServices.view.mockResolvedValue({ url: "blob:jpg", type: "image/jpeg" });
  });

  describe("US-97.1 — See the uploaded file while editing a document", () => {
    it("Editing a document with an image shows its thumbnail", async () => {
      const wrapper = await mountCard("people/person-5-1700000000000-B_North.jpg");

      await clickButton(wrapper, "Edit");

      expect(currentFile(wrapper).find("img").attributes("src")).toBe("blob:jpg");
      expect(currentFile(wrapper).text()).toContain("B_North.jpg");
      expect(currentFile(wrapper).text()).not.toContain("person-5-");
    });

    it("Editing a document with a PDF shows its first page", async () => {
      PersonDocumentServices.view.mockResolvedValue({ url: "blob:pdf", type: "application/pdf" });
      pdfFirstPageUrl.mockResolvedValue("blob:first-page");
      const wrapper = await mountCard("people/person-5-1700000000000-passport.pdf");

      await clickButton(wrapper, "Edit");

      expect(pdfFirstPageUrl).toHaveBeenCalledWith("blob:pdf");
      expect(currentFile(wrapper).find("img").attributes("src")).toBe("blob:first-page");
      expect(currentFile(wrapper).text()).toContain("passport.pdf");
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:pdf");
    });

    it("A document without a file says so", async () => {
      const wrapper = await mountCard(null);

      await clickButton(wrapper, "Edit");
      expect(currentFile(wrapper).text()).toContain("No file uploaded");
      expect(PersonDocumentServices.view).not.toHaveBeenCalled();

      await clickButton(wrapper, "Cancel");
      await clickButton(wrapper, "Add Document");
      expect(currentFile(wrapper).exists()).toBe(false);
    });

    it("A file that can't be previewed shows its name", async () => {
      const wrapper = await mountCard("people/person-5-1700000000000-B_North.HEIC");

      await clickButton(wrapper, "Edit");

      expect(currentFile(wrapper).text()).toContain("Preview not available");
      expect(currentFile(wrapper).text()).toContain("B_North.HEIC");
      expect(currentFile(wrapper).find("img").exists()).toBe(false);
      expect(PersonDocumentServices.view).not.toHaveBeenCalled();
    });

    it("Clicking the thumbnail opens View", async () => {
      const wrapper = await mountCard("people/person-5-1700000000000-B_North.jpg");
      await clickButton(wrapper, "Edit");
      const issueDate = wrapper.findAll("input").find((input) => input.attributes("type") === "date");
      await issueDate.setValue("2021-06-15");
      PersonDocumentServices.view.mockResolvedValue({ url: "blob:view", type: "image/jpeg" });

      await wrapper.find('[data-testid="current-file-thumbnail"]').trigger("click");
      await flushPromises();

      expect(PersonDocumentServices.view).toHaveBeenLastCalledWith(5, expect.objectContaining({ id: 7 }), null);
      expect(wrapper.find('img[src="blob:view"]').exists()).toBe(true);

      await clickButton(wrapper, "Close");
      expect(wrapper.find('img[src="blob:view"]').exists()).toBe(false);
      expect(currentFile(wrapper).exists()).toBe(true);
      expect(issueDate.element.value).toBe("2021-06-15");
    });
  });
});
