# Feature: Planned Arrival and Departure on Flights

**Feature ID:** 79
**Branch pattern:** `feature/79-flights-planned-dates`
**Status:** Implemented
**Created:** 2026-10-23
**Input:** "write a new spec for flight segment view page to display the column and the info icon for planned arrival and departure date. Show a warning icon on the trip column with the actual segment arrival and departure dates if they are not the same as planned. On the segment entry page above the segment entry show the planned arrival and departure dates and the requested travel info shown in the booked by column on the flight page." Then: also default new segments to the planned dates, and show the mismatch warning on the Trip Status board, View Trip, and Home.

Interpreted as:
- **Flight segment view page** = the **Flights** page (Trips list **Flights**, Feature 30). It gets the Feature 78 **Arrives** and **Departs** columns with the same info icon.
- **Actual** dates come from the saved flight segments. The **actual arrival** is the arrival date of the last **Arrival** segment, when the participant lands for the trip. The **actual departure** is the departure date of the first **Return** segment, when they leave for home.
- A **warning icon** shows next to a planned date when the actual date differs from it. On hover it shows the actual date. It shows on the Flights page, the Trip Status board (which also gets **Arrives** / **Departs**), and View Trip's participant list.
- **Home** shows the mismatch to the participant as a My Trips next action, so it also appears in **My Trip Info** on the trip page.
- **Segment entry page** = the **Flight segments** dialog. Above **Arrival Flight** it shows the planned dates and the requested travel info, the preferences text the Flights page shows under **Booked by**. New segments default to the planned dates.

**Depends on:**
- [Feature 28 — View Trip Status](feature-28-view-trip-status.md)
- [Feature 30 — Participant Flights](feature-30-participant-flights.md)
- [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md)
- [Feature 73 — Flight Booked By Indicator](feature-73-flight-booked-by-indicator.md)
- [Feature 78 — Days Before and After the Trip](feature-78-days-before-after-trip.md)

---

## User Stories

### US-79.1: See planned arrival and departure on the Flights page
**As** trip staff booking flights  
**I want** each participant's planned arrival and departure dates on the Flights page, with what moved them  
**So that** I book flights for the right days

**Priority:** P1  
**Independent test:** A June 10–17 trip; Ana chose "Arrive early" (2 days before) and has "Extra hotel night" (1 day before, 1 day after). The Flights page shows Ana **Arrives** 06/07/2027 with an info icon listing both items, and **Departs** 06/18/2027 with an info icon listing "Extra hotel night"  
**Acceptance scenarios:** see ### US-79.1

### US-79.2: Spot flights that do not match the plan
**As** trip staff  
**I want** a warning wherever planned dates show when a participant's flights land or leave on a different day than planned  
**So that** I can fix the flight or the plan

**Priority:** P1  
**Independent test:** Ana's last Arrival segment lands 06/08/2027 (planned 06/07/2027) → **Arrives** on the Flights page, the Trip Status board, and View Trip shows a warning icon; hovering shows "Arrival flight lands 06/08/2027"  
**Acceptance scenarios:** see ### US-79.2

### US-79.3: See the plan while entering segments
**As** the person entering flight segments  
**I want** the planned dates and the requested travel info above the segments, and new segments dated to the plan  
**So that** I enter flights that match them

**Priority:** P1  
**Independent test:** Opening Ana's **Flight segments** dialog shows "Planned arrival: 06/07/2027" and "Planned departure: 06/18/2027", and, because the organization books her flight, "Requested: Departure DFW (Dallas) · Return DFW (Dallas) · Class Economy · Airline AA — American Airlines · Refundable". The first new Arrival segment is dated 06/07/2027, and the first new Return segment 06/18/2027  
**Acceptance scenarios:** see ### US-79.3

### US-79.4: Participant learns their flights do not match
**As** an approved participant  
**I want** Home to tell me when my flights do not match my planned dates  
**So that** I can fix my flights or ask trip staff

**Priority:** P2  
**Independent test:** Ana is approved and her arrival flight lands 06/08/2027 (planned 06/07/2027) → her My Trips row shows "Your arrival flight lands 06/08/2027, but you are planned to arrive 06/07/2027." and is highlighted yellow  
**Acceptance scenarios:** see ### US-79.4

---

## Requirements

### Functional Requirements

**Planned and actual dates**

