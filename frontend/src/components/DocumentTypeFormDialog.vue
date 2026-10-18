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
  documentNumberRequired: false,
  allowSpecialization: false,
  hasExpirationDate: true,
  instructions: "",
  specializations: [],
});

const form = ref(emptyForm());
const newSpecializationName = ref("");
const specializationError = ref("");

const addSpecialization = () => {
  specializationError.value = "";
  const name = newSpecializationName.value.trim();
  if (!name) return;
  if (name.length > 100) {
    specializationError.value = "Specialization names must be 100 characters or fewer.";
    return;
  }
  if (form.value.specializations.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    specializationError.value = "Specialization names must be unique.";
    return;
  }
  form.value.specializations.push({ id: null, name });
  newSpecializationName.value = "";
};

const removeSpecialization = (index) => {
  form.value.specializations.splice(index, 1);
};

const isEdit = computed(() => props.documentTypeId != null && props.documentTypeId !== "");
const title = computed(() => (isEdit.value ? "Edit document type" : "Add document type"));
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const loadRow = async () => {
  formError.value = "";
  specializationError.value = "";
  newSpecializationName.value = "";
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
      documentNumberRequired: !!row.documentNumberRequired,
      allowSpecialization: !!row.allowSpecialization,
      hasExpirationDate: row.hasExpirationDate !== false,
      instructions: row.instructions || "",
      specializations: (row.specializations || []).map((s) => ({ id: s.id, name: s.name })),
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
  if (form.value.allowSpecialization && !form.value.specializations.length) {
    formError.value = "Add at least one specialization.";
    return;
  }

  saving.value = true;
  const payload = {
    description: form.value.description.trim(),
    type: form.value.type,
    documentNumberRequired: !!form.value.documentNumberRequired,
    allowSpecialization: !!form.value.allowSpecialization,
    hasExpirationDate: !!form.value.hasExpirationDate,
    instructions: form.value.instructions?.trim() || null,
    specializations: form.value.specializations.map((s) => ({ id: s.id, name: s.name })),
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
          class="mb-2"
          hide-details
        />
        <v-checkbox
          v-model="form.documentNumberRequired"
          label="Document number required"
          density="compact"
          hide-details
          class="mb-2"
        />
        <v-checkbox
          v-model="form.allowSpecialization"
          label="Allow Specialization"
          density="compact"
          hide-details
          class="mb-2"
        />
        <div v-if="form.allowSpecialization" class="mb-4 ml-8" data-testid="specialization-list">
          <div class="text-subtitle-2 mb-1">Specializations</div>
          <div
            v-for="(item, index) in form.specializations"
            :key="item.id ?? `new-${item.name}`"
            class="d-flex align-center"
          >
            <span class="flex-grow-1">{{ item.name }}</span>
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              :aria-label="`Remove ${item.name}`"
              @click="removeSpecialization(index)"
            />
          </div>
          <div class="d-flex align-center ga-2 mt-1">
            <v-text-field
              v-model="newSpecializationName"
              label="Specialization name"
              density="compact"
              maxlength="100"
              :error-messages="specializationError"
              hide-details="auto"
              @keydown.enter.prevent="addSpecialization"
            />
            <v-btn variant="tonal" @click="addSpecialization">Add</v-btn>
          </div>
        </div>
        <v-checkbox
          v-model="form.hasExpirationDate"
          label="Has Expiration Date"
          density="compact"
          hide-details
          class="mb-2"
        />
        <v-textarea
          v-model="form.instructions"
          label="Instructions"
          density="compact"
          rows="4"
          auto-grow
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
