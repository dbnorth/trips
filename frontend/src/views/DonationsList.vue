<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import DonationServices from "../services/donationServices.js";
import ExportServices from "../services/exportServices.js";
import DonationFormDialog from "../components/DonationFormDialog.vue";
import Utils from "../config/utils.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { formatDonorName } from "../utils/donorUtils.js";

const user = ref(null);
const trips = ref([]);
const donations = ref([]);
const participantCount = ref(0);
const selectedTripId = ref(null);
const message = ref("");
const showDonationForm = ref(false);
const editingDonation = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const tripItems = computed(() => trips.value.map((t) => ({ title: t.name, value: t.id })));

const selectedTrip = computed(() =>
  trips.value.find((t) => Number(t.id) === Number(selectedTripId.value))
);

const sumDonations = (rows) =>
  rows.reduce((total, row) => total + Number(row.amount || 0), 0);

const totalDonations = computed(() => sumDonations(donations.value));

const unassignedDonations = computed(() =>
  sumDonations(donations.value.filter((row) => row.personId == null))
);

const formatCost = (value) =>
  value != null && value !== "" ? formatMoneyDisplay(value) : "—";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatAmount = (value) => formatMoneyDisplay(value) || "—";

const donorName = (item) => formatDonorName(item.donor);

const participantName = (item) => {
  if (!item.participant) return "—";
  return `${item.participant.firstName || ""} ${item.participant.lastName || ""}`.trim() || "—";
};

const syncSelectedTrip = () => {
  if (!trips.value.length) {
    selectedTripId.value = null;
    return;
  }
  if (!trips.value.some((t) => Number(t.id) === Number(selectedTripId.value))) {
    selectedTripId.value = trips.value[0].id;
  }
};

const loadTrips = () => {
  user.value = Utils.getStore("user");
  return TripServices.getAll().then((r) => {
    let list = r.data || [];
    if (effectiveOrgId.value && !isSystemAdmin.value) {
      list = list.filter((t) => Number(t.orgId) === Number(effectiveOrgId.value));
    }
    trips.value = list;
    syncSelectedTrip();
  });
};

const loadDonations = () => {
  if (!selectedTripId.value) {
    donations.value = [];
    participantCount.value = 0;
    return Promise.resolve();
  }
  return Promise.all([
    DonationServices.getAll(selectedTripId.value).then((r) => {
      donations.value = r.data || [];
    }),
    TripPeopleRoleServices.getAll(selectedTripId.value).then((r) => {
      participantCount.value = (r.data || []).length;
    }),
  ]);
};

watch(selectedTripId, () => {
  loadDonations();
});

const openAddDonation = () => {
  editingDonation.value = null;
  showDonationForm.value = true;
};

const openEditDonation = (row) => {
  editingDonation.value = row;
  showDonationForm.value = true;
};

const onDonationSaved = ({ tripId } = {}) => {
  if (tripId) selectedTripId.value = tripId;
  message.value = "Donation saved.";
  loadDonations();
};

const onUserUpdated = () => {
  loadTrips().then(() => loadDonations());
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  loadTrips().then(() => loadDonations());
});

onMounted(async () => {
  user.value = Utils.getStore("user");
  await loadTrips();
  loadDonations();
  window.addEventListener("user-updated", onUserUpdated);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Donations</h1>
      <v-btn color="primary" @click="openAddDonation">Add donation</v-btn>
    </div>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-select
      v-model="selectedTripId"
      :items="tripItems"
      label="Trip"
      density="compact"
      class="mb-4"
      style="max-width: 400px"
    />

    <v-card v-if="selectedTripId" variant="tonal" class="mb-4 pa-4">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Participants</div>
          <div class="text-body-1">{{ participantCount }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Cost per participant</div>
          <div class="text-body-1">{{ formatCost(selectedTrip?.participantCost) }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Total donations</div>
          <div class="text-body-1">{{ formatAmount(totalDonations) }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Donations without participant</div>
          <div class="text-body-1">{{ formatAmount(unassignedDonations) }}</div>
        </v-col>
      </v-row>
    </v-card>

    <div class="mb-2">
      <v-btn size="small" class="mr-2" :disabled="!selectedTripId" @click="ExportServices.donationsCsv(selectedTripId)">
        Export CSV
      </v-btn>
    </div>

    <v-data-table
      :items="donations"
      :headers="[
        { title: 'Date', key: 'dateTime' },
        { title: 'Donor', key: 'donor' },
        { title: 'Amount', key: 'amount' },
        { title: 'Participant', key: 'participant' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.dateTime="{ item }">{{ formatDate(item.dateTime) }}</template>
      <template #item.donor="{ item }">{{ donorName(item) }}</template>
      <template #item.amount="{ item }">{{ formatAmount(item.amount) }}</template>
      <template #item.participant="{ item }">{{ participantName(item) }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEditDonation(item)">Edit</v-btn>
      </template>
    </v-data-table>

    <DonationFormDialog
      v-model="showDonationForm"
      :trip-id="selectedTripId"
      :trips="trips"
      allow-trip-select
      :donation="editingDonation"
      @saved="onDonationSaved"
    />
  </v-container>
</template>
