# Feature: Document Type Has Expiration Date

**Feature ID:** 57
**Branch pattern:** `feature/57-document-type-expiration-date`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Add a checkbox to document types that says whether the document has an expiration date. If it does not, don't ask for the expiration date on the document entry screens, and don't check it in the profile / application document checks.
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 22 — Document Type Number Required & Instructions](feature-22-document-number-and-instructions.md), [Feature 23 — Trip Require Passport](feature-23-trip-require-passport.md), [Feature 25 — Worker Role Required Documents](feature-25-worker-role-required-documents.md), [Feature 35 — Person Document Dialog](feature-35-person-document-dialog.md)

---

## User Stories

### US-57.1: Mark whether a document type has an expiration date
**As a** System Admin
**I want** a **Has Expiration Date** checkbox on a document type
**So that** documents that never expire (for example a diploma) are not given a made-up expiration date

**Priority:** P1
**Independent test:** Document type create/edit shows **Has Expiration Date** (checked on create); saving it unchecked persists and reloads.
**Acceptance scenarios:** see ### US-57.1

### US-57.2: Enter a document without an expiration date
**As a** person (or staff) entering a document
**I want** the Expiration date field left out when the document type has no expiration date
**So that** I am not forced to enter a date that does not exist

**Priority:** P1
**Independent test:** Choosing a type without an expiration date hides **Expiration date**; the document saves with no expiration date. A type with one still requires it.
**Acceptance scenarios:** see ### US-57.2

### US-57.3: Application document checks skip expiration for those types
**As an** applicant
**I want** a required document of a type without an expiration date to count once its file is uploaded
**So that** I can submit my application without an expiration date the document does not have

**Priority:** P1
**Independent test:** A worker role requires a type without an expiration date; the applicant uploads that document with no expiration date → the application can reach `applied`.
**Acceptance scenarios:** see ### US-57.3

---

## Requirements

### Functional Requirements

- **FR-001**: `documentType` MUST store `hasExpirationDate` (`BOOLEAN`, required, default `true`). Existing document types MUST be `true`, so today's behavior is unchanged until an admin unchecks it.
- **FR-002**: System Admin document-type create/edit (`DocumentTypeFormDialog`) MUST show a checkbox labeled **Has Expiration Date**, checked by default on create.
- **FR-003**: Document-type create, update, get, and list MUST accept and return `hasExpirationDate`.
- **FR-004**: `personDocument.expirationDate` MUST allow null.
- **FR-005**: Person-document create/update (`POST` / `PUT /trips/people/:id/documents…`):
  - when the document's type has `hasExpirationDate` true, an expiration date is required as today ("Expiration date is required.");
  - when it is false, an expiration date MUST NOT be required, and the document MUST be saved with `expirationDate` null (any value sent is ignored).
- **FR-006**: On the person-document Add/Edit dialog (`PersonDocumentsCard`), the **Expiration date** field MUST be shown only when the selected type has `hasExpirationDate` true. Changing the selected type MUST show or hide it immediately, and a hidden field is neither validated nor sent.
- **FR-007**: The person document list MUST show "—" in **Expiration date** when the document has no expiration date.
- **FR-008**: Application document checks (Features 23 and 25: the worker-role required documents and Require Passport checks, on the backend status/missing-items checks and the Apply / Edit application screens) MUST treat a document whose type has `hasExpirationDate` false as valid once it has an uploaded file, without comparing an expiration date to the trip. Types with `hasExpirationDate` true keep today's rule (file plus expiration after the trip end).
- **FR-009**: The Apply / Edit application messages for missing documents MUST include "with an expiration date past the end of the trip" only when at least one listed document type has an expiration date:
  - Role documents: "Upload the following required documents before submitting your application: <names>." when none of the listed types have one.
  - Passport: "Upload a passport before submitting your application." when no passport-type document type has one.