- **FR-001**: The **actual arrival** is the arrival date of the participant's last **Arrival** segment (highest segment number). The **actual departure** is the departure date of the first **Return** segment (lowest segment number). Either is empty when there is no such segment or it has no date. The planned dates are Feature 78's arrival and departure dates.
- **FR-002**: An arrival **mismatch** is when the actual arrival and the planned arrival both exist and differ. A departure mismatch is the same with the actual and planned departure. Calendar dates only; times are ignored.

**Staff pages**

- **FR-003**: The **Flights** page participant table shows **Arrives** and **Departs** columns right after **Booked by**. The **Trip Status** board shows them right after **Booked by** too. They show the planned date (`MM/dd/yyyy` or "—"). When a date was moved by days, an info icon shows the same hover list as View Trip: `Trip option: <description>` / `Add-on: <description>` with "N day(s) before" / "N day(s) after".
- **FR-004**: On the Flights page, the Trip Status board, and View Trip's participant list, an arrival mismatch shows a warning icon after the **Arrives** date (and after any info icon), with the hover "Arrival flight lands MM/dd/yyyy". A departure mismatch does the same on **Departs** with "Return flight leaves MM/dd/yyyy". There is no warning icon without a mismatch.

**Flight segments dialog**

- **FR-005**: Under the "Booked by: …" line and above **Arrival Flight**, the **Flight segments** dialog shows "Planned arrival: MM/dd/yyyy" and "Planned departure: MM/dd/yyyy" ("—" when there is no date). This applies wherever the dialog opens: the Flights page, Home, and the trip page.
- **FR-006**: When the organization books the flight and the application has preferences, the dialog also shows "Requested: <preferences text>". This is the same text the Flights page shows under **Booked by**. Otherwise there is no **Requested** line.
- **FR-007**: The dialog shows the dates and the requested travel info as they were when it opened. Editing segment dates in the dialog does not change them.
- **FR-008**: A new first **Arrival** segment defaults its departure and arrival dates to the planned arrival. A new first **Return** segment defaults its dates to the planned departure. When there is no planned date, they fall back to the trip start (end) as today. Later segments still take the previous segment's arrival date (Feature 30).
- **FR-010**: When the organization books the flight and a departure airport was requested, a new first **Arrival** segment defaults its **Departure airport** to the requested departure airport. Otherwise it stays blank as today. Later segments still depart from the previous segment's arrival airport (Feature 30).
- **FR-011**: When the organization books the flight, the segments are checked against the requested airports:
  - The first **Arrival** segment's departure airport must be the requested departure airport. Otherwise: "Arrival flight departs from <code>, but <requested code> was requested."
  - The last **Return** segment's arrival airport must be the requested return airport. Otherwise: "Return flight arrives at <code>, but <requested code> was requested."

  There's no check when that airport wasn't requested or the segment has no airport. The **Flight segments** dialog shows these warnings above **Arrival Flight** and updates them as segments are edited. The **Flights** page shows a warning icon in **Initial departure** (**Final arrival**), with the message on hover.

**Home**

- **FR-009**: For an **approved** application on an upcoming trip, My Trips next actions add an action for each mismatch, after the existing actions:
  - Arrival: "Your arrival flight lands MM/dd/yyyy, but you are planned to arrive MM/dd/yyyy."
  - Departure: "Your return flight leaves MM/dd/yyyy, but you are planned to depart MM/dd/yyyy."

  When the participant buys their own ticket, the action has an **Edit Flights** button (the flight segments dialog for their assignment). A mismatch action means "You are all ready for the trip." does not show, and the row is highlighted yellow. The same actions show in **My Trip Info** on the trip page (Feature 60).

---

## Assumptions

- Planned dates are computed when the page loads (Feature 78).
- The Flights page and Trip Status board list the statuses they list today. View Trip warns for any participant row that has segments.
- Incomplete and applied applications get no mismatch next action. Their existing actions (complete, submit, wait for approval) come first.

## Edge Cases

- No segments → no warning icons and no mismatch action; planned dates still show.
- Arrival segments but no Return segments → only arrival can mismatch.
- A trip with no start (end) date → **Arrives** (**Departs**) shows "—", with no info icon, no warning, and no mismatch action.
- A participant who buys their own ticket opens the dialog from Home or the trip page → they see the planned dates but no **Requested** line.
- Changing days in Feature 78 after flights are saved can create a mismatch. It shows the next time the page loads.

## Success Criteria

