# MM/DD/YYYY Dates Everywhere

**Feature ID:** 101
**Branch pattern:** `feature/101-mm-dd-yyyy-dates`
**Status:** Draft
**Created:** 2026-10-31
**Input:** "create a spec to update all the date displays as mm/dd/yyyy throughout the UI"

Dates are shown several ways today: some screens already show `MM/DD/YYYY` (each with its own copy of the formatter), many show the stored `YYYY-MM-DD`, a few use the browser's locale (for example donation and agreement dates), email tokens write "Jan 20, 2027", the PDFs write "Jan 20, 2027" for dates, and CSV exports write raw stored values. This feature shows every date as `MM/DD/YYYY`, and every date with a time as `MM/DD/YYYY h:mm AM/PM`, on screens, in emails, in PDFs, and in CSV exports, using one shared formatter on each side (frontend and backend).

## Clarifications

### Session 2026-10-31

- Q: Where should dates become MM/DD/YYYY? → A: Everywhere: screens, PDFs, email tokens, and CSV exports.
- Q: How should values with a time be shown? → A: `MM/DD/YYYY h:mm AM/PM`.
- Q: What about date entry fields (the browser's built-in date picker)? → A: Leave them; this feature covers displayed dates only.

**Depends on:**
- [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md) (donations list, participant / donor / donation CSVs)
- [Feature 10 — Email Templates](feature-10-email-templates.md) (date tokens)
- [Feature 54 — Room List PDF](feature-54-room-list-pdf.md), [Feature 55 — Flights PDF](feature-55-flights-pdf.md), [Feature 58 — Participant Documents PDF](feature-58-participant-documents-pdf.md) (PDF dates)

---

## User Stories

### US-101.1: Dates on screens read MM/DD/YYYY

**As** anyone using the app
**I want** every date on screen written the same way, MM/DD/YYYY
**So that** I don't have to decode `2027-03-01` or a format that changes with my browser

**Acceptance:** see Gherkin scenarios under US-101.1.

### US-101.2: Emails, PDFs, and CSV files use MM/DD/YYYY

**As** staff sending emails and exporting files
**I want** the same MM/DD/YYYY dates in emails, PDFs, and CSV exports
**So that** what participants and spreadsheets see matches the screens

**Acceptance:** see Gherkin scenarios under US-101.2.

---

## Requirements

### Functional Requirements

- **FR-001**: Date format rules:
  - A **date** is written `MM/DD/YYYY` with leading zeros (March 1, 2027 → `03/01/2027`).
  - A **date with a time** is written `MM/DD/YYYY h:mm AM/PM` (January 15, 2027 2:30 PM → `01/15/2027 2:30 PM`; hour without a leading zero, minutes with two digits, a space before AM/PM).
  - A stored date-only value (`YYYY-MM-DD`) is written as that calendar day, never shifted by time zone.
  - A date range is written with the existing separator of the place it appears (e.g. `03/01/2027 – 03/10/2027` on screens, `03/01/2027 to 03/10/2027` in PDFs).
  - A blank or unreadable value shows what that place shows today for a blank value (for example "—", "–", or nothing).
- **FR-002**: The frontend has one shared date module (`frontend/src/utils/dateFormat.js`) with `formatDate` (date), `formatDateTime` (date with a time, in the browser's time zone), and `formatDateRange`. Every screen that shows a date uses it; the per-screen copies (in `Home`, `TripView`, `TripStatusView`, `TripPeopleRolesList`, `DonationsList`, `ParticipantDonationsDialog`, `MyTripTravelDetails`, `FlightSegmentsDialog`, `TripDateAdjustment`, `myTripNextActions`, `tripApplicationForm`, `ParticipantAgreementSection`, `ViewTripApplicationDialog`, `OrganizationTripsPage`, `DonorTripHeading`, and `Utils.formatDate`) are removed or replaced by it.
- **FR-003**: Every date shown on a screen follows FR-001. Values that are dates with a time today (donation date, agreement date, medical agreement date) show the date and time; the rest show the date only. Existing time-only displays (flight times such as "3:45 PM") are unchanged.
- **FR-004**: Tables that sort by a date column keep sorting in date order (by the stored value, not the displayed text).
- **FR-005**: Email date tokens (trip start and end dates, participant arrival and departure dates, the dates in participant donation lists, flight lines, and any other token that writes a date) write `MM/DD/YYYY` through the backend's shared date formatter (`formatDate` in `emailTokenValues.js`). Times in flight lines are unchanged.
- **FR-006**: The Room List, Flights, and Documents PDFs write every date as `MM/DD/YYYY` (trip dates, check-in date, passport expiration, document issue and expiration dates, specialization dates). Flight date-times keep their current form, weekday then date then time (e.g. "Saturday 01/02/2027 3:45 PM").
- **FR-007**: The participants, donors, and donations CSV exports write dates as `MM/DD/YYYY` and dates with a time as `MM/DD/YYYY h:mm AM/PM` (for example **Birthdate**, **Pregnancy Due Date**, **Agreement Date**, **Assignment Date**, donation **Date**, and document "expires" text). Times in CSV files use the server time zone setting `SCHEDULED_EMAIL_TIMEZONE` (default `America/Chicago`).
- **FR-008**: Date entry fields (the browser's built-in date and date-time pickers) and the values the app sends to and stores in the API (`YYYY-MM-DD`, ISO date-times) are unchanged. The Trip Master import still reads the dates it reads today.

---

## Assumptions

- The app's users are in the United States, so `MM/DD/YYYY` is right for everyone; no per-user date setting is added.
- Screens show times in the viewer's browser time zone, as today.

## Edge Cases

- A stored date-only value viewed from a time zone behind UTC still shows its own day (no "one day early").
- A date column sorted ascending puts `12/30/2026` before `01/02/2027`.
- A blank date in a table cell or CSV keeps today's blank text.
- Messages that already write `MM/DD/YYYY` (for example the missing-document "expiration date after …" text) are unchanged.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: A search of the frontend finds no `toLocaleDateString` / `toLocaleString` date display and no template that prints a raw stored date.

---

## Data Ownership & Isolation

No change.

---

## Key Entities

None.

---

## API Requirements

No request or response changes. CSV export contents change per FR-007.

---

## Screen Requirements

Every screen that shows a date (FR-003). Known places today, as a checklist (not exhaustive):

- **Trips** list **Dates** column; **Home** trip tables (start and end dates); **Organization trips** public page; public trip and participant donation page heading; trip browse page.
- **View trip** heading dates and participant **Arrives** / **Departs**; **Trip status** heading dates and **Arrives** / **Departs**; trip people roles heading dates.
- **Flights** page trip dates and segment dates; **Flight segments** dialog planned dates; **Rooming** page trip dates and check-in / check-out.
- **My Trip Info** travel details (arrive, depart, check-in, check-out, flight segments); **My Trips** next actions; trip date adjustment.
- **Donations** page and participant donations dialog **Date** (date and time).
- Person documents card (issue, expiration, specialization dates); **View person profile** birthdate; **View application** pregnancy due date, agreement date and medical agreement date (date and time); application agreement section dates (date and time); application missing-document text.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Trip "Guatemala Clinic 2027" runs 2027-03-01 to 2027-03-10.
- Ana Lopez is on the trip, arriving 2027-03-01 and departing 2027-03-10.

### US-101.1 — Dates on screens read MM/DD/YYYY

#### Scenario: The date helpers write MM/DD/YYYY
* **Given** the browser's time zone is America/Los_Angeles
* **When** `formatDate` is given "2027-03-01", `formatDateTime` is given 2027-01-15 2:30 PM local time, and `formatDateRange` is given "2027-03-01" and "2027-03-10"
* **Then** they return "03/01/2027", "01/15/2027 2:30 PM", and "03/01/2027 – 03/10/2027"
* **And** blank values return ""

#### Scenario: The Trips list shows trip dates as MM/DD/YYYY
* **Given** the Trips list shows Guatemala Clinic 2027
* **Then** its **Dates** column reads "03/01/2027 – 03/10/2027"

#### Scenario: View trip shows MM/DD/YYYY dates
* **Given** a staff member opens View trip for Guatemala Clinic 2027
* **Then** the heading reads "Dates: 03/01/2027 – 03/10/2027"
* **And** Ana's **Arrives** is "03/01/2027" and **Departs** is "03/10/2027"

#### Scenario: Date columns still sort by date
* **Given** Trip status lists Ana arriving 2027-01-02 and Ben arriving 2026-12-30
* **When** **Arrives** is sorted ascending
* **Then** Ben ("12/30/2026") is listed before Ana ("01/02/2027")

#### Scenario: The public donation page heading shows MM/DD/YYYY
* **Given** a donor opens the public trip donation page for Guatemala Clinic 2027
* **Then** the heading shows "03/01/2027 – 03/10/2027"

#### Scenario: Person documents show MM/DD/YYYY
* **Given** Ana has a passport issued 2020-05-04 and expiring 2030-05-03
* **When** her documents card is shown
* **Then** the row shows "05/04/2020" and "05/03/2030"

#### Scenario: Donation dates show the date and time
* **Given** a donation for the trip made 2027-01-15 at 2:30 PM in the viewer's time zone
* **When** the **Donations** page lists it
* **Then** its **Date** reads "01/15/2027 2:30 PM"

#### Scenario: Agreement dates show the date and time
* **Given** Ana agreed to the trip agreement 2027-01-05 at 9:05 AM in the viewer's time zone
* **When** staff open **View application** for Ana
* **Then** the agreement date reads "01/05/2027 9:05 AM"

### US-101.2 — Emails, PDFs, and CSV files use MM/DD/YYYY

#### Scenario: Date tokens fill as MM/DD/YYYY
* **Given** a template using `TRIP_START_DATE`, `TRIP_END_DATE`, and `PARTICIPANT_ARRIVAL_DATE`
* **When** it is filled for Ana on Guatemala Clinic 2027
* **Then** they read "03/01/2027", "03/10/2027", and "03/01/2027"

#### Scenario: PDF dates are MM/DD/YYYY
* **Given** the trip's rooming list checks in 2027-03-01 and Ana's passport expires 2030-05-03
* **When** the Room List PDF is made
* **Then** it shows the trip dates "03/01/2027 to 03/10/2027", check-in "03/01/2027", and passport expiration "05/03/2030"

#### Scenario: CSV dates are MM/DD/YYYY
* **Given** Ana's birthdate is 1990-05-15, her application's agreement date is 2027-01-05 15:05 UTC, and a donation was made 2027-01-15 20:30 UTC
* **When** the participants and donations CSVs are exported (server time zone America/Chicago)
* **Then** the participants CSV has **Birthdate** "05/15/1990" and **Agreement Date** "01/05/2027 9:05 AM"
* **And** the donations CSV has **Date** "01/15/2027 2:30 PM"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-101.1 | The date helpers write MM/DD/YYYY | `frontend/tests/DateFormat.test.js` | `The date helpers write MM/DD/YYYY` |
| US-101.1 | The Trips list shows trip dates as MM/DD/YYYY | `frontend/tests/DateFormat.test.js` | `The Trips list shows trip dates as MM/DD/YYYY` |
| US-101.1 | View trip shows MM/DD/YYYY dates | `frontend/tests/DateFormat.test.js` | `View trip shows MM/DD/YYYY dates` |
| US-101.1 | Date columns still sort by date | `frontend/tests/DateFormat.test.js` | `Date columns still sort by date` |
| US-101.1 | The public donation page heading shows MM/DD/YYYY | `frontend/tests/DateFormat.test.js` | `The public donation page heading shows MM/DD/YYYY` |
| US-101.1 | Person documents show MM/DD/YYYY | `frontend/tests/DateFormat.test.js` | `Person documents show MM/DD/YYYY` |
| US-101.1 | Donation dates show the date and time | `frontend/tests/DateFormat.test.js` | `Donation dates show the date and time` |
| US-101.1 | Agreement dates show the date and time | `frontend/tests/DateFormat.test.js` | `Agreement dates show the date and time` |
| US-101.2 | Date tokens fill as MM/DD/YYYY | `backend/tests/date-format.test.js` | `Date tokens fill as MM/DD/YYYY` |
| US-101.2 | PDF dates are MM/DD/YYYY | `backend/tests/date-format.test.js` | `PDF dates are MM/DD/YYYY` |
| US-101.2 | CSV dates are MM/DD/YYYY | `backend/tests/date-format.test.js` | `CSV dates are MM/DD/YYYY` |

---

## Agent implementation request

```text
Implement Feature 101 from @features/feature-101-mm-dd-yyyy-dates.md on branch `feature/101-mm-dd-yyyy-dates`.

Frontend: add frontend/src/utils/dateFormat.js (formatDate, formatDateTime, formatDateRange) and use it for every displayed date, replacing the per-screen formatters listed in FR-002 and raw date templates; keep table sorting on stored values. Backend: change formatDate in emailTokenValues.js to MM/DD/YYYY (emails and PDFs), and format CSV export dates and date-times (SCHEDULED_EMAIL_TIMEZONE). Leave date inputs and API values unchanged.
Tests per the Test Coverage Map; update existing tests that expect the old formats. Update features/reference/behavior.md where it describes date formats.
```

---

## Definition of Done

*   [ ] Shared date formatters per **FR-001**, **FR-002**
*   [ ] Every screen date per **FR-003**, sorting per **FR-004**
*   [ ] Emails, PDFs, and CSVs per **FR-005**–**FR-007**
*   [ ] Inputs and API values unchanged per **FR-008**
*   [ ] Automated tests for every Gherkin scenario; existing tests that expected old formats updated
*   [ ] Backend `npm test` and frontend `npx vitest run` green
*   [ ] **SC-002** search done
*   [ ] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Date entry fields (built-in browser pickers) and their format
- A per-user or per-organization date format setting
- Changing stored or API date values, or what the Trip Master import accepts
- Time-only displays (flight times)
