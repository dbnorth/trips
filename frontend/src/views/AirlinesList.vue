<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import AirlineServices from "../services/airlineServices.js";
import Utils from "../config/utils.js";

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

const remove = async (row) => {
  if (!window.confirm(`Delete airline "${row.code}"?`)) return;
  try {
    await AirlineServices.delete(row.id);
    message.value = "Airline deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete airline.";
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
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" color="error" @click="remove(item)">Delete</v-btn>
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
  </v-container>
</template>
