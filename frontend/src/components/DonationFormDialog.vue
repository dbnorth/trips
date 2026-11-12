<script setup>
import { ref, computed, watch } from "vue";
import DonationServices from "../services/donationServices.js";
import DonorServices from "../services/donorServices.js";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import MoneyInput from "./MoneyInput.vue";
import AddressFields from "./AddressFields.vue";
import { DONOR_STATUS_ITEMS, DONOR_TYPE_ITEMS } from "../utils/donorStatus.js";
import { parseMoneyAmount, formatMoneyDisplay } from "../utils/moneyUtils.js";
import { normalizeAddressFields, US_COUNTRY_CODE } from "../utils/locationData.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";
import { formatDateTime } from "../utils/dateFormat.js";
import { donorLookupChoice, formatDonorName } from "../utils/donorUtils.js";
import {
  ONLINE_DONATIONS_NOT_SET_UP,
  isStripeDonationType,
  goToStripe,
  paymentMethodText,
  paymentStatusText,
} from "../utils/stripeDonations.js";

const ADD_TYPES = ["Stripe-ACH", "Stripe-Credit", "Check", "Other"];
const EDIT_TYPES = ["Check", "Other"];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
  personId: { type: [Number, String], default: null },
  donation: { type: Object, default: null },
  participants: { type: Array, default: () => [] },
  trips: { type: Array, default: () => [] },
  allowTripSelect: { type: Boolean, default: false },
  requireParticipant: { type: Boolean, default: false },
  onlineDonations: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const lookupQuery = ref("");
const lookupMatches = ref([]);
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
  familyName: "",
  organizationName: "",
  email: "",
  addLine1: "",
  addLine2: "",
  city: "",
  country: US_COUNTRY_CODE,
  state_prov: "",
  postalCode: "",
  phoneContryCode: "",
  phoneNumber: "",
  donorType: "individual",
  status: "active",
  personId: null,
  version: 0,
});

const emptyDonation = () => ({
  id: null,
  amount: "",
  dateTime: new Date().toISOString().slice(0, 16),
  paymentInfo: "",
  donationType: "Other",
  checkNumber: "",
  version: 0,
});

const donor = ref(emptyDonor());
const donation = ref(emptyDonation());

const isEdit = computed(() => !!props.donation?.id);
const title = computed(() => (isEdit.value ? "Edit donation" : "Add donation"));

const isStripeEdit = computed(() => isEdit.value && isStripeDonationType(props.donation?.donationType));
const isStripeAdd = computed(() => !isEdit.value && isStripeDonationType(donation.value.donationType));
const typeItems = computed(() => (isEdit.value ? EDIT_TYPES : ADD_TYPES));

