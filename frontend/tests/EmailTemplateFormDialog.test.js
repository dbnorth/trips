/**
 * Feature 39 — Email Types and Organization Email Templates
 * Spec: features/feature-39-email-types-and-templates.md
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
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

vi.mock("../src/services/emailTokenServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn() },
}));

import EmailTypeServices from "../src/services/emailTypeServices.js";
import EmailTokenServices from "../src/services/emailTokenServices.js";
import TripServices from "../src/services/tripServices.js";
import EmailTemplateServices from "../src/services/emailTemplateServices.js";

const setOrgAdminUser = () =>
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

describe("Feature 39 — Email Types and Organization Email Templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOrgAdminUser();
    EmailTokenServices.getAll.mockResolvedValue({ data: [] });
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

describe("Feature 40 — Email Template Tokens and Preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOrgAdminUser();
    EmailTypeServices.getAll.mockResolvedValue({ data: [] });
    EmailTokenServices.getAll.mockResolvedValue({
      data: [
        { id: 1, tokenCode: "TRIP_NAME", description: "Trip name", valueSource: "trip.name" },
        {
          id: 2,
          tokenCode: "PARTICIPANT_FIRST_NAME",
          description: "Participant first name",
          valueSource: "participant.firstName",
        },
      ],
    });
    TripServices.getAll.mockResolvedValue({ data: [] });
    EmailTemplateServices.getCopySources.mockResolvedValue({ data: [] });
  });

  it("Template form inserts a token into the email body", async () => {
    const { wrapper } = await mountWithPlugins(EmailTemplateFormDialog, {
      props: { modelValue: true, orgId: 3 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const body = wrapper.find("textarea");
    await body.setValue("Hello  team");
    body.element.setSelectionRange(6, 6);
    await body.trigger("blur");

    const insertSelects = wrapper
      .findAllComponents({ name: "VSelect" })
      .filter((select) => select.props("label") === "Insert token");
    expect(insertSelects).toHaveLength(2);
    const bodyInsert = insertSelects[1];
    expect(bodyInsert.props("items").map((item) => item.title)).toContain("{{TRIP_NAME}} — Trip name");

    bodyInsert.vm.$emit("update:modelValue", "TRIP_NAME");
    await flushPromises();

    expect(body.element.value).toBe("Hello {{TRIP_NAME}} team");
    expect(bodyInsert.props("modelValue")).toBeNull();

    wrapper.unmount();
  });
});
