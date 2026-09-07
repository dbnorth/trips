# Feature: Rooming List

**Feature ID:** 29
**Branch pattern:** `feature/29-rooming-list`
**Status:** Done
**Created:** 2026-09-07
**Input:** Staff rooming list per trip: hotel name, check-in date, notes, and rooms (number, type, nights) with assigned participants. Trips list **Room list** opens an edit page headed with trip name and dates; editable hotel / check-in / comments; participant rows with room number, nights, room type (King / Double / Triple), plus read-only roommate preference from the application; Save creates/updates rooms and assignments
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-29.1: Open rooming list from trips list
**As a** Trip Leader, Org Admin, or System Admin  
**I want** a **Room list** action on the trips list  
**So that** I can open the rooming editor for that trip

**Priority:** P1  
**Independent test:** Trips list Actions includes **Room list**; click navigates to the rooming edit route for that trip; unauthorized users cannot open it  
**Acceptance scenarios:** see ### US-29.1

### US-29.2: Edit hotel header and participant room assignments
**As a** Trip Leader, Org Admin, or System Admin  
**I want** a page headed with the trip name and trip start/end dates, with hotel name, check-in date, and comments, plus a list of participants with editable room number / nights / room type and read-only roommate preference fields from the application  
**So that** I can plan lodging against what applicants asked for

**Priority:** P1  
**Independent test:** Page loads trip identity + hotel fields + one row per eligible participant with editable assignment fields and displayed `hasPreferredRoommate` / `preferredRoommateNames`  
**Acceptance scenarios:** see ### US-29.2

### US-29.3: Save creates or updates rooms and assignments
**As a** Trip Leader, Org Admin, or System Admin  
**I want** Save to persist the hotel header and to create/update rooms and participant↔room assignments from the edited rows  
**So that** the rooming list is stored for the trip

**Priority:** P1  
**Independent test:** After Save, reload shows the same hotel fields and room assignments; rooms exist with number, type, nights; participants link to those rooms  
**Acceptance scenarios:** see ### US-29.3

---

## Requirements

### Functional Requirements

- **FR-001**: Trips list (`TripsList`) Actions column MUST include a **Room list** control that navigates to the rooming edit page for that trip.
- **FR-002**: Rooming edit route MUST be authenticated and trip-scoped (e.g. `/trips/:tripId/rooming`, name `tripRooming`).
- **FR-003**: Only users who MAY manage the trip roster for that trip (Trip Leader for the trip, Org Admin for the trip’s org, or System Admin) MAY open or save the rooming list. Others → `403`/`404` / redirect home consistent with other staff trip tools.
- **FR-004**: The page heading MUST show at least:
  - Trip **name**
  - Trip **start date** and **end date**
- **FR-005**: The page MUST provide editable hotel/header fields for the trip’s rooming list:
  - **Hotel name** (string; required on Save when any room assignment is present — or always required when saving a non-empty list; empty hotel with no assignments MAY save as blank draft)
  - **Start date** / check-in date (date; optional until Save with assignments — prefer required when saving any assignment)
  - **Comments** / notes (text; optional)
- **FR-006**: Below the header, the page MUST list **participants** for the trip (one row per eligible `tripPeopleRole` — see Assumptions) showing:
  - Participant **first name** and **last name** (middle name MAY be omitted on this board)
  - Editable **assigned room number** (string or number label matching the room’s `roomNumber`)
  - Editable **number of nights** (positive integer)
  - Editable **room type** — one of: **King**, **Double**, **Triple**
  - Read-only **Roommate** — **Yes** / **No** from application `hasPreferredRoommate`
  - Read-only **Preferred roommates** — application `preferredRoommateNames` (empty → **—**)
- **FR-007**: A **Rooming list** for a trip stores: `tripId`, hotel name, check-in date, notes, and a collection of **rooms**.
- **FR-008**: Each **room** stores: room **number**, **room type** (`King` | `Double` | `Triple`), **number of nights**, and the **participants assigned** to that room (via assignment rows linking to trip applications / `tripPeopleRole`).
- **FR-009**: **Save** MUST:
  1. Create the rooming list for the trip if none exists, or update hotel name / check-in / notes if it does (**one rooming list per trip**).
  2. Derive rooms from participant rows that have a room number: group by room number; for each group, room type and nights MUST be consistent across assignees in that group (if conflicting values on Save → `400` with a clear message).
  3. Create/update/delete rooms and assignments so persisted state matches the submitted participant grid (participants cleared of room number → unassigned; rooms with no assignees removed).
- **FR-010**: Load (GET) MUST return trip summary (name, start/end), rooming header fields (or empty defaults if none saved), rooms, and participant rows including current assignment (room number / type / nights when assigned) plus roommate preference fields from the application.
- **FR-011**: Empty states: no eligible participants → header still editable; table empty message (e.g. **No participants to assign**). No prior rooming list → blank hotel/date/comments and unassigned rows.
- **FR-012**: Cancel / Back MUST return to the trips list (or trip detail — default **Back to trips**). Unsaved changes MAY be discarded without confirmation in v1 (optional confirm out of scope unless added later).

