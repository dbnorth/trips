<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import PersonServices from "../services/personServices.js";
import PersonDocumentServices from "../services/personDocumentServices.js";
import Utils from "../config/utils.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import ParticipantAgreementSection from "../components/ParticipantAgreementSection.vue";
import TripApplicationTravelOptions from "../components/TripApplicationTravelOptions.vue";
import EditPersonDialog from "../components/EditPersonDialog.vue";
import {
  tripParticipantStatusLabel,
  tripParticipantStatusColor,
} from "../utils/tripParticipantStatus.js";
import { isProfileComplete, isUnder18 } from "../utils/personProfile.js";
import { isApplicationFormComplete, validateTravelOptionSelections } from "../utils/tripApplicationForm.js";

const props = defineProps({
  tripId: { type: [String, Number], required: true },
});

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const formError = ref("");
const message = ref("");
const messageType = ref("info");
const trip = ref(null);
const rolesNeeded = ref([]);
const application = ref(null);
const canEdit = ref(false);
const personDocuments = ref([]);
const person = ref(null);
const agreementContent = ref("");
const travelOptions = ref([]);
const selectedTravelOptionIds = ref([]);
const travelOptionsRef = ref(null);
const showProfileDialog = ref(false);

const personId = computed(() => person.value?.id ?? Utils.getStore("user")?.personId ?? null);

const form = ref({
  tripWorkerRoleId: null,
  willSelfFund: false,
  willRaiseFunds: false,
  licenseStatus: null,
  hasPreferredRoommate: false,
  preferredRoommateNames: "",
  agreementAccepted: false,
  agreementSignatureName: "",
  agreementDate: null,
  agreementAdultFirstName: "",
  agreementAdultLastName: "",
  agreementAdultEmail: "",
  agreementAdultRelationship: "",
  version: 0,
});

const agreementRequired = computed(() => !!agreementContent.value?.trim());
const participantUnder18 = computed(() => isUnder18(person.value?.birthDate));

const availableRoles = computed(() => {
  const currentId = Number(form.value.tripWorkerRoleId || application.value?.tripWorkerRoleId);
  return (rolesNeeded.value || []).filter(
    (r) => (r.availableCount || 0) > 0 || Number(r.id) === currentId
  );
});

const roleItems = computed(() =>
  availableRoles.value.map((r) => ({
    title: `${r.workerRole?.name || "Role"} (${r.availableCount} available)`,
    value: r.id,
  }))
);

const selectedRole = computed(
  () =>
    availableRoles.value.find((r) => Number(r.id) === Number(form.value.tripWorkerRoleId)) || null
);

const licenseRequired = computed(() => !!selectedRole.value?.workerRole?.licenseRequired);
const requiredDocumentType = computed(
  () => selectedRole.value?.workerRole?.documentType || null
);
const licenseType = computed(() => requiredDocumentType.value?.description || "");

const licenseItems = [
  { title: "Yes", value: "yes" },
  { title: "Yes, retired", value: "yes_retired" },
  { title: "No", value: "no" },
];

const licenseLabel = computed(() =>
  licenseType.value
    ? `Do you have a ${licenseType.value} license for this role?`
    : "Do you have a license for this role?"
);

const dateOnly = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const hasRequiredDocumentForTrip = computed(() => {
  const docTypeId = selectedRole.value?.workerRole?.documentTypeId;
  if (!docTypeId) return true;
  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  if (!compareDate) return true;
  return personDocuments.value.some((doc) => {
    if (Number(doc.documentTypeId) !== Number(docTypeId)) return false;
    const expirationDate = dateOnly(doc.expirationDate);
    return expirationDate && expirationDate > compareDate;
  });
});

const documentRequirementWarning = computed(() => {
  if (!licenseRequired.value || !requiredDocumentType.value) return "";
  if (hasRequiredDocumentForTrip.value) return "";
  const docName = requiredDocumentType.value.description || "required document";
  const endDate = dateOnly(trip.value?.endDate);
  const endPart = endDate ? ` (${endDate})` : "";
  return `For your application to be approved, you will need to upload a ${docName} with an expiration date past the end of the trip${endPart}.`;
});

