# Feature: People & Org Membership

**Feature ID:** 2
**Branch pattern:** `feature/2-people-and-org-membership`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — people profiles, org role assignments, system-admin user/person linking, role catalog
**Depends on:** [Feature 1 — User Authentication & Sessions](feature-1-user-authentication.md)

---

## User Stories

### US-2.1: Manage people directory
**As an** Org Admin or System Admin  
**I want to** list, add, and edit people in my organization scope  
**So that** staff and participants have accurate profiles

**Priority:** P1  
**Independent test:** Authenticated `GET/POST/PUT /trips/people` within org scope  
**Acceptance scenarios:** see ### US-2.1

### US-2.2: Complete and update my profile
**As a** signed-in person  
**I want to** edit my profile fields and picture  
**So that** I can apply to trips with a complete profile

**Priority:** P1  
**Independent test:** `PUT /trips/people/:id` for self; picture upload  
**Acceptance scenarios:** see ### US-2.2

### US-2.3: Assign organization roles
**As an** Org Admin or System Admin  
**I want to** assign Org Admin / Trip Leader / Trip Participant / Pending User roles to people  
**So that** access matches their responsibilities

**Priority:** P1  
**Independent test:** CRUD `/trips/org-people-roles`  
**Acceptance scenarios:** see ### US-2.3

### US-2.4: System admin user utilities
**As a** System Admin  
**I want to** list users and link a user to a person  
**So that** accounts and profiles stay connected

**Priority:** P2  
**Independent test:** `/trips/users` requires `isAdmin`  
**Acceptance scenarios:** see ### US-2.4

---

## Requirements

### Functional Requirements

- **FR-001**: People lists MUST be scoped via `peopleListOrgIds` (acting org header for system admins).
- **FR-002**: Person profile MUST support address, phone (`phoneContryCode`, `phoneNumber`), `birthDate`, `gender` (`male`|`female`), emergency contact, allergies, church home, `picture`, `bioText`, and optimistic `version`.
- **FR-003**: Profile completeness for applications MUST match `isProfileComplete` required fields (Feature 7).
- **FR-004**: Self, Org Admin for person's orgs, or System Admin MAY read/update a person; others MUST be denied.
- **FR-005**: Picture upload MUST accept image via multipart (`PUT /people/:id/picture`, ≤2MB).
- **FR-006**: OrgPeopleRole MUST link `orgId`, `peopleId`, `roleId` with catalog roles from `role`.
- **FR-007**: `GET /trips/roles` MUST list the role catalog for authenticated users.
- **FR-008**: `GET /trips/people/org-trip-leaders?orgId=` MUST return people eligible as trip leaders for that org.
- **FR-009**: Person delete MUST require System Admin.
- **FR-010**: System Admin MUST manage `/trips/users` (list, create, link-person).

---

## Assumptions

- Feature 1 auth is available; MenuBar org switcher / emulate org sets acting org context.
- Document uploads are Feature 4.

## Edge Cases

- Stale `version` on person update → conflict handling via optimistic update helper.
- Creating person with optional password creates linked user when provided.
- Cross-org edit by non-admin → denied.

## Success Criteria

- **SC-001**: Org Admin can add a person and assign Trip Participant in their org.
- **SC-002**: User can complete profile fields required by `isProfileComplete`.
- **SC-003**: Gherkin scenarios have automated tests (backfill).

---

## Data Ownership & Isolation

- People visibility is org-scoped (plus self and system admin).
- Org role mutations require Org Admin for that org or System Admin.

---

## Key Entities

