<script setup>
defineProps({
  reasons: { type: Array, default: () => [] },
  intro: {
    type: String,
    default: "This application cannot be saved or submitted yet:",
  },
});
</script>

<template>
  <v-alert
    v-if="reasons.length"
    type="info"
    density="compact"
    class="mb-3"
  >
    {{ intro }}
    <ul class="mt-2 mb-0 pl-4">
      <li v-for="(reason, index) in reasons" :key="`${index}-${reason}`">{{ reason }}</li>
    </ul>
  </v-alert>
</template>
