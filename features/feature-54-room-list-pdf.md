# Feature: Room List PDF

**Feature ID:** 54
**Branch pattern:** `feature/54-room-list-pdf`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Add a button on the Room List page that creates a PDF of the room list: organization logo and name at the top, hotel info, trip info, and the room assignments ordered by room number, with each person's name, passport number, passport expiration date, flight arrival date and time, and email. Passport number and expiration date come from the person's passport document.
**Depends on:** [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md), [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md), [Feature 29 — Rooming List](feature-29-rooming-list.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md)

---

## User Stories

### US-54.1: Download the room list as a PDF
**As a** Trip Leader, Org Admin, or System Admin
**I want to** download the trip's room list as a PDF
**So that** I can send the hotel one document with every room and the guests' passport details

**Priority:** P1
**Independent test:** `GET /trips/trips/:id/rooming/pdf` as trip staff returns a PDF; the room list data has the hotel, the trip, and one row per assigned person ordered by room number with name, passport number, passport expiration date, flight arrival, and email.
**Acceptance scenarios:** see ### US-54.1

---

## Requirements

### Functional Requirements

- **FR-001**: The Room List page (`TripRoomingView`, Feature 29) MUST show a **Room list PDF** button beside **Save**. It downloads the PDF for the trip. The PDF uses the **saved** rooming list; unsaved edits on the page are not included.
- **FR-002**: Only users who may open the rooming list (Trip Leader of the trip, Org Admin of the trip's organization, or System Admin — Feature 29 FR-003) MAY download the PDF. Others → `403`; unknown trip → `404`.
- **FR-003**: The PDF MUST start with:
  - **Organization header** at the top of the first page: the trip organization's logo with its name beside it. The logo shows when the organization has a PNG or JPEG logo file; otherwise (no logo, file missing, or GIF/WebP) only the name shows.
  - **Trip info**: trip name, location (trip location, city, and country, leaving out blanks), and dates (start date to end date).
  - **Hotel info**: hotel name, check-in date, and notes from the rooming list. Blank values show as `—`.
- **FR-004**: Below that, the PDF MUST list **room assignments** in a table with columns **Room**, **Type**, **Nights**, **Name**, **Passport number**, **Passport expiration**, **Flight arrival**, **Email**. One row per person assigned to a room.
- **FR-005**: Rows MUST be ordered by room number in natural order (numbers compare as numbers, so `2` before `10` before `101`), then by the person's last name and first name within a room.
- **FR-006**: **Name** is the person's first, middle, and last name. **Email** is the person's email.
- **FR-007**: **Passport number** and **Passport expiration** come from the person's passport document: a person document whose document type has type `passport` (Feature 4). When the person has more than one, the one with the latest expiration date is used. With no passport document, or no document number on it, the value is blank.
- **FR-008**: Dates in the PDF read like `October 1, 2026`, except **Flight arrival** (**FR-011**).
- **FR-009**: With no saved rooming list or no room assignments, the PDF still shows trip info and hotel info and the line "No room assignments."
- **FR-010**: The file name is `Room List - <trip name>.pdf`.
- **FR-011**: **Flight arrival** is the arrival date and time of the last **Arrival** segment (highest segment number) on the flight of the person's assignment in that room (Feature 30), shown as the day of the week, the date as `MM/dd/yyyy`, and the time, like `Saturday 01/02/2027 3:45 PM` (12-hour time with AM/PM; `00:05` → `12:05 AM`, `12:00` → `12:00 PM`). **Return** segments are ignored. With no flight or no Arrival segments, the value is blank.

---

## Assumptions

- Only people assigned to a room are listed; participants without a room are left out.
- The PDF is generated on the server with the `pdfkit` package (a new backend dependency). Standard fonts, letter size, landscape.
- Room type and nights are those saved on the room (Feature 29).

## Edge Cases

- Ana has two passport documents expiring 2027-03-01 and 2031-06-15 → the 2031 passport's number and expiration are shown.
- Ana's passport document has no document number → **Passport number** is blank, **Passport expiration** still shows.
- Rooms `10`, `2`, and `101` → listed `2`, `10`, `101`.
- Trip has no city → location shows the other parts only.
- Ana flies DFW → MIA (Arrival 1) and MIA → GUA (Arrival 2, lands 2027-01-02 15:45), then GUA → DFW (Return 1) → **Flight arrival** is "Saturday 01/02/2027 3:45 PM".
- Arrival lands at `00:05` → "12:05 AM"; at `12:00` → "12:00 PM".

## Success Criteria

- **SC-001**: Staff can give the hotel a complete room list with passport details in one download.
- **SC-002**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Same access as the rooming list (Feature 29): staff of the trip only. The PDF contains passport numbers, so it is never available to participants or the public.

---

## Key Entities

- **TripRoomingList**, **TripRoom**, **TripRoomAssignment**, **Person**, **PersonDocument**, **DocumentType**, **TripFlight**, **TripFlightSegment** (read only)

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/trips/:id/rooming/pdf` | auth + trip staff | `200` `application/pdf` with `Content-Disposition: attachment; filename="Room List - <trip name>.pdf"` (**FR-001**–**FR-011**); `403` / `404` per **FR-002** |

---

## Screen Requirements

| Where | Change |
|-------|--------|
| `TripRoomingView` | **Room list PDF** button beside **Save**, disabled while loading or when the trip did not load; downloads the PDF with the signed-in token (same pattern as CSV exports); shows an error alert if the download fails |

---

## Data Model Requirements

No database changes.

---

## Acceptance Criteria (Gherkin)

### US-54.1 — Download the room list as a PDF

#### Scenario: Room list data for the PDF
* **Given** trip "Guatemala Clinic" of organization "Hope Mission" in Antigua, Guatemala from 2027-01-02 to 2027-01-09
* **And** its rooming list has hotel "Hotel Casa Santo Domingo", check-in 2027-01-02, and notes "Late arrival"
* **And** Ana Maria Lopez (`ana@example.org`) is in room `12` (Double, 7 nights) with a passport document number `P1234567` expiring 2031-06-15
* **When** the room list PDF data is built for the trip
* **Then** the organization header is "Hope Mission"
* **And** the trip info is "Guatemala Clinic", "Antigua, Guatemala", "January 2, 2027 to January 9, 2027"
* **And** the hotel info is "Hotel Casa Santo Domingo", "January 2, 2027", "Late arrival"
* **And** the row for Ana is room `12`, `Double`, `7`, "Ana Maria Lopez", `P1234567`, "June 15, 2031", no flight arrival, `ana@example.org`

#### Scenario: Organization logo in the header
* **Given** the trip's organization has a PNG logo file
* **When** the room list PDF data is built
* **Then** the organization header includes that logo file

#### Scenario: Logo the PDF cannot show
* **Given** the trip's organization logo is a GIF
* **When** the room list PDF data is built
* **Then** the organization header has the name and no logo

#### Scenario: Rows are ordered by room number
* **Given** people assigned to rooms `10`, `2`, and `101`
* **And** Ben Cruz and Ana Lopez are both in room `2`
* **When** the room list PDF data is built
* **Then** the rows are room `2` Ben Cruz, room `2` Ana Lopez (last name order), room `10`, room `101`

#### Scenario: The latest passport is used
* **Given** Ana has passport documents expiring 2027-03-01 (number `OLD111`) and 2031-06-15 (number `NEW222`)
* **When** the room list PDF data is built
* **Then** Ana's passport number is `NEW222` and passport expiration is "June 15, 2031"

#### Scenario: No passport document
* **Given** Ben is assigned to a room and has no passport document
* **When** the room list PDF data is built
* **Then** Ben's passport number and passport expiration are blank

#### Scenario: Flight arrival from the last arrival segment
* **Given** Ana is assigned to a room
* **And** her flight has Arrival segment 1 landing 2027-01-01 at `22:10`, Arrival segment 2 landing 2027-01-02 at `15:45`, and Return segment 1 landing 2027-01-09 at `18:30`
* **When** the room list PDF data is built
* **Then** Ana's flight arrival is "Saturday 01/02/2027 3:45 PM"

#### Scenario: Flight arrival at midnight and noon
* **Given** Ana's last Arrival segment lands 2027-01-02 at `00:05`
* **And** Ben's last Arrival segment lands 2027-01-02 at `12:00`
* **When** the room list PDF data is built
* **Then** Ana's flight arrival is "Saturday 01/02/2027 12:05 AM" and Ben's is "Saturday 01/02/2027 12:00 PM"

#### Scenario: No flight
* **Given** Ben is assigned to a room and has no flight segments
* **When** the room list PDF data is built
* **Then** Ben's flight arrival is blank

#### Scenario: No room assignments
* **Given** the trip has no saved rooming list
* **When** the room list PDF data is built
* **Then** the trip info is filled, the hotel info values are `—`, and there are no rows

#### Scenario: Staff download the PDF
* **Given** I am an Org Admin of the trip's organization
* **When** I request `GET /trips/trips/:id/rooming/pdf`
* **Then** the response is `200` with content type `application/pdf`
* **And** the file name is `Room List - Guatemala Clinic.pdf`
* **And** the body starts with `%PDF`

#### Scenario: Participants cannot download the PDF
* **Given** I am an approved Trip Participant on the trip
* **When** I request `GET /trips/trips/:id/rooming/pdf`
* **Then** the response is `403`

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-54.1 | Room list data for the PDF | `backend/tests/room-list-pdf.test.js` | `Room list data for the PDF` |
| US-54.1 | Organization logo in the header | `backend/tests/room-list-pdf.test.js` | `Organization logo in the header` |
| US-54.1 | Logo the PDF cannot show | `backend/tests/room-list-pdf.test.js` | `Logo the PDF cannot show` |
| US-54.1 | Rows are ordered by room number | `backend/tests/room-list-pdf.test.js` | `Rows are ordered by room number` |
| US-54.1 | The latest passport is used | `backend/tests/room-list-pdf.test.js` | `The latest passport is used` |
| US-54.1 | No passport document | `backend/tests/room-list-pdf.test.js` | `No passport document` |
| US-54.1 | Flight arrival from the last arrival segment | `backend/tests/room-list-pdf.test.js` | `Flight arrival from the last arrival segment` |
| US-54.1 | Flight arrival at midnight and noon | `backend/tests/room-list-pdf.test.js` | `Flight arrival at midnight and noon` |
| US-54.1 | No flight | `backend/tests/room-list-pdf.test.js` | `No flight` |
| US-54.1 | No room assignments | `backend/tests/room-list-pdf.test.js` | `No room assignments` |
| US-54.1 | Staff download the PDF | `backend/tests/room-list-pdf.test.js` | `Staff download the PDF` |
| US-54.1 | Participants cannot download the PDF | `backend/tests/room-list-pdf.test.js` | `Participants cannot download the PDF` |

The data scenarios test the function that builds the PDF's content (trip info, hotel info, ordered rows); the download scenarios test the endpoint.

---

## Agent implementation request

```text
Implement Feature 54 from @features/feature-54-room-list-pdf.md on branch `feature/54-room-list-pdf`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend (and frontend if touched) before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (room list PDF endpoint), `features/reference/behavior.md` (Room list PDF content, ordering, passport rule)

---

## Definition of Done

*   [x] **Room list PDF** button on the Room List page (**FR-001**); staff-only access (**FR-002**)
*   [x] Organization logo and name header, trip info, hotel info, and room assignment table with passport details and flight arrival, ordered by room (**FR-003**–**FR-011**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend (and frontend if touched)
*   [ ] On `feature/54-room-list-pdf`; PR → `dev`

---

## Out of Scope

- Including unsaved page edits in the PDF
- Listing participants who have no room
- Passport country, issue date, or birth date in the PDF
- Flight number, airline, airport, or return flight in the PDF
- Emailing the PDF to the hotel
- Other export formats (CSV, Excel)
