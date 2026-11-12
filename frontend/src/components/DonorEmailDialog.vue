<script setup>
import { computed, ref, watch } from "vue";
import DonorEmailServices from "../services/donorEmailServices.js";
import ConfirmDialog from "./ConfirmDialog.vue";
import { emailBodyIsBlank } from "../utils/emailBody.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const templates = ref([]);
const trips = ref([]);
const donors = ref([]);
const templateId = ref(null);
const subject = ref("");
const emailBody = ref("");
const scope = ref("all");
const tripId = ref(null);
const checked = ref([]);
const loading = ref(false);
const error = ref("");
const showConfirm = ref(false);
const sending = ref(false);
const result = ref(null);
const preview = ref(null);
const previewOpen = ref(false);
const previewAs = ref(null);

const scopeItems = [
  { title: "All", value: "all" },
  { title: "Donated this year", value: "this-year" },
  { title: "Donated to a trip", value: "trip" },
];

const tripItems = computed(() => trips.value.map((trip) => ({ title: trip.name, value: trip.id })));

const checkedDonors = computed(() => donors.value.filter((donor) => checked.value.includes(donor.id)));

const canSubmit = computed(
  () =>
    !!templateId.value &&
    !!subject.value.trim() &&
    !emailBodyIsBlank(emailBody.value) &&
    (scope.value !== "trip" || !!tripId.value) &&
    checked.value.length > 0
);

const resultText = computed(() => {
  if (!result.value) return "";
  return `Sent ${result.value.sent}, skipped ${result.value.skipped}, failed ${result.value.failed}`;
});

const problems = computed(() =>
  (result.value?.results || []).filter((row) => row.status !== "sent")
);

const close = () => emit("update:modelValue", false);

const donorLabel = (donor) =>
  donor?.donorType === "organization"
    ? (donor.organizationName || "").trim()
    : [donor.firstName, donor.lastName].filter(Boolean).join(" ").trim();

const loadRecipients = () => {
  if (scope.value === "trip" && !tripId.value) {
    donors.value = [];
    checked.value = [];
    return Promise.resolve();
  }
  return DonorEmailServices.getRecipients({
    scope: scope.value,
    ...(scope.value === "trip" ? { tripId: tripId.value } : {}),
  }).then((r) => {
    donors.value = r.data || [];
    const listed = new Set(donors.value.map((donor) => donor.id));
    checked.value = checked.value.filter((id) => listed.has(id));
    if (!checked.value.includes(previewAs.value)) previewAs.value = checked.value[0] ?? null;
  });
};

const load = () => {
  loading.value = true;
  error.value = "";
  result.value = null;
  DonorEmailServices.getOptions()
    .then((r) => {
      templates.value = r.data?.templates || [];
      trips.value = r.data?.trips || [];
      return loadRecipients();
    })
    .catch((e) => {
      error.value = e.response?.data?.message || "Unable to load donors.";
    })
    .finally(() => {
      loading.value = false;
    });
};

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    templateId.value = null;
    subject.value = "";
    emailBody.value = "";
    scope.value = "all";
    tripId.value = null;
    checked.value = [];
    preview.value = null;
    previewOpen.value = false;
    load();
  }
);

watch(templateId, (id) => {
  const template = templates.value.find((row) => row.id === id);
  if (!template) return;
  subject.value = template.subject || "";
  emailBody.value = template.emailBody || "";
});

watch([scope, tripId], () => {
  if (!props.modelValue) return;
  loadRecipients().catch((e) => {
    error.value = e.response?.data?.message || "Unable to load donors.";
  });
});

const allChecked = computed(
  () => donors.value.length > 0 && donors.value.every((donor) => checked.value.includes(donor.id))
);

const toggleAll = (value) => {
  checked.value = value ? donors.value.map((donor) => donor.id) : [];
  if (!checked.value.includes(previewAs.value)) previewAs.value = checked.value[0] ?? null;
};

