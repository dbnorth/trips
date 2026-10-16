/**
 * Feature 46 — Email Trip Team
 * Spec: features/feature-46-email-trip-team.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripTeamEmailDialog from "../src/components/TripTeamEmailDialog.vue";
import ConfirmDialog from "../src/components/ConfirmDialog.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: {
    getTeamEmailTemplates: vi.fn(),
    previewTeamEmail: vi.fn(),
    sendTeamEmail: vi.fn(),
  },
}));

import TripServices from "../src/services/tripServices.js";

const participant = (peopleId, firstName, status, roleName = "Trip Participant") => ({
  id: peopleId * 10,
  peopleId,
  status,
  role: { roleName },
  person: { firstName, lastName: "Lopez" },
});

const PARTICIPANTS = [
  participant(1, "Ana", "incomplete"),
  participant(2, "Ben", "applied"),
  participant(3, "Cy", "approved"),
  participant(4, "Dee", "declined"),
  participant(5, "Lee", "approved", "Trip Leader"),
];

describe("Feature 46 — Email Trip Team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.getTeamEmailTemplates.mockResolvedValue({
      data: [{ id: 7, tripId: null, subject: "Team update", emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}" }],
    });
    TripServices.previewTeamEmail.mockResolvedValue({
      data: {
        from: "office@example.org",
        replyTo: null,
        to: "ana@example.org",
        subject: "Team update",
        body: "Hi Ana",
      },
    });
    TripServices.sendTeamEmail.mockResolvedValue({
      data: { sent: 2, skipped: 0, failed: 0, results: [] },
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

  const setValue = async (wrapper, name, label, value) => {
    component(wrapper, name, label).vm.$emit("update:modelValue", value);
    await flushPromises();
  };

  const chooseTemplate = (wrapper) => setValue(wrapper, "VSelect", "Email template", 7);

  const button = (wrapper, text) =>
    wrapper.findAll("button").find((b) => b.text().trim() === text);

  it("Choosing a template fills subject and body for editing", async () => {
    const wrapper = await mountDialog();
    expect(TripServices.getTeamEmailTemplates).toHaveBeenCalledWith(42);

    await chooseTemplate(wrapper);

    const subject = component(wrapper, "VTextField", "Subject");
    const body = component(wrapper, "VTextarea", "Email body");
    expect(subject.props("modelValue")).toBe("Team update");
    expect(body.props("modelValue")).toBe("Hi {{PARTICIPANT_FIRST_NAME}}");
    expect(subject.props("disabled")).toBe(false);
    expect(body.props("disabled")).toBe(false);

    await setValue(wrapper, "VTextField", "Subject", "Packing list");
    expect(component(wrapper, "VTextField", "Subject").props("modelValue")).toBe("Packing list");

    wrapper.unmount();
  });

  it("Selected participants shows the participant picker", async () => {
    const wrapper = await mountDialog();
    expect(component(wrapper, "VAutocomplete", "Participants")).toBeUndefined();
    expect(wrapper.text()).toContain("Recipients: 3 participants");

    await setValue(wrapper, "VRadioGroup", "Send to", "selected");

    const picker = component(wrapper, "VAutocomplete", "Participants");
    expect(picker.props("items").map((item) => item.title)).toEqual([
      "Ana Lopez",
      "Ben Lopez",
      "Cy Lopez",
    ]);
    expect(wrapper.text()).toContain("Recipients: 0 participants");

    await setValue(wrapper, "VAutocomplete", "Participants", [1, 3]);
    expect(wrapper.text()).toContain("Recipients: 2 participants");

    wrapper.unmount();
  });

  it("Preview button shows the preview for the chosen recipient", async () => {
    const wrapper = await mountDialog();
    await chooseTemplate(wrapper);

    await button(wrapper, "Preview").trigger("click");
    await flushPromises();

    expect(component(wrapper, "VSelect", "Preview as").props("modelValue")).toBe(1);
    expect(TripServices.previewTeamEmail).toHaveBeenCalledWith(42, {
      emailTemplateId: 7,
      subject: "Team update",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}",
      sendTo: "potential",
      personId: 1,
    });
    const text = wrapper.text();
    expect(text).toContain("office@example.org");
    expect(text).toContain("ana@example.org");
    expect(text).toContain("Hi Ana");

    wrapper.unmount();
  });

  it("Send asks for confirmation with the number of recipients", async () => {
    const wrapper = await mountDialog();
    await chooseTemplate(wrapper);

    await button(wrapper, "Send").trigger("click");
    await flushPromises();

    const confirm = wrapper.findComponent(ConfirmDialog);
    expect(confirm.props("modelValue")).toBe(true);
    expect(confirm.props("title")).toBe("Are you sure?");
    expect(confirm.text()).toContain("Send this email to 3 participants?");
    expect(TripServices.sendTeamEmail).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("Cancelling the confirmation sends nothing", async () => {
    const wrapper = await mountDialog();
    await chooseTemplate(wrapper);
    await button(wrapper, "Send").trigger("click");
    await flushPromises();

    const confirm = wrapper.findComponent(ConfirmDialog);
    await confirm.findAll("button").find((b) => b.text().trim() === "Cancel").trigger("click");
    await flushPromises();

    expect(wrapper.findComponent(ConfirmDialog).props("modelValue")).toBe(false);
    expect(TripServices.sendTeamEmail).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("Send shows how many emails were sent", async () => {
    const wrapper = await mountDialog();
    await chooseTemplate(wrapper);
    await button(wrapper, "Send").trigger("click");
    await flushPromises();

    const confirm = wrapper.findComponent(ConfirmDialog);
    await confirm.findAll("button").find((b) => b.text().trim() === "Send").trigger("click");
    await flushPromises();

    expect(TripServices.sendTeamEmail).toHaveBeenCalledWith(42, {
      emailTemplateId: 7,
      subject: "Team update",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}",
      sendTo: "potential",
    });
    expect(wrapper.text()).toContain("2 sent, 0 skipped, 0 failed.");

    wrapper.unmount();
  });
});