- **Person**: profile + optional User link
- **Role**: catalog (`Org Admin`, `Trip Leader`, `Trip Participant`, `Pending User`)
- **OrgPeopleRole**: membership of a person in an organization with a role
- **User**: system admin utilities and optional link

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/people` | Yes | Org-scoped list; optional `?tripId` |
| `GET` | `/trips/people/org-trip-leaders` | Yes | Leader candidates |
| `GET/POST` | `/trips/people`, `/trips/people/:id` | Yes | Read/create |
| `PUT` | `/trips/people/:id` | Yes | Update (versioned) |
| `PUT` | `/trips/people/:id/picture` | Yes | Picture upload |
| `DELETE` | `/trips/people/:id` | Yes + system admin | Delete |
| `GET/POST/PUT/DELETE` | `/trips/org-people-roles` | Yes | Membership CRUD |
| `GET` | `/trips/roles` | Yes | Role catalog |
| `GET/POST` | `/trips/users` | System admin | User admin |
| `PUT` | `/trips/users/:id/link-person` | System admin | Link person |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/people` | `PeopleList.vue` — filter, AddPersonDialog, EditPersonDialog |
| `/home` | Profile completeness warning; EditPersonDialog |
| MenuBar | Profile → EditPersonDialog; org switcher / emulate |

---

## Data Model Requirements

### `person` — key columns
`id`, `userId`, `firstName`, `lastName`, `email`, `addLine1`, `addLine2`, `city`, `country`, `state_prov`, `postalCode`, `phoneContryCode`, `phoneNumber`, `birthDate`, `gender`, emergency contact fields, `hasAllergies`, `allergiesDescription`, `takesMedication`, church home fields, `picture`, `bioText`, `version`

### `role` — `roleName` unique, `roleDescription`
### `orgPeopleRole` — `orgId`, `peopleId`, `roleId`, `version`

---

## Acceptance Criteria (Gherkin)

### US-2.1 — Manage people directory

#### Scenario: Org Admin lists people in scope
* **Given** I am an Org Admin for org A
* **When** I open People
* **Then** I see people associated with org A

#### Scenario: Org Admin creates a person
* **Given** I am an Org Admin
* **When** I submit Add Person with required name/email fields
* **Then** a Person row is created

### US-2.2 — Complete and update my profile

#### Scenario: User updates own profile
* **Given** I am signed in with a personId
* **When** I save profile fields including address and emergency contact
* **Then** `PUT /trips/people/:id` succeeds
* **And** subsequent reads show the new values

#### Scenario: User uploads a profile picture
* **Given** I am editing my person
* **When** I upload a valid image ≤2MB
* **Then** the picture is stored and returned on the person

### US-2.3 — Assign organization roles

#### Scenario: Assign Trip Leader org role
* **Given** I am an Org Admin for org A
* **When** I assign role Trip Leader to a person for org A
* **Then** an OrgPeopleRole exists
* **And** that person appears in org-trip-leaders for org A

### US-2.4 — System admin user utilities

#### Scenario: Non-admin cannot list users
* **Given** I am not a system admin
* **When** I call `GET /trips/users`
* **Then** the API returns `403` or equivalent deny

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-2.1 | Org Admin lists people in scope | `backend/tests/people.test.js` | `Org Admin lists people in scope` |
| US-2.1 | Org Admin creates a person | `backend/tests/people.test.js` | `Org Admin creates a person` |
| US-2.2 | User updates own profile | `backend/tests/people.test.js` | `User updates own profile` |
| US-2.2 | User uploads a profile picture | `backend/tests/people.test.js` | `User uploads a profile picture` |
| US-2.3 | Assign Trip Leader org role | `backend/tests/people.test.js` | `Assign Trip Leader org role` |
| US-2.4 | Non-admin cannot list users | `backend/tests/people.test.js` | `Non-admin cannot list users` |

---

## Agent implementation request

```text
Implement Feature 2 from @features/feature-2-people-and-org-membership.md on branch `feature/2-people-and-org-membership`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Implemented in imported codebase (**FR-00N**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [ ] Living reference updated when evolving this feature

## Out of Scope

- Person documents — Feature 4
- Trip participant assignments — Feature 7
- Organization CRUD — Feature 3
- System admin all-orgs people list including persons without org membership — [Feature 11](feature-11-people-list-all-orgs-includes-admin.md)
- Encrypting person pictures and documents at rest — [Feature 12](feature-12-encrypt-person-media.md)
