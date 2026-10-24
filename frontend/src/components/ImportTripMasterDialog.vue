<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trip: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "imported"]);

const file = ref(null);
const formError = ref("");
const missingRoles = ref([]);
const saving = ref(false);
const summary = ref(null);

const chosenFile = computed(() => (Array.isArray(file.value) ? file.value[0] : file.value) || null);

const summaryText = computed(() => {
  const s = summary.value;
  if (!s) return "";
  return `Imported ${s.rowCount} rows: ${s.added} people added, ${s.updated} updated, ${s.skipped} skipped.`;
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      file.value = null;
      formError.value = "";
      missingRoles.value = [];
      saving.value = false;
      summary.value = null;
    }
  }
);

const close = () => {
  emit("update:modelValue", false);
  if (summary.value) emit("imported");
};

const runImport = async () => {
  if (!chosenFile.value || !props.trip) return;
  formError.value = "";
  missingRoles.value = [];
  saving.value = true;
  try {
    const res = await TripServices.importTripMaster(props.trip.id, chosenFile.value);
    summary.value = res.data;
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to import the file.";
    missingRoles.value = e.response?.data?.missingRoles || [];
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" @update:model-value="(v) => !v && close()">
    <v-card class="pa-4">
      <v-card-title>Import Trip Master CSV</v-card-title>

      <v-card-text>
        <p v-if="trip" class="mb-3">{{ trip.name }}</p>
        <v-alert
          v-if="missingRoles.length"
          type="warning"
          density="compact"
          class="mb-3"
          data-testid="import-missing-roles"
        >
          {{ formError }}
          <ul class="pl-4">
            <li v-for="role in missingRoles" :key="role">{{ role }}</li>
          </ul>
        </v-alert>
        <v-alert v-else-if="formError" type="error" density="compact" class="mb-3" data-testid="import-error">
          {{ formError }}
        </v-alert>
        <v-file-input
          v-model="file"
          label="Trip Master CSV"
          accept=".csv,text/csv"
          density="compact"
          prepend-icon="mdi-file-delimited"
          data-testid="import-file"
        />
        <div v-if="summary" data-testid="import-summary">
          <v-alert type="success" density="compact" class="mb-2">{{ summaryText }}</v-alert>
          <ul v-if="summary.notes.length" class="pl-4" data-testid="import-notes">
            <li v-for="note in summary.notes" :key="`${note.row}-${note.message}`">
              Row {{ note.row }} — {{ note.name }}: {{ note.message }}
            </li>
          </ul>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!chosenFile" @click="runImport">Import</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
