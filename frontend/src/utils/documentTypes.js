export const DOCUMENT_TYPE_OPTIONS = [
  { title: "Medical Licence", value: "medical_licence" },
  { title: "Passport", value: "passport" },
  { title: "Certification", value: "certification" },
];

export const documentTypeLabel = (value) =>
  DOCUMENT_TYPE_OPTIONS.find((o) => o.value === value)?.title || value || "—";
