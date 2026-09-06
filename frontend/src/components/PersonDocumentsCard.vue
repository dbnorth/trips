<script setup>
import { computed, onMounted, ref, watch } from "vue";
import DocumentTypeServices from "../services/documentTypeServices.js";
import PersonDocumentServices from "../services/personDocumentServices.js";
import CountrySelect from "./CountrySelect.vue";
import { countryName, resolveCountryCode, US_COUNTRY_CODE } from "../utils/locationData.js";

const props = defineProps({
  personId: { type: [Number, String], default: null },
});

const documents = ref([]);
const documentTypes = ref([]);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const fileInputKey = ref(0);
const showFieldErrors = ref(false);
const editingDocumentId = ref(null);
const form = ref({
  documentTypeId: null,
  countryIssued: US_COUNTRY_CODE,
  documentNumber: "",
  issueDate: "",
  expirationDate: "",
  file: null,
});

const emptyFieldErrors = () => ({
  documentTypeId: "",
  documentNumber: "",
  countryIssued: "",
  issueDate: "",
  expirationDate: "",
  file: "",
});

const fieldErrors = ref(emptyFieldErrors());

const viewDialog = ref(false);
const viewLoading = ref(false);
const viewUrl = ref(null);
const viewType = ref("");
const viewName = ref("");
const viewRow = ref(null);

const isEditing = computed(() => editingDocumentId.value != null);
const formTitle = computed(() => (isEditing.value ? "Edit Document" : "Add Document"));
const saveButtonLabel = computed(() => (isEditing.value ? "Save document" : "Add document"));

const viewKind = computed(() => {
  const type = (viewType.value || "").toLowerCase();
  const name = (viewName.value || "").toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/.test(name)) return "image";
  return "unsupported";
});

const documentTypeItems = computed(() =>
  documentTypes.value.map((row) => ({
    title: row.description,
    value: row.id,
  }))
);

const selectedDocumentType = computed(
  () =>
    documentTypes.value.find((row) => Number(row.id) === Number(form.value.documentTypeId)) || null
);

const selectedInstructions = computed(() => {
  const text = selectedDocumentType.value?.instructions;
  return text && String(text).trim() ? String(text) : "";
});

const documentNumberRequired = computed(
  () => !!selectedDocumentType.value?.documentNumberRequired
);

const fileName = (row) => String(row.documentFileName || "").split("/").pop() || "Document";

const countryLabel = (code) => countryName(code) || code || "—";

const onFileSelected = (files) => {
  form.value.file = Array.isArray(files) ? files[0] : files || null;
  if (showFieldErrors.value) validateForm();
};

const resetForm = () => {
  editingDocumentId.value = null;
  form.value = {
    documentTypeId: null,
    countryIssued: US_COUNTRY_CODE,
    documentNumber: "",
    issueDate: "",
    expirationDate: "",
    file: null,
  };
  showFieldErrors.value = false;
  fieldErrors.value = emptyFieldErrors();
  fileInputKey.value += 1;
};

const validateForm = () => {
  const errors = emptyFieldErrors();
  if (!form.value.documentTypeId) {
    errors.documentTypeId = "Document type is required.";
  }
  if (documentNumberRequired.value && !String(form.value.documentNumber || "").trim()) {
    errors.documentNumber = "Document number is required.";
  }
  if (!resolveCountryCode(form.value.countryIssued)) {
    errors.countryIssued = "Country issued is required.";
  }
  if (!form.value.issueDate) {
    errors.issueDate = "Issue date is required.";
  }
  if (!form.value.expirationDate) {
    errors.expirationDate = "Expiration date is required.";
  }
  fieldErrors.value = errors;
  return !Object.values(errors).some(Boolean);
};

watch(
  () => form.value.documentTypeId,
  () => {
    if (!documentNumberRequired.value) {
      form.value.documentNumber = "";
    }
    if (showFieldErrors.value) validateForm();
  }
);

watch(
  () => [
    form.value.documentNumber,
    form.value.countryIssued,
    form.value.issueDate,
    form.value.expirationDate,
  ],
  () => {
    if (showFieldErrors.value) validateForm();
  }
);

