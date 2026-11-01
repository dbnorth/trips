# Doctor Permission Document When Pregnant

**Feature ID:** 102
**Branch pattern:** `feature/102-pregnancy-doctor-permission`
**Status:** Implemented
**Created:** 2026-10-31
**Input:** "create spec to require Doctor Permission document if Pregnant is yes."

Today a female applicant who answers **Are you pregnant?** Yes must give a due date and sees the message "You must provide a document from your doctor that says it is safe for you to travel on the trip dates.", but nothing checks that the document was uploaded. This feature adds a **Doctor Permission** document type Type and, when the trip's organization has a document type of that Type, keeps a pregnant applicant's application **Incomplete** until she has an uploaded Doctor Permission document, the same way **Require Passport** works for passports.

## Clarifications

### Session 2026-10-31

- Q: How does the app know which document is the Doctor Permission document? → A: Add **Doctor Permission** to the document type **Type** list (like Passport); each organization creates a document type with that Type.
- Q: What counts as a valid Doctor Permission document? → A: An uploaded file; the expiration date is checked (past the trip end) only when the document type has an expiration date.
- Q: What if the trip's organization has no Doctor Permission document type? → A: The requirement is skipped for that organization (message only, as today).
- Q: Where does a pregnant applicant upload the document? → A: On the application itself, right under **Are you pregnant?**; the upload is saved to her profile documents.
- Q: What expiration date does the application's upload get? → A: The trip end date, set automatically (not shown in the dialog), stored whatever the type's Has Expiration Date setting; the document counts for any trip ending on or before it, and a trip ending later needs a new one.

**Depends on:**
- [Feature 19 — Pregnancy Health Questions](feature-19-pregnancy-health-questions.md) (**Are you pregnant?**, due date, doctor message)
- [Feature 23 — Trip Require Passport](feature-23-trip-require-passport.md) (pattern for a document gate on `applied`)
- [Feature 57 — Document Type Has Expiration Date](feature-57-document-type-expiration-date.md) (expiration checked only when the type has one)
- [Feature 91 — Document Types by Organization](feature-91-org-document-types.md) (types belong to an organization)
- [Feature 28 — View Trip Status](feature-28-view-trip-status.md) (staff missing items), [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md) (applicant missing documents)

---

## User Stories

### US-102.1: Staff set up a Doctor Permission document type

**As an** Org Admin or System Admin
**I want** to mark a document type as **Doctor Permission**
**So that** the app knows which document a pregnant applicant must upload

**Acceptance:** see Gherkin scenarios under US-102.1.

### US-102.2: Pregnant applicants must upload a Doctor Permission document

**As** trip staff
**I want** a pregnant applicant's application to stay Incomplete until her Doctor Permission document is uploaded
**So that** no one who is pregnant reaches Applied without her doctor's permission on file

**Acceptance:** see Gherkin scenarios under US-102.2.

---

## Requirements

### Functional Requirements

