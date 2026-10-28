/**
 * Feature 9 — Public Fundraising Pages (Apply CTA)
 * Spec: features/feature-9-public-fundraising-pages.md
 * Feature 95 — Role Availability on Public Trip Pages
 * Spec: features/feature-95-public-trip-role-availability.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import PublicTripPage from "../src/views/PublicTripPage.vue";
import PublicServices from "../src/services/publicServices.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/publicServices.js", () => ({
  default: {
    getTripOverviewBySlug: vi.fn(),
    getTripBySlug: vi.fn(),
    getOrgBySlug: vi.fn(),
    getParticipantBySlug: vi.fn(),
    donate: vi.fn(),
  },
}));

vi.mock("../src/components/DonorTripHeading.vue", () => ({
  default: { name: "DonorTripHeading", template: "<div />", props: ["trip"] },
}));

const tripPayload = {
  trip: {
    id: 42,
    name: "Summer Outreach",
    orgId: 7,
    organization: { id: 7, name: "Hope Mission" },
  },
  rolesNeeded: [
    {
      id: 1,
      quantity: 3,
      availableCount: 2,
      workerRole: { id: 9, name: "Builder", description: "Construction" },
    },
  ],
};

describe("Feature 9 — Public trip Apply CTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PublicServices.getTripOverviewBySlug.mockResolvedValue({ data: tripPayload });
  });

  describe("US-9.3 — Start apply from public pages", () => {
    it("Visitor clicks Apply on public trip page", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          {
            path: "/trip/:tripSlug",
            name: "publicTrip",
            component: PublicTripPage,
            props: true,
          },
          { path: "/apply/sign-in", name: "applyAuth", component: { template: "<div />" } },
          {
            path: "/donate/trip/:tripSlug",
            name: "donorTrip",
            component: { template: "<div />" },
            props: true,
          },
          {
            path: "/org/:orgSlug",
            name: "orgTrips",
            component: { template: "<div />" },
            props: true,
          },
        ],
      });
      await router.push({ name: "publicTrip", params: { tripSlug: "Summer_Outreach" } });
      await router.isReady();

      const { wrapper } = await mountWithPlugins(PublicTripPage, {
        router,
        props: { tripSlug: "Summer_Outreach" },
        global: {
          plugins: [vuetify, router],
        },
      });
      await flushPromises();

      const applyBtn = wrapper.findAll("button").find((b) => b.text().trim() === "Apply");
      expect(applyBtn).toBeTruthy();
      await applyBtn.trigger("click");
      await flushPromises();

      expect(router.currentRoute.value.name).toBe("applyAuth");
      expect(router.currentRoute.value.query).toMatchObject({
        tripId: "42",
        trip: "Summer Outreach",
        orgId: "7",
        org: "Hope Mission",
        orgSlug: "Hope_Mission",
      });
    });
  });
});

describe("Feature 95 — US-95.1 Visitors see how many positions are open before applying", () => {
  const role = (id, name, quantity, reservedCount, availableCount) => ({
    id,
    quantity,
    reservedCount,
    availableCount,
    workerRole: { id: id + 100, name },
  });

  const mountPage = async (rolesNeeded) => {
    PublicServices.getTripOverviewBySlug.mockResolvedValue({ data: { ...tripPayload, rolesNeeded } });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/trip/:tripSlug", name: "publicTrip", component: PublicTripPage, props: true },
        { path: "/apply/sign-in", name: "applyAuth", component: { template: "<div />" } },
        { path: "/donate/trip/:tripSlug", name: "donorTrip", component: { template: "<div />" }, props: true },
        { path: "/org/:orgSlug", name: "orgTrips", component: { template: "<div />" }, props: true },
      ],
    });
    await router.push({ name: "publicTrip", params: { tripSlug: "Summer_Outreach" } });
    await router.isReady();
    const { wrapper } = await mountWithPlugins(PublicTripPage, {
      router,
      props: { tripSlug: "Summer_Outreach" },
      global: { plugins: [vuetify, router] },
    });
    await flushPromises();
    return wrapper;
  };

  const availability = (wrapper) => wrapper.find('[data-testid="role-availability"]').text();
  const buttonTexts = (wrapper) => wrapper.findAll("a, button").map((b) => b.text().trim());

  it("Trip page shows open and reserved positions", async () => {
    const wrapper = await mountPage([role(1, "Nurse", 4, 1, 3), role(2, "Doctor", 2, 1, 1)]);

    expect(availability(wrapper)).toBe("6 positions available (2 reserved, 4 open)");
    expect(buttonTexts(wrapper)).toContain("Apply");
    wrapper.unmount();
  });

  it("Only reserved positions shows Apply for Reserved", async () => {
    const wrapper = await mountPage([role(1, "Nurse", 4, 1, 0), role(2, "Doctor", 2, 1, 0)]);

    expect(availability(wrapper)).toBe("2 positions available (2 reserved)");
    expect(buttonTexts(wrapper)).toContain("Apply for Reserved");
    expect(buttonTexts(wrapper)).not.toContain("Apply");
    wrapper.unmount();
  });

  it("Full trip shows No roles available without Apply", async () => {
    const wrapper = await mountPage([role(1, "Nurse", 4, 0, 0), role(2, "Doctor", 2, 0, 0)]);

    expect(availability(wrapper)).toBe("No roles available");
    expect(buttonTexts(wrapper).filter((t) => t.startsWith("Apply"))).toEqual([]);
    expect(buttonTexts(wrapper)).toContain("Donate");
    wrapper.unmount();
  });
});
