/**
 * Feature 16 — Default Country Selects to United States
 * Spec: features/feature-16-default-country-united-states.md
 */

import { describe, it, expect } from "vitest";
import { ref, nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import CountrySelect from "../src/components/CountrySelect.vue";
import { US_COUNTRY_CODE } from "../src/utils/locationData.js";
import { mountWithPlugins } from "./testUtils.js";

describe("CountrySelect — Feature 16", () => {
  it("Trip country does not default on Add trip", async () => {
    const country = ref("");
    const { wrapper } = await mountWithPlugins(CountrySelect, {
      props: {
        modelValue: country.value,
        label: "Country",
        "onUpdate:modelValue": (value) => {
          country.value = value;
        },
      },
    });
    await flushPromises();
    await nextTick();

    expect(country.value).toBe("");
    wrapper.unmount();
  });

  it("Country issued defaults to United States on new person document", async () => {
    const countryIssued = ref("");
    const { wrapper } = await mountWithPlugins(CountrySelect, {
      props: {
        modelValue: countryIssued.value,
        label: "Country issued",
        defaultEmptyToUs: true,
        "onUpdate:modelValue": (value) => {
          countryIssued.value = value;
        },
      },
    });
    await flushPromises();
    await nextTick();

    expect(countryIssued.value).toBe(US_COUNTRY_CODE);
    wrapper.unmount();
  });
});
