# Feature: Days Before and After the Trip

**Feature ID:** 78
**Branch pattern:** `feature/78-days-before-after-trip`
**Status:** Implemented
**Created:** 2026-10-23
**Input:** "add a feature that adds days before and days after trip to trip addon expenses. These would indicate that a participant arrived this number of days before or after the trip. In the set of trip addons selected by a participant there can be only one with days before and one with days after and in the set of trip addon expenses there can be only one added with days before value and days after value."

Clarified with the requester:
- Both **trip options** (Feature 6, chosen by participants on their application) and **add-on expenses** (Feature 74, entered by staff) get **Days before** and **Days after**.
- One item may carry both a Days before and a Days after value.
- The one-each limit applies within each list separately: a participant's selected trip options have at most one with Days before and one with Days after; an application's add-on expenses likewise.
- Days from a selected trip option and from an add-on expense **add together**.
- Show each participant's **arrival** and **departure** dates (trip start minus days before, trip end plus days after) in the participant's **My Trip Info** and as **Arrives** and **Departs** columns in the **View Trip** participant list.
- Follow-up request: "also add the {{}} implementation for email token for PARTICIPANT_ARRIVAL_DATE and PARTICIPANT_DEPARTURE_DATE" — the two dates become email token value sources with seeded tokens.

**Depends on:**
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md)
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md)
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md)
- [Feature 61 — Trip Page My Travel Details](feature-61-trip-page-my-travel-details.md)
- [Feature 74 — Trip Add-on Expenses](feature-74-trip-addon-expenses.md)

---

## User Stories

### US-78.1: Staff set days on trip options
**As an** Org Admin or System Admin  
**I want** to give a trip option a number of days before and after the trip  
**So that** options like "Arrive early" record how many extra days they add

**Priority:** P1  
**Independent test:** In Edit trip, give the option "Arrive early" **Days before** 2 and save → reopening shows 2  
**Acceptance scenarios:** see ### US-78.1

### US-78.2: Participants choose at most one early and one late option
**As a** participant applying for a trip  
**I want** the application to stop me choosing two options that both add days before (or after) the trip  
**So that** my arrival and departure are clear

**Priority:** P1  
**Independent test:** On a trip whose Trip Option 1 has "Arrive early" (2 days before) and Trip Option 2 has "Extra early night" (1 day before), choosing both → "Choose only one trip option with days before the trip."  
**Acceptance scenarios:** see ### US-78.2

### US-78.3: Staff set days on add-on expenses
**As** trip staff editing a participant  
**I want** to give an add-on expense days before and after the trip  
**So that** an extra hotel night or late return is recorded with its cost

**Priority:** P1  
**Independent test:** In the participant **Edit** dialog, add "Extra hotel night" $80 with **Days after** 1 and save → reopening shows it; adding a second expense with days after → "Only one add-on expense can have days after the trip."  
**Acceptance scenarios:** see ### US-78.3

### US-78.4: See each participant's arrival and departure dates
**As** a participant, and as trip staff  
**I want** to see the participant's arrival and departure dates  
**So that** everyone knows who arrives early or leaves late

**Priority:** P1  
**Independent test:** A June 10–17 trip; Ana picked "Arrive early" (2 days before) and staff added "Extra hotel night" (1 day before, 1 day after) → View Trip shows Ana **Arrives** 06/07/2026 and **Departs** 06/18/2026, and her **My Trip Info** shows the same  
**Acceptance scenarios:** see ### US-78.4

### US-78.5: Put arrival and departure dates in emails
**As** trip staff writing email templates  
**I want** `{{PARTICIPANT_ARRIVAL_DATE}}` and `{{PARTICIPANT_DEPARTURE_DATE}}` tokens  
**So that** emails tell each participant their own arrival and departure dates

**Priority:** P2  
**Independent test:** A template body "You arrive {{PARTICIPANT_ARRIVAL_DATE}} and leave {{PARTICIPANT_DEPARTURE_DATE}}." previewed for Ana → "You arrive June 7, 2026 and leave June 18, 2026."  
**Acceptance scenarios:** see ### US-78.5

---

## Requirements

### Functional Requirements

**Days values**

- **FR-001**: Trip options and add-on expenses each have **Days before** and **Days after**: whole numbers from 0 to 365, default 0 (0 or blank means none). One item may have both. Any other value → `400` "Days before and after must be whole numbers from 0 to 365.".
- **FR-002**: The trip options section of **Edit trip** shows **Days before** and **Days after** for each option (adding and editing). Copying a trip copies them with the options.
- **FR-003**: The participant **Edit** dialog's **Add-on expenses** rows (Feature 74) show **Days before** and **Days after** after **Cost**. Rows are still saved as a whole list.

