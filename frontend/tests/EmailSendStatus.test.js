/**
 * Feature 87 — Email Send Status Dialog
 * Spec: features/feature-87-email-send-status.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripTeamEmailDialog from "../src/components/TripTeamEmailDialog.vue";
import PeopleEmailDialog from "../src/components/PeopleEmailDialog.vue";
import ConfirmDialog from "../src/components/ConfirmDialog.vue";
import EmailSendStatusDialog from "../src/components/EmailSendStatusDialog.vue";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getTeamEmailTemplates: vi.fn(),
    previewTeamEmail: vi.fn(),
    sendTeamEmail: vi.fn(),
    getFlightItineraryEmailTemplates: vi.fn(),
    previewFlightItineraryEmail: vi.fn(),
    sendFlightItineraryEmail: vi.fn(),
  },
}));
vi.mock("../src/services/peopleEmailServices.js", () => ({
  default: {
    getOptions: vi.fn(),
    getRecipients: vi.fn(),
    preview: vi.fn(),
    send: vi.fn(),
  },
}));
vi.mock("../src/services/emailPictureServices.js", () => ({
  default: { getAll: vi.fn().mockResolvedValue({ data: [] }), fileUrl: () => "" },
}));

import TripServices from "../src/services/tripServices.js";
import PeopleEmailServices from "../src/services/peopleEmailServices.js";

const TEAM_UPDATE = { id: 7, tripId: null, subject: "Trip team update", emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}" };
const ITINERARY = { id: 9, tripId: null, subject: "Your {{TRIP_NAME}} flight itinerary", emailBody: "Hi" };
const PEOPLE_UPDATE = { id: 11, subject: "People update", emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}" };

const participant = (peopleId, firstName, lastName) => ({
  id: peopleId * 10,
  peopleId,
  status: "approved",
  role: { roleName: "Trip Participant" },
  person: { firstName, lastName },
});
const PARTICIPANTS = [participant(1, "Ana", "Lopez"), participant(2, "Ben", "Cruz"), participant(3, "Cy", "Diaz")];

const dialogStubs = {
  VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
};

const component = (wrapper, name, label) =>
  wrapper.findAllComponents({ name }).find((c) => c.props("label") === label);

const setValue = async (wrapper, name, label, value) => {
  component(wrapper, name, label).vm.$emit("update:modelValue", value);
  await flushPromises();
};

const button = (wrapper, text) => wrapper.findAll("button").find((b) => b.text().trim() === text);

const confirmSend = async (wrapper) => {
  await button(wrapper, "Send").trigger("click");
  await flushPromises();
  const confirm = wrapper.findComponent(ConfirmDialog);
  await button(confirm, "Send").trigger("click");
};

const status = (wrapper) => wrapper.findComponent(EmailSendStatusDialog);

/** The status dialog's count tiles as { attempted, sent, skipped, failed }. */
const counts = (wrapper) =>
  Object.fromEntries(
    ["attempted", "sent", "skipped", "failed"].map((key) => [
      key,
      status(wrapper).find(`[data-testid="email-status-${key}"] .text-h5`).text(),
    ])
  );

const closedEmailDialog = (wrapper) => (wrapper.emitted("update:modelValue") || []).some(([v]) => v === false);

