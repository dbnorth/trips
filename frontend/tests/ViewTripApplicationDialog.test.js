/**
 * Feature 26 — Role Capacity & Application Cancel / Uncancel
 * Spec: features/feature-26-role-capacity-and-cancel.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import ViewTripApplicationDialog from "../src/components/ViewTripApplicationDialog.vue";
import TripPeopleRoleServices from "../src/services/tripPeopleRoleServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/tripPeopleRoleServices.js", () => ({
  default: {
    get: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    uncancel: vi.fn(),
  },
}));

const application = {
  id: 42,
  status: "applied",
  version: 1,
  person: { firstName: "Ada", lastName: "Applicant" },
  tripWorkerRole: { workerRole: { name: "Nurse" } },
  willSelfFund: true,
  willRaiseFunds: false,
  hasPreferredRoommate: false,
};

const findBtn = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VBtn" }).find((b) => b.text().trim() === label);

describe("Feature 26 — Cancel / Uncancel confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripPeopleRoleServices.get.mockResolvedValue({ data: application });
    TripPeopleRoleServices.cancel.mockResolvedValue({ data: { ...application, status: "cancelled" } });
    TripPeopleRoleServices.uncancel.mockResolvedValue({
      data: { ...application, status: "applied" },
    });
  });

  it("Applicant cancels with confirmation prompts Are you sure?", async () => {
    const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
      props: {
        modelValue: false,
        participantId: 42,
        mode: "approve",
      },
      global: {
        stubs: {
          VDialog: { template: "<div><slot /></div>" },
        },
      },
    });

    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    await nextTick();

    expect(TripPeopleRoleServices.get).toHaveBeenCalledWith(42);
    const cancelBtn = findBtn(wrapper, "Cancel");
    expect(cancelBtn).toBeTruthy();
    await cancelBtn.trigger("click");
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("Are you sure?");
    const confirmBtn = findBtn(wrapper, "Cancel App");
    expect(confirmBtn).toBeTruthy();
    await confirmBtn.trigger("click");
    await flushPromises();

    expect(TripPeopleRoleServices.cancel).toHaveBeenCalledWith(42);
    wrapper.unmount();
  });

  it("Uncancel prompts Are you sure? before calling API", async () => {
    TripPeopleRoleServices.get.mockResolvedValue({
      data: { ...application, status: "cancelled" },
    });

    const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
      props: {
        modelValue: false,
        participantId: 42,
        mode: "view",
      },
      global: {
        stubs: {
          VDialog: { template: "<div><slot /></div>" },
        },
      },
    });

    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    await nextTick();

    const uncancelBtn = findBtn(wrapper, "Uncancel");
    expect(uncancelBtn).toBeTruthy();
    await uncancelBtn.trigger("click");
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("Are you sure?");
    // Confirm dialog also has Uncancel as confirm text; click the last matching button
    const uncancelButtons = wrapper
      .findAllComponents({ name: "VBtn" })
      .filter((b) => b.text().trim() === "Uncancel");
    expect(uncancelButtons.length).toBeGreaterThanOrEqual(2);
    await uncancelButtons[uncancelButtons.length - 1].trigger("click");
    await flushPromises();

    expect(TripPeopleRoleServices.uncancel).toHaveBeenCalledWith(42);
    wrapper.unmount();
  });

  it("Preview mode does not show Cancel", async () => {
    const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
      props: {
        modelValue: false,
        participantId: 42,
        mode: "preview",
      },
      global: {
        stubs: {
          VDialog: { template: "<div><slot /></div>" },
        },
      },
    });

    await wrapper.setProps({ modelValue: true });
    await flushPromises();
    await nextTick();

    const cancelBtn = findBtn(wrapper, "Cancel");
    expect(cancelBtn).toBeFalsy();
    wrapper.unmount();
  });
});

const rowValue = (wrapper, label) => {
  const row = wrapper.findAll("tr").find((tr) => tr.find("th").exists() && tr.find("th").text() === label);
  return row ? row.find("td").text() : null;
};

const openApplication = async (data) => {
  TripPeopleRoleServices.get.mockResolvedValue({ data });
  const { wrapper } = await mountWithPlugins(ViewTripApplicationDialog, {
    props: { modelValue: false, participantId: data.id, mode: "view" },
    global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  await nextTick();
  return wrapper;
};

describe("Feature 67 — Two-column application dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Application answers show the label beside the value", async () => {
    const wrapper = await openApplication(application);

    expect(rowValue(wrapper, "Worker role")).toBe("Nurse");
    expect(rowValue(wrapper, "Will self-fund")).toBe("Yes");
    wrapper.unmount();
  });

  it("Section headings stay above their rows", async () => {
    const wrapper = await openApplication(application);

    const heading = wrapper.findAll("div.text-subtitle-2").find((d) => d.text() === "Funding");
    expect(heading).toBeTruthy();
    const table = heading.element.nextElementSibling;
    const labels = [...table.querySelectorAll("th")].map((th) => th.textContent.trim());
    expect(labels).toEqual(["Will self-fund", "Will raise funds"]);
    wrapper.unmount();
  });

  it("Selected travel options show as label and value rows", async () => {
    const wrapper = await openApplication({
      ...application,
      travelOptions: [{ id: 7, setNumber: 1, description: "Extra night", priceAdjustment: 50, selected: true }],
    });

    const value = rowValue(wrapper, "Trip Option 1");
    expect(value).toContain("Extra night");
    expect(value).toContain("+$50.00");
    wrapper.unmount();
  });
});
