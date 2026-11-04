<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import EmailTypeServices from "../services/emailTypeServices.js";
import EmailTypeFormDialog from "../components/EmailTypeFormDialog.vue";
import Utils from "../config/utils.js";
import RowAction from "../components/RowAction.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";

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

const deleting = ref(null);
const deleteLoading = ref(false);
const deleteMessage = computed(() =>
  deleting.value ? `Delete email type "${deleting.value.description}"?` : ""
);

const remove = (row) => {
  deleting.value = row;
};

const confirmDelete = async () => {
  deleteLoading.value = true;
  message.value = "";
  try {
    await EmailTypeServices.delete(deleting.value.id);
    message.value = "Email type deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete email type.";
  } finally {
    deleteLoading.value = false;
    deleting.value = null;
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
        { title: 'Event description', key: 'eventDescription', sortable: false },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.actions="{ item }">
        <div class="d-flex flex-nowrap ga-1">
          <RowAction icon="mdi-pencil" label="Edit" @click="openEdit(item)" />
          <RowAction icon="mdi-delete" label="Delete" color="error" @click="remove(item)" />
        </div>
      </template>
    </v-data-table>

    <EmailTypeFormDialog v-model="showForm" :email-type-id="editingId" @saved="onSaved" />

    <ConfirmDialog
      :model-value="!!deleting"
      :message="deleteMessage"
      confirm-text="Delete"
      confirm-color="error"
      cancel-text="Cancel"
      :loading="deleteLoading"
      @update:model-value="(v) => !v && (deleting = null)"
      @confirm="confirmDelete"
    />
  </v-container>
</template>