- **FR-001**: The document type **Type** list gains **Doctor Permission** (stored value `doctor_permission`), after the existing choices. The document type form, the **Document types** list **Type** column, and the API accept and show it like the other Types.
- **FR-002**: A trip **requires a Doctor Permission document when pregnant** when the trip's organization has at least one document type whose Type is Doctor Permission. A trip whose organization has none does not; there, a pregnant applicant sees only today's doctor message and no new gate.
- **FR-003**: When the trip requires it (FR-002) and the application's **Are you pregnant?** is Yes, the application stays `incomplete` until the applicant has at least one person document whose type's Type is Doctor Permission, with an uploaded file, that is good for the trip: a document with an expiration date counts when it expires on or after the trip's document compare date (trip end, or trip start when there is no end), so it counts for any trip ending on or before it; a document without an expiration date counts only when its type has no expiration date. A Doctor Permission document of any organization's type counts.
- **FR-004**: The check in FR-003 applies everywhere the application status is worked out today with the Require Passport check: apply, update application, staff edits of the application, and cancel / uncancel. As with passports, the status is re-checked when the application is saved (uploading the document does not by itself change the status).
- **FR-005**: An answer of No (or a cleared answer for a non-female applicant) never requires a Doctor Permission document.
- **FR-006**: **Apply** and **Edit application**: while FR-003 is not met, the application is not ready to submit and the info alert shows "Upload a Doctor Permission document before submitting your application." When any of the trip organization's Doctor Permission types has an expiration date, the message reads "Upload a Doctor Permission document with an expiration date on or after the end of the trip (MM/DD/YYYY) before submitting your application." (trip end date, as the passport message). The existing doctor message under **Are you pregnant?** ("You must provide a document from your doctor that says it is safe for you to travel on the trip dates.") shows while FR-003 is not met and is hidden once it is (e.g. right after the upload in FR-009); on a trip that doesn't require the document (FR-002) it always shows, as today. The Save Incomplete checklist lists "Doctor Permission document".
- **FR-007**: **Trip Status** missing items list "Doctor Permission document" for an application missing it, and **My Trips** next actions ("Complete your application.") list "Doctor Permission" among the missing documents.
- **FR-008**: The browse trip detail used by **Apply** / **Edit application** tells the client whether the trip requires a Doctor Permission document when pregnant (FR-002) and whether any of those types has an expiration date, so the client can gate and word the message without loading the organization's document types.
- **FR-009**: **Apply** and **Edit application**: when the trip requires it (FR-002) and **Are you pregnant?** is Yes, a **Doctor Permission document** area appears right under the existing doctor message (where that message shows, FR-006):
  - When FR-003 is not met, it shows **Upload Doctor Permission document**. The button opens the same document dialog as the profile documents card, with **Document type** limited to the trip organization's Doctor Permission types (the first one chosen). The dialog does not show **Expiration date**; other fields are as that dialog asks today.
  - Saving uploads the document to the applicant's own profile documents through the existing person document upload, with the trip's end date (start date when there is no end) as its expiration date — whether or not the type has an expiration date. The person document upload keeps a sent expiration date for Doctor Permission types even when the type has no expiration date. The dialog closes and the application shows the document and re-checks whether it is ready to submit without reloading.
  - The area lists the Doctor Permission documents on file that are good for the trip (FR-003): a check mark, "<type description> uploaded", "expires MM/DD/YYYY" when it has an expiration date, and **View**.
  - The document is not attached to the application; it stays on her profile like any other person document, so it counts for her later trips that end on or before its expiration date. A trip ending later needs a new one.

---

## Assumptions

- Staff create the Doctor Permission document type themselves (one per organization, any description, e.g. "Doctor clearance letter"); none is created automatically.
- The applicant uploads the document on the application (FR-009); she can also add or replace it from her profile documents as with any other document.
- Existing applications are not re-checked when this ships; each is re-checked the next time it is saved.

## Edge Cases

- Pregnant applicant has a Doctor Permission document with no file → incomplete.
- The document expires before the trip end → incomplete; it expires on the trip end → counts. No expiration date and the type has none (e.g. uploaded from the profile) → the uploaded file is enough.
- Editing the document on the profile when its type has no expiration date clears the stored date (Feature 57); it then counts for any trip.
- The organization deletes its only Doctor Permission type → the requirement no longer applies on the next save.
- Applicant changes **Are you pregnant?** from Yes to No → no Doctor Permission document needed on the next save.
- The worker role also lists the Doctor Permission type as a required document → it is reported once, as a required role document.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: With a Doctor Permission type in the trip's organization, no pregnant applicant reaches `applied` without a valid uploaded Doctor Permission document; without one, nothing changes from today.

---

## Data Ownership & Isolation

No change. Document types keep Feature 91 ownership; person documents keep Feature 4 access; application status keeps its existing rules plus FR-003.

---

## Key Entities

- **DocumentType** — `type` gains `doctor_permission`.
- **PersonDocument** — proves the document is on file.
- **TripPeopleRole** (application) — `isPregnant` drives the gate.

---

## API Requirements

