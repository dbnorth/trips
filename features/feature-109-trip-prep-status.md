# Trip Prep Status on the Trip Card

**Feature ID:** 109
**Branch pattern:** `feature/109-trip-prep-status`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "create a new spec for trip prep status display on the Trip Card. Next to the trip status show a info icon in red for all not complete and green for all completed. Here is the list of items to display as complete or not complete 1) All roles filled (number needed is zero) 2) All participants are approved 3) All funds raised (total cost <= total donations) 4) Flight segments entered for all participants 5) Room List created that includes all participants."

Staff checking whether a trip is ready have to open the Status, Flights, and Room list pages one by one. This feature puts a prep status icon next to each trip's **Status** in the trips table: green when all five prep items are complete, red when any is not, with a tooltip listing each item as complete or not complete.

## Clarifications

### Session 2026-11-03

- Q: Which trip card? → A: The **Organization Trips** card on Home (System Admin with an organization selected, Org Admin). It uses the shared trips table (Feature 108), so the **Trips** page gets the icon too. Agents' Flights-only card is unchanged.
- Q: Icon color? → A: Green when all five items are complete; red when any item is not complete.
- Q: Who are "participants"? → A: The people on the trip's Flights and Room list boards: Trip Leaders and Trip Participants whose application is incomplete, pre-approved, or approved. Cancelled and declined applications don't count.
- Q: When are flights "entered" for a participant? → A: Their flight has at least one **Arrival** segment and at least one **Return** segment.
- Q: A trip with no participants? → A: "All participants approved", "Flights entered", and "Room list" are not complete — there is nothing to prepare yet.

**Depends on:**
- [Feature 29 — Rooming List](feature-29-rooming-list.md) (Room list and room assignments)
- [Feature 30 — Participant Flights](feature-30-participant-flights.md) (flight segments)
- [Feature 104 — Pre-Approved Status and Document Review](feature-104-pre-approved-document-review.md) (application statuses)
- [Feature 108 — Home Organization Trips Match the Trips List](feature-108-home-trips-match-trips-list.md) (shared trips table, **Total Roles** / unfilled roles, total cost, total donations)

---

## User Stories

### US-109.1: See whether a trip is ready

**As** an Org Admin or System Admin
**I want** an icon next to each trip's status that shows which prep items are done
**So that** I can see which trips need work without opening each trip's pages

**Acceptance:** see Gherkin scenarios under US-109.1.

---

## Requirements

### Functional Requirements

