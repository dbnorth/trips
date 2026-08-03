<script setup>
import PhoneInput from "./PhoneInput.vue";
import PhoneCountryCodeInput from "./PhoneCountryCodeInput.vue";

const props = defineProps({
  modelValue: { type: Object, required: true },
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
</script>

<template>
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
        @update:model-value="update('gender', $event)"
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

  <div class="text-subtitle-2 mb-2">Health information</div>
  <v-select
    :model-value="modelValue.hasAllergies"
    :items="yesNoItems"
    label="Have allergies?"
    density="compact"
    @update:model-value="update('hasAllergies', $event)"
  />
  <v-textarea
    v-if="modelValue.hasAllergies"
    :model-value="modelValue.allergiesDescription"
    label="Allergies description"
    density="compact"
    rows="2"
    @update:model-value="update('allergiesDescription', $event)"
  />
  <v-select
    :model-value="modelValue.takesMedication"
    :items="yesNoItems"
    label="Take medication?"
    density="compact"
    @update:model-value="update('takesMedication', $event)"
  />

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
