<script setup>
import { computed, watch } from "vue";
import { markdownToHtml } from "../utils/markdownPreview.js";

const props = defineProps({
  content: { type: String, default: "" },
  agreementAccepted: { type: Boolean, default: false },
  agreementSignatureName: { type: String, default: "" },
  agreementDate: { type: [String, Date], default: null },
  under18: { type: Boolean, default: false },
  agreementAdultFirstName: { type: String, default: "" },
  agreementAdultLastName: { type: String, default: "" },
  agreementAdultEmail: { type: String, default: "" },
  agreementAdultRelationship: { type: String, default: "" },
  /** When true, show medical agreement block (Take medication? Yes). */
  showMedicalAgreement: { type: Boolean, default: false },
  medicalAgreementContent: { type: String, default: "" },
  medicalAgreementAccepted: { type: Boolean, default: false },
  medicalAgreementDate: { type: [String, Date], default: null },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:agreementAccepted",
  "update:agreementSignatureName",
  "update:agreementAdultFirstName",
  "update:agreementAdultLastName",
  "update:agreementAdultEmail",
  "update:agreementAdultRelationship",
  "update:medicalAgreementAccepted",
]);

const previewHtml = computed(() => markdownToHtml(props.content));
const medicalPreviewHtml = computed(() => markdownToHtml(props.medicalAgreementContent));
const showAgreement = computed(() => !!props.content?.trim());
const showMedicalContent = computed(() => !!props.medicalAgreementContent?.trim());
const showSignatureBlock = computed(
  () => showAgreement.value || (props.showMedicalAgreement && showMedicalContent.value)
);

const agreementDateLabel = computed(() => formatAgreementDate(props.agreementDate));
const medicalAgreementDateLabel = computed(() => formatAgreementDate(props.medicalAgreementDate));

const signatureLabel = computed(() =>
  props.under18
    ? "Adult electronic signature (full name)"
    : "Electronic signature (full name)"
);

const signatureHint = computed(() =>
  props.under18
    ? "Type the adult's full name as the electronic signature"
    : "Type your full name as your electronic signature"
);

function formatAgreementDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const clearAdultFields = () => {
  emit("update:agreementAdultFirstName", "");
  emit("update:agreementAdultLastName", "");
  emit("update:agreementAdultEmail", "");
  emit("update:agreementAdultRelationship", "");
};

const onAccepted = (value) => {
  if (props.disabled) return;
  emit("update:agreementAccepted", !!value);
  if (!value) {
    emit("update:agreementSignatureName", "");
    clearAdultFields();
  }
};

const onMedicalAccepted = (value) => {
  if (props.disabled) return;
  emit("update:medicalAgreementAccepted", !!value);
};

const onSignature = (value) => {
  emit("update:agreementSignatureName", value ?? "");
};

watch(
  () => props.showMedicalAgreement,
  (show) => {
    if (!show && props.medicalAgreementAccepted) {
      emit("update:medicalAgreementAccepted", false);
    }
  }
);
</script>

<template>
  <div class="mt-4">
    <div class="text-subtitle-2 mb-2">Participant agreement</div>

    <v-alert
      v-if="!showAgreement"
      type="info"
      density="compact"
      variant="tonal"
      class="mb-2"
    >
      This organization has not published a participant agreement yet.
    </v-alert>

    <template v-else>
      <div class="agreement-preview pa-4 rounded mb-3">
        <div class="agreement-html" v-html="previewHtml" />
      </div>

      <v-alert v-if="under18" type="warning" density="compact" class="mb-3" variant="tonal">
        Since the participant is under 18, this must be signed by an adult.
      </v-alert>

      <template v-if="under18">
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-text-field
              :model-value="agreementAdultFirstName"
              label="First name"
              density="compact"
              autocomplete="given-name"
              :disabled="disabled"
              @update:model-value="emit('update:agreementAdultFirstName', $event ?? '')"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              :model-value="agreementAdultLastName"
              label="Last name"
              density="compact"
              autocomplete="family-name"
              :disabled="disabled"
              @update:model-value="emit('update:agreementAdultLastName', $event ?? '')"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              :model-value="agreementAdultEmail"
              label="Email"
              type="email"
              density="compact"
              autocomplete="email"
              :disabled="disabled"
              @update:model-value="emit('update:agreementAdultEmail', $event ?? '')"
            />
          </v-col>
          <v-col cols="12" sm="6">
            <v-text-field
              :model-value="agreementAdultRelationship"
              label="Relationship to participant"
              density="compact"
              autocomplete="off"
              :disabled="disabled"
              @update:model-value="emit('update:agreementAdultRelationship', $event ?? '')"
            />
          </v-col>
        </v-row>
      </template>
    </template>

    <div v-if="showMedicalAgreement" class="mb-4 mt-4">
      <div class="text-subtitle-2 mb-2">Medical agreement</div>
      <v-alert
        v-if="!showMedicalContent"
        type="info"
        density="compact"
        variant="tonal"
        class="mb-2"
      >
        This organization has not published a medical agreement yet.
      </v-alert>
      <div v-else class="agreement-preview pa-4 rounded mb-3">
        <div class="agreement-html" v-html="medicalPreviewHtml" />
      </div>
    </div>

    <template v-if="showSignatureBlock">
      <v-checkbox
        v-if="showAgreement"
        :model-value="agreementAccepted"
        label="I agree to the Participation agreement"
        density="compact"
        hide-details
        :disabled="disabled"
        class="mt-0 mb-2"
        @update:model-value="onAccepted"
      />

      <div v-if="showAgreement && agreementAccepted && agreementDateLabel" class="text-caption text-medium-emphasis mb-2">
        Agreement date: {{ agreementDateLabel }}
      </div>

      <v-checkbox
        v-if="showMedicalAgreement && showMedicalContent"
        :model-value="medicalAgreementAccepted"
        label="I agree to the medical agreement"
        density="compact"
        hide-details
        :disabled="disabled"
        class="mt-0 mb-2"
        @update:model-value="onMedicalAccepted"
      />
      <div
        v-if="showMedicalAgreement && showMedicalContent && medicalAgreementAccepted && medicalAgreementDateLabel"
        class="text-caption text-medium-emphasis mb-2"
      >
        Medical agreement date: {{ medicalAgreementDateLabel }}
      </div>

      <div class="text-body-2 mb-2 mt-2">
        I agree and understand that by typing my name below that it serves as my electronic
        signature and it is the legal equivalent of my manual/handwritten signature and I consent
        to be legally bound to each agreement I accept using the I agree checkboxes above.
      </div>

      <v-text-field
        :model-value="agreementSignatureName"
        :label="signatureLabel"
        density="compact"
        autocomplete="name"
        :disabled="disabled"
        :hint="signatureHint"
        persistent-hint
        class="mb-3"
        @update:model-value="onSignature"
      />
    </template>
  </div>
</template>

<style scoped>
.agreement-preview {
  background: rgba(0, 0, 0, 0.04);
  overflow-x: hidden;
}

.agreement-html :deep(h1) {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.agreement-html :deep(h2) {
  font-size: 1.15rem;
  margin: 1.1rem 0 0.5rem;
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
</style>