const onlineReady = computed(() => {
  if (!props.allowTripSelect) return props.onlineDonations;
  const trip = props.trips.find((t) => Number(t.id) === Number(selectedTripId.value));
  return !!trip?.onlineDonations;
});

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
        title: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ").trim(),
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
  lookupQuery.value = "";
  lookupMatches.value = [];
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
    donationType: row.donationType || "Other",
    checkNumber: row.checkNumber || "",
    version: row.version ?? 0,
  };
  if (row.donor) {
    donor.value = { ...emptyDonor(), ...normalizeAddressFields(row.donor) };
    lookupQuery.value = row.donor.email || formatDonorName(row.donor);
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

const applyLookupDonor = (row) => {
  lookupMatches.value = [];
  donor.value = { ...emptyDonor(), ...normalizeAddressFields(row) };
  lookupNotice.value =
    row.source === "person"
      ? "Person found. A donor will be added from their details."
      : "Donor found. Review and update details below if needed.";
};

const lookupDonor = () => {
  const q = lookupQuery.value?.trim();
  if (!q) {
    formError.value = "Enter a donor name or email to look up.";
    return;
  }
  lookupBusy.value = true;
  formError.value = "";
  lookupNotice.value = "";
  lookupMatches.value = [];
  DonorServices.lookup(q, resolvedTripId())
    .then((r) => {
      if (Array.isArray(r.data?.matches)) {
        lookupMatches.value = r.data.matches;
        lookupNotice.value = "Several donors match. Choose one.";
        return;
      }
      applyLookupDonor(r.data);
    })
    .catch((e) => {
      if (e.response?.status === 404) {
        donor.value = { ...emptyDonor(), email: q.includes("@") ? q : "" };
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
  if (donor.value.donorType === "organization") {
    if (!(donor.value.organizationName || "").trim()) {
      formError.value = "Organization name is required.";
      return;
    }
  } else if (!(donor.value.firstName || "").trim()) {
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

  const address = normalizeAddressFields(donor.value);
  const sharedPayload = {
    tripId,
    personId: resolvedPersonId,
    paymentInfo: donation.value.paymentInfo?.trim() || null,
    donorId: donor.value.id || null,
    donor: {
      firstName: donor.value.donorType === "organization" ? null : (donor.value.firstName || "").trim(),
      lastName: donor.value.donorType === "organization" ? null : (donor.value.lastName || "").trim() || null,
      familyName: donor.value.donorType === "organization" ? null : (donor.value.familyName || "").trim() || null,
      organizationName: donor.value.donorType === "organization" ? donor.value.organizationName?.trim() || null : null,
      email: donor.value.email?.trim() || (lookupQuery.value.includes("@") ? lookupQuery.value.trim() : "") || null,
      country: address.country || null,
      addLine1: donor.value.addLine1?.trim() || null,
      addLine2: donor.value.addLine2?.trim() || null,
      city: donor.value.city?.trim() || null,
      state_prov: address.state_prov || null,
      postalCode: donor.value.postalCode?.trim() || null,
      phoneContryCode: donor.value.phoneContryCode?.trim() || null,
      phoneNumber: donor.value.phoneNumber?.trim() || null,
      donorType: donor.value.donorType || "individual",
      status: donor.value.status || "active",
      personId: donor.value.personId || null,
    },
  };

  if (isStripeEdit.value) {
    saving.value = true;
    prepareSave();
    submit(DonationServices.update(donation.value.id, { ...sharedPayload, version: donation.value.version }), tripId);
    return;
  }

  const amount = parseMoneyAmount(donation.value.amount);
  if (amount == null || amount <= 0) {
    formError.value = "Donation amount is required.";
    return;
  }

  if (isStripeAdd.value) {
    if (amount < 0.5) {
      formError.value = "Donation amount must be at least $0.50.";
      return;
    }
    saving.value = true;
    DonationServices.startStaffCheckout({
      ...sharedPayload,
      amount,
      paymentMethod: donation.value.donationType === "Stripe-Credit" ? "card" : "us_bank_account",
      returnPath: "/donations",
    })
      .then((res) => goToStripe(res.data.checkoutUrl))
      .catch((e) => {
        formError.value = e.response?.data?.message || "Unable to start the payment.";
        saving.value = false;
      });
    return;
  }

  if (!donation.value.dateTime) {
    formError.value = "Donation date is required.";
    return;
  }
  const checkNumber = donation.value.checkNumber?.trim() || "";
  if (donation.value.donationType === "Check" && !checkNumber) {
    formError.value = "Check number is required.";
    return;
  }

  saving.value = true;
  prepareSave();

  const payload = {
    ...sharedPayload,
    amount,
    dateTime: new Date(donation.value.dateTime).toISOString(),
    donationType: donation.value.donationType,
    checkNumber: donation.value.donationType === "Check" ? checkNumber : null,
  };

  submit(
    isEdit.value
      ? DonationServices.update(donation.value.id, { ...payload, version: donation.value.version })
      : DonationServices.create(payload),
    tripId
  );
};

const submit = (request, tripId) => {
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
              v-model="lookupQuery"
              label="Name or email"
              density="compact"
              autocomplete="off"
              hide-details
            />
          </v-col>
          <v-col cols="4" class="d-flex align-center">
            <v-btn variant="tonal" :loading="lookupBusy" @click="lookupDonor">Look up</v-btn>
          </v-col>
        </v-row>
        <div v-if="lookupMatches.length" class="mb-3">
          <v-btn
            v-for="match in lookupMatches"
            :key="match.id"
            variant="text"
            class="d-block"
            @click="applyLookupDonor(match)"
          >
            {{ donorLookupChoice(match) }}
          </v-btn>
        </div>
        <v-alert v-if="lookupNotice" type="info" density="compact" class="mb-3">{{ lookupNotice }}</v-alert>

        <v-select v-model="donor.donorType" :items="DONOR_TYPE_ITEMS" label="Donor type" density="compact" />
        <v-text-field
          v-if="donor.donorType === 'organization'"
          v-model="donor.organizationName"
          label="Organization name"
          density="compact"
          autocomplete="off"
        />
        <template v-else>
          <v-text-field v-model="donor.firstName" label="Donor first name" density="compact" autocomplete="off" />
          <v-text-field v-model="donor.lastName" label="Donor last name" density="compact" autocomplete="off" />
          <v-text-field v-model="donor.familyName" label="Family name" density="compact" autocomplete="off" />
        </template>
        <v-text-field v-model="donor.email" label="Donor email" type="email" density="compact" autocomplete="off" />
        <AddressFields v-model="donor" />
        <v-text-field v-model="donor.phoneNumber" label="Phone number" density="compact" autocomplete="off" />
        <v-select
          v-model="donor.status"
          :items="DONOR_STATUS_ITEMS"
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
        <template v-if="isStripeEdit">
          <v-list density="compact" class="mb-2" data-testid="stripe-donation-details">
            <v-list-item title="Type" :subtitle="props.donation.donationType" />
            <v-list-item title="Amount" :subtitle="formatMoneyDisplay(props.donation.amount)" />
            <v-list-item
              title="Fee covered"
              :subtitle="formatMoneyDisplay(props.donation.processingFeeAmount) || '—'"
            />
            <v-list-item title="Date" :subtitle="formatDateTime(props.donation.dateTime) || '—'" />
            <v-list-item title="Payment status" :subtitle="paymentStatusText(props.donation)" />
            <v-list-item title="Payment method" :subtitle="paymentMethodText(props.donation)" />
            <v-list-item
              v-if="props.donation.paymentStatus === 'failed' && props.donation.stripeFailureMessage"
              title="Failure reason"
              :subtitle="props.donation.stripeFailureMessage"
            />
            <v-list-item title="Stripe payment ID" :subtitle="props.donation.stripePaymentIntentId || '—'">
              <template v-if="props.donation.stripeReceiptUrl" #append>
                <v-btn
                  size="small"
                  variant="text"
                  :href="props.donation.stripeReceiptUrl"
                  target="_blank"
                  rel="noopener"
                >
                  Receipt
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
        </template>
        <template v-else>
          <MoneyInput v-model="donation.amount" label="Amount" required />
          <v-select
            v-model="donation.donationType"
            :items="typeItems"
            label="Type"
            density="compact"
            data-testid="donation-type"
          />
          <v-text-field
            v-if="donation.donationType === 'Check'"
            v-model="donation.checkNumber"
            label="Check number"
            maxlength="50"
            density="compact"
          />
          <v-text-field
            v-if="!isStripeAdd"
            v-model="donation.dateTime"
            label="Date"
            type="datetime-local"
            density="compact"
          />
        </template>
        <v-textarea v-model="donation.paymentInfo" label="Payment info" density="compact" rows="2" />

        <v-alert v-if="isStripeAdd && !onlineReady" type="info" density="compact" class="mt-2">
          {{ ONLINE_DONATIONS_NOT_SET_UP }}
        </v-alert>
        <v-alert v-if="formNotice" type="warning" density="compact" class="mt-2">{{ formNotice }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn v-if="isStripeAdd" color="primary" :loading="saving" :disabled="!onlineReady" @click="save">
          Pay with Stripe
        </v-btn>
        <v-btn v-else color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