| Method | Endpoint | Change |
|--------|----------|--------|
| `POST` / `PUT` | `/trips/document-types`, `/trips/document-types/:id` | Accept and return `type` `doctor_permission` |
| `GET` | `/trips/trips/browse/:id`, `/trips/trips/browse/:id/application` | Trip adds `requiresDoctorPermissionWhenPregnant` (boolean, FR-002) and `doctorPermissionHasExpiration` (boolean, true when any of those types has an expiration date) |
| Apply / update application, staff application edits, cancel / uncancel | as today | Status applies FR-003; still `200` with `incomplete` (no `400` for a missing document) |
| `GET` | `/trips/trips/:id/status` | Participant `missingItems` may include "Doctor Permission document" |
| `GET` | `/trips/trips/browse/mine`, `/trips/trips/browse/:id` | `complete-application` next action `missingDocuments` may include "Doctor Permission" |
| `POST` / `PUT` | `/trips/people/:id/documents`, `/trips/people/:id/documents/:documentId` | The application's upload (FR-009) uses `POST` for the applicant's own person id. For a Doctor Permission type, a sent `expirationDate` is kept even when the type has no expiration date (other types unchanged) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `DocumentTypeFormDialog` | **Type** offers **Doctor Permission** |
| `DocumentTypesList` | **Type** column shows "Doctor Permission" |
| `ApplyTripDialog` / `EditTripApplicationView` | Not ready to submit and FR-006 message while FR-003 is unmet; checklist item "Doctor Permission document" |
| Application **Current Health** (under **Are you pregnant?**) | FR-009 **Doctor Permission document** area: **Upload Doctor Permission document** (opens the profile document dialog limited to Doctor Permission types) or the document on file with **View** |
| `TripStatusView` | Missing items include "Doctor Permission document" |
| My Trips next actions | "Doctor Permission" in the missing documents |

---

## Data Model Requirements

### `documentType` (delta)

| Field | Type | Rules |
|-------|------|--------|
| type | ENUM(`medical_licence`,`passport`,`certification`,`diploma`,`doctor_permission`) | `ensureSchema` adds `doctor_permission` to the existing column |

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Mission" runs trip "Guatemala Clinic 2027", 2027-03-01 to 2027-03-10.
- Ana Lopez (female) has a complete profile and an otherwise complete application for the trip.

### US-102.1 — Staff set up a Doctor Permission document type

#### Scenario: Doctor Permission is a document type Type
* **Given** an Org Admin of Hope Mission on **Document types**
* **When** they add "Doctor clearance letter" with **Type** Doctor Permission
* **Then** the API saves `type` `doctor_permission`
* **And** the list shows **Type** "Doctor Permission"

### US-102.2 — Pregnant applicants must upload a Doctor Permission document

#### Scenario: Pregnant applicant stays incomplete until the Doctor Permission document is uploaded
* **Given** Hope Mission has a Doctor Permission type "Doctor clearance letter" with no expiration date
* **And** Ana answers **Are you pregnant?** Yes with due date 2027-06-01
* **When** she saves her application without a Doctor Permission document
* **Then** the application is `incomplete`
* **When** she uploads a "Doctor clearance letter" document with a file and saves again
* **Then** the application is `applied`

#### Scenario: A Doctor Permission document counts through its expiration date
* **Given** Hope Mission's Doctor Permission type has an expiration date
* **And** Ana is pregnant and has that document uploaded, expiring 2027-03-05
* **When** she saves her application
* **Then** it is `incomplete`
* **When** the document's expiration is changed to 2027-03-10 (the trip end) and she saves again
* **Then** it is `applied`

