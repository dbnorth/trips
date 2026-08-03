<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import DonationServices from "../services/donationServices.js";
import AddTripParticipantDialog from "../components/AddTripParticipantDialog.vue";
import EditTripParticipantDialog from "../components/EditTripParticipantDialog.vue";
import ParticipantDonationsDialog from "../components/ParticipantDonationsDialog.vue";
import EditTripDialog from "../components/EditTripDialog.vue";
import ViewPersonProfileDialog from "../components/ViewPersonProfileDialog.vue";
import ViewTripApplicationDialog from "../components/ViewTripApplicationDialog.vue";
import TripWorkerRolesCard from "../components/TripWorkerRolesCard.vue";
import ExportServices from "../services/exportServices.js";
import TripTravelOptionServices from "../services/tripTravelOptionServices.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { countryName } from "../utils/locationData.js";
import { donorTripPath, donorParticipantPath } from "../utils/donateUrls.js";
import PersonServices from "../services/personServices.js";

const route = useRoute();
const router = useRouter();

const tripId = computed(() => route.params.tripId);
const trip = ref(null);
const participants = ref([]);
const donations = ref([]);
const loading = ref(false);
const message = ref("");
const showAddParticipant = ref(false);
const showEditParticipant = ref(false);
const editParticipant = ref(null);
const showEditTrip = ref(false);
const showViewProfile = ref(false);
const viewPersonId = ref(null);
const showViewApplication = ref(false);
const viewApplicationId = ref(null);
const viewApplicationMode = ref("view");
const showDonations = ref(false);
const donationsParticipant = ref(null);
const teamRolesRefreshKey = ref(0);
const travelOptions = ref([]);

const bumpTeamRoles = () => {
  teamRolesRefreshKey.value += 1;
};

const donorLink = computed(() => (trip.value ? donorTripPath(trip.value) : null));

const participantDonorLink = (row) =>
  trip.value && row?.person ? donorParticipantPath(trip.value, row.person) : null;

const formatLeaders = computed(() => (trip.value?.leaderNames || []).join(", ") || "—");

const participantCount = computed(() => participants.value.length);

const sumDonations = (rows) =>
  rows.reduce((total, row) => total + Number(row.amount || 0), 0);

const totalDonations = computed(() => sumDonations(donations.value));

const unassignedDonations = computed(() =>
  sumDonations(donations.value.filter((row) => row.personId == null))
);

const formatDate = (value) => value || "—";

const participantName = (row) => {
  const p = row.person;
  return p ? `${p.firstName || ""} ${p.lastName || ""}`.trim() : "—";
};

const participantItems = computed(() =>
  (participants.value || []).map((row) => ({
    ...row,
    name: participantName(row),
    roleName: row.role?.roleName || "",
    workerRoleName: row.tripWorkerRole?.workerRole?.name || "",
  }))
);

const participantPictureUrl = (row) => PersonServices.getPictureUrl(row?.person?.picture);

const loadTrip = () =>
  TripServices.get(tripId.value).then((r) => {
    trip.value = r.data || null;
  });

const loadParticipants = () =>
  TripPeopleRoleServices.getAll(tripId.value).then((r) => {
    participants.value = r.data || [];
  });

const loadDonations = () =>
  DonationServices.getAll(tripId.value).then((r) => {
    donations.value = r.data || [];
  });

const loadTravelOptions = () =>
  TripTravelOptionServices.getAll(tripId.value).then((r) => {
    travelOptions.value = r.data || [];
  });

const travelOptionGroups = computed(() => {
  const groups = new Map();
  for (const option of travelOptions.value || []) {
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    if (!groups.has(setNumber)) groups.set(setNumber, []);
    groups.get(setNumber).push(option);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([setNumber, options]) => ({
      setNumber,
      options: [...options].sort((a, b) => Number(a.id) - Number(b.id)),
    }));
});

const formatAdjustment = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) {
    return formatMoneyDisplay(0, { allowNegative: true }) || "$0.00";
  }
  const formatted = formatMoneyDisplay(Math.abs(amount), { allowNegative: true }) || "$0.00";
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
};

