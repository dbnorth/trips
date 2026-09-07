# Feature: Participant Flights

**Feature ID:** 30
**Branch pattern:** `feature/30-participant-flights`
**Status:** Done
**Created:** 2026-09-07
**Input:** Per-participant flight record (purchased, nullable cost, comments) with ordered flight segments (segment number, airports, airline, flight number, departure/arrival date and time). Global Airport Code and Airline Code catalogs. Trips list **Flights** opens a trip flight page listing eligible participants with purchased/cost and itinerary summary (initial departure and final arrival); a **Flight segments** link opens a dialog to add/edit/delete that participant’s segments
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-30.1: Open flights from trips list
**As a** Trip Leader, Org Admin, or System Admin  
**I want** a **Flights** action on the trips list  
**So that** I can open the flight board for that trip

**Priority:** P1  
**Independent test:** Trips list Actions includes **Flights**; click navigates to the trip flights route; unauthorized users cannot open it  
**Acceptance scenarios:** see ### US-30.1

### US-30.2: See participant flight summary board
**As a** Trip Leader, Org Admin, or System Admin  
**I want** a page listing all eligible participants with purchased flag, cost, and itinerary summary from their segments (initial departure date/time/city and final arrival date/time/city)  
**So that** I can scan travel plans for the trip

**Priority:** P1  
**Independent test:** Page shows trip heading and one row per eligible participant with purchased, cost, and derived departure/arrival fields (or empty indicators when no segments)  
**Acceptance scenarios:** see ### US-30.2

### US-30.3: Edit flight header and manage segments in a dialog
**As a** Trip Leader, Org Admin, or System Admin  
**I want** to edit purchased / cost / comments for a participant and open a **Flight segments** dialog to add, edit, and delete ordered segments using Airport and Airline catalogs  
**So that** each participant’s itinerary is stored correctly

**Priority:** P1  
**Independent test:** Saving flight header persists; segment dialog create/update/delete persists; list summary updates from segment order  
**Acceptance scenarios:** see ### US-30.3

### US-30.4: Maintain Airport and Airline code catalogs
**As a** System Admin (manage) / trip staff (read for dropdowns)  
**I want** Airport Code and Airline Code tables available for segment entry  
**So that** segments use consistent codes and cities

**Priority:** P1  
**Independent test:** Staff can list airports/airlines for selectors; System Admin can create/update/delete catalog rows  
**Acceptance scenarios:** see ### US-30.4

### US-30.5: Choose flight purchase option on trip application
**As a** trip applicant  
**I want** to choose whether I purchase my own air travel or the organization arranges it, and when the organization arranges it, to enter preferred departure/return airports, class of travel, and airline  
**So that** staff know how to book or expect my flights

**Priority:** P1  
**Independent test:** Apply/edit application shows two purchase options (own vs org name); org choice reveals preference fields; values persist on `tripPeopleRole`; required for `applied`  
**Acceptance scenarios:** see ### US-30.5

---

## Requirements

### Functional Requirements

- **FR-001**: Trips list (`TripsList`) Actions column MUST include a **Flights** control that navigates to the trip flights page for that trip.
- **FR-002**: Flights page route MUST be authenticated and trip-scoped (e.g. `/trips/:tripId/flights`, name `tripFlights`).
- **FR-003**: Only users who MAY manage the trip roster for that trip (Trip Leader for the trip, Org Admin for the trip’s org, or System Admin) MAY open or mutate flight data for that trip. Others → `403`/`404` / redirect home consistent with other staff trip tools.
- **FR-004**: The flights page heading MUST show at least trip **name** and trip **start** / **end** dates.
- **FR-005**: The page MUST list **eligible participants** (see Assumptions) — one row per `tripPeopleRole` — showing at least:
  - Participant **first name** and **last name**
  - From the **application**: **who purchases** the flight (`self` → participant; `organization` → organization name) and, when organization, **preference text** (preferred departure/return airports, class of travel, airline)
  - **Purchased** (whether the participant purchased the flight — editable Yes/No or checkbox)
  - **Cost** (nullable money; editable; empty allowed)
  - **Comments** (optional text; editable on the row or in an expandable/detail field — MUST be persistable with the flight record)
  - From segments (read-only summary):
    - **Initial departure** date, time, and **departure city** (city of the departure airport on the lowest `segmentNumber`)
    - **Final arrival** date, time, and **arrival city** (city of the arrival airport on the highest `segmentNumber`)
  - When the participant has no segments → summary fields show **—** (or equivalent empty indicator)
