# Feature: Public Fundraising Pages

**Feature ID:** 9
**Branch pattern:** `feature/9-public-fundraising-pages`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — unauthenticated org/trip/participant pages and public donation submission; apply CTA into auth funnel
**Depends on:** [Feature 5](feature-5-trip-catalog-management.md), [Feature 7](feature-7-trip-applications-and-participants.md), [Feature 8](feature-8-donors-and-donations.md)

---

## User Stories

### US-9.1: View public organization and trip pages
**As a** visitor  
**I want to** open org and trip pages by URL slug  
**So that** I can learn about open trips without signing in

**Priority:** P1  
**Independent test:** `/trips/public/orgs/by-name/:orgSlug`, trip by-name endpoints  
**Acceptance scenarios:** see ### US-9.1

### US-9.2: Donate on trip or participant pages
**As a** visitor  
**I want to** submit a donation on a trip or participant fundraising page  
**So that** I can support a participant without an account

**Priority:** P1  
**Independent test:** `POST /trips/public/donations`  
**Acceptance scenarios:** see ### US-9.2

### US-9.3: Start apply from public pages
**As a** visitor  
**I want** an Apply CTA that sends me through apply sign-in/create-account  
**So that** I can continue to authenticated apply (Feature 1 + 7)

**Priority:** P1  
**Independent test:** Public pages route to `/apply/sign-in` with query context  
**Acceptance scenarios:** see ### US-9.3

---

## Requirements

### Functional Requirements

- **FR-001**: Public routes MUST NOT require authentication.
- **FR-002**: Slug matching MUST treat spaces as `_` (`toUrlSlug` / by-name controllers).
- **FR-003**: Public trip pages MUST show active trip info; overview MAY include roles needed / open positions.
- **FR-004**: Public participant pages MUST show approved participant fundraising story fields (whygo, bio, picture, raised totals as returned).
- **FR-005**: `POST /trips/public/donations` MUST create/update donor and create TripDonation without auth.
- **FR-006**: Frontend routes: `/org/:orgSlug`, `/trip/:tripSlug`, `/donate/trip/:tripSlug`, `/donate/trip/:tripSlug/participant/:personSlug`.
- **FR-007**: MenuBar MUST be hidden on these public/donate routes (`App.vue`).

---

## Assumptions

- Only active trips / approved participants are exposed as implemented in public controllers.
- Staff donation UI remains Feature 8.

## Edge Cases

- Unknown slug → not found response / empty UI handling.
- Optional participant on trip-level donate form.

## Success Criteria

- **SC-001**: Visitor opens org page and navigates to trip donate page.
- **SC-002**: Public donation creates donor + donation rows.
- **SC-003**: Automated tests (backfill).

---

## Data Ownership & Isolation

- Public read is intentionally unauthenticated but limited to published/active/approved data as coded.
- Public write is limited to donation create endpoint.

---

## Key Entities

- Reuses **Trip**, **Organization**, **Person**, **Donor**, **TripDonation**, **TripWorkerRole** (overview)

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/public/orgs/by-name/:orgSlug` | No | Org + open trips |
| `GET` | `/trips/public/trips/:tripId` | No | Trip + approved participants |
| `GET` | `/trips/public/trips/by-name/:tripSlug` | No | By slug |
| `GET` | `/trips/public/trips/by-name/:tripSlug/overview` | No | Roles needed |
| `GET` | `/trips/public/trips/.../participants/...` | No | Participant donate data |
| `POST` | `/trips/public/donations` | No | Public donation |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/org/:orgSlug` | `OrganizationTripsPage.vue` |
| `/trip/:tripSlug` | `PublicTripPage.vue` |
| `/donate/trip/:tripSlug` | `DonorTripPage.vue` |
| `/donate/trip/:tripSlug/participant/:personSlug` | `DonorParticipantPage.vue` |

---

## Data Model Requirements

No new tables — uses existing entities; public controllers filter by status/approval.

---

## Acceptance Criteria (Gherkin)

### US-9.1 — View public organization and trip pages

#### Scenario: Visitor opens organization trips page by slug
* **Given** an organization named "Hope Mission"
* **When** I open `/org/Hope_Mission` (slug form)
* **Then** I see the org public page with open active trips

#### Scenario: Visitor opens public trip overview
* **Given** an active trip with a public name slug
* **When** I open the public trip page
* **Then** I see trip details and roles needed / apply and donate actions

### US-9.2 — Donate on trip or participant pages

#### Scenario: Visitor submits a public donation
* **Given** an active trip page
* **When** I submit donor contact fields and an amount via public donate
* **Then** `POST /trips/public/donations` succeeds
* **And** a donor and tripDonation exist

### US-9.3 — Start apply from public pages

#### Scenario: Visitor clicks Apply on public trip page
* **Given** I am not signed in
* **When** I click Apply on the public trip page
* **Then** I am routed to apply sign-in with trip/org context query params

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-9.1 | Visitor opens organization trips page by slug | `backend/tests/public.test.js` | `Visitor opens organization trips page by slug` |
| US-9.1 | Visitor opens public trip overview | `backend/tests/public.test.js` | `Visitor opens public trip overview` |
| US-9.2 | Visitor submits a public donation | `backend/tests/public.test.js` | `Visitor submits a public donation` |
| US-9.3 | Visitor clicks Apply on public trip page | `backend/tests/public.test.js` | `Visitor clicks Apply on public trip page` |

---

## Agent implementation request

```text
Implement Feature 9 from @features/feature-9-public-fundraising-pages.md on branch `feature/9-public-fundraising-pages`.

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

- Authenticated apply completion — Feature 7
- Staff donation admin UI — Feature 8
