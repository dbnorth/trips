/**
 * Feature 22 — Document Type Number Required & Instructions
 * Spec: features/feature-22-document-number-and-instructions.md
 *
 * Feature 24 — Document Type Diploma
 * Spec: features/feature-24-document-type-diploma.md
 *
 * Feature 57 — Document Type Has Expiration Date
 * Spec: features/feature-57-document-type-expiration-date.md
 *
 * Feature 59 — Document Type Specialization List
 * Spec: features/feature-59-document-type-specialization-list.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import DocumentTypeFormDialog from "../src/components/DocumentTypeFormDialog.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import { DOCUMENT_TYPE_OPTIONS } from "../src/utils/documentTypes.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../src/services/personDocumentServices.js", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
    view: vi.fn(),
  },
}));

vi.mock("../src/components/CountrySelect.vue", () => ({
  default: {
    name: "CountrySelect",
    props: ["modelValue", "label", "defaultEmptyToUs", "errorMessages"],
    emits: ["update:modelValue"],
    template: `
      <div class="country-select-stub" :data-label="label">
        <span v-if="errorMessages && errorMessages.length" class="field-error">{{ errorMessages }}</span>
      </div>
    `,
  },
}));

const dialogStub = { template: "<div><slot /></div>" };

const mountCard = (props) =>
  mountWithPlugins(PersonDocumentsCard, {
    props,
    global: { stubs: { VDialog: dialogStub } },
  });

const clickButton = async (wrapper, label) => {
  const button = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === label);
  expect(button).toBeTruthy();
  await button.trigger("click");
  await flushPromises();
  return button;
};

const types = [
  {
    id: 1,
    description: "Passport",
    type: "passport",
    documentNumberRequired: true,
    instructions: "Upload a clear photo of the photo page.",
  },
  {
    id: 2,
    description: "Medical Licence",
    type: "medical_licence",
    documentNumberRequired: false,
    instructions: null,
  },
];

describe("Feature 22 — Document number & instructions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentTypeServices.getAll.mockResolvedValue({ data: types });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
  });

  it("System Admin saves document number required and instructions", async () => {
    DocumentTypeServices.create.mockResolvedValue({
      data: {
        id: 9,
        description: "Passport",
        type: "passport",
        documentNumberRequired: true,
        instructions: "Bring original.",
      },
    });

    const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
      props: { modelValue: true },
      global: { stubs: { VDialog: dialogStub } },
    });
    await flushPromises();

    const description = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Description");
    await description.vm.$emit("update:modelValue", "Passport");

    const typeSelect = wrapper.findAllComponents({ name: "VSelect" })[0];
    await typeSelect.vm.$emit("update:modelValue", "passport");

    const checkbox = wrapper.findComponent({ name: "VCheckbox" });
    expect(checkbox.props("label")).toBe("Document number required");
    await checkbox.vm.$emit("update:modelValue", true);

    const instructions = wrapper.findComponent({ name: "VTextarea" });
    expect(instructions.props("label")).toBe("Instructions");
    await instructions.vm.$emit("update:modelValue", "Bring original.");
    await flushPromises();

    const saveBtn = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text() === "Save");
    await saveBtn.trigger("click");
    await flushPromises();

    expect(DocumentTypeServices.create).toHaveBeenCalledWith({
      description: "Passport",
      type: "passport",
      documentNumberRequired: true,
      allowSpecialization: false,
      hasExpirationDate: true,
      instructions: "Bring original.",
      specializations: [],
    });

    wrapper.unmount();
  });

  it("Admin type dropdown includes Diploma", async () => {
    expect(DOCUMENT_TYPE_OPTIONS.map((o) => o.value)).toContain("diploma");
    expect(DOCUMENT_TYPE_OPTIONS.find((o) => o.value === "diploma")?.title).toBe("Diploma");

    const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
      props: { modelValue: true },
      global: { stubs: { VDialog: dialogStub } },
    });
    await flushPromises();

    const typeSelect = wrapper.findAllComponents({ name: "VSelect" })[0];
    const items = typeSelect.props("items") || [];
    expect(items.map((i) => i.value)).toContain("diploma");
    expect(items.find((i) => i.value === "diploma")?.title).toBe("Diploma");

    wrapper.unmount();
  });

  it("Instructions display when adding a document", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");

    const typeSelect = wrapper.findComponent({ name: "VSelect" });
    await typeSelect.vm.$emit("update:modelValue", 1);
    await flushPromises();

    expect(wrapper.text()).toContain("Upload a clear photo of the photo page.");

    wrapper.unmount();
  });

  it("Document number field shows only when required", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");

    const typeSelect = wrapper.findComponent({ name: "VSelect" });
    await typeSelect.vm.$emit("update:modelValue", 1);
    await flushPromises();

    let numberField = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Document number");
    expect(numberField).toBeTruthy();

    await typeSelect.vm.$emit("update:modelValue", 2);
    await flushPromises();

    numberField = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Document number");
    expect(numberField).toBeFalsy();

    wrapper.unmount();
  });

  it("Add document shows field errors when required fields are empty", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");
    await clickButton(wrapper, "Save");

    expect(PersonDocumentServices.create).not.toHaveBeenCalled();

    const typeSelect = wrapper.findComponent({ name: "VSelect" });
    expect(typeSelect.props("errorMessages")).toBe("Document type is required.");

    const issueDate = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Issue date");
    expect(issueDate.props("errorMessages")).toBe("Issue date is required.");

    const expirationDate = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Expiration date");
    expect(expirationDate.props("errorMessages")).toBe("Expiration date is required.");

    const fileInput = wrapper.findComponent({ name: "VFileInput" });
    expect(fileInput.props("errorMessages") || "").toBe("");

    wrapper.unmount();
  });

  it("Edit loads an existing document into the form", async () => {
    PersonDocumentServices.getAll.mockResolvedValue({
      data: [
        {
          id: 44,
          documentTypeId: 1,
          documentNumber: "P999",
          countryIssued: "US",
          issueDate: "2020-01-01",
          expirationDate: "2030-01-01",
          documentFileName: "people/passport.png",
          documentType: types[0],
        },
      ],
    });
    PersonDocumentServices.update.mockResolvedValue({ data: { id: 44 } });

    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();

    const editBtn = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === "Edit");
    expect(editBtn).toBeTruthy();
    await editBtn.trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Edit Document");
    const numberField = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Document number");
    expect(numberField.props("modelValue")).toBe("P999");

    const saveBtn = wrapper
      .findAllComponents({ name: "VBtn" })
      .find((b) => b.text().trim() === "Save");
    await saveBtn.trigger("click");
    await flushPromises();

    expect(PersonDocumentServices.update).toHaveBeenCalledWith(
      5,
      44,
      expect.objectContaining({
        documentTypeId: 1,
        documentNumber: "P999",
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
      })
    );

    wrapper.unmount();
  });
});

describe("Feature 34 — Document Specializations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentTypeServices.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
          description: "Board certification",
          type: "certification",
          allowSpecialization: true,
        },
        {
          id: 2,
          description: "Passport",
          type: "passport",
          allowSpecialization: false,
        },
      ],
    });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Document type form shows Allow Specialization", async () => {
    const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
      props: { modelValue: true },
      global: { stubs: { VDialog: dialogStub } },
    });
    await flushPromises();

    const checkbox = wrapper
      .findAllComponents({ name: "VCheckbox" })
      .find((c) => c.props("label") === "Allow Specialization");
    expect(checkbox).toBeTruthy();
    expect(checkbox.props("modelValue")).toBe(false);

    wrapper.unmount();
  });

  it("Specializations appear only when the document type allows them", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");

    const typeSelect = wrapper.findComponent({ name: "VSelect" });
    await typeSelect.vm.$emit("update:modelValue", 1);
    await flushPromises();

    expect(wrapper.text()).toContain("Specializations");
    expect(wrapper.text()).toContain("Add specialization");

    await typeSelect.vm.$emit("update:modelValue", 2);
    await flushPromises();

    expect(wrapper.text()).not.toContain("Add specialization");

    wrapper.unmount();
  });
});

describe("Feature 35 — Person Document Add Dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentTypeServices.getAll.mockResolvedValue({ data: types });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Person documents are a list without an inline form", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();

    expect(wrapper.text()).toContain("No documents");
    expect(wrapper.text()).toContain("Add Document");
    const typeField = wrapper
      .findAllComponents({ name: "VSelect" })
      .find((c) => c.props("label") === "Document type");
    expect(typeField).toBeFalsy();

    wrapper.unmount();
  });

  it("Add Document opens a dialog with Save and Cancel", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");

    const title = wrapper.findComponent({ name: "VCardTitle" });
    expect(title.text()).toBe("Add Document");
    expect(wrapper.text()).toContain("Save");
    expect(wrapper.text()).toContain("Cancel");
    const typeField = wrapper
      .findAllComponents({ name: "VSelect" })
      .find((c) => c.props("label") === "Document type");
    expect(typeField).toBeTruthy();

    wrapper.unmount();
  });

  it("Cancel closes the add document dialog", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");
    await clickButton(wrapper, "Cancel");

    const typeField = wrapper
      .findAllComponents({ name: "VSelect" })
      .find((c) => c.props("label") === "Document type");
    expect(typeField).toBeFalsy();
    expect(PersonDocumentServices.create).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});

describe("Feature 57 — Document Type Has Expiration Date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentTypeServices.getAll.mockResolvedValue({
      data: [
        { id: 1, description: "Passport", type: "passport", hasExpirationDate: true },
        { id: 2, description: "Diploma", type: "diploma", hasExpirationDate: false },
      ],
    });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Expiration date is hidden for a type without one", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");

    const expirationField = () =>
      wrapper
        .findAllComponents({ name: "VTextField" })
        .find((c) => c.props("label") === "Expiration date");
    const typeSelect = wrapper.findComponent({ name: "VSelect" });

    await typeSelect.vm.$emit("update:modelValue", 2);
    await flushPromises();
    expect(expirationField()).toBeFalsy();

    await typeSelect.vm.$emit("update:modelValue", 1);
    await flushPromises();
    expect(expirationField()).toBeTruthy();

    wrapper.unmount();
  });
});

describe("Feature 59 — Document Type Specialization List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentTypeServices.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
          description: "Board certification",
          type: "certification",
          allowSpecialization: true,
          specializations: [
            { id: 11, name: "Emergency" },
            { id: 12, name: "Pediatrics" },
          ],
        },
      ],
    });
    PersonDocumentServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Specialization is chosen from the document type's list", async () => {
    const { wrapper } = await mountCard({ personId: 5 });
    await flushPromises();
    await clickButton(wrapper, "Add Document");

    const typeSelect = wrapper.findComponent({ name: "VSelect" });
    await typeSelect.vm.$emit("update:modelValue", 1);
    await flushPromises();
    await clickButton(wrapper, "Add specialization");

    const specializationSelects = () =>
      wrapper
        .findAllComponents({ name: "VSelect" })
        .filter((c) => c.props("label") === "Specialization");
    const offered = (select) => select.props("items").map((item) => item.title);

    expect(specializationSelects()).toHaveLength(1);
    expect(offered(specializationSelects()[0])).toEqual(["Emergency", "Pediatrics"]);

    await specializationSelects()[0].vm.$emit("update:modelValue", 12);
    await flushPromises();
    await clickButton(wrapper, "Add specialization");

    expect(offered(specializationSelects()[1])).toEqual(["Emergency"]);
    const addButton = wrapper
      .findAllComponents({ name: "VBtn" })
      .find((b) => b.text().trim() === "Add specialization");
    expect(addButton.props("disabled")).toBe(true);

    wrapper.unmount();
  });
});
