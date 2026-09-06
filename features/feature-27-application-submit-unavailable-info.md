# Feature: Application Submit Unavailable Info Message

**Feature ID:** 27
**Branch pattern:** `feature/27-application-submit-unavailable-info`
**Status:** Done
**Created:** 2026-09-06
**Input:** Add an info message on the application UI above the last row of buttons that displays when the submit/save button is not shown, listing the reasons why that button is not yet displayed
**Depends on:** [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-27.1: See why Submit / Save is not available
**As an** applicant editing or applying to a trip  
**I want** a clear info message above the action buttons listing why Submit / Save is not shown  
**So that** I know what to fix before I can save or submit my application

**Priority:** P1  
**Independent test:** With conditions that hide the primary button (e.g. not editable, or no available roles), an info alert appears above the button row with one list item per blocking reason; when all blockers clear, the alert is gone and the primary button is shown  
**Acceptance scenarios:** see ### US-27.1

---

## Requirements

### Functional Requirements

- **FR-001**: On applicant **Apply** and **Update application** UIs (`ApplyTripDialog` and `EditTripApplicationView`), the primary **Submit Application** / **Save Incomplete Application** button MUST be **hidden** (not merely disabled) whenever the applicant cannot currently use it.
- **FR-002**: The primary button MUST be hidden when any of these apply:
  - the application is **not editable** (`canEdit` false — e.g. status `approved`, `cancelled`, `declined`, or other non-editable states), and/or
  - there are **no available trip roles** to choose (`availableRoles` empty), and/or
  - the trip/application context is not ready for save (same conditions that today disable the primary button: e.g. still loading or trip missing — if those states render the actions row at all)
- **FR-003**: When the primary button is hidden per **FR-001**–**FR-002**, an **info** alert (`type="info"` or equivalent) MUST appear **immediately above** the last row of action buttons (Cancel App / Uncancel / Close / primary row).
- **FR-004**: The info alert MUST list **each** active blocking reason as a separate bullet (or equivalent list). Reasons MUST be human-readable and MUST include at least:
  - when not editable: a status-based reason (e.g. `This application cannot be saved while its status is cancelled.` — use the actual status label/name)
  - when no available roles: e.g. `There are no trip roles with available positions.`
  - any other condition used in **FR-002** to hide the button MUST have a matching reason string
- **FR-005**: When the primary button is shown **and** the application is ready to submit (`Submit Application`), the info alert MUST **not** be displayed for incompleteness.
- **FR-005a**: When the primary button is shown as **Save Incomplete Application** (editable, roles available, but not fully complete), an info alert MUST list a dynamic checklist:
  1. **Profile is not complete** when the profile fails completeness
  2. Each incomplete **application** field/requirement needed for submit (trip role, funding, license, roommate names, pregnancy answers when applicable, travel options, agreements/signature, required documents/passport, etc.)
- **FR-006**: Incomplete-but-editable applications (status `incomplete` or `applied`, roles available) MUST continue to show the primary button (**Save Incomplete Application** or **Submit Application**). Missing profile / application fields MUST **not** hide the primary button (**FR-005a** lists them instead).
- **FR-007**: Other action buttons in that row (e.g. **Cancel App**, **Uncancel**, **Close**) MUST remain available per Feature 26 / existing rules; this feature only gates the primary Submit/Save control and the new info alert.
- **FR-008**: Copy and placement MUST be the same pattern on both Apply dialog and Edit application view.

---

## Assumptions

- “Submit button” means the primary Apply/Update action (**Submit Application** / **Save Incomplete Application**), not Cancel App / Uncancel / Close.
- Today that control is often **disabled**; this feature changes it to **hidden** when unusable, with an info list replacing the silent disable.
- Incomplete profile / documents / agreements still allow **Save Incomplete**; they are not blockers for showing the primary button (**FR-006**).
- Staff-only view/approve dialogs are out of scope.

## Edge Cases

- Multiple blockers at once (e.g. cancelled **and** no roles) → alert lists **all** applicable reasons.
- After Uncancel restores `incomplete`/`applied` and a role is available → alert hides and primary button returns.
- Approved application: primary hidden; Cancel App may still show; reason cites approved status.
- Loading state: if the actions row is visible before trip load finishes, either keep primary hidden with a “still loading” reason or omit the alert until load completes — prefer **no alert flash** during initial load (show alert only after load when blockers remain).

## Success Criteria

- **SC-001**: When the primary button is hidden, applicants see an info alert above the button row listing every blocking reason.
- **SC-002**: When blockers clear, the alert disappears and the primary button is shown again.
- **SC-003**: Incomplete editable applications still show Save Incomplete / Submit.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **UI only** | Same applicant ownership as Feature 7 apply/edit; no new data access |
| **Reasons** | Derived from client-side state already available on the apply/edit surfaces |

---

## Key Entities

None new. Uses existing application status, role capacity, and editability rules from Features 7 and 26.

---

## API Requirements

No API changes.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `ApplyTripDialog` | Above the last `v-card-actions` row: info alert with bullet list when primary Submit/Save is hidden; primary button `v-if` only when usable |
| `EditTripApplicationView` | Same pattern above the bottom action button row |
| Alert | `type="info"`; title optional; body is a short intro + list of reasons |
| Primary button | Hidden (not disabled-only) when **FR-002** blockers apply |

**Suggested intro copy (MAY adjust wording if equivalent):**  
`This application cannot be saved or submitted yet:`

---

## Data Model Requirements

No schema changes.

---

## Acceptance Criteria (Gherkin)

### US-27.1 — See why Submit / Save is not available

#### Scenario: Info lists reasons when primary button is hidden
* **Given** I open apply or update application
* **And** the primary Submit/Save button is not shown because of one or more blockers
* **When** I view the area above the last row of buttons
* **Then** an info message is displayed
* **And** it lists each reason the button is not shown

#### Scenario: Alert clears when the primary button returns
* **Given** the info message is showing because the primary button is hidden
* **When** all blockers are cleared so the primary button is shown again
* **Then** the info message is not displayed

#### Scenario: Incomplete editable application still shows Save Incomplete
* **Given** my application status is `incomplete` or `applied`
* **And** I can edit and at least one role is available
* **When** my profile or documents are still incomplete
* **Then** the primary Save Incomplete / Submit button is still displayed
* **And** the submit-unavailable info alert is not shown for those incompleteness reasons alone

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-27.1 | Info lists reasons when primary button is hidden | `frontend/tests/ApplyTripDialog.test.js` (or shared apply/edit test) | `Info lists reasons when primary button is hidden` |
| US-27.1 | Alert clears when the primary button returns | same | `Alert clears when the primary button returns` |
| US-27.1 | Incomplete editable application still shows Save Incomplete | same | `Incomplete editable application still shows Save Incomplete` |

---

## Agent implementation request

```text
Implement Feature 27 from @features/feature-27-application-submit-unavailable-info.md on branch `feature/27-application-submit-unavailable-info`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run frontend tests before finishing.
Update @features/reference/behavior.md in the same PR when this feature changes product rules.
Do not implement behavior not in this spec.
```

**Reference updates:** `behavior.md` (submit-unavailable info on apply/edit)

---

## Definition of Done

*   [x] Primary Submit/Save hidden when unusable; info alert above actions lists all blockers (**FR-001**–**FR-008**)
*   [x] Apply dialog + Edit application view both updated
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] Frontend tests green
*   [ ] On `feature/27-application-submit-unavailable-info`; PR → `dev`

---

## Out of Scope

- Changing completeness rules for `applied` vs `incomplete`
- Hiding Save Incomplete solely because profile/documents/agreements are incomplete
- Staff View / Approve application dialogs
- New API or schema fields
- Redesigning other mid-form warning alerts (profile / documents)
