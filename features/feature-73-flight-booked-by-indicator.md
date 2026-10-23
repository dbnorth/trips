# Feature: Flight "Booked by" Indicator

**Feature ID:** 73
**Branch pattern:** `feature/73-flight-booked-by-indicator`
**Status:** Implemented
**Created:** 2026-10-22
**Input:** "Add a feature spec to indicate if the org is booking the flights or the participant is booking the flight on pages that list participants and/or flight segments. Those pages include: trips flight page, trip status page, Flight segment entry (on heading)." Each application records who buys the air travel (`tripPeopleRole.flightPurchaseOption`: `organization` or `self`, Feature 30). Today only the Flights page shows it (column **Who purchases**: "Participant purchases" / "*Org* purchases") and the Flights PDF (**Booked by**: Org / Participant, Feature 55). The **Trip Status** board and the **Flight segments** dialog don't show it, so staff can't tell from those screens whether they or the participant must book the flight.
**Depends on:** [Feature 28 — View Trip Status](feature-28-view-trip-status.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 55 — Flights PDF](feature-55-flights-pdf.md), [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md)

---

## User Stories

### US-73.1: See who books each participant's flight
**As a** Trip Leader, Org Admin, or System Admin  
**I want** the Flights page, the Trip Status board, and the Flight segments dialog to show whether the organization or the participant books the flight  
**So that** I know which flights I must buy and which I wait for the participant to enter

**Priority:** P2  
**Independent test:** A trip with one participant who chose the organization, one who chose to buy their own, and one who hasn't chosen → each screen shows the organization's name, "Participant", and "Not chosen" respectively  
**Acceptance scenarios:** see ### US-73.1

---

## Requirements

### Functional Requirements

- **FR-001**: One label and one set of values MUST be used on every screen in this feature. Label **Booked by**; value from the application's flight purchase option:
  - `organization` → the trip organization's name ("Organization" when the organization has no name);
  - `self` → "Participant";
  - none chosen → "Not chosen".
- **FR-002**: **Flights page** (`TripFlightsView`): the **Who purchases** column is renamed **Booked by** and shows the FR-001 value. The organization's flight preferences text stays under the value for `organization`, as today.
- **FR-003**: **Trip Status** board (`TripStatusView`): a new sortable **Booked by** column directly after **Role** shows the FR-001 value for each participant.
- **FR-004**: **Flight segments** dialog (`FlightSegmentsDialog`): directly under the heading "Flight segments — *name*", a line "Booked by: *value*" (FR-001). It shows wherever the dialog opens: the Flights page (staff), and the Home page and trip page (participant who books their own flight).
- **FR-005**: `GET /trips/trips/:id/status` MUST add `flightPurchaseOption` (`organization`, `self`, or `null`) to each participant row. The trip summary already has `organizationName`.
- **FR-006**: `GET /trips/trips/:id/flights/:tripPeopleRoleId/segments` MUST add `flightPurchaseOption` and `organizationName` to its response, so the dialog shows FR-004 without extra props from the page that opens it.
- **FR-007**: Access to all three screens and both endpoints stays as today; nothing about who may view or edit flights changes.

---

## Assumptions

- "Booked by" matches the wording of the Flights PDF (Feature 55) and the request. The Flights page's current "Who purchases" / "Participant purchases" wording changes to match (FR-002).
- Screens show the organization's name rather than "Org" (the PDF keeps "Org"; see Out of Scope).
- The flight purchase option is already stored on every application; no schema change.

## Edge Cases

- Application with no flight purchase option chosen (older or incomplete applications) → "Not chosen" on all three screens.
- Organization with no name → "Organization".
- Participant opens the dialog from Home or the trip page → the line reads "Booked by: Participant" (only participants who book their own flight can open it, Feature 60).
- Participant changes their choice on the application → the next load of each screen shows the new value.

## Success Criteria

- **SC-001**: On each of the three screens, staff can tell for every participant whether the organization or the participant books the flight, without opening the application.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No change. The values come from the participant's own application and are shown only to the people who can already open these screens.

---

## Key Entities

- **Trip people role (application)** — `flightPurchaseOption` (read only)
- **Organization** — `name` (read only)

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `GET` | `/trips/trips/:id/status` | auth (trip staff) | Each participant row adds `flightPurchaseOption` (FR-005) |
| `GET` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth (trip staff, or own participant when `self`) | Response adds `flightPurchaseOption` and `organizationName` (FR-006) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Flights page (`TripFlightsView`) | Column **Who purchases** → **Booked by**; values per FR-001; preferences text unchanged (FR-002) |
| Trip Status board (`TripStatusView`) | New sortable **Booked by** column after **Role** (FR-003) |
| Flight segments dialog (`FlightSegmentsDialog`) | "Booked by: *value*" line under the heading (FR-004) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-73.1 — See who books each participant's flight

