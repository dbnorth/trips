<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import PublicServices from "../services/publicServices.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";

const props = defineProps({
  token: { type: String, required: true },
});

const CHECK_RETRIES = 6;
const CHECK_INTERVAL_MS = 5000;

const answer = ref(null);
const notFound = ref(false);
const errorMessage = ref("");
const timedOut = ref(false);
let retries = 0;
let timer = null;

const amountLine = computed(() => {
  const a = answer.value;
  if (!a) return "";
  const amount = formatMoneyDisplay(a.amount);
  return a.participantName ? `${amount} to ${a.tripName} for ${a.participantName}` : `${amount} to ${a.tripName}`;
});

const isCompleted = computed(() => answer.value?.status === "completed");
const paid = computed(() => isCompleted.value && answer.value.paymentStatus !== "failed");
const backPath = computed(() => answer.value?.returnPath || "/");

const check = async () => {
  timer = null;
  try {
    const res = await PublicServices.checkCheckout(props.token);
    answer.value = res.data;
    errorMessage.value = "";
  } catch (e) {
    if (e.response?.status === 404) {
      notFound.value = true;
      return;
    }
    errorMessage.value = e.response?.data?.message || "Unable to check your donation.";
  }
  if (answer.value?.status === "completed" || answer.value?.status === "expired") return;
  if (retries >= CHECK_RETRIES) {
    timedOut.value = true;
    return;
  }
  retries += 1;
  timer = setTimeout(check, CHECK_INTERVAL_MS);
};

onMounted(check);

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <v-container class="py-8 donation-complete" data-testid="donation-complete">
    <v-card class="pa-6">
      <template v-if="notFound">
        <p class="text-h6">Donation not found.</p>
      </template>

      <template v-else-if="paid">
        <p class="text-h5 mb-2">Thank you for your donation!</p>
        <p class="text-body-1 mb-2" data-testid="donation-amount-line">{{ amountLine }}</p>
        <p v-if="answer.feeCovered" class="text-body-2 mb-2" data-testid="donation-fee-line">
          Thank you for also covering the {{ formatMoneyDisplay(answer.feeCovered) }} processing fee.
        </p>
        <p v-if="answer.paymentStatus === 'processing'" class="text-body-2 mb-2">
          Your bank payment is processing. It usually takes up to 4 business days to clear.
        </p>
        <div class="d-flex ga-2 mt-4">
          <v-btn
            v-if="answer.paymentStatus !== 'processing' && answer.receiptUrl"
            variant="outlined"
            :href="answer.receiptUrl"
            target="_blank"
            rel="noopener"
          >
            Receipt
          </v-btn>
          <v-btn color="primary" :to="backPath">Back</v-btn>
        </div>
      </template>

      <template v-else-if="isCompleted">
        <p class="text-h6 mb-2">Your payment didn't go through.</p>
        <p v-if="answer.failureMessage" class="text-body-2 mb-2">{{ answer.failureMessage }}</p>
        <v-btn color="primary" class="mt-4" :to="backPath">Back</v-btn>
      </template>

      <template v-else-if="answer?.status === 'expired'">
        <p class="text-h6 mb-2">This donation link has expired.</p>
        <v-btn color="primary" class="mt-4" :to="backPath">Back</v-btn>
      </template>

      <template v-else-if="timedOut">
        <p class="text-body-1 mb-2">Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly.</p>
        <v-alert v-if="errorMessage" type="error" density="compact" class="mb-2">{{ errorMessage }}</v-alert>
        <v-btn color="primary" class="mt-4" :to="backPath">Back</v-btn>
      </template>

      <template v-else>
        <p class="text-body-1">Waiting for Stripe to confirm your payment…</p>
        <v-progress-linear indeterminate color="primary" class="mt-4" />
      </template>
    </v-card>
  </v-container>
</template>

<style scoped>
.donation-complete {
  max-width: 640px;
}
</style>
