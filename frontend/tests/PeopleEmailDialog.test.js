/**
 * Feature 62 — Email People
 * Spec: features/feature-62-people-email.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import PeopleList from "../src/views/PeopleList.vue";
import PeopleEmailDialog from "../src/components/PeopleEmailDialog.vue";
import ConfirmDialog from "../src/components/ConfirmDialog.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/peopleEmailServices.js", () => ({
  default: {
    getOptions: vi.fn(),
    getRecipients: vi.fn(),
    preview: vi.fn(),
    send: vi.fn(),
  },
}));
vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getAll: vi.fn(),
    getTeamEmailTemplates: vi.fn(),
  },
}));
vi.mock("../src/services/personServices.js", () => ({
  default: { getAll: vi.fn() },
}));

import PeopleEmailServices from "../src/services/peopleEmailServices.js";
import TripServices from "../src/services/tripServices.js";
import PersonServices from "../src/services/personServices.js";

const CLINIC = {
  id: 5,
  name: "Guatemala Clinic",
  startDate: "2027-03-01",
  roles: [
    { workerRoleId: 2, name: "Doctor" },
    { workerRoleId: 1, name: "Nurse" },
  ],
};
const BUILD = {
  id: 8,
  name: "Honduras Build",
  startDate: "2026-06-01",
  roles: [{ workerRoleId: 3, name: "Builder" }],
};
const NEWSLETTER = { id: 11, subject: "Newsletter", emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}" };
const PACKING = { id: 21, tripId: 5, subject: "Packing list", emailBody: "Pack for {{TRIP_NAME}}" };

const dialogStubs = {
  VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
};

describe("Feature 62 — Email People", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PeopleEmailServices.getOptions.mockResolvedValue({
      data: { templates: [NEWSLETTER], trips: [CLINIC, BUILD] },
    });
    PeopleEmailServices.getRecipients.mockImplementation(async ({ tripIds }) => ({
      data:
        tripIds === "all"
          ? [
              { personId: 1, name: "Ana Lopez" },
              { personId: 2, name: "Ben Lopez" },
              { personId: 3, name: "Dan Lopez" },
            ]
          : [{ personId: 3, name: "Dan Lopez" }],
    }));
    PeopleEmailServices.send.mockResolvedValue({
      data: { sent: 3, skipped: 0, failed: 0, results: [] },
    });
    TripServices.getAll.mockResolvedValue({ data: [] });
    TripServices.getTeamEmailTemplates.mockResolvedValue({ data: [PACKING] });
    PersonServices.getAll.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    Utils.removeItem("user");
  });

  const component = (wrapper, name, label) =>
    wrapper.findAllComponents({ name }).find((c) => c.props("label") === label);

  const setValue = async (wrapper, name, label, value) => {
    component(wrapper, name, label).vm.$emit("update:modelValue", value);
    await flushPromises();
  };

  const button = (wrapper, text) =>
    wrapper.findAll("button").find((b) => b.text().trim() === text);

  const itemTitles = (wrapper, label) =>
    component(wrapper, "VSelect", label)
      .props("items")
      .map((item) => item.title);

  const mountDialog = async () => {
    const { wrapper } = await mountWithPlugins(PeopleEmailDialog, {
      props: { modelValue: true },
      global: { stubs: dialogStubs },
    });
    await flushPromises();
    return wrapper;
  };

  it("People page Email dialog filters roles by selected trips", async () => {
    Utils.setStore("user", {
      token: "t",
      isAdmin: true,
      actingOrganizationId: 3,
      currentOrgId: 3,
      currentOrgName: "Hope Missions",
    });
    const { wrapper } = await mountWithPlugins(PeopleList, { global: { stubs: dialogStubs } });
    await flushPromises();

    await button(wrapper, "Email").trigger("click");
    await flushPromises();
    expect(itemTitles(wrapper, "Roles")).toEqual(["All", "Builder", "Doctor", "Nurse"]);

    await setValue(wrapper, "VSelect", "Trips", ["all", BUILD.id]);

    expect(component(wrapper, "VSelect", "Trips").props("modelValue")).toEqual([BUILD.id]);
    expect(itemTitles(wrapper, "Roles")).toEqual(["All", "Builder"]);
    expect(PeopleEmailServices.getRecipients).toHaveBeenLastCalledWith({
      tripIds: [BUILD.id],
      workerRoleIds: "all",
    });
    expect(wrapper.text()).toContain("Recipients: 1 person");

    wrapper.unmount();
  });

  it("Send asks for confirmation and shows results", async () => {
    const wrapper = await mountDialog();
    await setValue(wrapper, "VSelect", "Template", NEWSLETTER.id);
    expect(wrapper.text()).toContain("Recipients: 3 people");

    await button(wrapper, "Send").trigger("click");
    await flushPromises();
    const confirm = wrapper.findComponent(ConfirmDialog);
    expect(confirm.props("title")).toBe("Are you sure?");
    expect(confirm.text()).toContain("Send this email to 3 people?");
    expect(PeopleEmailServices.send).not.toHaveBeenCalled();

    await confirm.findAll("button").find((b) => b.text().trim() === "Send").trigger("click");
    await flushPromises();

    expect(PeopleEmailServices.send).toHaveBeenCalledWith({
      emailTemplateId: NEWSLETTER.id,
      subject: "Newsletter",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}",
      tripIds: "all",
      workerRoleIds: "all",
    });
    expect(wrapper.text()).toContain("Sent 3, skipped 0, failed 0");

    wrapper.unmount();
  });

  it("Dialog offers trip templates only for a single trip", async () => {
    const wrapper = await mountDialog();
    expect(itemTitles(wrapper, "Template")).toEqual(["Newsletter"]);

    await setValue(wrapper, "VSelect", "Trips", ["all", CLINIC.id]);

    expect(TripServices.getTeamEmailTemplates).toHaveBeenCalledWith(CLINIC.id);
    expect(itemTitles(wrapper, "Template")).toEqual(["Newsletter", "Trip Participant — Packing list"]);

    await setValue(wrapper, "VSelect", "Template", PACKING.id);
    expect(component(wrapper, "VTextField", "Subject").props("modelValue")).toBe("Packing list");

    await setValue(wrapper, "VSelect", "Trips", [CLINIC.id, BUILD.id]);

    expect(itemTitles(wrapper, "Template")).toEqual(["Newsletter"]);
    expect(component(wrapper, "VSelect", "Template").props("modelValue")).toBeNull();
    expect(component(wrapper, "VTextField", "Subject").props("modelValue")).toBe("");
    expect(component(wrapper, "VTextarea", "Email body").props("modelValue")).toBe("");

    wrapper.unmount();
  });
});
