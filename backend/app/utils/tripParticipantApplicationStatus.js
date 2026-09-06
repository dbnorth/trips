import db from "../models/index.js";

const Person = db.person;
const TripWorkerRole = db.tripWorkerRole;
const WorkerRole = db.workerRole;

const LICENSE_STATUSES = ["yes", "yes_retired", "no"];

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
  return true;
};

export const isApplicationComplete = ({
  tripWorkerRoleId,
  willSelfFund,
  willRaiseFunds,
  licenseStatus,
  hasPreferredRoommate,
  preferredRoommateNames,
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
}) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  if (!willSelfFund && !willRaiseFunds) return false;
  if (licenseRequired && !LICENSE_STATUSES.includes(licenseStatus)) return false;
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) return false;
  if (!travelOptionsComplete) return false;
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
    ],
  });
  if (!person) return null;
  const payload = person.toJSON();
  payload.medicalConditionIds = (payload.medicalConditions || []).map((c) => c.id);
  return payload;
};

export const loadLicenseRequired = async (tripWorkerRoleId) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  const row = await TripWorkerRole.findByPk(tripWorkerRoleId, {
    include: [
      {
        model: WorkerRole,
        as: "workerRole",
        attributes: ["id", "licenseRequired"],
      },
    ],
  });
  return !!row?.workerRole?.licenseRequired;
};

/** Statuses that admins set manually; do not auto-overwrite. */
export const MANUAL_TRIP_PARTICIPANT_STATUSES = ["approved", "declined", "cancelled"];

export const shouldAutoSetApplicationStatus = (status) =>
  status == null || status === "" || status === "incomplete" || status === "applied";
