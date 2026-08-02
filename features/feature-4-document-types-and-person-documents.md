# Feature: Document Types & Person Documents

**Feature ID:** 4
**Branch pattern:** `feature/4-document-types-and-person-documents`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — document type catalog (passport / medical licence) and person document uploads
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-4.1: Administer document types
**As a** System Admin  
**I want to** define document types  
**So that** worker roles and people can require passport or medical licence documents

**Priority:** P1  
**Independent test:** CRUD `/trips/document-types` as system admin  
**Acceptance scenarios:** see ### US-4.1

### US-4.2: Upload and manage person documents
**As a** person (self) or authorized admin  
**I want to** upload, view, download, and delete my documents  
**So that** trip applications can verify licenses/passports

**Priority:** P1  
**Independent test:** `/trips/people/:id/documents*`  
**Acceptance scenarios:** see ### US-4.2

---

## Requirements

### Functional Requirements

- **FR-001**: DocumentType `type` MUST be `medical_licence` or `passport` with a `description`.
- **FR-002**: Only System Admin MAY create/update/delete document types; any authenticated user MAY list them.
- **FR-003**: PersonDocument MUST store `personId`, `documentTypeId`, `countryIssued`, `issueDate`, `expirationDate`, `documentFileName`.
- **FR-004**: Upload/view/download/delete MUST be authorized like person profile access (self / org admin / system admin).
- **FR-005**: UI MUST expose documents on Edit Person (`PersonDocumentsCard`) and Document Types list at `/document-types`.
- **FR-006**: HEIC images MAY be converted client-side via `heic2any` before upload.

---

## Assumptions

- Worker roles linking `documentTypeId` are Feature 6.
- Apply-time document checks are Feature 7.

## Edge Cases

- Missing file on upload → `400`.
- Delete removes DB row and file when present.

## Success Criteria

- **SC-001**: Admin can create a passport document type.
- **SC-002**: User can upload a document to their person and download it.
- **SC-003**: Scenarios have automated tests (backfill).

---

## Data Ownership & Isolation

- Documents are owned by the Person; access follows person authorization rules.

---

## Key Entities

- **DocumentType**: catalog entry
- **PersonDocument**: uploaded file metadata for a person

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET/POST` | `/trips/document-types` | Yes / system admin write | Catalog |
| `GET/PUT/DELETE` | `/trips/document-types/:id` | System admin write | Manage |
| `GET/POST` | `/trips/people/:id/documents` | Yes | List/upload |
| `PUT/DELETE` | `/trips/people/:id/documents/:documentId` | Yes | Update/delete |
| `GET` | `.../view` and `.../download` | Yes | File access |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/document-types` | `DocumentTypesList.vue` (system admin gated) |
| Edit Person | `PersonDocumentsCard.vue` |

---

## Data Model Requirements

### `documentType` — `description`, `type` enum
### `personDocument` — FKs to person + documentType, dates, `documentFileName`

---

## Acceptance Criteria (Gherkin)

### US-4.1 — Administer document types

#### Scenario: System Admin creates a document type
* **Given** I am a system admin
* **When** I create a document type with type `passport`
* **Then** it appears in `GET /trips/document-types`

#### Scenario: Non-admin cannot delete a document type
* **Given** I am not a system admin
* **When** I DELETE a document type
* **Then** the API denies the request

### US-4.2 — Upload and manage person documents

#### Scenario: User uploads a person document
* **Given** I can edit person P
* **When** I upload a file with a document type and metadata
* **Then** a PersonDocument exists
* **And** I can download the file

#### Scenario: Unauthorized user cannot view another person's document
* **Given** I cannot access person P
* **When** I request P's document view URL
* **Then** the API denies the request

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-4.1 | System Admin creates a document type | `backend/tests/documents.test.js` | `System Admin creates a document type` |
| US-4.1 | Non-admin cannot delete a document type | `backend/tests/documents.test.js` | `Non-admin cannot delete a document type` |
| US-4.2 | User uploads a person document | `backend/tests/documents.test.js` | `User uploads a person document` |
| US-4.2 | Unauthorized user cannot view another person's document | `backend/tests/documents.test.js` | `Unauthorized user cannot view another person's document` |

---

## Agent implementation request

```text
Implement Feature 4 from @features/feature-4-document-types-and-person-documents.md on branch `feature/4-document-types-and-person-documents`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR when this feature changes them.
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

- Worker role license requirements — Feature 6
- Application gating on documents — Feature 7
