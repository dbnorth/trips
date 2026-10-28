<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import MoneyInput from "./MoneyInput.vue";
import TripApplicationTravelOptions from "./TripApplicationTravelOptions.vue";
import { formatMoneyDisplay, parseMoneyAmount } from "../utils/moneyUtils.js";
import { TRIP_PARTICIPANT_STATUS_OPTIONS } from "../utils/tripParticipantStatus.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";
import { DAYS_MESSAGE, parseDays } from "../utils/tripDays.js";
import { travelOptionDaysError } from "../utils/tripApplicationForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  participant: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const tripDefaultCost = ref(null);
const tripWorkerRoles = ref([]);
const travelOptions = ref([]);
const selectedTravelOptionIds = ref([]);
const saving = ref(false);
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const statusItems = TRIP_PARTICIPANT_STATUS_OPTIONS;
const ADDON_EXPENSE_MESSAGE = "Each add-on expense needs a description and a cost of $0 or more.";

const form = ref({
  status: "incomplete",
  tripWorkerRoleId: null,
  participantCost: "",
  addonExpenses: [],
  whygoText: "",
  version: 0,
});

const addonTotal = computed(() =>
  form.value.addonExpenses.reduce((sum, expense) => sum + (parseMoneyAmount(expense.cost) || 0), 0)
);

const addAddonExpense = () =>
  form.value.addonExpenses.push({ description: "", cost: "", daysBefore: "", daysAfter: "" });
const removeAddonExpense = (index) => form.value.addonExpenses.splice(index, 1);

const participantName = computed(() => {
  const p = props.participant?.person;
  if (!p) return "Participant";
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").trim() || "Participant";
});

const tripWorkerRoleLabel = (row) => {
  const name = row.workerRole?.name || "Worker role";
  const qty = row.quantity != null ? ` (need ${row.quantity})` : "";
  return `${name}${qty}`;
};

const applyParticipant = (row) => {
  if (!row) return;
  form.value = {
    status: row.status || "incomplete",
    tripWorkerRoleId: row.tripWorkerRoleId ?? null,
    participantCost: row.participantCost != null ? String(row.participantCost) : "",
    addonExpenses: (row.addonExpenses || []).map((expense) => ({
      description: expense.description || "",
      cost: expense.cost != null ? Number(expense.cost).toFixed(2) : "",
      daysBefore: expense.daysBefore ? String(expense.daysBefore) : "",
      daysAfter: expense.daysAfter ? String(expense.daysAfter) : "",
    })),
    whygoText: row.whygoText || "",
    version: row.version ?? 0,
  };
};

const loadTripDefault = async (tripId) => {
  if (!tripId) {
    tripDefaultCost.value = null;
    return;
  }
  try {
    const res = await TripServices.get(tripId);
    tripDefaultCost.value = res.data?.participantCost ?? null;
  } catch {
    tripDefaultCost.value = null;
  }
};

const loadTripWorkerRoles = async (tripId) => {
  if (!tripId) {
    tripWorkerRoles.value = [];
    return;
  }
  try {
    const res = await TripWorkerRoleServices.getAll(tripId);
    tripWorkerRoles.value = res.data || [];
  } catch {
    tripWorkerRoles.value = [];
  }
};

const loadTravelOptions = async (assignmentId) => {
  travelOptions.value = [];
  selectedTravelOptionIds.value = [];
  if (!assignmentId) return;
  try {
    const res = await TripPeopleRoleServices.get(assignmentId);
    travelOptions.value = res.data?.travelOptions || [];
    selectedTravelOptionIds.value = travelOptions.value
      .filter((option) => option.selected)
      .map((option) => Number(option.id));
  } catch {
    travelOptions.value = [];
  }
};

const optionsTotal = (ids) => {
  const selected = new Set(ids.map(Number));
  return travelOptions.value.reduce(
    (sum, option) => (selected.has(Number(option.id)) ? sum + (Number(option.priceAdjustment) || 0) : sum),
    0
  );
};

const onTravelOptionsChange = (ids) => {
  const difference = Math.round((optionsTotal(ids) - optionsTotal(selectedTravelOptionIds.value)) * 100) / 100;
  selectedTravelOptionIds.value = ids;
  if (!difference) return;
  const typed = form.value.participantCost;
  const base =
    typed != null && typed !== "" ? parseMoneyAmount(typed) : parseMoneyAmount(tripDefaultCost.value);
  if (base == null) return;
  form.value.participantCost = (Math.round((base + difference) * 100) / 100).toFixed(2);
};

const load = async ({ afterConflict = false } = {}) => {
  onLoadStart({ afterConflict });
  const tripId = props.participant?.tripId;
  await Promise.all([
    loadTripDefault(tripId),
    loadTripWorkerRoles(tripId),
    loadTravelOptions(props.participant?.id),
  ]);
  applyParticipant(props.participant);
  onLoadSuccess({ afterConflict });
};

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.participant) load();
  }
);

watch(
  () => props.participant,
  (row) => {
    if (props.modelValue && row) applyParticipant(row);
  }
);

