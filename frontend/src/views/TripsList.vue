<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import AddTripDialog from "../components/AddTripDialog.vue";
import EditTripDialog from "../components/EditTripDialog.vue";
import Utils from "../config/utils.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { donorTripPath } from "../utils/donateUrls.js";

const router = useRouter();
const trips = ref([]);
const message = ref("");
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editTripId = ref(null);
const user = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));
const isAllOrgsView = computed(() => isSystemAdmin.value && !effectiveOrgId.value);
const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));
const resolvedOrgName = ref(null);
const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return resolvedOrgName.value || Utils.orgDisplayName(user.value, orgId);
});
const needsOrgSelection = computed(() => isAllOrgsView.value);

const resolveOrgLabel = async () => {
  const orgId = effectiveOrgId.value;
  if (!orgId) {
    resolvedOrgName.value = null;
    return;
  }
  const cached = Utils.orgDisplayName(user.value, orgId);
  if (cached) {
    resolvedOrgName.value = cached;
    return;
  }
  try {
    const res = await OrganizationServices.get(orgId);
    resolvedOrgName.value = res.data?.name || null;
    if (res.data?.name) {
      const updated = {
        ...user.value,
        currentOrgId: Number(orgId),
        currentOrgName: res.data.name,
      };
      Utils.setStore("user", updated);
      user.value = updated;
    }
  } catch {
    resolvedOrgName.value = null;
  }
};

const load = () => {
  return TripServices.getAll().then((r) => {
    trips.value = r.data || [];
  });
};

const refresh = async () => {
  await resolveOrgLabel();
  await load();
};

const onTripSaved = () => {
  message.value = "Trip created.";
  load();
};

const onTripUpdated = () => {
  message.value = "Trip updated.";
  load();
};

const openEdit = (trip) => {
  editTripId.value = trip.id;
  showEditDialog.value = true;
};

const openView = (trip) => {
  router.push({ name: "tripView", params: { tripId: trip.id } });
};

const donorLink = (trip) => donorTripPath(trip);

const formatLeaders = (trip) => (trip.leaderNames || []).join(", ") || "—";

const formatMoney = (value) =>
  value != null && value !== "" ? formatMoneyDisplay(value) : "—";

const onUserUpdated = async () => {
  user.value = Utils.getStore("user");
  await refresh();
};

watch(effectiveOrgId, () => resolveOrgLabel());

onMounted(() => {
  user.value = Utils.getStore("user");
  refresh();
  window.addEventListener("user-updated", onUserUpdated);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Trips</h1>
      <v-btn color="primary" :disabled="needsOrgSelection" @click="showAddDialog = true">Add trip</v-btn>
    </div>

    <v-alert v-if="showOrgScopeNotice && isAllOrgsView" type="info" variant="tonal" density="compact" class="mb-4">
      Showing trips from all organizations. Select an organization in the menu bar to add a trip or filter by one org.
    </v-alert>
    <v-alert v-else-if="showOrgScopeNotice && orgLabel" type="info" variant="tonal" density="compact" class="mb-4">
      Showing trips for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      :items="trips"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Leaders', key: 'leaders' },
        { title: 'Active members', key: 'activeParticipantCount' },
        { title: 'Total cost', key: 'totalParticipantCost' },
        { title: 'Total donations', key: 'donationTotal' },
        { title: 'Status', key: 'status' },
        { title: 'Dates', key: 'dates' },
        { title: 'Donor link', key: 'link' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.leaders="{ item }">{{ formatLeaders(item) }}</template>
      <template #item.activeParticipantCount="{ item }">{{ item.activeParticipantCount ?? 0 }}</template>
      <template #item.totalParticipantCost="{ item }">{{ formatMoney(item.totalParticipantCost) }}</template>
      <template #item.donationTotal="{ item }">{{ formatMoney(item.donationTotal) }}</template>
      <template #item.dates="{ item }">{{ item.startDate }} – {{ item.endDate }}</template>
      <template #item.link="{ item }">
        <a :href="donorLink(item)" target="_blank">Donate</a>
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openView(item)">View</v-btn>
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
      </template>
    </v-data-table>

    <AddTripDialog v-model="showAddDialog" @saved="onTripSaved" />
    <EditTripDialog v-model="showEditDialog" :trip-id="editTripId" @saved="onTripUpdated" />
  </v-container>
</template>
