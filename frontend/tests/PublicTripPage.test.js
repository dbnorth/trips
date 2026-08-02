/**
 * Feature 9 — Public Fundraising Pages (Apply CTA)
 * Spec: features/feature-9-public-fundraising-pages.md
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
