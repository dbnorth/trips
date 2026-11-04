/**
 * Feature 118 — Email Report
 * Spec: features/feature-118-email-report.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTemplatesList from "../src/views/EmailTemplatesList.vue";
import EmailTemplateServices from "../src/services/emailTemplateServices.js";
import ExportServices from "../src/services/exportServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/emailTemplateServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: { emailReportPdf: vi.fn() },
}));

vi.mock("../src/components/EmailTemplateFormDialog.vue", () => ({
  default: { name: "EmailTemplateFormDialog", template: "<div />", props: ["modelValue"] },
}));

const mountList = async (user) => {
  Utils.setStore("user", { token: "t", tripRoles: [], orgRoles: [], ...user });
  const { wrapper } = await mountWithPlugins(EmailTemplatesList);
  await flushPromises();
  return wrapper;
};

const reportButton = (wrapper) => wrapper.find('[data-testid="email-report-button"]');

describe("Feature 118 — Email Report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    EmailTemplateServices.getAll.mockResolvedValue({ data: [] });
    ExportServices.emailReportPdf.mockResolvedValue();
  });

  describe("US-118.1 — Download an organization's email report", () => {
    it("Email Report button downloads the report", async () => {
      const wrapper = await mountList({
        userId: 2,
        personId: 2,
        isAdmin: false,
        orgRoles: [{ orgId: 3, orgName: "Hope Missions", roleName: "Org Admin" }],
        currentOrgId: 3,
      });

      expect(reportButton(wrapper).text()).toBe("Email Report");
      await reportButton(wrapper).trigger("click");
      await flushPromises();

      expect(ExportServices.emailReportPdf).toHaveBeenCalledWith("Hope Missions");
      wrapper.unmount();
    });

    it("Email Report button only for admins with an organization", async () => {
      const tom = await mountList({
        userId: 4,
        personId: 4,
        isAdmin: false,
        orgRoles: [{ orgId: 3, orgName: "Hope Missions", roleName: "Trip Participant" }],
        tripRoles: [{ tripId: 9, tripName: "Guatemala Clinic", orgId: 3, roleName: "Trip Leader" }],
        currentOrgId: 3,
      });
      expect(reportButton(tom).exists()).toBe(false);
      tom.unmount();

      const sam = await mountList({ userId: 1, personId: 1, isAdmin: true, actingOrganizationId: null });
      expect(reportButton(sam).exists()).toBe(false);
      sam.unmount();
    });
  });
});
