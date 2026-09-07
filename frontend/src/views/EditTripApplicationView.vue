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
import TripApplicationFlightPurchase from "../components/TripApplicationFlightPurchase.vue";
import EditPersonDialog from "../components/EditPersonDialog.vue";
import PersonProfileFields from "../components/PersonProfileFields.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import ApplicationSubmitUnavailableAlert from "../components/ApplicationSubmitUnavailableAlert.vue";
import {
  tripParticipantStatusLabel,
  tripParticipantStatusColor,
} from "../utils/tripParticipantStatus.js";
import { isProfileComplete, isUnder18, normalizeYesNo } from "../utils/personProfile.js";
import {
  arePersonDocumentsUploaded,
  isApplicationFormComplete,
  isRequiredPassportUploaded,
  isRequiredRoleDocumentUploaded,
  missingRequiredRoleDocuments,
  validateTravelOptionSelections,
} from "../utils/tripApplicationForm.js";
import {
  canShowPrimarySubmitButton,
  getIncompleteSubmitReasons,
  getSubmitUnavailableReasons,
} from "../utils/applicationSubmitAvailability.js";

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
const showConfirmCancel = ref(false);
const showConfirmUncancel = ref(false);

const personId = computed(() => person.value?.id ?? Utils.getStore("user")?.personId ?? null);

const form = ref({
  tripWorkerRoleId: null,
  willSelfFund: false,
  willRaiseFunds: false,
  hasPreferredRoommate: false,
  preferredRoommateNames: "",
  flightPurchaseOption: null,
  preferredDepartureAirportCode: null,
  preferredReturnAirportCode: null,
  preferredCabinClass: "",
  preferredAirlineCode: null,
  preferredRefundableTicket: null,
  agreementAccepted: false,
  agreementSignatureName: "",
  agreementDate: null,
  agreementAdultFirstName: "",
  agreementAdultLastName: "",
  agreementAdultEmail: "",
  agreementAdultRelationship: "",
  medicalAgreementAccepted: false,
  medicalAgreementDate: null,
  version: 0,
});

const agreementRequired = computed(() => !!agreementContent.value?.trim());
const takesMedicationYes = computed(() => healthForm.value.takesMedication === true);
const medicalAgreementRequired = computed(
  () => takesMedicationYes.value && !!medicalAgreementContent.value?.trim()
);
const participantUnder18 = computed(() => isUnder18(person.value?.birthDate));

const availableRoles = computed(() => {
  const currentId = Number(form.value.tripWorkerRoleId || application.value?.tripWorkerRoleId);
  return (rolesNeeded.value || []).filter(
    (r) => (r.availableCount || 0) > 0 || Number(r.id) === currentId
  );
});

const roleItems = computed(() =>
  availableRoles.value.map((r) => {
    const name = r.workerRole?.name || "Role";
    const available = `${r.availableCount} available`;
    const license = r.workerRole?.licenseRequired ? " — License required" : "";
    return {
      title: `${name} (${available})${license}`,
      value: r.id,
    };
  })
);

const selectedRole = computed(
  () =>
    availableRoles.value.find((r) => Number(r.id) === Number(form.value.tripWorkerRoleId)) || null
);

const requiredDocumentTypes = computed(() => {
  const role = selectedRole.value?.workerRole;
  if (!role) return [];
  if (role.requiredDocumentTypes?.length) return role.requiredDocumentTypes;
  if (role.documentType) return [role.documentType];
  return [];
});

const dateOnly = (value) => {
  if (!value) return null;
  return String(value).slice(0, 10);
};

const hasRequiredDocumentForTrip = computed(() => {
  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  return isRequiredRoleDocumentUploaded({
    documents: personDocuments.value,
    documentTypeIds: requiredDocumentTypes.value.map((d) => d.id),
    compareDate,
  });
});

const hasRequiredPassportForTrip = computed(() => {
  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  return isRequiredPassportUploaded({
    documents: personDocuments.value,
    requirePassport: !!trip.value?.requirePassport,
    compareDate,
  });
});

const personDocumentsUploaded = computed(() =>
  arePersonDocumentsUploaded(personDocuments.value)
);

const documentsCompleteForSubmit = computed(
  () =>
    personDocumentsUploaded.value &&
    hasRequiredDocumentForTrip.value &&
    hasRequiredPassportForTrip.value
);

