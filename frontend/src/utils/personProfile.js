const isBlank = (value) => value == null || String(value).trim() === "";

/** Normalize API/form yes-no to `true` | `false` | `null` (unset). */
export const normalizeYesNo = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return null;
};

export const PROFILE_FIELD_CHECKS = [
  { key: "firstName", label: "First name" },
  { key: "middleName", label: "Middle name" },
  { key: "lastName", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "addLine1", label: "Address line 1" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "state_prov", label: "State/province" },
  { key: "postalCode", label: "Postal code" },
  { key: "phoneContryCode", label: "Phone country code" },
  { key: "phoneNumber", label: "Phone number" },
  { key: "birthDate", label: "Birthdate" },
  { key: "gender", label: "Gender" },
  { key: "emergencyContactName", label: "Emergency contact name" },
  { key: "emergencyContactPhoneCountryCode", label: "Emergency contact country code" },
  { key: "emergencyContactPhoneNumber", label: "Emergency contact phone number" },
  {
    key: "allergiesDescription",
    label: "Allergies description",
    required: (person) => person?.hasAllergies === true,
  },
  { key: "currentChurchHome", label: "Current church home" },
  { key: "currentChurchHomeCity", label: "Current church home city" },
  { key: "currentChurchHomeStateProv", label: "Current church home state/province" },
];

/** Conditions selected for the given org (or all if orgId omitted). */
export const medicalConditionsForOrg = (person, orgId = null) => {
  const conditions = person?.medicalConditions || [];
  if (orgId == null || orgId === "") {
    if (conditions.length) return conditions;
    const ids = person?.medicalConditionIds;
    return Array.isArray(ids) ? ids.map((id) => ({ id })) : [];
  }
  return conditions.filter((c) => Number(c.orgId) === Number(orgId));
};

export const getMissingProfileFields = (person, options = {}) => {
  if (!person) return PROFILE_FIELD_CHECKS.map((field) => field.label);

  const missing = PROFILE_FIELD_CHECKS.filter((field) =>
    isProfileFieldMissing(person, field)
  ).map((field) => field.label);

  if (person.takesMedication === true) {
    const selected = medicalConditionsForOrg(person, options.orgId);
    if (!selected.length) missing.push("Medical conditions");
  }

  return missing;
};

export const isProfileFieldMissing = (person, field) => {
  const check = typeof field === "string" ? PROFILE_FIELD_CHECKS.find((f) => f.key === field) : field;
  if (!check) return false;
  const isRequired = check.required ? check.required(person) : true;
  if (!isRequired) return false;
  return isBlank(person?.[check.key]);
};

export const isProfileComplete = (person, options = {}) =>
  getMissingProfileFields(person, options).length === 0;

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

export const personDisplayName = (person, fallback = "Your profile") => {
  const name = [person?.firstName, person?.middleName, person?.lastName]
    .filter((part) => part != null && String(part).trim() !== "")
    .map((part) => String(part).trim())
    .join(" ");
  return name || fallback;
};
