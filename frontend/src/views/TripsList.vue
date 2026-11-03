<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import AddTripDialog from "../components/AddTripDialog.vue";
import CopyTripDialog from "../components/CopyTripDialog.vue";
import TripsTable from "../components/TripsTable.vue";
import Utils from "../config/utils.js";

const trips = ref([]);
const message = ref("");
const showAddDialog = ref(false);
const showCopyDialog = ref(false);
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

const onTripCopied = () => {
  message.value = "Trip copied.";
  load();
};

const onTripUpdated = () => {
  message.value = "Trip updated.";
  load();
};

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
      <div class="d-flex ga-2">
        <v-btn color="primary" variant="tonal" :disabled="needsOrgSelection" @click="showCopyDialog = true">
          Copy
        </v-btn>
        <v-btn color="primary" :disabled="needsOrgSelection" @click="showAddDialog = true">Add trip</v-btn>
      </div>
    </div>

    <v-alert v-if="showOrgScopeNotice && isAllOrgsView" type="info" variant="tonal" density="compact" class="mb-4">
      Showing trips from all organizations. Select an organization in the menu bar to add a trip or filter by one org.
    </v-alert>
    <v-alert v-else-if="showOrgScopeNotice && orgLabel" type="info" variant="tonal" density="compact" class="mb-4">
      Showing trips for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <TripsTable :trips="trips" @updated="onTripUpdated" @imported="load" />

    <AddTripDialog v-model="showAddDialog" @saved="onTripSaved" />
    <CopyTripDialog v-model="showCopyDialog" :trips="trips" @saved="onTripCopied" />
  </v-container>
</template>
