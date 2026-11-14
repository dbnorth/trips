<script setup>
import { computed } from "vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";

const props = defineProps({
  info: { type: Object, required: true },
  deposit: { type: [Number, String], default: null },
});

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

const moneyLine = computed(() => {
  const raised = money(props.info.donationTotal);
  if (!totalKnown.value) return `Donations ${raised}. Balance not yet available.`;
  return `${raised} raised of ${money(breakdown.value.totalTripCost)}. Balance ${balance.value}.`;
});

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
  <div class="mt-3">
    <div data-testid="my-trip-money-line">{{ moneyLine }}</div>
    <v-alert
      v-if="fundingMessage"
      type="warning"
      color="amber-lighten-4"
      density="compact"
      class="mt-2 text-black font-weight-bold"
      data-testid="my-trip-funding-message"
    >
      {{ fundingMessage }}
    </v-alert>
    <v-expansion-panels class="mt-3" data-testid="my-trip-costs">
      <v-expansion-panel>
        <v-expansion-panel-title>Trip costs</v-expansion-panel-title>
        <v-expansion-panel-text>
          <div data-testid="my-trip-financial" style="max-width: 480px">
            <div>
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
                <span>Donations</span>
                <span data-testid="my-trip-donations">{{ money(info.donationTotal) }}</span>
              </div>
              <div class="d-flex justify-space-between ga-4 font-weight-bold">
                <span>Balance</span>
                <span data-testid="my-trip-balance">{{ balance }}</span>
              </div>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
