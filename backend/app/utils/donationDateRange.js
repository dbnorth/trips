import { Op } from "sequelize";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const validDate = (value) => (typeof value === "string" && DATE_PATTERN.test(value) ? value : null);

/** `dateTime` condition for donations dated on or after `startDate` and on or before `endDate` (either may be blank). */
export const donationDateRangeWhere = (startDate, endDate) => {
  const start = validDate(startDate);
  const end = validDate(endDate);
  const range = {};
  if (start) range[Op.gte] = new Date(`${start}T00:00:00`);
  if (end) {
    const dayAfter = new Date(`${end}T00:00:00`);
    dayAfter.setDate(dayAfter.getDate() + 1);
    range[Op.lt] = dayAfter;
  }
  return start || end ? { dateTime: range } : {};
};

/** `<start>-to-<end>` for file names (a blank side as `start` / `end`), or "" with no dates. */
export const donationDateRangeLabel = (startDate, endDate) => {
  const start = validDate(startDate);
  const end = validDate(endDate);
  if (!start && !end) return "";
  return `${start || "start"}-to-${end || "end"}`;
};
