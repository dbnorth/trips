# Feature: Negative Trip Days and Wider Option Descriptions

**Feature ID:** 89
**Branch pattern:** `feature/89-negative-trip-days`
**Status:** Implemented
**Created:** 2026-10-27
**Input:** "write a spec for trip edit that allows negative changes to option arrival and departure days. and make the trip addon description display wider"

Clarified with the requester:
- **Days before** and **Days after** (Feature 78) may be negative on **trip options** (Edit trip) and on **add-on expenses** (the participant **Edit** dialog on View Trip). A negative number moves the date the other way: Days after −1 means the participant leaves a day before the trip ends (e.g. a "Depart Friday" option), Days before −1 means they arrive a day after it starts.
- "Description display wider" is the **Description** of each travel option in the **Edit trip** dialog's travel options table and in **Add travel option**. Long descriptions such as "Depart Saturday - stay Friday night in Antigua and depart Saturday" are cut off today.

**Depends on:**
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md) (travel options in Edit trip)
- [Feature 74 — Trip Add-on Expenses](feature-74-trip-addon-expenses.md) (add-on expenses in the participant Edit dialog)
- [Feature 78 — Days Before and After the Trip](feature-78-days-before-after-trip.md) (days, arrival and departure dates, one-each limit)

---

## User Stories

### US-89.1: Staff give days that shorten the trip

**As** staff editing a trip or a participant
**I want** to enter negative Days before and Days after
**So that** options like "Depart Friday" give the participant an earlier departure (or later arrival) date

**Acceptance:** see Gherkin scenarios under US-89.1.

### US-89.2: Travel option descriptions are readable in Edit trip

**As** staff editing a trip
**I want** the travel option Description field wide enough to read long descriptions
**So that** I can check and edit them without scrolling inside the field

**Acceptance:** see Gherkin scenarios under US-89.2.

---

## Requirements

### Functional Requirements

**Negative days**

- **FR-001**: **Days before** and **Days after** on trip options and add-on expenses are whole numbers from **−365 to 365** (blank → 0). Anything else is refused with "Days before and after must be whole numbers from -365 to 365." This replaces the Feature 78 range of 0–365 and its message everywhere it is checked: **Edit trip** (travel option rows and **Add travel option**), the participant **Edit** dialog add-on rows, and the API (`POST` / `PUT /trips/trip-travel-options`, `PUT /trips/trip-people-roles/:id`).
- **FR-002**: Arrival and departure dates (Feature 78) add negative days the same way: **arrival** = trip start − (days before of selected options + add-on expenses), **departure** = trip end + (days after likewise). Days before −1 gives an arrival one day after the trip start; Days after −1 gives a departure one day before the trip end. This applies to the **Arrives** / **Departs** columns on View Trip, **My Trip Info**, and the `{{PARTICIPANT_ARRIVAL_DATE}}` / `{{PARTICIPANT_DEPARTURE_DATE}}` tokens.
- **FR-003**: The Feature 78 one-each limit counts every item whose days are **not 0** (instead of above 0): a participant's selected trip options may include at most one with days before and one with days after, and an application's add-on expenses likewise, with the existing messages. This covers the application form, apply, application edit, the participant **Edit** dialog, the API, and the Trip Master import (Feature 80 FR-022).
- **FR-004**: The **Arrives** / **Departs** info icon hover lists every item with days that aren't 0. Positive days show as now ("2 days before" / "1 day after"). Negative days show which way the date moved: Days before −1 → "1 day later", Days after −2 → "2 days earlier".
- **FR-005**: Days never change any cost (unchanged from Feature 78). Saved applications and copied trips keep negative days like any other value.

**Wider descriptions**

- **FR-006**: The **Edit trip** dialog is up to **1000px** wide (from 760px). In its travel options table the **Description** column is at least **360px** wide, and the **Add travel option** Description field is at least **360px** wide. Set #, Price adjustment, Days before, Days after, and Remove keep their widths. On a screen too narrow for the table, the table scrolls sideways instead of squeezing the Description.

---

## Assumptions

- The range is symmetric (−365 to 365); nothing checks that the arrival stays before the departure. A trip of Saturday to Saturday with Days after −7 gives a departure on the start date, shown as entered.
- Negative days are entered with a leading minus ("-1"). The fields stay plain numeric text fields; no stepper is added.
- Only the travel option Description in Edit trip is widened; other Edit trip sections just get the extra dialog width.

## Edge Cases

- Days before −1 on a trip option and Days before 2 on an add-on expense → arrival is trip start − 1 (they add together, as in Feature 78).
- Two selected trip options, one with Days after −1 and one with Days after 1 → "Choose only one trip option with days after the trip."
- "-0" → treated as 0.
- "1.5", "-366", "abc" → the FR-001 message; nothing is saved.
- No trip start (end) date → no arrival (departure) date, as in Feature 78.

## Success Criteria

- **SC-001**: Staff can give "Depart Friday" Days after −1 and its participants show a departure one day before the trip ends, in View Trip, My Trip Info, and emails.
- **SC-002**: A 66-character travel option description is fully visible in the Edit trip Description field on a desktop screen.
- **SC-003**: Automated tests for every scenario below pass, and existing Feature 78 tests pass with the new message.

---

## Data Ownership & Isolation

No change. Trip options and add-on expenses are edited by the same users as before (Features 6, 74).

---

## Key Entities

