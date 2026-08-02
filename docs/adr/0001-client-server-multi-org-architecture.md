# ADR-0001: Client–server architecture for multi-organization Trips

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** Trips project (reverse-documented from imported Mission Trips codebase)

## Context

**Trips** is a multi-organization mission-trip platform: organizations sponsor trips; people hold org and trip roles; staff manage rosters and donations; the public can view trips and donate without signing in. The product must keep a single shared database while enforcing org/trip boundaries on the server.

We needed to decide:

1. Whether the browser holds authoritative state or only talks to a shared API.
2. How the SPA and API are packaged and mounted.
3. How identity on each request reaches authorization helpers for Features 1–10.

A localStorage-only or static-site design cannot enforce roster privacy, donation integrity, or role-based access across organizations.

## Decision

Adopt a **classic client–server split** with a **REST JSON API** and **server-enforced** identity and authorization:

| Layer | Choice |
|-------|--------|
| **Client** | Vue 3 SPA (Vite), Vuetify, vue-router, axios |
| **Server** | Node.js + Express + Sequelize (ES modules) |
| **Database** | MySQL — shared DB; rows scoped by org/trip/person rules ([ADR-0002](./0002-layered-security-and-rbac.md), [ADR-0003](./0003-mysql-relational-database.md)) |
| **Transport** | JSON over HTTP(S); API mount **`/trips`** |
| **Auth** | Email + password; bcrypt; **JWT + Session table** (revocable) |
| **Client session hint** | Login payload in `localStorage` key `user`; axios sends `Authorization: Bearer <token>` and optional `X-Acting-Organization-Id` |
| **Repo layout** | Monorepo: `frontend/` + `backend/` + `features/` specs |

```text
Browser (Vue SPA)                     Express API (/trips)              MySQL
─────────────────                     ────────────────────              ─────
localStorage["user"]  ──Bearer──►    authenticate + accessControl  ──► users, sessions
router guards (UX)                    controllers                       person, org*, trip*
public donate/apply pages             /public/* (no auth)               donors, donations
```

**Invariants:**

1. The server is the **source of truth** for people, orgs, trips, applications, and donations.
2. Every authenticated request resolves to a user (and loaded person/org/trip roles) via a valid Session row.
3. The client never supplies a trusted identity id for ownership — the server derives access from session + role tables.
4. Public fundraising endpoints are an explicit unauthenticated surface ([ADR-0004](./0004-public-and-authenticated-surfaces.md)), not a bypass of staff APIs.

## Consequences

### Positive

- Clear SDD layers: feature specs → API → implementation → tests.
- Same stack as Speckit (Vue + Express + MySQL) so Cursor rules and tooling apply.
- Session revocation on logout without a separate token blacklist service.
- Dual UX (staff app + public pages) shares one API process and database.

### Negative / tradeoffs

- Requires MySQL + two dev ports (`8082` / `3200`) and CORS.
- `localStorage` is a UX cache, not authoritative — 401 clears it.
- Org/trip RBAC is more complex than per-user `userId` scoping (Todo example).

## Alternatives considered

| Option | Why not |
|--------|---------|
| **localStorage-only / offline-first** | Cannot enforce multi-org privacy or shared donation totals. |
| **JWT only (no Session table)** | Harder to revoke on logout. |
| **GraphQL / tRPC** | Heavier; REST + flat JSON matches Speckit rules and Agility export. |
| **Separate public microservice** | Unnecessary for current scale; one Express app already mounts `/public`. |
| **SSR Vue** | Out of scope; Vite SPA matches Speckit shell. |

## Related artifacts

- ADRs: [ADR-0002](./0002-layered-security-and-rbac.md), [ADR-0003](./0003-mysql-relational-database.md), [ADR-0004](./0004-public-and-authenticated-surfaces.md)
- Features: [Feature 1](../../features/feature-1-user-authentication.md) … [Feature 10](../../features/feature-10-email-templates.md)
- Cursor rules: `constitution.mdc`, `project-structure.mdc`, `api-conventions.mdc`, `frontend-services.mdc`
- Implementation: `backend/server.js`, `frontend/src/services/services.js`
