<script setup>
import { ref, watch } from "vue";
import DonationServices from "../services/donationServices.js";
import MoneyInput from "./MoneyInput.vue";
import { parseMoneyAmount } from "../utils/moneyUtils.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], required: true },
  personId: { type: [Number, String], required: true },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const amount = ref("");
const paymentInfo = ref("");
const saving = ref(false);
const formError = ref("");

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    amount.value = "";
    paymentInfo.value = "";
    formError.value = "";
  }
);

const close = () => emit("update:modelValue", false);

const donate = () => {
  formError.value = "";
  const parsedAmount = parseMoneyAmount(amount.value);
  if (parsedAmount == null || parsedAmount <= 0) {
    formError.value = "Donation amount is required.";
    return;
  }
  saving.value = true;
  DonationServices.createByParticipant({
    tripId: Number(props.tripId),
    personId: Number(props.personId),
    amount: parsedAmount,
    paymentInfo: paymentInfo.value?.trim() || null,
  })
    .then(() => {
      emit("saved");
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Unable to save donation.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => !v && close()">
    <v-card data-testid="make-donation-dialog">
      <v-card-title>Make Donation</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-3">Donate toward your trip balance.</p>
        <MoneyInput v-model="amount" label="Amount" required />
        <v-textarea v-model="paymentInfo" label="Payment info" density="compact" rows="2" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="donate">Donate</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
