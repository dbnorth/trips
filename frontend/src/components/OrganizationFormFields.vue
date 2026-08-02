<script setup>
import PhoneInput from "./PhoneInput.vue";
import PhoneCountryCodeInput from "./PhoneCountryCodeInput.vue";
import AddressFields from "./AddressFields.vue";
import { COLOR_OPTIONS } from "../utils/organizationForm.js";

defineProps({
  modelValue: { type: Object, required: true },
});
</script>

<template>
  <v-text-field v-model="modelValue.name" label="Name" density="compact" autocomplete="off" />
  <v-text-field v-model="modelValue.email" label="Email" type="email" density="compact" autocomplete="off" />
  <v-select
    v-model="modelValue.colorFamily"
    :items="COLOR_OPTIONS"
    label="Color family"
    density="compact"
  />
  <AddressFields :model-value="modelValue" />
  <v-row dense>
    <v-col cols="4">
      <PhoneCountryCodeInput v-model="modelValue.phoneContryCode" label="Phone country code" />
    </v-col>
    <v-col cols="8">
      <PhoneInput v-model="modelValue.phoneNumber" label="Phone number" />
    </v-col>
  </v-row>
  <v-text-field
    v-model="modelValue.websiteUrl"
    label="Website URL"
    density="compact"
    autocomplete="off"
  />
  <v-text-field
    v-model="modelValue.facebookPage"
    label="Facebook page URL"
    density="compact"
    autocomplete="off"
  />
  <v-text-field v-model="modelValue.instagram" label="Instagram" density="compact" autocomplete="off" />
</template>
