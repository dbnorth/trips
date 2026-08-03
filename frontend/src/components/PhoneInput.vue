<script setup>
import { computed } from "vue";
import { formatPhone, phoneRule, PHONE_FORMATTED_MAX_LENGTH } from "../utils/phoneUtils.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  label: { type: String, default: "Phone" },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  density: { type: String, default: "compact" },
  hideDetails: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const rules = computed(() => {
  if (props.disabled || props.readonly) return [];
  const r = [phoneRule];
  if (props.required) {
    r.unshift((v) => !!v?.trim() || "Phone is required");
  }
  return r;
});

const displayValue = computed(() => formatPhone(props.modelValue || ""));

const onInput = (v) => emit("update:modelValue", formatPhone(v));
</script>

<template>
  <v-text-field
    :model-value="displayValue"
    :maxlength="PHONE_FORMATTED_MAX_LENGTH"
    :label="label"
    :readonly="readonly"
    :disabled="disabled"
    :density="density"
    :hide-details="hideDetails"
    :rules="readonly || disabled ? [] : rules"
    placeholder="(555) 555-5555"
    autocomplete="tel"
    @update:model-value="onInput"
  />
</template>
