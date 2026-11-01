const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad2 = (n) => String(n).padStart(2, "0");

/** A stored date-only value ("YYYY-MM-DD") is that calendar day; anything else is a moment shown in local time. */
const toParts = (value) => {
  if (value == null || value === "") return null;
  const text = value instanceof Date ? null : String(value).trim();
  const dateOnly = text ? DATE_ONLY.exec(text) : null;
  if (dateOnly) return { year: dateOnly[1], month: dateOnly[2], day: dateOnly[3], date: null };
  const date = value instanceof Date ? value : new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: String(date.getFullYear()),
    month: pad2(date.getMonth() + 1),
    day: pad2(date.getDate()),
    date,
  };
};

/** "2027-03-01" → "03/01/2027"; blank or unreadable → "". */
export const formatDate = (value) => {
  const parts = toParts(value);
  return parts ? `${parts.month}/${parts.day}/${parts.year}` : "";
};

/** A date with a time, in the browser's time zone: "01/15/2027 2:30 PM"; blank or unreadable → "". */
export const formatDateTime = (value) => {
  const parts = toParts(value);
  if (!parts) return "";
  if (!parts.date) return formatDate(value);
  const hours = parts.date.getHours();
  const time = `${hours % 12 || 12}:${pad2(parts.date.getMinutes())} ${hours >= 12 ? "PM" : "AM"}`;
  return `${formatDate(value)} ${time}`;
};

/** "03/01/2027 – 03/10/2027", or the one date given; "" when neither. */
export const formatDateRange = (start, end, separator = " – ") =>
  [formatDate(start), formatDate(end)].filter(Boolean).join(separator);
