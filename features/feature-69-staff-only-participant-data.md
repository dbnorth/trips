# Feature: Participant CSV, Roster, and Single Application Are Staff Only

**Feature ID:** 69
**Branch pattern:** `feature/69-staff-only-participant-data`
**Status:** Implemented
**Created:** 2026-10-20
**Input:** Security defect (audit issue 2) — any approved Trip Participant can download the trip's participant CSV (`GET /trips/export/trips/:tripId/participants.csv`), fetch the trip roster (`GET /trips/trip-people-roles?tripId=`), and fetch any teammate's application (`GET /trips/trip-people-roles/:id`), because all three fall back to `canAccessTrip`, which lets Trip Participants through. All three return teammates' address, phone, birthdate, emergency contact, allergies, medication, pregnancy and due date (the CSV also lists documents). Fix: "restrict the participant CSV and the get-one endpoint to staff (Org Admin, Trip Leader, System Admin)." Follow-up: "remove the ability for the team participants to access the roster list (`GET /trips/trip-people-roles?tripId=`)."
**Depends on:** [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 8 — Donors & Donations](feature-8-donors-and-donations.md), [Feature 33 — Preferred Name](feature-33-person-preferred-name.md), [Feature 53 — Participant Donations](feature-53-participant-donations.md)

---

## User Stories

### US-69.1: Only trip staff can download the participant CSV
**As a** trip participant  
**I want** my teammates on a trip to be unable to download my personal and medical details  
**So that** only the people running the trip see them

**Priority:** P1  
**Independent test:** As an approved Trip Participant, `GET /trips/export/trips/:tripId/participants.csv` → `403` "Forbidden."; as the trip's Org Admin, Trip Leader, or a System Admin → `200` CSV  
**Acceptance scenarios:** see ### US-69.1

### US-69.2: Only trip staff can fetch a single application
**As a** trip participant  
**I want** my teammates to be unable to fetch my application record  
**So that** my profile, health answers, and pregnancy answers stay private

**Priority:** P1  
**Independent test:** As an approved Trip Participant, `GET /trips/trip-people-roles/:id` for a teammate's application → `403` "Forbidden."; as staff → `200`  
**Acceptance scenarios:** see ### US-69.2

### US-69.3: Only trip staff can fetch the trip roster
**As a** trip participant  
**I want** my teammates to be unable to fetch the trip roster  
**So that** my profile, health answers, and pregnancy answers are not sent to their browsers

**Priority:** P1  
**Independent test:** As an approved Trip Participant, `GET /trips/trip-people-roles?tripId=` → `403` "Forbidden."; as staff → `200` roster; the Donations page still shows the participant's own donations without errors  
**Acceptance scenarios:** see ### US-69.3

---

## Requirements

### Functional Requirements

- **FR-001**: **Trip staff** for a trip are: a System Admin; an Org Admin of the trip's organization; an approved Trip Leader of that trip. (The same rule as staff add, edit, cancel, and the Documents PDF — `canManageTripPeople`.)
- **FR-002**: `GET /trips/export/trips/:tripId/participants.csv` MUST return the CSV only to trip staff. An approved Trip Participant of the trip (who is not also trip staff) MUST get `403` "Forbidden.". A user with no access to the trip, or a trip that does not exist, keeps getting `404` "Trip not found.".
- **FR-003**: `GET /trips/trip-people-roles/:id` MUST return the application only to trip staff for the application's trip. Anyone else, including an approved Trip Participant of that trip and the applicant themselves, MUST get `403` "Forbidden." with no application data. An unknown id keeps returning `404` "Record not found.".
- **FR-004**: For trip staff, all three endpoints MUST return exactly what they return today (same CSV columns and rows; same application body with `travelOptions`; same roster rows with `donationTotal`).
- **FR-005**: Participants keep reading their own application through `GET /trips/trips/browse/:id/application` (unchanged).
- **FR-006**: `GET /trips/trip-people-roles?tripId=` MUST return the roster only to trip staff for that trip. Anyone else, including an approved Trip Participant of the trip, MUST get `403` "Forbidden." with no roster data. A missing `tripId` keeps returning `400` "tripId query param required.".
- **FR-007**: On the **Donations** page, when the user is not trip staff for the selected trip, the page MUST NOT request the roster and MUST hide the **Participants** count, the **Add donation** button, and each row's **Edit** button; it still shows the trip select, cost per participant, totals, the user's own donations, and **Export CSV** as today. (Participants cannot save donations from this page today — create and update already require trip staff — and they donate through **Donate** in **My Trip Info**, Feature 53.)
- **FR-008**: The donation dialog opened from the Donations page (**Add donation** / **Edit**) MUST offer in its **Trip** select only trips where the user is trip staff, so it never requests the roster for another trip.
- **FR-009**: A trip participant MUST still be able to donate to another participant on the trip. **Donate** in **My Trip Info** (trip page and Home) keeps its recipient list from `myTripInfo.donationRecipients` on `GET /trips/trips/browse/:id` — person id, first name, and last name of approved Trip Participants and Trip Leaders — and `POST /trips/donations/participant`, both unchanged (Feature 53). Exposing those ids and names to participants is intended.

