# Feature: Reserved Role Emails

**Feature ID:** 56
**Branch pattern:** `feature/56-reserved-role-emails`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Allow one or more individuals, specified by email, to be reserved for a role added to a trip, up to the number needed for the role. Slots not reserved can be taken by anyone signing up. When a person with a matching email applies for the trip, they are assigned the reserved role. Where a list of roles with counts is shown, add a **Reserved** column and reduce **Available** by the reserved number.
**Depends on:** [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md), [Feature 28 — View Trip Status](feature-28-view-trip-status.md)

---

## User Stories

### US-56.1: Reserve role slots by email
**As a** Trip Leader, Org Admin, or System Admin
**I want to** reserve slots in a trip role for specific people by email
**So that** the people I have already chosen get those places and others can only take the remaining slots

**Priority:** P1
**Independent test:** Reserve two emails on a role needing 3 → the role shows Reserved 2 and Available 1; a third reservation is accepted only while an open slot remains.
**Acceptance scenarios:** see ### US-56.1

### US-56.2: Reserved person applies into the reserved role
**As a** person whose email is reserved for a role on a trip
**I want to** apply and be placed in my reserved role
**So that** my place is held for me even when the open slots are gone

**Priority:** P1
**Independent test:** A person whose email is reserved applies (even naming another role) → their application has the reserved role; Reserved drops by 1 and Signed up rises by 1.
**Acceptance scenarios:** see ### US-56.2

### US-56.3: See reserved counts
**As a** staff member or person browsing trips
**I want to** see how many slots of each role are reserved
**So that** Available reflects only the slots anyone can take

**Priority:** P2
**Independent test:** Role lists on the Team roles card, Trip Status board, and Browse trip page show a **Reserved** column, and **Available** = Needed − Signed up − Reserved.
**Acceptance scenarios:** see ### US-56.3

---

## Requirements

### Functional Requirements

- **FR-001**: Staff who can edit a trip's team roles (Trip Leader of the trip, Org Admin of the trip's organization, or System Admin — Feature 6) MAY add and remove **reserved emails** on a trip role (`tripWorkerRole`). Others → `403`; unknown role → `404`.
- **FR-002**: A reservation stores the trip role and an **email**. Emails are trimmed and compared case-insensitively, and stored lowercase. An email MAY be reserved only **once per trip** (on one role).
- **FR-003**: Staff MAY add one or more emails at once. The request is rejected as a whole (`400`, nothing saved) when any email:
  - is not a valid email address → "Enter valid email addresses.";
  - is already reserved on the trip (any role), or repeated in the request → "<email> is already reserved on this trip.";
  - belongs to a person who already has an incomplete, applied, or approved application on the trip → "<email> has already applied for this trip.";
  - or when the role does not have enough open slots for all of them (open slots = **Available**, **FR-005**) → "Only <n> open slots for this role."
