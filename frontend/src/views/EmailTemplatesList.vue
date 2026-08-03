<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import EmailTemplateServices from "../services/emailTemplateServices.js";
import EmailTemplateFormDialog from "../components/EmailTemplateFormDialog.vue";
import Utils from "../config/utils.js";

const templates = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editingTemplateId = ref(null);
const selectedTripId = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));
const isOrgAdmin = computed(() => {
  if (isSystemAdmin.value) return true;
  const orgId = effectiveOrgId.value;
  if (!orgId) {
    return (user.value?.orgRoles || []).some((r) => r.roleName === "Org Admin");
  }
  return Utils.isOrgAdmin(user.value, orgId);
});
const isTripLeader = computed(() =>
  (user.value?.tripRoles || []).some((r) => r.roleName === "Trip Leader")
);
const isTripLeaderOnly = computed(() => isTripLeader.value && !isOrgAdmin.value && !isSystemAdmin.value);
const isGlobalView = computed(() => isSystemAdmin.value && !effectiveOrgId.value);
const canManageTemplates = computed(
  () => isGlobalView.value || !!effectiveOrgId.value || isTripLeader.value
);
const canAddTemplates = computed(() => {
  if (isGlobalView.value) return true;
  if (isOrgAdmin.value && effectiveOrgId.value) return true;
  if (isTripLeaderOnly.value && effectiveOrgId.value && selectedTripId.value) return true;
  return false;
});
const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return Utils.orgDisplayName(user.value, orgId);
});
const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));
const needsOrgSelection = computed(() => isSystemAdmin.value && !effectiveOrgId.value && !isTripLeader.value);

const tripOptions = computed(() =>
  (user.value?.tripRoles || [])
    .filter((r) => r.roleName === "Trip Leader")
    .filter((r) => !effectiveOrgId.value || Number(r.orgId) === Number(effectiveOrgId.value))
    .map((r) => ({ title: r.tripName, value: Number(r.tripId) }))
);

const scopeLabel = (item) => {
  if (item.orgId == null) return "Global (master)";
  return item.organization?.name || "Organization";
};

const tripLabel = (item) => {
  if (item.orgId == null) return "—";
  return item.trip?.name || "All trips";
};

const selectedTripName = computed(
  () => tripOptions.value.find((t) => Number(t.value) === Number(selectedTripId.value))?.title || null
);

const syncSelectedTrip = () => {
  if (!isTripLeaderOnly.value) return;
  const options = tripOptions.value;
  if (!options.length) {
    selectedTripId.value = null;
    return;
  }
  if (!options.some((o) => Number(o.value) === Number(selectedTripId.value))) {
    selectedTripId.value = options[0].value;
  }
};

const load = (tripIdOverride) => {
  user.value = Utils.getStore("user");

  if (tripIdOverride !== undefined && tripIdOverride !== null) {
    selectedTripId.value = Number(tripIdOverride);
  } else {
    syncSelectedTrip();
  }

  if (!canManageTemplates.value) {
    templates.value = [];
    return Promise.resolve();
  }

  const activeTripId = selectedTripId.value;
  if (isTripLeaderOnly.value && !activeTripId) {
    templates.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  message.value = "";
  const params = {};
  if (isTripLeaderOnly.value && activeTripId) {
    params.tripId = activeTripId;
  }

  return EmailTemplateServices.getAll(params)
    .then((r) => {
      let rows = r.data || [];
      if (isTripLeaderOnly.value && activeTripId) {
        rows = rows.filter((row) => Number(row.tripId) === Number(activeTripId));
      }
      templates.value = rows;
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load templates.";
      templates.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const editingOrgId = ref(null);

const openAdd = () => {
  editingTemplateId.value = null;
  editingOrgId.value = effectiveOrgId.value ?? null;
  showForm.value = true;
};

const openEdit = (row) => {
  editingTemplateId.value = row.id;
  editingOrgId.value = row.orgId;
  showForm.value = true;
};

const onTripChange = (tripId) => {
  load(tripId);
};

const onSaved = () => {
  message.value = "Template saved.";
  load();
};

const onUserUpdated = () => {
  load();
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  syncSelectedTrip();
  load();
});

onMounted(() => {
  load();
  window.addEventListener("user-updated", onUserUpdated);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Email templates</h1>
      <v-btn v-if="canAddTemplates" color="primary" :disabled="needsOrgSelection" @click="openAdd">
        Add template
      </v-btn>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization using the menu bar to manage templates.
    </v-alert>
    <v-alert v-else-if="isGlobalView" type="info" variant="tonal" density="compact" class="mb-4">
      Showing global master templates (no organization). Use these as starting points to copy into organizations.
    </v-alert>
    <v-alert v-else-if="showOrgScopeNotice && isTripLeaderOnly && orgLabel" type="info" variant="tonal" density="compact" class="mb-4">
      Showing email templates for trips you lead in {{ orgLabel }}.
    </v-alert>
    <v-alert v-else-if="showOrgScopeNotice && orgLabel" type="info" variant="tonal" density="compact" class="mb-4">
      Showing templates for {{ orgLabel }}.
    </v-alert>

    <v-select
      v-if="isTripLeaderOnly && tripOptions.length"
      v-model="selectedTripId"
      :items="tripOptions"
      label="Trip"
      density="compact"
      class="mb-4"
      style="max-width: 400px"
      hide-details
      @update:model-value="onTripChange"
    />

    <v-alert
      v-if="isTripLeaderOnly && !tripOptions.length && !needsOrgSelection"
      type="info"
      density="compact"
      class="mb-4"
    >
      No trips you lead in the selected organization.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="canManageTemplates && !needsOrgSelection && (!isTripLeaderOnly || selectedTripId)"
      :items="templates"
      :loading="loading"
      :headers="[
        { title: 'Function code', key: 'functionCode' },
        { title: 'Subject', key: 'subject' },
        ...(isTripLeaderOnly ? [] : [{ title: 'Scope', key: 'scope' }]),
        ...(isTripLeaderOnly ? [] : [{ title: 'Trip', key: 'trip' }]),
        { title: 'From email', key: 'fromEmail' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.functionCode="{ item }">{{ item.functionCode || "—" }}</template>
      <template #item.subject="{ item }">{{ item.subject || "—" }}</template>
      <template #item.scope="{ item }">{{ scopeLabel(item) }}</template>
      <template #item.trip="{ item }">{{ tripLabel(item) }}</template>
      <template #item.fromEmail="{ item }">{{ item.fromEmail || "—" }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
      </template>
    </v-data-table>

    <EmailTemplateFormDialog
      v-model="showForm"
      :template-id="editingTemplateId"
      :org-id="editingOrgId ?? effectiveOrgId"
      :allow-global="isGlobalView"
      :fixed-trip-id="isTripLeaderOnly ? selectedTripId : null"
      :fixed-trip-name="isTripLeaderOnly ? selectedTripName : null"
      @saved="onSaved"
    />
  </v-container>
</template>
