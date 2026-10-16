# Feature: Allergies Description Hint

**Feature ID:** 36
**Branch pattern:** `feature/36-allergies-description-hint`
**Status:** Ready
**Created:** 2026-10-14
**Input:** On the person form, when the allergies description field is displayed, indicate that the person should enter any medicine, food, or seasonal allergies.
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-36.1: Explain what to enter for allergies

**As a** person filling out a profile
**I want** the allergies description field to say what kinds of allergies to include
**So that** I know to enter medicine, food, and seasonal allergies

**Priority:** P1
**Independent test:** Set **Have allergies?** to Yes and see the hint under **Allergies description**. Set it to No or leave it unanswered and the field is hidden.
**Acceptance scenarios:** see ### US-36.1

---

## Requirements

### Functional Requirements

- **FR-001**: When **Have allergies?** is Yes, the **Allergies description** field MUST show this hint: **Enter any medicine, food, or seasonal allergies.**
- **FR-002**: The hint MUST be visible while the field is displayed (persistent hint). The field label stays **Allergies description**.
- **FR-003**: When **Have allergies?** is No or unanswered, the allergies description field MUST stay hidden, as it does today.
- **FR-004**: The hint MUST appear everywhere that field is shown: Add person, Edit person, and the application health form (`PersonProfileFields`).
- **FR-005**: Stored `allergiesDescription`, required-when-Yes completeness, and the API MUST NOT change.

---

## Assumptions

- The hint is guidance. It does not add a new validation rule or require the words medicine, food, or seasonal in the saved text.
- Correct spelling in the hint is “allergies,” including medicine, food, or seasonal allergies.

## Edge Cases

- Have allergies? is Yes with an empty description → the hint is shown; existing completeness rules still apply.
- Have allergies? changes from Yes to No → the field and hint are hidden; the stored description is cleared on save the same way it is today.
- Application health form uses the same field → the same hint is shown.

## Success Criteria

- **SC-001**: A Yes answer on **Have allergies?** shows **Allergies description** with the hint **Enter any medicine, food, or seasonal allergies.**
- **SC-002**: No or unanswered **Have allergies?** does not show the field.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. Allergy text stays on the person. The same people who can edit the person profile can see the hint.

---

## Key Entities

- **Person** — `allergiesDescription` is unchanged. This feature only adds hint text on the form.

---

## API Requirements

No API changes.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `PersonProfileFields` | When **Have allergies?** is Yes, **Allergies description** shows the persistent hint **Enter any medicine, food, or seasonal allergies.** |

---

## Data Model Requirements

No schema changes.

---

## Acceptance Criteria (Gherkin)

### US-36.1 — Explain what to enter for allergies

#### Scenario: Allergies description explains what to enter
* **Given** the person form is open
* **When** Have allergies? is Yes
* **Then** I see Allergies description
* **And** the hint says Enter any medicine, food, or seasonal allergies.

#### Scenario: Allergies description stays hidden when there are no allergies
* **Given** the person form is open
* **When** Have allergies? is No
* **Then** I do not see Allergies description

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-36.1 | Allergies description explains what to enter | `frontend/tests/` PersonProfileFields | `Allergies description explains what to enter` |
| US-36.1 | Allergies description stays hidden when there are no allergies | `frontend/tests/` PersonProfileFields | `Allergies description stays hidden when there are no allergies` |

---

## Agent implementation request

```text
Implement Feature 36 from @features/feature-36-allergies-description-hint.md on branch `feature/36-allergies-description-hint`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/behavior.md in the same PR. No API or schema change.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (allergies description hint when the field is shown)

---

## Definition of Done

*   [x] Hint shown on **Allergies description** when **Have allergies?** is Yes (**FR-001**, **FR-002**, **FR-004**)
*   [x] Field stays hidden when **Have allergies?** is not Yes (**FR-003**)
*   [x] Storage and completeness unchanged (**FR-005**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/36-allergies-description-hint`; PR → `dev`

---

## Out of Scope

- Requiring the saved text to mention medicine, food, or seasonal allergies
- Changing the view-profile label or the participants CSV column
- Changing when the field is required
