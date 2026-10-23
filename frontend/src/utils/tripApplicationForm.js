const isBlank = (value) => value == null || String(value).trim() === "";

/** Every person-document row must have an uploaded file. */
export const arePersonDocumentsUploaded = (documents = []) =>
  (documents || []).every(
    (doc) => doc.documentFileName && String(doc.documentFileName).trim() !== ""
  );

const meetsRoleDocumentRule = (doc, compareDate) => {
  if (!doc.documentFileName || String(doc.documentFileName).trim() === "") return false;
  if (!compareDate || doc.documentType?.hasExpirationDate === false) return true;
  const expirationDate = String(doc.expirationDate || "").slice(0, 10);
  return !!expirationDate && expirationDate > compareDate;
};

/**
 * Required specialization names the person still needs for one document type: all of them when
 * no document of the type meets the rule, otherwise the fewest missing on any qualifying document.
 */
const missingSpecializationNames = (documents, documentTypeId, requiredSpecializations, compareDate) => {
  const needed = (requiredSpecializations || []).filter(
    (s) => Number(s.documentTypeId) === documentTypeId
  );
  const qualifying = (documents || []).filter(
    (doc) => Number(doc.documentTypeId) === documentTypeId && meetsRoleDocumentRule(doc, compareDate)
  );
  if (!qualifying.length) return { documentMet: false, names: needed.map((s) => s.name) };
  let best = null;
  for (const doc of qualifying) {
    const have = new Set(
      (doc.specializations || []).map((s) => Number(s.documentTypeSpecializationId))
    );
    const missing = needed.filter((s) => !have.has(Number(s.id))).map((s) => s.name);
    if (!best || missing.length < best.length) best = missing;
  }
  return { documentMet: true, names: best };
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

/** "Board certification (Pediatrics, Emergency)" for a missing required role document. */
export const requiredRoleDocumentLabel = (docType) => {
  const name = docType?.description || "required document";
  const missing = docType?.missingSpecializations || [];
  return missing.length ? `${name} (${missing.join(", ")})` : name;
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

/**
 * Required document types that are missing or invalid for the trip compare date, each with
 * `missingSpecializations` (names) for the message.
 */
export const missingRequiredRoleDocuments = ({
  documents = [],
  requiredDocumentTypes = [],
  compareDate = null,
  requiredSpecializations = [],
}) => {
  const required = requiredDocumentTypes || [];
  if (!required.length) return [];
  const missing = [];
  for (const docType of required) {
    const id = Number(docType.id ?? docType);
    const result = missingSpecializationNames(documents, id, requiredSpecializations, compareDate);
    if (result.documentMet && !result.names.length) continue;
    const base = typeof docType === "object" ? docType : { id };
    missing.push({ ...base, missingSpecializations: result.names });
  }
  return missing;
};

/**
 * When the trip requires a passport, the person must have a passport-type document
 * with a file. If compareDate is set, expiration must be after it.
 */
export const isRequiredPassportUploaded = ({
  documents = [],
  requirePassport = false,
  compareDate = null,
}) => {
  if (!requirePassport) return true;
  return (documents || []).some((doc) => {
    const type = doc.documentType?.type ?? doc.type ?? null;
    if (type !== "passport") return false;
    if (!doc.documentFileName || String(doc.documentFileName).trim() === "") return false;
    if (!compareDate || doc.documentType?.hasExpirationDate === false) return true;
    const expirationDate = String(doc.expirationDate || "").slice(0, 10);
    return expirationDate && expirationDate > compareDate;
  });
};

/** Missing-document messages mention expiration unless every listed type has none. */
export const needsExpirationWording = (documentTypes = []) =>
  !documentTypes.length || documentTypes.some((t) => t?.hasExpirationDate !== false);

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
  if (chosen.filter((o) => Number(o.daysBefore) > 0).length > 1) {
    return "Choose only one trip option with days before the trip.";
  }
  if (chosen.filter((o) => Number(o.daysAfter) > 0).length > 1) {
    return "Choose only one trip option with days after the trip.";
  }
  return null;
};
