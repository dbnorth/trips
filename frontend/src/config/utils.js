export default class Utils {
  static formatDate = (dateStr) => {
    if (!dateStr) return "–";
    try {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  static setStore = (name, content) => {
    if (!name) return;
    if (typeof content !== "string") content = JSON.stringify(content);
    return window.localStorage.setItem(name, content);
  };

  static getStore = (name) => {
    if (!name) return;
    const raw = window.localStorage.getItem(name);
    return raw ? JSON.parse(raw) : null;
  };

  static removeItem = (name) => {
    if (!name) return;
    return window.localStorage.removeItem(name);
  };

  static effectiveOrgId = (user) => {
    if (!user) return null;
    if (Utils.isSystemAdmin(user)) {
      if (user.actingOrganizationId === null || user.actingOrganizationId === "") return null;
      return user.actingOrganizationId ?? user.currentOrgId ?? null;
    }
    const scopeOrgs = Utils.getScopeOrgs(user);
    if (user.currentOrgId != null && user.currentOrgId !== "") {
      const id = Number(user.currentOrgId);
      if (!scopeOrgs.length || scopeOrgs.some((org) => Number(org.orgId) === id)) {
        return id;
      }
    }
    if (scopeOrgs.length) return scopeOrgs[0].orgId;
    return null;
  };

  /** Organizations where the user is Org Admin, sorted by name. */
  static getOrgAdminOrgs = (user) => {
    if (!user || Utils.isSystemAdmin(user)) return [];
    const byId = new Map();
    for (const role of user.orgRoles || []) {
      if (role.roleName !== "Org Admin" || role.orgId == null) continue;
      const orgId = Number(role.orgId);
      if (byId.has(orgId)) continue;
      byId.set(orgId, {
        orgId,
        orgName: role.orgName,
        logo: role.logo,
        colorFamily: role.colorFamily,
      });
    }
    return [...byId.values()].sort((a, b) => (a.orgName || "").localeCompare(b.orgName || ""));
  };

  /**
   * Organizations the user may select for menu/admin scope.
   * Org Admins: only organizations they administer.
   * Others: organizations from any org or trip role.
   */
  static getScopeOrgs = (user) => {
    if (!user || Utils.isSystemAdmin(user)) return [];
    const orgAdminOrgs = Utils.getOrgAdminOrgs(user);
    if (orgAdminOrgs.length) return orgAdminOrgs;
    return Utils.getRoleOrgs(user);
  };

  /** Organizations where the user has any org or trip role, sorted by name. */
  static getRoleOrgs = (user) => {
    if (!user || Utils.isSystemAdmin(user)) return [];
    const byId = new Map();
    for (const role of user.orgRoles || []) {
      if (role.orgId == null) continue;
      const orgId = Number(role.orgId);
      if (byId.has(orgId)) continue;
      byId.set(orgId, {
        orgId,
        orgName: role.orgName,
        logo: role.logo,
        colorFamily: role.colorFamily,
      });
    }
    for (const role of user.tripRoles || []) {
      if (role.orgId == null) continue;
      const orgId = Number(role.orgId);
      if (byId.has(orgId)) continue;
      byId.set(orgId, {
        orgId,
        orgName: role.orgName,
        logo: role.orgLogo,
        colorFamily: role.orgColorFamily,
      });
    }
    return [...byId.values()].sort((a, b) => (a.orgName || "").localeCompare(b.orgName || ""));
  };

  /** @deprecated Prefer getScopeOrgs for menu/admin pickers; getRoleOrgs for membership lists. */
  static getSelectableOrgs = (user) => Utils.getScopeOrgs(user);

  static isOrgAdmin = (user, orgId) => {
    if (Utils.isSystemAdmin(user)) return true;
    return (user?.orgRoles || []).some(
      (r) => Number(r.orgId) === Number(orgId) && r.roleName === "Org Admin"
    );
  };

  static isTripLeader = (user, tripId) =>
    (user?.tripRoles || []).some(
      (r) => Number(r.tripId) === Number(tripId) && r.roleName === "Trip Leader"
    );

  static isTripParticipant = (user, tripId) =>
    (user?.tripRoles || []).some(
      (r) => Number(r.tripId) === Number(tripId) && r.roleName === "Trip Participant"
    );

  static isSystemAdmin = (user) => !!user && (user.isAdmin === true || user.isAdmin === 1);

  static hasActiveAccess = (user) => {
    if (Utils.isSystemAdmin(user)) return true;
    const hasActiveOrg = (user?.orgRoles || []).some((r) => r.roleName === "Org Admin");
    const hasTrip = (user?.tripRoles || []).length > 0;
    return hasActiveOrg || hasTrip;
  };

  static pendingOrgNames = (user) =>
    (user?.orgRoles || [])
      .filter((r) => r.roleName === "Pending User")
      .map((r) => r.orgName)
      .filter(Boolean);

  static showOrgScopeNotice = (user) => {
    if (!user) return false;
    if (Utils.isSystemAdmin(user)) return true;
    return Utils.getScopeOrgs(user).length > 1;
  };

  static orgDisplayName = (user, orgId) => {
    if (!user || orgId == null) return null;
    const id = Number(orgId);
    if (
      user.currentOrgName &&
      user.currentOrgId != null &&
      Number(user.currentOrgId) === id
    ) {
      return user.currentOrgName;
    }
    const fromOrgRole = (user.orgRoles || []).find((r) => Number(r.orgId) === id)?.orgName;
    if (fromOrgRole) return fromOrgRole;
    const fromTripRole = (user.tripRoles || []).find((r) => Number(r.orgId) === id)?.orgName;
    if (fromTripRole) return fromTripRole;
    const selectable = Utils.getRoleOrgs(user);
    const match = selectable.find((org) => Number(org.orgId) === id);
    return match?.orgName || null;
  };

  static setCurrentOrg = (orgId, orgName = null) => {
    const stored = Utils.getStore("user");
    if (!stored) return;
    const updated = {
      ...stored,
      currentOrgId: orgId == null || orgId === "" ? null : Number(orgId),
    };
    if (orgName) updated.currentOrgName = orgName;
    else if (orgId == null || orgId === "") updated.currentOrgName = null;
    Utils.setStore("user", updated);
    window.dispatchEvent(new CustomEvent("user-updated"));
  };

  static currentOrg = (user) => {
    const orgId = Utils.effectiveOrgId(user);
    if (!orgId) return null;
    const roleOrgs = Utils.getRoleOrgs(user);
    const match = roleOrgs.find((org) => Number(org.orgId) === Number(orgId));
    if (match) return match;
    const fromRole = (user?.orgRoles || []).find((r) => Number(r.orgId) === Number(orgId));
    if (fromRole) {
      return {
        orgId: Number(orgId),
        orgName: fromRole.orgName,
        logo: fromRole.logo,
        colorFamily: fromRole.colorFamily,
      };
    }
    const name = Utils.orgDisplayName(user, orgId);
    if (name) return { orgId: Number(orgId), orgName: name };
    return { orgId: Number(orgId), orgName: user.currentOrgName || null };
  };

  static isPendingUser = (user) =>
    (user?.orgRoles || []).some((r) => r.roleName === "Pending User");

  static isTripParticipantUser = (user) =>
    (user?.tripRoles || []).some((r) => r.roleName === "Trip Participant") ||
    (user?.orgRoles || []).some((r) => r.roleName === "Trip Participant");

  /** Browse/apply/update application — any signed-in non–system-admin user. */
  static canBrowseAndApplyToTrips = (user) =>
    !!user && !Utils.isSystemAdmin(user);

  static showParticipantOrPendingProfile = (user) => {
    if (!user || Utils.isSystemAdmin(user)) return false;
    const hasOrgAdmin = (user.orgRoles || []).some((r) => r.roleName === "Org Admin");
    if (hasOrgAdmin) return false;
    return Utils.isPendingUser(user) || Utils.isTripParticipantUser(user);
  };
}
