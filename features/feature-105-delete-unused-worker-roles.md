# Delete Unused Worker Roles

**Feature ID:** 105
**Branch pattern:** `feature/105-delete-unused-worker-roles`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "create a spec that will add a delete icon to the roles view for each role. The delete should delete the role and the documents required. Delete should not be available if the role is used on any trip."

Org Admins can add and edit worker roles but can't remove one they created by mistake; the only option is to mark it Inactive. `DELETE /trips/worker-roles/:id` already exists, but nothing on screen calls it, and it doesn't check trips: deleting a role today also deletes every trip role (and its reservations) built from it. This feature adds **Delete** to each row of the **Worker roles** page for roles no trip uses, removes the role's required documents and required specializations with it, and has the API refuse to delete a role that any trip uses.

## Clarifications

### Session 2026-11-03

- Q: What does "delete the documents required" remove? → A: The role's **required document** list (and the required specializations that go with it). The document types themselves belong to the organization, may be required by other roles, and stay; person documents are untouched.
- Q: When is a role "used on a trip"? → A: When any trip, past or future, of any status, has a trip role for it (a row on the trip's **Team roles**). Applications and reservations always sit on a trip role, so a role no trip uses has none.
- Q: Hide or disable **Delete** on a used role? → A: Hide it, like **Remove** on trip roles with participants (Feature 103).

**Depends on:**
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md) (worker roles page, `DELETE /trips/worker-roles/:id`)
- [Feature 25 — Worker Role Required Documents](feature-25-worker-role-required-documents.md) (`workerRoleDocumentType`)
- [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md) (`workerRoleSpecialization`)
- [Feature 81 — Row Action Icons with Tooltips](feature-81-row-action-icons.md) (`RowAction`, Delete `mdi-delete` in red)

---

## User Stories

### US-105.1: Delete a worker role no trip uses

**As** an Org Admin (or System Admin) managing worker roles
**I want** a **Delete** action on roles that no trip uses
**So that** I can remove roles added by mistake without leaving them in the list

**Acceptance:** see Gherkin scenarios under US-105.1.

### US-105.2: Roles used on trips can't be deleted

**As** an Org Admin
**I want** roles used on trips protected from deletion
**So that** deleting a role never removes it from a trip or from the people who applied for it

**Acceptance:** see Gherkin scenarios under US-105.2.

---

## Requirements

### Functional Requirements

- **FR-001**: A worker role is **in use** when at least one trip role (`tripWorkerRole`) references it, on any trip of any status.
- **FR-002**: `GET /trips/worker-roles` and `GET /trips/worker-roles/:id` include `inUse` (boolean, FR-001) on each role.
- **FR-003**: The **Worker roles** page shows a **Delete** row action (Feature 81 `RowAction`, `mdi-delete`, red, tooltip "Delete") after **Edit** on each role that is not in use. Roles in use show only **Edit**.
- **FR-004**: **Delete** asks `Delete worker role "<name>"?` (browser confirm, like **Document types**). Cancel does nothing. On OK it deletes the role, shows "Worker role deleted.", and reloads the list; on an error it shows the API message (or "Unable to delete worker role.") and the role stays.
- **FR-005**: Deleting a role also deletes its required document rows (`workerRoleDocumentType`) and required specialization rows (`workerRoleSpecialization`) in the same transaction. Document types, their specializations, and person documents are not changed.
- **FR-006**: `DELETE /trips/worker-roles/:id` refuses a role in use: `400` "This role is used on a trip and cannot be deleted." and nothing changes (the role, its required documents and specializations, and every trip role, application, and reservation stay). Access is unchanged: Org Admin of the role's organization or System Admin (`403` "Forbidden."), `404` "Worker role not found.".

---

## Assumptions

- Inactive roles follow the same rule: deletable when not in use.
- A role used only on old or completed trips is still in use; staff remove it from those trips first (Feature 103 rules apply there) or mark it Inactive.
- No undo; the browser confirm is the only safeguard, as for document types.

## Edge Cases

- A trip adds the role after the page loaded, then the admin clicks **Delete** → the API returns the FR-006 `400`, the message shows, and the role stays.
- The role was removed from every trip → it is no longer in use; **Delete** shows and works.
- A role with no required documents → deletes normally.
- A document type required by this role and another role → still required by the other role after the delete.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No worker role referenced by a trip role can be deleted from the UI or the API.

---

## Data Ownership & Isolation

No change. Worker roles stay scoped to their organization; only an Org Admin of that organization or a System Admin can delete one.

---

## Key Entities

- **WorkerRole** — the organization's role; gains computed `inUse` in API responses.
- **TripWorkerRole** — a trip's use of a worker role; any row makes the role in use.
- **WorkerRoleDocumentType**, **WorkerRoleSpecialization** — the role's required documents and specializations; deleted with the role.

