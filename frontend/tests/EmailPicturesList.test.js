/**
 * Feature 77 — HTML Email Pictures
 * Spec: features/feature-77-html-email-pictures.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import EmailPicturesList from "../src/views/EmailPicturesList.vue";
import EmailPictureServices from "../src/services/emailPictureServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/emailPictureServices.js", () => ({
  default: {
    getAll: vi.fn(),
    upload: vi.fn(),
    rename: vi.fn(),
    delete: vi.fn(),
    fileUrl: (picture) => `http://localhost:3200/trips/${picture.url}`,
  },
}));

const CLINIC = {
  id: 5,
  name: "Clinic team",
  url: "images/email-pictures/org-3-abc.jpg",
  contentType: "image/jpeg",
  sizeBytes: 250 * 1024,
};
const BANNER = {
  id: 6,
  name: "Old banner",
  url: "images/email-pictures/org-3-def.png",
  contentType: "image/png",
  sizeBytes: 1.5 * 1024 * 1024,
};

describe("Feature 77 — HTML Email Pictures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "omar@example.com",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Hope Missions", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
    EmailPictureServices.getAll.mockResolvedValue({ data: [CLINIC, BANNER] });
    EmailPictureServices.rename.mockResolvedValue({ data: { ...CLINIC, name: "Clinic staff" } });
    EmailPictureServices.delete.mockResolvedValue({ data: { message: "Picture deleted." } });
  });

  const button = (wrapper, text, within = wrapper) =>
    within.findAll("button").find((b) => b.text().trim() === text);

  it("Pictures page manages the library", async () => {
    const { wrapper } = await mountWithPlugins(EmailPicturesList, {
      global: {
        plugins: [vuetify],
        stubs: {
          VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
        },
      },
    });
    await flushPromises();

    expect(EmailPictureServices.getAll).toHaveBeenCalledWith(3);
    const clinicCard = wrapper.find(`[data-testid="picture-${CLINIC.id}"]`);
    expect(clinicCard.text()).toContain("Clinic team");
    expect(clinicCard.text()).toContain("250 KB");
    expect(clinicCard.find("img").attributes("src")).toBe(`http://localhost:3200/trips/${CLINIC.url}`);
    expect(wrapper.find(`[data-testid="picture-${BANNER.id}"]`).text()).toContain("1.5 MB");

    await button(wrapper, "Rename", clinicCard).trigger("click");
    const nameField = wrapper.findAllComponents({ name: "VTextField" }).find((c) => c.props("label") === "Name");
    nameField.vm.$emit("update:modelValue", "Clinic staff");
    await flushPromises();
    await button(wrapper, "Save").trigger("click");
    await flushPromises();
    expect(EmailPictureServices.rename).toHaveBeenCalledWith(CLINIC.id, "Clinic staff");

    const bannerCard = wrapper.find(`[data-testid="picture-${BANNER.id}"]`);
    await button(wrapper, "Delete", bannerCard).trigger("click");
    expect(wrapper.text()).toContain("Delete this picture?");
    const confirmButton = wrapper
      .findAll("button")
      .filter((b) => b.text().trim() === "Delete")
      .at(-1);
    await confirmButton.trigger("click");
    await flushPromises();
    expect(EmailPictureServices.delete).toHaveBeenCalledWith(BANNER.id);

    expect(wrapper.text()).toContain("Clinic staff");
    expect(wrapper.text()).not.toContain("Clinic team");
    expect(wrapper.text()).not.toContain("Old banner");

    wrapper.unmount();
  });
});
