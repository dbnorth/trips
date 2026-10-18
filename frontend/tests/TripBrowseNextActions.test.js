/**
 * Feature 60 — My Trips Next Actions (trip page)
 * Spec: features/feature-60-my-trips-next-actions.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripBrowseView from "../src/views/TripBrowseView.vue";
import ConfirmDialog from "../src/components/ConfirmDialog.vue";
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

const NamedStub = (name) => ({
  name,
  props: ["modelValue", "tripId", "tripPeopleRoleId"],
  template: "<div />",
});

describe("Feature 60 — My Trips Next Actions (trip page)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    Utils.setStore("user", { personId: 5, firstName: "Ana", lastName: "Lopez", orgRoles: [], tripRoles: [] });
    TripServices.getBrowseTrip.mockResolvedValue({
      data: {
        trip: { id: 7, orgId: 3, name: "Guatemala Clinic", status: "active", startDate: "2027-01-10", endDate: "2027-01-20" },
        rolesNeeded: [],
        alreadyApplied: true,
        applicationStatus: "incomplete",
        tripLeaders: [],
        myTripInfo: {
          status: "incomplete",
          workerRoleName: "Nurse",
          participantCost: 1800,
          donationTotal: 0,
          donationRecipients: [],
          tripPeopleRoleId: 70,
          nextActions: [{ code: "complete-application", missingDocuments: ["Passport"] }],
        },
      },
    });
  });

  const mountView = async () => {
    const { wrapper } = await mountWithPlugins(TripBrowseView, {
      props: { tripId: "7" },
      global: {
        stubs: {
          VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
          DonorTripHeading: true,
          ApplyTripDialog: NamedStub("ApplyTripDialog"),
          FlightSegmentsDialog: NamedStub("FlightSegmentsDialog"),
          ParticipantDonationsDialog: true,
          ParticipantDonateDialog: true,
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  const button = (el, text) => el.findAll("button").find((b) => b.text().trim() === text);

  it("Trip page shows my next actions", async () => {
    const wrapper = await mountView();

    const actions = wrapper.find('[data-testid="my-trip-next-actions"]');
    expect(actions.classes()).toContain("my-trip-next-actions--needed");
    expect(actions.text()).toContain("Complete your application.");
    expect(actions.text()).toContain("Missing documents: Passport.");
    expect(wrapper.findAll("button").filter((b) => b.text().trim() === "Update App")).toHaveLength(1);

    await button(actions, "Update App").trigger("click");
    await flushPromises();
    expect(wrapper.findComponent({ name: "ApplyTripDialog" }).props("modelValue")).toBe(true);

    await button(actions, "Cancel App").trigger("click");
    await flushPromises();
    const confirm = wrapper.findComponent(ConfirmDialog);
    expect(confirm.props("modelValue")).toBe(true);
    expect(confirm.props("message")).toBe("Cancel this application? Your role slot will be freed.");

    wrapper.unmount();
  });
});