#### Scenario: The application's upload expires at the trip end and a later trip needs a new one
* **Given** Hope Mission's Doctor Permission type "Doctor clearance letter" has no expiration date
* **And** Ana is pregnant on her application
* **When** she uploads a "Doctor clearance letter" with expiration date 2027-03-10 (as the application's upload sends) and saves her application
* **Then** the document is stored expiring 2027-03-10
* **And** the application is `applied`
* **When** she applies, pregnant, to Hope Mission's "Honduras Clinic 2027", 2027-05-01 to 2027-05-10
* **Then** that application is `incomplete`

#### Scenario: Not pregnant needs no Doctor Permission document
* **Given** Hope Mission has a Doctor Permission type
* **And** Ana answers **Are you pregnant?** No
* **When** she saves her application with no Doctor Permission document
* **Then** it is `applied`

#### Scenario: An organization without a Doctor Permission type does not require one
* **Given** Hope Mission has no Doctor Permission type
* **And** Ana answers **Are you pregnant?** Yes with a due date
* **When** she saves her application with no Doctor Permission document
* **Then** it is `applied`

#### Scenario: Staff and My Trips see the missing document
* **Given** Hope Mission has a Doctor Permission type and Ana is pregnant with no Doctor Permission document
* **When** staff open **Trip Status** and Ana opens **My Trips**
* **Then** Ana's missing items include "Doctor Permission document"
* **And** her "Complete your application." next action lists "Doctor Permission"

#### Scenario: The application says what is missing
* **Given** the trip requires a Doctor Permission document when pregnant and the type has no expiration date
* **And** Ana answers **Are you pregnant?** Yes on **Apply** with no Doctor Permission document
* **Then** the application is not ready to submit
* **And** it shows "Upload a Doctor Permission document before submitting your application."

#### Scenario: Upload the Doctor Permission document on the application
* **Given** the trip requires a Doctor Permission document when pregnant and Hope Mission's type "Doctor clearance letter" has no expiration date
* **And** Ana answers **Are you pregnant?** Yes on **Apply** with no Doctor Permission document
* **When** she clicks **Upload Doctor Permission document** under the question
* **Then** the document dialog opens with **Document type** "Doctor clearance letter" and no expiration date field
* **When** she chooses a file and saves
* **Then** the document is uploaded to her profile documents with expiration date 2027-03-10
* **And** the dialog closes and the area shows "Doctor clearance letter uploaded", "expires 03/10/2027", and **View**
* **And** the Doctor Permission message is gone
* **And** the doctor message "You must provide a document from your doctor that says it is safe for you to travel on the trip dates." is no longer shown

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-102.1 | Doctor Permission is a document type Type | `backend/tests/doctor-permission.test.js` | `Doctor Permission is a document type Type` |
| US-102.2 | Pregnant applicant stays incomplete until the Doctor Permission document is uploaded | `backend/tests/doctor-permission.test.js` | `Pregnant applicant stays incomplete until the Doctor Permission document is uploaded` |
| US-102.2 | A Doctor Permission document counts through its expiration date | `backend/tests/doctor-permission.test.js` | `A Doctor Permission document counts through its expiration date` |
| US-102.2 | The application's upload expires at the trip end and a later trip needs a new one | `backend/tests/doctor-permission.test.js` | `The application's upload expires at the trip end and a later trip needs a new one` |
| US-102.2 | Not pregnant needs no Doctor Permission document | `backend/tests/doctor-permission.test.js` | `Not pregnant needs no Doctor Permission document` |
| US-102.2 | An organization without a Doctor Permission type does not require one | `backend/tests/doctor-permission.test.js` | `An organization without a Doctor Permission type does not require one` |
| US-102.2 | Staff and My Trips see the missing document | `backend/tests/doctor-permission.test.js` | `Staff and My Trips see the missing document` |
| US-102.2 | The application says what is missing | `frontend/tests/DoctorPermission.test.js` | `The application says what is missing` |
| US-102.2 | Upload the Doctor Permission document on the application | `frontend/tests/DoctorPermission.test.js` | `Upload the Doctor Permission document on the application` |

The **Type** list choice and column (US-102.1 UI) are covered in `frontend/tests/DoctorPermission.test.js` under `Doctor Permission is a document type Type`.

---

## Agent implementation request

```text
Implement Feature 102 from @features/feature-102-pregnancy-doctor-permission.md on branch `feature/102-pregnancy-doctor-permission`.

Backend: add `doctor_permission` to documentType.type (model + ensureSchema); add a Doctor Permission check beside isRequiredPassportUploaded in tripParticipantApplicationStatus.js and use it wherever requiredPassportUploaded is passed today (browse apply/update, tripPeopleRole update, applicationCancel, trip status, myTripNextActions, applicationMissingItems); add requiresDoctorPermissionWhenPregnant / doctorPermissionHasExpiration to the browse trip detail.
Frontend: add Doctor Permission to DOCUMENT_TYPE_OPTIONS; gate and message in ApplyTripDialog / EditTripApplicationView (tripApplicationForm.js, applicationSubmitAvailability.js); add the Doctor Permission upload area under Are you pregnant? on the application, reusing the profile document dialog and the existing person document upload.
Tests per the Test Coverage Map. Update features/reference/ (behavior, api, data-model).
```

---

## Definition of Done

*   [x] **Doctor Permission** Type per **FR-001**
*   [x] Gate per **FR-002**–**FR-005**
*   [x] Application, Trip Status, and My Trips messages per **FR-006**–**FR-008**
*   [x] Upload on the application per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Creating a Doctor Permission document type automatically.
- A per-trip on/off setting (the organization having the type turns it on).
- Checking the document's contents or that it covers the trip dates beyond the expiration rule.
- Re-checking applications when a document is uploaded without saving the application.
- Emails or reminders about the document.
