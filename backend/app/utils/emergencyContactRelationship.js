export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "child", label: "Child" },
  { value: "grandmother", label: "Grand Mother" },
  { value: "grandfather", label: "Grand Father" },
  { value: "other", label: "Other" },
];

const ALLOWED = new Set(EMERGENCY_CONTACT_RELATIONSHIPS.map((row) => row.value));

export const emergencyContactRelationshipLabel = (value) =>
  EMERGENCY_CONTACT_RELATIONSHIPS.find((row) => row.value === value)?.label || "";

/** Blank becomes null. Unknown values are rejected. */
export const normalizeEmergencyContactRelationship = (value) => {
  if (value == null || String(value).trim() === "") return { ok: true, value: null };
  const code = String(value).trim().toLowerCase();
  if (!ALLOWED.has(code)) {
    return {
      ok: false,
      message:
        "Emergency contact relationship must be Spouse, Father, Mother, Child, Grand Mother, Grand Father, or Other.",
    };
  }
  return { ok: true, value: code };
};
