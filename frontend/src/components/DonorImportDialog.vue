<script setup>
import { ref, computed, watch } from "vue";
import DonorServices from "../services/donorServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "imported"]);

const file = ref(null);
const formError = ref("");
const saving = ref(false);
const summary = ref(null);

const chosenFile = computed(() => (Array.isArray(file.value) ? file.value[0] : file.value) || null);

const summaryText = computed(() => {
  const s = summary.value;
  if (!s) return "";
  return `Imported ${s.rowCount} rows: ${s.added} added, ${s.updated} updated, ${s.skipped} skipped.`;
});

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    file.value = null;
    formError.value = "";
    saving.value = false;
    summary.value = null;
  }
);

const close = () => {
  emit("update:modelValue", false);
  if (summary.value) emit("imported");
};

const runImport = async () => {
  if (!chosenFile.value) return;
  formError.value = "";
  saving.value = true;
  try {
    const res = await DonorServices.importCsv(chosenFile.value);
    summary.value = res.data;
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to import the file.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" @update:model-value="(v) => !v && close()">
    <v-card class="pa-4">
      <v-card-title>Import donors</v-card-title>
      <v-card-text>
        <v-alert v-if="formError" type="error" density="compact" class="mb-3">{{ formError }}</v-alert>
        <v-file-input
          v-model="file"
          label="Donor contact list"
          accept=".csv,text/csv"
          density="compact"
          prepend-icon="mdi-file-delimited"
        />
        <v-alert v-if="summary" type="success" density="compact">{{ summaryText }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="!chosenFile" @click="runImport">Import</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
