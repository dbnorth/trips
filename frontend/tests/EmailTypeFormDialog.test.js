/**
 * Feature 39 — Email Types and Organization Email Templates
 * Spec: features/feature-39-email-types-and-templates.md
 */

import { describe, it, expect, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTypeFormDialog from "../src/components/EmailTypeFormDialog.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

describe("Feature 39 — Email Types and Organization Email Templates", () => {
  it("Email type form shows type code, description, and event code", async () => {
    const { wrapper } = await mountWithPlugins(EmailTypeFormDialog, {
      props: { modelValue: true },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const labels = wrapper.findAllComponents({ name: "VTextField" }).map((field) => field.props("label"));
    expect(labels).toContain("Type code");
    expect(labels).toContain("Description");
    expect(labels).toContain("Event code");

    wrapper.unmount();
  });
});
