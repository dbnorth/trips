/**
 * Feature 106 — Styled Delete Confirmations
 * Spec: features/feature-106-styled-delete-confirmations.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import ConfirmDialog from "../src/components/ConfirmDialog.vue";
import WorkerRolesList from "../src/views/WorkerRolesList.vue";
import DocumentTypesList from "../src/views/DocumentTypesList.vue";
import MedicalConditionsList from "../src/views/MedicalConditionsList.vue";
import AirportsList from "../src/views/AirportsList.vue";
import AirlinesList from "../src/views/AirlinesList.vue";
import EmailTokensList from "../src/views/EmailTokensList.vue";
import EmailTypesList from "../src/views/EmailTypesList.vue";
import PersonDocumentsCard from "../src/components/PersonDocumentsCard.vue";
import WorkerRoleServices from "../src/services/workerRoleServices.js";
import DocumentTypeServices from "../src/services/documentTypeServices.js";
import MedicalConditionServices from "../src/services/medicalConditionServices.js";
import AirportServices from "../src/services/airportServices.js";
import AirlineServices from "../src/services/airlineServices.js";
import EmailTokenServices from "../src/services/emailTokenServices.js";
import EmailTypeServices from "../src/services/emailTypeServices.js";
import PersonDocumentServices from "../src/services/personDocumentServices.js";
import Utils from "../src/config/utils.js";
import { mountWithPlugins } from "./testUtils.js";

const { serviceMock, stub } = vi.hoisted(() => ({
  serviceMock: (extra = []) => ({
    default: Object.fromEntries(["getAll", "delete", ...extra].map((name) => [name, vi.fn()])),
  }),
  stub: (name) => ({ default: { name, template: "<div />", props: ["modelValue"] } }),
}));

vi.mock("../src/services/workerRoleServices.js", () => serviceMock());
vi.mock("../src/services/documentTypeServices.js", () => serviceMock());
vi.mock("../src/services/medicalConditionServices.js", () => serviceMock());
vi.mock("../src/services/airportServices.js", () => serviceMock());
vi.mock("../src/services/airlineServices.js", () => serviceMock());
vi.mock("../src/services/emailTokenServices.js", () => serviceMock(["getValueSources"]));
vi.mock("../src/services/emailTypeServices.js", () => serviceMock());
vi.mock("../src/services/personDocumentServices.js", () => serviceMock(["view"]));
vi.mock("../src/components/WorkerRoleFormDialog.vue", () => stub("WorkerRoleFormDialog"));
vi.mock("../src/components/DocumentTypeFormDialog.vue", () => stub("DocumentTypeFormDialog"));
vi.mock("../src/components/MedicalConditionFormDialog.vue", () => stub("MedicalConditionFormDialog"));
vi.mock("../src/components/EmailTokenFormDialog.vue", () => stub("EmailTokenFormDialog"));
vi.mock("../src/components/EmailTypeFormDialog.vue", () => stub("EmailTypeFormDialog"));
vi.mock("../src/components/CountrySelect.vue", () => stub("CountrySelect"));

const dialogStub = { template: "<div><slot /></div>" };
const mount = (component, props = {}) =>
  mountWithPlugins(component, { props, global: { stubs: { VDialog: dialogStub } } });

const rowFor = (wrapper, text) => wrapper.findAll("tr").find((tr) => tr.text().includes(text));
const deleteButtonIn = (row) =>
  row.findAll("button").find((b) => b.attributes("aria-label") === "Delete" || b.text().trim() === "Delete");
const dialogButton = (wrapper, label) =>
  wrapper
    .findComponent(ConfirmDialog)
    .findAll("button")
    .find((b) => b.text().trim() === label);

const dentist = {
  id: 1,
  name: "Dentist",
  status: "active",
  inUse: false,
  requiredDocumentTypes: [],
  requiredSpecializations: [],
};

const screens = [
  {
    name: "Worker roles",
    component: WorkerRolesList,
    service: WorkerRoleServices,
    item: dentist,
    rowText: "Dentist",
    message: 'Delete worker role "Dentist"?',
  },
  {
    name: "Document types",
    component: DocumentTypesList,
    service: DocumentTypeServices,
    item: { id: 2, description: "Dental License", type: "medical_license" },
    rowText: "Dental License",
    message: 'Delete document type "Dental License"?',
  },
  {
    name: "Medical conditions",
    component: MedicalConditionsList,
    service: MedicalConditionServices,
    item: { id: 3, name: "Asthma" },
    rowText: "Asthma",
    message: 'Delete medical condition "Asthma"?',
  },
  {
    name: "Airports",
    component: AirportsList,
    service: AirportServices,
    item: { id: 4, code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" },
    rowText: "GUA",
    message: 'Delete airport "GUA"?',
  },
  {
    name: "Airlines",
    component: AirlinesList,
    service: AirlineServices,
    item: { id: 5, code: "AA", name: "American Airlines" },
    rowText: "AA",
    message: 'Delete airline "AA"?',
  },
  {
    name: "Email tokens",
    component: EmailTokensList,
    service: EmailTokenServices,
    item: { id: 6, tokenCode: "TRIP_NAME", description: "Trip name", valueSource: "trip.name" },
    rowText: "TRIP_NAME",
    message: 'Delete token "TRIP_NAME"?',
  },
  {
    name: "Email types",
    component: EmailTypesList,
    service: EmailTypeServices,
    item: { id: 7, description: "Trip reminder" },
    rowText: "Trip reminder",
    message: 'Delete email type "Trip reminder"?',
  },
  {
    name: "Person documents",
    component: PersonDocumentsCard,
    props: { personId: 5 },
    service: PersonDocumentServices,
    item: {
      id: 8,
      documentTypeId: 1,
      documentFileName: "people/passport.pdf",
      documentType: { id: 1, description: "Passport", type: "passport" },
    },
    rowText: "Passport",
    message: 'Delete document "passport.pdf"?',
    deleteArgs: [5, 8],
  },
];

describe("Feature 106 — Styled Delete Confirmations", () => {
  let browserConfirm;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Utils.setStore("user", {
      userId: 1,
      personId: 1,
      email: "olivia@example.org",
      isAdmin: true,
      token: "t",
      orgRoles: [{ orgId: 3, orgName: "Mission Health", roleName: "Org Admin" }],
      tripRoles: [],
      currentOrgId: 3,
    });
    for (const { service, item } of screens) {
      service.getAll.mockResolvedValue({ data: [item] });
      service.delete.mockResolvedValue({ data: {} });
    }
    EmailTokenServices.getValueSources.mockResolvedValue({ data: [] });
    browserConfirm = vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("US-106.1 — Confirm deletes in the app's own dialog", () => {
    it("Delete asks in the app's dialog and deletes on confirm", async () => {
      const { wrapper } = await mount(WorkerRolesList);
      await flushPromises();

      await deleteButtonIn(rowFor(wrapper, "Dentist")).trigger("click");
      const confirm = wrapper.findComponent(ConfirmDialog);
      expect(confirm.props("modelValue")).toBe(true);
      expect(confirm.text()).toContain("Are you sure?");
      expect(confirm.text()).toContain('Delete worker role "Dentist"?');
      expect(dialogButton(wrapper, "Cancel")).toBeTruthy();
      expect(dialogButton(wrapper, "Delete")).toBeTruthy();
      expect(confirm.props("confirmColor")).toBe("error");
      expect(browserConfirm).not.toHaveBeenCalled();

      WorkerRoleServices.getAll.mockResolvedValue({ data: [] });
      await dialogButton(wrapper, "Delete").trigger("click");
      await flushPromises();

      expect(WorkerRoleServices.delete).toHaveBeenCalledWith(1);
      expect(wrapper.findComponent(ConfirmDialog).props("modelValue")).toBe(false);
      expect(wrapper.text()).toContain("Worker role deleted.");
      expect(rowFor(wrapper, "Dentist")).toBeUndefined();

      wrapper.unmount();
    });

    it("Cancel in the delete dialog deletes nothing", async () => {
      const { wrapper } = await mount(WorkerRolesList);
      await flushPromises();

      await deleteButtonIn(rowFor(wrapper, "Dentist")).trigger("click");
      await dialogButton(wrapper, "Cancel").trigger("click");
      await flushPromises();

      expect(wrapper.findComponent(ConfirmDialog).props("modelValue")).toBe(false);
      expect(WorkerRoleServices.delete).not.toHaveBeenCalled();
      expect(rowFor(wrapper, "Dentist")).toBeTruthy();

      wrapper.unmount();
    });

    it.each(screens)("Every delete confirmation uses the app's dialog: $name", async (screen) => {
      const { wrapper } = await mount(screen.component, screen.props);
      await flushPromises();

      await deleteButtonIn(rowFor(wrapper, screen.rowText)).trigger("click");
      const confirm = wrapper.findComponent(ConfirmDialog);
      expect(confirm.props("modelValue")).toBe(true);
      expect(confirm.props("title")).toBe("Are you sure?");
      expect(confirm.props("message")).toBe(screen.message);
      expect(browserConfirm).not.toHaveBeenCalled();

      await dialogButton(wrapper, "Delete").trigger("click");
      await flushPromises();
      expect(screen.service.delete).toHaveBeenCalledWith(...(screen.deleteArgs || [screen.item.id]));

      wrapper.unmount();
    });
  });
});
