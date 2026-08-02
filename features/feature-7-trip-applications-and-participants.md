# Feature: Trip Applications & Participants

**Feature ID:** 7
**Branch pattern:** `feature/7-trip-applications-and-participants`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — browse/apply, incomplete vs applied status, agreement/travel/funding, staff approve/decline/cancel, CSV export participants
**Depends on:** [Feature 5](feature-5-trip-catalog-management.md), [Feature 6](feature-6-worker-roles-and-travel-options.md), [Feature 2](feature-2-people-and-org-membership.md), [Feature 3](feature-3-organizations-and-agreements.md)

---

## User Stories

### US-7.1: Browse and apply to trips
**As a** non–system-admin signed-in user  
**I want to** browse eligible trips and submit or update an application  
**So that** I can join a trip team

**Priority:** P1  
**Independent test:** `/trips/trips/browse*` apply/update application  
**Acceptance scenarios:** see ### US-7.1

### US-7.2: Save incomplete vs complete applications
**As an** applicant  
**I want** incomplete drafts vs completed `applied` status based on required fields  
**So that** I can finish later and leaders only treat complete apps as submitted

**Priority:** P1  
**Independent test:** `isApplicationComplete` drives status `incomplete`|`applied`  
**Acceptance scenarios:** see ### US-7.2

### US-7.3: Staff manage participants and applications
**As an** Org Admin or Trip Leader  
**I want to** add/edit participants and approve/unapprove/cancel applications  
**So that** the trip roster is controlled

**Priority:** P1  
**Independent test:** `/trips/trip-people-roles` + ViewTripApplicationDialog flows  
**Acceptance scenarios:** see ### US-7.3

### US-7.4: Export participants CSV
**As** staff with trip access  
**I want to** download participants CSV  
**So that** I can work offline with roster data

**Priority:** P2  
**Independent test:** `GET /trips/export/trips/:tripId/participants.csv`  
**Acceptance scenarios:** see ### US-7.4

---

## Requirements

### Functional Requirements

- **FR-001**: Browse/apply routes MUST be blocked for system admins (`canBrowseAndApplyToTrips`).
- **FR-002**: Application fields MUST include worker role, funding flags (`willSelfFund`/`willRaiseFunds`), `licenseStatus`, roommate fields, agreement acceptance/signature (adult signer fields when under 18), travel option selections, `whygoText`, optional `participantCost`.
- **FR-003**: Status values MUST be `incomplete`|`applied`|`approved`|`declined`|`cancelled`.
- **FR-004**: Auto status MUST set `incomplete` vs `applied` from `isApplicationComplete`; staff MAY set `approved`|`declined`|`cancelled`.
- **FR-005**: Profile MUST be complete (`isProfileComplete`) before a full application submit is accepted in UI/API rules as implemented.
- **FR-006**: Under-18 applicants MUST supply adult agreement signer fields when agreement is required.
- **FR-007**: TripPeopleRoleOption MUST store selected travel options per application.
- **FR-008**: Manage assignments MUST require Org Admin, Trip Leader, or System Admin; list requires `?tripId`.
- **FR-009**: Participant dashboard `GET /trips/dashboard/participant` MUST return the caller's donation totals for a trip.
- **FR-010**: Screens: Home browse lists, `TripBrowseView`, `ApplyTripDialog`, `EditTripApplicationView`, `TripView` approve dialogs, `TripPeopleRolesList`, `Add/EditTripParticipantDialog`.

---

## Assumptions

- Org agreement content comes from Feature 3.
- Public apply funnel auth is Feature 1; public marketing pages Feature 9.
- Donations display on browse is Feature 8.

## Edge Cases

- Updating application only allowed while `incomplete` or `applied` (as coded).
- License required roles need matching documents/dates as enforced in apply UI/helpers.
- System admin cannot use browse routes.

## Success Criteria

- **SC-001**: Applicant can save incomplete then complete to `applied`.
- **SC-002**: Leader can approve an applied participant to `approved`.
- **SC-003**: Automated tests (backfill).

---

## Data Ownership & Isolation

- Applicants only mutate their own browse application.
- Staff manage roster for trips they can access.
- Approved trip roles appear on auth payload `tripRoles`.

---

## Key Entities

