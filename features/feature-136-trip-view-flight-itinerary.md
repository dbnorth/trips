# Feature: Trip View Flight Itinerary

**Feature ID:** 136
**Branch pattern:** `feature/136-trip-view-flight-itinerary`
**Status:** Implemented
**Created:** 2026-11-13
**Input:** "Add and edit a flight itinerary from Trip View. Add an airline icon to the actions on a participant row. Clicking it opens the existing add/edit flight dialog for that participant. On that dialog, add a button to load an itinerary from text. That opens a dialog with a text box. Parse the text and show the parsed itinerary in a field below. A Load button fills the flight segment fields from the parse, adding segments as needed, and closes the load dialog."
**Depends on:** [Feature 30 — Flights](feature-30-flights.md), [Feature 110 — Update Trip View](feature-110-update-trip-view.md)

Staff enter a participant's flights from **Flight segments** on the Flights page. This feature opens that same dialog from the trip page participant row, and lets staff paste an itinerary instead of typing each leg.

## Clarifications

- Q: Which icon, and what is it called? → A: The airplane icon already used for flights (`mdi-airplane`). Its name is **Flight segments**, the same dialog it opens.
- Q: Does Load save the flights? → A: No. Load fills the segment fields in the **Flight segments** dialog and closes the text dialog. **Save** on **Flight segments** is still what stores them.
- Q: Does Load keep legs already in the dialog? → A: No. The dialog's arrival and return segments become the parsed legs. Rows are added or removed so the dialog matches the parse.
- Q: What text can be pasted? → A: An airline's itinerary email. It has no fixed layout. For each flight the email includes a date, a time, an airline code, and airport codes. The parser finds those in the text. **Seat:** in that flight's text is the segment's seat. **Confirmation code:** or **Confirmation number:** in the text is the confirmation number. Class is not read.
- Q: Which airline and airport codes are recognized? → A: Every code in the airline catalog and every code in the airport catalog. An airline code with no letter is ignored, so a year such as 2026 is not a flight. The date may be on its own line above the flights. The departure airport and time may come before the flight number. When the arrival time is earlier than the departure time, the arrival date is the next day.
- Q: Where else does **Load from text** show? → A: On the shared **Flight segments** dialog, so the Flights page has it too.

---

## User Stories

### US-136.1: Open a participant's flights from the trip page

**As** trip staff
**I want** a **Flight segments** action on each participant row
**So that** I can add or edit that person's flights without leaving the trip page

**Priority:** P1
**Independent test:** On the trip page, the airplane icon on Ava's row opens **Flight segments — Ava Reed**. Saving it reloads the participant list.
**Acceptance scenarios:** see ### US-136.1

### US-136.2: Load an itinerary from pasted text

**As** trip staff
**I want** to paste an itinerary and load it into the flight segments
**So that** I do not type each leg by hand

**Priority:** P1
**Independent test:** In **Flight segments**, **Load from text** shows the pasted legs under **Parsed itinerary**. **Load** puts those legs in the arrival and return sections and closes the text dialog. **Save** is still required.
**Acceptance scenarios:** see ### US-136.2

---

## Requirements

### Functional Requirements

- **FR-001**: Each row in the trip page **Participants** table MUST have a **Flight segments** action, the airplane icon, immediately after **Edit**. Choosing it opens the existing **Flight segments** dialog for that participant. After a successful save, the trip page reloads the participant list.
- **FR-002**: The **Flight segments** dialog MUST have a **Load from text** button above **Arrival Flight**. It opens **Load itinerary from text**.
- **FR-003**: **Load itinerary from text** has **Itinerary text** (a text box), **Parsed itinerary** (read-only text below it), **Cancel**, and **Load**. **Cancel** closes the dialog and leaves the segments unchanged. The parsed text updates as **Itinerary text** changes.
- **FR-004**: A flight is an airline code from the airline catalog, as its own word, followed by a flight number (1 to 4 digits, with or without a space). Every airport code and every airline code in the catalogs is used. An airline code with no letter is ignored, so a year is not a flight. Dates are read in any of these forms: `M/D/YYYY`, `MM/DD/YYYY`, `Month D, YYYY`, `D Month YYYY`, `DDMON`, or `DDMONYYYY` (for example `06/01/2027`, `June 1, 2027`, `1 Jun 2027`, `01JUN`, `01JUN2027`), including a weekday before the month (`Wednesday, April 22, 2026`). A date with no year uses the trip's start year. Times are `h:mm AM`, `h:mm PM`, `h:mma`, `h:mmp`, or `HH:MM`. A date on its own line applies to the flights below it until the next date. The departure airport and departure time are the airport and time before the flight number when both are there; otherwise they are the first airport and first time after it. The arrival airport and arrival time are the next airport and time. When the arrival time is earlier than the departure time and no later arrival date is given, the arrival date is the next day. **Seat:** followed by a seat number in that flight's text, before the next flight, is the segment's seat (for example `Seat: 14A`). A flight is read only when it has an airline, a flight number, two airports, a departure time, and an arrival time. The words around those values do not matter. Segment fields store the date as a calendar date and the time as 24-hour `HH:MM`.
- **FR-005**: The readable flights form two sets by the date they leave. The earlier set is the arrival flights. The later set is the return flights. When more than one gap separates those dates, the split is the largest gap, so a connection on the next day stays with its set. Flights that all leave on one date are arrival flights. **Parsed itinerary** lists the readable flights, arrival then return, one per line: `AA 100: DFW 06/01/2027 8:30 AM to GUA 06/01/2027 12:00 PM`. A flight that is missing an airport, a date, or a time is listed after those lines as `Not read: "<section>".` The section is that flight's text on one line. When no flight was read, **Parsed itinerary** is `No flights were read.`
- **FR-006**: **Load** is enabled only when at least one flight was read. Choosing it replaces the dialog's arrival and return segments with the parsed flights, numbering each direction from 1 in departure order, and closes **Load itinerary from text**. The seat is filled from **Seat:** in that flight's text, and shown on the parsed line as `, seat 14A` when present. **Confirmation code:** or **Confirmation number:** in the text fills **Confirmation number** (shown first in **Parsed itinerary** as `Confirmation code: FRUAQC`). When the text has no confirmation code, **Confirmation number** is left unchanged. Class is left blank. **Load** does not save.

