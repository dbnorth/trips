# Update Trip View

**Feature ID:** 110
**Branch pattern:** `feature/110-update-trip-view`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "why on the trip view do no document types display for the roles" → "write the spec for it"

The trip page's **Team roles needed** card has a **Document type** column that shows "—" for every role. It reads the worker role's single `documentTypeId`, which Feature 25 deprecated when roles moved to a list of required document types; no role sets it any more. This feature shows each role's required document types in that column instead. It also updates the rest of the trip page:
- the Team roles and Trip options accordions;
- the participant table's columns and its pinned Name and Actions columns;
- the trip readiness section;
- removing the Trip Status page.

## Clarifications

### Session 2026-11-03

- Q: What should the **Document type** column show? → A: The role's required document type names, comma-separated (for example "RN License, Passport"), or "—" when the role requires none.
- Q: Show required specializations too? → A: No. Names only.
- Q: The card's title? → A: Rename **Team roles needed** to **Team roles** on the trip page card, and in the "Add roles under Team roles first" hint of the Add / Edit participant dialogs that points to it. The **Add trip** / **Edit** trip dialogs and the participant trip page keep their own "Team roles needed" headings.
- Q: Show whether each role is filled, like the Trip Status page? → A: Yes. In a new last column **Filled** (after **Actions**), the same icon as the Trip Status **Roles** table's **Filled** column (Feature 82): green `mdi-check-circle` "All positions filled" when Available is 0, otherwise red `mdi-alert-circle` "N positions open".
- Q: Make **Team roles** an accordion? → A: Yes. The heading row (title, "<n> signed up / <n> needed", chevron) shows; the rest of the card is closed when the page opens, and clicking the heading row opens or closes it.
- Q: Make the trip page's **Trip options** card an accordion too? → A: Yes, the same way: the heading row (title, chevron) shows; the option sets are closed when the page opens, and clicking the heading row opens or closes them.
- Q: Add the Trip Status participant columns that the trip page's participants table lacks? → A: Yes: **Booked by**, **Missing items**, **Amount owed**, and one column per trip option. Trip Status's **Amount raised** is the same figure as the trip page's **Total donations**, so the trip page keeps **Total donations** and doesn't add **Amount raised**.
- Q: Keep the participants table's **Role** column (Trip Leader / Trip Participant)? → A: No. Remove it; **Worker role** stays.
- Q: Keep the participants table's **Participant cost** column? → A: No. Remove it (this supersedes Feature 74's "Total cost right after Participant cost" on the trip page); **Total cost** stays, and the trip header's **Participant cost** stays.
- Q: Keep picture / name and actions in view while scrolling the participants table sideways? → A: Yes. The **Name** column (picture and name) stays pinned on the left and **Actions** on the right; the columns between them scroll left and right.
- Q: Remove the Trip Status page? → A: Yes. Its participant columns are now on the trip page and its role counts are on **Team roles**. Remove the page, its route, the trip page's **Trip Status** button, the Trips list / Home **Status** row action, and its participant contact dialog. Keep `GET /trips/trips/:id/status`, which the trip page's participants table reads.
- Q: Show the trip's readiness on the trip page? → A: Yes. Add a section right after the trip details card with a green **Trip Ready** or red **Trip Not Ready** heading. Under it, list the five checks from the Trips list **Status** tooltip (Feature 109), each with its check or X icon.
- Q: Show Trip Leaders in the participants table's role column? → A: Yes. A Trip Leader's cell shows "Trip Leader" followed by their worker role, if any (for example "Trip Leader, Nurse"). The column's title changes from **Worker role** to **Role**.

**Depends on:**
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md) (trip roles and the **Team roles** card)
- [Feature 25 — Required Document Types per Worker Role](feature-25-worker-role-required-documents.md) (required document types; `documentTypeId` deprecated)
- Feature 82 (Trip Status **Roles** table **Filled** icon)
- Trip Status participant board (`GET /trips/trips/:id/status` participant `missingItems`, `amountOwed`, `selectedTravelOptionIds`)
- Feature 78 (trip page **Arrives** / **Departs** right after **Status**)
- Feature 109 (trip prep status: the five checks and `prepStatus`)

