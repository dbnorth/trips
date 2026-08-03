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
  /** When false, I Agree is disabled until profile + application are complete. */
  canAgree: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:agreementAccepted",
  "update:agreementSignatureName",
  "update:agreementAdultFirstName",
  "update:agreementAdultLastName",
  "update:agreementAdultEmail",
  "update:agreementAdultRelationship",
]);

const previewHtml = computed(() => markdownToHtml(props.content));
const showAgreement = computed(() => !!props.content?.trim());
const agreeDisabled = computed(() => props.disabled || !props.canAgree);

const agreementDateLabel = computed(() => {
  if (!props.agreementDate) return "";
  const d = new Date(props.agreementDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
});

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

const clearAdultFields = () => {
  emit("update:agreementAdultFirstName", "");
  emit("update:agreementAdultLastName", "");
  emit("update:agreementAdultEmail", "");
  emit("update:agreementAdultRelationship", "");
};

const onAccepted = (value) => {
  if (agreeDisabled.value) return;
  emit("update:agreementAccepted", !!value);
  if (!value) {
    emit("update:agreementSignatureName", "");
    clearAdultFields();
  }
};

const onSignature = (value) => {
  emit("update:agreementSignatureName", value ?? "");
};

watch(
  () => props.canAgree,
  (ok) => {
    if (!ok && props.agreementAccepted) {
      emit("update:agreementAccepted", false);
    }
  }
);
</script>

<template>
  <div v-if="showAgreement" class="mt-4">
    <div class="text-subtitle-2 mb-2">Participant agreement</div>
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

    <div class="text-body-2 mb-2">
      I agree and understand that by typing my name below that it serves as my electronic
      signature and it is the legal equivalent of my manual/handwritten signature and I consent
      to be legally bound to this agreement.
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

    <v-alert
      v-if="!canAgree"
      type="info"
      density="compact"
      variant="tonal"
      class="mb-2"
    >
      Your profile and application must be complete before you can agree to this agreement.
    </v-alert>

    <v-checkbox
      :model-value="agreementAccepted"
      label="I Agree"
      density="compact"
      hide-details
      :disabled="agreeDisabled"
      class="mt-0 mb-2"
      @update:model-value="onAccepted"
    />

    <div v-if="agreementAccepted && agreementDateLabel" class="text-caption text-medium-emphasis mt-1">
      Agreement date: {{ agreementDateLabel }}
    </div>
  </div>
</template>

<style scoped>
.agreement-preview {
  background: rgba(0, 0, 0, 0.04);
  max-height: 320px;
  overflow: auto;
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

.agreement-html :deep(a:hover) {
  color: #0d47a1 !important;
}
</style>
