export const TRIP_PARTICIPANT_STATUS_OPTIONS = [
  { title: "Incomplete", value: "incomplete" },
  { title: "Pre-Approved", value: "pre_approved" },
  { title: "Approved", value: "approved" },
  { title: "Declined", value: "declined" },
  { title: "Cancelled", value: "cancelled" },
];

/** Map legacy status values from earlier status schemes. */
const LEGACY_STATUS_LABELS = {
  active: "Approved",
  inactive: "Incomplete",
  ready: "Pre-Approved",
  applied: "Pre-Approved",
  denied: "Declined",
  canceled: "Cancelled",
};

export const tripParticipantStatusLabel = (value) => {
  if (value == null || value === "") return "—";
  const key = String(value).toLowerCase();
  return (
    TRIP_PARTICIPANT_STATUS_OPTIONS.find((o) => o.value === key)?.title ||
    LEGACY_STATUS_LABELS[key] ||
    value
  );
};

export const tripParticipantStatusColor = (value) => {
  const key = String(value || "").toLowerCase();
  if (key === "approved" || key === "active") return "success";
  if (key === "declined" || key === "cancelled" || key === "denied" || key === "canceled") {
    return "error";
  }
  if (key === "pre_approved" || key === "applied" || key === "ready") return "info";
  if (key === "incomplete" || key === "inactive") return "warning";
  return "primary";
};
