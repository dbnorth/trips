<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import PersonServices from "../services/personServices.js";
import PersonDocumentServices from "../services/personDocumentServices.js";
import Utils from "../config/utils.js";
import DonorTripHeading from "./DonorTripHeading.vue";
import ParticipantAgreementSection from "./ParticipantAgreementSection.vue";
import TripApplicationTravelOptions from "./TripApplicationTravelOptions.vue";
import EditPersonDialog from "./EditPersonDialog.vue";
import PersonProfileFields from "./PersonProfileFields.vue";
import {
  getMissingProfileFields,
  isProfileComplete,
  isUnder18,
  normalizeYesNo,
} from "../utils/personProfile.js";
import {
  arePersonDocumentsUploaded,
  isApplicationFormComplete,
  isRequiredRoleDocumentUploaded,
  validateTravelOptionSelections,
} from "../utils/tripApplicationForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const formError = ref("");
const trip = ref(null);
const rolesNeeded = ref([]);
const personDocuments = ref([]);
const person = ref(null);
const healthForm = ref({
  gender: null,
  hasAllergies: null,
  allergiesDescription: "",
  isPregnant: null,
  pregnancyDueDate: "",
  takesMedication: null,
  medicalConditionIds: [],
  medicalConditions: [],
  version: 0,
});
const agreementContent = ref("");
const medicalAgreementContent = ref("");
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
  agreementAdultFirstName: "",
  agreementAdultLastName: "",
  agreementAdultEmail: "",
  agreementAdultRelationship: "",
  medicalAgreementAccepted: false,
  medicalAgreementDate: null,
  version: 0,
});

const editingApplication = ref(false);
const canEdit = ref(true);

const agreementRequired = computed(() => !!agreementContent.value?.trim());
const takesMedicationYes = computed(() => healthForm.value.takesMedication === true);
const medicalAgreementRequired = computed(
  () => takesMedicationYes.value && !!medicalAgreementContent.value?.trim()
);
const participantUnder18 = computed(() => isUnder18(person.value?.birthDate));

const availableRoles = computed(() => {
  const currentId = Number(form.value.tripWorkerRoleId);
  return (rolesNeeded.value || []).filter(
    (r) => (r.availableCount || 0) > 0 || (editingApplication.value && Number(r.id) === currentId)
  );
});

const roleItems = computed(() =>
  availableRoles.value.map((r) => ({
    title: `${r.workerRole?.name || "Role"} (${r.availableCount} available)`,
    value: r.id,
    raw: r,
  }))
);

const selectedRole = computed(() =>
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
  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  return isRequiredRoleDocumentUploaded({
    documents: personDocuments.value,
    documentTypeId: docTypeId,
    compareDate,
  });
});

const personDocumentsUploaded = computed(() =>
  arePersonDocumentsUploaded(personDocuments.value)
);

const documentsCompleteForSubmit = computed(
  () => personDocumentsUploaded.value && hasRequiredDocumentForTrip.value
);

const documentRequirementWarning = computed(() => {
  if (!personDocumentsUploaded.value) {
    return "Upload a file for every document on your profile before submitting your application.";
  }
  if (!requiredDocumentType.value || hasRequiredDocumentForTrip.value) return "";

  const docName = requiredDocumentType.value.description || "required document";
  const endDate = dateOnly(trip.value?.endDate);
  const endPart = endDate ? ` (${endDate})` : "";
  return `Upload a ${docName} with an expiration date past the end of the trip${endPart} before submitting your application.`;
});

const profileComplete = computed(() =>
  isProfileComplete(
    { ...(person.value || {}), ...healthForm.value },
    { orgId: trip.value?.orgId }
  )
);

const missingProfileFields = computed(() =>
  getMissingProfileFields(
    { ...(person.value || {}), ...healthForm.value },
    { orgId: trip.value?.orgId }
  )
);

