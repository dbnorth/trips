# API Reference

**Status:** baseline from imported Trips code (Features 1–10).  
API mount path: `/trips` (see `backend/server.js`).

## Conventions

- Flat JSON responses (no `{ success, data }` envelope).
- Errors: `{ "message": "..." }`.
- Authenticated routes: `Authorization: Bearer <token>`.
- Optional org scope header: `X-Acting-Organization-Id` (system admin emulate / multi-org).

## Endpoint groups (summary)

| Prefix | Feature | Notes |
|--------|---------|-------|
| `/trips/login`, `/register`, `/logout`, `/me`, `/change-password`, `/reset-password` | 1 | Auth & sessions |
| `/trips/users`, `/trips/roles` | 2 | System users + role catalog |
| `/trips/people`, `/trips/org-people-roles` | 2, 11 | People & org membership; Feature 11: system admin with no acting-org header lists **all** persons |
| `/trips/organizations` (+ logo, agreement) | 3 | Organizations |
| `/trips/document-types`, `/trips/people/:id/documents` | 4 | Documents |
| `/trips/trips` (CRUD + image), `/trips/dashboard/*` | 5 | Trip catalog |
| `/trips/worker-roles`, `/trip-worker-roles`, `/trip-travel-options` | 6 | Staffing & options |
| `/trips/trips/browse/*`, `/trip-people-roles`, export participants | 7 | Applications & roster |
| `/trips/donations`, `/donors`, export donors/donations | 8 | Staff donations |
| `/trips/public/*` | 9 | Public pages & public donations |
| `/trips/email-templates` | 10 | Templates |

Static: `/trips/images`, `/trips/uploads`.

Per-endpoint detail lives in each `features/feature-N-*.md` **API Requirements** section — expand this file as you evolve the product.
