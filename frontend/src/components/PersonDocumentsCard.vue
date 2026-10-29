<script setup>
import { computed, onMounted, ref, watch } from "vue";
import DocumentTypeServices from "../services/documentTypeServices.js";
import PersonDocumentServices from "../services/personDocumentServices.js";
import CountrySelect from "./CountrySelect.vue";
import { countryName, resolveCountryCode, US_COUNTRY_CODE } from "../utils/locationData.js";
import { pdfFirstPageUrl } from "../utils/pdfThumbnail.js";

const props = defineProps({
  personId: { type: [Number, String], default: null },
  orgId: { type: [Number, String], default: null },
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
  specializations: [],
});

const emptyFieldErrors = () => ({
  documentTypeId: "",
  documentNumber: "",
  countryIssued: "",
  issueDate: "",
  expirationDate: "",
  file: "",
  specializations: "",
});

const fieldErrors = ref(emptyFieldErrors());

const viewDialog = ref(false);
const viewLoading = ref(false);
const viewUrl = ref(null);
const viewType = ref("");
const viewName = ref("");
const viewRow = ref(null);
const viewSpecialization = ref(null);
const formDialog = ref(false);

const isEditing = computed(() => editingDocumentId.value != null);
const formTitle = computed(() => (isEditing.value ? "Edit Document" : "Add Document"));

const viewKind = computed(() => {
  const type = (viewType.value || "").toLowerCase();
  const name = (viewName.value || "").toLowerCase();
  if (type.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/.test(name)) return "image";
  return "unsupported";
});

/** The person's organizations' types, plus the type of the document being edited when it isn't one of them. */
const offeredDocumentTypes = computed(() => {
  const editing = documents.value.find((row) => Number(row.id) === Number(editingDocumentId.value));
  const own = editing?.documentType;
  if (!own || documentTypes.value.some((row) => Number(row.id) === Number(own.id))) {
    return documentTypes.value;
  }
  return [...documentTypes.value, own];
});

const showOrganizationNames = computed(
  () => new Set(documentTypes.value.map((row) => Number(row.orgId))).size > 1
);

const documentTypeItems = computed(() =>
  offeredDocumentTypes.value.map((row) => ({
    title:
      showOrganizationNames.value && row.organization?.name
        ? `${row.description} (${row.organization.name})`
        : row.description,
    value: row.id,
  }))
);

const selectedDocumentType = computed(
  () =>
    offeredDocumentTypes.value.find((row) => Number(row.id) === Number(form.value.documentTypeId)) ||
    null
);

const uploadLabel = computed(() => {
  const name = selectedDocumentType.value?.description;
  return name ? `Upload ${name}` : "Upload document";
});

const selectedInstructions = computed(() => {
  const text = selectedDocumentType.value?.instructions;
  return text && String(text).trim() ? String(text) : "";
});

const documentNumberRequired = computed(
  () => !!selectedDocumentType.value?.documentNumberRequired
);

const allowSpecialization = computed(() => !!selectedDocumentType.value?.allowSpecialization);

const hasExpirationDate = computed(() => selectedDocumentType.value?.hasExpirationDate !== false);

const specializationOptions = computed(() => selectedDocumentType.value?.specializations || []);

/** The type's list minus names already chosen on other rows of this document. */
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

const allSpecializationsUsed = computed(
  () => form.value.specializations.length >= specializationOptions.value.length
);

let specializationKey = 0;
const newSpecialization = (row = {}) => ({
  key: row.id || `new-${++specializationKey}`,
  id: row.id || null,
  documentTypeSpecializationId: row.documentTypeSpecializationId || null,
  date: row.date || "",
  file: null,
});

const fileName = (row) => String(row.documentFileName || "").split("/").pop() || "Document";

/** The saved file shown in the Edit Document dialog: `state` is none, loading, image, or unavailable. */
const thumbnail = ref(null);
let thumbnailRequest = 0;

const revokeThumbnail = () => {
  thumbnailRequest += 1;
  if (thumbnail.value?.url) URL.revokeObjectURL(thumbnail.value.url);
  thumbnail.value = null;
};

const loadThumbnail = async (row) => {
  revokeThumbnail();
  if (!row.documentFileName) {
    thumbnail.value = { row, state: "none" };
    return;
  }
  const request = thumbnailRequest;
  const name = fileName(row).replace(/^person-\d+-\d+-/, "");
  thumbnail.value = { row, name, state: "loading" };
  let url = null;
  try {
    if (/\.(heic|heif)$/i.test(name)) throw new Error("HEIC can't be previewed.");
    const view = await PersonDocumentServices.view(props.personId, row);
    if (/pdf/i.test(view.type) || /\.pdf$/i.test(name)) {
      try {
        url = await pdfFirstPageUrl(view.url);
      } finally {
        URL.revokeObjectURL(view.url);
      }
    } else if (/^image\//i.test(view.type) || /\.(jpe?g|png|gif|webp)$/i.test(name)) {
      url = view.url;
    } else {
      URL.revokeObjectURL(view.url);
      throw new Error("This file type can't be previewed.");
    }
    if (request !== thumbnailRequest) {
      URL.revokeObjectURL(url);
      return;
    }
    thumbnail.value = { row, name, state: "image", url };
  } catch {
    if (request === thumbnailRequest) thumbnail.value = { row, name, state: "unavailable" };
  }
};

