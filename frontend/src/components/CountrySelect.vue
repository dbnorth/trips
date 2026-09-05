<script setup>
import { onMounted } from "vue";
import { countryItems, US_COUNTRY_CODE } from "../utils/locationData.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "Country" },
  /** When true, empty value becomes US at mount (document country issued). Trip country leaves this false (FR-008). */
  defaultEmptyToUs: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const items = countryItems();

onMounted(() => {
  if (
    props.defaultEmptyToUs &&
    (props.modelValue == null || props.modelValue === "")
  ) {
    emit("update:modelValue", US_COUNTRY_CODE);
  }
});
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
