<script setup>
import { computed } from "vue";
import { formatCountryCode, countryCodeRule } from "../utils/phoneUtils.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "Country code" },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  density: { type: String, default: "compact" },
  hideDetails: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const rules = computed(() => {
  if (props.disabled || props.readonly) return [];
  return [countryCodeRule];
});

const displayValue = computed(() => formatCountryCode(props.modelValue || ""));

const onInput = (v) => emit("update:modelValue", formatCountryCode(v));
</script>

<template>
  <v-text-field
    :model-value="displayValue"
    maxlength="4"
    :label="label"
    :readonly="readonly"
    :disabled="disabled"
    :density="density"
    :hide-details="hideDetails"
    :rules="readonly || disabled ? [] : rules"
    placeholder="+1"
    autocomplete="tel-country-code"
    @update:model-value="onInput"
  />
</template>
