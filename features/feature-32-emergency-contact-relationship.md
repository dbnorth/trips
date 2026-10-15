# Feature: Emergency Contact Relationship

**Feature ID:** 32
**Branch pattern:** `feature/32-emergency-contact-relationship`
**Status:** Ready
**Created:** 2026-10-14
**Input:** On the person profile, collect the emergency contact’s relationship from a fixed list: Spouse, Father, Mother, Child, Grand Mother, Grand Father, Other
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-32.1: Choose the emergency contact relationship

**As a** person editing my profile (or staff adding or editing a person)
**I want** to choose how my emergency contact is related to me
**So that** trip staff know who to ask for when they call that contact

**Priority:** P1
**Independent test:** The Emergency contact section shows a relationship dropdown with the seven labels; saving Spouse persists and reloads
**Acceptance scenarios:** see ### US-32.1

### US-32.2: Require a relationship before the profile is complete

**As a** trip applicant
**I want** an unanswered relationship to keep my profile incomplete
**So that** staff are not left without this emergency-contact detail

**Priority:** P1
**Independent test:** A person missing `emergencyContactRelationship` is profile-incomplete; a value from the list satisfies that check
**Acceptance scenarios:** see ### US-32.2

---

## Requirements

### Functional Requirements

- **FR-001**: The person record MUST store `emergencyContactRelationship` (nullable). `null` means unanswered. The control MUST start empty (do not default to a relationship).
- **FR-002**: Allowed values MUST be exactly:
  - `spouse` — **Spouse**
  - `father` — **Father**
  - `mother` — **Mother**
  - `child` — **Child**
  - `grandmother` — **Grand Mother**
  - `grandfather` — **Grand Father**
  - `other` — **Other**
- **FR-003**: Add person and Edit person Emergency contact sections (`PersonProfileFields`, when not health-only) MUST show a dropdown labeled **Emergency contact relationship** immediately after **Emergency contact name** and before the emergency contact phone. Options MUST use the labels in **FR-002**, in that order.
- **FR-004**: Person create and update MUST accept `emergencyContactRelationship`. A value outside **FR-002** MUST be rejected with `400`. Blank / omitted on a save that does not send the field MUST leave the stored value unchanged; an explicit empty value MUST store `null`.
- **FR-005**: GET person MUST return `emergencyContactRelationship`.
- **FR-006**: Person **profile completeness** MUST treat a missing relationship like the other emergency-contact fields: unanswered keeps the profile incomplete (label **Emergency contact relationship**). A value from **FR-002** satisfies that check.
- **FR-007**: View person profile MUST show **Emergency contact relationship** with the display label from **FR-002** when a value is set.
- **FR-008**: Participants CSV export MUST include an **Emergency Contact Relationship** column using the display label (blank when unset), next to the existing emergency contact name and phone columns.
- **FR-009**: `ensureSchema` MUST add `emergencyContactRelationship` on existing databases (nullable; existing rows stay null).

---

## Assumptions

- Relationship is stored on the **person**, with the existing emergency contact name and phone.
- **Other** does not collect a free-text description.
- The list is global, not per organization.
- Application health-only forms do not show the emergency contact block today; this feature does not add it there. Completeness still applies because the full profile must include the relationship.

## Edge Cases

- Unanswered → stored `null`; profile incomplete (**Emergency contact relationship**).
- Value not in the list → `400`.
- Existing people with name and phone but no relationship stay incomplete until a relationship is chosen.
- **Other** is a complete answer by itself.

## Success Criteria

- **SC-001**: Add/Edit person shows the seven relationship labels after the emergency contact name.
- **SC-002**: Create/update/get persist and reload the stored code.
- **SC-003**: Profile completeness requires a relationship; view profile and participants CSV show the label.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `emergencyContactRelationship` belongs to the **person**. Access matches existing person profile read/update.

---

## Key Entities

- **Person** — `emergencyContactRelationship`

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/people` | Yes | Accept `emergencyContactRelationship` |
| `PUT` | `/trips/people/:id` | Yes | Accept `emergencyContactRelationship` |
| `GET` | `/trips/people/:id` | Yes | Return `emergencyContactRelationship` |
| `GET` | Participants CSV | Yes | Include Emergency Contact Relationship label (**FR-008**) |

**Status codes:** `200` success; `400` when the value is not one of the seven codes; existing person access `401` / `403` / `404`.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `PersonProfileFields` (Add/Edit person) | **Emergency contact relationship** dropdown after the name: Spouse, Father, Mother, Child, Grand Mother, Grand Father, Other |
| View person profile | Show the relationship label when set |

---

## Data Model Requirements

### `person` (column)

| Column | Type | Notes |
|--------|------|--------|
| emergencyContactRelationship | ENUM(`spouse`,`father`,`mother`,`child`,`grandmother`,`grandfather`,`other`) | nullable |

---

## Acceptance Criteria (Gherkin)

### US-32.1 — Choose the emergency contact relationship

#### Scenario: Relationship dropdown lists the seven options
* **Given** I am adding or editing a person
* **Then** **Emergency contact relationship** is shown after **Emergency contact name**
* **And** the options are Spouse, Father, Mother, Child, Grand Mother, Grand Father, and Other

#### Scenario: Spouse is saved on the person
* **Given** I am editing a person
* **When** I set **Emergency contact relationship** to Spouse and save
* **Then** reloading the person shows Spouse

#### Scenario: Unknown relationship is rejected
* **When** I save a person with an emergency contact relationship that is not one of the seven values
* **Then** the save fails with a validation error

### US-32.2 — Require a relationship before the profile is complete

#### Scenario: Missing relationship keeps the profile incomplete
* **Given** a person has every other required profile field set
* **And** emergency contact relationship is unanswered
* **Then** the profile is not complete
* **And** the missing fields include Emergency contact relationship

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-32.1 | Relationship dropdown lists the seven options | `frontend/tests/PersonProfileFields.test.js` | `Relationship dropdown lists the seven options` |
| US-32.1 | Spouse is saved on the person | `backend/tests/people.test.js` | `Spouse is saved on the person` |
| US-32.1 | Unknown relationship is rejected | `backend/tests/people.test.js` | `Unknown relationship is rejected` |
| US-32.2 | Missing relationship keeps the profile incomplete | `backend/tests/people.test.js` | `Missing relationship keeps the profile incomplete` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 32 from @features/feature-32-emergency-contact-relationship.md on branch `feature/32-emergency-contact-relationship`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `api.md`, `data-model.md`, `behavior.md`.

---

## Definition of Done

*   [x] Backend and frontend implemented per this spec (**FR-001**–**FR-009** satisfied)
*   [x] **Success Criteria (SC-001**–**SC-004)** met
*   [x] All mapped tests pass (`npm test`)
*   [x] Test Coverage Map complete
*   [x] `features/reference/data-model.md` updated
*   [x] `features/reference/api.md` updated
*   [x] `features/reference/behavior.md` updated

---

## Out of Scope

- A free-text description when the relationship is **Other**
- Per-organization relationship lists
- Collecting emergency contact on the application health-only form
- Changing emergency contact name or phone behavior
