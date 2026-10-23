<script setup>
import { ref, computed, watch, nextTick } from "vue";
import EmailTemplateServices from "../services/emailTemplateServices.js";
import EmailTemplatePreviewDialog from "./EmailTemplatePreviewDialog.vue";
import EmailTypeServices from "../services/emailTypeServices.js";
import EmailTokenServices from "../services/emailTokenServices.js";
import OrganizationServices from "../services/organizationServices.js";
import TripServices from "../services/tripServices.js";
import Utils from "../config/utils.js";

const FUNCTION_CODE_ITEMS = [
  { title: "Scheduled", value: "Scheduled" },
  { title: "Send Now", value: "Send Now" },
  { title: "Trip Participant", value: "Trip Participant" },
  { title: "Person", value: "Person" },
];
const FUNCTION_CODES = FUNCTION_CODE_ITEMS.map((item) => item.value);

const SCHEDULE_ITEMS = [
  { title: "Daily", value: "daily" },
  { title: "Weekly (Tuesday)", value: "weekly" },
  { title: "Days before trip start", value: "before-start" },
];

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
const copyFromCode = ref(null);
const user = ref(null);
const organizations = ref([]);
const orgsLoading = ref(false);
const emailTypes = ref([]);
const emailTypesLoading = ref(false);
const emailTokens = ref([]);
const insertSubjectToken = ref(null);
const insertBodyToken = ref(null);
const insertToToken = ref(null);
const insertFromToken = ref(null);
const insertAttachmentToken = ref(null);
const cursorPositions = ref({ subject: null, emailBody: null, toAddress: null });
const showPreview = ref(false);

const emptyForm = () => ({
  orgId: null,
  tripId: null,
  emailTypeId: null,
  fromEmail: "",
  toAddress: "",
  functionCode: null,
  scheduleRule: null,
  scheduleDaysBefore: null,
  subject: "",
  content: "",
  emailBody: "",
  attachment: "",
});

const form = ref(emptyForm());

const isEdit = computed(() => props.templateId != null && props.templateId !== "");
const isSystemAdminUser = computed(() => !!user.value?.isAdmin || props.allowGlobal);
const isTripLeaderAdd = computed(
  () => !isEdit.value && props.fixedTripId != null && props.fixedTripId !== ""
);
const showCopyFromPicker = computed(() => !isEdit.value && form.value.orgId != null);
const isTripTemplate = computed(() => isTripLeaderAdd.value || form.value.tripId != null);
const functionCodeItems = computed(() =>
  isTripTemplate.value
    ? FUNCTION_CODE_ITEMS.filter((item) => item.value !== "Person")
    : FUNCTION_CODE_ITEMS
);
watch(isTripTemplate, (tripTemplate) => {
  if (tripTemplate && form.value.functionCode === "Person") form.value.functionCode = null;
});
const isScheduled = computed(() => form.value.functionCode === "Scheduled");
const showDaysBefore = computed(() => isScheduled.value && form.value.scheduleRule === "before-start");
const title = computed(() => (isEdit.value ? "Edit template" : "Add template"));