const documentRequirementWarning = computed(() => {
  if (!personDocumentsUploaded.value) {
    return "Upload a file for every document on your profile before submitting your application.";
  }
  if (trip.value?.requirePassport && !hasRequiredPassportForTrip.value) {
    const endDate = dateOnly(trip.value?.endDate);
    const endPart = endDate ? ` (${endDate})` : "";
    return `Upload a passport with an expiration date past the end of the trip${endPart} before submitting your application.`;
  }
  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  const missing = missingRequiredRoleDocuments({
    documents: personDocuments.value,
    requiredDocumentTypes: requiredDocumentTypes.value,
    compareDate,
  });
  if (!missing.length) return "";

  const names = missing.map((d) => d.description || "required document").join(", ");
  const endDate = dateOnly(trip.value?.endDate);
  const endPart = endDate ? ` (${endDate})` : "";
  return `Upload the following required documents with an expiration date past the end of the trip${endPart} before submitting your application: ${names}.`;
});

const profileComplete = computed(() =>
  isProfileComplete(
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
    hasPreferredRoommate: form.value.hasPreferredRoommate,
    preferredRoommateNames: form.value.preferredRoommateNames,
    flightPurchaseOption: form.value.flightPurchaseOption,
    preferredDepartureAirportCode: form.value.preferredDepartureAirportCode,
    preferredReturnAirportCode: form.value.preferredReturnAirportCode,
    preferredCabinClass: form.value.preferredCabinClass,
    preferredAirlineCode: form.value.preferredAirlineCode,
    preferredRefundableTicket: form.value.preferredRefundableTicket,
  })
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

const showPrimarySubmitButton = computed(() =>
  canShowPrimarySubmitButton({
    loading: loading.value,
    tripReady: !!trip.value,
    canEdit: canEdit.value,
    availableRolesCount: availableRoles.value.length,
  })
);

const structuralSubmitBlockers = computed(() =>
  getSubmitUnavailableReasons({
    loading: loading.value,
    tripReady: !!trip.value,
    canEdit: canEdit.value,
    applicationStatus: application.value?.status,
    availableRolesCount: availableRoles.value.length,
  })
);

const submitUnavailableReasons = computed(() => {
  if (structuralSubmitBlockers.value.length) return structuralSubmitBlockers.value;
  if (!showPrimarySubmitButton.value || readyToSubmit.value) return [];

  const compareDate = dateOnly(trip.value?.endDate) || dateOnly(trip.value?.startDate);
  const missingRoleDocs = missingRequiredRoleDocuments({
    documents: personDocuments.value,
    requiredDocumentTypes: requiredDocumentTypes.value,
    compareDate,
  });
  const travelError = validateTravelOptionSelections(
    travelOptions.value,
    selectedTravelOptionIds.value
  );

  return getIncompleteSubmitReasons({
    profileComplete: profileComplete.value,
    tripWorkerRoleId: form.value.tripWorkerRoleId,
    willSelfFund: form.value.willSelfFund,
    willRaiseFunds: form.value.willRaiseFunds,
    hasPreferredRoommate: form.value.hasPreferredRoommate,
    preferredRoommateNames: form.value.preferredRoommateNames,
    flightPurchaseOption: form.value.flightPurchaseOption,
    preferredDepartureAirportCode: form.value.preferredDepartureAirportCode,
    preferredReturnAirportCode: form.value.preferredReturnAirportCode,
    preferredCabinClass: form.value.preferredCabinClass,
    preferredAirlineCode: form.value.preferredAirlineCode,
    preferredRefundableTicket: form.value.preferredRefundableTicket,
    gender: healthForm.value.gender ?? person.value?.gender,
    isPregnant: normalizeYesNo(healthForm.value.isPregnant),
    pregnancyDueDate: healthForm.value.pregnancyDueDate,
    agreementRequired: agreementRequired.value,
    agreementAccepted: form.value.agreementAccepted,
    agreementSignatureName: form.value.agreementSignatureName,
    under18: participantUnder18.value,
    agreementAdultFirstName: form.value.agreementAdultFirstName,
    agreementAdultLastName: form.value.agreementAdultLastName,
    agreementAdultEmail: form.value.agreementAdultEmail,
    agreementAdultRelationship: form.value.agreementAdultRelationship,
    medicalAgreementRequired: medicalAgreementRequired.value,
    medicalAgreementAccepted: form.value.medicalAgreementAccepted,
    travelOptionsComplete: travelOptionsComplete.value,
    travelOptionsMessage: travelError,
    personDocumentsUploaded: personDocumentsUploaded.value,
    requiredRoleDocumentUploaded: hasRequiredDocumentForTrip.value,
    missingRoleDocumentNames: missingRoleDocs.map((d) => d.description || "required document"),
    requiredPassportUploaded: hasRequiredPassportForTrip.value,
    requirePassport: !!trip.value?.requirePassport,
  });
});

