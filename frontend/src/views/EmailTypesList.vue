<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import EmailTypeServices from "../services/emailTypeServices.js";
import EmailTypeFormDialog from "../components/EmailTypeFormDialog.vue";
import Utils from "../config/utils.js";

const rows = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editingId = ref(null);

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const load = () => {
  user.value = Utils.getStore("user");
  if (!isSystemAdmin.value) {
    rows.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  message.value = "";
  return EmailTypeServices.getAll()
    .then((r) => {
      rows.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load email types.";
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
  if (!window.confirm(`Delete email type "${row.description}"?`)) return;
  message.value = "";
  try {
    await EmailTypeServices.delete(row.id);
    message.value = "Email type deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete email type.";
  }
};

const onSaved = () => {
  message.value = "Email type saved.";
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
      <h1 class="text-h5">Email types</h1>
      <v-btn v-if="isSystemAdmin" color="primary" @click="openAdd">Add email type</v-btn>
    </div>

    <v-alert v-if="!isSystemAdmin" type="warning" density="compact" class="mb-4">
      Only system administrators can manage email types.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      v-if="isSystemAdmin"
      :items="rows"
      :loading="loading"
      :headers="[
        { title: 'Type code', key: 'typeCode' },
        { title: 'Description', key: 'description' },
        { title: 'Event code', key: 'eventCode' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" color="error" @click="remove(item)">Delete</v-btn>
      </template>
    </v-data-table>

    <EmailTypeFormDialog v-model="showForm" :email-type-id="editingId" @saved="onSaved" />
  </v-container>
</template>