const load = async () => {
  if (!props.personId) {
    documents.value = [];
    return;
  }

  loading.value = true;
  message.value = "";
  try {
    const [docsRes, typesRes] = await Promise.all([
      PersonDocumentServices.getAll(props.personId),
      DocumentTypeServices.getAll(),
    ]);
    documents.value = docsRes.data || [];
    documentTypes.value = typesRes.data || [];
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load documents.";
  } finally {
    loading.value = false;
  }
};

const startEdit = (row) => {
  message.value = "";
  editingDocumentId.value = row.id;
  form.value = {
    documentTypeId: row.documentTypeId,
    countryIssued: row.countryIssued || US_COUNTRY_CODE,
    documentNumber: row.documentNumber || "",
    issueDate: row.issueDate || "",
    expirationDate: row.expirationDate || "",
    file: null,
  };
  showFieldErrors.value = false;
  fieldErrors.value = emptyFieldErrors();
  fileInputKey.value += 1;
};

const cancelEdit = () => {
  resetForm();
};

const saveDocument = async () => {
  message.value = "";
  showFieldErrors.value = true;
  if (!validateForm()) return;

  const payload = {
    documentTypeId: form.value.documentTypeId,
    documentNumber: documentNumberRequired.value
      ? String(form.value.documentNumber || "").trim()
      : null,
    countryIssued: resolveCountryCode(form.value.countryIssued) || null,
    issueDate: form.value.issueDate,
    expirationDate: form.value.expirationDate,
    file: form.value.file || undefined,
  };

  saving.value = true;
  try {
    if (isEditing.value) {
      await PersonDocumentServices.update(props.personId, editingDocumentId.value, payload);
    } else {
      await PersonDocumentServices.create(props.personId, {
        ...payload,
        file: form.value.file,
      });
    }
    resetForm();
    await load();
  } catch (e) {
    message.value =
      e.response?.data?.message ||
      (isEditing.value ? "Unable to update document." : "Unable to upload document.");
  } finally {
    saving.value = false;
  }
};

const downloadDocument = async (row) => {
  message.value = "";
  try {
    await PersonDocumentServices.download(props.personId, row);
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to download document.";
  }
};

const revokeViewUrl = () => {
  if (viewUrl.value) URL.revokeObjectURL(viewUrl.value);
  viewUrl.value = null;
};

const viewDocument = async (row) => {
  message.value = "";
  revokeViewUrl();
  viewRow.value = row;
  viewName.value = fileName(row);
  viewType.value = "";
  viewDialog.value = true;
  viewLoading.value = true;
  try {
    const { url, type } = await PersonDocumentServices.view(props.personId, row);
    viewUrl.value = url;
    viewType.value = type;
  } catch (e) {
    const heicError = e?.code != null || /heic|heif/i.test(String(e?.message || ""));
    message.value =
      e.response?.data?.message ||
      (heicError
        ? "Unable to preview this HEIC image. You can still download it."
        : "Unable to load document.");
    viewDialog.value = false;
  } finally {
    viewLoading.value = false;
  }
};

const closeView = () => {
  viewDialog.value = false;
  revokeViewUrl();
  viewRow.value = null;
};

const downloadFromView = () => {
  if (viewRow.value) downloadDocument(viewRow.value);
};

const removeDocument = async (row) => {
  if (!window.confirm(`Delete document "${fileName(row)}"?`)) return;
  message.value = "";
  try {
    await PersonDocumentServices.delete(props.personId, row.id);
    if (Number(editingDocumentId.value) === Number(row.id)) resetForm();
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to delete document.";
  }
};

watch(
  () => props.personId,
  () => {
    resetForm();
    load();
  }
);

onMounted(load);
</script>

