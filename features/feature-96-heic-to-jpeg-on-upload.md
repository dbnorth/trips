# Feature: Convert HEIC Uploads to JPEG

**Feature ID:** 96
**Branch pattern:** `feature/96-heic-to-jpeg-on-upload`
**Status:** Implemented
**Created:** 2026-10-29
**Input:** "on the view document image when the document is a HEIC document it said it couldn't view it. why?" → "It seems the best plan is to convert it to JPEG on upload?" → "Write the spec as a new feature" → "yes add for all HEIC uploads to be converted"

Today a HEIC person document or specialization file is stored as uploaded. **View** converts it to JPEG in the browser with `heic2any` (0.0.4, unmaintained), whose bundled decoder can't read HEIC photos from recent iPhones (iOS 17+), so the view fails with "Unable to preview this HEIC image. You can still download it." Most browsers (Chrome, Edge, Firefox) can't show HEIC at all, and a downloaded HEIC is hard to open on Windows. The backend's `heic-convert` (used by the Documents PDF, Feature 58) reads these files. The other picture uploads (profile picture, organization logo, trip image, email picture library) refuse HEIC, so an iPhone photo has to be converted by hand first.

Clarified with the requester:
- Convert on upload, and store **only** the JPEG (the original HEIC is not kept).
- Existing HEIC files are converted once.
- Every upload that takes a picture accepts HEIC and converts it.

**Depends on:**
- [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md) (profile picture)
- [Feature 3 — Organizations and Agreements](feature-3-organizations-and-agreements.md) (organization logo)
- [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md) (trip image)
- [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md) (person document upload)
- [Feature 34 — Document Specializations](feature-34-document-specializations.md) (specialization files)
- [Feature 58 — Participant Documents PDF](feature-58-participant-documents-pdf.md) (HEIC conversion in the PDF)
- [Feature 63 — Encrypt Person Documents](feature-63-encrypt-person-documents.md) (document files written encrypted)
- [Feature 65 — Fix Image Replace](feature-65-fix-image-replace.md) (time-stamped picture file names)
- [Feature 77 — HTML Emails and Picture Library](feature-77-html-email-pictures.md) (email pictures)

---

## User Stories

### US-96.1: HEIC documents can be viewed and downloaded as JPEG

**As** a participant or staff member
**I want** a HEIC photo uploaded as a document to be saved as a JPEG
**So that** it can be viewed in any browser and opened after downloading on any computer

**Acceptance:** see Gherkin scenarios under US-96.1.

### US-96.2: HEIC photos can be used as pictures

**As** a person setting a profile picture, organization logo, trip image, or email picture
**I want** to pick a HEIC photo straight from my iPhone
**So that** I don't have to convert it first and it shows in every browser and email

**Acceptance:** see Gherkin scenarios under US-96.2.

---

## Requirements

### Functional Requirements

A file is **HEIC** when its content is HEIC/HEIF, or its name ends in `.heic` / `.heif`, or its type is `image/heic` / `image/heif`. Conversion uses `heic-convert` to JPEG at quality 0.9 (same as the Documents PDF).

**Person documents**

- **FR-001**: A HEIC person document file or specialization file is converted to JPEG before it is encrypted and written. Only the JPEG is stored; its file name is the usual `person-<id>-<timestamp>-<name>` with the extension `.jpg` (e.g. `IMG_1234.HEIC` → `…-IMG_1234.jpg`), and `documentFileName` stores that name.
- **FR-002**: A HEIC document file that can't be converted is refused with `400` "This HEIC photo couldn't be read. Upload it as a JPG, PNG, or PDF instead." Nothing is saved for that request.
- **FR-003**: Allowed document uploads stay PDF, JPG, PNG, and HEIC, up to 10 MB per file (the limit applies to the uploaded file). PDF, JPG, and PNG files are stored as today.

**Pictures**

