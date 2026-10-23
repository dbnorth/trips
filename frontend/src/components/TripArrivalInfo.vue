<script setup>
import { ref, computed } from "vue";
import TripServices from "../services/tripServices.js";
import ConfirmDialog from "./ConfirmDialog.vue";

const props = defineProps({
  trip: { type: Object, required: true },
});

const emit = defineEmits(["changed"]);

const fileInput = ref(null);
const saving = ref(false);
const error = ref("");
const showConfirmRemove = ref(false);

const pdfName = computed(() => `Trip Arrival - ${props.trip.name}.pdf`);

const chooseFile = () => {
  error.value = "";
  fileInput.value?.click();
};

const onFileChosen = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  saving.value = true;
  try {
    const response = await TripServices.uploadArrivalPdf(props.trip.id, file);
    emit("changed", response.data.hasArrivalPdf);
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to upload the PDF.";
  } finally {
    saving.value = false;
  }
};

const openPdf = async () => {
  error.value = "";
  try {
    await TripServices.openArrivalPdf(props.trip.id);
  } catch {
    error.value = "Unable to open the Trip Arrival PDF.";
  }
};

const removePdf = async () => {
  saving.value = true;
  try {
    const response = await TripServices.removeArrivalPdf(props.trip.id);
    showConfirmRemove.value = false;
    emit("changed", response.data.hasArrivalPdf);
  } catch (e) {
    showConfirmRemove.value = false;
    error.value = e.response?.data?.message || "Unable to remove the PDF.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-card class="mb-6 pa-4" data-testid="trip-arrival-info">
    <h2 class="text-h6 mb-3">Trip arrival info</h2>
    <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>
    <input
      ref="fileInput"
      type="file"
      accept="application/pdf,.pdf"
      class="d-none"
      data-testid="trip-arrival-file"
      @change="onFileChosen"
    />
    <div v-if="trip.hasArrivalPdf" class="d-flex align-center flex-wrap ga-2">
      <a href="#" data-testid="trip-arrival-link" @click.prevent="openPdf">{{ pdfName }}</a>
      <v-btn size="small" variant="tonal" :loading="saving" @click="chooseFile">Replace</v-btn>
      <v-btn size="small" variant="tonal" color="error" :disabled="saving" @click="showConfirmRemove = true">
        Remove
      </v-btn>
    </div>
    <div v-else class="d-flex align-center flex-wrap ga-2">
      <span>No Trip Arrival PDF.</span>
      <v-btn size="small" variant="tonal" :loading="saving" @click="chooseFile">Upload PDF</v-btn>
    </div>
    <ConfirmDialog
      v-model="showConfirmRemove"
      title="Are you sure?"
      message="Remove the Trip Arrival PDF?"
      confirm-text="Remove"
      confirm-color="error"
      :loading="saving"
      @confirm="removePdf"
    />
  </v-card>
</template>
