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
  tripStartDate: { type: String, default: "" },
  tripEndDate: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const SEGMENT_SECTIONS = [
  { type: "arrival", title: "Arrival Flight", empty: "No arrival segments yet." },
  { type: "return", title: "Return Flight", empty: "No return segments yet." },
];

const loading = ref(false);
const saving = ref(false);
const error = ref("");
const segments = ref([]);
const airports = ref([]);
const airlines = ref([]);

const title = computed(
  () => `Flight segments — ${props.participantName || "Participant"}`
);

const segmentsForType = (segmentType) =>
  segments.value.filter((s) => s.segmentType === segmentType);

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

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");

const blankSegment = (segmentType) => {
  const ofType = segmentsForType(segmentType);
  const isFirstOfType = ofType.length === 0;
  const prevSame = ofType[ofType.length - 1];
  const lastArrival = segmentsForType("arrival").at(-1);
  const chainFrom =
    prevSame || (segmentType === "return" && !prevSame ? lastArrival : null);
  const tripDefaultDate =
    segmentType === "arrival"
      ? dateOnly(props.tripStartDate)
      : dateOnly(props.tripEndDate);
  const defaultDate = isFirstOfType
    ? tripDefaultDate
    : chainFrom?.arrivalDate || "";
  return {
    segmentType,
    segmentNumber: ofType.length + 1,
    departureAirportCode: chainFrom?.arrivalAirportCode ?? null,
    airlineCode: null,
    flightNumber: "",
    departureDate: defaultDate,
    departureTime: "",
    arrivalAirportCode: null,
    arrivalDate: defaultDate,
    arrivalTime: "",
    cabinClass: "",
    seatNumber: "",
  };
};

const renumberType = (segmentType) => {
  let n = 1;
  for (const seg of segments.value) {
    if (seg.segmentType === segmentType) {
      seg.segmentNumber = n;
      n += 1;
    }
  }
};

const addSegment = (segmentType) => {
  segments.value.push(blankSegment(segmentType));
};

const removeSegment = (index) => {
  const type = segments.value[index]?.segmentType;
  segments.value.splice(index, 1);
  if (type) renumberType(type);
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
      segmentType: s.segmentType === "return" ? "return" : "arrival",
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
        segmentType: s.segmentType,
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
    emit("update:modelValue", false);
    emit("saved");
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

        <template v-if="!loading">
          <div
            v-for="(section, sectionIndex) in SEGMENT_SECTIONS"
            :key="section.type"
            :class="sectionIndex === 0 ? 'mb-6' : ''"
          >
            <div class="d-flex justify-space-between align-center mb-3">
              <div class="text-h6">{{ section.title }}</div>
              <v-btn size="small" variant="tonal" @click="addSegment(section.type)">
                Add Segment
              </v-btn>
            </div>
            <v-alert
              v-if="!segmentsForType(section.type).length"
              type="info"
              density="compact"
              class="mb-0"
            >
              {{ section.empty }}
            </v-alert>
            <div
              v-for="seg in segmentsForType(section.type)"
              :key="`${section.type}-${seg.segmentNumber}-${segments.indexOf(seg)}`"
              class="mb-4 pa-3"
              style="border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 4px"
            >
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-subtitle-2">
                  {{ section.type === "arrival" ? "Arrival" : "Return" }} segment
                  {{ seg.segmentNumber }}
                </div>
                <v-btn
                  size="small"
                  variant="text"
                  color="error"
                  @click="removeSegment(segments.indexOf(seg))"
                >
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
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="loading" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
