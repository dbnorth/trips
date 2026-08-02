<script setup>
import { countryItems } from "../utils/locationData.js";

defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "Country" },
});

defineEmits(["update:modelValue"]);

const items = countryItems();
</script>

<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="items"
    item-title="title"
    item-value="value"
    :label="label"
    density="compact"
    clearable
    auto-select-first
    @update:model-value="(value) => $emit('update:modelValue', value)"
  />
</template>
