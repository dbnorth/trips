<script setup>
import { computed } from "vue";
import { formatDate as formatDateText } from "../utils/dateFormat.js";
import MyTripFinancialInfo from "./MyTripFinancialInfo.vue";
import TripDateAdjustment from "./TripDateAdjustment.vue";

const SECTION_STATUSES = ["incomplete", "pre_approved", "approved"];

const props = defineProps({
  info: { type: Object, required: true },
  trip: { type: Object, default: null },
  canViewDonations: { type: Boolean, default: false },
});

defineEmits(["edit-flights", "view-donations", "make-donation"]);

const showSections = computed(() => SECTION_STATUSES.includes(props.info.status));
const room = computed(() => props.info.room || null);
const segments = computed(() => props.info.flightSegments || []);
const canEditFlights = computed(() => props.info.flightPurchaseOption === "self");

const formatDate = (value) => formatDateText(String(value || "").slice(0, 10)) || "—";

const formatTime = (time) => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
};

const formatDateTime = (date, time) => [formatDate(date), formatTime(time)].filter(Boolean).join(" ");

const segmentTypeLabel = (type) => (type === "return" ? "Return" : "Arrival");
</script>

<template>
  <v-row v-if="info.arrivalDate || info.departureDate" dense class="mt-2" data-testid="my-trip-dates">
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

  <MyTripFinancialInfo
    v-if="showSections"
    :info="info"
    :can-view-donations="canViewDonations"
    :deposit="trip?.deposit ?? null"
    @view-donations="$emit('view-donations')"
    @make-donation="$emit('make-donation')"
  />

  <div v-if="showSections" class="mt-4" data-testid="my-trip-room">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Room</h3>
    <p v-if="!room" class="text-body-2 text-medium-emphasis mb-0">Not yet available</p>
    <v-row v-else dense>
      <v-col cols="12" sm="6" md="3">
        <div class="text-caption text-medium-emphasis">Hotel</div>
        <div>{{ room.hotelName || "—" }}</div>
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <div class="text-caption text-medium-emphasis">Room type</div>
        <div>{{ room.roomType || "—" }}</div>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <div class="text-caption text-medium-emphasis">Roommates</div>
        <div>{{ room.roommates?.length ? room.roommates.join(", ") : "—" }}</div>
      </v-col>
      <v-col cols="6" sm="3" md="2">
        <div class="text-caption text-medium-emphasis">Check-in</div>
        <div>{{ formatDate(room.checkInDate) }}</div>
      </v-col>
      <v-col cols="6" sm="3" md="2">
        <div class="text-caption text-medium-emphasis">Check-out</div>
        <div>{{ formatDate(room.checkOutDate) }}</div>
      </v-col>
    </v-row>
  </div>

  <div v-if="showSections" class="mt-4" data-testid="my-trip-flights">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
      <h3 class="text-subtitle-1 font-weight-bold mb-0">Flights</h3>
      <v-btn v-if="canEditFlights" size="small" color="primary" variant="tonal" @click="$emit('edit-flights')">
        {{ segments.length ? "Edit Flights" : "Add Flights" }}
      </v-btn>
    </div>
    <p v-if="!segments.length" class="text-body-2 text-medium-emphasis mb-0">Not yet available</p>
    <div v-else class="overflow-x-auto">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Flight</th>
            <th>Airline</th>
            <th>Flight number</th>
            <th>From</th>
            <th>Departure</th>
            <th>To</th>
            <th>Arrival</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="segment in segments" :key="`${segment.segmentType}-${segment.segmentNumber}`">
            <td>{{ segmentTypeLabel(segment.segmentType) }}</td>
            <td>{{ segment.airlineName || "—" }}</td>
            <td>{{ segment.flightNumber || "—" }}</td>
            <td>{{ segment.departureAirportCode || "—" }}</td>
            <td>{{ formatDateTime(segment.departureDate, segment.departureTime) }}</td>
            <td>{{ segment.arrivalAirportCode || "—" }}</td>
            <td>{{ formatDateTime(segment.arrivalDate, segment.arrivalTime) }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>
