const isBlank = (value) => value == null || String(value).trim() === "";

const LICENSE_STATUSES = ["yes", "yes_retired", "no"];

/**
 * Application fields excluding the participant agreement.
 * Used to gate agreeing until the rest of the form is filled in.
 */
export const isApplicationFormComplete = ({
  tripWorkerRoleId,
  willSelfFund,
  willRaiseFunds,
  licenseRequired = false,
  licenseStatus = null,
  hasPreferredRoommate = false,
  preferredRoommateNames = null,
}) => {
  if (tripWorkerRoleId == null || tripWorkerRoleId === "") return false;
  if (!willSelfFund && !willRaiseFunds) return false;
  if (licenseRequired && !LICENSE_STATUSES.includes(licenseStatus)) return false;
  if (hasPreferredRoommate && isBlank(preferredRoommateNames)) return false;
  return true;
};

/** Null when valid; otherwise an error message. Multi-option sets require one selection. */
export const validateTravelOptionSelections = (options, selectedIds) => {
  const groups = new Map();
  for (const option of options || []) {
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    if (!groups.has(setNumber)) groups.set(setNumber, []);
    groups.get(setNumber).push(option);
  }

  const selected = new Set((selectedIds || []).map(Number));
  for (const [setNumber, setOptions] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    if (setOptions.length <= 1) continue;
    const selectedInSet = setOptions.filter((o) => selected.has(Number(o.id)));
    if (selectedInSet.length !== 1) {
      return `Select one option from Trip Option ${setNumber}.`;
    }
  }
  return null;
};
