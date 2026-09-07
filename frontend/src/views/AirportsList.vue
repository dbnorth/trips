<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import AirportServices from "../services/airportServices.js";
import Utils from "../config/utils.js";

const rows = ref([]);
const user = ref(null);
const loading = ref(false);
const message = ref("");
const showForm = ref(false);
const editing = ref(null);
const form = ref({ code: "", airportName: "", city: "", country: "" });
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
  return AirportServices.getAll()
    .then((r) => {
      rows.value = r.data || [];
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load airports.";
      rows.value = [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const openAdd = () => {
  editing.value = null;
  form.value = { code: "", airportName: "", city: "", country: "" };
  showForm.value = true;
};

const openEdit = (row) => {
  editing.value = row;
  form.value = {
    code: row.code || "",
    airportName: row.airportName || "",
    city: row.city || "",
    country: row.country || "",
  };
  showForm.value = true;
};

const save = async () => {
  saving.value = true;
  message.value = "";
  try {
    if (editing.value?.id) {
      await AirportServices.update(editing.value.id, form.value);
    } else {
      await AirportServices.create(form.value);
    }
    showForm.value = false;
    message.value = "Airport saved.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to save airport.";
  } finally {
    saving.value = false;
  }
};

const remove = async (row) => {
  if (!window.confirm(`Delete airport "${row.code}"?`)) return;
  try {
    await AirportServices.delete(row.id);
    message.value = "Airport deleted.";
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete airport.";
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
      <h1 class="text-h5">Airports</h1>
      <v-btn v-if="isSystemAdmin" color="primary" @click="openAdd">Add airport</v-btn>
    </div>
    <v-alert v-if="!isSystemAdmin" type="warning" density="compact" class="mb-4">
      Only system administrators can manage airports.
    </v-alert>
    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>
    <v-data-table
      v-if="isSystemAdmin"
      :items="rows"
      :loading="loading"
      :headers="[
        { title: 'Code', key: 'code' },
        { title: 'Airport', key: 'airportName' },
        { title: 'City', key: 'city' },
        { title: 'Country', key: 'country' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
        <v-btn size="small" variant="text" color="error" @click="remove(item)">Delete</v-btn>
      </template>
    </v-data-table>

    <v-dialog v-model="showForm" max-width="480">
      <v-card>
        <v-card-title>{{ editing ? "Edit airport" : "Add airport" }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.code" label="Code" density="compact" class="mb-2" />
          <v-text-field v-model="form.airportName" label="Airport" density="compact" class="mb-2" />
          <v-text-field v-model="form.city" label="City" density="compact" class="mb-2" />
          <v-text-field v-model="form.country" label="Country" density="compact" />
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
