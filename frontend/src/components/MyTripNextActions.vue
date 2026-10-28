<script setup>
import { computed } from "vue";
import { APPLICATION_ACTION_CODES, nextActionText, nextActionsTone } from "../utils/myTripNextActions.js";

const props = defineProps({
  actions: { type: Array, default: () => [] },
});

defineEmits(["update", "cancel", "donate", "flights"]);

const tone = computed(() => nextActionsTone(props.actions));
</script>

<template>
  <div
    :class="['my-trip-next-actions', `my-trip-next-actions--${tone}`]"
    data-testid="my-trip-next-actions"
  >
    <div
      v-for="action in actions"
      :key="action.code"
      class="d-flex align-center flex-wrap ga-2 py-1"
    >
      <span>{{ nextActionText(action) }}</span>
      <span v-if="action.missingDocuments?.length" class="text-medium-emphasis">
        Missing documents: {{ action.missingDocuments.join("; ") }}.
      </span>
      <template v-if="APPLICATION_ACTION_CODES.includes(action.code)">
        <v-btn size="small" color="primary" @click="$emit('update')">
          {{ action.code === "submit-application" ? "Submit App" : "Update App" }}
        </v-btn>
        <v-btn size="small" color="error" variant="tonal" @click="$emit('cancel')">
          Cancel App
        </v-btn>
      </template>
      <v-btn
        v-if="action.code === 'make-deposit' || action.code === 'make-donation'"
        size="small"
        color="primary"
        @click="$emit('donate')"
      >
        Donate
      </v-btn>
      <v-btn
        v-if="action.code === 'enter-flights'"
        size="small"
        color="primary"
        @click="$emit('flights')"
      >
        Enter Flights
      </v-btn>
      <v-btn
        v-if="action.code.endsWith('-flight-mismatch') && action.canEditFlights"
        size="small"
        color="primary"
        @click="$emit('flights')"
      >
        Edit Flights
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.my-trip-next-actions {
  font-weight: 500;
  padding: 4px 12px;
  border-left: 4px solid transparent;
}

.my-trip-next-actions--waiting {
  background-color: #ffe0b2;
  border-left-color: #fb8c00;
}

.my-trip-next-actions--needed {
  background-color: #fff9c4;
  border-left-color: #fbc02d;
}

.my-trip-next-actions--ready {
  background-color: #c8e6c9;
  border-left-color: #43a047;
}
</style>
