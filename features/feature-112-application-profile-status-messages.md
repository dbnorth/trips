# Application and Profile Status Messages

**Feature ID:** 112
**Branch pattern:** `feature/112-application-profile-status-messages`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "create a spec to update the messaging for application and profile status for trips. If the participant has not be able to submit the application then then if the appication or profile is missing questions (not documents) the message should say complete missing information on the applcation and/or profile with a linke to the application (which has a link to the profile if it is missing). On the applicaition, only show the Profile is misisng data fields not documents. On the Profile in the document section add a note that all the document for the trip must be uploaded 90 days before the trip and display a list of document required for any trip they have have started an applicaiton for that is not canceld or the trip start date is not passed."

Today, an incomplete application that is missing questions shows "Complete your application." on My Trips and the trip page, followed by "Missing documents: <names>." Since Feature 104, an application can be submitted without its documents, so the documents line adds noise to a message that is really about unanswered questions. It also doesn't say whether those questions are on the application or the profile. The application itself shows a document alert ("Before your application can be approved, update these documents on your profile. …"). Its profile warning says the profile needs completing but doesn't say which fields are missing.

This feature does three things:
- The next-action message names where the missing questions are (application, profile, or both). It no longer lists documents; **Update App** opens the application.
- The application lists the missing profile fields and drops its document alert.
- The participant's own Profile gains a note that trip documents are due 90 days before each trip. Under the note is a list of the documents each of their upcoming trips requires, marked Uploaded or Missing.

## Clarifications

### Session 2026-11-03

- Q: What should the My Trips / trip page message say when an incomplete application is missing questions? → A: Name where they are:
  - "Complete missing information on your application so you can submit your application."
  - "Complete missing information on your profile so you can submit your application."
  - "Complete missing information on your application and profile so you can submit your application."

  The word "application" is a link that opens the application, the same as **Update App**. The "Missing documents: <names>." line is dropped. This supersedes the `complete-application` documents text of Features 60, 94, and 102.
- Q: What counts as "missing questions"? → A: The non-document items that already decide `complete-application` versus `submit-application`. These are the profile fields (Feature 20 profile completeness, including medical conditions and other languages) and the application's own items (role, funding, roommate, flight preferences, pregnancy, agreements, travel options). Documents never count.
- Q: When only documents are missing? → A: Unchanged: "Submit your application." with **Submit App**. A pre-approved application with missing documents keeps "Upload your documents: <names>." (Feature 104).
- Q: On the application, what changes? → A: The profile warning lists the missing profile fields, for example "Missing: City, Gender." This supersedes Feature 47's "no list of missing profile fields". The blue document alert ("Before your application can be approved, update these documents on your profile. …", "Upload a passport …", "Upload a file for every document on your profile …", "Upload a Doctor Permission document …") is removed from both the Apply dialog and the Edit application page.
- Q: Keep the application's inline **Upload Doctor Permission document** control for pregnant applicants (Feature 102)? → A: Yes. It belongs to the pregnancy question on the application and is not the profile document alert.
- Q: What does the Profile list look like? → A: It is grouped by trip, with the trip name, its start date, and "Due <start date − 90 days>". Under each trip are the documents that trip requires, each marked **Uploaded** or **Missing**. A missing document also shows the same "what is missing" text as Feature 94 (for example "Board Certification: select the Emergency Medicine specialization").
- Q: Keep "application" as a link in the message? → A: No. The message is plain text; **Update App** next to it already opens the application. This supersedes the link in the first answer above.
- Q: Should the message say why? → A: Yes. Each version ends with " so you can submit your application.", for example "Complete missing information on your application and profile so you can submit your application."
- Q: Where does the profile notice go on **Update application**? → A: After the **Trip role** select, on both the Apply / Update application dialog and the staff **Update application** page. While it shows, the health section's "If your contact information or other personal information has changed, please update your profile. Your health and language information below comes from your profile." note and its **Update profile** button are hidden; the notice's own **Update profile** stays.
- Q: What does a pre-approved application with missing documents show on Home? → A: "Documents are missing and must be uploaded 90 days before departure (<due date>). Missing: <names>." The date is the due date (trip start date minus 90 days), and the names are the same "what is missing" list as before, separated by "; ". It has an **Update Documents** button that opens the participant's Profile, plus **Update App** and **Cancel App** as before. This supersedes "Upload your documents: <names>." in the answer above about documents.
- Q: Which trips are listed? → A: Every trip, in any organization, where the person has an **incomplete**, **pre-approved**, or **approved** application and the start date is today or later. Cancelled and declined applications, and trips that have started, are left out.
- Q: What happens to existing tests of the replaced behavior? → A: Tests that checked documents through `complete-application` now check them through `upload-documents` on a pre-approved application, which still lists them (backend Features 60 / 94, Home "Missing documents are separated by semicolons"). Home and trip page tests use the new message. The application document alert tests (Feature 47's "without a field list", Feature 57 US-57.3, Feature 59 US-59.4, and Feature 94's three Apply dialog tests in `ApplyTripDialog.test.js`) are removed. The Feature 102 and Feature 104 tests drop only their alert-text assertions.

