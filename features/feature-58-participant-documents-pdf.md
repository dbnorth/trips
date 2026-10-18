# Feature: Participant Documents PDF

**Feature ID:** 58
**Branch pattern:** `feature/58-participant-documents-pdf`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Add an action to the list of participants on the view trip page. The button downloads a PDF with the organization logo and name, "Documents for <Participant Name>", trip info, and a text list of the participant's document details, followed by a page for each document or specialization with the participant's name, the document details, and then the uploaded image of the document.
**Depends on:** [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md), [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md), [Feature 34 — Document Specializations](feature-34-document-specializations.md), [Feature 54 — Room List PDF](feature-54-room-list-pdf.md), [Feature 57 — Document Type Has Expiration Date](feature-57-document-type-expiration-date.md)

---

## User Stories

### US-58.1: Download a participant's documents as one PDF
**As a** Trip Leader, Org Admin, or System Admin
**I want to** download one PDF with a participant's document details and the uploaded files
**So that** I can review or forward all of their documents (passport, licence, certifications) in a single file

**Priority:** P1
**Independent test:** On the trip page, **Documents PDF** on a participant row downloads a PDF whose first page has the organization header, "Documents for <name>", trip info, and the list of document details, followed by one page per document and per specialization with its uploaded file.
**Acceptance scenarios:** see ### US-58.1

---

## Requirements

### Functional Requirements

