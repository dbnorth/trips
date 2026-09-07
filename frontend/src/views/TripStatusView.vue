<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import PersonContactDialog from "../components/PersonContactDialog.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { countryName } from "../utils/locationData.js";
import { tripParticipantStatusLabel } from "../utils/tripParticipantStatus.js";

const props = defineProps({
  tripId: { type: [String, Number], default: null },
});

const route = useRoute();
const router = useRouter();

const resolvedTripId = computed(() => props.tripId ?? route.params.tripId);

const board = ref(null);
const loading = ref(false);
const message = ref("");
const showContact = ref(false);
const contactPersonId = ref(null);

const trip = computed(() => board.value?.trip || null);
const rolesNeeded = computed(() => board.value?.rolesNeeded || []);
const travelOptions = computed(() => board.value?.travelOptions || []);
const participants = computed(() => board.value?.participants || []);

const formatDate = (value) => value || "—";

const formatMoney = (value) => {
  if (value == null || value === "") return "—";
  return formatMoneyDisplay(value) || "$0.00";
};

const formatMissingItems = (items) => {
  if (!items || !items.length) return "—";
  return items.join(", ");
};

const optionSelectedLabel = (row, optionId) => {
  const ids = (row.selectedTravelOptionIds || []).map(Number);
  return ids.includes(Number(optionId)) ? "Yes" : "—";
};

const openContact = (row) => {
  const id = row?.peopleId;
  if (!id) return;
  contactPersonId.value = id;
  showContact.value = true;
};

const headers = computed(() => {
  const base = [
    { title: "Participant", key: "displayName", sortable: true },
    { title: "Status", key: "status", sortable: true },
    { title: "Role", key: "workerRoleName", sortable: true },
    { title: "Missing items", key: "missingItems", sortable: false },
    { title: "Amount owed", key: "amountOwed", sortable: true },
    { title: "Amount raised", key: "amountRaised", sortable: true },
  ];
  for (const option of travelOptions.value) {
    const setLabel =
      option.setNumber != null ? ` (Set ${option.setNumber})` : "";
    base.push({
      title: `${option.description || "Option"}${setLabel}`,
      key: `opt_${option.id}`,
      sortable: false,
    });
  }
  return base;
});

const tableItems = computed(() =>
  (participants.value || []).map((row) => {
    const item = {
      ...row,
      workerRoleName: row.workerRoleName || "—",
      missingItemsLabel: formatMissingItems(row.missingItems),
      statusLabel: tripParticipantStatusLabel(row.status),
    };
    for (const option of travelOptions.value) {
      item[`opt_${option.id}`] = optionSelectedLabel(row, option.id);
    }
    return item;
  })
);

const load = async () => {
  const id = resolvedTripId.value;
  if (!id) return;
  loading.value = true;
  message.value = "";
  try {
    const response = await TripServices.getStatus(id);
    board.value = response.data || null;
  } catch (err) {
    board.value = null;
    const status = err.response?.status;
    if (status === 403 || status === 404) {
      message.value = "Trip status is not available.";
      router.replace({ name: "home" });
      return;
    }
    message.value = err.response?.data?.message || err.message || "Failed to load trip status.";
  } finally {
    loading.value = false;
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
        <v-btn
          variant="text"
          @click="router.push({ name: 'tripView', params: { tripId: resolvedTripId } })"
        >
          Back to trip
        </v-btn>
        <h1 class="text-h5">{{ trip?.name ? `${trip.name} — Status` : "Trip status" }}</h1>
      </div>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="message" type="error" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="trip" class="pa-4 mb-6">
      <v-card-title class="px-0 pt-0">{{ trip.name }}</v-card-title>
      <v-card-subtitle class="px-0">
        {{ trip.organizationName || "Organization" }}
        <span v-if="trip.city || trip.country">
          · {{ [trip.city, countryName(trip.country)].filter(Boolean).join(", ") }}
        </span>
      </v-card-subtitle>
      <v-card-text class="px-0">
        <v-row dense>
          <v-col cols="12" sm="6" md="4"><strong>Status:</strong> {{ trip.status }}</v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Dates:</strong> {{ formatDate(trip.startDate) }} – {{ formatDate(trip.endDate) }}
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Location:</strong> {{ trip.location || "—" }}
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Participant cost:</strong> {{ formatMoney(trip.participantCost) }}
          </v-col>
        </v-row>

        <div class="mt-4">
          <div class="text-subtitle-2 mb-2">Roles</div>
          <v-alert
            v-if="!rolesNeeded.length"
            type="info"
            density="compact"
            class="mb-0"
          >
            No worker roles configured for this trip.
          </v-alert>
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>Role</th>
                <th>Needed</th>
                <th>Signed up</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="role in rolesNeeded" :key="role.id">
                <td>{{ role.workerRoleName || "—" }}</td>
                <td>{{ role.quantity }}</td>
                <td>{{ role.signedUpCount }}</td>
                <td>{{ role.availableCount }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>

    <v-card v-if="board && !loading" class="pa-4">
      <h2 class="text-h6 mb-3">Participants</h2>
      <v-alert
        v-if="!tableItems.length"
        type="info"
        density="compact"
        class="mb-0"
      >
        No participants yet
      </v-alert>
      <div v-else class="overflow-x-auto">
        <v-data-table
          :headers="headers"
          :items="tableItems"
          item-value="id"
          density="compact"
          hide-default-footer
          :items-per-page="-1"
        >
          <template #item.displayName="{ item }">
            <button
              type="button"
              class="profile-link text-start"
              :disabled="!item.peopleId"
              @click="openContact(item)"
            >
              <span class="profile-link-text">{{ item.displayName }}</span>
            </button>
          </template>
          <template #item.status="{ item }">
            {{ item.statusLabel }}
          </template>
          <template #item.missingItems="{ item }">
            {{ item.missingItemsLabel }}
          </template>
          <template #item.amountOwed="{ item }">
            {{ formatMoney(item.amountOwed) }}
          </template>
          <template #item.amountRaised="{ item }">
            {{ formatMoney(item.amountRaised) }}
          </template>
        </v-data-table>
      </div>
    </v-card>

    <PersonContactDialog v-model="showContact" :person-id="contactPersonId" />
  </v-container>
</template>

<style scoped>
.profile-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.profile-link:disabled {
  cursor: default;
  opacity: 0.7;
}
.profile-link-text {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.profile-link:disabled .profile-link-text {
  color: inherit;
  text-decoration: none;
}
</style>
