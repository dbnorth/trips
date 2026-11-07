/**
 * Feature 42 — Email Template Schedule
 * Spec: features/feature-42-email-template-schedule.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTemplatesList from "../src/views/EmailTemplatesList.vue";
import EmailTemplateServices from "../src/services/emailTemplateServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/emailTemplateServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/components/EmailTemplateFormDialog.vue", () => ({
  default: { name: "EmailTemplateFormDialog", template: "<div />", props: ["modelValue"] },
}));

const templateRow = (fields) => ({
  orgId: 3,
  tripId: null,
  functionCode: "Scheduled",
  subject: "Reminder",
  fromEmail: "trips@example.org",
  organization: { id: 3, name: "Hope Mission" },
  ...fields,
});

describe("Feature 42 — Email Template Schedule", () => {
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
  });

  describe("US-42.2 — See each template's schedule in the list", () => {
    it("Template list shows the schedule", async () => {
      EmailTemplateServices.getAll.mockResolvedValue({
        data: [
          templateRow({ id: 1, scheduleRule: "weekly", scheduleDaysBefore: null }),
          templateRow({ id: 2, scheduleRule: "before-start", scheduleDaysBefore: 5 }),
        ],
      });

      const { wrapper } = await mountWithPlugins(EmailTemplatesList);
      await flushPromises();

      const headers = wrapper.findAll("th").map((th) => th.text());
      expect(headers[headers.indexOf("Function code") + 1]).toBe("Schedule");
      expect(wrapper.text()).toContain("Weekly (Tuesday)");
      expect(wrapper.text()).toContain("5 days before trip start");

      wrapper.unmount();
    });
  });

  describe("Feature 123 — Monthly Email Schedules", () => {
    it("Template list shows the monthly schedule", async () => {
      EmailTemplateServices.getAll.mockResolvedValue({
        data: [templateRow({ id: 1, scheduleRule: "monthly", scheduleDayOfMonth: 10 })],
      });

      const { wrapper } = await mountWithPlugins(EmailTemplatesList);
      await flushPromises();

      expect(wrapper.text()).toContain("Monthly (day 10)");
      wrapper.unmount();
    });

    it("Template list shows the twice monthly schedule", async () => {
      EmailTemplateServices.getAll.mockResolvedValue({
        data: [templateRow({ id: 1, scheduleRule: "twice-monthly" })],
      });

      const { wrapper } = await mountWithPlugins(EmailTemplatesList);
      await flushPromises();

      expect(wrapper.text()).toContain("Twice monthly (1st and 15th)");
      wrapper.unmount();
    });
  });
});
