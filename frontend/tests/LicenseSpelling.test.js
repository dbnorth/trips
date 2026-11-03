/**
 * Feature 107 — Spell "License" the US Way
 * Spec: features/feature-107-license-spelling.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import DocumentTypeFormDialog from "../src/components/DocumentTypeFormDialog.vue";
import DocumentTypesList from "../src/views/DocumentTypesList.vue";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/documentTypeServices.js", () => ({
  default: { getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

const dialogStub = { template: "<div><slot /></div>" };

describe("Feature 107 — Spell License the US Way", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "olivia@example.org",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Mission Health", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
  });

  describe("US-107.1 — Document types say License", () => {
    it("The Type list says Medical License", async () => {
      const { wrapper: form } = await mountWithPlugins(DocumentTypeFormDialog, {
        props: { modelValue: true, documentTypeId: null, orgId: 3 },
        global: { stubs: { VDialog: dialogStub } },
      });
      await flushPromises();

      const typeSelect = form.findAllComponents({ name: "VSelect" }).find((s) => s.props("label") === "Type");
      const titles = typeSelect.props("items").map((o) => o.title);
      expect(titles).toContain("Medical License");
      expect(titles).not.toContain("Medical Licence");
      expect(typeSelect.props("items").find((o) => o.title === "Medical License").value).toBe("medical_license");
      form.unmount();

      DocumentTypeServices.getAll.mockResolvedValue({
        data: [{ id: 1, orgId: 3, description: "Registered Nurse License (RN)", type: "medical_license" }],
      });
      const { wrapper: list } = await mountWithPlugins(DocumentTypesList);
      await flushPromises();

      const row = list.findAll("tbody tr").find((tr) => tr.text().includes("Registered Nurse License (RN)"));
      expect(row.text()).toContain("Medical License");
      expect(row.text()).not.toContain("medical_license");
      list.unmount();
    });
  });
});