const countryLabel = (code) => countryName(code) || code || "—";

const onFileSelected = (files) => {
  form.value.file = Array.isArray(files) ? files[0] : files || null;
  if (showFieldErrors.value) validateForm();
};

const onSpecializationFile = (index, files) => {
  form.value.specializations[index].file = Array.isArray(files) ? files[0] : files || null;
  if (showFieldErrors.value) validateForm();
};

const addSpecialization = () => {
  form.value.specializations.push(newSpecialization());
};

const removeSpecialization = (index) => {
  form.value.specializations.splice(index, 1);
  if (showFieldErrors.value) validateForm();
};

const resetForm = () => {
  formDialog.value = false;
  editingDocumentId.value = null;
  revokeThumbnail();
  form.value = {
    documentTypeId: null,
    countryIssued: US_COUNTRY_CODE,
    documentNumber: "",
    issueDate: "",
    expirationDate: "",
    file: null,
    specializations: [],
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
  if (hasExpirationDate.value && !form.value.expirationDate) {
    errors.expirationDate = "Expiration date is required.";
  }
  if (allowSpecialization.value) {
    const incomplete = form.value.specializations.some(
      (row) => !row.documentTypeSpecializationId || !row.date || (!row.file && !row.id)
    );
    if (incomplete) {
      errors.specializations = "Each specialization needs a name, a date, and a file.";
    }
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
    documentTypes.value = [];
    if (props.orgId) {
      try {
        documentTypes.value = (await DocumentTypeServices.getAll({ orgId: props.orgId })).data || [];
      } catch {
        documentTypes.value = [];
      }
    }
    return;
  }

  loading.value = true;
  message.value = "";
  try {
    const [docsRes, typesRes] = await Promise.all([
      PersonDocumentServices.getAll(props.personId),
      DocumentTypeServices.getAll({ personId: props.personId }),
    ]);
    documents.value = docsRes.data || [];
    documentTypes.value = typesRes.data || [];
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load documents.";
  } finally {
    loading.value = false;
  }
};

const openAdd = () => {
  resetForm();
  formDialog.value = true;
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
    specializations: (row.specializations || []).map((item) => newSpecialization(item)),
  };
  showFieldErrors.value = false;
  fieldErrors.value = emptyFieldErrors();
  fileInputKey.value += 1;
  formDialog.value = true;
  loadThumbnail(row);
};

const closeForm = () => {
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
    payload.specializationFiles = form.value.specializations
      .filter((row) => row.file)
      .map((row) => row.file);
  }

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

const downloadDocument = async (row, specialization = null) => {
  message.value = "";
  try {
    await PersonDocumentServices.download(props.personId, row, specialization);
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to download document.";
  }
};

const revokeViewUrl = () => {
  if (viewUrl.value) URL.revokeObjectURL(viewUrl.value);
  viewUrl.value = null;
};

const viewDocument = async (row, specialization = null) => {
  message.value = "";
  revokeViewUrl();
  if (/\.(heic|heif)$/i.test(specialization?.documentFileName || row.documentFileName || "")) {
    message.value = "This HEIC file can't be previewed. You can still download it.";
    return;
  }
  viewRow.value = row;
  viewSpecialization.value = specialization;
  viewName.value = specialization?.name || fileName(row);
  viewType.value = "";
  viewDialog.value = true;
  viewLoading.value = true;
  try {
    const { url, type } = await PersonDocumentServices.view(props.personId, row, specialization);
    viewUrl.value = url;
    viewType.value = type;
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load document.";
    viewDialog.value = false;
  } finally {
    viewLoading.value = false;
  }
};

const closeView = () => {
  viewDialog.value = false;
  revokeViewUrl();
  viewRow.value = null;
  viewSpecialization.value = null;
};

const downloadFromView = () => {
  if (viewRow.value) downloadDocument(viewRow.value, viewSpecialization.value);
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
  () => [props.personId, props.orgId],
  () => {
    resetForm();
    load();
  }
);

onMounted(load);
</script>

