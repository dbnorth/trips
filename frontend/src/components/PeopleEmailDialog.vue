<script setup>
import { ref, computed, watch } from "vue";
import PeopleEmailServices from "../services/peopleEmailServices.js";
import TripServices from "../services/tripServices.js";
import ConfirmDialog from "./ConfirmDialog.vue";
import EmailSendStatusDialog from "./EmailSendStatusDialog.vue";
import RichTextEditor from "./RichTextEditor.vue";
import EmailHtmlPreview from "./EmailHtmlPreview.vue";
import Utils from "../config/utils.js";
import { emailBodyIsBlank } from "../utils/emailBody.js";

const ALL = "all";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const personTemplates = ref([]);
const tripTemplates = ref([]);
const trips = ref([]);
const optionsLoading = ref(false);
const emailTemplateId = ref(null);
const subject = ref("");
const emailBody = ref("");
const tripSelection = ref([ALL]);
const roleSelection = ref([ALL]);
const recipients = ref([]);
const preview = ref(null);
const previewPersonId = ref(null);
const showPreview = ref(false);
const previewLoading = ref(false);
const showConfirm = ref(false);
const sending = ref(false);
const result = ref(null);
const sendError = ref("");
const showStatus = ref(false);
const error = ref("");
const orgId = ref(null);
let recipientsRequest = 0;

/** "All" alone, or the specific choices: picking All clears the rest, picking another clears All; never empty. */
const withAll = (next, prev) => {
  if (!next.length) return [ALL];
  if (next.includes(ALL) && !prev.includes(ALL)) return [ALL];
  if (next.includes(ALL) && next.length > 1) return next.filter((v) => v !== ALL);
  return next;
};

const setTrips = (next) => {
  tripSelection.value = withAll(next, tripSelection.value);
};
const setRoles = (next) => {
  roleSelection.value = withAll(next, roleSelection.value);
};

const tripItems = computed(() => [
  { title: "All", value: ALL },
  ...trips.value.map((trip) => ({ title: trip.name, value: trip.id })),
]);

const selectedTrips = computed(() =>
  tripSelection.value.includes(ALL)
    ? trips.value
    : trips.value.filter((trip) => tripSelection.value.includes(trip.id))
);

const singleTripId = computed(() =>
  selectedTrips.value.length === 1 ? selectedTrips.value[0].id : null
);

