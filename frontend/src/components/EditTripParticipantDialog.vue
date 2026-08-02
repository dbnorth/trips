<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import MoneyInput from "./MoneyInput.vue";
import { formatMoneyDisplay, parseMoneyAmount } from "../utils/moneyUtils.js";
import { TRIP_PARTICIPANT_STATUS_OPTIONS } from "../utils/tripParticipantStatus.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  participant: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const tripDefaultCost = ref(null);
const tripWorkerRoles = ref([]);
const saving = ref(false);
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const statusItems = TRIP_PARTICIPANT_STATUS_OPTIONS;

const form = ref({
  status: "incomplete",
  tripWorkerRoleId: null,
  participantCost: "",
  whygoText: "",
  version: 0,
});

const participantName = computed(() => {
  const p = props.participant?.person;
  if (!p) return "Participant";
  return `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Participant";
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

const load = async ({ afterConflict = false } = {}) => {
  onLoadStart({ afterConflict });
  const tripId = props.participant?.tripId;
  await Promise.all([loadTripDefault(tripId), loadTripWorkerRoles(tripId)]);
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
  saving.value = true;

  const payload = {
    status: form.value.status,
    tripWorkerRoleId: form.value.tripWorkerRoleId ? Number(form.value.tripWorkerRoleId) : null,
    whygoText: form.value.whygoText?.trim() || null,
    version: form.value.version,
  };

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
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => !v && close()">
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