const adminOrgOptions = computed(() => {
  const seen = new Set();
  const items = [];
  for (const role of user.value?.orgRoles || []) {
    if (role.roleName !== "Org Admin") continue;
    const id = Number(role.orgId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({ title: role.orgName || `Organization ${id}`, value: id });
  }
  return items;
});

const organizationItems = computed(() => {
  if (isSystemAdminUser.value) {
    return organizations.value.map((org) => ({ title: org.name, value: org.id }));
  }
  if (adminOrgOptions.value.length) return adminOrgOptions.value;
  if (props.orgId != null && props.orgId !== "") {
    const id = Number(props.orgId);
    return [{ title: Utils.orgDisplayName(user.value, id) || "Organization", value: id }];
  }
  return [];
});

const organizationFixed = computed(
  () => !isSystemAdminUser.value && organizationItems.value.length <= 1
);
const fixedOrganizationName = computed(() => organizationItems.value[0]?.title || "");

const tripItems = computed(() => [
  { title: "All trips (organization-wide)", value: null },
  ...trips.value.map((trip) => ({ title: trip.name, value: trip.id })),
]);

const emailTypeItems = computed(() =>
  [...emailTypes.value]
    .sort((a, b) => String(a.description || "").localeCompare(String(b.description || "")))
    .map((row) => ({ title: row.description, value: row.id }))
);

const copySourceItems = computed(() =>
  copySources.value.map((template) => ({
    title: template.subject
      ? `${template.functionCode} — ${template.subject}`
      : template.functionCode,
    value: template.functionCode,
  }))
);

const functionCodeHint = computed(() => {
  if (form.value.tripId != null) {
    return "Copy from an organization-wide template for this function code";
  }
  return "Copy from a global master template for this function code";
});

const normalizeFunctionCode = (code) => (FUNCTION_CODES.includes(code) ? code : null);

const loadOrganizations = async () => {
  if (!isSystemAdminUser.value) {
    organizations.value = [];
    return;
  }
  orgsLoading.value = true;
  try {
    const res = await OrganizationServices.getAll();
    organizations.value = res.data || [];
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load organizations.";
    organizations.value = [];
  } finally {
    orgsLoading.value = false;
  }
};

const loadEmailTypes = async () => {
  emailTypesLoading.value = true;
  try {
    const res = await EmailTypeServices.getAll();
    emailTypes.value = res.data || [];
  } catch (e) {
    emailTypes.value = [];
  } finally {
    emailTypesLoading.value = false;
  }
};

const tokenItems = computed(() =>
  emailTokens.value.map((token) => ({
    title: `{{${token.tokenCode}}} — ${token.description}`,
    value: token.tokenCode,
  }))
);

const EMAIL_VALUE_SOURCES = ["organization.email", "participant.email", "primaryLeader.email"];

const emailTokenItems = computed(() =>
  emailTokens.value
    .filter((token) => EMAIL_VALUE_SOURCES.includes(token.valueSource))
    .map((token) => ({
      title: `{{${token.tokenCode}}} — ${token.description}`,
      value: token.tokenCode,
    }))
);

const ATTACHMENT_VALUE_SOURCES = ["trip.arrivalPdf"];

const attachmentTokenCodes = computed(() =>
  emailTokens.value
    .filter((token) => ATTACHMENT_VALUE_SOURCES.includes(token.valueSource))
    .map((token) => token.tokenCode)
);

const attachmentTokenItems = computed(() =>
  emailTokens.value
    .filter((token) => attachmentTokenCodes.value.includes(token.tokenCode))
    .map((token) => ({
      title: `{{${token.tokenCode}}} — ${token.description}`,
      value: token.tokenCode,
    }))
);

const attachmentEntries = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const attachmentIsValid = (value) =>
  attachmentEntries(value).every((entry) => {
    const match = /^\{\{([A-Z][A-Z0-9_]*)\}\}$/.exec(entry);
    return !!match && attachmentTokenCodes.value.includes(match[1]);
  });

const addAttachmentToken = async (tokenCode) => {
  if (!tokenCode) return;
  const entries = attachmentEntries(form.value.attachment);
  const symbol = `{{${tokenCode}}}`;
  if (!entries.includes(symbol)) entries.push(symbol);
  form.value.attachment = entries.join(", ");
  await nextTick();
  insertAttachmentToken.value = null;
};

const loadEmailTokens = async () => {
  try {
    const res = await EmailTokenServices.getAll();
    emailTokens.value = res.data || [];
  } catch (e) {
    emailTokens.value = [];
  }
};

const rememberCursor = (field, event) => {
  const position = event?.target?.selectionStart;
  cursorPositions.value[field] = typeof position === "number" ? position : null;
};

const insertToken = async (field, tokenCode) => {
  if (!tokenCode) return;
  const symbol = `{{${tokenCode}}}`;
  const current = form.value[field] || "";
  const position = cursorPositions.value[field];
  const at = position == null || position > current.length ? current.length : position;
  form.value[field] = current.slice(0, at) + symbol + current.slice(at);
  cursorPositions.value[field] = at + symbol.length;
  await nextTick();
  if (field === "subject") insertSubjectToken.value = null;
  else if (field === "toAddress") insertToToken.value = null;
  else insertBodyToken.value = null;
};

const setFromToken = async (tokenCode) => {
  if (!tokenCode) return;
  form.value.fromEmail = `{{${tokenCode}}}`;
  await nextTick();
  insertFromToken.value = null;
};

const loadTrips = async () => {
  const orgId = form.value.orgId;
  if (!orgId) {
    trips.value = [];
    return;
  }
  tripsLoading.value = true;
  try {
    const res = await TripServices.getAll();
    trips.value = (res.data || []).filter((trip) => Number(trip.orgId) === Number(orgId));
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trips.";
    trips.value = [];
  } finally {
    tripsLoading.value = false;
  }
};

const loadCopySources = async () => {
  if (!showCopyFromPicker.value) {
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

const assignDefaultOrg = () => {
  if (organizationFixed.value && organizationItems.value.length === 1) {
    form.value.orgId = organizationItems.value[0].value;
    return;
  }
  if (props.orgId != null && props.orgId !== "") {
    const id = Number(props.orgId);
    if (isSystemAdminUser.value || organizationItems.value.some((item) => item.value === id)) {
      form.value.orgId = id;
    }
  }
};

const applyTemplate = (row) => {
  form.value = {
    orgId: row?.orgId ?? null,
    tripId: row?.tripId ?? null,
    emailTypeId: row?.emailTypeId ?? null,
    fromEmail: row?.fromEmail || "",
    toAddress: row?.toAddress || "",
    functionCode: normalizeFunctionCode(row?.functionCode),
    scheduleRule: row?.scheduleRule ?? null,
    scheduleDaysBefore: row?.scheduleDaysBefore ?? null,
    subject: row?.subject || "",
    content: row?.content || "",
    emailBody: row?.emailBody || "",
    attachment: row?.attachment || "",
  };
  if (form.value.orgId == null) assignDefaultOrg();
};

const applyCopySource = (functionCode) => {
  if (!functionCode) return;
  const source = copySources.value.find((template) => template.functionCode === functionCode);
  if (!source) return;
  form.value.fromEmail = source.fromEmail || "";
  form.value.toAddress = source.toAddress || "";
  form.value.scheduleRule = source.scheduleRule ?? null;
  form.value.scheduleDaysBefore = source.scheduleDaysBefore ?? null;
  form.value.subject = source.subject || "";
  form.value.content = source.content || "";
  form.value.attachment = source.attachment || "";
};

const loadTemplate = async () => {
  if (!isEdit.value) {
    form.value = emptyForm();
    assignDefaultOrg();
    if (isTripLeaderAdd.value) {
      form.value.tripId = Number(props.fixedTripId);
    }
    formError.value = "";
    return;
  }
  try {
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
      copySources.value = [];
      copyFromCode.value = null;
      emailTypes.value = [];
      emailTokens.value = [];
      cursorPositions.value = { subject: null, emailBody: null, toAddress: null };
      showPreview.value = false;
      organizations.value = [];
      formError.value = "";
      return;
    }
    user.value = Utils.getStore("user");
    await loadOrganizations();
    await loadEmailTypes();
    await loadEmailTokens();
    await loadTemplate();
    await loadTrips();
    if (showCopyFromPicker.value) {
      await loadCopySources();
    }
  },
  { immediate: true }
);

watch(
  () => form.value.tripId,
  async () => {
    if (!showCopyFromPicker.value || !props.modelValue) return;
    copyFromCode.value = null;
    await loadCopySources();
  }
);

watch(
  () => form.value.orgId,
  async (orgId, previous) => {
    if (!props.modelValue || orgId === previous) return;
    if (!isTripLeaderAdd.value) {
      await loadTrips();
    }
    if (showCopyFromPicker.value) {
      copyFromCode.value = null;
      await loadCopySources();
    }
  }
);

const close = () => emit("update:modelValue", false);

const save = async () => {
  formError.value = "";
  if (!form.value.orgId) {
    formError.value = "Organization is required.";
    return;
  }
  if (!form.value.emailTypeId) {
    formError.value = "Email type is required.";
    return;
  }
  if (!FUNCTION_CODES.includes(form.value.functionCode)) {
    formError.value = "Function code is required.";
    return;
  }
  if (isScheduled.value && !form.value.scheduleRule) {
    formError.value = "Schedule is required for scheduled templates.";
    return;
  }
  const daysBefore = Number(form.value.scheduleDaysBefore);
  if (showDaysBefore.value && (!Number.isInteger(daysBefore) || daysBefore < 1 || daysBefore > 365)) {
    formError.value = "Days before trip start must be a whole number from 1 to 365.";
    return;
  }
  if (!form.value.subject?.trim()) {
    formError.value = "Subject is required.";
    return;
  }
  if (!form.value.fromEmail?.trim()) {
    formError.value = "From email is required.";
    return;
  }
  if (!form.value.toAddress?.trim()) {
    formError.value = "To is required.";
    return;
  }
  if (!form.value.emailBody?.trim()) {
    formError.value = "Email body is required.";
    return;
  }
  if (!attachmentIsValid(form.value.attachment)) {
    formError.value = "Attachment may only list attachment tokens.";
    return;
  }
  if (isTripLeaderAdd.value && !props.fixedTripId) {
    formError.value = "Trip is required.";
    return;
  }

  const payload = {
    orgId: Number(form.value.orgId),
    emailTypeId: Number(form.value.emailTypeId),
    tripId: isTripLeaderAdd.value
      ? Number(props.fixedTripId)
      : form.value.tripId != null
        ? Number(form.value.tripId)
        : null,
    fromEmail: form.value.fromEmail.trim(),
    toAddress: form.value.toAddress.trim(),
    functionCode: form.value.functionCode,
    scheduleRule: isScheduled.value ? form.value.scheduleRule : null,
    scheduleDaysBefore: showDaysBefore.value ? daysBefore : null,
    subject: form.value.subject.trim(),
    content: form.value.content?.trim() || null,
    emailBody: form.value.emailBody.trim(),
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
        <v-alert v-if="isTripLeaderAdd" type="info" variant="tonal" density="compact" class="mb-3">
          Template for trip: {{ fixedTripName || "Selected trip" }}
        </v-alert>
        <v-text-field
          v-if="organizationFixed"
          :model-value="fixedOrganizationName"
          label="Organization"
          density="compact"
          disabled
          class="mb-2"
        />
        <v-select
          v-else
          v-model="form.orgId"
          :items="organizationItems"
          label="Organization"
          density="compact"
          :loading="orgsLoading"
          class="mb-2"
        />
        <v-select
          v-model="form.emailTypeId"
          :items="emailTypeItems"
          label="Email type"
          density="compact"
          :loading="emailTypesLoading"
          class="mb-2"
        />
        <v-select
          v-model="form.functionCode"
          :items="functionCodeItems"
          label="Function code"
          density="compact"
          class="mb-2"
        />
        <v-select
          v-if="isScheduled"
          v-model="form.scheduleRule"
          :items="SCHEDULE_ITEMS"
          label="Schedule"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-if="showDaysBefore"
          v-model="form.scheduleDaysBefore"
          label="Days before trip start"
          type="number"
          min="1"
          max="365"
          density="compact"
          class="mb-2"
        />
        <v-select
          v-if="!isTripLeaderAdd"
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
          v-model="copyFromCode"
          :items="copySourceItems"
          item-title="title"
          item-value="value"
          label="Copy from"
          density="compact"
          clearable
          :loading="copySourcesLoading"
          :hint="functionCodeHint"
          persistent-hint
          hide-details
          class="mb-2"
          @update:model-value="applyCopySource"
        />
        <div class="d-flex align-start ga-2">
          <v-text-field
            v-model="form.subject"
            label="Subject"
            density="compact"
            autocomplete="off"
            class="flex-grow-1"
            :rules="[(v) => !!v?.trim() || 'Subject is required']"
            @blur="rememberCursor('subject', $event)"
          />
          <v-select
            v-model="insertSubjectToken"
            :items="tokenItems"
            label="Insert token"
            density="compact"
            class="token-select"
            hide-details
            @update:model-value="(code) => insertToken('subject', code)"
          />
        </div>
        <div class="d-flex align-start ga-2">
          <v-text-field
            v-model="form.fromEmail"
            label="From email"
            density="compact"
            autocomplete="off"
            class="flex-grow-1"
          />
          <v-select
            v-model="insertFromToken"
            :items="emailTokenItems"
            label="Insert token"
            density="compact"
            class="token-select"
            hide-details
            @update:model-value="setFromToken"
          />
        </div>
        <div class="d-flex align-start ga-2">
          <v-text-field
            v-model="form.toAddress"
            label="To"
            density="compact"
            autocomplete="off"
            class="flex-grow-1"
            hint="Email addresses or email tokens, separated by commas"
            persistent-hint
            @blur="rememberCursor('toAddress', $event)"
          />
          <v-select
            v-model="insertToToken"
            :items="emailTokenItems"
            label="Insert token"
            density="compact"
            class="token-select"
            hide-details
            @update:model-value="(code) => insertToken('toAddress', code)"
          />
        </div>
        <div class="d-flex align-start ga-2">
          <v-textarea
            v-model="form.emailBody"
            label="Email body"
            density="compact"
            rows="8"
            class="flex-grow-1"
            @blur="rememberCursor('emailBody', $event)"
          />
          <v-select
            v-model="insertBodyToken"
            :items="tokenItems"
            label="Insert token"
            density="compact"
            class="token-select"
            hide-details
            @update:model-value="(code) => insertToken('emailBody', code)"
          />
        </div>
        <div class="d-flex align-start ga-2">
          <v-text-field
            v-model="form.attachment"
            label="Attachment"
            density="compact"
            autocomplete="off"
            class="flex-grow-1"
            hint="Optional attachment tokens, separated by commas"
            persistent-hint
            data-testid="template-attachment"
          />
          <v-select
            v-model="insertAttachmentToken"
            :items="attachmentTokenItems"
            label="Insert token"
            density="compact"
            class="token-select"
            hide-details
            data-testid="template-attachment-token"
            @update:model-value="addAttachmentToken"
          />
        </div>
        <v-textarea v-model="form.content" label="Content" density="compact" rows="4" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn variant="text" :disabled="!form.orgId" @click="showPreview = true">Preview</v-btn>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
    <EmailTemplatePreviewDialog
      v-model="showPreview"
      :org-id="form.orgId"
      :trip-id="isTripLeaderAdd ? fixedTripId : form.tripId"
      :from-email="form.fromEmail"
      :to-address="form.toAddress"
      :subject="form.subject"
      :email-body="form.emailBody"
      :attachment="form.attachment"
    />
  </v-dialog>
</template>

<style scoped>
.token-select {
  max-width: 220px;
  min-width: 180px;
}
</style>
