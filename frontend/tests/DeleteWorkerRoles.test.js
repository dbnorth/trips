/**
 * Feature 105 — Delete Unused Worker Roles
 * Spec: features/feature-105-delete-unused-worker-roles.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import WorkerRolesList from "../src/views/WorkerRolesList.vue";
import WorkerRoleServices from "../src/services/workerRoleServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/workerRoleServices.js", () => ({
  default: { getAll: vi.fn(), delete: vi.fn() },
}));

vi.mock("../src/components/WorkerRoleFormDialog.vue", () => ({
  default: { name: "WorkerRoleFormDialog", template: "<div />", props: ["modelValue"] },
}));

const role = (id, name, inUse) => ({
  id,
  name,
  status: "active",
  inUse,
  requiredDocumentTypes: [],
  requiredSpecializations: [],
});

const rowFor = (wrapper, name) => wrapper.findAll("tbody tr").find((tr) => tr.text().includes(name));
const actionLabels = (row) => row.findAll("button").map((b) => b.attributes("aria-label"));

describe("Feature 105 — Delete Unused Worker Roles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 2,
      personId: 2,
      email: "olivia@example.org",
      isAdmin: false,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Mission Health", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
    WorkerRoleServices.getAll.mockResolvedValue({
      data: [role(1, "Dentist", false), role(2, "Nurse", true)],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("US-105.1 — Delete a worker role no trip uses", () => {
    it("Worker roles page shows Delete only on roles no trip uses", async () => {
      const { wrapper } = await mountWithPlugins(WorkerRolesList);
      await flushPromises();

      expect(actionLabels(rowFor(wrapper, "Dentist"))).toEqual(["Edit", "Delete"]);
      expect(actionLabels(rowFor(wrapper, "Nurse"))).toEqual(["Edit"]);
      expect(rowFor(wrapper, "Dentist").find('button[aria-label="Delete"]').classes()).toContain(
        "text-error"
      );

      wrapper.unmount();
    });

    it("Deleting a role after confirming removes it from the list", async () => {
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
      const { wrapper } = await mountWithPlugins(WorkerRolesList);
      await flushPromises();

      await rowFor(wrapper, "Dentist").find('button[aria-label="Delete"]').trigger("click");
      await flushPromises();
      expect(confirm).toHaveBeenCalledWith('Delete worker role "Dentist"?');
      expect(WorkerRoleServices.delete).not.toHaveBeenCalled();

      confirm.mockReturnValue(true);
      WorkerRoleServices.delete.mockResolvedValue({ data: { message: "Worker role deleted." } });
      WorkerRoleServices.getAll.mockResolvedValue({ data: [role(2, "Nurse", true)] });
      await rowFor(wrapper, "Dentist").find('button[aria-label="Delete"]').trigger("click");
      await flushPromises();

      expect(WorkerRoleServices.delete).toHaveBeenCalledWith(1);
      expect(wrapper.text()).toContain("Worker role deleted.");
      expect(rowFor(wrapper, "Dentist")).toBeUndefined();

      wrapper.unmount();
    });
  });
});
