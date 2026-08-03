<script setup>
import { ref, computed, watch } from "vue";
import DonationServices from "../services/donationServices.js";
import DonorServices from "../services/donorServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import MoneyInput from "./MoneyInput.vue";
import AddressFields from "./AddressFields.vue";
import { parseMoneyAmount } from "../utils/moneyUtils.js";
import { normalizeAddressFields } from "../utils/locationData.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
  personId: { type: [Number, String], default: null },
  donation: { type: Object, default: null },
  participants: { type: Array, default: () => [] },
  trips: { type: Array, default: () => [] },
  allowTripSelect: { type: Boolean, default: false },
  requireParticipant: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const lookupEmail = ref("");
const lookupBusy = ref(false);
const lookupNotice = ref("");
const saving = ref(false);
const dialogParticipants = ref([]);
const participantsLoading = ref(false);
const selectedTripId = ref(null);
const selectedPersonId = ref(null);

const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const emptyDonor = () => ({
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  addLine1: "",
  addLine2: "",
  city: "",
  country: "",
  state_prov: "",
  postalCode: "",
  phoneContryCode: "",
  phoneNumber: "",
  status: "active",
  version: 0,
});

const emptyDonation = () => ({
  id: null,
  amount: "",
  dateTime: new Date().toISOString().slice(0, 16),
  paymentInfo: "",
  version: 0,
});

const donor = ref(emptyDonor());
const donation = ref(emptyDonation());

const isEdit = computed(() => !!props.donation?.id);
const title = computed(() => (isEdit.value ? "Edit donation" : "Add donation"));

const tripItems = computed(() =>
  props.trips.map((trip) => ({ title: trip.name, value: trip.id }))
);

const participantRows = computed(() =>
  props.allowTripSelect ? dialogParticipants.value : props.participants
);

const showTripSelect = computed(() => props.allowTripSelect && props.trips.length > 0);

const showParticipantSelect = computed(
  () => props.personId == null && (props.requireParticipant || props.allowTripSelect || participantRows.value.length > 0)
);

const participantItems = computed(() =>
  participantRows.value
    .map((row) => {
      const p = row.person;
      if (!p?.id) return null;
      return {
        title: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
        value: p.id,
      };
    })
    .filter(Boolean)
);

const resolvedTripId = () => {
  if (props.allowTripSelect) return selectedTripId.value != null ? Number(selectedTripId.value) : null;
  return props.tripId != null ? Number(props.tripId) : null;
};

const loadDialogParticipants = async () => {
  if (!props.allowTripSelect) return;
  const tripId = selectedTripId.value;
  if (!tripId) {
    dialogParticipants.value = [];
    return;
  }
  participantsLoading.value = true;
  try {
    const res = await TripPeopleRoleServices.getAll(tripId);
    dialogParticipants.value = res.data || [];
    const validIds = new Set(
      dialogParticipants.value.map((row) => Number(row.person?.id)).filter((id) => !Number.isNaN(id))
    );
    if (selectedPersonId.value != null && !validIds.has(Number(selectedPersonId.value))) {
      selectedPersonId.value = null;
    }
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load participants.";
    dialogParticipants.value = [];
  } finally {
    participantsLoading.value = false;
  }
};

const resetForm = () => {
  lookupEmail.value = "";
  lookupNotice.value = "";
  formError.value = "";
  formNotice.value = "";
  donor.value = emptyDonor();
  donation.value = emptyDonation();
  selectedTripId.value =
    props.tripId != null
      ? Number(props.tripId)
      : props.allowTripSelect && props.trips.length
        ? props.trips[0].id
        : null;
  selectedPersonId.value = props.personId != null ? Number(props.personId) : null;
  dialogParticipants.value = [];
};

const applyDonation = (row) => {
  resetForm();
  if (!row) return;
  donation.value = {
    id: row.id,
    amount: row.amount != null ? String(row.amount) : "",
    dateTime: row.dateTime ? row.dateTime.slice(0, 16) : new Date().toISOString().slice(0, 16),
    paymentInfo: row.paymentInfo || "",
    version: row.version ?? 0,
  };
  if (row.donor) {
    donor.value = { ...emptyDonor(), ...normalizeAddressFields(row.donor) };
    lookupEmail.value = row.donor.email || "";
  }
  if (props.allowTripSelect && row.tripId != null) {
    selectedTripId.value = Number(row.tripId);
  }
  selectedPersonId.value =
    row.personId != null ? Number(row.personId) : props.personId != null ? Number(props.personId) : null;
};

watch(
  () => [props.modelValue, props.donation],
  async ([open, row]) => {
    if (open) {
      onLoadStart();
      applyDonation(row);
      if (props.allowTripSelect) await loadDialogParticipants();
      onLoadSuccess();
    } else {
      resetForm();
    }
  }
);

watch(selectedTripId, () => {
  if (!props.modelValue || !props.allowTripSelect) return;
  loadDialogParticipants();
});

const close = () => emit("update:modelValue", false);

