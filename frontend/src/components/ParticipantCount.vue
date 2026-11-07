<script setup>
defineProps({
  incomplete: { type: Number, default: 0 },
  preApproved: { type: Number, default: 0 },
  approved: { type: Number, default: 0 },
});
</script>

<template>
  <span class="d-inline-flex align-center ga-1">
    <span data-testid="participant-count">{{ incomplete + preApproved + approved }}</span>
    <v-tooltip location="top">
      <template #activator="{ props: activator }">
        <v-icon
          v-bind="activator"
          icon="mdi-information-outline"
          size="small"
          tabindex="0"
          aria-label="Participant details"
          data-testid="participant-count-info"
        />
      </template>
      <div data-testid="participant-count-breakdown">
        <div>Incomplete: {{ incomplete }}</div>
        <div>Pre-approved: {{ preApproved }}</div>
        <div>Approved: {{ approved }}</div>
      </div>
    </v-tooltip>
  </span>
</template>
