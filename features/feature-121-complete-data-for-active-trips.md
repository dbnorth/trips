# Complete Data for Active Trips

**Feature ID:** 121
**Branch pattern:** `feature/121-complete-data-for-active-trips`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** "Make it so once participant is pre-accepted or accepted they can't save applicant or profile with missing data (except document). Until they are not on an active trip (mean Pre Approve or Approved on a trip that the return date has not passed)."

Today a person whose application is **Pre-Approved** or **Approved** can still blank out profile information (phone, address, emergency contact, …) and save it, and a Pre-Approved participant who saves their application with an answer missing is silently dropped back to **Incomplete**. Staff then find gaps in data they already accepted. This feature keeps that data complete while the person is on an **active trip**: profile saves and Pre-Approved application saves that would leave required information missing are refused with a message listing what is missing. Documents are not part of this check.

## Clarifications

### Session 2026-11-06

- Q: Which "return date" ends the lock? → A: The trip's end date. The trip stays active through its end date.
- Q: Who is blocked from saving missing data? → A: Everyone saving that person's profile or application: the participant and trip / organization staff (Edit person, the trip page's participant **Edit**).
- Q: Do Trip Leaders count as being on an active trip? → A: Yes. A Pre-Approved or Approved Trip Leader row locks the person's profile like a Trip Participant row.

**Depends on:**
- [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md) (profile / Edit person save)
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md) (applications, staff participant edit)
- [Feature 17 — Org Medical Conditions](feature-17-org-medical-conditions.md) / [Feature 20 — Person Middle Name](feature-20-person-middle-name.md) / [Feature 32 — Emergency Contact Relationship](feature-32-emergency-contact-relationship.md) (profile completeness)
- [Feature 27 — Application Submit Unavailable Info](feature-27-application-submit-unavailable-info.md) (application missing-item checklist)
- [Feature 104 — Pre-Approved and Document Review](feature-104-pre-approved-document-review.md) (**Pre-Approved** status)
- [Feature 112 — Application and Profile Status Messages](feature-112-application-profile-status-messages.md) (missing profile field labels)

---

## User Stories

### US-121.1: My profile stays complete while I'm on a trip

**As** a participant or Trip Leader who is Pre-Approved or Approved on an upcoming or current trip
**I want** my profile to refuse a save that would leave required information missing, and tell me what is missing
**So that** the trip always has my contact, emergency, and health information

**Priority:** P1
**Independent test:** Pre-Approved participant clears a required profile field and saves; the save is refused with "Missing: <field>." and nothing changes.
**Acceptance scenarios:** see ### US-121.1 under Acceptance Criteria

### US-121.2: My Pre-Approved application stays complete

**As** a Pre-Approved participant
**I want** my application to refuse a save that would leave an answer missing, instead of dropping me back to Incomplete
**So that** I don't lose my Pre-Approved status by accident

**Priority:** P1
**Independent test:** Pre-Approved participant clears a required application answer; **Update Application** is disabled with the missing item listed, and the API refuses the save.
**Acceptance scenarios:** see ### US-121.2 under Acceptance Criteria

### US-121.3: Staff edits keep accepted data complete

**As** an organization
**I want** staff edits to follow the same rule
**So that** accepted participants' data stays complete no matter who edits it

**Priority:** P1
**Independent test:** Org Admin clears a required profile field in **Edit person** for a Pre-Approved participant; the save is refused.
**Acceptance scenarios:** see ### US-121.3 under Acceptance Criteria

---

## Requirements

### Functional Requirements

#### Active trip

- **FR-001**: A person is **on an active trip** when they have a trip application (`tripPeopleRole`, any trip role: Trip Participant or Trip Leader) with status `pre_approved` or `approved` on a trip whose end date, or start date when it has no end date, is today or later (server date). A trip with neither date is not active. The trip's own status (`active` / `completed` / `inactive`) is not considered. `incomplete`, `declined`, and `cancelled` applications never make a trip active.

#### Profile

