<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";

const ROOM_TYPES = ["King", "Double", "Triple"];

const props = defineProps({
  tripId: { type: [String, Number], default: null },
});

const route = useRoute();
const router = useRouter();

const resolvedTripId = computed(() => props.tripId ?? route.params.tripId);

const trip = ref(null);
const hotelName = ref("");
const checkInDate = ref("");
const notes = ref("");
const participants = ref([]);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const error = ref("");

const pageTitle = computed(() =>
  trip.value?.name ? `${trip.value.name} — Rooming` : "Rooming list"
);

const formatRoommate = (row) => (row.hasPreferredRoommate ? "Yes" : "No");

const preferredLabel = (row) => {
  const names = row.preferredRoommateNames;
  if (names == null || String(names).trim() === "") return "—";
  return String(names).trim();
};

const applyPayload = (data) => {
  trip.value = data?.trip || null;
  hotelName.value = data?.roomingList?.hotelName || "";
  checkInDate.value = data?.roomingList?.checkInDate
    ? String(data.roomingList.checkInDate).slice(0, 10)
    : "";
  notes.value = data?.roomingList?.notes || "";
  participants.value = (data?.participants || []).map((p) => ({
    tripPeopleRoleId: p.tripPeopleRoleId,
    peopleId: p.peopleId,
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    hasPreferredRoommate: !!p.hasPreferredRoommate,
    preferredRoommateNames: p.preferredRoommateNames || null,
    roomNumber: p.roomNumber != null ? String(p.roomNumber) : "",
    roomType: p.roomType || null,
    numberOfNights: p.numberOfNights != null ? String(p.numberOfNights) : "",
  }));
};

const load = async () => {
  const id = resolvedTripId.value;
  if (!id) return;
  loading.value = true;
  error.value = "";
  message.value = "";
  try {
    const response = await TripServices.getRooming(id);
    applyPayload(response.data);
  } catch (err) {
    trip.value = null;
    participants.value = [];
    const status = err.response?.status;
    if (status === 403 || status === 404) {
      error.value = "Rooming list is not available.";
      router.replace({ name: "home" });
      return;
    }
    error.value = err.response?.data?.message || err.message || "Failed to load rooming list.";
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  const id = resolvedTripId.value;
  if (!id) return;
  saving.value = true;
  error.value = "";
  message.value = "";
  try {
    const response = await TripServices.updateRooming(id, {
      hotelName: hotelName.value,
      checkInDate: checkInDate.value || null,
      notes: notes.value,
      assignments: participants.value.map((p) => ({
        tripPeopleRoleId: p.tripPeopleRoleId,
        roomNumber: p.roomNumber,
        roomType: p.roomType,
        numberOfNights:
          p.numberOfNights === "" || p.numberOfNights == null
            ? null
            : Number(p.numberOfNights),
      })),
    });
    applyPayload(response.data);
    message.value = "Rooming list saved.";
  } catch (err) {
    error.value = err.response?.data?.message || err.message || "Failed to save rooming list.";
  } finally {
    saving.value = false;
  }
};

watch(resolvedTripId, () => {
  load();
});

onMounted(load);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <div class="d-flex align-center ga-2">
        <v-btn variant="text" @click="router.push({ name: 'trips' })">Back to trips</v-btn>
        <h1 class="text-h5">{{ pageTitle }}</h1>
      </div>
      <v-btn color="primary" :loading="saving" :disabled="loading || !trip" @click="save">
        Save
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="trip" class="pa-4 mb-6">
      <v-card-title class="px-0 pt-0">{{ trip.name }}</v-card-title>
      <v-card-subtitle class="px-0">
        {{ trip.startDate || "—" }} – {{ trip.endDate || "—" }}
      </v-card-subtitle>
      <v-card-text class="px-0">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="hotelName"
              label="Hotel name"
              density="compact"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="checkInDate"
              label="Start date"
              type="date"
              density="compact"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-textarea
              v-model="notes"
              label="Comments"
              rows="2"
              density="compact"
              hide-details="auto"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card v-if="trip && !loading" class="pa-4">
      <h2 class="text-h6 mb-3">Participants</h2>
      <v-alert
        v-if="!participants.length"
        type="info"
        density="compact"
        class="mb-0"
      >
        No participants to assign
      </v-alert>
      <div v-else class="overflow-x-auto">
        <v-table density="compact">
          <thead>
            <tr>
              <th>First name</th>
              <th>Last name</th>
              <th>Room number</th>
              <th>Nights</th>
              <th>Room type</th>
              <th>Roommate</th>
              <th>Preferred roommates</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in participants" :key="row.tripPeopleRoleId">
              <td>{{ row.firstName || "—" }}</td>
              <td>{{ row.lastName || "—" }}</td>
              <td style="min-width: 110px">
                <v-text-field
                  v-model="row.roomNumber"
                  density="compact"
                  hide-details
                  variant="underlined"
                />
              </td>
              <td style="min-width: 90px">
                <v-text-field
                  v-model="row.numberOfNights"
                  type="number"
                  min="1"
                  density="compact"
                  hide-details
                  variant="underlined"
                />
              </td>
              <td style="min-width: 140px">
                <v-select
                  v-model="row.roomType"
                  :items="ROOM_TYPES"
                  density="compact"
                  hide-details
                  clearable
                  variant="underlined"
                />
              </td>
              <td>{{ formatRoommate(row) }}</td>
              <td>{{ preferredLabel(row) }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>
  </v-container>
</template>
