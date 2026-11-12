# Feature: Participant Counts

**Feature ID:** 127
**Branch pattern:** `feature/127-participant-counts`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** "create a spec to update display and calc for trip participant numbers. 1) on Org Admin Dashboard and Trips page change Members to Participants and only count Incomplete, Pre-Approved and Approved trip participants, do not include leaders. 2) on Trip View grey banner stats add Leaders and then make Participants same as previously specified." Clarified: the info icon shows "Incomplete: N", "Pre-approved: N", "Approved: N", participants only.
**Depends on:** [Feature 108 — Home Organization Trips Match the Trips List](feature-108-home-trips-match-trips-list.md)

Today the trips table's **Members** column counts Pre-Approved and Approved Trip Leaders and Trip Participants, and the **View Trip** summary's **Participants** tile counts every row in the participants table (any status, leaders included). This feature makes both count only the people actually going as participants (Incomplete, Pre-Approved, Approved Trip Participants) and shows leaders separately on **View Trip**.

---

## User Stories

### US-127.1: Participants column on the trips table

**As an** Org Admin
**I want** the trips table on Home and the **Trips** page to show **Participants** counting only active Trip Participants
**So that** I see how many people are signed up to go, without leaders or dropped applications

**Priority:** P1
**Independent test:** A trip has 1 Incomplete, 2 Pre-Approved, and 3 Approved Trip Participants, 1 Declined and 1 Cancelled Trip Participant, and 1 Approved Trip Leader. **Organization Trips** on Home and the **Trips** page show a **Participants** column with 6, and its info icon shows "Incomplete: 1", "Pre-approved: 2", "Approved: 3".
**Acceptance scenarios:** see ### US-127.1

### US-127.2: Leaders and Participants on View Trip

**As** trip staff
**I want** the **View Trip** summary to show **Leaders** and **Participants** separately
**So that** the counts match the trips table

**Priority:** P1
**Independent test:** On **View Trip** for the trip above, the summary shows **Leaders** 1 and **Participants** 6, with the same info icon breakdown.
**Acceptance scenarios:** see ### US-127.2

---

## Requirements

### Functional Requirements

- **FR-001**: The trips table (Home **Organization Trips** and the **Trips** page, `TripsTable`) MUST rename the **Members** column to **Participants**.
- **FR-002**: **Participants** MUST count the trip's Trip Participant rows with status Incomplete, Pre-Approved, or Approved. It MUST NOT count Trip Leaders, or Declined or Cancelled rows.
- **FR-003**: The **Participants** info icon (aria-label "Participant details") MUST show three lines: "Incomplete: N", "Pre-approved: N", "Approved: N", counting Trip Participants only. The three numbers add up to the column's count.
- **FR-004**: `GET /trips/trips` MUST return `participantCount`, `incompleteParticipantCount`, `preApprovedParticipantCount`, and `approvedParticipantCount` per trip (Trip Participants only, by status) and MUST drop `memberCount` and `preApprovedMemberCount`. `activeParticipantCount` stays as it is (approved Trip Leaders and Trip Participants), since the Trip Leader Home **Active members** column uses it.
- **FR-005**: The **View Trip** summary (grey banner) MUST add a **Leaders** tile counting the trip's Trip Leader rows with status Incomplete, Pre-Approved, or Approved.
- **FR-006**: The **View Trip** summary **Participants** tile MUST use the FR-002 count, with the FR-003 info icon. The tiles read, in order: **Leaders**, **Participants**, **Cost per participant**, **Total donations**, **Donations without participant**.
- **FR-007**: Nothing else changes: **Total Roles** and its unfilled roles, **Total cost**, **Total donations**, the prep checks, **Team roles** "*X* signed up / *Y* needed", the participants table, the Donations page tiles, and the Trip Leader Home **Active members** column keep their current counts.

---

## Assumptions

- "Trip participants" means people with the Trip Participant role on the trip. A person who is a Trip Leader on the trip counts only under **Leaders**.
- The **Leaders** tile uses the same three statuses as **Participants**, so dropped leader rows aren't counted.
- System Admins with an organization selected see the same trips table, so they get the same column.
- The **View Trip** counts come from the participants list the page already loads; no new endpoint.

## Edge Cases

- A trip with no Trip Participants → **Participants** 0, info icon "Incomplete: 0", "Pre-approved: 0", "Approved: 0".
- A trip with only leaders → trips table **Participants** 0; **View Trip** **Leaders** shows the leader count and **Participants** 0.
- Declined and Cancelled Trip Participants still show in the **View Trip** participants table but aren't counted in the tile.

