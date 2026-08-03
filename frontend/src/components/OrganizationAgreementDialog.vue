<script setup>
import { ref, computed, watch } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import { markdownToHtml } from "../utils/markdownPreview.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  organizationId: { type: [Number, String], default: null },
  organizationName: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const formError = ref("");
const formNotice = ref("");
const mode = ref("edit");
const content = ref("");
const agreementFileName = ref(null);
const exists = ref(false);
const dirty = ref(false);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const title = computed(() =>
  props.organizationName
    ? `Participant agreement — ${props.organizationName}`
    : "Participant agreement"
);

const previewHtml = computed(() => markdownToHtml(content.value));

const load = async () => {
  if (!props.organizationId) return;
  loading.value = true;
  formError.value = "";
  formNotice.value = "";
  mode.value = "edit";
  dirty.value = false;
  try {
    const res = await OrganizationServices.getAgreement(props.organizationId);
    content.value = res.data?.content || "";
    agreementFileName.value = res.data?.agreementFileName || null;
    exists.value = !!res.data?.exists;
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load agreement.";
    content.value = "";
    agreementFileName.value = null;
    exists.value = false;
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.organizationId],
  ([visible]) => {
    if (visible && props.organizationId) load();
  }
);

const onContentInput = (value) => {
  content.value = value ?? "";
  dirty.value = true;
};

const close = () => {
  open.value = false;
};

const save = async () => {
  formError.value = "";
  formNotice.value = "";
  saving.value = true;
  try {
    const res = await OrganizationServices.saveAgreement(props.organizationId, content.value);
    agreementFileName.value = res.data?.agreementFileName || agreementFileName.value;
    exists.value = true;
    dirty.value = false;
    emit("saved", res.data);
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to save agreement.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="800" scrollable persistent>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>{{ title }}</span>
        <v-btn-toggle v-model="mode" mandatory density="compact" color="primary" variant="outlined">
          <v-btn value="edit" size="small">Edit</v-btn>
          <v-btn value="view" size="small">View</v-btn>
        </v-btn-toggle>
      </v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading">
          <div class="text-caption text-medium-emphasis mb-2">
            <span v-if="exists && agreementFileName">Latest version: {{ agreementFileName }}</span>
            <span v-else>No agreement file saved yet. Enter Markdown and save.</span>
            <span v-if="dirty" class="ml-2">· Unsaved changes</span>
          </div>

          <v-textarea
            v-if="mode === 'edit'"
            :model-value="content"
            label="Agreement (Markdown)"
            auto-grow
            rows="16"
            density="compact"
            hint="Markdown supported. For bullets use a hyphen then text, e.g. - Item (space after - is optional)"
            persistent-hint
            @update:model-value="onContentInput"
          />

          <div v-else class="agreement-preview pa-4 rounded">
            <div v-if="content.trim()" class="agreement-html" v-html="previewHtml" />
            <div v-else class="text-body-2 text-medium-emphasis">No agreement content to preview.</div>
          </div>
        </template>

        <v-alert v-if="formNotice" type="success" density="compact" class="mt-3">{{ formNotice }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-3">{{ formError }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Close</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="loading" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.agreement-preview {
  background: rgba(0, 0, 0, 0.04);
  min-height: 280px;
  max-height: 55vh;
  overflow: auto;
}

.agreement-html :deep(h1) {
  font-size: 1.4rem;
  margin: 0 0 0.75rem;
}

.agreement-html :deep(h2) {
  font-size: 1.2rem;
  margin: 1.25rem 0 0.5rem;
}

.agreement-html :deep(h3) {
  font-size: 1.05rem;
  margin: 1rem 0 0.4rem;
}

.agreement-html :deep(p) {
  margin: 0 0 0.75rem;
  line-height: 1.5;
}

.agreement-html :deep(ul),
.agreement-html :deep(ol) {
  margin: 0 0 0.75rem;
  padding-left: 1.5rem;
  list-style-position: outside;
}

.agreement-html :deep(ul) {
  list-style-type: disc;
}

.agreement-html :deep(ol) {
  list-style-type: decimal;
}

.agreement-html :deep(li) {
  margin: 0 0 0.35rem;
  display: list-item;
}

.agreement-html :deep(hr) {
  margin: 1rem 0;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.16);
}

.agreement-html :deep(a),
.agreement-html :deep(a.agreement-link) {
  color: #1565c0 !important;
  text-decoration: underline !important;
  cursor: pointer;
  word-break: break-all;
}

.agreement-html :deep(a:hover) {
  color: #0d47a1 !important;
}
</style>

<style>
.agreement-html a.agreement-link {
  color: #1565c0 !important;
  text-decoration: underline !important;
  cursor: pointer;
  word-break: break-all;
}
</style>
