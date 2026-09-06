<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import MedicalConditionServices from "../services/medicalConditionServices.js";
import MedicalConditionFormDialog from "../components/MedicalConditionFormDialog.vue";
import Utils from "../config/utils.js";

const conditions = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editingConditionId = ref(null);

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
    conditions.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  message.value = "";
  return MedicalConditionServices.getAll({ orgId: effectiveOrgId.value })
    .then((r) => {
      conditions.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load medical conditions.";
      conditions.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const openAdd = () => {
  editingConditionId.value = null;
  showForm.value = true;
};

const openEdit = (row) => {
  editingConditionId.value = row.id;
  showForm.value = true;
};

const remove = async (row) => {
  if (!window.confirm(`Delete medical condition "${row.name}"?`)) return;
  try {
    await MedicalConditionServices.delete(row.id);
    message.value = "Medical condition deleted.";
    load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete medical condition.";
  }
};

const onSaved = () => {
  message.value = "Medical condition saved.";
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
      <h1 class="text-h5">Medical conditions</h1>
      <v-btn v-if="canManage" color="primary" @click="openAdd">Add condition</v-btn>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization using the menu bar to manage medical conditions.
    </v-alert>
    <v-alert v-else-if="!isOrgAdmin" type="warning" density="compact" class="mb-4">
      Only organization admins can manage medical conditions.
    </v-alert>
    <v-alert
      v-else-if="showOrgScopeNotice && orgLabel"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Showing medical conditions for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="canManage"
      :items="conditions"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" color="error" @click="remove(item)">Delete</v-btn>
      </template>
    </v-data-table>

    <MedicalConditionFormDialog
      v-model="showForm"
      :condition-id="editingConditionId"
      :org-id="effectiveOrgId"
      @saved="onSaved"
    />
  </v-container>
</template>
