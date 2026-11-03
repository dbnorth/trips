<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import AirlineServices from "../services/airlineServices.js";
import Utils from "../config/utils.js";
import RowAction from "../components/RowAction.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";

const rows = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editing = ref(null);
const form = ref({ code: "", name: "" });
const saving = ref(false);

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const load = () => {
  user.value = Utils.getStore("user");
  if (!isSystemAdmin.value) {
    rows.value = [];
    return Promise.resolve();
  }
  loading.value = true;
  message.value = "";
  return AirlineServices.getAll()
    .then((r) => {
      rows.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load airlines.";
      rows.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const openAdd = () => {
  editing.value = null;
  form.value = { code: "", name: "" };
  showForm.value = true;
};

const openEdit = (row) => {
  editing.value = row;
  form.value = { code: row.code || "", name: row.name || "" };
  showForm.value = true;
};

const save = async () => {
  saving.value = true;
  message.value = "";
  try {
    if (editing.value?.id) {
      await AirlineServices.update(editing.value.id, form.value);
    } else {
      await AirlineServices.create(form.value);
    }
    showForm.value = false;
    message.value = "Airline saved.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to save airline.";
  } finally {
    saving.value = false;
  }
};

const deleting = ref(null);
const deleteLoading = ref(false);
const deleteMessage = computed(() =>
  deleting.value ? `Delete airline "${deleting.value.code}"?` : ""
);

const remove = (row) => {
  deleting.value = row;
};

const confirmDelete = async () => {
  deleteLoading.value = true;
  try {
    await AirlineServices.delete(deleting.value.id);
    message.value = "Airline deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete airline.";
  } finally {
    deleteLoading.value = false;
    deleting.value = null;
  }
};

onMounted(() => {
  load();
  window.addEventListener("user-updated", load);
});
onUnmounted(() => window.removeEventListener("user-updated", load));
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Airlines</h1>
      <v-btn v-if="isSystemAdmin" color="primary" @click="openAdd">Add airline</v-btn>
    </div>
    <v-alert v-if="!isSystemAdmin" type="warning" density="compact" class="mb-4">
      Only system administrators can manage airlines.
    </v-alert>
    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>
    <v-data-table
      v-if="isSystemAdmin"
      :items="rows"
      :loading="loading"
      :headers="[
        { title: 'Code', key: 'code' },
        { title: 'Airline name', key: 'name' },
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

    <v-dialog v-model="showForm" max-width="420">
      <v-card>
        <v-card-title>{{ editing ? "Edit airline" : "Add airline" }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.code" label="Airline code" density="compact" class="mb-2" />
          <v-text-field v-model="form.name" label="Airline name" density="compact" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showForm = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
