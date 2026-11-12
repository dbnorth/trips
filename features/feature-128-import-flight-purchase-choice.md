# Feature: Import Sets the Flight Purchase Choice

**Feature ID:** 128
**Branch pattern:** `feature/128-import-flight-purchase-choice`
**Status:** Implemented
**Created:** 2026-11-11
**Input:** "if it does not set the value to orangiztion it should set to self."
**Depends on:** [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md)

Today the Trip Master import sets an application's flight purchase choice to **organization** only when the row's **Flight Fee** is greater than $0 and the application has no choice yet. Every other imported application is left blank, so **Booked by** shows "Not chosen". This feature sets the choice to **self** whenever the import does not set **organization**.

## Clarifications

- Q: When does the import set **organization**? → A: Unchanged. **Flight Fee** is a number greater than $0, and the application has no choice yet.
- Q: When does it set **self**? → A: Whenever it does not set **organization**, and the application has no choice yet. That includes a blank **Flight Fee**, $0, a negative amount, and a fee that is not a number.
- Q: Does a second import change a choice already saved? → A: No. The import still fills only a blank flight purchase choice.

---

## User Stories

### US-128.1: Imported applications have a flight purchase choice

**As** trip staff
**I want** every application filled by the Trip Master import to say who books the flight
**So that** **Booked by** is never "Not chosen" for an imported person

**Priority:** P1
**Independent test:** Import the sample Trip Master file. Lyle Lowry (**Flight Fee** $40.00) is booked by the organization. Ana Lopez (**Flight Fee** $0.00) and Kris Smith (blank **Flight Fee**) are booked by themselves.
**Acceptance scenarios:** see ### US-128.1

---

## Requirements

### Functional Requirements

- **FR-001**: When an imported row's **Flight Fee** is a number greater than $0 and the application's flight purchase choice is blank, the import sets the choice to **organization**. This is unchanged from Feature 80. The fee amount is still not saved as a flight cost.
- **FR-002**: When the import does not set **organization** (FR-001) and the application's flight purchase choice is blank, the import sets the choice to **self**. A blank **Flight Fee**, $0, a negative amount, and a fee that is not a number all take this path.
- **FR-003**: An application that already has **self** or **organization** keeps that choice, whatever the row's **Flight Fee**. A fee that is not a number is still reported in the import summary, as Feature 80 does.
- **FR-004**: Nothing else about the import changes: the flight trip option selected from a fee above $0, flight notes from departure and arrival cities, participant cost, trip options from travel notes and the name tag column, and who is added or updated.

---

## Assumptions

- "Blank" means the application has no flight purchase choice stored.
- **Booked by** already shows **organization** as the organization's name and **self** as "Participant". No screen change is needed.
- The sample file's Lyle Lowry row has **Flight Fee** $40.00, Ana Lopez has $0.00, and Kris Smith has no fee.

## Edge Cases

- A row with **Flight Fee** "tba" and no choice → the summary notes the unreadable flight fee, and the choice is **self**.
- Importing the same file again → every choice stays as the first import set it.
- An application already set to **self** whose row has a fee above $0 → stays **self**.
- An application already set to **organization** whose row has no fee → stays **organization**.
- A cancelled-section row and a waiting-list row are unchanged: the waiting list is still skipped, and a cancellation still only fills blank fields on an application the import updates.

## Success Criteria

- **SC-001**: After an import, no application the import created or updated has a blank flight purchase choice.
- **SC-002**: A fee above $0 still means the organization books the flight, and only when the choice was blank.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. Who may import a Trip Master file stays as Feature 80.

---

## Key Entities

- **TripPeopleRole** (the application): `flightPurchaseOption` is **organization** or **self** after the import fills it. No new field.

---

## API Requirements

None. The import endpoint is unchanged.

---

## Screen Requirements

None. **Booked by** already shows the choice.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-128.1 — Imported applications have a flight purchase choice

#### Scenario: A flight fee above $0 means the organization books the flight
* **Given** the sample Trip Master file, where Lyle Lowry's Flight Fee is $40.00
* **When** the file is imported
* **Then** Lyle Lowry's flight purchase choice is organization
* **And** no flight cost is saved for him

#### Scenario: Every other imported application is booked by the participant
* **Given** the sample Trip Master file, where Ana Lopez's Flight Fee is $0.00 and Kris Smith has no Flight Fee
* **When** the file is imported
* **Then** Ana Lopez's flight purchase choice is self
* **And** Kris Smith's flight purchase choice is self

#### Scenario: An existing choice is kept
* **Given** Ana Lopez already has flight purchase choice organization, and Lyle Lowry already has self
* **When** the sample file is imported
* **Then** Ana Lopez's choice stays organization
* **And** Lyle Lowry's choice stays self

#### Scenario: An unreadable flight fee is noted and booked by the participant
* **Given** a Trip Master row whose Flight Fee is "tba" and whose application has no flight purchase choice
* **When** the file is imported
* **Then** the import summary notes that the flight fee could not be read
* **And** the application's flight purchase choice is self

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-128.1 | A flight fee above $0 means the organization books the flight | `backend/tests/trip-master-import.test.js` | `A flight fee above $0 means the organization books the flight` |
| US-128.1 | Every other imported application is booked by the participant | `backend/tests/trip-master-import.test.js` | `Every other imported application is booked by the participant` |
| US-128.1 | An existing choice is kept | `backend/tests/trip-master-import.test.js` | `An existing choice is kept` |
| US-128.1 | An unreadable flight fee is noted and booked by the participant | `backend/tests/trip-master-import.test.js` | `An unreadable flight fee is noted and booked by the participant` |

The existing Feature 80 test `Travel Notes and Flight Fee select trip options` expects Ana Lopez's flight purchase choice to be empty. That expectation becomes **self**.

---

## Agent implementation request

```text
Implement Feature 128 from @features/feature-128-import-flight-purchase-choice.md on branch `feature/128-import-flight-purchase-choice`.

In the Trip Master import, set flightPurchaseOption to organization when the Flight Fee is greater than $0 and the choice is blank, and to self whenever it does not set organization and the choice is blank. Never replace a choice already saved.
Map every Gherkin scenario in the Test Coverage Map; update the existing Ana Lopez assertion; run `npm test` before finishing.
Update @features/reference/behavior.md (the Import Trip Master CSV row) in the same PR.
Update docs/user-guide/org-admin-guide.md (Import Trip Master CSV) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Import Trip Master CSV: a blank choice becomes **organization** when **Flight Fee** is above $0, otherwise **self**)

**User guide updates:** `docs/user-guide/org-admin-guide.md` (the import bullet that mentions flight fees: a fee above $0 means the organization books the flight, and any other fee means the participant does, only when the application has no choice yet)

---

## Definition of Done

*   [x] Blank flight purchase choices set per **FR-001** and **FR-002**
*   [x] An existing choice is kept, and an unreadable fee is still noted (**FR-003**)
*   [x] Flight option, notes, and cost behavior unchanged (**FR-004**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/128-import-flight-purchase-choice`; PR → `dev`

## Out of Scope

- Saving the **Flight Fee** as the flight cost
- Filling preferred airports, class, airline, or refundable ticket from the file
- Changing the flight purchase choice on the application form
- Replacing a flight purchase choice the application already has
