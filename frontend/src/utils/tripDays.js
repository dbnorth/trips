export const DAYS_MESSAGE = "Days before and after must be whole numbers from -365 to 365.";

/** Whole number of days from -365 to 365 (blank is 0), or `null` when invalid. */
export const parseDays = (value) => {
  if (value == null || String(value).trim() === "") return 0;
  const days = Number(value);
  if (!Number.isInteger(days) || days < -365 || days > 365) return null;
  return days || 0;
};
