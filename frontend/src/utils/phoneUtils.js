/** Phone utilities for US format (xxx) xxx-xxxx */

export const PHONE_PATTERN = /^\(\d{3}\) \d{3}-\d{4}$/;

export const PHONE_MAX_DIGITS = 10;
export const PHONE_FORMATTED_MAX_LENGTH = 14;

export function parseDigits(value) {
  if (!value || typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

export function formatPhone(value) {
  const digits = parseDigits(value).slice(0, PHONE_MAX_DIGITS);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, PHONE_MAX_DIGITS)}`;
}

export function isValidPhone(value) {
  return parseDigits(value).length === PHONE_MAX_DIGITS;
}

export function phoneRule(value) {
  if (!value || !String(value).trim()) return true;
  const digits = parseDigits(value);
  if (digits.length > PHONE_MAX_DIGITS) {
    return "Phone must be (xxx) xxx-xxxx (10 digits)";
  }
  return isValidPhone(value) || "Phone must be (xxx) xxx-xxxx";
}

export function formatPhoneForDisplay(value) {
  if (!value) return "";
  const digits = parseDigits(value);
  if (digits.length === PHONE_MAX_DIGITS) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 0 && digits.length < PHONE_MAX_DIGITS) {
    return formatPhone(digits);
  }
  return value;
}

export function formatCountryCode(value) {
  const digits = parseDigits(value).slice(0, 3);
  if (!digits) return "";
  return `+${digits}`;
}

export function countryCodeRule(value) {
  if (!value || !String(value).trim()) return true;
  const digits = parseDigits(value);
  if (digits.length < 1 || digits.length > 3) {
    return "Country code must be 1–3 digits (e.g. +1)";
  }
  return true;
}

export function validatePhoneFields(countryCode, phoneNumber) {
  const ccErr = countryCodeRule(countryCode);
  if (ccErr !== true) return ccErr;
  const phoneErr = phoneRule(phoneNumber);
  if (phoneErr !== true) return phoneErr;
  if (parseDigits(phoneNumber) && !parseDigits(countryCode)) {
    return "Country code is required when a phone number is entered.";
  }
  if (parseDigits(countryCode) && !parseDigits(phoneNumber)) {
    return "Phone number is required when a country code is entered.";
  }
  return true;
}
