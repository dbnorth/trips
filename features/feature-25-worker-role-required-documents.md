# Feature: Worker Role Required Documents

**Feature ID:** 25
**Branch pattern:** `feature/25-worker-role-required-documents`
**Status:** Done
**Created:** 2026-09-06
**Input:** Allow each worker role to specify the document types required for that role; a trip application cannot be submitted as `applied` until those documents are on the participant’s profile, uploaded (file present), and expire after the trip end date
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 6 — Worker Roles & Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 22 — Document Type Number Required & Instructions](feature-22-document-number-and-instructions.md) (upload + expiration gate pattern)

---

## User Stories

### US-25.1: Configure required documents on a worker role
**As an** Org Admin  
**I want** to select one or more document types required for a worker role  
**So that** applicants for that role know which credentials they must have on file

**Priority:** P1  
**Independent test:** Worker role create/edit UI and API accept a list of required document type ids; values persist and reload; empty list allowed  
**Acceptance scenarios:** see ### US-25.1

### US-25.2: Require role documents before application submission
**As a** trip applicant  
**I want** submission blocked until every document type required by my selected role is on my profile with an uploaded file and an expiration after the trip ends  
**So that** I cannot reach `applied` without the role’s required documents

**Priority:** P1  
**Independent test:** With a role that requires two document types, apply stays `incomplete` until both are uploaded with valid expiration; then becomes `applied` (other completeness rules still apply)  
**Acceptance scenarios:** see ### US-25.2

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST support **multiple** required document types per `workerRole` (zero or more). Prefer a join entity (e.g. `workerRoleDocumentType` / `workerRoleRequiredDocument`) with `(workerRoleId, documentTypeId)` unique, both FKs required.
- **FR-002**: Worker role create/edit UI (`WorkerRoleFormDialog`) MUST let the admin select **zero or more** document types as **Required documents** (multi-select or equivalent). This MUST **not** be gated only behind **License required** — document requirements are independent of the license Yes/No question.
- **FR-003**: Worker-role create/update APIs MUST accept and return the required document types (e.g. `requiredDocumentTypeIds: number[]` and/or nested `requiredDocumentTypes: [{ id, description, type }]`). Invalid / unknown ids → `400`.
- **FR-004**: Schema / `ensureSchema` MUST create the join table (if new) and MUST **migrate** any existing `workerRole.documentTypeId` into a join row for that role, then leave `workerRole.documentTypeId` unused for new writes (MAY keep the column nullable for backward compatibility during transition; new creates/updates MUST persist requirements only via the join / `requiredDocumentTypeIds`).
- **FR-005**: `licenseRequired` behavior (license status question on the application) MUST remain as today and MUST **not** require a document type id to be set. Clearing license required MUST **not** clear the role’s required-document list.
- **FR-006**: When the applicant’s selected `tripWorkerRole` → `workerRole` has one or more required document types, application status MUST remain `incomplete` (and apply/edit UI MUST keep **Submit Application** / ready-to-submit false) until **each** required `documentTypeId` has at least one matching `personDocument` for that person with:
  - non-empty `documentFileName` (file uploaded), and
  - `expirationDate` strictly after the trip end date (fall back to trip start date when end is unset) — same date comparison as Feature 22 / 23.
- **FR-007**: When the role has **no** required document types, this feature MUST NOT add a role-document gate (Feature 22 “all person docs have files”, Feature 23 trip passport, and other gates still apply).
- **FR-008**: Apply/edit application UI MUST show a clear warning listing missing/invalid required document types for the selected role (name/description from the catalog) until **FR-006** is satisfied.
- **FR-009**: Browse/apply payloads that expose the selected / available worker roles MUST include the required document types (ids + enough label fields for UI warnings) so the client can gate without a second fetch when roles are already loaded.
- **FR-010**: Replaces / supersedes the Feature 6 / 22 single-`documentTypeId` application gate: status resolution MUST use the **full required list** from **FR-001**, not only `workerRole.documentTypeId`.

---

## Assumptions

- “Documents required for that role” means **catalog document types** linked to the org’s worker role (Feature 4 / 22 / 24 types), not free-text document names.
- Matching is by **document type id** (exact catalog row), not by enum `type` alone (unlike Feature 23 passport, which matches any `type === passport`).
- Multiple person documents of the same type: one valid row (file + expiration) is enough for that required type.
- Incomplete application saves remain allowed; only auto `applied` / Submit is gated.
- Org Admin continues to manage worker roles for their org (Feature 6).

## Edge Cases

- Role requires docs A and B; applicant has only A → incomplete.
- Applicant has required type with file but expiration on or before trip compare date → incomplete for that type.
- Applicant has required type as a stub (no file) → incomplete.
- Admin removes a required type from the role → existing incomplete applications may become `applied` on next save if otherwise complete.
- Admin adds a new required type → previously `applied` applications are **not** auto-demoted until next auto-status save (manual statuses unchanged per Feature 7).
- Duplicate selection of the same document type in the UI → store once (unique constraint).
- Deleted document type still referenced → follow existing FK / delete constraints (prefer block delete if in use, consistent with Feature 4 patterns).

## Success Criteria

- **SC-001**: Org Admin can save multiple required document types on a worker role; they reload on edit.
- **SC-002**: Applications for that role cannot reach `applied` until every required type is uploaded with valid expiration for the trip.
- **SC-003**: Roles with an empty required list are not blocked by this feature’s document gate.
- **SC-004**: Existing single `documentTypeId` values are migrated into the new required list.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Worker role required docs** | Same write gates as worker role (Org Admin for org / System Admin) |
| **Person documents** | Unchanged Feature 4 / 22 access |
| **Application status** | Same auto `incomplete`/`applied` pattern as Feature 7 / 22 / 23, plus this multi-doc gate |

