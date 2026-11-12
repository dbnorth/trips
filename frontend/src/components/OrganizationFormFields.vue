<script setup>
import PhoneInput from "./PhoneInput.vue";
import PhoneCountryCodeInput from "./PhoneCountryCodeInput.vue";
import AddressFields from "./AddressFields.vue";
import { COLOR_OPTIONS } from "../utils/organizationForm.js";

defineProps({
  modelValue: { type: Object, required: true },
  showSubdomain: { type: Boolean, default: true },
});

const SAVED_KEY_HINT = "A key is saved. Leave blank to keep it.";
</script>

<template>
  <v-text-field v-model="modelValue.name" label="Name" density="compact" autocomplete="off" />
  <v-text-field v-model="modelValue.accountNumber" label="Account number" density="compact" autocomplete="off" />
  <v-text-field
    v-if="showSubdomain"
    v-model="modelValue.subdomain"
    label="Subdomain"
    hint="Optional. Visitors at {subdomain}.your-domain join this org when creating an account."
    persistent-hint
    density="compact"
    autocomplete="off"
    class="mb-2"
  />
  <v-text-field v-model="modelValue.email" label="Email" type="email" density="compact" autocomplete="off" />
  <v-checkbox
    v-model="modelValue.testMode"
    label="Test mode"
    hint="Send every email for this organization to the organization email instead of the real recipients."
    persistent-hint
    density="compact"
    class="mb-2"
  />
  <div data-testid="org-stripe-section" class="mb-2">
    <div class="text-subtitle-2">Online donations (Stripe)</div>
    <div class="text-caption text-medium-emphasis mb-2">Test mode uses the test key.</div>
    <v-text-field
      v-model="modelValue.stripeSecretKey"
      label="Stripe secret key"
      type="password"
      :hint="modelValue.stripeKeySaved ? SAVED_KEY_HINT : ''"
      persistent-hint
      density="compact"
      autocomplete="new-password"
      class="mb-2"
    />
    <v-text-field
      v-model="modelValue.stripeTestSecretKey"
      label="Stripe test secret key"
      type="password"
      :hint="modelValue.stripeTestKeySaved ? SAVED_KEY_HINT : ''"
      persistent-hint
      density="compact"
      autocomplete="new-password"
      class="mb-2"
    />
    <v-checkbox
      v-model="modelValue.stripeFeeCoverage"
      label="Ask donors to cover processing fees"
      hint="Stripe asks card donors to add its processing fee. Turn on only after Stripe approves your account for fee coverage."
      persistent-hint
      density="compact"
      data-testid="org-stripe-fee-coverage"
    />
  </div>
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
