<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import WorkerRoleServices from "../services/workerRoleServices.js";
import WorkerRoleFormDialog from "../components/WorkerRoleFormDialog.vue";
import Utils from "../config/utils.js";

const roles = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editingRoleId = ref(null);

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
const canManage = computed(() => isOrgAdmin.value && !!effectiveOrgId.value);
const needsOrgSelection = computed(() => isSystemAdmin.value && !effectiveOrgId.value);
const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return Utils.orgDisplayName(user.value, orgId);
});
const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));

const load = () => {
  user.value = Utils.getStore("user");
  if (!canManage.value) {
    roles.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  message.value = "";
  return WorkerRoleServices.getAll()
    .then((r) => {
      roles.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load worker roles.";
      roles.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const openAdd = () => {
  editingRoleId.value = null;
  showForm.value = true;
};

const openEdit = (row) => {
  editingRoleId.value = row.id;
  showForm.value = true;
};

const onSaved = () => {
  message.value = "Worker role saved.";
  load();
};

const onUserUpdated = () => {
  load();
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
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
      <h1 class="text-h5">Worker roles</h1>
      <v-btn v-if="canManage" color="primary" @click="openAdd">Add role</v-btn>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization using the menu bar to manage worker roles.
    </v-alert>
    <v-alert
      v-else-if="!isOrgAdmin"
      type="warning"
      density="compact"
      class="mb-4"
    >
      Only organization admins can manage worker roles.
    </v-alert>
    <v-alert
      v-else-if="showOrgScopeNotice && orgLabel"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Showing worker roles for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="canManage"
      :items="roles"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Description', key: 'description' },
        { title: 'License required', key: 'licenseRequired' },
        { title: 'Document type', key: 'documentType' },
        { title: 'Status', key: 'status' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.description="{ item }">{{ item.description || "—" }}</template>
      <template #item.licenseRequired="{ item }">{{ item.licenseRequired ? "Yes" : "No" }}</template>
      <template #item.documentType="{ item }">{{ item.documentType?.description || "—" }}</template>
      <template #item.status="{ item }">{{ item.status === "active" ? "Active" : "Inactive" }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
      </template>
    </v-data-table>

    <WorkerRoleFormDialog
      v-model="showForm"
      :role-id="editingRoleId"
      :org-id="effectiveOrgId"
      @saved="onSaved"
    />
  </v-container>
</template>
