export const WHY_GO_MAX_LENGTH = 2000;
export const WHY_GO_TOO_LONG_MESSAGE = "Why go must be 2000 characters or less.";

/** `{ ok: true, whygoText }` (trimmed; blank → null) or `{ ok: false, message }`. */
export const parseWhyGo = (value) => {
  const whygoText = String(value ?? "").trim() || null;
  if (whygoText && whygoText.length > WHY_GO_MAX_LENGTH) {
    return { ok: false, message: WHY_GO_TOO_LONG_MESSAGE };
  }
  return { ok: true, whygoText };
};