const profileComplete = computed(() => isProfileComplete(person.value));

const onProfileSaved = async () => {
  showProfileDialog.value = false;
  await loadPerson();
};

const applicationFormComplete = computed(() =>
  isApplicationFormComplete({
    tripWorkerRoleId: form.value.tripWorkerRoleId,
    willSelfFund: form.value.willSelfFund,
    willRaiseFunds: form.value.willRaiseFunds,
    licenseRequired: licenseRequired.value,
    licenseStatus: form.value.licenseStatus,
    hasPreferredRoommate: form.value.hasPreferredRoommate,
    preferredRoommateNames: form.value.preferredRoommateNames,
  })
);

const canAgreeToAgreement = computed(
  () => profileComplete.value && applicationFormComplete.value
);

const agreementComplete = computed(() => {
  if (!agreementRequired.value) return true;
  if (!form.value.agreementAccepted) return false;
  if (!form.value.agreementSignatureName?.trim()) return false;
  if (participantUnder18.value) {
    if (!form.value.agreementAdultFirstName?.trim()) return false;
    if (!form.value.agreementAdultLastName?.trim()) return false;
    if (!form.value.agreementAdultEmail?.trim()) return false;
    if (!form.value.agreementAdultRelationship?.trim()) return false;
  }
  return true;
});

const travelOptionsComplete = computed(
  () => !validateTravelOptionSelections(travelOptions.value, selectedTravelOptionIds.value)
);

const readyToSubmit = computed(
  () =>
    profileComplete.value &&
    applicationFormComplete.value &&
    agreementComplete.value &&
    travelOptionsComplete.value
);

const primaryActionLabel = computed(() =>
  readyToSubmit.value ? "Submit Application" : "Save Incomplete Application"
);

const statusLabel = computed(() =>
  tripParticipantStatusLabel(application.value?.status)
);

const loadPersonDocuments = async () => {
  const personId = Utils.getStore("user")?.personId;
  if (!personId) {
    personDocuments.value = [];
    return;
  }
  try {
    const res = await PersonDocumentServices.getAll(personId);
    personDocuments.value = res.data || [];
  } catch {
    personDocuments.value = [];
  }
};

const loadPerson = async () => {
  const personId = Utils.getStore("user")?.personId;
  if (!personId) {
    person.value = null;
    return;
  }
  try {
    const res = await PersonServices.get(personId);
    person.value = res.data || null;
  } catch {
    person.value = null;
  }
};

const applyFormFromApplication = (row) => {
  form.value = {
    tripWorkerRoleId: row?.tripWorkerRoleId ?? null,
    willSelfFund: !!row?.willSelfFund,
    willRaiseFunds: !!row?.willRaiseFunds,
    licenseStatus: row?.licenseStatus || null,
    hasPreferredRoommate: !!row?.hasPreferredRoommate,
    preferredRoommateNames: row?.preferredRoommateNames || "",
    agreementAccepted: !!row?.agreementAccepted,
    agreementSignatureName: row?.agreementSignatureName || "",
    agreementDate: row?.agreementDate || null,
    agreementAdultFirstName: row?.agreementAdultFirstName || "",
    agreementAdultLastName: row?.agreementAdultLastName || "",
    agreementAdultEmail: row?.agreementAdultEmail || "",
    agreementAdultRelationship: row?.agreementAdultRelationship || "",
    version: row?.version ?? 0,
  };
};

const load = async () => {
  loading.value = true;
  formError.value = "";
  message.value = "";
  try {
    const [res] = await Promise.all([
      TripServices.getApplication(props.tripId),
      loadPersonDocuments(),
      loadPerson(),
    ]);
    trip.value = res.data?.trip || null;
    rolesNeeded.value = res.data?.rolesNeeded || [];
    application.value = res.data?.application || null;
    canEdit.value = !!res.data?.canEdit;
    travelOptions.value = res.data?.travelOptions || [];
    selectedTravelOptionIds.value = (res.data?.travelOptions || [])
      .filter((o) => o.selected)
      .map((o) => Number(o.id));
    agreementContent.value = res.data?.participantAgreement?.exists
      ? res.data.participantAgreement.content || ""
      : "";
    applyFormFromApplication(application.value);
    if (!canEdit.value) {
      formError.value = `This application cannot be edited while its status is ${statusLabel.value}.`;
    }
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load application.";
    trip.value = null;
    rolesNeeded.value = [];
    application.value = null;
    travelOptions.value = [];
    selectedTravelOptionIds.value = [];
    canEdit.value = false;
  } finally {
    loading.value = false;
  }
};

