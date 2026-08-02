<script setup>
import { ref, watch } from "vue";
import PersonServices from "../services/personServices.js";
import RoleServices from "../services/roleServices.js";
import TripServices from "../services/tripServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import MoneyInput from "./MoneyInput.vue";
import { formatMoneyDisplay, parseMoneyAmount } from "../utils/moneyUtils.js";
import { TRIP_PARTICIPANT_STATUS_OPTIONS } from "../utils/tripParticipantStatus.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], required: true },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const people = ref([]);
const roles = ref([]);
const tripWorkerRoles = ref([]);
const tripDefaultCost = ref(null);
const saving = ref(false);
const formError = ref("");
const statusItems = TRIP_PARTICIPANT_STATUS_OPTIONS;
const form = ref({
  peopleId: null,
  roleId: null,
  tripWorkerRoleId: null,
  status: "incomplete",
  participantCost: "",
  whygoText: "",
});

const personLabel = (p) => `${p.firstName || ""} ${p.lastName || ""}`.trim();

const tripWorkerRoleLabel = (row) => {
  const name = row.workerRole?.name || "Worker role";
  const qty = row.quantity != null ? ` (need ${row.quantity})` : "";
  return `${name}${qty}`;
};

const loadOptions = async () => {
  const [peopleRes, rolesRes, tripRes, existingRes, twrRes] = await Promise.all([
    PersonServices.getAll(),
    RoleServices.getAll(),
    TripServices.get(props.tripId),
    TripPeopleRoleServices.getAll(props.tripId),
    TripWorkerRoleServices.getAll(props.tripId),
  ]);
  const existingPeopleIds = new Set((existingRes.data || []).map((r) => Number(r.peopleId)));
  people.value = (peopleRes.data || []).filter((p) => !existingPeopleIds.has(Number(p.id)));
  roles.value = (rolesRes.data || []).filter((r) => r.roleName !== "Org Admin");
  tripWorkerRoles.value = twrRes.data || [];
  const participantRole = roles.value.find((r) => r.roleName === "Trip Participant");
  const trip = tripRes.data;
  tripDefaultCost.value = trip?.participantCost ?? null;
  form.value = {
    peopleId: null,
    roleId: participantRole?.id ?? roles.value[0]?.id ?? null,
    tripWorkerRoleId: null,
    status: "incomplete",
    participantCost: "",
    whygoText: "",
  };
  formError.value = "";
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadOptions();
  }
);

const close = () => emit("update:modelValue", false);

const save = () => {
  if (!form.value.peopleId) {
    formError.value = "Person is required.";
    return;
  }
  if (!form.value.roleId) {
    formError.value = "Role is required.";
    return;
  }

  saving.value = true;
  formError.value = "";
  const payload = {
    tripId: Number(props.tripId),
    peopleId: Number(form.value.peopleId),
    roleId: Number(form.value.roleId),
    tripWorkerRoleId: form.value.tripWorkerRoleId ? Number(form.value.tripWorkerRoleId) : null,
    status: form.value.status,
    whygoText: form.value.whygoText?.trim() || null,
  };
  const cost = parseMoneyAmount(form.value.participantCost);
  if (cost != null) payload.participantCost = cost;

  TripPeopleRoleServices.create(payload)
    .then(() => {
      emit("saved");
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Error adding participant.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Add participant</v-card-title>
      <v-card-text>
        <v-select
          v-model="form.peopleId"
          :items="people"
          :item-title="personLabel"
          item-value="id"
          label="Person"
          density="compact"
        />
        <v-select
          v-model="form.roleId"
          :items="roles"
          item-title="roleName"
          item-value="id"
          label="Role"
          density="compact"
        />
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
        <v-textarea v-model="form.whygoText" label="Why go" density="compact" rows="2" />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
