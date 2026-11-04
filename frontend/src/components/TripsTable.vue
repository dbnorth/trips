<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import EditTripDialog from "./EditTripDialog.vue";
import ImportTripMasterDialog from "./ImportTripMasterDialog.vue";
import RowAction from "./RowAction.vue";
import Utils from "../config/utils.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { formatDateRange } from "../utils/dateFormat.js";
import { prepItems, prepComplete } from "../utils/tripPrep.js";

defineProps({
  trips: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["updated", "imported"]);

const router = useRouter();
const showEditDialog = ref(false);
const editTripId = ref(null);
const showImportDialog = ref(false);
const importTrip = ref(null);

const headers = [
  { title: "Name", key: "name" },
  { title: "Leaders", key: "leaders" },
  { title: "Members", key: "memberCount" },
  { title: "Total Roles", key: "totalRoles" },
  { title: "Total cost", key: "totalParticipantCost" },
  { title: "Total donations", key: "donationTotal" },
  { title: "Status", key: "status" },
  { title: "Dates", key: "dates" },
  { title: "Actions", key: "actions", sortable: false },
];

const openEdit = (trip) => {
  editTripId.value = trip.id;
  showEditDialog.value = true;
};

const openView = (trip) => {
  router.push({ name: "tripView", params: { tripId: trip.id } });
};

const openRooming = (trip) => {
  router.push({ name: "tripRooming", params: { tripId: trip.id } });
};

const openFlights = (trip) => {
  router.push({ name: "tripFlights", params: { tripId: trip.id } });
};

const canImport = (trip) => {
  const user = Utils.getStore("user");
  return Utils.isOrgAdmin(user, trip.orgId) || Utils.isTripLeader(user, trip.id);
};

const openImport = (trip) => {
  importTrip.value = trip;
  showImportDialog.value = true;
};

const formatLeaders = (trip) => (trip.leaderNames || []).join(", ") || "—";

const formatMoney = (value) =>
  value != null && value !== "" ? formatMoneyDisplay(value) : "—";
</script>

<template>
  <v-data-table :items="trips" :loading="loading" :headers="headers" density="compact">
    <template #item.leaders="{ item }">{{ formatLeaders(item) }}</template>
    <template #item.memberCount="{ item }">
      <span class="d-inline-flex align-center ga-1">
        <span>{{ item.memberCount ?? 0 }}</span>
        <v-tooltip location="top">
          <template #activator="{ props: activator }">
            <v-icon
              v-bind="activator"
              icon="mdi-information-outline"
              size="small"
              tabindex="0"
              aria-label="Member details"
              data-testid="member-count-info"
            />
          </template>
          <div data-testid="member-count-breakdown">
            <div>Pre-approved: {{ item.preApprovedMemberCount ?? 0 }}</div>
            <div>Approved: {{ item.activeParticipantCount ?? 0 }}</div>
          </div>
        </v-tooltip>
      </span>
    </template>
    <template #item.totalRoles="{ item }">
      <span class="d-inline-flex align-center ga-1">
        <span>{{ item.totalRoles ?? 0 }}</span>
        <v-tooltip v-if="item.unfilledRoles?.length" location="top">
          <template #activator="{ props: activator }">
            <v-icon
              v-bind="activator"
              icon="mdi-information-outline"
              size="small"
              color="error"
              tabindex="0"
              aria-label="Unfilled roles"
              data-testid="unfilled-roles-info"
            />
          </template>
          <div data-testid="unfilled-roles-list">
            <div v-for="role in item.unfilledRoles" :key="role.name">{{ role.name }}: {{ role.needed }} needed</div>
          </div>
        </v-tooltip>
      </span>
    </template>
    <template #item.status="{ item }">
      <span class="d-inline-flex align-center ga-1">
        <span>{{ item.status }}</span>
        <v-tooltip location="top">
          <template #activator="{ props: activator }">
            <v-icon
              v-bind="activator"
              icon="mdi-information-outline"
              size="small"
              :color="prepComplete(item.prepStatus) ? 'success' : 'error'"
              tabindex="0"
              aria-label="Trip prep status"
              data-testid="trip-prep-info"
            />
          </template>
          <div data-testid="trip-prep-list">
            <div v-for="prep in prepItems" :key="prep.key" class="d-flex align-center ga-1">
              <v-icon
                :icon="item.prepStatus?.[prep.key] ? 'mdi-check-circle' : 'mdi-close-circle'"
                :color="item.prepStatus?.[prep.key] ? 'success' : 'error'"
                size="small"
              />
              <span>{{ prep.label }}</span>
            </div>
          </div>
        </v-tooltip>
      </span>
    </template>
    <template #item.totalParticipantCost="{ item }">{{ formatMoney(item.totalParticipantCost) }}</template>
    <template #item.donationTotal="{ item }">{{ formatMoney(item.donationTotal) }}</template>
    <template #item.dates="{ item }">{{ formatDateRange(item.startDate, item.endDate) }}</template>
    <template #item.actions="{ item }">
      <div class="d-flex flex-nowrap ga-1">
        <RowAction icon="mdi-eye" label="View" @click="openView(item)" />
        <RowAction icon="mdi-bed" label="Room list" @click="openRooming(item)" />
        <RowAction icon="mdi-airplane" label="Flights" @click="openFlights(item)" />
        <RowAction v-if="canImport(item)" icon="mdi-file-import" label="Import" @click="openImport(item)" />
        <RowAction icon="mdi-pencil" label="Edit" @click="openEdit(item)" />
      </div>
    </template>
  </v-data-table>

  <EditTripDialog v-model="showEditDialog" :trip-id="editTripId" @saved="emit('updated')" />
  <ImportTripMasterDialog v-model="showImportDialog" :trip="importTrip" @imported="emit('imported')" />
</template>