---

## User Stories

### US-110.1: See which documents each trip role requires

**As** trip staff on the trip page
**I want** each role in **Team roles** to list its required documents
**So that** I know what each role needs without opening the Worker roles page

**Acceptance:** see Gherkin scenarios under US-110.1.

---

## Requirements

### Functional Requirements

- **FR-001**: In the trip page's **Team roles** card, each role's **Document type** cell shows the descriptions of the worker role's required document types (`requiredDocumentTypes`), comma-separated, in alphabetical order; "—" when the role has none.
- **FR-002**: The card no longer reads the deprecated worker role `documentTypeId` / `documentType`.
- **FR-003**: The card's title is **Team roles** (was **Team roles needed**). The trip participant Add / Edit dialogs' role hint reads "Add roles under Team roles first".
- **FR-004**: The card's table gets a last column **Filled** (after **Actions**); each row's cell shows an icon matching the Trip Status **Roles** table (Feature 82): green `mdi-check-circle` with aria-label "All positions filled" when the role's `availableCount` is 0, otherwise red `mdi-alert-circle` with aria-label "N position(s) open". Changing **Number Needed** updates the icon from the saved role.
- **FR-005**: The card is an accordion. Its heading row is one button inside the `h2` showing **Team roles**, the "<n> signed up / <n> needed" summary (when there are roles), and a chevron (`mdi-chevron-down` closed, `mdi-chevron-up` open), with `aria-expanded` and `aria-controls`. The rest of the card (messages, roles table, "No team roles added yet.", **Add role**) is closed when the trip page opens; clicking (or pressing Enter / Space on) the heading row opens or closes it.
- **FR-006**: The trip page's **Trip options** card is an accordion like **FR-005**: its heading row is one button inside the `h2` showing **Trip options** and a chevron, with `aria-expanded` and `aria-controls`. The rest of the card (the option set tables, or "No trip options configured for this trip.") is closed when the trip page opens; clicking (or pressing Enter / Space on) the heading row opens or closes it.
- **FR-007**: The trip page's participants table adds the Trip Status participant columns it lacked, in this order: Name, Role, Worker role, Status, Arrives, Departs, **Booked by**, **Missing items**, Participant cost, Total cost, Total donations, **Amount owed**, one column per trip option, Actions.
  - **Booked by** is the organization name, "Participant", or "Not chosen", from the participant's flight purchase option (same label as Trip Status).
  - **Missing items** shows a red `mdi-alert-circle` whose tooltip lists the missing items, or "—" when nothing is missing.
  - **Amount owed** is the participant's total cost less their donations, never below $0, or "—" when the total is unknown.
  - Each trip option column is titled "<description> (Set <n>)" and shows "Yes" when the participant selected that option, otherwise "—".
  - **Missing items**, **Amount owed**, and the option selections come from the Trip Status endpoint and are reloaded whenever the participants list is. If that call fails, these cells show "—".
  - **Amount raised** is not added; **Total donations** already shows that figure.