---

## Assumptions

- The pasted text is an airline itinerary email. The layout may differ by airline. What is relied on is a date, a time, an airline code, and airport codes for each flight.
- **Load** replaces the segments in the open dialog. Staff can still edit those fields before **Save**.
- The same people who can already open **Flight segments** on the Flights page can save from the trip page. The trip page action is shown on every participant row.

## Edge Cases

- Blank **Itinerary text** → **Parsed itinerary** is `No flights were read.` and **Load** is disabled.
- A paste with only arrival legs → the dialog's return segments are cleared.
- `8:30 AM`, `8:30a`, and `08:30` are the same time. `June 1, 2027`, `1 Jun 2027`, and `06/01/2027` are the same date.
- A flight mentioned without two airport codes, or without a departure time and an arrival time, is `Not read: "<section>".` and is not loaded.
- A date on its own line, such as "Wednesday, April 22, 2026", applies to each flight below it until the next date. The airport and the time may be listed before the flight number.
- An arrival clock time earlier than the departure time lands the next day. That flight stays in the set for the date it leaves.
- The earlier leaving dates are arrival flights. The later leaving dates are return flights.
- Words that are not a flight, a date, a time, or an airport code are ignored.
- **Cancel** after a parse → the **Flight segments** dialog is unchanged.

## Success Criteria

- **SC-001**: The trip page participant row opens **Flight segments** for that participant.
- **SC-002**: Pasted legs appear under **Parsed itinerary** and, after **Load**, in the segment fields.
- **SC-003**: A flight missing an airport, a date, or a time is shown as not read and is not loaded.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged. Who may read or save a participant's flight segments stays as it is. The trip page action uses that same save.

---

## Key Entities

- **Flight segment**: the arrival or return leg already edited in **Flight segments**. No new stored field.
- **Itinerary text**: the pasted text. It is not saved.

---

## API Requirements

None. Loading text only fills the dialog. **Save** uses the existing segment save.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Trip page — **Participants** actions | **Flight segments** (airplane icon) immediately after **Edit**. Opens **Flight segments — *name***. |
| **Flight segments** | **Load from text** above **Arrival Flight**. |
| **Load itinerary from text** | **Itinerary text**, **Parsed itinerary**, **Cancel**, and **Load**. |

**Load** closes this dialog and leaves the filled segments open in **Flight segments**.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

The airport catalog has DFW and GUA. The airline catalog has AA.

### US-136.1 — Open a participant's flights from the trip page

#### Scenario: Flight segments opens from the participant row
* **Given** Ava Reed is on the trip
* **When** I choose **Flight segments** on her row
* **Then** **Flight segments — Ava Reed** opens

### US-136.2 — Load an itinerary from pasted text

The earlier leaving date is the arrival set. The later leaving date is the return set.

#### Scenario: An airline email is shown and loaded
* **Given** **Flight segments** is open and **Itinerary text** is
  ```
  Your itinerary
  American Airlines AA 100
  Departs Dallas (DFW) on June 1, 2027 at 8:30 AM
  Arrives Guatemala City (GUA) at 12:00 PM
  Thank you for flying with us.
  AA 200 leaves GUA on June 8, 2027 at 2:00 PM and arrives DFW at 6:30 PM.
  ```
* **Then** **Parsed itinerary** contains "AA 100: DFW 06/01/2027 8:30 AM to GUA 06/01/2027 12:00 PM"
* **And** it contains "AA 200: GUA 06/08/2027 2:00 PM to DFW 06/08/2027 6:30 PM"
* **When** I choose **Load**
* **Then** **Load itinerary from text** closes
* **And** **Arrival Flight** has one segment, AA 100 from DFW to GUA
* **And** **Return Flight** has one segment, AA 200 from GUA to DFW

