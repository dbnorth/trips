# Updated Document Processing

**Feature ID:** 120
**Branch pattern:** `feature/120-updated-document-processing`
**Status:** Implemented
**Created:** 2026-11-05
**Input:** "Create a spec for Updated Document Processing. On the Participant Document Review on the View document page: 1) Add the ability to edit the document data - add an edit button on the line with the document data. If clicked add a document update section with close and save buttons under that line but not a dialog so the document can still be viewed. 2) Add ability to request reload of document. Add a reload request that sends an email to the trip participant using a new Trip Email template. Add Email Type with reload request action as Send Now. Need to include in the email which document requesting reload of the document. On the user profile: 1) Once a document is reviewed it can't be reuploaded, edited or deleted by anyone. 2) It should be possible to upload the same document type more than once because documents expire. In trip status checks or display of what is needed for a trip: 1) When looking for a document to check for trip document requirements, if there are multiple documents of the same type for a participant the document with the most recent issue date or the expiration date furthest in the future should be used."

Today trip staff review a participant's documents in **Review documents** (Feature 104), but when something is wrong they can only leave it unreviewed and contact the person some other way; fixing a typo means the participant must edit it on their profile. Anyone who can edit a profile can also change or delete a document after it was reviewed, which silently clears the review. And when a person has more than one document of a type (an old and a renewed passport), every trip check passes if **any** of them qualifies. This feature lets staff fix a document or ask for a new file straight from the document viewer (with a **Send Now** email that names the document), locks reviewed documents, shows expired documents on the profile, and makes every trip check use one document per requirement: the newest one.

## Clarifications

### Session 2026-11-05

