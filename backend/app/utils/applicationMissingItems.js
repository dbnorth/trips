/**
 * Feature 28 — missing-item labels for Trip Status board.
 * Labels mirror frontend `getIncompleteSubmitReasons` (Feature 27).
 */

const isBlank = (value) => value == null || String(value).trim() === "";

/**
 * When a multi-option set lacks exactly one selection, return the same message
 * style as the apply form; otherwise null (complete / N/A).
 */
export const travelOptionsIncompleteMessage = (travelOptions, selectedIds) => {
  const groups = new Map();
  for (const option of travelOptions || []) {
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    if (!groups.has(setNumber)) groups.set(setNumber, []);
    groups.get(setNumber).push(option);
  }

  const selected = new Set((selectedIds || []).map(Number));
  for (const [setNumber, setOptions] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (setOptions.length <= 1) continue;
    const selectedInSet = setOptions.filter((o) => selected.has(Number(o.id)));
    if (selectedInSet.length !== 1) {
      return `Select one option from Trip Option ${setNumber}.`;
    }
  }
  return null;
};

/**
 * Human-readable checklist of profile + application gaps (Feature 27 labels).
 */
export const getApplicationMissingItemLabels = ({
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
