/**
 * Feature 46 — Email Trip Team
 * Spec: features/feature-46-email-trip-team.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import TripView from "../src/views/TripView.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { get: vi.fn() },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/donationServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({
  default: { getAll: vi.fn() },
}));
vi.mock("../src/services/exportServices.js", () => ({
  default: { participantsCsv: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { getPictureUrl: vi.fn(() => null) },
}));

const { stubDialog } = vi.hoisted(() => ({
  stubDialog: (name, props = ["modelValue"]) => ({
    default: { name, template: "<div />", props },
  }),
}));
vi.mock("../src/components/AddTripParticipantDialog.vue", () => stubDialog("AddTripParticipantDialog"));
vi.mock("../src/components/EditTripParticipantDialog.vue", () => stubDialog("EditTripParticipantDialog"));
vi.mock("../src/components/ParticipantDonationsDialog.vue", () => stubDialog("ParticipantDonationsDialog"));
vi.mock("../src/components/EditTripDialog.vue", () => stubDialog("EditTripDialog"));
vi.mock("../src/components/ViewPersonProfileDialog.vue", () => stubDialog("ViewPersonProfileDialog"));
vi.mock("../src/components/ViewTripApplicationDialog.vue", () => stubDialog("ViewTripApplicationDialog"));
vi.mock("../src/components/ConfirmDialog.vue", () => stubDialog("ConfirmDialog"));
vi.mock("../src/components/TripTeamEmailDialog.vue", () =>
  stubDialog("TripTeamEmailDialog", ["modelValue", "tripId", "participants"])
);

const Stub = { template: "<div />" };

describe("Feature 46 — Email Trip Team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.get.mockResolvedValue({
      data: { id: 42, name: "Guatemala Clinic", orgId: 10, status: "active", leaderNames: [] },
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [{ id: 1, peopleId: 5, status: "approved", role: { roleName: "Trip Participant" } }],
    });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  it("Email team button opens the dialog", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
        { path: "/trips", name: "trips", component: Stub },
      ],
    });
    await router.push({ name: "tripView", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripView, {
      props: { tripId: "42" },
      router,
      global: { stubs: { TripWorkerRolesCard: Stub } },
    });
    await flushPromises();

    const dialog = () => wrapper.findComponent({ name: "TripTeamEmailDialog" });
    expect(dialog().props("modelValue")).toBe(false);

    const emailBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Email team");
    expect(emailBtn).toBeTruthy();
    await emailBtn.trigger("click");
    await flushPromises();

    expect(dialog().props("modelValue")).toBe(true);
    expect(dialog().props("tripId")).toBe("42");
    expect(dialog().props("participants")).toHaveLength(1);

    wrapper.unmount();
  });
});