- **FR-010**: Profile completeness and "Upload a file for every profile document" (Feature 22) are unchanged.
- **FR-011**: `ensureSchema` MUST add `documentTypes.hasExpirationDate` (default `1`) and make `personDocuments.expirationDate` nullable. Existing person documents keep their expiration dates.

---

## Assumptions

- Only System Admin manages the checkbox (Feature 4), the same as the other document-type flags.
- New document types start checked, matching today's behavior; the admin unchecks it for documents that never expire.
- The rule follows each document's own type (a passport-type document type MAY be unchecked; Require Passport then only needs the uploaded file).
- Issue date is not changed by this feature.

## Edge Cases

- Admin unchecks **Has Expiration Date** on a type that already has documents → their stored expiration dates are kept but hidden and ignored; the next save of such a document stores null.
- Admin checks it again → documents that still have a stored date show it again; documents with no date are treated as missing an expiration (application check fails for that document until a date is entered, and editing requires one).
- Room list PDF (Feature 54) shows a blank passport expiration when the passport document has none; picking the passport "with the latest expiration" treats no date as the oldest.
- Missing-document message listing one type with an expiration and one without → the message keeps the expiration wording.

## Success Criteria

- **SC-001**: An admin can mark a document type as having no expiration date, and that type's documents are entered and accepted for applications without one.
- **SC-002**: Document types left checked behave exactly as before.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `hasExpirationDate` is catalog data on the document type, with the same System Admin write gate as other document-type fields.
- Person-document authorization is unchanged.

---

## Key Entities

