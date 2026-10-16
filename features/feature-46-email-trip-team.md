# Feature: Email Trip Team

**Feature ID:** 46
**Branch pattern:** `feature/46-email-trip-team`
**Status:** Ready
**Created:** 2026-10-16
**Input:** The trip page gets an **Email team** button. It opens a dialog where staff pick a **Trip Participant** email template, edit its subject and body for this send, choose who gets it (all potential participants, all accepted participants, or selected participants), preview the email as it will be sent, and send it now. Templates get a third function code, **Trip Participant**, for these hand-sent emails. Sending uses the email service ([Feature 43](feature-43-email-delivery.md)).
**Depends on:** [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md), [Feature 42 — Email Template Schedule](feature-42-email-template-schedule.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md), [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md)

---

## User Stories

### US-46.1: Mark templates for emailing the trip team

**As an** Org Admin
**I want** a **Trip Participant** function code on email templates
**So that** templates meant for hand-sent team emails are kept apart from scheduled and event emails

**Priority:** P1
**Independent test:** Org Admin saves a template with **Function code** **Trip Participant**, and it reloads with that function code and no schedule.
**Acceptance scenarios:** see ### US-46.1

### US-46.2: Open the team email dialog from the trip page

**As a** Trip Leader or Org Admin
**I want** an **Email team** button on the trip page that opens a dialog with the trip's **Trip Participant** templates
**So that** I can write to the team without leaving the trip

**Priority:** P1
**Independent test:** On the trip page, **Email team** opens a dialog; choosing a template fills **Subject** and **Email body**, which can be edited.
**Acceptance scenarios:** see ### US-46.2

### US-46.3: Choose who gets the email

**As a** Trip Leader or Org Admin
**I want** to send to all potential participants, all accepted participants, or participants I pick
**So that** each message reaches the right people

**Priority:** P1
**Independent test:** With one incomplete, one applied, one approved, and one declined participant and one Trip Leader, **All potential participants** sends four emails and **All accepted participants** sends one.
**Acceptance scenarios:** see ### US-46.3

### US-46.4: Preview the email before sending

**As a** Trip Leader or Org Admin
**I want** to see the email exactly as one recipient will get it
**So that** I can check the tokens and wording before it goes out

**Priority:** P1
**Independent test:** **Preview** shows From, To, Subject, and body with that participant's name and email in place of the tokens.
**Acceptance scenarios:** see ### US-46.4

### US-46.5: Send the email now

**As a** Trip Leader or Org Admin
**I want** **Send** to email every chosen participant right away
**So that** the team hears from me without waiting for a schedule

**Priority:** P1
**Independent test:** **Send** to two selected participants asks "Are you sure?" with 2 recipients; confirming sends two emails, each logged, and the dialog reports 2 sent.
**Acceptance scenarios:** see ### US-46.5

---

## Requirements

### Functional Requirements

- **FR-001**: Template **Function code** MUST allow a third value, **Trip Participant**, in the template form dropdown and on create and update. This changes Feature 39 **FR-006** (Scheduled and Send Now only). Any other value is still rejected with `400`.
- **FR-002**: A **Trip Participant** template MUST save with no schedule (`scheduleRule` and `scheduleDaysBefore` empty), like **Send Now** (Feature 42 **FR-006**). The template list shows an empty **Schedule** cell for it.
- **FR-003**: **Trip Participant** templates are sent only from this dialog. Event emails (Feature 45) and the scheduled email job (Feature 44) MUST NOT send them.
- **FR-004**: The trip page (`TripView`) MUST show an **Email team** button in the header next to **Trip Status** and **Edit trip**. It opens the **Email team** dialog.
- **FR-005**: Only a System Admin, an Org Admin of the trip's organization, or a Trip Leader of the trip may load templates, preview, or send (the same people who manage the trip's participants). Anyone else gets `403`.
- **FR-006**: The dialog's **Email template** dropdown MUST list the **Trip Participant** templates for the trip (its own templates) and for its organization (no trip), labelled by subject. Choosing a template MUST fill **Subject** and **Email body**, which stay editable.
- **FR-007**: Edits in the dialog apply only to this send. The saved template MUST NOT change.
- **FR-008**: The dialog MUST offer **Send to** with three choices:

  | Choice | Recipients |
  |--------|-----------|
  | **All potential participants** | Every **Trip Participant** and **Trip Leader** on the trip with status incomplete, applied, or approved |
  | **All accepted participants** | Every **Trip Participant** on the trip with status approved (no Trip Leaders) |
  | **Selected participants** | The people chosen in a multi-select listing the potential participants, with Trip Leaders labelled "(Trip Leader)" |

  The dialog shows how many people the choice reaches. A person who is both a **Trip Leader** and a **Trip Participant** on the trip gets one email. Other roles and declined or cancelled assignments are never recipients.
