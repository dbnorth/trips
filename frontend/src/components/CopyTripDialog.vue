<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trips: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const name = ref("");
const sourceTripId = ref(null);
const formError = ref("");
const saving = ref(false);

const tripItems = computed(() =>
  (props.trips || []).map((trip) => ({
    title: trip.name,
    value: trip.id,
  }))
);

const reset = () => {
  name.value = "";
  sourceTripId.value = null;
  formError.value = "";
  saving.value = false;
};

const close = () => {
  emit("update:modelValue", false);
  reset();
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = "";
      sourceTripId.value = props.trips?.[0]?.id ?? null;
      formError.value = "";
      saving.value = false;
    }
  }
);

const save = async () => {
  formError.value = "";
  const trimmed = String(name.value || "").trim();
  if (!trimmed) {
    formError.value = "Name is required.";
    return;
  }
  if (sourceTripId.value == null || sourceTripId.value === "") {
    formError.value = "Trip to copy is required.";
    return;
  }

  saving.value = true;
  try {
    await TripServices.copy(sourceTripId.value, { name: trimmed });
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Error copying trip.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => !v && close()">
    <v-card class="pa-4">
      <v-card-title>Copy trip</v-card-title>

      <v-card-text>
        <v-alert v-if="formError" type="error" density="compact" class="mb-3">{{ formError }}</v-alert>

        <v-text-field
          v-model="name"
          label="Name"
          density="compact"
          autocomplete="off"
          :rules="[(v) => !!String(v || '').trim() || 'Name is required.']"
        />

        <v-select
          v-model="sourceTripId"
          :items="tripItems"
          label="Trip to copy"
          density="compact"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Copy</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
