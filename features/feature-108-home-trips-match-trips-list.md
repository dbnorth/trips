# Home Organization Trips Match the Trips List

**Feature ID:** 108
**Branch pattern:** `feature/108-home-trips-match-trips-list`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "create a spec to make the admin and org admin home have the same trip listing fields and actions as the trip listing page."

System Admins (with an organization selected) and Org Admins see an **Organization Trips** card on Home, but it shows different columns from the **Trips** page (Name, Location, Start, End, Status) and is missing the **Import** action. Staff who move between the two pages see different facts about the same trips. This feature gives the Home card the Trips page's columns and row actions, through one shared trips table, so the two stay the same. Home keeps its own filter (**Show all trips**) and order.

## Clarifications

### Session 2026-11-03

- Q: Who gets the change? → A: System Admins with an organization selected and Org Admins — the users who see **Organization Trips** with full actions today. Agent users keep today's card (Name, Location, Start, End, Status, and only **Flights** — Feature 85); Trip Leaders' Home is unchanged.
- Q: Does Home get the Trips page's **Add trip** / **Copy** buttons? → A: No. Only the row columns and row actions; those buttons stay on the Trips page.
- Q: Keep the **Donor link** column (**Donate**)? → A: No. Remove it from both Home and the Trips page. The trip's public donate page stays reachable from the trip page and the public trip page.
- Q: Where do the System Admin's summary boxes go? → A: Above the **Organization Trips** table.
- Q: What does the members column count? → A: Rename **Active members** to **Members** and count pre-approved and approved Trip Leaders and Trip Participants (Active members counted approved only). Add **Total need**: the sum of the trip's role quantities. Both pages change, since they share the table. **Total cost** and **Total donations** keep counting approved members only, and the Trip Leader Home table keeps **Active members**.
- Q: How do staff see the split behind **Members**? → A: An info icon next to each trip's number; its tooltip shows "Pre-approved: <n>" and "Approved: <n>".
- Q: What is the role-count column called, and how do staff see open roles? → A: **Total Roles** (replacing **Total need**). When any role has fewer pre-approved / approved members than its quantity, a red info icon next to the number lists each such role as "<role>: <n> needed" (quantity minus those members). Incomplete applications and reservations don't fill a role here.

**Depends on:**
- [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md) (Trips list, Home staff dashboard)
- [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md) (**Import** row action and who sees it)
- [Feature 81 — Row Action Icons with Tooltips](feature-81-row-action-icons.md) (row action icons)
- [Feature 85 — Agent Role](feature-85-agent-role.md) (Agent's Organization Trips card, unchanged)

---

## User Stories

### US-108.1: Home lists trips like the Trips page

**As** an Org Admin or System Admin
**I want** Home's **Organization Trips** to show the same columns and actions as the **Trips** page
**So that** I see the same facts about each trip and can act on it from Home

**Acceptance:** see Gherkin scenarios under US-108.1.

---

## Requirements

### Functional Requirements

- **FR-001**: For System Admins (organization selected) and Org Admins, Home's **Organization Trips** table has the Trips page's columns, in the same order, with the same values: **Name**, **Leaders** (comma-separated, or "—"), **Members** (pre-approved and approved Trip Leaders and Trip Participants; replaces **Active members**, which counted approved only; an info icon next to the number shows a tooltip with "Pre-approved: <n>" and "Approved: <n>"), **Total Roles** (the sum of the trip's role quantities; when any role is not filled, a red info icon next to the number shows a tooltip listing each unfilled role as "<role>: <n> needed", where n = the role's quantity minus its pre-approved and approved members, by role name), **Total cost**, **Total donations** (money, or "—"), **Status**, **Dates** (`MM/DD/YYYY – MM/DD/YYYY`), and **Actions**. The **Location**, **Start**, and **End** columns are removed. The Trips page's **Donor link** column (**Donate**) is removed from the Trips page and is not on Home.
- **FR-002**: Each row has the Trips page's row actions, in the same order and with the same conditions: **View**, **Status**, **Room list**, **Flights**, **Import** (only for an Org Admin of the trip's organization, a System Admin, or a Trip Leader of the trip — Feature 80), and **Edit**. **Edit** opens the Edit trip dialog and **Import** opens the Import Trip Master dialog; saving an edit, or closing the import dialog after an import, reloads the Home list.
- **FR-003**: The Trips page and Home render the table from one shared component, so a later column or action change applies to both. The Trips page looks and behaves as it does today, except for the column changes in FR-001 (**Members**, **Total Roles**, no **Donor link**).
- **FR-004**: Home keeps its own list rules: only the selected organization's trips; active trips that haven't ended unless **Show all trips** is checked; ordered by start date, then name; the loading bar and the two empty messages ("No active trips that have not ended. Check “Show all trips” to include other trips." / "No trips for this organization.") unchanged. Column headers can be clicked to sort, as on the Trips page.
- **FR-005**: Agent users' Organization Trips card is unchanged (Name, Location, Start, End, Status; only **Flights**).
- **FR-006**: For a System Admin with an organization selected, Home's summary boxes (**Trips**, **Active trips**, **People**, **Donations total**, and the other summary counts) and the export buttons show above the **Organization Trips** card instead of below it. Other users' Home layout is unchanged.

