<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import DocumentTypeServices from "../services/documentTypeServices.js";
import DocumentTypeFormDialog from "../components/DocumentTypeFormDialog.vue";
import { documentTypeLabel } from "../utils/documentTypes.js";
import Utils from "../config/utils.js";
import RowAction from "../components/RowAction.vue";

const rows = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editingId = ref(null);

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
    rows.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  message.value = "";
  return DocumentTypeServices.getAll({ orgId: effectiveOrgId.value })
    .then((r) => {
      rows.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load document types.";
      rows.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const openAdd = () => {
  editingId.value = null;
  showForm.value = true;
};

const openEdit = (row) => {
  editingId.value = row.id;
  showForm.value = true;
};

const remove = async (row) => {
  if (!window.confirm(`Delete document type "${row.description}"?`)) return;
  message.value = "";
  try {
    await DocumentTypeServices.delete(row.id);
    message.value = "Document type deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete document type.";
  }
};

const onSaved = () => {
  message.value = "Document type saved.";
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
      <h1 class="text-h5">Document types</h1>
      <v-btn v-if="canManage" color="primary" @click="openAdd">Add document type</v-btn>
    </div>

    <v-alert v-if="needsOrgSelection" type="warning" density="compact" class="mb-4">
      Select an organization using the menu bar to manage document types.
    </v-alert>
    <v-alert
      v-else-if="!isOrgAdmin"
      type="warning"
      density="compact"
      class="mb-4"
    >
      Only organization admins can manage document types.
    </v-alert>
    <v-alert
      v-else-if="showOrgScopeNotice && orgLabel"
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      Showing document types for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="canManage"
      :items="rows"
      :loading="loading"
      :headers="[
        { title: 'Description', key: 'description' },
        { title: 'Type', key: 'type' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.type="{ item }">{{ documentTypeLabel(item.type) }}</template>
      <template #item.actions="{ item }">
        <div class="d-flex flex-nowrap ga-1">
          <RowAction icon="mdi-pencil" label="Edit" @click="openEdit(item)" />
          <RowAction icon="mdi-delete" label="Delete" color="error" @click="remove(item)" />
        </div>
      </template>
    </v-data-table>

    <DocumentTypeFormDialog
      v-model="showForm"
      :document-type-id="editingId"
      :org-id="effectiveOrgId"
      @saved="onSaved"
    />
  </v-container>
</template>