- **FR-006**: Each eligible participant has at most **one flight record** for the trip (keyed by `tripPeopleRoleId`). Opening the page or first save MAY lazily create an empty flight record; GET MUST return a flight payload per participant even when no row exists yet (defaults: purchased `false`, cost `null`, comments empty, segments `[]`).
- **FR-007**: A **flight record** stores: link to participant assignment (`tripPeopleRoleId`), **purchased** (boolean), **cost** (nullable decimal), **comments** (text, optional).
- **FR-008**: A flight has an ordered sequence of **flight segments**. Each segment stores:
  - **Segment number** (positive integer; unique per flight; order of itinerary)
  - **Departure airport code** (FK → Airport Code)
  - **Airline code** (FK → Airline Code)
  - **Flight number** (string)
  - **Departure date** (date)
  - **Departure time** (time)
  - **Arrival airport code** (FK → Airport Code)
  - **Arrival date** (date)
  - **Arrival time** (time)
  - **Class** (optional cabin/service class text)
  - **Seat number** (optional)
- **FR-009**: Each participant row MUST provide a **Flight segments** control (link/button) that opens a dialog to **add**, **edit**, and **delete** that participant’s segments. Dialog MUST support multiple segments; Save in the dialog persists the full segment list for that flight (replace or per-row CRUD — either is fine if net result matches and tests pass). Closing without save MAY discard unsaved dialog edits (optional confirm out of scope).
- **FR-010**: Segment entry MUST use **Airport Code** and **Airline Code** catalogs (select by code; display name/city as helpful labels). Invalid / unknown codes → `400`.
- **FR-011**: **Airport Code** catalog table stores: **Code** (unique, e.g. IATA), **Airport** (name), **City**, **Country**.
- **FR-012**: **Airline Code** catalog table stores: **Airline Code** (unique), **Airline Name**.
- **FR-013**: System Admin MUST be able to **create / update / delete** Airport and Airline catalog rows (minimal admin UI or settings screens; API required). Trip Leader / Org Admin / System Admin MUST be able to **list** airports and airlines for segment dropdowns.
- **FR-014**: Saving purchased / cost / comments from the flights page MUST persist the flight record (create or update) without requiring segments.
- **FR-015**: After segment changes, reloading the flights page MUST refresh initial departure / final arrival summary from segments ordered by `segmentNumber` ascending.
- **FR-016**: Empty states: no eligible participants → empty table message (e.g. **No participants**). Trip heading still shows.
- **FR-017**: Back control returns to trips list (**Back to trips**).
- **FR-018**: Money formatting for cost MUST match existing trip/donation display conventions when shown.
- **FR-019**: Trip application (apply dialog and edit-application page) MUST collect a **flight purchase option**:
  - **Arrange for and purchase my own air travel** (`self`)
  - **{Organization name} arrange for and purchase my air travel** (`organization`)
- **FR-020**: When `organization` is selected, the application MUST collect **preferred departure airport**, **preferred return airport**, **class of travel**, and **preferred airline** (airport/airline from global catalogs). When `self` is selected, those preference fields MUST be cleared and hidden.
- **FR-021**: Flight purchase option is **required** for application status `applied`. When `organization`, the four preference fields are also required for `applied`. Incomplete apps may save without them (status `incomplete`).
- **FR-022**: Staff view-application UI MUST show the flight purchase option and, when organization, the preference values.

---

## Assumptions

- **Eligible participants:** `tripPeopleRole` status in `incomplete`, `applied`, or `approved` (exclude `cancelled` and `declined` — “denied” = `declined`).
- Auth gate matches Feature 28 / 29 staff manage (Trip Leader / Org Admin / System Admin).
- **One flight record per** `tripPeopleRole` (unique).
- Initial/final itinerary summary uses **min/max `segmentNumber`**, not calendar sort (staff owns segment numbering).
- Departure/arrival **city** comes from the Airport catalog’s **City** for the segment’s departure/arrival airport code.
- Airport and Airline catalogs are **global** (not org-scoped).
- Seed loads the global IATA catalogs from `backend/app/data/airports.json` and `airlines.json` (`npm run seed` / `npm run seed:catalogs`). System Admin can still extend.
- Times stored/displayed in local wall-clock form as entered (no timezone conversion required in v1).

## Edge Cases

- Participant with zero segments → summary **—**; purchased/cost/comments still editable.
- Duplicate `segmentNumber` on the same flight → `400`.
- Arrival before departure on a segment → `400` (same-day times must be consistent; cross-midnight allowed if arrival date &gt; departure date).
- Cost negative → `400`. Cost blank/`null` → stored null.
- Deleting all segments leaves flight header intact.
- Catalog delete blocked (`409`/`400`) when code is referenced by any segment.
- System admin with no acting org → same trip access as other staff trip pages.

## Success Criteria

