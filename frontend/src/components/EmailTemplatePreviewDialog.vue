<script setup>
import { ref, computed, watch } from "vue";
import EmailTemplateServices from "../services/emailTemplateServices.js";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  orgId: { type: [Number, String], default: null },
  tripId: { type: [Number, String], default: null },
  fromEmail: { type: String, default: "" },
  toAddress: { type: String, default: "" },
  subject: { type: String, default: "" },
  emailBody: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const trips = ref([]);
const tripsLoading = ref(false);
const participants = ref([]);
const participantsLoading = ref(false);
const selectedTripId = ref(null);
const selectedPersonId = ref(null);
const preview = ref(null);
const previewLoading = ref(false);
const previewError = ref("");

const tripItems = computed(() => trips.value.map((trip) => ({ title: trip.name, value: trip.id })));
const participantItems = computed(() => participants.value);

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || "Participant";

const loadTrips = async () => {
  tripsLoading.value = true;
  try {
    const res = await TripServices.getAll();
    trips.value = (res.data || []).filter((trip) => Number(trip.orgId) === Number(props.orgId));
  } catch (e) {
    trips.value = [];
    previewError.value = e.response?.data?.message || "Unable to load trips.";
  } finally {
    tripsLoading.value = false;
  }
};

const loadParticipants = async (tripId) => {
  participants.value = [];
  if (!tripId) return;
  participantsLoading.value = true;
  try {
    const res = await TripPeopleRoleServices.getAll(tripId);
    const seen = new Set();
    participants.value = (res.data || [])
      .filter((row) => row.role?.roleName === "Trip Participant")
      .filter((row) => {
        const id = Number(row.peopleId);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((row) => ({ title: personName(row.person), value: Number(row.peopleId) }));
  } catch (e) {
    previewError.value = e.response?.data?.message || "Unable to load participants.";
  } finally {
    participantsLoading.value = false;
  }
};

const loadPreview = async () => {
  preview.value = null;
  previewError.value = "";
  if (!selectedTripId.value) return;
  previewLoading.value = true;
  try {
    const res = await EmailTemplateServices.preview({
      orgId: Number(props.orgId),
      tripId: Number(selectedTripId.value),
      personId: selectedPersonId.value ?? null,
      fromEmail: props.fromEmail || "",
      toAddress: props.toAddress || "",
      subject: props.subject || "",
      emailBody: props.emailBody || "",
    });
    preview.value = res.data;
  } catch (e) {
    previewError.value = e.response?.data?.message || "Unable to build preview.";
  } finally {
    previewLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      selectedTripId.value = null;
      selectedPersonId.value = null;
      participants.value = [];
      preview.value = null;
      previewError.value = "";
      return;
    }
    await loadTrips();
    const preset = props.tripId != null && props.tripId !== "" ? Number(props.tripId) : null;
    selectedTripId.value = trips.value.some((trip) => Number(trip.id) === preset) ? preset : null;
  },
  { immediate: true }
);

watch(selectedTripId, async (tripId) => {
  selectedPersonId.value = null;
  await loadParticipants(tripId);
  await loadPreview();
});

watch(selectedPersonId, () => {
  if (selectedTripId.value) loadPreview();
});

const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="720" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Preview</v-card-title>
      <v-card-text style="max-height: 70vh">
        <v-select
          v-model="selectedTripId"
          :items="tripItems"
          label="Trip"
          density="compact"
          :loading="tripsLoading"
          class="mb-2"
        />
        <v-select
          v-model="selectedPersonId"
          :items="participantItems"
          label="Participant"
          density="compact"
          clearable
          :loading="participantsLoading"
          :disabled="!selectedTripId"
          class="mb-2"
        />
        <v-alert v-if="previewError" type="error" density="compact" class="mb-2">{{ previewError }}</v-alert>
        <v-progress-linear v-if="previewLoading" indeterminate class="mb-2" />
        <div v-if="preview" class="email-preview">
          <div class="mb-2"><strong>From email:</strong> {{ preview.fromEmail }}</div>
          <div class="mb-2"><strong>To:</strong> {{ preview.toAddress }}</div>
          <div class="mb-2"><strong>Subject:</strong> {{ preview.subject }}</div>
          <div class="mb-1"><strong>Email body:</strong></div>
          <div class="email-preview-body border rounded pa-3">{{ preview.emailBody }}</div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.email-preview-body {
  white-space: pre-wrap;
}
</style>
