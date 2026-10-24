/**
 * Feature 81 — Row Action Icons with Tooltips
 * Spec: features/feature-81-row-action-icons.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import RowAction from "../src/components/RowAction.vue";
import TripsList from "../src/views/TripsList.vue";
import Home from "../src/views/Home.vue";
import TripView from "../src/views/TripView.vue";
import AirportsList from "../src/views/AirportsList.vue";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import DonationServices from "../src/services/donationServices.js";
import TripTravelOptionServices from "../src/services/tripTravelOptionServices.js";
import OrganizationServices from "../src/services/organizationServices.js";
import DashboardServices from "../src/services/dashboardServices.js";
import AirportServices from "../src/services/airportServices.js";
import ExportServices from "../src/services/exportServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    get: vi.fn(),
    getAll: vi.fn(),
    getBrowseTrips: vi.fn(),
    getMyBrowseTrips: vi.fn(),
    getBrowseTrip: vi.fn(),
    getOrgTrips: vi.fn(),
  },
}));
vi.mock("../src/services/tripPeopleRoleServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/donationServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/tripTravelOptionServices.js", () => ({ default: { getAll: vi.fn() } }));
vi.mock("../src/services/organizationServices.js", () => ({ default: { get: vi.fn() } }));
vi.mock("../src/services/dashboardServices.js", () => ({ default: { org: vi.fn(), trip: vi.fn() } }));
vi.mock("../src/services/authServices.js", () => ({ default: { me: vi.fn(() => Promise.resolve({ data: {} })) } }));
vi.mock("../src/services/airportServices.js", () => ({ default: { getAll: vi.fn(), delete: vi.fn() } }));
vi.mock("../src/services/exportServices.js", () => ({
  default: { participantsCsv: vi.fn(), participantDocumentsPdf: vi.fn() },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: {} })), getPictureUrl: vi.fn(() => null) },
}));

const { stubDialog } = vi.hoisted(() => ({
  stubDialog: (name, props = ["modelValue"]) => ({ default: { name, template: "<div />", props } }),
}));
vi.mock("../src/components/AddTripDialog.vue", () => stubDialog("AddTripDialog"));
vi.mock("../src/components/CopyTripDialog.vue", () => stubDialog("CopyTripDialog", ["modelValue", "trips"]));
vi.mock("../src/components/EditTripDialog.vue", () => stubDialog("EditTripDialog", ["modelValue", "tripId"]));
vi.mock("../src/components/AddTripParticipantDialog.vue", () => stubDialog("AddTripParticipantDialog"));
vi.mock("../src/components/EditTripParticipantDialog.vue", () => stubDialog("EditTripParticipantDialog"));
vi.mock("../src/components/ParticipantDonationsDialog.vue", () => stubDialog("ParticipantDonationsDialog"));
vi.mock("../src/components/ViewPersonProfileDialog.vue", () => stubDialog("ViewPersonProfileDialog"));
vi.mock("../src/components/ViewTripApplicationDialog.vue", () => stubDialog("ViewTripApplicationDialog"));
vi.mock("../src/components/ConfirmDialog.vue", () => stubDialog("ConfirmDialog"));
vi.mock("../src/components/TripTeamEmailDialog.vue", () =>
  stubDialog("TripTeamEmailDialog", ["modelValue", "tripId", "participants"])
);

const Stub = { template: "<div />" };
const ORG_ID = 10;
const omar = {
  email: "omar@example.org",
  userId: 1,
  personId: 1,
  isAdmin: false,
  currentOrgId: ORG_ID,
  currentOrgName: "Hope Missions",
  orgRoles: [{ orgId: ORG_ID, orgName: "Hope Missions", roleName: "Org Admin" }],
  tripRoles: [],
};
const trip = {
  id: 42,
  orgId: ORG_ID,
  name: "Guatemala Clinic 2027",
  status: "active",
  startDate: "2099-06-10",
  endDate: "2099-06-17",
  leaderNames: [],
};

const actionsIn = (el) =>
  el.findAll("[aria-label]").filter((node) => node.classes().includes("v-btn"));
const namesOf = (el) => actionsIn(el).map((btn) => btn.attributes("aria-label"));
const iconOf = (btn) => btn.find(".v-icon").classes().find((c) => c.startsWith("mdi-") && c !== "mdi");
const action = (el, label) => el.find(`.v-btn[aria-label="${label}"]`);

const routerWith = async (routes, start) => {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(start);
  await router.isReady();
  return router;
};

describe("Feature 81 — Row Action Icons with Tooltips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", omar);
    TripServices.getAll.mockResolvedValue({ data: [trip] });
    TripServices.get.mockResolvedValue({ data: trip });
    TripServices.getBrowseTrips.mockResolvedValue({ data: [] });
    TripServices.getMyBrowseTrips.mockResolvedValue({ data: [] });
    OrganizationServices.get.mockResolvedValue({ data: { id: ORG_ID, name: "Hope Missions" } });
    DashboardServices.org.mockResolvedValue({ data: {} });
    DonationServices.getAll.mockResolvedValue({ data: [] });
    TripTravelOptionServices.getAll.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("US-81.1 — Row actions are icons with tooltips", () => {
    it("Trips list actions are icons with tooltips", async () => {
      const router = await routerWith(
        [
          { path: "/trips", name: "trips", component: TripsList },
          { path: "/trips/:tripId/rooming", name: "tripRooming", component: Stub, props: true },
          { path: "/home", name: "home", component: Stub },
        ],
        "/trips"
      );
      const { wrapper } = await mountWithPlugins(TripsList, { router });
      await flushPromises();

      const row = wrapper.findAll("tr").find((tr) => tr.text().includes("Guatemala Clinic 2027"));
      expect(namesOf(row)).toEqual(["View", "Status", "Room list", "Flights", "Import", "Edit"]);
      expect(actionsIn(row).map(iconOf)).toEqual([
        "mdi-eye",
        "mdi-clipboard-check-outline",
        "mdi-bed",
        "mdi-airplane",
        "mdi-file-import",
        "mdi-pencil",
      ]);
      expect(actionsIn(row).map((btn) => btn.text())).toEqual(["", "", "", "", "", ""]);

      await action(row, "Room list").trigger("click");
      await vi.waitFor(() => expect(router.currentRoute.value.name).toBe("tripRooming"));
      expect(String(router.currentRoute.value.params.tripId)).toBe("42");
      wrapper.unmount();
    });

    it("A row action shows its label on hover and focus", async () => {
      const tooltipText = () => document.querySelector(".v-tooltip .v-overlay__content")?.textContent?.trim();
      const { wrapper } = await mountWithPlugins(RowAction, {
        props: { icon: "mdi-bed", label: "Room list" },
        attachTo: document.body,
      });

      const btn = wrapper.find(".v-btn");
      expect(btn.attributes("aria-label")).toBe("Room list");
      expect(btn.text()).toBe("");
      expect(iconOf(btn)).toBe("mdi-bed");

      const openStates = () =>
        (wrapper.findComponent({ name: "VTooltip" }).emitted("update:modelValue") || []).map(([open]) => open);

      await wrapper.find("span").trigger("mouseenter");
      await vi.waitFor(() => expect(tooltipText()).toBe("Room list"));
      await wrapper.find("span").trigger("mouseleave");
      await vi.waitFor(() => expect(openStates()).toEqual([true, false]));
      await new Promise((resolve) => setTimeout(resolve, 60));

      btn.element.focus();
      await vi.waitFor(() => expect(openStates()).toEqual([true, false, true]));
      expect(tooltipText()).toBe("Room list");
      btn.element.blur();
      wrapper.unmount();

      const disabled = await mountWithPlugins(RowAction, {
        props: { icon: "mdi-file-pdf-box", label: "Documents PDF", disabled: true },
        attachTo: document.body,
      });
      const disabledBtn = disabled.wrapper.find(".v-btn");
      expect(disabledBtn.attributes("disabled")).toBeDefined();
      expect(disabledBtn.attributes("aria-label")).toBe("Documents PDF");
      await disabled.wrapper.find("span").trigger("mouseenter");
      await vi.waitFor(() => expect(tooltipText()).toBe("Documents PDF"));
      disabled.wrapper.unmount();
    });

    it("Organization Trips on Home uses icons", async () => {
      const { wrapper } = await mountWithPlugins(Home, {
        global: {
          stubs: {
            RouterLink: true,
            EditPersonDialog: true,
            EditTripDialog: true,
            EditOrganizationDialog: true,
            ApplyTripDialog: true,
          },
        },
      });
      await flushPromises();

      const row = wrapper.findAll("tr").find((tr) => tr.find("td").exists() && tr.find("td").text() === trip.name);
      expect(namesOf(row)).toEqual(["View", "Status", "Room list", "Flights", "Edit"]);
      expect(actionsIn(row).map((btn) => btn.text())).toEqual(["", "", "", "", ""]);
      wrapper.unmount();
    });
  });

  describe("US-81.2 — Actions keep their meaning and behavior", () => {
    it("View Trip participant actions keep their labels and colors", async () => {
      const person = (id, firstName, lastName) => ({ id, firstName, lastName });
      TripPeopleRoleServices.getAll.mockResolvedValue({
        data: [
          { id: 1, peopleId: 5, status: "applied", role: { roleName: "Trip Participant" }, person: person(5, "Ana", "Lopez") },
          { id: 2, peopleId: 6, status: "approved", role: { roleName: "Trip Participant" }, person: person(6, "Lyle", "Lowry") },
          { id: 3, peopleId: 7, status: "cancelled", role: { roleName: "Trip Participant" }, person: person(7, "Kris", "Smith") },
        ],
      });
      ExportServices.participantDocumentsPdf.mockResolvedValue();
      const router = await routerWith(
        [
          { path: "/trips/:tripId", name: "tripView", component: TripView, props: true },
          { path: "/trips", name: "trips", component: Stub },
        ],
        "/trips/42"
      );
      const { wrapper } = await mountWithPlugins(TripView, {
        props: { tripId: "42" },
        router,
        global: { stubs: { TripWorkerRolesCard: Stub } },
      });
      await flushPromises();

      const rowOf = (name) => wrapper.findAll("tr").find((tr) => tr.text().includes(name));
      const ana = rowOf("Ana");
      const lyle = rowOf("Lyle");
      const kris = rowOf("Kris");
      expect(iconOf(action(ana, "Approve App"))).toBe("mdi-file-check-outline");
      expect(iconOf(action(lyle, "View App"))).toBe("mdi-file-document-outline");

      expect(iconOf(action(lyle, "Cancel"))).toBe("mdi-cancel");
      expect(action(lyle, "Cancel").classes()).toContain("text-error");
      expect(action(kris, "Cancel").exists()).toBe(false);
      expect(iconOf(action(kris, "Uncancel"))).toBe("mdi-restore");
      expect(namesOf(lyle)).toEqual(["View App", "Cancel", "Edit", "View donations", "Documents PDF", "Donate page"]);

      const donate = action(kris, "Donate page");
      expect(donate.attributes("href")).toContain("/donate/trip/Guatemala_Clinic_2027/participant/");
      expect(donate.attributes("target")).toBe("_blank");

      await action(lyle, "Documents PDF").trigger("click");
      await flushPromises();
      expect(ExportServices.participantDocumentsPdf).toHaveBeenCalledWith("42", 2, "Lyle Lowry");
      wrapper.unmount();
    });

    it("Delete keeps its color and confirmation", async () => {
      Utils.setStore("user", { ...omar, isAdmin: true });
      AirportServices.getAll.mockResolvedValue({
        data: [{ id: 9, code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" }],
      });
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      const { wrapper } = await mountWithPlugins(AirportsList);
      await flushPromises();

      const row = wrapper.findAll("tr").find((tr) => tr.text().includes("GUA"));
      expect(iconOf(action(row, "Edit"))).toBe("mdi-pencil");
      expect(iconOf(action(row, "Delete"))).toBe("mdi-delete");
      expect(action(row, "Delete").classes()).toContain("text-error");

      await action(row, "Delete").trigger("click");
      expect(confirm).toHaveBeenCalledWith('Delete airport "GUA"?');
      expect(AirportServices.delete).not.toHaveBeenCalled();
      confirm.mockRestore();
      wrapper.unmount();
    });
  });
});
