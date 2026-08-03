export const formatDonorName = (donor) => {
  if (!donor) return "—";
  const name = `${donor.firstName || ""} ${donor.lastName || ""}`.trim();
  return name || "—";
};
