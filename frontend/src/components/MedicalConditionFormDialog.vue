<script setup>
import { ref, computed, watch } from "vue";
import MedicalConditionServices from "../services/medicalConditionServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  conditionId: { type: [Number, String], default: null },
  orgId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const formError = ref("");
const form = ref({ name: "" });

const isEdit = computed(() => props.conditionId != null && props.conditionId !== "");
const title = computed(() => (isEdit.value ? "Edit medical condition" : "Add medical condition"));
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const loadCondition = async () => {
  formError.value = "";
  if (!isEdit.value) {
    form.value = { name: "" };
    return;
  }
  try {
    const res = await MedicalConditionServices.get(props.conditionId);
    form.value = { name: res.data?.name || "" };
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load medical condition.";
  }
};

watch(
  () => [props.modelValue, props.conditionId],
  ([visible]) => {
    if (visible) loadCondition();
  }
);

const close = () => {
  open.value = false;
};

const save = async () => {
  formError.value = "";
  const name = form.value.name?.trim() || "";
  if (!name) {
    formError.value = "Name is required.";
    return;
  }
  if (name.length > 50) {
    formError.value = "Name must be at most 50 characters.";
    return;
  }
  if (!isEdit.value && !props.orgId) {
    formError.value = "Organization is required.";
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value) {
      await MedicalConditionServices.update(props.conditionId, { name });
    } else {
      await MedicalConditionServices.create({ orgId: Number(props.orgId), name });
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to save medical condition.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="open" max-width="480" @update:model-value="(v) => (open = v)">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="form.name"
          label="Name"
          density="compact"
          maxlength="50"
          counter="50"
          autocomplete="off"
        />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
