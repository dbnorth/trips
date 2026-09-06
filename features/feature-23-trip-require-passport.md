# Feature: Trip Require Passport

**Feature ID:** 23
**Branch pattern:** `feature/23-trip-require-passport`
**Status:** Done
**Created:** 2026-09-06
**Input:** Add a **Require Passport** field on trip; when checked, a passport person document (with uploaded file) is required to complete / submit an application as `applied`
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 22 — Document Type Number Required & Instructions](feature-22-document-number-and-instructions.md) (document upload gate for `applied`)

---

## User Stories

### US-23.1: Set Require Passport on a trip
**As an** Org Admin or System Admin  
**I want** a **Require Passport** checkbox on add/edit trip  
**So that** I can mark which trips need a passport for applicants

**Priority:** P1  
**Independent test:** Add/Edit trip UI and trip create/update APIs accept and persist `requirePassport`; default unchecked / `false`; value reloads on edit  
**Acceptance scenarios:** see ### US-23.1

### US-23.2: Passport required to complete application when trip requires it
**As a** trip applicant  
**I want** submission blocked until I have an uploaded passport document when the trip has **Require Passport** checked  
**So that** I cannot reach `applied` without a passport on file for that trip

**Priority:** P1  
**Independent test:** With `requirePassport` true and no valid passport document, apply/update stays `incomplete`; after uploading a passport type document with a file (and valid expiration for the trip), status becomes `applied` (other completeness rules still apply)  
**Acceptance scenarios:** see ### US-23.2

---

## Requirements

### Functional Requirements

- **FR-001**: `trip` MUST support `requirePassport` — `BOOLEAN`, required, default `false`.
- **FR-002**: Trip create/edit UI (`AddTripDialog`, `EditTripDialog`) MUST include a checkbox labeled **Require Passport**. Unchecked = `false`; checked = `true`.
- **FR-003**: Trip create/update APIs MUST accept and return `requirePassport`. Trip payloads used by apply/browse/detail MUST include `requirePassport` so the client can gate and message without a separate fetch when the trip is already loaded.
- **FR-004**: Schema / `ensureSchema` MUST add `requirePassport` for existing databases with default `false`.
- **FR-005**: When `trip.requirePassport === true`, application status MUST remain `incomplete` (and apply/edit UI MUST keep **Submit Application** disabled / not ready-to-submit) until the applicant has at least one `personDocument` whose linked `documentType.type` is `passport`, with a non-empty `documentFileName`, and an expiration date after the trip end date (fall back to trip start date when end is unset) — same date comparison rule as Feature 22 role-required documents.
- **FR-006**: When `trip.requirePassport === false`, this feature MUST NOT add a passport-specific gate. Existing Feature 22 gates (all person documents have files; role-required document type when set) remain in force.
- **FR-007**: Apply/edit application UI MUST show a clear warning when `requirePassport` is true and the applicant does not yet satisfy **FR-005** (e.g. upload a passport with an expiration past the trip end before submitting).
- **FR-008**: Copy trip (`POST /trips/trips/:id/copy`, Feature 21) MUST copy `requirePassport` from the source trip onto the new trip.

---

## Assumptions

- “Passport document” means any person document whose catalog type enum is `passport` (not a single hardcoded `documentTypeId`). Multiple passport catalog rows (e.g. different descriptions) all count.
- File upload is required: a passport row without `documentFileName` does **not** satisfy **FR-005** (aligns with Feature 22).
- Staff may still save incomplete applications; only auto `applied` / Submit is gated.
- Org Admin / System Admin continue to manage trips (unchanged Feature 5 ownership).
- Default for existing trips: passport **not** required.

## Edge Cases

- Trip requires passport; applicant has a medical_licence or certification only → still incomplete.
- Trip requires passport; applicant has passport type but no file → incomplete.
- Trip requires passport; passport file present but expiration on or before trip end (or compare date) → incomplete.
- Trip does not require passport; applicant has no passport → may still become `applied` if other gates pass.
- Admin unchecks **Require Passport** on a trip → existing incomplete applications may become `applied` on next save if otherwise complete.
- No passport document types in the catalog → applicants cannot satisfy the gate until an admin creates one (Feature 4); UI warning still applies.

## Success Criteria

- **SC-001**: Staff can save **Require Passport** on create/edit trip; value persists and reloads.
- **SC-002**: With **Require Passport** checked, applications cannot reach `applied` without a valid uploaded passport document for the trip dates.
- **SC-003**: With **Require Passport** unchecked, no passport-specific block is applied.
- **SC-004**: Copy trip preserves `requirePassport`.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Trip field** | Same write gates as other trip catalog fields (Org Admin for org / System Admin) |
| **Passport documents** | Same person-document access as Feature 4 / 22 |
| **Application status** | Same auto `incomplete`/`applied` rules as Feature 7 / 22, plus this passport gate when enabled |