- **FR-004**: A reservation is **filled** while a person whose email matches has an application on the trip with status `incomplete`, `applied`, or `approved` for **that** role. Otherwise it is **unfilled**. Filled reservations count in **Signed up** (Feature 26, unchanged); unfilled reservations count in **Reserved**.
- **FR-005**: For each trip role: **Reserved** = number of unfilled reservations; **Available** = Needed − Signed up − Reserved, floored at 0. Role payloads that carry `signedUpCount` / `availableCount` (trip-worker-role list, browse, public overview, Trip Status) MUST add `reservedCount` and use this **Available**.
- **FR-006**: When a person applies for a trip (`POST /trips/trips/browse/:id/apply`) and their email (their person record's email) matches a reservation on that trip, the application MUST be saved with the **reserved role**, whatever role was sent. The reserved slot is theirs: the application MUST NOT be rejected for lack of open slots in that role.
- **FR-007**: A person with a reservation on the trip MUST NOT change their application to a different role (`PUT /trips/trips/browse/:id/application` with another role → `400` "Your role on this trip is reserved."). Uncancelling their application (Feature 26) MUST succeed for the reserved role even when it has no open slots.
- **FR-008**: People without a reservation MAY only take open slots: creating an application for, switching to, or uncancelling into a role with **Available** < 1 is rejected as today (Feature 26 FR-005, FR-008), with **Available** from **FR-005**.
- **FR-009**: If a reserved person's application is cancelled or declined, the reservation stays and becomes unfilled again (counted in **Reserved**).
- **FR-010**: Removing a reservation does not change any application; the person (if they applied) keeps their role. Removing a trip role removes its reservations.
- **FR-011**: Lowering a role's **Number Needed** below its number of reservations (filled and unfilled) → `400` "Remove reserved emails first."
- **FR-012**: The browse detail payload (`GET /trips/trips/browse/:id`) and the caller's application payload (`GET /trips/trips/browse/:id/application`) MUST include `myReservedTripWorkerRoleId`: the caller's reserved role on the trip, or `null`.
- **FR-013**: Reserved emails are visible only to the staff in **FR-001**. Browse and public payloads expose counts only.
- **FR-014**: Adding a role to a trip (`POST /trips/trip-worker-roles`) MAY include reserved emails (`emails: string[]`). They are validated as in **FR-003** (open slots = the new role's Number Needed), and the role and its reservations are saved together: when any email is rejected, neither the role nor any reservation is saved.
- **FR-015**: The role forms (Add Role dialog in **Add trip** / **Edit**, Team roles card Add Role) MUST NOT accept more reserved emails than the role's Number Needed: **Add** shows "Reserved emails (<n>) cannot be more than Number Needed (<q>)." and keeps the form open. Saving **Add trip** / **Edit** MUST be blocked, with nothing sent, when any role's reserved emails (for saved roles: all its reservations) outnumber its Number Needed, showing "<role>: Reserved emails (<n>) cannot be more than Number Needed (<q>)."

---

## Assumptions

- No email is sent when a reservation is added (out of scope).
- Staff adding a participant from the roster (Feature 7) is not changed: staff MAY place anyone in any role. If they place a reserved person in the reserved role, the reservation is filled per **FR-004**.
- The applicant's email for matching is their person record's email (the same email used for sign-in and profile).
- Reservations do not create people or accounts.

## Edge Cases

- Role needs 3, 1 open applicant signed up, staff reserve 2 emails → Reserved 2, Available 0; a further reservation → `400` "Only 0 open slots for this role."
- Role needs 2, 1 reserved (`ana@example.org`), 1 signed up by someone else → Available 0; another person cannot apply for it, but Ana can.
- Ana is reserved for **Nurse** and applies choosing **Driver** → her application is **Nurse**.
- Reserved email `Ana@Example.org` and Ana's person email `ana@example.org` → match.
- Ana (reserved) cancels → Reserved goes back up by 1 and Signed up down by 1; Available unchanged; Ana can uncancel.
- Staff remove Ana's reservation after she applied → she keeps her role; Reserved unchanged (it was filled), Available unchanged.
- Number Needed 3 with 2 reservations; staff set Number Needed to 1 → `400` "Remove reserved emails first."

## Success Criteria

- **SC-001**: Staff can hold places on a trip for chosen people by email, and the public can only take the remaining slots.
- **SC-002**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Reservations belong to a trip role and are managed only by staff of that trip (**FR-001**). Reserved emails are never returned to applicants or the public (**FR-013**).

---

## Key Entities

- **TripWorkerRoleReservation** (new), **TripWorkerRole**, **TripPeopleRole**, **Person**

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/trip-worker-roles/:id/reservations` | auth + trip staff | `[{ id, email, filled, applicantName, applicationStatus }]` ordered by email; `applicantName` / `applicationStatus` set when filled (**FR-001**, **FR-004**) |
| `POST` | `/trips/trip-worker-roles/:id/reservations` | auth + trip staff | Body `{ emails: string[] }`; `201` with the created reservations; `400` per **FR-003** |
| `DELETE` | `/trips/trip-worker-roles/:id/reservations/:reservationId` | auth + trip staff | Remove a reservation (**FR-010**) |
| `GET` | `/trips/trip-worker-roles?tripId=` | auth | Adds `reservedCount`; `availableCount` per **FR-005** |
| `POST` | `/trips/trip-worker-roles` | auth | Optional `emails: string[]`; `400` per **FR-003** / **FR-014** with nothing saved; response role includes `reservedCount` |
| `PUT` | `/trips/trip-worker-roles/:id` | auth | `400` per **FR-011** |
| `GET` | `/trips/trips/browse/:id` | auth | Roles add `reservedCount` (**FR-005**); adds `myReservedTripWorkerRoleId` (**FR-012**) |
| `POST` | `/trips/trips/browse/:id/apply` | auth | Reserved role applied per **FR-006**; open-slot check per **FR-008** |
| `GET` | `/trips/trips/browse/:id/application` | auth | Adds `myReservedTripWorkerRoleId` (**FR-012**) |
| `PUT` | `/trips/trips/browse/:id/application` | auth | `400` per **FR-007**; open-slot check per **FR-008** |
| `POST` | `/trips/trips/browse/:id/application/uncancel` | auth | Reserved person allowed per **FR-007** |
| `GET` | `/trips/trips/:id/status` | auth | Roles add `reservedCount` (**FR-005**) |
| `GET` | `/trips/public/trips/by-name/:tripSlug/overview` | none | Roles add `reservedCount`; `availableCount` per **FR-005** |

---

## Screen Requirements

| Where | Change |
|-------|--------|
| `TripWorkerRolesCard` (Team roles needed) | Adds a **Reserved** column after **Number Signed Up**, a line "Reserved emails: <emails>" ("—" when none, loaded from `GET …/reservations`) under the role name and description, and a **Reserved emails** action per row opening `RoleReservationsDialog` (changes refresh the line). The inline Add Role form is replaced by an **Add role** button (disabled with "No more active roles to add") that opens an **Add Role** dialog with **Worker role**, **Number Needed**, and an optional **Reserved emails** text box (separated by commas, spaces, or new lines), plus **Cancel** / **Add**. **Add** saves the role with its emails (**FR-014**), closes the dialog, and refreshes the table; on error the dialog stays open with its values and shows the message |
| `EditTripDialog` (Trips list **Edit**) Team roles | Role rows no longer show the worker-role description. No **Reserved** count column; instead, under each role row a line "Reserved emails: <emails>" ("—" when none): a saved role's reservations (loaded from `GET …/reservations`), or the emails entered for a new role. Saved roles get a **Reserved emails** button opening `RoleReservationsDialog` (changes save immediately and refresh the row's emails line). The inline Add Role form is replaced by an **Add role** button (disabled with "Select an organization first" / "No more active roles to add") that opens an **Add Role** dialog with **Worker role**, **Number Needed**, and an optional **Reserved emails** text box, plus **Cancel** / **Add**; **Add** puts the role in the table and closes the dialog (validation errors show in the dialog). A new role's emails are sent with the role when the trip is saved (**FR-014**). After a partial role-save failure, a retry only resends what failed |
| `AddTripDialog` (Trips list **Add trip**) Team roles | Same as `EditTripDialog` for new roles: no description, no **Reserved** column, a "Reserved emails: <emails>" line ("—" when none) under each role row, and an **Add role** button opening the **Add Role** dialog (**Worker role**, **Number Needed**, optional **Reserved emails**). Each role's emails are sent with it when the trip is added (**FR-014**) |
| `RoleReservationsDialog` (new) | Title "Reserved emails — <role>"; lists reservations (email; "Applied — <name> (<status>)" when filled, otherwise "Reserved"; **Remove**); a text box for one or more emails (separated by commas, spaces, or new lines) with **Add**, shows open slots ("<n> open slots") and API errors; changes refresh the card's counts |
| `TripStatusView` role summary | Adds a **Reserved** column between **Signed up** and **Available** |
| `TripBrowseView` roles table | Adds a **Reserved** column between **Positions Filled** and **Available** |
| `ApplyTripDialog` / `EditTripApplicationView` | When `myReservedTripWorkerRoleId` is set, the role select shows only that role, disabled, with the hint "This role is reserved for you." |
| `PublicTripPage` | No new column; available counts use **FR-005** |

---

## Data Model Requirements

New table `tripWorkerRoleReservation`:

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip (CASCADE) |
| tripWorkerRoleId | INTEGER | required FK → tripWorkerRole (CASCADE) |
| email | STRING(255) | required; lowercase |
| unique | `(tripId, email)` | **FR-002** |

**Associations:** `tripWorkerRole` `hasMany` `tripWorkerRoleReservation` as `reservations`; `tripWorkerRoleReservation` `belongsTo` `tripWorkerRole`, `trip`.

---

## Acceptance Criteria (Gherkin)

### US-56.1 — Reserve role slots by email

#### Scenario: Staff reserve emails for a role
* **Given** trip role **Nurse** needs 3 and nobody has applied
* **When** an Org Admin reserves `ana@example.org` and `Ben@Example.org` for **Nurse**
* **Then** the response is `201`
* **And** the reservations list is `ana@example.org` and `ben@example.org`, both "Reserved"
* **And** **Nurse** has Signed up 0, Reserved 2, Available 1

#### Scenario: Reservations only take open slots
* **Given** **Nurse** needs 2 and one person has applied for it
* **When** the Org Admin reserves `ana@example.org` and `ben@example.org`
* **Then** the response is `400` with "Only 1 open slots for this role."
* **And** no reservation is saved

#### Scenario: Invalid or duplicate emails are rejected
* **Given** `ana@example.org` is reserved for **Nurse** on the trip
* **When** the Org Admin reserves `ANA@example.org` for **Driver** on the same trip
* **Then** the response is `400` with "ana@example.org is already reserved on this trip."
* **And** reserving `not-an-email` → `400` "Enter valid email addresses."

#### Scenario: Cannot reserve someone who already applied
* **Given** Carl (`carl@example.org`) has an applied application on the trip
* **When** the Org Admin reserves `carl@example.org`
* **Then** the response is `400` with "carl@example.org has already applied for this trip."

#### Scenario: Staff reserve emails when adding a role
* **Given** the trip does not have **Cook** or **Guide** yet
* **When** an Org Admin adds **Cook** with Number Needed 2 and reserved emails `ana@example.org`
* **Then** **Cook** is added with Signed up 0, Reserved 1, Available 1
* **And** adding **Guide** with Number Needed 1 and reserved emails `ben@example.org` and `carl@example.org` → `400` "Only 1 open slots for this role." and **Guide** is not added

#### Scenario: Edit trip reserves emails for existing and new roles
* **Given** I open **Edit** for a trip from the Trips list and the trip has **Nurse** with reservation `carl@example.org`
* **Then** the table has no **Reserved** column, and the **Nurse** row is followed by a line "Reserved emails: carl@example.org"
* **And** its **Reserved emails** button opens the reserved emails for **Nurse**
* **When** I click **Add role**, choose **Driver** with Number Needed 2 and reserved emails `ana@example.org, ben@example.org` in the **Add Role** dialog, click **Add**, then click **Save**
* **Then** before saving, the line under **Driver** reads "Reserved emails: ana@example.org, ben@example.org"
* **And** **Driver** is created with those emails

#### Scenario: Add trip reserves emails for new roles
* **Given** I open **Add trip** from the Trips list
* **When** I click **Add role**, choose **Driver** with Number Needed 2 and reserved emails `ana@example.org ben@example.org` in the **Add Role** dialog, and click **Add**
* **Then** the dialog closes and the line under **Driver** reads "Reserved emails: ana@example.org, ben@example.org"
* **When** I add the trip
* **Then** **Driver** is created on the new trip with those emails

#### Scenario: Add Role dialog blocks more emails than Number Needed
* **Given** the **Add Role** dialog is open in **Add trip**
* **When** I choose **Driver** with Number Needed 1 and reserved emails `ana@example.org, ben@example.org` and click **Add**
* **Then** the dialog stays open with "Reserved emails (2) cannot be more than Number Needed (1)."
* **And** **Driver** is not added to the table

#### Scenario: Edit trip blocks saving a role with more reserved emails than Number Needed
* **Given** I open **Edit** for a trip whose **Nurse** (needs 3) has reservations `carl@example.org` and `dana@example.org`
* **When** I change **Nurse** Number Needed to 1 and click **Save**
* **Then** "Nurse: Reserved emails (2) cannot be more than Number Needed (1)." is shown and the trip is not saved

#### Scenario: Trip page shows reserved emails under each role
* **Given** the trip has **Nurse** ("Registered nurse") with reservations `ana@example.org` and `ben@example.org`, and **Driver** with none
* **When** I view the trip page's Team roles card
* **Then** under **Nurse** and its description is "Reserved emails: ana@example.org, ben@example.org"
* **And** under **Driver** is "Reserved emails: —"

#### Scenario: Trip page Add Role dialog adds a role with reserved emails
* **Given** I am on the trip page's Team roles card
* **When** I click **Add role** and enter **Driver**, Number Needed 2, and reserved emails `ana@example.org, ben@example.org`, then click **Add**
* **And** the server rejects it (for example "ana@example.org has already applied for this trip.")
* **Then** the dialog stays open with my values and shows the message
* **When** I click **Add** again and it succeeds
* **Then** **Driver** is created with those emails, the dialog closes, and the table reloads

#### Scenario: Remove a reservation
* **Given** `ana@example.org` is reserved for **Nurse** (needs 3)
* **When** the Org Admin removes the reservation
* **Then** **Nurse** has Reserved 0, Available 3

#### Scenario: Number Needed cannot drop below reservations
* **Given** **Nurse** needs 3 with 2 reservations
* **When** the Org Admin sets Number Needed to 1
* **Then** the response is `400` with "Remove reserved emails first."

#### Scenario: Participants cannot manage reservations
* **Given** I am an approved Trip Participant on the trip
* **When** I request `GET /trips/trip-worker-roles/:id/reservations` or post a reservation
* **Then** the response is `403`

### US-56.2 — Reserved person applies into the reserved role

#### Scenario: Reserved person is placed in the reserved role
* **Given** `Ana@Example.org` is reserved for **Nurse** (needs 2) and the trip also has **Driver**
* **When** Ana (person email `ana@example.org`) applies choosing **Driver**
* **Then** her application's role is **Nurse**
* **And** **Nurse** has Signed up 1, Reserved 0, Available 1
* **And** the reservation shows "Applied — Ana Lopez (incomplete)" (or her current status)

#### Scenario: Reserved person can apply when no open slots remain
* **Given** **Nurse** needs 2, `ana@example.org` is reserved, and Ben (not reserved) has applied for **Nurse**
* **When** Ana applies for **Nurse**
* **Then** the application is created
* **And** **Nurse** has Signed up 2, Reserved 0, Available 0

#### Scenario: Others cannot take reserved slots
* **Given** **Nurse** needs 2, `ana@example.org` is reserved, and Ben has applied for **Nurse**
* **When** Carl (not reserved) applies for **Nurse**
* **Then** the response is `400` (no open slots)

#### Scenario: Reserved person cannot switch roles
* **Given** Ana is reserved for **Nurse** and has applied
* **When** Ana updates her application to **Driver**
* **Then** the response is `400` with "Your role on this trip is reserved."

#### Scenario: Cancelled reserved person returns to Reserved
* **Given** Ana is reserved for **Nurse** (needs 2) and has applied, and Ben has applied for **Nurse**
* **When** Ana cancels her application
* **Then** **Nurse** has Signed up 1, Reserved 1, Available 0
* **And** when Ana uncancels, it succeeds and **Nurse** has Signed up 2, Reserved 0

#### Scenario: Browse shows my reserved role
* **Given** `ana@example.org` is reserved for **Nurse**
* **When** Ana requests `GET /trips/trips/browse/:id`
* **Then** `myReservedTripWorkerRoleId` is the **Nurse** trip role id
* **And** for Ben (not reserved) it is `null`

#### Scenario: Apply dialog locks the reserved role
* **Given** the browse detail has `myReservedTripWorkerRoleId` set to **Nurse**, and **Nurse** shows Available 0
* **When** the Apply dialog opens
* **Then** the role select shows only **Nurse**, disabled, with "This role is reserved for you."

### US-56.3 — See reserved counts

#### Scenario: Role lists include reserved counts
* **Given** **Nurse** needs 3, one person has applied (not reserved), and one email is reserved
* **When** the trip-worker-role list, browse detail, Trip Status, and public overview are requested
* **Then** each **Nurse** entry has `signedUpCount` 1, `reservedCount` 1, `availableCount` 1

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-56.1 | Staff reserve emails for a role | `backend/tests/reserved-role-emails.test.js` | `Staff reserve emails for a role` |
| US-56.1 | Reservations only take open slots | `backend/tests/reserved-role-emails.test.js` | `Reservations only take open slots` |
| US-56.1 | Invalid or duplicate emails are rejected | `backend/tests/reserved-role-emails.test.js` | `Invalid or duplicate emails are rejected` |
| US-56.1 | Cannot reserve someone who already applied | `backend/tests/reserved-role-emails.test.js` | `Cannot reserve someone who already applied` |
| US-56.1 | Staff reserve emails when adding a role | `backend/tests/reserved-role-emails.test.js` | `Staff reserve emails when adding a role` |
| US-56.1 | Edit trip reserves emails for existing and new roles | `frontend/tests/EditTripDialog.test.js` | `Edit trip reserves emails for existing and new roles` |
| US-56.1 | Add trip reserves emails for new roles | `frontend/tests/AddTripDialog.test.js` | `Add trip reserves emails for new roles` |
| US-56.1 | Add Role dialog blocks more emails than Number Needed | `frontend/tests/AddTripDialog.test.js` | `Add Role dialog blocks more emails than Number Needed` |
| US-56.1 | Edit trip blocks saving a role with more reserved emails than Number Needed | `frontend/tests/EditTripDialog.test.js` | `Edit trip blocks saving a role with more reserved emails than Number Needed` |
| US-56.1 | Trip page shows reserved emails under each role | `frontend/tests/TripWorkerRolesCard.test.js` | `Trip page shows reserved emails under each role` |
| US-56.1 | Trip page Add Role dialog adds a role with reserved emails | `frontend/tests/TripWorkerRolesCard.test.js` | `Trip page Add Role dialog adds a role with reserved emails` |
| US-56.1 | Remove a reservation | `backend/tests/reserved-role-emails.test.js` | `Remove a reservation` |
| US-56.1 | Number Needed cannot drop below reservations | `backend/tests/reserved-role-emails.test.js` | `Number Needed cannot drop below reservations` |
| US-56.1 | Participants cannot manage reservations | `backend/tests/reserved-role-emails.test.js` | `Participants cannot manage reservations` |
| US-56.2 | Reserved person is placed in the reserved role | `backend/tests/reserved-role-emails.test.js` | `Reserved person is placed in the reserved role` |
| US-56.2 | Reserved person can apply when no open slots remain | `backend/tests/reserved-role-emails.test.js` | `Reserved person can apply when no open slots remain` |
| US-56.2 | Others cannot take reserved slots | `backend/tests/reserved-role-emails.test.js` | `Others cannot take reserved slots` |
| US-56.2 | Reserved person cannot switch roles | `backend/tests/reserved-role-emails.test.js` | `Reserved person cannot switch roles` |
| US-56.2 | Cancelled reserved person returns to Reserved | `backend/tests/reserved-role-emails.test.js` | `Cancelled reserved person returns to Reserved` |
| US-56.2 | Browse shows my reserved role | `backend/tests/reserved-role-emails.test.js` | `Browse shows my reserved role` |
| US-56.2 | Apply dialog locks the reserved role | `frontend/tests/ApplyTripDialog.test.js` | `Apply dialog locks the reserved role` |
| US-56.3 | Role lists include reserved counts | `backend/tests/reserved-role-emails.test.js` | `Role lists include reserved counts` |

---

## Agent implementation request

```text
Implement Feature 56 from @features/feature-56-reserved-role-emails.md on branch `feature/56-reserved-role-emails`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend and frontend before finishing.
Update @features/reference/api.md, @features/reference/behavior.md, and @features/reference/data-model.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`tripWorkerRoleReservation`), `features/reference/api.md` (reservation endpoints, `reservedCount`, `myReservedTripWorkerRoleId`), `features/reference/behavior.md` (reserved slots, capacity formula, apply rules)

---

## Definition of Done

*   [x] Staff add/remove reserved emails per trip role with validation, including when adding the role (**FR-001**–**FR-003**, **FR-010**, **FR-011**, **FR-014**, **FR-015**)
*   [x] Reserved / Available counts in role payloads and on the Team roles card, Trip Status, and Browse (**FR-004**, **FR-005**, **FR-013**)
*   [x] Reserved applicants placed in and locked to the reserved role; others limited to open slots (**FR-006**–**FR-009**, **FR-012**)
*   [x] `tripWorkerRoleReservation` table created on startup (`ensureSchema` / sync)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/56-reserved-role-emails`; PR → `dev`

---

## Out of Scope

- Emailing or inviting reserved people
- Changing staff roster add/edit (Feature 7)
- Reserving for Trip Leader or other non-worker roles
- Showing reserved emails to applicants or the public
- Bulk import of reservations from a file
