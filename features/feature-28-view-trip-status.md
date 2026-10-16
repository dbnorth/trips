# Feature: View Trip Status

**Feature ID:** 28
**Branch pattern:** `feature/28-view-trip-status`
**Status:** Done
**Created:** 2026-09-06
**Input:** From the trip detail page (opened via **View** on the trips list), add a **Trip Status** button that opens a status board: trip heading with role counts, then a table of participants with application status, missing profile/application items, amount owed, amount raised, and a column per trip travel option showing each applicant’s selection
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 6 — Worker Roles & Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 8 — Donors & Donations](feature-8-donors-and-donations.md), [Feature 27 — Application Submit Unavailable Info Message](feature-27-application-submit-unavailable-info.md) (missing-item checklist semantics)

---

## User Stories

### US-28.1: Open Trip Status from trip detail
**As a** Trip Leader, Org Admin, or System Admin  
**I want** a **Trip Status** button on the trip detail page (the page reached from **View** on the trips list)  
**So that** I can open a dedicated status board for that trip

**Priority:** P1  
**Independent test:** On `/trips/:tripId` (`TripView`), a **Trip Status** button navigates to a Trip Status route for that trip; unauthorized users cannot open it  
**Acceptance scenarios:** see ### US-28.1

### US-28.2: See trip heading with role counts
**As a** Trip Leader, Org Admin, or System Admin  
**I want** the Trip Status page to show a heading section about the trip including each worker-role need with counts  
**So that** I can see how full each role is at a glance

**Priority:** P1  
**Independent test:** Heading shows trip identity (at least name; dates/location MAY appear) and each `tripWorkerRole` with quantity / signed-up / available counts consistent with Feature 26 capacity rules  
**Acceptance scenarios:** see ### US-28.2

### US-28.3: See participant status board
**As a** Trip Leader, Org Admin, or System Admin  
**I want** a table of trip participants/applicants with application status, missing profile and application items, amount owed, amount raised, and one column per trip travel option with the applicant’s selection  
**So that** I can manage readiness and fundraising without opening each application

**Priority:** P1  
**Independent test:** Each `tripPeopleRole` row for the trip appears with status, missing-item summary, owed, raised, and travel-option columns matching configured options and selections  
**Acceptance scenarios:** see ### US-28.3

---

## Requirements

### Functional Requirements

- **FR-001**: Trip detail (`TripView`, route from Trips list **View**) MUST show a **Trip Status** button (toolbar / heading actions, same access context as viewing the trip).
- **FR-001a**: Trips list (`TripsList`) Actions column MUST include a **Status** control that navigates to the Trip Status page for that trip (same route as **FR-002**).
- **FR-002**: **Trip Status** MUST navigate to a dedicated authenticated page/route for that trip (e.g. `/trips/:tripId/status`, name `tripStatus`).
- **FR-003**: Only users who MAY view/manage the trip roster for that trip (Trip Leader for the trip, Org Admin for the trip’s org, or System Admin) MAY open Trip Status. Others → same forbid pattern as trip detail (`403`/`404` / redirect home).
- **FR-004**: The Trip Status page MUST show a **heading section** for the trip including at least:
  - Trip **name**
  - Useful context already common on trip detail (MAY include org name, dates, location, base participant cost)
  - **Roles with counts**: for each `tripWorkerRole` on the trip, show worker-role name, `quantity`, `signedUpCount`, and `availableCount` using Feature 26 occupancy rules (`incomplete` / `applied` / `approved` occupy; `cancelled` / `declined` do not)
- **FR-005**: Below the heading, the page MUST show a **table** (or equivalent dense grid) with **one row per** `tripPeopleRole` assignment for that trip (all statuses, including cancelled/declined — staff status board).
- **FR-006**: Each row MUST include:
  - Participant **display name**
  - **Application status** (product label for `incomplete` / `applied` / `approved` / `declined` / `cancelled`)
  - **Worker role** name (if assigned)
  - **Missing items** — a human-readable list (comma-separated or bullets) of:
    1. Whether the **person profile** is incomplete (e.g. include **Profile is not complete** and/or the same missing profile field labels used elsewhere)
    2. Incomplete **trip application** fields/requirements needed for a complete/`applied` application (same categories as Feature 27 incompleteness checklist: trip role, funding, pregnancy when applicable, travel options, agreements/signature, required documents/passport, etc., evaluated for that person + assignment)
  - When nothing is missing for profile and application completeness gates, Missing items MUST show an empty indicator (e.g. **—** or **None**)
