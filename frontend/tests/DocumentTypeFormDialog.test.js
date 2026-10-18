/**
 * Feature 57 — Document Type Has Expiration Date
 * Spec: features/feature-57-document-type-expiration-date.md
 *
 * Feature 59 — Document Type Specialization List
 * Spec: features/feature-59-document-type-specialization-list.md
 */

import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import DocumentTypeFormDialog from "../src/components/DocumentTypeFormDialog.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

describe("Feature 57 — Document Type Has Expiration Date", () => {
  it("Document type form shows Has Expiration Date", async () => {
    const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
      props: { modelValue: true },
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await flushPromises();

    const checkbox = wrapper
      .findAllComponents({ name: "VCheckbox" })
      .find((c) => c.props("label") === "Has Expiration Date");
    expect(checkbox).toBeTruthy();
    expect(checkbox.props("modelValue")).toBe(true);

    wrapper.unmount();
  });
});

describe("Feature 59 — Document Type Specialization List", () => {
  it("Document type form edits the specialization list", async () => {
    DocumentTypeServices.get.mockResolvedValue({
      data: {
        id: 3,
        description: "Board certification",
        type: "certification",
        allowSpecialization: true,
        hasExpirationDate: true,
        specializations: [],
      },
    });
    DocumentTypeServices.update.mockResolvedValue({ data: { id: 3 } });

    const { wrapper } = await mountWithPlugins(DocumentTypeFormDialog, {
      props: { modelValue: false, documentTypeId: 3 },
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    const nameField = () =>
      wrapper
        .findAllComponents({ name: "VTextField" })
        .find((c) => c.props("label") === "Specialization name");
    const clickButton = async (label) => {
      await wrapper
        .findAllComponents({ name: "VBtn" })
        .find((b) => b.text().trim() === label)
        .trigger("click");
      await flushPromises();
    };

    for (const name of ["Pediatrics", "Emergency"]) {
      await nameField().vm.$emit("update:modelValue", name);
      await clickButton("Add");
    }
    await clickButton("Save");

    expect(DocumentTypeServices.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        allowSpecialization: true,
        specializations: [
          { id: null, name: "Pediatrics" },
          { id: null, name: "Emergency" },
        ],
      })
    );

    const allow = wrapper
      .findAllComponents({ name: "VCheckbox" })
      .find((c) => c.props("label") === "Allow Specialization");
    await allow.vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(wrapper.find('[data-testid="specialization-list"]').exists()).toBe(false);

    wrapper.unmount();
  });
});