**One-each limits**

- **FR-004**: A participant's selected trip options (apply and application edit) may include at most one option with Days before above 0 and at most one with Days after above 0 (one option may be both). Otherwise `400` "Choose only one trip option with days before the trip." / "Choose only one trip option with days after the trip." and nothing is saved. The application form shows the same message before sending.
- **FR-005**: An application's add-on expenses may include at most one with Days before above 0 and at most one with Days after above 0 (one expense may be both). Otherwise `400` "Only one add-on expense can have days before the trip." / "Only one add-on expense can have days after the trip." and nothing is saved. The **Edit** dialog shows the same message before saving.
- **FR-006**: Staff editing trip options later never changes saved applications; the FR-004 check runs when the participant next saves their application.

**Arrival and departure**

- **FR-007**: A participant's **days before** = Days before of their selected trip options plus Days before of their add-on expenses; **days after** likewise. **Arrival date** = trip start date minus days before; **departure date** = trip end date plus days after. A missing trip start (end) date → no arrival (departure) date.
- **FR-008**: The **View Trip** participant list shows **Arrives** and **Departs** columns (after **Status**), `MM/dd/yyyy` or "—". A date moved by days shows an info icon; on hover it lists each trip option and add-on expense that moved it, as `Trip option: <description>` or `Add-on: <description>` with "N day(s) before" / "N day(s) after" (options by set, then add-ons in entry order).
- **FR-009**: **My Trip Info** (incomplete, applied, or approved; Feature 61) shows **Arrive** and **Depart** with the participant's dates, when the trip has the date.

**Email tokens**

- **FR-010**: Two new email token value sources: `participant.arrivalDate` "Participant arrival date" and `participant.departureDate` "Participant departure date". Their values are the FR-007 dates of the participant's earliest assignment on the trip (as the Feature 52 financial tokens), formatted like the trip date tokens (e.g. "June 7, 2026"); empty when there is no participant, no trip, or no trip date.
- **FR-011**: Seeded tokens `PARTICIPANT_ARRIVAL_DATE` → `participant.arrivalDate` and `PARTICIPANT_DEPARTURE_DATE` → `participant.departureDate` (added when missing). They work in every place tokens fill (Subject, Email body, previews, and every template email).

---

## Assumptions

- Days values do not change any cost; trip option prices and add-on costs stay as entered.
- The roster and **My Trip Info** compute dates from the stored days at read time (nothing extra is stored).
- Trip dates are calendar dates (`DATEONLY`); no time zones are involved.

## Edge Cases

- A selected option with Days before 2 and Days after 1 is both the one early and the one late option.
- Two options with Days before in the **same** trip option set can never both be chosen (one per set already); the limit matters across sets.
- A participant whose saved selection breaks FR-004 (because staff added days to options later) still shows dates using every selected option; their next application save asks them to fix it.
- No selected days and no add-on days → **Arrives** = trip start and **Departs** = trip end.
- Blank Days before on an add-on row → saved as 0.

## Success Criteria

- **SC-001**: Arrival and departure dates on View Trip and My Trip Info always match FR-007.
- **SC-002**: No saved application ever gains a second early or late trip option or add-on expense through the API.
- **SC-003**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No new access rules. Trip options stay editable by Org Admins and System Admin of the trip's organization (Feature 6); add-on expenses stay editable by trip staff (Feature 74); arrival and departure dates are shown only where the participant's application already is (View Trip for trip staff, My Trip Info for the participant).

---

## Key Entities

