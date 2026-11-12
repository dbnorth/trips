/**
 * Feature 130 — Donor Maintenance
 * Spec: features/feature-130-donor-maintenance.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import DonorsList from "../src/views/DonorsList.vue";
import DonorServices from "../src/services/donorServices.js";
import DonorEmailServices from "../src/services/donorEmailServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/donorServices.js", () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    importCsv: vi.fn(),
  },
}));

vi.mock("../src/services/donorEmailServices.js", () => ({
  default: {
    getOptions: vi.fn(),
    getRecipients: vi.fn(),
    preview: vi.fn(),
    send: vi.fn(),
  },
}));

const dialogStubs = {
  VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' },
};

const orgAdmin = {
  token: "t",
  isAdmin: false,
  orgRoles: [{ orgId: 4, orgName: "Hope Mission", roleName: "Org Admin" }],
  currentOrgId: 4,
};

const button = (wrapper, text) => wrapper.findAll("button").find((item) => item.text().trim() === text);

const field = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VTextField" }).find((item) => item.props("label") === label);

const select = (wrapper, label) =>
  wrapper.findAllComponents({ name: "VSelect" }).find((item) => item.props("label") === label);

describe("Feature 130 — Donor Maintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", orgAdmin);
    DonorServices.getAll.mockResolvedValue({ data: [] });
    DonorServices.create.mockResolvedValue({ data: { id: 1 } });
    DonorEmailServices.getOptions.mockResolvedValue({
      data: { templates: [{ id: 3, subject: "A note from Hope", emailBody: "Hi" }], trips: [] },
    });
    DonorEmailServices.getRecipients.mockResolvedValue({
      data: [{ id: 1, firstName: "Ana", lastName: "Lopez", email: "ana@example.com" }],
    });
  });

  it("Donor type is Organization or Individual", async () => {
    const rows = [];
    DonorServices.getAll.mockImplementation(() => Promise.resolve({ data: rows.map((row) => ({ ...row })) }));
    DonorServices.create.mockImplementation((payload) => {
      rows.push({ id: 1, city: "", ...payload });
      return Promise.resolve({ data: rows[0] });
    });
    const { wrapper } = await mountWithPlugins(DonorsList, { global: { stubs: dialogStubs } });
    await flushPromises();

    await button(wrapper, "Add donor").trigger("click");
    await flushPromises();
    select(wrapper, "Donor type").vm.$emit("update:modelValue", "organization");
    await flushPromises();
    expect(field(wrapper, "Family name")).toBeFalsy();
    field(wrapper, "Organization name").vm.$emit("update:modelValue", "Hope Church");
    await button(wrapper, "Save").trigger("click");
    await flushPromises();
    await flushPromises();

    expect(DonorServices.create).toHaveBeenCalledWith(
      expect.objectContaining({ donorType: "organization", organizationName: "Hope Church" })
    );
    expect(wrapper.text()).toContain("Hope Church");
    expect(wrapper.text()).toContain("Organization");
  });

  it("No Email is the dontcontact status", async () => {
    const rows = [];
    DonorServices.getAll.mockImplementation(() => Promise.resolve({ data: rows.map((row) => ({ ...row })) }));
    DonorServices.create.mockImplementation((payload) => {
      rows.push({ id: 1, city: "", ...payload });
      return Promise.resolve({ data: rows[0] });
    });
    const { wrapper } = await mountWithPlugins(DonorsList, { global: { stubs: dialogStubs } });
    await flushPromises();

    await button(wrapper, "Add donor").trigger("click");
    await flushPromises();
    expect(field(wrapper, "Family name")).toBeTruthy();
    field(wrapper, "First name").vm.$emit("update:modelValue", "Pat");
    select(wrapper, "Donor status").vm.$emit("update:modelValue", "dontcontact");
    await button(wrapper, "Save").trigger("click");
    await flushPromises();
    await flushPromises();

    expect(DonorServices.create).toHaveBeenCalledWith(expect.objectContaining({ status: "dontcontact", firstName: "Pat" }));
    expect(wrapper.text()).toContain("No Email");
  });

  it("All lists donors who can be emailed", async () => {
    const { wrapper } = await mountWithPlugins(DonorsList, { global: { stubs: dialogStubs } });
    await flushPromises();

    await button(wrapper, "Email").trigger("click");
    await flushPromises();

    expect(DonorEmailServices.getRecipients).toHaveBeenCalledWith({ scope: "all" });
    expect(select(wrapper, "Donors").props("modelValue")).toBe("all");
    expect(wrapper.text()).toContain("Ana Lopez");
    expect(wrapper.text()).not.toContain("Ben");
    expect(wrapper.text()).not.toContain("Cy");
  });

  it("Import is on the Donors page", async () => {
    const { wrapper } = await mountWithPlugins(DonorsList, { global: { stubs: dialogStubs } });
    await flushPromises();

    expect(button(wrapper, "Import")).toBeTruthy();
    await button(wrapper, "Import").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Import donors");
    expect(wrapper.text()).toContain("Donor contact list");
  });
});
