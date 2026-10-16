# Feature: Simplify Application Warnings

**Feature ID:** 47
**Branch pattern:** `feature/47-simplify-application-warnings`
**Status:** Ready
**Created:** 2026-10-16
**Input:** The application screen shows too many warnings. The incomplete-profile box should show only its message and the **Update profile** button, not the list of missing profile fields. On a first application, don't show the list of missing application items, because the applicant hasn't had a chance to fill anything in yet. Show that list only when the applicant comes back to an application they already saved. After the applicant updates and saves the profile from the application, check the profile again. Health answers that live on the profile are display-only on the application and are changed through **Update profile**, so they are edited in one place. Show them as text, not fields, so they don't look answerable, with the pregnancy question below the language question.
**Depends on:** [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 17 — Organization Medical Conditions](feature-17-org-medical-conditions.md), [Feature 19 — Pregnancy Health Questions](feature-19-pregnancy-health-questions.md), [Feature 27 — Application Submit Unavailable Info Message](feature-27-application-submit-unavailable-info.md), [Feature 31 — Person Other Languages](feature-31-person-other-languages.md)

---

## User Stories

### US-47.1: Short incomplete-profile box
**As an** applicant whose profile is not complete
**I want** a short notice with a button to open my profile
**So that** the application screen isn't filled with a long list of profile fields

**Priority:** P1
**Independent test:** With an incomplete profile, the Apply dialog shows "Your profile needs to be completed before this application can be submitted." and **Update profile**, and no list of missing profile fields. After completing and saving the profile from **Update profile**, the box is gone.
**Acceptance scenarios:** see ### US-47.1

### US-47.2: No missing-items list on a first application
**As an** applicant applying to a trip for the first time
**I want** the form without a list of everything I haven't filled in yet
**So that** I'm not shown errors for questions I haven't had a chance to answer

**Priority:** P1
**Independent test:** On a trip with no saved application, the Apply dialog does not show "Complete the following to submit your application:"; after saving an incomplete application and opening it again, the list is shown.
**Acceptance scenarios:** see ### US-47.2

### US-47.3: Profile health answers are display-only on the application
**As an** applicant
**I want** my profile's health answers shown on the application and changed only through my profile
**So that** I edit them in one place and don't lose answers when I save my profile

**Priority:** P1
**Independent test:** On the Apply dialog, **Have allergies?**, **Take medication?**, and **Do you speak a language other than English?** show the profile's answers and cannot be changed; **Update profile** in the health section opens the profile; **Are you pregnant?** can still be answered; saving the application does not update the profile.
**Acceptance scenarios:** see ### US-47.3

---

## Requirements

### Functional Requirements

- **FR-001**: When the profile is not complete, the Apply dialog (`ApplyTripDialog`) MUST show the warning "Your profile needs to be completed before this application can be submitted." with the **Update profile** button, and MUST NOT list the missing profile fields. The Update application page (`EditTripApplicationView`) already shows the box this way and MUST stay that way.
- **FR-002**: A **first application** is when the applicant has no saved application for the trip when the Apply dialog opens. On a first application, the checklist "Complete the following to submit your application:" (Feature 27 **FR-005a**) MUST NOT be shown.
- **FR-003**: When the applicant opens an application they already saved (the Apply dialog for a trip they have applied to, or the Update application page), the checklist MUST be shown as Feature 27 **FR-005a** describes.
- **FR-004**: Reasons the primary button is hidden (Feature 27 **FR-002**–**FR-004**, for example "There are no trip roles with available positions.") MUST still be shown on a first application.
- **FR-005**: The incomplete-profile box (**FR-001**) MUST still be shown on a first application.
- **FR-006**: When the applicant clicks **Update profile**, saves the profile, and the profile dialog closes, the application screen (Apply dialog or Update application page) MUST reload the profile and check it again. The incomplete-profile box MUST disappear when the profile is now complete and stay when it is still incomplete.
- **FR-007**: On the Apply dialog and the Update application page, the health answers stored on the profile MUST be shown as plain text, not as input fields, so they don't look answerable: **Have allergies?**, **Allergies description**, **Take medication?**, **Medical conditions** (by name), and, under a **Language** heading, **Do you speak a language other than English?** with one line per language (name, fluency, medical terminology). Unanswered questions show "Not answered". The **Add language** and **Remove** buttons MUST NOT be shown there.
- **FR-008**: At the top of the application's health section, above the **Health information** heading and the answers, it MUST show "If your contact information or other personal information has changed, please update your profile. Your health and language information below comes from your profile." followed by an **Update profile** button that opens the profile dialog. After the profile is saved, the section MUST show the saved answers (**FR-006**).
- **FR-009**: Saving or submitting the application MUST NOT update the profile.
- **FR-010**: **Are you pregnant?** and **Due date** are stored on the application (Feature 19) and MUST stay editable on the application when it is editable. They are shown when the profile's gender is Female.
- **FR-011**: In the application's health section, **Are you pregnant?** (with **Due date** and the doctor-document message) MUST appear below all of the profile health answers, after **Do you speak a language other than English?** and its languages, under a **Current Health** heading. The heading is shown only when the pregnancy question is. This replaces Feature 19's placement after allergies.

