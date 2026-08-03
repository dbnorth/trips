const isBlank = (value) => value == null || String(value).trim() === "";

export const PROFILE_FIELD_CHECKS = [
  { key: "firstName", label: "First name" },
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
    required: (person) => !!person?.hasAllergies,
  },
  { key: "currentChurchHome", label: "Current church home" },
  { key: "currentChurchHomeCity", label: "Current church home city" },
  { key: "currentChurchHomeStateProv", label: "Current church home state/province" },
];

export const getMissingProfileFields = (person) => {
  if (!person) return PROFILE_FIELD_CHECKS.map((field) => field.label);

  return PROFILE_FIELD_CHECKS.filter((field) => isProfileFieldMissing(person, field)).map(
    (field) => field.label
  );
};

export const isProfileFieldMissing = (person, field) => {
  const check = typeof field === "string" ? PROFILE_FIELD_CHECKS.find((f) => f.key === field) : field;
  if (!check) return false;
  const isRequired = check.required ? check.required(person) : true;
  if (!isRequired) return false;
  return isBlank(person?.[check.key]);
};

export const isProfileComplete = (person) => getMissingProfileFields(person).length === 0;

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
  const name = `${person?.firstName || ""} ${person?.lastName || ""}`.trim();
  return name || fallback;
};
