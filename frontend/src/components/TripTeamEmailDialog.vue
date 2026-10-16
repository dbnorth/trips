<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import ConfirmDialog from "./ConfirmDialog.vue";

const POTENTIAL_STATUSES = ["incomplete", "applied", "approved"];

const SEND_TO_ITEMS = [
  { label: "All potential participants", value: "potential" },
  { label: "All accepted participants", value: "accepted" },
  { label: "Selected participants", value: "selected" },
];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
  participants: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue"]);

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
const error = ref("");

const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim() || "Participant";

const potentialParticipants = computed(() => {
  const seen = new Set();
  return props.participants
    .filter((row) => row.role?.roleName === "Trip Participant")
    .filter((row) => POTENTIAL_STATUSES.includes(String(row.status || "").toLowerCase()))
    .filter((row) => {
      const id = Number(row.peopleId);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((row) => ({
      title: personName(row.person),
      value: Number(row.peopleId),
      status: String(row.status).toLowerCase(),
    }));
});

const recipients = computed(() => {
  if (sendTo.value === "accepted") {
    return potentialParticipants.value.filter((p) => p.status === "approved");
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
    !!emailBody.value.trim() &&
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
    const res = await TripServices.getTeamEmailTemplates(props.tripId);
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
    const res = await TripServices.previewTeamEmail(props.tripId, {
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
  sending.value = true;
  error.value = "";
  try {
    const res = await TripServices.sendTeamEmail(props.tripId, requestBody());
    result.value = res.data;
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to send email.";
  } finally {
    sending.value = false;
    showConfirm.value = false;
  }
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
  result.value = null;
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
      <v-card-title>Email team</v-card-title>
      <v-card-text style="max-height: 75vh">
        <v-select
          v-model="emailTemplateId"
          :items="templateItems"
          label="Email template"
          density="compact"
          :loading="templatesLoading"
          no-data-text="No Trip Participant templates"
          class="mb-2"
        />
        <v-text-field
          v-model="subject"
          label="Subject"
          density="compact"
          :disabled="!emailTemplateId"
          class="mb-2"
        />
        <v-textarea
          v-model="emailBody"
          label="Email body"
          density="compact"
          rows="8"
          auto-grow
          :disabled="!emailTemplateId"
          class="mb-2"
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
            <div class="email-preview-body border rounded pa-3">{{ preview.body }}</div>
          </div>
        </div>

        <v-alert v-if="result" type="info" density="compact" class="mb-2">
          <div>{{ result.sent }} sent, {{ result.skipped }} skipped, {{ result.failed }} failed.</div>
          <div
            v-for="row in result.results.filter((r) => r.status !== 'sent')"
            :key="row.personId"
          >
            {{ row.name || "Participant" }}: {{ row.status }} — {{ row.reason }}
          </div>
        </v-alert>
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
      :loading="sending"
      @confirm="confirmSend"
    />
  </v-dialog>
</template>

<style scoped>
.email-preview-body {
  white-space: pre-wrap;
}
</style>
