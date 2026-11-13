# Feature: Trip Ready Status

**Feature ID:** 135
**Branch pattern:** `feature/135-trip-ready-status`
**Status:** Implemented
**Created:** 2026-11-13
**Input:** "Add a Trip Ready status on Trip View. Add a column, Trip Status, after the participant name in the participant list in the fixed scrolling area. If the participant is Approved, has completed flight data, and has a room assigned, show Trip Ready in a green oval with white text. If not, show a yellow oval with black text that says Not Ready." Follow-up: add an info icon next to Not Ready whose mouseover lists which criteria are not met.
**Depends on:** [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 29 — Trip Rooming](feature-29-trip-rooming.md), [Feature 30 — Flights](feature-30-flights.md), [Feature 110 — Update Trip View](feature-110-update-trip-view.md)

The trip page **Participants** table keeps **Name** fixed on the left while the other columns scroll. This feature adds **Trip Status** immediately after **Name**. Each row shows **Trip Ready** or **Not Ready**.

## Clarifications

- Q: What is completed flight data? → A: The participant has at least one saved Arrival segment and at least one saved Return segment. A confirmation number, flight cost, and who books the flight are not required. One segment type alone is not enough.
- Q: What is a room assigned? → A: The participant has a room on the trip's saved rooming list.
- Q: Who sees **Not Ready**? → A: Every row that is not all three of Approved, completed flight data, and a room. That includes Incomplete, Pre-Approved, Declined, and Cancelled, and an Approved person missing a flight or a room.
- Q: Where does the column sit? → A: Immediately after **Name**. **Name** stays fixed on the left. **Trip Status** scrolls with the other columns.
- Q: What does the info icon list? → A: Only the criteria that fail, in this order: "Not approved.", "No arrival flight.", "No return flight.", "No room assigned." **Trip Ready** has no icon.

---

## User Stories

### US-135.1: See who is ready for the trip

**As** trip staff
**I want** each person on the trip page marked **Trip Ready** or **Not Ready**
**So that** I can see who is approved, has flights both ways, and has a room

**Priority:** P1
**Independent test:** On the trip page, an Approved participant with an Arrival segment, a Return segment, and a saved room shows a green **Trip Ready** oval and no info icon. An Approved participant missing the return flight shows a yellow **Not Ready** oval with an info icon whose hover says "No return flight." The column is immediately after **Name**.
**Acceptance scenarios:** see ### US-135.1

---

## Requirements

### Functional Requirements

- **FR-001**: The trip page **Participants** table MUST have a **Trip Status** column immediately after **Name**. **Name** stays fixed on the left and **Actions** stays fixed on the right. The other columns, including **Trip Status**, still scroll sideways.
- **FR-002**: A row MUST show **Trip Ready** only when all three are true: the application status is Approved, the participant has at least one saved Arrival flight segment and at least one saved Return flight segment, and the participant is assigned a room on the trip's saved rooming list. The label is white text on a green oval.
- **FR-003**: Every other row MUST show **Not Ready**, black text on a yellow oval. That includes a person who is not Approved, an Approved person with only one of the two flight directions, an Approved person with no flights, and an Approved person with no saved room.
- **FR-004**: A **Not Ready** oval MUST have an info icon immediately after it. Hovering or focusing the icon shows the unmet criteria, and only those, in this order: "Not approved." when the status is not Approved; "No arrival flight." when there is no Arrival segment; "No return flight." when there is no Return segment; "No room assigned." when there is no saved room. **Trip Ready** has no info icon. The icon's accessible name is "Not ready: " followed by the same lines separated by "; ".
- **FR-005**: The trip status payload MUST include `tripReady` (true or false) and `tripReadyMissing` (those lines, empty when `tripReady` is true) on each participant. The table shows the oval and the icon from those values. No other column, action, or count changes.

---

## Assumptions

- "Completed flight data" means both directions are entered. A saved segment already has its airports, airline, flight number, and dates, so those fields are not checked again.
- Trip Leaders in this table follow the same rule as other rows.
- The oval is display only. It does not change approval, rooming, or flights.

## Edge Cases

- Approved, both flight directions, and a room → **Trip Ready**.
- Approved, an Arrival segment, no Return segment, and a room → **Not Ready**, and the icon lists "No return flight."
- Approved, both flight directions, no room → **Not Ready**, and the icon lists "No room assigned."
- Pre-Approved, both flight directions, and a room → **Not Ready**, and the icon lists "Not approved."
- Approved with no flights and no room → **Not Ready**, and the icon lists "No arrival flight.", "No return flight.", and "No room assigned."
- Declined or Cancelled → **Not Ready**, and the icon includes "Not approved." plus any missing flight or room lines.
- No one on the trip → the column heading still shows, and the table stays empty.

## Success Criteria

- **SC-001**: **Trip Status** is the column immediately after **Name** on the trip page participant list.
- **SC-002**: **Trip Ready** appears only for an Approved participant with an Arrival segment, a Return segment, and a saved room, as a green oval with white text.
- **SC-003**: Every other participant shows **Not Ready** as a yellow oval with black text, with an info icon listing only the unmet criteria.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged. Who may open the trip page stays as it is. `tripReady` is returned only on the trip status response those people already receive.

---

## Key Entities

- **Trip participant**: the application row already on the trip page. No new stored field. **Trip Ready** is calculated.
- **Flight segment**: an Arrival or Return leg already saved for that participant.
- **Room assignment**: the participant's room on the saved rooming list.

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `GET` | `/trips/trips/:id/status` | same as today | Each participant adds `tripReady` (`true` when **FR-002** holds, otherwise `false`) and `tripReadyMissing` (the **FR-004** lines, or `[]` when ready) |

