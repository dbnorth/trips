/**
 * Feature 95 — Role Availability on Public Trip Pages
 * Spec: features/feature-95-public-trip-role-availability.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import OrganizationTripsPage from "../src/views/OrganizationTripsPage.vue";
import PublicServices from "../src/services/publicServices.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/publicServices.js", () => ({
  default: { getOrgBySlug: vi.fn() },
}));

const ORGANIZATION = { id: 7, name: "Hope Missions" };

const tripWith = (roleAvailability) => ({
  id: 42,
  orgId: 7,
  name: "Clinica Ezell Hospital - January 2027",
  status: "active",
  startDate: "2027-01-16",
  endDate: "2027-01-23",
  roleAvailability,
});

const mountPage = async (roleAvailability) => {
  PublicServices.getOrgBySlug.mockResolvedValue({
    data: { organization: ORGANIZATION, trips: [tripWith(roleAvailability)] },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/org/:orgSlug", name: "orgTrips", component: OrganizationTripsPage, props: true },
      { path: "/trip/:tripSlug", name: "publicTrip", component: { template: "<div />" }, props: true },
      { path: "/donate/trip/:tripSlug", name: "donorTrip", component: { template: "<div />" }, props: true },
      { path: "/apply/sign-in", name: "applyAuth", component: { template: "<div />" } },
    ],
  });
  await router.push({ name: "orgTrips", params: { orgSlug: "Hope_Missions" } });
  await router.isReady();
  const { wrapper } = await mountWithPlugins(OrganizationTripsPage, {
    router,
    props: { orgSlug: "Hope_Missions" },
    global: { plugins: [vuetify, router] },
  });
  await flushPromises();
  return { wrapper, router };
};

const availability = (wrapper) => wrapper.find('[data-testid="role-availability"]').text();
const buttonTexts = (wrapper) => wrapper.findAll("a, button").map((b) => b.text().trim());

describe("Feature 95 — US-95.1 Visitors see how many positions are open before applying", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Card shows open and reserved positions", async () => {
    const { wrapper, router } = await mountPage({ reserved: 2, open: 4 });

    expect(availability(wrapper)).toBe("6 positions available (2 reserved, 4 open)");
    const apply = wrapper.findAll("button").find((b) => b.text().trim() === "Apply");
    await apply.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("applyAuth");
    wrapper.unmount();
  });

  it("Only reserved positions shows Apply for Reserved", async () => {
    const { wrapper } = await mountPage({ reserved: 2, open: 0 });

    expect(availability(wrapper)).toBe("2 positions available (2 reserved)");
    expect(buttonTexts(wrapper)).toContain("Apply for Reserved");
    expect(buttonTexts(wrapper)).not.toContain("Apply");
    wrapper.unmount();
  });

  it("Full trip shows No roles available without Apply", async () => {
    const { wrapper } = await mountPage({ reserved: 0, open: 0 });

    expect(availability(wrapper)).toBe("No roles available");
    expect(buttonTexts(wrapper).filter((t) => t.startsWith("Apply"))).toEqual([]);
    expect(buttonTexts(wrapper)).toEqual(expect.arrayContaining(["View", "Donate"]));
    wrapper.unmount();
  });
});
