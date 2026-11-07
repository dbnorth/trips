export const DOCUMENT_TYPE_OPTIONS = [
  { title: "Medical License", value: "medical_license" },
  { title: "Passport", value: "passport" },
  { title: "Certification", value: "certification" },
  { title: "Diploma", value: "diploma" },
  { title: "Doctor Permission", value: "doctor_permission" },
];

export const documentTypeLabel = (value) =>
  DOCUMENT_TYPE_OPTIONS.find((o) => o.value === value)?.title || value || "—";

export const EXPIRATION_CHECK_OPTIONS = [
  { title: "After trip end date", value: "trip_end" },
  { title: "On or after trip end date", value: "trip_end_on_or_after" },
  { title: "90 days after trip end date", value: "trip_end_90" },
  { title: "180 days after trip end date", value: "trip_end_180" },
];

const todayDateOnly = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/** A document is expired from its expiration date on (local date); no expiration date → never. */
export const isDocumentExpired = (doc) => {
  const expirationDate = String(doc?.expirationDate || "").slice(0, 10);
  return !!expirationDate && expirationDate <= todayDateOnly();
};

/** The type's expiration check label, or "—" when it has no expiration date. */
export const expirationCheckLabel = (row) =>
  row?.hasExpirationDate === false
    ? "—"
    : EXPIRATION_CHECK_OPTIONS.find((o) => o.value === row?.expirationCheck)?.title ||
      EXPIRATION_CHECK_OPTIONS[0].title;
