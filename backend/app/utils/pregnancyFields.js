const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const normalizeYesNo = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return null;
};

/**
 * Apply Feature 19 pregnancy clearing/validation onto application payload fields.
 * @param {object} data - mutable assignment fields (isPregnant, pregnancyDueDate)
 * @param {{ gender?: string|null }} options - person's gender (gates fields)
 * @returns {{ ok: true, isPregnant: boolean|null, pregnancyDueDate: string|null } | { ok: false, message: string }}
 */
export const normalizeApplicationPregnancy = (data, { gender } = {}) => {
  if (gender !== "female") {
    return { ok: true, isPregnant: null, pregnancyDueDate: null };
  }

  const isPregnant = Object.prototype.hasOwnProperty.call(data, "isPregnant")
    ? normalizeYesNo(data.isPregnant)
    : null;

  if (isPregnant !== true) {
    return { ok: true, isPregnant, pregnancyDueDate: null };
  }

  const raw = Object.prototype.hasOwnProperty.call(data, "pregnancyDueDate")
    ? data.pregnancyDueDate
    : null;
  if (raw == null || raw === "") {
    return { ok: true, isPregnant: true, pregnancyDueDate: null };
  }

  const dateOnly = String(raw).slice(0, 10);
  if (!DATE_ONLY.test(dateOnly) || Number.isNaN(Date.parse(`${dateOnly}T00:00:00`))) {
    return { ok: false, message: "Pregnancy due date must be a valid date." };
  }
  return { ok: true, isPregnant: true, pregnancyDueDate: dateOnly };
};

export default normalizeApplicationPregnancy;