- Q: Which document counts when there are several of the same type? → A: For documents with an expiration date, the one expiring furthest in the future; for documents without, the one with the most recent issue date. Ties go to the most recent issue date, then the newest upload.
- Q: Reviewed documents vs. staff **Edit**? → A: Staff can untick **Reviewed** (as today) and then edit. Nobody can edit, re-upload, or delete a document while it is Reviewed (profile, Edit person, or the review page). The profile documents list keeps its **Reviewed** column and also shows when a document has expired.
- Q: What can staff change with **Edit**? → A: Everything the profile document form has: type, country issued, document number, issue date, expiration date, the file, and specializations.
- Q: What does **Request reload** do besides the email? → A: It unticks **Reviewed** and marks the document "Reload requested MM/DD/YYYY" (shown on the profile and in **Review documents**) until a new file is uploaded to it. Staff may add an optional note that goes in the email.
- Q: Who gets the reload email? → A: The person whose documents are being reviewed (the participant-list row's person, Trip Participant or Trip Leader). **Request reload** is on the document viewer of **Review documents**.

**Depends on:**
- [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md) / [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md) (person documents)
- [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md) (**Send Now** templates sent on events)
- [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md) (required specializations)
- [Feature 104 — Pre-Approved and Document Review](feature-104-pre-approved-document-review.md) (**Reviewed**, **Review documents**, approval blockers)
- [Feature 112 — Application and Profile Status Messages](feature-112-application-profile-status-messages.md) / [Feature 113 — Documents Missing Email](feature-113-documents-missing-email.md) (what a trip still needs)
- [Feature 115 — Document Expiration Check](feature-115-document-expiration-check.md) (expiration rule per type)
- [Feature 117 — Email Type Event Description](feature-117-email-type-event-description.md) (email type seed)

---

## User Stories

### US-120.1: Fix a document while looking at it

**As** trip staff reviewing a participant's documents
**I want** to edit a document's details right under the document I'm viewing
**So that** I can correct it against the file without closing the viewer or asking the participant

**Acceptance:** see Gherkin scenarios under US-120.1.

### US-120.2: Ask for a new file

**As** trip staff
**I want** to request that a participant reload a document, with an email that says which document
**So that** a bad or unreadable file gets replaced without a separate conversation

**Acceptance:** see Gherkin scenarios under US-120.2.

### US-120.3: Reviewed documents stay as reviewed

**As** an organization
**I want** a reviewed document to be locked, and expired documents to stand out on the profile
**So that** what staff approved can't change underneath them, and people know when to add a renewed document

**Acceptance:** see Gherkin scenarios under US-120.3.

### US-120.4: The newest document counts

**As** a participant who renewed a document
**I want** trip checks to use my newest document of a type
**So that** I can add a renewed passport without deleting the old one, and staff check the right one

**Acceptance:** see Gherkin scenarios under US-120.4.

---

## Requirements

### Functional Requirements

#### Edit on the review page

- **FR-001**: In **Review documents**, the document viewer (opened by **View** on a document) shows **Edit** (`data-testid="review-document-edit"`) on the line with the document data (document number / issue date / expiration date). While the document is **Reviewed**, **Edit** is disabled with the hint "Untick Reviewed to edit." (staff untick **Reviewed** in the list, as today). **Edit** is not shown in a specialization's viewer.
- **FR-002**: **Edit** opens a **document update section** (`data-testid="review-document-edit-section"`) inside the viewer, directly under the document-data line and above the file, not a dialog, so the file stays visible below it. It has the same fields and rules as the profile document form (Feature 4 / 22 / 34 / 57 / 59): **Document type** (the person's selectable types, as the profile form), **Country issued**, **Document number** (required when the type says so), **Issue date**, **Expiration date** (required when the type has one), **Replace file** (optional), and **Specializations** when the type allows them. It has **Close** (discards changes, hides the section) and **Save**.
- **FR-003**: **Save** sends the changes through a new trip-staff endpoint (FR-012). On success the section closes, the document-data line and the list behind the viewer show the new values, the viewer reloads the file when it was replaced, and "Document saved." shows in the viewer. Validation and server errors show in the section and keep it open. Saving follows the existing rule that changes leave the document unreviewed (Feature 104).

#### Request reload

- **FR-004**: The viewer also shows **Request reload** (`data-testid="review-document-reload"`) on the document-data line, enabled whether or not the document is Reviewed. It opens a **reload section** (`data-testid="review-document-reload-section"`) under the line (not a dialog; only one of the edit / reload sections is open at a time) with an optional **Note to participant** (multi-line, up to 1000 characters) and **Close** / **Send request**.
- **FR-005**: **Send request**:
  - sets the document's **Reviewed** to false and its `reloadRequestedAt` to now;
  - sends the **Document reload requested** event email (FR-007) to the person whose document it is, for the trip of the reviewed application;
  - closes the section and shows "Reload requested. Email sent to <first last>." in the viewer, or, when no email was sent (no matching template, the person has no email, or sending failed), "Reload requested. No email was sent." followed by "Add a Send Now template for the Document reload requested email type." when there was no template;
  - updates the list behind the viewer (Reviewed unticked, "Reload requested MM/DD/YYYY").
- **FR-006**: A document with a reload request shows "Reload requested MM/DD/YYYY" (`data-testid="document-reload-requested"`) in **Review documents** (on the document) and in the profile documents list (on its own full-width line directly below the document's row, so the table doesn't widen). It is cleared when a new file is uploaded to that document (profile, Edit person, or staff **Edit** with **Replace file**) or when staff tick **Reviewed** on it (`PUT …/documents/:documentId/reviewed` with `reviewed: true` sets `reloadRequestedAt` to `null` and returns it); other edits and unticking keep it.

#### Reload email

- **FR-007**: New email type (seeded by `npm run seed`, Feature 117 rules): type code `document-reload`, description **Document reload requested**, event code `document-reload-requested`, event description "This event happens when trip staff click Request reload on a document in Review documents. The email goes to the person whose document it is." Its templates use function code **Send Now** and are found as other Send Now emails: the trip's own template for the type, otherwise the organization's (no trip). Unlike other Send Now events, this one sends to the reviewed application's person whatever their trip role (Trip Participant or Trip Leader). The email is logged like other template emails (template, trip, participant). Sending never undoes the reload request. The template seed (`emailTemplates.json`, seed organization only) adds an organization **Send Now** template for the type: from `{{ORG_EMAIL}}`, to `{{PARTICIPANT_EMAIL}}`, subject "Please reupload your {{RELOAD_DOCUMENT_TYPE}}", and a body naming the trip, the document's specifics (`{{RELOAD_DOCUMENT}}`: type, issue date, expiration date), the note, and the trip leader's contact.
- **FR-008**: New email tokens (seeded):
  - `RELOAD_DOCUMENT` → value source `participant.reloadDocument` "Document to reload": the document's type description, then ", issued MM/DD/YYYY" when it has an issue date and ", expires MM/DD/YYYY" when it has an expiration date (e.g. "Passport, issued 03/14/2019, expires 03/13/2029"). The document number is never included.
  - `RELOAD_DOCUMENT_TYPE` → value source `participant.reloadDocumentType` "Document type to reload": the document's type description only (e.g. "Medical Doctor License (MD,DO)").
  - `RELOAD_NOTE` → value source `participant.reloadNote` "Reload request note": the staff note, or empty.
  
  All three are empty in every other email and in previews.

#### Reviewed documents are locked

- **FR-009**: While a person document is **Reviewed**, nobody can change it: `PUT` and `DELETE` `/trips/people/:id/documents/:documentId` return `400` "Reviewed documents can't be changed." for every caller (including System Admin), and the staff edit endpoint (FR-012) returns `400` "Untick Reviewed to edit this document.". Its specializations and their files are locked too. **View** and **Download** still work. Unticking **Reviewed** in **Review documents** (trip staff, as today) unlocks it.
- **FR-010**: The profile documents list (Profile and **Edit person**, `PersonDocumentsCard`) keeps its read-only **Reviewed** checkbox and, for a Reviewed document, hides **Edit** and **Delete** (keeps **View** and **Download**). A document whose expiration date is before today shows a red "Expired" chip (`data-testid="document-expired"`) after its expiration date. The list no longer has **Country issued** or **Document number** columns (both still in the document form); its columns are Type (bold), Issue date, Expiration date, Document, Reviewed, and actions.
- **FR-011**: A person may have any number of documents of the same type: **Add document** always offers every type, and the API accepts another document of a type the person already has (as today; this is now a stated rule so later work keeps it).

#### API

- **FR-012**: `PUT /trips/trip-people-roles/:id/documents/:documentId` (trip staff only, as the review endpoints; `403` "Forbidden."): updates the assignment's person's document with the same multipart body and rules as `PUT /trips/people/:id/documents/:documentId`; the document must belong to that person (`404` "Document not found."); Reviewed → `400` "Untick Reviewed to edit this document."; a new file clears `reloadRequestedAt`. Response: the updated document as in `GET /trips/people/:id/documents` (the viewer reloads the review list after saving).
- **FR-013**: `POST /trips/trip-people-roles/:id/documents/:documentId/reload-request` (trip staff only; same `403` / `404`). Body `{ note }` (optional, trimmed, up to 1000 characters, else `400` "Note must be 1000 characters or less."). Does FR-005's changes and email; response `{ id, reviewed: false, reloadRequestedAt, emailSent, templateFound }`.
- **FR-014**: Document lists that already return person documents (`GET /trips/people/:id/documents`, the review list `documentReview`) add `reloadRequestedAt` (ISO date-time or `null`). The review list's documents also add `documentTypeId`, `countryIssued`, and `current` (FR-017), and the review response adds `documentTypes` (the person's organizations' document types with `organization` and `specializations`), which **Edit** offers, because trip staff can't read the person's types through `GET /trips/document-types?personId=`.

#### Which document counts for a trip

- **FR-015**: For each trip document requirement (a worker role's required document type, the trip's **Passport**, and **Doctor Permission** when pregnant), the trip uses one **current document**: among the person's documents that match the requirement (same document type for role requirements; any type of Type **Passport** / **Doctor Permission** for those) and have a file,
  - when any of them has an expiration date: the one with the latest expiration date (documents without one come last);
  - otherwise: the one with the latest issue date (documents without one come last);
  - ties: the latest issue date, then the newest upload (highest id).
  
  When none has a file, the requirement is not met (as today).
- **FR-016**: Only the current document decides the requirement: its expiration rule for the trip (Feature 57 / 115, the Doctor Permission rules of Feature 102), its required specializations (Feature 59; no longer "the best of any qualifying document"), and, for approval, its **Reviewed**. Other documents of that type no longer satisfy it. This applies everywhere trip document requirements are checked or shown: **Approve App** blockers and **Review documents** (Feature 104), the application's and Trip Status missing items, the `upload-documents` next action (Feature 60 / 94 / 112), **Required documents** on Home (Feature 112), the `MISSING_DOCUMENTS` token and the `documents-missing` scheduled email (Feature 113), and the apply / edit application document warnings (frontend checks).
- **FR-017**: **Review documents** still lists every document of each requirement, with the current document first and marked "Used for this trip" (`data-testid="review-current-document"`); the others follow, newest first.
- **FR-018**: On the trip page's participants table, the **Review documents** row action (`data-testid="review-documents-action"`) is green when every trip document requirement of that participant has a current document that meets it and is **Reviewed** (the document part of the **Approve App** check, Feature 104). It is orange (Vuetify `warning`) when any requirement's current document is uploaded but not **Reviewed** (documents waiting for review). Otherwise (a requirement missing or failing with nothing to review, or no trip document requirements) it keeps its default color. `GET /trips/trips/:id/status` adds `documentsReviewed` and `documentsToReview` (booleans) to each participant; the table refreshes them when **Review documents** closes.

---

## Assumptions

- "Same type" for role requirements is the document type (`documentTypeId`); for Passport and Doctor Permission it is the Type kind, as those checks work today across an organization's types.
- Documents without a file are never the current document (they can't meet a requirement anyway). "A file for every profile document" still blocks approval as today.
- A newer document that isn't reviewed yet becomes the current one as soon as it has a file, so approval waits for it to be reviewed even if an older reviewed one is still valid.
- The Documents PDF (Feature 58) keeps listing every document.
- Staff **Edit** uses the same document types the profile form offers for that person.

## Edge Cases

- Reviewed document → **Edit** disabled; **Request reload** still works and unticks it.
- Reload request when the trip and organization have no **Document reload requested** Send Now template → the document is still marked and unreviewed; staff see "Reload requested. No email was sent. Add a Send Now template for the Document reload requested email type."
- Person without an email → marked and unreviewed; "Reload requested. No email was sent."
- Expired current document → the requirement isn't met (as today); adding a renewed document makes the renewed one current.
- Two documents with the same expiration date → the one with the later issue date, then the newer upload.
- Participant deletes an unreviewed reload-requested document and adds a new one → allowed (the old one wasn't Reviewed).

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No path (UI or API) changes or deletes a Reviewed person document.

---

## Data Ownership & Isolation

The staff endpoints use the existing trip-staff check of the review endpoints (Trip Leader of the trip, Org Admin of its organization, System Admin) and only reach documents of the assignment's person. The reload email goes only to that person.

---

## Key Entities

- `personDocument.reloadRequestedAt` (new).
- Email type `document-reload`; email tokens `RELOAD_DOCUMENT`, `RELOAD_DOCUMENT_TYPE`, `RELOAD_NOTE` (seeded).

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `PUT` | `/trips/trip-people-roles/:id/documents/:documentId` | New: staff edit of the assignment's person's document (FR-012) |
| `POST` | `/trips/trip-people-roles/:id/documents/:documentId/reload-request` | New: reload request and email (FR-013) |
| `PUT` / `DELETE` | `/trips/people/:id/documents/:documentId` | `400` "Reviewed documents can't be changed." for Reviewed documents (FR-009); a new file clears `reloadRequestedAt` |
| `GET` | `/trips/people/:id/documents`, review list | Add `reloadRequestedAt` (FR-014) |
| `GET` | `/trips/trips/:id/status` | Each participant adds `documentsReviewed` and `documentsToReview` (FR-018) |
| — | approval / next actions / missing items / my trip documents / `MISSING_DOCUMENTS` | Use the current document per requirement (FR-015, FR-016) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `ReviewDocumentsDialog` viewer | **Edit** and **Request reload** on the document-data line; inline edit / reload sections (FR-001 – FR-005) |
| `ReviewDocumentsDialog` list | "Used for this trip", "Reload requested MM/DD/YYYY" (FR-006, FR-017) |
| `PersonDocumentsCard` | No **Edit** / **Delete** for Reviewed; "Expired" chip; "Reload requested MM/DD/YYYY" line below the row; no Country issued or Document number column (FR-006, FR-010) |
| Apply / Edit application document warnings | Current document per requirement (FR-016) |
| `TripView` participants table | **Review documents** action green when all trip documents are reviewed, orange when any are waiting for review (FR-018) |

---

## Data Model Requirements

| Model | Field | Type | Rules |
|-------|-------|------|-------|
| `personDocument` | `reloadRequestedAt` | DATE | nullable; set by a reload request; cleared when a new file is uploaded to the document or it is marked Reviewed; added by `ensureSchema` |

---

## Acceptance Criteria (Gherkin)

Background:
- Lena is a Trip Leader of "Guatemala Clinic" (01/10/2027 – 01/20/2027) in Hope Missions.
- Pat has an application on the trip as Nurse; Nurse requires **RN License** (has an expiration date). The trip requires a Passport.
- Pat has the document "Passport" (issued 03/14/2019, expires 03/13/2029, file `passport.pdf`, not Reviewed).
- Hope Missions has a **Send Now** template for **Document reload requested** with subject "Please reload your {{RELOAD_DOCUMENT}}" and body "{{RELOAD_NOTE}}".

### US-120.1 — Fix a document while looking at it

#### Scenario: Staff edit a document under the viewer
* **Given** Lena opens **Review documents — Pat Lee** and clicks **View** on "Passport"
* **When** Lena clicks **Edit** on the document-data line
* **Then** an update section with **Close** and **Save** shows under that line and the file is still shown below it
* **When** Lena changes the expiration date to 03/12/2029 and clicks **Save**
* **Then** the section closes, the line shows "Expiration date: 03/12/2029", and "Document saved." shows
* **When** Lena clicks **Edit** again, changes the document number, and clicks **Close**
* **Then** the section closes and the document number is unchanged

#### Scenario: Reviewed documents can't be edited until unticked
* **Given** Pat's "Passport" is Reviewed
* **When** Lena views it
* **Then** **Edit** is disabled with "Untick Reviewed to edit."
* **And** `PUT /trips/trip-people-roles/<id>/documents/<passport id>` returns `400` "Untick Reviewed to edit this document."

### US-120.2 — Ask for a new file

#### Scenario: Request reload sends the email and marks the document
* **Given** Pat's "Passport" is Reviewed
* **When** Lena views it, clicks **Request reload**, enters "The photo page is blurry.", and clicks **Send request**
* **Then** Pat receives "Please reload your Passport, issued 03/14/2019, expires 03/13/2029" with "The photo page is blurry."
* **And** the viewer shows "Reload requested. Email sent to Pat Lee."
* **And** the Passport is no longer Reviewed and shows "Reload requested <today>" in **Review documents** and on Pat's profile
* **When** Pat uploads a new file to that Passport
* **Then** "Reload requested" is gone

#### Scenario: The seed adds a reload request template
* **Given** the seed organization "Health Talents International" and `npm run seed`
* **Then** it has a **Send Now** template for **Document reload requested**
* **When** Lena requests a reload of Pat's "Passport" with "The photo page is blurry."
* **Then** Pat receives "Please reupload your Passport" whose body names "Guatemala Clinic", "Passport, issued 03/14/2019, expires 03/13/2029", and the note

#### Scenario: Reload request without a template
* **Given** neither the trip nor Hope Missions has a **Document reload requested** Send Now template
* **When** Lena requests a reload of Pat's "Passport"
* **Then** the Passport shows "Reload requested <today>" and is not Reviewed
* **And** the viewer shows "Reload requested. No email was sent. Add a Send Now template for the Document reload requested email type."

#### Scenario: Marking a document Reviewed clears its reload request
* **Given** Pat's "Passport" shows "Reload requested"
* **When** Lena ticks **Reviewed** on it in **Review documents**
* **Then** "Reload requested" is gone from it in **Review documents** and on Pat's profile

#### Scenario: Only trip staff can edit or request reloads
* **When** Pat calls the staff edit or reload-request endpoint for their own application
* **Then** the response is `403` "Forbidden."

### US-120.3 — Reviewed documents stay as reviewed

#### Scenario: Reviewed documents are locked everywhere
* **Given** Pat's "Passport" is Reviewed
* **Then** Pat's profile documents list shows it Reviewed with **View** and **Download** but no **Edit** or **Delete**
* **And** `PUT` and `DELETE` `/trips/people/<Pat>/documents/<passport id>` return `400` "Reviewed documents can't be changed." for Pat and for a System Admin

#### Scenario: Expired documents are marked on the profile
* **Given** Pat also has an "RN License" that expired 01/31/2025
* **Then** Pat's profile documents list shows "Expired" after its expiration date
* **And** the Passport (expires 03/13/2029) shows no "Expired"

#### Scenario: Another document of the same type can be added
* **Given** Pat's "Passport" is Reviewed
* **When** Pat adds a second "Passport" (issued 02/01/2026, expires 01/31/2036, with a file)
* **Then** both Passports are listed on Pat's profile

#### Scenario: The trip page shows when every trip document is reviewed
* **Given** Pat's "Passport" is Reviewed and Pat has no "RN License"
* **When** Lena opens the trip page for "Guatemala Clinic"
* **Then** Pat's **Review documents** action is neither green nor orange
* **When** Pat uploads an "RN License" (expires 01/01/2030)
* **Then** Pat's **Review documents** action is orange
* **When** the RN License is marked Reviewed
* **Then** Pat's **Review documents** action is green

### US-120.4 — The newest document counts

#### Scenario: The document expiring last is used for the trip
* **Given** Pat has a Reviewed "Passport" expiring 03/13/2029 and an unreviewed "Passport" expiring 01/31/2036, both with files
* **When** Lena opens **Review documents — Pat Lee**
* **Then** the Passport expiring 01/31/2036 is first and marked "Used for this trip"
* **And** **Approve App** lists "Passport: not reviewed"
* **When** Lena marks it Reviewed
* **Then** the Passport no longer blocks approval

#### Scenario: An expired newer document doesn't fall back to an older one
* **Given** Pat has two "RN License" documents with files: one expiring 12/31/2026 (before the trip ends) issued 01/01/2025, and one with no expiration date entered issued 01/01/2020
* **Then** the RN License expiring 12/31/2026 is the current document
* **And** Pat's next actions list "RN License" as missing

#### Scenario: Without expiration dates the latest issue date is used
* **Given** a document type "Background check" without an expiration date is required, and Pat has two with files issued 05/01/2024 and 05/01/2026
* **Then** the one issued 05/01/2026 is the current document

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-120.1 | Staff edit a document under the viewer | `frontend/tests/UpdatedDocumentProcessing.test.js` | `Staff edit a document under the viewer` |
| US-120.1 | Staff edit a document under the viewer (API) | `backend/tests/updated-document-processing.test.js` | `Staff edit a document under the viewer` |
| US-120.1 | Reviewed documents can't be edited until unticked | `frontend/tests/UpdatedDocumentProcessing.test.js` | `Reviewed documents can't be edited until unticked` |
| US-120.1 | Reviewed documents can't be edited until unticked (API) | `backend/tests/updated-document-processing.test.js` | `Reviewed documents can't be edited until unticked` |
| US-120.2 | Request reload sends the email and marks the document | `backend/tests/updated-document-processing.test.js` | `Request reload sends the email and marks the document` |
| US-120.2 | Request reload sends the email and marks the document (UI) | `frontend/tests/UpdatedDocumentProcessing.test.js` | `Request reload sends the email and marks the document` |
| US-120.2 | The seed adds a reload request template | `backend/tests/updated-document-processing.test.js` | `The seed adds a reload request template` |
| US-120.2 | Reload request without a template | `backend/tests/updated-document-processing.test.js` | `Reload request without a template` |
| US-120.2 | Marking a document Reviewed clears its reload request | `backend/tests/updated-document-processing.test.js` | `Marking a document Reviewed clears its reload request` |
| US-120.2 | Only trip staff can edit or request reloads | `backend/tests/updated-document-processing.test.js` | `Only trip staff can edit or request reloads` |
| US-120.3 | Reviewed documents are locked everywhere | `backend/tests/updated-document-processing.test.js` | `Reviewed documents are locked everywhere` |
| US-120.3 | Reviewed documents are locked everywhere (UI) | `frontend/tests/UpdatedDocumentProcessing.test.js` | `Reviewed documents are locked everywhere` |
| US-120.3 | Expired documents are marked on the profile | `frontend/tests/UpdatedDocumentProcessing.test.js` | `Expired documents are marked on the profile` |
| US-120.3 | Another document of the same type can be added | `backend/tests/updated-document-processing.test.js` | `Another document of the same type can be added` |
| US-120.3 | The trip page shows when every trip document is reviewed (API) | `backend/tests/updated-document-processing.test.js` | `The trip page shows when every trip document is reviewed` |
| US-120.3 | The trip page shows when every trip document is reviewed (UI) | `frontend/tests/TripView.test.js` | `The trip page shows when every trip document is reviewed` |
| US-120.4 | The document expiring last is used for the trip | `backend/tests/updated-document-processing.test.js` | `The document expiring last is used for the trip` |
| US-120.4 | The document expiring last is used for the trip (UI) | `frontend/tests/UpdatedDocumentProcessing.test.js` | `The document expiring last is used for the trip` |
| US-120.4 | An expired newer document doesn't fall back to an older one | `backend/tests/updated-document-processing.test.js` | `An expired newer document doesn't fall back to an older one` |
| US-120.4 | Without expiration dates the latest issue date is used | `backend/tests/updated-document-processing.test.js` | `Without expiration dates the latest issue date is used` |

Existing tests that rely on "any qualifying document" (or on the best specialization match across several documents) are updated to FR-015 / FR-016. Feature 104's "Changing a reviewed document clears Reviewed" became "A reviewed document can be changed only after Reviewed is unticked (Feature 120)" in `backend/tests/pre-approved-document-review.test.js`.

---

## Agent implementation request

```text
Implement Feature 120 from @features/feature-120-updated-document-processing.md on branch `feature/120-updated-document-processing`.

Backend:
- personDocument.reloadRequestedAt (model + ensureSchema).
- One "current document" selector (FR-015) used by isRequiredRoleDocumentUploaded / missingRequiredRoleDocuments (missingSpecializationNames), isRequiredPassportUploaded, isDoctorPermissionUploaded, and approvalDocuments.js (current document first, "Used for this trip" flag); mirror it in frontend/src/utils/tripApplicationForm.js.
- personDocument.controller: PUT/DELETE refuse Reviewed documents (400 "Reviewed documents can't be changed."); a new file clears reloadRequestedAt; list adds reloadRequestedAt.
- tripPeopleRole.controller: PUT /trip-people-roles/:id/documents/:documentId (staff edit, refuses Reviewed) and POST .../reload-request (unreview, stamp, send event email document-reload-requested to the assignment's person with RELOAD_DOCUMENT / RELOAD_NOTE values).
- Seeds: email type document-reload; tokens RELOAD_DOCUMENT, RELOAD_DOCUMENT_TYPE, RELOAD_NOTE; a Send Now template for the seed organization in emailTemplates.json.
Frontend:
- ReviewDocumentsDialog viewer: Edit + Request reload on the details line; inline sections; list "Used for this trip" and "Reload requested".
- PersonDocumentsCard: hide Edit/Delete when Reviewed; Expired chip; Reload requested.
Tests per the Test Coverage Map. Update features/reference/ (behavior.md document review / email rows, api.md person documents and trip-people-roles rows, data-model.md personDocument and seeds).
```

---

## Definition of Done

*   [x] Staff **Edit** in the viewer per **FR-001** – **FR-003**
*   [x] **Request reload** per **FR-004** – **FR-006**
*   [x] Email type and tokens per **FR-007**, **FR-008**
*   [x] Reviewed documents locked per **FR-009**, **FR-010**
*   [x] Several documents of a type per **FR-011**
*   [x] Staff endpoints and `reloadRequestedAt` per **FR-012** – **FR-014**
*   [x] Current document per requirement per **FR-015** – **FR-017**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Participants requesting a review or messaging staff from the profile.
- Reload requests from anywhere other than the **Review documents** viewer, or for several documents at once.
- Changing the Documents PDF or who may view documents.
- Deleting or archiving old documents automatically when a newer one is added.
- Reminders for unanswered reload requests.