- **FR-008**: The trip page's participants table no longer has the **Role** column (Trip Leader / Trip Participant).
- **FR-009**: The trip page's participants table no longer has the **Participant cost** column; **Total cost** (with its Feature 74 cost breakdown) stays, as does the trip header's **Participant cost**. The column order becomes Name, Worker role (titled **Role** by FR-014), Status, Arrives, Departs, Booked by, Missing items, Total cost, Total donations, Amount owed, one column per trip option, Actions.
- **FR-010**: In the trip page's participants table, the **Name** column (picture and name) is pinned to the left edge and **Actions** to the right edge (Vuetify header `fixed: "start"` / `fixed: "end"`); when the table is wider than the page, only the columns between them scroll horizontally.
- **FR-011**: The Trip Status page is removed. This covers its `/trips/:tripId/status` route (`tripStatus`), `TripStatusView`, the trip page's **Trip Status** button, the Trips list / Home Organization Trips **Status** row action (`mdi-clipboard-check-outline`), and `PersonContactDialog`, which only it used. The remaining trip row actions are View, Room list, Flights, Import (when allowed), Edit. `GET /trips/trips/:id/status` stays unchanged (FR-007 reads it).
- **FR-012**: `GET /trips/trips/:id/status` adds `prepStatus` (`rolesFilled`, `participantsApproved`, `fundsRaised`, `flightsEntered`, `roomListComplete`). It is computed exactly as the Trips list's `prepStatus` (Feature 109), from one shared helper.
- **FR-013**: The trip page shows a readiness section right after the trip details card, once that `prepStatus` loads.
  - The heading reads green **Trip Ready** with `mdi-check-circle` when all five checks pass, otherwise red **Trip Not Ready** with `mdi-alert-circle`.
  - Below it, the Feature 109 checks are listed in order: "All roles filled", "All participants approved", "All funds raised", "Flights entered for all participants", "Room list includes all participants". Each has a green `mdi-check-circle` (aria-label "Complete") or a red `mdi-close-circle` ("Not complete").
  - The section reloads with the participants list. The Trips list tooltip and this section share one checklist (`utils/tripPrep.js`).
- **FR-014**: The trip page's participants table's **Worker role** column is retitled **Role**, and stays second, after Name.
  - When the participant's trip role is Trip Leader, the cell reads "Trip Leader", followed by ", <worker role>" when they also have a worker role ("Trip Leader, Nurse").
  - Other participants show their worker role, or "—" when they have none.
  - The column sorts by the text shown. (FR-008 removed the separate Trip Leader / Trip Participant **Role** column.)

---

## Assumptions

- `GET /trips/trip-worker-roles` already returns each role's `workerRole.requiredDocumentTypes` (`id`, `description`, `type`); no API change is needed.

## Edge Cases

- A role with no required document types → "—".
- A role with one required document type → just that name.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Every trip role whose worker role requires documents lists them on the trip page.

---

## Data Ownership & Isolation

No change.

---

## Key Entities

No change.

---

## API Requirements

