# Feature: Trip View Flights and Room List

**Feature ID:** 137
**Branch pattern:** `feature/137-trip-view-flights-room-list`
**Status:** Implemented
**Created:** 2026-11-13
**Input:** "Update Trip View to add the Flights button (open the Flights view for the trip) and the Room List button (open the Room List view for the trip) on the row of buttons at the top of the page with the other buttons."
**Depends on:** [Feature 29 — Rooming List](feature-29-rooming-list.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 110 — Update Trip View](feature-110-update-trip-view.md)

The trip page header has **Edit trip** and **Email team**. **Flights** and **Room list** are on the Trips list. This feature adds those two buttons to the trip page header so staff can open the same pages without going back to the list.

## Clarifications

- Q: What are the button labels? → A: **Flights** and **Room list**, the same labels as on the Trips list.
- Q: Where do they sit? → A: On the header row, after **Email team**. The order is **Edit trip**, **Email team**, **Flights**, **Room list**.
- Q: Which pages open? → A: **Flights** opens the existing Flights page for this trip ("*Trip* — Flights"). **Room list** opens the existing rooming page for this trip ("*Trip* — Rooming").
- Q: Who sees them? → A: The same people who see **Edit trip** and **Email team**, once the trip has loaded. Who may use those pages does not change.

---

## User Stories

### US-137.1: Open Flights from the trip page

**As** trip staff
**I want** a **Flights** button on the trip page
**So that** I can open this trip's flights without returning to the Trips list

**Priority:** P1
**Independent test:** On the trip page, **Flights** opens "*Trip* — Flights" for that trip.
**Acceptance scenarios:** see ### US-137.1

### US-137.2: Open Room list from the trip page

**As** trip staff
**I want** a **Room list** button on the trip page
**So that** I can open this trip's rooming page without returning to the Trips list

**Priority:** P1
**Independent test:** On the trip page, **Room list** opens "*Trip* — Rooming" for that trip.
**Acceptance scenarios:** see ### US-137.2

---

## Requirements

### Functional Requirements

- **FR-001**: The trip page header MUST show **Flights** after **Email team** when the trip has loaded. Choosing it opens the existing Flights page for that trip.
- **FR-002**: The trip page header MUST show **Room list** after **Flights** when the trip has loaded. Choosing it opens the existing rooming page for that trip.
- **FR-003**: **Edit trip** and **Email team** stay where they are. The Trips list **Flights** and **Room list** actions stay as they are.
- **FR-004**: On the Flights page and the rooming page, when the previous page is that trip's trip page, the back button is **Back to trip** and opens the trip page. Otherwise it stays **Back to trips**, or **Back to home** for an Agent on the Flights page.

---

## Assumptions

- The buttons match **Edit trip** and **Email team**: labeled buttons on the header row, shown once the trip has loaded.
- Opening a page does not change the trip. Staff use **Save** on those pages as they do today.

## Edge Cases

- The trip has not loaded → **Flights** and **Room list** are hidden, the same as **Edit trip** and **Email team**.
- **Back to trips** stays on the left with the trip name.

## Success Criteria

- **SC-001**: **Flights** on the trip page opens that trip's Flights page.
- **SC-002**: **Room list** on the trip page opens that trip's rooming page.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged. Who may open a trip's Flights page or rooming page stays as it is.

---

## Key Entities

No new entity. The buttons open the trip's existing flights and rooming pages.

---

## API Requirements

None.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Trip page header | **Flights** after **Email team**. **Room list** after **Flights**. |

**Flights** opens "*Trip* — Flights". **Room list** opens "*Trip* — Rooming".

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-137.1 — Open Flights from the trip page

#### Scenario: Flights opens from the trip page
* **Given** I am on the trip page for Guatemala Clinic
* **When** I choose **Flights**
* **Then** the Flights page "Guatemala Clinic — Flights" opens

### US-137.2 — Open Room list from the trip page

#### Scenario: Room list opens from the trip page
* **Given** I am on the trip page for Guatemala Clinic
* **When** I choose **Room list**
* **Then** the rooming page "Guatemala Clinic — Rooming" opens

#### Scenario: Back to trip returns to the trip page
* **Given** I opened **Flights** or **Room list** from the trip page
* **Then** the back button is **Back to trip**
* **When** I choose **Back to trip**
* **Then** the trip page opens

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-137.1 | Flights opens from the trip page | `frontend/tests/TripView.test.js` | `Flights opens from the trip page` |
| US-137.2 | Room list opens from the trip page | `frontend/tests/TripView.test.js` | `Room list opens from the trip page` |
| US-137.2 | Back to trip returns to the trip page | `frontend/tests/TripFlights.test.js`, `frontend/tests/TripRooming.test.js` | `Back to trip returns to the trip page` |

---

## Agent implementation request

```text
Implement Feature 137 from @features/feature-137-trip-view-flights-room-list.md on branch `feature/137-trip-view-flights-room-list`.

On the trip page header, after Email team, add Flights and then Room list. Show them when the trip has loaded, the same as Edit trip and Email team. Flights opens the existing Flights page for that trip. Room list opens the existing rooming page for that trip. Leave Edit trip, Email team, and the Trips list actions as they are.
Map every Gherkin scenario in the Test Coverage Map. Run those frontend tests before finishing.
Update @features/reference/behavior.md in the same change.
Update docs/user-guide/trip-staff-guide.md (the trip page header buttons) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (the trip page header includes **Flights** and **Room list**, opening that trip's Flights page and rooming page)

**User guide updates:** `docs/user-guide/trip-staff-guide.md` (trip page header: **Flights**, **Room list**)

---

## Definition of Done

*   [x] **Flights** on the trip page opens that trip's Flights page (**FR-001**)
*   [x] **Room list** on the trip page opens that trip's rooming page (**FR-002**)
*   [x] **Edit trip**, **Email team**, and the Trips list actions are unchanged (**FR-003**)
*   [x] **Back to trip** returns to the trip page when Flights or Room list was opened from there (**FR-004**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Changing the Trips list **Flights** or **Room list** actions
- Changing the Flights page or the rooming page, other than the back button
- Changing who may open those pages
- Adding **Import** to the trip page header
