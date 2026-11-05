<script setup>
import { computed } from "vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";

const props = defineProps({
  info: { type: Object, required: true },
  canViewDonations: { type: Boolean, default: false },
  deposit: { type: [Number, String], default: null },
});

defineEmits(["view-donations", "make-donation"]);

const canMakeDonation = computed(() => ["pre_approved", "approved"].includes(props.info.status));

const NOT_YET_AVAILABLE = "Not yet available";

const money = (value) => formatMoneyDisplay(Number(value || 0).toFixed(2), { allowNegative: true });

const breakdown = computed(() => props.info.costBreakdown || null);
const totalKnown = computed(() => breakdown.value?.totalTripCost != null);

const costLines = computed(() => {
  const b = breakdown.value;
  if (!totalKnown.value) return [];
  const list = [];
  if (b.tripCost != null) list.push({ label: "Trip cost", amount: money(b.tripCost) });
  for (const option of b.tripOptions || []) {
    list.push({ label: `Trip option: ${option.description}`, amount: money(option.amount) });
  }
  if (Number(b.adjustment)) list.push({ label: "Cost adjustment", amount: money(b.adjustment) });
  for (const expense of b.addonExpenses || []) {
    list.push({ label: `Add-on: ${expense.description}`, amount: money(expense.amount) });
  }
  list.push({ label: "Flight", amount: money(b.airfare) });
  return list;
});

const balance = computed(() =>
  totalKnown.value && props.info.amountOwed != null ? money(props.info.amountOwed) : NOT_YET_AVAILABLE
);

const fundingMessage = computed(() => {
  if (!canMakeDonation.value) return "";
  const deposit = Number(props.deposit) || 0;
  if (deposit > 0 && (Number(props.info.donationTotal) || 0) < deposit) {
    return `You need to make your trip deposit of ${money(deposit)}.`;
  }
  if (totalKnown.value && Number(props.info.amountOwed) > 0) {
    return `You need more donations to cover your balance of ${money(props.info.amountOwed)}.`;
  }
  return "";
});
</script>

<template>
  <div class="mt-4" data-testid="my-trip-financial">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Trip financial info</h3>
    <v-alert
      v-if="fundingMessage"
      type="warning"
      color="amber-lighten-4"
      density="compact"
      class="mb-2 text-black font-weight-bold"
      data-testid="my-trip-funding-message"
    >
      {{ fundingMessage }}
    </v-alert>
    <div style="max-width: 480px">
      <template v-if="totalKnown">
        <div v-for="(line, index) in costLines" :key="index" class="d-flex justify-space-between ga-4">
          <span>{{ line.label }}</span>
          <span>{{ line.amount }}</span>
        </div>
        <div class="d-flex justify-space-between ga-4 font-weight-bold">
          <span>Total trip cost</span>
          <span data-testid="my-trip-total">{{ money(breakdown.totalTripCost) }}</span>
        </div>
      </template>
      <div v-else class="d-flex justify-space-between ga-4">
        <span>Trip cost</span>
        <span>{{ NOT_YET_AVAILABLE }}</span>
      </div>
      <v-divider class="my-1" />
      <div class="d-flex justify-space-between align-center ga-4" data-testid="my-trip-donations-line">
        <div class="d-flex align-center flex-wrap ga-2">
          <span>Donations</span>
          <v-btn
            v-if="canViewDonations"
            size="small"
            variant="text"
            color="primary"
            @click="$emit('view-donations')"
          >
            View donations
          </v-btn>
          <v-btn
            v-if="canMakeDonation"
            size="small"
            variant="tonal"
            color="primary"
            @click="$emit('make-donation')"
          >
            Make Donation
          </v-btn>
        </div>
        <span data-testid="my-trip-donations">{{ money(info.donationTotal) }}</span>
      </div>
      <div class="d-flex justify-space-between ga-4 font-weight-bold">
        <span>Balance</span>
        <span data-testid="my-trip-balance">{{ balance }}</span>
      </div>
    </div>
  </div>
</template>
