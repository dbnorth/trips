/**
 * Feature 67 — Two-Column Label and Value Layout for the Trip Page Profile and Application Dialogs
 * Spec: features/feature-67-two-column-trip-dialogs.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import ViewPersonProfileDialog from "../src/components/ViewPersonProfileDialog.vue";
import PersonServices from "../src/services/personServices.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/personServices.js", () => ({
  default: {
    get: vi.fn(),
    getPictureUrl: vi.fn(() => null),
  },
}));

const rowValue = (wrapper, label) => {
  const row = wrapper.findAll("tr").find((tr) => tr.find("th").exists() && tr.find("th").text() === label);
  return row ? row.find("td").text() : null;
};

const openProfile = async (person) => {
  PersonServices.get.mockResolvedValue({ data: person });
  const { wrapper } = await mountWithPlugins(ViewPersonProfileDialog, {
    props: { modelValue: false, personId: person.id },
    global: { stubs: { VDialog: { template: "<div><slot /></div>" } } },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  await nextTick();
  return wrapper;
};

describe("Feature 67 — Two-column profile dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Profile fields show the label beside the value", async () => {
    const wrapper = await openProfile({ id: 5, firstName: "Pat", lastName: "Person", city: "Austin" });

    expect(rowValue(wrapper, "First name")).toBe("Pat");
    expect(rowValue(wrapper, "City")).toBe("Austin");
    wrapper.unmount();
  });

  it("A missing required profile field shows Missing in the value column", async () => {
    const wrapper = await openProfile({ id: 6, firstName: "Pat", lastName: "Person", city: null });

    expect(rowValue(wrapper, "City")).toContain("Missing");
    wrapper.unmount();
  });
});
