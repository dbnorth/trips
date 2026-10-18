# Feature: Document Type Specialization List

**Feature ID:** 59
**Branch pattern:** `feature/59-document-type-specialization-list`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Allow document types to have a specific list of specializations (a specialization has a name) when the Allow Specialization checkbox is set. Allow a worker role, which already selects multiple required documents, to also select one or more specializations as required for a document. Update the profile page so a participant can add multiple specialization documents from this list for each document.
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 25 — Worker Role Required Documents](feature-25-worker-role-required-documents.md), [Feature 34 — Document Specializations](feature-34-document-specializations.md), [Feature 35 — Person Document Dialog](feature-35-person-document-dialog.md), [Feature 47 — Simplify Application Warnings](feature-47-simplify-application-warnings.md), [Feature 57 — Document Type Has Expiration Date](feature-57-document-type-expiration-date.md), [Feature 58 — Participant Documents PDF](feature-58-participant-documents-pdf.md)

---

## User Stories

### US-59.1: Keep a list of specializations on a document type
**As a** System Admin
**I want** to list the specializations a document type allows (for example Board certification → Pediatrics, Emergency, Family Medicine)
**So that** everyone picks from the same names instead of typing their own

**Priority:** P1
**Independent test:** With **Allow Specialization** checked, the document type form lets me add and remove specialization names; saving and reopening shows the same list.
**Acceptance scenarios:** see ### US-59.1

### US-59.2: Require specializations on a worker role
**As an** Org Admin
**I want** to mark one or more specializations of a required document as required for a worker role
**So that** only applicants with those specializations can submit for that role

**Priority:** P1
**Independent test:** On the worker role form, after choosing **Board certification** as a required document, I can choose **Pediatrics** as a required specialization; saving and reopening shows it.
**Acceptance scenarios:** see ### US-59.2

### US-59.3: Add specializations from the list on my profile
**As a** participant
**I want** to add specializations to a document by choosing them from the document type's list, each with its date and file
**So that** my profile shows the specializations a trip role needs

**Priority:** P1
**Independent test:** On the profile Add/Edit Document dialog, a specialization row offers only the names on that document type's list; I can add more than one, each once.
**Acceptance scenarios:** see ### US-59.3

### US-59.4: Application checks require the role's specializations
**As an** applicant
**I want** to be told which required specializations I am missing
**So that** I can add them and submit my application

**Priority:** P1
**Independent test:** A role requires Board certification with Pediatrics; an applicant with Board certification but no Pediatrics stays `incomplete` and sees the missing specialization named; after adding Pediatrics the application can reach `applied`.
**Acceptance scenarios:** see ### US-59.4

### US-59.5: Worker roles no longer have License required
**As an** Org Admin
**I want** worker roles to describe their requirements only through required documents and specializations
**So that** the separate **License required** flag no longer confuses admins or applicants

**Priority:** P2
**Independent test:** The worker role form and the Worker Roles list show no **License required**; the worker roles list shows each role's required documents with their required specializations.
**Acceptance scenarios:** see ### US-59.5

---

## Requirements

### Functional Requirements

**Document type list**

- **FR-001**: A document type MUST be able to store a list of **specializations**, each with a **name** (required, trimmed, up to 100 characters). Names MUST be unique within a document type, ignoring case.
- **FR-002**: When **Allow Specialization** is checked on the document type form (`DocumentTypeFormDialog`), the form MUST show a **Specializations** list where the admin can add a name and remove a name. The list is hidden when the box is unchecked.
- **FR-003**: Saving a document type with **Allow Specialization** checked MUST require at least one specialization ("Add at least one specialization."). Unchecking the box keeps the stored list; it shows again when the box is checked again.
- **FR-004**: Document type create, update, get, and list MUST accept and return `specializations` (`[{ id, name }]`, ordered by name). On update, the submitted list replaces the stored one: an entry sent with its `id` keeps it (and may be renamed), an entry without an `id` is added, and an entry left out is removed.
- **FR-005**: A specialization that is used by any person document or required by any worker role MUST NOT be removed: `400` "<name> is in use and cannot be removed." Nothing in the save is applied.

