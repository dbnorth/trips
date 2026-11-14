<script setup>
import { computed } from "vue";
import { formatDate as formatDateText, formatDateRange } from "../utils/dateFormat.js";
import { showParticipantFlightLinks } from "../utils/participantFlightLinks.js";
import TripDateAdjustment from "./TripDateAdjustment.vue";

const SECTION_STATUSES = ["incomplete", "pre_approved", "approved"];

const props = defineProps({
  info: { type: Object, required: true },
  part: { type: String, default: "all" },
});

defineEmits(["edit-flights"]);

const showSections = computed(() => SECTION_STATUSES.includes(props.info.status));
const showDates = computed(() => props.part !== "logistics");
const showLogistics = computed(() => props.part !== "dates");
const room = computed(() => props.info.room || null);
const segments = computed(() => props.info.flightSegments || []);
const canEditFlights = computed(() => props.info.flightPurchaseOption === "self");

const bySegmentNumber = (a, b) => Number(a.segmentNumber) - Number(b.segmentNumber);
const arrivalSegments = computed(() =>
  segments.value.filter((segment) => segment.segmentType !== "return").slice().sort(bySegmentNumber)
);
const returnSegments = computed(() =>
  segments.value.filter((segment) => segment.segmentType === "return").slice().sort(bySegmentNumber)
);

const formatTime = (time) => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
};

const when = (date, time) => [formatDateText(String(date || "").slice(0, 10)), formatTime(time)].filter(Boolean).join(" ");

const placeAndTime = (code, date, time) => [code, when(date, time)].filter(Boolean).join(" ");

const segmentLine = (segment) => {
  const head = [segment.airlineName, segment.flightNumber].filter(Boolean).join(" ");
  const from = placeAndTime(segment.departureAirportCode, segment.departureDate, segment.departureTime);
  const to = placeAndTime(segment.arrivalAirportCode, segment.arrivalDate, segment.arrivalTime);
  const route = [from, to].filter(Boolean).join(" → ");
  return [head, route].filter(Boolean).join(" · ");
};

const roomLine = computed(() => {
  const assigned = room.value;
  if (!assigned) return "";
  const mates = assigned.roommates?.length ? assigned.roommates.join(", ") : "";
  const dates = formatDateRange(assigned.checkInDate, assigned.checkOutDate);
  return [assigned.hotelName, assigned.roomType, mates, dates].filter(Boolean).join(" · ");
});
</script>

<template>
  <v-row v-if="showDates && (info.arrivalDate || info.departureDate)" dense class="mt-2" data-testid="my-trip-dates">
    <v-col cols="6" sm="3">
      <div class="text-caption text-medium-emphasis">Arrive</div>
      <div data-testid="my-trip-arrive">
        <TripDateAdjustment :date="info.arrivalDate" :adjustments="info.arrivalAdjustments || []" direction="before" />
      </div>
    </v-col>
    <v-col cols="6" sm="3">
      <div class="text-caption text-medium-emphasis">Depart</div>
      <div data-testid="my-trip-depart">
        <TripDateAdjustment :date="info.departureDate" :adjustments="info.departureAdjustments || []" direction="after" />
      </div>
    </v-col>
  </v-row>

  <div v-if="showLogistics && showSections" class="mt-4" data-testid="my-trip-room">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Room</h3>
    <p v-if="!room" class="text-body-2 text-medium-emphasis mb-0">Your room will appear here after staff assign it.</p>
    <p v-else class="mb-0">{{ roomLine }}</p>
  </div>

  <div v-if="showLogistics && showSections" class="mt-4" data-testid="my-trip-flights">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
      <h3 class="text-subtitle-1 font-weight-bold mb-0">Flights</h3>
      <v-btn v-if="showParticipantFlightLinks && canEditFlights" size="small" color="primary" variant="flat" @click="$emit('edit-flights')">
        {{ segments.length ? "Edit Flights" : "Add Flights" }}
      </v-btn>
    </div>
    <p v-if="!segments.length" class="text-body-2 text-medium-emphasis mb-0">Your flights will appear here after staff enter them.</p>
    <template v-else>
      <div v-if="arrivalSegments.length" class="mb-2">
        <div class="font-weight-medium">Arrival</div>
        <div v-for="segment in arrivalSegments" :key="`arrival-${segment.segmentNumber}`">{{ segmentLine(segment) }}</div>
      </div>
      <div v-if="returnSegments.length">
        <div class="font-weight-medium">Return</div>
        <div v-for="segment in returnSegments" :key="`return-${segment.segmentNumber}`">{{ segmentLine(segment) }}</div>
      </div>
    </template>
  </div>
</template>
