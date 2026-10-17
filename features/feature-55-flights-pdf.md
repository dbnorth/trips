# Feature: Flights PDF

**Feature ID:** 55
**Branch pattern:** `feature/55-flights-pdf`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Add a button on the trip's Flights page that creates a PDF showing each participant's name, who books the flight (Org or Participant), and their arrival and departure (return) flight segments, with AM/PM times.
**Depends on:** [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 54 — Room List PDF](feature-54-room-list-pdf.md)

---

## User Stories

### US-55.1: Download the trip's flights as a PDF
**As a** Trip Leader, Org Admin, or System Admin
**I want to** download every participant's flight segments for a trip as one PDF
**So that** I can review and share who is booking each flight and when everyone arrives and leaves

**Priority:** P1
**Independent test:** `GET /trips/trips/:id/flights/pdf` as trip staff returns a PDF; the flights PDF data has one block per participant (ordered by last and first name) with name, booked by, and their Arrival and Return segments in segment order.
**Acceptance scenarios:** see ### US-55.1

---

## Requirements

### Functional Requirements

- **FR-001**: The Flights page (`TripFlightsView`, Feature 30) MUST show a **Flights PDF** button in the page heading area. It downloads the PDF for the trip. The PDF uses the **saved** flight data; unsaved edits on the page are not included.
- **FR-002**: Only users who may open the Flights page (Trip Leader of the trip, Org Admin of the trip's organization, or System Admin — Feature 30 FR-003) MAY download the PDF. Others → `403`; unknown trip → `404`.
- **FR-003**: The PDF MUST start with:
  - The **organization header** used by the Room List PDF (Feature 54 FR-003): the trip organization's logo (PNG or JPEG file only) with its name beside it.
  - The title **Flights**.
  - **Trip info**: trip name and dates (start date to end date, like `January 2, 2027 to January 9, 2027`).
- **FR-004**: The PDF MUST list the participants shown on the Flights page (Feature 30 eligible participants: assignment status `incomplete`, `applied`, or `approved`), ordered by last name, then first name.
- **FR-005**: Each participant is a **block** in one table with columns **Participant**, **Booked by**, **Flight**, **Airline**, **Flight number**, **From**, **Departure**, **To**, **Arrival**. The block lists the participant's **Arrival** segments (by segment number), then their **Return** segments (by segment number), one row per segment. **Participant** and **Booked by** show on the block's first row; a line separates blocks.
- **FR-006**: When a participant has no Arrival segments, the block MUST still have one **Arrival** row with the flight columns blank; the same for **Return**. A participant with no segments therefore has two rows.
- **FR-007**: **Participant** is the person's first, middle, and last name.
- **FR-008**: **Booked by** comes from the application's flight purchase option (Feature 30 FR-019): `organization` → `Org`, `self` → `Participant`, not chosen → blank.
- **FR-009**: Row values:
  - **Flight**: `Arrival` or `Return`.
  - **Airline**: the airline's name.
  - **Flight number**: the segment's flight number.
  - **From** / **To**: the departure / arrival airport code.
  - **Departure**: the segment's departure date and time. **Arrival**: the segment's arrival date and time.
- **FR-010**: Segment dates and times read like `Saturday 01/02/2027 3:45 PM`: day of the week, date as `MM/dd/yyyy`, and 12-hour time with AM/PM (`00:05` → `12:05 AM`, `12:00` → `12:00 PM`), the same format as the Room List PDF **Flight arrival** (Feature 54 FR-011).
- **FR-011**: With no eligible participants, the PDF still shows the header and trip info and the line "No participants."
- **FR-012**: The file name is `Flights - <trip name>.pdf`.

---

## Assumptions

- "Departure segments" in the request means the **Return** segments (the flights home); Feature 30 has only Arrival and Return segments.
- Flight purchased, cost, comments, class, seat number, and the application's airport/airline preferences are not in the PDF.
- Generated on the server with `pdfkit` (added in Feature 54), letter size, landscape, standard fonts; the organization header and date/time formatting are shared with the Room List PDF.
- Times are shown as entered (local wall-clock time, no time zone conversion — Feature 30).

## Edge Cases

- Ana books through the organization and flies DFW → MIA (Arrival 1), MIA → GUA (Arrival 2), and GUA → DFW (Return 1) → her block has three rows: Arrival 1, Arrival 2, Return 1; Participant and Booked by (`Org`) on the first row only.
- Ben chose `self` and has only Arrival segments → his block ends with one blank **Return** row; Booked by is `Participant`.
- Carl has not chosen a flight purchase option and has no segments → two rows (Arrival, Return) with blank flight columns and blank Booked by.
- A cancelled or declined participant is not listed.
- A block that does not fit at the bottom of a page continues on the next page with the table header repeated.

## Success Criteria

- **SC-001**: Staff can see every participant's flights for a trip, and who books them, in one download.
- **SC-002**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Same access as the Flights page (Feature 30): staff of the trip only. Never available to participants or the public.

---

## Key Entities

- **Trip**, **Organization**, **TripPeopleRole** (flight purchase option), **Person**, **TripFlight**, **TripFlightSegment**, **Airport**, **Airline** (read only)

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/trips/:id/flights/pdf` | auth + trip staff | `200` `application/pdf` with `Content-Disposition: attachment; filename="Flights - <trip name>.pdf"` (**FR-001**–**FR-012**); `403` / `404` per **FR-002** |

---

## Screen Requirements

| Where | Change |
|-------|--------|
| `TripFlightsView` | **Flights PDF** button in the heading area, disabled while loading or when the trip did not load; downloads the PDF with the signed-in token (same pattern as the Room List PDF); shows an error alert if the download fails |

---

## Data Model Requirements

No database changes.

---

## Acceptance Criteria (Gherkin)

### US-55.1 — Download the trip's flights as a PDF

#### Scenario: Flights data for the PDF
* **Given** trip "Guatemala Clinic" of organization "Hope Mission" from 2027-01-02 to 2027-01-09
* **And** Ana Maria Lopez is an approved participant whose application says the organization books her flight
* **And** her flight has Arrival segment 1 American Airlines `AA100` DFW 2027-01-02 `06:15` → MIA 2027-01-02 `10:05`, Arrival segment 2 American Airlines `AA200` MIA 2027-01-02 `12:30` → GUA 2027-01-02 `15:45`, and Return segment 1 American Airlines `AA300` GUA 2027-01-09 `13:00` → DFW 2027-01-09 `18:30`
* **When** the flights PDF data is built for the trip
* **Then** the organization header is "Hope Mission" and the trip info is "Guatemala Clinic", "January 2, 2027 to January 9, 2027"
* **And** Ana's block has participant "Ana Maria Lopez" and booked by `Org`
* **And** her Arrival rows are `American Airlines`, `AA100`, `DFW`, "Saturday 01/02/2027 6:15 AM", `MIA`, "Saturday 01/02/2027 10:05 AM" and `American Airlines`, `AA200`, `MIA`, "Saturday 01/02/2027 12:30 PM", `GUA`, "Saturday 01/02/2027 3:45 PM"
* **And** her Return row is `American Airlines`, `AA300`, `GUA`, "Saturday 01/09/2027 1:00 PM", `DFW`, "Saturday 01/09/2027 6:30 PM"

#### Scenario: Booked by values
* **Given** Ana's application flight purchase option is `organization`, Ben's is `self`, and Carl has not chosen one
* **When** the flights PDF data is built
* **Then** booked by is `Org` for Ana, `Participant` for Ben, and blank for Carl

#### Scenario: Participants are ordered by name and only eligible participants are listed
* **Given** participants Dana Ruiz (approved), Ben Cruz (applied), Ana Lopez (incomplete), and Eve Soto (cancelled)
* **When** the flights PDF data is built
* **Then** the blocks are Ben Cruz, Ana Lopez, Dana Ruiz
* **And** Eve Soto is not listed

#### Scenario: Participant without segments
* **Given** Carl is an approved participant with no flight segments
* **When** the flights PDF data is built
* **Then** Carl's block has no Arrival segments and no Return segments
* **And** the PDF shows one blank **Arrival** row and one blank **Return** row for Carl

#### Scenario: No participants
* **Given** the trip has no eligible participants
* **When** the flights PDF data is built
* **Then** the trip info is filled and there are no participant blocks

#### Scenario: Staff download the PDF
* **Given** I am an Org Admin of the trip's organization
* **When** I request `GET /trips/trips/:id/flights/pdf`
* **Then** the response is `200` with content type `application/pdf`
* **And** the file name is `Flights - Guatemala Clinic.pdf`
* **And** the body starts with `%PDF`

#### Scenario: Participants cannot download the PDF
* **Given** I am an approved Trip Participant on the trip
* **When** I request `GET /trips/trips/:id/flights/pdf`
* **Then** the response is `403`

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-55.1 | Flights data for the PDF | `backend/tests/flights-pdf.test.js` | `Flights data for the PDF` |
| US-55.1 | Booked by values | `backend/tests/flights-pdf.test.js` | `Booked by values` |
| US-55.1 | Participants are ordered by name and only eligible participants are listed | `backend/tests/flights-pdf.test.js` | `Participants are ordered by name and only eligible participants are listed` |
| US-55.1 | Participant without segments | `backend/tests/flights-pdf.test.js` | `Participant without segments` |
| US-55.1 | No participants | `backend/tests/flights-pdf.test.js` | `No participants` |
| US-55.1 | Staff download the PDF | `backend/tests/flights-pdf.test.js` | `Staff download the PDF` |
| US-55.1 | Participants cannot download the PDF | `backend/tests/flights-pdf.test.js` | `Participants cannot download the PDF` |

The data scenarios test the function that builds the PDF's content (header, trip info, ordered participant blocks with segments); the blank Arrival/Return rows in **Participant without segments** are checked by rendering a PDF for that data without error. The download scenarios test the endpoint.

---

## Agent implementation request

```text
Implement Feature 55 from @features/feature-55-flights-pdf.md on branch `feature/55-flights-pdf`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend (and frontend if touched) before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (flights PDF endpoint), `features/reference/behavior.md` (Flights PDF content, ordering, booked by, date format)

---

## Definition of Done

*   [x] **Flights PDF** button on the Flights page (**FR-001**); staff-only access (**FR-002**)
*   [x] Organization header, trip info, and participant blocks with Arrival and Return segments, booked by, and AM/PM times (**FR-003**–**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend (and frontend if touched)
*   [ ] On `feature/55-flights-pdf`; PR → `dev`

---

## Out of Scope

- Including unsaved page edits in the PDF
- Flight purchased, cost, comments, class, seat number, or application airport/airline preferences in the PDF
- Airport names or cities (codes only)
- Emailing the PDF
- Other export formats (CSV, Excel)
- Time zone conversion
