# Pre-Approved Status and Document Review

**Feature ID:** 104
**Branch pattern:** `feature/104-pre-approved-document-review`
**Status:** Implemented
**Created:** 2026-10-31
**Input:** "Update the plan for status for participants. 1) Change the submitted status to Pre-Approved. The requirement to have enabled Submit button and the status changed to pre-approved is to complete all required information fields in application and profile except for required documents. 2) Ensure that the Approve status can't be set unless all the required documents have been submitted and each marked as reviewed. 3) Add the ability for team leader or Org Admin to check a reviewed box for all document submissions on a dialog that lists required documents for the trip accessible from an action icon on each participant line on the Trip View page. The review boolean can be stored with the participant document record. The readonly reviewed checkbox can be displayed for each document on the profile view of the document list."

Today an application becomes **Applied** (stored `applied`) automatically once the profile, the application, and every required document are complete, and staff can set **Approved** at any time without checking documents. This feature renames Applied to **Pre-Approved** (stored `pre_approved`) and lets an application reach it without documents; moves the document requirements to **Approved**, which also needs each required document to be **reviewed** by trip staff; and adds a **Review documents** dialog on the Trip View participant list where staff tick a **Reviewed** box on each required document. The applicant sees each document's Reviewed state, read-only, in her profile document list.

## Clarifications

### Session 2026-10-31

- Q: How should Applied become Pre-Approved? → A: Rename the stored value too: `applied` becomes `pre_approved` (label "Pre-Approved"), and existing applications are migrated.
- Q: Which documents must be uploaded and reviewed before Approved? → A: The trip's required documents for that participant: the worker role's required documents (with their required specializations), a passport when the trip has **Require Passport**, and a Doctor Permission document when she is pregnant and the trip requires one (Feature 102).
- Q: Today "a file for every profile document" also blocks Applied. Where does that rule go? → A: It moves to the Approve check: every profile document must have a file before Approved; documents that aren't trip requirements don't need reviewing.
- Q: If the participant changes a reviewed document, does Reviewed clear? → A: Yes, when its file, document type, number, country, dates, or specializations change.
- Q: Once Pre-Approved, how does the participant learn documents are still needed? → A: My Trips shows "Upload your documents: <missing>." instead of "Waiting on approval." while required documents are missing; the application still lists them.

### Session 2026-11-02

- Q: What status should the Trip Master import give participants? → A: Pre-Approved (follow-up request: "update the Trip Master import to set status to pre-approved"). A row with **App Received** "X" now imports as `pre_approved` instead of `approved`; staff approve after reviewing documents.
- Q: Follow-up request "on the participant home replace the actions on the trip line with icons with tool tips" — which buttons, and where is it specified? → A: The **My trips** and **Trips you can apply for** row buttons (not the My Trips next actions), specified here in Feature 104 (FR-016). This reverses Feature 81's exception for those two tables.

