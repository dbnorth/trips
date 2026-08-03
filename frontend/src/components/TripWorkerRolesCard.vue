<script setup>
import { ref, computed, watch, onMounted } from "vue";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import WorkerRoleServices from "../services/workerRoleServices.js";

const props = defineProps({
  tripId: { type: [Number, String], required: true },
  orgId: { type: [Number, String], default: null },
  refreshKey: { type: [Number, String], default: 0 },
});

const emit = defineEmits(["changed"]);

const rows = ref([]);
const workerRoles = ref([]);
const loading = ref(false);
const error = ref("");
const addRoleId = ref(null);
const addQuantity = ref(1);
const adding = ref(false);
const savingIds = ref(new Set());

const availableRoleItems = computed(() => {
  const usedIds = new Set(rows.value.map((r) => Number(r.workerRoleId)));
  return workerRoles.value
    .filter((r) => !usedIds.has(Number(r.id)))
    .map((r) => ({
      title: r.licenseRequired
        ? `${r.name} (${r.documentType?.description ? r.documentType.description + " " : ""}license required)`
        : r.name,
      value: r.id,
    }));
});

const totalNeeded = computed(() =>
  rows.value.reduce((sum, r) => sum + Number(r.quantity || 0), 0)
);

const totalSignedUp = computed(() =>
  rows.value.reduce((sum, r) => sum + Number(r.signedUpCount || 0), 0)
);

const loadRows = () =>
  TripWorkerRoleServices.getAll(props.tripId).then((r) => {
    rows.value = r.data || [];
  });

const loadWorkerRoles = () => {
  if (!props.orgId) {
    workerRoles.value = [];
    return Promise.resolve();
  }
  return WorkerRoleServices.getAll({ orgId: props.orgId, status: "active" })
    .then((r) => {
      workerRoles.value = r.data || [];
    })
    .catch(() => {
      workerRoles.value = [];
    });
};

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    await Promise.all([loadRows(), loadWorkerRoles()]);
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to load team roles.";
  } finally {
    loading.value = false;
  }
};

const add = async () => {
  if (!addRoleId.value) return;
  const qty = Number(addQuantity.value);
  if (!Number.isInteger(qty) || qty < 1) {
    error.value = "Quantity must be a positive whole number.";
    return;
  }
  adding.value = true;
  error.value = "";
  try {
    await TripWorkerRoleServices.create({
      tripId: Number(props.tripId),
      workerRoleId: addRoleId.value,
      quantity: qty,
    });
    addRoleId.value = null;
    addQuantity.value = 1;
    await loadRows();
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to add role.";
  } finally {
    adding.value = false;
  }
};

const saveQuantity = async (row) => {
  const qty = Number(row.quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    error.value = "Quantity must be a positive whole number.";
    await loadRows();
    return;
  }
  savingIds.value.add(row.id);
  error.value = "";
  try {
    await TripWorkerRoleServices.update(row.id, { quantity: qty });
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to update quantity.";
    await loadRows();
  } finally {
    savingIds.value.delete(row.id);
  }
};

const remove = async (row) => {
  error.value = "";
  try {
    await TripWorkerRoleServices.delete(row.id);
    await loadRows();
    emit("changed");
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to remove role.";
  }
};

watch(
  () => [props.tripId, props.orgId, props.refreshKey],
  () => {
    if (props.tripId) load();
  }
);

onMounted(() => {
  if (props.tripId) load();
});
</script>

<template>
  <v-card class="pa-4 mb-6">
    <div class="d-flex align-center justify-space-between mb-2">
      <h2 class="text-h6">Team roles needed</h2>
      <span v-if="rows.length" class="text-caption text-medium-emphasis">
        {{ totalSignedUp }} signed up / {{ totalNeeded }} needed
      </span>
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>

    <v-progress-linear v-if="loading" indeterminate class="mb-3" />

    <v-table v-if="rows.length" density="compact" class="mb-4">
      <thead>
        <tr>
          <th>Role</th>
          <th>License required</th>
          <th>Document type</th>
          <th style="width: 130px">Number Needed</th>
          <th style="width: 140px">Number Signed Up</th>
          <th style="width: 100px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>
            <div>{{ row.workerRole?.name || "—" }}</div>
            <div v-if="row.workerRole?.description" class="text-caption text-medium-emphasis">
              {{ row.workerRole.description }}
            </div>
          </td>
          <td>{{ row.workerRole?.licenseRequired ? "Yes" : "No" }}</td>
          <td>{{ row.workerRole?.documentType?.description || "—" }}</td>
          <td>
            <v-text-field
              v-model.number="row.quantity"
              type="number"
              min="1"
              density="compact"
              hide-details
              :loading="savingIds.has(row.id)"
              @change="saveQuantity(row)"
            />
          </td>
          <td>{{ row.signedUpCount ?? 0 }}</td>
          <td>
            <v-btn size="small" variant="text" color="error" @click="remove(row)">Remove</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <p v-else-if="!loading" class="text-body-2 text-medium-emphasis mb-4">
      No team roles added yet.
    </p>

    <div class="add-role-form pa-4 rounded">
      <div class="text-subtitle-2 mb-3">Add Role</div>
      <div class="d-flex align-center ga-3 flex-wrap">
        <v-select
          v-model="addRoleId"
          :items="availableRoleItems"
          label="Worker role"
          density="compact"
          hide-details
          style="max-width: 320px; min-width: 220px"
          :disabled="!availableRoleItems.length"
          :placeholder="availableRoleItems.length ? undefined : 'No more active roles to add'"
        />
        <v-text-field
          v-model.number="addQuantity"
          type="number"
          min="1"
          label="Number Needed"
          density="compact"
          hide-details
          style="max-width: 120px"
        />
        <v-btn color="primary" size="small" :loading="adding" :disabled="!addRoleId" @click="add">
          Add role
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.add-role-form {
  background-color: #f0f0f0;
}
</style>
