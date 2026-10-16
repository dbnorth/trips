# Feature: Pregnancy Health Questions (Female Applicants)

**Feature ID:** 19
**Branch pattern:** `feature/19-pregnancy-health-questions`
**Status:** Done
**Created:** 2026-09-05
**Input:** Add “Are you pregnant?” and, if Yes, a due date plus a message that a doctor’s travel-clearance document is required — only when the applicant is female — in the Health information section after allergies; store answers on the **application** (not the person) because they can differ between trips
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-19.1: Answer pregnancy questions when female

**As a** female trip applicant  
**I want** to answer “Are you pregnant?”, provide a due date when Yes, and see that I must upload a doctor’s travel-clearance document  
**So that** trip staff have this health information for **this application** and I know what document is required

**Priority:** P1  
**Independent test:** With person `gender === female`, application Health information shows pregnancy Yes/No after allergies; Yes reveals due date and the doctor-document message; values save on `tripPeopleRole`  
**Acceptance scenarios:** see ### US-19.1

### US-19.2: Hide pregnancy questions when not female

**As a** male applicant (or person with gender unset)  
**I want** pregnancy questions not shown on the application  
**So that** I only see health questions that apply to me

**Priority:** P1  
**Independent test:** With `gender === male` or `gender` null/unanswered, pregnancy controls are hidden  
**Acceptance scenarios:** see ### US-19.2

### US-19.3: Clear pregnancy data when it no longer applies

**As a** applicant whose gender or pregnancy answer changes on this application  
**I want** obsolete pregnancy fields cleared on save  
**So that** stale due dates are not kept when the questions no longer apply

**Priority:** P1  
**Independent test:** Switching pregnant Yes → No clears due date on the application; when gender is not female, pregnancy fields are cleared on application save  
**Acceptance scenarios:** see ### US-19.3

---

## Requirements

### Functional Requirements

- **FR-001**: Each trip **application** (`tripPeopleRole`) MUST support nullable pregnancy fields: `isPregnant` (boolean, nullable — `null` = unanswered) and `pregnancyDueDate` (date, nullable). These MUST **not** be stored on the person record (answers may differ per trip/application).
- **FR-002**: On trip **application** Health information UIs (apply dialog and edit-application page), immediately **after** the allergies controls and **before** “Take medication?”, when the person’s `gender` is **female**, the UI MUST show:
  - A Yes/No control labeled **Are you pregnant?**
  - When **Are you pregnant?** is **Yes** (`isPregnant === true`):
    - A **Due date** date control
    - An informational message (alert or equivalent) with this exact text:

      > You must provide a document from your doctor that says it is safe for you to travel on the trip dates.

- **FR-003**: The pregnancy controls and message (FR-002) MUST be shown **only** on application flows and **only** when the person’s `gender` is **female**. When `gender` is `male`, `null`, empty, or otherwise not female, those controls and the doctor-document message MUST be **hidden**. Add/Edit person profile (non-application) MUST **not** collect these fields.
- **FR-004**: Saving the application when the person’s `gender` is not female MUST set `isPregnant` to `null` and `pregnancyDueDate` to `null` on that application.
- **FR-005**: Saving with `isPregnant === false` MUST set `pregnancyDueDate` to `null`. Saving with `isPregnant === null` (unanswered) MUST also clear `pregnancyDueDate`.
- **FR-006**: When the person’s `gender === female`, application **completeness** (incomplete vs applied) MUST require pregnancy answered (`true` or `false`). When `isPregnant === true`, `pregnancyDueDate` MUST also be present. Unanswered pregnancy leaves the application incomplete for that requirement. Person **profile** completeness is unchanged by pregnancy fields.
- **FR-007**: Apply and update-application APIs MUST accept `isPregnant` and `pregnancyDueDate`. Invalid `pregnancyDueDate` MUST be rejected with a clear `400`. When not pregnant Yes / not female, the API MUST clear `pregnancyDueDate` per FR-004–FR-005.
- **FR-008**: Staff **view application** UI MUST show pregnancy Yes/No and due date when the person’s gender is female and values are present (read-only is enough).
- **FR-009**: Participants CSV export MUST include columns for pregnant (Yes/No/blank) and pregnancy due date from the **application** row, consistent with other application health export columns.
- **FR-010**: Empty Yes/No dropdown until answered (same UX as allergies / take medication — do not default `isPregnant` to false).
- **FR-011**: The doctor-document message (FR-002) is **informational only** in this feature: it does **not** by itself create a document type, auto-upload a file, or add a new completeness gate beyond existing person-document rules (Feature 4).
- **FR-012**: Opening a different trip application for the same person MUST load that application’s own pregnancy answers (not another trip’s, and not person-level values).

