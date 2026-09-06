# API Reference

**Status:** living snapshot of Trips on `dev` (Features 1–11).  
**Mount:** `/trips` (`backend/server.js`).  
**Source of truth for new work:** `features/feature-*.md` — this file does **not** authorize scope.

## Conventions

| Topic | Rule |
|-------|------|
| Response shape | Flat JSON (no `{ success, data }` envelope) |
| Errors | `{ "message": "..." }` |
| Auth | `Authorization: Bearer <token>` on authenticated routes |
| Org scope | Optional `X-Acting-Organization-Id` — system admin list/emulate scope; may narrow multi-org lists for non-admins |
| Optimistic updates | Many PUT bodies include `version`; conflict → `409` |
| Static files | `/trips/images`, `/trips/uploads` |

**Auth legend:** **none** · **auth** (`authenticate`) · **sysadmin** (`authenticate` + `requireSystemAdmin`). Finer org/trip gates live in controllers (not repeated on every row).

---

## Feature provenance (endpoint groups)

| Prefix / area | Features |
|---------------|----------|
| Auth (`/login`, `/register`, …) | 1 |
| `/users`, `/roles`, `/people`, `/org-people-roles` | 2, **11** (all-orgs people list) |
| `/organizations` | 3 |
| `/document-types`, `/people/:id/documents` | 4 |
| `/trips` CRUD + image, `/dashboard/*` | 5 |
| `/worker-roles`, `/trip-worker-roles`, `/trip-travel-options` | 6 |
| `/medical-conditions` | 17 |
| `/trips/browse/*`, `/trip-people-roles`, participants CSV | 7 |
| `/donations`, `/donors`, donation/donor CSVs | 8 |
| `/public/*` | 9 |
| `/email-templates` | 10 |

---

## Auth — Feature 1

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/trips/login` | none | Sign in; session token |
| `POST` | `/trips/register` | none | Register user + person; optional `orgIds`; optional `subdomain` (Feature 15 — binds Trip Participant to matching org); optional `middleName` (Feature 20) |
| `GET` | `/trips/register/organizations` | none | Orgs for registration UI |
| `GET` | `/trips/register/organizations/by-subdomain/:subdomain` | none | Resolve `{ id, name, subdomain }` or `404` (Feature 15) |
| `POST` | `/trips/logout` | none | Invalidate session (token in body) |
| `POST` | `/trips/change-password` | auth | Change password |
| `POST` | `/trips/reset-password` | none | Dev reset; **403 in production** |
| `GET` | `/trips/me` | auth | Current user context |

---

## Users & roles — Feature 2

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/users` | sysadmin | List users |
| `POST` | `/trips/users` | sysadmin | Create user |
| `PUT` | `/trips/users/:id/link-person` | sysadmin | Link user ↔ person |
| `GET` | `/trips/roles` | auth | Role catalog |

---

## People & org membership — Features 2, 11

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/people` | auth | List people. **Feature 11:** system admin with **no** acting-org header returns **all** persons; with acting org → membership in that org; Org Admin / Trip Leader → Feature 2 scoping |
| `GET` | `/trips/people/org-trip-leaders` | auth | People with Trip Leader org role for `?orgId=` |
| `GET` | `/trips/people/:id` | auth | Person detail |
| `POST` | `/trips/people` | auth | Create person (+ optional org/role) |
| `PUT` | `/trips/people/:id` | auth | Update person (`version`) |
| `PUT` | `/trips/people/:id/picture` | auth | Upload picture (`multipart` field `picture`) |
| `DELETE` | `/trips/people/:id` | sysadmin | Delete person |
| `GET` | `/trips/org-people-roles` | auth | List org memberships |
| `POST` | `/trips/org-people-roles` | auth | Assign org role |
| `PUT` | `/trips/org-people-roles/:id` | auth | Update membership |
| `DELETE` | `/trips/org-people-roles/:id` | auth | Remove membership |

Optional query: `GET /trips/people?tripId=` intersects with trip assignments.

---

## Organizations — Feature 3

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/organizations` | auth | List (scoped) |
| `GET` | `/trips/organizations/:id` | auth | Detail |
| `POST` | `/trips/organizations` | sysadmin | Create |
| `PUT` | `/trips/organizations/:id` | auth | Update (org admin / sysadmin) |
| `PUT` | `/trips/organizations/:id/logo` | auth | Logo (`multipart` field `logo`) |
| `GET` | `/trips/organizations/:id/agreement` | auth | Agreement markdown |
| `PUT` | `/trips/organizations/:id/agreement` | auth | Save agreement `{ content }` |
| `GET` | `/trips/organizations/:id/medical-agreement` | auth | Medical agreement markdown |
| `PUT` | `/trips/organizations/:id/medical-agreement` | auth | Save medical agreement `{ content }` |
| `DELETE` | `/trips/organizations/:id` | sysadmin | Delete |