**Depends on:**
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md) (statuses, automatic `incomplete` / `applied`)
- [Feature 23 — Trip Require Passport](feature-23-trip-require-passport.md), [Feature 25 — Worker Role Required Documents](feature-25-worker-role-required-documents.md), [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md), [Feature 102 — Doctor Permission Document When Pregnant](feature-102-pregnancy-doctor-permission.md) (the document requirements that move to Approved)
- [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md) (participant status on import; replaces its FR-008 status rule)
- [Feature 81 — Row Action Icons with Tooltips](feature-81-row-action-icons.md) (`RowAction`; FR-016 ends its labeled-button exception for Home's trip rows)
- [Feature 28 — View Trip Status](feature-28-view-trip-status.md), [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md), [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md), [Feature 67 — Two-Column Trip Dialogs](feature-67-two-column-trip-dialogs.md) (status shown or used)

---

## User Stories

### US-104.1: Applications are Pre-Approved without documents

**As an** applicant
**I want** to submit my application once my profile and application are complete, before my documents are in
**So that** my place is held while I gather documents

**Acceptance:** see Gherkin scenarios under US-104.1.

### US-104.2: Approval needs uploaded, reviewed documents

**As** trip staff (Trip Leader, Org Admin, System Admin)
**I want** Approved to be possible only once every required document is uploaded and reviewed
**So that** no one is approved on documents nobody has checked

**Acceptance:** see Gherkin scenarios under US-104.2.

### US-104.3: Staff review a participant's required documents

**As** a Trip Leader or Org Admin
**I want** to open a participant's required documents from the Trip View participant list and tick each as reviewed
**So that** I can record that I've checked them

**Acceptance:** see Gherkin scenarios under US-104.3.

---

## Requirements

### Functional Requirements

**Pre-Approved status**

- **FR-001**: The application status `applied` is renamed `pre_approved`, shown as **Pre-Approved** everywhere a status is shown (Trip View, Trip Status, application dialogs, Home / My Trips, reserved-email rows, filters). The status list is `incomplete`, `pre_approved`, `approved`, `declined`, `cancelled`. Everything that treats `applied` today treats `pre_approved` the same way: role capacity (occupies a slot), roster and Flights / Rooming / Team email participant lists, donations, travel details, scheduled emails, uncancel, and **Unapprove** (back to Pre-Approved). On startup `ensureSchema` adds `pre_approved` to the column, changes every `applied` application to `pre_approved`, then removes `applied`. The API no longer accepts `applied` (`400` with the existing invalid status message).
- **FR-002**: The **application-submitted** event email keeps its code and now sends when an application is created `pre_approved` or goes from `incomplete` to `pre_approved` (Feature 45); organizations' templates for it keep working.
- **FR-003**: An application is set to `pre_approved` automatically when the profile is complete and every required application field is filled in — the same rule as today's Applied **without** any document check (every profile document having a file, worker role required documents and specializations, Require Passport, Doctor Permission). Otherwise it is `incomplete`. This is worked out wherever the status is worked out today (apply, update application, staff edits, uncancel; never automatically `approved`).
- **FR-004**: **Apply** and **Edit application**: **Submit Application** is enabled, and saving makes the application Pre-Approved, once FR-003 is met, even when documents are missing. The missing-document warnings still show (as information, not blocking), and the Save Incomplete checklist no longer lists document items. When the application is already Pre-Approved, the button reads **Update Application** instead of **Submit Application** (still **Save Incomplete Application** when something required is missing).

**Approval**

- **FR-005**: A participant's **approval documents** are:
  - every person document on her profile has an uploaded file;
  - for each document requirement of the trip — each document type required by her worker role (with the role's required specializations for it, Feature 59), a passport when the trip has **Require Passport**, and a Doctor Permission document when she is pregnant and the trip requires one (Feature 102) — at least one of her documents meets it under today's rules (file, expiration for the trip, specializations) **and is marked Reviewed**.
- **FR-006**: Changing an application's status **to** `approved` — **Approve** in the application dialog, the participant **Edit** dialog, or `POST` / `PUT /trips/trip-people-roles` — is refused unless FR-005 is met: `400` "Upload and review all required documents before approving." and nothing is saved. An application that is already `approved` stays approved, and saving it unchanged is not refused. Declined and Cancelled can be set as today.
- **FR-007**: The **Approve application** dialog (**Approve App**) shows, when FR-005 is not met, an info alert "Before approving, these documents need to be uploaded and reviewed:" listing each unmet item — "<requirement>: not uploaded", "<requirement>: not reviewed", or "A file for every profile document" — and **Approve** is disabled. The participant **Edit** dialog shows the FR-006 message when its save is refused.

**Document review**

- **FR-008**: A person document has **Reviewed** (`reviewed`, default false). New documents start not reviewed. When the document's file, document type, document number, country issued, issue date, expiration date, or specializations change (by the person or staff, through the existing document update), Reviewed is cleared.
- **FR-009**: The Trip View participant list has a **Review documents** row action (icon `mdi-checkbox-marked-circle-outline`) on every participant row with a person, for trip staff (Trip Leader of the trip, Org Admin of the trip's organization, System Admin). It opens **Review documents — <participant name>**, which shows "Role: <worker role>" (the role she signed up for, "—" when none) and lists each of the participant's document requirements (FR-005: worker role required documents, then passport, then Doctor Permission). Under each requirement, each of her documents of that type: description, document number (when any), "expires MM/DD/YYYY" (when any), **View** (opens the file in a dialog with a close button and **Close**, as on the profile document list — PDF or image preview, otherwise "This file type can't be previewed in the browser." — showing above the file "Document number: …" when the type requires a number, "Issue date: MM/DD/YYYY", and "Expiration date: MM/DD/YYYY" when the type has an expiration date, "—" when blank), and a **Reviewed** checkbox; when the role requires specializations for that document type (Feature 59), each document also lists, under "Required specializations", a spot per required specialization — its name, the specialization date and **View** (the specialization's file in the same viewer, titled "<document> — <specialization>" with "Specialization date: MM/DD/YYYY") when she has added it, otherwise "Not added". A requirement with no document shows "Not uploaded". A document without a file shows "No file" and its Reviewed checkbox is disabled. When any profile document has no file, the dialog also shows "Some profile documents have no file." With no requirements it shows "This trip has no required documents for <first name>." 
- **FR-010**: Ticking or unticking **Reviewed** saves straight away (no Save button) and shows an error in the dialog if refused. It doesn't change the application status by itself; the status is checked when staff approve (FR-006). Closing the dialog refreshes the participant list.
- **FR-011**: Only trip staff of a trip where the person has an application (any status) may read the review list or change Reviewed; anyone else gets `403` "Forbidden.". The person can't change Reviewed on her own documents. Reviewed belongs to the document, so it counts on every trip that requires that document, including other organizations' trips.

**Profile and My Trips**

- **FR-012**: The profile documents list (**Documents** on **Update profile** / **Edit person**) has a **Reviewed** column with a read-only checkbox for each document.
- **FR-013**: My Trips next actions (Feature 60): a `pre_approved` application with unmet FR-005 items other than reviewing (a missing file, or a requirement with no qualifying document) shows "Upload your documents: <names>." (code `upload-documents` with `missingDocuments`, the same names as **Complete your application.** uses today); otherwise "Waiting on approval.". An `incomplete` application shows **Complete your application.** while any non-document item is missing (still listing missing documents), and **Submit your application.** once only documents (or nothing) are missing.
- **FR-014**: Trip Status missing items (Feature 28) keep listing document items for applications that aren't approved, so staff see what's still needed for approval.

**Trip Master import**

- **FR-015**: The Trip Master import (Feature 80 FR-008) adds a main-section **Trip Participant** as `pre_approved` when **App Received** is "X" (any case), instead of `approved`; otherwise `incomplete` as before. The status is set from the column, as today, not worked out from the profile (FR-003). Unchanged: "Team Leader" rows are approved Trip Leaders, cancellations are `cancelled`, and an existing application on the trip keeps its status.

**Participant Home row actions**

- **FR-016**: On the participant Home, the row buttons of **My trips** and **Trips you can apply for** become icons with tooltips (Feature 81 `RowAction`; the tooltip and accessible name are today's button text): **View** `mdi-eye`; **Update App** `mdi-file-edit-outline` / **Manage App** `mdi-file-cog-outline` (primary); **Cancel App** `mdi-cancel` (red); **Uncancel** `mdi-restore` (primary); **Apply** / **Apply for Reserved** `mdi-file-send-outline` (primary). When each shows and what it does are unchanged. The My Trips next-action buttons stay labeled.

---

## Assumptions

- Approving doesn't also require the application to be Pre-Approved; as today, staff may approve from the participant **Edit** dialog, now subject to FR-006.
- FR-006 applies to applications, not to **Trip Leader** rows: staff adding or editing an approved Trip Leader (and the Trip Master import's Team Leader rows) aren't refused.
- Already-approved applications are not re-checked when this ships, and stay approved if a document later changes.
- Existing `incomplete` applications that are only missing documents become Pre-Approved the next time they are saved.
- Existing documents start not reviewed.

## Edge Cases

- A requirement met by two documents (e.g. two passports): one reviewed qualifying document is enough.
- A reviewed document that no longer qualifies (expires before the trip end) doesn't count; another qualifying document must be uploaded and reviewed.
- Staff untick Reviewed on an approved participant's document → she stays approved; **Approve** would be refused if she were unapproved and approved again.
- A worker role with no required documents, on a trip without Require Passport, for a participant who isn't pregnant → only "a file for every profile document" is needed to approve.
- The participant changes her worker role → the requirements in the dialog and the approval check follow the new role.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No application can become `approved` while a required document is missing or unreviewed.
- **SC-003**: No `applied` status remains after startup; every former Applied application shows Pre-Approved.

---

## Data Ownership & Isolation

Review access follows trip staff access ([Feature 69](feature-69-staff-only-participant-data.md)): Trip Leader of the trip, Org Admin of the trip's organization, System Admin — and only for people with an application on that trip. Document files keep [Feature 4](feature-4-document-types-and-person-documents.md) access; because a Trip Leader can't use the person document view, **View** in the dialog uses a trip-staff view of the same file, limited to the application's person.

---

## Key Entities

- **TripPeopleRole** (application) — `status` ENUM gains `pre_approved` and loses `applied`.
- **PersonDocument** — gains `reviewed`.
- **DocumentType**, **WorkerRole** required documents, **Trip** `requirePassport` — define the requirements.

---

## API Requirements

| Method | Endpoint | Change |
|--------|----------|--------|
| all | Application status in responses and request bodies | `pre_approved` replaces `applied` (FR-001); `applied` → `400` invalid status |
| `POST` / `PUT` | `/trips/trip-people-roles`, `/trips/trip-people-roles/:id` | `400` "Upload and review all required documents before approving." when changing to `approved` without FR-005 (FR-006) |
| `GET` | `/trips/trip-people-roles/:id/document-review` | **New.** Trip staff. `{ workerRoleName, requirements: [{ key, label, requiredSpecializations: [{ id, name }], documents: [{ id, description, documentNumber, issueDate, expirationDate, documentNumberRequired, hasExpirationDate, hasFile, reviewed, qualifies, specializations: [{ id, documentTypeSpecializationId, name, date, hasFile }] }] }], allDocumentsHaveFiles, approvalBlockers: [string] }` (FR-005, FR-007, FR-009) |
| `PUT` | `/trips/trip-people-roles/:id/documents/:documentId/reviewed` | **New.** Trip staff. Body `{ reviewed: boolean }`; the document must belong to the application's person (`404` "Document not found."); a document without a file → `400` "Upload a file before marking it reviewed."; returns `{ id, reviewed }` (FR-010, FR-011) |
| `GET` | `/trips/trip-people-roles/:id/documents/:documentId/view` | **New.** Trip staff. Inline view of the application's person's document file for **View** in the dialog (`404` "Document not found." when it isn't hers) (FR-009) |
| `GET` | `/trips/trip-people-roles/:id/documents/:documentId/specializations/:specializationId/view` | **New.** Trip staff. Inline view of one of that document's specialization files (`404` "Specialization not found." when it isn't on the document) (FR-009) |
| `GET` | `/trips/people/:id/documents` | Each document adds `reviewed` (FR-012) |
| `PUT` | `/trips/people/:id/documents/:documentId` | Clears `reviewed` when the FR-008 fields change; `reviewed` in the body is ignored |
| `GET` | `/trips/trips/browse/mine`, `/trips/trips/browse/:id` | Next action `upload-documents` with `missingDocuments` (FR-013) |
| `POST` | `/trips/trips/:id/import-trip-master` | **App Received** "X" participants are added `pre_approved` (FR-015); response unchanged |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| Status labels everywhere | **Pre-Approved** instead of **Applied** (FR-001) |
| `ApplyTripDialog` / `EditTripApplicationView` | Submit enabled without documents; document warnings informational; checklist without document items (FR-004) |
| `ViewTripApplicationDialog` (**Approve App**) | FR-007 alert and disabled **Approve**; **Unapprove** → Pre-Approved |
| Participant **Edit** dialog | Shows the FR-006 message when refused |
| `TripView` participant row | **Review documents** action opening the review dialog (FR-009, FR-010) |
| New `ReviewDocumentsDialog` | Requirements, documents, **View**, **Reviewed** checkboxes (FR-009, FR-010) |
| `PersonDocumentsCard` | Read-only **Reviewed** column (FR-012) |
| Home / My Trips | "Upload your documents: <names>." (FR-013) |

---

## Data Model Requirements

### `tripPeopleRole` (delta)

| Field | Type | Rules |
|-------|------|--------|
| status | ENUM(`incomplete`,`pre_approved`,`approved`,`declined`,`cancelled`) | `ensureSchema` adds `pre_approved`, updates `applied` → `pre_approved`, then drops `applied` |

### `personDocument` (delta)

| Field | Type | Rules |
|-------|------|--------|
| reviewed | BOOLEAN | required, default `false`; cleared on FR-008 changes; set only through the review endpoint |

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Mission" runs trip "Guatemala Clinic 2027" (2027-03-01 to 2027-03-10) with **Require Passport**.
- Its worker role "Nurse" requires the document type "RN Licence".
- Ana Lopez has a complete profile and applies as a Nurse. Omar Diaz is the trip's Trip Leader.

### US-104.1 — Applications are Pre-Approved without documents

#### Scenario: Existing Applied applications become Pre-Approved
* **Given** an application stored with status `applied` before this feature
* **When** the server starts
* **Then** the application's status is `pre_approved`
* **And** the Trip View shows its status as "Pre-Approved"

#### Scenario: An application without documents is Pre-Approved
* **Given** Ana has no passport and no RN Licence
* **When** she submits her otherwise complete application
* **Then** the application is `pre_approved`
* **And** the application-submitted event email is sent

#### Scenario: Submit is enabled while documents are missing
* **Given** Ana's profile and application fields are complete and she has no documents
* **When** she opens **Apply**
* **Then** **Submit Application** is shown
* **And** the passport warning still shows (the Apply warning names one problem at a time, so the RN Licence warning follows once a passport is on file)

#### Scenario: Updating a Pre-Approved application says Update Application
* **Given** Ana's application is `pre_approved` and still complete
* **When** she opens it to update it
* **Then** the button reads **Update Application**, not **Submit Application**

#### Scenario: My Trips tells a Pre-Approved participant to upload documents
* **Given** Ana's application is `pre_approved` and she has no passport
* **When** she opens My Trips
* **Then** her next action is "Upload your documents: Passport; RN Licence." (the names as **Complete your application.** lists them)

#### Scenario: The Trip Master import adds received applications as Pre-Approved
* **Given** a Trip Master CSV with a Nurse row for Ana marked **App Received** "X", a Nurse row for Kris Smith with **App Received** blank, and a "Team Leader" row for Omar
* **When** trip staff import it into "Guatemala Clinic 2027"
* **Then** Ana is a Trip Participant with status `pre_approved`
* **And** Kris is a Trip Participant with status `incomplete`
* **And** Omar is an approved Trip Leader

### US-104.2 — Approval needs uploaded, reviewed documents

#### Scenario: Approve is refused until required documents are uploaded and reviewed
* **Given** Ana's application is `pre_approved` and she has uploaded a passport and an RN Licence, neither reviewed
* **When** Omar approves her application through the API
* **Then** the response is `400` "Upload and review all required documents before approving."
* **And** the application is still `pre_approved`
* **When** both documents are marked Reviewed and Omar approves again
* **Then** the application is `approved`

#### Scenario: Approve App explains what is missing
* **Given** Ana's application is `pre_approved`, her passport is uploaded but not reviewed, and she has no RN Licence
* **When** Omar opens **Approve App** for her
* **Then** the dialog lists "Passport: not reviewed" and "RN Licence: not uploaded"
* **And** **Approve** is disabled

### US-104.3 — Staff review a participant's required documents

#### Scenario: Staff review documents from the Trip View
* **Given** Ana has uploaded a passport and an RN Licence
* **When** Omar clicks **Review documents** on Ana's row on the Trip View
* **Then** the dialog lists "RN Licence" and "Passport" with Ana's documents, each with **View** and an unticked **Reviewed**
* **When** he ticks **Reviewed** on both
* **Then** both documents are saved as reviewed

#### Scenario: The review shows the role and the licence's required specializations
* **Given** the Nurse role requires the RN Licence specializations "Pediatrics" and "Emergency"
* **And** Ana's RN Licence has Pediatrics added (dated 04/15/2024, with a file)
* **When** Omar opens **Review documents** for Ana
* **Then** the dialog shows "Role: Nurse"
* **And** under her RN Licence, "Emergency" shows "Not added" and "Pediatrics · 04/15/2024" shows **View**, which opens its file

#### Scenario: Home trip rows use icons with tooltips
* **Given** Ana has a Pre-Approved application, an approved application, and a cancelled application, and a trip she can apply for
* **When** she opens Home
* **Then** each **My trips** row shows **View**, then **Update App** (Pre-Approved) or **Manage App** (approved, cancelled), then **Cancel App** or **Uncancel**, as icons with those labels as tooltips
* **And** the **Trips you can apply for** row shows **View** and **Apply** as icons
* **And** clicking **Update App** opens her application

#### Scenario: Only trip staff can mark documents reviewed
* **Given** Ana has an uploaded passport
* **When** Ana, or a Trip Leader of another trip, marks it reviewed through the API
* **Then** the response is `403` "Forbidden."

#### Scenario: Changing a reviewed document clears Reviewed
* **Given** Ana's passport is reviewed
* **When** she replaces its file
* **Then** the passport is no longer reviewed

#### Scenario: The profile document list shows Reviewed read-only
* **Given** Ana's passport is reviewed and her RN Licence is not
* **When** she opens **Documents** on her profile
* **Then** the passport row's **Reviewed** checkbox is ticked and the RN Licence row's is not
* **And** neither checkbox can be changed

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-104.1 | Existing Applied applications become Pre-Approved | `backend/tests/pre-approved-document-review.test.js` | `Existing Applied applications become Pre-Approved` |
| US-104.1 | An application without documents is Pre-Approved | `backend/tests/pre-approved-document-review.test.js` | `An application without documents is Pre-Approved` |
| US-104.1 | Submit is enabled while documents are missing | `frontend/tests/PreApprovedDocumentReview.test.js` | `Submit is enabled while documents are missing` |
| US-104.1 | Updating a Pre-Approved application says Update Application | `frontend/tests/PreApprovedDocumentReview.test.js` | `Updating a Pre-Approved application says Update Application` |
| US-104.1 | My Trips tells a Pre-Approved participant to upload documents | `backend/tests/pre-approved-document-review.test.js` | `My Trips tells a Pre-Approved participant to upload documents` |
| US-104.1 | The Trip Master import adds received applications as Pre-Approved | `backend/tests/pre-approved-document-review.test.js` | `The Trip Master import adds received applications as Pre-Approved` |
| US-104.2 | Approve is refused until required documents are uploaded and reviewed | `backend/tests/pre-approved-document-review.test.js` | `Approve is refused until required documents are uploaded and reviewed` |
| US-104.2 | Approve App explains what is missing | `frontend/tests/PreApprovedDocumentReview.test.js` | `Approve App explains what is missing` |
| US-104.3 | Staff review documents from the Trip View | `frontend/tests/PreApprovedDocumentReview.test.js` | `Staff review documents from the Trip View` |
| US-104.3 | The review shows the role and the licence's required specializations | `backend/tests/pre-approved-document-review.test.js`, `frontend/tests/PreApprovedDocumentReview.test.js` | `The review shows the role and the licence's required specializations`; `Staff review documents from the Trip View` |
| US-104.3 | Home trip rows use icons with tooltips | `frontend/tests/HomeNextActions.test.js` | `Home trip rows use icons with tooltips` |
| US-104.3 | Only trip staff can mark documents reviewed | `backend/tests/pre-approved-document-review.test.js` | `Only trip staff can mark documents reviewed` |
| US-104.3 | Changing a reviewed document clears Reviewed | `backend/tests/pre-approved-document-review.test.js` | `Changing a reviewed document clears Reviewed` |
| US-104.3 | The profile document list shows Reviewed read-only | `frontend/tests/PreApprovedDocumentReview.test.js` | `The profile document list shows Reviewed read-only` |

The "Pre-Approved" label on the Trip View (first scenario's last step) is covered in `frontend/tests/PreApprovedDocumentReview.test.js` under `Existing Applied applications become Pre-Approved`. Existing tests that use `applied` are updated to `pre_approved`, and those that expect documents to block Applied now expect Pre-Approved. `backend/tests/trip-master-import.test.js` expects its **App Received** "X" participants as `pre_approved` (its Team Leader stays `approved`).

Superseded tests, rewritten to check the approval rule instead of the automatic status: `backend/tests/applications.test.js` (Features 7, 23, 25) — `Approval waits until all documents are uploaded`, `Approval waits until the role-required document is uploaded and reviewed`, `Approval waits until all role-required documents are uploaded`, `Approval waits until the passport is uploaded when required`; `backend/tests/document-type-specialization-list.test.js` (Feature 59) — `Approval waits until the required specialization is added`; `backend/tests/doctor-permission.test.js` (Feature 102) — `Approval waits until a pregnant applicant's Doctor Permission document is uploaded`, its expiration tests now approve, and the My Trips test expects `upload-documents`. Frontend Apply tests (Features 47, 94, 102) expect the "… before your application can be approved." wording, and no document items in the Submit checklist (FR-004); `RowActionIcons.test.js` (Feature 81) lists **Review documents** after **View App**. `backend/tests/trips.test.js` (Copy Trip) creates its approved participant directly, since its trip requires a passport.

---

## Agent implementation request

```text
Implement Feature 104 from @features/feature-104-pre-approved-document-review.md on branch `feature/104-pre-approved-document-review`.

Backend: rename status `applied` → `pre_approved` (TRIP_PARTICIPANT_STATUSES, ensureSchema migration, every `applied` reference, eventEmails map); drop document checks from the automatic status (tripParticipantApplicationStatus.js); add the approval-documents check (FR-005) and refuse changes to `approved` without it (tripPeopleRole.controller.js); add personDocument.reviewed (model + ensureSchema), clear it on FR-008 changes (personDocument.controller.js); add GET /trip-people-roles/:id/document-review and PUT /trip-people-roles/:id/documents/:documentId/reviewed; add the upload-documents next action (myTripNextActions.js); Trip Master import: App Received "X" → `pre_approved` (tripMasterImport.controller.js).
Frontend: Pre-Approved label and every `applied` reference; Apply/Edit submit without documents; Approve App alert and disabled Approve; ReviewDocumentsDialog and the Review documents row action on TripView; read-only Reviewed column in PersonDocumentsCard; upload-documents next action on Home.
Tests per the Test Coverage Map; update existing tests for the rename and the moved document rules. Update features/reference/ (behavior, api, data-model).
```

---

## Definition of Done

*   [x] **Pre-Approved** status per **FR-001**–**FR-004**
*   [x] Approval check per **FR-005**–**FR-007**
*   [x] Document review per **FR-008**–**FR-011**
*   [x] Profile and My Trips per **FR-012**–**FR-014**
*   [x] Trip Master import status per **FR-015**
*   [x] Home trip row icons per **FR-016**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Recording who reviewed a document or when.
- Reviewing documents that aren't trip requirements.
- Emails when documents are reviewed or approval is refused.
- Re-checking or un-approving already-approved applications.
- Renaming the **application-submitted** email type.