---

## Assumptions

- **One rooming list per trip** (upsert by `tripId`).
- **Eligible participants** for the board: `tripPeopleRole` rows with status in `incomplete`, `applied`, or `approved` (exclude `cancelled` and `declined`). Staff still see roommate prefs from the application even when incomplete.
- Participant-centric editor: staff edit room number / type / nights **on the person row**; Save materializes `tripRoom` + assignment records. There is no separate “add room” dialog required in v1.
- Room type labels: **King**, **Double**, **Triple** (store as those string enum values).
- Check-in field label on UI: **Start date** (maps to rooming list check-in date — not the trip’s start date, though it often matches).
- Roommate **Yes/No** and preferred names are **display-only** from Feature 7 application fields; editing roommate preference stays on the application screens.
- Auth gate matches Feature 28 Trip Status / roster manage (Trip Leader / Org Admin / System Admin).

## Edge Cases

- Two participants assigned the same room number with different room types or nights on Save → reject with validation error naming the room number.
- Participant with blank room number → unassigned (nights/type ignored or cleared on Save).
- Room number with only whitespace → treat as unassigned.
- Nights ≤ 0 or non-integer when room number present → `400`.
- Trip with no rooming list yet → GET returns null/empty header + participants unassigned.
- System admin with no acting org → same trip access as other staff trip pages.

## Success Criteria

- **SC-001**: Staff can open rooming list from Trips list **Room list**.
- **SC-002**: Page shows trip name/dates, hotel fields, and participant assignment grid with roommate preference display.
- **SC-003**: Save persists hotel header, rooms, and assignments; reload matches.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Read/write rooming** | Trip Leader for trip, Org Admin for org, or System Admin only |
| **Cross-org** | No rooming access for trips outside allowed manage scope (`403`/`404`) |
| **Participant PII** | Names + roommate preference text already on applications; no new public exposure |

---

## Key Entities

- **TripRoomingList** — per trip: hotel name, check-in date, notes
- **TripRoom** — room number, room type, nights; belongs to rooming list
- **TripRoomAssignment** — links a room to a `tripPeopleRole` (participant on that trip)
- **TripPeopleRole** — source of participant identity + `hasPreferredRoommate` / `preferredRoommateNames`
- **Trip** — heading name and dates

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/trips/:id/rooming` | auth + trip staff | Trip summary + rooming header + rooms + participant rows (assignment + roommate prefs) |
| `PUT` | `/trips/trips/:id/rooming` | auth + trip staff | Upsert rooming header; replace rooms/assignments from participant grid payload |

**Illustrative GET shape:**

```json
{
  "trip": {
    "id": 12,
    "name": "Summer Outreach",
    "startDate": "2026-07-01",
    "endDate": "2026-07-14"
  },
  "roomingList": {
    "id": 1,
    "hotelName": "Harbor Inn",
    "checkInDate": "2026-07-01",
    "notes": "Early check-in requested"
  },
  "rooms": [
    {
      "id": 3,
      "roomNumber": "214",
      "roomType": "Double",
      "numberOfNights": 5,
      "assignmentTripPeopleRoleIds": [101, 102]
    }
  ],
  "participants": [
    {
      "tripPeopleRoleId": 101,
      "peopleId": 55,
      "firstName": "Ada",
      "lastName": "Applicant",
      "hasPreferredRoommate": true,
      "preferredRoommateNames": "Grace Hopper",
      "roomNumber": "214",
      "roomType": "Double",
      "numberOfNights": 5
    }
  ]
}
```

**Illustrative PUT body:**

```json
{
  "hotelName": "Harbor Inn",
  "checkInDate": "2026-07-01",
  "notes": "Early check-in requested",
  "assignments": [
    {
      "tripPeopleRoleId": 101,
      "roomNumber": "214",
      "roomType": "Double",
      "numberOfNights": 5
    },
    {
      "tripPeopleRoleId": 102,
      "roomNumber": "214",
      "roomType": "Double",
      "numberOfNights": 5
    }
  ]
}
```

**Status codes:** `200` success; `400` validation; `403`/`404` when trip not manageable; `401` unauthenticated.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripsList` | Actions: **Room list** → rooming edit page |
| Rooming edit page | Heading (trip name + start/end); Hotel name, Start date (check-in), Comments; participant table; **Save**; **Back to trips** |
| Participant row | First + last; editable room number, nights, room type (King / Double / Triple); Roommate Yes/No; Preferred roommates |
| Loading / error | Progress + error alert consistent with other trip staff pages |

**Button / action label:** `Room list`  
**Page title:** e.g. `Rooming list` / `{Trip name} — Rooming`

