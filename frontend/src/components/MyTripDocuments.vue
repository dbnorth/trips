<script setup>
import { onMounted, ref } from "vue";
import TripServices from "../services/tripServices.js";
import { formatDate } from "../utils/dateFormat.js";

const trips = ref([]);

const load = async () => {
  try {
    const res = await TripServices.getMyTripDocuments();
    trips.value = res.data || [];
  } catch {
    trips.value = [];
  }
};

onMounted(load);

defineExpose({ load });
</script>

<template>
  <div class="mb-3" data-testid="my-trip-documents">
    <p class="text-body-2 mb-2">All documents for your trips must be uploaded 90 days before the trip starts.</p>
    <div v-for="trip in trips" :key="trip.tripId" class="mb-2" data-testid="my-trip-documents-trip">
      <div class="font-weight-medium">
        {{ trip.tripName }} — starts {{ formatDate(trip.startDate) }}, due {{ formatDate(trip.dueDate) }}
      </div>
      <div v-for="doc in trip.documents" :key="doc.name" class="d-flex align-center flex-wrap ga-2 ml-4">
        <v-icon
          :icon="doc.uploaded ? 'mdi-check-circle' : 'mdi-alert-circle'"
          :color="doc.uploaded ? 'success' : 'error'"
          size="small"
        />
        <span>{{ doc.name }}</span>
        <span :class="doc.uploaded ? 'text-success' : 'text-error'">{{ doc.uploaded ? "Uploaded" : "Missing" }}</span>
        <span v-if="!doc.uploaded && doc.missingText !== doc.name" class="text-medium-emphasis">
          {{ doc.missingText }}
        </span>
      </div>
    </div>
  </div>
</template>
