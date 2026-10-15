# Feature: Person Document Add Dialog

**Feature ID:** 35
**Branch pattern:** `feature/35-person-document-dialog`
**Status:** Ready
**Created:** 2026-10-14
**Input:** On Add person and Edit person, show a document list (or no documents) with no inline add form. An Add Document button opens a dialog with the add document form and Save and Cancel buttons.
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 22 — Document Type Number Required & Instructions](feature-22-document-number-and-instructions.md), [Feature 34 — Document Specializations](feature-34-document-specializations.md)

---

## User Stories

### US-35.1: See documents on Add person and Edit person

**As a** staff member adding or editing a person
**I want** the person dialog to list documents, or say there are none, without the add form sitting on the page
**So that** the person form stays readable until I choose to add a document

**Priority:** P1
**Independent test:** Edit person with no documents shows **No documents** and **Add Document**, and does not show the document fields until that button is used. Add person shows the same empty list.
**Acceptance scenarios:** see ### US-35.1

### US-35.2: Add a document from a dialog

**As a** staff member
**I want** Add Document to open a dialog with the document form, Save, and Cancel
**So that** I can enter a document and dismiss it without leaving the person dialog

**Priority:** P1
**Independent test:** Add Document opens a dialog titled **Add Document** with the existing document fields, **Save**, and **Cancel**. Cancel closes it without creating a document. Save creates the document, closes the dialog, and the new row appears in the list.
**Acceptance scenarios:** see ### US-35.2

---

## Requirements

### Functional Requirements

- **FR-001**: Add person (`AddPersonDialog`) and Edit person (`EditPersonDialog`) MUST show a **Documents** section. The section lists that person’s documents, or the text **No documents** when there are none. The add/edit document fields MUST NOT be shown inline on the person dialog.
- **FR-002**: The Documents section MUST include a button labeled **Add Document**.
- **FR-003**: Clicking **Add Document** on a saved person MUST open a dialog titled **Add Document**. The dialog contains the same person-document fields as today: document type, instructions when the type has them, document number only when required, country issued, issue date, expiration date, optional file, and the Specializations section only when the selected type allows specializations (Features 22 and 34).
- **FR-004**: The dialog MUST have buttons labeled **Save** and **Cancel**. **Cancel** closes the dialog and does not create or update a document. **Save** uses the same validation and create/update behavior as today. A successful save closes the dialog and refreshes the list.
- **FR-005**: **Edit** on a listed document MUST open the same dialog, filled with that document, titled **Edit Document**, with **Save** and **Cancel**. There is no inline edit form.
- **FR-006**: On Add person, before the person is saved, the section shows **No documents**. **Add Document** stays disabled until the person has an id. Saving a new person still closes Add person as it does today.
- **FR-007**: List columns, view, download, delete, specialization rows, and document-type rules MUST stay as they are. No API or schema change.

---

## Assumptions

- Documents still belong to a saved person. Add person cannot upload a file before the person exists.
- The view-file dialog is separate and stays as it is.
- Field labels, required rules, and specialization rules do not change; only where the form is shown changes.

## Edge Cases

- Person with documents → the table is shown and the inline form is not.
- Person with no documents → **No documents** and **Add Document**.
- Cancel from Add Document or Edit Document → the list is unchanged.
- Save with missing required fields → the dialog stays open and shows the existing field errors.
- Add person with no id → **Add Document** is visible and disabled.

## Success Criteria

- **SC-001**: Add person and Edit person show the document list or **No documents**, and do not show the document form until **Add Document** or **Edit** is used.
- **SC-002**: **Add Document** opens a dialog with **Save** and **Cancel**. Cancel does not create a document. Save adds the row to the list and closes the dialog.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. Person documents stay on the person. The same staff who can edit the person can add documents.

---

## Key Entities

- **PersonDocument** — unchanged. This feature only changes where the form is shown.

---

## API Requirements

No API changes.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `AddPersonDialog` | Documents section: list or **No documents**, and **Add Document** (disabled until the person is saved) |
| `EditPersonDialog` / `PersonDocumentsCard` | Same list. Remove the inline form. **Add Document** and row **Edit** open a dialog |
| Document dialog | Title **Add Document** or **Edit Document**. Existing fields. Buttons **Save** and **Cancel** |

---

## Data Model Requirements

No schema changes.

---

## Acceptance Criteria (Gherkin)

### US-35.1 — See documents on Add person and Edit person

#### Scenario: Person documents are a list without an inline form
* **Given** I open Edit person for a person with no documents
* **Then** I see No documents
* **And** I see Add Document
* **And** I do not see the document type field

#### Scenario: Add person shows no documents
* **Given** I open Add person
* **Then** I see No documents
* **And** Add Document is disabled

### US-35.2 — Add a document from a dialog

#### Scenario: Add Document opens a dialog with Save and Cancel
* **Given** I open Edit person for a saved person
* **When** I click Add Document
* **Then** I see a dialog titled Add Document
* **And** I see Save and Cancel
* **And** I see the document type field

#### Scenario: Cancel closes the add document dialog
* **Given** the Add Document dialog is open
* **When** I click Cancel
* **Then** the dialog closes
* **And** no document is created

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-35.1 | Person documents are a list without an inline form | `frontend/tests/` PersonDocumentsCard | `Person documents are a list without an inline form` |
| US-35.1 | Add person shows no documents | `frontend/tests/` AddPersonDialog | `Add person shows no documents` |
| US-35.2 | Add Document opens a dialog with Save and Cancel | `frontend/tests/` PersonDocumentsCard | `Add Document opens a dialog with Save and Cancel` |
| US-35.2 | Cancel closes the add document dialog | `frontend/tests/` PersonDocumentsCard | `Cancel closes the add document dialog` |

Existing Feature 22 and Feature 34 person-document form tests open this dialog before asserting fields.

---

## Agent implementation request

```text
Implement Feature 35 from @features/feature-35-person-document-dialog.md on branch `feature/35-person-document-dialog`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/behavior.md in the same PR. No API or schema change.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (document form opens from **Add Document**, not inline on the person dialog)

---

## Definition of Done

*   [ ] Documents section on Add person and Edit person lists documents or shows **No documents** (**FR-001**, **FR-006**)
*   [ ] Inline form removed; **Add Document** and **Edit** open a dialog with **Save** and **Cancel** (**FR-002**–**FR-005**)
*   [ ] Existing document field, specialization, view, download, and delete behavior unchanged (**FR-007**)
*   [ ] Automated tests for every Gherkin scenario
*   [ ] Living reference updated in this PR
*   [ ] `npm test` green
*   [ ] On `feature/35-person-document-dialog`; PR → `dev`

---

## Out of Scope

- Uploading a document before the person is saved
- Keeping Add person open after the person is created
- Changing document fields, validation, or the API
- Changing the file view dialog
