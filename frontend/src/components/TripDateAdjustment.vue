<script setup>
import { computed } from "vue";

const props = defineProps({
  date: { type: String, default: null },
  adjustments: { type: Array, default: () => [] },
  direction: { type: String, required: true },
});

const formatted = computed(() => {
  const match = String(props.date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "—";
});

const label = (item) => `${item.type === "option" ? "Trip option" : "Add-on"}: ${item.description}`;

const days = (item) => `${item.days} ${item.days === 1 ? "day" : "days"} ${props.direction}`;
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
  </span>
</template>