const onProfileSaved = async () => {
  showProfileDialog.value = false;
  await Promise.all([loadPerson(), loadPersonDocuments()]);
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

const medicalAgreementComplete = computed(() => {
  if (!medicalAgreementRequired.value) return true;
  if (!form.value.medicalAgreementAccepted) return false;
  if (!form.value.agreementSignatureName?.trim()) return false;
  return true;
});

const travelOptionsComplete = computed(
  () => !validateTravelOptionSelections(travelOptions.value, selectedTravelOptionIds.value)
);

/** Matches the backend "applied" status: profile + form + agreement + travel options + documents. */
const readyToSubmit = computed(
  () =>
    profileComplete.value &&
    applicationFormComplete.value &&
    agreementComplete.value &&
    medicalAgreementComplete.value &&
    travelOptionsComplete.value &&
    documentsCompleteForSubmit.value
);

const primaryActionLabel = computed(() =>
  readyToSubmit.value ? "Submit Application" : "Save Incomplete Application"
);

const dialogTitle = computed(() =>
  editingApplication.value ? "Update application" : "Apply for trip"
);

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const resetForm = () => {
  form.value = {
    tripWorkerRoleId: null,
    willSelfFund: false,
    willRaiseFunds: false,
    licenseStatus: null,
    hasPreferredRoommate: false,
    preferredRoommateNames: "",
    agreementAccepted: false,
    agreementSignatureName: "",
    agreementAdultFirstName: "",
    agreementAdultLastName: "",
    agreementAdultEmail: "",
    agreementAdultRelationship: "",
    medicalAgreementAccepted: false,
    medicalAgreementDate: null,
    version: 0,
  };
  selectedTravelOptionIds.value = [];
  formError.value = "";
  editingApplication.value = false;
  canEdit.value = true;
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
    agreementAdultFirstName: row?.agreementAdultFirstName || "",
    agreementAdultLastName: row?.agreementAdultLastName || "",
    agreementAdultEmail: row?.agreementAdultEmail || "",
    agreementAdultRelationship: row?.agreementAdultRelationship || "",
    medicalAgreementAccepted: !!row?.medicalAgreementAccepted,
    medicalAgreementDate: row?.medicalAgreementDate || null,
    version: row?.version ?? 0,
  };
  healthForm.value = {
    ...healthForm.value,
    isPregnant: normalizeYesNo(row?.isPregnant),
    pregnancyDueDate: row?.pregnancyDueDate
      ? String(row.pregnancyDueDate).slice(0, 10)
      : "",
  };
};

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

const applyHealthFromPerson = (data) => {
  healthForm.value = {
    gender: data?.gender || null,
    hasAllergies: normalizeYesNo(data?.hasAllergies),
    allergiesDescription: data?.allergiesDescription || "",
    isPregnant: healthForm.value.isPregnant ?? null,
    pregnancyDueDate: healthForm.value.pregnancyDueDate || "",
    takesMedication: normalizeYesNo(data?.takesMedication),
    medicalConditionIds: Array.isArray(data?.medicalConditionIds)
      ? data.medicalConditionIds.map((id) => Number(id))
      : Array.isArray(data?.medicalConditions)
        ? data.medicalConditions.map((c) => Number(c.id))
        : [],
    medicalConditions: Array.isArray(data?.medicalConditions) ? data.medicalConditions : [],
    version: data?.version ?? 0,
  };
};

const loadPerson = async () => {
  const personId = Utils.getStore("user")?.personId;
  if (!personId) {
    person.value = null;
    applyHealthFromPerson(null);
    return;
  }
  try {
    const params = {};
    if (trip.value?.orgId) params.orgId = trip.value.orgId;
    const res = await PersonServices.get(personId, params);
    person.value = res.data || null;
    applyHealthFromPerson(person.value);
  } catch {
    person.value = null;
    applyHealthFromPerson(null);
  }
};

const saveHealthProfile = async () => {
  if (!personId.value || !trip.value?.orgId) return;
  const res = await PersonServices.update(personId.value, {
    hasAllergies: normalizeYesNo(healthForm.value.hasAllergies),
    allergiesDescription: healthForm.value.hasAllergies === true
      ? healthForm.value.allergiesDescription?.trim() || null
      : null,
    takesMedication: normalizeYesNo(healthForm.value.takesMedication),
    medicalConditionIds: healthForm.value.takesMedication === true
      ? healthForm.value.medicalConditionIds || []
      : [],
    orgId: trip.value.orgId,
    version: healthForm.value.version,
  });
  person.value = { ...(person.value || {}), ...(res.data || {}) };
  applyHealthFromPerson(res.data || person.value);
};

