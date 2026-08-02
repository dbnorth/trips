<script setup>
import { ref, computed, watch } from "vue";
import DocumentTypeServices from "../services/documentTypeServices.js";
import { DOCUMENT_TYPE_OPTIONS } from "../utils/documentTypes.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  documentTypeId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const formError = ref("");

const emptyForm = () => ({
  description: "",
  type: null,
});

const form = ref(emptyForm());

const isEdit = computed(() => props.documentTypeId != null && props.documentTypeId !== "");
const title = computed(() => (isEdit.value ? "Edit document type" : "Add document type"));
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const loadRow = async () => {
  formError.value = "";
  if (!isEdit.value) {
    form.value = emptyForm();
    return;
  }
  try {
    const res = await DocumentTypeServices.get(props.documentTypeId);
    const row = res.data;
    form.value = {
      description: row.description || "",
      type: row.type || null,
    };
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load document type.";
  }
};

watch(
  () => [props.modelValue, props.documentTypeId],
  ([visible]) => {
    if (visible) loadRow();
  }
);

const close = () => {
  open.value = false;
};

const save = async () => {
  formError.value = "";
  if (!form.value.description?.trim()) {
    formError.value = "Description is required.";
    return;
  }
  if (!form.value.type) {
    formError.value = "Type is required.";
    return;
  }

  saving.value = true;
  const payload = {
    description: form.value.description.trim(),
    type: form.value.type,
  };

  try {
    if (isEdit.value) {
      await DocumentTypeServices.update(props.documentTypeId, payload);
    } else {
      await DocumentTypeServices.create(payload);
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to save document type.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="560" persistent>
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>
        <v-text-field
          v-model="form.description"
          label="Description"
          density="compact"
          class="mb-2"
          required
        />
        <v-select
          v-model="form.type"
          :items="DOCUMENT_TYPE_OPTIONS"
          label="Type"
          density="compact"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