**Worker role requirements**

- **FR-006**: A worker role MUST be able to store **required specializations**. Each one MUST belong to a document type that is in the role's required documents (Feature 25); otherwise `400` "Required specializations must belong to a required document."
- **FR-007**: On the worker role form (`WorkerRoleFormDialog`), for each selected required document whose type allows specializations, the form MUST show a multi-select **Required specializations for <document type>** offering that type's list. Selecting none is valid.
- **FR-008**: Removing a document from the role's required documents MUST also remove that document's required specializations from the role.
- **FR-009**: Worker role get and list MUST return `requiredSpecializations` (`[{ id, name, documentTypeId }]`) and `requiredSpecializationIds`. Create and update MUST accept `requiredSpecializationIds: number[]`; on update the list replaces the stored one when sent.

**Person document specializations**

- **FR-010**: A person document specialization MUST be chosen from its document type's list instead of typed. Each still has a **date** and its own **file** (Feature 34). The name shown everywhere (document list, view/download, Feature 58 Documents PDF) is the list entry's name.
- **FR-011**: On the person-document Add/Edit dialog (`PersonDocumentsCard`, used on the profile page), each specialization row MUST have a **Specialization** select offering the selected document type's list, plus **Date**, file, and remove. More than one row MAY be added. A name already chosen on another row of the same document MUST NOT be offered again. **Add specialization** is disabled once every name on the list is used.
- **FR-012**: Person-document create/update MUST accept specializations as `{ id?, documentTypeSpecializationId, date, replaceFile }` and return each with `documentTypeSpecializationId` and `name`. The API MUST reject with `400`:
  - a specialization not on the document type's list: "Specialization is not in the list for this document type."
  - the same specialization twice on one document: "Each specialization can be added only once per document."
  - Feature 34's existing rules still apply (date and file required; replace-list behavior on update; payload rejected when the type does not allow specializations).

**Application checks**

- **FR-013**: A worker role's required document (Feature 25) counts as satisfied only when the applicant has a document of that type that meets today's rule (file, plus expiration after the trip end when the type has an expiration date — Feature 57) **and** has every specialization the role requires for that type. This applies to the backend status and missing-items checks and to the Apply / Edit application screens, the same places as Feature 25.
- **FR-014**: Required specializations of a document type whose **Allow Specialization** is unchecked are ignored by the application checks.
- **FR-015**: Missing-document messages MUST name the missing specializations after the document type, in parentheses:
  - Apply / Edit application warning, e.g. "Upload the following required documents with an expiration date past the end of the trip (2027-01-09) before submitting your application: Board certification (Pediatrics, Emergency)." The expiration wording follows Feature 57.
  - Missing-items reason, e.g. "Required role document(s): Board certification (Pediatrics, Emergency)".
  - A document that is missing entirely lists the type and all of its required specializations; a document that is present but missing some lists only the missing ones.

**Schema**