const loadExistingApplication = async () => {
  const res = await TripServices.getApplication(props.tripId);
  trip.value = res.data?.trip || null;
  rolesNeeded.value = res.data?.rolesNeeded || [];
  travelOptions.value = res.data?.travelOptions || [];
  selectedTravelOptionIds.value = (res.data?.travelOptions || [])
    .filter((o) => o.selected)
    .map((o) => Number(o.id));
  agreementContent.value = res.data?.participantAgreement?.exists
    ? res.data.participantAgreement.content || ""
    : "";
  medicalAgreementContent.value = res.data?.medicalAgreement?.exists
    ? res.data.medicalAgreement.content || ""
    : "";
  editingApplication.value = true;
  canEdit.value = !!res.data?.canEdit;
  applyFormFromApplication(res.data?.application);
  if (!canEdit.value) {
    formError.value = `This application cannot be edited while its status is ${
      res.data?.applicationStatus || "unknown"
    }.`;
  }
};

const loadNewApplication = async () => {
  const res = await TripServices.getBrowseTrip(props.tripId);
  trip.value = res.data?.trip || null;
  rolesNeeded.value = res.data?.rolesNeeded || [];
  travelOptions.value = res.data?.travelOptions || [];
  selectedTravelOptionIds.value = (res.data?.travelOptions || [])
    .filter((o) => o.selected)
    .map((o) => Number(o.id));
  agreementContent.value = res.data?.participantAgreement?.exists
    ? res.data.participantAgreement.content || ""
    : "";
  medicalAgreementContent.value = res.data?.medicalAgreement?.exists
    ? res.data.medicalAgreement.content || ""
    : "";

  if (!res.data?.alreadyApplied) return;

  const status = res.data?.applicationStatus;
  if (status === "incomplete" || status === "applied") {
    await loadExistingApplication();
    return;
  }

  formError.value =
    status === "approved"
      ? "You are already on this trip."
      : status
        ? `Your previous application for this trip is ${status}.`
        : "You have already applied to this trip.";
  canEdit.value = false;
};

const load = async () => {
  if (!props.tripId) return;
  loading.value = true;
  formError.value = "";
  resetForm();
  try {
    await loadPersonDocuments();
    await loadNewApplication();
    // Load person after trip so medical-condition org context is known (Feature 17).
    await loadPerson();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trip.";
    trip.value = null;
    rolesNeeded.value = [];
    personDocuments.value = [];
    travelOptions.value = [];
    selectedTravelOptionIds.value = [];
    agreementContent.value = "";
    medicalAgreementContent.value = "";
    editingApplication.value = false;
    canEdit.value = false;
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.tripId],
  ([visible]) => {
    if (visible && props.tripId) load();
    if (!visible) {
      trip.value = null;
      rolesNeeded.value = [];
      personDocuments.value = [];
      person.value = null;
      travelOptions.value = [];
      selectedTravelOptionIds.value = [];
      agreementContent.value = "";
      medicalAgreementContent.value = "";
      resetForm();
    }
  }
);

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

const close = () => {
  open.value = false;
};

const buildPayload = () => ({
  tripWorkerRoleId: Number(form.value.tripWorkerRoleId),
  willSelfFund: !!form.value.willSelfFund,
  willRaiseFunds: !!form.value.willRaiseFunds,
  licenseStatus: licenseRequired.value ? form.value.licenseStatus : null,
  hasPreferredRoommate: !!form.value.hasPreferredRoommate,
  preferredRoommateNames: form.value.hasPreferredRoommate
    ? form.value.preferredRoommateNames.trim()
    : null,
  agreementAccepted: agreementRequired.value ? !!form.value.agreementAccepted : false,
  agreementSignatureName:
    agreementRequired.value || medicalAgreementRequired.value
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
  medicalAgreementAccepted: medicalAgreementRequired.value
    ? !!form.value.medicalAgreementAccepted
    : false,
  isPregnant: normalizeYesNo(healthForm.value.isPregnant),
  pregnancyDueDate:
    healthForm.value.isPregnant === true && healthForm.value.pregnancyDueDate
      ? String(healthForm.value.pregnancyDueDate).slice(0, 10)
      : null,
  selectedTravelOptionIds: selectedTravelOptionIds.value,
  ...(editingApplication.value ? { version: form.value.version } : {}),
});