---

## Document types & person documents — Features 4, 22, 24

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/document-types` | auth | Catalog (any auth user); includes `documentNumberRequired`, `instructions`; `type` may be `medical_licence`, `passport`, `certification`, or `diploma` |
| `GET` | `/trips/document-types/:id` | auth | Get (sysadmin gate in controller) |
| `POST` | `/trips/document-types` | auth | Create (sysadmin); optional `documentNumberRequired`, `instructions`; `type` includes `diploma` (Feature 24) |
| `PUT` | `/trips/document-types/:id` | auth | Update (sysadmin) |
| `DELETE` | `/trips/document-types/:id` | auth | Delete (sysadmin) |
| `GET` | `/trips/people/:id/documents` | auth | List |
| `POST` | `/trips/people/:id/documents` | auth | Upload (`multipart` field `document`); optional `documentNumber` (required when type says so) |
| `PUT` | `/trips/people/:id/documents/:documentId` | auth | Update/replace |
| `DELETE` | `/trips/people/:id/documents/:documentId` | auth | Delete |
| `GET` | `/trips/people/:id/documents/:documentId/view` | auth | Inline view |
| `GET` | `/trips/people/:id/documents/:documentId/download` | auth | Download |

---

## Trips (catalog) — Feature 5

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/trips` | auth | Scoped list + aggregates |
| `GET` | `/trips/trips/:id` | auth | Detail if `canAccessTrip` |
| `POST` | `/trips/trips` | auth | Create (+ optional `leaderPeopleIds`, `requirePassport`) |
| `POST` | `/trips/trips/:id/copy` | auth | Copy source trip → new trip (name required; leaders, worker roles, travel options, `requirePassport`; not participants/donations) — Features 21, 23 |
| `PUT` | `/trips/trips/:id` | auth | Update |
| `PUT` | `/trips/trips/:id/image` | auth | Image (`multipart` field `image`) |
| `DELETE` | `/trips/trips/:id` | auth | Delete (org admin / sysadmin) |
| `GET` | `/trips/dashboard/org` | auth | Org metrics |
| `GET` | `/trips/dashboard/trip` | auth | Trip metrics |
| `GET` | `/trips/dashboard/participant` | auth | Participant donation totals |

---

## Worker roles & travel options — Features 6, 25

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/worker-roles` | auth | Org worker-role catalog (`?orgId=`); includes `requiredDocumentTypes` / `requiredDocumentTypeIds` (Feature 25) |
| `GET` | `/trips/worker-roles/:id` | auth | Get |
| `POST` | `/trips/worker-roles` | auth | Create (org admin); `requiredDocumentTypeIds?: number[]` (Feature 25) |
| `PUT` | `/trips/worker-roles/:id` | auth | Update; replace required document list when `requiredDocumentTypeIds` sent |
| `DELETE` | `/trips/worker-roles/:id` | auth | Delete |
| `GET` | `/trips/trip-worker-roles` | auth | Needs for `?tripId=` |
| `POST` | `/trips/trip-worker-roles` | auth | Add role quantity |
| `PUT` | `/trips/trip-worker-roles/:id` | auth | Update quantity |
| `DELETE` | `/trips/trip-worker-roles/:id` | auth | Remove |
| `GET` | `/trips/trip-travel-options` | auth | Options for `?tripId=` |
| `POST` | `/trips/trip-travel-options` | auth | Create |
| `PUT` | `/trips/trip-travel-options/:id` | auth | Update |
| `DELETE` | `/trips/trip-travel-options/:id` | auth | Delete |

---

## Medical conditions — Feature 17

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/medical-conditions` | auth | Org catalog (`?orgId=`) — org members may read |
| `GET` | `/trips/medical-conditions/:id` | auth | Get one |
| `POST` | `/trips/medical-conditions` | auth | Create (org admin) — `name` ≤ 50, unique per org (CI) |
| `PUT` | `/trips/medical-conditions/:id` | auth | Update name |
| `DELETE` | `/trips/medical-conditions/:id` | auth | Delete (cascades person selections) |
| `GET` | `/trips/people/:id` | auth | Includes `medicalConditions` / `medicalConditionIds` (`?orgId=` filters) |
| `PUT` | `/trips/people/:id` | auth | Accepts `medicalConditionIds` + `orgId`; clears org links when `takesMedication` is false |

