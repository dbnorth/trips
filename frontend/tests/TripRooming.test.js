/**
 * Feature 29 — Rooming List
 * Spec: features/feature-29-rooming-list.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import TripsList from "../src/views/TripsList.vue";
import TripRoomingView from "../src/views/TripRoomingView.vue";
import TripServices from "../src/services/tripServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getAll: vi.fn(),
    getRooming: vi.fn(),
    updateRooming: vi.fn(),
  },
}));

vi.mock("../src/services/organizationServices.js", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("../src/components/AddTripDialog.vue", () => ({
  default: { name: "AddTripDialog", template: "<div />", props: ["modelValue"] },
}));
vi.mock("../src/components/CopyTripDialog.vue", () => ({
  default: { name: "CopyTripDialog", template: "<div />", props: ["modelValue", "trips"] },
}));
vi.mock("../src/components/EditTripDialog.vue", () => ({
  default: {
    name: "EditTripDialog",
    template: "<div />",
    props: ["modelValue", "tripId"],
  },
}));

const Stub = { template: "<div />" };

const orgAdminUser = {
  email: "admin@example.com",
  userId: 1,
  personId: 1,
  token: "tok",
  isAdmin: false,
  currentOrgId: 10,
  currentOrgName: "Hope Mission",
  orgRoles: [{ orgId: 10, orgName: "Hope Mission", roleName: "Org Admin" }],
  tripRoles: [],
};

describe("Feature 29 — Rooming List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    TripServices.getAll.mockResolvedValue({
      data: [{ id: 42, name: "Summer Outreach", startDate: "2026-07-01", endDate: "2026-07-14" }],
    });
    OrganizationServices.get.mockResolvedValue({ data: { id: 10, name: "Hope Mission" } });
    TripServices.getRooming.mockResolvedValue({
      data: {
        trip: {
          id: 42,
          name: "Summer Outreach",
          startDate: "2026-07-01",
          endDate: "2026-07-14",
        },
        roomingList: null,
        rooms: [],
        participants: [
          {
            tripPeopleRoleId: 101,
            peopleId: 55,
            firstName: "Ada",
            lastName: "Applicant",
            hasPreferredRoommate: true,
            preferredRoommateNames: "Grace Hopper",
            roomNumber: null,
            roomType: null,
            numberOfNights: null,
          },
        ],
      },
    });
  });

  it("Staff opens Room list from trips list", async () => {
    Utils.setStore("user", orgAdminUser);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trips", name: "trips", component: TripsList },
        {
          path: "/trips/:tripId/rooming",
          name: "tripRooming",
          component: Stub,
          props: true,
        },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "trips" });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripsList, {
      router,
      global: {
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const roomBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Room list");
    expect(roomBtn).toBeTruthy();

    await roomBtn.trigger("click");
    await flushPromises();
    await vi.waitFor(() => {
      expect(router.currentRoute.value.name).toBe("tripRooming");
    });
    expect(String(router.currentRoute.value.params.tripId)).toBe("42");
  });

  it("Participant row allows room number, nights, and type", async () => {
    Utils.setStore("user", orgAdminUser);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/trips/:tripId/rooming",
          name: "tripRooming",
          component: TripRoomingView,
          props: true,
        },
        { path: "/trips", name: "trips", component: Stub },
        { path: "/home", name: "home", component: Stub },
      ],
    });
    await router.push({ name: "tripRooming", params: { tripId: "42" } });
    await router.isReady();

    const { wrapper } = await mountWithPlugins(TripRoomingView, {
      props: { tripId: "42" },
      router,
    });
    await flushPromises();

    expect(wrapper.text()).toContain("Ada");
    expect(wrapper.text()).toContain("Applicant");
    expect(wrapper.text()).toContain("Yes");
    expect(wrapper.text()).toContain("Grace Hopper");

    const row = wrapper.vm.participants[0];
    row.roomNumber = "214";
    row.numberOfNights = "5";
    row.roomType = "Double";
    await flushPromises();

    expect(wrapper.vm.participants[0].roomNumber).toBe("214");
    expect(wrapper.vm.participants[0].numberOfNights).toBe("5");
    expect(wrapper.vm.participants[0].roomType).toBe("Double");
  });
});
