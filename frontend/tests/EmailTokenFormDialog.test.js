/**
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTokenFormDialog from "../src/components/EmailTokenFormDialog.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/emailTokenServices.js", () => ({
  default: {
    getValueSources: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

import EmailTokenServices from "../src/services/emailTokenServices.js";

describe("Feature 40 — Email Template Tokens and Preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    EmailTokenServices.getValueSources.mockResolvedValue({
      data: [
        { valueSource: "trip.name", label: "Trip name" },
        { valueSource: "primaryLeader.email", label: "Primary trip leader email" },
      ],
    });
  });

  it("Token form shows token code, description, and value source", async () => {
    const { wrapper } = await mountWithPlugins(EmailTokenFormDialog, {
      props: { modelValue: true },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const fieldLabels = wrapper.findAllComponents({ name: "VTextField" }).map((field) => field.props("label"));
    expect(fieldLabels).toContain("Token code");
    expect(fieldLabels).toContain("Description");

    const valueSource = wrapper
      .findAllComponents({ name: "VSelect" })
      .find((select) => select.props("label") === "Value source");
    expect(valueSource).toBeTruthy();
    expect(valueSource.props("items").map((item) => item.title)).toEqual([
      "Trip name",
      "Primary trip leader email",
    ]);

    wrapper.unmount();
  });
});
