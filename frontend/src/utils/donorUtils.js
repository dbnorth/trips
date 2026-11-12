export const formatDonorName = (donor) => {
  if (!donor) return "—";
  if (donor.donorType === "organization") return (donor.organizationName || "").trim() || "—";
  const name = `${donor.firstName || ""} ${donor.lastName || ""}`.trim();
  return name || "—";
};

/** Lookup choice: name, then city and state, then email when this result includes one. */
export const donorLookupChoice = (donor) => {
  const named = (donor?.name || "").trim() || formatDonorName(donor);
  const name = named === "—" ? "" : named;
  const place = [donor?.city, donor?.state || donor?.state_prov]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const email = String(donor?.email ?? "").trim();
  return [name, place, email].filter(Boolean).join(" — ");
};
