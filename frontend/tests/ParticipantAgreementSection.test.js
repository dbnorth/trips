/**
 * Feature 18 — Organization Medical Agreement on Applications
 * Spec: features/feature-18-org-medical-agreement.md
 */

import { describe, it, expect } from "vitest";
import { nextTick } from "vue";
import ParticipantAgreementSection from "../src/components/ParticipantAgreementSection.vue";
import { mountWithPlugins } from "./testUtils.js";

describe("ParticipantAgreementSection — Feature 18", () => {
  it("Participation agreement checkbox uses the new label", async () => {
    const { wrapper } = await mountWithPlugins(ParticipantAgreementSection, {
      props: {
        content: "# Hello\n\nTerms.",
        canAgree: true,
      },
    });
    await nextTick();

    const checkbox = wrapper.findAllComponents({ name: "VCheckbox" }).find(
      (c) => c.props("label") === "I agree to the Participation agreement"
    );
    expect(checkbox).toBeTruthy();
    wrapper.unmount();
  });

  it("Signature text applies to the I agree checkboxes", async () => {
    const { wrapper } = await mountWithPlugins(ParticipantAgreementSection, {
      props: {
        content: "# Hello\n\nTerms.",
        canAgree: true,
      },
    });
    await nextTick();

    expect(wrapper.text()).toContain(
      "each agreement I accept using the I agree checkboxes below"
    );
    wrapper.unmount();
  });

  it("Medical agreement appears when Take medication is Yes", async () => {
    const { wrapper } = await mountWithPlugins(ParticipantAgreementSection, {
      props: {
        content: "# Participant\n\nTerms.",
        showMedicalAgreement: true,
        medicalAgreementContent: "# Medical\n\nDisclose conditions.",
        canAgree: true,
      },
    });
    await nextTick();

    expect(wrapper.text()).toContain("Medical agreement");
    expect(wrapper.text()).toContain("Disclose conditions.");
    const medicalCheckbox = wrapper.findAllComponents({ name: "VCheckbox" }).find(
      (c) => c.props("label") === "I agree to the medical agreement"
    );
    expect(medicalCheckbox).toBeTruthy();
    wrapper.unmount();
  });

  it("Medical agreement is hidden when Take medication is not Yes", async () => {
    const { wrapper } = await mountWithPlugins(ParticipantAgreementSection, {
      props: {
        content: "# Participant\n\nTerms.",
        showMedicalAgreement: false,
        medicalAgreementContent: "# Medical\n\nShould not show.",
        canAgree: true,
      },
    });
    await nextTick();

    expect(wrapper.text()).not.toContain("Should not show.");
    const medicalCheckbox = wrapper.findAllComponents({ name: "VCheckbox" }).find(
      (c) => c.props("label") === "I agree to the medical agreement"
    );
    expect(medicalCheckbox).toBeFalsy();
    wrapper.unmount();
  });
});