- **FR-004**: The profile picture (`PUT /trips/people/:id/picture`), organization logo (`PUT /trips/organizations/:id/logo`), trip image (`PUT /trips/trips/:id/image`), and email picture (`POST /trips/email-pictures`) uploads also accept HEIC. A HEIC picture is converted to JPEG and only the JPEG is stored, named as today with `.jpg` (`person-<id>-<timestamp>.jpg`, `org-…`, `trip-…`; an email picture's `contentType` is `image/jpeg`). The 2 MB limit applies to the uploaded file.
- **FR-005**: A HEIC picture that can't be converted is refused with `400` "This HEIC photo couldn't be read. Upload it as a JPG or PNG instead." The current picture is kept, and no file is left behind.
- **FR-006**: The wrong-type messages include HEIC: "Only PNG, JPEG, GIF, WebP, and HEIC images are allowed." (profile picture, logo, trip image) and "Upload a PNG, JPEG, GIF, or HEIC picture." (email pictures). The file pickers for these uploads (Edit person, Add/Edit organization, Add/Edit trip, **Pictures** page, and the rich text editor's picture upload) also offer HEIC files.

**Existing files**

- **FR-007**: On server startup, every stored person document and specialization file that is HEIC (encrypted or not) is converted to JPEG once: the JPEG is written encrypted under the new `.jpg` name, `documentFileName` is updated, and the HEIC file is deleted. A file that can't be read or converted (or when the document key can't be read) is left unchanged and logged, and is tried again on the next startup. (Pictures never accepted HEIC, so there are none to convert.)

**Viewing documents**

- **FR-008**: Document **View** no longer converts in the browser (`heic2any` is removed). A document whose stored file is still HEIC (FR-007 couldn't convert it) shows "This HEIC file can't be previewed. You can still download it." instead of the image.
- **FR-009**: Document **Download** returns the stored file, so a converted document downloads as `.jpg`. The Documents PDF is unchanged (it keeps converting any leftover HEIC).

---

## Assumptions

- Losing HEIC extras (HDR, Live Photo data) doesn't matter for documents or pictures.
- The JPEG may be larger than the HEIC (about 2–3×), so a converted picture can be over 2 MB; no resizing.
- Conversion adds about a second per HEIC file to an upload.

## Edge Cases

- A `.heic` file whose content is actually JPEG or PNG → stored as is, with its extension (and email picture `contentType`) matching its content.
- A HEIC file containing several images (e.g. a burst) → the first image is used.
- A HEIC photo over the upload limit (2 MB for pictures, 10 MB for documents) → refused with the existing size message, as for any file.
- Replacing a picture or document with a converted HEIC → the previous file is deleted as today (Feature 65, Feature 66 for shared trip images).

## Success Criteria

- **SC-001**: A HEIC photo from a recent iPhone, uploaded as a document, can be viewed in Chrome and downloaded as a JPEG.
- **SC-002**: A HEIC photo can be set as a profile picture, logo, trip image, or email picture, and shows in Chrome.
- **SC-003**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change. Same access rules for every upload, view, download, and the Documents PDF; document files stay encrypted on disk (Feature 63). Access is still checked before a picture is kept.

---

## Key Entities

- **personDocument** `documentFileName` and **personDocumentSpecialization** `documentFileName` — end in `.jpg` for converted HEIC files.
- **person** picture, **organization** logo, **trip** image file names — end in `.jpg` for converted HEIC files.
- **emailPicture** `fileName` ends in `.jpg` and `contentType` is `image/jpeg` for converted HEIC files.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `POST` / `PUT` | `/trips/people/:id/documents`, `/trips/people/:id/documents/:documentId` | HEIC document and specialization files stored as JPEG (FR-001); unreadable HEIC → `400` (FR-002) |
| `PUT` | `/trips/people/:id/picture`, `/trips/organizations/:id/logo`, `/trips/trips/:id/image` | Accept HEIC, stored as JPEG (FR-004); unreadable HEIC → `400` (FR-005); wrong-type message (FR-006) |
| `POST` | `/trips/email-pictures` | Accept HEIC, stored as JPEG with `contentType` `image/jpeg` (FR-004); unreadable HEIC → `400` (FR-005); wrong-type message (FR-006) |
| `GET` | document `view` / `download` and specialization equivalents | no change; converted files are served as `image/jpeg` / `.jpg` |

---

## Screen Requirements

- **Profile / Edit person documents**: upload accepts the same file types; **View** of a converted file shows the JPEG; a leftover HEIC shows the FR-008 message.
- **Edit person** (picture), **Add/Edit organization** (logo), **Add/Edit trip** (trip image), **Pictures** page, and the rich text editor's picture upload: the file picker offers HEIC files (FR-006).

---

## Data Model Requirements

None (no schema change). FR-007 updates `documentFileName` values for converted files.

---

## Acceptance Criteria (Gherkin)

Background:
- Ana has a profile and is an Org Admin of "Hope Clinics"; document type "Passport" exists for her organization; trip "Haiti" belongs to Hope Clinics.
- `iphone.heic` is a HEIC photo from a recent iPhone; `broken.heic` is a file named `.heic` that isn't a valid image.

### US-96.1 — HEIC documents can be viewed and downloaded as JPEG

#### Scenario: A HEIC document is stored as JPEG
* **When** Ana uploads `iphone.heic` as her Passport file
* **Then** the stored file name ends in `-iphone.jpg` and the file on disk is encrypted JPEG data
* **And** **View** returns `image/jpeg` and **Download** returns `…-iphone.jpg`

#### Scenario: A HEIC specialization file is stored as JPEG
* **When** Ana uploads `iphone.heic` as the file of a specialization on her Board Certification
* **Then** the specialization's stored file name ends in `.jpg` and is JPEG data

#### Scenario: An unreadable HEIC document is refused
* **When** Ana uploads `broken.heic` as her Passport file
* **Then** the response is `400` "This HEIC photo couldn't be read. Upload it as a JPG, PNG, or PDF instead."
* **And** no document is saved and no file is written

#### Scenario: Existing HEIC documents are converted on startup
* **Given** Ana's Passport file is a stored HEIC file (encrypted), and Ben's is a stored unencrypted HEIC file
* **When** the server starts
* **Then** both are stored as encrypted `.jpg` files, their `documentFileName` values end in `.jpg`, and the HEIC files are gone
* **And** a stored HEIC file that can't be read is left unchanged

#### Scenario: A leftover HEIC document shows a message instead of the image
* **Given** a document whose stored file is still HEIC
* **When** Ana clicks **View**
* **Then** she sees "This HEIC file can't be previewed. You can still download it."

### US-96.2 — HEIC photos can be used as pictures

#### Scenario: A HEIC profile picture, logo, and trip image are stored as JPEG
* **When** Ana uploads `iphone.heic` as her profile picture, as the Hope Clinics logo, and as the Haiti trip image
* **Then** each stored file name ends in `.jpg` and the file is JPEG data

#### Scenario: A HEIC email picture is stored as JPEG
* **When** Ana uploads `iphone.heic` on the **Pictures** page
* **Then** the picture's file name ends in `.jpg` and its `contentType` is `image/jpeg`

#### Scenario: An unreadable HEIC picture is refused
* **Given** Ana has a profile picture
* **When** she uploads `broken.heic` as her profile picture
* **Then** the response is `400` "This HEIC photo couldn't be read. Upload it as a JPG or PNG instead."
* **And** her current picture is kept and no new file is left in `images/people`

#### Scenario: Picture file pickers offer HEIC files
* **When** Ana opens the picture upload on Edit person, Edit organization, Edit trip, or the **Pictures** page
* **Then** the file picker accepts `.heic` / `.heif` files

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-96.1 | A HEIC document is stored as JPEG | `backend/tests/heic-to-jpeg.test.js` | `A HEIC document is stored as JPEG` |
| US-96.1 | A HEIC specialization file is stored as JPEG | `backend/tests/heic-to-jpeg.test.js` | `A HEIC specialization file is stored as JPEG` |
| US-96.1 | An unreadable HEIC document is refused | `backend/tests/heic-to-jpeg.test.js` | `An unreadable HEIC document is refused` |
| US-96.1 | Existing HEIC documents are converted on startup | `backend/tests/heic-to-jpeg.test.js` | `Existing HEIC documents are converted on startup` |
| US-96.1 | A leftover HEIC document shows a message instead of the image | `frontend/tests/PersonDocumentsView.test.js` | `A leftover HEIC document shows a message instead of the image` |
| US-96.2 | A HEIC profile picture, logo, and trip image are stored as JPEG | `backend/tests/heic-to-jpeg.test.js` | `A HEIC profile picture, logo, and trip image are stored as JPEG` |
| US-96.2 | A HEIC email picture is stored as JPEG | `backend/tests/heic-to-jpeg.test.js` | `A HEIC email picture is stored as JPEG` |
| US-96.2 | An unreadable HEIC picture is refused | `backend/tests/heic-to-jpeg.test.js` | `An unreadable HEIC picture is refused` |
| US-96.2 | Picture file pickers offer HEIC files | `frontend/tests/HeicPicturePickers.test.js` | `Picture file pickers offer HEIC files` |

---

## Agent implementation request

```text
Implement Feature 96 from @features/feature-96-heic-to-jpeg-on-upload.md on branch `feature/96-heic-to-jpeg-on-upload`.

Backend: add a helper (e.g. backend/app/utils/heicToJpeg.js) that detects HEIC by content (reuse the ftyp brand check from participantDocumentsPdf.js), name, or type, and converts with heic-convert (JPEG, quality 0.9).
- Documents: in personDocument.controller.js, before writeEncryptedFiles, convert each HEIC upload (document and specialization files): replace file.buffer with the JPEG and change file.filename's extension to .jpg (FR-001); on failure return 400 per FR-002 with nothing saved.
- Pictures: in config/multer.js, let imageFilter and emailPictureFilter accept HEIC (FR-006 messages). The logo, profile picture, and trip image uploads are written to disk by multer (imageExtension already names unknown types .jpg); convert the written file in place in the route upload handlers, or move them to memory storage — whichever is smaller. Email pictures are in memory: convert req.file.buffer and set the type to image/jpeg before the controller names and writes it. On failure return 400 per FR-005 and remove any written file.
- Startup: convert stored HEIC documents per FR-007 (called from server startup alongside ensureSchema), using the existing decrypt/encrypt helpers.
Use backend/tests/fixtures/tiny.heic in tests.
Frontend: remove heic2any from personDocumentServices.js view() and package.json; in PersonDocumentsCard.vue show the FR-008 message when the viewed file is HEIC. Add image/heic,image/heif,.heic,.heif to the accept lists in EditPersonDialog, AddOrganizationDialog, EditOrganizationDialog, AddTripDialog, EditTripDialog, EmailPicturesList, and RichTextEditor.
Tests per the Test Coverage Map. Update features/reference/behavior.md and features/reference/api.md.
```

---

## Definition of Done

*   [x] HEIC document uploads stored as JPEG per **FR-001**; unreadable HEIC refused per **FR-002**
*   [x] HEIC pictures accepted and stored as JPEG per **FR-004**–**FR-006**
*   [x] Existing HEIC documents converted on startup per **FR-007**
*   [x] Browser conversion removed and leftover message per **FR-008**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Keeping the original HEIC file
- Resizing or compressing images, or raising the upload size limits
- Converting other image types (e.g. PNG, GIF, or WebP to JPEG)
- Trip arrival PDFs and Trip Master CSV imports (not pictures)
