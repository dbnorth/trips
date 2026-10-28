/**
 * Feature 95 — Role Availability on Public Trip Pages
 * Spec: features/feature-95-public-trip-role-availability.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripBrowseView from "../src/views/TripBrowseView.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { getBrowseTrip: vi.fn(), cancelApplication: vi.fn() },
}));

vi.mock("../src/services/personServices.js", () => ({
  default: { getPictureUrl: vi.fn(() => null) },
}));

vi.mock("../src/services/authServices.js", () => ({
  default: { me: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";

const TRIP = {
  id: 7,
  orgId: 3,
  name: "Clinica Ezell Hospital - January 2027",
  status: "active",
  startDate: "2027-01-16",
  endDate: "2027-01-23",
};
const NURSE = { id: 1, quantity: 4, reservedCount: 1, workerRole: { name: "Nurse" } };
const DOCTOR = { id: 2, quantity: 2, reservedCount: 1, workerRole: { name: "Doctor" } };

const browse = (rolesNeeded, myReservedTripWorkerRoleId = null) =>
  TripServices.getBrowseTrip.mockResolvedValue({
    data: {
      trip: TRIP,
      rolesNeeded,
      myReservedTripWorkerRoleId,
      alreadyApplied: false,
      applicationStatus: null,
      tripLeaders: [],
      myTripInfo: null,
    },
  });

const mountView = async () => {
  const { wrapper } = await mountWithPlugins(TripBrowseView, {
    props: { tripId: "7" },
    global: {
      stubs: {
        VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        DonorTripHeading: true,
        ApplyTripDialog: true,
        FlightSegmentsDialog: true,
        ParticipantDonationsDialog: true,
        ParticipantDonateDialog: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
};

const noSpotDialog = (wrapper) => wrapper.find('[data-testid="no-spot-dialog"]');
const APPLY_INVITE = "Apply for this trip";

describe("Feature 95 — US-95.2 Signed-in applicants are told when there is no spot for them", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Ben", lastName: "Baker", orgRoles: [], tripRoles: [] });
  });

  it("Only reserved spots shows the reserved message instead of Apply", async () => {
    browse([
      { ...NURSE, availableCount: 0 },
      { ...DOCTOR, availableCount: 0 },
    ]);
    const wrapper = await mountView();

    expect(noSpotDialog(wrapper).text()).toContain(
      "Thanks for your interest, but all remaining spots on this trip are reserved."
    );
    expect(wrapper.text()).not.toContain(APPLY_INVITE);

    await noSpotDialog(wrapper).findAll("button").find((b) => b.text().trim() === "OK").trigger("click");
    await flushPromises();
    expect(noSpotDialog(wrapper).exists()).toBe(false);
    expect(wrapper.text()).not.toContain(APPLY_INVITE);
    wrapper.unmount();
  });

  it("No spots shows the no spots message instead of Apply", async () => {
    browse([
      { ...NURSE, reservedCount: 0, availableCount: 0 },
      { ...DOCTOR, reservedCount: 0, availableCount: 0 },
    ]);
    const wrapper = await mountView();

    expect(noSpotDialog(wrapper).text()).toContain(
      "Thanks for your interest, but there are no spots available on this trip."
    );
    expect(wrapper.text()).not.toContain(APPLY_INVITE);
    wrapper.unmount();
  });

  it("A reserved person still sees Apply for this trip", async () => {
    browse(
      [
        { ...NURSE, availableCount: 0 },
        { ...DOCTOR, availableCount: 0 },
      ],
      NURSE.id
    );
    const wrapper = await mountView();

    expect(noSpotDialog(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain(APPLY_INVITE);
    wrapper.unmount();
  });
});