- **FR-007**: Each row MUST show **Amount raised** = sum of `tripDonation` amounts for that person on this trip (`donationTotal` semantics already used on TripView roster).
- **FR-008**: Each row MUST show **Amount owed** = `max(0, participantCost − amountRaised)` where `participantCost` is the assignment’s stored participant cost (including travel adjustments as already stored on `tripPeopleRole.participantCost`). Display as money.
- **FR-009**: The table MUST include **one column per** `tripTravelOption` configured on the trip (column header = option description, MAY include set label if helpful). For each participant cell: show that the option is **selected** (e.g. **Yes** / check) or **not selected** (e.g. **—** / blank), based on `tripPeopleRoleOption` (or equivalent selection payload).
- **FR-010**: Prefer a dedicated authenticated read API for the board (e.g. `GET /trips/trips/:id/status`) that returns trip summary, roles-with-counts, travel-option column definitions, and participant rows with the fields above — so the UI does not N+1 client-side. Reusing/composing existing trip + roster + donations + options endpoints is allowed if the page still meets FR performance/clarity and tests.
- **FR-011**: Empty states: trip with no participants → heading still shows; table empty message (e.g. **No participants yet**). Trip with no travel options → no dynamic option columns (or a single note that none are configured).
- **FR-012**: Money formatting MUST match existing trip/donation display conventions.
- **FR-013**: Participant **display name** in the status table MUST be a clickable control that opens a dialog showing that person’s **contact info**: email, phone, and address (street lines, city, state/province, postal code, country). Close dismisses the dialog.

---

## Assumptions

- Entry points: **TripView** (**Trip Status** button) and Trips list Actions (**Status**).
- “Amount raised” = donation total for that person on the trip; “Amount owed” = remaining balance after raised toward `participantCost`.
- Missing application items use the same completeness concepts as Feature 7 / Feature 27 (including document and passport gates when applicable); staff see the checklist even when status is already `approved` (approved rows MAY still list missing items if profile/docs drifted — or show **None** when status is approved if implementers prefer; default: compute missing against completeness rules regardless of status so the board stays honest).
- Leaders who are only Trip Leaders (no participant application) still appear if they have a `tripPeopleRole` row; if leaders are stored only as leadership assignments, include them when they have a roster row.
- Column order for travel options: stable by `setNumber` then option id/description.

## Edge Cases

- Participant with null `participantCost` → treat owed using trip base cost if that is how TripView already displays cost; otherwise **—** for owed when cost unknown (document choice in implementation; prefer matching TripView `rowParticipantCost`).
- Raised greater than cost → owed **$0.00**.
- Cancelled application → still listed; capacity counts exclude them from signed-up; missing items MAY still compute.
- Many travel options → horizontal scroll on the table is acceptable.
- System admin with no acting org → same trip access rules as TripView.

## Success Criteria

- **SC-001**: Staff can open Trip Status from TripView via **Trip Status**, and from the Trips list via **Status**.
- **SC-002**: Heading shows trip info and role quantity / signed-up / available counts.
- **SC-003**: Participant table shows status, missing profile/application items, owed, raised, and per-option selection columns.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Read trip status** | Trip Leader for trip, Org Admin for org, or System Admin only |
| **Cross-org** | No status board for trips outside allowed access (`403`/`404` consistent with trip detail) |
| **Participant PII** | Only fields needed for the board (name, status, missing checklist, money, option selections); no new public exposure |

---

## Key Entities

- **Trip** — heading identity
- **TripWorkerRole** — role counts in heading
- **TripPeopleRole** — participant rows / status / cost
- **TripTravelOption** + **TripPeopleRoleOption** — dynamic columns / selections
- **TripDonation** — amount raised
- **Person** (+ documents / medical as needed) — profile completeness / missing items

No new tables required.

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/trips/:id/status` (recommended) | auth + trip staff access | Trip summary, `rolesNeeded` with counts, `travelOptions` column defs, `participants[]` with status, missingItems, amountOwed, amountRaised, selectedTravelOptionIds (or per-option flags) |

**Example participant row shape (illustrative):**

```json
{
  "id": 12,
  "peopleId": 5,
  "displayName": "Ada Applicant",
  "status": "incomplete",
  "workerRoleName": "Nurse",
  "participantCost": 1850,
  "amountRaised": 200,
  "amountOwed": 1650,
  "missingItems": ["Profile is not complete", "Participant agreement"],
  "selectedTravelOptionIds": [3]
}
```

**Status codes:** `200` success; `403`/`404` when trip not accessible; `401` unauthenticated.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripsList` | Actions: **Status** → Trip Status page for that trip |
| `TripView` | **Trip Status** button → navigate to Trip Status page |
| Trip Status page | Heading (trip + roles with counts); participant table as **FR-005**–**FR-009**; name opens contact dialog (**FR-013**) |
| Contact dialog | Email, phone, address for the selected participant; Close |
| Back | Control to return to trip detail (e.g. **Back to trip**) |
| Loading / error | Progress + error alert consistent with TripView |