watch(
  () => form.value.tripWorkerRoleId,
  () => {
    if (!licenseRequired.value) form.value.licenseStatus = null;
  }
);

watch(
  () => form.value.hasPreferredRoommate,
  (has) => {
    if (!has) form.value.preferredRoommateNames = "";
  }
);

const save = async () => {
  formError.value = "";
  message.value = "";
  if (!canEdit.value) {
    formError.value = "This application cannot be edited.";
    return;
  }
  if (!form.value.tripWorkerRoleId) {
    formError.value = "Select a trip role with available positions.";
    return;
  }
  // Unanswered questions are saved as an incomplete application instead of blocking the save.
  if (readyToSubmit.value) {
    const travelOptionsError = travelOptionsRef.value?.validate?.();
    if (travelOptionsError) {
      formError.value = travelOptionsError;
      return;
    }
  }
  if (agreementRequired.value && form.value.agreementAccepted) {
    if (!form.value.agreementSignatureName?.trim()) {
      formError.value = participantUnder18.value
        ? "Enter the adult's name as the electronic signature."
        : "Enter your name as your electronic signature.";
      return;
    }
    if (participantUnder18.value) {
      if (!form.value.agreementAdultFirstName?.trim()) {
        formError.value = "Enter the adult signer's first name.";
        return;
      }
      if (!form.value.agreementAdultLastName?.trim()) {
        formError.value = "Enter the adult signer's last name.";
        return;
      }
      if (!form.value.agreementAdultEmail?.trim()) {
        formError.value = "Enter the adult signer's email.";
        return;
      }
      if (!form.value.agreementAdultRelationship?.trim()) {
        formError.value = "Enter the adult's relationship to the participant.";
        return;
      }
    }
  }

  saving.value = true;
  try {
    const res = await TripServices.updateApplication(props.tripId, {
      tripWorkerRoleId: Number(form.value.tripWorkerRoleId),
      willSelfFund: !!form.value.willSelfFund,
      willRaiseFunds: !!form.value.willRaiseFunds,
      licenseStatus: licenseRequired.value ? form.value.licenseStatus : null,
      hasPreferredRoommate: !!form.value.hasPreferredRoommate,
      preferredRoommateNames: form.value.hasPreferredRoommate
        ? form.value.preferredRoommateNames.trim()
        : null,
      agreementAccepted: agreementRequired.value ? !!form.value.agreementAccepted : false,
      agreementSignatureName: agreementRequired.value
        ? form.value.agreementSignatureName.trim() || null
        : null,
      agreementAdultFirstName:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultFirstName.trim() || null
          : null,
      agreementAdultLastName:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultLastName.trim() || null
          : null,
      agreementAdultEmail:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultEmail.trim() || null
          : null,
      agreementAdultRelationship:
        agreementRequired.value && participantUnder18.value
          ? form.value.agreementAdultRelationship.trim() || null
          : null,
      selectedTravelOptionIds: selectedTravelOptionIds.value,
      version: form.value.version,
    });
    application.value = res.data?.application || application.value;
    if (res.data?.travelOptions) {
      travelOptions.value = res.data.travelOptions;
      selectedTravelOptionIds.value = res.data.travelOptions
        .filter((o) => o.selected)
        .map((o) => Number(o.id));
    }
    canEdit.value = ["incomplete", "applied"].includes(application.value?.status);
    applyFormFromApplication(application.value);
    messageType.value = "success";
    message.value = res.data?.message || "Application updated.";
    router.push({ name: "home" });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to update application.";
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
      <v-btn variant="text" @click="router.push({ name: 'home' })">Back to dashboard</v-btn>
      <v-chip
        v-if="application"
        size="small"
        variant="tonal"
        :color="tripParticipantStatusColor(application.status)"
      >
        {{ statusLabel }}
      </v-chip>
    </div>

    <h1 class="text-h5 mb-4">Update application</h1>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="message" :type="messageType" density="compact" class="mb-4">{{ message }}</v-alert>
    <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>

    <template v-if="!loading && trip">
      <DonorTripHeading :trip="trip" :show-org-website="false" />

      <v-alert
        v-if="!profileComplete"
        type="warning"
        density="compact"
        class="mt-4 mb-0 mx-auto"
        max-width="640"
      >
        Your profile needs to be completed before this application can be submitted.
        <div class="mt-3">
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            :disabled="!personId"
            @click="showProfileDialog = true"
          >
            Update profile
          </v-btn>
        </div>
      </v-alert>

      <v-card class="pa-4 mt-4 mx-auto" variant="outlined" max-width="640" width="100%">
        <v-alert
          v-if="!availableRoles.length"
          type="warning"
          density="compact"
          class="mb-3"
        >
          There are no trip roles with available positions right now.
        </v-alert>

        <v-select
          v-model="form.tripWorkerRoleId"
          :items="roleItems"
          label="Trip role"
          density="compact"
          :disabled="!canEdit || !availableRoles.length"
          hint="Only roles with open positions are listed"
          persistent-hint
          class="mb-2"
        />

        <v-alert
          v-if="documentRequirementWarning"
          type="warning"
          density="compact"
          class="mb-3"
        >
          {{ documentRequirementWarning }}
        </v-alert>

        <div class="text-subtitle-2 mb-1 mt-2">Funding</div>
        <v-checkbox
          v-model="form.willSelfFund"
          label="I will self-fund"
          density="compact"
          hide-details
          :disabled="!canEdit"
          class="mt-0"
        />
        <v-checkbox
          v-model="form.willRaiseFunds"
          label="I will raise funds"
          density="compact"
          hide-details
          :disabled="!canEdit"
          class="mb-2"
        />

        <v-select
          v-if="licenseRequired"
          v-model="form.licenseStatus"
          :items="licenseItems"
          :label="licenseLabel"
          density="compact"
          :disabled="!canEdit"
          class="mb-2"
        />

        <div class="text-subtitle-2 mb-1 mt-2">Roommate preference</div>
        <v-checkbox
          v-model="form.hasPreferredRoommate"
          label="I have a preferred roommate"
          density="compact"
          hide-details
          :disabled="!canEdit"
          class="mt-0 mb-2"
        />
        <v-text-field
          v-if="form.hasPreferredRoommate"
          v-model="form.preferredRoommateNames"
          label="Preferred roommate name(s)"
          density="compact"
          autocomplete="off"
          :disabled="!canEdit"
        />

        <TripApplicationTravelOptions
          ref="travelOptionsRef"
          v-model:selected-ids="selectedTravelOptionIds"
          :base-cost="trip?.participantCost"
          :options="travelOptions"
          :disabled="!canEdit"
        />

        <ParticipantAgreementSection
          v-model:agreement-accepted="form.agreementAccepted"
          v-model:agreement-signature-name="form.agreementSignatureName"
          v-model:agreement-adult-first-name="form.agreementAdultFirstName"
          v-model:agreement-adult-last-name="form.agreementAdultLastName"
          v-model:agreement-adult-email="form.agreementAdultEmail"
          v-model:agreement-adult-relationship="form.agreementAdultRelationship"
          :agreement-date="form.agreementDate"
          :under18="participantUnder18"
          :can-agree="canAgreeToAgreement"
          :content="agreementContent"
          :disabled="!canEdit"
        />

        <div class="d-flex justify-end ga-2 mt-4">
          <v-btn variant="text" :disabled="saving" @click="router.push({ name: 'home' })">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :loading="saving"
            :disabled="!canEdit || loading || !availableRoles.length"
            @click="save"
          >
            {{ primaryActionLabel }}
          </v-btn>
        </div>
      </v-card>
    </template>

    <EditPersonDialog
      v-if="personId"
      v-model="showProfileDialog"
      :person-id="personId"
      @saved="onProfileSaved"
    />
  </v-container>
</template>