---

## Assumptions

- The other screens that load the roster are staff screens and need no change: the trip page (`TripView.vue`, opened from the staff Trips list, Org Admin home, and Trip Status), its **Add participant** and participant **Donations** dialogs, the Trip Leader **Trips** page (`TripPeopleRolesList.vue`), and the email template preview. Participants use the browse trip page (`TripBrowseView.vue`, **My Trip Info**), which does not load the roster.
- The frontend decides trip staff (FR-007, FR-008) from the signed-in user: `isAdmin`; an Org Admin org role for the trip's organization; or a Trip Leader trip role for the trip. Trip roles in the signed-in user are approved only (Feature 7).
- The applicant is refused on `GET /trips/trip-people-roles/:id` even for their own application (FR-003), because no participant screen uses it; their application screens use the browse endpoint (FR-005).
- `403` for a participant on the CSV (rather than `404`) follows the Documents PDF, which already answers participants `403` "Forbidden." and outsiders `404` "Trip not found.". The roster and single application already answer outsiders `403`.
- A Trip Leader whose assignment is not approved is not trip staff.

## Edge Cases

- A person who is both a Trip Participant on the trip and an Org Admin of its organization → trip staff → allowed.
- A Trip Leader of trip A who is a participant on trip B → staff on A, not on B: roster, CSV, and single application for B → `403`; on the Donations page, B shows no Participants count, **Add donation**, or **Edit**, and the donation dialog's Trip select lists only A.
- A System Admin with an acting organization set to a different organization → still allowed (System Admins manage any trip, as today).

## Success Criteria

- **SC-001**: No user who is not trip staff can get a trip's participant CSV, its roster, or any single application on that trip.
- **SC-002**: A participant's Donations page loads their own donations with no error and no roster request.
- **SC-003**: Automated tests for every scenario below pass, and existing export, application, and donation tests still pass.

---

## Data Ownership & Isolation

Tightened: teammates' personal and medical data on these three endpoints is visible only to trip staff (FR-001). Other trip endpoints are unchanged.

---

## Key Entities