**Depends on:**
- [Feature 25 — Required Document Types per Worker Role](feature-25-worker-role-required-documents.md) (role required documents)
- [Feature 27 — Application Submit Unavailable Info](feature-27-application-submit-unavailable-info.md) and [Feature 47 — Simplify Application Warnings](feature-47-simplify-application-warnings.md) (application profile warning)
- [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md) (required specializations)
- [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md) (`nextActions`, `MyTripNextActions`)
- [Feature 94 — Role Document Requirement Message](feature-94-role-document-requirement-message.md) ("what is missing" text)
- [Feature 102 — Pregnancy Doctor Permission](feature-102-pregnancy-doctor-permission.md) (Doctor Permission requirement, inline upload)
- [Feature 104 — Pre-Approved Document Review](feature-104-pre-approved-document-review.md) (submit without documents, `upload-documents`)

---

## User Stories

### US-112.1: Know what to finish before submitting

**As** a participant with an incomplete application
**I want** My Trips and the trip page to say whether my application, my profile, or both are missing information
**So that** I know where to go to finish it

**Acceptance:** see Gherkin scenarios under US-112.1.

### US-112.2: See which profile fields the application needs

**As** a participant filling in an application
**I want** the application to list the profile fields I still need, without document alerts
**So that** I can submit once those questions are answered

**Acceptance:** see Gherkin scenarios under US-112.2.

### US-112.3: See every document my upcoming trips need

**As** a participant with upcoming trip applications
**I want** my Profile's documents section to list each trip's required documents and when they are due
**So that** I upload everything at least 90 days before each trip

**Acceptance:** see Gherkin scenarios under US-112.3.

### US-112.4: Upload missing documents for a pre-approved application

**As** a participant with a pre-approved application that is missing documents
**I want** My Trips to tell me the documents are due 90 days before departure and take me to my Profile
**So that** I upload them in time

**Acceptance:** see Gherkin scenarios under US-112.4.

---

## Requirements

### Functional Requirements

