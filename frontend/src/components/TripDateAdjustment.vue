<script setup>
import { computed } from "vue";

const props = defineProps({
  date: { type: String, default: null },
  adjustments: { type: Array, default: () => [] },
  direction: { type: String, required: true },
  flightDate: { type: String, default: null },
});

const formatDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "—";
};

const formatted = computed(() => formatDate(props.date));

const flightMismatch = computed(
  () =>
    !!props.date &&
    !!props.flightDate &&
    String(props.date).slice(0, 10) !== String(props.flightDate).slice(0, 10)
);

const flightMessage = computed(
  () =>
    `${props.direction === "before" ? "Arrival flight lands" : "Return flight leaves"} ${formatDate(
      props.flightDate
    )}`
);

const label = (item) => `${item.type === "option" ? "Trip option" : "Add-on"}: ${item.description}`;

const days = (item) => {
  const count = Math.abs(item.days);
  const way = item.days > 0 ? props.direction : props.direction === "before" ? "later" : "earlier";
  return `${count} ${count === 1 ? "day" : "days"} ${way}`;
};
</script>

<template>
  <span class="d-inline-flex align-center ga-1">
    <span>{{ formatted }}</span>
    <v-tooltip v-if="date && adjustments.length" location="top">
      <template #activator="{ props: activator }">
        <v-icon
          v-bind="activator"
          icon="mdi-information-outline"
          size="small"
          :aria-label="`Days ${direction} the trip`"
          data-testid="date-adjustment-info"
        />
      </template>
      <div data-testid="date-adjustments">
        <div v-for="(item, index) in adjustments" :key="index" class="d-flex justify-space-between ga-4">
          <span>{{ label(item) }}</span>
          <span>{{ days(item) }}</span>
        </div>
      </div>
    </v-tooltip>
    <v-tooltip v-if="flightMismatch" location="top">
      <template #activator="{ props: activator }">
        <v-icon
          v-bind="activator"
          icon="mdi-alert"
          color="warning"
          size="small"
          :aria-label="flightMessage"
          data-testid="date-flight-warning"
        />
      </template>
      <span data-testid="date-flight-mismatch">{{ flightMessage }}</span>
    </v-tooltip>
  </span>
</template>
