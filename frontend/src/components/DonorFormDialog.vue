<script setup>
import { ref, watch } from "vue";
import DonorServices from "../services/donorServices.js";
import AddressFields from "./AddressFields.vue";
import { DONOR_STATUS_ITEMS, DONOR_TYPE_ITEMS } from "../utils/donorStatus.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  donor: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const emptyDonor = () => ({
  firstName: "",
  lastName: "",
  familyName: "",
  organizationName: "",
  email: "",
  addLine1: "",
  addLine2: "",
  city: "",
  state_prov: "",
  postalCode: "",
  country: "",
  phoneContryCode: "",
  phoneNumber: "",
  donorType: "individual",
  status: "active",
});

const form = ref(emptyDonor());
const saving = ref(false);
const error = ref("");

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    error.value = "";
    form.value = props.donor ? { ...emptyDonor(), ...props.donor } : emptyDonor();
  }
);

const close = () => emit("update:modelValue", false);

const save = () => {
  saving.value = true;
  error.value = "";
  const payload = { ...form.value };
  const request = payload.id ? DonorServices.update(payload.id, payload) : DonorServices.create(payload);
  request
    .then(() => {
      emit("saved");
      close();
    })
    .catch((e) => {
      error.value = e.response?.data?.message || "Unable to save donor.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>{{ form.id ? "Edit donor" : "Add donor" }}</v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>
        <v-select v-model="form.donorType" :items="DONOR_TYPE_ITEMS" label="Donor type" density="compact" />
        <v-text-field
          v-if="form.donorType === 'organization'"
          v-model="form.organizationName"
          label="Organization name"
          density="compact"
          autocomplete="off"
        />
        <template v-else>
          <v-text-field v-model="form.firstName" label="First name" density="compact" autocomplete="off" />
          <v-text-field v-model="form.lastName" label="Last name" density="compact" autocomplete="off" />
          <v-text-field v-model="form.familyName" label="Family name" density="compact" autocomplete="off" />
        </template>
        <v-text-field v-model="form.email" label="Email" type="email" density="compact" autocomplete="off" />
        <AddressFields v-model="form" />
        <v-text-field v-model="form.phoneContryCode" label="Phone country code" density="compact" autocomplete="off" />
        <v-text-field v-model="form.phoneNumber" label="Phone number" density="compact" autocomplete="off" />
        <v-select v-model="form.status" :items="DONOR_STATUS_ITEMS" label="Donor status" density="compact" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
