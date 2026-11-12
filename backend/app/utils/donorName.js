/** The name fields stored for a donor. The unused name is cleared. */

const collapse = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

export const donorDisplayName = (donor) => {
  if (!donor) return "";
  if (donor.donorType === "organization") return collapse(donor.organizationName);
  return [donor.firstName, donor.lastName].filter(Boolean).join(" ").trim();
};

/** Sort key: organization name, or last name then first name. */
export const donorSortKey = (donor) => {
  if (donor?.donorType === "organization") return collapse(donor.organizationName).toLowerCase();
  return `${collapse(donor?.lastName).toLowerCase()}\n${collapse(donor?.firstName).toLowerCase()}`;
};

/** True when the query appears in the organization name, family name, first name, last name, or shown name. */
export const donorNameMatches = (donor, query) => {
  const q = collapse(query).toLowerCase();
  if (q.length < 2) return false;
  return [donor?.organizationName, donor?.familyName, donor?.firstName, donor?.lastName, donorDisplayName(donor)].some(
    (value) => collapse(value).toLowerCase().includes(q)
  );
};

/** Match key for import. Organizations match on organization name; individuals on first and last. */
export const donorNameKey = (donor) => {
  if (donor?.donorType === "organization") return `org\n${collapse(donor.organizationName).toLowerCase()}`;
  return `ind\n${collapse(donor?.firstName).toLowerCase()}\n${collapse(donor?.lastName).toLowerCase()}`;
};

/**
 * Name fields for the donor type. `{ error }` when the name that type uses is blank.
 * An organization stores organizationName and clears first name, last name, and family name.
 * An individual stores first name, last name, and family name, and clears the organization name.
 * Family name is left unchanged when the body omits it.
 */
export const donorNameFields = (body, donorType) => {
  if (donorType === "organization") {
    const organizationName = collapse(body?.organizationName);
    if (!organizationName) return { error: "Organization name is required." };
    return { donorType, organizationName, firstName: null, lastName: null, familyName: null };
  }
  const firstName = collapse(body?.firstName);
  if (!firstName) return { error: "Donor first name is required." };
  const lastName = collapse(body?.lastName);
  const names = { donorType: "individual", organizationName: null, firstName, lastName: lastName || null };
  if (body && Object.prototype.hasOwnProperty.call(body, "familyName")) {
    names.familyName = collapse(body.familyName) || null;
  }
  return names;
};
