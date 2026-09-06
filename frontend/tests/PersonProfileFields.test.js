/**
 * Feature 17 — Organization Medical Conditions & Person Selections
 * Spec: features/feature-17-org-medical-conditions.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { reactive, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import PersonProfileFields from "../src/components/PersonProfileFields.vue";
import MedicalConditionServices from "../src/services/medicalConditionServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/medicalConditionServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

describe("PersonProfileFields — Feature 17", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MedicalConditionServices.getAll.mockResolvedValue({
      data: [
        { id: 1, name: "Diabetes", orgId: 10 },
        { id: 2, name: "Asthma", orgId: 10 },
      ],
    });
  });

  it("Condition list appears when Take medication is Yes", async () => {
    const form = reactive({
      takesMedication: true,
      medicalConditionIds: [],
      hasAllergies: false,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, orgId: 10 },
    });
    await flushPromises();
    await nextTick();

    expect(MedicalConditionServices.getAll).toHaveBeenCalledWith({ orgId: 10 });
    const select = wrapper.findAllComponents({ name: "VSelect" }).find((c) =>
      c.props("label") === "Medical conditions"
    );
    expect(select).toBeTruthy();
    expect(select.props("items").map((i) => i.title)).toEqual(
      expect.arrayContaining(["Diabetes", "Asthma"])
    );
    wrapper.unmount();
  });

  it("Condition list is hidden when Take medication is No", async () => {
    const form = reactive({
      takesMedication: false,
      medicalConditionIds: [],
      hasAllergies: false,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, orgId: 10 },
    });
    await flushPromises();
    await nextTick();

    const select = wrapper.findAllComponents({ name: "VSelect" }).find((c) =>
      c.props("label") === "Medical conditions"
    );
    expect(select).toBeFalsy();
    expect(MedicalConditionServices.getAll).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
