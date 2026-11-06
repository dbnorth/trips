<script setup>
import { ref, computed, watch } from "vue";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import ReviewDocumentEditSection from "./ReviewDocumentEditSection.vue";
import { formatDate } from "../utils/dateFormat.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  participant: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "closed"]);

const review = ref(null);
const loading = ref(false);
const savingId = ref(null);
const message = ref("");
const viewDialog = ref(false);
const viewLoading = ref(false);
const viewUrl = ref(null);
const viewType = ref("");
const viewName = ref("");
const viewDoc = ref(null);
const viewSpecialization = ref(null);
/** The open section under the document-data line: "edit", "reload", or null. */
const viewSection = ref(null);
const viewNotice = ref(null);
const reloadNote = ref("");
const reloadSending = ref(false);
const reloadError = ref("");
const RELOAD_NOTE_MAX = 1000;

const viewKind = computed(() => {
  const type = (viewType.value || "").toLowerCase();
  if (type.includes("pdf")) return "pdf";
  if (type.startsWith("image/")) return "image";
  return "unsupported";
});

const participantName = computed(() => {
  const p = props.participant?.person;
  return p ? [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").trim() : "";
});

const firstName = computed(() => props.participant?.person?.firstName || "this participant");

const requirements = computed(() => review.value?.requirements || []);

const specializationSpots = (requirement, doc) =>
  (requirement.requiredSpecializations || []).map((required) => ({
    required,
    specialization: (doc.specializations || []).find(
      (s) => Number(s.documentTypeSpecializationId) === Number(required.id)
    ),
  }));

const load = async () => {
  if (!props.participant?.id) return;
  loading.value = true;
  message.value = "";
  try {
    review.value = (await TripPeopleRoleServices.documentReview(props.participant.id)).data;
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load documents.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.participant?.id],
  ([open]) => {
    review.value = null;
    if (open) load();
  },
  { immediate: true }
);

const setReviewed = async (doc, reviewed) => {
  savingId.value = doc.id;
  message.value = "";
  try {
    await TripPeopleRoleServices.setDocumentReviewed(props.participant.id, doc.id, reviewed);
    doc.reviewed = reviewed;
    if (reviewed) doc.reloadRequestedAt = null;
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to save Reviewed.";
  } finally {
    savingId.value = null;
  }
};

const revokeViewUrl = () => {
  if (viewUrl.value) URL.revokeObjectURL(viewUrl.value);
  viewUrl.value = null;
};

const viewDocument = async (doc, specialization = null) => {
  message.value = "";
  viewName.value = specialization
    ? `${doc.description || "Document"} — ${specialization.name}`
    : doc.description || "Document";
  viewDoc.value = doc;
  viewSpecialization.value = specialization;
  viewSection.value = null;
  viewNotice.value = null;
  viewDialog.value = true;
  await loadViewFile(doc, specialization);
};

const loadViewFile = async (doc, specialization = null) => {
  revokeViewUrl();
  viewType.value = "";
  viewLoading.value = true;
  try {
    const response = specialization
      ? await TripPeopleRoleServices.viewSpecialization(props.participant.id, doc.id, specialization.id)
      : await TripPeopleRoleServices.viewDocument(props.participant.id, doc.id);
    viewType.value = response.data?.type || response.headers?.["content-type"] || "";
    viewUrl.value = URL.createObjectURL(response.data);
  } catch (e) {
    message.value = e.response?.data?.message || "Unable to load document.";
    viewDialog.value = false;
  } finally {
    viewLoading.value = false;
  }
};

const closeView = () => {
  viewDialog.value = false;
  viewDoc.value = null;
  viewSpecialization.value = null;
  viewSection.value = null;
  viewNotice.value = null;
  revokeViewUrl();
};

const findReviewDocument = (id) => {
  for (const requirement of requirements.value) {
    const doc = requirement.documents.find((row) => Number(row.id) === Number(id));
    if (doc) return doc;
  }
  return null;
};

const openSection = (section) => {
  viewNotice.value = null;
  reloadNote.value = "";
  reloadError.value = "";
  viewSection.value = section;
};

const onEditSaved = async ({ fileReplaced }) => {
  const id = viewDoc.value.id;
  viewSection.value = null;
  await load();
  const updated = findReviewDocument(id);
  if (updated) {
    viewDoc.value = updated;
    viewName.value = updated.description || "Document";
  }
  viewNotice.value = { type: "success", text: "Document saved." };
  if (fileReplaced) await loadViewFile(viewDoc.value);
};

const reloadNotice = ({ emailSent, templateFound }) => {
  const person = props.participant?.person;
  if (emailSent) {
    const name = [person?.firstName, person?.lastName].filter(Boolean).join(" ");
    return { type: "success", text: `Reload requested. Email sent to ${name}.` };
  }
  const hint = templateFound ? "" : " Add a Send Now template for the Document reload requested email type.";
  return { type: "warning", text: `Reload requested. No email was sent.${hint}` };
};

const sendReloadRequest = async () => {
  if (reloadNote.value.length > RELOAD_NOTE_MAX) {
    reloadError.value = "Note must be 1000 characters or less.";
    return;
  }
  reloadSending.value = true;
  reloadError.value = "";
  try {
    const { data } = await TripPeopleRoleServices.requestDocumentReload(
      props.participant.id,
      viewDoc.value.id,
      reloadNote.value.trim()
    );
    viewDoc.value.reviewed = false;
    viewDoc.value.reloadRequestedAt = data.reloadRequestedAt;
    viewSection.value = null;
    viewNotice.value = reloadNotice(data);
  } catch (e) {
    reloadError.value = e.response?.data?.message || "Unable to request a reload.";
  } finally {
    reloadSending.value = false;
  }
};

const close = () => {
  closeView();
  emit("update:modelValue", false);
  emit("closed");
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="720" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Review documents — {{ participantName }}</v-card-title>
      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-3" />

        <template v-else-if="review">
          <p class="text-body-2 mb-3" data-testid="review-role">
            <strong>Role:</strong> {{ review.workerRoleName || "—" }}
          </p>
          <p v-if="!requirements.length" class="text-body-2 text-medium-emphasis">
            This trip has no required documents for {{ firstName }}.
          </p>

          <div
            v-for="requirement in requirements"
            :key="requirement.key"
            class="mb-4"
            data-testid="review-requirement"
          >
            <div class="text-subtitle-2 font-weight-bold mb-2">{{ requirement.label }}</div>
            <p
              v-if="!requirement.documents.length"
              class="text-body-2 text-medium-emphasis border rounded px-3 py-2"
            >
              Not uploaded
            </p>
            <div
              v-for="doc in requirement.documents"
              :key="doc.id"
              class="border rounded px-3 py-2 mb-2"
              data-testid="review-document"
            >
              <div class="d-flex align-center flex-wrap ga-3">
                <div class="d-flex flex-column flex-grow-1">
                  <span class="font-weight-medium">
                    {{ doc.description }}
                    <v-chip
                      v-if="doc.current"
                      size="x-small"
                      color="primary"
                      class="ml-2"
                      data-testid="review-current-document"
                    >
                      Used for this trip
                    </v-chip>
                  </span>
                  <span class="text-body-2 text-medium-emphasis">
                    <span v-if="doc.documentNumber">{{ doc.documentNumber }}</span>
                    <span v-if="doc.documentNumber && doc.expirationDate"> · </span>
                    <span v-if="doc.expirationDate">expires {{ formatDate(doc.expirationDate) }}</span>
                  </span>
                  <span
                    v-if="doc.reloadRequestedAt"
                    class="text-body-2 text-warning"
                    data-testid="document-reload-requested"
                  >
                    Reload requested {{ formatDate(doc.reloadRequestedAt) }}
                  </span>
                </div>
                <v-btn
                  v-if="doc.hasFile"
                  size="small"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-eye"
                  @click="viewDocument(doc)"
                >
                  View
                </v-btn>
                <span v-else class="text-medium-emphasis">No file</span>
                <v-checkbox
                  :model-value="doc.reviewed"
                  label="Reviewed"
                  density="compact"
                  hide-details
                  class="flex-grow-0"
                  :disabled="!doc.hasFile || savingId === doc.id"
                  @update:model-value="(value) => setReviewed(doc, !!value)"
                />
              </div>
              <div
                v-if="requirement.requiredSpecializations?.length"
                class="mt-2 pt-2 border-t"
              >
                <div class="text-caption text-medium-emphasis mb-1">Required specializations</div>
                <div
                  v-for="spot in specializationSpots(requirement, doc)"
                  :key="spot.required.id"
                  class="d-flex align-center flex-wrap ga-3 py-1 pl-3"
                  data-testid="review-specialization"
                >
                  <span class="flex-grow-1">
                    {{ spot.required.name }}
                    <span v-if="spot.specialization?.date" class="text-body-2 text-medium-emphasis">
                      · {{ formatDate(spot.specialization.date) }}
                    </span>
                  </span>
                  <v-btn
                    v-if="spot.specialization?.hasFile"
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-eye"
                    @click="viewDocument(doc, spot.specialization)"
                  >
                    View
                  </v-btn>
                  <span v-else class="text-body-2 text-medium-emphasis">Not added</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <v-alert v-if="message" type="error" density="compact" class="mt-3">{{ message }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="tonal" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog :model-value="viewDialog" max-width="900" @update:model-value="(v) => !v && closeView()">
    <v-card data-testid="review-document-view">
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-truncate">{{ viewName }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close document" @click="closeView" />
      </v-card-title>
      <v-card-text>
        <div
          v-if="viewSpecialization"
          class="d-flex flex-wrap ga-4 text-body-2 mb-3"
          data-testid="review-document-details"
        >
          <span><strong>Specialization date:</strong> {{ formatDate(viewSpecialization.date) || "—" }}</span>
        </div>
        <template v-else-if="viewDoc">
          <div class="d-flex flex-wrap align-center ga-4 mb-3">
            <div class="d-flex flex-wrap ga-4 text-body-2" data-testid="review-document-details">
              <span v-if="viewDoc.documentNumberRequired">
                <strong>Document number:</strong> {{ viewDoc.documentNumber || "—" }}
              </span>
              <span><strong>Issue date:</strong> {{ formatDate(viewDoc.issueDate) || "—" }}</span>
              <span v-if="viewDoc.hasExpirationDate">
                <strong>Expiration date:</strong> {{ formatDate(viewDoc.expirationDate) || "—" }}
              </span>
            </div>
            <div class="ml-auto d-flex align-center ga-2">
              <v-btn
                size="small"
                variant="tonal"
                prepend-icon="mdi-pencil"
                :disabled="viewDoc.reviewed"
                data-testid="review-document-edit"
                @click="openSection('edit')"
              >
                Edit
              </v-btn>
              <v-btn
                size="small"
                variant="tonal"
                color="warning"
                prepend-icon="mdi-file-upload-outline"
                data-testid="review-document-reload"
                @click="openSection('reload')"
              >
                Request reload
              </v-btn>
            </div>
          </div>
          <p
            v-if="viewDoc.reviewed"
            class="text-caption text-medium-emphasis mt-n2 mb-3"
            data-testid="review-document-edit-hint"
          >
            Untick Reviewed to edit.
          </p>
          <ReviewDocumentEditSection
            v-if="viewSection === 'edit'"
            :key="viewDoc.id"
            :assignment-id="participant.id"
            :document="viewDoc"
            :document-types="review?.documentTypes || []"
            @close="viewSection = null"
            @saved="onEditSaved"
          />
          <div
            v-else-if="viewSection === 'reload'"
            class="border rounded pa-3 mb-3"
            data-testid="review-document-reload-section"
          >
            <v-textarea
              v-model="reloadNote"
              label="Note to participant"
              rows="3"
              auto-grow
              density="compact"
              :counter="RELOAD_NOTE_MAX"
              hint="Optional. Included in the email."
              persistent-hint
              data-testid="review-reload-note"
            />
            <v-alert v-if="reloadError" type="error" density="compact" class="mt-2">{{ reloadError }}</v-alert>
            <div class="d-flex justify-end ga-2 mt-2">
              <v-btn variant="text" :disabled="reloadSending" @click="viewSection = null">Close</v-btn>
              <v-btn
                color="primary"
                :loading="reloadSending"
                data-testid="review-reload-send"
                @click="sendReloadRequest"
              >
                Send request
              </v-btn>
            </div>
          </div>
          <v-alert
            v-if="viewNotice"
            :type="viewNotice.type"
            density="compact"
            class="mb-3"
            data-testid="review-document-notice"
          >
            {{ viewNotice.text }}
          </v-alert>
        </template>
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
          <v-img v-else-if="viewKind === 'image'" :src="viewUrl" alt="Document" max-height="70vh" contain />
          <div v-else class="text-body-2 py-6 text-center">
            This file type can't be previewed in the browser.
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="tonal" @click="closeView">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