## Success Criteria

- **SC-001**: The trips table and **View Trip** show the same **Participants** number for a trip.
- **SC-002**: Leaders and Declined / Cancelled applications never inflate **Participants**.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. `GET /trips/trips` keeps its scoping; **View Trip** keeps its trip-staff access.

---

## Key Entities

- **TripPeopleRole**: `roleId` (Trip Leader / Trip Participant) and `status`, read only.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips` | Each trip adds `participantCount`, `incompleteParticipantCount`, `preApprovedParticipantCount`, `approvedParticipantCount` (Trip Participants only); `memberCount` and `preApprovedMemberCount` are removed; `activeParticipantCount` unchanged |

---

## Screen Requirements

| UI | Change |
|----|--------|
| `TripsTable` (Home **Organization Trips**, **Trips** page) | **Members** → **Participants** (`participantCount`); info icon "Participant details" with Incomplete / Pre-approved / Approved lines |
| `TripView` summary | New **Leaders** tile first; **Participants** tile uses the active Trip Participant count with the same info icon |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-127.1 — Participants column on the trips table

#### Scenario: Trips list counts active trip participants only
* **Given** a trip with 1 Incomplete, 2 Pre-Approved, 3 Approved, 1 Declined, and 1 Cancelled Trip Participant, and 1 Approved Trip Leader
* **When** I list trips
* **Then** the trip has participantCount 6, incompleteParticipantCount 1, preApprovedParticipantCount 2, and approvedParticipantCount 3
* **And** it has no memberCount or preApprovedMemberCount
* **And** activeParticipantCount is still 4

#### Scenario: Trips table shows the Participants column
* **Given** I am an Org Admin
* **When** I open Home or the Trips page
* **Then** the table has a "Participants" column and no "Members" column
* **And** the trip's Participants count is 6

#### Scenario: Participants info shows the status breakdown
* **Given** the trips table shows a trip
* **When** I open the Participants info icon
* **Then** I see "Incomplete: 1", "Pre-approved: 2", and "Approved: 3"

### US-127.2 — Leaders and Participants on View Trip

#### Scenario: View Trip summary shows Leaders and Participants
* **Given** the trip above
* **When** I open View Trip
* **Then** the summary shows Leaders 1 and Participants 6, before Cost per participant
* **And** the Participants info icon shows "Incomplete: 1", "Pre-approved: 2", and "Approved: 3"

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-127.1 | Trips list counts active trip participants only | `backend/tests/` trips list | `Trips list counts active trip participants only` |
| US-127.1 | Trips table shows the Participants column | `frontend/tests/` trips table / Home | `Trips table shows the Participants column` |
| US-127.1 | Participants info shows the status breakdown | `frontend/tests/` trips table / Home | `Participants info shows the status breakdown` |
| US-127.2 | View Trip summary shows Leaders and Participants | `frontend/tests/` TripView | `View Trip summary shows Leaders and Participants` |

Existing Feature 108 tests that check `memberCount`, the **Members** header, or the "Pre-approved / Approved" tooltip are changed to the new fields and labels.

---

## Agent implementation request

```text
Implement Feature 127 from @features/feature-127-participant-counts.md on branch `feature/127-participant-counts`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Update docs/user-guide/ (org-admin-guide.md, trip-staff-guide.md, glossary.md) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (`GET /trips/trips` count fields), `features/reference/behavior.md` (Feature 108 row: **Participants** column and tooltip; the **View Trip** summary tiles)

**User guide updates:** `org-admin-guide.md` (**Organization Trips** **Members** row → **Participants**), `trip-staff-guide.md` (**Summary** tiles: add **Leaders**, change **Participants**), `glossary.md` (**Members** entry → **Participants** on the Trips list)

---

## Definition of Done

*   [x] Trips table **Participants** column counts Incomplete / Pre-Approved / Approved Trip Participants only (**FR-001**, **FR-002**)
*   [x] Info icon shows the three status counts (**FR-003**)
*   [x] `GET /trips/trips` returns the new count fields and drops the member fields (**FR-004**)
*   [x] **View Trip** summary shows **Leaders** and the new **Participants** count (**FR-005**, **FR-006**)
*   [x] Other counts unchanged (**FR-007**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/127-participant-counts`; PR → `dev`

---

## Out of Scope

- Changing who counts toward **Total Roles**, **Total cost**, **Total donations**, or the prep checks
- The Donations page **Participants** tile and the Trip Leader Home **Active members** column
- Filtering or sorting the participants table by status
- A breakdown for the **Leaders** tile
