<script setup>
defineProps({
  modelValue: { type: String, default: "card" },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <v-radio-group
    :model-value="modelValue"
    label="Payment method"
    density="compact"
    inline
    hide-details
    class="mb-2"
    data-testid="payment-method"
    @update:model-value="(value) => emit('update:modelValue', value)"
  >
    <v-radio label="Credit card" value="card" />
    <v-radio label="Bank account (ACH)" value="us_bank_account" />
  </v-radio-group>
</template>