---

## Assumptions

- Saving the application closes the Apply dialog and leaves the Update application page, so the checklist never needs to appear after a save on the same screen. If a later feature keeps the screen open after saving, the checklist should appear then.
- The checklist keeps its single **Profile is not complete** line on a saved application; only the per-field profile list in the warning box goes away.
- Saving the profile from **Update profile** during a first application does not count as saving the application; the checklist stays hidden.
- The mid-form document warning (required documents for the trip role) is unchanged.
- Gender is not shown on the application today; it stays that way and is changed on the profile.
- The medical agreement still appears when the profile says the applicant takes medication.

## Edge Cases

- Cancelled application reopened in the Apply dialog → it is a saved application, so the checklist follows Feature 27 (shown only when the primary button is **Save Incomplete Application**).
- First application with no available roles → the "cannot be saved or submitted yet" alert is shown (**FR-004**).
- Profile complete on a first application → no profile box and no checklist.
- Profile health questions not answered yet → they show blank on the application; the profile is incomplete, so the incomplete-profile box leads to **Update profile**.
- Profile gender changed from Female after pregnancy was answered → the pregnancy questions are hidden; the server already clears them when not female (Feature 19).

## Success Criteria

- **SC-001**: The incomplete-profile box has no list of profile fields.
- **SC-002**: A first application shows no missing-items checklist.
- **SC-003**: A saved application shows the checklist when it is incomplete.
- **SC-004**: Automated tests for the scenarios below pass.
- **SC-005**: Profile health answers can only be changed through the profile, and saving an application never changes the profile.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **UI only** | Same applicant ownership as Feature 7; no new data access |

---

## Key Entities

None new.

---

## API Requirements

No API changes.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `ApplyTripDialog` incomplete-profile box | Message and **Update profile** button only; no field list; re-checked after the profile is saved from **Update profile** |
| `ApplyTripDialog` checklist above the actions | Hidden on a first application; shown per Feature 27 on a saved application |
| `ApplyTripDialog` blocker alert | Unchanged; shown on first and saved applications |
| `EditTripApplicationView` | Profile box already has no field list and is re-checked after a profile save; the page is always a saved application |
| `PersonProfileFields` (`health-only`, both application screens) | Profile health answers shown as plain text lines (for example "Have allergies? Yes", "Allergies description: Peanuts", "Spanish: Basic; medical terminology: No"), not input fields, with the language answers under a **Language** heading; no **Add language** / **Remove**; at the top, "If your contact information or other personal information has changed, please update your profile. Your health and language information below comes from your profile." with **Update profile**, then the **Health information** heading just above **Have allergies?**; then a **Current Health** heading and the editable pregnancy questions |
| Application save (both screens) | Saves the application only; no profile update |

---

## Data Model Requirements

No schema changes.

---

## Acceptance Criteria (Gherkin)

### US-47.1 — Short incomplete-profile box

#### Scenario: Incomplete-profile box shows the message and button without a field list
* **Given** my profile is not complete
* **When** I open the Apply dialog for a trip
* **Then** I see "Your profile needs to be completed before this application can be submitted."
* **And** I see the **Update profile** button
* **And** the missing profile fields are not listed

#### Scenario: Saving the profile from the application re-checks the profile
* **Given** my profile is not complete
* **And** I see the incomplete-profile box on the Apply dialog
* **When** I click **Update profile**, complete my profile, and save
* **Then** the profile dialog closes
* **And** the incomplete-profile box is no longer shown

### US-47.2 — No missing-items list on a first application

#### Scenario: First application does not show the missing-items checklist
* **Given** I have no saved application for the trip
* **And** I can edit and at least one role is available
* **When** I open the Apply dialog
* **Then** I do not see "Complete the following to submit your application:"
* **And** I see the **Save Incomplete Application** button

#### Scenario: Saved incomplete application shows the missing-items checklist
* **Given** I have a saved incomplete application for the trip
* **When** I open the Apply dialog for that trip
* **Then** I see "Complete the following to submit your application:"
* **And** it lists the items still needed to submit