- **FR-001**: The `complete-application` next action (`GET /trips/trips/browse/mine`, `/browse/:id` `myTripInfo.nextActions`) carries `applicationIncomplete` and `profileIncomplete` (booleans) instead of `missingDocuments`:
  - `profileIncomplete` is true when the profile is not complete (Feature 20 rule for the trip's organization);
  - `applicationIncomplete` is true when any non-document item other than "Profile is not complete" is missing.

  `complete-application` is still returned only when at least one of the two is true. `submit-application` is unchanged; `upload-documents` adds `dueDate` (FR-009).
- **FR-002**: For `complete-application`, `MyTripNextActions` shows one of these, depending on the two flags:
  - "Complete missing information on your application so you can submit your application." (application only);
  - "Complete missing information on your profile so you can submit your application." (profile only);
  - "Complete missing information on your application and profile so you can submit your application." (both).

  The message is plain text (no link); **Update App** opens the application. No "Missing documents" line shows for any action. **Update App** and **Cancel App** stay. This applies on Home My Trips and in the trip page's **My Trip Info**.
- **FR-003**: On the Apply dialog and the Edit application page, the incomplete-profile warning keeps its message and **Update profile**. It adds "Missing: <fields>." with the missing profile field labels (`getMissingProfileFields` for the trip's organization, in their existing order, comma-separated). Saving the profile re-checks it, as today.
- **FR-004**: The Apply dialog and the Edit application page no longer show the document requirement alert: the role document, passport, Doctor Permission, and "file for every document" messages. The inline **Upload Doctor Permission document** control for pregnant applicants stays. The Save Incomplete checklist (Feature 27) is unchanged.
- **FR-005**: New `GET /trips/trips/browse/mine/documents` (authenticated) returns the signed-in person's upcoming trips with required documents, across all organizations. Trips are included when:
  - the application is `incomplete`, `pre_approved`, or `approved`;
  - the start date is today or later;
  - at least one document is required.

  Each item is `{ tripId, tripName, startDate, dueDate, documents: [{ name, uploaded, missingText }] }`. `dueDate` is `startDate` minus 90 days. Items are ordered by start date, then trip name. A person with no person record gets `[]`.
- **FR-006**: The required documents for a trip are those the `nextActions` documents check uses (Features 25, 59, 94, 102):
  - the application's worker role's required document types;
  - **Passport** when the trip requires a passport and the role doesn't already list it;
  - **Doctor Permission** when the application says pregnant, the organization has a Doctor Permission type, and the role doesn't already list it.

  They are listed in that order. `uploaded` is true when the document meets the trip's rule (file uploaded, expiration date after the trip's compare date when the type expires, required specializations selected). Staff review (Feature 104) doesn't matter. When not uploaded, `missingText` is the Feature 94 "what is missing" text for role documents, or "Passport" / "Doctor Permission". When uploaded, it is `null`. "A file for every profile document" is not listed.
- **FR-007**: When the Profile dialog (`EditPersonDialog`) is open for the signed-in person's own person, its documents section shows, above the documents:
  - the note "All documents for your trips must be uploaded 90 days before the trip starts.";
  - the FR-005 trips, each headed "<trip name> — starts <MM/DD/YYYY>, due <MM/DD/YYYY>";
  - under each trip heading, its documents, each with a green check and **Uploaded**, or a red alert and **Missing** with the `missingText`.

  The list reloads after a document is added, edited, or deleted in that dialog. When there are no trips, only the note shows. When the dialog is open for someone else's person (for example, staff using **People → Edit**), neither the note nor the list shows.
- **FR-008**: On the Apply / Update application dialog and the **Update application** page, the incomplete-profile warning (FR-003) shows after the **Trip role** select. While it shows, the health section hides its "If your contact information … comes from your profile." note and that note's **Update profile** button. When the profile is complete, the note and button show as before.
- **FR-009**: The `upload-documents` next action (pre-approved with missing documents) adds `dueDate` (trip start date minus 90 days, `YYYY-MM-DD`). `MyTripNextActions` shows "Documents are missing and must be uploaded 90 days before departure (<dueDate as MM/DD/YYYY>). Missing: <missingDocuments joined by "; ">." with **Update Documents**, **Update App**, and **Cancel App**. **Update Documents** opens the signed-in person's Profile (`EditPersonDialog`) on Home My Trips and on the trip page's **My Trip Info**. Closing the Profile reloads the next actions.

---

## Assumptions

- The 90-day due date is guidance only. Nothing blocks uploads, submission, or approval after it.
- Dates show as `MM/DD/YYYY` (Feature 101).
- Trips with no required documents are left out of the Profile list.
- The staff missing-items checklist on the trip page (Feature 110) is unchanged.

## Edge Cases

- Application questions and profile fields both missing → "…on your application and profile so you can submit your application."
- Only documents missing on an incomplete application → "Submit your application." (unchanged).
- Due date already passed → still shown as the date. There is no special styling.
- The same document type required by two trips → listed under each trip. It can be Uploaded for one and Missing for the other when expiration dates differ.
- A trip starting today → listed. A trip that started yesterday → not listed.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No `complete-application` message lists documents.

---

## Data Ownership & Isolation

`GET /trips/trips/browse/mine/documents` takes no person id. It returns only the signed-in person's own applications and documents.

---

## Key Entities

None new. It reads the existing `tripPeopleRole`, `trip`, `personDocument`, worker role required document types / specializations, and document types.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips/browse/mine`, `/trips/trips/browse/:id` | `complete-application` adds `applicationIncomplete` and `profileIncomplete`, and drops `missingDocuments` (FR-001); `upload-documents` adds `dueDate` (FR-009) |
| `GET` | `/trips/trips/browse/mine/documents` | New. The signed-in person's upcoming trips with required documents (FR-005, FR-006). Registered before `/browse/:id` |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `MyTripNextActions` (Home My Trips, trip page **My Trip Info**) | `complete-application` text by the two flags, as plain text; **Update App** opens the application. No "Missing documents" line (FR-002). `upload-documents` text with the due date and missing names, and an **Update Documents** button (FR-009) |
| `Home`, `TripBrowseView` | **Update Documents** opens the signed-in person's Profile; closing it reloads the next actions (FR-009) |
| `ApplyTripDialog`, `EditTripApplicationView` | Profile warning lists the missing fields and sits after **Trip role**; while it shows, the health section's profile note and button are hidden. No document requirement alert. Doctor Permission inline upload stays (FR-003, FR-004, FR-008) |
| `PersonProfileFields` | `hideProfileNote` prop hides the health-only profile note and **Update profile** button (FR-008) |
| `EditPersonDialog` (own profile) | Documents section note and per-trip required documents with Uploaded / Missing (FR-007) |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Maria is a participant in "Hope Missions".
- Maria applied for the "Guatemala Clinic" trip (starts 03/15/2027) as Nurse. Nurse requires "RN License" (expires).
- The trip requires a passport.

### US-112.1 — Know what to finish before submitting

#### Scenario: Application questions missing
* **Given** Maria's profile is complete
* **And** her incomplete Guatemala Clinic application has no funding answer
* **When** she views My Trips
* **Then** the row says "Complete missing information on your application so you can submit your application."
* **And** no "Missing documents" text shows

#### Scenario: Profile fields missing
* **Given** Maria's application questions are all answered
* **And** her profile has no city
* **When** she views My Trips
* **Then** the row says "Complete missing information on your profile so you can submit your application."

#### Scenario: Both missing
* **Given** Maria's profile has no city and her application has no funding answer
* **When** she views My Trips
* **Then** the row says "Complete missing information on your application and profile so you can submit your application."

#### Scenario: Update App opens the application
* **Given** the row says "Complete missing information on your application and profile so you can submit your application."
* **Then** the message has no link
* **When** Maria clicks **Update App**
* **Then** the application for Guatemala Clinic opens

#### Scenario: Only documents missing is unchanged
* **Given** Maria's profile and application questions are complete
* **And** she has no RN License
* **When** she views My Trips
* **Then** the row says "Submit your application." with **Submit App**

#### Scenario: Next action flags
* **Given** Maria's profile has no city and her application questions are answered
* **When** she loads her trips
* **Then** the `complete-application` action has `profileIncomplete` true and `applicationIncomplete` false
* **And** it has no `missingDocuments`

### US-112.2 — See which profile fields the application needs

#### Scenario: Missing profile fields listed
* **Given** Maria's profile has no city and no gender
* **When** she opens her Guatemala Clinic application
* **Then** the profile warning says "Missing: City, Gender."
* **And** **Update profile** shows

#### Scenario: No document alert
* **Given** Maria has no RN License and no passport
* **When** she opens her Guatemala Clinic application
* **Then** no "update these documents on your profile" or "Upload a passport" message shows

#### Scenario: Doctor Permission upload stays
* **Given** "Hope Missions" has a Doctor Permission document type
* **And** Maria answers that she is pregnant
* **When** she views her Guatemala Clinic application
* **Then** **Upload Doctor Permission document** shows

#### Scenario: Profile notice comes after the role
* **Given** Maria's profile has no city
* **When** she opens **Update application** for Guatemala Clinic (dialog or page)
* **Then** the profile notice shows below the **Trip role** select

#### Scenario: Profile update note hidden while the profile notice shows
* **Given** Maria's profile has no city
* **When** she opens **Update application** for Guatemala Clinic (dialog or page)
* **Then** "If your contact information or other personal information has changed …" doesn't show
* **And** only the notice's **Update profile** button shows
* **When** her profile is complete and she opens the application
* **Then** the note and its **Update profile** button show

### US-112.4 — Upload missing documents for a pre-approved application

#### Scenario: Pre-approved missing documents message
* **Given** Maria's Guatemala Clinic application is pre-approved
* **And** she has no RN License and no passport
* **When** she views My Trips
* **Then** the row says "Documents are missing and must be uploaded 90 days before departure (12/15/2026). Missing: RN License: add this document …; Passport."
* **And** it shows **Update Documents**, **Update App**, and **Cancel App**

#### Scenario: Pre-approved missing documents action has the due date
* **Given** Maria's Guatemala Clinic application is pre-approved with documents missing
* **When** she loads her trips
* **Then** the `upload-documents` action has `dueDate` 90 days before the trip start date

#### Scenario: Update Documents opens the profile
* **Given** the row shows **Update Documents**
* **When** Maria clicks it
* **Then** her Profile opens

### US-112.3 — See every document my upcoming trips need

#### Scenario: Required documents listed by trip
* **Given** Maria has an RN License with a file and an expiration date after the trip, and no passport
* **When** she opens her Profile
* **Then** the documents section says "All documents for your trips must be uploaded 90 days before the trip starts."
* **And** it lists "Guatemala Clinic — starts 03/15/2027, due 12/15/2026"
* **And** under it "RN License" is **Uploaded** and "Passport" is **Missing**

#### Scenario: Cancelled, declined, and past trips are left out
* **Given** Maria also has a cancelled application, a declined application, and an approved application for a trip that started yesterday
* **When** she loads her trip documents
* **Then** only Guatemala Clinic is returned

#### Scenario: Not shown on someone else's profile
* **Given** Olivia is an Org Admin of "Hope Missions"
* **When** she opens **People → Edit** for Maria
* **Then** the trip documents note and list don't show

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-112.1 | Application questions missing | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Application questions missing` |
| US-112.1 | Profile fields missing | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Profile fields missing` |
| US-112.1 | Both missing | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Both missing` |
| US-112.1 | Update App opens the application | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Update App opens the application` |
| US-112.1 | Only documents missing is unchanged | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Only documents missing is unchanged` |
| US-112.1 | Next action flags | `backend/tests/application-profile-status-messages.test.js` | `Next action flags` |
| US-112.2 | Missing profile fields listed | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Missing profile fields listed` |
| US-112.2 | No document alert | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `No document alert` |
| US-112.2 | Doctor Permission upload stays | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Doctor Permission upload stays` |
| US-112.2 | Profile notice comes after the role | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Profile notice comes after the role` |
| US-112.2 | Profile update note hidden while the profile notice shows | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Profile update note hidden while the profile notice shows` |
| US-112.4 | Pre-approved missing documents message | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Pre-approved missing documents message` |
| US-112.4 | Pre-approved missing documents action has the due date | `backend/tests/application-profile-status-messages.test.js` | `Pre-approved missing documents action has the due date` |
| US-112.4 | Update Documents opens the profile | `frontend/tests/HomeNextActions.test.js` | `Update Documents opens the profile` |
| US-112.3 | Required documents listed by trip | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Required documents listed by trip` |
| US-112.3 | Required documents listed by trip | `backend/tests/application-profile-status-messages.test.js` | `Required documents listed by trip` |
| US-112.3 | Cancelled, declined, and past trips are left out | `backend/tests/application-profile-status-messages.test.js` | `Cancelled, declined, and past trips are left out` |
| US-112.3 | Not shown on someone else's profile | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `Not shown on someone else's profile` |

---

## Agent implementation request

```text
Implement Feature 112 from @features/feature-112-application-profile-status-messages.md on branch `feature/112-application-profile-status-messages`.

Backend: in myTripNextActions.js, have complete-application return { code, applicationIncomplete, profileIncomplete } (profile from isProfileComplete for the trip's org; application = missing non-document labels other than "Profile is not complete"), dropping missingDocuments. Add GET /trips/trips/browse/mine/documents (before /browse/:id), reusing the missingDocumentNames rules per trip to build { name, uploaded, missingText }.
Frontend: myTripNextActions.js / MyTripNextActions.vue plain text by the two flags (no link; Update App opens the application); remove the Missing documents line. ApplyTripDialog and EditTripApplicationView: add "Missing: <fields>." to the profile warning, remove the documentRequirementWarning alert, keep the Doctor Permission PersonDocumentsCard. EditPersonDialog: for the signed-in person's own personId, show the 90-day note and the trip documents list above PersonDocumentsCard, reloading on document changes.
Tests per the Test Coverage Map; update existing tests that expect "Complete your application.", "Missing documents", missingDocuments on complete-application, or the application document alert. Update features/reference/ (behavior.md, api.md).
```

---

## Definition of Done

*   [x] Next action flags and message per **FR-001**, **FR-002**
*   [x] Application profile field list and no document alert per **FR-003**, **FR-004**
*   [x] Profile notice after Trip role; health profile note hidden while it shows per **FR-008**
*   [x] Trip documents endpoint per **FR-005**, **FR-006**
*   [x] Profile note and list per **FR-007**
*   [x] Pre-approved missing documents message and **Update Documents** per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Enforcing the 90-day due date (blocking uploads, submission, or approval).
- Reminder emails about due dates.
- Changing the staff missing-items checklist, Trip Status data, or the `submit-application` message.
- Uploading documents from the Profile trip list (uploads stay in the documents section below it).