- **FR-016**: `ensureSchema` MUST create the document type specialization and worker role required specialization tables and link person document specializations to a list entry. When it links them, it MUST delete every existing person document specialization and its file once (today's free-text specializations are not kept). Person documents themselves are unchanged.

**Worker role License required (removed)**

- **FR-017**: The worker role **License required** flag (`workerRole.licenseRequired`) MUST be removed everywhere: the worker role form switch, the Worker Roles list column, the trip team roles card column, the " — License required" suffix on Apply / Edit role choices, and the "license required" hint on Add Trip / Edit Trip role choices and rows. Worker role APIs MUST NOT accept or return it, and `ensureSchema` MUST drop the column. The application's own license status answer (`tripPeopleRole.licenseStatus`) is unchanged and no longer depends on the role.
- **FR-018**: The Worker Roles list (`WorkerRolesList`) MUST show a **Required documents** column instead of the legacy **Document type** column: each required document type's description, followed by its active required specializations (**FR-014**) in parentheses, comma-separated; "—" when there are none.

---

## Assumptions

- Only System Admin edits a document type's list (same gate as other document-type fields, Feature 4). Org Admins pick required specializations on their worker roles (same gate as required documents, Feature 25).
- Required specializations are set on the organization's worker role and apply to every trip that uses that role.
- Renaming a list entry renames it everywhere it is used.
- A required specialization is satisfied by a specialization row with its date and file; specializations have no expiration of their own.
- When a person has more than one document of a required type, one of them must meet the document rule and have all the required specializations.
- Trip pages, the Trip Status board, and the Room list / Flights PDFs show nothing new.

## Edge Cases

- Admin unchecks **Allow Specialization** on Board certification → the list is kept and hidden; person specialization rows stay (Feature 34); worker roles keep their required specializations, but the application checks ignore them (**FR-014**).
- Admin tries to remove **Pediatrics** while a person document or a worker role uses it → `400` "Pediatrics is in use and cannot be removed."
- Admin adds "pediatrics" when "Pediatrics" exists → `400` (names unique ignoring case).
- Worker role requires Board certification with Pediatrics; the admin removes Board certification from the required documents → Pediatrics is removed from the role's required specializations.
- Applicant has Board certification with Emergency only; the role requires Pediatrics and Emergency → message lists "Board certification (Pediatrics)".
- Applicant has no Board certification; the role requires it with Pediatrics → message lists "Board certification (Pediatrics)".
- A type's list has two names and both are used on a document → **Add specialization** is disabled.
- After the schema update, people who had free-text specializations see none and add them again from the list.

## Success Criteria

- **SC-001**: Specialization names come from one list per document type.
- **SC-002**: A worker role can require specializations, and applicants cannot submit for that role without them.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- The document type list is catalog data with the System Admin write gate (Feature 4).
- Worker role required specializations follow the worker role's organization and write gate (Feature 25).
- Person document specializations keep the person-document authorization (Feature 34).

---

## Key Entities

- **DocumentTypeSpecialization** — new: a name on a document type's list
- **WorkerRoleSpecialization** — new: a specialization required by a worker role
- **PersonDocumentSpecialization** — now points to a list entry instead of storing a name

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/document-types`, `/trips/document-types/:id` | auth | Each type includes `specializations: [{ id, name }]` (**FR-004**) |
| `POST` / `PUT` | `/trips/document-types`, `/trips/document-types/:id` | System Admin | Accept `specializations: [{ id?, name }]`; `400` for blank/duplicate names, none while Allow Specialization is checked, or removing one in use (**FR-001**, **FR-003**–**FR-005**) |
| `GET` | `/trips/worker-roles`, `/trips/worker-roles/:id` | auth | Include `requiredSpecializations` and `requiredSpecializationIds` (**FR-009**) |
| `POST` / `PUT` | `/trips/worker-roles`, `/trips/worker-roles/:id` | Org Admin | Accept `requiredSpecializationIds: number[]`; `400` when one does not belong to a required document (**FR-006**, **FR-008**). `licenseRequired` is no longer accepted or returned by any worker role payload (**FR-017**) |
| `GET` | `/trips/people/:id/documents` | as today | Each specialization includes `documentTypeSpecializationId` and `name` |
| `POST` / `PUT` | `/trips/people/:id/documents`, `.../documents/:documentId` | as today | `specializations` entries use `documentTypeSpecializationId` instead of `name`; `400` per **FR-012** |
| `GET` | `/trips/trips/browse/:id`, `/trips/trips/browse/:id/application` | as today | Each role's `workerRole` includes `requiredSpecializations` so the Apply / Edit screens can check and name them (**FR-013**, **FR-015**) |

---

## Screen Requirements

| UI | Change |
|----|--------|
| `DocumentTypeFormDialog` | **Specializations** list (add / remove names) shown when **Allow Specialization** is checked (**FR-002**, **FR-003**) |
| `WorkerRoleFormDialog` | **Required specializations for <document type>** multi-select under **Required documents**, one per selected required document whose type allows specializations (**FR-007**) |
| `PersonDocumentsCard` Add/Edit dialog (profile) | Specialization row **Name** text field becomes a **Specialization** select from the type's list; used names not offered again; **Add specialization** disabled when all are used (**FR-011**) |
| `ApplyTripDialog` / `EditTripApplicationView` | Missing-document warning names missing specializations (**FR-015**); role choices drop " — License required" (**FR-017**) |
| `WorkerRoleFormDialog` / `WorkerRolesList` / `TripWorkerRolesCard` / `AddTripDialog` / `EditTripDialog` | **License required** switch, columns, and hints removed (**FR-017**) |
| `WorkerRolesList` | **Required documents** column replaces **Document type** (**FR-018**) |

---

## Data Model Requirements

### `documentTypeSpecialization` (new)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoIncrement |
| documentTypeId | INTEGER | required FK → documentType; CASCADE on delete |
| name | STRING(100) | required; unique per document type ignoring case |

### `workerRoleSpecialization` (new)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | autoIncrement |
| workerRoleId | INTEGER | required FK → workerRole; CASCADE on delete |
| documentTypeSpecializationId | INTEGER | required FK → documentTypeSpecialization |
| unique | `(workerRoleId, documentTypeSpecializationId)` | |

### `personDocumentSpecialization` (change)

| Column | Type | Notes |
|--------|------|-------|
| documentTypeSpecializationId | INTEGER | new; required FK → documentTypeSpecialization |
| name | — | removed; the name comes from the list entry |
| unique | `(personDocumentId, documentTypeSpecializationId)` | new |

### `workerRole` (change)

| Column | Type | Notes |
|--------|------|-------|
| licenseRequired | — | removed (**FR-017**) |

---

## Acceptance Criteria (Gherkin)

### US-59.1 — Keep a list of specializations on a document type

#### Scenario: Document type form edits the specialization list
* **Given** I am editing document type **Board certification** with **Allow Specialization** checked
* **When** I add "Pediatrics" and "Emergency" and save
* **Then** the saved document type is sent with specializations "Pediatrics" and "Emergency"
* **When** I uncheck **Allow Specialization**
* **Then** the Specializations list is hidden

#### Scenario: Specialization list is saved on the document type
* **Given** I am a System Admin
* **When** I save **Board certification** with Allow Specialization and specializations "Pediatrics" and "Emergency"
* **Then** loading it returns specializations "Emergency" and "Pediatrics" (ordered by name)
* **When** I save it again with "Emergency" renamed to "Emergency Medicine" and "Pediatrics" left out
* **Then** loading it returns only "Emergency Medicine" with the same id as before

#### Scenario: Allow Specialization needs at least one specialization
* **When** I save a document type with Allow Specialization checked and no specializations
* **Then** the response is `400` with "Add at least one specialization."

#### Scenario: A specialization in use cannot be removed
* **Given** Ana's Board certification document has specialization **Pediatrics**
* **When** I save Board certification without Pediatrics
* **Then** the response is `400` with "Pediatrics is in use and cannot be removed."
* **And** Pediatrics is still on the list

### US-59.2 — Require specializations on a worker role

#### Scenario: Worker role saves required specializations
* **Given** worker role **Pediatric Nurse** requires document **Board certification**
* **When** I save it with required specialization **Pediatrics**
* **Then** loading the role returns `requiredSpecializationIds` with Pediatrics
* **When** I save the role without Board certification in its required documents
* **Then** loading the role returns no required specializations

#### Scenario: Required specialization must belong to a required document
* **Given** worker role **Pediatric Nurse** does not require Board certification
* **When** I save it with required specialization **Pediatrics** (a Board certification specialization)
* **Then** the response is `400` with "Required specializations must belong to a required document."

#### Scenario: Worker role form offers specializations for required documents
* **Given** Board certification allows specializations Pediatrics and Emergency
* **When** I select Board certification under **Required documents** on the worker role form
* **Then** I see **Required specializations for Board certification** offering Pediatrics and Emergency
* **When** I choose Pediatrics and save
* **Then** the role is saved with `requiredSpecializationIds` containing Pediatrics

### US-59.3 — Add specializations from the list on my profile

#### Scenario: Specialization is chosen from the document type's list
* **Given** Board certification allows Pediatrics and Emergency
* **When** I add a Board certification document and click **Add specialization**
* **Then** the row's **Specialization** select offers Pediatrics and Emergency
* **When** I choose Pediatrics and add a second row
* **Then** the second row offers only Emergency
* **And** **Add specialization** is disabled

#### Scenario: Person document saves specializations from the list
* **Given** Board certification allows Pediatrics
* **When** I save a Board certification document with specialization Pediatrics, a date, and a file
* **Then** the document is returned with a specialization named "Pediatrics" and its `documentTypeSpecializationId`

#### Scenario: Specialization not in the type's list is rejected
* **Given** Diploma allows specialization Nursing and Board certification allows Pediatrics
* **When** I save a Board certification document with the Nursing specialization
* **Then** the response is `400` with "Specialization is not in the list for this document type."

#### Scenario: The same specialization cannot be added twice
* **When** I save a Board certification document with Pediatrics on two rows
* **Then** the response is `400` with "Each specialization can be added only once per document."

### US-59.4 — Application checks require the role's specializations

#### Scenario: Application stays incomplete until the required specialization is added
* **Given** worker role **Pediatric Nurse** requires Board certification with Pediatrics
* **And** I have an uploaded Board certification document with no specializations
* **When** I submit a complete application for Pediatric Nurse
* **Then** my application status is `incomplete`
* **When** I add Pediatrics to my Board certification and update the application
* **Then** my application status is `applied`

#### Scenario: Missing specializations are named in the missing items
* **Given** worker role **Pediatric Nurse** requires Board certification with Pediatrics and Emergency
* **And** my Board certification has Emergency only
* **When** staff load the trip status
* **Then** my missing items include "Required role document(s): Board certification (Pediatrics)"

#### Scenario: Apply dialog names the missing specialization
* **Given** my role requires Board certification with Pediatrics, and my Board certification has no specializations
* **When** I open the Apply dialog and choose that role
* **Then** the warning lists "Board certification (Pediatrics)"

### US-59.5 — Worker roles no longer have License required

#### Scenario: License required is removed from worker roles
* **Given** the `workerRoles` table still has a `licenseRequired` column
* **When** the schema is ensured and I create a worker role sending `licenseRequired: true`
* **Then** the column is gone and the saved role has no `licenseRequired`

#### Scenario: Worker role form has no License required control
* **Given** I open the worker role form
* **When** I save a role named Cook
* **Then** the form shows no **License required** and the request has no `licenseRequired`

#### Scenario: Required documents column lists required document types with their required specializations
* **Given** worker role **Doctor** requires Board certification with Emergency and Pediatrics, and Passport
* **When** I open the Worker Roles list
* **Then** the **Required documents** column shows "Board certification (Emergency, Pediatrics), Passport" and there is no **License required** column

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-59.1 | Document type form edits the specialization list | `frontend/tests/DocumentTypeFormDialog.test.js` | `Document type form edits the specialization list` |
| US-59.1 | Specialization list is saved on the document type | `backend/tests/document-type-specialization-list.test.js` | `Specialization list is saved on the document type` |
| US-59.1 | Allow Specialization needs at least one specialization | `backend/tests/document-type-specialization-list.test.js` | `Allow Specialization needs at least one specialization` |
| US-59.1 | A specialization in use cannot be removed | `backend/tests/document-type-specialization-list.test.js` | `A specialization in use cannot be removed` |
| US-59.2 | Worker role saves required specializations | `backend/tests/document-type-specialization-list.test.js` | `Worker role saves required specializations` |
| US-59.2 | Required specialization must belong to a required document | `backend/tests/document-type-specialization-list.test.js` | `Required specialization must belong to a required document` |
| US-59.2 | Worker role form offers specializations for required documents | `frontend/tests/WorkerRoleFormDialog.test.js` | `Worker role form offers specializations for required documents` |
| US-59.3 | Specialization is chosen from the document type's list | `frontend/tests/PersonDocumentsCard.test.js` | `Specialization is chosen from the document type's list` |
| US-59.3 | Person document saves specializations from the list | `backend/tests/document-type-specialization-list.test.js` | `Person document saves specializations from the list` |
| US-59.3 | Specialization not in the type's list is rejected | `backend/tests/document-type-specialization-list.test.js` | `Specialization not in the type's list is rejected` |
| US-59.3 | The same specialization cannot be added twice | `backend/tests/document-type-specialization-list.test.js` | `The same specialization cannot be added twice` |
| US-59.4 | Application stays incomplete until the required specialization is added | `backend/tests/document-type-specialization-list.test.js` | `Application stays incomplete until the required specialization is added` |
| US-59.4 | Missing specializations are named in the missing items | `backend/tests/document-type-specialization-list.test.js` | `Missing specializations are named in the missing items` |
| US-59.4 | Apply dialog names the missing specialization | `frontend/tests/ApplyTripDialog.test.js` | `Apply dialog names the missing specialization` |
| US-59.5 | License required is removed from worker roles | `backend/tests/document-type-specialization-list.test.js` | `License required is removed from worker roles` |
| US-59.5 | Worker role form has no License required control | `frontend/tests/WorkerRoleFormDialog.test.js` | `Worker role form has no License required control` |
| US-59.5 | Required documents column lists required document types with their required specializations | `frontend/tests/WorkerRolesList.test.js` | `Required documents column lists required document types with their required specializations` |

Existing Feature 34 tests that send free-text specialization names MUST be updated to use list entries.

---

## Agent implementation request

```text
Implement Feature 59 from @features/feature-59-document-type-specialization-list.md on branch `feature/59-document-type-specialization-list`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend and frontend before finishing.
Update @features/reference/api.md, @features/reference/behavior.md, and @features/reference/data-model.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (new `documentTypeSpecialization` and `workerRoleSpecialization`; `personDocumentSpecialization` change), `features/reference/api.md` (document types, worker roles, person documents, browse roles), `features/reference/behavior.md` (Feature 34 specialization row, Feature 25 required documents row, application checks)

---

## Definition of Done

*   [x] Document type specialization list with admin UI and API; in-use entries protected (**FR-001**–**FR-005**)
*   [x] Worker role required specializations with form and API (**FR-006**–**FR-009**)
*   [x] Person document specializations chosen from the list on the profile dialog and API (**FR-010**–**FR-012**)
*   [x] Application checks and messages include required specializations (**FR-013**–**FR-015**)
*   [x] Schema ensure, including the one-time removal of existing free-text specializations and their files (**FR-016**)
*   [x] Worker role **License required** removed everywhere, column dropped; Worker Roles list shows required documents (**FR-017**, **FR-018**)
*   [x] Automated tests for every Gherkin scenario; Feature 34 tests updated
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/59-document-type-specialization-list`; PR → `dev`

---

## Out of Scope

- Free-text specialization names
- Per-trip required specializations (they are set on the worker role)
- Expiration dates on specializations
- Requiring a minimum number of specializations other than the role's required ones
- Showing required specializations on trip pages, the Trip Status board, or the Browse page
- Keeping or migrating existing free-text specializations