<template>
  <div class="mt-4 mb-2">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="text-subtitle-2">Documents</div>
      <v-progress-circular v-if="loading" indeterminate size="18" width="2" />
    </div>

    <v-alert v-if="message" type="info" density="compact" class="mb-3">{{ message }}</v-alert>

    <v-table v-if="documents.length" density="compact" class="border rounded mb-3">
      <thead>
        <tr>
          <th>Type</th>
          <th>Document number</th>
          <th>Country issued</th>
          <th>Issue date</th>
          <th>Expiration date</th>
          <th>Document</th>
          <th class="text-right" style="width: 220px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in documents" :key="row.id">
          <td>{{ row.documentType?.description || row.documentTypeId }}</td>
          <td>{{ row.documentNumber || "—" }}</td>
          <td>{{ countryLabel(row.countryIssued) }}</td>
          <td>{{ row.issueDate || "—" }}</td>
          <td>{{ row.expirationDate }}</td>
          <td>
            <v-btn
              v-if="row.documentFileName"
              size="small"
              variant="text"
              @click="viewDocument(row)"
            >
              View
            </v-btn>
            <span v-else class="text-medium-emphasis">Need Document</span>
          </td>
          <td class="text-right">
            <v-btn size="small" variant="text" @click="startEdit(row)">Edit</v-btn>
            <v-btn size="small" variant="text" @click="downloadDocument(row)">Download</v-btn>
            <v-btn size="small" variant="text" color="error" @click="removeDocument(row)">
              Delete
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <p v-else class="text-body-2 text-medium-emphasis mb-3">No documents uploaded yet.</p>

    <div class="add-document-form pa-4 rounded mb-2">
      <div class="text-subtitle-2 mb-3">{{ formTitle }}</div>
      <v-alert
        v-if="selectedInstructions"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3 document-instructions"
        style="white-space: pre-wrap"
      >
        {{ selectedInstructions }}
      </v-alert>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-select
            v-model="form.documentTypeId"
            :items="documentTypeItems"
            label="Document type"
            density="compact"
            :disabled="!documentTypeItems.length"
            :error-messages="fieldErrors.documentTypeId"
          />
        </v-col>
        <v-col v-if="documentNumberRequired" cols="12" sm="6">
          <v-text-field
            v-model="form.documentNumber"
            label="Document number"
            density="compact"
            autocomplete="off"
            :error-messages="fieldErrors.documentNumber"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <CountrySelect
            v-model="form.countryIssued"
            label="Country issued"
            default-empty-to-us
            :error-messages="fieldErrors.countryIssued"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.issueDate"
            label="Issue date"
            type="date"
            density="compact"
            :error-messages="fieldErrors.issueDate"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.expirationDate"
            label="Expiration date"
            type="date"
            density="compact"
            :error-messages="fieldErrors.expirationDate"
          />
        </v-col>
      </v-row>

      <v-file-input
        :key="fileInputKey"
        label="Upload document (optional)"
        accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif"
        density="compact"
        prepend-icon="mdi-file-document"
        show-size
        clearable
        :hint="
          isEditing
            ? 'Leave empty to keep the current file (or none). PDF, JPG, PNG, or HEIC'
            : 'Optional. PDF, JPG, PNG, or HEIC'
        "
        persistent-hint
        class="mb-2"
        :error-messages="fieldErrors.file"
        @update:model-value="onFileSelected"
      />

      <div class="d-flex ga-2">
        <v-btn
          color="primary"
          size="small"
          :loading="saving"
          :disabled="!props.personId || !documentTypeItems.length"
          @click="saveDocument"
        >
          {{ saveButtonLabel }}
        </v-btn>
        <v-btn v-if="isEditing" variant="text" size="small" :disabled="saving" @click="cancelEdit">
          Cancel
        </v-btn>
      </div>
    </div>

    <v-dialog :model-value="viewDialog" max-width="900" @update:model-value="(v) => !v && closeView()">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span class="text-truncate">{{ viewName || "Document" }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeView" />
        </v-card-title>
        <v-card-text>
          <div v-if="viewLoading" class="d-flex justify-center py-8">
            <v-progress-circular indeterminate />
          </div>
          <template v-else-if="viewUrl">
            <iframe
              v-if="viewKind === 'pdf'"
              :src="viewUrl"
              title="Document"
              style="width: 100%; height: 70vh; border: 0"
            />
            <v-img
              v-else-if="viewKind === 'image'"
              :src="viewUrl"
              alt="Document"
              max-height="70vh"
              contain
            />
            <div v-else class="text-body-2 py-6 text-center">
              This file type can't be previewed in the browser.
              <div class="mt-3">
                <v-btn color="primary" size="small" @click="downloadFromView">Download</v-btn>
              </div>
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="downloadFromView">Download</v-btn>
          <v-btn variant="text" @click="closeView">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.add-document-form {
  background-color: #f0f0f0;
}
</style>