---

## Assumptions

- `gender` remains on the **person** and gates whether pregnancy questions appear.
- Allergies / medication remain on the person (Features 2 / 17); pregnancy is application-scoped only.
- Due date is a calendar **date**. No “must be in the future” validation in this feature.
- Non-binary / other gender values are out of scope while the enum remains `male` | `female` only.

## Edge Cases

- Female + pregnant unanswered → due date hidden; application incomplete.
- Female + pregnant Yes + missing due date → application incomplete; doctor-document message still shown.
- Female + pregnant No → due date and message hidden/cleared; pregnancy requirement satisfied for that application.
- Gender male (or unset) → pregnancy UI hidden; save clears application pregnancy fields.
- Same person applies to two trips → each application stores its own pregnancy answers independently.

## Success Criteria

- **SC-001**: Female applicants see pregnancy questions on the application after allergies; Yes shows due date and doctor-document message; values persist on `tripPeopleRole`.
- **SC-002**: Non-female applicants do not see pregnancy questions; application pregnancy fields are cleared on save.
- **SC-003**: Application completeness (not person profile) requires pregnancy answered for females, and due date when Yes.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Pregnancy fields belong to the **application** (`tripPeopleRole`). Same access rules as other application fields (applicant for own editable application; org staff / trip leaders as existing).
- Gender remains a person attribute used only for gating and clearing rules.

---

## Key Entities

