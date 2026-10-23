<script setup>
import { computed } from "vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";

const props = defineProps({
  breakdown: { type: Object, default: null },
});

const money = (value) => formatMoneyDisplay(Number(value || 0).toFixed(2), { allowNegative: true });

const lines = computed(() => {
  const b = props.breakdown;
  if (!b || b.totalTripCost == null) return [];
  const list = [];
  if (b.tripCost != null) list.push({ label: "Trip cost", amount: b.tripCost });
  for (const option of b.tripOptions || []) {
    list.push({ label: `Trip option: ${option.description}`, amount: option.amount });
  }
  if (Number(b.adjustment)) list.push({ label: "Cost adjustment", amount: b.adjustment });
  for (const expense of b.addonExpenses || []) {
    list.push({ label: `Add-on: ${expense.description}`, amount: expense.amount });
  }
  list.push({ label: "Flight", amount: b.airfare });
  return list;
});
</script>

<template>
  <span class="d-inline-flex align-center ga-1">
    <span>{{ breakdown?.totalTripCost != null ? money(breakdown.totalTripCost) : "—" }}</span>
    <v-tooltip v-if="lines.length" location="top">
      <template #activator="{ props: activator }">
        <v-icon
          v-bind="activator"
          icon="mdi-information-outline"
          size="small"
          aria-label="Total cost details"
          data-testid="total-cost-info"
        />
      </template>
      <div data-testid="total-cost-breakdown">
        <div v-for="(line, index) in lines" :key="index" class="d-flex justify-space-between ga-4">
          <span>{{ line.label }}</span>
          <span>{{ money(line.amount) }}</span>
        </div>
        <div class="d-flex justify-space-between ga-4 font-weight-bold mt-1">
          <span>Total</span>
          <span>{{ money(breakdown.totalTripCost) }}</span>
        </div>
      </div>
    </v-tooltip>
  </span>
</template>
