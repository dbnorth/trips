# Feature: Role Capacity & Application Cancel / Uncancel

**Feature ID:** 26
**Branch pattern:** `feature/26-role-capacity-and-cancel`
**Status:** Done
**Created:** 2026-09-06
**Input:** Count unsubmitted (pending / `incomplete`) and submitted (`applied` / `approved`) applicants against each trip worker-role quantity so others cannot take a filled role; allow applicant, Trip Leader, or Admin to Cancel and Uncancel an application (with “Are you sure?”); cancelled applications must not count toward the role
**Depends on:** [Feature 6 — Worker Roles & Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-26.1: Role slots consumed by pending and submitted applications
**As a** trip applicant  
**I want** open roles to exclude people who already hold a pending or submitted application for that role  
**So that** I cannot apply for a role that is already full

**Priority:** P1  
**Independent test:** With quantity 1 and one `incomplete` (or `applied`/`approved`) assignment on a trip worker role, a second person cannot apply to that role (`availableCount` 0 / API `400`); after the first is `cancelled`, the slot is available again  
**Acceptance scenarios:** see ### US-26.1

### US-26.2: Cancel and Uncancel an application
**As an** applicant, Trip Leader, or Org/System Admin  
**I want** to Cancel or Uncancel an application after confirming “Are you sure?”  
**So that** people can free a role slot or restore an application without silent mistakes

**Priority:** P1  
**Independent test:** Cancel sets `cancelled` and frees the role count; Uncancel restores to auto `incomplete`/`applied` (not auto-`approved`) when capacity allows; UI shows confirm before both actions  
**Acceptance scenarios:** see ### US-26.2

---

## Requirements

### Functional Requirements

- **FR-001**: For each `tripWorkerRole`, **signed-up / occupying** applications MUST be those with `status` in `{ incomplete, applied, approved }` and the same `tripWorkerRoleId`. These MUST reduce `availableCount` (`quantity - signedUpCount`, floored at 0).
- **FR-002**: Applications with `status` `cancelled` MUST **not** count toward signed-up / available capacity. `declined` MUST also **not** count (unchanged from existing browse/public counting).
- **FR-003**: Mapping for product language (docs/UI MAY say):
  - **Unsubmitted / pending** → `incomplete`
  - **Submitted / completed application** → `applied` (and `approved` continues to occupy a slot after staff approval)
- **FR-004**: Browse/apply and public role payloads MUST continue to expose `signedUpCount` and `availableCount` using **FR-001**–**FR-002**. Apply UI MUST only offer roles with `availableCount > 0` (except the applicant’s current role when editing).
- **FR-005**: Creating a new application for a role with `availableCount < 1` MUST be rejected (`400`, clear message). Updating an application to a **different** trip worker role that has no remaining capacity MUST be rejected the same way. Keeping the same role when editing MUST remain allowed even if that role shows zero other openings.
- **FR-006**: **Cancel application** MUST set `status` to `cancelled`. Allowed actors:
  - the **applicant** (assignment’s `peopleId` = current user’s person) when status is `incomplete`, `applied`, or `approved`
  - **Trip Leader** for the trip, **Org Admin** for the trip’s org, or **System Admin**, for the same statuses
  - Cancel MUST **not** be available for `declined` or already-`cancelled` (no-op / hide action)
- **FR-007**: **Uncancel application** MUST move a `cancelled` assignment back to auto status `incomplete` or `applied` using the existing completeness rules (`resolveAppliedOrIncompleteStatus` / equivalent). It MUST **not** restore `approved` automatically (staff must approve again if needed). Allowed actors: same as **FR-006** (applicant for their own app; Trip Leader / Org Admin / System Admin).
- **FR-008**: Uncancel MUST fail with `400` if the assignment’s `tripWorkerRoleId` has `availableCount < 1` for **other** occupants (i.e. no free slot to reclaim). If the cancelled row is the only reason the role looked full, uncancel MUST succeed (cancelled rows do not occupy — **FR-002**).
- **FR-009**: Cancel and Uncancel UI MUST show a confirmation dialog with **Are you sure?** (or equivalent explicit confirm) before calling the API. Surfaces: applicant edit/view application (e.g. `EditTripApplicationView` and/or apply dialog when already applied); staff view application (`ViewTripApplicationDialog` / participant roster). Cancel for staff MUST work for `incomplete`/`applied`/`approved` (not only `approved` as today).
- **FR-010**: Prefer a dedicated authenticated endpoint or clear status-update path for cancel/uncancel (e.g. `POST …/cancel`, `POST …/uncancel`, or documented `PUT` status transitions with the same auth rules). Applicant MUST be able to cancel/uncancel **without** general staff trip-people-role write access.
- **FR-011**: Shared counting logic SHOULD be centralized (one helper used by browse, public overview, and trip-worker-role list) so cancelled exclusion cannot drift.

---

## Assumptions

- “Pending” = `incomplete`; “submitted/completed” for capacity = `applied` and also `approved`.
- One person still has at most one `tripPeopleRole` row per trip (Feature 7); cancel does not delete the row.
- After uncancel, agreement/document completeness may leave status `incomplete` until the applicant updates again.
- Declined applications remain out of capacity and are not part of Cancel/Uncancel in this feature (no Uncancel-from-declined).

## Edge Cases

- Role quantity 2 with two incomplete apps → third applicant blocked; one cancels → third may apply.
- Applicant cancels approved assignment → slot frees; Uncancel → `applied` or `incomplete`, not `approved`.
- Two cancelled applicants Uncancel into a role with quantity 1 → first succeeds, second gets `400`.
- Staff cancels someone else’s incomplete app → counts drop immediately for other applicants.
- Version / optimistic concurrency: follow existing tripPeopleRole version rules if the chosen API uses them.

## Success Criteria

- **SC-001**: Pending and submitted (including approved) apps occupy role slots; cancelled do not.
- **SC-002**: Second applicant cannot take a full role until a slot frees.
- **SC-003**: Applicant and staff can Cancel and Uncancel with an “Are you sure?” confirm.
- **SC-004**: Uncancel respects capacity and does not auto-approve.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Capacity counts** | Per trip / tripWorkerRole; same trip access as browse/public today |
| **Cancel / Uncancel (self)** | Applicant may only act on their own `tripPeopleRole` for that trip |
| **Cancel / Uncancel (staff)** | Trip Leader for trip, Org Admin for org, or System Admin |
| **Cross-person** | Applicant cannot cancel another person’s application |

---

## Key Entities

- **TripWorkerRole** — `quantity` vs occupied count
- **TripPeopleRole** — `status` drives occupancy and cancel/uncancel

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| Browse / public roles | as today | — | `signedUpCount` / `availableCount` per **FR-001**–**FR-002** (centralize if duplicated) |
| Apply / update application | as Feature 7 | applicant | Enforce **FR-005** |
| Cancel | e.g. `POST /trips/trips/browse/:tripId/application/cancel` and/or staff `PUT`/`POST` on assignment | self or staff | Set `cancelled` (**FR-006**) |
| Uncancel | e.g. `POST …/application/uncancel` and/or staff path | self or staff | Restore incomplete/applied; capacity check (**FR-007**–**FR-008**) |

**Status codes:** `400` when role full or invalid transition; `403` when actor not allowed; `404` when assignment missing.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| Apply / edit application role picker | Hide/disable full roles; show available counts |
| `EditTripApplicationView` (applicant) | **Cancel** / **Uncancel** with “Are you sure?” when allowed by status |
| `ViewTripApplicationDialog` (staff) | **Cancel** for incomplete/applied/approved; **Uncancel** for cancelled; confirm dialog |
| Trip roles / public roles lists | Counts reflect cancelled exclusion |

---

## Data Model Requirements

No new tables. Status enum unchanged: `incomplete` | `applied` | `approved` | `declined` | `cancelled`.

---

## Acceptance Criteria (Gherkin)

### US-26.1 — Role slots consumed by pending and submitted applications

#### Scenario: Incomplete application occupies a role slot
* **Given** a trip worker role with quantity 1
* **And** person A has an `incomplete` application for that role
* **When** person B tries to apply for the same role
* **Then** the API rejects the apply with no available positions
* **And** `availableCount` for that role is 0

#### Scenario: Applied application occupies a role slot
* **Given** a trip worker role with quantity 1
* **And** person A has an `applied` application for that role
* **When** person B tries to apply for the same role
* **Then** the apply is rejected for capacity

#### Scenario: Cancelled application does not occupy a role slot
* **Given** a trip worker role with quantity 1
* **And** person A’s application for that role is `cancelled`
* **When** person B applies for the same role
* **Then** the apply succeeds (subject to other rules)

### US-26.2 — Cancel and Uncancel an application

#### Scenario: Applicant cancels with confirmation
* **Given** I have an `incomplete` or `applied` application
* **When** I choose Cancel and confirm **Are you sure?**
* **Then** my application status is `cancelled`
* **And** my former role’s `availableCount` increases by 1

#### Scenario: Applicant uncancels when a slot is free
* **Given** my application is `cancelled` for a role with available capacity
* **When** I choose Uncancel and confirm **Are you sure?**
* **Then** my status becomes `incomplete` or `applied` per completeness rules
* **And** the status is not `approved`

#### Scenario: Uncancel is blocked when the role is full
* **Given** my application is `cancelled`
* **And** other occupants already fill the role quantity
* **When** I try to Uncancel
* **Then** the API responds `400`
* **And** my status remains `cancelled`

#### Scenario: Trip Leader or Admin can cancel and uncancel
* **Given** I am a Trip Leader or Org Admin for the trip
* **When** I Cancel another participant’s application after confirming
* **Then** status is `cancelled` and the role count frees
* **When** I Uncancel after confirming and capacity allows
* **Then** status is `incomplete` or `applied`

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-26.1 | Incomplete application occupies a role slot | `backend/tests/applications.test.js` | `Incomplete application occupies a role slot` |
| US-26.1 | Applied application occupies a role slot | `backend/tests/applications.test.js` | `Applied application occupies a role slot` |
| US-26.1 | Cancelled application does not occupy a role slot | `backend/tests/applications.test.js` | `Cancelled application does not occupy a role slot` |
| US-26.2 | Applicant cancels with confirmation | backend + frontend confirm | `Applicant cancels an application` / UI confirm test |
| US-26.2 | Applicant uncancels when a slot is free | `backend/tests/applications.test.js` | `Applicant uncancels when a slot is free` |
| US-26.2 | Uncancel is blocked when the role is full | `backend/tests/applications.test.js` | `Uncancel is blocked when the role is full` |
| US-26.2 | Trip Leader or Admin can cancel and uncancel | `backend/tests/applications.test.js` | `Trip Leader or Admin can cancel and uncancel` |

---

## Agent implementation request

```text
Implement Feature 26 from @features/feature-26-role-capacity-and-cancel.md on branch `feature/26-role-capacity-and-cancel`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `behavior.md` (capacity + cancel/uncancel), `api.md` (cancel/uncancel endpoints), `data-model.md` only if status rules notes change

---

## Definition of Done

*   [x] Centralized capacity counting; pending + submitted occupy; cancelled do not (**FR-001**–**FR-005**, **FR-011**)
*   [x] Applicant + staff Cancel / Uncancel with auth rules (**FR-006**–**FR-008**, **FR-010**)
*   [x] “Are you sure?” confirmations on Cancel / Uncancel UI (**FR-009**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/26-role-capacity-and-cancel`; PR → `dev`

---

## Out of Scope

- Soft-delete / hard-delete of application rows on cancel
- Auto-waitlist when a role is full
- Uncancel restoring `approved` without a new approve action
- Changing `declined` workflow beyond excluding it from capacity
- Letting one person hold multiple worker roles on the same trip
