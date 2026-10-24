<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import ExportServices from "../services/exportServices.js";
import FlightSegmentsDialog from "../components/FlightSegmentsDialog.vue";
import TripTeamEmailDialog from "../components/TripTeamEmailDialog.vue";
import TripDateAdjustment from "../components/TripDateAdjustment.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { flightBookedByLabel } from "../utils/flightBookedBy.js";
import { flightAirportWarnings } from "../utils/flightAirportWarnings.js";
import RowAction from "../components/RowAction.vue";
import Utils from "../config/utils.js";

const props = defineProps({
  tripId: { type: [String, Number], default: null },
});

const route = useRoute();
const router = useRouter();
const resolvedTripId = computed(() => props.tripId ?? route.params.tripId);
const isAgentUser = Utils.isAgentUser(Utils.getStore("user"));

const trip = ref(null);
const participants = ref([]);
const loading = ref(false);
const savingId = ref(null);
const downloadingPdf = ref(false);
const message = ref("");
const error = ref("");
const showSegments = ref(false);
const segmentsParticipant = ref(null);
const showItineraryEmail = ref(false);

const itineraryRecipients = computed(() =>
  participants.value.map((p) => ({
    peopleId: p.peopleId,
    person: { firstName: p.firstName, lastName: p.lastName },
    role: { roleName: p.roleName },
    status: p.status,
  }))
);

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

const formatFlightPurchase = (row) =>
  flightBookedByLabel(row.flightPurchaseOption, trip.value?.organizationName);

const participantPaysOwn = (row) => row?.flightPurchaseOption === "self";

const airportLabel = (code, city) => (code ? `${code}${city ? ` (${city})` : ""}` : "");

/** The participant's requested flight info as label/value lines, leaving out blanks. */
const requestedFlightInfo = (row) => {
  const prefs = row.flightPurchaseOption === "organization" ? row.flightPurchasePreferences || {} : {};
  const refundable = { true: "Yes", false: "No" }[String(prefs.refundableTicket)] || "";
  return [
    ["Preferred departure airport", airportLabel(prefs.departureAirportCode, prefs.departureCity)],
    ["Preferred return airport", airportLabel(prefs.returnAirportCode, prefs.returnCity)],
    ["Class of travel", prefs.cabinClass],
    ["Preferred airline", [prefs.airlineCode, prefs.airlineName].filter(Boolean).join(" — ")],
    ["Refundable ticket", refundable],
    ["Flight notes", row.flightNotes],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => ({ label, value }));
};

const applyPayload = (data) => {
  trip.value = data?.trip || null;
  participants.value = (data?.participants || []).map((p) => {
    const paysOwn = p.flightPurchaseOption === "self";
    return {
      ...p,
      costInput: paysOwn ? "0" : p.cost != null ? String(p.cost) : "",
      comments: p.comments || "",
      purchased: !!p.purchased,
      requestedFlightInfo: requestedFlightInfo(p),
      airportWarnings: flightAirportWarnings({
        arrivalFlightOriginCode: p.arrivalFlightOriginCode,
        returnFlightDestinationCode: p.returnFlightDestinationCode,
        preferences: p.flightPurchaseOption === "organization" ? p.flightPurchasePreferences : null,
      }),
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

const downloadPdf = async () => {
  downloadingPdf.value = true;
  error.value = "";
  try {
    await ExportServices.flightsPdf(resolvedTripId.value, trip.value.name);
  } catch (err) {
    error.value = err.message || "Unable to download flights PDF.";
  } finally {
    downloadingPdf.value = false;
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
        <v-btn v-if="isAgentUser" variant="text" @click="router.push({ name: 'home' })">Back to home</v-btn>
        <v-btn v-else variant="text" @click="router.push({ name: 'trips' })">Back to trips</v-btn>
        <h1 class="text-h5">{{ pageTitle }}</h1>
      </div>
      <div class="d-flex align-center ga-2">
        <v-btn
          variant="tonal"
          color="primary"
          :loading="downloadingPdf"
          :disabled="loading || !trip"
          @click="downloadPdf"
        >
          Flights PDF
        </v-btn>
        <v-btn variant="tonal" color="primary" :disabled="loading || !trip" @click="showItineraryEmail = true">
          Email flight itinerary
        </v-btn>
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
              <th>Booked by</th>
              <th>Arrives</th>
              <th>Departs</th>
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
                <span class="d-inline-flex align-center ga-1">
                  <span>{{ formatFlightPurchase(row) }}</span>
                  <v-tooltip v-if="row.requestedFlightInfo.length" location="top" max-width="400">
                    <template #activator="{ props: activator }">
                      <v-icon
                        v-bind="activator"
                        icon="mdi-information-outline"
                        size="small"
                        role="img"
                        tabindex="0"
                        :aria-hidden="false"
                        aria-label="Requested flight info"
                        data-testid="requested-flight-info"
                      />
                    </template>
                    <div data-testid="requested-flight-details">
                      <div class="font-weight-bold mb-1">Requested flight info</div>
                      <div
                        v-for="line in row.requestedFlightInfo"
                        :key="line.label"
                        class="text-pre-wrap"
                      >{{ line.label }}: {{ line.value }}</div>
                    </div>
                  </v-tooltip>
                </span>
              </td>
              <td class="text-no-wrap" data-testid="flights-arrives">
                <TripDateAdjustment
                  :date="row.arrivalDate"
                  :adjustments="row.arrivalAdjustments"
                  :flight-date="row.flightArrivalDate"
                  direction="before"
                />
              </td>
              <td class="text-no-wrap" data-testid="flights-departs">
                <TripDateAdjustment
                  :date="row.departureDate"
                  :adjustments="row.departureAdjustments"
                  :flight-date="row.flightDepartureDate"
                  direction="after"
                />
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
              <td
                v-for="part in [
                  { key: 'initial-departure', value: row.initialDeparture, warning: row.airportWarnings.arrival },
                  { key: 'final-arrival', value: row.finalArrival, warning: row.airportWarnings.return },
                ]"
                :key="part.key"
                :data-testid="`flights-${part.key}`"
              >
                <span class="d-inline-flex align-center ga-1">
                  <span>{{ formatItineraryPart(part.value) }}</span>
                  <v-tooltip v-if="part.warning" location="top">
                    <template #activator="{ props: activator }">
                      <v-icon
                        v-bind="activator"
                        icon="mdi-alert"
                        color="warning"
                        size="small"
                        :aria-label="part.warning"
                        data-testid="airport-warning"
                      />
                    </template>
                    <span data-testid="airport-warning-message">{{ part.warning }}</span>
                  </v-tooltip>
                </span>
              </td>
              <td class="text-no-wrap">
                <div class="d-flex flex-nowrap ga-1">
                  <RowAction
                    icon="mdi-content-save"
                    label="Save"
                    :loading="savingId === row.tripPeopleRoleId"
                    @click="saveRow(row)"
                  />
                  <RowAction icon="mdi-airplane-edit" label="Flight segments" @click="openSegments(row)" />
                </div>
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
    <TripTeamEmailDialog
      v-model="showItineraryEmail"
      kind="flightItinerary"
      :trip-id="resolvedTripId"
      :org-id="trip?.orgId ?? null"
      :participants="itineraryRecipients"
    />
  </v-container>
</template>