---

## Assumptions

- `GET /trips/trips` already returns `leaderNames`, `totalParticipantCost`, and `donationTotal`, and Home already loads it; it adds the member and role fields in API Requirements.
- Home's table pages like the Trips page's table (10 rows per page by default).

## Edge Cases

- No trips match → the empty message shows instead of the table, as today.
- A trip with no leaders or no costs → "—" in those columns, as on the Trips page.
- A System Admin with no organization selected → no Organization Trips card, as today.
- An Org Admin who is also a Trip Leader of another organization's trip → Home still lists only the selected organization's trips.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: The Home table and the Trips page table show the same headers and the same row actions for the same trip.

---

## Data Ownership & Isolation

No change. Home lists only the selected organization's trips; each action keeps its existing access rules.

---

## Key Entities

No change. `GET /trips/trips` adds four computed fields (see API Requirements).

---

## API Requirements

`GET /trips/trips`: each trip adds `memberCount` (pre-approved and approved Trip Leaders and Trip Participants), `preApprovedMemberCount` (pre-approved only), `totalRoles` (sum of the trip's `tripWorkerRoles.quantity`, 0 when none), and `unfilledRoles` (`[{ name, needed }]` by name: each trip role whose quantity is greater than its pre-approved and approved Trip Leaders / Trip Participants, `needed` = the difference; `[]` when all are filled). `activeParticipantCount` is unchanged (approved only; the Trip Leader Home table and the **Members** tooltip's "Approved" use it).

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| New shared trips table component (for example `TripsTable.vue`) | The Trips page columns and row actions (FR-001, FR-002); owns the Edit trip and Import Trip Master dialogs and tells the page to reload after a save or import |
| `TripsList` (Trips page) | Uses the shared table; unchanged for users (FR-003) |
| `Home` **Organization Trips** (System Admin with organization, Org Admin) | Uses the shared table with Home's filter and order (FR-001, FR-002, FR-004) |
| `Home` **Organization Trips** (Agent) | Unchanged (FR-005) |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions" has trips "Guatemala Clinic 2027" (active, 06/10/2099 – 06/17/2099, leader Omar Diaz, 4 pre-approved or approved members, roles Nurse (4) and Doctor (2) with 2 Nurses and 1 Doctor still needed, total cost $2,850.00, donations $500.00) and "Honduras 2020" (active, ended 01/20/2020).
- Olivia is an Org Admin of Hope Missions with it selected.

### US-108.1 — Home lists trips like the Trips page

#### Scenario: Home Organization Trips shows the Trips page columns
* **Given** Olivia opens Home
* **Then** **Organization Trips** has the columns Name, Leaders, Members, Total Roles, Total cost, Total donations, Status, Dates, and Actions — the same as the **Trips** page
* **And** the Guatemala Clinic 2027 row shows "Omar Diaz", 4, 6, "$2,850.00", "$500.00", "active", and "06/10/2099 – 06/17/2099"
* **And** there is no Location, Start, End, or Donor link column, and no **Donate** link

#### Scenario: Members info shows the pre-approved and approved counts
* **Given** Guatemala Clinic 2027 has 1 pre-approved and 3 approved members
* **When** Olivia opens Home and points at the info icon next to its **Members** number
* **Then** the tooltip shows "Pre-approved: 1" and "Approved: 3"

#### Scenario: Total Roles shows a red info icon listing unfilled roles
* **Given** Olivia opens Home
* **Then** the Guatemala Clinic 2027 **Total Roles** number has a red info icon whose tooltip lists "Doctor: 1 needed" and "Nurse: 2 needed"
* **And** a trip with every role filled has no icon

#### Scenario: Home trip rows have the Trips page actions
* **Given** Olivia opens Home
* **Then** the Guatemala Clinic 2027 row has **View**, **Status**, **Room list**, **Flights**, **Import**, and **Edit**, as on the **Trips** page
* **When** she clicks **Import**
* **Then** the Import Trip Master dialog opens for that trip
* **When** she clicks **Edit**
* **Then** the Edit trip dialog opens for that trip

#### Scenario: Home keeps Show all trips
* **Given** Olivia opens Home
* **Then** only Guatemala Clinic 2027 is listed
* **When** she checks **Show all trips**
* **Then** Honduras 2020 is listed too

