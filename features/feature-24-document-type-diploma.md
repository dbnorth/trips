# Feature: Document Type Diploma

**Feature ID:** 24
**Branch pattern:** `feature/24-document-type-diploma`
**Status:** Done
**Created:** 2026-09-06
**Input:** Add **diploma** as an allowed document type (alongside medical licence, passport, and certification)
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 22 — Document Type Number Required & Instructions](feature-22-document-number-and-instructions.md) (`certification` enum + UI pattern)

---

## User Stories

### US-24.1: Create and use Diploma document types
**As a** System Admin  
**I want** to create document types with type **Diploma**  
**So that** people can upload diploma documents and worker roles can require them

**Priority:** P1  
**Independent test:** Admin UI type dropdown includes **Diploma**; create/update API accepts `type: "diploma"`; list/get returns it; schema enum includes `diploma`; optional default catalog seed when none exists  
**Acceptance scenarios:** see ### US-24.1

---

## Requirements

### Functional Requirements

- **FR-001**: DocumentType `type` MUST allow `diploma` in addition to `medical_licence`, `passport`, and `certification`.
- **FR-002**: System Admin document-type create/edit UI (`DocumentTypeFormDialog` / shared type options) MUST include **Diploma** in the type dropdown.
- **FR-003**: Document-type create/update APIs MUST accept `type: "diploma"` and reject unknown types with the same `400` pattern as today (error message MUST list allowed values including `diploma`).
- **FR-004**: Schema / `ensureSchema` MUST expand the `documentTypes.type` ENUM to include `diploma` for existing databases.
- **FR-005**: `ensureSchema` MAY seed a default catalog row with description **Diploma** and type `diploma` when no row with type `diploma` exists (same pattern as Passport / Certification seeds).

---

## Assumptions

- Enum value is snake-ish lowercase `diploma` (not `Diploma`); UI label is **Diploma**.
- Existing Feature 22 fields (`documentNumberRequired`, `instructions`) and person-document upload rules apply unchanged to diploma types.
- Diploma documents are **not** treated as passports for Feature 23 trip `requirePassport` (only `type === "passport"` satisfies that gate).
- Only System Admin continues to manage document types (Feature 4).

## Edge Cases

- Creating a second diploma catalog row with a different description is allowed (unique constraint, if any, follows existing document-type rules).
- Databases already containing only the prior enum values MUST migrate without data loss.

## Success Criteria

- **SC-001**: System Admin can create a document type with type `diploma`.
- **SC-002**: Admin type dropdown shows **Diploma**.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Document types** | System Admin write; any authenticated user may read (unchanged from Feature 4) |
| **Person documents** | Unchanged; may reference diploma document types |

---

## Key Entities

- **DocumentType** — `type` enum gains `diploma`

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` / `PUT` | `/trips/document-types`… | sysadmin write | Accept `type: "diploma"` |
| `GET` | `/trips/document-types` | auth | Return types including `diploma` |

**Status codes:** `400` when `type` is not one of `medical_licence`, `passport`, `certification`, `diploma`.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `DocumentTypeFormDialog` (type dropdown) | Include **Diploma** (`value: diploma`) |
| Shared `documentTypes` options util (if used) | Same option added |

---

## Data Model Requirements

### `documentType` (delta)

| Field | Type | Rules |
|-------|------|--------|
| type | ENUM | Must include `diploma` (with existing `medical_licence`, `passport`, `certification`) |

---

## Acceptance Criteria (Gherkin)

### US-24.1 — Create and use Diploma document types

#### Scenario: System Admin can create a Diploma document type
* **Given** I am a System Admin
* **When** I create a document type with type `diploma` and a description
* **Then** it is stored and appears in the document type catalog
* **And** its `type` is `diploma`

#### Scenario: Admin type dropdown includes Diploma
* **Given** I am a System Admin on Add/Edit document type
* **When** I open the type dropdown
* **Then** I see **Diploma** as an option

#### Scenario: API rejects unknown document type values
* **Given** I am a System Admin
* **When** I create a document type with an unknown `type`
* **Then** the API responds `400`
* **And** the message lists the allowed types including `diploma`

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-24.1 | System Admin can create a Diploma document type | `backend/tests/documents.test.js` | `System Admin can create a Diploma document type` |
| US-24.1 | Admin type dropdown includes Diploma | `frontend/tests/` DocumentTypeFormDialog or documentTypes util | `Admin type dropdown includes Diploma` |
| US-24.1 | API rejects unknown document type values | `backend/tests/documents.test.js` | `API rejects unknown document type values` |

---

## Agent implementation request

```text
Implement Feature 24 from @features/feature-24-document-type-diploma.md on branch `feature/24-document-type-diploma`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md` (`documentType.type` enum), `api.md` (allowed type list if documented), `behavior.md` (diploma catalog type)

---

## Definition of Done

*   [x] Enum + API + admin UI **Diploma** option (**FR-001**–**FR-003**)
*   [x] `ensureSchema` enum expand + optional seed (**FR-004**–**FR-005**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/24-document-type-diploma`; PR → `dev`

---

## Out of Scope

- Trip-level “require diploma” flag (separate from Feature 23 passport)
- Changing passport / certification / medical licence behavior
- Auto-requiring diploma for any worker role or application completeness rule
- Per-organization document type catalogs