- **TripPeopleRole** — the application / roster row (read only here)
- **Person** — the applicant's profile included in the CSV, roster, and application (read only here)

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/export/trips/:tripId/participants.csv` | Trip staff only; approved Trip Participant → `403` "Forbidden."; no access or unknown trip → `404` "Trip not found." (unchanged) |
| `GET` | `/trips/trip-people-roles?tripId=` | Trip staff only; everyone else (including approved Trip Participants) → `403` "Forbidden."; missing `tripId` → `400` (unchanged) |
| `GET` | `/trips/trip-people-roles/:id` | Trip staff only; everyone else (including the applicant) → `403` "Forbidden."; unknown id → `404` (unchanged) |

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| **Donations** (`/donations`) | `DonationsList.vue` | When not trip staff for the selected trip: no roster request; **Participants** count, **Add donation**, and row **Edit** hidden (FR-007) |
| Donations → **Add donation** / **Edit** | `DonationFormDialog.vue` (from `DonationsList.vue`) | **Trip** select lists only trips where the user is trip staff (FR-008) |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-69.1 — Only trip staff can download the participant CSV

#### Scenario: Org Admin downloads the participant CSV
* **Given** a trip in my organization with an approved participant "Casey Participant" whose allergies are "Peanuts"
* **And** I am an Org Admin of that organization
* **When** I download the trip's participant CSV
* **Then** the response is `200` CSV containing "Casey" and "Peanuts"

#### Scenario: Trip Leader downloads the participant CSV
* **Given** a trip with an approved participant "Casey Participant"
* **And** I am an approved Trip Leader of that trip
* **When** I download the trip's participant CSV
* **Then** the response is `200` CSV containing "Casey"

#### Scenario: System Admin downloads the participant CSV
* **Given** a trip with an approved participant "Casey Participant"
* **And** I am a System Admin
* **When** I download the trip's participant CSV
* **Then** the response is `200` CSV containing "Casey"

#### Scenario: Trip Participant is refused the participant CSV
* **Given** a trip with an approved participant "Casey Participant" whose allergies are "Peanuts"
* **And** I am another approved Trip Participant of that trip
* **When** I download the trip's participant CSV
* **Then** the response is `403` "Forbidden."
* **And** the response does not contain "Casey" or "Peanuts"

#### Scenario: User with no role on the trip is refused the participant CSV
* **Given** a trip
* **And** I have no role on the trip and no role in its organization
* **When** I download the trip's participant CSV
* **Then** the response is `404` "Trip not found."

### US-69.2 — Only trip staff can fetch a single application

#### Scenario: Trip staff get one application
* **Given** a trip with an approved participant "Casey Participant"
* **When** the trip's Org Admin, an approved Trip Leader of the trip, and a System Admin each get Casey's application
* **Then** each response is `200` with Casey's application, including the person and `travelOptions`

#### Scenario: Trip Participant is refused a teammate's application
* **Given** a trip with an approved participant "Casey Participant" whose allergies are "Peanuts"
* **And** I am another approved Trip Participant of that trip
* **When** I get Casey's application
* **Then** the response is `403` "Forbidden."
* **And** the response does not contain "Casey" or "Peanuts"

#### Scenario: Applicant uses the browse endpoint for their own application
* **Given** I am an approved Trip Participant of a trip
* **When** I get my own application from `GET /trips/trip-people-roles/:id`
* **Then** the response is `403` "Forbidden."
* **And** `GET /trips/trips/browse/:id/application` for that trip still returns my application (`200`)

### US-69.3 — Only trip staff can fetch the trip roster

#### Scenario: Trip staff get the trip roster
* **Given** a trip with an approved participant "Casey Participant"
* **When** the trip's Org Admin, an approved Trip Leader of the trip, and a System Admin each get the trip roster
* **Then** each response is `200` and includes Casey's row with the person and `donationTotal`

#### Scenario: Trip Participant is refused the trip roster
* **Given** a trip with an approved participant "Casey Participant" whose allergies are "Peanuts"
* **And** I am another approved Trip Participant of that trip
* **When** I get the trip roster
* **Then** the response is `403` "Forbidden."
* **And** the response does not contain "Casey" or "Peanuts"

#### Scenario: Participant still donates to a teammate
* **Given** a trip with approved Trip Participants "Casey Participant" and me
* **When** I get the trip from `GET /trips/trips/browse/:id`
* **Then** `myTripInfo.donationRecipients` includes Casey's person id, first name, and last name, and no other person fields
* **And** donating $25 to Casey with `POST /trips/donations/participant` succeeds (`200`)

#### Scenario: Participant's Donations page loads without the roster
* **Given** I am an approved Trip Participant (not trip staff) of the selected trip
* **When** the Donations page loads
* **Then** it shows my donations
* **And** it does not request the trip roster
* **And** the Participants count, **Add donation**, and **Edit** are not shown

#### Scenario: Trip staff Donations page is unchanged
* **Given** I am an Org Admin of the selected trip's organization
* **When** the Donations page loads
* **Then** it requests the trip roster and shows the Participants count
* **And** **Add donation** and **Edit** are shown

#### Scenario: Donation dialog lists only trips where I am staff
* **Given** I am a Trip Leader of trip "Alpha" and an approved Trip Participant of trip "Beta"
* **When** I open **Add donation** on the Donations page with "Alpha" selected
* **Then** the dialog's **Trip** select lists "Alpha" and not "Beta"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-69.1 | Org Admin downloads the participant CSV | `backend/tests/staff-only-participant-data.test.js` | `Org Admin downloads the participant CSV` |
| US-69.1 | Trip Leader downloads the participant CSV | `backend/tests/staff-only-participant-data.test.js` | `Trip Leader downloads the participant CSV` |
| US-69.1 | System Admin downloads the participant CSV | `backend/tests/staff-only-participant-data.test.js` | `System Admin downloads the participant CSV` |
| US-69.1 | Trip Participant is refused the participant CSV | `backend/tests/staff-only-participant-data.test.js` | `Trip Participant is refused the participant CSV` |
| US-69.1 | User with no role on the trip is refused the participant CSV | `backend/tests/staff-only-participant-data.test.js` | `User with no role on the trip is refused the participant CSV` |
| US-69.2 | Trip staff get one application | `backend/tests/staff-only-participant-data.test.js` | `Trip staff get one application` |
| US-69.2 | Trip Participant is refused a teammate's application | `backend/tests/staff-only-participant-data.test.js` | `Trip Participant is refused a teammate's application` |
| US-69.2 | Applicant uses the browse endpoint for their own application | `backend/tests/staff-only-participant-data.test.js` | `Applicant uses the browse endpoint for their own application` |
| US-69.3 | Trip staff get the trip roster | `backend/tests/staff-only-participant-data.test.js` | `Trip staff get the trip roster` |
| US-69.3 | Trip Participant is refused the trip roster | `backend/tests/staff-only-participant-data.test.js` | `Trip Participant is refused the trip roster` |
| US-69.3 | Participant still donates to a teammate | `backend/tests/staff-only-participant-data.test.js` | `Participant still donates to a teammate` |
| US-69.3 | Participant's Donations page loads without the roster | `frontend/tests/DonationsList.test.js` | `Participant's Donations page loads without the roster` |
| US-69.3 | Trip staff Donations page is unchanged | `frontend/tests/DonationsList.test.js` | `Trip staff Donations page is unchanged` |
| US-69.3 | Donation dialog lists only trips where I am staff | `frontend/tests/DonationsList.test.js` | `Donation dialog lists only trips where I am staff` |

---

## Agent implementation request

```text
Implement Feature 69 from @features/feature-69-staff-only-participant-data.md on branch `feature/69-staff-only-participant-data`.