const close = () => emit("update:modelValue", false);

const save = async () => {
  if (!props.participant?.id) return;

  prepareSave();

  const addonExpenses = [];
  for (const expense of form.value.addonExpenses) {
    const description = expense.description?.trim() || "";
    const costText = expense.cost == null ? "" : String(expense.cost).trim();
    if (!description && !costText) continue;
    const cost = parseMoneyAmount(costText);
    if (!description || cost == null) {
      formError.value = ADDON_EXPENSE_MESSAGE;
      return;
    }
    const daysBefore = parseDays(expense.daysBefore);
    const daysAfter = parseDays(expense.daysAfter);
    if (daysBefore == null || daysAfter == null) {
      formError.value = DAYS_MESSAGE;
      return;
    }
    addonExpenses.push({ description, cost, daysBefore, daysAfter });
  }
  if (addonExpenses.filter((expense) => expense.daysBefore).length > 1) {
    formError.value = "Only one add-on expense can have days before the trip.";
    return;
  }
  if (addonExpenses.filter((expense) => expense.daysAfter).length > 1) {
    formError.value = "Only one add-on expense can have days after the trip.";
    return;
  }
  const optionDaysError = travelOptionDaysError(travelOptions.value, selectedTravelOptionIds.value);
  if (optionDaysError) {
    formError.value = optionDaysError;
    return;
  }

  saving.value = true;

  const payload = {
    status: form.value.status,
    tripWorkerRoleId: form.value.tripWorkerRoleId ? Number(form.value.tripWorkerRoleId) : null,
    addonExpenses,
    whygoText: form.value.whygoText?.trim() || null,
    version: form.value.version,
  };
  if (travelOptions.value.length) payload.selectedTravelOptionIds = selectedTravelOptionIds.value;

  const costText = form.value.participantCost;
  if (costText == null || costText === "") {
    payload.participantCost = null;
  } else {
    const cost = parseMoneyAmount(costText);
    if (cost != null) payload.participantCost = cost;
  }

  try {
    await TripPeopleRoleServices.update(props.participant.id, payload);
    emit("saved");
    close();
  } catch (e) {
    await handleSaveError(e, load, "Error updating participant.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="720" @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Edit participant</v-card-title>
      <v-card-subtitle class="px-4 pb-2">{{ participantName }}</v-card-subtitle>
      <v-card-text>
        <v-select
          v-model="form.tripWorkerRoleId"
          :items="tripWorkerRoles"
          :item-title="tripWorkerRoleLabel"
          item-value="id"
          label="Trip worker role"
          density="compact"
          clearable
          :hint="tripWorkerRoles.length ? undefined : 'Add roles under Team roles needed first'"
          :persistent-hint="!tripWorkerRoles.length"
        />
        <v-select
          v-model="form.status"
          :items="statusItems"
          item-title="title"
          item-value="value"
          label="Status"
          density="compact"
        />
        <MoneyInput
          v-model="form.participantCost"
          label="Participant cost (optional)"
          class="mb-1"
        />
        <div v-if="tripDefaultCost != null" class="text-caption text-medium-emphasis mb-2">
          Leave blank to use the trip default of {{ formatMoneyDisplay(tripDefaultCost) }}.
        </div>
        <TripApplicationTravelOptions
          v-if="travelOptions.length"
          title="Trip options"
          :show-totals="false"
          :options="travelOptions"
          :selected-ids="selectedTravelOptionIds"
          data-testid="participant-trip-options"
          @update:selected-ids="onTravelOptionsChange"
        />
        <div class="text-subtitle-2 mt-2 mb-1">Add-on expenses</div>
        <div
          v-for="(expense, index) in form.addonExpenses"
          :key="index"
          class="d-flex align-center ga-2 mb-2"
          data-testid="addon-expense-row"
        >
          <v-text-field
            v-model="expense.description"
            label="Description"
            density="compact"
            maxlength="255"
            hide-details
          />
          <v-text-field
            v-model="expense.cost"
            label="Cost"
            prefix="$"
            inputmode="decimal"
            density="compact"
            hide-details
            style="max-width: 130px"
          />
          <v-text-field
            v-model="expense.daysBefore"
            label="Days before"
            inputmode="numeric"
            density="compact"
            hide-details
            style="max-width: 110px"
          />
          <v-text-field
            v-model="expense.daysAfter"
            label="Days after"
            inputmode="numeric"
            density="compact"
            hide-details
            style="max-width: 110px"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            aria-label="Remove add-on expense"
            data-testid="remove-addon-expense"
            @click="removeAddonExpense(index)"
          />
        </div>
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-plus"
          data-testid="add-addon-expense"
          @click="addAddonExpense"
        >
          Add expense
        </v-btn>
        <div class="text-body-2 mt-2 mb-3" data-testid="addon-total">
          Add-on total: {{ formatMoneyDisplay(addonTotal.toFixed(2)) }}
        </div>
        <v-textarea v-model="form.whygoText" label="Why go" density="compact" rows="3" />
        <v-alert v-if="formNotice" type="info" density="compact" class="mt-2">{{ formNotice }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
