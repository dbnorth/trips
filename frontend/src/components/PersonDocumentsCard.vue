<script setup>
import { computed, onMounted, ref, watch } from "vue";
import DocumentTypeServices from "../services/documentTypeServices.js";
import PersonDocumentServices from "../services/personDocumentServices.js";
import CountrySelect from "./CountrySelect.vue";
import { countryName, resolveCountryCode } from "../utils/locationData.js";

const props = defineProps({
  personId: { type: [Number, String], default: null },
});

const documents = ref([]);
const documentTypes = ref([]);
const loading = ref(false);
const saving = ref(false);
const message = ref("");
const fileInputKey = ref(0);
const form = ref({
  documentTypeId: null,
  countryIssued: "",
  issueDate: "",
  expirationDate: "",
  file: null,
});

const viewDialog = ref(false);
const viewLoading = ref(false);
const viewUrl = ref(null);
const viewType = ref("");
const viewName = ref("");
const viewRow = ref(null);

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

const fileName = (row) => String(row.documentFileName || "").split("/").pop() || "Document";

const countryLabel = (code) => countryName(code) || code || "—";

const onFileSelected = (files) => {
  form.value.file = Array.isArray(files) ? files[0] : files || null;
};

const resetForm = () => {
  form.value = {
    documentTypeId: null,
    countryIssued: "",
    issueDate: "",
    expirationDate: "",
    file: null,
  };
  fileInputKey.value += 1;
};

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

const addDocument = async () => {
  message.value = "";
  if (!form.value.documentTypeId) {
    message.value = "Document type is required.";
    return;
  }
  if (!form.value.expirationDate) {
    message.value = "Expiration date is required.";
    return;
  }
  if (!form.value.file) {
    message.value = "Document file is required.";
    return;
  }

  saving.value = true;
  try {
    await PersonDocumentServices.create(props.personId, {
      ...form.value,
      countryIssued: resolveCountryCode(form.value.countryIssued) || null,
    });
    resetForm();
    await load();
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to upload document.";
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
          <th>Country issued</th>
          <th>Issue date</th>
          <th>Expiration date</th>
          <th>File name</th>
          <th class="text-right" style="width: 220px">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in documents" :key="row.id">
          <td>{{ row.documentType?.description || row.documentTypeId }}</td>
          <td>{{ countryLabel(row.countryIssued) }}</td>
          <td>{{ row.issueDate || "—" }}</td>
          <td>{{ row.expirationDate }}</td>
          <td>{{ fileName(row) }}</td>
          <td class="text-right">
            <v-btn size="small" variant="text" @click="viewDocument(row)">View</v-btn>
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
      <div class="text-subtitle-2 mb-3">Add Document</div>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-select
            v-model="form.documentTypeId"
            :items="documentTypeItems"
            label="Document type"
            density="compact"
            :disabled="!documentTypeItems.length"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <CountrySelect v-model="form.countryIssued" label="Country issued" />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.issueDate"
            label="Issue date"
            type="date"
            density="compact"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.expirationDate"
            label="Expiration date"
            type="date"
            density="compact"
          />
        </v-col>
      </v-row>

      <v-file-input
        :key="fileInputKey"
        label="Upload document"
        accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif"
        density="compact"
        prepend-icon="mdi-file-document"
        show-size
        clearable
        hint="PDF, JPG, PNG, or HEIC"
        persistent-hint
        class="mb-2"
        @update:model-value="onFileSelected"
      />

      <v-btn
        color="primary"
        size="small"
        :loading="saving"
        :disabled="!props.personId || !documentTypeItems.length"
        @click="addDocument"
      >
        Add document
      </v-btn>
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
