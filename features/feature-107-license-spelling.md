# Spell "License" the US Way

**Feature ID:** 107
**Branch pattern:** `feature/107-license-spelling`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "the types for document types is spelled wrong, what is the plan to fix it." (screenshot: "Medical License")

The document type **Type** reads **Medical Licence**, the British spelling; the app is US English (MM/DD/YYYY dates, Feature 101). The spelling is also in the stored Type value (`medical_licence`), the API's Type error message, the startup seed, the dev seed descriptions ("Registered Nurse Licence (RN)", "Licenced Practical Nurse Licence (LPN)"), and every database seeded from them. This feature spells it **License** / **Licensed** everywhere: label, stored value, messages, seeds, and existing document type descriptions.

## Clarifications

### Session 2026-11-03

- Q: How far should the fix go? → A: Everything: the label, the stored value (`medical_licence` → `medical_license`, migrated on startup), the seed data, and a startup update of existing document type descriptions.

**Depends on:**
- [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md) (document type **Type**)
- [Feature 91 — Document Types by Organization](feature-91-org-document-types.md) (startup seed of organization 1's types; document types page)

---

## User Stories

### US-107.1: Document types say "License"

**As** anyone who sees document types (admins, applicants, trip staff)
**I want** "License" spelled the US way
**So that** the app reads correctly

**Acceptance:** see Gherkin scenarios under US-107.1.

### US-107.2: Existing data is fixed on update

**As** an Org Admin with document types already saved
**I want** the stored Type and the "Licence" descriptions fixed when the update goes live
**So that** I don't have to edit each one by hand

**Acceptance:** see Gherkin scenarios under US-107.2.

---

## Requirements

### Functional Requirements

- **FR-001**: The Type **Medical Licence** is renamed **Medical License** wherever Types are listed or shown (document type form, Document types list, and every other place that shows a Type label).
- **FR-002**: The stored Type value `medical_licence` is renamed `medical_license` in the database enum, the model, the API, and the frontend. `POST` / `PUT /trips/document-types` accept `medical_license`; any other value, including `medical_licence`, → `400` "Type must be medical_license, passport, certification, diploma, or doctor_permission."
- **FR-003**: On startup, `ensureSchema` moves existing `medical_licence` rows to `medical_license` (widen the enum to hold both, update the rows, then narrow it to `medical_license`, `passport`, `certification`, `diploma`, `doctor_permission`). It runs once: a database already on `medical_license` is left alone. The older migration from `medical` / `licences` now targets `medical_license`.
- **FR-004**: On startup, `ensureSchema` fixes the spelling in existing document type descriptions: "Licenced" → "Licensed" and "Licence" → "License" (and the lowercase "licenced" / "licence"), only on rows that contain them. Running it again changes nothing. Other text (person documents, specializations, worker roles, email templates) is not changed.
- **FR-005**: New data uses the US spelling: the startup seed for organization 1 creates **Medical License** (`medical_license`), and `backend/app/data/documentTypes.json` uses `medical_license` with descriptions "Medical Doctor License (MD,DO)", "Dental License (DDS)", "Physician's Assistant License (PA)", "Nurse Practitioner License (NP)", "Registered Nurse License (RN)", and "Licensed Practical Nurse License (LPN)". The FR-004 update runs before `npm run seed` matches types by description, so reseeding doesn't add duplicates.

---

## Assumptions

- Only the document type Type and descriptions are in scope. The profile's medical licence question (`licenseStatus`) already spells "license".
- Org Admins who chose "Licence" on purpose in a description can change it back after the update.
- Older feature specs keep their original wording (they are history); the living reference is updated.

## Edge Cases

- A description with both spellings ("Licenced Practical Nurse Licence") → "Licensed Practical Nurse License".
- A description with "LICENCE" in capitals → unchanged (only "Licence" / "licence" and "Licenced" / "licenced" are replaced).
- A brand-new database → the table is created with the new enum; no migration needed.
- An API client still sending `medical_licence` → `400` with the FR-002 message.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: `rg -i "licen[c]e" backend/app frontend/src` finds only the old values the `ensureSchema` migrations replace.

---

## Data Ownership & Isolation

No change. The description update applies to every organization's document types; it changes spelling only.

---

## Key Entities

- **DocumentType** — `type` enum value renamed; `description` spelling fixed on startup.

---

## API Requirements

| Method | Endpoint | Change |
|--------|----------|--------|
| `GET` | `/trips/document-types` | `type` is `medical_license` (was `medical_licence`) |
| `POST` / `PUT` | `/trips/document-types` | Accept `medical_license`; FR-002 `400` message |

Every other response that includes a document type's `type` (person documents, worker role required documents, document review) returns `medical_license`.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `DocumentTypeFormDialog` Type select, `DocumentTypesList` Type column, other Type labels (`documentTypeLabel`) | **Medical License** (FR-001) |

---

## Data Model Requirements

| Table | Change |
|-------|--------|
| `documentTypes.type` | ENUM `medical_licence` → `medical_license` (`ensureSchema` migrates rows — FR-003) |
| `documentTypes.description` | "Licence" / "Licenced" → "License" / "Licensed" on startup (FR-004) |

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Mission Health" has document types "Registered Nurse Licence (RN)" (Type `medical_licence`), "Licenced Practical Nurse Licence (LPN)" (Type `medical_licence`), and "Passport" (Type `passport`).
- Olivia is an Org Admin of Mission Health.

### US-107.1 — Document types say "License"

#### Scenario: The Type list says Medical License
* **Given** Olivia opens **Add document type**
* **Then** the **Type** choices include **Medical License** and not **Medical Licence**
* **And** the Document types list shows Type **Medical License** for a `medical_license` type

#### Scenario: The API takes medical_license and refuses medical_licence
* **When** Olivia creates a document type with Type `medical_license`
* **Then** it is saved with Type `medical_license`
* **When** she creates one with Type `medical_licence`
* **Then** the response is `400` "Type must be medical_license, passport, certification, diploma, or doctor_permission."

### US-107.2 — Existing data is fixed on update

#### Scenario: Startup moves stored medical_licence types to medical_license
* **Given** the database still has the old Type enum and both nursing types stored as `medical_licence`
* **When** the server starts (`ensureSchema` runs)
* **Then** both types have Type `medical_license`, Passport is unchanged, and the enum no longer allows `medical_licence`
* **When** `ensureSchema` runs again
* **Then** nothing changes

#### Scenario: Startup fixes Licence in existing descriptions
* **When** `ensureSchema` runs
* **Then** the descriptions read "Registered Nurse License (RN)" and "Licensed Practical Nurse License (LPN)", and "Passport" is unchanged
* **When** `ensureSchema` runs again
* **Then** the descriptions are unchanged

#### Scenario: Seed data spells License
* **When** the dev seed data (`documentTypes.json`) and the startup seed are read
* **Then** no description or Type uses "Licence" or "Licenced", and medical license types use Type `medical_license`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-107.1 | The Type list says Medical License | `frontend/tests/LicenseSpelling.test.js` | `The Type list says Medical License` |
| US-107.1 | The API takes medical_license and refuses medical_licence | `backend/tests/license-spelling.test.js` | `The API takes medical_license and refuses medical_licence` |
| US-107.2 | Startup moves stored medical_licence types to medical_license | `backend/tests/license-spelling.test.js` | `Startup moves stored medical_licence types to medical_license` |
| US-107.2 | Startup fixes Licence in existing descriptions | `backend/tests/license-spelling.test.js` | `Startup fixes Licence in existing descriptions` |
| US-107.2 | Seed data spells License | `backend/tests/license-spelling.test.js` | `Seed data spells License` |

Existing tests and fixtures that use `medical_licence` or "Licence" (about 15 backend and frontend test files) are updated to the new value and spelling.

---

## Agent implementation request

```text
Implement Feature 107 from @features/feature-107-license-spelling.md on branch `feature/107-license-spelling`.

Backend: documentType.model.js enum, documentType.controller.js DOCUMENT_TYPES + message → medical_license. ensureSchema.js: CREATE TABLE enum; the old medical/licences migration targets medical_license (and its "already done" check must not re-run after the rename); add the medical_licence → medical_license migration (widen, UPDATE, narrow; skip when the column has no 'medical_licence'); add the description spelling fix (Licenced→Licensed first, then Licence→License, lowercase too, WHERE description LIKE '%icence%') before the organization-1 seed; seed "Medical License". documentTypes.json: type and descriptions.
Frontend: utils/documentTypes.js option { title: "Medical License", value: "medical_license" }.
Update existing tests/fixtures; new tests per the Test Coverage Map. Update features/reference/ (data-model, api, behavior).
```

---

## Definition of Done

*   [x] Label per **FR-001**
*   [x] Stored value and API per **FR-002**
*   [x] Startup migrations per **FR-003**–**FR-004**
*   [x] Seed data per **FR-005**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Spelling in other text (person documents, specializations, worker roles, email templates, uploaded file names).
- Other British / US spelling differences.
- Keeping `medical_licence` as an accepted alias in the API.
