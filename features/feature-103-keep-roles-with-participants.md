# Keep Trip Roles That Have Participants

**Feature ID:** 103
**Branch pattern:** `feature/103-keep-roles-with-participants`
**Status:** Implemented
**Created:** 2026-10-31
**Input:** "the delete role icon should not be displayed if there are active (not canceled) participants signed up for that role"

Today trip staff can remove a trip role even when people have applied for it. The role's applications silently lose their role (they drop to Incomplete on their next save), its reserved emails are deleted, and no one is told. This feature hides **Remove** on a trip role while it has active applications, and the API refuses the delete, so a role can only be removed once no one active is in it.

## Clarifications

### Session 2026-10-31

- Q: What should happen when staff delete a trip role that people have applied for? → A: The remove (delete) icon is not shown while the role has active (not cancelled) participants.
- Q: Which applications count as active? → A: The ones that already count as **Number Signed Up** for the role: `incomplete`, `applied`, and `approved` (Feature 26). `cancelled` and `declined` do not.

**Depends on:**
- [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md) (`signedUpCount`, the statuses that occupy a role)
- [Feature 56 — Reserved Role Emails](feature-56-reserved-role-emails.md) (trip role rows on the Team roles card and Edit dialog; reservations removed with the role)

---

## User Stories

### US-103.1: Roles with people in them can't be removed

**As** trip staff (Trip Leader, Org Admin, System Admin)
**I want** the remove action hidden on a trip role while people are signed up for it
**So that** I can't take a role away from applicants by accident

**Acceptance:** see Gherkin scenarios under US-103.1.

---

## Requirements

### Functional Requirements

- **FR-001**: A trip role **has active participants** when its `signedUpCount` (applications on the role with status `incomplete`, `applied`, or `approved` — Feature 26) is greater than 0.
- **FR-002**: The trip page's **Team roles** card does not show the **Remove** action on a role that has active participants; other actions (**Reserved emails**, Number Needed) are unchanged. Roles without active participants keep **Remove**.
- **FR-003**: The Trips list **Edit** dialog does not show **Remove** on a saved role that has active participants (as loaded when the dialog opened). Unsaved roles added in the dialog and saved roles without active participants keep **Remove**.
- **FR-004**: `DELETE /trips/trip-worker-roles/:id` refuses a role with active participants: `400` "People have signed up for this role. Move or cancel them before removing it." and nothing changes (the role, its applications, and its reservations stay). Roles without active participants are deleted as today (clearing the role on any cancelled or declined applications and removing its reservations).

---

## Assumptions

- The count is the one already sent on each trip role (`signedUpCount`); no new field is needed.
- Staff who need to remove a role first move its applicants to another role or cancel / decline them.

## Edge Cases

- Every application on the role is cancelled or declined → **Remove** shows and the delete succeeds.
- Someone applies for the role after the Edit dialog was opened and staff remove it there → the dialog's **Save** gets the FR-004 `400` and shows its message; the role stays.
- A role with only reserved emails (no applications) → **Remove** shows; deleting it also removes the reservations, as today.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No trip role with an `incomplete`, `applied`, or `approved` application can be removed from the UI or the API.

---

## Data Ownership & Isolation

No change. Trip role management keeps its existing access rules (Trip Leader of the trip, Org Admin of the trip's organization, System Admin).

---

## Key Entities

- **TripWorkerRole** — the trip role; `signedUpCount` is computed per role.
- **TripPeopleRole** (application) — `status` and `tripWorkerRoleId` decide whether the role has active participants.

---

## API Requirements

| Method | Endpoint | Change |
|--------|----------|--------|
| `DELETE` | `/trips/trip-worker-roles/:id` | `400` "People have signed up for this role. Move or cancel them before removing it." when the role has active participants (FR-004) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripWorkerRolesCard` (trip page **Team roles**) | **Remove** hidden on roles with active participants (FR-002) |
| `EditTripDialog` roles table | **Remove** hidden on saved roles with active participants (FR-003) |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Trip "Guatemala Clinic 2027" has roles "Nurse" and "Dentist".
- Ana Lopez has applied as a Nurse (status `applied`); Ben Cruz's Dentist application is `cancelled`.

### US-103.1 — Roles with people in them can't be removed

#### Scenario: Team roles card hides Remove on a role with active participants
* **Given** staff open the trip page's **Team roles** card
* **Then** the Nurse row has no **Remove**
* **And** the Dentist row has **Remove**

#### Scenario: Edit trip hides Remove on a role with active participants
* **Given** staff open **Edit** for the trip from the Trips list
* **Then** the Nurse row has no **Remove**
* **And** the Dentist row has **Remove**
* **When** they add a "Pharmacist" role in the dialog
* **Then** the Pharmacist row has **Remove**

#### Scenario: The API refuses to delete a role with active participants
* **When** staff delete the Nurse role through the API
* **Then** the response is `400` "People have signed up for this role. Move or cancel them before removing it."
* **And** the Nurse role and Ana's application on it are unchanged

#### Scenario: A role with only cancelled or declined applications can be deleted
* **When** staff delete the Dentist role through the API
* **Then** the response is `200`
* **And** the Dentist role is gone and Ben's cancelled application has no role

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-103.1 | Team roles card hides Remove on a role with active participants | `frontend/tests/KeepRolesWithParticipants.test.js` | `Team roles card hides Remove on a role with active participants` |
| US-103.1 | Edit trip hides Remove on a role with active participants | `frontend/tests/KeepRolesWithParticipants.test.js` | `Edit trip hides Remove on a role with active participants` |
| US-103.1 | The API refuses to delete a role with active participants | `backend/tests/keep-roles-with-participants.test.js` | `The API refuses to delete a role with active participants` |
| US-103.1 | A role with only cancelled or declined applications can be deleted | `backend/tests/keep-roles-with-participants.test.js` | `A role with only cancelled or declined applications can be deleted` |

---

## Agent implementation request

```text
Implement Feature 103 from @features/feature-103-keep-roles-with-participants.md on branch `feature/103-keep-roles-with-participants`.

Backend: in tripWorkerRole.controller.js delete, refuse with 400 when the role has applications with status incomplete/applied/approved (ROLE_OCCUPYING_STATUSES).
Frontend: hide Remove in TripWorkerRolesCard and EditTripDialog when the saved role's signedUpCount > 0.
Tests per the Test Coverage Map. Update features/reference/ (behavior, api).
```

---

## Definition of Done

*   [x] **Remove** hidden per **FR-001**–**FR-003**
*   [x] API refusal per **FR-004**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Moving applicants to another role from the role row.
- Emails when a role is removed.
- Confirmation dialogs for removing roles without active participants.