- **Trip option** (`tripTravelOption`) — adds `daysBefore`, `daysAfter`
- **Add-on expense** (`tripPeopleRoleExpense`) — adds `daysBefore`, `daysAfter`

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `GET` / `POST` / `PUT` | `/trips/trip-travel-options`, `/trips/trip-travel-options/:id` | as today | Options include `daysBefore`, `daysAfter`; create and update accept them (FR-001) |
| `POST` / `PUT` | `/trips/trips/browse/:id/apply`, `/trips/trips/browse/:id/application` | as today | `400` per FR-004 |
| `PUT` | `/trips/trip-people-roles/:id` | as today | `addonExpenses` rows accept `daysBefore`, `daysAfter`; `400` per FR-001 / FR-005 |
| `GET` | `/trips/trip-people-roles` (roster), `/trips/trip-people-roles/:id` | as today | `addonExpenses` rows include `daysBefore`, `daysAfter`; roster rows add `arrivalDate`, `departureDate` (`YYYY-MM-DD` or `null`) and `arrivalAdjustments`, `departureAdjustments` (`[{ type: "option" \| "addon", description, days }]`, empty when the date is not moved or missing) |
| `GET` | `/trips/trips/browse/:id` | as today | `myTripInfo` adds `arrivalDate`, `departureDate`; `addonExpenses` rows include `daysBefore`, `daysAfter` |
| `POST` | `/trips/trips/:id/copy` | as today | Copied options keep `daysBefore`, `daysAfter` |
| `GET` | `/trips/email-tokens/value-sources` | as today | Adds `participant.arrivalDate`, `participant.departureDate` (FR-010) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Edit trip** trip options section (`EditTripDialog`) | **Days before** and **Days after** per option (FR-002) |
| Application form trip options (`TripApplicationTravelOptions`) | FR-004 message before sending |
| Participant **Edit** dialog (`EditTripParticipantDialog`) | **Days before** and **Days after** per add-on row; FR-005 message (FR-003) |
| **View Trip** participant list (`TripView`) | **Arrives** and **Departs** columns (FR-008) |
| **My Trip Info** (`MyTripTravelDetails`) | **Arrive** and **Depart** (FR-009) |

---

## Data Model Requirements

| Table | Change |
|-------|--------|
| `tripTravelOptions` | Add `daysBefore` INTEGER NOT NULL DEFAULT 0, `daysAfter` INTEGER NOT NULL DEFAULT 0 (`ensureSchema`) |
| `tripPeopleRoleExpenses` | Add `daysBefore` INTEGER NOT NULL DEFAULT 0, `daysAfter` INTEGER NOT NULL DEFAULT 0 (`ensureSchema`) |
| `emailTokens` (seed) | Add `PARTICIPANT_ARRIVAL_DATE` and `PARTICIPANT_DEPARTURE_DATE` when missing (FR-011) |

---

## Acceptance Criteria (Gherkin)

Background: Org Admin Omar runs "Hope Missions"; trip "Guatemala Clinic" runs 2026-06-10 to 2026-06-17 with Trip Option 1 "Arrive early" (2 days before) and "Arrive on time", and Trip Option 2 "Extra early night" (1 day before) and "No extra night". Ana is an approved Trip Participant.

### US-78.1 — Staff set days on trip options

#### Scenario: Trip options save days before and after
* **When** Omar saves "Arrive early" with Days before 2 and Days after 1
* **Then** the trip's options return "Arrive early" with `daysBefore` 2 and `daysAfter` 1
* **And** saving Days before -1 or 2.5 → `400` "Days before and after must be whole numbers from 0 to 365."

#### Scenario: Edit trip shows days on trip options
* **Given** Edit trip is open for "Guatemala Clinic"
* **Then** "Arrive early" shows **Days before** 2 and **Days after** 0

### US-78.2 — Participants choose at most one early and one late option

#### Scenario: Only one trip option with days before or after
* **When** Ana saves her application choosing "Arrive early" and "Extra early night"
* **Then** the response is `400` "Choose only one trip option with days before the trip." and her selection is unchanged
* **And** choosing "Arrive early" and "No extra night" saves

### US-78.3 — Staff set days on add-on expenses

#### Scenario: Only one add-on expense with days before or after
* **When** Omar saves Ana's add-on expenses "Extra hotel night" $80 (1 day before, 1 day after) and "Late checkout" $20 (1 day after)
* **Then** the response is `400` "Only one add-on expense can have days after the trip." and nothing is saved
* **And** saving only "Extra hotel night" returns it with `daysBefore` 1 and `daysAfter` 1

#### Scenario: Edit dialog saves days on an add-on expense
* **Given** Ana's **Edit** dialog is open
* **When** I add "Extra hotel night", Cost 80, Days after 1, and save
* **Then** the saved add-on expenses include "Extra hotel night" with `daysAfter` 1

### US-78.4 — See each participant's arrival and departure dates

#### Scenario: Arrival and departure add days from options and expenses
* **Given** Ana chose "Arrive early" and has the add-on "Extra hotel night" (1 day before, 1 day after)
* **Then** the roster gives Ana `arrivalDate` 2026-06-07 and `departureDate` 2026-06-18
* **And** her `arrivalAdjustments` are "Arrive early" (option, 2) and "Extra hotel night" (add-on, 1), and her `departureAdjustments` are "Extra hotel night" (add-on, 1)
* **And** Ana's `myTripInfo` gives the same dates
* **And** a participant with no days gives 2026-06-10 and 2026-06-17

