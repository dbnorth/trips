<script setup>
import { computed, ref, watch } from "vue";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import CountrySelect from "./CountrySelect.vue";
import { resolveCountryCode, US_COUNTRY_CODE } from "../utils/locationData.js";

const props = defineProps({
  assignmentId: { type: [Number, String], required: true },
  document: { type: Object, required: true },
  /** The person's selectable document types (with `specializations`), as the profile form offers. */
  documentTypes: { type: Array, default: () => [] },
});

const emit = defineEmits(["close", "saved"]);

const FILE_ACCEPT =
  "application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif";

let specializationKey = 0;
const newSpecialization = (row = {}) => ({
  key: row.id || `new-${++specializationKey}`,
  id: row.id || null,
  documentTypeSpecializationId: row.documentTypeSpecializationId || null,
  date: row.date || "",
  file: null,
});

const form = ref({
  documentTypeId: props.document.documentTypeId,
  countryIssued: props.document.countryIssued || US_COUNTRY_CODE,
  documentNumber: props.document.documentNumber || "",
  issueDate: props.document.issueDate || "",
  expirationDate: props.document.expirationDate || "",
  file: null,
  specializations: (props.document.specializations || []).map((row) => newSpecialization(row)),
});
const error = ref("");
const saving = ref(false);

/** The person's types, plus the document's own type when it isn't one of them. */
const offeredTypes = computed(() => {
  if (props.documentTypes.some((row) => Number(row.id) === Number(props.document.documentTypeId))) {
    return props.documentTypes;
  }
  return [
    ...props.documentTypes,
    {
      id: props.document.documentTypeId,
      description: props.document.description,
      documentNumberRequired: props.document.documentNumberRequired,
      hasExpirationDate: props.document.hasExpirationDate,
    },
  ];
});

const showOrganizationNames = computed(
  () => new Set(props.documentTypes.map((row) => Number(row.orgId))).size > 1
);

const typeItems = computed(() =>
  offeredTypes.value.map((row) => ({
    title:
      showOrganizationNames.value && row.organization?.name
        ? `${row.description} (${row.organization.name})`
        : row.description,
    value: row.id,
  }))
);

const selectedType = computed(
  () => offeredTypes.value.find((row) => Number(row.id) === Number(form.value.documentTypeId)) || null
);
const documentNumberRequired = computed(() => !!selectedType.value?.documentNumberRequired);
const hasExpirationDate = computed(() => selectedType.value?.hasExpirationDate !== false);
const allowSpecialization = computed(() => !!selectedType.value?.allowSpecialization);
const specializationOptions = computed(() => selectedType.value?.specializations || []);

const specializationItems = (index) => {
  const usedElsewhere = new Set(
    form.value.specializations
      .filter((_, i) => i !== index)
      .map((row) => row.documentTypeSpecializationId)
      .filter(Boolean)
  );
  return specializationOptions.value
    .filter((s) => !usedElsewhere.has(s.id))
    .map((s) => ({ title: s.name, value: s.id }));
};

watch(
  () => form.value.documentTypeId,
  () => {
    if (!documentNumberRequired.value) form.value.documentNumber = "";
  }
);

const firstFile = (files) => (Array.isArray(files) ? files[0] : files || null);

const validate = () => {
  if (!form.value.documentTypeId) return "Document type is required.";
  if (documentNumberRequired.value && !String(form.value.documentNumber || "").trim()) {
    return "Document number is required.";
  }
  if (!resolveCountryCode(form.value.countryIssued)) return "Country issued is required.";
  if (!form.value.issueDate) return "Issue date is required.";
  if (hasExpirationDate.value && !form.value.expirationDate) return "Expiration date is required.";
  if (
    allowSpecialization.value &&
    form.value.specializations.some(
      (row) => !row.documentTypeSpecializationId || !row.date || (!row.file && !row.id)
    )
  ) {
    return "Each specialization needs a name, a date, and a file.";
  }
  return "";
};