const toggleOne = (id, value) => {
  checked.value = value ? [...checked.value, id] : checked.value.filter((row) => row !== id);
  if (!checked.value.includes(previewAs.value)) previewAs.value = checked.value[0] ?? previewAs.value;
};

const openPreview = () => {
  const donorId = previewAs.value || checked.value[0];
  error.value = "";
  DonorEmailServices.preview({
    emailTemplateId: templateId.value,
    subject: subject.value,
    emailBody: emailBody.value,
    donorId,
  })
    .then((r) => {
      preview.value = r.data;
      previewOpen.value = true;
    })
    .catch((e) => {
      error.value = e.response?.data?.message || "Unable to preview this email.";
    });
};

const confirmSend = () => {
  sending.value = true;
  error.value = "";
  showConfirm.value = false;
  DonorEmailServices.send({
    emailTemplateId: templateId.value,
    subject: subject.value,
    emailBody: emailBody.value,
    donorIds: checked.value,
  })
    .then((r) => {
      result.value = r.data;
    })
    .catch((e) => {
      error.value = e.response?.data?.message || "Unable to send this email.";
    })
    .finally(() => {
      sending.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="720" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Email donors</v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>
        <v-alert v-if="!loading && !templates.length" type="info" density="compact" class="mb-3">
          No Donor templates. Add one under Email templates.
        </v-alert>
        <v-select
          v-model="templateId"
          :items="templates"
          item-title="subject"
          item-value="id"
          label="Template"
          density="compact"
          :loading="loading"
        />
        <v-text-field v-model="subject" label="Subject" density="compact" />
        <v-textarea v-model="emailBody" label="Email body" density="compact" rows="6" />

        <v-select v-model="scope" :items="scopeItems" label="Donors" density="compact" />
        <v-select
          v-if="scope === 'trip'"
          v-model="tripId"
          :items="tripItems"
          label="Trip"
          density="compact"
        />

        <div class="d-flex align-center mb-2">
          <v-checkbox
            :model-value="allChecked"
            label="Select all"
            density="compact"
            hide-details
            :disabled="!donors.length"
            @update:model-value="toggleAll"
          />
          <span class="text-body-2 ml-4">Recipients: {{ checked.length }}</span>
        </div>
        <div v-for="donor in donors" :key="donor.id" class="d-flex align-center">
          <v-checkbox
            :model-value="checked.includes(donor.id)"
            :label="`${donorLabel(donor)} (${donor.email})`"
            density="compact"
            hide-details
            @update:model-value="(value) => toggleOne(donor.id, value)"
          />
        </div>

        <v-select
          v-if="checkedDonors.length"
          v-model="previewAs"
          :items="checkedDonors.map((donor) => ({ title: donorLabel(donor), value: donor.id }))"
          label="Preview as"
          density="compact"
          class="mt-3"
        />

        <v-alert v-if="result" type="info" density="compact" class="mt-3">
          <div>{{ resultText }}</div>
          <div v-for="row in problems" :key="row.donorId">{{ row.name }}: {{ row.reason }}</div>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn variant="tonal" :disabled="!canSubmit" @click="openPreview">Preview</v-btn>
        <v-btn color="primary" :disabled="!canSubmit" :loading="sending" @click="showConfirm = true">Send</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="previewOpen" max-width="640">
    <v-card v-if="preview">
      <v-card-title>Preview</v-card-title>
      <v-card-text>
        <div>From: {{ preview.from }}</div>
        <div>Reply-To: {{ preview.replyTo }}</div>
        <div>To: {{ preview.to }}</div>
        <div>Subject: {{ preview.subject }}</div>
        <div class="mt-3" style="white-space: pre-wrap">{{ preview.body }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="previewOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ConfirmDialog
    v-model="showConfirm"
    title="Are you sure?"
    :message="`Send this email to ${checked.length} donors?`"
    confirm-text="Send"
    cancel-text="Cancel"
    @confirm="confirmSend"
  />
</template>
