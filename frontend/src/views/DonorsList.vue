<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import DonorServices from "../services/donorServices.js";
import DonorFormDialog from "../components/DonorFormDialog.vue";
import DonorEmailDialog from "../components/DonorEmailDialog.vue";
import DonorImportDialog from "../components/DonorImportDialog.vue";
import RowAction from "../components/RowAction.vue";
import Utils from "../config/utils.js";
import { donorStatusLabel, donorTypeLabel } from "../utils/donorStatus.js";
import { formatDonorName } from "../utils/donorUtils.js";

const donors = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const showEmail = ref(false);
const showImport = ref(false);
const editing = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));
const isOrgAdmin = computed(() => {
  if (isSystemAdmin.value) return true;
  const orgId = effectiveOrgId.value;
  if (!orgId) return (user.value?.orgRoles || []).some((r) => r.roleName === "Org Admin");
  return Utils.isOrgAdmin(user.value, orgId);
});
const canManage = computed(() => isOrgAdmin.value && !!effectiveOrgId.value);
const needsOrgSelection = computed(() => isSystemAdmin.value && !effectiveOrgId.value);

const load = () => {
  user.value = Utils.getStore("user");
  message.value = "";
  if (!canManage.value) {
    donors.value = [];
    return;
  }
  loading.value = true;
  DonorServices.getAll()
    .then((r) => {
      donors.value = r.data || [];
    })
    .catch((e) => {
      donors.value = [];
      message.value = e.response?.data?.message || "Unable to load donors.";
    })
    .finally(() => {
      loading.value = false;
    });
};

const openAdd = () => {
  editing.value = null;
  showForm.value = true;
};

const openEdit = (donor) => {
  editing.value = donor;
  showForm.value = true;
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  load();
});

onMounted(() => {
  load();
  window.addEventListener("user-updated", load);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", load);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Donors</h1>
      <div v-if="canManage" class="d-flex ga-2">
        <v-btn variant="tonal" @click="showEmail = true">Email</v-btn>
        <v-btn variant="tonal" @click="showImport = true">Import</v-btn>
        <v-btn color="primary" @click="openAdd">Add donor</v-btn>
      </div>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization in the menu bar.
    </v-alert>
    <v-alert v-else-if="!isOrgAdmin" type="warning" density="compact" class="mb-4">
      Only organization admins can manage donors.
    </v-alert>
    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="canManage"
      :items="donors"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name', sortable: false },
        { title: 'Family name', key: 'familyName' },
        { title: 'Type', key: 'donorType' },
        { title: 'Email', key: 'email' },
        { title: 'City', key: 'city' },
        { title: 'Status', key: 'status' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.name="{ item }">{{ formatDonorName(item) }}</template>
      <template #item.donorType="{ item }">{{ donorTypeLabel(item.donorType) }}</template>
      <template #item.status="{ item }">{{ donorStatusLabel(item.status) }}</template>
      <template #item.actions="{ item }">
        <RowAction icon="mdi-pencil" label="Edit" @click="openEdit(item)" />
      </template>
    </v-data-table>

    <DonorFormDialog v-model="showForm" :donor="editing" @saved="load" />
    <DonorEmailDialog v-model="showEmail" />
    <DonorImportDialog v-model="showImport" @imported="load" />
  </v-container>
</template>
