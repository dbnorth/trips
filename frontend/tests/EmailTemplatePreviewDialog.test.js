/**
 * Feature 40 — Email Template Tokens and Preview
 * Spec: features/feature-40-email-template-tokens.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTemplatePreviewDialog from "../src/components/EmailTemplatePreviewDialog.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/emailTemplateServices.js", () => ({
  default: { preview: vi.fn() },
}));

vi.mock("../src/services/tripServices.js", () => ({
  default: { getAll: vi.fn() },
}));

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: { getAll: vi.fn() },
}));

import EmailTemplateServices from "../src/services/emailTemplateServices.js";
import TripServices from "../src/services/tripServices.js";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";

describe("Feature 40 — Email Template Tokens and Preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.getAll.mockResolvedValue({
      data: [
        { id: 11, orgId: 3, name: "Guatemala Clinic" },
        { id: 12, orgId: 3, name: "Kenya Build" },
        { id: 13, orgId: 9, name: "Other Org Trip" },
      ],
    });
    TripPeopleRoleServices.getAll.mockResolvedValue({
      data: [
        { id: 1, peopleId: 21, role: { roleName: "Trip Participant" }, person: { firstName: "Pat", lastName: "Smith" } },
        { id: 2, peopleId: 5, role: { roleName: "Trip Leader" }, person: { firstName: "Ann", lastName: "Lead" } },
      ],
    });
    EmailTemplateServices.preview.mockResolvedValue({
      data: { subject: "Welcome to Guatemala Clinic", emailBody: "Hi Pat" },
    });
  });

  it("Preview shows trip and participant choices", async () => {
    const { wrapper } = await mountWithPlugins(EmailTemplatePreviewDialog, {
      props: {
        modelValue: true,
        orgId: 3,
        tripId: 11,
        fromEmail: "trips@example.com",
        subject: "Welcome to {{TRIP_NAME}}",
        emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}",
      },
      global: {
        plugins: [vuetify],
        stubs: { VDialog: { template: "<div><slot /></div>" } },
      },
    });
    await flushPromises();

    const selects = wrapper.findAllComponents({ name: "VSelect" });
    const trip = selects.find((select) => select.props("label") === "Trip");
    const participant = selects.find((select) => select.props("label") === "Participant");

    expect(trip.props("items").map((item) => item.title)).toEqual(["Guatemala Clinic", "Kenya Build"]);
    expect(trip.props("modelValue")).toBe(11);
    expect(participant.props("items").map((item) => item.title)).toEqual(["Pat Smith"]);

    participant.vm.$emit("update:modelValue", 21);
    await flushPromises();

    expect(EmailTemplateServices.preview).toHaveBeenLastCalledWith({
      orgId: 3,
      tripId: 11,
      personId: 21,
      subject: "Welcome to {{TRIP_NAME}}",
      emailBody: "Hi {{PARTICIPANT_FIRST_NAME}}",
    });
    const text = wrapper.text();
    expect(text).toContain("trips@example.com");
    expect(text).toContain("Welcome to Guatemala Clinic");
    expect(text).toContain("Hi Pat");

    wrapper.unmount();
  });
});
