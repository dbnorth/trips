<script setup>
import { ref, watch } from "vue";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import { parseEmailList } from "../utils/emailList.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  role: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "changed"]);

const reservations = ref([]);
const emailsInput = ref("");
const loading = ref(false);
const adding = ref(false);
const error = ref("");

const load = async () => {
  if (!props.role?.id) return;
  loading.value = true;
  error.value = "";
  try {
    const res = await TripWorkerRoleServices.getReservations(props.role.id);
    reservations.value = res.data || [];
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to load reserved emails.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    reservations.value = [];
    emailsInput.value = "";
    load();
  }
);

const close = () => emit("update:modelValue", false);

const statusLabel = (row) =>
  row.filled ? `Applied — ${row.applicantName} (${row.applicationStatus})` : "Reserved";

const add = async () => {
  const emails = parseEmailList(emailsInput.value);
  if (!emails.length) return;
  adding.value = true;
  error.value = "";
  try {
    await TripWorkerRoleServices.addReservations(props.role.id, emails);
    emailsInput.value = "";
    await load();
    emit("changed");
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to reserve emails.";
  } finally {
    adding.value = false;
  }
};

const remove = async (row) => {
  error.value = "";
  try {
    await TripWorkerRoleServices.deleteReservation(props.role.id, row.id);
    await load();
    emit("changed");
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to remove reserved email.";
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="600" @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Reserved emails — {{ role?.workerRole?.name || "Role" }}</v-card-title>
      <v-card-text>
        <v-progress-linear v-if="loading" indeterminate class="mb-3" />
        <v-table v-if="reservations.length" density="compact" class="mb-4">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th style="width: 100px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in reservations" :key="row.id">
              <td>{{ row.email }}</td>
              <td>{{ statusLabel(row) }}</td>
              <td>
                <v-btn size="small" variant="text" color="error" @click="remove(row)">Remove</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
        <p v-else-if="!loading" class="text-body-2 text-medium-emphasis mb-4">No reserved emails.</p>

        <div class="text-caption text-medium-emphasis mb-2">{{ role?.availableCount ?? 0 }} open slots</div>
        <v-textarea
          v-model="emailsInput"
          label="Emails to reserve"
          hint="Separate emails with commas, spaces, or new lines"
          persistent-hint
          density="compact"
          rows="2"
        />
        <v-alert v-if="error" type="error" density="compact" class="mt-3">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="adding" :disabled="!emailsInput.trim()" @click="add">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
