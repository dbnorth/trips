# Feature: Two-Column Label and Value Layout for the Trip Page Profile and Application Dialogs

**Feature ID:** 67
**Branch pattern:** `feature/67-two-column-trip-dialogs`
**Status:** Implemented
**Created:** 2026-10-19
**Input:** "Change the profile and application dialog accessible on the Trips vue from the participant name link and the View App to a two column view with a label and value column to make them more readable."
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 47 — Simplify Application Warnings](feature-47-simplify-application-warnings.md)

---

## User Stories

### US-67.1: Read a participant's profile in two columns
**As** trip staff on the trip page  
**I want** the profile dialog (opened from a participant's name) to show each field as a label beside its value  
**So that** I can scan the profile quickly

**Priority:** P2  
**Independent test:** Mount `ViewPersonProfileDialog` with a person; each field is a table row with the label in the first column and the value in the second  
**Acceptance scenarios:** see ### US-67.1

### US-67.2: Read a participant's application in two columns
**As** trip staff on the trip page  
**I want** the application dialog (opened from **View App**, **Approve App**, or **Preview App**) to show each answer as a label beside its value  
**So that** I can review the application quickly

**Priority:** P2  
**Independent test:** Mount `ViewTripApplicationDialog` with an application; each answer is a table row with the label in the first column and the value in the second, grouped under the existing section headings  
**Acceptance scenarios:** see ### US-67.2

---

## Requirements

### Functional Requirements

- **FR-001**: `ViewPersonProfileDialog` MUST show its field rows as a two-column table: the label in the first column (row header) and the value in the second column, one field per row.
- **FR-002**: `ViewTripApplicationDialog` MUST show its fields as two-column tables in the same way. Each existing section heading (**Funding**, **Roommate preference**, **Flight purchase**, **Selected travel options**, **Agreement**, **Pregnancy**, **Adult signer**) stays a full-width heading above its own table. The rows before the first heading (**Trip role**, **Worker role**, **Participant cost**) form the first table, under the participant name.
- **FR-003**: Each selected travel option MUST be a row with the label `Trip Option <setNumber>` and the value `<description>` followed by its price adjustment (for example `Extra night +$50.00`). With none selected, **None selected** shows under the heading as today.
- **FR-004**: **Why go** MUST be a row (labelled **Why go**) in its own table after the last section, shown only when there is text, as today.
- **FR-005**: The label column MUST be about 40% of the table width. Labels use the current muted label style; long labels and long values (Bio, Why go, addresses) wrap within their column. Rows have a light divider between them.
- **FR-006**: The profile dialog's **Missing** indicator (red value text and the **Missing** chip) MUST stay in the value column for the same fields as today.
- **FR-007**: The rows shown, their order, their values, the profile picture, the "Profile incomplete" warning, the dialog titles, the status chip, the buttons (Close, Unapprove, Cancel, Uncancel, Approve App), and the confirmations MUST stay unchanged.
- **FR-008**: The tables MUST use `th` (scope `row`) for labels and `td` for values, so screen readers read each label with its value.

---

## Assumptions

- Both dialogs are used only from the trip page (`TripView.vue`), so the change affects only that page.
- The two-column layout is kept on narrow screens; the label column stays about 40% and text wraps. A stacked mobile layout is not required.
- The dialog width (640 px) stays the same.
- The implementation may share a small label-and-value table component between the two dialogs.

## Edge Cases

- Empty value → `—` in the value column as today (or **Missing** on the profile when the field is required).
- Very long value (Bio, Why go) → wraps in the value column; the label stays at the top of its row.
- Optional sections hidden today (flight preferences, medical agreement, pregnancy, adult signer, preferred roommate names, allergies description, medical conditions, other languages) stay hidden under the same conditions.

## Success Criteria

- **SC-001**: In both dialogs, every label sits on the same row as its value.
- **SC-002**: Automated tests for every scenario below pass, and the existing `ViewTripApplicationDialog` tests still pass.

---

## Data Ownership & Isolation

Unchanged. Display only.

---

## Key Entities

No change (Person and Trip participant application are only displayed).

---

## API Requirements

No API change.

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| Trip page → participant name | `ViewPersonProfileDialog.vue` | Field rows become a two-column label and value table |
| Trip page → **View App** / **Approve App** / **Preview App** | `ViewTripApplicationDialog.vue` | Fields become two-column label and value tables under the existing section headings |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-67.1 — Read a participant's profile in two columns

#### Scenario: Profile fields show the label beside the value
* **Given** a person with first name "Pat" and city "Austin"
* **When** I open their profile dialog from the trip page
* **Then** the row labelled "First name" shows "Pat" in the value column
* **And** the row labelled "City" shows "Austin" in the value column

#### Scenario: A missing required profile field shows Missing in the value column
* **Given** a person with no city
* **When** I open their profile dialog
* **Then** the row labelled "City" shows **Missing** in the value column

### US-67.2 — Read a participant's application in two columns

#### Scenario: Application answers show the label beside the value
* **Given** an application with worker role "Nurse" that will self-fund
* **When** I open the application dialog from the trip page
* **Then** the row labelled "Worker role" shows "Nurse" in the value column
* **And** the row labelled "Will self-fund" shows "Yes" in the value column

#### Scenario: Section headings stay above their rows
* **Given** an application
* **When** I open the application dialog
* **Then** the "Funding" heading appears above a table containing the "Will self-fund" and "Will raise funds" rows

#### Scenario: Selected travel options show as label and value rows
* **Given** an application with selected Trip Option 1 "Extra night" at +$50.00
* **When** I open the application dialog
* **Then** the row labelled "Trip Option 1" shows "Extra night" and "+$50.00" in the value column

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-67.1 | Profile fields show the label beside the value | `frontend/tests/ViewPersonProfileDialog.test.js` | `Profile fields show the label beside the value` |
| US-67.1 | A missing required profile field shows Missing in the value column | `frontend/tests/ViewPersonProfileDialog.test.js` | `A missing required profile field shows Missing in the value column` |
| US-67.2 | Application answers show the label beside the value | `frontend/tests/ViewTripApplicationDialog.test.js` | `Application answers show the label beside the value` |
| US-67.2 | Section headings stay above their rows | `frontend/tests/ViewTripApplicationDialog.test.js` | `Section headings stay above their rows` |
| US-67.2 | Selected travel options show as label and value rows | `frontend/tests/ViewTripApplicationDialog.test.js` | `Selected travel options show as label and value rows` |

Tests find a row by its `th` label text and check the `td` in the same row.

---

## Agent implementation request

```text
Implement Feature 67 from @features/feature-67-two-column-trip-dialogs.md on branch `feature/67-two-column-trip-dialogs`.

Follow layer order in @features/framework.md.
Frontend only: ViewPersonProfileDialog.vue and ViewTripApplicationDialog.vue (FR-001..FR-008).
Map every Gherkin scenario in the Test Coverage Map; run the frontend `npm test` before finishing.
Living reference: add the Feature 67 row to features/reference/behavior.md.
Do not change which fields show, their values, or any dialog actions (FR-007).
Do not implement behavior not in this spec.
```

**Reference updates:** `behavior.md` (trip page profile and application dialogs use a two-column label and value layout)

---

## Definition of Done

*   [x] Both dialogs per **FR-001**..**FR-008**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Changing which fields show, their order, or their wording
- Other dialogs (Trip Status contact dialog, Edit person, Edit application, Add participant)
- A stacked layout for phones
- Printing or exporting the dialogs
- Backend changes
