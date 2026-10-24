<script setup>
import { ref, computed, watch, onMounted } from "vue";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import WorkerRoleServices from "../services/workerRoleServices.js";
import RoleReservationsDialog from "./RoleReservationsDialog.vue";
import { parseEmailList, tooManyReservedEmailsError } from "../utils/emailList.js";
import RowAction from "./RowAction.vue";

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
const addEmails = ref("");
const adding = ref(false);
const showAddRole = ref(false);
const addRoleError = ref("");
const savingIds = ref(new Set());
const showReservations = ref(false);
const reservationsRoleId = ref(null);
const reservationsRole = computed(
  () => rows.value.find((r) => Number(r.id) === Number(reservationsRoleId.value)) || null
);

const openReservations = (row) => {
  reservationsRoleId.value = row.id;
  showReservations.value = true;
};

const availableRoleItems = computed(() => {
  const usedIds = new Set(rows.value.map((r) => Number(r.workerRoleId)));
  return workerRoles.value
    .filter((r) => !usedIds.has(Number(r.id)))
    .map((r) => ({
      title: r.name,
      value: r.id,
    }));
});

const totalNeeded = computed(() =>
  rows.value.reduce((sum, r) => sum + Number(r.quantity || 0), 0)
);

const totalSignedUp = computed(() =>
  rows.value.reduce((sum, r) => sum + Number(r.signedUpCount || 0), 0)
);

const reservedEmailsByRoleId = ref({});

const loadReservedEmails = async (roleRows) => {
  const entries = await Promise.all(
    roleRows.map((row) =>
      TripWorkerRoleServices.getReservations(row.id)
        .then((res) => [row.id, (res.data || []).map((r) => r.email)])
        .catch(() => [row.id, []])
    )
  );
  reservedEmailsByRoleId.value = Object.fromEntries(entries);
};

const reservedEmailsText = (row) => (reservedEmailsByRoleId.value[row.id] || []).join(", ") || "—";

const loadRows = () =>
  TripWorkerRoleServices.getAll(props.tripId).then(async (r) => {
    rows.value = r.data || [];
    await loadReservedEmails(rows.value);
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

const openAddRole = () => {
  addRoleId.value = null;
  addQuantity.value = 1;
  addEmails.value = "";
  addRoleError.value = "";
  showAddRole.value = true;
};

const add = async () => {
  if (!addRoleId.value) return;
  const qty = Number(addQuantity.value);
  if (!Number.isInteger(qty) || qty < 1) {
    addRoleError.value = "Quantity must be a positive whole number.";
    return;
  }
  const emails = parseEmailList(addEmails.value);
  addRoleError.value = tooManyReservedEmailsError(emails, qty);
  if (addRoleError.value) return;
  adding.value = true;
  try {
    await TripWorkerRoleServices.create({
      tripId: Number(props.tripId),
      workerRoleId: addRoleId.value,
      quantity: qty,
      emails,
    });
    showAddRole.value = false;
    await loadRows();
  } catch (e) {
    addRoleError.value = e.response?.data?.message || "Unable to add role.";
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
          <th>Document type</th>
          <th style="width: 130px">Number Needed</th>
          <th style="width: 140px">Number Signed Up</th>
          <th style="width: 100px">Reserved</th>
          <th style="width: 220px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>
            <div>{{ row.workerRole?.name || "—" }}</div>
            <div v-if="row.workerRole?.description" class="text-caption text-medium-emphasis">
              {{ row.workerRole.description }}
            </div>
            <div class="text-caption text-medium-emphasis">Reserved emails: {{ reservedEmailsText(row) }}</div>
          </td>
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
          <td>{{ row.reservedCount ?? 0 }}</td>
          <td class="text-no-wrap">
            <div class="d-flex flex-nowrap ga-1">
              <RowAction icon="mdi-email-lock" label="Reserved emails" @click="openReservations(row)" />
              <RowAction icon="mdi-minus-circle-outline" label="Remove" color="error" @click="remove(row)" />
            </div>
          </td>
        </tr>
      </tbody>
    </v-table>

    <p v-else-if="!loading" class="text-body-2 text-medium-emphasis mb-4">
      No team roles added yet.
    </p>

    <div class="d-flex align-center ga-3">
      <v-btn
        color="primary"
        size="small"
        variant="tonal"
        :disabled="loading || !availableRoleItems.length"
        @click="openAddRole"
      >
        Add role
      </v-btn>
      <span v-if="!loading && !availableRoleItems.length" class="text-caption text-medium-emphasis">
        No more active roles to add
      </span>
    </div>

    <v-dialog v-model="showAddRole" max-width="480">
      <v-card>
        <v-card-title>Add Role</v-card-title>
        <v-card-text>
          <v-select
            v-model="addRoleId"
            :items="availableRoleItems"
            label="Worker role"
            density="compact"
            class="mb-2"
          />
          <v-text-field
            v-model.number="addQuantity"
            type="number"
            min="1"
            label="Number Needed"
            density="compact"
            class="mb-2"
          />
          <v-textarea
            v-model="addEmails"
            label="Reserved emails (optional)"
            hint="Separate emails with commas, spaces, or new lines"
            persistent-hint
            density="compact"
            rows="2"
            auto-grow
          />
          <v-alert v-if="addRoleError" type="error" density="compact" class="mt-3">
            {{ addRoleError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddRole = false">Cancel</v-btn>
          <v-btn color="primary" :loading="adding" :disabled="!addRoleId" @click="add">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <RoleReservationsDialog v-model="showReservations" :role="reservationsRole" @changed="loadRows" />
  </v-card>
</template>