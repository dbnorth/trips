import db from "../models/index.js";
import { isFlightPurchaseComplete } from "./flightPurchaseFields.js";

const Person = db.person;
const TripWorkerRole = db.tripWorkerRole;
const WorkerRole = db.workerRole;

const isBlank = (value) => value == null || String(value).trim() === "";

/** Age under 18 as of a given date (defaults to today). */
export const isUnder18 = (birthDate, asOf = new Date()) => {
  if (!birthDate) return false;
  const raw = String(birthDate).slice(0, 10);
  const parts = raw.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false;
  const [y, m, d] = parts;
  const birth = new Date(y, m - 1, d);
  const ref = asOf instanceof Date ? asOf : new Date(asOf);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return false;
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age < 18;
};

const PROFILE_FIELD_CHECKS = [
  { key: "firstName" },
  { key: "middleName" },
  { key: "lastName" },
  { key: "email" },
  { key: "addLine1" },
  { key: "city" },
  { key: "country" },
  { key: "state_prov" },
  { key: "postalCode" },
  { key: "phoneContryCode" },
  { key: "phoneNumber" },
  { key: "birthDate" },
  { key: "gender" },
  { key: "emergencyContactName" },
  { key: "emergencyContactPhoneCountryCode" },
  { key: "emergencyContactPhoneNumber" },
  { key: "emergencyContactRelationship" },
  {
    key: "allergiesDescription",
    required: (person) => person?.hasAllergies === true,
  },
  { key: "currentChurchHome" },
  { key: "currentChurchHomeCity" },
  { key: "currentChurchHomeStateProv" },
];

