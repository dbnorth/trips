/**
 * Feature 59 — Document Type Specialization List
 * Spec: features/feature-59-document-type-specialization-list.md
 */

import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import WorkerRoleFormDialog from "../src/components/WorkerRoleFormDialog.vue";
import WorkerRoleServices from "../src/services/workerRoleServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/workerRoleServices.js", () => ({
  default: { get: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn() },
}));

describe("Feature 59 — Document Type Specialization List", () => {
  it("Worker role form offers specializations for required documents", async () => {
    DocumentTypeServices.getAll.mockResolvedValue({
      data: [
        {
          id: 7,
          description: "Board certification",
          type: "certification",
          allowSpecialization: true,
          specializations: [
            { id: 71, name: "Emergency" },
            { id: 72, name: "Pediatrics" },
          ],
        },
        { id: 8, description: "Passport", type: "passport", allowSpecialization: false, specializations: [] },
      ],
    });
    WorkerRoleServices.create.mockResolvedValue({ data: { id: 1 } });

    const { wrapper } = await mountWithPlugins(WorkerRoleFormDialog, {
      props: { modelValue: true, orgId: 1 },
      global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
    });
    await flushPromises();

    const select = (label) =>
      wrapper.findAllComponents({ name: "VSelect" }).find((c) => c.props("label") === label);
    const label = "Required specializations for Board certification";
    expect(select(label)).toBeFalsy();

    await wrapper
      .findAllComponents({ name: "VTextField" })
      .find((c) => c.props("label") === "Name")
      .vm.$emit("update:modelValue", "Pediatric Nurse");
    await select("Required documents").vm.$emit("update:modelValue", [7]);
    await flushPromises();

    expect(select(label).props("items").map((item) => item.title)).toEqual([
      "Emergency",
      "Pediatrics",
    ]);

    await select(label).vm.$emit("update:modelValue", [72]);
    await wrapper
      .findAllComponents({ name: "VBtn" })
      .find((b) => b.text().trim() === "Save")
      .trigger("click");
    await flushPromises();

    expect(WorkerRoleServices.create).toHaveBeenCalledWith(
      expect.objectContaining({ requiredDocumentTypeIds: [7], requiredSpecializationIds: [72] })
    );

    wrapper.unmount();
  });
});
