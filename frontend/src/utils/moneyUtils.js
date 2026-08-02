/** US dollar money input helpers */

export function parseMoneyInput(value, { allowNegative = false } = {}) {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  const negative = allowNegative && /^-/.test(raw);
  let s = raw.replace(/[^\d.]/g, "");
  const dotIndex = s.indexOf(".");
  if (dotIndex !== -1) {
    s = s.slice(0, dotIndex + 1) + s.slice(dotIndex + 1).replace(/\./g, "");
  }
  const parts = s.split(".");
  let dollars = parts[0] || "";
  if (dollars.length > 1) dollars = dollars.replace(/^0+(?=\d)/, "");
  const cents = parts[1] != null ? parts[1].slice(0, 2) : null;
  let result = cents != null ? `${dollars}.${cents}` : dollars;
  if (!result || result === ".") return negative ? "-" : "";
  return negative ? `-${result}` : result;
}

export function formatMoneyDisplay(value, { allowNegative = false } = {}) {
  const parsed = parseMoneyInput(value, { allowNegative });
  if (!parsed || parsed === "." || parsed === "-") return "";
  const num = Number(parsed);
  if (Number.isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function parseMoneyAmount(value, { allowNegative = false } = {}) {
  const parsed = parseMoneyInput(value, { allowNegative });
  if (!parsed || parsed === "." || parsed === "-") return null;
  const num = Number(parsed);
  return Number.isNaN(num) ? null : num;
}

export function moneyRule(value, { allowNegative = false } = {}) {
  const amount = parseMoneyAmount(value, { allowNegative });
  if (amount == null) return true;
  if (!Number.isFinite(amount)) return "Enter a valid amount";
  if (!allowNegative && amount <= 0) return "Enter a valid amount";
  return true;
}
