<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import AddTripParticipantDialog from "../components/AddTripParticipantDialog.vue";
import EditTripParticipantDialog from "../components/EditTripParticipantDialog.vue";
import ParticipantDonationsDialog from "../components/ParticipantDonationsDialog.vue";
import EditTripDialog from "../components/EditTripDialog.vue";
import Utils from "../config/utils.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { countryName } from "../utils/locationData.js";
import { donorTripPath } from "../utils/donateUrls.js";
import { tripParticipantStatusLabel } from "../utils/tripParticipantStatus.js";

const route = useRoute();
const user = ref(null);
const trips = ref([]);
const trip = ref(null);
const participants = ref([]);
const selectedTripId = ref(null);
const loading = ref(false);
const message = ref("");
const showAddParticipant = ref(false);
const showEditParticipant = ref(false);
const editParticipant = ref(null);
const showEditTrip = ref(false);
const showDonations = ref(false);
const donationsParticipant = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return (
    Utils.orgDisplayName(user.value, orgId) ||
    trip.value?.organization?.name ||
    null
  );
});
const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));
const needsOrgSelection = computed(() => user.value?.isAdmin && !effectiveOrgId.value);
const isTripLeaderOnly = computed(() => {
  if (!user.value || user.value.isAdmin) return false;
  const isOrgAdmin = (user.value.orgRoles || []).some((r) => r.roleName === "Org Admin");
  const isTripLeader = (user.value.tripRoles || []).some((r) => r.roleName === "Trip Leader");
  return isTripLeader && !isOrgAdmin;
});
const pageTitle = computed(() => (isTripLeaderOnly.value ? "Trips" : "Participants"));

const tripItems = computed(() => trips.value.map((t) => ({ title: t.name, value: t.id })));

const donorLink = computed(() => (trip.value ? donorTripPath(trip.value) : null));

const formatLeaders = computed(() => (trip.value?.leaderNames || []).join(", ") || "—");

const formatDate = (value) => value || "—";

const participantName = (row) => {
  const p = row.person;
  return p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "—";
};

const formatDonationTotal = (row) => formatMoneyDisplay(row.donationTotal ?? 0) || "$0.00";

const formatParticipantCost = (value) =>
  value != null ? formatMoneyDisplay(value) : "—";

const rowParticipantCost = (row) =>
  formatParticipantCost(row.participantCost ?? trip.value?.participantCost);

const applyRouteContext = () => {
  const orgId = route.query.orgId;
  if (orgId != null && orgId !== "") {
    const id = Number(orgId);
    if (Number(Utils.effectiveOrgId(user.value)) !== id) {
      Utils.setCurrentOrg(id);
    }
    user.value = Utils.getStore("user");
  }
  const tripId = route.query.tripId;
  if (tripId != null && tripId !== "") {
    selectedTripId.value = Number(tripId);
  }
};

const loadTrips = () => {
  if (needsOrgSelection.value) {
    trips.value = [];
    selectedTripId.value = null;
    return Promise.resolve();
  }
  return TripServices.getAll().then((r) => {
    let list = r.data || [];
    if (effectiveOrgId.value && !user.value?.isAdmin) {
      list = list.filter((t) => Number(t.orgId) === Number(effectiveOrgId.value));
    }
    trips.value = list;
    if (selectedTripId.value && !list.some((t) => Number(t.id) === Number(selectedTripId.value))) {
      selectedTripId.value = null;
    }
    if (!selectedTripId.value && list.length) {
      selectedTripId.value = list[0].id;
    }
  });
};

const loadTrip = () => {
  if (!selectedTripId.value) {
    trip.value = null;
    return Promise.resolve();
  }
  return TripServices.get(selectedTripId.value).then((r) => {
    trip.value = r.data || null;
  });
};

const loadParticipants = () => {
  if (!selectedTripId.value) {
    participants.value = [];
    return Promise.resolve();
  }
  return TripPeopleRoleServices.getAll(selectedTripId.value).then((r) => {
    participants.value = r.data || [];
  });
};

const refresh = async () => {
  if (needsOrgSelection.value) {
    trip.value = null;
    participants.value = [];
    return;
  }
  loading.value = true;
  message.value = "";
  try {
    await Promise.all([loadTrip(), loadParticipants()]);
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load trip.";
  } finally {
    loading.value = false;
  }
};

const openDonations = (row) => {
  donationsParticipant.value = row;
  showDonations.value = true;
};

const openEdit = (row) => {
  editParticipant.value = row;
  showEditParticipant.value = true;
};

const onParticipantAdded = () => {
  message.value = "Participant added.";
  loadParticipants();
};

const onParticipantUpdated = () => {
  message.value = "Participant updated.";
  loadParticipants();
};

