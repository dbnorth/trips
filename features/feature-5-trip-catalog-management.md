# Feature: Trip Catalog Management

**Feature ID:** 5
**Branch pattern:** `feature/5-trip-catalog-management`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — trip CRUD, image, leaders, org/trip dashboards for staff
**Depends on:** [Feature 3 — Organizations & Agreements](feature-3-organizations-and-agreements.md), [Feature 2](feature-2-people-and-org-membership.md)

---

## User Stories

### US-5.1: Create and edit trips
**As an** Org Admin or System Admin  
**I want to** create and update trips for an organization  
**So that** destinations, dates, cost, and leaders are published for staffing

**Priority:** P1  
**Independent test:** `POST/PUT /trips/trips` with org scope  
**Acceptance scenarios:** see ### US-5.1

### US-5.2: View trip detail and list
**As** Org Admin, Trip Leader, or System Admin  
**I want to** list and open trips I can access  
**So that** I can manage staffing and see donation summaries

**Priority:** P1  
**Independent test:** `GET /trips/trips`, `GET /trips/trips/:id` via `canAccessTrip`  
**Acceptance scenarios:** see ### US-5.2

### US-5.3: Upload trip image and assign leaders
**As an** Org Admin  
**I want to** set a trip image and Trip Leader people  
**So that** marketing and leadership are correct

**Priority:** P1  
**Independent test:** image upload + leaderPeopleIds on create/update  
**Acceptance scenarios:** see ### US-5.3

---

## Requirements

### Functional Requirements

- **FR-001**: Trip MUST include `orgId`, `status` (`active`|`completed`|`inactive`), `name`, location fields, `description`, `startDate`, `endDate`, `image`, social fields, `participantCost`, `version`.
- **FR-002**: Create/delete trip MUST require Org Admin for that org or System Admin.
- **FR-003**: Update trip MUST allow Org Admin, approved Trip Leader for that trip, or System Admin.
- **FR-004**: List/detail MUST respect `tripListFilter` / `canAccessTrip`.
- **FR-005**: Trip leaders MUST be represented as Trip Leader `tripPeopleRole` assignments (`tripLeaders.js`).
- **FR-006**: Trip image upload via multipart `PUT /trips/trips/:id/image`.
- **FR-007**: Home/TripView MAY show dashboard aggregates from `/trips/dashboard/org` and `/trips/dashboard/trip`.

---

## Assumptions

- Worker roles / travel options on a trip are Feature 6.
- Applications and participant status workflows are Feature 7.

## Edge Cases

- Accessing another org's trip without role → denied/`404` style scoping.
- Optimistic version conflict on update.

## Success Criteria

- **SC-001**: Org Admin creates active trip with cost and leaders.
- **SC-002**: Trip Leader can open trip detail for led trips.
- **SC-003**: Automated tests for scenarios (backfill).

---

## Data Ownership & Isolation

- Trips belong to one Organization.
- Access via org admin, approved trip leader/participant, or system admin (acting org for lists).

---

## Key Entities

- **Trip**: scheduled mission/event under an Organization
- **TripPeopleRole** (leader subset): leadership assignment

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/trips` | Yes | Scoped list + aggregates |
| `GET` | `/trips/trips/:id` | Yes | Detail if `canAccessTrip` |
| `POST` | `/trips/trips` | Yes | Create (+ optional leaders) |
| `PUT` | `/trips/trips/:id` | Yes | Update |
| `PUT` | `/trips/trips/:id/image` | Yes | Image |
| `DELETE` | `/trips/trips/:id` | Yes | Delete |
| `GET` | `/trips/dashboard/org` | Yes | Org metrics |
| `GET` | `/trips/dashboard/trip` | Yes | Trip metrics |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/trips` | `TripsList.vue` |
| `/trips/:tripId` | `TripView.vue` |
| Dialogs | `AddTripDialog`, `EditTripDialog` |
| `/home` | Org Admin trip table; trip leader shortcuts |

---

## Data Model Requirements

### `trip`
Columns per FR-001; `belongsTo` organization; `hasMany` tripPeopleRole, donations, templates, tripWorkerRole, tripTravelOption.

---

## Acceptance Criteria (Gherkin)

### US-5.1 — Create and edit trips

#### Scenario: Org Admin creates an active trip
* **Given** I am Org Admin for org A
* **When** I create a trip with name, dates, and participantCost
* **Then** the trip is stored with `orgId` A and status `active`

#### Scenario: Non-admin participant cannot create a trip
* **Given** I only have Trip Participant org role
* **When** I POST a trip
* **Then** the API denies the request

### US-5.2 — View trip detail and list

#### Scenario: Trip Leader opens trip detail
* **Given** I am an approved Trip Leader on trip T
* **When** I GET `/trips/trips/:id` for T
* **Then** the API returns `200` with trip data

### US-5.3 — Upload trip image and assign leaders

#### Scenario: Org Admin assigns leaders on create
* **Given** people exist with Trip Leader org eligibility
* **When** I create a trip with `leaderPeopleIds`
* **Then** TripPeopleRole leader rows exist for those people

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-5.1 | Org Admin creates an active trip | `backend/tests/trips.test.js` | `Org Admin creates an active trip` |
| US-5.1 | Non-admin participant cannot create a trip | `backend/tests/trips.test.js` | `Non-admin participant cannot create a trip` |
| US-5.2 | Trip Leader opens trip detail | `backend/tests/trips.test.js` | `Trip Leader opens trip detail` |
| US-5.3 | Org Admin assigns leaders on create | `backend/tests/trips.test.js` | `Org Admin assigns leaders on create` |

---

## Agent implementation request

```text
Implement Feature 5 from @features/feature-5-trip-catalog-management.md on branch `feature/5-trip-catalog-management`.

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

- Browse/apply APIs — Feature 7
- Public trip pages — Feature 9
- Travel options & worker role quantities — Feature 6
