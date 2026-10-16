/**
 * Feature 39 — Email Types and Organization Email Templates
 * Spec: features/feature-39-email-types-and-templates.md
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
 * Feature 41 — Email Template To Address
 * Spec: features/feature-41-email-template-to-address.md
 * Feature 42 — Email Template Schedule
 * Spec: features/feature-42-email-template-schedule.md
 * Feature 46 — Email Trip Team
 * Spec: features/feature-46-email-trip-team.md
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
    expect(functionCode.props("items").map((item) => item.title)).toEqual([
      "Scheduled",
      "Send Now",
      "Trip Participant",
    ]);

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
    expect(insertSelects).toHaveLength(4);
    const bodyInsert = insertSelects[3];
    expect(bodyInsert.props("items").map((item) => item.title)).toContain("{{TRIP_NAME}} — Trip name");

    bodyInsert.vm.$emit("update:modelValue", "TRIP_NAME");
    await flushPromises();

    expect(body.element.value).toBe("Hello {{TRIP_NAME}} team");
    expect(bodyInsert.props("modelValue")).toBeNull();

    wrapper.unmount();
  });
});

describe("Feature 41 — Email Template To Address", () => {
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
          tokenCode: "PARTICIPANT_EMAIL",
          description: "Participant email",
          valueSource: "participant.email",
        },
      ],
    });
    TripServices.getAll.mockResolvedValue({ data: [] });
    EmailTemplateServices.getCopySources.mockResolvedValue({ data: [] });
  });

  const mountForm = () =>
    mountWithPlugins(EmailTemplateFormDialog, {
      props: { modelValue: true, orgId: 3 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });

  it("Template form shows To after From email", async () => {
    const { wrapper } = await mountForm();
    await flushPromises();

    const labels = wrapper
      .findAllComponents({ name: "VTextField" })
      .map((field) => field.props("label"))
      .filter((label) => label !== "Insert token");
    const from = labels.indexOf("From email");
    expect(from).toBeGreaterThan(-1);
    expect(labels[from + 1]).toBe("To");

    wrapper.unmount();
  });

  it("To token list shows only email tokens", async () => {
    const { wrapper } = await mountForm();
    await flushPromises();

    const toInsert = wrapper
      .findAllComponents({ name: "VSelect" })
      .filter((select) => select.props("label") === "Insert token")[2];
    const titles = toInsert.props("items").map((item) => item.title);

    expect(titles).toContain("{{PARTICIPANT_EMAIL}} — Participant email");
    expect(titles.some((title) => title.includes("TRIP_NAME"))).toBe(false);

    wrapper.unmount();
  });

  it("Template form sets From email from the token list", async () => {
    EmailTokenServices.getAll.mockResolvedValue({
      data: [
        { id: 3, tokenCode: "ORG_EMAIL", description: "Organization email", valueSource: "organization.email" },
      ],
    });
    const { wrapper } = await mountForm();
    await flushPromises();

    const fromField = wrapper
      .findAllComponents({ name: "VTextField" })
      .find((field) => field.props("label") === "From email");
    await fromField.find("input").setValue("old@example.org");

    const fromInsert = wrapper
      .findAllComponents({ name: "VSelect" })
      .filter((select) => select.props("label") === "Insert token")[1];
    fromInsert.vm.$emit("update:modelValue", "ORG_EMAIL");
    await flushPromises();

    expect(fromField.find("input").element.value).toBe("{{ORG_EMAIL}}");
    expect(fromInsert.props("modelValue")).toBeNull();

    wrapper.unmount();
  });
});

describe("Feature 42 — Email Template Schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOrgAdminUser();
    EmailTypeServices.getAll.mockResolvedValue({ data: [] });
    EmailTokenServices.getAll.mockResolvedValue({ data: [] });
    TripServices.getAll.mockResolvedValue({ data: [] });
    EmailTemplateServices.getCopySources.mockResolvedValue({ data: [] });
  });

  const mountForm = () =>
    mountWithPlugins(EmailTemplateFormDialog, {
      props: { modelValue: true, orgId: 3 },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });

  const selectByLabel = (wrapper, label) =>
    wrapper.findAllComponents({ name: "VSelect" }).find((select) => select.props("label") === label);

  const choose = async (wrapper, label, value) => {
    selectByLabel(wrapper, label).vm.$emit("update:modelValue", value);
    await flushPromises();
  };

  it("Schedule shows only for scheduled templates", async () => {
    const { wrapper } = await mountForm();
    await flushPromises();

    await choose(wrapper, "Function code", "Scheduled");
    const labels = wrapper.findAllComponents({ name: "VSelect" }).map((select) => select.props("label"));
    expect(labels[labels.indexOf("Function code") + 1]).toBe("Schedule");
    expect(selectByLabel(wrapper, "Schedule").props("items").map((item) => item.title)).toEqual([
      "Daily",
      "Weekly (Tuesday)",
      "Days before trip start",
    ]);

    await choose(wrapper, "Function code", "Send Now");
    expect(selectByLabel(wrapper, "Schedule")).toBeUndefined();

    wrapper.unmount();
  });

  it("Days before trip start shows for that schedule", async () => {
    const { wrapper } = await mountForm();
    await flushPromises();

    await choose(wrapper, "Function code", "Scheduled");
    const daysField = () =>
      wrapper
        .findAllComponents({ name: "VTextField" })
        .find((field) => field.props("label") === "Days before trip start");
    expect(daysField()).toBeUndefined();

    await choose(wrapper, "Schedule", "before-start");
    expect(daysField()).toBeTruthy();

    wrapper.unmount();
  });

  describe("Feature 46 — Email Trip Team", () => {
    it("Template form offers Trip Participant function code", async () => {
      const { wrapper } = await mountForm();
      await flushPromises();

      expect(
        selectByLabel(wrapper, "Function code").props("items").map((item) => item.title)
      ).toEqual(["Scheduled", "Send Now", "Trip Participant"]);

      await choose(wrapper, "Function code", "Trip Participant");
      expect(selectByLabel(wrapper, "Schedule")).toBeUndefined();

      wrapper.unmount();
    });
  });
});
