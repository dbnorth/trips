<script setup>
import { computed, watch } from "vue";
import {
  countryItems,
  usSubdivisionItems,
  isUnitedStates,
  resolveStateAbbrev,
} from "../utils/locationData.js";

const props = defineProps({
  modelValue: { type: Object, required: true },
});

const countrySelectItems = countryItems();
const stateSelectItems = usSubdivisionItems();

const isUS = computed(() => isUnitedStates(props.modelValue.country));

watch(
  () => props.modelValue.country,
  (country) => {
    if (isUnitedStates(country) && props.modelValue.state_prov) {
      props.modelValue.state_prov = resolveStateAbbrev(props.modelValue.state_prov, country);
    }
  }
);
</script>

<template>
  <v-autocomplete
    v-model="modelValue.country"
    :items="countrySelectItems"
    item-title="title"
    item-value="value"
    label="Country"
    density="compact"
    clearable
    auto-select-first
    hide-details
    class="mb-2"
  />
  <v-text-field v-model="modelValue.addLine1" label="Address line 1" density="compact" autocomplete="off" />
  <v-text-field v-model="modelValue.addLine2" label="Address line 2" density="compact" autocomplete="off" />
  <v-text-field v-model="modelValue.city" label="City" density="compact" autocomplete="off" />
  <v-autocomplete
    v-if="isUS"
    v-model="modelValue.state_prov"
    :items="stateSelectItems"
    item-title="title"
    item-value="value"
    label="State"
    density="compact"
    clearable
    auto-select-first
    hide-details
    class="mb-2"
  />
  <v-text-field
    v-else
    v-model="modelValue.state_prov"
    label="State / province"
    density="compact"
    autocomplete="off"
  />
  <v-text-field v-model="modelValue.postalCode" label="Postal code" density="compact" autocomplete="off" />
</template>