- **FR-001**: Each row of the **Participants** list on the trip page (`TripView`) MUST have a **Documents PDF** action in the **Actions** column. It downloads the PDF for that participant on that trip.
- **FR-002**: Only users who MAY manage the trip roster (Trip Leader of the trip, Org Admin of the trip's organization, or System Admin — same access as the Room list PDF, Feature 54 FR-002) MAY download it. Others → `403`. Unknown trip, or an assignment that is not on that trip → `404`.
- **FR-003**: The first page MUST start with:
  - **Organization header**: the trip organization's logo with its name beside it, using the same rule as Feature 54 FR-003 (logo shows only for a PNG or JPEG logo file that exists; otherwise only the name).
  - **Title**: "Documents for <Participant Name>", where the name is the person's first, middle, and last name.
  - **Trip info**: trip name, location (trip location, city, and country, leaving out blanks), and dates (start date to end date), as in Feature 54.
- **FR-004**: Below the trip info, the first page MUST list **document details**, one entry per person document:
  - **Type** (document type description), **Document number**, **Country issued** (country name), **Issue date**, **Expiration date**. Blank values show as `—`. A document whose type has no expiration date (Feature 57) shows `—` for Expiration date.
  - Under each document, its **specializations** (Feature 34), each with its **Name** and **Date**.
  - Documents are ordered by document type description, then expiration date, then document id. Specializations are listed in the order they were added.
  - With no documents, the list shows the line "No documents." and the PDF has only the first page.
- **FR-005**: After the first page, the PDF MUST have one **document page** for each document, followed by one page for each of that document's specializations, in the same order as **FR-004**. Each page shows, at the top:
  - The participant's name.
  - For a document: its details as in **FR-004** (Type, Document number, Country issued, Issue date, Expiration date).
  - For a specialization: the document type, the specialization name, and the specialization date.
- **FR-006**: Below the details, each page MUST show the **uploaded file**:
  - JPEG or PNG image → the image, scaled to fit the rest of the page and keeping its proportions.
  - HEIC/HEIF image → converted to JPEG and shown the same way.
  - PDF file → the document page shows the details only, and every page of the uploaded PDF follows it, in order.
  - No file uploaded → the line "No file uploaded."
  - A file that is missing on disk or cannot be read → the line "The file could not be read." The rest of the PDF is still produced.
- **FR-007**: Dates read like `October 1, 2026` (Feature 54 FR-008).
- **FR-008**: The file name is `Documents - <Participant Name>.pdf`, using the first and last name.
- **FR-009**: The **Documents PDF** action downloads with the signed-in token (same pattern as the CSV and other PDF downloads) and shows an error alert on the trip page if the download fails.

---

## Assumptions

- All of the participant's profile documents and specializations are included, not only the ones the trip or worker role requires.
- The participant is identified by the trip assignment (trip people role) on that row; the documents are that assignment's person's documents.
- The PDF is generated on the server with `pdfkit` (already used by Features 54 and 55). Letter size, portrait, standard fonts.
- Two new backend packages: `pdf-lib`, to append the pages of an uploaded PDF, and `heic-convert`, to turn HEIC/HEIF images into JPEG.
- The action shows on every row, including cancelled and declined participants.

## Edge Cases

- Ana has a passport (JPEG) and a nursing licence (PDF, 2 pages) with one specialization (PNG) → pages: first page, passport page with image, licence details page, licence PDF page 1, licence PDF page 2, specialization page with image.
- A document type has no expiration date (Feature 57) → Expiration date shows `—` on the first page and on its document page.
- A document has no file → its page shows the details and "No file uploaded."
- An uploaded PDF is password-protected or damaged → its document page shows the details and "The file could not be read."; no pages are appended for it.
- A very tall or very wide image → scaled down to fit the page without stretching.
- The organization logo is a GIF → header shows the name only.

## Success Criteria

- **SC-001**: Staff get all of a participant's document details and uploaded files in one download.
- **SC-002**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- The PDF contains passport numbers and images of identity documents. It is available only to trip staff (**FR-002**), never to participants or the public.
- An assignment from another trip cannot be used through this trip's URL (**FR-002**, `404`).

---

## Key Entities

- **Trip**, **Organization**, **TripPeopleRole**, **Person**, **PersonDocument**, **PersonDocumentSpecialization**, **DocumentType** (read only)

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/trips/:id/participants/:assignmentId/documents/pdf` | auth + trip staff | `200` `application/pdf` with `Content-Disposition: attachment; filename="Documents - <Participant Name>.pdf"` (**FR-003**–**FR-008**); `403` / `404` per **FR-002** |

---

## Screen Requirements

| Where | Change |
|-------|--------|
| `TripView` Participants list | **Documents PDF** action in each row's **Actions** column (**FR-001**, **FR-009**); disabled when the row has no person |

---

## Data Model Requirements

No database changes.

---

## Acceptance Criteria (Gherkin)

### US-58.1 — Download a participant's documents as one PDF

#### Scenario: Documents PDF data for a participant
* **Given** trip "Guatemala Clinic" of organization "Hope Mission" in Antigua, Guatemala from 2027-01-02 to 2027-01-09
* **And** Ana Maria Lopez is a participant with a **Passport** document number `P1234567`, issued in the United States on 2021-06-15, expiring 2031-06-15
* **When** the documents PDF data is built for Ana's assignment
* **Then** the organization header is "Hope Mission"
* **And** the title is "Documents for Ana Maria Lopez"
* **And** the trip info is "Guatemala Clinic", "Antigua, Guatemala", "January 2, 2027 to January 9, 2027"
* **And** the document details list Passport, `P1234567`, "United States", "June 15, 2021", "June 15, 2031"

#### Scenario: Specializations are listed under their document
* **Given** Ana has a **Board certification** document with specializations "Pediatrics" (2024-03-01) and "Emergency" (2025-05-10)
* **When** the documents PDF data is built
* **Then** the Board certification entry lists "Pediatrics", "March 1, 2024" and then "Emergency", "May 10, 2025"

#### Scenario: A page for each document and specialization
* **Given** Ana has a **Passport** document and a **Board certification** document with one specialization "Pediatrics"
* **When** the documents PDF data is built
* **Then** the pages after the first are: Board certification, Pediatrics, Passport
* **And** each page has the name "Ana Maria Lopez" and that item's details

#### Scenario: Uploaded PDF pages follow the document page
* **Given** Ana's **Nursing licence** document file is a 2-page PDF
* **When** I download Ana's documents PDF
* **Then** the Nursing licence details page is followed by the 2 pages of the uploaded PDF

#### Scenario: HEIC image is shown
* **Given** Ana's **Passport** document file is a HEIC image
* **When** the documents PDF data is built
* **Then** the Passport page has the image converted to JPEG

#### Scenario: Document without a file
* **Given** Ana's **Passport** document has no uploaded file
* **When** the documents PDF data is built
* **Then** the Passport page shows "No file uploaded."

#### Scenario: Document type without an expiration date
* **Given** Ana has a **Diploma** document whose type has no expiration date
* **When** the documents PDF data is built
* **Then** the Diploma entry shows `—` for Expiration date

#### Scenario: Participant with no documents
* **Given** Ben Cruz is a participant with no documents
* **When** the documents PDF data is built for Ben's assignment
* **Then** the document details show "No documents."
* **And** there are no pages after the first

#### Scenario: Staff download the documents PDF
* **Given** I am an Org Admin of the trip's organization
* **When** I request `GET /trips/trips/:id/participants/:assignmentId/documents/pdf` for Ana
* **Then** the response is `200` with content type `application/pdf`
* **And** the file name is `Documents - Ana Lopez.pdf`
* **And** the body starts with `%PDF`

#### Scenario: Assignment from another trip
* **Given** Ana's assignment is on a different trip
* **When** I request the documents PDF for her assignment through this trip
* **Then** the response is `404`

#### Scenario: Participants cannot download the documents PDF
* **Given** I am an approved Trip Participant on the trip
* **When** I request another participant's documents PDF
* **Then** the response is `403`

#### Scenario: Documents PDF action on the participant row
* **Given** I am on the trip page as trip staff
* **When** I click **Documents PDF** on Ana's row
* **Then** Ana's documents PDF is downloaded

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-58.1 | Documents PDF data for a participant | `backend/tests/participant-documents-pdf.test.js` | `Documents PDF data for a participant` |
| US-58.1 | Specializations are listed under their document | `backend/tests/participant-documents-pdf.test.js` | `Specializations are listed under their document` |
| US-58.1 | A page for each document and specialization | `backend/tests/participant-documents-pdf.test.js` | `A page for each document and specialization` |
| US-58.1 | Uploaded PDF pages follow the document page | `backend/tests/participant-documents-pdf.test.js` | `Uploaded PDF pages follow the document page` |
| US-58.1 | HEIC image is shown | `backend/tests/participant-documents-pdf.test.js` | `HEIC image is shown` |
| US-58.1 | Document without a file | `backend/tests/participant-documents-pdf.test.js` | `Document without a file` |
| US-58.1 | Document type without an expiration date | `backend/tests/participant-documents-pdf.test.js` | `Document type without an expiration date` |
| US-58.1 | Participant with no documents | `backend/tests/participant-documents-pdf.test.js` | `Participant with no documents` |
| US-58.1 | Staff download the documents PDF | `backend/tests/participant-documents-pdf.test.js` | `Staff download the documents PDF` |
| US-58.1 | Assignment from another trip | `backend/tests/participant-documents-pdf.test.js` | `Assignment from another trip` |
| US-58.1 | Participants cannot download the documents PDF | `backend/tests/participant-documents-pdf.test.js` | `Participants cannot download the documents PDF` |
| US-58.1 | Documents PDF action on the participant row | `frontend/tests/TripView.test.js` | `Documents PDF action on the participant row` |

The data scenarios test the function that builds the PDF's content (header, title, trip info, details list, pages); the download scenarios test the endpoint; "Uploaded PDF pages follow the document page" checks the page count of the downloaded PDF.

---

## Agent implementation request

```text
Implement Feature 58 from @features/feature-58-participant-documents-pdf.md on branch `feature/58-participant-documents-pdf`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend and frontend before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (participant documents PDF endpoint), `features/reference/behavior.md` (Documents PDF action, content, page rules)

---

## Definition of Done

*   [x] **Documents PDF** action on each participant row (**FR-001**, **FR-009**); staff-only access (**FR-002**)
*   [x] First page with organization header, title, trip info, and document details list (**FR-003**, **FR-004**)
*   [x] One page per document and specialization with the participant name, details, and uploaded file, including appended PDF pages and converted HEIC images (**FR-005**, **FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/58-participant-documents-pdf`; PR → `dev`

---

## Out of Scope

- A PDF for several participants at once (whole trip)
- Only including the documents the trip or worker role requires
- Participants downloading their own documents PDF
- Emailing the PDF
- Editing or uploading documents from this action
