# Documents Missing Reminder Email

**Feature ID:** 113
**Branch pattern:** `feature/113-documents-missing-email`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "add a spec to update particpant auto emiails.  Add an email to the weekley email if the particpant is Pre Approved but has not submited all thier documents."

Today the weekly scheduled emails remind participants with an **Incomplete** application to finish it. Since Feature 104, an application can be submitted (**Pre-Approved**) before its documents are uploaded, and Feature 112 tells participants on Home that documents are due 90 days before departure. Nothing reminds them by email, so a participant who doesn't open the app may miss the due date.

This feature adds a **Documents missing reminder** email type that the weekly job sends to pre-approved participants who are still missing documents. Two new tokens let the email list the missing documents and the due date. The template seed adds a default weekly template.

## Clarifications

### Session 2026-11-03

- Q: A new email type, or reuse the existing "Application incomplete reminder"? → A: A new email type, **Documents missing reminder** (event code `documents-missing`), with its own template that organizations can edit. The `application-incomplete` reminder is unchanged.
- Q: Should the email list the missing documents and the due date? → A: Yes. Add two tokens: one for the missing documents list and one for the due date (trip start date minus 90 days).
- Q: Seed a default template? → A: Yes, for the seed organization, **Scheduled** with **Weekly (Tuesday)**, like the other application reminders.
- Q: Keep sending after the due date has passed? → A: Yes. It goes out weekly until the documents are uploaded, the application leaves **Pre-Approved**, or the trip starts. The scheduled job already skips trips that have started.

**Depends on:**
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md), [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md), and [Feature 42 — Email Template Schedule](feature-42-email-template-schedule.md) (email types, tokens, weekly schedule, template seed)
- [Feature 44 — Daily Scheduled Email Job](feature-44-daily-scheduled-emails.md) (recipient rules by event code)
- [Feature 104 — Pre-Approved Document Review](feature-104-pre-approved-document-review.md) (`pre_approved`, `upload-documents` missing documents)
- [Feature 112 — Application and Profile Status Messages](feature-112-application-profile-status-messages.md) (90-day due date)

---

## User Stories

### US-113.1: Get a weekly reminder to upload my documents

**As** a participant with a pre-approved application that is missing documents
**I want** a weekly email reminding me which documents are missing and when they are due
**So that** I upload them at least 90 days before the trip

**Acceptance:** see Gherkin scenarios under US-113.1.

### US-113.2: Write the reminder with the missing documents and due date

**As** an Org Admin editing email templates
**I want** tokens for a participant's missing documents and the documents due date
**So that** the reminder tells each participant exactly what to upload and by when

**Acceptance:** see Gherkin scenarios under US-113.2.

### US-113.3: Start with a default reminder

**As** an organization using the seed templates
**I want** the seed to add a weekly documents missing reminder
**So that** participants get it without anyone writing a template first

**Acceptance:** see Gherkin scenarios under US-113.3.

---

## Requirements

### Functional Requirements

- **FR-001**: The email type seed (`seedEmailTypes.js`) adds `documents-missing` with description **Documents missing reminder** and event code `documents-missing`.
- **FR-002**: The scheduled email job (`scheduledEmails.js`) has a recipient rule for event code `documents-missing`. It sends to a **Trip Participant** assignment when both are true:
  - its status is `pre_approved`;
  - it is missing at least one document by the same rule as the `upload-documents` next action (Features 104 and 112).

  Everything else about the job is unchanged: active trips with no start date or a start date after the job date, trip templates before organization templates, the **Weekly** rule on Tuesday, and one send per template, trip, person, and date.
