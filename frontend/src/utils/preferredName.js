export const PREFERRED_NAME_HINT = "Include a suffix such as M.D. or R.N. if appropriate.";

export const defaultPreferredName = (firstName, lastName) =>
  [firstName, lastName]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" ");

export const displayPreferredName = (person) => {
  const stored = person?.preferredName == null ? "" : String(person.preferredName).trim();
  return stored || defaultPreferredName(person?.firstName, person?.lastName);
};