- **tripTravelOption** — `daysBefore`, `daysAfter` now −365 to 365.
- **tripPeopleRoleExpense** — `daysBefore`, `daysAfter` now −365 to 365.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/trips/trip-travel-options` | `daysBefore` / `daysAfter` accept −365 to 365; otherwise `400` "Days before and after must be whole numbers from -365 to 365." |
| `PUT` | `/trips/trip-travel-options/:id` | Same as create |
| `PUT` | `/trips/trip-people-roles/:id` | `addonExpenses[].daysBefore` / `daysAfter` as above; the one-each limit counts days that aren't 0 |
| `POST` | `/trips/trips/browse/:id/apply` (and application edit) | The one-each limit counts selected options with days that aren't 0 |
| `GET` | `/trips/trip-people-roles` | `arrivalDate` / `departureDate` include negative days; `arrivalAdjustments` / `departureAdjustments` list items with days that aren't 0 (negative `days` kept as negative numbers) |

---

## Screen Requirements

- **Edit trip** → travel options: Days before / Days after accept "-1"; dialog up to 1000px; Description column and Add travel option Description at least 360px (FR-006).
- **View Trip** → participant **Edit** dialog: add-on Days before / Days after accept "-1".
- **View Trip** → **Arrives** / **Departs** hover: negative days as "N day(s) later" / "N day(s) earlier" (FR-004).

---

## Data Model Requirements

None. `daysBefore` / `daysAfter` are already signed `INTEGER` columns; only the allowed range changes.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions"; Org Admin Omar; trip "Clinica Ezell Hospital - January 2027" from 2027-01-16 to 2027-01-23 with Trip Option 4 "Antigua Trip - stay Friday night" and "Depart Friday".
- Ana is an approved Trip Participant on the trip.

### US-89.1 — Staff give days that shorten the trip

#### Scenario: A trip option takes negative days
* **When** Omar sets "Depart Friday" to Days after "-1" in **Edit trip** and saves
* **Then** the option is saved with Days after −1
* **And** when Omar enters Days after "-366" the dialog says "Days before and after must be whole numbers from -365 to 365." and nothing is saved

#### Scenario: Negative days move arrival and departure the other way
* **Given** Ana has "Depart Friday" (Days after −1) selected and an add-on expense "Late arrival" with Days before −1
* **Then** View Trip shows Ana **Arrives** 01/17/2027 and **Departs** 01/22/2027
* **And** the **Departs** hover lists "Trip option: Depart Friday — 1 day earlier" and the **Arrives** hover lists "Add-on: Late arrival — 1 day later"
* **And** `{{PARTICIPANT_DEPARTURE_DATE}}` for Ana is "January 22, 2027"

#### Scenario: An add-on expense takes negative days
* **When** Omar adds Ana's add-on expense "Late arrival", cost $0, Days before "-1" in the participant **Edit** dialog and saves
* **Then** the expense is saved with Days before −1

#### Scenario: Negative days count toward the one-each limit
* **Given** the trip also has Trip Option 5 "Volcano hike" with Days after 1
* **When** Ana applies with "Depart Friday" (Days after −1) and "Volcano hike" selected
* **Then** she sees "Choose only one trip option with days after the trip." and nothing is saved
* **And** two of Ana's add-on expenses with Days before −1 and 2 are refused with "Only one add-on expense can have days before the trip."

### US-89.2 — Travel option descriptions are readable in Edit trip

#### Scenario: The travel option Description is wide
* **When** Omar opens **Edit trip**
* **Then** the dialog is up to 1000px wide
* **And** the travel options Description column and the Add travel option Description field are at least 360px wide

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-89.1 | A trip option takes negative days | `backend/tests/negative-trip-days.test.js` | `A trip option takes negative days` |
| US-89.1 | A trip option takes negative days | `frontend/tests/EditTripDialog.test.js` | `Travel option days accept negative numbers` |
| US-89.1 | Negative days move arrival and departure the other way | `backend/tests/negative-trip-days.test.js` | `Negative days move arrival and departure the other way` |
| US-89.1 | Negative days move arrival and departure the other way | `frontend/tests/TripView.test.js` | `Negative days show later and earlier` |
| US-89.1 | An add-on expense takes negative days | `backend/tests/negative-trip-days.test.js` | `An add-on expense takes negative days` |
| US-89.1 | An add-on expense takes negative days | `frontend/tests/EditTripParticipantDialog.test.js` | `Add-on days accept negative numbers` |
| US-89.1 | Negative days count toward the one-each limit | `backend/tests/negative-trip-days.test.js` | `Negative days count toward the one-each limit` |
| US-89.1 | Negative days count toward the one-each limit | `frontend/tests/ApplyTripDialog.test.js` | `Negative option days count toward the one-each limit` |
| US-89.2 | The travel option Description is wide | `frontend/tests/EditTripDialog.test.js` | `The travel option Description is wide` |

---

## Agent implementation request

```text
Implement Feature 89 from @features/feature-89-negative-trip-days.md on branch `feature/89-negative-trip-days`.

Backend: backend/app/utils/tripDays.js — parseDays accepts -365..365 with the new DAYS_MESSAGE; daysLimitMessage and adjustments count days !== 0. Frontend: frontend/src/utils/tripDays.js (same range and message), tripApplicationForm.js travelOptionDaysError and EditTripParticipantDialog limit checks count days !== 0; TripDateAdjustment shows negative days as "N day(s) later" (before) / "N day(s) earlier" (after); EditTripDialog max-width 1000, travel option Description column and Add travel option Description min-width 360px, table scrolls sideways when narrow.
Tests per the Test Coverage Map; update existing Feature 78 tests for the new message. Update features/reference/behavior.md, api.md, and data-model.md (range).
```

---

## Definition of Done

*   [x] Range −365 to 365 per **FR-001**
*   [x] Dates and tokens per **FR-002**
*   [x] One-each limit per **FR-003**
*   [x] Hover wording per **FR-004**
*   [x] Edit trip widths per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Checking that arrival stays before departure
- Widening add-on expense descriptions in the participant Edit dialog, or other Edit trip fields
- Changing costs from days
- Days on anything other than trip options and add-on expenses