- **SC-001**: The Flights page and Trip Status board planned dates always match View Trip's **Arrives** / **Departs** for the same participant.
- **SC-002**: A warning icon or mismatch action shows exactly when FR-002 holds.
- **SC-003**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No new access rules. The Flights page and Trip Status board stay trip staff only (Features 28 and 30). The segments endpoint stays trip staff, or the assignment's own participant when they buy their own ticket (Feature 60). My Trips next actions stay the signed-in person's own. Requested travel info appears only for organization-booked flights, which the participant cannot open.

---

## Key Entities

No schema change. Uses `tripFlightSegment` (Feature 30), the application flight preferences (Feature 30), and the Feature 78 days on `tripTravelOption` / `tripPeopleRoleExpense`.

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `GET` | `/trips/trips/:id/flights` | as today | Each participant adds `arrivalDate`, `departureDate`, `arrivalAdjustments`, `departureAdjustments` (Feature 78 shapes), `flightArrivalDate` (actual arrival), and `flightDepartureDate` (actual departure), `YYYY-MM-DD` or `null`; and `arrivalFlightOriginCode` (first Arrival segment's departure airport) / `returnFlightDestinationCode` (last Return segment's arrival airport), or `null` |
| `GET` | `/trips/trips/:id/status` | as today | Each participant adds the same six fields |
| `GET` | `/trips/trips/:id` participant roster (View Trip) | as today | Each participant adds `flightArrivalDate` and `flightDepartureDate` (planned dates are already there from Feature 78) |
| `GET` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | as today | Adds `arrivalDate`, `departureDate` (`YYYY-MM-DD` or `null`), and `flightPurchasePreferences` / `flightPurchasePreferencesText` (same as the flights board; `null` unless the organization books the flight) |
| `GET` | `/trips/trips/browse/mine`, `/trips/trips/browse/:id` | as today | `nextActions` may add `{ code: "arrival-flight-mismatch", flightDate, plannedDate }` and `{ code: "return-flight-mismatch", flightDate, plannedDate }` (dates `YYYY-MM-DD`), each with `canEditFlights` (true when the participant buys their own ticket) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Flights** page (`TripFlightsView`) | **Arrives** / **Departs** after **Booked by**, with the info icon (FR-003) and warning icon (FR-004) |
| **Trip Status** board (`TripStatusView`) | **Arrives** / **Departs** after **Booked by**, with the info icon (FR-003) and warning icon (FR-004) |
| **View Trip** participant list (`TripView`) | Warning icon on **Arrives** / **Departs** (FR-004) |
| **Flight segments** dialog (`FlightSegmentsDialog`) | Planned dates and **Requested** line above **Arrival Flight** (FR-005, FR-006); new segments default to planned dates (FR-008) |
| **Home** My Trips and trip page **My Trip Info** (`MyTripNextActions`) | Mismatch next actions with optional **Edit Flights** (FR-009) |

The warning icon and its hover are one shared piece used by the three staff pages, next to Feature 78's `TripDateAdjustment`.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background: Org Admin Omar runs "Hope Missions"; trip "Guatemala Clinic" runs 2027-06-10 to 2027-06-17 (upcoming). Ana chose "Arrive early" (2 days before) and has the add-on "Extra hotel night" (1 day before, 1 day after), so she is planned to arrive 2027-06-07 and depart 2027-06-18. Ana is approved. The organization books Ana's flight; she asked for Departure DFW (Dallas), Return DFW (Dallas), Class Economy, Airline AA — American Airlines, Refundable. Ana's last Arrival segment lands 2027-06-08 and her first Return segment leaves 2027-06-18. Ben is approved, has no days, no segments, and buys his own ticket.

### US-79.1 — See planned arrival and departure on the Flights page

#### Scenario: Flights board returns planned and flight dates
* **When** Omar loads the Flights page data
* **Then** Ana has `arrivalDate` 2027-06-07, `departureDate` 2027-06-18, `flightArrivalDate` 2027-06-08, `flightDepartureDate` 2027-06-18
* **And** her `arrivalAdjustments` list "Arrive early" (2) and "Extra hotel night" (1)
* **And** Ben has `arrivalDate` 2027-06-10, `departureDate` 2027-06-17, and `flightArrivalDate` / `flightDepartureDate` `null`

