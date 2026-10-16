# Feature: Copy Trip

**Feature ID:** 21
**Branch pattern:** `feature/21-copy-trip`
**Status:** Done
**Created:** 2026-09-06
**Input:** Allow staff to copy an existing trip into a new trip via a Copy button next to Add trip; dialog asks for the new trip name and which trip to copy; replicate trip details, leaders, worker-role needs, and travel options/addons — not participants or donations
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 6 — Worker Roles & Travel Options](feature-6-worker-roles-and-travel-options.md)

---

## User Stories

### US-21.1: Open copy-trip dialog from the trips list
**As an** Org Admin or System Admin  
**I want** a **Copy** button next to **Add trip** that opens a dialog with a new-trip name field and a dropdown of trips I can copy  
**So that** I can start a new trip from an existing one without re-entering setup

**Priority:** P1  
**Independent test:** On `/trips` (Trips list), **Copy** appears beside **Add trip**; dialog shows required **Name** and a trip dropdown populated from the same org-scoped trip list the user can manage; disabled under the same org-selection rules as **Add trip**  
**Acceptance scenarios:** see ### US-21.1

### US-21.2: Copy trip setup into a new trip
**As an** Org Admin or System Admin  
**I want** confirming the dialog to create a new trip that copies the source trip’s catalog fields, leaders, trip worker-role quantities, and travel options  
**So that** staffing and cost options are ready without copying people applications or money

**Priority:** P1  
**Independent test:** `POST` copy endpoint with source trip + new name → new trip id; leaders, `tripWorkerRole` rows, and `tripTravelOption` rows match source; no participant `tripPeopleRole` rows and no `tripDonation` rows on the new trip  
**Acceptance scenarios:** see ### US-21.2

---

## Requirements

### Functional Requirements

- **FR-001**: Trips list (`TripsList` / route that hosts **Add trip**) MUST show a **Copy** button **next to** the **Add trip** button (same toolbar row). **Copy** MUST use the same enable/disable rule as **Add trip** (e.g. disabled when a system admin must select an acting organization before creating a trip).
- **FR-002**: **Copy** MUST open a dialog (e.g. `CopyTripDialog`) with:
  - **Name** — required text field for the **new** trip’s name
  - **Trip to copy** (or equivalent label) — required dropdown/select listing trips available to copy (same org scope as the trips list for the current user / acting org)
  - Primary action to confirm (e.g. **Copy** or **Create**) and a cancel/dismiss control
- **FR-003**: Only **Org Admin** for the source trip’s organization, or **System Admin**, MAY copy a trip (same create gate as Feature 5 trip create — not Trip Leader alone).
- **FR-004**: On confirm, the system MUST create a **new** `trip` row in the **same** `orgId` as the source trip, with **name** set from the dialog (trimmed). Other trip catalog fields MUST be copied from the source: `status`, `location`, `city`, `country`, `description`, `startDate`, `endDate`, `image`, `facebookPage`, `instagramId`, `participantCost`. New trip `version` MUST start at the create default (`0`). Source trip MUST remain unchanged.
- **FR-005**: Copy MUST replicate **Trip Leader** assignments from the source onto the new trip (same people as leaders; approved leadership as used by existing `syncTripLeaders` / Feature 5 leader semantics). MUST **not** copy any other `tripPeopleRole` rows (participants / applicants / other roles).
- **FR-006**: Copy MUST replicate all source **`tripWorkerRole`** rows onto the new trip (`workerRoleId` + `quantity` pointing at the same org worker-role catalog entries).
- **FR-007**: Copy MUST replicate all source **`tripTravelOption`** rows onto the new trip (`description`, `priceAdjustment`, `setNumber`) — these are the trip travel options / addons.
- **FR-008**: Copy MUST **not** create `tripDonation` rows, donor links, or any participant fundraising state for the new trip.
- **FR-009**: Copy MUST **not** copy `tripPeopleRoleOption` rows, application/agreement fields, pregnancy fields, or any other participant-application data.
- **FR-010**: API MUST expose an authenticated copy operation (recommended: `POST /trips/trips/:id/copy` with body `{ name }`, where `:id` is the **source** trip). Success MUST return the new trip (including `id` and `leaderPeopleIds` consistent with Feature 5 create responses). Errors: `400` when name blank or source invalid for copy; `403`/`404` per existing trip access patterns when the user cannot create for that org or cannot access the source trip.
- **FR-011**: After a successful copy, the UI MUST refresh the trips list (or otherwise show the new trip) and close the dialog. Soft failure MUST show an error in the dialog without creating a partial trip visible as success (prefer one transaction / rollback on failure).

