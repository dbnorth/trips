export const ACCOUNT_NUMBER_MESSAGE = "Account number must be 50 characters or less.";

/** Trim an account number. Blank becomes null. Too long returns `{ error }`. */
export const normalizeAccountNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return { value: null };
  if (text.length > 50) return { error: ACCOUNT_NUMBER_MESSAGE };
  return { value: text };
};

/** When `body` includes `accountNumber`, store the normalized value. Returns an error message or null. */
export const applyAccountNumber = (body) => {
  if (!body || !Object.prototype.hasOwnProperty.call(body, "accountNumber")) return null;
  const normalized = normalizeAccountNumber(body.accountNumber);
  if (normalized.error) return normalized.error;
  body.accountNumber = normalized.value;
  return null;
};
