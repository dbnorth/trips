# Feature: Document Specializations

**Feature ID:** 34
**Branch pattern:** `feature/34-document-specializations`
**Status:** Ready
**Created:** 2026-10-14
**Input:** Add an Allow Specialization checkbox on document types. When it is checked, entering a person document of that type allows multiple specializations, each with a name, a date, and its own uploaded file.
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 12 — Encrypt Person Media](feature-12-encrypt-person-media.md), [Feature 22 — Document Type Number Required & Instructions](feature-22-document-number-and-instructions.md)

---

## User Stories

### US-34.1: Allow specializations on a document type

**As a** System Admin
**I want** an Allow Specialization checkbox on a document type
**So that** only the document types that need specializations ask for them

**Priority:** P1
**Independent test:** Document type create/edit shows **Allow Specialization**; saving it checked persists and reloads
**Acceptance scenarios:** see ### US-34.1

### US-34.2: Add specializations while entering a document

**As a** person (or staff) entering a document
**I want** to add more than one specialization, each with a name, date, and file, when that document type allows it
**So that** one document can record several specializations

**Priority:** P1
**Independent test:** Choosing a type with Allow Specialization checked shows an add-specialization control; saving two rows stores name, date, and a file for each; a type with the box unchecked does not show the section
**Acceptance scenarios:** see ### US-34.2

---

## Requirements

### Functional Requirements

- **FR-001**: `documentType` MUST store `allowSpecialization` (`BOOLEAN`, required, default `false`). Existing document types stay unchecked.
- **FR-002**: System Admin document-type create/edit (`DocumentTypeFormDialog`) MUST show a checkbox labeled **Allow Specialization**. It is unchecked until the admin checks it.
- **FR-003**: Document-type create, update, get, and list MUST accept and return `allowSpecialization`.
- **FR-004**: A person document MAY have zero or more **specializations**. Each specialization MUST store:
  - **Name** — required text; blank or whitespace is invalid
  - **Date** — required date (not the person document’s issue date or expiration date)
  - Its own uploaded file
- **FR-005**: On the person-document add/edit form (`PersonDocumentsCard`), when the selected document type has `allowSpecialization` true, the form MUST show a **Specializations** section with **Add specialization**. Each row has **Name**, **Date**, and a file upload, plus a way to remove that row. The user MUST be able to add more than one row. Changing the selected type MUST show or hide this section immediately.
- **FR-006**: When the selected document type has `allowSpecialization` false, or no type is selected, the form MUST NOT show the Specializations section.
- **FR-007**: Saving a person document whose type allows specializations MUST persist every submitted row’s name, date, and file, and MUST return those rows on later loads of that document. A row missing a name, a date, or a file MUST be rejected with `400`. Zero rows is valid. On edit, the submitted list replaces the stored list for that document: a row left off the form is deleted and its file is removed. An existing row that is kept MAY keep its current file when no new file is uploaded for it.
- **FR-008**: When the document type does not allow specializations, person-document save MUST reject a specialization payload with `400` and MUST NOT delete specialization rows already stored for that document.
- **FR-009**: The document list on the person MUST show each specialization’s name and date, and MUST allow view and download of that specialization’s file. Access matches person-document view/download.
- **FR-010**: Specialization files MUST follow the same on-disk encryption rules as person document files (Feature 12). The database stores the relative path only.
- **FR-011**: `ensureSchema` MUST add `allowSpecialization` (default false) and the specialization table. Existing person documents gain no specialization rows.
- **FR-012**: Application completeness MUST NOT change. A specialization file does not replace the person document’s own file or expiration rules (Features 22, 23, and 25).

---

## Assumptions

- Only System Admin manages the checkbox (Feature 4).
- Specializations belong to one person document, not to the document type catalog. The catalog only decides whether the form offers them.
- One specialization is allowed. “Multiple” means more than one MAY be added; two are not required.
- Duplicate specialization names on the same document are allowed.
- The person document’s own fields (type, number, country, issue date, expiration, and its own file) stay as they are today.

## Edge Cases

- Unchecked Allow Specialization → form hides Specializations; API rejects a specialization payload.
- Admin later unchecks Allow Specialization → already stored specialization rows remain and are not deleted by a normal document save. They show again if the box is checked again.
- Admin checks the box → existing documents of that type may then add specializations.
- Remove a row and save → that specialization and its file are deleted.
- Empty name, missing date, or missing file on a new row → `400`.
- Zero specializations on a type that allows them → the person document still saves.

## Success Criteria

- **SC-001**: Document type create/edit can save **Allow Specialization**, and it reloads.
- **SC-002**: The person-document form shows specializations only when the selected type allows them, and more than one can be added.
- **SC-003**: Each saved specialization has a name, a date, and its own file, and those values reload with view/download.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `allowSpecialization` is catalog data on the document type. Same write gate as other document-type fields (System Admin).
- Specializations belong to the person document. Read, write, view, and download follow the same person-document authorization as today.

---

