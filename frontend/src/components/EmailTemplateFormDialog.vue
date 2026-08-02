<script setup>
import { ref, computed, watch } from "vue";
import EmailTemplateServices from "../services/emailTemplateServices.js";
import TripServices from "../services/tripServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  templateId: { type: [Number, String], default: null },
  orgId: { type: [Number, String], default: null },
  allowGlobal: { type: Boolean, default: false },
  fixedTripId: { type: [Number, String], default: null },
  fixedTripName: { type: String, default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const formError = ref("");
const trips = ref([]);
const tripsLoading = ref(false);
const copySources = ref([]);
const copySourcesLoading = ref(false);

const emptyForm = () => ({
  tripId: null,
  fromEmail: "",
  functionCode: "",
  subject: "",
  content: "",
  attachment: "",
});

const form = ref(emptyForm());
const loadedOrgId = ref(null);

const isEdit = computed(() => props.templateId != null && props.templateId !== "");
const isTripLeaderAdd = computed(
  () => !isEdit.value && props.fixedTripId != null && props.fixedTripId !== ""
);
const isGlobalTemplate = computed(() => {
  if (props.allowGlobal) return true;
  if (isEdit.value) return loadedOrgId.value == null;
  return false;
});
const showCopyFromPicker = computed(() => !isGlobalTemplate.value && !isEdit.value);
const title = computed(() => (isEdit.value ? "Edit template" : "Add template"));

const tripItems = computed(() => [
  { title: "All trips (organization-wide)", value: null },
  ...trips.value.map((trip) => ({ title: trip.name, value: trip.id })),
]);

const copySourceItems = computed(() =>
  copySources.value.map((template) => ({
    title: template.subject
      ? `${template.functionCode} — ${template.subject}`
      : template.functionCode,
    value: template.functionCode,
  }))
);

const functionCodeHint = computed(() => {
  if (!showCopyFromPicker.value) {
    return "Identifier used when selecting this template programmatically";
  }
  if (form.value.tripId != null) {
    return "Copy from an organization-wide template for this function code";
  }
  return "Copy from a global master template for this function code";
});

const loadTrips = async () => {
  if (!props.orgId || props.allowGlobal) {
    trips.value = [];
    return;
  }
  tripsLoading.value = true;
  try {
    const res = await TripServices.getAll();
    trips.value = (res.data || []).filter((trip) => Number(trip.orgId) === Number(props.orgId));
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trips.";
    trips.value = [];
  } finally {
    tripsLoading.value = false;
  }
};

const loadCopySources = async () => {
  if (!showCopyFromPicker.value || !props.orgId) {
    copySources.value = [];
    return;
  }
  copySourcesLoading.value = true;
  try {
    const params = form.value.tripId != null ? { tripId: form.value.tripId } : {};
    const res = await EmailTemplateServices.getCopySources(params);
    copySources.value = res.data || [];
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load function codes.";
    copySources.value = [];
  } finally {
    copySourcesLoading.value = false;
  }
};

const applyTemplate = (row) => {
  loadedOrgId.value = row?.orgId ?? null;
  form.value = {
    tripId: row?.tripId ?? null,
    fromEmail: row?.fromEmail || "",
    functionCode: row?.functionCode || "",
    subject: row?.subject || "",
    content: row?.content || "",
    attachment: row?.attachment || "",
  };
};

const applyCopySource = (functionCode) => {
  if (!functionCode) return;
  const source = copySources.value.find((template) => template.functionCode === functionCode);
  if (!source) return;
  const tripId = form.value.tripId;
  form.value = {
    tripId,
    functionCode: source.functionCode || "",
    fromEmail: source.fromEmail || "",
    subject: source.subject || "",
    content: source.content || "",
    attachment: source.attachment || "",
  };
};

const loadTemplate = async () => {
  if (!isEdit.value) {
    loadedOrgId.value = props.allowGlobal ? null : props.orgId ?? null;
    form.value = emptyForm();
    if (isTripLeaderAdd.value) {
      form.value.tripId = Number(props.fixedTripId);
    }
    formError.value = "";
    return;
  }
  try {
    if (!props.allowGlobal) {
      loadedOrgId.value = props.orgId ?? null;
    }
    const res = await EmailTemplateServices.get(props.templateId);
    applyTemplate(res.data);
    formError.value = "";
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load template.";
  }
};

watch(
  () => [props.modelValue, props.templateId, props.orgId, props.fixedTripId],
  async ([open]) => {
    if (!open) {
      form.value = emptyForm();
      loadedOrgId.value = null;
      copySources.value = [];
      formError.value = "";
      return;
    }
    await loadTrips();
    await loadTemplate();
    if (showCopyFromPicker.value) {
      await loadCopySources();
    }
  }
);

watch(
  () => form.value.tripId,
  async () => {
    if (!showCopyFromPicker.value || !props.modelValue) return;
    form.value.functionCode = "";
    await loadCopySources();
  }
);

const close = () => emit("update:modelValue", false);

const save = async () => {
  formError.value = "";
  const savingGlobal = props.allowGlobal || (isEdit.value && loadedOrgId.value == null);
  const orgIdForSave = loadedOrgId.value ?? props.orgId;
  if (!orgIdForSave && !savingGlobal) {
    formError.value = "Organization is required.";
    return;
  }
  if (!form.value.subject?.trim()) {
    formError.value = "Subject is required.";
    return;
  }
  if (isTripLeaderAdd.value && !props.fixedTripId) {
    formError.value = "Trip is required.";
    return;
  }

  const payload = {
    orgId: savingGlobal ? null : Number(orgIdForSave),
    tripId: savingGlobal
      ? null
      : isTripLeaderAdd.value
        ? Number(props.fixedTripId)
        : form.value.tripId != null
          ? Number(form.value.tripId)
          : null,
    fromEmail: form.value.fromEmail?.trim() || null,
    functionCode: form.value.functionCode?.trim() || null,
    subject: form.value.subject.trim(),
    content: form.value.content?.trim() || null,
    attachment: form.value.attachment?.trim() || null,
  };

  saving.value = true;
  const request = isEdit.value
    ? EmailTemplateServices.update(props.templateId, payload)
    : EmailTemplateServices.create(payload);

  request
    .then(() => {
      emit("saved");
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Error saving template.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text style="max-height: 70vh">
        <v-alert v-if="isGlobalTemplate" type="info" variant="tonal" density="compact" class="mb-3">
          Global master template — not tied to an organization. Copy content into an organization template to use it.
        </v-alert>
        <v-alert v-if="isTripLeaderAdd" type="info" variant="tonal" density="compact" class="mb-3">
          Template for trip: {{ fixedTripName || "Selected trip" }}
        </v-alert>
        <v-select
          v-if="!isGlobalTemplate && !isTripLeaderAdd"
          v-model="form.tripId"
          :items="tripItems"
          label="Trip"
          density="compact"
          :loading="tripsLoading"
          hide-details
          class="mb-2"
        />
        <v-autocomplete
          v-if="showCopyFromPicker"
          v-model="form.functionCode"
          :items="copySourceItems"
          item-title="title"
          item-value="value"
          label="Function code"
          density="compact"
          clearable
          :loading="copySourcesLoading"
          :hint="functionCodeHint"
          persistent-hint
          hide-details
          class="mb-2"
          @update:model-value="applyCopySource"
        />
        <v-text-field
          v-else
          v-model="form.functionCode"
          label="Function code"
          density="compact"
          hint="Identifier used when selecting this template programmatically"
          persistent-hint
          autocomplete="off"
          class="mb-2"
        />
        <v-text-field v-model="form.fromEmail" label="From email" type="email" density="compact" autocomplete="off" />
        <v-text-field
          v-model="form.subject"
          label="Subject"
          density="compact"
          autocomplete="off"
          :rules="[(v) => !!v?.trim() || 'Subject is required']"
        />
        <v-textarea v-model="form.content" label="Content" density="compact" rows="8" />
        <v-text-field
          v-model="form.attachment"
          label="Attachment path"
          density="compact"
          hint="Optional file path or URL"
          persistent-hint
          autocomplete="off"
        />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