---

## Applications & participants — Feature 7

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/trips/browse/orgs` | auth | Browse orgs |
| `GET` | `/trips/trips/browse/mine` | auth | My trips |
| `GET` | `/trips/trips/browse` | auth | Active trips (`?orgId=`) |
| `GET` | `/trips/trips/browse/:id` | auth | Browse detail + roles/agreements/options |
| `POST` | `/trips/trips/browse/:id/apply` | auth | Apply (incl. medical agreement acceptance; `isPregnant` / `pregnancyDueDate` on assignment) |
| `GET` | `/trips/trips/browse/:id/application` | auth | Own application |
| `PUT` | `/trips/trips/browse/:id/application` | auth | Update application (incl. pregnancy fields) |
| `GET` | `/trips/trip-people-roles` | auth | Roster (`?tripId=`) |
| `GET` | `/trips/trip-people-roles/:id` | auth | One assignment |
| `POST` | `/trips/trip-people-roles` | auth | Staff add participant |
| `PUT` | `/trips/trip-people-roles/:id` | auth | Update / approve / decline / cancel |
| `DELETE` | `/trips/trip-people-roles/:id` | auth | Delete |
| `GET` | `/trips/export/trips/:tripId/participants.csv` | auth | Participants CSV |

Browse/apply UI is blocked for system admins (router); see `behavior.md`.

---

## Donors & donations — Feature 8

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/donations` | auth | List (`?tripId=` required); participants see own rows only |
| `POST` | `/trips/donations` | auth | Staff create (nested `donor` / `donorId`) |
| `PUT` | `/trips/donations/:id` | auth | Update |
| `DELETE` | `/trips/donations/:id` | auth | Delete |
| `GET` | `/trips/donors/lookup` | auth | Lookup `?email=` |
| `GET` | `/trips/donors` | auth | List donors |
| `POST` | `/trips/donors` | auth | Create donor |
| `PUT` | `/trips/donors/:id` | auth | Update donor |
| `GET` | `/trips/export/trips/:tripId/donors.csv` | auth | Donors CSV |
| `GET` | `/trips/export/trips/:tripId/donations.csv` | auth | Donations CSV |

---

## Public fundraising — Feature 9

No auth. Slugs: spaces → `_`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/public/orgs/by-name/:orgSlug` | none | Org + open active trips |
| `GET` | `/trips/public/trips/:tripId` | none | Trip + approved participants |
| `GET` | `/trips/public/trips/by-name/:tripSlug` | none | Trip by slug |
| `GET` | `/trips/public/trips/by-name/:tripSlug/overview` | none | Overview + roles needed |
| `GET` | `/trips/public/trips/:tripId/participants/:personId` | none | Participant donate data |
| `GET` | `/trips/public/trips/by-name/:tripSlug/participants/:personSlug` | none | Same by slug |
| `POST` | `/trips/public/donations` | none | Public donation (`tripId`, `amount`, `donor`, optional `personId`) |

---

## Email templates — Feature 10

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/email-templates` | auth | List (org / trip-leader scoped) |
| `GET` | `/trips/email-templates/copy-sources` | auth | Copy sources (`?tripId=` optional) |
| `GET` | `/trips/email-templates/:id` | auth | Get |
| `POST` | `/trips/email-templates` | auth | Create |
| `PUT` | `/trips/email-templates/:id` | auth | Update |
| `DELETE` | `/trips/email-templates/:id` | auth | Delete |

---

## Models without dedicated routes

| Model | How accessed |
|-------|----------------|
| `tripPeopleRoleOption` | Nested via browse apply / TPR application payloads |
| `emailLog` | Written by auth/login paths; no CRUD API |

Deep payload/Gherkin detail remains in each `features/feature-N-*.md`.