- **FR-009**: Each recipient MUST get their own email, addressed to that participant's email, with tokens in **Subject** and **Email body** filled for that participant, trip, and organization (Feature 40). The template's **To** is not used. **From** comes from the template's **From email** with tokens filled, and Feature 43 `EMAIL_SENDER` / Reply-To rules apply.
- **FR-010**: **Preview** MUST show the email as it will be sent to one recipient: From, Reply-To (when present), To, Subject, and body. A **Preview as** dropdown lists the current recipients and defaults to the first.
- **FR-011**: **Send** MUST first open a confirmation (`ConfirmDialog`) titled "Are you sure?" with the message "Send this email to N participants?" ("1 participant" when N is 1), where N is the recipient count, and buttons **Send** and **Cancel**. **Cancel** closes the confirmation and sends nothing. Confirming MUST send the email to every recipient through the email service (Feature 43). One recipient failing or being skipped MUST NOT stop the others. Each email sent is logged with its template, trip, and participant (Feature 45 **FR-012**), and with the subject and body as sent (dialog edits and tokens filled).
- **FR-012**: After sending, the dialog MUST show how many emails were sent, skipped, and failed, and list each skipped or failed participant with the reason.
- **FR-013**: **Preview** and **Send** MUST be disabled until a template is chosen, **Subject** and **Email body** are not empty, and there is at least one recipient. The server MUST reject the same cases with `400`: no template, a template that is not a **Trip Participant** template of the trip or its organization, empty subject or body, an unknown **Send to** choice, no recipients, or a selected person who is not a potential participant on the trip.
- **FR-014**: The email type seed (`seedEmailTypes.js`) MUST add the email type `team-update` with description **Trip team update** and event code `team-email`, for **Trip Participant** templates. `team-email` is not an event code the app sends automatically. An existing `team-update` type is left unchanged.

---

## Assumptions

- "Accepted" means application status **approved**.
- Any trip status can be emailed (draft, active, or past trips).
- The recipient count in the confirmation is the count the dialog shows for **Send to**.
- Sending waits for the mail server. With a mail server on the same machine and team sizes in the tens, this adds little time.
- The template's **To** is ignored here, so a template written for the event or scheduled flows can be copied into a **Trip Participant** template without changes.

## Edge Cases

- Participant with no email → skipped "No recipients."; the rest still send.
- Template **From email** empty after tokens → every recipient skipped "No sender."
- **All accepted participants** with no approved participants → recipient count 0, **Send** disabled; the server returns `400` "No participants to send to."
- Selected person who is declined, cancelled, or on another trip → `400`.
- Person who is both a **Trip Leader** and a **Trip Participant** on the trip → listed once, one email.
- Org template and trip template with the same email type → both are listed; the user picks one.
- Edited subject or body containing tokens → tokens fill per recipient.
- Mail server down → each recipient fails with the error; the response still returns `200` with the counts.

## Success Criteria