- **SC-001**: Staff can open Flights from the trips list.
- **SC-002**: Flights page lists eligible participants with purchased, cost, and segment-derived itinerary summary.
- **SC-003**: Flight segments dialog can add/edit/delete segments; summary updates after save.
- **SC-004**: Airport and Airline catalogs exist and are usable for segment entry; System Admin can manage them.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Read/write trip flights** | Trip Leader for trip, Org Admin for org, or System Admin only |
| **Airport / Airline list** | Authenticated trip staff (same roles as above) for dropdowns |
| **Airport / Airline write** | System Admin only |
| **Cross-org** | No flight board for trips outside manage scope (`403`/`404`) |

---

## Key Entities

- **Airport** — code, airport name, city, country
- **Airline** — airline code, airline name
- **TripFlight** — per `tripPeopleRole`: purchased, cost, comments
- **TripFlightSegment** — ordered segment fields linked to a trip flight
- **TripPeopleRole** / **Trip** — participant eligibility and page heading

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/trips/:id/flights` | auth + trip staff | Trip summary + participant flight rows (header + derived itinerary + segment count) |
| `PUT` | `/trips/trips/:id/flights/:tripPeopleRoleId` | auth + trip staff | Upsert flight header (`purchased`, `cost`, `comments`) for that assignment |
| `GET` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth + trip staff | List segments for that participant’s flight |
| `PUT` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth + trip staff | Replace full segment list for that flight (create flight if missing) |
| `GET` | `/trips/airports` | auth + trip staff (or any auth) | List airport catalog |
| `POST` | `/trips/airports` | sysadmin | Create airport |
| `PUT` | `/trips/airports/:id` | sysadmin | Update airport |
| `DELETE` | `/trips/airports/:id` | sysadmin | Delete if unused |
| `GET` | `/trips/airlines` | auth + trip staff (or any auth) | List airline catalog |
| `POST` | `/trips/airlines` | sysadmin | Create airline |
| `PUT` | `/trips/airlines/:id` | sysadmin | Update airline |
| `DELETE` | `/trips/airlines/:id` | sysadmin | Delete if unused |

**Illustrative participant row (GET flights):**

```json
{
  "tripPeopleRoleId": 101,
  "peopleId": 55,
  "firstName": "Ada",
  "lastName": "Applicant",
  "purchased": true,
  "cost": 850.00,
  "comments": "Booked via agency",
  "segmentCount": 2,
  "initialDeparture": {
    "date": "2026-07-01",
    "time": "08:30",
    "city": "Dallas",
    "airportCode": "DFW"
  },
  "finalArrival": {
    "date": "2026-07-01",
    "time": "16:45",
    "city": "Guatemala City",
    "airportCode": "GUA"
  }
}
```

**Illustrative segment:**

```json
{
  "segmentNumber": 1,
  "departureAirportCode": "DFW",
  "airlineCode": "AA",
  "flightNumber": "1234",
  "departureDate": "2026-07-01",
  "departureTime": "08:30",
  "arrivalAirportCode": "GUA",
  "arrivalDate": "2026-07-01",
  "arrivalTime": "16:45",
  "cabinClass": "Economy",
  "seatNumber": "12A"
}
```

**Status codes:** `200` success; `400` validation; `403`/`404` access; `401` unauthenticated; catalog delete in use → `400`/`409`.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripsList` | Actions: **Flights** → trip flights page |
| Trip flights page | Heading (trip name + dates); participant table; Save for header fields as needed; **Back to trips** |
| Participant row | Name; purchased; cost; comments; itinerary summary; **Flight segments** link |
| Flight segments dialog | Ordered list; add / edit / delete segments; airport & airline selectors; Save / Close |
| Airport / Airline admin | Minimal System Admin screens or settings to CRUD catalogs (list + add/edit/delete) |

**Action label:** `Flights`  
**Page title:** e.g. `{Trip name} — Flights`  
**Dialog title:** e.g. `Flight segments — {First} {Last}`

---

## Data Model Requirements

| Table | Columns (conceptual) | Notes |
|-------|----------------------|--------|
| `airport` | `id`, `code` (unique), `airportName`, `city`, `country` | Global catalog |
| `airline` | `id`, `code` (unique), `name` | Global catalog |
| `tripFlight` | `id`, `tripPeopleRoleId` (unique), `purchased`, `cost` (nullable), `comments` | 1:1 with assignment |
| `tripFlightSegment` | `id`, `tripFlightId`, `segmentNumber`, `departureAirportId` (or code FK), `airlineId` (or code FK), `flightNumber`, `departureDate`, `departureTime`, `arrivalAirportId`, `arrivalDate`, `arrivalTime`, `cabinClass` (nullable), `seatNumber` (nullable) | Unique `(tripFlightId, segmentNumber)` |

Prefer FK to airport/airline `id` (or unique code) consistently. Associations: TripPeopleRole `hasOne` TripFlight; TripFlight `hasMany` TripFlightSegment; Segment `belongsTo` Airport (×2) and Airline.

Migration / Sequelize sync required. Seed global airports/airlines from `app/data/*.json` (`npm run seed:catalogs`).

---

