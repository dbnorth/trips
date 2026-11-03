export const DOCUMENT_TYPE_OPTIONS = [
  { title: "Medical License", value: "medical_license" },
  { title: "Passport", value: "passport" },
  { title: "Certification", value: "certification" },
  { title: "Diploma", value: "diploma" },
  { title: "Doctor Permission", value: "doctor_permission" },
];

export const documentTypeLabel = (value) =>
  DOCUMENT_TYPE_OPTIONS.find((o) => o.value === value)?.title || value || "—";
