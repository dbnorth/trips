# Feature: Donors & Donations

**Feature ID:** 8
**Branch pattern:** `feature/8-donors-and-donations`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — staff donation entry, donor lookup/CRUD, participant-visible donations, CSV exports
**Depends on:** [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-8.1: Record donations for a trip
**As an** Org Admin or Trip Leader  
**I want to** create and edit donations linked to donors and participants  
**So that** fundraising totals are accurate

**Priority:** P1  
**Independent test:** CRUD `/trips/donations?tripId=`  
**Acceptance scenarios:** see ### US-8.1

### US-8.2: Look up and maintain donors
**As** staff  
**I want to** look up donors by email and update donor records  
**So that** donor contact data is reused

**Priority:** P1  
**Independent test:** `/trips/donors/lookup`, donor create/update  
**Acceptance scenarios:** see ### US-8.2

### US-8.3: Participants view their donations
**As an** applicant/participant  
**I want to** see donations credited to me on a trip  
**So that** I know fundraising progress

**Priority:** P2  
**Independent test:** Donations list scoped to own rows for participants  
**Acceptance scenarios:** see ### US-8.3

### US-8.4: Export donors and donations CSV
**As** staff with trip access  
**I want** CSV exports for donors and donations  
**So that** I can reconcile offline

**Priority:** P2  
**Independent test:** export endpoints for donors/donations  
**Acceptance scenarios:** see ### US-8.4

---

## Requirements

### Functional Requirements

- **FR-001**: TripDonation MUST include `tripId`, `personId` (participant), `donorId`, `amount`, `dateTime`, `paymentInfo`, `version`.
- **FR-002**: Donor MUST include name/address/phone/email and `status` (`active`|`inactive`|`dontcontact`).
- **FR-003**: Managing donations (create/update/delete) MUST require Org Admin, Trip Leader, or System Admin.
- **FR-004**: Participants/applicants MUST only see their own donation rows on list endpoints.
- **FR-005**: Donor email lookup MUST support prefill in DonationFormDialog.
- **FR-006**: UI: `/donations`, `DonationFormDialog`, `ParticipantDonationsDialog`.
- **FR-007**: Export endpoints MUST require trip access: donors.csv and donations.csv.

---

## Assumptions

- Public unauthenticated donation create is Feature 9 (`POST /trips/public/donations`).
- Trip and participant entities exist from Features 5–7.

## Edge Cases

- List without `tripId` → rejected.
- Amount validation as implemented in controller/UI (`MoneyInput`).

## Success Criteria

- **SC-001**: Leader records a donation with donor lookup by email.
- **SC-002**: Participant sees only their donations in the dialog.
- **SC-003**: Automated tests (backfill).

---

## Data Ownership & Isolation

- Donation writes are staff-gated.
- Participants read only own donations for a trip.

---

## Key Entities

- **Donor**, **TripDonation**

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET/POST` | `/trips/donations` | Yes | List/create (`tripId` required for list) |
| `PUT/DELETE` | `/trips/donations/:id` | Yes | Update/delete |
| `GET` | `/trips/donors/lookup?email=` | Yes | Lookup |
| `GET/POST/PUT` | `/trips/donors` | Yes | Donor maintain |
| `GET` | `/trips/export/trips/:tripId/donors.csv` | Yes | CSV |
| `GET` | `/trips/export/trips/:tripId/donations.csv` | Yes | CSV |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/donations` | `DonationsList.vue` |
| Dialogs | `DonationFormDialog`, `ParticipantDonationsDialog` |

---

## Data Model Requirements

### `donor` — contact fields + status + version
### `tripDonation` — FKs to trip, person (participant), donor + amount/dateTime/paymentInfo/version

---

## Acceptance Criteria (Gherkin)

### US-8.1 — Record donations for a trip

#### Scenario: Trip Leader creates a donation
* **Given** I can manage trip T and participant P is on the trip
* **When** I create a donation with amount and donor info
* **Then** a TripDonation exists for trip T and person P

### US-8.2 — Look up and maintain donors

#### Scenario: Staff looks up donor by email
* **Given** a donor with email D exists
* **When** I call donors lookup with email D
* **Then** the donor record is returned for form prefill

### US-8.3 — Participants view their donations

#### Scenario: Participant lists only own donations
* **Given** donations exist for me and for another participant on trip T
* **When** I list donations as a participant
* **Then** I only receive my rows

### US-8.4 — Export donors and donations CSV

#### Scenario: Staff exports donations CSV
* **Given** I can access trip T
* **When** I download donations.csv
* **Then** the response is CSV content for trip T

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-8.1 | Trip Leader creates a donation | `backend/tests/donations.test.js` | `Trip Leader creates a donation` |
| US-8.2 | Staff looks up donor by email | `backend/tests/donations.test.js` | `Staff looks up donor by email` |
| US-8.3 | Participant lists only own donations | `backend/tests/donations.test.js` | `Participant lists only own donations` |
| US-8.4 | Staff exports donations CSV | `backend/tests/donations.test.js` | `Staff exports donations CSV` |

---

## Agent implementation request

```text
Implement Feature 8 from @features/feature-8-donors-and-donations.md on branch `feature/8-donors-and-donations`.

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

- Public donate pages and anonymous POST — Feature 9
