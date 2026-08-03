import Utils from "../config/utils.js";

/**
 * Persist the signed-in user and notify the app shell.
 * When an organization is supplied it becomes the selected org if the user has a role there.
 */
export const storeAuthenticatedUser = (
  data,
  { orgId = null, orgName = null, fromRegistration = false } = {}
) => {
  const scopeOrgs = Utils.getScopeOrgs(data);
  const preferredOrg =
    orgId != null ? scopeOrgs.find((o) => Number(o.orgId) === Number(orgId)) : null;
  const activeOrg = preferredOrg || scopeOrgs[0] || null;
  const user = {
    ...data,
    currentOrgId: activeOrg?.orgId ?? (orgId != null ? Number(orgId) : null),
    currentOrgName: activeOrg?.orgName ?? orgName ?? null,
    currentTripId: data.tripRoles?.[0]?.tripId ?? null,
    fromRegistration,
  };
  Utils.setStore("user", user);
  window.dispatchEvent(new CustomEvent("user-logged-in"));
  return user;
};

export default storeAuthenticatedUser;