- **FR-003**: New value source `participant.missingDocuments` (label **Participant missing documents**) is the participant's missing documents on the trip, one per line. It uses the `upload-documents` names (for example the Feature 94 "what is missing" text, "Passport", "Doctor Permission") for the participant's earliest assignment on the trip. It is empty when nothing is missing, or when there is no trip or participant.
- **FR-004**: New value source `trip.documentsDueDate` (label **Trip documents due date**) is the trip start date minus 90 days, formatted `MM/DD/YYYY` (Feature 101). It is empty when the trip has no start date or there is no trip.
- **FR-005**: The token seed (`seedEmailTokens.js`) adds `MISSING_DOCUMENTS` (value source `participant.missingDocuments`) and `DOCUMENTS_DUE_DATE` (value source `trip.documentsDueDate`). Like every token, they work in **Subject**, **Email body**, and **Preview**.
- **FR-006**: The template seed (`emailTemplates.json`) adds a `documents-missing` template for the seed organization:
  - **Function code** **Scheduled**, schedule `weekly`;
  - **From email** `{{ORG_EMAIL}}`, **To** `{{PARTICIPANT_EMAIL}}`;
  - **Subject** "Reminder: upload your documents for {{TRIP_NAME}}";
  - **Email body**: "Hi {{PARTICIPANT_FIRST_NAME}},\n\nYour application for {{TRIP_NAME}} ({{TRIP_START_DATE}} to {{TRIP_END_DATE}}) is pre-approved. All documents for your trip must be uploaded by {{DOCUMENTS_DUE_DATE}}, 90 days before departure. These documents are still missing:\n\n{{MISSING_DOCUMENTS}}\n\nPlease log in and upload them on your profile.\n\nNeed help? Reach {{LEADER_FIRST_NAME}} {{LEADER_LAST_NAME}} at {{LEADER_EMAIL}} or {{LEADER_PHONE}}.\n\nThank you,\n{{ORG_NAME}}"

---

## Assumptions

- Existing databases get the new email type, tokens, and seed template from `npm run seed`, which adds only what is missing.
- Organizations other than the seed organization get no reminder until an Org Admin adds a **Documents missing reminder** template.
- The 90-day due date stays guidance only. Nothing blocks uploads or approval after it.
- Staff review (**Reviewed**, Feature 104) doesn't matter. A document that is uploaded but not reviewed is not missing.

## Edge Cases

- Due date already passed → the reminder still sends weekly with the past date.
- Trip with no start date → the reminder sends (the job includes trips with no start date), and `DOCUMENTS_DUE_DATE` is empty.
- All documents uploaded → no reminder, even if staff haven't reviewed them.
- The participant uploads the last document → the next Tuesday sends nothing.
- A **Send Now** template for `documents-missing` → never sends. No event triggers it.
- A participant with two assignments on the same trip → each pre-approved assignment missing documents qualifies, and the per-person send record keeps it to one email per template and date.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: No other scheduled email changes recipients.

---

## Data Ownership & Isolation

No new endpoints. The scheduled job sends each email only to the participant it is about. The new tokens fill only from that participant's own assignment and documents. Template **Preview** keeps its existing access rules.

---

## Key Entities

None new. It adds seed rows for `emailType`, `emailToken`, and `emailTemplate`.

---

## API Requirements

No new endpoints. The email token value source list (used by the token form) gains **Participant missing documents** and **Trip documents due date**.

---

## Screen Requirements

No screen changes. The new email type shows in the email type and template lists, the two tokens in **Insert token**, and the seeded template in the organization's template list.

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

Background:
- Maria is a participant in "Hope Missions".
- Maria's Guatemala Clinic application (trip starts 03/15/2027, status active) is for the Nurse role. Nurse requires "RN License".
- The trip requires a passport.
- "Hope Missions" has a **Scheduled**, **Weekly (Tuesday)** **Documents missing reminder** template.

### US-113.1 — Get a weekly reminder to upload my documents

#### Scenario: Pre-approved participant missing documents gets the reminder
* **Given** Maria's application is pre-approved
* **And** she has no RN License and no passport
* **When** the scheduled email job runs on Tuesday 11/10/2026
* **Then** Maria is sent the Documents missing reminder

#### Scenario: No reminder when all documents are uploaded
* **Given** Maria's application is pre-approved
* **And** she has an RN License and a passport with files and expiration dates after the trip, not yet reviewed
* **When** the scheduled email job runs on Tuesday 11/10/2026
* **Then** Maria is not sent the Documents missing reminder

#### Scenario: Only pre-approved applications get the reminder
* **Given** Maria has no RN License and no passport
* **And** her application is incomplete, approved, cancelled, or declined
* **When** the scheduled email job runs on Tuesday 11/10/2026
* **Then** Maria is not sent the Documents missing reminder

