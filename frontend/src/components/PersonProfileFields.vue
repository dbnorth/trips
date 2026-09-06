<script setup>
import { ref, watch, computed } from "vue";
import PhoneInput from "./PhoneInput.vue";
import PhoneCountryCodeInput from "./PhoneCountryCodeInput.vue";
import MedicalConditionServices from "../services/medicalConditionServices.js";

const DOCTOR_TRAVEL_DOCUMENT_MESSAGE =
  "You must provide a document from your doctor that says it is safe for you to travel on the trip dates.";

const props = defineProps({
  modelValue: { type: Object, required: true },
  /** Organization whose medical-condition catalog to load (FR-008). */
  orgId: { type: [Number, String], default: null },
  /** When true, only allergies / medication / medical conditions are shown (application forms). */
  healthOnly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const update = (field, value) => {
  emit("update:modelValue", { ...props.modelValue, [field]: value });
};

const yesNoItems = [
  { title: "No", value: false },
  { title: "Yes", value: true },
];

const genderItems = [
  { title: "Male", value: "male" },
  { title: "Female", value: "female" },
];

const showPregnancyFields = computed(
  () => props.healthOnly && props.modelValue?.gender === "female"
);

const catalog = ref([]);
const catalogLoading = ref(false);
const catalogError = ref("");

const conditionItems = computed(() =>
  catalog.value.map((row) => ({ title: row.name, value: row.id }))
);

const hasOrgContext = computed(() => props.orgId != null && props.orgId !== "");

const loadCatalog = async () => {
  catalogError.value = "";
  if (!hasOrgContext.value) {
    catalog.value = [];
    return;
  }
  catalogLoading.value = true;
  try {
    const res = await MedicalConditionServices.getAll({ orgId: props.orgId });
    catalog.value = res.data || [];
  } catch (e) {
    catalog.value = [];
    catalogError.value = e.response?.data?.message || "Unable to load medical conditions.";
  } finally {
    catalogLoading.value = false;
  }
};

watch(
  () => [props.orgId, props.modelValue?.takesMedication],
  ([, takesMedication]) => {
    if (takesMedication === true) loadCatalog();
  },
  { immediate: true }
);

const onGenderChange = (value) => {
  const next = { ...props.modelValue, gender: value };
  if (value !== "female") {
    next.isPregnant = null;
    next.pregnancyDueDate = null;
  }
  emit("update:modelValue", next);
};

const onIsPregnantChange = (value) => {
  const next = { ...props.modelValue, isPregnant: value };
  if (value !== true) {
    next.pregnancyDueDate = null;
  }
  emit("update:modelValue", next);
};

const onTakesMedicationChange = (value) => {
  const next = { ...props.modelValue, takesMedication: value };
  if (value !== true) {
    next.medicalConditionIds = [];
  }
  emit("update:modelValue", next);
};
</script>

<template>
  <template v-if="!healthOnly">
    <div class="text-subtitle-2 mb-2 mt-2">Personal details</div>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-text-field
          :model-value="modelValue.birthDate"
          label="Birthdate"
          type="date"
          density="compact"
          @update:model-value="update('birthDate', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          :model-value="modelValue.gender"
          :items="genderItems"
          label="Gender"
          density="compact"
          clearable
          @update:model-value="onGenderChange"
        />
      </v-col>
    </v-row>

    <div class="text-subtitle-2 mb-2">Emergency contact</div>
    <v-text-field
      :model-value="modelValue.emergencyContactName"
      label="Emergency contact name"
      density="compact"
      autocomplete="off"
      @update:model-value="update('emergencyContactName', $event)"
    />
    <v-row dense>
      <v-col cols="4">
        <PhoneCountryCodeInput
          :model-value="modelValue.emergencyContactPhoneCountryCode"
          label="Country code"
          @update:model-value="update('emergencyContactPhoneCountryCode', $event)"
        />
      </v-col>
      <v-col cols="8">
        <PhoneInput
          :model-value="modelValue.emergencyContactPhoneNumber"
          label="Emergency contact phone"
          @update:model-value="update('emergencyContactPhoneNumber', $event)"
        />
      </v-col>
    </v-row>
  </template>

  <div class="text-subtitle-2 mb-2" :class="healthOnly ? 'mt-2' : ''">Health information</div>
  <v-select
    :model-value="modelValue.hasAllergies"
    :items="yesNoItems"
    label="Have allergies?"
    density="compact"
    :disabled="disabled"
    @update:model-value="update('hasAllergies', $event)"
  />
  <v-textarea
    v-if="modelValue.hasAllergies === true"
    :model-value="modelValue.allergiesDescription"
    label="Allergies description"
    density="compact"
    rows="2"
    :disabled="disabled"
    @update:model-value="update('allergiesDescription', $event)"
  />
  <template v-if="showPregnancyFields">
    <v-select
      :model-value="modelValue.isPregnant"
      :items="yesNoItems"
      label="Are you pregnant?"
      density="compact"
      :disabled="disabled"
      @update:model-value="onIsPregnantChange"
    />
    <template v-if="modelValue.isPregnant === true">
      <v-text-field
        :model-value="modelValue.pregnancyDueDate"
        label="Due date"
        type="date"
        density="compact"
        :disabled="disabled"
        @update:model-value="update('pregnancyDueDate', $event)"
      />
      <v-alert type="info" density="compact" class="mb-2">
        {{ DOCTOR_TRAVEL_DOCUMENT_MESSAGE }}
      </v-alert>
    </template>
  </template>
  <v-select
    :model-value="modelValue.takesMedication"
    :items="yesNoItems"
    label="Take medication?"
    density="compact"
    :disabled="disabled"
    @update:model-value="onTakesMedicationChange"
  />
  <template v-if="modelValue.takesMedication === true">
    <v-alert
      v-if="!hasOrgContext"
      type="info"
      density="compact"
      class="mb-2"
    >
      Select an organization to choose medical conditions.
    </v-alert>
    <v-alert
      v-else-if="catalogError"
      type="error"
      density="compact"
      class="mb-2"
    >
      {{ catalogError }}
    </v-alert>
    <v-alert
      v-else-if="!catalogLoading && !conditionItems.length"
      type="warning"
      density="compact"
      class="mb-2"
    >
      This organization has no medical conditions configured. Ask an organization admin to add them.
    </v-alert>
    <v-select
      v-else
      :model-value="modelValue.medicalConditionIds || []"
      :items="conditionItems"
      label="Medical conditions"
      density="compact"
      multiple
      chips
      closable-chips
      :loading="catalogLoading"
      :disabled="disabled"
      @update:model-value="update('medicalConditionIds', $event || [])"
    />
  </template>

  <template v-if="!healthOnly">
    <div class="text-subtitle-2 mb-2">Current church home</div>
    <v-text-field
      :model-value="modelValue.currentChurchHome"
      label="Church name"
      density="compact"
      autocomplete="off"
      @update:model-value="update('currentChurchHome', $event)"
    />
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-text-field
          :model-value="modelValue.currentChurchHomeCity"
          label="Church city"
          density="compact"
          autocomplete="off"
          @update:model-value="update('currentChurchHomeCity', $event)"
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-text-field
          :model-value="modelValue.currentChurchHomeStateProv"
          label="Church state/province"
          density="compact"
          autocomplete="off"
          @update:model-value="update('currentChurchHomeStateProv', $event)"
        />
      </v-col>
    </v-row>
  </template>
</template>