---

## Key Entities

- **WorkerRole** — gains many required **DocumentType**s (via join); single `documentTypeId` deprecated for writes
- **WorkerRoleDocumentType** (name MAY vary) — join: `workerRoleId`, `documentTypeId`
- **PersonDocument** — used to prove each required type on the applicant
- **TripPeopleRole** (application) — status resolution consumes the selected role’s required list + trip dates

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` / `PUT` | `/trips/worker-roles`… | org admin / sysadmin | Accept/return `requiredDocumentTypeIds` (and/or nested required types) |
| `GET` | `/trips/worker-roles`, `/trips/worker-roles/:id` | as today | Include required document types |
| Trip browse / apply role payloads | as Feature 7 | — | Include required document types on nested `workerRole` |
| Apply / update application | as Feature 7 | — | Status resolution MUST enforce **FR-006** |

**Payload notes:** `{ requiredDocumentTypeIds?: number[] }` — omit or `[]` means no role-document requirements. On update, the sent list replaces the previous set (full replace semantics).

**Status codes:** `400` for invalid document type ids; application still saves as `200` with `incomplete` when the document gate fails (Feature 7 incomplete pattern).

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `WorkerRoleFormDialog` | Multi-select **Required documents** (independent of **License required**); stop requiring a single document dropdown only when license is checked |
| Worker roles list (optional) | MAY show required-document count or names — not required for acceptance |
| `ApplyTripDialog` / `EditTripApplicationView` | Gate ready-to-submit on all role-required docs; warning lists missing/invalid types |

---

## Data Model Requirements

### `workerRoleDocumentType` (new; name MAY vary)

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement (optional if composite PK preferred) |
| workerRoleId | INTEGER | required FK → workerRole, CASCADE delete with role |
| documentTypeId | INTEGER | required FK → documentType |
| | | UNIQUE (`workerRoleId`, `documentTypeId`) |

### `workerRole` (delta)

| Field | Type | Rules |
|-------|------|--------|
| documentTypeId | INTEGER | nullable; migrate into join then stop writing on create/update (Feature 25) |

---

## Acceptance Criteria (Gherkin)

### US-25.1 — Configure required documents on a worker role

#### Scenario: Org Admin saves multiple required documents on a worker role
* **Given** I am an Org Admin editing a worker role
* **And** document types A and B exist
* **When** I select A and B as required documents
* **And** I save the role
* **Then** reloading the role returns both A and B as required
* **And** license required may remain unchecked

#### Scenario: Required documents can be cleared
* **Given** a worker role with required document types
* **When** I clear the required documents list and save
* **Then** the role has no required document types

#### Scenario: Existing documentTypeId is migrated into required documents
* **Given** a legacy worker role with `documentTypeId` set
* **When** schema migration / ensureSchema runs
* **Then** that document type appears in the role’s required list

### US-25.2 — Require role documents before application submission

#### Scenario: Application stays incomplete until all role-required documents are uploaded
* **Given** a trip worker role whose worker role requires document types A and B
* **And** my profile and application form are otherwise complete
* **And** I have only A uploaded with valid expiration for the trip (or neither)
* **When** I submit/save the application as complete
* **Then** the application status is `incomplete`
* **When** I upload A and B with files and expiration after the trip end and save again
* **Then** the application status is `applied`

#### Scenario: Role with no required documents does not block on this gate
* **Given** a worker role with no required document types
* **And** my profile and application form are otherwise complete
* **When** I submit/save the application as complete
* **Then** the application status is `applied` (subject to other existing gates)

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-25.1 | Org Admin saves multiple required documents on a worker role | `backend/tests/worker-roles.test.js` | `Org Admin saves multiple required documents on a worker role` |
| US-25.1 | Required documents can be cleared | `backend/tests/worker-roles.test.js` | `Required documents can be cleared` |
| US-25.1 | Existing documentTypeId is migrated into required documents | `backend/tests/worker-roles.test.js` or schema test | `Existing documentTypeId is migrated into required documents` |
| US-25.2 | Application stays incomplete until all role-required documents are uploaded | `backend/tests/applications.test.js` | `Application stays incomplete until all role-required documents are uploaded` |
| US-25.2 | Role with no required documents does not block on this gate | `backend/tests/applications.test.js` | `Role with no required documents does not block on this gate` |

---

## Agent implementation request

```text
Implement Feature 25 from @features/feature-25-worker-role-required-documents.md on branch `feature/25-worker-role-required-documents`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md` (join table; workerRole note), `api.md` (worker-role payload), `behavior.md` (multi required docs + application gate)

---

## Definition of Done

*   [x] Join table + migration from `documentTypeId` (**FR-001**, **FR-004**)
*   [x] Worker role API + UI multi-select independent of license (**FR-002**, **FR-003**, **FR-005**)
*   [x] Application `applied` gated on all required docs with file + expiration (**FR-006**–**FR-010**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/25-worker-role-required-documents`; PR → `dev`

---

## Out of Scope

- Trip-level document requirements beyond Feature 23 **Require Passport** (trip flag stays separate; additive with role requirements)
- Requiring documents by enum `type` only (e.g. “any diploma”) without selecting a catalog row
- Changing the license status question fields or values
- Auto-creating person document stubs when a role is selected
- Staff roster add-participant bypass rules beyond existing Feature 7 behavior
