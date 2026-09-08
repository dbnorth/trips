<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import FlightSegmentsDialog from "../components/FlightSegmentsDialog.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";

const props = defineProps({
  tripId: { type: [String, Number], default: null },
});

const route = useRoute();
const router = useRouter();
const resolvedTripId = computed(() => props.tripId ?? route.params.tripId);

const trip = ref(null);
const participants = ref([]);
const loading = ref(false);
const savingId = ref(null);
const message = ref("");
const error = ref("");
const showSegments = ref(false);
const segmentsParticipant = ref(null);

const pageTitle = computed(() =>
  trip.value?.name ? `${trip.value.name} — Flights` : "Flights"
);

const formatTimeAmPm = (time) => {
  if (time == null || time === "") return "";
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(time);
  let hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return String(time);
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${suffix}`;
};

const formatItineraryPart = (part) => {
  if (!part) return "—";
  const bits = [part.date, formatTimeAmPm(part.time), part.city].filter(Boolean);
  return bits.length ? bits.join(" · ") : "—";
};

const formatCostDisplay = (value) => {
  if (value == null || value === "") return "";
  return formatMoneyDisplay(value) || String(value);
};

const formatFlightPurchase = (row) => {
  if (row.flightPurchaseOption === "self") return "Participant purchases";
  if (row.flightPurchaseOption === "organization") {
    const org = trip.value?.organizationName || "Organization";
    return `${org} purchases`;
  }
  return "—";
};

const participantPaysOwn = (row) => row?.flightPurchaseOption === "self";

const applyPayload = (data) => {
  trip.value = data?.trip || null;
  participants.value = (data?.participants || []).map((p) => {
    const paysOwn = p.flightPurchaseOption === "self";
    return {
      ...p,
      costInput: paysOwn ? "0" : p.cost != null ? String(p.cost) : "",
      comments: p.comments || "",
      purchased: !!p.purchased,
    };
  });
};

const load = async () => {
  const id = resolvedTripId.value;
  if (!id) return;
  loading.value = true;
  error.value = "";
  try {
    const response = await TripServices.getFlights(id);
    applyPayload(response.data);
  } catch (err) {
    trip.value = null;
    participants.value = [];
    const status = err.response?.status;
    if (status === 403 || status === 404) {
      error.value = "Flights are not available.";
      router.replace({ name: "home" });
      return;
    }
    error.value = err.response?.data?.message || err.message || "Failed to load flights.";
  } finally {
    loading.value = false;
  }
};

const saveRow = async (row) => {
  savingId.value = row.tripPeopleRoleId;
  error.value = "";
  message.value = "";
  try {
    const paysOwn = participantPaysOwn(row);
    const costRaw = String(row.costInput ?? "").trim();
    await TripServices.updateFlight(resolvedTripId.value, row.tripPeopleRoleId, {
      purchased: !!row.purchased,
      cost: paysOwn ? 0 : costRaw === "" ? null : Number(costRaw),
      comments: row.comments || "",
    });
    message.value = `Saved flight for ${row.firstName} ${row.lastName}.`.trim();
    await load();
  } catch (err) {
    error.value = err.response?.data?.message || err.message || "Failed to save flight.";
  } finally {
    savingId.value = null;
  }
};

const openSegments = (row) => {
  segmentsParticipant.value = row;
  showSegments.value = true;
};

const onSegmentsSaved = () => {
  showSegments.value = false;
  segmentsParticipant.value = null;
  load();
};

const participantLabel = computed(() => {
  const p = segmentsParticipant.value;
  if (!p) return "";
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
});

watch(resolvedTripId, () => load());
onMounted(load);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div class="d-flex align-center ga-2">
        <v-btn variant="text" @click="router.push({ name: 'trips' })">Back to trips</v-btn>
        <h1 class="text-h5">{{ pageTitle }}</h1>
      </div>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="trip" class="pa-4 mb-6">
      <v-card-title class="px-0 pt-0">{{ trip.name }}</v-card-title>
      <v-card-subtitle class="px-0">
        {{ trip.startDate || "—" }} – {{ trip.endDate || "—" }}
      </v-card-subtitle>
    </v-card>

    <v-card v-if="trip && !loading" class="pa-4">
      <h2 class="text-h6 mb-3">Participants</h2>
      <v-alert v-if="!participants.length" type="info" density="compact" class="mb-0">
        No participants
      </v-alert>
      <div v-else class="overflow-x-auto">
        <v-table density="compact">
          <thead>
            <tr>
              <th>First name</th>
              <th>Last name</th>
              <th>Who purchases</th>
              <th>Cost</th>
              <th>Comments</th>
              <th>Initial departure</th>
              <th>Final arrival</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in participants" :key="row.tripPeopleRoleId">
              <td>{{ row.firstName || "—" }}</td>
              <td>{{ row.lastName || "—" }}</td>
              <td style="min-width: 200px; max-width: 320px">
                <div>{{ formatFlightPurchase(row) }}</div>
                <div
                  v-if="row.flightPurchaseOption === 'organization' && row.flightPurchasePreferencesText"
                  class="text-caption text-medium-emphasis"
                >
                  {{ row.flightPurchasePreferencesText }}
                </div>
              </td>
              <td style="min-width: 110px">
                <v-text-field
                  v-model="row.costInput"
                  density="compact"
                  hide-details
                  variant="underlined"
                  :disabled="participantPaysOwn(row)"
                  :placeholder="formatCostDisplay(row.cost) || '—'"
                />
              </td>
              <td style="min-width: 160px">
                <v-text-field
                  v-model="row.comments"
                  density="compact"
                  hide-details
                  variant="underlined"
                />
              </td>
              <td>{{ formatItineraryPart(row.initialDeparture) }}</td>
              <td>{{ formatItineraryPart(row.finalArrival) }}</td>
              <td class="text-no-wrap">
                <v-btn
                  size="small"
                  variant="text"
                  :loading="savingId === row.tripPeopleRoleId"
                  @click="saveRow(row)"
                >
                  Save
                </v-btn>
                <v-btn size="small" variant="text" @click="openSegments(row)">
                  Flight segments
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <FlightSegmentsDialog
      v-model="showSegments"
      :trip-id="resolvedTripId"
      :trip-people-role-id="segmentsParticipant?.tripPeopleRoleId"
      :participant-name="participantLabel"
      :trip-start-date="trip?.startDate || ''"
      :trip-end-date="trip?.endDate || ''"
      @saved="onSegmentsSaved"
    />
  </v-container>
</template>