`GET /trips/trips/:id/status` adds `prepStatus` (FR-012). No other change.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripWorkerRolesCard` (trip page **Team roles**) **Document type** column | Required document type names, comma-separated, alphabetical, or "—" (FR-001, FR-002) |
| `TripView` **Trip options** card | Accordion, closed on open, toggled from its heading row (FR-006) |
| `TripView` participants table | Adds **Booked by**, **Missing items**, **Amount owed**, and per-option columns (FR-007); removes **Role** (FR-008) and **Participant cost** (FR-009); **Name** pinned left, **Actions** pinned right (FR-010) |
| `TripStatusView`, `/trips/:tripId/status`, trip page **Trip Status** button, `TripsTable` **Status** action, `PersonContactDialog` | Removed (FR-011) |
| `TripView` readiness section (after the trip details card) | Green **Trip Ready** / red **Trip Not Ready** with the five Feature 109 checks (FR-013) |
| `TripView` participants table **Role** column (was **Worker role**) | "Trip Leader" plus any worker role, otherwise the worker role or "—" (FR-014) |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions" has document types "RN License", "Passport", and "BLS Certification".
- Worker role "Nurse" requires "RN License" and "Passport"; worker role "Driver" requires none.
- Trip "Guatemala Clinic 2027" needs 2 Nurses and 1 Driver.
- Olivia is an Org Admin of Hope Missions.

### US-110.1 — See which documents each trip role requires

#### Scenario: Trip roles list their required document types
* **Given** Olivia opens the Guatemala Clinic 2027 trip page
* **Then** in **Team roles** the Nurse row's **Document type** shows "Passport, RN License"

#### Scenario: A role with no required documents shows a dash
* **Given** Olivia opens the Guatemala Clinic 2027 trip page
* **Then** in **Team roles** the Driver row's **Document type** shows "—"

#### Scenario: Each trip role shows whether its positions are filled
* **Given** the Nurse role has no open positions and the Driver role has 2 open
* **When** Olivia opens the Guatemala Clinic 2027 trip page
* **Then** **Team roles** has a last column **Filled**, where the Nurse row shows a green check "All positions filled" and the Driver row a red alert "2 positions open"
* **When** she changes the Driver's **Number Needed** to 1, leaving no open positions
* **Then** the Driver's icon becomes the green check "All positions filled"

#### Scenario: The trip page roles card is titled Team roles
* **Given** Olivia opens the Guatemala Clinic 2027 trip page
* **Then** the roles card's title is "Team roles"

#### Scenario: Team roles opens and closes from its heading row
* **Given** Olivia opens the Guatemala Clinic 2027 trip page
* **Then** **Team roles** shows only its heading row, closed
* **When** she clicks the heading row
* **Then** the roles table opens, listing Nurse
* **When** she clicks the heading row again
* **Then** the roles table closes

#### Scenario: Trip options opens and closes from its heading row
* **Given** the Guatemala Clinic 2027 trip has trip option "Private room"
* **And** Olivia opens the trip page
* **Then** **Trip options** shows only its heading row, closed
* **When** she clicks the heading row
* **Then** the trip options open, listing "Private room"
* **When** she clicks the heading row again
* **Then** the trip options close

#### Scenario: The participants table has the Trip Status participant columns
* **Given** the Guatemala Clinic 2027 trip has trip options "Private room" and "Shared room" in set 1
* **And** participant Ava Reed's flights are booked by Hope Missions, she is missing "Passport", her total cost is $2,000 with $500 donated, and she selected "Private room"
* **When** Olivia opens the trip page
* **Then** the participants table has columns **Booked by**, **Missing items**, **Amount owed**, "Private room (Set 1)", and "Shared room (Set 1)", and no **Amount raised**, **Role**, or **Participant cost**
* **And** Ava's row shows **Booked by** "Hope Missions", a missing items icon listing "Passport", **Amount owed** "$1,500.00", "Yes" under "Private room (Set 1)", and "—" under "Shared room (Set 1)"

#### Scenario: The participants table keeps Name and Actions in view while scrolling
* **Given** the Guatemala Clinic 2027 trip has participant Ava Reed
* **When** Olivia opens the trip page and scrolls the participants table sideways
* **Then** the **Name** column (Ava's picture and name) stays on the left and **Actions** stays on the right while the columns between them scroll

#### Scenario: The Trip Status page is removed
* **Given** Olivia opens the Guatemala Clinic 2027 trip page
* **Then** there is no **Trip Status** button, and the app has no Trip Status route
* **And** the Trips list and Home Organization Trips row actions are View, Room list, Flights, Import, Edit

#### Scenario: Trip status data returns the trip's prep status
* **Given** Guatemala Clinic 2027 has three approved participants with flights and rooms, plus a pre-approved participant with flights but no room, and donations short of the total cost
* **When** Olivia's trip page loads the trip status data
* **Then** its `prepStatus` matches the Trips list's: roles filled, participants not all approved, funds not raised, flights entered, room list not complete

#### Scenario: The trip page shows whether the trip is ready
* **Given** Guatemala Clinic 2027 has roles filled, funds raised, and a complete room list, but not every participant approved or every flight entered
* **When** Olivia opens the trip page
* **Then** right after the trip details card she sees a red "Trip Not Ready" with the five checks, where "All participants approved" and "Flights entered for all participants" are not complete
* **When** every check passes
* **Then** she sees a green "Trip Ready"

#### Scenario: The Role column shows Trip Leader with any worker role
* **Given** the trip's team has Trip Leader Lee (Nurse), Trip Leader Lia (no worker role), participant Ava (Doctor), and participant Ned (no worker role)
* **When** Olivia opens the trip page
* **Then** the participants table's second column is **Role** (there's no **Worker role** column)
* **And** it shows "Trip Leader, Nurse" for Lee, "Trip Leader" for Lia, "Doctor" for Ava, and "—" for Ned

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-110.1 | Trip roles list their required document types | `frontend/tests/UpdateTripView.test.js` | `Trip roles list their required document types` |
| US-110.1 | A role with no required documents shows a dash | `frontend/tests/UpdateTripView.test.js` | `A role with no required documents shows a dash` |
| US-110.1 | Each trip role shows whether its positions are filled | `frontend/tests/UpdateTripView.test.js` | `Each trip role shows whether its positions are filled` |
| US-110.1 | The trip page roles card is titled Team roles | `frontend/tests/UpdateTripView.test.js` | `The trip page roles card is titled Team roles` |
| US-110.1 | Team roles opens and closes from its heading row | `frontend/tests/UpdateTripView.test.js` | `Team roles opens and closes from its heading row` |
| US-110.1 | Trip options opens and closes from its heading row | `frontend/tests/TripView.test.js` | `Trip options opens and closes from its heading row` |
| US-110.1 | The participants table has the Trip Status participant columns | `frontend/tests/TripView.test.js` | `The participants table has the Trip Status participant columns` |
| US-110.1 | The participants table keeps Name and Actions in view while scrolling | `frontend/tests/TripView.test.js` | `The participants table keeps Name and Actions in view while scrolling` |
| US-110.1 | The Trip Status page is removed | `frontend/tests/TripView.test.js`, `frontend/tests/RowActionIcons.test.js`, `frontend/tests/HomeTripsMatchTripsList.test.js` | `The Trip Status page is removed`; `Trips list actions are icons with tooltips` / `Organization Trips on Home uses icons` (row action lists) |
| US-110.1 | Trip status data returns the trip's prep status | `backend/tests/trip-prep-status.test.js` | `Trip status data returns the trip's prep status` |
| US-110.1 | The trip page shows whether the trip is ready | `frontend/tests/TripView.test.js` | `The trip page shows whether the trip is ready` |
| US-110.1 | The Role column shows Trip Leader with any worker role | `frontend/tests/TripView.test.js` | `The Role column shows Trip Leader with any worker role` |