Background: trip "Guatemala Hospital Ezel" of organization "Test Mission Org" has applied participants Nora (flight purchase option `organization`), Rita (`self`), and Hank (none chosen).

#### Scenario: Trip Status API returns each participant's flight purchase option
* **Given** a Trip Leader of the trip
* **When** they request `GET /trips/trips/:id/status`
* **Then** Nora's row has `flightPurchaseOption` "organization", Rita's "self", and Hank's `null`

#### Scenario: Flight segments API returns the flight purchase option and organization name
* **Given** a Trip Leader of the trip
* **When** they request Nora's flight segments
* **Then** the response has `flightPurchaseOption` "organization" and `organizationName` "Test Mission Org"

#### Scenario: A participant's own flight segments include their flight purchase option
* **Given** Rita is signed in
* **When** she requests her own flight segments
* **Then** the response has `flightPurchaseOption` "self"

#### Scenario: Flights page shows Booked by
* **When** a Trip Leader opens the trip's Flights page
* **Then** the column header is "Booked by"
* **And** Nora's row shows "Test Mission Org", Rita's "Participant", and Hank's "Not chosen"

#### Scenario: Trip Status board shows Booked by
* **When** a Trip Leader opens the trip's Trip Status board
* **Then** a "Booked by" column follows "Role"
* **And** Nora's row shows "Test Mission Org", Rita's "Participant", and Hank's "Not chosen"

#### Scenario: Flight segments dialog shows Booked by under the heading
* **When** the Flight segments dialog opens for Nora
* **Then** it shows "Booked by: Test Mission Org" under "Flight segments — Nora …"
* **And** for Rita it shows "Booked by: Participant"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-73.1 | Trip Status API returns each participant's flight purchase option | `backend/tests/trip-status.test.js` | `Trip Status API returns each participant's flight purchase option` |
| US-73.1 | Flight segments API returns the flight purchase option and organization name | `backend/tests/trip-flights.test.js` | `Flight segments API returns the flight purchase option and organization name` |
| US-73.1 | A participant's own flight segments include their flight purchase option | `backend/tests/trip-flights.test.js` | `A participant's own flight segments include their flight purchase option` |
| US-73.1 | Flights page shows Booked by | `frontend/tests/TripFlights.test.js` | `Flights page shows Booked by` |
| US-73.1 | Trip Status board shows Booked by | `frontend/tests/TripStatus.test.js` | `Trip Status board shows Booked by` |
| US-73.1 | Flight segments dialog shows Booked by under the heading | `frontend/tests/FlightSegmentsDialog.test.js` | `Flight segments dialog shows Booked by under the heading` |

---

## Agent implementation request

```text
Implement Feature 73 from @features/feature-73-flight-booked-by-indicator.md on branch `feature/73-flight-booked-by-indicator`.

Follow layer order in @features/framework.md.
Backend: trip.controller.js findStatus adds flightPurchaseOption to each participant row (FR-005); tripFlight.controller.js findSegments adds flightPurchaseOption and organizationName (FR-006).
Frontend: one shared formatter for the FR-001 values; TripFlightsView column rename (FR-002); TripStatusView Booked by column after Role (FR-003); FlightSegmentsDialog "Booked by:" line under the title from the segments response (FR-004).
Map every Gherkin scenario in the Test Coverage Map; update existing TripFlights tests that assert "Who purchases" / "Participant purchases"; run backend and frontend `npm test` before finishing.
Living reference: api.md (status and segments rows), behavior.md (Feature 73 row; Trip Status and Participant flights rows mention Booked by).
Do not change the Flights PDF, the participant CSV, the application form, or flight access rules.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md`, `behavior.md`

---

## Definition of Done

*   [x] Shared **Booked by** values per **FR-001**
*   [x] Flights page, Trip Status board, and Flight segments dialog per **FR-002**, **FR-003**, **FR-004**
*   [x] Status and segments API fields per **FR-005**, **FR-006**; access unchanged per **FR-007**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- The Flights PDF (already has **Booked by**: Org / Participant) and the participant CSV export
- Filtering or grouping by Booked by
- Changing the flight purchase choice from these screens; it stays on the application
- My Trip Info and My Trips next steps (participant views other than the dialog)