- **SC-001**: A Trip Leader can email the team from the trip page without editing the saved template.
- **SC-002**: Each recipient gets an email filled with their own details.
- **SC-003**: Every email sent appears in the email log with its template, trip, and participant.
- **SC-004**: Automated tests for the scenarios below pass.
- **SC-005**: After `npm run seed`, the **Trip team update** email type exists and can be chosen for a **Trip Participant** template.

---

## Data Ownership & Isolation

- Templates come only from the trip itself or the trip's organization.
- Recipients are only **Trip Participant** and **Trip Leader** assignments on that trip.
- Permissions match managing the trip's participants (Feature 7).

---

## Key Entities

- **EmailTemplate** — `functionCode` may be **Trip Participant**; read only in the dialog
- **TripPeopleRole** — recipients by role and status
- **EmailLog** — one row per email sent (Features 43, 45)

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/email-templates` | as today | Accepts `functionCode` **Trip Participant** (**FR-001**, **FR-002**) |
| `PUT` | `/trips/email-templates/:id` | as today | Accepts `functionCode` **Trip Participant** (**FR-001**, **FR-002**) |
| `GET` | `/trips/trips/:id/team-email/templates` | System Admin, Org Admin of the trip's org, Trip Leader of the trip | **Trip Participant** templates for the trip and its organization: `[{ id, tripId, subject, emailBody, fromEmail, emailTypeId }]` |
| `POST` | `/trips/trips/:id/team-email/preview` | same | Body `{ emailTemplateId, subject, emailBody, sendTo, personIds?, personId }` → `{ from, replyTo, to, subject, body }` for `personId`, who must be one of the recipients |
| `POST` | `/trips/trips/:id/team-email` | same | Body `{ emailTemplateId, subject, emailBody, sendTo, personIds? }` → `{ sent, skipped, failed, results: [{ personId, name, status, reason }] }` |

**Payload notes:** `sendTo` is `potential`, `accepted`, or `selected`. `personIds` is required and non-empty when `sendTo` is `selected`, and ignored otherwise.

**Status codes:** `403` when not allowed (**FR-005**); `404` when the trip is not found; `400` for the cases in **FR-013**.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `TripView` | **Email team** button in the header next to **Trip Status** and **Edit trip** |
| New `TripTeamEmailDialog` | **Email template** dropdown; **Subject** and **Email body** (editable); **Send to** radio (**All potential participants**, **All accepted participants**, **Selected participants**) with a participant multi-select for **Selected participants** and a recipient count; **Preview** button showing **Preview as**, From, Reply-To, To, Subject, and body; **Send** and **Cancel**; "Are you sure?" `ConfirmDialog` with the recipient count before sending; result summary after sending |
| `EmailTemplateFormDialog` | **Function code** dropdown adds **Trip Participant**; **Schedule** stays hidden for it |

---

## Data Model Requirements

None. `emailTemplate.functionCode` stays a string and may now hold `Trip Participant`.

---

## Acceptance Criteria (Gherkin)

### US-46.1 — Mark templates for emailing the trip team

#### Scenario: Template form offers Trip Participant function code
* **Given** I open the email template form
* **When** I open the Function code dropdown
* **Then** I see Scheduled, Send Now, and Trip Participant
* **And** Schedule is hidden when Trip Participant is chosen

#### Scenario: Trip Participant template saves with no schedule
* **Given** I am an Org Admin
* **When** I save a template with function code Trip Participant and a schedule of weekly
* **Then** the template saves with function code Trip Participant and no schedule

#### Scenario: Trip Participant templates are not sent automatically
* **Given** a Trip Participant template for event application-approved and a Trip Participant template for event pre-departure
* **When** the application-approved event fires and the scheduled email job runs
* **Then** no email is sent

### US-46.2 — Open the team email dialog from the trip page

#### Scenario: Email team button opens the dialog
* **Given** I am on the trip page
* **When** I click Email team
* **Then** the Email team dialog opens

#### Scenario: Dialog lists the trip's and organization's Trip Participant templates
* **Given** a Trip Participant template for the trip, a Trip Participant template for its organization, a Send Now template for its organization, and a Trip Participant template for another organization
* **When** a Trip Leader of the trip loads the team email templates
* **Then** only the trip's and its organization's Trip Participant templates are returned

#### Scenario: Choosing a template fills subject and body for editing
* **Given** the Email team dialog is open
* **When** I choose a template
* **Then** Subject and Email body show the template's subject and body
* **And** I can edit them

#### Scenario: Participants cannot email the team
* **Given** I am a Trip Participant on the trip and not a Trip Leader or Org Admin
* **When** I load the team email templates, preview, or send
* **Then** the request is rejected with 403

### US-46.3 — Choose who gets the email

#### Scenario: All potential participants includes Trip Leaders and excludes declined and cancelled
* **Given** Trip Participants with status incomplete, applied, approved, declined, and cancelled, and a Trip Leader
* **When** I send to All potential participants
* **Then** only the incomplete, applied, and approved participants and the Trip Leader are emailed

#### Scenario: All accepted participants sends only to approved
* **Given** Trip Participants with status applied and approved, and a Trip Leader
* **When** I send to All accepted participants
* **Then** only the approved participant is emailed

#### Scenario: Selected participants sends only to those chosen
* **Given** two potential participants and a Trip Leader
* **When** I send to Selected participants with one participant and the Trip Leader chosen
* **Then** only those two are emailed

#### Scenario: Selected participants must be potential participants on the trip
* **Given** a declined participant on the trip and a participant on another trip
* **When** I send to Selected participants with either of them chosen
* **Then** the request is rejected with 400

#### Scenario: Selected participants shows the participant picker
* **Given** the Email team dialog is open
* **When** I choose Selected participants
* **Then** a multi-select of the potential participants and Trip Leaders appears, with Trip Leaders labelled "(Trip Leader)"
* **And** the recipient count matches the people chosen

### US-46.4 — Preview the email before sending

#### Scenario: Preview shows the email as it will be sent
* **Given** a Trip Participant template whose From email is {{ORG_EMAIL}}
* **And** I edit the subject to "Hello {{PARTICIPANT_FIRST_NAME}}"
* **When** I preview the email as a participant named Pat with email pat@example.org
* **Then** the preview shows From as the organization email, To as pat@example.org, and Subject as "Hello Pat"
* **And** no email is sent

#### Scenario: Preview button shows the preview for the chosen recipient
* **Given** the Email team dialog has a template, subject, body, and recipients
* **When** I click Preview
* **Then** the preview shows Preview as set to the first recipient, with From, To, Subject, and body

### US-46.5 — Send the email now

#### Scenario: Send uses the edited subject and body and leaves the template unchanged
* **Given** a Trip Participant template with subject "Team update"
* **When** I send it to two selected participants with the subject edited to "Packing list"
* **Then** each participant is sent an email with subject "Packing list" to their own email
* **And** each email log row has the template, the trip, and that participant
* **And** each email log row has subject "Packing list"
* **And** the template's subject is still "Team update"

#### Scenario: One failed email does not stop the others
* **Given** two selected participants, one with no email
* **When** I send the email
* **Then** the response reports 1 sent and 1 skipped with reason "No recipients."

#### Scenario: Send asks for confirmation with the number of recipients
* **Given** the Email team dialog is ready to send to 3 participants
* **When** I click Send
* **Then** an "Are you sure?" confirmation shows "Send this email to 3 participants?"
* **And** no email is sent until I confirm

#### Scenario: Cancelling the confirmation sends nothing
* **Given** the "Are you sure?" confirmation is open
* **When** I click Cancel
* **Then** the confirmation closes and no email is sent

#### Scenario: Send shows how many emails were sent
* **Given** the Email team dialog is ready to send
* **When** I click Send, confirm, and the server reports 2 sent, 0 skipped, and 0 failed
* **Then** the dialog shows that 2 emails were sent

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-46.1 | Template form offers Trip Participant function code | `frontend/tests/` EmailTemplateFormDialog | `Template form offers Trip Participant function code` |
| US-46.1 | Trip Participant template saves with no schedule | `backend/tests/` team email | `Trip Participant template saves with no schedule` |
| US-46.1 | Trip Participant templates are not sent automatically | `backend/tests/` team email | `Trip Participant templates are not sent automatically` |
| US-46.2 | Email team button opens the dialog | `frontend/tests/` TripView | `Email team button opens the dialog` |
| US-46.2 | Dialog lists the trip's and organization's Trip Participant templates | `backend/tests/` team email | `Dialog lists the trip's and organization's Trip Participant templates` |
| US-46.2 | Choosing a template fills subject and body for editing | `frontend/tests/` TripTeamEmailDialog | `Choosing a template fills subject and body for editing` |
| US-46.2 | Participants cannot email the team | `backend/tests/` team email | `Participants cannot email the team` |
| US-46.3 | All potential participants includes Trip Leaders and excludes declined and cancelled | `backend/tests/` team email | `All potential participants includes Trip Leaders and excludes declined and cancelled` |
| US-46.3 | All accepted participants sends only to approved | `backend/tests/` team email | `All accepted participants sends only to approved` |
| US-46.3 | Selected participants sends only to those chosen | `backend/tests/` team email | `Selected participants sends only to those chosen` |
| US-46.3 | Selected participants must be potential participants on the trip | `backend/tests/` team email | `Selected participants must be potential participants on the trip` |
| US-46.3 | Selected participants shows the participant picker | `frontend/tests/` TripTeamEmailDialog | `Selected participants shows the participant picker` |
| US-46.4 | Preview shows the email as it will be sent | `backend/tests/` team email | `Preview shows the email as it will be sent` |
| US-46.4 | Preview button shows the preview for the chosen recipient | `frontend/tests/` TripTeamEmailDialog | `Preview button shows the preview for the chosen recipient` |
| US-46.5 | Send uses the edited subject and body and leaves the template unchanged | `backend/tests/` team email | `Send uses the edited subject and body and leaves the template unchanged` |
| US-46.5 | One failed email does not stop the others | `backend/tests/` team email | `One failed email does not stop the others` |
| US-46.5 | Send asks for confirmation with the number of recipients | `frontend/tests/` TripTeamEmailDialog | `Send asks for confirmation with the number of recipients` |
| US-46.5 | Cancelling the confirmation sends nothing | `frontend/tests/` TripTeamEmailDialog | `Cancelling the confirmation sends nothing` |
| US-46.5 | Send shows how many emails were sent | `frontend/tests/` TripTeamEmailDialog | `Send shows how many emails were sent` |

---

## Agent implementation request

```text
Implement Feature 46 from @features/feature-46-email-trip-team.md on branch `feature/46-email-trip-team`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (team email endpoints; **Trip Participant** function code on template create and update), `features/reference/behavior.md` (function code choices, team email recipients, preview, and send rules)

---

## Definition of Done

*   [x] **Trip Participant** function code on the template form and API, saved with no schedule, never sent automatically (**FR-001**–**FR-003**)
*   [x] **Email team** button and dialog on the trip page with template choice and editable subject and body (**FR-004**, **FR-006**, **FR-007**)
*   [x] Permissions (**FR-005**)
*   [x] **Send to** choices and recipient rules (**FR-008**, **FR-009**)
*   [x] Preview (**FR-010**)
*   [x] Send with "Are you sure?" confirmation and recipient count, results summary, and validation (**FR-011**–**FR-013**)
*   [x] `team-update` email type in the seed (**FR-014**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/46-email-trip-team`; PR → `dev`

---

## Out of Scope

- Saving dialog edits back to the template
- Emailing donors, or people who are not Trip Participants or Trip Leaders on the trip
- Trip Leaders in **All accepted participants**
- Attachments, CC, or BCC
- Scheduling the email for later
- A history screen of team emails sent (the email log records them)
