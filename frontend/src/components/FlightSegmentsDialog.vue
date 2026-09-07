<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import AirportServices from "../services/airportServices.js";
import AirlineServices from "../services/airlineServices.js";
import { CABIN_CLASSES } from "../utils/cabinClasses.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [String, Number], default: null },
  tripPeopleRoleId: { type: [String, Number], default: null },
  participantName: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const segments = ref([]);
const airports = ref([]);
const airlines = ref([]);

const title = computed(
  () => `Flight segments — ${props.participantName || "Participant"}`
);

const airportItems = computed(() =>
  airports.value.map((a) => ({
    title: `${a.code} — ${a.city}`,
    value: a.code,
    search: `${a.code} ${a.city} ${a.airportName} ${a.country}`.toLowerCase(),
  }))
);

const airlineItems = computed(() =>
  airlines.value.map((a) => ({
    title: `${a.code} — ${a.name}`,
    value: a.code,
    search: `${a.code} ${a.name}`.toLowerCase(),
  }))
);

/** Match every character typed against code / name / city (not first-letter jump). */
const catalogFilter = (_title, queryText, item) => {
  const q = String(queryText || "")
    .toLowerCase()
    .trim();
  if (!q) return true;
  const search = item?.raw?.search ?? String(_title || "").toLowerCase();
  return search.includes(q);
};

const cabinClassItemsFor = (current) => {
  const value = String(current || "").trim();
  if (value && !CABIN_CLASSES.includes(value)) {
    return [value, ...CABIN_CLASSES];
  }
  return [...CABIN_CLASSES];
};

const blankSegment = () => {
  const prev = segments.value[segments.value.length - 1];
  return {
    segmentNumber: segments.value.length + 1,
    departureAirportCode: prev?.arrivalAirportCode ?? null,
    airlineCode: null,
    flightNumber: "",
    departureDate: prev?.arrivalDate || "",
    departureTime: "",
    arrivalAirportCode: null,
    arrivalDate: prev?.arrivalDate || "",
    arrivalTime: "",
    cabinClass: "",
    seatNumber: "",
  };
};

const addSegment = () => {
  segments.value.push(blankSegment());
};

const removeSegment = (index) => {
  segments.value.splice(index, 1);
};

/** Default arrival date to departure; keep in sync until the user picks a different arrival. */
const onDepartureDate = (seg, value) => {
  const previous = seg.departureDate;
  seg.departureDate = value || "";
  if (!seg.arrivalDate || seg.arrivalDate === previous) {
    seg.arrivalDate = value || "";
  }
};

const close = () => emit("update:modelValue", false);

const load = async () => {
  if (!props.tripId || !props.tripPeopleRoleId) return;
  loading.value = true;
  error.value = "";
  try {
    const [segRes, airportRes, airlineRes] = await Promise.all([
      TripServices.getFlightSegments(props.tripId, props.tripPeopleRoleId),
      AirportServices.getAll(),
      AirlineServices.getAll(),
    ]);
    airports.value = airportRes.data || [];
    airlines.value = airlineRes.data || [];
    segments.value = (segRes.data?.segments || []).map((s) => ({
      segmentNumber: s.segmentNumber,
      departureAirportCode: s.departureAirportCode,
      airlineCode: s.airlineCode,
      flightNumber: s.flightNumber || "",
      departureDate: s.departureDate ? String(s.departureDate).slice(0, 10) : "",
      departureTime: s.departureTime || "",
      arrivalAirportCode: s.arrivalAirportCode,
      arrivalDate: s.arrivalDate ? String(s.arrivalDate).slice(0, 10) : "",
      arrivalTime: s.arrivalTime || "",
      cabinClass: s.cabinClass || "",
      seatNumber: s.seatNumber || "",
    }));
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to load segments.";
    segments.value = [];
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  error.value = "";
  try {
    await TripServices.updateFlightSegments(props.tripId, props.tripPeopleRoleId, {
      segments: segments.value.map((s) => ({
        segmentNumber: Number(s.segmentNumber),
        departureAirportCode: s.departureAirportCode,
        airlineCode: s.airlineCode,
        flightNumber: s.flightNumber,
        departureDate: s.departureDate,
        departureTime: s.departureTime,
        arrivalAirportCode: s.arrivalAirportCode,
        arrivalDate: s.arrivalDate,
        arrivalTime: s.arrivalTime,
        cabinClass: s.cabinClass || "",
        seatNumber: s.seatNumber || "",
      })),
    });
    emit("saved");
    close();
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to save segments.";
  } finally {
    saving.value = false;
  }
};

watch(
  () => [props.modelValue, props.tripPeopleRoleId],
  ([open]) => {
    if (open) load();
    if (!open) {
      segments.value = [];
      error.value = "";
    }
  }
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="960"
    scrollable
    @update:model-value="(v) => !v && close()"
  >
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />
        <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>

        <div v-if="!loading" class="d-flex justify-end mb-3">
          <v-btn size="small" variant="tonal" @click="addSegment">Add segment</v-btn>
        </div>

        <v-alert
          v-if="!loading && !segments.length"
          type="info"
          density="compact"
          class="mb-0"
        >
          No segments yet. Click Add segment.
        </v-alert>

        <div
          v-for="(seg, index) in segments"
          :key="index"
          class="mb-4 pa-3"
          style="border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px"
        >
          <div class="d-flex justify-space-between align-center mb-2">
            <div class="text-subtitle-2">Segment {{ index + 1 }}</div>
            <v-btn size="small" variant="text" color="error" @click="removeSegment(index)">
              Delete
            </v-btn>
          </div>
          <v-row dense>
            <v-col cols="6" md="2">
              <v-text-field
                v-model.number="seg.segmentNumber"
                label="Segment #"
                type="number"
                min="1"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-autocomplete
                v-model="seg.departureAirportCode"
                :items="airportItems"
                :custom-filter="catalogFilter"
                item-title="title"
                item-value="value"
                label="Departure airport"
                density="compact"
                hide-details="auto"
                clearable
                auto-select-first
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-autocomplete
                v-model="seg.arrivalAirportCode"
                :items="airportItems"
                :custom-filter="catalogFilter"
                item-title="title"
                item-value="value"
                label="Arrival airport"
                density="compact"
                hide-details="auto"
                clearable
                auto-select-first
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-autocomplete
                v-model="seg.airlineCode"
                :items="airlineItems"
                :custom-filter="catalogFilter"
                item-title="title"
                item-value="value"
                label="Airline"
                density="compact"
                hide-details="auto"
                clearable
                auto-select-first
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-text-field
                v-model="seg.flightNumber"
                label="Flight #"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-select
                :model-value="seg.cabinClass || null"
                :items="cabinClassItemsFor(seg.cabinClass)"
                label="Class of travel"
                density="compact"
                hide-details="auto"
                clearable
                @update:model-value="(v) => (seg.cabinClass = v || '')"
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-text-field
                v-model="seg.seatNumber"
                label="Seat #"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                :model-value="seg.departureDate"
                label="Departure date"
                type="date"
                density="compact"
                hide-details="auto"
                @update:model-value="(v) => onDepartureDate(seg, v)"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="seg.departureTime"
                label="Departure time"
                type="time"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="seg.arrivalDate"
                label="Arrival date"
                type="date"
                density="compact"
                hide-details="auto"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model="seg.arrivalTime"
                label="Arrival time"
                type="time"
                density="compact"
                hide-details="auto"
              />
            </v-col>
          </v-row>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="loading" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