const submitUnavailableIntro = computed(() =>
  structuralSubmitBlockers.value.length
    ? "This application cannot be saved or submitted yet:"
    : "Complete the following to submit your application:"
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
  const id = Utils.getStore("user")?.personId;
  if (!id) {
    person.value = null;
    applyHealthFromPerson(null);
    return;
  }
  try {
    const params = {};
    if (trip.value?.orgId) params.orgId = trip.value.orgId;
    const res = await PersonServices.get(id, params);
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

const applyFormFromApplication = (row) => {
  form.value = {
    tripWorkerRoleId: row?.tripWorkerRoleId ?? null,
    willSelfFund: !!row?.willSelfFund,
    willRaiseFunds: !!row?.willRaiseFunds,
    hasPreferredRoommate: !!row?.hasPreferredRoommate,
    preferredRoommateNames: row?.preferredRoommateNames || "",
    flightPurchaseOption: row?.flightPurchaseOption || null,
    preferredDepartureAirportCode:
      row?.preferredDepartureAirport?.code || row?.preferredDepartureAirportCode || null,
    preferredReturnAirportCode:
      row?.preferredReturnAirport?.code || row?.preferredReturnAirportCode || null,
    preferredCabinClass: row?.preferredCabinClass || "",
    preferredAirlineCode: row?.preferredAirline?.code || row?.preferredAirlineCode || null,
    preferredRefundableTicket:
      row?.preferredRefundableTicket === true || row?.preferredRefundableTicket === false
        ? !!row.preferredRefundableTicket
        : null,
    agreementAccepted: !!row?.agreementAccepted,
    agreementSignatureName: row?.agreementSignatureName || "",
    agreementDate: row?.agreementDate || null,
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

const load = async () => {
  loading.value = true;
  formError.value = "";
  message.value = "";
  try {
    const [res] = await Promise.all([
      TripServices.getApplication(props.tripId),
      loadPersonDocuments(),
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
    medicalAgreementContent.value = res.data?.medicalAgreement?.exists
      ? res.data.medicalAgreement.content || ""
      : "";
    applyFormFromApplication(application.value);
    await loadPerson();
    if (!canEdit.value) {
      const status = application.value?.status;
      if (status === "cancelled") {
        formError.value =
          "This application is cancelled. You can Uncancel it if a role slot is available.";
      } else if (status === "approved") {
        formError.value =
          "You are approved for this trip. You can Cancel the application if needed.";
      } else {
        formError.value = `This application cannot be edited while its status is ${statusLabel.value}.`;
      }
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
    const res = await TripServices.updateApplication(props.tripId, {
      tripWorkerRoleId: Number(form.value.tripWorkerRoleId),
      willSelfFund: !!form.value.willSelfFund,
      willRaiseFunds: !!form.value.willRaiseFunds,
      licenseStatus: null,
      hasPreferredRoommate: !!form.value.hasPreferredRoommate,
      preferredRoommateNames: form.value.hasPreferredRoommate
        ? form.value.preferredRoommateNames.trim()
        : null,
      flightPurchaseOption: form.value.flightPurchaseOption || null,
      preferredDepartureAirportCode:
        form.value.flightPurchaseOption === "organization"
          ? form.value.preferredDepartureAirportCode || null
          : null,
      preferredReturnAirportCode:
        form.value.flightPurchaseOption === "organization"
          ? form.value.preferredReturnAirportCode || null
          : null,
      preferredCabinClass:
        form.value.flightPurchaseOption === "organization"
          ? form.value.preferredCabinClass?.trim() || null
          : null,
      preferredAirlineCode:
        form.value.flightPurchaseOption === "organization"
          ? form.value.preferredAirlineCode || null
          : null,
      preferredRefundableTicket:
        form.value.flightPurchaseOption === "organization"
          ? form.value.preferredRefundableTicket === true ||
            form.value.preferredRefundableTicket === false
            ? form.value.preferredRefundableTicket
            : null
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

const canCancelApplication = computed(() =>
  ["incomplete", "applied", "approved"].includes(
    String(application.value?.status || "").toLowerCase()
  )
);
const canUncancelApplication = computed(
  () => String(application.value?.status || "").toLowerCase() === "cancelled"
);

const cancelApplication = () => {
  if (!canCancelApplication.value) return;
  showConfirmCancel.value = true;
};

const confirmCancelApplication = async () => {
  saving.value = true;
  formError.value = "";
  try {
    const res = await TripServices.cancelApplication(props.tripId);
    application.value = res.data?.application || application.value;
    canEdit.value = false;
    showConfirmCancel.value = false;
    messageType.value = "success";
    message.value = res.data?.message || "Application cancelled.";
    router.push({ name: "home" });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to cancel application.";
    showConfirmCancel.value = false;
  } finally {
    saving.value = false;
  }
};

const uncancelApplication = () => {
  if (!canUncancelApplication.value) return;
  showConfirmUncancel.value = true;
};

const confirmUncancelApplication = async () => {
  saving.value = true;
  formError.value = "";
  try {
    const res = await TripServices.uncancelApplication(props.tripId);
    application.value = res.data?.application || application.value;
    canEdit.value = !!res.data?.canEdit;
    applyFormFromApplication(application.value);
    formError.value = "";
    showConfirmUncancel.value = false;
    messageType.value = "success";
    message.value = res.data?.message || "Application uncancelled.";
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to uncancel application.";
    showConfirmUncancel.value = false;
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

        <TripApplicationFlightPurchase
          v-model:flight-purchase-option="form.flightPurchaseOption"
          v-model:preferred-departure-airport-code="form.preferredDepartureAirportCode"
          v-model:preferred-return-airport-code="form.preferredReturnAirportCode"
          v-model:preferred-cabin-class="form.preferredCabinClass"
          v-model:preferred-airline-code="form.preferredAirlineCode"
          v-model:preferred-refundable-ticket="form.preferredRefundableTicket"
          :organization-name="trip?.organization?.name"
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
          :agreement-date="form.agreementDate"
          :under18="participantUnder18"
          :content="agreementContent"
          :show-medical-agreement="takesMedicationYes"
          :medical-agreement-content="medicalAgreementContent"
          :medical-agreement-date="form.medicalAgreementDate"
          :disabled="!canEdit"
        />

        <ApplicationSubmitUnavailableAlert
          :reasons="submitUnavailableReasons"
          :intro="submitUnavailableIntro"
        />

        <div class="d-flex justify-end ga-2 mt-4 flex-wrap">
          <v-btn
            v-if="canCancelApplication"
            color="error"
            variant="tonal"
            :disabled="saving"
            @click="cancelApplication"
          >
            Cancel
          </v-btn>
          <v-btn
            v-if="canUncancelApplication"
            color="primary"
            variant="tonal"
            :disabled="saving"
            @click="uncancelApplication"
          >
            Uncancel
          </v-btn>
          <v-spacer />
          <v-btn variant="text" :disabled="saving" @click="router.push({ name: 'home' })">
            Close
          </v-btn>
          <v-btn
            v-if="showPrimarySubmitButton"
            color="primary"
            :loading="saving"
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
      :medical-condition-org-id="trip?.orgId"
      @saved="onProfileSaved"
    />
    <ConfirmDialog
      v-model="showConfirmCancel"
      title="Are you sure?"
      message="Cancel this application? Your role slot will be freed."
      confirm-text="Cancel App"
      confirm-color="error"
      :loading="saving"
      @confirm="confirmCancelApplication"
    />
    <ConfirmDialog
      v-model="showConfirmUncancel"
      title="Are you sure?"
      message="Uncancel this application? It will return to incomplete or applied based on completeness."
      confirm-text="Uncancel"
      :loading="saving"
      @confirm="confirmUncancelApplication"
    />
  </v-container>
</template>