#### Scenario: Flights page shows Arrives and Departs
* **Given** the flights board gives Ana the dates above
* **Then** her row shows **Arrives** 06/07/2027 and **Departs** 06/18/2027 right after **Booked by**
* **And** hovering the **Arrives** info icon lists "Trip option: Arrive early — 2 days before" and "Add-on: Extra hotel night — 1 day before"

### US-79.2 — Spot flights that do not match the plan

#### Scenario: Flights page warns when flights differ from the plan
* **Given** the flights board gives Ana `flightArrivalDate` 2027-06-08 and `flightDepartureDate` 2027-06-18
* **Then** **Arrives** shows a warning icon whose hover reads "Arrival flight lands 06/08/2027"
* **And** **Departs** shows no warning icon
* **And** Ben, with no segments, shows no warning icons

#### Scenario: Trip Status and roster return planned and flight dates
* **When** Omar loads the Trip Status board and View Trip
* **Then** Ana has `flightArrivalDate` 2027-06-08 and `flightDepartureDate` 2027-06-18 in both
* **And** the Trip Status board also gives her `arrivalDate` 2027-06-07, `departureDate` 2027-06-18, and her adjustments

#### Scenario: Trip Status board shows Arrives and Departs with the warning
* **Given** the Trip Status board gives Ana the dates above
* **Then** her row shows **Arrives** 06/07/2027 with the info icon and a warning icon ("Arrival flight lands 06/08/2027") right after **Booked by**
* **And** **Departs** 06/18/2027 has no warning icon

#### Scenario: View Trip warns when flights differ from the plan
* **Given** the roster gives Ana `flightArrivalDate` 2027-06-08
* **Then** her **Arrives** cell shows a warning icon whose hover reads "Arrival flight lands 06/08/2027"
* **And** Ben's row shows no warning icon

### US-79.3 — See the plan while entering segments

#### Scenario: Segments return the plan and requested travel info
* **When** Omar loads Ana's flight segments
* **Then** the response has `arrivalDate` 2027-06-07, `departureDate` 2027-06-18, and `flightPurchasePreferencesText` "Departure DFW (Dallas) · Return DFW (Dallas) · Class Economy · Airline AA — American Airlines · Refundable"
* **And** `flightPurchasePreferences.departureAirportCode` is DFW

#### Scenario: Flight segments dialog shows the plan
* **Given** Ana's segments response has the values above
* **Then** the dialog shows "Planned arrival: 06/07/2027", "Planned departure: 06/18/2027", and "Requested: Departure DFW (Dallas) · Return DFW (Dallas) · Class Economy · Airline AA — American Airlines · Refundable" above **Arrival Flight**
* **And** for a participant who books their own flight, there is no **Requested** line

#### Scenario: New segments default to the planned dates
* **Given** a segments response with no segments, `arrivalDate` 2027-06-07, and `departureDate` 2027-06-18
* **When** the user adds an Arrival segment and a Return segment
* **Then** the Arrival segment's departure and arrival dates are 2027-06-07
* **And** the Return segment's departure and arrival dates are 2027-06-18

#### Scenario: New Arrival segment departs from the requested airport
* **Given** Ana's segments response has no segments and the requested departure airport DFW
* **When** the user adds an Arrival segment
* **Then** its departure airport is DFW
* **And** for a participant who books their own flight, the new Arrival segment's departure airport is blank

#### Scenario: Flights board returns the flight airports
* **Given** Ana's Arrival segments are DFW → MIA and MIA → GUA, and her Return segment is GUA → DFW
* **When** Omar loads the Flights page data
* **Then** Ana has `arrivalFlightOriginCode` DFW and `returnFlightDestinationCode` DFW

#### Scenario: Flights page warns when airports differ from the request
* **Given** the flights board gives Ana `arrivalFlightOriginCode` MIA, `returnFlightDestinationCode` DFW, and requested airports DFW / DFW
* **Then** **Initial departure** shows a warning icon whose hover reads "Arrival flight departs from MIA, but DFW was requested."
* **And** **Final arrival** shows no warning icon

#### Scenario: Flight segments dialog warns when airports differ from the request
* **Given** Ana's dialog has an Arrival segment from DFW and a Return segment to IAH, with requested airports DFW / DFW
* **Then** the dialog shows "Return flight arrives at IAH, but DFW was requested." and no arrival warning
* **When** the Return segment's arrival airport is changed to DFW
* **Then** the warning goes away

### US-79.4 — Participant learns their flights do not match

