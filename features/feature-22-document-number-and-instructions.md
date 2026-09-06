# Feature: Document Type Number Required & Instructions

**Feature ID:** 22
**Branch pattern:** `feature/22-document-number-and-instructions`
**Status:** Done
**Created:** 2026-09-06
**Input:** Add document-type fields for whether a document number is required (hide the document number field when not checked) and free-text instructions; show instructions when a user is adding a person document
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md)

---

## User Stories

### US-22.1: Configure number required and instructions on a document type
**As a** System Admin  
**I want** to set whether a document number is required and enter instructions for a document type  
**So that** upload forms match what that document type needs

**Priority:** P1  
**Independent test:** Document type create/edit UI and API accept `documentNumberRequired` and `instructions`; values persist and reload  
**Acceptance scenarios:** see ### US-22.1

### US-22.2: Show or hide document number and show instructions when adding a document
**As a** person (or staff) adding a person document  
**I want** to see the type’s instructions and only see **Document number** when that type requires it  
**So that** I know how to prepare the upload and am not asked for a number when it is not needed

**Priority:** P1  
**Independent test:** On person document add form, selecting a type with instructions shows them; selecting a type with `documentNumberRequired` true shows required **Document number**; false hides the field  
**Acceptance scenarios:** see ### US-22.2

### US-22.3: Require uploaded documents before application submission
**As a** trip applicant  
**I want** submission blocked until all of my documents have files (and any role-required type is uploaded with valid expiration)  
**So that** I cannot mark an application applied with missing document uploads

**Priority:** P1  
**Independent test:** Apply/update with a stub document (no file) stays `incomplete`; after uploading files (and role-required doc when set) becomes `applied`  
**Acceptance scenarios:** see ### US-22.3

---

## Requirements

### Functional Requirements

- **FR-001**: `documentType` MUST support:
  - `documentNumberRequired` — `BOOLEAN`, required, default `false`
  - `instructions` — `TEXT`, nullable (empty / whitespace stored as `null`)
- **FR-002**: System Admin document-type create/edit UI (`DocumentTypeFormDialog`) MUST include:
  - A checkbox (or equivalent) labeled so the admin clearly opts in that a **document number is required** (e.g. **Document number required**)
  - A **Instructions** multiline text area
- **FR-003**: Document-type create/update APIs MUST accept and return `documentNumberRequired` and `instructions`. List/get payloads used by upload UIs MUST include these fields so the client can drive visibility without a second fetch when types are already loaded.
- **FR-004**: `personDocument` MUST support optional `documentNumber` (`STRING`, nullable). Empty / whitespace-only input MUST be stored as `null`.
- **FR-005**: When the selected document type has `documentNumberRequired === true`, the person-document add (and edit, if edit exists) form MUST show a **Document number** field and MUST require a non-blank value before save. The API MUST reject create/update with `400` when the type requires a number and none is provided.
- **FR-006**: When the selected document type has `documentNumberRequired === false` (or type unset), the form MUST **not display** the **Document number** field. On save, `documentNumber` MUST be stored as `null` (do not keep a stale number from a previous type selection in the same form session).
- **FR-007**: When the selected document type has non-empty `instructions`, the person-document add/edit form MUST display those instructions to the user (read-only; preserve line breaks). When instructions are null/empty, show no instructions block.
- **FR-008**: Changing the selected document type on the add form MUST update instructions visibility/text and document-number field visibility immediately (re-evaluate FR-005–FR-007 for the newly selected type).
- **FR-009**: Schema / `ensureSchema` MUST add the new columns for existing databases with safe defaults (`documentNumberRequired` = `false`; `instructions` / `documentNumber` null).
- **FR-010**: Person document list/detail displays MAY show `documentNumber` when present; not required to add a new list column beyond including it where document metadata is already shown (optional enhancement — prefer showing it on the document row or view when set).
- **FR-011**: DocumentType `type` MUST allow `certification` in addition to `medical_licence` and `passport`. Admin UI type dropdown MUST include **Certification**. Schema / `ensureSchema` MUST expand the enum and MAY seed a default **Certification** catalog row when none exists for that type.
- **FR-012**: Trip application status MUST remain `incomplete` (Submit Application disabled on apply/edit UI) until:
  - every `personDocument` for the applicant has a non-empty `documentFileName` (file uploaded), and
  - when the selected worker role has a `documentTypeId`, the applicant has a person document of that type with a file and an expiration date after the trip end date (fall back to trip start date when end is unset).
  Saving an incomplete application remains allowed.

