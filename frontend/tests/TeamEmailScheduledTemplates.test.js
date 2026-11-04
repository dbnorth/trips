/**
 * Feature 114 — Scheduled Templates in Email Team
 * Spec: features/feature-114-team-email-scheduled-templates.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripTeamEmailDialog from "../src/components/TripTeamEmailDialog.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getTeamEmailTemplates: vi.fn(),
    getTeamEmailRecipients: vi.fn(),
    previewTeamEmail: vi.fn(),
    sendTeamEmail: vi.fn(),
  },
}));

import TripServices from "../src/services/tripServices.js";

const DOCUMENTS_REMINDER = {
  id: 9,
  tripId: null,
  functionCode: "Scheduled",
  subject: "Reminder: upload your documents for {{TRIP_NAME}}",
  emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}",
};

const TEAM_UPDATE = {
  id: 7,
  tripId: null,
  functionCode: "Trip Participant",
  subject: "Team update",
  emailBody: "Hi team",
};

const PARTICIPANTS = [
  { id: 10, peopleId: 1, status: "pre_approved", role: { roleName: "Trip Participant" }, person: { firstName: "Maria", lastName: "Lopez" } },
  { id: 20, peopleId: 2, status: "pre_approved", role: { roleName: "Trip Participant" }, person: { firstName: "Juan", lastName: "Lopez" } },
  { id: 30, peopleId: 3, status: "incomplete", role: { roleName: "Trip Participant" }, person: { firstName: "Ana", lastName: "Lopez" } },
];

describe("Feature 114 — Scheduled Templates in Email Team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.getTeamEmailTemplates.mockResolvedValue({ data: [DOCUMENTS_REMINDER, TEAM_UPDATE] });
    TripServices.getTeamEmailRecipients.mockResolvedValue({
      data: [{ id: 1, firstName: "Maria", lastName: "Lopez", email: "maria@example.org" }],
    });
  });

  const mountDialog = async () => {
    const { wrapper } = await mountWithPlugins(TripTeamEmailDialog, {
      props: { modelValue: true, tripId: 42, participants: PARTICIPANTS },
      global: {
        plugins: [vuetify],
        stubs: {
          VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        },
      },
    });
    await flushPromises();
    return wrapper;
  };

  const component = (wrapper, name, label) =>
    wrapper.findAllComponents({ name }).find((c) => c.props("label") === label);

  const chooseTemplate = async (wrapper, id) => {
    component(wrapper, "VSelect", "Email template").vm.$emit("update:modelValue", id);
    await flushPromises();
  };

  const sendToLabels = (wrapper) =>
    wrapper.findAllComponents({ name: "VRadio" }).map((radio) => radio.props("label"));

  const button = (wrapper, text) => wrapper.findAll("button").find((b) => b.text().trim() === text);

  describe("US-114.1 — See the trip's scheduled reminders in Email team", () => {
    it("Scheduled template labelled in the dialog", async () => {
      const wrapper = await mountDialog();

      const titles = component(wrapper, "VSelect", "Email template")
        .props("items")
        .map((item) => item.title);
      expect(titles).toEqual(["Reminder: upload your documents for {{TRIP_NAME}} (Scheduled)", "Team update"]);

      wrapper.unmount();
    });
  });

  describe("US-114.2 — Send a scheduled reminder only to the people it is for", () => {
    it("Send to options for a scheduled template", async () => {
      const wrapper = await mountDialog();

      await chooseTemplate(wrapper, DOCUMENTS_REMINDER.id);

      expect(TripServices.getTeamEmailRecipients).toHaveBeenCalledWith(42, DOCUMENTS_REMINDER.id);
      expect(sendToLabels(wrapper)).toEqual(["All participants this email is for", "Selected participants"]);
      expect(wrapper.text()).toContain("Recipients: 1 participant");
      expect(wrapper.text()).not.toContain("Recipients: 1 participants");

      await chooseTemplate(wrapper, TEAM_UPDATE.id);

      expect(sendToLabels(wrapper)).toEqual([
        "All potential participants",
        "All accepted participants",
        "Selected participants",
      ]);
      expect(wrapper.text()).toContain("Recipients: 3 participants");

      wrapper.unmount();
    });

    it("Nobody to send to", async () => {
      TripServices.getTeamEmailRecipients.mockResolvedValue({ data: [] });
      const wrapper = await mountDialog();

      await chooseTemplate(wrapper, DOCUMENTS_REMINDER.id);

      expect(wrapper.find('[data-testid="no-rule-recipients"]').text()).toBe(
        "No participants this email is for right now."
      );
      expect(button(wrapper, "Send").attributes("disabled")).toBeDefined();
      expect(button(wrapper, "Preview").attributes("disabled")).toBeDefined();

      wrapper.unmount();
    });
  });
});
