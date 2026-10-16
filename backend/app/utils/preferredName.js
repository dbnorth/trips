export const defaultPreferredName = (firstName, lastName) =>
  [firstName, lastName]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" ");

/** Blank or omitted input stores the first + last default. Both names blank → null. */
export const resolvePreferredName = (value, firstName, lastName) => {
  const trimmed = value == null ? "" : String(value).trim();
  if (trimmed) return trimmed;
  return defaultPreferredName(firstName, lastName) || null;
};

export const displayPreferredName = (person) => {
  const stored = person?.preferredName == null ? "" : String(person.preferredName).trim();
  return stored || defaultPreferredName(person?.firstName, person?.lastName);
};
