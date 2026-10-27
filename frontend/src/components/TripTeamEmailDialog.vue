<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import ConfirmDialog from "./ConfirmDialog.vue";
import EmailSendStatusDialog from "./EmailSendStatusDialog.vue";
import RichTextEditor from "./RichTextEditor.vue";
import EmailHtmlPreview from "./EmailHtmlPreview.vue";
import { emailBodyIsBlank } from "../utils/emailBody.js";

const POTENTIAL_ROLES = ["Trip Participant", "Trip Leader"];
const POTENTIAL_STATUSES = ["incomplete", "applied", "approved"];

const SEND_TO_ITEMS = [
  { label: "All potential participants", value: "potential" },
  { label: "All accepted participants", value: "accepted" },
  { label: "Selected participants", value: "selected" },
];

const KINDS = {
  team: {
    title: "Email team",
    noTemplates: "No Trip Participant templates",
    getTemplates: "getTeamEmailTemplates",
    preview: "previewTeamEmail",
    send: "sendTeamEmail",
  },
  flightItinerary: {
    title: "Email flight itinerary",
    noTemplates: "No flight itinerary templates for this trip.",
    getTemplates: "getFlightItineraryEmailTemplates",
    preview: "previewFlightItineraryEmail",
    send: "sendFlightItineraryEmail",
  },
};

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
  orgId: { type: [Number, String], default: null },
  participants: { type: Array, default: () => [] },
  kind: { type: String, default: "team" },
});

const emit = defineEmits(["update:modelValue"]);

const config = computed(() => KINDS[props.kind] ?? KINDS.team);

const templates = ref([]);
const templatesLoading = ref(false);
const emailTemplateId = ref(null);
const subject = ref("");
const emailBody = ref("");
const sendTo = ref("potential");
const selectedPersonIds = ref([]);
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

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || "Participant";

const isPotential = (row) =>
  POTENTIAL_ROLES.includes(row.role?.roleName) &&
  POTENTIAL_STATUSES.includes(String(row.status || "").toLowerCase());

const isAccepted = (row) =>
  row.role?.roleName === "Trip Participant" && String(row.status || "").toLowerCase() === "approved";

const potentialParticipants = computed(() => {
  const byId = new Map();
  for (const row of props.participants.filter(isPotential)) {
    const id = Number(row.peopleId);
    const entry = byId.get(id) ?? { value: id, person: row.person, leader: false, accepted: false };
    if (row.role.roleName === "Trip Leader") entry.leader = true;
    if (isAccepted(row)) entry.accepted = true;
    byId.set(id, entry);
  }
  return [...byId.values()].map((entry) => ({
    title: entry.leader ? `${personName(entry.person)} (Trip Leader)` : personName(entry.person),
    value: entry.value,
    accepted: entry.accepted,
  }));
});

const recipients = computed(() => {
  if (sendTo.value === "accepted") {
    return potentialParticipants.value.filter((p) => p.accepted);
  }
  if (sendTo.value === "selected") {
    return potentialParticipants.value.filter((p) => selectedPersonIds.value.includes(p.value));
  }
  return potentialParticipants.value;
});

const recipientCount = computed(() => recipients.value.length);

const recipientLabel = (count) => `${count} participant${count === 1 ? "" : "s"}`;

const templateItems = computed(() =>
  templates.value.map((template) => ({ title: template.subject, value: template.id }))
);

const canSubmit = computed(
  () =>
    !!emailTemplateId.value &&
    !!subject.value.trim() &&
    !emailBodyIsBlank(emailBody.value) &&
    recipientCount.value > 0
);

const requestBody = () => ({
  emailTemplateId: emailTemplateId.value,
  subject: subject.value,
  emailBody: emailBody.value,
  sendTo: sendTo.value,
  ...(sendTo.value === "selected" ? { personIds: selectedPersonIds.value } : {}),
});

const loadTemplates = async () => {
  templatesLoading.value = true;
  try {
    const res = await TripServices[config.value.getTemplates](props.tripId);
    templates.value = res.data || [];
  } catch (e) {
    templates.value = [];
    error.value = e.response?.data?.message || "Unable to load templates.";
  } finally {
    templatesLoading.value = false;
  }
};

const loadPreview = async () => {
  preview.value = null;
  if (!previewPersonId.value) return;
  previewLoading.value = true;
  error.value = "";
  try {
    const res = await TripServices[config.value.preview](props.tripId, {
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
  previewPersonId.value = recipients.value[0]?.value ?? null;
  loadPreview();
};

const confirmSend = async () => {
  showConfirm.value = false;
  result.value = null;
  sendError.value = "";
  sending.value = true;
  showStatus.value = true;
  try {
    const res = await TripServices[config.value.send](props.tripId, requestBody());
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
  emailTemplateId.value = null;
  subject.value = "";
  emailBody.value = "";
  sendTo.value = "potential";
  selectedPersonIds.value = [];
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
  (open) => {
    reset();
    if (open) loadTemplates();
  },
  { immediate: true }
);

watch(emailTemplateId, (id) => {
  const template = templates.value.find((t) => t.id === id);
  subject.value = template?.subject ?? "";
  emailBody.value = template?.emailBody ?? "";
});

watch([subject, emailBody, sendTo, selectedPersonIds], () => {
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
      <v-card-title>{{ config.title }}</v-card-title>
      <v-card-text style="max-height: 75vh">
        <v-select
          v-model="emailTemplateId"
          :items="templateItems"
          label="Email template"
          density="compact"
          :loading="templatesLoading"
          :no-data-text="config.noTemplates"
          class="mb-2"
        />
        <v-alert
          v-if="kind === 'flightItinerary' && !templatesLoading && !templates.length"
          type="info"
          density="compact"
          class="mb-2"
        >
          {{ config.noTemplates }}
        </v-alert>
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
        <v-radio-group v-model="sendTo" label="Send to" density="compact" hide-details class="mb-2">
          <v-radio
            v-for="item in SEND_TO_ITEMS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </v-radio-group>
        <v-autocomplete
          v-if="sendTo === 'selected'"
          v-model="selectedPersonIds"
          :items="potentialParticipants"
          label="Participants"
          density="compact"
          multiple
          chips
          closable-chips
          class="mb-2"
        />
        <div class="text-body-2 mb-2">Recipients: {{ recipientLabel(recipientCount) }}</div>

        <v-alert v-if="error" type="error" density="compact" class="mb-2">{{ error }}</v-alert>

        <div v-if="showPreview" class="border rounded pa-3 mb-2">
          <v-select
            v-model="previewPersonId"
            :items="recipients"
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
      :message="`Send this email to ${recipientLabel(recipientCount)}?`"
      confirm-text="Send"
      cancel-text="Cancel"
      @confirm="confirmSend"
    />
    <EmailSendStatusDialog
      v-model="showStatus"
      :sending="sending"
      :count="recipientCount"
      :result="result"
      :error="sendError"
      @ok="onStatusOk"
    />
  </v-dialog>
</template>
