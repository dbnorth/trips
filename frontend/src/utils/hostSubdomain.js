const RESERVED_HOST_LABELS = new Set(["www", "api", "app", "admin", "localhost"]);

/**
 * Leftmost DNS label when hostname has more than two labels.
 * Returns null for apex, localhost, IPs, and reserved labels (no org binding).
 */
export function getRegistrationHostSubdomain(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  if (!hostname || typeof hostname !== "string") return null;
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost") return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return null;

  const label = parts[0];
  if (RESERVED_HOST_LABELS.has(label)) return null;
  return label;
}