#### Scenario: Agents keep their Flights-only trip card
* **Given** Ana is an Agent of Hope Missions with it selected
* **When** she opens Home
* **Then** **Organization Trips** has the columns Name, Location, Start, End, and Status, and each row has only **Flights**

#### Scenario: System Admin summary boxes come before Organization Trips
* **Given** Sam is a System Admin with Hope Missions selected
* **When** he opens Home
* **Then** the summary boxes (Trips, Active trips, People, Donations total) show above **Organization Trips**
* **And** **Organization Trips** lists Guatemala Clinic 2027

#### Scenario: Trips list counts pre-approved and approved members, total roles, and unfilled roles
* **Given** Guatemala Clinic 2027 has roles Nurse (4) and Doctor (2), an approved Trip Leader, Trip Participants approved and pre-approved as Nurse and pre-approved as Doctor, and an incomplete Nurse applicant
* **When** Olivia loads the trips list
* **Then** the trip has 4 members (2 pre-approved, 2 approved), 6 total roles, and unfilled roles Doctor (1 needed) and Nurse (2 needed)

#### Scenario: A trip with every role filled has no unfilled roles
* **Given** Guatemala Clinic 2027's Nurse and Doctor roles each have as many pre-approved or approved members as their quantity
* **When** Olivia loads the trips list
* **Then** the trip has 6 total roles and no unfilled roles

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-108.1 | Home Organization Trips shows the Trips page columns | `frontend/tests/HomeTripsMatchTripsList.test.js` | `Home Organization Trips shows the Trips page columns` |
| US-108.1 | Members info shows the pre-approved and approved counts | `frontend/tests/HomeTripsMatchTripsList.test.js` | `Members info shows the pre-approved and approved counts` |
| US-108.1 | Home trip rows have the Trips page actions | `frontend/tests/HomeTripsMatchTripsList.test.js` | `Home trip rows have the Trips page actions` |
| US-108.1 | Home keeps Show all trips | `frontend/tests/HomeTripsMatchTripsList.test.js` | `Home keeps Show all trips` |
| US-108.1 | Agents keep their Flights-only trip card | `frontend/tests/HomeTripsMatchTripsList.test.js` | `Agents keep their Flights-only trip card` |
| US-108.1 | System Admin summary boxes come before Organization Trips | `frontend/tests/HomeTripsMatchTripsList.test.js` | `System Admin summary boxes come before Organization Trips` |
| US-108.1 | Total Roles shows a red info icon listing unfilled roles | `frontend/tests/HomeTripsMatchTripsList.test.js` | `Total Roles shows a red info icon listing unfilled roles` |
| US-108.1 | Trips list counts pre-approved and approved members, total roles, and unfilled roles | `backend/tests/trips-list-members-roles.test.js` | `Trips list counts pre-approved and approved members, total roles, and unfilled roles` |
| US-108.1 | A trip with every role filled has no unfilled roles | `backend/tests/trips-list-members-roles.test.js` | `A trip with every role filled has no unfilled roles` |

Existing tests that read Home's Organization Trips table (`RowActionIcons.test.js`, `AgentHome.test.js`) are updated where the columns or actions changed; Trips page tests keep passing unchanged.

---

## Agent implementation request

```text
Implement Feature 108 from @features/feature-108-home-trips-match-trips-list.md on branch `feature/108-home-trips-match-trips-list`.

Frontend only. Move the Trips page v-data-table (headers, cell templates, row actions, canImport, EditTripDialog, ImportTripMasterDialog) from TripsList.vue into a new components/TripsTable.vue (props: trips, loading; emits `updated` after an edit save — TripsList shows "Trip updated." — and `imported` after an import). TripsList uses it unchanged for users.
Home.vue: for System Admin / Org Admin, render TripsTable with displayOrgTrips (keep Show all trips, order, loading, empty messages) and reload with loadOrgTrips on updated/imported; remove the Home-only Edit trip dialog wiring if no longer used. Agents keep the existing v-table with Flights only.
Tests per the Test Coverage Map; update RowActionIcons / AgentHome tests as needed. Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] Home columns per **FR-001**
*   [x] Home row actions per **FR-002**
*   [x] Shared table per **FR-003**
*   [x] Home filter and order per **FR-004**; Agents unchanged per **FR-005**
*   [x] System Admin summary boxes above Organization Trips per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npx vitest run` green
*   [x] Backend `npm test` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- **Add trip** / **Copy** on Home.
- Changing the Trips page's columns or actions, other than removing **Donor link**.
- Agent and Trip Leader Home tables.
- API changes other than `memberCount`, `preApprovedMemberCount`, `totalRoles`, and `unfilledRoles` on `GET /trips/trips`.