---

## Assumptions

- “Roles” means **per-trip worker role needs** (`tripWorkerRole`), not org-level `workerRole` catalog rows (those already exist and are referenced by id).
- “Travel addons” means **`tripTravelOption`** (Feature 6 travel option sets).
- Leaders are **Trip Leader** `tripPeopleRole` assignments only (Feature 5).
- Org-scoped worker role definitions and document types are not duplicated; only trip attachments are copied.
- Email templates linked to a trip (Feature 10) are **not** copied unless a later feature says so (see Out of Scope).
- Trip image copy MAY reuse the same stored image path/filename as the source (no requirement to duplicate the binary file on disk).
- Dropdown order MAY match the existing trips list sort; label SHOULD be the trip `name` (dates MAY appear as secondary text if helpful — not required).

## Edge Cases

- Source trip with no leaders / no worker roles / no travel options → new trip still created with those collections empty.
- Blank or whitespace-only **Name** → validation error; no trip created.
- User cancels dialog → no API call; no trip created.
- Source trip in another org the user cannot administer → not listed and/or copy denied (`404`/`403` consistent with create/list scoping).
- Concurrent delete of source trip between open dialog and submit → copy fails cleanly with an error message.
- Very long name → same validation/length rules as trip create **Name**.

## Success Criteria

- **SC-001**: **Copy** appears next to **Add trip** and opens the name + trip-dropdown dialog.
- **SC-002**: Confirming copy creates a new trip with the given name and copied catalog fields, leaders, worker-role quantities, and travel options.
- **SC-003**: New trip has zero non-leader participants and zero donations.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Read scope (dropdown)** | Trips the current user can already list for the acting org / create context (same as Trips list + Add trip org rules) |
| **Write scope** | Create new trip only when user may create trips for the source trip’s `orgId` (Org Admin or System Admin) |
| **Source trip** | Must be accessible under existing `canAccessTrip` / org-admin create rules for that org |
| **Cross-org** | Cannot copy a trip into a different organization; `orgId` always equals source `orgId` |
| **Isolation** | New trip is a separate row; deleting or editing the copy must not alter the source (except shared image file path if reused) |

---

## Key Entities

- **Trip** (new row) — copy of source catalog fields + new name
- **TripPeopleRole** (leaders only) — new leader rows for the new trip
- **TripWorkerRole** — new quantity rows for the new trip
- **TripTravelOption** — new option/addon rows for the new trip

No new tables.

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/trips/:id/copy` | auth (Org Admin for trip org / System Admin) | Copy source trip `:id` → new trip |

**Request body:**

```json
{ "name": "Summer 2027 Medical Trip" }
```

**Behavior:**

- `:id` = source trip id
- `name` required (trim; non-empty)
- Creates new trip + leaders + `tripWorkerRole` + `tripTravelOption` as in FR-004–FR-007
- Does not copy participants or donations (FR-008, FR-009)

**Success:** `200` or `201` with new trip JSON (include `id`, copied fields, `leaderPeopleIds`).

**Errors:** `400` validation; `403`/`404` when not allowed / source not found for this user (match Feature 5 patterns).

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripsList.vue` (or equivalent trips list) | **Copy** button immediately beside **Add trip**; same disabled state as **Add trip** |
| `CopyTripDialog` (new) | Title e.g. **Copy trip**; fields **Name** (new trip), **Trip to copy** (select); confirm + cancel |
| After success | Close dialog; refresh list so the new trip appears |

Labels in quotes above are the expected visible strings for tests unless an existing list pattern already uses a close synonym (prefer exact **Copy** / **Copy trip** / **Name** / **Trip to copy**).

