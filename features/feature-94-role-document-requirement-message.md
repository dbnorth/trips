# Feature: Clear Role Document Requirement Messages

**Feature ID:** 94
**Branch pattern:** `feature/94-role-document-requirement-message`
**Status:** Implemented
**Created:** 2026-10-27
**Input:** "i was entering a profile where the role required a document with a specialization. I had the wrong specialization and the message was not clear"

Clarified with the requester:
- The unclear messages are on **Apply / Edit application** (the yellow document warning and the "Complete the following to submit your application:" list) and on **Home / My Trips next actions** ("Missing documents: …").
- "The message needs to specify which specific thing is missing from the document": the file, the expiration date (missing or too early), or the specialization — not a list of every requirement.

Today every one of those places shows only the document type with the missing specializations in brackets, e.g. "Board Certification (Emergency Medicine)", inside "Upload the following required documents … : Board Certification (Emergency Medicine)." A person who already uploaded Board Certification with the wrong specialization is told to upload it again, and nothing says the specialization is the problem.

**Depends on:**
- [Feature 34 — Document Specializations](feature-34-document-specializations.md) (specializations on person documents)
- [Feature 57 — Has Expiration Date on Document Types](feature-57-document-type-expiration-date.md) (types without an expiration date)
- [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md) (worker roles require specializations; the current "Type (Specializations)" label)
- [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md) ("Missing documents: …" on Home and My Trip Info)

---

## User Stories

### US-94.1: Applicants see exactly what is missing from a required document

**As** a participant applying for a role that requires documents
**I want** each unmet required document to say exactly what is missing — the document, its file, a valid expiration date, or a specialization
**So that** I can fix that one thing on my profile, including when I picked the wrong specialization

**Acceptance:** see Gherkin scenarios under US-94.1.

---

## Requirements

### Functional Requirements

**What is missing**

- **FR-001**: A required role document is met by the same rule as today: a document of the type with a file, an expiration date after the trip's compare date (end date, or start date when there is none) when the type has expiration dates (Feature 57), and every specialization the role requires for that type. For each type that isn't met, the message names only what is missing, from the person's document of that type that is **closest** to meeting it (fewest problems below; ties → the most recently added document):
  - **No document of the type** → `<Type>: add this document` followed by what it will need: ` with an expiration date after <date>` when the expiration rule applies, and ` with the <specializations> selected` / ` and the <specializations> selected` when the role requires specializations of the type. Example: "Board Certification: add this document with an expiration date after 01/23/2027 and the Emergency Medicine specialization selected".
  - Otherwise, one entry per problem on that document, in this order:
    - no file → "upload the file"
    - no expiration date (the rule applies) → "add an expiration date after <date>"
    - expiration date on or before the compare date → "the expiration date <its date> must be after <date>"
    - required specializations the document doesn't have → "select the <names> specialization" (one) / "select the <names> specializations" (more than one); names sorted, joined "A and B" / "A, B, and C"
    joined like a sentence after `<Type>: ` ("Board Certification: upload the file and select the Emergency Medicine specialization"; three or more joined with commas and ", and").
  Each problem counts as one when choosing the closest document (each missing specialization counts as one). Dates use `MM/dd/yyyy`.

**Apply / Edit application**

- **FR-002**: The yellow document warning on **Apply** and **Edit application**, when required role documents aren't met, reads "Before submitting your application, update these documents on your profile." followed by one sentence per document (the FR-001 text ending with "."). This replaces "Upload the following required documents [with an expiration date past the end of the trip (<date>)] before submitting your application: <names>." The other warnings (a file for every profile document, passport) are unchanged and keep their order.
- **FR-003**: In the "Complete the following to submit your application:" list, each unmet required role document is its own item with the FR-001 text, replacing the single item "Required role document(s): <names>".

**Home / My Trips next actions**