---

## Key Entities

- **Trip** — gains `requirePassport`
- **PersonDocument** + **DocumentType** — used to prove passport on file (type `passport` + file + expiration)
- **TripPeopleRole** (application) — status resolution consumes the trip flag

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` / `PUT` | `/trips/trips`, `/trips/trips/:id` | as Feature 5 | Accept/return `requirePassport` |
| `GET` | trip get / browse detail payloads | as today | Include `requirePassport` |
| `POST` | `/trips/trips/:id/copy` | as Feature 21 | Copy `requirePassport` onto new trip |
| Apply / update application | as Feature 7 | — | Status resolution MUST apply **FR-005** when trip flag is true |

**Payload notes:** `{ requirePassport?: boolean }` — omit or null treated as `false` on create if not sent; updates SHOULD persist explicit boolean.

**Status codes:** unchanged for trip CRUD; application still saves as `200` with `incomplete` when passport gate fails (do not hard-fail with `400` solely for missing passport — match Feature 7 incomplete pattern).

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `AddTripDialog` | Checkbox **Require Passport** (default unchecked) |
| `EditTripDialog` | Same checkbox; bound to loaded trip value |
| `ApplyTripDialog` / `EditTripApplicationView` | Include passport completeness in ready-to-submit; show warning when trip requires passport and applicant does not satisfy **FR-005** |

---

## Data Model Requirements

### `trip` (delta)

| Field | Type | Rules |
|-------|------|--------|
| requirePassport | BOOLEAN | required, default `false` |

---

## Acceptance Criteria (Gherkin)

### US-23.1 — Set Require Passport on a trip

#### Scenario: Staff saves Require Passport on a trip
* **Given** I am an Org Admin or System Admin on Add/Edit trip
* **When** I check **Require Passport**
* **And** I save the trip
* **Then** reloading the trip shows **Require Passport** checked
* **And** the API returns `requirePassport` true

#### Scenario: Require Passport defaults to unchecked
* **Given** I create a trip without checking **Require Passport**
* **When** the trip is saved
* **Then** `requirePassport` is false

### US-23.2 — Passport required to complete application when trip requires it

#### Scenario: Application stays incomplete until passport is uploaded when required
* **Given** a trip with `requirePassport` true
* **And** my profile and application form are otherwise complete
* **And** I do not have an uploaded passport document with valid expiration for the trip
* **When** I submit/save the application as complete
* **Then** the application status is `incomplete`
* **When** I upload a passport-type person document with a file and expiration after the trip end and save again
* **Then** the application status is `applied`

#### Scenario: Passport is not required when Require Passport is unchecked
* **Given** a trip with `requirePassport` false
* **And** my profile and application form are otherwise complete
* **And** I have no passport document
* **When** I submit/save the application as complete
* **Then** the application status is `applied` (subject to other existing gates)

#### Scenario: Copy trip preserves Require Passport
* **Given** a source trip with `requirePassport` true
* **When** I copy the trip
* **Then** the new trip has `requirePassport` true

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-23.1 | Staff saves Require Passport on a trip | `backend/tests/` trips (or applications) | `Staff saves Require Passport on a trip` |
| US-23.1 | Require Passport defaults to unchecked | `backend/tests/` trips | `Require Passport defaults to unchecked` |
| US-23.2 | Application stays incomplete until passport is uploaded when required | `backend/tests/applications.test.js` | `Application stays incomplete until passport is uploaded when required` |
| US-23.2 | Passport is not required when Require Passport is unchecked | `backend/tests/applications.test.js` | `Passport is not required when Require Passport is unchecked` |
| US-23.2 | Copy trip preserves Require Passport | `backend/tests/` copy trip and/or frontend copy | `Copy trip preserves Require Passport` |

---

## Agent implementation request

```text
Implement Feature 23 from @features/feature-23-trip-require-passport.md on branch `feature/23-trip-require-passport`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md` (`trip.requirePassport`), `api.md` (trip payload / copy), `behavior.md` (passport gate when trip flag set)

---

## Definition of Done

*   [x] Trip `requirePassport` + Add/Edit trip checkbox (**FR-001**–**FR-004**)
*   [x] Application `applied` gated when flag true (**FR-005**–**FR-007**)
*   [x] Copy trip copies the flag (**FR-008**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/23-trip-require-passport`; PR → `dev`

---

## Out of Scope

- Requiring a specific passport `documentTypeId` (any `type === passport` catalog row counts)
- Requiring passport document **number** for `applied` beyond Feature 22 type-level number rules on upload
- Auto-creating a passport document type if none exists
- Changing worker-role license / documentTypeId requirements (Feature 6 / 22)
- Public marketing copy about passport beyond apply/edit warning