<template>
  <div class="mt-4 mb-2">
    <v-divider class="person-section-rule" />
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="text-subtitle-2 font-weight-bold">Documents</div>
      <div class="d-flex align-center ga-2">
        <v-btn size="small" color="primary" :disabled="!props.personId" @click="openAdd">
          Add Document
        </v-btn>
        <v-progress-circular v-if="loading" indeterminate size="18" width="2" />
      </div>
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
        <template v-for="row in documents" :key="row.id">
        <tr>
          <td>{{ row.documentType?.description || row.documentTypeId }}</td>
          <td>{{ row.documentNumber || "—" }}</td>
          <td>{{ countryLabel(row.countryIssued) }}</td>
          <td>{{ row.issueDate || "—" }}</td>
          <td>{{ row.expirationDate || "—" }}</td>
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
        <tr v-if="row.specializations?.length">
          <td colspan="7">
            <div
              v-for="spec in row.specializations"
              :key="spec.id"
              class="d-flex align-center py-1"
            >
              <span>{{ spec.name }}</span>
              <span class="ms-4">{{ spec.date }}</span>
              <span class="ms-auto">
                <v-btn size="small" variant="text" @click="viewDocument(row, spec)">View</v-btn>
                <v-btn size="small" variant="text" @click="downloadDocument(row, spec)">Download</v-btn>
              </span>
            </div>
          </td>
        </tr>
        </template>
      </tbody>
    </v-table>

    <p v-else class="text-body-2 text-medium-emphasis mb-3">No documents</p>

    <v-dialog
      :model-value="formDialog"
      max-width="720"
      @update:model-value="(v) => !v && closeForm()"
    >
      <v-card v-if="formDialog">
      <v-card-title>{{ formTitle }}</v-card-title>
      <v-card-text>
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
        <v-col v-if="hasExpirationDate" cols="12" sm="6">
          <v-text-field
            v-model="form.expirationDate"
            label="Expiration date"
            type="date"
            density="compact"
            :error-messages="fieldErrors.expirationDate"
          />
        </v-col>
      </v-row>

      <div v-if="thumbnail" class="mb-3" data-testid="current-file">
        <div class="text-subtitle-2 mb-1">Current file</div>
        <div v-if="thumbnail.state === 'none'" class="text-body-2 text-medium-emphasis">
          No file uploaded
        </div>
        <div v-else-if="thumbnail.state === 'loading'" class="document-thumbnail d-flex align-center justify-center">
          <v-progress-circular indeterminate size="24" />
        </div>
        <template v-else>
          <button
            type="button"
            class="document-thumbnail"
            :aria-label="`View ${thumbnail.name}`"
            data-testid="current-file-thumbnail"
            @click="viewDocument(thumbnail.row)"
          >
            <img v-if="thumbnail.state === 'image'" :src="thumbnail.url" alt="Current file" />
            <span v-else class="d-flex flex-column align-center justify-center h-100 px-3">
              <v-icon icon="mdi-file-document-outline" size="36" />
              <span class="text-caption">Preview not available</span>
            </span>
          </button>
          <div class="text-caption">{{ thumbnail.name }}</div>
        </template>
      </div>

      <v-file-input
        :key="fileInputKey"
        :label="uploadLabel"
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

      <div v-if="allowSpecialization" class="mb-3">
        <div class="text-subtitle-2 mb-2">Specializations</div>
        <div
          v-for="(spec, index) in form.specializations"
          :key="spec.key"
          class="mb-3"
        >
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
              <v-btn size="small" variant="text" color="error" @click="removeSpecialization(index)">
                Delete
              </v-btn>
            </v-col>
          </v-row>
          <v-file-input
            label="Upload Specialization Document"
            accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif"
            density="compact"
            prepend-icon="mdi-file-document"
            show-size
            clearable
            :hint="spec.id ? 'Leave empty to keep the current file' : 'PDF, JPG, PNG, or HEIC'"
            persistent-hint
            @update:model-value="(files) => onSpecializationFile(index, files)"
          />
        </div>
        <div v-if="fieldErrors.specializations" class="text-error text-caption mb-2">
          {{ fieldErrors.specializations }}
        </div>
        <v-btn
          size="small"
          color="primary"
          :disabled="allSpecializationsUsed"
          @click="addSpecialization"
        >
          Add specialization
        </v-btn>
      </div>

      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="closeForm">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="!props.personId || !documentTypeItems.length"
          @click="saveDocument"
        >
          Save
        </v-btn>
      </v-card-actions>
      </v-card>
    </v-dialog>

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
.person-section-rule {
  margin: 16px -16px 12px;
  opacity: 1;
}

.document-thumbnail {
  height: 120px;
  min-width: 90px;
  max-width: 100%;
  padding: 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.document-thumbnail img {
  display: block;
  height: 100%;
  max-width: 100%;
  object-fit: contain;
}
</style>