- **FR-004**: In My Trips next actions (Home and the trip page's **My Trip Info**), each unmet required role document in "Missing documents: …" uses the FR-001 text, and the entries are separated by "; " instead of ", ". "Passport" and "A file for every profile document" stay as they are, in the same order.
- **FR-005**: When the participant saves their profile from the menu bar (**Profile**) while on the trip page (`/browse-trips/:tripId`), the page reloads the trip, so **My Trip Info** and its next actions reflect the saved documents without a browser reload (Home already does this).

---

## Assumptions

- The rule for meeting a requirement is unchanged; only the wording changes.
- Staff screens (Trip Status missing items, the staff application view) keep today's short "Type (Specializations)" labels.
- The message doesn't list the specializations the document already has; it names the ones to select.

## Edge Cases

- Board Certification with Pediatrics, expiring 06/30/2028; the role requires Emergency Medicine → "Board Certification: select the Emergency Medicine specialization".
- Board Certification with Emergency Medicine expiring 12/31/2026 on a trip ending 01/23/2027 → "Board Certification: the expiration date 12/31/2026 must be after 01/23/2027".
- Board Certification with no file, no expiration date, and Pediatrics → "Board Certification: upload the file, add an expiration date after 01/23/2027, and select the Emergency Medicine specialization".
- Two Board Certifications, one expired with Emergency Medicine and one valid with Pediatrics → both have one problem; the most recently added one is used.
- No Board Certification → "Board Certification: add this document with an expiration date after 01/23/2027 and the Emergency Medicine specialization selected".
- A required type without expiration dates and no required specializations, not on the profile → "CPR Card: add this document".
- A trip with no dates → no expiration problems or expiration wording.

## Success Criteria

- **SC-001**: A participant with the wrong specialization can tell from the message alone which specialization to select, and isn't told to upload the document again.
- **SC-002**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change. Messages are built from the signed-in person's own documents and the role they applied for.

---

## Key Entities

- **documentType** — `description`, `hasExpirationDate` (read).
- **workerRole** required document types and required specializations — read.
- **personDocument** (`documentFileName`, `expirationDate`) / **personDocumentSpecialization** — read to decide what is missing (unchanged rule).

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips/browse/mine` and `/trips/trips/browse/:id` | `nextActions[].missingDocuments` entries for required role documents use the FR-001 text (shape unchanged: array of strings) |

---

## Screen Requirements

- **Apply / Edit application**: document warning per FR-002; submit list per FR-003.
- **Home / My Trip Info**: "Missing documents: …" per FR-004.
- **Trip page**: reloads after a menu bar profile save per FR-005.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions"; trip "Clinica Ezell Hospital - January 2027" from 2027-01-16 to 2027-01-23.
- Document type "Board Certification" has expiration dates and the specializations "Emergency Medicine" and "Pediatrics".
- Worker role "ER Physician" requires "Board Certification" with "Emergency Medicine".
- Ana applies for ER Physician. Her profile has Board Certification, with a file, expiring 2028-06-30, with the specialization "Pediatrics".

### US-94.1 — Applicants see exactly what is missing from a required document

#### Scenario: A wrong specialization names the specialization to select
* **When** Ana opens her application
* **Then** the document warning reads "Before submitting your application, update these documents on your profile. Board Certification: select the Emergency Medicine specialization."
* **And** the "Complete the following to submit your application:" list has the item "Board Certification: select the Emergency Medicine specialization"

#### Scenario: Each problem on the document is named
* **Given** Ana's Board Certification has Emergency Medicine and expires 2026-12-31
* **Then** the text is "Board Certification: the expiration date 12/31/2026 must be after 01/23/2027"
* **And** for a Board Certification with no file, no expiration date, and Pediatrics the text is "Board Certification: upload the file, add an expiration date after 01/23/2027, and select the Emergency Medicine specialization"

#### Scenario: A missing document says what it will need
* **Given** Ana has no Board Certification, and ER Physician also requires "CPR Card" (no expiration dates, no specializations), which she doesn't have
* **Then** the warning lists "Board Certification: add this document with an expiration date after 01/23/2027 and the Emergency Medicine specialization selected." and "CPR Card: add this document."

#### Scenario: Home names what is missing
* **When** Ana opens Home with her incomplete application
* **Then** her trip's next action shows "Missing documents: Board Certification: select the Emergency Medicine specialization."
* **And** with CPR Card also required and missing it shows "Missing documents: Board Certification: select the Emergency Medicine specialization; CPR Card: add this document."

#### Scenario: Saving the profile from the menu bar refreshes the trip page
* **Given** Ana is on the trip page and My Trip Info shows "Missing documents: Board Certification: select the Emergency Medicine specialization."
* **When** she opens **Profile** from the menu bar, selects Emergency Medicine on her Board Certification, and saves
* **Then** the trip page reloads the trip and My Trip Info no longer shows that missing document

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-94.1 | A wrong specialization names the specialization to select | `frontend/tests/ApplyTripDialog.test.js` | `A wrong specialization names the specialization to select` |
| US-94.1 | Each problem on the document is named | `frontend/tests/ApplyTripDialog.test.js` | `Each problem on the document is named` |
| US-94.1 | Each problem on the document is named | `backend/tests/my-trips-next-actions.test.js` | `Each problem on the document is named` |
| US-94.1 | A missing document says what it will need | `frontend/tests/ApplyTripDialog.test.js` | `A missing document says what it will need` |
| US-94.1 | Home names what is missing | `backend/tests/my-trips-next-actions.test.js` | `Home names what is missing` |
| US-94.1 | Home names what is missing | `frontend/tests/HomeNextActions.test.js` | `Missing documents are separated by semicolons` |
| US-94.1 | Saving the profile from the menu bar refreshes the trip page | `frontend/tests/TripBrowseNextActions.test.js` | `Saving the profile from the menu bar refreshes the trip page` |

---

## Agent implementation request

```text
Implement Feature 94 from @features/feature-94-role-document-requirement-message.md on branch `feature/94-role-document-requirement-message`.

Add a helper in both frontend/src/utils/tripApplicationForm.js and backend/app/utils/tripParticipantApplicationStatus.js that, for an unmet required document type, finds the person's closest document of that type (problems: no file, no/too-early expiration when hasExpirationDate !== false and compareDate is set, each missing required specialization; fewest problems, ties → highest id) and returns the FR-001 text; with no document of the type, the "add this document …" text. Keep the meeting rule (isRequiredRoleDocumentUploaded / missingRequiredRoleDocuments) unchanged. Load hasExpirationDate in loadWorkerRoleDocumentRequirements (backend) and make sure the frontend required document types carry it.
Use it in ApplyTripDialog.vue and EditTripApplicationView.vue (document warning per FR-002; submit list items per FR-003 via applicationSubmitAvailability.js) and in backend myTripNextActions.js (FR-004); MyTripNextActions.vue joins missingDocuments with "; ". Leave Trip Status / staff labels (requiredRoleDocumentLabel in trip.controller.js, applicationMissingItems.js) unchanged.
Tests per the Test Coverage Map; update existing tests that assert the old wording. Update features/reference/behavior.md (My Trips next actions and the application document warning).
```

---

## Definition of Done

*   [x] Missing-item text per **FR-001**
*   [x] Apply / Edit application per **FR-002** / **FR-003**
*   [x] Home / My Trip Info per **FR-004**
*   [x] Trip page reloads after a menu bar profile save per **FR-005**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Changing when a required document counts as met (expiration rule, specialization rule)
- Staff Trip Status missing items and the staff application view
- Passport and "A file for every profile document" wording
- Checks inside the profile document dialog itself