## Key Entities

- **DocumentType** — gains `allowSpecialization`
- **PersonDocumentSpecialization** — child of a person document: name, date, file

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` / `PUT` | `/trips/document-types` and `/trips/document-types/:id` | System Admin | Accept `allowSpecialization` |
| `GET` | `/trips/document-types` | auth | Return `allowSpecialization` |
| `POST` / `PUT` | `/trips/people/:id/documents` and `.../documents/:documentId` | as today | Accept specializations when the type allows them |
| `GET` | `/trips/people/:id/documents` | as today | Include each specialization’s id, name, date, and file name |
| `GET` | specialization view / download | as person-document file access | Return that specialization’s file |

**Payload notes:** Each specialization is `{ id?, name, date, file? }`. `name` is trimmed and required. `date` is a calendar date. A new row requires a file. On update, an existing `id` may omit a new file and keep the stored file. Rows omitted from an update are deleted when the type allows specializations.

**Status codes:** `400` when a submitted row lacks name, date, or file, or when specializations are sent for a type that does not allow them. Other document-type and person-document status codes stay as they are.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `DocumentTypeFormDialog` | Checkbox **Allow Specialization** |
| `PersonDocumentsCard` add/edit | When the selected type allows it: **Specializations**, **Add specialization**, and one **Name**, **Date**, and file upload per row, with remove. Otherwise hide the section |
| Person document list | Show each specialization’s name and date, with view and download |

**UX notes:** The checkbox is off by default. Specialization date is separate from the document issue date and expiration date.

---

## Data Model Requirements

### `documentType` (extend)

| Column | Type | Notes |
|--------|------|-------|
| allowSpecialization | BOOLEAN | required, default `false` |

### `personDocumentSpecialization` (new)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoIncrement |
| personDocumentId | INTEGER | required FK → personDocument; delete specializations when the person document is deleted |
| name | STRING | required |
| specializationDate | DATEONLY | required; label **Date** |
| documentFileName | STRING(500) | required relative path; file encrypted like person documents |

---

## Acceptance Criteria (Gherkin)

### US-34.1 — Allow specializations on a document type

#### Scenario: Document type form shows Allow Specialization
* **Given** I am creating or editing a document type
* **Then** I see a checkbox labeled Allow Specialization
* **And** it is unchecked by default on create

#### Scenario: Allow Specialization is saved on the document type
* **Given** I am a system admin
* **When** I save a document type with Allow Specialization checked
* **Then** loading that document type shows allowSpecialization true

### US-34.2 — Add specializations while entering a document

#### Scenario: Specializations appear only when the document type allows them
* **Given** one document type has Allow Specialization checked and another does not
* **When** I select the type that allows specializations on the person-document form
* **Then** I see Specializations and Add specialization
* **When** I select the type that does not allow specializations
* **Then** the Specializations section is not shown

#### Scenario: Two specializations are saved on the document
* **Given** I am entering a document whose type allows specializations
* **When** I add a specialization named Cardiology with a date and a file
* **And** I add a specialization named Pediatrics with a date and a file
* **And** I save the document
* **Then** reloading the document returns both specializations with those names, dates, and files

#### Scenario: A specialization without a file is rejected
* **Given** the document type allows specializations
* **When** I save a specialization that has a name and a date but no file
* **Then** the save fails with a validation error

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-34.1 | Document type form shows Allow Specialization | `frontend/tests/` DocumentTypeFormDialog | `Document type form shows Allow Specialization` |
| US-34.1 | Allow Specialization is saved on the document type | `backend/tests/` document types | `Allow Specialization is saved on the document type` |
| US-34.2 | Specializations appear only when the document type allows them | `frontend/tests/` PersonDocumentsCard | `Specializations appear only when the document type allows them` |
| US-34.2 | Two specializations are saved on the document | `backend/tests/` person documents | `Two specializations are saved on the document` |
| US-34.2 | A specialization without a file is rejected | `backend/tests/` person documents | `A specialization without a file is rejected` |

---

## Agent implementation request

```text
Implement Feature 34 from @features/feature-34-document-specializations.md on branch `feature/34-document-specializations`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md` (document types and person documents), `features/reference/behavior.md` (when the specialization section is shown)

---

## Definition of Done

*   [x] `allowSpecialization` on document type + schema ensure (**FR-001**, **FR-011**)
*   [x] Document type UI and API save the checkbox (**FR-002**, **FR-003**)
*   [x] Person-document form adds multiple name / date / file rows only when allowed (**FR-004**–**FR-008**)
*   [x] List, view, and download show each specialization file, encrypted like other person documents (**FR-009**, **FR-010**)
*   [x] Application completeness is unchanged (**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/34-document-specializations`; PR → `dev`

---

## Out of Scope

- A fixed catalog of specialization names
- Requiring a minimum number of specializations
- Using a specialization file as the person document’s own file
- Changing application submit rules (Features 22, 23, 25)
- Specializations on worker-role required documents beyond what is stored on the person document
