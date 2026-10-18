/** Emails typed in a text box, separated by commas, semicolons, spaces, or new lines. */
export const parseEmailList = (text) => String(text ?? "").split(/[\s,;]+/).filter(Boolean);

/** Error when a role has more reserved emails than its Number Needed, otherwise "". */
export const tooManyReservedEmailsError = (emails, quantity, roleName = "") => {
  if (emails.length <= Number(quantity)) return "";
  const prefix = roleName ? `${roleName}: ` : "";
  return `${prefix}Reserved emails (${emails.length}) cannot be more than Number Needed (${quantity}).`;
};
