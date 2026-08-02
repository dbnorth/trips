# Feature: People Directory Includes All Persons for System Admin

**Feature ID:** 11
**Branch pattern:** `feature/11-people-list-all-orgs-includes-admin`
**Status:** Ready
**Created:** 2026-08-02
**Input:** Defect — as a system admin with **All organizations** selected on People, the admin does not see their own person row
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-11.1: See myself (and all persons) when listing all orgs
**As a** System Admin  
**I want** the People directory with **All organizations** selected to include every person — including me even if I have no org membership  
**So that** I can find and edit profiles that are not tied to an organization role

**Priority:** P1  
**Independent test:** System admin `GET /trips/people` with no acting-org header returns the admin’s person  
**Acceptance scenarios:** see ### US-11.1

---

## Requirements

### Functional Requirements

- **FR-001**: When a System Admin lists people with **no** organization scope (acting org unset / “All organizations”), `GET /trips/people` MUST return **all** `Person` rows, not only people who have at least one `orgPeopleRole`.
- **FR-002**: That unscoped System Admin list MUST include the caller’s own person when the account is linked to a `Person` (e.g. seeded `admin@missiontrips.local`), even if that person has zero org memberships.
- **FR-003**: When a System Admin scopes the list to a single organization (`X-Acting-Organization-Id` / menu acting org), existing Feature 2 behavior MUST remain: only people with membership in that org (plus any Feature 2 trip filter rules) appear.
- **FR-004**: Non–system-admin Org Admin / Trip Leader people-list scoping MUST remain unchanged from Feature 2.

---

## Assumptions

- Root cause: `person.controller` `findAll` builds the candidate set only from `OrgPeopleRole` even when `peopleListOrgIds` is `"all"`, so people (including system admins) without org links are omitted.
- System admin accounts created by `npm run seed` typically have a `User` + `Person` and no `orgPeopleRole`.
- UI already supports All organizations via MenuBar acting-org = empty; no new screen is required beyond correct API results.

## Edge Cases

- System admin with no linked `Person` still cannot appear as a row (nothing to show); out of scope to auto-create a person here.
- Trip filter (`?tripId=`) on an all-orgs list MUST still restrict to people on that trip **after** the full person set is considered (intersection with trip assignments), without reintroducing “org membership only” as the sole source of candidates when unscoped.
- Empty database (no people) → empty list remains valid.

## Success Criteria

- **SC-001**: System admin with All organizations selected sees their own person on `/people`.
- **SC-002**: Unscoped system-admin `GET /trips/people` includes people who have no org membership.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- System Admin unscoped list is intentionally global (all persons).
- Single-org acting scope remains org-membership filtered as in Feature 2.
- Non-admins never receive the global all-persons list via this delta.

---

## Key Entities

- **Person** — directory row (unchanged schema)
- **OrgPeopleRole** — still used for single-org scoping; no longer the sole source when scope is `"all"`

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/people` | System admin, no `X-Acting-Organization-Id` | Return all persons (ordered as today). Must include caller’s person when linked. |
| `GET` | `/trips/people` | System admin + acting org header | Unchanged — membership in that org only |
| `GET` | `/trips/people?tripId=` | System admin, unscoped | Candidates are all persons (or trip members intersected correctly); must not drop non-org people solely because they lack `orgPeopleRole` before trip filter |

No new endpoints. No payload shape change.

---

## Screen Requirements

| Route | View | Change |
|-------|------|--------|
| `/people` | `PeopleList.vue` | No UX redesign required. With All organizations selected, the loaded list MUST include the signed-in system admin’s person when linked. |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-11.1 — See myself (and all persons) when listing all orgs

#### Scenario: System admin sees self with all organizations selected
* **Given** I am a system admin with a linked person and no org memberships
* **And** my acting organization is unset (All organizations)
* **When** I `GET /trips/people`
* **Then** the response includes my person id

#### Scenario: System admin all-orgs list includes person without org role
* **Given** I am a system admin
* **And** a person P exists with no `orgPeopleRole` rows
* **And** my acting organization is unset
* **When** I `GET /trips/people`
* **Then** person P appears in the response

#### Scenario: System admin single-org scope still filters by membership
* **Given** I am a system admin
* **And** person P has membership only in org B
* **When** I `GET /trips/people` with acting organization A
* **Then** person P does not appear in the response

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-11.1 | System admin sees self with all organizations selected | `backend/tests/people.test.js` | `System admin sees self with all organizations selected` |
| US-11.1 | System admin all-orgs list includes person without org role | `backend/tests/people.test.js` | `System admin all-orgs list includes person without org role` |
| US-11.1 | System admin single-org scope still filters by membership | `backend/tests/people.test.js` | `System admin single-org scope still filters by membership` |

---

## Agent implementation request

```text
Implement Feature 11 from @features/feature-11-people-list-all-orgs-includes-admin.md on branch `feature/11-people-list-all-orgs-includes-admin`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md and/or @features/reference/behavior.md in the same PR when list semantics change.
Do not implement behavior not in this spec.
Do not change Org Admin / Trip Leader scoping (FR-004).
```

**Reference updates:** `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Backend (and UI if needed) per this spec (**FR-00N**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [x] Living reference updated for the all-orgs people-list rule

## Out of Scope

- Changing Org Admin multi-org / single-org people list rules — Feature 2
- Auto-creating a Person for system admins who have none
- Users list (`GET /trips/users`) behavior — Feature 2 US-2.4
- Frontend-only workarounds that hide the API gap
