# Feature: Trip Status Missing Items Icon

**Feature ID:** 82
**Branch pattern:** `feature/82-trip-status-missing-items-icon`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "create a spec to update trip status. In the Participant section, if the participant is missing data, in the missing items column show an alert icon in red with mouse over that list with bullets in red the missing items. This will make it handle a large number of missing items better."

Interpreted as:
- **Trip status** = the **Trip Status** board (Feature 28), opened from View Trip or the Trips list **Status** action.
- **Participant section** = its **Participants** table. Its **Missing items** column lists each participant's missing items (Feature 27 labels), joined with commas. A long list widens the column and crowds the table.
- Only how the column shows the items changes. Which items are missing, and their wording and order, stay as the API sends them.

Follow-up input: "also on the trip role section add a column with a green check mark if the available is 0 and a red alert icon if the available is not 0."

Interpreted as:
- **Trip role section** = the board's **Roles** table (Role, Needed, Signed up, Reserved, Available).
- The API already clamps **Available** at 0 (never negative), so "not 0" means the role still has open positions.
- The new column's title is **Filled**, and it goes last, after **Available**.

**Depends on:**
- [Feature 27 — Application Submit Unavailable Info](feature-27-application-submit-unavailable-info.md) (missing item labels)
- [Feature 28 — View Trip Status](feature-28-view-trip-status.md)

---

## User Stories

### US-82.1: See missing items from an alert icon
**As** trip staff  
**I want** a red alert icon in **Missing items** that lists the participant's missing items on hover  
**So that** the Participants table stays compact and readable even when a participant is missing many items

**Priority:** P2  
**Independent test:** Ada is missing "Profile is not complete", "Participant agreement", and "Required role document(s): RN License" → her **Missing items** cell shows only a red alert icon; hovering it shows "Missing items" and the three items as red bullets. Ben, with nothing missing, shows "—"  
**Acceptance scenarios:** see ### US-82.1

### US-82.2: See which roles are filled at a glance
**As** trip staff  
**I want** a green check or a red alert icon next to each role's Available count  
**So that** I can see which roles still need people without reading every number

**Priority:** P2  
**Independent test:** RN has Available 0 → its **Filled** cell shows a green check. Doctor has Available 2 → its **Filled** cell shows a red alert icon  
**Acceptance scenarios:** see ### US-82.2

---

## Requirements

### Functional Requirements

- **FR-001**: On the Trip Status **Participants** table, a participant with one or more missing items shows, in **Missing items**, only a red alert icon (`mdi-alert-circle`, color `error`, small). The items aren't shown as text in the cell. A participant with no missing items still shows "—".
- **FR-002**: Hovering over the icon, or focusing it from the keyboard, shows a tooltip above it. The tooltip shows the heading "Missing items", then a bulleted list with one bullet per missing item, in the order the API sends them. Each item and its bullet are red (`error`). The tooltip has a light background (`surface`) and a border, so red text stays readable, and a maximum width of 360px, with long items wrapping.
- **FR-003**: The icon can be reached with the keyboard (Tab), and its accessible name (`aria-label`) is "Missing items: " followed by the items joined with "; ", e.g. "Missing items: Profile is not complete; Participant agreement".
- **FR-004**: Nothing else changes: the column's title and position, the API's `missingItems`, and the other columns and screens. The column stays unsortable.
- **FR-005**: The Trip Status **Roles** table gets a last column, **Filled**, after **Available**. When a role's `availableCount` is 0, the cell shows a green check icon (`mdi-check-circle`, color `success`, small) with the accessible name "All positions filled". Otherwise it shows a red alert icon (`mdi-alert-circle`, color `error`, small) with the accessible name "N positions open" ("1 position open" when N is 1). The other Roles columns and their values don't change.

---

## Assumptions

- Staff use a mouse or keyboard. On touch screens, the accessible name still gives the list to screen readers.
- The Feature 79 date warning icons on the same board keep their yellow `mdi-alert`. The red `mdi-alert-circle` marks missing items only.

## Edge Cases