Follow layer order in @features/framework.md.
Backend: export.controller.js participantsCsv — trip staff only (FR-001, FR-002): 404 "Trip not found." without trip access, 403 "Forbidden." for non-staff (same pattern as participantDocumentsPdf.controller.js). Leave donorsCsv and donationsCsv unchanged.
Backend: tripPeopleRole.controller.js findAll and findOne — trip staff only via canManageTripPeople; drop the canAccessTrip fallback (FR-003, FR-006).
Do not change myTripInfo.donationRecipients or POST /trips/donations/participant (FR-009).
Frontend: DonationsList.vue — no roster request and hide Participants count, Add donation, and row Edit when the user is not trip staff for the selected trip (FR-007); pass DonationFormDialog only trips where the user is trip staff (FR-008).
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: update the GET /trips/trip-people-roles, GET /trips/trip-people-roles/:id, and participants CSV rows in features/reference/api.md and add the Feature 69 row in features/reference/behavior.md.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md` (roster, single application, and participants CSV: trip staff only), `behavior.md` (participant CSV, roster, and single application are trip-staff only; Donations page for non-staff)

---

## Definition of Done

*   [x] Participant CSV trip-staff only per **FR-001**, **FR-002**, **FR-004**
*   [x] Single application trip-staff only per **FR-001**, **FR-003**, **FR-004**
*   [x] Roster trip-staff only per **FR-001**, **FR-004**, **FR-006**
*   [x] Donations page and dialog per **FR-007**, **FR-008**; participant Donate unchanged per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- A trimmed teammate list for participants (name, picture, roles, status) — no participant screen shows one today
- Donor and donation CSVs (`donors.csv`, `donations.csv`) and other donor data exposure
- Other trip endpoints that allow Trip Participants through `canAccessTrip` (trip detail, travel options, worker roles)
- Org Admin account takeover through Edit person and organization role assignment
- Login rate limiting and session revocation