- **TripPeopleRole (application)** — new `isPregnant`, `pregnancyDueDate`
- **Person** — existing `gender` gates UI and clearing; no pregnancy columns

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/trips/browse/:tripId/apply` | Yes | Accept `isPregnant`, `pregnancyDueDate` with FR-004–FR-007 |
| `PUT` | `/trips/trips/browse/:tripId/application` (update application) | Yes | Same |
| `GET` | Application load / participant payloads | Yes | Return pregnancy fields on the assignment |
| `GET` | Participants export CSV | Yes | Include pregnant + due date from application (FR-009) |

Person create/update MUST **not** persist pregnancy fields.

---

## Screen / UX Requirements

| Surface | Behavior |
|---------|----------|
| Apply / Edit application Health information | After allergies, before Take medication?: pregnancy controls when person gender is female (FR-002) |
| Add / Edit person dialogs | Do **not** show pregnancy questions |
| View application | Show pregnancy + due date when female and present |
| Participants CSV | Export columns per FR-009 |

Labels / copy (exact):

- **Are you pregnant?**
- **Due date** (when Yes)
- Doctor-document message (when Yes): **You must provide a document from your doctor that says it is safe for you to travel on the trip dates.**

---

## Initial Data Model / Schema Notes

| Table | Change |
|-------|--------|
| `tripPeopleRoles` | Add `isPregnant` TINYINT(1) NULL; add `pregnancyDueDate` DATE NULL |
| `people` | Do **not** store pregnancy fields (remove if previously added on this branch) |

---

## Acceptance Criteria (Gherkin)

### US-19.1 — Answer pregnancy questions when female

#### Scenario: Pregnancy question appears after allergies for female

- **Given** my gender is female
- **And** I am on the application Health information section
- **When** the section is displayed
- **Then** I see “Are you pregnant?” after the allergies controls and before “Take medication?”

#### Scenario: Due date appears when pregnant is Yes

- **Given** my gender is female
- **When** I set Are you pregnant? to Yes on the application
- **Then** I see a Due date field

#### Scenario: Doctor document message appears when pregnant is Yes

- **Given** my gender is female
- **When** I set Are you pregnant? to Yes on the application
- **Then** I see the message “You must provide a document from your doctor that says it is safe for you to travel on the trip dates.”

#### Scenario: Pregnancy answers are saved on the application

- **Given** my gender is female
- **And** Are you pregnant? is Yes with a due date on my trip application
- **When** I save the application
- **Then** that application’s tripPeopleRole stores isPregnant true and that pregnancyDueDate

### US-19.2 — Hide pregnancy questions when not female

#### Scenario: Pregnancy question is hidden for male

- **Given** my gender is male
- **When** I view application Health information
- **Then** “Are you pregnant?” and Due date are not shown

#### Scenario: Pregnancy question is hidden when gender is unanswered

- **Given** my gender is not set
- **When** I view application Health information
- **Then** “Are you pregnant?” and Due date are not shown

### US-19.3 — Clear pregnancy data when it no longer applies

#### Scenario: Due date is cleared when pregnant is No

- **Given** my gender is female and I previously saved this application with pregnant Yes and a due date
- **When** I set Are you pregnant? to No and save the application
- **Then** pregnancyDueDate is null on that application

#### Scenario: Pregnancy fields are cleared when gender is no longer female

- **Given** my gender was female with this application saved as pregnant Yes with a due date
- **When** my person gender is male and I save the application
- **Then** isPregnant and pregnancyDueDate are null on that application

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-19.1 | Pregnancy question appears after allergies for female | `frontend/tests/PersonProfileFields.test.js` | `Pregnancy question appears after allergies for female` |
| US-19.1 | Due date appears when pregnant is Yes | `frontend/tests/PersonProfileFields.test.js` | `Due date appears when pregnant is Yes` |
| US-19.1 | Doctor document message appears when pregnant is Yes | `frontend/tests/PersonProfileFields.test.js` | `Doctor document message appears when pregnant is Yes` |
| US-19.1 | Pregnancy answers are saved on the application | `backend/tests/applications.test.js` | `Pregnancy answers are saved on the application` |
| US-19.2 | Pregnancy question is hidden for male | `frontend/tests/PersonProfileFields.test.js` | `Pregnancy question is hidden for male` |
| US-19.2 | Pregnancy question is hidden when gender is unanswered | `frontend/tests/PersonProfileFields.test.js` | `Pregnancy question is hidden when gender is unanswered` |
| US-19.3 | Due date is cleared when pregnant is No | `backend/tests/applications.test.js` | `Due date is cleared when pregnant is No` |
| US-19.3 | Pregnancy fields are cleared when gender is no longer female | `backend/tests/applications.test.js` | `Pregnancy fields are cleared when gender is no longer female` |

---

## Agent implementation request

```text
Implement Feature 19 from @features/feature-19-pregnancy-health-questions.md on branch `feature/19-pregnancy-health-questions`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
Store pregnancy on tripPeopleRole only — not on person (FR-001, FR-012).
Show pregnancy controls only on application health UI when gender is female (FR-002, FR-003).
```

**Reference updates:** `features/reference/api.md`, `data-model.md`, `behavior.md`

---

## Definition of Done

- [x] Application columns `isPregnant` + `pregnancyDueDate` on `tripPeopleRole` (**FR-001**)
- [x] UI on application after allergies for female only; due date + doctor-document message when Yes (**FR-002**, **FR-003**, **FR-010**, **FR-011**)
- [x] Clear rules + application completeness (**FR-004**–**FR-006**)
- [x] Apply/update API + CSV export (**FR-007**, **FR-009**)
- [x] View application shows values when relevant (**FR-008**)
- [x] Automated tests for every Gherkin scenario
- [x] `npm test` green
- [x] Living reference updated

## Out of Scope

- Non-binary / additional gender values beyond existing `male` | `female`
- Pregnancy questions on public unauthenticated pages
- Storing pregnancy on the person profile
- Clinical prenatal workflows, trimester calculators, or required “future-only” due dates
- Changing allergies or medication/medical-condition behavior
- Auto-creating a document type, forcing upload of the doctor letter in this feature, or a new apply-completeness gate tied only to that upload (message only — FR-011)