---

## Assumptions

- Document number applies to **person documents** only (not donor or other uploads).
- Default for existing document types: number **not** required; no instructions.
- Checkbox unchecked = hide field (FR-006); there is no “optional document number” mode in this feature — either required+shown or hidden.
- Instructions are plain text (no Markdown rendering required).
- Only System Admin continues to manage document types (Feature 4).

## Edge Cases

- Admin clears instructions → store `null`; upload form shows no instructions block.
- User switches from a number-required type to a non-required type mid-form → hide field and clear in-memory document number before submit.
- Type requires number but client omits it → `400` with a clear message (e.g. document number is required).
- Very long instructions → allowed up to TEXT capacity; UI textarea should scroll.
- Existing person documents without `documentNumber` remain valid for types that do not require a number.

## Success Criteria

- **SC-001**: System Admin can save `documentNumberRequired` and `instructions` on a document type.
- **SC-002**: Add-document UI shows instructions when set; shows **Document number** only when required and enforces it.
- **SC-003**: Non-required types never show the document number field; saved `documentNumber` is null.
- **SC-004**: System Admin can create a document type with type `certification`.
- **SC-005**: Automated tests for the scenarios below pass.
- **SC-006**: Applications cannot reach `applied` while any person document lacks a file, or while a role-required document type is missing/invalid for the trip.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Document types** | System Admin write; any authenticated user may read (unchanged from Feature 4) |
| **Person documents** | Same access as Feature 4 (self / org admin / system admin) |
| **New fields** | Follow the same gates as the parent entity |

---

## Key Entities

