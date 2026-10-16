/**
 * Feature 18 — Organization Medical Agreement editor UI
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import OrganizationAgreementDialog from "../src/components/OrganizationAgreementDialog.vue";
import OrganizationServices from "../src/services/organizationServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    getMedicalAgreement: vi.fn(),
    saveMedicalAgreement: vi.fn(),
    getAgreement: vi.fn(),
    saveAgreement: vi.fn(),
  },
}));

describe("OrganizationAgreementDialog — Feature 18 medical", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    OrganizationServices.getMedicalAgreement.mockResolvedValue({
      data: { content: "", exists: false, medicalAgreementFileName: null },
    });
    OrganizationServices.saveMedicalAgreement.mockResolvedValue({
      data: {
        content: "# Medical\n\nSaved.",
        exists: true,
        medicalAgreementFileName: "agreements/org-1-medical-agreement-stamp.md",
      },
    });
  });

  it("Medical agreement is editable from organization edit UI", async () => {
    const { wrapper } = await mountWithPlugins(OrganizationAgreementDialog, {
      props: {
        modelValue: true,
        organizationId: 1,
        organizationName: "Test Org",
        kind: "medical",
      },
      global: {
        stubs: {
          VDialog: { template: "<div><slot /></div>" },
        },
      },
    });
    await flushPromises();
    await nextTick();

    expect(OrganizationServices.getMedicalAgreement).toHaveBeenCalledWith(1);
    expect(wrapper.text()).toContain("Medical agreement");

    const textarea = wrapper.findComponent({ name: "VTextarea" });
    expect(textarea.exists()).toBe(true);
    await textarea.vm.$emit("update:modelValue", "# Medical\n\nSaved.");
    await nextTick();

    const saveBtn = wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text() === "Save");
    await saveBtn.trigger("click");
    await flushPromises();

    expect(OrganizationServices.saveMedicalAgreement).toHaveBeenCalledWith(
      1,
      "# Medical\n\nSaved."
    );
    wrapper.unmount();
  });
});