export const isProfileComplete = (person, options = {}) => {
  if (!person) return false;
  const fieldsOk = PROFILE_FIELD_CHECKS.every((field) => {
    const required = field.required ? field.required(person) : true;
    if (!required) return true;
    return !isBlank(person[field.key]);
  });
  if (!fieldsOk) return false;
  if (person.takesMedication === true) {
    const conditions = person.medicalConditions || [];
    const orgId = options.orgId;
    const selected =
      orgId != null && orgId !== ""
        ? conditions.filter((c) => Number(c.orgId) === Number(orgId))
        : conditions.length
          ? conditions
          : person.medicalConditionIds || [];
    if (!selected.length) return false;
  }
  if (person.speaksOtherLanguage === true || person.speaksOtherLanguage === 1) {
    const languages = person.languages || [];
    const complete = languages.filter(
      (row) =>
        row?.languageId &&
        (row.fluency === "basic" || row.fluency === "conversational") &&
        (row.knowsMedicalTerminology === true || row.knowsMedicalTerminology === false)
    );
    if (!complete.length) return false;
  }
  return true;
};

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
    .map((s) => ({ id: s.id, name: s.name, documentTypeId: s.documentTypeId }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
};

/** "Board certification (Pediatrics, Emergency)" for a missing required role document. */
export const requiredRoleDocumentLabel = (docType) => {
  const name = docType?.description || docType?.name || "";
  const missing = docType?.missingSpecializations || [];
  return missing.length ? `${name} (${missing.join(", ")})` : name;
};

/**
 * When the worker role requires document type(s), the person must have each type
 * with a file. If compareDate is set (trip end/start), expiration must be after it.
 * That document must also have every required specialization for its type.
 * Prefer `documentTypeIds`; `documentTypeId` is legacy single-id support.
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

export const isApplicationComplete = ({
  tripWorkerRoleId,
  willSelfFund,
  willRaiseFunds,
  licenseStatus,
  hasPreferredRoommate,
  preferredRoommateNames,
  flightPurchaseOption = null,
  preferredDepartureAirportId = null,
  preferredReturnAirportId = null,
  preferredCabinClass = null,
  preferredAirlineId = null,
  preferredRefundableTicket = null,
  licenseRequired = false,
  agreementRequired = false,
  agreementAccepted = false,
  agreementSignatureName = null,
  participantUnder18 = false,
  agreementAdultFirstName = null,
  agreementAdultLastName = null,
  agreementAdultEmail = null,
  agreementAdultRelationship = null,
  medicalAgreementRequired = false,
  medicalAgreementAccepted = false,
  gender = null,
  isPregnant = null,
  pregnancyDueDate = null,
  travelOptionsComplete = true,
  personDocumentsUploaded = true,
  requiredRoleDocumentUploaded = true,
  requiredPassportUploaded = true,
}) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  if (!willSelfFund && !willRaiseFunds) return false;
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) return false;
  if (
    !isFlightPurchaseComplete({
      flightPurchaseOption,
      preferredDepartureAirportId,
      preferredReturnAirportId,
      preferredCabinClass,
      preferredAirlineId,
      preferredRefundableTicket,
    })
  ) {
    return false;
  }
  if (!travelOptionsComplete) return false;
  if (!personDocumentsUploaded) return false;
  if (!requiredRoleDocumentUploaded) return false;
  if (!requiredPassportUploaded) return false;
  if (agreementRequired) {
    if (!agreementAccepted) return false;
    if (isBlank(agreementSignatureName)) return false;
    if (participantUnder18) {
      if (isBlank(agreementAdultFirstName)) return false;
      if (isBlank(agreementAdultLastName)) return false;
      if (isBlank(agreementAdultEmail)) return false;
      if (isBlank(agreementAdultRelationship)) return false;
    }
  }
  if (medicalAgreementRequired && !medicalAgreementAccepted) return false;
  if (gender === "female") {
    if (isPregnant !== true && isPregnant !== false) return false;
    if (isPregnant === true && isBlank(pregnancyDueDate)) return false;
  }
  return true;
};

export const resolveAppliedOrIncompleteStatus = ({
  person,
  tripWorkerRoleId,
  willSelfFund,
  willRaiseFunds,
  licenseStatus,
  hasPreferredRoommate,
  preferredRoommateNames,
  flightPurchaseOption = null,
  preferredDepartureAirportId = null,
  preferredReturnAirportId = null,
  preferredCabinClass = null,
  preferredAirlineId = null,
  preferredRefundableTicket = null,
  licenseRequired = false,
  agreementRequired = false,
  agreementAccepted = false,
  agreementSignatureName = null,
  agreementAdultFirstName = null,
  agreementAdultLastName = null,
  agreementAdultEmail = null,
  agreementAdultRelationship = null,
  medicalAgreementRequired = false,
  medicalAgreementAccepted = false,
  isPregnant = null,
  pregnancyDueDate = null,
  travelOptionsComplete = true,
  personDocumentsUploaded = true,
  requiredRoleDocumentUploaded = true,
  requiredPassportUploaded = true,
  orgId = null,
}) => {
  const participantUnder18 = isUnder18(person?.birthDate);
  const applicationOk = isApplicationComplete({
    tripWorkerRoleId,
    willSelfFund,
    willRaiseFunds,
    licenseStatus,
    hasPreferredRoommate,
    preferredRoommateNames,
    flightPurchaseOption,
    preferredDepartureAirportId,
    preferredReturnAirportId,
    preferredCabinClass,
    preferredAirlineId,
    preferredRefundableTicket,
    licenseRequired,
    agreementRequired,
    agreementAccepted,
    agreementSignatureName,
    participantUnder18,
    agreementAdultFirstName,
    agreementAdultLastName,
    agreementAdultEmail,
    agreementAdultRelationship,
    medicalAgreementRequired,
    medicalAgreementAccepted,
    gender: person?.gender ?? null,
    isPregnant,
    pregnancyDueDate,
    travelOptionsComplete,
    personDocumentsUploaded,
    requiredRoleDocumentUploaded,
    requiredPassportUploaded,
  });
  const profileOk = isProfileComplete(person, { orgId });
  return applicationOk && profileOk ? "applied" : "incomplete";
};

export const loadPersonForCompleteness = async (peopleId) => {
  if (!peopleId) return null;
  const person = await Person.findByPk(peopleId, {
    include: [
      {
        model: db.medicalCondition,
        as: "medicalConditions",
        attributes: ["id", "name", "orgId"],
        through: { attributes: [] },
      },
      {
        model: db.personLanguage,
        as: "personLanguages",
        include: [
          {
            model: db.language,
            as: "language",
            attributes: ["id", "code", "name"],
          },
        ],
      },
    ],
  });
  if (!person) return null;
  const payload = person.toJSON();
  payload.medicalConditionIds = (payload.medicalConditions || []).map((c) => c.id);
  payload.languages = (payload.personLanguages || [])
    .filter((row) => row.language)
    .map((row) => ({
      languageId: row.language.id,
      code: row.language.code,
      name: row.language.name,
      fluency: row.fluency,
      knowsMedicalTerminology: !!row.knowsMedicalTerminology,
    }));
  return payload;
};

export const loadPersonDocumentsForCompleteness = async (peopleId) => {
  if (!peopleId) return [];
  return db.personDocument.findAll({
    where: { personId: peopleId },
    attributes: ["id", "documentTypeId", "documentFileName", "expirationDate"],
    include: [
      {
        model: db.documentType,
        as: "documentType",
        attributes: ["id", "type", "hasExpirationDate"],
      },
      {
        model: db.personDocumentSpecialization,
        as: "specializations",
        attributes: ["id", "documentTypeSpecializationId"],
      },
    ],
  });
};

export const loadWorkerRoleDocumentRequirements = async (tripWorkerRoleId) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") {
    return {
      licenseRequired: false,
      documentTypeId: null,
      requiredDocumentTypeIds: [],
      requiredSpecializations: [],
    };
  }
  const row = await TripWorkerRole.findByPk(tripWorkerRoleId, {
    include: [
      {
        model: WorkerRole,
        as: "workerRole",
        attributes: ["id", "licenseRequired", "documentTypeId"],
        include: [
          {
            model: db.documentType,
            as: "requiredDocumentTypes",
            attributes: ["id", "description", "type", "allowSpecialization"],
            through: { attributes: [] },
          },
          {
            model: db.documentTypeSpecialization,
            as: "requiredSpecializations",
            attributes: ["id", "name", "documentTypeId"],
            through: { attributes: [] },
          },
        ],
      },
    ],
  });
  const required = row?.workerRole?.requiredDocumentTypes || [];
  let requiredDocumentTypeIds = required.map((d) => d.id);
  if (!requiredDocumentTypeIds.length && row?.workerRole?.documentTypeId) {
    requiredDocumentTypeIds = [row.workerRole.documentTypeId];
  }
  return {
    licenseRequired: !!row?.workerRole?.licenseRequired,
    documentTypeId: requiredDocumentTypeIds[0] ?? null,
    requiredDocumentTypeIds,
    requiredDocumentTypes: required.length
      ? required.map((d) => (typeof d.toJSON === "function" ? d.toJSON() : d))
      : requiredDocumentTypeIds.map((id) => ({ id })),
    requiredSpecializations: activeRequiredSpecializations(row?.workerRole),
  };
};

export const loadLicenseRequired = async (tripWorkerRoleId) => {
  const { licenseRequired } = await loadWorkerRoleDocumentRequirements(tripWorkerRoleId);
  return licenseRequired;
};

/** Trip end date preferred; fall back to start (date-only YYYY-MM-DD). */
export const tripDocumentCompareDate = (trip) => {
  if (!trip) return null;
  const end = trip.endDate != null ? String(trip.endDate).slice(0, 10) : "";
  if (end) return end;
  const start = trip.startDate != null ? String(trip.startDate).slice(0, 10) : "";
  return start || null;
};

/** Statuses that admins set manually; do not auto-overwrite. */
export const MANUAL_TRIP_PARTICIPANT_STATUSES = ["approved", "declined", "cancelled"];

export const shouldAutoSetApplicationStatus = (status) =>
  status == null || status === "" || status === "incomplete" || status === "applied";
