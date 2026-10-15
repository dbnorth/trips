# Feature: Person Bio Below Birthdate

**Feature ID:** 37
**Branch pattern:** `feature/37-person-bio-below-birthdate`
**Status:** Ready
**Created:** 2026-10-14
**Input:** On the person form, move the Bio field to just below the Birthdate field.
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-37.1: Enter bio under birthdate

**As a** staff member adding or editing a person
**I want** Bio directly under Birthdate
**So that** the personal details stay together

**Priority:** P1
**Independent test:** Open Add person and Edit person. Birthdate is above Bio. Bio is above Emergency contact name.
**Acceptance scenarios:** see ### US-37.1

---

## Requirements

### Functional Requirements

- **FR-001**: On Add person and Edit person, **Bio** MUST be the next field after the Birthdate row.
- **FR-002**: **Birthdate** and **Gender** MUST stay on the same row. **Bio** is full width on the following row.
- **FR-003**: **Bio** MUST appear before **Emergency contact name**. It MUST NOT remain after **Current church home**.
- **FR-004**: The **Bio** label, the saved `bioText` value, and the API MUST NOT change.
- **FR-005**: View profile, the public participant page, and the application health form MUST NOT gain a Bio field from this change. The application health form does not include Bio today.

---

## Assumptions

- “Just below Birthdate” means the next row after the Birthdate and Gender row, not a field inserted between those two controls.
- Bio stays optional. Blank still saves as null.

## Edge Cases

- Edit person with an existing bio → the value loads in the field in its new place.
- Add person → Bio starts empty in the new place.
- Application health form → no Bio field.

## Success Criteria

- **SC-001**: Add person and Edit person show Bio immediately under the Birthdate row and before Emergency contact.
- **SC-002**: Saving a bio still stores `bioText` as it does today.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. `bioText` stays on the person.

---

## Key Entities

- **Person** — `bioText` is unchanged. This feature only moves the field on the form.

---

## API Requirements

No API changes.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `AddPersonDialog` | Move **Bio** to just below the Birthdate row |
| `EditPersonDialog` | Move **Bio** to just below the Birthdate row |
| `PersonProfileFields` | Birthdate and Gender stay together; Bio follows that row and precedes Emergency contact |

---

## Data Model Requirements

No schema changes.

---

## Acceptance Criteria (Gherkin)

### US-37.1 — Enter bio under birthdate

#### Scenario: Add person shows Bio below Birthdate
* **Given** I open Add person
* **Then** Birthdate appears before Bio
* **And** Bio appears before Emergency contact name

#### Scenario: Edit person shows Bio below Birthdate
* **Given** I open Edit person
* **Then** Birthdate appears before Bio
* **And** Bio appears before Emergency contact name

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-37.1 | Add person shows Bio below Birthdate | `frontend/tests/` AddPersonDialog | `Add person shows Bio below Birthdate` |
| US-37.1 | Edit person shows Bio below Birthdate | `frontend/tests/` EditPersonDialog | `Edit person shows Bio below Birthdate` |

---

## Agent implementation request

```text
Implement Feature 37 from @features/feature-37-person-bio-below-birthdate.md on branch `feature/37-person-bio-below-birthdate`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/behavior.md in the same PR. No API or schema change.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Bio sits under Birthdate on Add person and Edit person)

---

## Definition of Done

*   [x] **Bio** is the next field after the Birthdate row on Add person and Edit person (**FR-001**–**FR-003**)
*   [x] Saved `bioText` and other screens are unchanged (**FR-004**, **FR-005**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/37-person-bio-below-birthdate`; PR → `dev`

---

## Out of Scope

- Changing the Bio label or making Bio required
- Moving Bio on the view-profile dialog or the public participant page
- Adding Bio to the application health form
