/**
 * Feature 122 — Approve Action Colors (US-122.3 Approve App checklist)
 * Spec: features/feature-122-approve-action-colors.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ViewTripApplicationDialog from "../src/components/ViewTripApplicationDialog.vue";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { get: vi.fn(), update: vi.fn(), documentReview: vi.fn() },
}));

const PAT_ROW = {
  id: 1,
  status: "pre_approved",
  version: 1,
  person: { firstName: "Pat", lastName: "Lee" },
};

const openApproveDialog = async () => {
  const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
    props: { modelValue: false, participantId: 1, mode: "approve" },
    global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
};

const findButton = (wrapper, label) => wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text() === label);
const approveButton = (wrapper) => findButton(wrapper, "Approve App");

const listed = (wrapper, testId) =>
  wrapper.find(`[data-testid="${testId}"]`).findAll("li").map((li) => li.text());

describe("Feature 122 — Approve Action Colors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripPeopleRoleServices.get.mockResolvedValue({ data: PAT_ROW });
  });

  describe("US-122.3 — Approve App lists everything missing", () => {
    it("Approve App lists missing profile, application, and document items", async () => {
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: {
          profileMissing: ["Emergency contact relationship"],
          applicationMissing: ["Funding (self-fund and/or raise funds)"],
          approvalBlockers: ["RN License: not reviewed"],
        },
      });
      const wrapper = await openApproveDialog();

      expect(wrapper.find('[data-testid="approval-profile-missing"]').text()).toContain(
        "Before approving, the profile needs:"
      );
      expect(listed(wrapper, "approval-profile-missing")).toEqual(["Emergency contact relationship"]);
      expect(wrapper.find('[data-testid="approval-application-missing"]').text()).toContain(
        "Before approving, the application needs:"
      );
      expect(listed(wrapper, "approval-application-missing")).toEqual(["Funding (self-fund and/or raise funds)"]);
      expect(listed(wrapper, "approval-blockers")).toEqual(["RN License: not reviewed"]);
      expect(approveButton(wrapper).props("disabled")).toBe(true);
      wrapper.unmount();
    });

    it("A missing profile item alone disables Approve App", async () => {
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: { profileMissing: ["Phone number"], applicationMissing: [], approvalBlockers: [] },
      });
      const wrapper = await openApproveDialog();

      expect(wrapper.find('[data-testid="approval-application-missing"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="approval-blockers"]').exists()).toBe(false);
      expect(approveButton(wrapper).props("disabled")).toBe(true);
      wrapper.unmount();
    });

    it("Nothing missing enables Approve App", async () => {
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: { profileMissing: [], applicationMissing: [], approvalBlockers: [] },
      });
      const wrapper = await openApproveDialog();

      expect(wrapper.find('[data-testid="approval-profile-missing"]').exists()).toBe(false);
      expect(approveButton(wrapper).props("disabled")).toBe(false);
      expect(wrapper.find('[data-testid="override-approve"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });

  describe("US-122.4 — Override the approval checks", () => {
    it("Override Approve asks first, then approves without the checks", async () => {
      TripPeopleRoleServices.documentReview.mockResolvedValue({
        data: { profileMissing: ["Phone number"], applicationMissing: [], approvalBlockers: [] },
      });
      TripPeopleRoleServices.update.mockResolvedValue({ data: {} });
      const wrapper = await openApproveDialog();

      await wrapper.find('[data-testid="override-approve"]').trigger("click");
      await flushPromises();
      const confirm = wrapper.findAllComponents({ name: "ConfirmDialog" }).find((d) => d.props("modelValue"));
      expect(confirm.props("message")).toBe("Approve without the missing items?");
      expect(TripPeopleRoleServices.update).not.toHaveBeenCalled();

      confirm.vm.$emit("confirm");
      await flushPromises();
      expect(TripPeopleRoleServices.update).toHaveBeenCalledWith(1, {
        status: "approved",
        version: 1,
        overrideApprovalChecks: true,
      });
      expect(wrapper.emitted("saved")[0][0]).toEqual({ status: "approved", message: "Application approved." });
      wrapper.unmount();
    });
  });
});
