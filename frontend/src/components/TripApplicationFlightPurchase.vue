<script setup>
import { ref, computed, watch, onMounted } from "vue";
import AirportServices from "../services/airportServices.js";
import AirlineServices from "../services/airlineServices.js";
import { CABIN_CLASSES } from "../utils/cabinClasses.js";

const props = defineProps({
  flightPurchaseOption: { type: String, default: null },
  preferredDepartureAirportCode: { type: String, default: null },
  preferredReturnAirportCode: { type: String, default: null },
  preferredCabinClass: { type: String, default: "" },
  preferredAirlineCode: { type: String, default: null },
  preferredRefundableTicket: { type: Boolean, default: null },
  organizationName: { type: String, default: "Organization" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits([
  "update:flightPurchaseOption",
  "update:preferredDepartureAirportCode",
  "update:preferredReturnAirportCode",
  "update:preferredCabinClass",
  "update:preferredAirlineCode",
  "update:preferredRefundableTicket",
]);

const airports = ref([]);
const airlines = ref([]);
const catalogsError = ref("");

const cabinClassItems = computed(() => {
  const current = String(props.preferredCabinClass || "").trim();
  if (current && !CABIN_CLASSES.includes(current)) {
    return [current, ...CABIN_CLASSES];
  }
  return [...CABIN_CLASSES];
});

const orgLabel = computed(() => {
  const name = (props.organizationName || "Organization").trim() || "Organization";
  return `${name} arrange for and purchase my air travel`;
});

const purchaseItems = computed(() => [
  {
    title: "Arrange for and purchase my own air travel",
    value: "self",
  },
  {
    title: orgLabel.value,
    value: "organization",
  },
]);

const airportItems = computed(() =>
  airports.value.map((a) => ({
    title: `${a.code} — ${a.city}`,
    value: a.code,
    search: `${a.code} ${a.city} ${a.airportName} ${a.country}`.toLowerCase(),
  }))
);

const airlineItems = computed(() =>
  airlines.value.map((a) => ({
    title: `${a.code} — ${a.name}`,
    value: a.code,
    search: `${a.code} ${a.name}`.toLowerCase(),
  }))
);

const catalogFilter = (_title, queryText, item) => {
  const q = String(queryText || "")
    .toLowerCase()
    .trim();
  if (!q) return true;
  const search = item?.raw?.search ?? String(_title || "").toLowerCase();
  return search.includes(q);
};

const showOrgPrefs = computed(() => props.flightPurchaseOption === "organization");

const loadCatalogs = async () => {
  catalogsError.value = "";
  try {
    const [airportRes, airlineRes] = await Promise.all([
      AirportServices.getAll(),
      AirlineServices.getAll(),
    ]);
    airports.value = airportRes.data || [];
    airlines.value = airlineRes.data || [];
  } catch (e) {
    catalogsError.value = e.response?.data?.message || "Unable to load airport/airline lists.";
  }
};

watch(
  () => props.flightPurchaseOption,
  (value) => {
    if (value !== "organization") {
      emit("update:preferredDepartureAirportCode", null);
      emit("update:preferredReturnAirportCode", null);
      emit("update:preferredCabinClass", "");
      emit("update:preferredAirlineCode", null);
      emit("update:preferredRefundableTicket", null);
    }
  }
);

onMounted(loadCatalogs);
</script>

<template>
  <div>
    <div class="text-subtitle-2 mb-1 mt-2">Flight purchase</div>
    <v-radio-group
      :model-value="flightPurchaseOption"
      :disabled="disabled"
      density="compact"
      hide-details="auto"
      class="mt-0"
      @update:model-value="(v) => $emit('update:flightPurchaseOption', v)"
    >
      <v-radio
        v-for="item in purchaseItems"
        :key="item.value"
        :label="item.title"
        :value="item.value"
        density="compact"
      />
    </v-radio-group>

    <v-alert v-if="catalogsError" type="error" density="compact" class="mb-2">
      {{ catalogsError }}
    </v-alert>

    <template v-if="showOrgPrefs">
      <v-autocomplete
        :model-value="preferredDepartureAirportCode"
        :items="airportItems"
        :custom-filter="catalogFilter"
        item-title="title"
        item-value="value"
        label="Preferred departure airport"
        density="compact"
        clearable
        auto-select-first
        :disabled="disabled"
        class="mt-2"
        @update:model-value="(v) => $emit('update:preferredDepartureAirportCode', v)"
      />
      <v-autocomplete
        :model-value="preferredReturnAirportCode"
        :items="airportItems"
        :custom-filter="catalogFilter"
        item-title="title"
        item-value="value"
        label="Preferred return airport"
        density="compact"
        clearable
        auto-select-first
        :disabled="disabled"
        @update:model-value="(v) => $emit('update:preferredReturnAirportCode', v)"
      />
      <v-select
        :model-value="preferredCabinClass || null"
        :items="cabinClassItems"
        label="Class of travel"
        density="compact"
        clearable
        :disabled="disabled"
        @update:model-value="(v) => $emit('update:preferredCabinClass', v || '')"
      />
      <v-select
        :model-value="
          preferredRefundableTicket === true || preferredRefundableTicket === false
            ? preferredRefundableTicket
            : null
        "
        :items="[
          { title: 'Yes', value: true },
          { title: 'No', value: false },
        ]"
        item-title="title"
        item-value="value"
        label="Refundable ticket"
        density="compact"
        clearable
        :disabled="disabled"
        @update:model-value="(v) => $emit('update:preferredRefundableTicket', v ?? null)"
      />
      <v-autocomplete
        :model-value="preferredAirlineCode"
        :items="airlineItems"
        :custom-filter="catalogFilter"
        item-title="title"
        item-value="value"
        label="Preferred airline"
        density="compact"
        clearable
        auto-select-first
        :disabled="disabled"
        @update:model-value="(v) => $emit('update:preferredAirlineCode', v)"
      />
    </template>
  </div>
</template>