const availableRoles = computed(() => {
  const byId = new Map();
  for (const trip of selectedTrips.value) {
    for (const role of trip.roles || []) byId.set(role.workerRoleId, role);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
});

const roleItems = computed(() => [
  { title: "All", value: ALL },
  ...availableRoles.value.map((role) => ({ title: role.name, value: role.workerRoleId })),
]);

const templates = computed(() => [...personTemplates.value, ...tripTemplates.value]);

const templateItems = computed(() => [
  ...personTemplates.value.map((t) => ({ title: t.subject, value: t.id })),
  ...tripTemplates.value.map((t) => ({ title: `Trip Participant — ${t.subject}`, value: t.id })),
]);

const selectionBody = () => ({
  tripIds: tripSelection.value.includes(ALL) ? ALL : tripSelection.value,
  workerRoleIds: roleSelection.value.includes(ALL) ? ALL : roleSelection.value,
});

const recipientItems = computed(() =>
  recipients.value.map((r) => ({ title: r.name || "Person", value: r.personId }))
);

const recipientLabel = (count) => `${count} ${count === 1 ? "person" : "people"}`;

const canSubmit = computed(
  () =>
    !!emailTemplateId.value &&
    !!subject.value.trim() &&
    !emailBodyIsBlank(emailBody.value) &&
    recipients.value.length > 0
);

const requestBody = () => ({
  emailTemplateId: emailTemplateId.value,
  subject: subject.value,
  emailBody: emailBody.value,
  ...selectionBody(),
});

const loadOptions = async () => {
  optionsLoading.value = true;
  try {
    const res = await PeopleEmailServices.getOptions();
    personTemplates.value = res.data?.templates || [];
    trips.value = res.data?.trips || [];
  } catch (e) {
    personTemplates.value = [];
    trips.value = [];
    error.value = e.response?.data?.message || "Unable to load email options.";
  } finally {
    optionsLoading.value = false;
  }
};

const loadRecipients = async () => {
  const requestId = ++recipientsRequest;
  if (!tripSelection.value.length || !roleSelection.value.length) {
    recipients.value = [];
    return;
  }
  try {
    const res = await PeopleEmailServices.getRecipients(selectionBody());
    if (requestId === recipientsRequest) recipients.value = res.data || [];
  } catch (e) {
    if (requestId !== recipientsRequest) return;
    recipients.value = [];
    error.value = e.response?.data?.message || "Unable to load recipients.";
  }
};

const loadTripTemplates = async (tripId) => {
  tripTemplates.value = [];
  if (tripId == null) return;
  try {
    const res = await TripServices.getTeamEmailTemplates(tripId);
    if (singleTripId.value === tripId) tripTemplates.value = res.data || [];
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to load trip templates.";
  }
};

const loadPreview = async () => {
  preview.value = null;
  if (!previewPersonId.value) return;
  previewLoading.value = true;
  error.value = "";
  try {
    const res = await PeopleEmailServices.preview({
      ...requestBody(),
      personId: previewPersonId.value,
    });
    preview.value = res.data;
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to build preview.";
  } finally {
    previewLoading.value = false;
  }
};

const openPreview = () => {
  showPreview.value = true;
  previewPersonId.value = recipients.value[0]?.personId ?? null;
  loadPreview();
};

const confirmSend = async () => {
  showConfirm.value = false;
  result.value = null;
  sendError.value = "";
  sending.value = true;
  showStatus.value = true;
  try {
    const res = await PeopleEmailServices.send(requestBody());
    result.value = res.data;
  } catch (e) {
    sendError.value = e.response?.data?.message || "Unable to send email.";
  } finally {
    sending.value = false;
  }
};

const onStatusOk = ({ allSent }) => {
  if (allSent) close();
};

const reset = () => {
  personTemplates.value = [];
  tripTemplates.value = [];
  trips.value = [];
  emailTemplateId.value = null;
  subject.value = "";
  emailBody.value = "";
  tripSelection.value = [ALL];
  roleSelection.value = [ALL];
  recipients.value = [];
  preview.value = null;
  previewPersonId.value = null;
  showPreview.value = false;
  showConfirm.value = false;
  showStatus.value = false;
  result.value = null;
  sendError.value = "";
  error.value = "";
};

watch(
  () => props.modelValue,
  async (open) => {
    reset();
    if (!open) return;
    orgId.value = Utils.effectiveOrgId(Utils.getStore("user"));
    await loadOptions();
    loadRecipients();
  },
  { immediate: true }
);

watch(availableRoles, (roles) => {
  const ids = new Set(roles.map((r) => r.workerRoleId));
  const kept = roleSelection.value.filter((v) => v === ALL || ids.has(v));
  if (kept.length !== roleSelection.value.length) roleSelection.value = kept.length ? kept : [ALL];
});

watch(singleTripId, (tripId) => {
  if (tripTemplates.value.some((t) => t.id === emailTemplateId.value)) emailTemplateId.value = null;
  loadTripTemplates(tripId);
});

watch([tripSelection, roleSelection], () => {
  if (props.modelValue && !optionsLoading.value) loadRecipients();
});

watch(emailTemplateId, (id) => {
  const template = templates.value.find((t) => t.id === id);
  subject.value = template?.subject ?? "";
  emailBody.value = template?.emailBody ?? "";
});

watch([subject, emailBody, tripSelection, roleSelection], () => {
  showPreview.value = false;
  preview.value = null;
  result.value = null;
});

watch(previewPersonId, () => {
  if (showPreview.value) loadPreview();
});

const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="760" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Email people</v-card-title>
      <v-card-text style="max-height: 75vh">
        <v-select
          v-model="emailTemplateId"
          :items="templateItems"
          label="Template"
          density="compact"
          :loading="optionsLoading"
          no-data-text="No Person templates. Add one under Email templates."
          class="mb-2"
        />
        <v-text-field
          v-model="subject"
          label="Subject"
          density="compact"
          :disabled="!emailTemplateId"
          class="mb-2"
        />
        <RichTextEditor
          v-model="emailBody"
          label="Email body"
          :org-id="orgId"
          :disabled="!emailTemplateId"
        />
        <v-select
          :model-value="tripSelection"
          :items="tripItems"
          label="Trips"
          density="compact"
          multiple
          chips
          closable-chips
          class="mb-2"
          @update:model-value="setTrips"
        >
          <template #chip="{ props: chipProps, item }">
            <v-chip v-bind="chipProps" :closable="item.value !== ALL" />
          </template>
        </v-select>
        <v-select
          :model-value="roleSelection"
          :items="roleItems"
          label="Roles"
          density="compact"
          multiple
          chips
          closable-chips
          class="mb-2"
          @update:model-value="setRoles"
        >
          <template #chip="{ props: chipProps, item }">
            <v-chip v-bind="chipProps" :closable="item.value !== ALL" />
          </template>
        </v-select>
        <div class="text-body-2 mb-2">Recipients: {{ recipientLabel(recipients.length) }}</div>

        <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

        <div v-if="showPreview" class="border rounded pa-3 mb-2">
          <v-select
            v-model="previewPersonId"
            :items="recipientItems"
            label="Preview as"
            density="compact"
            class="mb-2"
          />
          <v-progress-linear v-if="previewLoading" indeterminate class="mb-2" />
          <div v-if="preview" class="email-preview">
            <div class="mb-2"><strong>From:</strong> {{ preview.from }}</div>
            <div v-if="preview.replyTo" class="mb-2"><strong>Reply-To:</strong> {{ preview.replyTo }}</div>
            <div class="mb-2"><strong>To:</strong> {{ preview.to }}</div>
            <div class="mb-2"><strong>Subject:</strong> {{ preview.subject }}</div>
            <div v-if="preview.attachmentError || preview.attachments?.length" class="mb-2" data-testid="preview-attachments">
              <strong>Attachments:</strong> {{ preview.attachmentError || preview.attachments.join(", ") }}
            </div>
            <v-alert v-if="preview.pictureError" type="warning" density="compact" class="mb-2">
              {{ preview.pictureError }}
            </v-alert>
            <EmailHtmlPreview :html="preview.body" />
          </div>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn variant="tonal" :disabled="!canSubmit" @click="openPreview">Preview</v-btn>
        <v-btn color="primary" :disabled="!canSubmit" @click="showConfirm = true">Send</v-btn>
      </v-card-actions>
    </v-card>
    <ConfirmDialog
      v-model="showConfirm"
      title="Are you sure?"
      :message="`Send this email to ${recipientLabel(recipients.length)}?`"
      confirm-text="Send"
      cancel-text="Cancel"
      @confirm="confirmSend"
    />
    <EmailSendStatusDialog
      v-model="showStatus"
      :sending="sending"
      :count="recipients.length"
      :result="result"
      :error="sendError"
      @ok="onStatusOk"
    />
  </v-dialog>
</template>