- **DocumentType** — gains `hasExpirationDate`
- **PersonDocument** — `expirationDate` becomes nullable

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` / `PUT` | `/trips/document-types`, `/trips/document-types/:id` | System Admin | Accept `hasExpirationDate` (**FR-003**) |
| `GET` | `/trips/document-types`, `/trips/document-types/:id` | auth | Return `hasExpirationDate` |
| `POST` / `PUT` | `/trips/people/:id/documents`, `.../documents/:documentId` | as today | Expiration date required only when the type has one; otherwise stored null (**FR-005**) |
| `GET` | `/trips/people/:id/documents` | as today | `expirationDate` may be null; each document's `documentType` includes `hasExpirationDate` |

**Status codes:** `400` "Expiration date is required." only for types with `hasExpirationDate` true. Others unchanged.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `DocumentTypeFormDialog` | Checkbox **Has Expiration Date**, checked by default on create |
| `PersonDocumentsCard` Add/Edit dialog | **Expiration date** shown and required only when the selected type has an expiration date (**FR-006**) |
| `PersonDocumentsCard` list | "—" for a document with no expiration date (**FR-007**) |
| `ApplyTripDialog` / `EditTripApplicationView` | Missing-document checks and messages per **FR-008**, **FR-009** |

---

## Data Model Requirements

### `documentType` (extend)

| Column | Type | Notes |
|--------|------|-------|
| hasExpirationDate | BOOLEAN | required, default `true` |

### `personDocument` (change)

| Column | Type | Notes |
|--------|------|-------|
| expirationDate | DATEONLY | now nullable; null when the type has no expiration date |

---

## Acceptance Criteria (Gherkin)

### US-57.1 — Mark whether a document type has an expiration date

#### Scenario: Document type form shows Has Expiration Date
* **Given** I am creating a document type
* **Then** I see a checkbox labeled **Has Expiration Date**
* **And** it is checked by default

#### Scenario: Has Expiration Date is saved on the document type
* **Given** I am a System Admin
* **When** I save document type **Diploma** with **Has Expiration Date** unchecked
* **Then** loading **Diploma** shows `hasExpirationDate` false
* **And** an existing document type that was not changed shows `hasExpirationDate` true

### US-57.2 — Enter a document without an expiration date

#### Scenario: Expiration date is hidden for a type without one
* **Given** **Diploma** has no expiration date and **Passport** has one
* **When** I select **Diploma** in the Add Document dialog
* **Then** the **Expiration date** field is not shown
* **When** I select **Passport**
* **Then** the **Expiration date** field is shown

#### Scenario: Document without an expiration date saves with none
* **Given** **Diploma** has no expiration date
* **When** I save a **Diploma** document without an expiration date (or with one sent)
* **Then** the document is saved
* **And** its `expirationDate` is null

#### Scenario: Expiration date is still required for a type that has one
* **Given** **Passport** has an expiration date
* **When** I save a **Passport** document without an expiration date
* **Then** the response is `400` with "Expiration date is required."

### US-57.3 — Application document checks skip expiration for those types

#### Scenario: Required role document without an expiration date counts once uploaded
* **Given** worker role **Nurse** requires **Diploma**, which has no expiration date
* **And** I have uploaded a **Diploma** document file with no expiration date
* **When** I submit a complete application for **Nurse**
* **Then** my application status is `applied`

#### Scenario: Passport type without an expiration date satisfies Require Passport
* **Given** the trip requires a passport and the passport document type has no expiration date
* **And** I have uploaded a passport document file with no expiration date
* **When** I submit a complete application
* **Then** my application status is `applied`

#### Scenario: Missing-document message leaves out expiration wording
* **Given** my role requires **Diploma** (no expiration date) and I have not uploaded it
* **When** I open the Apply dialog
* **Then** the message reads "Upload the following required documents before submitting your application: Diploma."

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-57.1 | Document type form shows Has Expiration Date | `frontend/tests/DocumentTypeFormDialog.test.js` | `Document type form shows Has Expiration Date` |
| US-57.1 | Has Expiration Date is saved on the document type | `backend/tests/document-type-expiration.test.js` | `Has Expiration Date is saved on the document type` |
| US-57.2 | Expiration date is hidden for a type without one | `frontend/tests/PersonDocumentsCard.test.js` | `Expiration date is hidden for a type without one` |
| US-57.2 | Document without an expiration date saves with none | `backend/tests/document-type-expiration.test.js` | `Document without an expiration date saves with none` |
| US-57.2 | Expiration date is still required for a type that has one | `backend/tests/document-type-expiration.test.js` | `Expiration date is still required for a type that has one` |
| US-57.3 | Required role document without an expiration date counts once uploaded | `backend/tests/document-type-expiration.test.js` | `Required role document without an expiration date counts once uploaded` |
| US-57.3 | Passport type without an expiration date satisfies Require Passport | `backend/tests/document-type-expiration.test.js` | `Passport type without an expiration date satisfies Require Passport` |
| US-57.3 | Missing-document message leaves out expiration wording | `frontend/tests/ApplyTripDialog.test.js` | `Missing-document message leaves out expiration wording` |

---

## Agent implementation request

```text
Implement Feature 57 from @features/feature-57-document-type-expiration-date.md on branch `feature/57-document-type-expiration-date`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend and frontend before finishing.
Update @features/reference/api.md, @features/reference/behavior.md, and @features/reference/data-model.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`documentType.hasExpirationDate`, nullable `personDocument.expirationDate`), `features/reference/api.md` (document types, person documents), `features/reference/behavior.md` (document entry and application document checks)

---

## Definition of Done

*   [x] `hasExpirationDate` on document type, nullable `personDocument.expirationDate`, schema ensure (**FR-001**, **FR-004**, **FR-011**)
*   [x] Document type UI and API save the checkbox (**FR-002**, **FR-003**)
*   [x] Person-document API and dialog only ask for / require expiration when the type has one; list shows "—" (**FR-005**–**FR-007**)
*   [x] Application document checks and messages skip expiration for those types (**FR-008**, **FR-009**); profile checks unchanged (**FR-010**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/57-document-type-expiration-date`; PR → `dev`

---

## Out of Scope

- Changing issue date rules
- Reminders or emails about expiring documents
- Bulk clearing stored expiration dates when a type is unchecked
- Per-worker-role or per-trip overrides of the expiration rule