---

## Data Model Requirements

No schema changes. Copy writes existing tables:

| Table | On copy |
|-------|---------|
| `trip` | Insert; `orgId` = source; `name` from body; other catalog fields from source; `version` = 0 |
| `tripPeopleRole` | Insert **Trip Leader** rows only for source leaders |
| `tripWorkerRole` | Insert one row per source row (`workerRoleId`, `quantity`) |
| `tripTravelOption` | Insert one row per source row (`description`, `priceAdjustment`, `setNumber`) |
| `tripDonation` | **None** |
| Other participant / application rows | **None** |

---

## Acceptance Criteria (Gherkin)

### US-21.1 — Open copy-trip dialog from the trips list

#### Scenario: Copy button opens dialog with name and trip dropdown
* **Given** I am Org Admin (or System Admin with an acting organization selected) on the Trips list
* **And** at least one trip exists for that organization
* **When** I click **Copy** next to **Add trip**
* **Then** a dialog opens with a **Name** field and a **Trip to copy** dropdown
* **And** the dropdown lists that organization’s trips

#### Scenario: Copy is disabled when Add trip is disabled
* **Given** I am a System Admin on the Trips list with no acting organization selected (Add trip disabled)
* **When** I view the toolbar
* **Then** **Copy** is disabled the same way as **Add trip**

### US-21.2 — Copy trip setup into a new trip

#### Scenario: Copy creates trip with leaders, roles, and travel options
* **Given** source trip T has leaders L, trip worker roles R, and travel options O
* **And** T also has at least one non-leader participant and at least one donation
* **When** I copy T with name **Copied Trip**
* **Then** a new trip exists named **Copied Trip** in the same organization
* **And** the new trip has the same leaders as T
* **And** the new trip has the same worker-role quantities as T
* **And** the new trip has the same travel options as T
* **And** the new trip has no non-leader participants
* **And** the new trip has no donations
* **And** trip T is unchanged

#### Scenario: Blank name is rejected
* **Given** I open the copy dialog and select a source trip
* **When** I confirm with an empty **Name**
* **Then** no new trip is created
* **And** I see a validation error

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-21.1 | Copy button opens dialog with name and trip dropdown | `frontend/tests/` TripsList / CopyTripDialog | `Copy button opens dialog with name and trip dropdown` |
| US-21.1 | Copy is disabled when Add trip is disabled | `frontend/tests/` TripsList | `Copy is disabled when Add trip is disabled` |
| US-21.2 | Copy creates trip with leaders, roles, and travel options | `backend/tests/` trips (or dedicated copy test) | `Copy creates trip with leaders, roles, and travel options` |
| US-21.2 | Blank name is rejected | `backend/tests/` and/or frontend dialog | `Blank name is rejected` |

---

## Agent implementation request

```text
Implement Feature 21 from @features/feature-21-copy-trip.md on branch `feature/21-copy-trip`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR when this feature changes them (no schema change expected for data-model.md unless implementation notes require it).
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (copy endpoint), `features/reference/behavior.md` (copy includes leaders / roles / travel options; excludes participants / donations)

---

## Definition of Done

*   [x] **Copy** button next to **Add trip**; dialog with **Name** + trip dropdown (**FR-001**, **FR-002**)
*   [x] Auth gated like trip create (**FR-003**)
*   [x] API copy creates trip + leaders + worker roles + travel options (**FR-004**–**FR-007**, **FR-010**)
*   [x] No participants or donations copied (**FR-008**, **FR-009**)
*   [x] List refreshes after success (**FR-011**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/21-copy-trip`; PR → `dev`

---

## Out of Scope

- Copying **participants**, applications, agreement signatures, pregnancy answers, or selected travel options on applications
- Copying **donations** / donors
- Copying **email templates** tied to a trip (Feature 10)
- Changing the source trip’s name or “move” semantics (this is always create-new)
- Bulk copy of multiple trips
- Copying into a **different** organization
- Deep-duplicating trip image binary files (path reuse is enough)
- Letting Trip Leaders create copies without Org Admin / System Admin create rights
