/**
 * Feature 39 — Email Types and Organization Email Templates
 * Spec: features/feature-39-email-types-and-templates.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTemplateFormDialog from "../src/components/EmailTemplateFormDialog.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/emailTemplateServices.js", () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getCopySources: vi.fn(),
  },
}));

vi.mock("../src/services/emailTypeServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn() },
}));

import EmailTypeServices from "../src/services/emailTypeServices.js";
import TripServices from "../src/services/tripServices.js";
import EmailTemplateServices from "../src/services/emailTemplateServices.js";

describe("Feature 39 — Email Types and Organization Email Templates", () => {
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
    EmailTypeServices.getAll.mockResolvedValue({
      data: [
        {
          id: 8,
          typeCode: "apply-received",
          description: "Application received",
          eventCode: "application-submitted",
        },
      ],
    });
    TripServices.getAll.mockResolvedValue({ data: [] });
    EmailTemplateServices.getCopySources.mockResolvedValue({ data: [] });
  });

  it("Existing template form has Email type and Function code dropdowns", async () => {
    const { wrapper } = await mountWithPlugins(EmailTemplateFormDialog, {
      props: { modelValue: true, orgId: 3 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const selects = wrapper.findAllComponents({ name: "VSelect" });
    const emailType = selects.find((select) => select.props("label") === "Email type");
    const functionCode = selects.find((select) => select.props("label") === "Function code");

    expect(emailType).toBeTruthy();
    expect(emailType.props("items").map((item) => item.title)).toContain("Application received");
    expect(functionCode).toBeTruthy();
    expect(functionCode.props("items").map((item) => item.title)).toEqual(["Scheduled", "Send Now"]);

    wrapper.unmount();
  });
});