---

## Data Model Requirements

| Table | Columns (conceptual) | Notes |
|-------|----------------------|--------|
| `tripRoomingList` | `id`, `tripId` (unique), `hotelName`, `checkInDate`, `notes`, timestamps / `version` if optimistic concurrency used elsewhere | 1:1 with trip |
| `tripRoom` | `id`, `tripRoomingListId`, `roomNumber`, `roomType` (enum), `numberOfNights` | Unique room number per rooming list |
| `tripRoomAssignment` | `id`, `tripRoomId`, `tripPeopleRoleId` | Unique `tripPeopleRoleId` per rooming list (one room per participant) |

Associations: Trip `hasOne` TripRoomingList; list `hasMany` TripRoom; room `hasMany` TripRoomAssignment → TripPeopleRole.

Migration required. No change to `tripPeopleRole` roommate columns (read-only source).

---

## Acceptance Criteria (Gherkin)

### US-29.1 — Open rooming list from trips list

#### Scenario: Staff opens Room list from trips list
* **Given** I can see a trip on the trips list
* **When** I click **Room list** in that trip’s Actions column
* **Then** I am taken to the rooming edit page for that trip

#### Scenario: Unauthorized user cannot open rooming list
* **Given** I am signed in without trip staff access for trip T
* **When** I request the rooming page or API for T
* **Then** access is denied (`403`/`404` / redirect consistent with other staff trip tools)

### US-29.2 — Edit hotel header and participant room assignments

#### Scenario: Page shows trip heading, hotel fields, and roommate preferences
* **Given** trip T named “Summer Outreach” runs 2026-07-01 to 2026-07-14
* **And** participant Ada has preferred roommate Yes with names “Grace Hopper”
* **When** I open the rooming list for T
* **Then** the heading shows “Summer Outreach” and those dates
* **And** Ada’s row shows Roommate Yes and preferred roommates “Grace Hopper”
* **And** I can edit hotel name, start date, and comments

#### Scenario: Participant row allows room number, nights, and type
* **Given** I am on the rooming list for trip T with participant Ada
* **When** I set Ada’s room number to 214, nights to 5, and type Double
* **Then** those values are shown on Ada’s row before Save

### US-29.3 — Save creates or updates rooms and assignments

#### Scenario: Save persists hotel and room assignments
* **Given** I am on the rooming list for trip T
* **And** I enter hotel “Harbor Inn”, check-in 2026-07-01, and assign Ada and Grace to room 214 as Double for 5 nights
* **When** I click Save
* **Then** the rooming list is stored for T
* **And** reloading shows the same hotel fields and both participants assigned to room 214

#### Scenario: Conflicting room type on same room number is rejected
* **Given** I assign two participants the same room number with different room types
* **When** I click Save
* **Then** the save fails with a validation error
* **And** the rooming list is not partially applied for that conflicting room

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-29.1 | Staff opens Room list from trips list | `frontend/tests/TripRooming.test.js` | `Staff opens Room list from trips list` |
| US-29.1 | Unauthorized user cannot open rooming list | `backend/tests/trip-rooming.test.js` | `Unauthorized user cannot open rooming list` |
| US-29.2 | Page shows trip heading, hotel fields, and roommate preferences | `backend/tests/trip-rooming.test.js` (and/or frontend) | `Page shows trip heading, hotel fields, and roommate preferences` |
| US-29.2 | Participant row allows room number, nights, and type | `frontend/tests/TripRooming.test.js` | `Participant row allows room number, nights, and type` |
| US-29.3 | Save persists hotel and room assignments | `backend/tests/trip-rooming.test.js` | `Save persists hotel and room assignments` |
| US-29.3 | Conflicting room type on same room number is rejected | `backend/tests/trip-rooming.test.js` | `Conflicting room type on same room number is rejected` |

---

## Agent implementation request

```text
Implement Feature 29 from @features/feature-29-rooming-list.md on branch `feature/29-rooming-list`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` (backend + frontend as needed) before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md` (rooming GET/PUT), `data-model.md` (tripRoomingList / tripRoom / tripRoomAssignment), `behavior.md` (rooming rules)

---

## Definition of Done

*   [x] **Room list** on Trips list; dedicated rooming edit page (**FR-001**–**FR-004**)
*   [x] Hotel header + participant assignment grid with roommate preference display (**FR-005**–**FR-006**)
*   [x] Persist rooms and assignments on Save (**FR-007**–**FR-011**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] Tests green
*   [ ] On `feature/29-rooming-list`; PR → `dev`

---

## Out of Scope

- Applicant-facing rooming view or self-assignment
- Export / print PDF of the rooming list
- Multiple hotels or multiple rooming lists per trip
- Automatic roommate matching / conflict suggestions
- Editing `hasPreferredRoommate` / preferred names from this page (use application edit)
- Charging / billing based on room type or nights
- Real-time collaborative editing
