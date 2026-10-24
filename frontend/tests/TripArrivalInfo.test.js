/**
 * Feature 76 — Trip Arrival Info
 * Spec: features/feature-76-trip-arrival-info.md
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import TripArrivalInfo from "../src/components/TripArrivalInfo.vue";
import { mountWithPlugins, vuetify } from "./testUtils.js";

vi.mock("../src/services/tripServices.js", () => ({
  default: { uploadArrivalPdf: vi.fn(), openArrivalPdf: vi.fn(), removeArrivalPdf: vi.fn() },
}));

import TripServices from "../src/services/tripServices.js";

describe("Feature 76 — Trip Arrival Info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    TripServices.uploadArrivalPdf.mockResolvedValue({ data: { hasArrivalPdf: true } });
    TripServices.removeArrivalPdf.mockResolvedValue({ data: { hasArrivalPdf: false } });
  });

  describe("US-76.1 — Staff upload a trip's arrival PDF", () => {
    it("View Trip manages the Trip Arrival PDF", async () => {
      const { wrapper } = await mountWithPlugins(TripArrivalInfo, {
        props: { trip: { id: 7, name: "Guatemala Clinic", hasArrivalPdf: false } },
        global: {
          plugins: [vuetify],
          stubs: { VDialog: { props: ["modelValue"], template: '<div v-if="modelValue"><slot /></div>' } },
        },
      });
      const section = () => wrapper.find('[data-testid="trip-arrival-info"]');
      const buttons = () => section().findAll("button").map((button) => button.text());

      expect(section().text()).toContain("Trip arrival info");
      expect(section().text()).toContain("No Trip Arrival PDF.");
      expect(buttons()).toEqual(["Upload PDF"]);

      const pdf = new File(["%PDF-1.4"], "arrival.pdf", { type: "application/pdf" });
      const input = wrapper.find('[data-testid="trip-arrival-file"]');
      Object.defineProperty(input.element, "files", { value: [pdf] });
      await input.trigger("change");
      await flushPromises();
      expect(TripServices.uploadArrivalPdf).toHaveBeenCalledWith(7, pdf);
      expect(wrapper.emitted("changed")).toEqual([[true]]);

      await wrapper.setProps({ trip: { id: 7, name: "Guatemala Clinic", hasArrivalPdf: true } });
      expect(wrapper.find('[data-testid="trip-arrival-link"]').text()).toBe("Trip Arrival - Guatemala Clinic.pdf");
      expect(buttons()).toEqual(["Replace", "Remove"]);

      await section().findAll("button").find((button) => button.text() === "Remove").trigger("click");
      await flushPromises();
      expect(wrapper.text()).toContain("Remove the Trip Arrival PDF?");
      const confirm = wrapper.findAll("button").filter((button) => button.text() === "Remove").at(-1);
      await confirm.trigger("click");
      await flushPromises();
      expect(TripServices.removeArrivalPdf).toHaveBeenCalledWith(7);
      expect(wrapper.emitted("changed")).toEqual([[true], [false]]);

      wrapper.unmount();
    });
  });
});
