<script setup>
import { ref, computed, watch } from "vue";
import DonationServices from "../services/donationServices.js";
import MoneyInput from "./MoneyInput.vue";
import { parseMoneyAmount } from "../utils/moneyUtils.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], required: true },
  personId: { type: [Number, String], default: null },
  recipients: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const recipientId = ref(null);
const amount = ref("");
const paymentInfo = ref("");
const saving = ref(false);
const formError = ref("");

const recipientItems = computed(() => {
  const selfId = Number(props.personId);
  const self = props.recipients.filter((r) => Number(r.personId) === selfId);
  const others = props.recipients.filter((r) => Number(r.personId) !== selfId);
  return [
    ...self.map((r) => ({ title: "Yourself", value: r.personId })),
    ...others.map((r) => ({
      title: [r.firstName, r.lastName].filter(Boolean).join(" ").trim(),
      value: r.personId,
    })),
  ];
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    recipientId.value = recipientItems.value[0]?.value ?? null;
    amount.value = "";
    paymentInfo.value = "";
    formError.value = "";
  }
);

const close = () => emit("update:modelValue", false);

const donate = () => {
  formError.value = "";
  if (recipientId.value == null) {
    formError.value = "Choose a participant on this trip.";
    return;
  }
  const parsedAmount = parseMoneyAmount(amount.value);
  if (parsedAmount == null || parsedAmount <= 0) {
    formError.value = "Donation amount is required.";
    return;
  }
  saving.value = true;
  DonationServices.createByParticipant({
    tripId: Number(props.tripId),
    personId: Number(recipientId.value),
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
    <v-card>
      <v-card-title>Donate</v-card-title>
      <v-card-text>
        <v-select
          v-model="recipientId"
          :items="recipientItems"
          label="Donate to"
          density="compact"
          class="mb-2"
        />
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
