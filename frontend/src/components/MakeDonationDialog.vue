<script setup>
import { ref, watch } from "vue";
import DonationServices from "../services/donationServices.js";
import MoneyInput from "./MoneyInput.vue";
import StripePaymentMethod from "./StripePaymentMethod.vue";
import { parseMoneyAmount } from "../utils/moneyUtils.js";
import { ONLINE_DONATIONS_NOT_SET_UP, goToStripe } from "../utils/stripeDonations.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], required: true },
  personId: { type: [Number, String], required: true },
  onlineDonations: { type: Boolean, default: false },
  returnPath: { type: String, default: "/home" },
});

const emit = defineEmits(["update:modelValue"]);

const amount = ref("");
const paymentMethod = ref("card");
const saving = ref(false);
const formError = ref("");

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    amount.value = "";
    paymentMethod.value = "card";
    formError.value = "";
  }
);

const close = () => emit("update:modelValue", false);

const payWithStripe = () => {
  formError.value = "";
  const parsedAmount = parseMoneyAmount(amount.value);
  if (parsedAmount == null || parsedAmount <= 0) {
    formError.value = "Donation amount is required.";
    return;
  }
  if (parsedAmount < 0.5) {
    formError.value = "Donation amount must be at least $0.50.";
    return;
  }
  saving.value = true;
  DonationServices.startParticipantCheckout({
    tripId: Number(props.tripId),
    personId: Number(props.personId),
    amount: parsedAmount,
    paymentMethod: paymentMethod.value,
    returnPath: props.returnPath,
  })
    .then((res) => goToStripe(res.data.checkoutUrl))
    .catch((e) => {
      formError.value = e.response?.data?.message || "Unable to start the payment.";
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
        <StripePaymentMethod v-if="onlineDonations" v-model="paymentMethod" />
        <v-alert v-else type="info" density="compact" data-testid="online-donations-not-set-up">
          {{ ONLINE_DONATIONS_NOT_SET_UP }}
        </v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn v-if="onlineDonations" color="primary" :loading="saving" @click="payWithStripe">Pay with Stripe</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
