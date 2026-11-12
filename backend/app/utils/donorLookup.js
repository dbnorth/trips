import db from "../models/index.js";
import { normalizeEmail } from "./userPerson.js";
import { donorDisplayName, donorNameMatches, donorSortKey } from "./donorName.js";

const Op = db.Sequelize.Op;
const MATCH_LIMIT = 20;

export const LOOKUP_REQUIRED = "Enter a donor name or email to look up.";
export const NAME_TOO_SHORT = "Enter at least two letters of the name, or an email.";

/** Blank query, or a name shorter than two letters. An email (text with @) is long enough. */
export const lookupQueryError = (text, asEmail) => {
  if (!String(text ?? "").trim()) return LOOKUP_REQUIRED;
  if (!asEmail && String(text).trim().replace(/\s+/g, " ").length < 2) return NAME_TOO_SHORT;
  return null;
};

const emailDonor = (orgId, email) =>
  db.donor.findOne({
    where: {
      orgId,
      [Op.and]: [db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), email)],
    },
  });

/**
 * Donors of one organization matching a name or an exact email.
 * `{ asEmail, email, donors }`. Name matches are at most 20, in list order.
 */
export const searchOrgDonors = async (orgId, text) => {
  const query = String(text ?? "").trim();
  if (query.includes("@")) {
    const email = normalizeEmail(query);
    if (!email) return { asEmail: true, email: null, donors: [] };
    const donor = await emailDonor(orgId, email);
    return { asEmail: true, email, donors: donor ? [donor] : [] };
  }
  const donors = await db.donor.findAll({ where: { orgId } });
  const matches = donors
    .filter((donor) => donorNameMatches(donor, query))
    .sort((a, b) => donorSortKey(a).localeCompare(donorSortKey(b)) || a.id - b.id)
    .slice(0, MATCH_LIMIT);
  return { asEmail: false, donors: matches };
};

const placePart = (value) => {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text || null;
};

/** Public search result: id, shown name, city, and state. No email, street, or phone. */
export const publicDonorMatch = (donor) => ({
  id: donor.id,
  name: donorDisplayName(donor),
  city: placePart(donor.city),
  state: placePart(donor.state_prov),
});