- **FR-002**: While the person is on an active trip, `PUT /trips/people/:id` (own Profile, **Edit person**, and **Update profile** from the application) MUST refuse a save after which the profile would not be complete for the organization of every active trip. "Complete" is today's profile completeness (`isProfileComplete`: the required profile fields, allergies description when allergies is Yes, the organization's medical conditions when taking medication is Yes, a complete language row when other languages is Yes). It returns `400` `{ message, missingItems }` with message "This profile is on an active trip and can't be saved with missing information. Missing: <labels>." and nothing is saved (no field, medical condition, language, email, or password change).
- **FR-003**: The missing labels are the Feature 112 profile labels in their usual order (e.g. "First name", "Phone number", "Emergency contact name", "Medical conditions", "Other languages"), each listed once even when several active trips need it.
- **FR-004**: The rule applies to every caller (the person, Trip Leader, Org Admin, System Admin). A profile that is already incomplete when the feature ships must be completed on its next save while the person is on an active trip.
- **FR-005**: The profile dialog (`EditPersonDialog`) shows the refusal message in its error alert next to **Save** and also in an error alert at the top of the dialog, under the title and outside the scrolling form so it is visible wherever the form is scrolled (there: the message's first sentence, then "Missing:" and the items as a bulleted list); the dialog stays open with the entered values. The top alert clears on the next save or reload. Other save errors show only next to **Save**, as today.
- **FR-010**: Whenever the profile dialog (`EditPersonDialog`) is open for anyone (not only people on an active trip) and the profile is incomplete, a warning alert at the top of the dialog (same place as FR-005's, outside the scrolling form) reads "Missing:" followed by the FR-003 labels in order as a bulleted list. It is computed from the form as it is being edited (medical conditions for the dialog's organization) and updates live: it shrinks as fields are filled in and disappears once nothing is missing. While FR-005's refusal alert is showing, it takes the place of this list.

#### Application

- **FR-006**: While the application is `pre_approved` and its trip is active, `PUT /trips/trips/browse/:id/application` MUST refuse a save after which any item of the application's missing-item checklist (Feature 27: "Profile is not complete", trip role, funding, roommate names, flight purchase answers, pregnancy answers, trip options, agreements and signatures) would be missing. Document items are never part of this check. It returns `400` `{ message, missingItems }` with message "This Pre-Approved application can't be saved with missing information. Missing: <labels>." and nothing is saved; the status stays **Pre-Approved**.
- **FR-007**: For a Pre-Approved application on an active trip, the Apply dialog and **Edit application** page show **Update Application** disabled while anything is missing (instead of **Save Incomplete Application**), and the existing checklist alert ("Complete the following to submit your application:") lists the missing items. Once nothing is missing, **Update Application** is enabled as today.
- **FR-008**: Applications that are `incomplete` keep today's **Save Incomplete Application**. Approved applications stay read-only for the participant (as today).

#### Staff participant edit

- **FR-009**: `PUT /trips/trip-people-roles/:id` MUST refuse a save that leaves a Trip Participant application with no trip role while the status the save keeps or sets (the requested status, else the current one) is `pre_approved` or `approved` and its trip is active: `400` "Trip role is required while the application is Pre-Approved or Approved on an active trip." and nothing is saved. Trip Leader rows may still have no worker role. The participant **Edit** dialog shows the message in its error alert.

---

## Assumptions

- The trip end date is the "return date"; a participant's own planned departure or return flight date does not change when the lock ends.
- Completeness rules are unchanged; this feature only refuses saves that would break them.
- The participant **Edit** dialog edits only the trip role among application answers, so FR-009 covers only the trip role; staff saves of rows with other gaps work as today.
- Person documents (upload, edit, delete) and the document items of any checklist are not affected.

## Edge Cases

- Trip ends today → still active; the day after → not active, and incomplete saves work again.
- Person on two active trips of different organizations → the profile must be complete for both (e.g. medical conditions for each organization when taking medication).
- Profile already incomplete from before this feature → any profile save is refused until everything listed is filled in.
- Saving only an unrelated field (e.g. city) on a complete profile → saves as usual.
- Pre-Approved participant missing a required document (e.g. Passport) → profile and application saves still work.
- Staff clear the trip role and set the status to **Declined** or **Cancelled** in the same save → allowed (no longer active).
- Cancel / Uncancel → unaffected.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No API path saves a profile or Pre-Approved application with missing non-document information while the person is on an active trip.

---

## Data Ownership & Isolation

No change to who can edit a profile or an application; the existing permission checks run first (a caller who may not edit gets `403` as today, not the missing-information message).

---

## Key Entities

- No new entities or fields. Reads `tripPeopleRole.status`, `trip.endDate` / `trip.startDate`, and the person's profile fields.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `PUT` | `/trips/people/:id` | `400` `{ message, missingItems }` when the saved profile would be incomplete while on an active trip (FR-002 – FR-004) |
| `PUT` | `/trips/trips/browse/:id/application` | `400` `{ message, missingItems }` when a Pre-Approved application on an active trip would have missing items (FR-006) |
| `PUT` | `/trips/trip-people-roles/:id` | `400` when it would leave a Pre-Approved / Approved Trip Participant on an active trip without a trip role (FR-009) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `EditPersonDialog` (Profile, Edit person, Update profile) | Shows the refusal message at the top (outside the scrolling form) and next to **Save**; stays open (FR-005). Otherwise, a live "Missing: …" warning at the top whenever the profile is incomplete (FR-010) |
| `ApplyTripDialog`, `EditTripApplicationView` | Pre-Approved + active trip: **Update Application** disabled while items are missing; checklist alert lists them (FR-007) |
| `EditTripParticipantDialog` | Shows the trip role refusal message (FR-009) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background for all scenarios: Hope Missions trip "Guatemala Clinic" runs 01/10/2027 – 01/20/2027 and today is before 01/20/2027 unless a scenario says otherwise. Pat Lee is a Trip Participant (Nurse) with a complete profile. Lena Ruiz is its Trip Leader (Approved).

### US-121.1 — My profile stays complete while I'm on a trip

#### Scenario: Profile with missing information is refused while on an active trip
* **Given** Pat's application is Pre-Approved
* **When** Pat clears **Phone number** on her profile and saves
* **Then** the API returns `400` with message "This profile is on an active trip and can't be saved with missing information. Missing: Phone number." and `missingItems` `["Phone number"]`
* **And** Pat's stored phone number is unchanged
* **And** the profile dialog shows the message at the top of the dialog and next to **Save**, and stays open

#### Scenario: A complete profile saves as usual on an active trip
* **Given** Pat's application is Approved
* **When** Pat changes her city and saves
* **Then** the save succeeds

#### Scenario: The lock ends after the trip end date
* **Given** Pat's application is Approved and today is 01/21/2027
* **When** Pat clears **Phone number** and saves
* **Then** the save succeeds

#### Scenario: Incomplete or cancelled applications don't lock the profile
* **Given** Pat's application is Incomplete (and, separately, Cancelled)
* **When** Pat clears **Phone number** and saves
* **Then** the save succeeds

#### Scenario: The profile dialog lists missing information at the top
* **Given** Pat's profile has no emergency contact relationship and no church city
* **When** Pat opens her profile
* **Then** the top of the dialog shows "Missing:" with the bullets "Emergency contact relationship" and "Current church home city"
* **And** after she enters a church city only "Emergency contact relationship" is listed
* **And** a complete profile shows no missing list

#### Scenario: Trip Leaders are locked too
* **When** Lena clears **Emergency contact name** on her profile and saves
* **Then** the API returns `400` with message "This profile is on an active trip and can't be saved with missing information. Missing: Emergency contact name."

#### Scenario: Missing documents don't block saving
* **Given** Pat's application is Pre-Approved, the trip requires a Passport, and Pat has none
* **When** Pat changes her city and saves her profile, and saves her complete application
* **Then** both saves succeed

### US-121.2 — My Pre-Approved application stays complete

#### Scenario: A Pre-Approved application with a missing answer can't be saved
* **Given** Pat's application is Pre-Approved
* **When** Pat opens **Edit application** and unticks both funding choices
* **Then** **Update Application** is disabled and the alert lists "Funding (self-fund and/or raise funds)"
* **And** `PUT /trips/trips/browse/<trip>/application` with neither funding choice returns `400` with message "This Pre-Approved application can't be saved with missing information. Missing: Funding (self-fund and/or raise funds)."
* **And** Pat's application is still Pre-Approved with its funding unchanged

#### Scenario: A complete Pre-Approved application saves as usual
* **Given** Pat's application is Pre-Approved
* **When** Pat changes her preferred roommate names and saves
* **Then** the save succeeds and the application stays Pre-Approved

#### Scenario: An Incomplete application can still be saved incomplete
* **Given** Pat's application is Incomplete
* **When** Pat saves it with funding unanswered
* **Then** **Save Incomplete Application** works as today

### US-121.3 — Staff edits keep accepted data complete

#### Scenario: Staff can't save a profile with missing information
* **Given** Pat's application is Pre-Approved
* **When** a Hope Missions Org Admin clears Pat's **Emergency contact name** in **Edit person** and saves
* **Then** the API returns `400` with message "This profile is on an active trip and can't be saved with missing information. Missing: Emergency contact name."

#### Scenario: Staff can't clear the trip role of an accepted participant
* **Given** Pat's application is Approved
* **When** Lena clears **Trip worker role** in Pat's participant **Edit** and saves
* **Then** the API returns `400` with message "Trip role is required while the application is Pre-Approved or Approved on an active trip."
* **And** Pat's trip role is unchanged

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-121.1 | Profile with missing information is refused while on an active trip | `backend/tests/complete-data-for-active-trips.test.js` | `Profile with missing information is refused while on an active trip` |
| US-121.1 | Profile with missing information is refused while on an active trip (UI) | `frontend/tests/CompleteDataForActiveTrips.test.js` | `Profile with missing information is refused while on an active trip` |
| US-121.1 | A complete profile saves as usual on an active trip | `backend/tests/complete-data-for-active-trips.test.js` | `A complete profile saves as usual on an active trip` |
| US-121.1 | The lock ends after the trip end date | `backend/tests/complete-data-for-active-trips.test.js` | `The lock ends after the trip end date` |
| US-121.1 | Incomplete or cancelled applications don't lock the profile | `backend/tests/complete-data-for-active-trips.test.js` | `Incomplete or cancelled applications don't lock the profile` |
| US-121.1 | The profile dialog lists missing information at the top | `frontend/tests/CompleteDataForActiveTrips.test.js` | `The profile dialog lists missing information at the top`, `A complete profile shows no missing list` |
| US-121.1 | Trip Leaders are locked too | `backend/tests/complete-data-for-active-trips.test.js` | `Trip Leaders are locked too` |
| US-121.1 | Missing documents don't block saving | `backend/tests/complete-data-for-active-trips.test.js` | `Missing documents don't block saving` |
| US-121.2 | A Pre-Approved application with a missing answer can't be saved | `backend/tests/complete-data-for-active-trips.test.js` | `A Pre-Approved application with a missing answer can't be saved` |
| US-121.2 | A Pre-Approved application with a missing answer can't be saved (UI) | `frontend/tests/CompleteDataForActiveTrips.test.js` | `A Pre-Approved application with a missing answer can't be saved` |
| US-121.2 | A complete Pre-Approved application saves as usual | `backend/tests/complete-data-for-active-trips.test.js` | `A complete Pre-Approved application saves as usual` |
| US-121.2 | An Incomplete application can still be saved incomplete | `frontend/tests/CompleteDataForActiveTrips.test.js` | `An Incomplete application can still be saved incomplete` |
| US-121.3 | Staff can't save a profile with missing information | `backend/tests/complete-data-for-active-trips.test.js` | `Staff can't save a profile with missing information` |
| US-121.3 | Staff can't clear the trip role of an accepted participant | `backend/tests/complete-data-for-active-trips.test.js` | `Staff can't clear the trip role of an accepted participant` |

Existing tests that save a Pre-Approved application or an on-trip person's profile with missing information (expecting the drop to Incomplete or a successful save) are updated to this feature.

---

## Agent implementation request

```text
Implement Feature 121 from @features/feature-121-complete-data-for-active-trips.md on branch `feature/121-complete-data-for-active-trips`.

Backend:
- One helper for FR-001: the organizations of a person's active trips (pre_approved / approved rows, trip end date — or start date — today or later).
- Backend profile missing labels matching frontend getMissingProfileFields (Feature 112 labels).
- person.controller update: build the profile as it would be saved; refuse per FR-002 – FR-004 before writing anything.
- tripBrowse.controller updateApplication: refuse per FR-006 (Feature 27 checklist without documents) before writing.
- tripPeopleRole.controller update: refuse per FR-009.
Frontend:
- EditPersonDialog: show the message (FR-005).
- ApplyTripDialog / EditTripApplicationView: Pre-Approved + active trip → Update Application disabled with the checklist (FR-007).
- EditTripParticipantDialog: show the message.
Tests per the Test Coverage Map. Update features/reference/ (behavior.md application status / apply rows, api.md people and application rows).
```

---

## Definition of Done

*   [x] Active trip per **FR-001**
*   [x] Profile lock per **FR-002** – **FR-005**, missing list per **FR-010**
*   [x] Pre-Approved application lock per **FR-006** – **FR-008**
*   [x] Staff trip role rule per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Requiring a complete application to **Approve** (approval still checks documents only, Feature 104).
- Person documents and any document requirement.
- Imports (Trip Master CSV) and **Add person**.
- Changing which profile or application items are required.
- Using the trip's status or a participant's own travel / flight dates to decide whether a trip is active.