describe("Feature 87 — Email Send Status Dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.getTeamEmailTemplates.mockResolvedValue({ data: [TEAM_UPDATE] });
    TripServices.getFlightItineraryEmailTemplates.mockResolvedValue({ data: [ITINERARY] });
    PeopleEmailServices.getOptions.mockResolvedValue({ data: { templates: [PEOPLE_UPDATE], trips: [] } });
    PeopleEmailServices.getRecipients.mockResolvedValue({
      data: [
        { personId: 1, name: "Ana Lopez" },
        { personId: 2, name: "Ben Cruz" },
      ],
    });
  });

  /** Email team with Trip team update chosen and All accepted participants (Ana, Ben, Cy). */
  const mountTeamEmail = async (kind = "team") => {
    const { wrapper } = await mountWithPlugins(TripTeamEmailDialog, {
      props: { modelValue: true, tripId: 42, participants: PARTICIPANTS, kind },
      global: { stubs: dialogStubs },
    });
    await flushPromises();
    await setValue(wrapper, "VSelect", "Email template", kind === "team" ? TEAM_UPDATE.id : ITINERARY.id);
    await setValue(wrapper, "VRadioGroup", "Send to", "accepted");
    return wrapper;
  };

  describe("US-87.1 — See what happened when I send email", () => {
    it("Sending shows a status dialog while the emails go out", async () => {
      let finish;
      TripServices.sendTeamEmail.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const wrapper = await mountTeamEmail();

      await confirmSend(wrapper);
      await flushPromises();

      expect(wrapper.findComponent(ConfirmDialog).props("modelValue")).toBe(false);
      expect(status(wrapper).props("modelValue")).toBe(true);
      expect(status(wrapper).text()).toContain("Sending 3 emails…");
      expect(status(wrapper).findComponent({ name: "VProgressCircular" }).exists()).toBe(true);
      expect(button(status(wrapper), "OK")).toBeUndefined();

      finish({ data: { sent: 3, skipped: 0, failed: 0, results: [] } });
      await flushPromises();
      expect(button(status(wrapper), "OK")).toBeTruthy();

      wrapper.unmount();
    });

    it("Every email was sent", async () => {
      TripServices.sendTeamEmail.mockResolvedValue({ data: { sent: 3, skipped: 0, failed: 0, results: [] } });
      const wrapper = await mountTeamEmail();

      await confirmSend(wrapper);
      await flushPromises();

      const text = status(wrapper).text();
      expect(text).toContain("Emails sent");
      expect(text).toContain("3 of 3 emails sent");
      expect(counts(wrapper)).toEqual({ attempted: "3", sent: "3", skipped: "0", failed: "0" });

      await button(status(wrapper), "OK").trigger("click");
      await flushPromises();
      expect(status(wrapper).props("modelValue")).toBe(false);
      expect(closedEmailDialog(wrapper)).toBe(true);

      wrapper.unmount();
    });

    it("Some emails were not sent", async () => {
      TripServices.sendTeamEmail.mockResolvedValue({
        data: {
          sent: 1,
          skipped: 1,
          failed: 1,
          results: [
            { personId: 1, name: "Ana Lopez", status: "sent", reason: null },
            { personId: 2, name: "Ben Cruz", status: "skipped", reason: "No recipients." },
            { personId: 3, name: "Cy Diaz", status: "failed", reason: "Connection refused" },
          ],
        },
      });
      const wrapper = await mountTeamEmail();

      await confirmSend(wrapper);
      await flushPromises();

      const text = status(wrapper).text();
      expect(text).toContain("Some emails not sent");
      expect(counts(wrapper)).toEqual({ attempted: "3", sent: "1", skipped: "1", failed: "1" });
      expect(text).toContain("Ben Cruz: skipped — No recipients.");
      expect(text).toContain("Cy Diaz: failed — Connection refused");
      expect(text).not.toContain("Ana Lopez");

      await button(status(wrapper), "OK").trigger("click");
      await flushPromises();
      expect(status(wrapper).props("modelValue")).toBe(false);
      expect(closedEmailDialog(wrapper)).toBe(false);
      expect(component(wrapper, "VSelect", "Email template").props("modelValue")).toBe(TEAM_UPDATE.id);
      expect(component(wrapper, "VTextField", "Subject").props("modelValue")).toBe("Trip team update");
      expect(component(wrapper, "RichTextEditor", "Email body").props("modelValue")).toBe(TEAM_UPDATE.emailBody);
      expect(component(wrapper, "VRadioGroup", "Send to").props("modelValue")).toBe("accepted");
      expect(wrapper.text()).not.toContain("Attempted");
      expect(wrapper.text()).not.toMatch(/\d sent, \d skipped/);

      wrapper.unmount();
    });

    it("The send request fails", async () => {
      TripServices.sendTeamEmail.mockRejectedValue({
        response: { status: 400, data: { message: "Choose a Trip Participant template for this trip." } },
      });
      const wrapper = await mountTeamEmail();

      await confirmSend(wrapper);
      await flushPromises();

      const text = status(wrapper).text();
      expect(text).toContain("Email not sent");
      expect(text).toContain("Choose a Trip Participant template for this trip.");
      expect(status(wrapper).find('[data-testid="email-status-attempted"]').exists()).toBe(false);

      await button(status(wrapper), "OK").trigger("click");
      await flushPromises();
      expect(status(wrapper).props("modelValue")).toBe(false);
      expect(closedEmailDialog(wrapper)).toBe(false);
      expect(wrapper.text()).not.toContain("Choose a Trip Participant template for this trip.");

      wrapper.unmount();
    });
  });

  describe("US-87.2 — The same status on every email dialog", () => {
    it("Email people shows the status dialog", async () => {
      Utils.setStore("user", { token: "t", isAdmin: true, actingOrganizationId: 3, currentOrgId: 3 });
      PeopleEmailServices.send.mockResolvedValue({ data: { sent: 2, skipped: 0, failed: 0, results: [] } });
      const { wrapper } = await mountWithPlugins(PeopleEmailDialog, {
        props: { modelValue: true },
        global: { stubs: dialogStubs },
      });
      await flushPromises();
      await setValue(wrapper, "VSelect", "Template", PEOPLE_UPDATE.id);

      await confirmSend(wrapper);
      await flushPromises();

      const text = status(wrapper).text();
      expect(text).toContain("Emails sent");
      expect(counts(wrapper)).toMatchObject({ attempted: "2", sent: "2" });

      await button(status(wrapper), "OK").trigger("click");
      await flushPromises();
      expect(closedEmailDialog(wrapper)).toBe(true);

      wrapper.unmount();
      Utils.removeItem("user");
    });

    it("Email flight itinerary shows the status dialog", async () => {
      TripServices.sendFlightItineraryEmail.mockResolvedValue({
        data: {
          sent: 1,
          skipped: 1,
          failed: 0,
          results: [
            { personId: 1, name: "Ana Lopez", status: "sent", reason: null },
            { personId: 2, name: "Ben Cruz", status: "skipped", reason: "No flight segments." },
          ],
        },
      });
      const wrapper = await mountTeamEmail("flightItinerary");
      await setValue(wrapper, "VRadioGroup", "Send to", "selected");
      await setValue(wrapper, "VAutocomplete", "Participants", [1, 2]);

      await confirmSend(wrapper);
      await flushPromises();

      expect(TripServices.sendFlightItineraryEmail).toHaveBeenCalled();
      const text = status(wrapper).text();
      expect(text).toContain("Some emails not sent");
      expect(counts(wrapper)).toMatchObject({ attempted: "2", sent: "1", skipped: "1" });
      expect(text).toContain("Ben Cruz: skipped — No flight segments.");

      wrapper.unmount();
    });
  });
});
