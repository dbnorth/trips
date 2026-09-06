/**
 * Feature 27 — Application Submit Unavailable Info Message
 * Spec: features/feature-27-application-submit-unavailable-info.md
 */

import { describe, it, expect } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ApplicationSubmitUnavailableAlert from "../src/components/ApplicationSubmitUnavailableAlert.vue";
import {
  canShowPrimarySubmitButton,
  getIncompleteSubmitReasons,
  getSubmitUnavailableReasons,
} from "../src/utils/applicationSubmitAvailability.js";
import { mountWithPlugins } from "./testUtils.js";

describe("Feature 27 — Application Submit Unavailable Info Message", () => {
  describe("US-27.1 — See why Submit / Save is not available", () => {
    it("Info lists reasons when primary button is hidden", async () => {
      const reasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: false,
        applicationStatus: "cancelled",
        availableRolesCount: 0,
      });

      expect(canShowPrimarySubmitButton({
        loading: false,
        tripReady: true,
        canEdit: false,
        availableRolesCount: 0,
      })).toBe(false);

      expect(reasons).toEqual([
        "This application cannot be saved while its status is Cancelled.",
        "There are no trip roles with available positions.",
      ]);

      const { wrapper } = await mountWithPlugins(ApplicationSubmitUnavailableAlert, {
        props: { reasons },
      });
      await flushPromises();

      expect(wrapper.text()).toContain("This application cannot be saved or submitted yet:");
      expect(wrapper.text()).toContain(
        "This application cannot be saved while its status is Cancelled."
      );
      expect(wrapper.text()).toContain("There are no trip roles with available positions.");
      wrapper.unmount();
    });

    it("Alert clears when the primary button returns", async () => {
      const hiddenReasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: false,
        applicationStatus: "approved",
        availableRolesCount: 2,
      });
      expect(hiddenReasons.length).toBeGreaterThan(0);
      expect(
        canShowPrimarySubmitButton({
          loading: false,
          tripReady: true,
          canEdit: false,
          availableRolesCount: 2,
        })
      ).toBe(false);

      const clearedReasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: true,
        applicationStatus: "incomplete",
        availableRolesCount: 2,
      });
      expect(clearedReasons).toEqual([]);
      expect(
        canShowPrimarySubmitButton({
          loading: false,
          tripReady: true,
          canEdit: true,
          availableRolesCount: 2,
        })
      ).toBe(true);

      const { wrapper } = await mountWithPlugins(ApplicationSubmitUnavailableAlert, {
        props: { reasons: clearedReasons },
      });
      await flushPromises();
      expect(wrapper.text()).not.toContain("This application cannot be saved or submitted yet:");
      wrapper.unmount();
    });

    it("Incomplete editable application still shows Save Incomplete", () => {
      const reasons = getSubmitUnavailableReasons({
        loading: false,
        tripReady: true,
        canEdit: true,
        applicationStatus: "incomplete",
        availableRolesCount: 1,
      });

      expect(reasons).toEqual([]);
      expect(
        canShowPrimarySubmitButton({
          loading: false,
          tripReady: true,
          canEdit: true,
          availableRolesCount: 1,
        })
      ).toBe(true);
    });

    it("Completion warning lists profile and incomplete application fields", async () => {
      const reasons = getIncompleteSubmitReasons({
        profileComplete: false,
        tripWorkerRoleId: null,
        willSelfFund: false,
        willRaiseFunds: false,
        agreementRequired: true,
        agreementAccepted: false,
        personDocumentsUploaded: true,
        requiredRoleDocumentUploaded: true,
        requiredPassportUploaded: true,
        travelOptionsComplete: true,
      });

      expect(reasons[0]).toBe("Profile is not complete");
      expect(reasons).toContain("Trip role");
      expect(reasons).toContain("Funding (self-fund and/or raise funds)");
      expect(reasons).toContain("Participant agreement");

      const { wrapper } = await mountWithPlugins(ApplicationSubmitUnavailableAlert, {
        props: {
          reasons,
          intro: "Complete the following to submit your application:",
        },
      });
      await flushPromises();
      expect(wrapper.text()).toContain("Complete the following to submit your application:");
      expect(wrapper.text()).toContain("Profile is not complete");
      expect(wrapper.text()).toContain("Trip role");
      wrapper.unmount();
    });
  });
});