## Acceptance Criteria (Gherkin)

### US-30.1 — Open flights from trips list

#### Scenario: Staff opens Flights from trips list
* **Given** I can see a trip on the trips list
* **When** I click **Flights** in that trip’s Actions column
* **Then** I am taken to the flights page for that trip

#### Scenario: Unauthorized user cannot open trip flights
* **Given** I am signed in without trip staff access for trip T
* **When** I request the flights page or API for T
* **Then** access is denied (`403`/`404` / redirect consistent with other staff trip tools)

### US-30.2 — See participant flight summary board

#### Scenario: Page lists eligible participants with itinerary summary
* **Given** trip T has approved participant Ada with two segments (segment 1 departs DFW / Dallas at 08:30 on 2026-07-01; segment 2 arrives GUA / Guatemala City at 16:45 on 2026-07-01)
* **And** Ada’s flight is marked purchased with cost 850
* **When** I open Flights for T
* **Then** Ada’s row shows purchased Yes (or checked), cost 850
* **And** initial departure shows 2026-07-01, 08:30, Dallas
* **And** final arrival shows 2026-07-01, 16:45, Guatemala City

#### Scenario: Cancelled participant is not listed
* **Given** trip T has a cancelled participant
* **When** I open Flights for T
* **Then** that participant does not appear on the flights board

### US-30.3 — Edit flight header and manage segments in a dialog

#### Scenario: Staff saves purchased and cost
* **Given** I am on Flights for trip T with participant Ada
* **When** I set purchased to Yes, cost to 500, and save Ada’s flight header
* **Then** reloading shows purchased Yes and cost 500 for Ada

#### Scenario: Flight segments dialog add and delete
* **Given** I am on Flights for trip T with participant Ada who has no segments
* **When** I open **Flight segments** for Ada
* **And** I add a valid segment and save
* **Then** Ada’s itinerary summary reflects that segment
* **When** I open the dialog again, delete the segment, and save
* **Then** Ada’s itinerary summary shows empty indicators

### US-30.4 — Maintain Airport and Airline code catalogs

#### Scenario: System admin creates an airport
* **Given** I am a System Admin
* **When** I create airport code `DFW` with city Dallas
* **Then** `DFW` appears in the airport list for segment selectors

#### Scenario: Segment rejects unknown airport code
* **Given** I am editing segments for a participant
* **When** I save a segment with an airport code that is not in the catalog
* **Then** the save fails with a validation error

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-30.1 | Staff opens Flights from trips list | `frontend/tests/TripFlights.test.js` | `Staff opens Flights from trips list` |
| US-30.1 | Unauthorized user cannot open trip flights | `backend/tests/trip-flights.test.js` | `Unauthorized user cannot open trip flights` |
| US-30.2 | Page lists eligible participants with itinerary summary | `backend/tests/trip-flights.test.js` | `Page lists eligible participants with itinerary summary` |
| US-30.2 | Cancelled participant is not listed | `backend/tests/trip-flights.test.js` | `Cancelled participant is not listed` |
| US-30.3 | Staff saves purchased and cost | `backend/tests/trip-flights.test.js` | `Staff saves purchased and cost` |
| US-30.3 | Flight segments dialog add and delete | `frontend/tests/TripFlights.test.js` (and/or backend segment PUT) | `Flight segments dialog add and delete` |
| US-30.4 | System admin creates an airport | `backend/tests/trip-flights.test.js` | `System admin creates an airport` |
| US-30.4 | Segment rejects unknown airport code | `backend/tests/trip-flights.test.js` | `Segment rejects unknown airport code` |
| US-30.5 | Organization flight purchase preferences are saved on the application | `backend/tests/applications.test.js` | `Organization flight purchase preferences are saved on the application` |

---

## Agent implementation request

```text
Implement Feature 30 from @features/feature-30-participant-flights.md on branch `feature/30-participant-flights`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` (backend + frontend as needed) before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md` (flights + airport/airline endpoints), `data-model.md` (airport, airline, tripFlight, tripFlightSegment), `behavior.md` (flight board rules)

---

## Definition of Done

*   [x] **Flights** on Trips list; trip flights page (**FR-001**–**FR-005**)
*   [x] Flight header fields persist; segment dialog add/edit/delete (**FR-006**–**FR-010**, **FR-014**–**FR-015**)
*   [x] Airport and Airline catalogs with list + System Admin CRUD (**FR-011**–**FR-013**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] Tests green
*   [ ] On `feature/30-participant-flights`; PR → `dev`

---

## Out of Scope

- Applicant self-service flight entry
- Automatic fare shopping / GDS / Amadeus integration
- Seat assignments or ticket PNRs beyond comments
- Multi-city calendar sorting independent of `segmentNumber`
- Org-scoped airport/airline catalogs
- Emailing itineraries
- Real-time collaborative editing
