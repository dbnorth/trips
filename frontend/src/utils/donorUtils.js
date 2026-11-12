export const formatDonorName = (donor) => {
  if (!donor) return "—";
  if (donor.donorType === "organization") return (donor.organizationName || "").trim() || "—";
  const name = `${donor.firstName || ""} ${donor.lastName || ""}`.trim();
  return name || "—";
};
