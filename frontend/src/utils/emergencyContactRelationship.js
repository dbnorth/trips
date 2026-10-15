export const EMERGENCY_CONTACT_RELATIONSHIPS = [
  { title: "Spouse", value: "spouse" },
  { title: "Father", value: "father" },
  { title: "Mother", value: "mother" },
  { title: "Child", value: "child" },
  { title: "Grand Mother", value: "grandmother" },
  { title: "Grand Father", value: "grandfather" },
  { title: "Other", value: "other" },
];

export const emergencyContactRelationshipLabel = (value) =>
  EMERGENCY_CONTACT_RELATIONSHIPS.find((row) => row.value === value)?.title || "";