#### Scenario: A flight missing a time is left out
* **Given** **Itinerary text** is
  ```
  AA 100 departs DFW on June 1, 2027 at 8:30 AM and arrives GUA at 12:00 PM.
  AA 200 departs GUA on June 8, 2027.
  ```
* **Then** **Parsed itinerary** contains the AA 100 flight
* **And** it contains `Not read: "AA 200 departs GUA on June 8, 2027."`
* **When** I choose **Load**
* **Then** the dialog has the AA 100 arrival segment and no return segment

#### Scenario: An unknown airport is not loaded
* **Given** **Itinerary text** is "AA 100 departs ZZZ on June 1, 2027 at 8:30 AM and arrives GUA at 12:00 PM."
* **Then** **Parsed itinerary** contains `Not read: "AA 100 departs ZZZ on June 1, 2027 at 8:30 AM and arrives GUA at 12:00 PM."`
* **And** **Load** is disabled

#### Scenario: An American Airlines email is read
* **Given** **Itinerary text** is an American Airlines itinerary whose flights are AA 5381 and AA 1882 on April 22, 2026 and AA 2672 and AA 2734 on April 26, 2026, with the date on its own line and the airport and time before each flight number
* **Then** **Parsed itinerary** contains "Confirmation code: FRUAQC"
* **And** it contains "AA 5381: OKC 04/22/2026 6:03 PM to CLT 04/22/2026 9:50 PM, seat 14A"
* **And** it contains "AA 1882: CLT 04/22/2026 11:06 PM to RIC 04/23/2026 12:23 AM, seat 13C"
* **And** it contains "AA 2672: RIC 04/26/2026 7:17 PM to DFW 04/26/2026 9:44 PM, seat 19C"
* **And** it contains "AA 2734: DFW 04/26/2026 10:53 PM to OKC 04/26/2026 11:55 PM, seat 13C"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-136.1 | Flight segments opens from the participant row | `frontend/tests/TripView.test.js` | `Flight segments opens from the participant row` |
| US-136.2 | An airline email is shown and loaded | `frontend/tests/FlightSegmentsDialog.test.js` | `An airline email is shown and loaded` |
| US-136.2 | A flight missing a time is left out | `frontend/tests/itineraryText.test.js` | `A flight missing a time is left out` |
| US-136.2 | An unknown airport is not loaded | `frontend/tests/itineraryText.test.js` | `An unknown airport is not loaded` |
| US-136.2 | An American Airlines email is read | `frontend/tests/itineraryText.test.js` | `An American Airlines email is read` |

`frontend/tests/FlightSegmentsDialog.test.js` is the existing flight dialog test if that file exists; otherwise add the scenario to the flight dialog test file that already mounts `FlightSegmentsDialog`. The parser scenarios test the parse function directly.

---

## Agent implementation request

```text
Implement Feature 136 from @features/feature-136-trip-view-flight-itinerary.md on branch `feature/136-trip-view-flight-itinerary`.

On each trip page participant row, add a Flight segments action (airplane icon) immediately after Edit. It opens the existing Flight segments dialog for that participant. After a successful save, reload the participant list.
On the Flight segments dialog, add Load from text above Arrival Flight. It opens Load itinerary from text, with Itinerary text, a read-only Parsed itinerary, Cancel, and Load. The pasted text is an airline itinerary email with no fixed layout. For each flight, find the airline code and flight number, then the airport codes, dates, and times in that flight's section. The earlier leaving dates are arrival flights and the later leaving dates are return flights. Show the readable flights in Parsed itinerary. A flight missing an airport, a date, or a time is Not read: "<section>". Load replaces the dialog segments with the parsed flights and closes the text dialog. It does not save. It sets the seat from Seat: in that flight's text. It sets Confirmation number from Confirmation code: or Confirmation number: in the text. It does not set class.
Map every Gherkin scenario in the Test Coverage Map. Run those frontend tests before finishing.
Update @features/reference/behavior.md in the same change.
Update docs/user-guide/trip-staff-guide.md and docs/user-guide/agent-guide.md (the Flight segments action and Load from text) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (trip page participant actions include **Flight segments**; **Load from text** reads an airline itinerary email for each flight's date, time, airline code, and airport codes, and **Load** replaces the dialog segments)

**User guide updates:** `docs/user-guide/trip-staff-guide.md` and `docs/user-guide/agent-guide.md` (participant row **Flight segments**; **Load from text**, **Itinerary text**, **Parsed itinerary**, **Load**, and **Cancel**)

---

## Definition of Done

*   [x] The trip page row opens **Flight segments** for that participant (**FR-001**)
*   [x] **Load from text** opens **Load itinerary from text** (**FR-002**, **FR-003**)
*   [x] An airline email's flights are parsed, and a flight missing an airport, a date, or a time is shown and not loaded (**FR-004**, **FR-005**)
*   [x] **Load** replaces the dialog segments and closes the text dialog without saving (**FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Saving the pasted text
- Reading the class of travel from the email
- Saving automatically when **Load** is chosen
- Giving participants back the flight buttons removed by Feature 134
