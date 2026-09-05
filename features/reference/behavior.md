# Behavior & Rules Reference

**Living snapshot** of **Trips** product rules currently in force (imported baseline).

These files answer: *"What rules does Trips enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, status machines, validation, UI rules |

## Core rules (baseline)

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Auth is email + password; sessions JWT + `sessions` table; TTL **4 hours** | `auth.controller.js`, `auth.config.js` | Feature 1 |
| Passwords bcrypt-hashed; never returned | User `defaultScope` | Feature 1 |
| System admin = `user.isAdmin` | `accessControl.js` | Features 1–10 |
| Org roles via `orgPeopleRole` + role names | `accessControl.js`, seed roles | Feature 2 |
| System admin People list with no acting org (“All organizations”) returns **all** persons, including those with no org membership | `person.controller` `findAll` | Feature 11 |
| Trip role privileges use **approved** `tripPeopleRole` only | `authenticate` loads `tripRoles` | Feature 7 |
| Acting org header `X-Acting-Organization-Id` scopes lists for system admins | Axios + accessControl | Features 2–5 |
| Person profile completeness gates applications | `isProfileComplete` | Features 2, 7 |
| Application status auto `incomplete`/`applied`; staff set `approved`/`declined`/`cancelled` | `tripParticipantApplicationStatus.js` | Feature 7 |
| Under-18 agreement requires adult signer fields | Application completeness helpers | Feature 7 |
| System admins cannot use browse/apply UI routes | `router.js` `canBrowseAndApplyToTrips` | Feature 7 |
| Public pages unauthenticated; slug spaces → `_` | `/public/*`, donate URLs | Feature 9 |
| Organization optional unique `subdomain`; create-account on `{subdomain}.…` hides org picker and registers into that org | `organizationSubdomain.js`, `auth.controller` register, Login/Apply create-account | Feature 15 |
| Empty address / person-document country list fields default to United States (`US`) on form init; existing non-empty values preserved; trip destination country does not default; phone dialing codes unchanged | `AddressFields.vue`, person-document form / `CountrySelect` `defaultEmptyToUs`, `US_COUNTRY_CODE` | Feature 16 |
| Optimistic concurrency via `version` on key entities | `optimisticUpdate.js` | Features 2–8 |

Expand rows as deltas ship.
