# Styled Delete Confirmations

**Feature ID:** 106
**Branch pattern:** `feature/106-styled-delete-confirmations`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "update the are you sure pop up to be a nice dialog [instead of] the browser pop up and add that to the standard UI spec rules"

Eight delete actions still ask "Are you sure?" with the browser's own `window.confirm` popup, which looks out of place, can't be styled, and shows the site address instead of the app's look. The rest of the app (Cancel / Uncancel, sending emails, deleting email pictures) already uses the styled `ConfirmDialog`. This feature switches those eight deletes to `ConfirmDialog`, and the UI style rules now require it for every confirmation.

## Clarifications

### Session 2026-11-03

- Q: Which confirmations change? → A: All eight `window.confirm` deletes: Worker roles, Document types, Medical conditions, Airports, Airlines, Email tokens, Email types, and person documents (Profile / Edit person documents card).
- Q: Where is it specified? → A: A new feature (106), implemented later on its own branch. The rule goes into `.cursor/rules/ui-style-system.mdc` now.

**Depends on:**
- [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md) (`ConfirmDialog`)
- [Feature 81 — Row Action Icons with Tooltips](feature-81-row-action-icons.md) (the red **Delete** row action that opens the confirmation)
- [Feature 105 — Delete Unused Worker Roles](feature-105-delete-unused-worker-roles.md) (Worker roles **Delete**)

---

## User Stories

### US-106.1: Confirm deletes in the app's own dialog

**As** a user deleting something (admin lists, my documents)
**I want** the "Are you sure?" question in a dialog that looks like the rest of the app
**So that** the confirmation feels trustworthy and consistent

**Acceptance:** see Gherkin scenarios under US-106.1.

---

## Requirements

### Functional Requirements

- **FR-001**: Each of these deletes asks with `ConfirmDialog` instead of `window.confirm`:

  | Screen | Message (unchanged text) |
  |--------|--------------------------|
  | Worker roles | `Delete worker role "<name>"?` |
  | Document types | `Delete document type "<description>"?` |
  | Medical conditions | `Delete medical condition "<name>"?` |
  | Airports | `Delete airport "<code>"?` |
  | Airlines | `Delete airline "<code>"?` |
  | Email tokens | `Delete token "<token code>"?` |
  | Email types | `Delete email type "<description>"?` |
  | Person documents card (Profile, Edit person) | `Delete document "<file name>"?` |

- **FR-002**: The dialog is titled "Are you sure?", shows the FR-001 message, and has **Cancel** (text button) and **Delete** (red, `error`). **Cancel**, Esc, or closing the dialog deletes nothing.
- **FR-003**: **Delete** shows a loading state while the request runs (both buttons disabled), then the dialog closes. Success and error handling are unchanged on each screen (same messages, reload, and form reset as today); on an error the item stays and the screen's error message shows.
- **FR-004**: No frontend code calls `window.confirm`, `window.alert`, or `window.prompt`.

---

## Assumptions

- `ConfirmDialog` already supports title, message, button text, `confirmColor`, and `loading`; no component change is needed.
- Delete availability rules (for example Feature 105's hidden **Delete** on roles in use) are unchanged.

## Edge Cases

- The delete fails (for example `400` because a trip started using the worker role) → the dialog closes, the item stays, and the API message shows as today.
- The user clicks **Delete** twice quickly → the loading state blocks the second click; one request is sent.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: `rg "window\.(confirm|alert|prompt)" frontend/src` finds nothing.

---

## Data Ownership & Isolation

No change.

---

## Key Entities

No change (frontend only).

---

## API Requirements

No change.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `WorkerRolesList`, `DocumentTypesList`, `MedicalConditionsList`, `AirportsList`, `AirlinesList`, `EmailTokensList`, `EmailTypesList`, `PersonDocumentsCard` | **Delete** opens `ConfirmDialog` per FR-001–FR-003 instead of `window.confirm` |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Olivia is an Org Admin of "Mission Health", which has worker role "Dentist" (no trip uses it) and document type "Dental License".

### US-106.1 — Confirm deletes in the app's own dialog

#### Scenario: Delete asks in the app's dialog and deletes on confirm
* **Given** Olivia is on **Worker roles**
* **When** she clicks **Delete** on Dentist
* **Then** a dialog titled "Are you sure?" shows `Delete worker role "Dentist"?` with **Cancel** and a red **Delete**
* **And** no browser popup opens
* **When** she clicks **Delete**
* **Then** the role is deleted, the dialog closes, and "Worker role deleted." shows

#### Scenario: Cancel in the delete dialog deletes nothing
* **Given** Olivia clicked **Delete** on Dentist
* **When** she clicks **Cancel**
* **Then** the dialog closes and nothing is deleted

#### Scenario: Every delete confirmation uses the app's dialog
* **Given** each screen in FR-001 with one item
* **When** the user clicks **Delete** on it
* **Then** the "Are you sure?" dialog shows that screen's message, and confirming calls that screen's delete

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-106.1 | Delete asks in the app's dialog and deletes on confirm | `frontend/tests/StyledDeleteConfirmations.test.js` | `Delete asks in the app's dialog and deletes on confirm` |
| US-106.1 | Cancel in the delete dialog deletes nothing | `frontend/tests/StyledDeleteConfirmations.test.js` | `Cancel in the delete dialog deletes nothing` |
| US-106.1 | Every delete confirmation uses the app's dialog | `frontend/tests/StyledDeleteConfirmations.test.js` | `Every delete confirmation uses the app's dialog` (one case per FR-001 screen) |

Existing tests that spy on `window.confirm` (`DeleteWorkerRoles.test.js`, `RowActionIcons.test.js`) are updated to use the dialog.

---

## Agent implementation request

```text
Implement Feature 106 from @features/feature-106-styled-delete-confirmations.md on branch `feature/106-styled-delete-confirmations`.

Frontend only: in each FR-001 screen replace window.confirm with ConfirmDialog (pattern: EmailPicturesList — a `deleting` ref holding the row, `deleteLoading`, title "Are you sure?", the FR-001 message, confirm-text "Delete", confirm-color "error", cancel-text "Cancel"). Keep each screen's success/error handling.
Tests per the Test Coverage Map; update DeleteWorkerRoles and RowActionIcons tests. Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] Eight deletes use `ConfirmDialog` per **FR-001**–**FR-003**
*   [x] No `window.confirm` / `alert` / `prompt` per **FR-004**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Changing which items can be deleted, or the messages after deleting.
- Restyling `ConfirmDialog` or the existing Cancel / Send confirmations.
- Undo after delete.
