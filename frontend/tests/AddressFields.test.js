/**
 * Feature 16 — Default Country Selects to United States
 * Spec: features/feature-16-default-country-united-states.md
 */

import { describe, it, expect } from "vitest";
import { reactive, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import AddressFields from "../src/components/AddressFields.vue";
import { US_COUNTRY_CODE } from "../src/utils/locationData.js";
import { mountWithPlugins } from "./testUtils.js";

describe("AddressFields — Feature 16", () => {
  it("Address country defaults to United States on Add person", async () => {
    const address = reactive({
      country: "",
      addLine1: "",
      addLine2: "",
      city: "",
      state_prov: "",
      postalCode: "",
    });

    const { wrapper } = await mountWithPlugins(AddressFields, {
      props: { modelValue: address },
    });
    await flushPromises();
    await nextTick();

    expect(address.country).toBe(US_COUNTRY_CODE);
    wrapper.unmount();
  });

  it("Existing non-US address country is preserved on edit", async () => {
    const address = reactive({
      country: "CA",
      addLine1: "",
      addLine2: "",
      city: "",
      state_prov: "",
      postalCode: "",
    });

    const { wrapper } = await mountWithPlugins(AddressFields, {
      props: { modelValue: address },
    });
    await flushPromises();
    await nextTick();

    expect(address.country).toBe("CA");
    wrapper.unmount();
  });
});
