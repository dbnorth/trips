/**
 * Feature 117 — Email Type Event Description
 * Spec: features/feature-117-email-type-event-description.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailTypesList from "../src/views/EmailTypesList.vue";
import EmailTypeFormDialog from "../src/components/EmailTypeFormDialog.vue";
import EmailTemplatesList from "../src/views/EmailTemplatesList.vue";
import EmailTypeServices from "../src/services/emailTypeServices.js";
import EmailTemplateServices from "../src/services/emailTemplateServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/emailTypeServices.js", () => ({
  default: { getAll: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock("../src/services/emailTemplateServices.js", () => ({
  default: { getAll: vi.fn() },
}));

const DEPOSIT_RECEIVED =
  "This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount.";

const dialogStub = { template: "<div><slot /></div>" };

const field = (wrapper, name, label) =>
  wrapper.findAllComponents({ name }).find((c) => c.props("label") === label);

const clickSave = async (wrapper) => {
  await wrapper
    .findAllComponents({ name: "VBtn" })
    .find((b) => b.text().trim() === "Save")
    .trigger("click");
  await flushPromises();
};

describe("Feature 117 — Email Type Event Description", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("US-117.1 — Describe what an email type's event means", () => {
    it("Email types list shows the event description", async () => {
      Utils.setStore("user", { userId: 1, isAdmin: true, token: "t", orgRoles: [], tripRoles: [] });
      EmailTypeServices.getAll.mockResolvedValue({
        data: [
          {
            id: 1,
            typeCode: "deposit-received",
            description: "Deposit received",
            eventCode: "deposit-received",
            eventDescription: DEPOSIT_RECEIVED,
          },
        ],
      });

      const { wrapper } = await mountWithPlugins(EmailTypesList, {
        global: { stubs: { EmailTypeFormDialog: true, ConfirmDialog: true } },
      });
      await flushPromises();

      const headers = wrapper.findAll("thead th").map((th) => th.text());
      expect(headers.indexOf("Event description")).toBe(headers.indexOf("Event code") + 1);
      const row = wrapper.findAll("tbody tr").find((tr) => tr.text().includes("Deposit received"));
      expect(row.text()).toContain(DEPOSIT_RECEIVED);
      wrapper.unmount();
    });

    it("Add and edit an email type's event description", async () => {
      EmailTypeServices.create.mockResolvedValue({ data: { id: 9 } });
      const { wrapper: add } = await mountWithPlugins(EmailTypeFormDialog, {
        props: { modelValue: true },
        global: { stubs: { VDialog: dialogStub } },
      });
      await flushPromises();

      field(add, "VTextField", "Type code").vm.$emit("update:modelValue", "trip-complete");
      field(add, "VTextField", "Description").vm.$emit("update:modelValue", "Trip complete");
      field(add, "VTextField", "Event code").vm.$emit("update:modelValue", "trip-complete");
      field(add, "VTextarea", "Event description").vm.$emit(
        "update:modelValue",
        "  This event happens when staff mark a trip complete. "
      );
      await flushPromises();
      await clickSave(add);

      expect(EmailTypeServices.create).toHaveBeenCalledWith({
        typeCode: "trip-complete",
        description: "Trip complete",
        eventCode: "trip-complete",
        eventDescription: "This event happens when staff mark a trip complete.",
      });
      add.unmount();

      EmailTypeServices.get.mockResolvedValue({
        data: {
          id: 1,
          typeCode: "deposit-received",
          description: "Deposit received",
          eventCode: "deposit-received",
          eventDescription: DEPOSIT_RECEIVED,
        },
      });
      const { wrapper: edit } = await mountWithPlugins(EmailTypeFormDialog, {
        props: { modelValue: true, emailTypeId: 1 },
        global: { stubs: { VDialog: dialogStub } },
      });
      await flushPromises();

      expect(field(edit, "VTextarea", "Event description").props("modelValue")).toBe(DEPOSIT_RECEIVED);
      edit.unmount();
    });
  });

  describe("US-117.3 — See a template's event description on the templates list", () => {
    it("Templates list shows the event description on hover", async () => {
      Utils.setStore("user", {
        userId: 2,
        personId: 2,
        isAdmin: false,
        token: "t",
        orgRoles: [{ orgId: 3, orgName: "Hope Missions", roleName: "Org Admin" }],
        tripRoles: [],
        currentOrgId: 3,
      });
      const row = (id, subject, emailType) => ({
        id,
        orgId: 3,
        tripId: null,
        functionCode: "Send Now",
        subject,
        fromEmail: "trips@example.org",
        organization: { id: 3, name: "Hope Missions" },
        emailType,
      });
      EmailTemplateServices.getAll.mockResolvedValue({
        data: [
          row(1, "Deposit thanks", { id: 1, description: "Deposit received", eventDescription: DEPOSIT_RECEIVED }),
          row(2, "Team news", { id: 2, description: "Trip team update", eventDescription: null }),
          row(3, "No type", null),
        ],
      });

      const { wrapper } = await mountWithPlugins(EmailTemplatesList, {
        global: {
          stubs: {
            EmailTemplateFormDialog: true,
            VTooltip: { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
          },
        },
      });
      await flushPromises();

      const rowFor = (subject) => wrapper.findAll("tbody tr").find((tr) => tr.text().includes(subject));
      const deposit = rowFor("Deposit thanks");
      expect(deposit.find('[data-testid="event-description-info"]').attributes("aria-label")).toBe(
        "Event description"
      );
      expect(deposit.find('[data-testid="event-description"]').text()).toBe(DEPOSIT_RECEIVED);
      expect(rowFor("Team news").find('[data-testid="event-description"]').text()).toBe("No event description.");
      expect(rowFor("No type").find('[data-testid="event-description-info"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });
});