**Button label:** `Trip Status`  
**Page title:** e.g. `Trip status` / `{Trip name} — Status`

---

## Data Model Requirements

No schema changes. Reads existing associations only.

---

## Acceptance Criteria (Gherkin)

### US-28.1 — Open Trip Status from trip detail

#### Scenario: Staff opens Trip Status from trip View page
* **Given** I can open a trip from the trips list **View** action
* **When** I click **Trip Status** on the trip detail page
* **Then** I am taken to the Trip Status page for that trip

#### Scenario: Staff opens Trip Status from trips list
* **Given** I can see a trip on the trips list
* **When** I click **Status** in that trip’s Actions column
* **Then** I am taken to the Trip Status page for that trip

#### Scenario: Unauthorized user cannot open Trip Status
* **Given** I am signed in without trip staff access for trip T
* **When** I request the Trip Status page or API for T
* **Then** access is denied (`403`/`404` / redirect consistent with trip detail)

### US-28.2 — See trip heading with role counts

#### Scenario: Heading lists roles with signed-up and available counts
* **Given** trip T has a worker role with quantity 2 and one occupying application
* **When** I open Trip Status for T
* **Then** the heading shows that role with signed-up count 1 and available count 1

### US-28.3 — See participant status board

#### Scenario: Row shows status, missing items, owed, and raised
* **Given** participant P on trip T has status `incomplete`, participant cost 1000, and donations totaling 250
* **And** P’s profile or application has known missing items
* **When** I open Trip Status for T
* **Then** P’s row shows status Incomplete (or product label)
* **And** missing items list those gaps
* **And** amount raised is 250
* **And** amount owed is 750

#### Scenario: Travel option columns reflect selections
* **Given** trip T has travel options A and B
* **And** participant P selected only A
* **When** I open Trip Status for T
* **Then** the table has a column for A and a column for B
* **And** P’s cell for A indicates selected
* **And** P’s cell for B indicates not selected

#### Scenario: Clicking a participant name opens contact info
* **Given** I am on Trip Status for a trip with participant P
* **When** I click P’s display name
* **Then** a dialog shows P’s email, phone, and address
* **And** I can close the dialog

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-28.1 | Staff opens Trip Status from trip View page | `frontend/tests/TripStatus.test.js` (or TripView nav test) | `Staff opens Trip Status from trip View page` |
| US-28.1 | Staff opens Trip Status from trips list | `frontend/tests/TripStatus.test.js` | `Staff opens Trip Status from trips list` |
| US-28.1 | Unauthorized user cannot open Trip Status | `backend/tests/trip-status.test.js` | `Unauthorized user cannot open Trip Status` |
| US-28.2 | Heading lists roles with signed-up and available counts | `backend/tests/trip-status.test.js` | `Heading lists roles with signed-up and available counts` |
| US-28.3 | Row shows status, missing items, owed, and raised | `backend/tests/trip-status.test.js` | `Row shows status, missing items, owed, and raised` |
| US-28.3 | Travel option columns reflect selections | `backend/tests/trip-status.test.js` | `Travel option columns reflect selections` |
| US-28.3 | Clicking a participant name opens contact info | `frontend/tests/TripStatus.test.js` | `Clicking a participant name opens contact info` |

---

## Agent implementation request

```text
Implement Feature 28 from @features/feature-28-view-trip-status.md on branch `feature/28-view-trip-status`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` (backend + frontend as needed) before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md` (status endpoint), `behavior.md` (Trip Status board rules)

---

## Definition of Done

*   [x] **Trip Status** button on TripView; dedicated status page (**FR-001**–**FR-003**)
*   [x] Heading with trip info + role counts (**FR-004**)
*   [x] Participant table: status, missing items, owed, raised, per-option columns (**FR-005**–**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] Tests green
*   [ ] On `feature/28-view-trip-status`; PR → `dev`

---

## Out of Scope

- Editing applications, approving, or cancelling from the status board (use existing TripView actions)
- Export CSV of the status board (participants CSV already exists elsewhere)
- Applicant-facing status page
- Real-time websocket refresh
- Changing donation or cost calculation rules beyond display of owed/raised as defined here