- **FR-001**: In the shared trips table (Home **Organization Trips** for System Admins with an organization selected and Org Admins, and the **Trips** page), each row's **Status** cell shows an info icon (`mdi-information-outline`) after the status text: **green** when all five prep items (FR-002) are complete, **red** when any is not complete. The icon has an `aria-label` of "Trip prep status" and can be focused with the keyboard.
- **FR-002**: The icon's tooltip lists the five prep items in this order, each with a green check (`mdi-check-circle`) when complete or a red mark (`mdi-close-circle`) when not complete:
  1. **All roles filled**: no trip role has fewer pre-approved and approved members than its quantity (the trip has no unfilled roles — Feature 108's **Total Roles** rule).
  2. **All participants approved**: the trip has at least one participant, and every participant's application is approved.
  3. **All funds raised**: total cost is less than or equal to total donations (the table's **Total cost** and **Total donations** values).
  4. **Flights entered for all participants**: the trip has at least one participant, and every participant's flight has at least one Arrival segment and at least one Return segment.
  5. **Room list includes all participants**: the trip has a saved Room list, and every participant is assigned to a room on it.
- **FR-003**: "Participants" in FR-002 are the trip's Trip Leaders and Trip Participants whose application is incomplete, pre-approved, or approved — the same people as the Flights and Room list boards.
- **FR-004**: Agent users' Organization Trips card is unchanged (Feature 85).

---

## Assumptions

- `GET /trips/trips` already returns `unfilledRoles`, `totalParticipantCost`, and `donationTotal` (Feature 108); it adds a `prepStatus` object for the other items.
- The prep status reflects the data when the list loads; it refreshes when the list reloads.

## Edge Cases

- A trip with no roles → **All roles filled** is complete.
- A trip with no participants → items 2, 4, and 5 are not complete; the icon is red.
- Total cost $0 and donations $0 → **All funds raised** is complete.
- A participant with a flight record but no segments, or only Arrival (or only Return) segments → **Flights entered** is not complete.
- A Room list saved before a new participant applied → **Room list** is not complete until that person is assigned a room.
- A cancelled or declined application → not a participant; it doesn't affect any item.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Staff can tell from the trips table which trips are fully prepared (green) and, from the tooltip, which items are missing on the rest.

---

## Data Ownership & Isolation

No change. The prep status is computed only for trips the caller can already list.

---

## Key Entities

No change. `GET /trips/trips` adds a computed `prepStatus`.

---

## API Requirements

`GET /trips/trips`: each trip adds `prepStatus`:

```json
{
  "rolesFilled": true,
  "participantsApproved": false,
  "fundsRaised": true,
  "flightsEntered": false,
  "roomListComplete": false
}
```

- `rolesFilled`: `unfilledRoles` is empty.
- `participantsApproved`: at least one participant (FR-003), and all are `approved`.
- `fundsRaised`: `totalParticipantCost <= donationTotal`.
- `flightsEntered`: at least one participant, and each has a `tripFlight` with at least one `tripFlightSegment` of `segmentType` `arrival` and at least one of `return`.
- `roomListComplete`: the trip has a `tripRoomingList`, at least one participant, and each participant has a `tripRoomAssignment` in one of that list's rooms.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| Shared trips table (`TripsTable`) **Status** cell | Status text plus the prep status icon and tooltip (FR-001, FR-002) |
| `Home` **Organization Trips** (Agent) | Unchanged (FR-004) |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions" has trip "Guatemala Clinic 2027" with roles Nurse (2) and Doctor (1).
- Olivia is an Org Admin of Hope Missions with it selected.

### US-109.1 — See whether a trip is ready

#### Scenario: A fully prepared trip shows a green prep icon
* **Given** Guatemala Clinic 2027 has two approved Nurses and an approved Doctor and no other applications
* **And** total cost is $3,000.00 and donations are $3,000.00
* **And** each of the three has an Arrival and a Return flight segment and a room on the saved Room list
* **When** Olivia opens Home
* **Then** the trip's **Status** cell shows a green prep icon
* **And** its tooltip shows all five items complete: All roles filled, All participants approved, All funds raised, Flights entered for all participants, Room list includes all participants

#### Scenario: An unprepared trip shows a red prep icon with the missing items
* **Given** Guatemala Clinic 2027 has an approved Nurse with Arrival and Return flight segments and a room, and a pre-approved Nurse with only an Arrival segment and no room
* **And** total cost is $2,000.00 and donations are $500.00
* **When** Olivia opens Home
* **Then** the trip's **Status** cell shows a red prep icon
* **And** its tooltip shows not complete for All roles filled, All participants approved, All funds raised, Flights entered for all participants, and Room list includes all participants

#### Scenario: Trips list returns each trip's prep status
* **Given** Guatemala Clinic 2027 has two approved Nurses and a pre-approved Doctor, each with Arrival and Return flight segments
* **And** the saved Room list assigns both Nurses but not the Doctor
* **And** total cost is $3,000.00 and donations are $3,500.00
* **When** Olivia loads the trips list
* **Then** the trip's `prepStatus` is rolesFilled true, participantsApproved false, fundsRaised true, flightsEntered true, roomListComplete false

#### Scenario: A trip with no participants is not prepared
* **Given** "Peru 2099" has no roles and no applications
* **When** Olivia loads the trips list
* **Then** its `prepStatus` is rolesFilled true, participantsApproved false, fundsRaised true, flightsEntered false, roomListComplete false

#### Scenario: Cancelled applications don't affect prep status
* **Given** the fully prepared Guatemala Clinic 2027 also has a cancelled Nurse application with no flight and no room
* **When** Olivia loads the trips list
* **Then** every `prepStatus` item is true

#### Scenario: Flights need both an Arrival and a Return segment
* **Given** the fully prepared Guatemala Clinic 2027 also has an approved Nurse with only an Arrival segment and a room
* **When** Olivia loads the trips list
* **Then** `flightsEntered` is false and `roomListComplete` is true

#### Scenario: One item not complete makes the prep icon red
* **Given** Guatemala Clinic 2027 has every prep item complete except All funds raised
* **When** Olivia opens Home
* **Then** the prep icon is red and only All funds raised is marked not complete

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-109.1 | A fully prepared trip shows a green prep icon | `frontend/tests/TripPrepStatus.test.js` | `A fully prepared trip shows a green prep icon` |
| US-109.1 | An unprepared trip shows a red prep icon with the missing items | `frontend/tests/TripPrepStatus.test.js` | `An unprepared trip shows a red prep icon with the missing items` |
| US-109.1 | Trips list returns each trip's prep status | `backend/tests/trip-prep-status.test.js` | `Trips list returns each trip's prep status` |
| US-109.1 | A trip with no participants is not prepared | `backend/tests/trip-prep-status.test.js` | `A trip with no participants is not prepared` |
| US-109.1 | Cancelled applications don't affect prep status | `backend/tests/trip-prep-status.test.js` | `Cancelled applications don't affect prep status` |
| US-109.1 | Flights need both an Arrival and a Return segment | `backend/tests/trip-prep-status.test.js` | `Flights need both an Arrival and a Return segment` |
| US-109.1 | One item not complete makes the prep icon red | `frontend/tests/TripPrepStatus.test.js` | `One item not complete makes the prep icon red` |

---

## Agent implementation request

```text
Implement Feature 109 from @features/feature-109-trip-prep-status.md on branch `feature/109-trip-prep-status` (branched from dev after Feature 108 is merged).

Backend: in GET /trips/trips (trip.controller.js findAll), add `prepStatus` per trip per API Requirements. Load participants (Trip Leader / Trip Participant, status incomplete | pre_approved | approved) for all listed trips in one query; load their tripFlights with Arrival / Return segment counts, the trips' tripRoomingLists, and room assignments in batched queries (no per-trip queries). Reuse Feature 108's unfilledRoles, totalParticipantCost, donationTotal.
Frontend: TripsTable.vue Status cell — status text plus an mdi-information-outline icon (green when all five true, else red; aria-label "Trip prep status", tabindex 0) with a v-tooltip listing the five items in order with mdi-check-circle (success) / mdi-close-circle (error).
Tests per the Test Coverage Map. Update features/reference/api.md and behavior.md.
```

---

## Definition of Done

*   [x] Prep icon and tooltip per **FR-001**, **FR-002**
*   [x] Participants per **FR-003**; Agents unchanged per **FR-004**
*   [x] `prepStatus` per API Requirements
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Links from the tooltip to the Status, Flights, or Room list pages.
- Counts in the tooltip (for example how many participants are missing flights).
- Prep status anywhere other than the shared trips table (trip page, Trip Leader Home table, Agent card).
- Saving or caching the prep status.
