# ADR-0002: Layered security and org/trip RBAC

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** Trips project (reverse-documented from imported Mission Trips codebase)

## Context

[ADR-0001](./0001-client-server-multi-org-architecture.md) establishes the client–server split. Trips is not a single-tenant personal data app: access depends on **system admin**, **organization roles**, and **approved trip roles**, plus an optional **acting organization** scope for admins.

Threats relevant to this app:

- User A reading another org’s people, trips, or agreements.
- Applicants mutating another person’s application.
- Stolen tokens after logout or expiry.
- Client tampering (`orgId` / `peopleId` on writes, ID enumeration).
- Treating router guards as security.

## Decision

Adopt a **layered security model** with the **API as the sole enforcement point** and **role-based access** centered in `backend/app/authorization/accessControl.js`.

### Trust boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (untrusted)                                        │
│  • localStorage session hint + org switcher / emulate       │
│  • Router guards + form validation (UX only)                │
└──────────────────────────┬──────────────────────────────────┘
                           │ Bearer + optional X-Acting-Organization-Id
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Express API (trusted enforcement)                          │
│  1. authenticate → Session + User + Person + org/trip roles │
│  2. Controller validation → 400                             │
│  3. accessControl helpers → org/trip/system gates           │
│  4. Never return password hashes                            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
│  MySQL — users, sessions, orgPeopleRole, tripPeopleRole, …  │
```

### Layer 1 — Authentication

| Control | Implementation |
|---------|----------------|
| Credentials | **Email** + password; email normalized |
| Password storage | bcrypt; min length 8; excluded from User defaultScope |
| Session | JWT value stored in `sessions` with `expirationDate` |
| Lifetime | **4 hours** (`auth.config.js` `sessionHours`) |
| Request proof | `Authorization: Bearer <token>` |
| Logout | Clear token on Session row |
| Payload | `userId`, `personId`, `isAdmin`, `orgRoles[]`, `tripRoles[]` (approved only) |

### Layer 2 — Authorization (who may do what?)

| Principal | Mechanism |
|-----------|-----------|
| **System admin** | `user.isAdmin === true`; may use `X-Acting-Organization-Id` to emulate one org on lists |
| **Org Admin** | `orgPeopleRole` + role name `Org Admin` |
| **Trip Leader / Participant** | `tripPeopleRole` with status **`approved`** and matching role name |
| **Pending User / Trip Participant (org)** | Org-level roles for membership and apply eligibility |

Central helpers (non-exhaustive): `authenticate`, `requireSystemAdmin`, `canAccessOrg`, `isOrgAdminForOrg`, `canAccessTrip`, `orgListFilter`, `tripListFilter`, `peopleListOrgIds`.

**Rules:**

1. Controllers call shared helpers — do not invent ad-hoc org checks per route.
2. Trip privileges for “leader/participant of this trip” require **approved** assignments.
3. System admins are excluded from browse/apply UI routes (`canBrowseAndApplyToTrips`) even though they can manage trips via admin APIs.
4. Public endpoints are a separate surface ([ADR-0004](./0004-public-and-authenticated-surfaces.md)).

### Layer 3 — Client hardening (UX only)

| Control | Purpose |
|---------|---------|
| `router.beforeEach` | Redirect unauthenticated / wrong-role users |
| MenuBar org switcher / emulate | Sets acting org for header |
| axios interceptors | Attach Bearer + acting org; clear session on unauthorized |
| Form rules | Block bad submits before network |

### Layer 4 — Secrets

| Secret | Location |
|--------|----------|
| `AUTH_SECRET`, DB_* | `backend/.env` (not committed) |
| `reset-password` | Disabled when `NODE_ENV === "production"` |

### Explicitly out of scope (current codebase)

| Control | Status |
|---------|--------|
| Rate limiting / lockout | Not implemented |
| OAuth / SSO | Not implemented |
| CSRF tokens | Not required for Bearer SPA (no cookie session) |
| Field-level encryption at rest | Not implemented |

## Consequences

### Positive

- One place to audit access (`accessControl.js`).
- Matches real multi-org operations (admin, leader, participant).
- Revocable sessions; acting-org header supports system-admin support workflows.
- Feature specs 1–10 can cite the same role names and gates.

### Negative / tradeoffs

- Bearer in `localStorage` is XSS-sensitive.
- Role matrix is harder to teach than Todo’s per-user `userId`.
- List endpoints sometimes return empty when multi-org users have not selected an acting org (by design of `peopleListOrgIds`).
- No rate limiting on login in the imported code.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Per-user `userId` only (Todo model)** | Does not model orgs, trip leaders, or shared rosters. |
| **Frontend-only role checks** | Bypassable via curl. |
| **JWT only** | Weak logout/revocation. |
| **Cookie session + CSRF** | Heavier SPA CORS story; not what the code implements. |
| **403 for every deny** | Mix of 401/403/404 exists; keep consistent with each controller’s current contract when evolving. |

## Related artifacts

- ADRs: [ADR-0001](./0001-client-server-multi-org-architecture.md), [ADR-0004](./0004-public-and-authenticated-surfaces.md), [ADR-0005](./0005-optimistic-concurrency.md)
- Features: [Feature 1](../../features/feature-1-user-authentication.md), [Feature 2](../../features/feature-2-people-and-org-membership.md), [Feature 7](../../features/feature-7-trip-applications-and-participants.md)
- Implementation: `backend/app/authorization/accessControl.js`, `backend/app/controllers/auth.controller.js`
- Reference: [behavior.md](../../features/reference/behavior.md)
- Cursor rules: `security.mdc`, `auth-patterns.mdc` (update when Trips-specific wording is adopted)