#### Scenario: View Trip shows Arrives and Departs
* **Given** the roster gives Ana 2026-06-07 and 2026-06-18
* **Then** her row shows **Arrives** 06/07/2026 and **Departs** 06/18/2026
* **And** hovering the **Arrives** info icon lists "Trip option: Arrive early — 2 days before" and "Add-on: Extra hotel night — 1 day before", and the **Departs** icon lists "Add-on: Extra hotel night — 1 day after"
* **And** a participant whose dates are not moved shows no info icon

#### Scenario: My Trip Info shows my arrival and departure
* **Given** Ana's `myTripInfo` has 2026-06-07 and 2026-06-18
* **Then** **My Trip Info** shows **Arrive** 06/07/2026 and **Depart** 06/18/2026

### US-78.5 — Put arrival and departure dates in emails

#### Scenario: Arrival and departure date tokens
* **Given** Ana chose "Arrive early" and has the add-on "Extra hotel night" (1 day before, 1 day after)
* **When** Omar previews "You arrive {{PARTICIPANT_ARRIVAL_DATE}} and leave {{PARTICIPANT_DEPARTURE_DATE}}." for Ana
* **Then** the body is "You arrive June 7, 2026 and leave June 18, 2026."
* **And** the value sources list includes "Participant arrival date" and "Participant departure date", and the seeded tokens exist

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-78.1 | Trip options save days before and after | `backend/tests/days-before-after-trip.test.js` | `Trip options save days before and after` |
| US-78.1 | Edit trip shows days on trip options | `frontend/tests/EditTripDialog.test.js` | `Edit trip shows days on trip options` |
| US-78.2 | Only one trip option with days before or after | `backend/tests/days-before-after-trip.test.js` | `Only one trip option with days before or after` |
| US-78.3 | Only one add-on expense with days before or after | `backend/tests/days-before-after-trip.test.js` | `Only one add-on expense with days before or after` |
| US-78.3 | Edit dialog saves days on an add-on expense | `frontend/tests/EditTripParticipantDialog.test.js` | `Edit dialog saves days on an add-on expense` |
| US-78.4 | Arrival and departure add days from options and expenses | `backend/tests/days-before-after-trip.test.js` | `Arrival and departure add days from options and expenses` |
| US-78.4 | View Trip shows Arrives and Departs | `frontend/tests/TripView.test.js` | `View Trip shows Arrives and Departs` |
| US-78.4 | My Trip Info shows my arrival and departure | `frontend/tests/MyTripTravelDetails.test.js` | `My Trip Info shows my arrival and departure` |
| US-78.5 | Arrival and departure date tokens | `backend/tests/days-before-after-trip.test.js` | `Arrival and departure date tokens` |

---

## Agent implementation request

```text
Implement Feature 78 from @features/feature-78-days-before-after-trip.md on branch `feature/78-days-before-after-trip`.

Follow layer order in @features/framework.md.
Data: add daysBefore / daysAfter (INTEGER NOT NULL DEFAULT 0) to tripTravelOption and tripPeopleRoleExpense via ensureSchema and the models.
Backend: validate FR-001 on trip-travel-options create/update and on addonExpenses rows; FR-004 on browse apply / application update; FR-005 on PUT trip-people-roles; copy trip keeps the days; a shared helper computes arrivalDate / departureDate (FR-007) for the roster rows, myTripInfo, and the new participant.arrivalDate / participant.departureDate token value sources (FR-010); seed PARTICIPANT_ARRIVAL_DATE and PARTICIPANT_DEPARTURE_DATE in seedEmailTokens (FR-011).
Frontend: Days before / Days after in EditTripDialog trip options and EditTripParticipantDialog add-on rows (with the FR-005 message); FR-004 message in the application trip options validation; Arrives / Departs columns in TripView; Arrive / Depart in MyTripTravelDetails.
Update features/reference (data-model, api, behavior).
```

---

## Definition of Done

*   [x] Days values on trip options and add-on expenses per **FR-001**–**FR-003**
*   [x] One-each limits per **FR-004**–**FR-006**
*   [x] Arrival and departure dates per **FR-007**–**FR-009**
*   [x] Arrival and departure email tokens per **FR-010**–**FR-011**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/data-model.md`, `api.md`, and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Changing costs from days (no automatic per-night pricing)
- Email tokens for days before or days after (only the dates get tokens)
- Showing the dates on the Trip Status board, rooming list, flights, or PDFs
- Checking arrival and departure against flight or rooming dates
