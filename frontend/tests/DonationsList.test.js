/**
 * Feature 69 — Participant CSV, Roster, and Single Application Are Staff Only
 * Spec: features/feature-69-staff-only-participant-data.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import DonationsList from "../src/views/DonationsList.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/donationServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/exportServices.js", () => ({
  default: {},
}));

import TripServices from "../src/services/tripServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";

const ORG_ID = 3;
const ALPHA = { id: 11, name: "Alpha", orgId: ORG_ID, participantCost: 1500 };
const BETA = { id: 12, name: "Beta", orgId: ORG_ID, participantCost: 1200 };

const myDonation = {
  id: 1,
  dateTime: "2026-10-01T10:00:00Z",
  amount: 25,
  donor: { firstName: "Pat", lastName: "Giver" },
  participant: { firstName: "Casey", lastName: "Participant" },
};

const DonationFormDialogStub = {
  name: "DonationFormDialog",
  props: ["modelValue", "tripId", "trips", "allowTripSelect", "donation"],
  template: "<div />",
};

const mountDonations = async (user, trips) => {
  Utils.setStore("user", user);
  TripServices.getAll.mockResolvedValue({ data: trips });
  const { wrapper } = await mountWithPlugins(DonationsList, {
    global: { stubs: { DonationFormDialog: DonationFormDialogStub } },
  });
  await flushPromises();
  return wrapper;
};

const buttonLabels = (wrapper) =>
  wrapper.findAll("button").map((b) => b.attributes("aria-label") || b.text());

describe("Feature 69 — Participant CSV, Roster, and Single Application Are Staff Only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    DonationServices.getAll.mockResolvedValue({ data: [myDonation] });
    TripPeopleRoleServices.getAll.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
  });

  describe("US-69.3 — Only trip staff can fetch the trip roster", () => {
    it("Participant's Donations page loads without the roster", async () => {
      const participant = {
        orgRoles: [{ orgId: ORG_ID, roleName: "Trip Participant" }],
        tripRoles: [{ tripId: ALPHA.id, orgId: ORG_ID, roleName: "Trip Participant" }],
      };

      const wrapper = await mountDonations(participant, [ALPHA]);

      expect(DonationServices.getAll).toHaveBeenCalledWith(ALPHA.id);
      expect(wrapper.text()).toContain("Pat Giver");
      expect(TripPeopleRoleServices.getAll).not.toHaveBeenCalled();
      expect(wrapper.text()).not.toContain("Participants");
      expect(buttonLabels(wrapper)).not.toContain("Add donation");
      expect(buttonLabels(wrapper)).not.toContain("Edit");
    });

    it("Trip staff Donations page is unchanged", async () => {
      const orgAdmin = { orgRoles: [{ orgId: ORG_ID, roleName: "Org Admin" }], tripRoles: [] };

      const wrapper = await mountDonations(orgAdmin, [ALPHA]);

      expect(TripPeopleRoleServices.getAll).toHaveBeenCalledWith(ALPHA.id);
      expect(wrapper.text()).toContain("Participants");
      expect(wrapper.text()).toContain("3");
      expect(buttonLabels(wrapper)).toContain("Add donation");
      expect(buttonLabels(wrapper)).toContain("Edit");
    });

    it("Donation dialog lists only trips where I am staff", async () => {
      const leaderAndParticipant = {
        orgRoles: [{ orgId: ORG_ID, roleName: "Trip Participant" }],
        tripRoles: [
          { tripId: ALPHA.id, orgId: ORG_ID, roleName: "Trip Leader" },
          { tripId: BETA.id, orgId: ORG_ID, roleName: "Trip Participant" },
        ],
      };

      const wrapper = await mountDonations(leaderAndParticipant, [ALPHA, BETA]);
      await wrapper.findAll("button").find((b) => b.text() === "Add donation").trigger("click");

      const dialog = wrapper.findComponent({ name: "DonationFormDialog" });
      expect(dialog.props("modelValue")).toBe(true);
      expect(dialog.props("trips").map((t) => t.name)).toEqual(["Alpha"]);
    });
  });
});