#### Scenario: Next actions include a flight mismatch
* **When** Ana loads My Trips
* **Then** her next actions include `arrival-flight-mismatch` with `flightDate` 2027-06-08, `plannedDate` 2027-06-07, and `canEditFlights` false
* **And** there is no `return-flight-mismatch` and no `all-ready`

#### Scenario: Home shows the flight mismatch
* **Given** My Trips gives Ana's trip the `arrival-flight-mismatch` action above
* **Then** her row shows "Your arrival flight lands 06/08/2027, but you are planned to arrive 06/07/2027." highlighted yellow, with no **Edit Flights**
* **And** when `canEditFlights` is true, the action shows **Edit Flights**

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-79.1 | Flights board returns planned and flight dates | `backend/tests/flights-planned-dates.test.js` | `Flights board returns planned and flight dates` |
| US-79.1 | Flights page shows Arrives and Departs | `frontend/tests/TripFlights.test.js` | `Flights page shows Arrives and Departs` |
| US-79.2 | Flights page warns when flights differ from the plan | `frontend/tests/TripFlights.test.js` | `Flights page warns when flights differ from the plan` |
| US-79.2 | Trip Status and roster return planned and flight dates | `backend/tests/flights-planned-dates.test.js` | `Trip Status and roster return planned and flight dates` |
| US-79.2 | Trip Status board shows Arrives and Departs with the warning | `frontend/tests/TripStatus.test.js` | `Trip Status board shows Arrives and Departs with the warning` |
| US-79.2 | View Trip warns when flights differ from the plan | `frontend/tests/TripView.test.js` | `View Trip warns when flights differ from the plan` |
| US-79.3 | Segments return the plan and requested travel info | `backend/tests/flights-planned-dates.test.js` | `Segments return the plan and requested travel info` |
| US-79.3 | Flight segments dialog shows the plan | `frontend/tests/FlightSegmentsDialog.test.js` | `Flight segments dialog shows the plan` |
| US-79.3 | New segments default to the planned dates | `frontend/tests/FlightSegmentsDialog.test.js` | `New segments default to the planned dates` |
| US-79.3 | New Arrival segment departs from the requested airport | `frontend/tests/FlightSegmentsDialog.test.js` | `New Arrival segment departs from the requested airport` |
| US-79.3 | Flights board returns the flight airports | `backend/tests/flights-planned-dates.test.js` | `Flights board returns the flight airports` |
| US-79.3 | Flights page warns when airports differ from the request | `frontend/tests/TripFlights.test.js` | `Flights page warns when airports differ from the request` |
| US-79.3 | Flight segments dialog warns when airports differ from the request | `frontend/tests/FlightSegmentsDialog.test.js` | `Flight segments dialog warns when airports differ from the request` |
| US-79.4 | Next actions include a flight mismatch | `backend/tests/flights-planned-dates.test.js` | `Next actions include a flight mismatch` |
| US-79.4 | Home shows the flight mismatch | `frontend/tests/HomeNextActions.test.js` | `Home shows the flight mismatch` |

---

## Agent implementation request

```text
Implement Feature 79 from @features/feature-79-flights-planned-dates.md on branch `feature/79-flights-planned-dates`.

Follow layer order in @features/framework.md.
Backend: one helper for the actual arrival / departure dates (FR-001); findFlights and the Trip Status board add participantTravelDates (Feature 78) and the flight dates; the roster adds the flight dates; findSegments adds the planned dates and flightPurchasePreferencesText; myTripNextActions adds the mismatch actions for approved applications (FR-009).
Frontend: a shared warning icon next to TripDateAdjustment; TripFlightsView and TripStatusView Arrives / Departs after Booked by; TripView warning; FlightSegmentsDialog plan lines, Requested line, and planned-date defaults; MyTripNextActions mismatch lines with optional Edit Flights.
Update features/reference (api, behavior).
```

---

## Definition of Done

*   [x] Planned and actual dates per **FR-001**–**FR-002**
*   [x] Staff pages per **FR-003**–**FR-004**
*   [x] Flight segments dialog per **FR-005**–**FR-008**, **FR-010**–**FR-011**
*   [x] Home next actions per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Planned dates or warnings in the Flights PDF
- A separate warning icon on **My Trip Info**'s **Arrive** / **Depart** (the mismatch shows there as a next action)
- Blocking or warning on save when segment dates differ from the plan
- Comparing flight times
