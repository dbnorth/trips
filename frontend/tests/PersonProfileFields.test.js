/**
 * Feature 17 — Organization Medical Conditions & Person Selections
 * Spec: features/feature-17-org-medical-conditions.md
 * Feature 19 — Pregnancy Health Questions
 * Spec: features/feature-19-pregnancy-health-questions.md
 * Feature 47 — Simplify Application Warnings
 * Spec: features/feature-47-simplify-application-warnings.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { reactive, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import PersonProfileFields from "../src/components/PersonProfileFields.vue";
import MedicalConditionServices from "../src/services/medicalConditionServices.js";
import LanguageServices from "../src/services/languageServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/medicalConditionServices.js", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

vi.mock("../src/services/languageServices.js", () => ({
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

    const text = wrapper.text();
    expect(text).toContain("Are you pregnant?");
    expect(text.indexOf("Have allergies?")).toBeLessThan(text.indexOf("Are you pregnant?"));
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

describe("Feature 31 — Person Other Languages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LanguageServices.getAll.mockResolvedValue({
      data: [{ id: 1, code: "es", name: "Spanish" }],
    });
  });

  describe("US-31.1 — Say whether you speak a language other than English", () => {
    it("Other language question starts unanswered", async () => {
      const form = reactive({
        speaksOtherLanguage: null,
        languages: [],
        takesMedication: null,
      });

      const { wrapper } = await mountWithPlugins(PersonProfileFields, {
        props: { modelValue: form },
      });
      await flushPromises();

      const question = wrapper.findAllComponents({ name: "VSelect" }).find(
        (c) => c.props("label") === "Do you speak a language other than English?"
      );
      expect(question).toBeTruthy();
      expect(question.props("modelValue")).toBeNull();
      expect(wrapper.text()).not.toContain("Add language");
      wrapper.unmount();
    });

    it("Other language rows hidden when answer is No", async () => {
      const form = reactive({
        speaksOtherLanguage: false,
        languages: [],
        takesMedication: null,
      });

      const { wrapper } = await mountWithPlugins(PersonProfileFields, {
        props: { modelValue: form },
      });
      await flushPromises();

      expect(wrapper.text()).not.toContain("Add language");
      expect(wrapper.text()).not.toContain("Do you know medical terminology in this language?");
      wrapper.unmount();
    });
  });
});

describe("Feature 32 — Emergency Contact Relationship", () => {
  describe("US-32.1 — Choose the emergency contact relationship", () => {
    it("Relationship dropdown lists the seven options", async () => {
      const form = reactive({
        emergencyContactName: "",
        emergencyContactRelationship: null,
      });

      const { wrapper } = await mountWithPlugins(PersonProfileFields, {
        props: { modelValue: form },
      });
      await flushPromises();

      const select = wrapper.findAllComponents({ name: "VSelect" }).find(
        (c) => c.props("label") === "Emergency contact relationship"
      );
      expect(select).toBeTruthy();
      expect(select.props("items").map((item) => item.title)).toEqual([
        "Spouse",
        "Father",
        "Mother",
        "Child",
        "Grand Mother",
        "Grand Father",
        "Other",
      ]);
      wrapper.unmount();
    });
  });
});

describe("Feature 47 — Simplify Application Warnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MedicalConditionServices.getAll.mockResolvedValue({ data: [] });
    LanguageServices.getAll.mockResolvedValue({
      data: [{ id: 1, code: "es", name: "Spanish" }],
    });
  });

  const byLabel = (wrapper, name, label) =>
    wrapper.findAllComponents({ name }).find((c) => c.props("label") === label);

  describe("US-47.3 — Profile health answers are display-only on the application", () => {
    it("Profile health answers are display-only on the application", async () => {
      const form = reactive({
        hasAllergies: true,
        allergiesDescription: "Peanuts",
        takesMedication: false,
        speaksOtherLanguage: true,
        languages: [{ languageId: 1, fluency: "basic", knowsMedicalTerminology: false }],
      });

      const { wrapper } = await mountWithPlugins(PersonProfileFields, {
        props: { modelValue: form, healthOnly: true, orgId: 10 },
      });
      await flushPromises();

      const text = wrapper.text();
      expect(text).toContain("Have allergies? Yes");
      expect(text).toContain("Allergies description: Peanuts");
      expect(text).toContain("Take medication? No");
      expect(text).toContain("Do you speak a language other than English? Yes");
      expect(text).toContain("Spanish: Basic; medical terminology: No");
      expect(wrapper.findAllComponents({ name: "VSelect" })).toHaveLength(0);
      expect(wrapper.findAllComponents({ name: "VTextarea" })).toHaveLength(0);
      expect(wrapper.findAllComponents({ name: "VAutocomplete" })).toHaveLength(0);
      expect(text).not.toContain("Add language");
      expect(text).not.toContain("Remove");
      const note =
        "If your contact information or other personal information has changed, please update your profile. " +
        "Your health and language information below comes from your profile.";
      expect(text).toContain(note);
      expect(text.indexOf(note)).toBeLessThan(text.indexOf("Health information"));
      expect(text.indexOf("Health information")).toBeLessThan(text.indexOf("Have allergies?"));

      const updateProfile = wrapper.findAll("button").find((b) => b.text() === "Update profile");
      await updateProfile.trigger("click");
      expect(wrapper.emitted("update-profile")).toHaveLength(1);
      wrapper.unmount();
    });

    it("Pregnancy questions stay editable on the application", async () => {
      const form = reactive({
        gender: "female",
        hasAllergies: false,
        isPregnant: null,
        takesMedication: false,
      });

      const { wrapper } = await mountWithPlugins(PersonProfileFields, {
        props: { modelValue: form, healthOnly: true },
      });
      await flushPromises();

      const pregnant = byLabel(wrapper, "VSelect", "Are you pregnant?");
      expect(pregnant).toBeTruthy();
      expect(pregnant.props("disabled")).toBe(false);
      pregnant.vm.$emit("update:modelValue", true);
      expect(wrapper.emitted("update:modelValue").at(-1)[0].isPregnant).toBe(true);
      wrapper.unmount();
    });

    it("Pregnancy question appears below the language question", async () => {
      MedicalConditionServices.getAll.mockResolvedValue({
        data: [{ id: 1, name: "Diabetes", orgId: 10 }],
      });
      const form = reactive({
        gender: "female",
        hasAllergies: false,
        isPregnant: null,
        takesMedication: true,
        medicalConditionIds: [1],
        speaksOtherLanguage: true,
        languages: [{ languageId: 1, fluency: "conversational", knowsMedicalTerminology: true }],
      });

      const { wrapper } = await mountWithPlugins(PersonProfileFields, {
        props: { modelValue: form, healthOnly: true, orgId: 10 },
      });
      await flushPromises();

      const text = wrapper.text();
      const pregnantIdx = text.indexOf("Are you pregnant?");
      expect(text).toContain("Medical conditions: Diabetes");
      expect(text.indexOf("Take medication?")).toBeLessThan(pregnantIdx);
      expect(text.indexOf("Medical conditions:")).toBeLessThan(pregnantIdx);
      expect(text.indexOf("Medical conditions:")).toBeLessThan(text.indexOf("Language"));
      expect(text.indexOf("Language")).toBeLessThan(
        text.indexOf("Do you speak a language other than English?")
      );
      expect(text.indexOf("Do you speak a language other than English?")).toBeLessThan(pregnantIdx);
      expect(text.indexOf("Spanish:")).toBeLessThan(text.indexOf("Current Health"));
      expect(text.indexOf("Current Health")).toBeLessThan(pregnantIdx);
      wrapper.unmount();
    });
  });
});

describe("Feature 36 — Allergies Description Hint", () => {
  it("Allergies description explains what to enter", async () => {
    const form = reactive({
      hasAllergies: true,
      allergiesDescription: "",
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form },
    });
    await flushPromises();

    const field = wrapper
      .findAllComponents({ name: "VTextarea" })
      .find((c) => c.props("label") === "Allergies description");
    expect(field).toBeTruthy();
    expect(field.props("hint")).toBe("Enter any medicine, food, or seasonal allergies.");
    expect(field.props("persistentHint")).toBe(true);

    wrapper.unmount();
  });

  it("Allergies description stays hidden when there are no allergies", async () => {
    const form = reactive({
      hasAllergies: false,
      allergiesDescription: "",
      takesMedication: null,
    });

    const { wrapper } = await mountWithPlugins(PersonProfileFields, {
      props: { modelValue: form },
    });
    await flushPromises();

    const field = wrapper
      .findAllComponents({ name: "VTextarea" })
      .find((c) => c.props("label") === "Allergies description");
    expect(field).toBeFalsy();

    wrapper.unmount();
  });
});