const refresh = async () => {
  loading.value = true;
  message.value = "";
  try {
    await Promise.all([loadTrip(), loadParticipants(), loadDonations(), loadTravelOptions()]);
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

const openViewProfile = (row) => {
  const id = row?.person?.id;
  if (!id) return;
  viewPersonId.value = id;
  showViewProfile.value = true;
};

const applicationAction = (row) => {
  const status = String(row?.status || "").toLowerCase();
  if (status === "approved") return { label: "View App", mode: "view" };
  if (status === "applied") return { label: "Approve App", mode: "approve" };
  return { label: "Preview App", mode: "preview" };
};

const openApplication = (row) => {
  if (!row?.id) return;
  const action = applicationAction(row);
  viewApplicationId.value = row.id;
  viewApplicationMode.value = action.mode;
  showViewApplication.value = true;
};

const onApplicationSaved = (payload) => {
  message.value = payload?.message || "Application updated.";
  loadParticipants();
};

const onParticipantAdded = () => {
  message.value = "Participant added.";
  loadParticipants();
  bumpTeamRoles();
};

const onParticipantUpdated = () => {
  message.value = "Participant updated.";
  loadParticipants();
  bumpTeamRoles();
};

const formatDonationTotal = (row) => formatMoneyDisplay(row.donationTotal ?? 0) || "$0.00";

const formatParticipantCost = (value) =>
  value != null ? formatMoneyDisplay(value) : "—";

const rowParticipantCost = (row) =>
  formatParticipantCost(row.participantCost ?? trip.value?.participantCost);

const onDonationsChanged = () => {
  loadParticipants();
  loadDonations();
};

const onTeamRolesChanged = () => {
  loadParticipants();
};

const onTripUpdated = () => {
  message.value = "Trip updated.";
  refresh();
};

const exportingCsv = ref(false);

const downloadParticipantsCsv = async () => {
  if (!tripId.value) return;
  exportingCsv.value = true;
  message.value = "";
  try {
    await ExportServices.participantsCsv(tripId.value);
  } catch (e) {
    message.value = e.message || "Unable to download participants CSV.";
  } finally {
    exportingCsv.value = false;
  }
};

onMounted(refresh);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center ga-2">
        <v-btn variant="text" @click="router.push({ name: 'trips' })">Back to trips</v-btn>
        <h1 class="text-h5">{{ trip?.name || "Trip" }}</h1>
      </div>
      <v-btn v-if="trip" variant="tonal" @click="showEditTrip = true">Edit trip</v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="trip" class="pa-4 mb-6">
      <v-card-title class="px-0 pt-0">{{ trip.name }}</v-card-title>
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
            <a :href="donorLink" target="_blank">Open public donate page</a>
          </v-col>
        </v-row>
        <p v-if="trip.description" class="mt-3 mb-0">{{ trip.description }}</p>
      </v-card-text>
    </v-card>

    <v-card v-if="trip" variant="tonal" class="mb-6 pa-4">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Participants</div>
          <div class="text-body-1">{{ participantCount }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Cost per participant</div>
          <div class="text-body-1">{{ formatParticipantCost(trip.participantCost) }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Total donations</div>
          <div class="text-body-1">{{ formatMoneyDisplay(totalDonations) || "$0.00" }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Donations without participant</div>
          <div class="text-body-1">{{ formatMoneyDisplay(unassignedDonations) || "$0.00" }}</div>
        </v-col>
      </v-row>
    </v-card>

    <TripWorkerRolesCard
      v-if="trip"
      :trip-id="tripId"
      :org-id="trip.orgId"
      :refresh-key="teamRolesRefreshKey"
      @changed="onTeamRolesChanged"
    />

    <v-card v-if="trip" class="mb-6 pa-4">
      <h2 class="text-h6 mb-3">Trip options</h2>
      <v-alert
        v-if="!travelOptionGroups.length"
        type="info"
        density="compact"
        class="mb-0"
      >
        No trip options configured for this trip.
      </v-alert>
      <div v-else>
        <div
          v-for="group in travelOptionGroups"
          :key="group.setNumber"
          class="mb-4"
        >
          <div class="text-subtitle-2 font-weight-bold mb-2">
            Trip Option {{ group.setNumber }}
          </div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right" style="width: 160px">Price adjustment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="option in group.options" :key="option.id">
                <td>{{ option.description }}</td>
                <td class="text-right">{{ formatAdjustment(option.priceAdjustment) }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </div>
    </v-card>

    <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
      <h2 class="text-h6 mb-0">Participants</h2>
      <div class="d-flex align-center ga-2">
        <v-btn
          variant="tonal"
          size="small"
          :disabled="!trip || !participants.length"
          :loading="exportingCsv"
          @click="downloadParticipantsCsv"
        >
          Download CSV
        </v-btn>
        <v-btn color="primary" size="small" :disabled="!trip" @click="showAddParticipant = true">
          Add participant
        </v-btn>
      </div>
    </div>

    <v-data-table
      :items="participantItems"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Role', key: 'roleName' },
        { title: 'Worker role', key: 'workerRoleName' },
        { title: 'Status', key: 'status' },
        { title: 'Participant cost', key: 'participantCost' },
        { title: 'Total donations', key: 'donationTotal' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.name="{ item }">
        <button
          type="button"
          class="profile-link d-flex align-center ga-3 py-1 text-start"
          :disabled="!item.person?.id"
          @click="openViewProfile(item)"
        >
          <v-avatar size="36" rounded="lg" class="participant-thumb flex-shrink-0">
            <v-img
              v-if="participantPictureUrl(item)"
              :src="participantPictureUrl(item)"
              :alt="item.name"
              cover
            />
          </v-avatar>
          <span class="profile-link-text">{{ item.name }}</span>
        </button>
      </template>
      <template #item.roleName="{ item }">{{ item.roleName || "—" }}</template>
      <template #item.workerRoleName="{ item }">{{ item.workerRoleName || "—" }}</template>
      <template #item.participantCost="{ item }">{{ rowParticipantCost(item) }}</template>
      <template #item.donationTotal="{ item }">{{ formatDonationTotal(item) }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openApplication(item)">
          {{ applicationAction(item).label }}
        </v-btn>
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" @click="openDonations(item)">View donations</v-btn>
        <v-btn
          v-if="participantDonorLink(item)"
          size="small"
          variant="text"
          :href="participantDonorLink(item)"
          target="_blank"
          rel="noopener"
        >
          Donate page
        </v-btn>
      </template>
    </v-data-table>

    <AddTripParticipantDialog
      v-model="showAddParticipant"
      :trip-id="tripId"
      @saved="onParticipantAdded"
    />
    <EditTripParticipantDialog
      v-model="showEditParticipant"
      :participant="editParticipant"
      @saved="onParticipantUpdated"
    />
    <ParticipantDonationsDialog
      v-model="showDonations"
      :trip-id="tripId"
      :participant="donationsParticipant"
      @changed="onDonationsChanged"
    />
    <EditTripDialog v-model="showEditTrip" :trip-id="tripId" @saved="onTripUpdated" />
    <ViewPersonProfileDialog v-model="showViewProfile" :person-id="viewPersonId" />
    <ViewTripApplicationDialog
      v-model="showViewApplication"
      :participant-id="viewApplicationId"
      :mode="viewApplicationMode"
      @saved="onApplicationSaved"
    />
  </v-container>
</template>

<style scoped>
.participant-thumb {
  background: rgba(0, 0, 0, 0.06);
}

.profile-link {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: inherit;
  width: 100%;
}

.profile-link:disabled {
  cursor: default;
}

.profile-link:not(:disabled):hover .profile-link-text {
  text-decoration: underline;
}

.profile-link-text {
  color: rgb(var(--v-theme-primary));
}
</style>