const onDonationsChanged = () => {
  loadParticipants();
};

const onTripUpdated = () => {
  message.value = "Trip updated.";
  refresh();
  loadTrips();
};

watch(selectedTripId, () => {
  refresh();
});

const onUserUpdated = () => {
  user.value = Utils.getStore("user");
  loadTrips().then(refresh);
};

watch(
  () => [route.query.tripId, route.query.orgId],
  () => {
    applyRouteContext();
    loadTrips().then(refresh);
  }
);

onMounted(() => {
  user.value = Utils.getStore("user");
  applyRouteContext();
  loadTrips().then(refresh);
  window.addEventListener("user-updated", onUserUpdated);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">{{ pageTitle }}</h1>
      <v-btn
        v-if="trip"
        color="primary"
        :disabled="needsOrgSelection"
        @click="showAddParticipant = true"
      >
        Add participant
      </v-btn>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization using the menu bar to view participants.
    </v-alert>
    <v-alert v-else-if="showOrgScopeNotice && orgLabel" type="info" variant="tonal" density="compact" class="mb-4">
      Showing participants for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-select
      v-if="!needsOrgSelection"
      v-model="selectedTripId"
      :items="tripItems"
      label="Trip"
      density="compact"
      class="mb-4"
      style="max-width: 400px"
    />

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-card v-if="trip" class="pa-4 mb-6">
      <div class="d-flex align-center justify-space-between mb-2">
        <v-card-title class="px-0 pt-0">{{ trip.name }}</v-card-title>
        <v-btn variant="tonal" size="small" @click="showEditTrip = true">Edit trip</v-btn>
      </div>
      <v-card-subtitle class="px-0">
        {{ trip.organization?.name || "Organization" }}
        <span v-if="trip.city || trip.country"> · {{ [trip.city, countryName(trip.country)].filter(Boolean).join(", ") }}</span>
      </v-card-subtitle>
      <v-card-text class="px-0">
        <v-row dense>
          <v-col cols="12" sm="6" md="4"><strong>Status:</strong> {{ trip.status }}</v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Dates:</strong> {{ formatDate(trip.startDate) }} – {{ formatDate(trip.endDate) }}
          </v-col>
          <v-col cols="12" sm="6" md="4"><strong>Location:</strong> {{ trip.location || "—" }}</v-col>
          <v-col cols="12" sm="6" md="4"><strong>Leaders:</strong> {{ formatLeaders }}</v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Participant cost:</strong> {{ formatParticipantCost(trip.participantCost) }}
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <strong>Donor page:</strong>
            <a v-if="donorLink" :href="donorLink" target="_blank">Open public donate page</a>
            <span v-else>—</span>
          </v-col>
        </v-row>
        <p v-if="trip.description" class="mt-3 mb-0">{{ trip.description }}</p>
      </v-card-text>
    </v-card>

    <v-data-table
      v-if="selectedTripId && !needsOrgSelection"
      :items="participants"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Role', key: 'role' },
        { title: 'Worker role', key: 'workerRole' },
        { title: 'Status', key: 'status' },
        { title: 'Participant cost', key: 'participantCost' },
        { title: 'Total donations', key: 'donationTotal' },
        { title: 'Why go', key: 'whygoText' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.name="{ item }">{{ participantName(item) }}</template>
      <template #item.role="{ item }">{{ item.role?.roleName || "—" }}</template>
      <template #item.workerRole="{ item }">
        {{ item.tripWorkerRole?.workerRole?.name || "—" }}
      </template>
      <template #item.status="{ item }">{{ tripParticipantStatusLabel(item.status) }}</template>
      <template #item.participantCost="{ item }">{{ rowParticipantCost(item) }}</template>
      <template #item.donationTotal="{ item }">{{ formatDonationTotal(item) }}</template>
      <template #item.whygoText="{ item }">{{ item.whygoText || "—" }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" @click="openDonations(item)">View donations</v-btn>
      </template>
    </v-data-table>

    <AddTripParticipantDialog
      v-if="selectedTripId"
      v-model="showAddParticipant"
      :trip-id="selectedTripId"
      @saved="onParticipantAdded"
    />
    <EditTripParticipantDialog
      v-model="showEditParticipant"
      :participant="editParticipant"
      @saved="onParticipantUpdated"
    />
    <ParticipantDonationsDialog
      v-if="selectedTripId"
      v-model="showDonations"
      :trip-id="selectedTripId"
      :participant="donationsParticipant"
      @changed="onDonationsChanged"
    />
    <EditTripDialog
      v-if="selectedTripId"
      v-model="showEditTrip"
      :trip-id="selectedTripId"
      @saved="onTripUpdated"
    />
  </v-container>
</template>
