/** Reserved (unfilled reservations) and open (Available) positions across a trip's roles. */
export const totalRoleAvailability = (rolesNeeded = []) =>
  (rolesNeeded || []).reduce(
    (sum, role) => ({
      reserved: sum.reserved + (Number(role?.reservedCount) || 0),
      open: sum.open + (Number(role?.availableCount) || 0),
    }),
    { reserved: 0, open: 0 }
  );

/** e.g. "6 positions available (2 reserved, 4 open)", or "No roles available". */
export const roleAvailabilityText = ({ reserved = 0, open = 0 } = {}) => {
  const available = reserved + open;
  if (available < 1) return "No roles available";
  const parts = [];
  if (reserved > 0) parts.push(`${reserved} reserved`);
  if (open > 0) parts.push(`${open} open`);
  return `${available} position${available === 1 ? "" : "s"} available (${parts.join(", ")})`;
};

/** Apply button label, or null when nothing is reserved or open. */
export const applyButtonLabel = ({ reserved = 0, open = 0 } = {}) => {
  if (open > 0) return "Apply";
  if (reserved > 0) return "Apply for Reserved";
  return null;
};

/** Apply button label for a signed-in person, or null when they can't apply (no open spot and no reservation of theirs). */
export const myApplyButtonLabel = ({ open = 0 } = {}, myReservedTripWorkerRoleId = null) => {
  if (open > 0) return "Apply";
  if (myReservedTripWorkerRoleId) return "Apply for Reserved";
  return null;
};

/** Message for a signed-in person who hasn't applied and has no spot on the trip, else "". */
export const noSpotMessage = ({ rolesNeeded = [], myReservedTripWorkerRoleId = null, alreadyApplied = false } = {}) => {
  if (alreadyApplied || myReservedTripWorkerRoleId) return "";
  const { reserved, open } = totalRoleAvailability(rolesNeeded);
  if (open > 0) return "";
  return reserved > 0
    ? "Thanks for your interest, but all remaining spots on this trip are reserved."
    : "Thanks for your interest, but there are no spots available on this trip.";
};
