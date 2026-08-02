# Feature: Worker Roles & Travel Options

**Feature ID:** 6
**Branch pattern:** `feature/6-worker-roles-and-travel-options`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — org worker role catalog, per-trip staffing needs (quantities), trip travel/cost option sets
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 4](feature-4-document-types-and-person-documents.md)

---

## User Stories

### US-6.1: Manage organization worker roles
**As an** Org Admin  
**I want to** define worker roles (with optional license/document requirements)  
**So that** trips can request specific team roles

**Priority:** P1  
**Independent test:** CRUD `/trips/worker-roles`  
**Acceptance scenarios:** see ### US-6.1

### US-6.2: Set trip team role needs
**As an** Org Admin or Trip Leader  
**I want to** attach worker roles to a trip with quantities  
**So that** applicants pick a role and leaders see open needs

**Priority:** P1  
**Independent test:** CRUD `/trips/trip-worker-roles`  
**Acceptance scenarios:** see ### US-6.2

### US-6.3: Configure trip travel options
**As an** Org Admin or Trip Leader  
**I want to** define travel option sets with price adjustments  
**So that** applicants select one option per set and cost adjusts

**Priority:** P1  
**Independent test:** CRUD `/trips/trip-travel-options`  
**Acceptance scenarios:** see ### US-6.3

---

## Requirements

### Functional Requirements

- **FR-001**: WorkerRole MUST include `orgId`, `name`, `description`, `licenseRequired`, optional `documentTypeId`, `status` (`active`|`inactive`).
- **FR-002**: Org Admin MUST manage worker roles for their org; list is org-scoped.
- **FR-003**: TripWorkerRole MUST link `tripId`, `workerRoleId`, `quantity`.
- **FR-004**: TripTravelOption MUST include `tripId`, `description`, `priceAdjustment`, `setNumber` (one selection per set on applications — Feature 7).
- **FR-005**: Manage trip worker roles and travel options MUST allow Org Admin, Trip Leader for that trip, or System Admin.
- **FR-006**: UI: `/worker-roles`, `TripWorkerRolesCard` on TripView, travel options in EditTripDialog / application forms.

---

## Assumptions

- Selecting roles/options on applications is Feature 7.
- Document types exist from Feature 4 when `documentTypeId` is set.

## Edge Cases

- Inactive worker roles should not be offered for new applications (enforced where coded).
- Deleting a trip worker role that is referenced by applications — follow controller constraints.

## Success Criteria

- **SC-001**: Org Admin creates a license-required worker role linked to a document type.
- **SC-002**: Trip Leader sets quantities and travel option sets on a trip.
- **SC-003**: Automated tests (backfill).

---

## Data Ownership & Isolation

- Worker roles belong to an organization.
- Trip staffing/options belong to a trip; manage via trip access gates.

---

## Key Entities

- **WorkerRole**, **TripWorkerRole**, **TripTravelOption**

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| CRUD | `/trips/worker-roles` | Yes (org admin manage) | Catalog |
| CRUD | `/trips/trip-worker-roles` | Yes (trip manage) | Needs |
| CRUD | `/trips/trip-travel-options` | Yes (trip manage) | Options |

---

## Screen Requirements

| Route / UI | Component |
|------------|-----------|
| `/worker-roles` | `WorkerRolesList.vue`, `WorkerRoleFormDialog` |
| Trip detail | `TripWorkerRolesCard.vue` |
| Edit trip | Travel option sets editor |

---

## Data Model Requirements

### `workerRole` — per FR-001
### `tripWorkerRole` — `tripId`, `workerRoleId`, `quantity`
### `tripTravelOption` — `tripId`, `description`, `priceAdjustment`, `setNumber`

---

## Acceptance Criteria (Gherkin)

### US-6.1 — Manage organization worker roles

#### Scenario: Org Admin creates a worker role requiring a license
* **Given** I am Org Admin for org A and a medical_licence document type exists
* **When** I create a worker role with `licenseRequired=true` and that documentTypeId
* **Then** the role is listed for org A

### US-6.2 — Set trip team role needs

#### Scenario: Trip Leader adds a trip worker role quantity
* **Given** I can manage trip T and a worker role exists
* **When** I create a trip-worker-role with quantity 3
* **Then** trip detail shows that role need

### US-6.3 — Configure trip travel options

#### Scenario: Org Admin adds two options in the same set
* **Given** I can manage trip T
* **When** I create two travel options with the same `setNumber` and different price adjustments
* **Then** both options are returned for the trip

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-6.1 | Org Admin creates a worker role requiring a license | `backend/tests/worker-roles.test.js` | `Org Admin creates a worker role requiring a license` |
| US-6.2 | Trip Leader adds a trip worker role quantity | `backend/tests/worker-roles.test.js` | `Trip Leader adds a trip worker role quantity` |
| US-6.3 | Org Admin adds two options in the same set | `backend/tests/worker-roles.test.js` | `Org Admin adds two options in the same set` |

---

## Agent implementation request

```text
Implement Feature 6 from @features/feature-6-worker-roles-and-travel-options.md on branch `feature/6-worker-roles-and-travel-options`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update living reference files in the same PR when this feature changes API/schema/rules.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Implemented in imported codebase (**FR-00N**)
*   [ ] Automated tests for every Gherkin scenario
*   [ ] `npm test` green
*   [ ] Living reference updated when evolving this feature

## Out of Scope

- Application selection of roles/options — Feature 7
