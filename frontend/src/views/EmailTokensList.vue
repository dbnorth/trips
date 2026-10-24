<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import EmailTokenServices from "../services/emailTokenServices.js";
import EmailTokenFormDialog from "../components/EmailTokenFormDialog.vue";
import Utils from "../config/utils.js";
import RowAction from "../components/RowAction.vue";

const rows = ref([]);
const valueSources = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editingId = ref(null);

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const tokenSymbol = (code) => `{{${code}}}`;

const valueSourceLabel = (key) =>
  valueSources.value.find((row) => row.valueSource === key)?.label || key;

const load = () => {
  user.value = Utils.getStore("user");
  if (!isSystemAdmin.value) {
    rows.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  message.value = "";
  return Promise.all([EmailTokenServices.getAll(), EmailTokenServices.getValueSources()])
    .then(([tokens, sources]) => {
      rows.value = tokens.data || [];
      valueSources.value = sources.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load tokens.";
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
  if (!window.confirm(`Delete token "${row.tokenCode}"?`)) return;
  message.value = "";
  try {
    await EmailTokenServices.delete(row.id);
    message.value = "Token deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete token.";
  }
};

const onSaved = () => {
  message.value = "Token saved.";
  load();
};

const onUserUpdated = () => {
  load();
};

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
      <h1 class="text-h5">Email tokens</h1>
      <v-btn v-if="isSystemAdmin" color="primary" @click="openAdd">Add token</v-btn>
    </div>

    <v-alert v-if="!isSystemAdmin" type="warning" density="compact" class="mb-4">
      Only system administrators can manage email tokens.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="isSystemAdmin"
      :items="rows"
      :loading="loading"
      :headers="[
        { title: 'Token code', key: 'tokenCode' },
        { title: 'Description', key: 'description' },
        { title: 'Value source', key: 'valueSource' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.tokenCode="{ item }">{{ tokenSymbol(item.tokenCode) }}</template>
      <template #item.valueSource="{ item }">{{ valueSourceLabel(item.valueSource) }}</template>
      <template #item.actions="{ item }">
        <div class="d-flex flex-nowrap ga-1">
          <RowAction icon="mdi-pencil" label="Edit" @click="openEdit(item)" />
          <RowAction icon="mdi-delete" label="Delete" color="error" @click="remove(item)" />
        </div>
      </template>
    </v-data-table>

    <EmailTokenFormDialog v-model="showForm" :email-token-id="editingId" @saved="onSaved" />
  </v-container>
</template>
