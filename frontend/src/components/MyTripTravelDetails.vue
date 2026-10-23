<script setup>
import { ref, computed } from "vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import TripServices from "../services/tripServices.js";

const props = defineProps({
  info: { type: Object, required: true },
  trip: { type: Object, default: null },
});

defineEmits(["edit-flights"]);

const arrivalPdfError = ref("");

const openArrivalPdf = async () => {
  arrivalPdfError.value = "";
  try {
    await TripServices.openArrivalPdf(props.trip.id);
  } catch {
    arrivalPdfError.value = "Unable to open the Trip Arrival PDF.";
  }
};

const room = computed(() => props.info.room || null);
const segments = computed(() => props.info.flightSegments || []);
const options = computed(() => props.info.selectedTravelOptions || []);
const addonExpenses = computed(() => props.info.addonExpenses || []);
const canEditFlights = computed(() => props.info.flightPurchaseOption === "self");

const formatDate = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "—";
};

const formatTime = (time) => {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
};

const formatDateTime = (date, time) => [formatDate(date), formatTime(time)].filter(Boolean).join(" ");

const segmentTypeLabel = (type) => (type === "return" ? "Return" : "Arrival");

const optionLabel = (option) => {
  const adjustment = Number(option.priceAdjustment) || 0;
  if (!adjustment) return option.description;
  const sign = adjustment > 0 ? "+" : "−";
  return `${option.description} (${sign}${formatMoneyDisplay(Math.abs(adjustment))})`;
};
</script>

<template>
  <div v-if="info.hasArrivalPdf && trip" class="mt-4" data-testid="my-trip-arrival-info">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Trip arrival info</h3>
    <a href="#" data-testid="my-trip-arrival-link" @click.prevent="openArrivalPdf">
      Trip Arrival - {{ trip.name }}.pdf
    </a>
    <v-alert v-if="arrivalPdfError" type="error" density="compact" class="mt-2">{{ arrivalPdfError }}</v-alert>
  </div>

  <div v-if="room" class="mt-4" data-testid="my-trip-room">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Room</h3>
    <v-row dense>
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

  <div v-if="segments.length" class="mt-4" data-testid="my-trip-flights">
    <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
      <h3 class="text-subtitle-1 font-weight-bold mb-0">Flights</h3>
      <v-btn v-if="canEditFlights" size="small" color="primary" variant="tonal" @click="$emit('edit-flights')">
        Edit Flights
      </v-btn>
    </div>
    <div class="overflow-x-auto">
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

  <div v-if="options.length" class="mt-4" data-testid="my-trip-options">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Trip options</h3>
    <ul class="pl-5">
      <li v-for="option in options" :key="option.id">{{ optionLabel(option) }}</li>
    </ul>
  </div>

  <div v-if="addonExpenses.length" class="mt-4" data-testid="my-trip-addon-expenses">
    <h3 class="text-subtitle-1 font-weight-bold mb-2">Add-on expenses</h3>
    <ul class="pl-5">
      <li v-for="(expense, index) in addonExpenses" :key="index">
        {{ expense.description }} ({{ formatMoneyDisplay(Number(expense.cost).toFixed(2)) }})
      </li>
    </ul>
  </div>
</template>
