<script setup>
import { ref, computed, watch } from "vue";
import PersonServices from "../services/personServices.js";
import {
  getMissingProfileFields,
  isProfileComplete,
  isProfileFieldMissing,
  personDisplayName,
} from "../utils/personProfile.js";
import { countryName } from "../utils/locationData.js";
import { formatCountryCode, formatPhoneForDisplay } from "../utils/phoneUtils.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  personId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue"]);

const loading = ref(false);
const loadError = ref("");
const person = ref(null);

const missingFields = computed(() => getMissingProfileFields(person.value));
const profileComplete = computed(() => isProfileComplete(person.value));

const pictureUrl = computed(() => PersonServices.getPictureUrl(person.value?.picture));

const displayName = computed(() => personDisplayName(person.value, "Profile"));

const formatYesNo = (value) => (value ? "Yes" : "No");

const formatGender = (value) => {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return "";
};

const formatPhone = (countryCode, number) => {
  const parts = [];
  if (countryCode) parts.push(formatCountryCode(countryCode));
  const formatted = formatPhoneForDisplay(number);
  if (formatted) parts.push(formatted);
  return parts.join(" ") || "";
};

const fieldRows = computed(() => {
  const p = person.value;
  if (!p) return [];

  const rows = [
    { key: "firstName", label: "First name", value: p.firstName },
    { key: "lastName", label: "Last name", value: p.lastName },
    { key: "email", label: "Email", value: p.email },
    { key: "addLine1", label: "Address line 1", value: p.addLine1 },
    { label: "Address line 2", value: p.addLine2 },
    { key: "city", label: "City", value: p.city },
    { key: "country", label: "Country", value: p.country ? countryName(p.country) : "" },
    { key: "state_prov", label: "State/province", value: p.state_prov },
    { key: "postalCode", label: "Postal code", value: p.postalCode },
    {
      key: "phoneContryCode",
      label: "Phone",
      value: formatPhone(p.phoneContryCode, p.phoneNumber),
      missingKeys: ["phoneContryCode", "phoneNumber"],
    },
    { key: "birthDate", label: "Birthdate", value: p.birthDate },
    { key: "gender", label: "Gender", value: formatGender(p.gender) },
    { key: "emergencyContactName", label: "Emergency contact name", value: p.emergencyContactName },
    {
      key: "emergencyContactPhoneCountryCode",
      label: "Emergency contact phone",
      value: formatPhone(p.emergencyContactPhoneCountryCode, p.emergencyContactPhoneNumber),
      missingKeys: ["emergencyContactPhoneCountryCode", "emergencyContactPhoneNumber"],
    },
    { label: "Have allergies?", value: formatYesNo(p.hasAllergies) },
  ];

  if (p.hasAllergies) {
    rows.push({
      key: "allergiesDescription",
      label: "Allergies description",
      value: p.allergiesDescription,
    });
  }

  rows.push(
    { label: "Take medication?", value: formatYesNo(p.takesMedication) },
    { key: "currentChurchHome", label: "Current church home", value: p.currentChurchHome },
    { key: "currentChurchHomeCity", label: "Church city", value: p.currentChurchHomeCity },
    {
      key: "currentChurchHomeStateProv",
      label: "Church state/province",
      value: p.currentChurchHomeStateProv,
    },
    { label: "Bio", value: p.bioText }
  );

  return rows;
});

const isRowMissing = (row) => {
  if (!person.value) return false;
  if (row.missingKeys?.length) {
    return row.missingKeys.some((key) => isProfileFieldMissing(person.value, key));
  }
  if (!row.key) return false;
  return isProfileFieldMissing(person.value, row.key);
};

const displayValue = (row) => {
  const value = row.value;
  if (value == null || String(value).trim() === "") return null;
  return value;
};

const loadPerson = async () => {
  if (!props.personId) return;
  loading.value = true;
  loadError.value = "";
  person.value = null;
  try {
    const res = await PersonServices.get(props.personId);
    person.value = res.data || null;
  } catch (e) {
    loadError.value = e.response?.data?.message || "Unable to load profile.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.personId],
  ([open, id]) => {
    if (open && id) loadPerson();
    if (!open) {
      person.value = null;
      loadError.value = "";
    }
  }
);

const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>{{ displayName }}</v-card-title>

      <v-card-text style="max-height: 75vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <v-alert v-else-if="loadError" type="error" density="compact" class="mb-4">
          {{ loadError }}
        </v-alert>

        <template v-else-if="person">
          <v-alert
            v-if="!profileComplete"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Profile incomplete. {{ missingFields.length }} required field{{
              missingFields.length === 1 ? "" : "s"
            }}
            missing.
          </v-alert>

          <div class="d-flex align-center ga-3 mb-4">
            <v-avatar v-if="pictureUrl" size="72" rounded="lg">
              <v-img :src="pictureUrl" :alt="displayName" cover />
            </v-avatar>
            <v-avatar v-else size="72" rounded="lg" color="grey-lighten-3" />
          </div>

          <div v-for="(row, index) in fieldRows" :key="`${row.label}-${index}`" class="mb-3">
            <div class="text-caption text-medium-emphasis">{{ row.label }}</div>
            <div class="d-flex align-center ga-2">
              <span :class="{ 'text-error font-weight-medium': isRowMissing(row) }">
                {{ displayValue(row) || (isRowMissing(row) ? "Missing" : "—") }}
              </span>
              <v-chip v-if="isRowMissing(row)" size="x-small" color="error" variant="tonal">
                Missing
              </v-chip>
            </div>
          </div>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
