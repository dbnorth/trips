# Feature: Document File Thumbnail in the Edit Document Dialog

**Feature ID:** 97
**Branch pattern:** `feature/97-document-file-thumbnail`
**Status:** Implemented
**Created:** 2026-10-29
**Input:** "on the document upload view add a thumbnail of the uploaded doc if it exist, so i can tell if it is uploaded."

The **Edit Document** dialog (profile **Documents** card) shows only an empty file input with the hint "Leave empty to keep the current file (or none)", so you can't tell whether a file is already uploaded without closing the dialog and clicking **View** in the table.

Clarified with the requester:
- A PDF's thumbnail is a picture of its **first page** (rendered in the browser with pdf.js).
- Only the document's current file in the **Edit Document** dialog (not specialization files, not the newly chosen file, not the documents table).
- Clicking the thumbnail opens the existing **View**.

**Depends on:**
- [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md) (Documents card, View)
- [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md) (Add/Edit Document dialog)
- [Feature 63 — Encrypt Person Documents](feature-63-encrypt-person-documents.md) (view decrypts in memory)
- [Feature 96 — Convert HEIC Uploads to JPEG](feature-96-heic-to-jpeg-on-upload.md) (images are JPEG/PNG; leftover HEIC can't be previewed)

---

## User Stories

### US-97.1: See the uploaded file while editing a document

**As** a person (or Org Admin) editing a document on a profile
**I want** to see a small picture of the file already uploaded
**So that** I can tell whether a file is uploaded, and which one, before deciding to replace it

**Acceptance:** see Gherkin scenarios under US-97.1.

---

## Requirements

### Functional Requirements

- **FR-001**: When the **Edit Document** dialog opens for a document with a stored file, a **Current file** area above the upload input shows a thumbnail of that file (about 120 px tall, width to fit) with the uploaded file name underneath (the stored name without its `person-<id>-<timestamp>-` prefix, e.g. `B_North.jpg`). A spinner shows while it loads. The file is loaded through the existing document **view** request (same access rules; decrypted by the server).
- **FR-002**: An image file (JPG, PNG) shows the image scaled to fit. A PDF shows its first page, rendered in the browser with pdf.js (`pdfjs-dist`, loaded only when a PDF thumbnail is needed).
- **FR-003**: A document without a file shows "No file uploaded" in the **Current file** area. The **Add Document** dialog shows no **Current file** area.
- **FR-004**: When the file can't be shown (a leftover HEIC file, a PDF that can't be rendered, such as damaged or password-protected, or the file can't be loaded), the area shows a file icon, "Preview not available", and the file name. The dialog still works normally.
- **FR-005**: Clicking the thumbnail (or the icon from FR-004) opens the existing **View** dialog for that document on top of the **Edit Document** dialog; closing **View** returns to the edit form with its entries kept.
- **FR-006**: The thumbnail always shows the saved file; choosing a new file in the upload input doesn't change it. Its memory is released when the **Edit Document** dialog closes.

---

## Assumptions

- Only the first page of a PDF is rendered, at thumbnail size.
- Loading the file again for the thumbnail (and again for **View**) is acceptable; documents are at most 10 MB.

## Edge Cases

- A document type changed in the dialog → the thumbnail still shows the saved file.
- A very tall or wide image → scaled to fit the thumbnail area without cropping.
- Closing the dialog before the thumbnail loads → nothing is shown later and no error appears.

## Success Criteria

- **SC-001**: Opening **Edit** on a document with an uploaded JPG or PDF shows its thumbnail without opening **View**.
- **SC-002**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change. The thumbnail uses the existing document view request and its access rules (Feature 4 / Feature 63).

---

## Key Entities

None.

---

## API Requirements

None. Uses `GET /trips/people/:id/documents/:documentId/view`.

---

## Screen Requirements

- **Edit Document** dialog: **Current file** area above the upload input (FR-001 – FR-006).

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Ana has a Passport document on her profile.

### US-97.1 — See the uploaded file while editing a document

#### Scenario: Editing a document with an image shows its thumbnail
* **Given** Ana's Passport file is `B_North.jpg`
* **When** she clicks **Edit** on the Passport
* **Then** the **Current file** area shows the image and the name `B_North.jpg`

#### Scenario: Editing a document with a PDF shows its first page
* **Given** Ana's Passport file is `passport.pdf`
* **When** she clicks **Edit** on the Passport
* **Then** the **Current file** area shows a picture of the PDF's first page and the name `passport.pdf`

#### Scenario: A document without a file says so
* **Given** Ana's Passport has no file
* **When** she clicks **Edit** on the Passport
* **Then** the **Current file** area shows "No file uploaded"
* **And** **Add Document** shows no **Current file** area

#### Scenario: A file that can't be previewed shows its name
* **Given** Ana's Passport file is a leftover `B_North.HEIC`
* **When** she clicks **Edit** on the Passport
* **Then** the **Current file** area shows "Preview not available" and the name `B_North.HEIC`

#### Scenario: Clicking the thumbnail opens View
* **Given** Ana is editing her Passport, whose file is `B_North.jpg`
* **When** she clicks the thumbnail
* **Then** the **View** dialog opens for the Passport
* **And** after closing it, the **Edit Document** dialog is still open with her entries

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-97.1 | Editing a document with an image shows its thumbnail | `frontend/tests/DocumentFileThumbnail.test.js` | `Editing a document with an image shows its thumbnail` |
| US-97.1 | Editing a document with a PDF shows its first page | `frontend/tests/DocumentFileThumbnail.test.js` | `Editing a document with a PDF shows its first page` |
| US-97.1 | A document without a file says so | `frontend/tests/DocumentFileThumbnail.test.js` | `A document without a file says so` |
| US-97.1 | A file that can't be previewed shows its name | `frontend/tests/DocumentFileThumbnail.test.js` | `A file that can't be previewed shows its name` |
| US-97.1 | Clicking the thumbnail opens View | `frontend/tests/DocumentFileThumbnail.test.js` | `Clicking the thumbnail opens View` |

---

## Agent implementation request

```text
Implement Feature 97 from @features/feature-97-document-file-thumbnail.md on branch `feature/97-document-file-thumbnail`.

Frontend only. Add `pdfjs-dist` and a small helper (e.g. frontend/src/utils/pdfThumbnail.js) that dynamically imports pdf.js and renders a PDF blob's first page to an image URL at thumbnail size (mock this helper in tests). In PersonDocumentsCard.vue, when startEdit opens a document with documentFileName, load the file with PersonDocumentServices.view, show the Current file area per FR-001 – FR-004 (skip loading for .heic/.heif names), open the existing View on click (FR-005), and revoke URLs / ignore late results when the form closes (FR-006).
Tests per the Test Coverage Map. Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] Current file thumbnail per **FR-001** – **FR-004**
*   [x] Thumbnail opens View per **FR-005**; saved file only and memory released per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npx vitest run` green (backend unchanged)
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Thumbnails for specialization files
- A preview of a newly chosen file before saving
- Thumbnails in the documents table
- Server-side thumbnail generation or storing thumbnails
