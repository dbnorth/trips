/**
 * Feature 49 — Organization Email Test Mode
 * Spec: features/feature-49-organization-email-test-mode.md
 */

import { describe, it, expect } from "vitest";
import OrganizationFormFields from "../src/components/OrganizationFormFields.vue";
import { emptyOrganizationForm } from "../src/utils/organizationForm.js";
import { mountWithPlugins } from "./testUtils.js";

describe("Feature 49 — Organization Email Test Mode", () => {
  describe("US-49.1 — Turn test mode on for an organization", () => {
    it("Organization form shows Test mode", async () => {
      const { wrapper } = await mountWithPlugins(OrganizationFormFields, {
        props: { modelValue: emptyOrganizationForm() },
      });

      const text = wrapper.text();
      expect(text).toContain("Test mode");
      expect(text.indexOf("Test mode")).toBeGreaterThan(text.indexOf("Email"));
      expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
    });
  });
});