const save = async () => {
  formError.value = "";
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
  if (medicalAgreementRequired.value && form.value.medicalAgreementAccepted) {
    if (!form.value.agreementSignatureName?.trim()) {
      formError.value = participantUnder18.value
        ? "Enter the adult's name as the electronic signature."
        : "Enter your name as your electronic signature.";
      return;
    }
  }

  saving.value = true;
  try {
    await saveHealthProfile();
    const payload = buildPayload();
    if (editingApplication.value) {
      await TripServices.updateApplication(props.tripId, payload);
    } else {
      await TripServices.applyToTrip(props.tripId, payload);
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to submit application.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="640" max-height="90vh" scrollable persistent>
    <v-card class="d-flex flex-column" style="max-height: min(90vh, 900px)">
      <v-card-title class="flex-shrink-0">{{ dialogTitle }}</v-card-title>
      <v-card-text class="overflow-y-auto flex-grow-1">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading && trip">
          <DonorTripHeading :trip="trip" :show-org-website="false" />

          <v-alert
            v-if="!profileComplete"
            type="warning"
            density="compact"
            class="mb-3"
          >
            Your profile needs to be completed before this application can be submitted.
            <ul v-if="missingProfileFields.length" class="mt-2 mb-0 pl-4">
              <li v-for="field in missingProfileFields" :key="field">{{ field }}</li>
            </ul>
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

          <v-select
            v-if="licenseRequired"
            v-model="form.licenseStatus"
            :items="licenseItems"
            :label="licenseLabel"
            density="compact"
            class="mb-2"
            :disabled="!canEdit"
          />

          <v-alert
            v-if="documentRequirementWarning"
            type="warning"
            density="compact"
            class="mb-3"
          >
            {{ documentRequirementWarning }}
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

          <PersonProfileFields
            v-model="healthForm"
            :org-id="trip?.orgId"
            health-only
            :disabled="!canEdit"
          />

          <div class="text-subtitle-2 mb-1 mt-2">Funding</div>
          <v-checkbox
            v-model="form.willSelfFund"
            label="I will self-fund"
            density="compact"
            hide-details
            class="mt-0"
            :disabled="!canEdit"
          />
          <v-checkbox
            v-model="form.willRaiseFunds"
            label="I will raise funds"
            density="compact"
            hide-details
            class="mb-2"
            :disabled="!canEdit"
          />

          <div class="text-subtitle-2 mb-1 mt-2">Roommate preference</div>
          <v-checkbox
            v-model="form.hasPreferredRoommate"
            label="I have a preferred roommate"
            density="compact"
            hide-details
            class="mt-0 mb-2"
            :disabled="!canEdit"
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
            v-model:medical-agreement-accepted="form.medicalAgreementAccepted"
            :under18="participantUnder18"
            :can-agree="canAgreeToAgreement"
            :content="agreementContent"
            :show-medical-agreement="takesMedicationYes"
            :medical-agreement-content="medicalAgreementContent"
            :medical-agreement-date="form.medicalAgreementDate"
            :disabled="!canEdit"
          />
        </template>

        <v-alert v-if="formError" type="error" density="compact" class="mt-3">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions class="flex-shrink-0">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="saving"
          :disabled="loading || !trip || !canEdit || !availableRoles.length"
          @click="save"
        >
          {{ primaryActionLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <EditPersonDialog
    v-if="personId"
    v-model="showProfileDialog"
    :person-id="personId"
    :medical-condition-org-id="trip?.orgId"
    @saved="onProfileSaved"
  />
</template>