- A participant with one missing item still shows the icon, and the tooltip lists the one item.
- A participant with many missing items (e.g. ten) gets a tooltip that grows taller, not wider than 360px. The table row keeps its height.
- Cancelled and declined participants follow the same rule: icon when the API sends missing items, otherwise "—".
- A role with Needed 0 has Available 0, so it shows the green check.
- A role that is over-filled (more signed up than needed) still has Available 0, so it shows the green check.
- With no roles configured, the board keeps its "No worker roles configured for this trip." message and shows no table.

## Success Criteria

- **SC-001**: No **Missing items** cell shows item text. Each cell shows either the alert icon or "—".
- **SC-003**: Every **Roles** row shows exactly one **Filled** icon: green check when Available is 0, red alert icon otherwise.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No change. The board stays staff-only (Feature 28), and the tooltip shows only items the API already returns.

---

## Key Entities

None. Frontend only.

---

## API Requirements

None. `GET /trips/trips/:id/status` keeps returning `missingItems` per participant and `availableCount` per role (Feature 28).

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Trip Status** (`TripStatusView`) | **Missing items** cell: red alert icon with the bulleted tooltip (FR-001–FR-003), or "—" |
| **Trip Status** (`TripStatusView`) | **Roles** table: new last **Filled** column, green check or red alert icon (FR-005) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background: Trip Leader Tom opens the Trip Status board for "Status Demo Trip". Ada Applicant is incomplete with the missing items "Profile is not complete", "Participant agreement", and "Required role document(s): RN License". Ben Approved has no missing items. The trip's roles are RN (Needed 1, Available 0) and Doctor (Needed 2, Available 2).

### US-82.1 — See missing items from an alert icon

#### Scenario: Missing items show as a red alert icon
* **When** Tom views the Participants table
* **Then** Ada's **Missing items** cell shows a red `mdi-alert-circle` icon and none of her missing items as text
* **And** the icon's accessible name is "Missing items: Profile is not complete; Participant agreement; Required role document(s): RN License"
* **And** Ben's **Missing items** cell shows "—" and no icon

#### Scenario: Hovering the icon lists the missing items in red
* **When** Tom hovers over Ada's alert icon, or tabs to it
* **Then** a tooltip shows "Missing items" and a bulleted list: "Profile is not complete", "Participant agreement", "Required role document(s): RN License", in that order
* **And** each listed item is red

### US-82.2 — See which roles are filled at a glance

#### Scenario: Roles show a filled or open icon
* **When** Tom views the Roles table
* **Then** the last column is titled **Filled**, after **Available**
* **And** RN's **Filled** cell shows a green `mdi-check-circle` icon named "All positions filled"
* **And** Doctor's **Filled** cell shows a red `mdi-alert-circle` icon named "2 positions open"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-82.1 | Missing items show as a red alert icon | `frontend/tests/TripStatus.test.js` | `Missing items show as a red alert icon` |
| US-82.1 | Hovering the icon lists the missing items in red | `frontend/tests/TripStatus.test.js` | `Hovering the icon lists the missing items in red` |
| US-82.2 | Roles show a filled or open icon | `frontend/tests/TripStatus.test.js` | `Roles show a filled or open icon` |

---

## Agent implementation request

```text
Implement Feature 82 from @features/feature-82-trip-status-missing-items-icon.md on branch `feature/82-trip-status-missing-items-icon`.

Frontend only. In TripStatusView's #item.missingItems slot, replace the comma-joined text with a red mdi-alert-circle icon (keyboard-focusable, aria-label "Missing items: a; b") inside a v-tooltip whose content is a "Missing items" heading and a red bulleted list on a light, bordered background (max width 360px); keep "—" when there are none.
In the Roles table, add a last "Filled" column: green mdi-check-circle ("All positions filled") when availableCount is 0, otherwise red mdi-alert-circle ("N positions open").
Add the three scenarios to frontend/tests/TripStatus.test.js.
Update features/reference/behavior.md (Trip Status row).
```

---

## Definition of Done

*   [x] Missing items icon, tooltip, and accessible name per **FR-001**–**FR-004**
*   [x] Roles **Filled** column per **FR-005**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Changing which items count as missing, or their wording (Feature 27)
- Missing items anywhere other than the Trip Status board (e.g. My Trips next actions, the application dialog)
- Showing a count next to the icon, or sorting or filtering by missing items
- A tooltip on the **Filled** icons (the Available count sits right beside them), or a filled/open icon anywhere other than the Trip Status Roles table
