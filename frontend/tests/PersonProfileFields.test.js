/**
 * Feature 17 — Organization Medical Conditions & Person Selections
 * Spec: features/feature-17-org-medical-conditions.md
 * Feature 19 — Pregnancy Health Questions
 * Spec: features/feature-19-pregnancy-health-questions.md
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

const DOCTOR_MSG =
  "You must provide a document from your doctor that says it is safe for you to travel on the trip dates.";

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

describe("PersonProfileFields — Feature 19", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MedicalConditionServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Pregnancy question appears after allergies for female", async () => {
    const form = reactive({
      gender: "female",
      hasAllergies: false,
      isPregnant: null,
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, healthOnly: true },
    });
    await flushPromises();

    const labels = wrapper.findAllComponents({ name: "VSelect" }).map((c) => c.props("label"));
    const allergiesIdx = labels.indexOf("Have allergies?");
    const pregnantIdx = labels.indexOf("Are you pregnant?");
    const medIdx = labels.indexOf("Take medication?");
    expect(pregnantIdx).toBeGreaterThan(-1);
    expect(allergiesIdx).toBeLessThan(pregnantIdx);
    expect(pregnantIdx).toBeLessThan(medIdx);
    wrapper.unmount();
  });

  it("Due date appears when pregnant is Yes", async () => {
    const form = reactive({
      gender: "female",
      hasAllergies: false,
      isPregnant: true,
      pregnancyDueDate: "",
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, healthOnly: true },
    });
    await flushPromises();

    const due = wrapper.findAllComponents({ name: "VTextField" }).find((c) =>
      c.props("label") === "Due date"
    );
    expect(due).toBeTruthy();
    wrapper.unmount();
  });

  it("Doctor document message appears when pregnant is Yes", async () => {
    const form = reactive({
      gender: "female",
      hasAllergies: false,
      isPregnant: true,
      pregnancyDueDate: "2026-12-01",
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, healthOnly: true },
    });
    await flushPromises();

    expect(wrapper.text()).toContain(DOCTOR_MSG);
    wrapper.unmount();
  });

  it("Pregnancy question is hidden for male", async () => {
    const form = reactive({
      gender: "male",
      hasAllergies: false,
      isPregnant: null,
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, healthOnly: true },
    });
    await flushPromises();

    const pregnant = wrapper.findAllComponents({ name: "VSelect" }).find((c) =>
      c.props("label") === "Are you pregnant?"
    );
    expect(pregnant).toBeFalsy();
    expect(wrapper.text()).not.toContain(DOCTOR_MSG);
    wrapper.unmount();
  });

  it("Pregnancy question is hidden when gender is unanswered", async () => {
    const form = reactive({
      gender: null,
      hasAllergies: false,
      isPregnant: null,
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form, healthOnly: true },
    });
    await flushPromises();

    const pregnant = wrapper.findAllComponents({ name: "VSelect" }).find((c) =>
      c.props("label") === "Are you pregnant?"
    );
    expect(pregnant).toBeFalsy();
    wrapper.unmount();
  });
});