- **TripPeopleRole** — assignment/application
- **TripPeopleRoleOption** — selected travel options

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/trips/browse`, `/browse/orgs`, `/browse/mine`, `/browse/:id` | Yes | Browse |
| `POST` | `/trips/trips/browse/:id/apply` | Yes | Apply |
| `GET/PUT` | `/trips/trips/browse/:id/application` | Yes | Own application |
| CRUD | `/trips/trip-people-roles` | Yes | Staff roster |
| `GET` | `/trips/dashboard/participant` | Yes | Own totals |
| `GET` | `/trips/export/trips/:tripId/participants.csv` | Yes | CSV |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/home` | My trips / apply lists |
| `/browse-trips/:tripId` | `TripBrowseView` |
| `/browse-trips/:tripId/application` | `EditTripApplicationView` |
| `/trips/:tripId` | Approve/preview application dialogs |
| `/trip-people` | Trip leader roster |

---

## Data Model Requirements

### `tripPeopleRole`
`tripId`, `peopleId`, `roleId`, `tripWorkerRoleId`, `status`, `participantCost`, `whygoText`, funding flags, `licenseStatus`, roommate fields, agreement fields, `assiginmentDateTime`, `version`

### `tripPeopleRoleOption`
`tripPeopleRoleId`, `tripTravelOptionId`, `selected`

---

## Acceptance Criteria (Gherkin)

### US-7.1 — Browse and apply to trips

#### Scenario: Participant browses active trips and opens apply dialog
* **Given** I am a Trip Participant (not system admin)
* **When** I open an eligible trip from Home
* **Then** I see trip browse details and can open Apply

#### Scenario: System admin cannot browse-apply
* **Given** I am a system admin
* **When** I navigate to `/browse-trips/:tripId`
* **Then** the router redirects me away from browse/apply

### US-7.2 — Save incomplete vs complete applications

#### Scenario: Incomplete application saves as incomplete
* **Given** my profile is complete but I have not finished required application fields
* **When** I save the application
* **Then** status is `incomplete`

#### Scenario: Complete application becomes applied
* **Given** all required application fields including agreement and travel options are complete
* **When** I submit the application
* **Then** status is `applied`

### US-7.3 — Staff manage participants and applications

#### Scenario: Trip Leader approves an applied participant
* **Given** a tripPeopleRole with status `applied`
* **When** a Trip Leader approves the application
* **Then** status becomes `approved`

#### Scenario: Trip Leader adds an existing person to the roster
* **Given** I can manage the trip
* **When** I add a participant via AddTripParticipantDialog
* **Then** a tripPeopleRole row exists for that person

### US-7.4 — Export participants CSV

#### Scenario: Staff downloads participants CSV
* **Given** I can access trip T
* **When** I download participants CSV
* **Then** the response is a CSV file for trip T

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-7.1 | Participant browses active trips and opens apply dialog | `backend/tests/applications.test.js` | `Participant browses active trips and opens apply dialog` |
| US-7.1 | System admin cannot browse-apply | `backend/tests/applications.test.js` | `System admin cannot browse-apply` |
| US-7.2 | Incomplete application saves as incomplete | `backend/tests/applications.test.js` | `Incomplete application saves as incomplete` |
| US-7.2 | Complete application becomes applied | `backend/tests/applications.test.js` | `Complete application becomes applied` |
| US-7.3 | Trip Leader approves an applied participant | `backend/tests/applications.test.js` | `Trip Leader approves an applied participant` |
| US-7.3 | Trip Leader adds an existing person to the roster | `backend/tests/applications.test.js` | `Trip Leader adds an existing person to the roster` |
| US-7.4 | Staff downloads participants CSV | `backend/tests/applications.test.js` | `Staff downloads participants CSV` |

---

## Agent implementation request

```text
Implement Feature 7 from @features/feature-7-trip-applications-and-participants.md on branch `feature/7-trip-applications-and-participants`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update living reference files in the same PR when this feature changes API/schema/rules.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Implemented in imported codebase (**FR-00N**)
*   [ ] Automated tests for every Gherkin scenario
*   [ ] `npm test` green
*   [ ] Living reference updated when evolving this feature

## Out of Scope

- Public donate pages — Feature 9
- Recording donations — Feature 8