- **DocumentType** — gains `documentNumberRequired`, `instructions`
- **PersonDocument** — gains optional `documentNumber`

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET/POST` | `/trips/document-types` | auth / sysadmin write | Accept/return `documentNumberRequired`, `instructions` |
| `GET/PUT` | `/trips/document-types/:id` | sysadmin write on mutate | Same fields |
| `POST/PUT` | `/trips/people/:id/documents…` | as today | Accept/return `documentNumber`; validate when type requires it |

**Payload notes:**

- Document type: `{ documentNumberRequired?: boolean, instructions?: string | null }`
- Person document: `{ documentNumber?: string | null }` (multipart field or JSON field consistent with existing upload pattern)

**Status codes:** `400` when document number required but missing/blank.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `DocumentTypeFormDialog` | Checkbox **Document number required**; textarea **Instructions** |
| `PersonDocumentsCard` (add document form) | Show instructions text when present for selected type; show **Document number** only if selected type has `documentNumberRequired` |
| Document types list (optional) | MAY show a column or indicator for number-required — not required for acceptance |

---

## Data Model Requirements

### `documentType` (delta)

| Field | Type | Rules |
|-------|------|--------|
| documentNumberRequired | BOOLEAN | required, default `false` |
| instructions | TEXT | nullable |

### `personDocument` (delta)

| Field | Type | Rules |
|-------|------|--------|
| documentNumber | STRING(100) | nullable; required by validation only when type.`documentNumberRequired` |

---

## Acceptance Criteria (Gherkin)

### US-22.1 — Configure number required and instructions on a document type

#### Scenario: System Admin saves document number required and instructions
* **Given** I am a System Admin on Add/Edit document type
* **When** I check **Document number required**
* **And** I enter instructions text
* **And** I save the document type
* **Then** reloading the document type shows **Document number required** checked
* **And** the instructions text is preserved

#### Scenario: System Admin can create a Certification document type
* **Given** I am a System Admin
* **When** I create a document type with type `certification` and a description
* **Then** it is stored and appears in the document type catalog

### US-22.2 — Show or hide document number and show instructions when adding a document

#### Scenario: Instructions display when adding a document
* **Given** a document type has non-empty instructions
* **When** I select that type on the add person-document form
* **Then** I see those instructions on the form

#### Scenario: Document number field shows only when required
* **Given** document type A has `documentNumberRequired` true
* **And** document type B has `documentNumberRequired` false
* **When** I select type A on the add person-document form
* **Then** I see **Document number** and cannot save without it
* **When** I select type B
* **Then** **Document number** is not displayed
* **And** saving without a document number succeeds (other required fields present)

#### Scenario: API rejects missing document number when required
* **Given** a document type with `documentNumberRequired` true
* **When** I upload a person document for that type without a document number
* **Then** the API responds `400`
* **And** no document row is created

### US-22.3 — Documents required before application submission

#### Scenario: Application stays incomplete until all documents are uploaded
* **Given** my profile and application form are otherwise complete
* **And** I have a person document without an uploaded file
* **When** I submit/save the application as complete
* **Then** the application status is `incomplete`
* **When** I upload a file for that document and save again
* **Then** the application status is `applied`

#### Scenario: Application stays incomplete until role-required document is uploaded
* **Given** the selected worker role requires a document type
* **And** my profile and application form are otherwise complete
* **And** I do not have that document type with a file and valid expiration for the trip
* **When** I submit/save the application as complete
* **Then** the application status is `incomplete`
* **When** I add that document with a file and valid expiration and save again
* **Then** the application status is `applied`

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-22.1 | System Admin saves document number required and instructions | `backend/tests/documents.test.js` and/or frontend DocumentTypeFormDialog | `System Admin saves document number required and instructions` |
| US-22.1 | System Admin can create a Certification document type | `backend/tests/documents.test.js` | `System Admin can create a Certification document type` |
| US-22.1 | Document number required defaults to unchecked | `backend/tests/documents.test.js` | `Document number required defaults to unchecked` |
| US-22.2 | Instructions display when adding a document | `frontend/tests/` PersonDocumentsCard | `Instructions display when adding a document` |
| US-22.2 | Document number field shows only when required | `frontend/tests/` PersonDocumentsCard | `Document number field shows only when required` |
| US-22.2 | API rejects missing document number when required | `backend/tests/documents.test.js` | `API rejects missing document number when required` |
| US-22.3 | Application stays incomplete until all documents are uploaded | `backend/tests/applications.test.js` | `Application stays incomplete until all documents are uploaded` |
| US-22.3 | Application stays incomplete until role-required document is uploaded | `backend/tests/applications.test.js` | `Application stays incomplete until role-required document is uploaded` |

---

## Agent implementation request

```text
Implement Feature 22 from @features/feature-22-document-number-and-instructions.md on branch `feature/22-document-number-and-instructions`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md` (new columns), `api.md` (payload notes), `behavior.md` (show/hide number + show instructions)

---

## Definition of Done

*   [x] Document type fields + admin UI (**FR-001**–**FR-003**, **FR-009**)
*   [x] `certification` document type enum + UI option (**FR-011**)
*   [x] Person document `documentNumber` + conditional UI/API validation (**FR-004**–**FR-008**)
*   [x] Instructions shown on add-document form (**FR-007**)
*   [x] Application submission gated on uploaded documents (**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/22-document-number-and-instructions`; PR → `dev`

---

## Out of Scope

- Optional (shown but not required) document number — only required+shown or hidden
- Rich-text / Markdown rendering of instructions
- Per-organization document type overrides
- Requiring a document number itself for `applied` status (file upload / role-required type only; number still only when the type requires it on upload)
