import { Op } from "sequelize";
import db from "../models/index.js";

const Organization = db.organization;

export const RESERVED_SUBDOMAINS = new Set(["www", "api", "app", "admin", "localhost"]);

/** DNS label: 1–63 chars, lowercase alnum, hyphens not at ends. */
export const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Normalize user input to stored subdomain form, or null if empty/cleared.
 * Does not validate format — use validateSubdomainValue for that.
 */
export const normalizeSubdomainInput = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
};

/**
 * @returns {{ ok: true, subdomain: string|null } | { ok: false, message: string }}
 */
export const validateSubdomainValue = (value) => {
  const subdomain = normalizeSubdomainInput(value);
  if (subdomain == null) return { ok: true, subdomain: null };
  if (RESERVED_SUBDOMAINS.has(subdomain)) {
    return { ok: false, message: `Subdomain "${subdomain}" is reserved.` };
  }
  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    return {
      ok: false,
      message:
        "Subdomain must be 1–63 characters, lowercase letters, numbers, and hyphens (not at the start or end).",
    };
  }
  return { ok: true, subdomain };
};

export const findOrganizationBySubdomain = async (subdomain) => {
  const normalized = normalizeSubdomainInput(subdomain);
  if (!normalized) return null;
  return Organization.findOne({
    where: { subdomain: normalized },
  });
};

export const isSubdomainTaken = async (subdomain, { excludeOrgId = null } = {}) => {
  const normalized = normalizeSubdomainInput(subdomain);
  if (!normalized) return false;
  const where = { subdomain: normalized };
  if (excludeOrgId != null) {
    where.id = { [Op.ne]: excludeOrgId };
  }
  const existing = await Organization.findOne({ where, attributes: ["id"] });
  return !!existing;
};
