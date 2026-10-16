<script setup>
import { ref, computed, watch } from "vue";
import PersonServices from "../services/personServices.js";
import { personDisplayName } from "../utils/personProfile.js";
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

const displayName = computed(() => personDisplayName(person.value, "Contact"));

const formatPhone = (countryCode, number) => {
  const parts = [];
  if (countryCode) parts.push(formatCountryCode(countryCode));
  const formatted = formatPhoneForDisplay(number);
  if (formatted) parts.push(formatted);
  return parts.join(" ") || "—";
};

const addressLines = computed(() => {
  const p = person.value;
  if (!p) return [];
  const lines = [];
  if (p.addLine1) lines.push(p.addLine1);
  if (p.addLine2) lines.push(p.addLine2);
  const cityStatePostal = [p.city, p.state_prov, p.postalCode].filter(Boolean).join(", ");
  if (cityStatePostal) lines.push(cityStatePostal);
  if (p.country) lines.push(countryName(p.country) || p.country);
  return lines;
});

const contactRows = computed(() => {
  const p = person.value;
  if (!p) return [];
  return [
    { label: "Email", value: p.email?.trim() || "—" },
    { label: "Phone", value: formatPhone(p.phoneContryCode, p.phoneNumber) },
    {
      label: "Address",
      value: addressLines.value.length ? addressLines.value.join("\n") : "—",
      multiline: true,
    },
  ];
});

const loadPerson = async () => {
  if (!props.personId) return;
  loading.value = true;
  loadError.value = "";
  person.value = null;
  try {
    const res = await PersonServices.get(props.personId);
    person.value = res.data || null;
  } catch (e) {
    loadError.value = e.response?.data?.message || "Unable to load contact info.";
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
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="(v) => !v && close()"
  >
    <v-card>
      <v-card-title>{{ displayName }}</v-card-title>
      <v-card-subtitle>Contact info</v-card-subtitle>

      <v-card-text>
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />
        <v-alert v-else-if="loadError" type="error" density="compact" class="mb-0">
          {{ loadError }}
        </v-alert>
        <template v-else-if="person">
          <div v-for="row in contactRows" :key="row.label" class="mb-3">
            <div class="text-caption text-medium-emphasis">{{ row.label }}</div>
            <div :class="{ 'contact-multiline': row.multiline }" style="white-space: pre-line">
              {{ row.value }}
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
