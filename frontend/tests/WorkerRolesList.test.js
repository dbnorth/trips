/**
 * Worker roles list — required documents column
 * Spec: features/feature-25-worker-role-required-documents.md, features/feature-59-document-type-specialization-list.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import WorkerRolesList from "../src/views/WorkerRolesList.vue";
import WorkerRoleServices from "../src/services/workerRoleServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/workerRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/components/WorkerRoleFormDialog.vue", () => ({
  default: { name: "WorkerRoleFormDialog", template: "<div />", props: ["modelValue"] },
}));

describe("Worker roles list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "orgadmin@example.com",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Hope Mission", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
  });

  it("Required documents column lists required document types with their required specializations", async () => {
    WorkerRoleServices.getAll.mockResolvedValue({
      data: [
        {
          id: 1,
          name: "Doctor",
          status: "active",
          documentType: null,
          requiredDocumentTypes: [
            { id: 10, description: "Board certification", allowSpecialization: true },
            { id: 11, description: "Passport", allowSpecialization: false },
            { id: 12, description: "Nursing licence", allowSpecialization: false },
          ],
          requiredSpecializations: [
            { id: 101, name: "Pediatrics", documentTypeId: 10 },
            { id: 100, name: "Emergency", documentTypeId: 10 },
            { id: 102, name: "ER", documentTypeId: 12 },
          ],
        },
        {
          id: 2,
          name: "Cook",
          status: "active",
          documentType: null,
          requiredDocumentTypes: [],
          requiredSpecializations: [],
        },
      ],
    });

    const { wrapper } = await mountWithPlugins(WorkerRolesList);
    await flushPromises();

    const headers = wrapper.findAll("th").map((th) => th.text());
    expect(headers).toContain("Required documents");
    expect(headers).not.toContain("License required");
    const rows = wrapper.findAll("tbody tr").map((tr) => tr.text());
    expect(rows[0]).toContain("Board certification (Emergency, Pediatrics), Passport, Nursing licence");
    expect(rows[0]).not.toContain("ER");
    expect(rows[1]).toContain("—");

    wrapper.unmount();
  });
});