#### Scenario: First application still shows why it cannot be saved
* **Given** I have no saved application for the trip
* **And** the trip has no roles with available positions
* **When** I open the Apply dialog
* **Then** I see "This application cannot be saved or submitted yet:"
* **And** it lists "There are no trip roles with available positions."

### US-47.3 — Profile health answers are display-only on the application

#### Scenario: Profile health answers are display-only on the application
* **Given** my profile says I have allergies, described as "Peanuts", and I speak Spanish
* **When** I open the Apply dialog
* **Then** I see "Have allergies? Yes", "Allergies description: Peanuts", "Take medication? No", "Do you speak a language other than English? Yes", and a line for Spanish with its fluency and medical terminology answer
* **And** they are shown as text, not as fields I can change
* **And** I do not see **Add language** or **Remove**
* **And** above the answers I see "If your contact information or other personal information has changed, please update your profile. Your health and language information below comes from your profile." with an **Update profile** button

#### Scenario: Update profile in the health section opens the profile
* **Given** I am on the Apply dialog
* **When** I click **Update profile** in the health section
* **Then** the profile dialog opens

#### Scenario: Pregnancy questions stay editable on the application
* **Given** my profile gender is Female
* **And** I can edit the application
* **When** I open the Apply dialog
* **Then** I can answer **Are you pregnant?**

#### Scenario: Pregnancy question appears below the language question
* **Given** my profile gender is Female, I take medication, and I speak Spanish
* **When** I open the Apply dialog
* **Then** **Are you pregnant?** appears below **Take medication?**, **Medical conditions**, **Do you speak a language other than English?**, and the Spanish line
* **And** it is under a **Current Health** heading
* **And** the language answers are under a **Language** heading below the medical answers

#### Scenario: Saving the application does not update the profile
* **Given** I am applying to a trip and have chosen a role
* **When** I click **Save Incomplete Application**
* **Then** the application is saved
* **And** my profile is not updated

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-47.1 | Incomplete-profile box shows the message and button without a field list | `frontend/tests/ApplyTripDialog.test.js` | `Incomplete-profile box shows the message and button without a field list` |
| US-47.1 | Saving the profile from the application re-checks the profile | `frontend/tests/ApplyTripDialog.test.js` | `Saving the profile from the application re-checks the profile` |
| US-47.2 | First application does not show the missing-items checklist | `frontend/tests/ApplyTripDialog.test.js` | `First application does not show the missing-items checklist` |
| US-47.2 | Saved incomplete application shows the missing-items checklist | `frontend/tests/ApplyTripDialog.test.js` | `Saved incomplete application shows the missing-items checklist` |
| US-47.2 | First application still shows why it cannot be saved | `frontend/tests/ApplyTripDialog.test.js` | `First application still shows why it cannot be saved` |
| US-47.3 | Profile health answers are display-only on the application | `frontend/tests/PersonProfileFields.test.js` | `Profile health answers are display-only on the application` |
| US-47.3 | Update profile in the health section opens the profile | `frontend/tests/ApplyTripDialog.test.js` | `Update profile in the health section opens the profile` |
| US-47.3 | Pregnancy questions stay editable on the application | `frontend/tests/PersonProfileFields.test.js` | `Pregnancy questions stay editable on the application` |
| US-47.3 | Pregnancy question appears below the language question | `frontend/tests/PersonProfileFields.test.js` | `Pregnancy question appears below the language question` |
| US-47.3 | Saving the application does not update the profile | `frontend/tests/ApplyTripDialog.test.js` | `Saving the application does not update the profile` |

---

## Agent implementation request

```text
Implement Feature 47 from @features/feature-47-simplify-application-warnings.md on branch `feature/47-simplify-application-warnings`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run frontend tests before finishing.
Update @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (apply dialog: incomplete-profile box without a field list; checklist hidden on a first application; profile health answers display-only on the application)

---

## Definition of Done

*   [x] Incomplete-profile box without a field list (**FR-001**)
*   [x] Checklist hidden on a first application and shown on a saved one (**FR-002**, **FR-003**)
*   [x] Blocker alert and profile box still shown on a first application (**FR-004**, **FR-005**)
*   [x] Profile re-checked after saving it from **Update profile** (**FR-006**)
*   [x] Profile health answers display-only on the application, with **Update profile**; profile answers as plain text; pregnancy editable and below the language question; application save does not update the profile (**FR-007**–**FR-011**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] Frontend tests green
*   [ ] On `feature/47-simplify-application-warnings`; PR → `dev`

---

## Out of Scope

- Changing what counts as a complete profile or a complete application
- Keeping the dialog open after saving
- The mid-form required-document warning
- Staff View and Approve application dialogs