const save = async () => {
  error.value = validate();
  if (error.value) return;
  const payload = {
    documentTypeId: form.value.documentTypeId,
    documentNumber: documentNumberRequired.value ? String(form.value.documentNumber || "").trim() : null,
    countryIssued: resolveCountryCode(form.value.countryIssued) || null,
    issueDate: form.value.issueDate,
    expirationDate: hasExpirationDate.value ? form.value.expirationDate : null,
    file: form.value.file || undefined,
  };
  if (allowSpecialization.value) {
    payload.specializations = form.value.specializations.map((row) => ({
      id: row.id || undefined,
      documentTypeSpecializationId: row.documentTypeSpecializationId,
      date: row.date,
      replaceFile: !!row.file,
    }));
    payload.specializationFiles = form.value.specializations.filter((row) => row.file).map((row) => row.file);
  }
  saving.value = true;
  try {
    await TripPeopleRoleServices.updateDocument(props.assignmentId, props.document.id, payload);
    emit("saved", { fileReplaced: !!form.value.file });
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to save document.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="border rounded pa-3 mb-3" data-testid="review-document-edit-section">
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.documentTypeId"
          :items="typeItems"
          label="Document type"
          density="compact"
          data-testid="review-edit-type"
        />
      </v-col>
      <v-col v-if="documentNumberRequired" cols="12" sm="6">
        <v-text-field
          v-model="form.documentNumber"
          label="Document number"
          density="compact"
          autocomplete="off"
          data-testid="review-edit-number"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <CountrySelect v-model="form.countryIssued" label="Country issued" default-empty-to-us />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          v-model="form.issueDate"
          label="Issue date"
          type="date"
          density="compact"
          data-testid="review-edit-issue-date"
        />
      </v-col>
      <v-col v-if="hasExpirationDate" cols="12" sm="6">
        <v-text-field
          v-model="form.expirationDate"
          label="Expiration date"
          type="date"
          density="compact"
          data-testid="review-edit-expiration-date"
        />
      </v-col>
    </v-row>

    <v-file-input
      label="Replace file"
      :accept="FILE_ACCEPT"
      density="compact"
      prepend-icon="mdi-file-document"
      show-size
      clearable
      hint="Leave empty to keep the current file. PDF, JPG, PNG, or HEIC"
      persistent-hint
      class="mb-2"
      @update:model-value="(files) => (form.file = firstFile(files))"
    />

    <div v-if="allowSpecialization" class="mb-3">
      <div class="text-subtitle-2 mb-2">Specializations</div>
      <div v-for="(spec, index) in form.specializations" :key="spec.key" class="mb-3">
        <v-row dense>
          <v-col cols="12" sm="4">
            <v-select
              v-model="spec.documentTypeSpecializationId"
              :items="specializationItems(index)"
              label="Specialization"
              density="compact"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <v-text-field v-model="spec.date" label="Date" type="date" density="compact" />
          </v-col>
          <v-col cols="12" sm="4" class="d-flex align-center justify-end">
            <v-btn size="small" variant="text" color="error" @click="form.specializations.splice(index, 1)">
              Delete
            </v-btn>
          </v-col>
        </v-row>
        <v-file-input
          label="Upload Specialization Document"
          :accept="FILE_ACCEPT"
          density="compact"
          prepend-icon="mdi-file-document"
          show-size
          clearable
          :hint="spec.id ? 'Leave empty to keep the current file' : 'PDF, JPG, PNG, or HEIC'"
          persistent-hint
          @update:model-value="(files) => (spec.file = firstFile(files))"
        />
      </div>
      <v-btn
        size="small"
        color="primary"
        :disabled="form.specializations.length >= specializationOptions.length"
        @click="form.specializations.push(newSpecialization())"
      >
        Add specialization
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" density="compact" class="mb-2" data-testid="review-edit-error">
      {{ error }}
    </v-alert>
    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" :disabled="saving" data-testid="review-edit-close" @click="emit('close')">Close</v-btn>
      <v-btn color="primary" :loading="saving" data-testid="review-edit-save" @click="save">Save</v-btn>
    </div>
  </div>
</template>