---

## Agent implementation request

```text
Implement Feature 110 from @features/feature-110-update-trip-view.md on branch `feature/110-update-trip-view`.

Frontend, except FR-012 (`prepStatus` on GET /trips/trips/:id/status). In TripWorkerRolesCard.vue, replace the Document type cell (`row.workerRole?.documentType?.description`) with the descriptions of `row.workerRole?.requiredDocumentTypes`, sorted alphabetically and joined with ", ", or "—" when empty.
Tests per the Test Coverage Map (mount TripWorkerRolesCard with TripWorkerRoleServices mocked). Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] Document type column per **FR-001**, **FR-002**
*   [x] Card title per **FR-003**
*   [x] Role filled icon per **FR-004**
*   [x] Accordion per **FR-005**
*   [x] Trip options accordion per **FR-006**
*   [x] Participants table Trip Status columns per **FR-007**
*   [x] Participants table **Role** column removed per **FR-008**
*   [x] Participants table **Participant cost** column removed per **FR-009**
*   [x] Participants table pinned **Name** / **Actions** per **FR-010**
*   [x] Trip Status page removed per **FR-011**
*   [x] `prepStatus` on the trip status data per **FR-012**
*   [x] Trip page readiness section per **FR-013**
*   [x] Participants table **Role** column per **FR-014**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npx vitest run` green
*   [x] Backend `npm test` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Required specializations in the column.
- Renaming the column.
- The "Team roles needed" headings in the **Add trip** / **Edit** trip dialogs and on the participant trip page.
- Removing the deprecated `workerRole.documentTypeId` column or the `documentType` include from the API.
- Showing required documents in the **Add trip** / **Edit** dialogs' role lists.
