import { tripParticipantStatusLabel } from "./tripParticipantStatus.js";

const isBlank = (value) => value == null || String(value).trim() === "";

/**
 * Feature 27 — when the primary Submit/Save button is hidden, list why.
 * Returns [] while loading so the alert does not flash.
 */
export const getSubmitUnavailableReasons = ({
  loading = false,
  tripReady = false,
  canEdit = false,
  applicationStatus = null,
  availableRolesCount = 0,
} = {}) => {
  if (loading) return [];

  const reasons = [];

  if (!canEdit) {
    const statusLabel = tripParticipantStatusLabel(applicationStatus || "unknown");
    reasons.push(`This application cannot be saved while its status is ${statusLabel}.`);
  }

  if (!(Number(availableRolesCount) > 0)) {
    reasons.push("There are no trip roles with available positions.");
  }

  if (!tripReady) {
    reasons.push("This trip is not available right now.");
  }

  return reasons;
};

/**
 * Dynamic checklist of what remains before Submit Application is available.
 * Profile is one item; remaining items are incomplete application fields.
 */
export const getIncompleteSubmitReasons = ({
  profileComplete = true,
  tripWorkerRoleId = null,
  willSelfFund = false,
  willRaiseFunds = false,
  hasPreferredRoommate = false,
  preferredRoommateNames = null,
  gender = null,
  isPregnant = null,
  pregnancyDueDate = null,
  agreementRequired = false,
  agreementAccepted = false,
  agreementSignatureName = null,
  under18 = false,
  agreementAdultFirstName = null,
  agreementAdultLastName = null,
  agreementAdultEmail = null,
  agreementAdultRelationship = null,
  medicalAgreementRequired = false,
  medicalAgreementAccepted = false,
  travelOptionsComplete = true,
  travelOptionsMessage = null,
  personDocumentsUploaded = true,
  requiredRoleDocumentUploaded = true,
  missingRoleDocumentNames = [],
  requiredPassportUploaded = true,
  requirePassport = false,
} = {}) => {
  const reasons = [];

  if (!profileComplete) {
    reasons.push("Profile is not complete");
  }

  if (tripWorkerRoleId == null || tripWorkerRoleId === "") {
    reasons.push("Trip role");
  }
  if (!willSelfFund && !willRaiseFunds) {
    reasons.push("Funding (self-fund and/or raise funds)");
  }
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) {
    reasons.push("Preferred roommate name(s)");
  }

  if (String(gender || "").toLowerCase() === "female") {
    if (isPregnant !== true && isPregnant !== false) {
      reasons.push("Pregnancy question");
    } else if (isPregnant === true && isBlank(pregnancyDueDate)) {
      reasons.push("Pregnancy due date");
    }
  }

  if (!travelOptionsComplete) {
    reasons.push(travelOptionsMessage || "Travel options");
  }

  if (agreementRequired) {
    if (!agreementAccepted) reasons.push("Participant agreement");
    if (isBlank(agreementSignatureName)) reasons.push("Electronic signature");
    if (under18) {
      if (isBlank(agreementAdultFirstName)) reasons.push("Adult signer first name");
      if (isBlank(agreementAdultLastName)) reasons.push("Adult signer last name");
      if (isBlank(agreementAdultEmail)) reasons.push("Adult signer email");
      if (isBlank(agreementAdultRelationship)) reasons.push("Adult signer relationship");
    }
  }

  if (medicalAgreementRequired) {
    if (!medicalAgreementAccepted) reasons.push("Medical agreement");
    if (isBlank(agreementSignatureName) && !agreementRequired) {
      reasons.push("Electronic signature");
    }
  }

  if (!personDocumentsUploaded) {
    reasons.push("Upload a file for every profile document");
  }
  if (!requiredRoleDocumentUploaded) {
    const names = (missingRoleDocumentNames || []).filter(Boolean);
    reasons.push(
      names.length
        ? `Required role document(s): ${names.join(", ")}`
        : "Required role document(s)"
    );
  }
  if (requirePassport && !requiredPassportUploaded) {
    reasons.push("Passport document (with valid expiration)");
  }

  return reasons;
};

export const canShowPrimarySubmitButton = ({
  loading = false,
  tripReady = false,
  canEdit = false,
  availableRolesCount = 0,
} = {}) =>
  !loading &&
  !!tripReady &&
  !!canEdit &&
  Number(availableRolesCount) > 0;
