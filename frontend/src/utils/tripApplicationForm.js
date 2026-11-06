const isBlank = (value) => value == null || String(value).trim() === "";

const EXPIRATION_CHECK_DAYS = { trip_end_90: 90, trip_end_180: 180 };
const isOnOrAfterCheck = (docType) => docType?.expirationCheck === "trip_end_on_or_after";

/** The trip compare date, or 90 / 180 days after it for a type with a day-offset expiration check. */
const documentCheckDate = (docType, compareDate) => {
  const days = EXPIRATION_CHECK_DAYS[docType?.expirationCheck];
  if (!days) return compareDate;
  const [y, m, d] = String(compareDate).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

const expiresInTime = (expirationDate, docType, compareDate) => {
  const checkDate = documentCheckDate(docType, compareDate);
  return isOnOrAfterCheck(docType) ? expirationDate >= checkDate : expirationDate > checkDate;
};

const meetsRoleDocumentRule = (doc, compareDate) => {
  if (!doc.documentFileName || String(doc.documentFileName).trim() === "") return false;
  if (!compareDate || doc.documentType?.hasExpirationDate === false) return true;
  const expirationDate = String(doc.expirationDate || "").slice(0, 10);
  return !!expirationDate && expiresInTime(expirationDate, doc.documentType, compareDate);
};

const hasDocumentFile = (doc) => !!doc.documentFileName && String(doc.documentFileName).trim() !== "";
const dateKey = (value) => (value ? String(value).slice(0, 10) : "");
const laterFirst = (a, b) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? 1 : -1);

/**
 * The one document with a file that decides a trip requirement (Feature 120): latest expiration
 * date, then latest issue date (missing dates last), then newest upload.
 */
export const currentDocument = (documents) =>
  (documents || [])
    .filter(hasDocumentFile)
    .sort(
      (a, b) =>
        laterFirst(dateKey(a.expirationDate), dateKey(b.expirationDate)) ||
        laterFirst(dateKey(a.issueDate), dateKey(b.issueDate)) ||
        Number(b.id) - Number(a.id)
    )[0] || null;

/**
 * Required specialization names the person still needs for one document type: all of them when
 * the type's current document doesn't meet the rule, otherwise those missing on it.
 */
const missingSpecializationNames = (documents, documentTypeId, requiredSpecializations, compareDate) => {
  const needed = (requiredSpecializations || []).filter(
    (s) => Number(s.documentTypeId) === documentTypeId
  );
  const current = currentDocument(
    (documents || []).filter((doc) => Number(doc.documentTypeId) === documentTypeId)
  );
  if (!current || !meetsRoleDocumentRule(current, compareDate)) {
    return { documentMet: false, names: needed.map((s) => s.name) };
  }
  const have = new Set(
    (current.specializations || []).map((s) => Number(s.documentTypeSpecializationId))
  );
  return { documentMet: true, names: needed.filter((s) => !have.has(Number(s.id))).map((s) => s.name) };
};

/** Required specializations that apply: their type is required and allows specializations. */
export const activeRequiredSpecializations = (workerRole) => {
  const types = workerRole?.requiredDocumentTypes || [];
  const allowed = new Set(
    types.filter((t) => t.allowSpecialization !== false).map((t) => Number(t.id))
  );
  return (workerRole?.requiredSpecializations || [])
    .filter((s) => allowed.has(Number(s.documentTypeId)))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
};

/**
 * When the worker role requires document type(s), the person must have each type
 * with a file. If compareDate is set, expiration must be after it.
 * That document must also have every required specialization for its type.
 */
export const isRequiredRoleDocumentUploaded = ({
  documents = [],
  documentTypeId = null,
  documentTypeIds = null,
  compareDate = null,
  requiredSpecializations = [],
}) => {
  const ids =
    documentTypeIds != null
      ? [
          ...new Set(
            (documentTypeIds || [])
              .map((v) => Number(v))
              .filter((n) => Number.isFinite(n) && n > 0)
          ),
        ]
      : documentTypeId == null || documentTypeId === ""
        ? []
        : [Number(documentTypeId)];
  if (!ids.length) return true;
  return ids.every((id) => {
    const result = missingSpecializationNames(documents, id, requiredSpecializations, compareDate);
    return result.documentMet && !result.names.length;
  });
};

/** A Doctor Permission document with a file that is good through compareDate. */
export const meetsDoctorPermissionRule = (doc, compareDate) => {
  if ((doc.documentType?.type ?? doc.type ?? null) !== "doctor_permission") return false;
  if (!doc.documentFileName || String(doc.documentFileName).trim() === "") return false;
  if (!compareDate) return true;
  const expirationDate = String(doc.expirationDate || "").slice(0, 10);
  if (doc.documentType?.hasExpirationDate === false) return !expirationDate || expirationDate >= compareDate;
  return !!expirationDate && expiresInTime(expirationDate, doc.documentType, compareDate);
};

/**
 * When the trip requires it and the applicant is pregnant, her current Doctor Permission
 * document must be good through compareDate (meetsDoctorPermissionRule).
 */
export const isDoctorPermissionUploaded = ({
  documents = [],
  isPregnant = null,
  doctorPermissionRequired = false,
  compareDate = null,
}) => {
  if (!doctorPermissionRequired || isPregnant !== true) return true;
  const current = currentDocument(
    (documents || []).filter((doc) => (doc.documentType?.type ?? doc.type ?? null) === "doctor_permission")
  );
  return !!current && meetsDoctorPermissionRule(current, compareDate);
};

/**
 * Application fields excluding the participant agreement.
 * Used to gate agreeing until the rest of the form is filled in.
 */
export const isApplicationFormComplete = ({
  tripWorkerRoleId,
  willSelfFund,
  willRaiseFunds,
  hasPreferredRoommate = false,
  preferredRoommateNames = null,
  flightPurchaseOption = null,
  preferredDepartureAirportCode = null,
  preferredReturnAirportCode = null,
  preferredCabinClass = null,
  preferredAirlineCode = null,
  preferredRefundableTicket = null,
}) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  if (!willSelfFund && !willRaiseFunds) return false;
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) return false;
  if (flightPurchaseOption !== "self" && flightPurchaseOption !== "organization") return false;
  if (flightPurchaseOption === "organization") {
    if (isBlank(preferredDepartureAirportCode)) return false;
    if (isBlank(preferredReturnAirportCode)) return false;
    if (isBlank(preferredCabinClass)) return false;
    if (isBlank(preferredAirlineCode)) return false;
    if (preferredRefundableTicket !== true && preferredRefundableTicket !== false) return false;
  }
  return true;
};

/** Null when valid; otherwise an error message. Multi-option sets require one selection. */
export const validateTravelOptionSelections = (options, selectedIds) => {
  const groups = new Map();
  for (const option of options || []) {
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

/** Null when at most one selected option has days before and one has days after the trip. */
export const travelOptionDaysError = (options, selectedIds) => {
  const selected = new Set((selectedIds || []).map(Number));
  const chosen = (options || []).filter((o) => selected.has(Number(o.id)));
  if (chosen.filter((o) => Number(o.daysBefore)).length > 1) {
    return "Choose only one trip option with days before the trip.";
  }
  if (chosen.filter((o) => Number(o.daysAfter)).length > 1) {
    return "Choose only one trip option with days after the trip.";
  }
  return null;
};