#### Scenario: Reminder keeps going after the due date
* **Given** Maria's application is pre-approved and she has no passport
* **When** the scheduled email job runs on Tuesday 12/22/2026, after the 12/15/2026 due date
* **Then** Maria is sent the Documents missing reminder

### US-113.2 — Write the reminder with the missing documents and due date

#### Scenario: Missing documents token lists each missing document
* **Given** Maria has no RN License and no passport
* **When** the token values are built for Maria on Guatemala Clinic
* **Then** `MISSING_DOCUMENTS` lists the RN License text and "Passport", one per line

#### Scenario: Due date token is 90 days before the trip
* **When** the token values are built for Guatemala Clinic
* **Then** `DOCUMENTS_DUE_DATE` is "12/15/2026"

#### Scenario: Tokens are empty when nothing applies
* **Given** Maria has every required document uploaded
* **And** another trip has no start date
* **When** the token values are built for Maria on Guatemala Clinic and for the trip with no start date
* **Then** `MISSING_DOCUMENTS` is empty for Maria
* **And** `DOCUMENTS_DUE_DATE` is empty for the trip with no start date

### US-113.3 — Start with a default reminder

#### Scenario: Seed adds the reminder
* **When** the email type, token, and template seeds run
* **Then** the `documents-missing` email type, the `MISSING_DOCUMENTS` and `DOCUMENTS_DUE_DATE` tokens, and the seed organization's weekly Documents missing reminder template exist
* **And** running the seeds again adds nothing

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-113.1 | Pre-approved participant missing documents gets the reminder | `backend/tests/documents-missing-email.test.js` | `Pre-approved participant missing documents gets the reminder` |
| US-113.1 | No reminder when all documents are uploaded | `backend/tests/documents-missing-email.test.js` | `No reminder when all documents are uploaded` |
| US-113.1 | Only pre-approved applications get the reminder | `backend/tests/documents-missing-email.test.js` | `Only pre-approved applications get the reminder` |
| US-113.1 | Reminder keeps going after the due date | `backend/tests/documents-missing-email.test.js` | `Reminder keeps going after the due date` |
| US-113.2 | Missing documents token lists each missing document | `backend/tests/documents-missing-email.test.js` | `Missing documents token lists each missing document` |
| US-113.2 | Due date token is 90 days before the trip | `backend/tests/documents-missing-email.test.js` | `Due date token is 90 days before the trip` |
| US-113.2 | Tokens are empty when nothing applies | `backend/tests/documents-missing-email.test.js` | `Tokens are empty when nothing applies` |
| US-113.3 | Seed adds the reminder | `backend/tests/documents-missing-email.test.js` | `Seed adds the reminder` |

---

## Agent implementation request

```text
Implement Feature 113 from @features/feature-113-documents-missing-email.md on branch `feature/113-documents-missing-email`.

Backend: export a helper from myTripNextActions.js that returns an assignment's missing document names by the upload-documents rule (missingDocumentNames). In scheduledEmails.js add RECIPIENT_RULES["documents-missing"]: status pre_approved and at least one missing document. In emailTokenValues.js add value sources participant.missingDocuments (names joined by "\n", earliest assignment on the trip) and trip.documentsDueDate (start date minus 90 days, formatDate; empty without a start date). Seeds: email type documents-missing, tokens MISSING_DOCUMENTS and DOCUMENTS_DUE_DATE, and the weekly template in data/emailTemplates.json.
Tests per the Test Coverage Map; fix any existing tests that count seeded email types, tokens, templates, or value sources. Update features/reference/ (behavior.md email rows for types, tokens, template seed schedules, and scheduled recipients; api.md if it lists value sources).
```

---

## Definition of Done

*   [x] Email type seed per **FR-001**
*   [x] Scheduled job recipient rule per **FR-002**
*   [x] Value sources and tokens per **FR-003**, **FR-004**, **FR-005**
*   [x] Seed template per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Changing the `application-incomplete` reminder or any other scheduled email's recipients.
- A Send Now email when documents are uploaded or still missing.
- Reminders to staff about participants' missing documents.
- Enforcing the 90-day due date.
- Templates for organizations other than the seed organization.