---

## API Requirements

| Method | Endpoint | Change |
|--------|----------|--------|
| `GET` | `/trips/worker-roles` | Each role includes `inUse` (FR-002) |
| `GET` | `/trips/worker-roles/:id` | Includes `inUse` (FR-002) |
| `DELETE` | `/trips/worker-roles/:id` | `400` "This role is used on a trip and cannot be deleted." when in use (FR-006); otherwise deletes the role with its required documents and specializations (FR-005) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `WorkerRolesList` (**Worker roles** page) | **Delete** row action after **Edit** on roles not in use, with confirm and messages (FR-003, FR-004) |

---

## Data Model Requirements

No schema change. `inUse` is computed from `tripWorkerRoles`.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Mission Health" has worker roles "Nurse" (requires document "RN License" with required specialization "Pediatrics") and "Dentist" (requires "RN License" and "Dental License").
- Trip "Guatemala Clinic 2027" has a trip role for Nurse; no trip has Dentist.
- Olivia is an Org Admin of Mission Health.

### US-105.1 — Delete a worker role no trip uses

#### Scenario: Worker roles page shows Delete only on roles no trip uses
* **Given** Olivia opens **Worker roles**
* **Then** the Dentist row has **Edit** and **Delete**
* **And** the Nurse row has **Edit** and no **Delete**

#### Scenario: Deleting a role after confirming removes it from the list
* **Given** Olivia is on **Worker roles**
* **When** she clicks **Delete** on Dentist and confirms `Delete worker role "Dentist"?`
* **Then** "Worker role deleted." shows and Dentist is no longer listed
* **When** she clicks **Delete** on a role and cancels the confirm
* **Then** nothing is deleted

#### Scenario: Deleting a role removes its required documents but keeps the document types
* **When** Olivia deletes Dentist through the API
* **Then** the response is `200` "Worker role deleted."
* **And** Dentist and its required document rows are gone
* **And** document types "RN License" and "Dental License" still exist, and Nurse still requires "RN License" with "Pediatrics"

### US-105.2 — Roles used on trips can't be deleted

#### Scenario: The API refuses to delete a role used on a trip
* **When** Olivia deletes Nurse through the API
* **Then** the response is `400` "This role is used on a trip and cannot be deleted."
* **And** Nurse, its required documents and specializations, and the trip's Nurse role are unchanged

#### Scenario: The worker roles list says which roles are in use
* **When** Olivia loads the worker roles
* **Then** Nurse has `inUse` true and Dentist has `inUse` false

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-105.1 | Worker roles page shows Delete only on roles no trip uses | `frontend/tests/DeleteWorkerRoles.test.js` | `Worker roles page shows Delete only on roles no trip uses` |
| US-105.1 | Deleting a role after confirming removes it from the list | `frontend/tests/DeleteWorkerRoles.test.js` | `Deleting a role after confirming removes it from the list` |
| US-105.1 | Deleting a role removes its required documents but keeps the document types | `backend/tests/delete-worker-roles.test.js` | `Deleting a role removes its required documents but keeps the document types` |
| US-105.2 | The API refuses to delete a role used on a trip | `backend/tests/delete-worker-roles.test.js` | `The API refuses to delete a role used on a trip` |
| US-105.2 | The worker roles list says which roles are in use | `backend/tests/delete-worker-roles.test.js` | `The worker roles list says which roles are in use` |

---

## Agent implementation request

```text
Implement Feature 105 from @features/feature-105-delete-unused-worker-roles.md on branch `feature/105-delete-unused-worker-roles`.

Backend (workerRole.controller.js): add inUse (any tripWorkerRole with this workerRoleId) to formatRole for findAll/findOne; in delete, return 400 "This role is used on a trip and cannot be deleted." when in use, otherwise destroy workerRoleSpecialization and workerRoleDocumentType rows and the role in one transaction.
Frontend (WorkerRolesList.vue): RowAction Delete (mdi-delete, color error) after Edit when !item.inUse; window.confirm, WorkerRoleServices.delete, "Worker role deleted." / API message, reload.
Tests per the Test Coverage Map. Update features/reference/ (behavior, api).
```

---

## Definition of Done

*   [x] `inUse` per **FR-001**–**FR-002**
*   [x] **Delete** row action per **FR-003**–**FR-004**
*   [x] Delete removes required documents and specializations per **FR-005**
*   [x] API refusal per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Deleting document types or person documents with the role.
- Removing a role from its trips as part of the delete.
- Showing which trips use a role, or a reason when **Delete** is hidden.
- Changes to the Inactive status.