const lookupDonor = () => {
  const email = lookupEmail.value?.trim();
  if (!email) {
    formError.value = "Enter a donor email to look up.";
    return;
  }
  lookupBusy.value = true;
  formError.value = "";
  lookupNotice.value = "";
  DonorServices.lookupByEmail(email)
    .then((r) => {
      donor.value = { ...emptyDonor(), ...normalizeAddressFields(r.data) };
      lookupNotice.value = "Donor found. Review and update details below if needed.";
    })
    .catch((e) => {
      if (e.response?.status === 404) {
        donor.value = { ...emptyDonor(), email };
        lookupNotice.value = "Donor not found. Enter donor details below.";
      } else {
        formError.value = e.response?.data?.message || "Unable to look up donor.";
      }
    })
    .finally(() => {
      lookupBusy.value = false;
    });
};

const save = async () => {
  formError.value = "";
  const tripId = resolvedTripId();
  if (!tripId) {
    formError.value = "Trip is required.";
    return;
  }
  if (!donor.value.firstName?.trim()) {
    formError.value = "Donor first name is required.";
    return;
  }

  const resolvedPersonId =
    props.personId != null
      ? Number(props.personId)
      : selectedPersonId.value != null
        ? Number(selectedPersonId.value)
        : null;

  if (props.requireParticipant && resolvedPersonId == null) {
    formError.value = "Participant is required.";
    return;
  }

  const amount = parseMoneyAmount(donation.value.amount);
  if (amount == null || amount <= 0) {
    formError.value = "Donation amount is required.";
    return;
  }
  if (!donation.value.dateTime) {
    formError.value = "Donation date is required.";
    return;
  }

  saving.value = true;
  prepareSave();

  const address = normalizeAddressFields(donor.value);

  const payload = {
    tripId,
    personId: resolvedPersonId,
    amount,
    dateTime: new Date(donation.value.dateTime).toISOString(),
    paymentInfo: donation.value.paymentInfo?.trim() || null,
    donorId: donor.value.id || null,
    donor: {
      firstName: donor.value.firstName.trim(),
      lastName: donor.value.lastName?.trim() || null,
      email: donor.value.email?.trim() || lookupEmail.value.trim() || null,
      country: address.country || null,
      addLine1: donor.value.addLine1?.trim() || null,
      addLine2: donor.value.addLine2?.trim() || null,
      city: donor.value.city?.trim() || null,
      state_prov: address.state_prov || null,
      postalCode: donor.value.postalCode?.trim() || null,
      phoneContryCode: donor.value.phoneContryCode?.trim() || null,
      phoneNumber: donor.value.phoneNumber?.trim() || null,
      status: donor.value.status || "active",
    },
  };

  const request = isEdit.value
    ? DonationServices.update(donation.value.id, {
        ...payload,
        version: donation.value.version,
      })
    : DonationServices.create(payload);

  request
    .then(() => {
      emit("saved", { tripId });
      close();
    })
    .catch(async (e) => {
      await handleSaveError(e, () => applyDonation(props.donation), "Error saving donation.");
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text style="max-height: 70vh">
        <div class="text-subtitle-2 mb-2">Donor</div>
        <v-row dense class="mb-2">
          <v-col cols="8">
            <v-text-field
              v-model="lookupEmail"
              label="Donor email"
              type="email"
              density="compact"
              autocomplete="off"
              hide-details
            />
          </v-col>
          <v-col cols="4" class="d-flex align-center">
            <v-btn variant="tonal" :loading="lookupBusy" @click="lookupDonor">Look up</v-btn>
          </v-col>
        </v-row>
        <v-alert v-if="lookupNotice" type="info" density="compact" class="mb-3">{{ lookupNotice }}</v-alert>

        <v-text-field v-model="donor.firstName" label="Donor first name" density="compact" autocomplete="off" />
        <v-text-field v-model="donor.lastName" label="Donor last name" density="compact" autocomplete="off" />
        <v-text-field v-model="donor.email" label="Donor email" type="email" density="compact" autocomplete="off" />
        <AddressFields v-model="donor" />
        <v-text-field v-model="donor.phoneNumber" label="Phone number" density="compact" autocomplete="off" />
        <v-select
          v-model="donor.status"
          :items="['active', 'inactive', 'dontcontact']"
          label="Donor status"
          density="compact"
        />

        <div class="text-subtitle-2 mb-2 mt-4">Donation</div>
        <v-select
          v-if="showTripSelect"
          v-model="selectedTripId"
          :items="tripItems"
          label="Trip"
          density="compact"
          hide-details
          class="mb-2"
        />
        <v-select
          v-if="showParticipantSelect"
          v-model="selectedPersonId"
          :items="participantItems"
          label="Participant"
          density="compact"
          :clearable="!requireParticipant"
          :loading="participantsLoading"
          :disabled="allowTripSelect && !selectedTripId"
          hide-details
          class="mb-2"
        />
        <MoneyInput v-model="donation.amount" label="Amount" required />
        <v-text-field v-model="donation.dateTime" label="Date" type="datetime-local" density="compact" />
        <v-textarea v-model="donation.paymentInfo" label="Payment info" density="compact" rows="2" />

        <v-alert v-if="formNotice" type="warning" density="compact" class="mt-2">{{ formNotice }}</v-alert>
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
