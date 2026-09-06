const isBlank = (value) => value == null || String(value).trim() === "";

/** Every person-document row must have an uploaded file. */
export const arePersonDocumentsUploaded = (documents = []) =>
  (documents || []).every(
    (doc) => doc.documentFileName && String(doc.documentFileName).trim() !== ""
  );

/**
 * When the worker role requires document type(s), the person must have each type
 * with a file. If compareDate is set, expiration must be after it.
 */
export const isRequiredRoleDocumentUploaded = ({
  documents = [],
  documentTypeId = null,
  documentTypeIds = null,
  compareDate = null,
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
  return ids.every((id) =>
    (documents || []).some((doc) => {
      if (Number(doc.documentTypeId) !== id) return false;
      if (!doc.documentFileName || String(doc.documentFileName).trim() === "") return false;
      if (!compareDate) return true;
      const expirationDate = String(doc.expirationDate || "").slice(0, 10);
      return expirationDate && expirationDate > compareDate;
    })
  );
};

/** Required document types that are missing or invalid for the trip compare date. */
export const missingRequiredRoleDocuments = ({
  documents = [],
  requiredDocumentTypes = [],
  compareDate = null,
}) => {
  const required = requiredDocumentTypes || [];
  if (!required.length) return [];
  return required.filter((docType) => {
    const id = Number(docType.id ?? docType);
    return !isRequiredRoleDocumentUploaded({
      documents,
      documentTypeIds: [id],
      compareDate,
    });
  });
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
    if (!compareDate) return true;
    const expirationDate = String(doc.expirationDate || "").slice(0, 10);
    return expirationDate && expirationDate > compareDate;
  });
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
}) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  if (!willSelfFund && !willRaiseFunds) return false;
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) return false;
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