No other request or response changes.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Trip page — **Participants** | **Trip Status** immediately after **Name**. **Trip Ready**: white text on a green oval, no info icon. **Not Ready**: black text on a yellow oval, then an info icon. Hovering the icon lists the unmet criteria from **FR-004**. Every row shows one of the two ovals. |

The participant CSV, **My Trip**, the Flights page, and the Room list page do not gain this column.

---

## Data Model Requirements

None. No new column is stored.

---

## Acceptance Criteria (Gherkin)

### US-135.1 — See who is ready for the trip

#### Scenario: An approved participant with flights and a room is Trip Ready
* **Given** Ana is Approved on the trip
* **And** Ana has an Arrival segment and a Return segment
* **And** Ana is assigned a room on the saved rooming list
* **When** I open the trip page
* **Then** the **Participants** table has **Trip Status** immediately after **Name**
* **And** Ana's **Trip Status** is "Trip Ready" in white text on a green oval
* **And** Ana has no info icon

#### Scenario: A missing return flight is Not Ready
* **Given** Ben is Approved, has an Arrival segment, has no Return segment, and has a saved room
* **When** I open the trip page
* **Then** Ben's **Trip Status** is "Not Ready" in black text on a yellow oval
* **And** the info icon next to it lists "No return flight."

#### Scenario: A missing room is Not Ready
* **Given** Cy is Approved, has an Arrival segment and a Return segment, and has no saved room
* **When** I open the trip page
* **Then** Cy's **Trip Status** is "Not Ready"
* **And** the info icon lists "No room assigned."

#### Scenario: A participant who is not approved is Not Ready
* **Given** Dee is Pre-Approved, has an Arrival segment and a Return segment, and has a saved room
* **When** I open the trip page
* **Then** Dee's **Trip Status** is "Not Ready"
* **And** the info icon lists "Not approved."

#### Scenario: Several unmet criteria are listed together
* **Given** Eli is Incomplete and has no flights and no saved room
* **When** I open the trip page
* **Then** Eli's info icon lists "Not approved.", "No arrival flight.", "No return flight.", and "No room assigned." in that order

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-135.1 | An approved participant with flights and a room is Trip Ready | `frontend/tests/TripView.test.js` | `An approved participant with flights and a room is Trip Ready` |
| US-135.1 | A missing return flight is Not Ready | `backend/tests/trip-status.test.js` | `A missing return flight is Not Ready` |
| US-135.1 | A missing room is Not Ready | `backend/tests/trip-status.test.js` | `A missing room is Not Ready` |
| US-135.1 | A participant who is not approved is Not Ready | `backend/tests/trip-status.test.js` | `A participant who is not approved is Not Ready` |
| US-135.1 | Several unmet criteria are listed together | `backend/tests/trip-status.test.js` | `Several unmet criteria are listed together` |

The frontend scenario also checks the column order and the green and white styling. The existing trip page test that expects **Role** to be the second column is updated so **Trip Status** is second and **Role** is third.

---

## Agent implementation request

```text
Implement Feature 135 from @features/feature-135-trip-ready-status.md on branch `feature/135-trip-ready-status`.

On the trip page Participants table, add Trip Status immediately after Name. Name stays fixed on the left. Show Trip Ready in white text on a green oval only when the person is Approved, has at least one Arrival segment and one Return segment, and has a room on the saved rooming list. Every other row shows Not Ready in black text on a yellow oval, with an info icon next to it. The icon's hover lists only the unmet lines, in order: "Not approved.", "No arrival flight.", "No return flight.", "No room assigned." Trip Ready has no icon. Add tripReady and tripReadyMissing to each participant on GET /trips/trips/:id/status. Do not add a stored column, and do not add the status to the CSV, My Trip, the Flights page, or the Room list.
Map every Gherkin scenario in the Test Coverage Map. Update the trip page test that expects Role to be the second column. Run those frontend and backend tests before finishing.
Update @features/reference/behavior.md and @features/reference/api.md in the same change.
Update docs/user-guide/trip-staff-guide.md (the Participants column table) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (trip page **Participants** has **Trip Status** after **Name**; **Trip Ready** only when Approved, both flight directions, and a saved room; **Not Ready** has an info icon listing the unmet lines), `features/reference/api.md` (trip status participants include `tripReady` and `tripReadyMissing`)

**User guide updates:** `docs/user-guide/trip-staff-guide.md` (**Participants** column **Trip Status** after **Name**: green **Trip Ready**, or yellow **Not Ready** with an info icon whose hover lists "Not approved.", "No arrival flight.", "No return flight.", and "No room assigned." for whichever apply)

---

## Definition of Done

*   [x] **Trip Status** is immediately after **Name** (**FR-001**)
*   [x] **Trip Ready** is the green oval for Approved plus both flight directions plus a saved room (**FR-002**)
*   [x] Every other row is the yellow **Not Ready** oval (**FR-003**)
*   [x] The **Not Ready** info icon lists only the unmet criteria (**FR-004**)
*   [x] `tripReady` and `tripReadyMissing` are on the trip status participants (**FR-005**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Saving **Trip Ready** on the participant
- Adding the column to the participant CSV, **My Trip**, the Flights page, or the Room list
- Requiring a confirmation number, a flight cost, or a choice of who books the flight
- Filtering or sorting the table by **Trip Status** beyond the table's ordinary column sort
- Changing who can be approved, or how rooms and flights are saved
