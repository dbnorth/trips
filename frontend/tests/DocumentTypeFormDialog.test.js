/**
 * Feature 57 — Document Type Has Expiration Date
 * Spec: features/feature-57-document-type-expiration-date.md
 */

import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import DocumentTypeFormDialog from "../src/components/DocumentTypeFormDialog.vue";
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
