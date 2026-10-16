# Feature: Email Delivery

**Feature ID:** 43
**Branch pattern:** `feature/43-email-delivery`
**Status:** Ready
**Created:** 2026-10-15
**Input:** The backend gains one email service that sends a template to a trip participant. It fills in tokens, sends the message, and records it in the email log. `.env` settings choose how mail goes out. In **file** mode (development), each email is written as a text file in a test mail folder in the project. In **smtp** mode (production), email goes through a mail server, normally the one running on the production machine. The service uses [Nodemailer](https://nodemailer.com/). This feature adds no screens; [Feature 44](feature-44-daily-scheduled-emails.md) calls the service.
**Depends on:** [Feature 40 — Email Template Tokens and Preview](feature-40-email-template-tokens.md), [Feature 41 — Email Template To Address](feature-41-email-template-to-address.md)

---

## User Stories

### US-43.1: Send a template email to a participant

**As the** system
**I want** to send a template to a participant with every token filled in
**So that** each participant receives an email written for their trip

**Priority:** P1
**Independent test:** Sending a template with **To** `{{PARTICIPANT_EMAIL}}` and **Subject** `Welcome {{PARTICIPANT_FIRST_NAME}}` for a participant named Ana sends one email to Ana's address with subject `Welcome Ana`, and the email log has a row for it.
**Acceptance scenarios:** see ### US-43.1

### US-43.2: See development emails as text files

**As a** developer
**I want** emails written as text files in a test mail folder instead of being sent
**So that** I can read exactly what would go out without emailing real people

**Priority:** P1
**Independent test:** With `EMAIL_MODE=file`, sending a template creates one `.txt` file in the test mail folder showing From, To, Subject, and the body.
**Acceptance scenarios:** see ### US-43.2

### US-43.3: Send through the production mail server

**As an** operator
**I want** the mail server settings to come from `.env`
**So that** production sends through the server's own mail server without code changes

**Priority:** P1
**Independent test:** With `EMAIL_MODE=smtp`, `SMTP_HOST=localhost`, and `SMTP_PORT=25`, sending a template hands the message to the mail server at `localhost:25`.
**Acceptance scenarios:** see ### US-43.3

---

## Requirements

### Functional Requirements

- **FR-001**: The backend MUST add the `nodemailer` package and one email service module used for all template sends.
- **FR-002**: The service MUST send one template for one trip and one participant. It fills tokens in **From email**, **To**, **Subject**, and **Email body** with the same functions Preview uses (Feature 40 **FR-010**, Feature 41 **FR-007** and **FR-013**).
- **FR-003**: The email MUST be plain text: the filled **Email body** is the message text.
- **FR-004**: When **To** has no recipients after tokens are filled (for example the participant has no email address), the service MUST NOT send. It returns **skipped** with the reason "No recipients."
- **FR-005**: When **From email** is empty after tokens are filled (for example the organization has no email), the service MUST NOT send. It returns **skipped** with the reason "No sender."
- **FR-006**: The service MUST read these `.env` settings:

  | Key | Default | Meaning |
  |-----|---------|---------|
  | `EMAIL_MODE` | `file` | `file` writes text files; `smtp` sends through a mail server |
  | `EMAIL_FILE_DIR` | `test-mail` | Folder for file mode, relative to `backend/` |
  | `SMTP_HOST` | `localhost` | Mail server host (smtp mode) |
  | `SMTP_PORT` | `25` | Mail server port (smtp mode) |
  | `SMTP_SECURE` | `false` | `true` connects with TLS from the start (usually port 465) |
  | `SMTP_USER` | empty | Mail server login; leave empty when the server needs none |
  | `SMTP_PASSWORD` | empty | Mail server password |
  | `EMAIL_SENDER` | empty | When set, every email is sent From this address and the template's **From email** becomes **Reply-To** |

- **FR-007**: An `EMAIL_MODE` other than `file` or `smtp` MUST be treated as `file`.
- **FR-008**: In **file** mode, the service MUST write each email as one UTF-8 `.txt` file in `EMAIL_FILE_DIR`, creating the folder when missing. The file name is the send time plus a short random suffix (for example `20261015-070001-123-a1b2c3.txt`). The file contains `Date:`, `From:`, `Reply-To:` (only when present), `To:`, and `Subject:` lines, one blank line, then the body.
- **FR-009**: In **smtp** mode, the service MUST send through Nodemailer SMTP using `SMTP_HOST`, `SMTP_PORT`, and `SMTP_SECURE`. It logs in with `SMTP_USER` and `SMTP_PASSWORD` only when `SMTP_USER` is set.
- **FR-010**: When `EMAIL_SENDER` is set, the email MUST be sent From `EMAIL_SENDER` with **Reply-To** set to the filled **From email**. When it is empty, the email is sent From the filled **From email** with no **Reply-To**.
- **FR-011**: Each email sent or written MUST add one `emailLog` row: `toEmail` is the filled **To**, `fromEmail` is the address the email was sent From, plus `subject`, `content` (the body), and `emailId` (the mail server's message ID, or the file name in file mode). The service returns **sent** with the new `emailLog` id.
- **FR-012**: When sending fails, the service MUST NOT add an `emailLog` row. It writes the error to the application log and returns **failed** with the error message.
- **FR-013**: `emailLog.toEmail` MUST hold up to 1000 characters to match **To** (Feature 41). `ensureSchema` MUST widen the column when it is shorter.
- **FR-014**: `backend/.env.example` MUST list every key in **FR-006** with development values (`EMAIL_MODE=file`, `EMAIL_FILE_DIR=test-mail`). `.gitignore` MUST ignore `backend/test-mail/`.
- **FR-015**: The deploy workflow MUST write the **FR-006** keys into the production `.env` from repository secrets and variables, the same way it writes the database keys.
- **FR-016**: Backend tests MUST NOT send real email. They run in file mode with a temporary folder, or replace the Nodemailer transport.

---

## Assumptions

- Production runs a mail server on the same machine (for example Postfix) that accepts mail on `localhost:25` without a login. Installing and configuring that server is outside this feature.
- Mail sent as an organization's address (for example `info@healthtalents.org`) from the production server is often marked as spam unless that domain's SPF and DKIM records allow the server. `EMAIL_SENDER` lets production send from an address the server is allowed to use while replies still go to the organization.
- One call sends one email. Several **To** recipients share that one email.
- **Attachment path** on the template is not sent.
- File mode keeps every file; developers delete old ones by hand.

## Edge Cases

- Participant with no email and **To** `{{PARTICIPANT_EMAIL}}` → skipped, "No recipients."
- **To** `{{PARTICIPANT_EMAIL}}, office@example.org` for a participant with no email → sent to `office@example.org` only.
- Organization with no email and **From email** `{{ORG_EMAIL}}` → skipped, "No sender."
- `EMAIL_MODE` blank or misspelled → file mode.
- `EMAIL_FILE_DIR` missing on disk → created on first send.
- Mail server not reachable in smtp mode → failed, no `emailLog` row, error in the application log.

## Success Criteria

- **SC-001**: In development, sending a template writes a readable text file in `backend/test-mail/` and no real email leaves the machine.
- **SC-002**: In production, changing only `.env` sends through the machine's mail server.
- **SC-003**: Every email sent appears in the email log.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- The service fills tokens only from the template's organization, the given trip, and the given participant (Feature 40).
- The service has no endpoint; only server code calls it.

---

## Key Entities

- **EmailLog** — one row per email sent; `toEmail` widened to 1000 characters
- **EmailTemplate** — read only

---

## API Requirements

None. This feature adds no endpoints.

---

## Screen Requirements

None.

---

## Data Model Requirements

### `emailLog` column changed by this feature

| Column | Type | Rules |
|--------|------|--------|
| toEmail | STRING(1000) | required; the filled **To** list for template sends |

---

## Acceptance Criteria (Gherkin)

### US-43.1 — Send a template email to a participant

#### Scenario: Template email fills in tokens
* **Given** a template with To "{{PARTICIPANT_EMAIL}}" and Subject "Welcome {{PARTICIPANT_FIRST_NAME}}"
* **And** a trip participant Ana with email ana@example.org
* **When** the template is sent for that trip and participant
* **Then** one email goes to ana@example.org with Subject "Welcome Ana"

#### Scenario: Sent email is recorded in the email log
* **Given** a template and a trip participant with an email address
* **When** the template is sent for that trip and participant
* **Then** the email log has a row with that To, From, Subject, and body

#### Scenario: Email with no recipients is not sent
* **Given** a template with To "{{PARTICIPANT_EMAIL}}"
* **And** a trip participant with no email address
* **When** the template is sent for that trip and participant
* **Then** no email is sent
* **And** the result is skipped with "No recipients."

#### Scenario: Email with no sender is not sent
* **Given** a template with From email "{{ORG_EMAIL}}"
* **And** the organization has no email
* **When** the template is sent for one of its trip participants
* **Then** no email is sent
* **And** the result is skipped with "No sender."

#### Scenario: Failed send is not logged
* **Given** the mail server rejects the email
* **When** a template is sent
* **Then** the result is failed with the error message
* **And** the email log has no new row

### US-43.2 — See development emails as text files

#### Scenario: File mode writes the email to a text file
* **Given** EMAIL_MODE is file
* **When** a template is sent for a trip participant
* **Then** one .txt file is written to the test mail folder
* **And** it shows From, To, Subject, and the body

#### Scenario: Unknown mode uses file mode
* **Given** EMAIL_MODE is "smpt"
* **When** a template is sent for a trip participant
* **Then** one .txt file is written to the test mail folder

### US-43.3 — Send through the production mail server

#### Scenario: Smtp mode sends through the configured mail server
* **Given** EMAIL_MODE is smtp with SMTP_HOST "localhost" and SMTP_PORT 25
* **When** a template is sent for a trip participant
* **Then** the email is handed to the mail server at localhost port 25

#### Scenario: Sender setting sends from the app address with Reply-To
* **Given** EMAIL_SENDER is "trips@example.org"
* **And** a template with From email "office@example.org"
* **When** the template is sent for a trip participant
* **Then** the email is From trips@example.org
* **And** Reply-To is office@example.org

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-43.1 | Template email fills in tokens | `backend/tests/` email delivery | `Template email fills in tokens` |
| US-43.1 | Sent email is recorded in the email log | `backend/tests/` email delivery | `Sent email is recorded in the email log` |
| US-43.1 | Email with no recipients is not sent | `backend/tests/` email delivery | `Email with no recipients is not sent` |
| US-43.1 | Email with no sender is not sent | `backend/tests/` email delivery | `Email with no sender is not sent` |
| US-43.1 | Failed send is not logged | `backend/tests/` email delivery | `Failed send is not logged` |
| US-43.2 | File mode writes the email to a text file | `backend/tests/` email delivery | `File mode writes the email to a text file` |
| US-43.2 | Unknown mode uses file mode | `backend/tests/` email delivery | `Unknown mode uses file mode` |
| US-43.3 | Smtp mode sends through the configured mail server | `backend/tests/` email delivery | `Smtp mode sends through the configured mail server` |
| US-43.3 | Sender setting sends from the app address with Reply-To | `backend/tests/` email delivery | `Sender setting sends from the app address with Reply-To` |

---

## Agent implementation request

```text
Implement Feature 43 from @features/feature-43-email-delivery.md on branch `feature/43-email-delivery`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`emailLog.toEmail` length, `emailLog` used for template sends), `features/reference/behavior.md` (email delivery modes, `.env` keys, skipped and failed sends)

---

## Definition of Done

*   [x] `nodemailer` added; one email service for template sends (**FR-001**, **FR-002**, **FR-003**)
*   [x] Skips with no recipients or no sender (**FR-004**, **FR-005**)
*   [x] `.env` settings, file mode, and smtp mode (**FR-006** to **FR-010**)
*   [x] Email log row per email sent; failures logged, not recorded (**FR-011**, **FR-012**)
*   [x] `emailLog.toEmail` widened (**FR-013**)
*   [x] `.env.example`, `.gitignore`, and deploy workflow updated (**FR-014**, **FR-015**)
*   [x] Tests send no real email (**FR-016**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/43-email-delivery`; PR → `dev`

---

## Out of Scope

- Deciding when or to whom to send (Feature 44)
- Sending **Send Now** templates when events happen
- HTML email, attachments, **CC**, or **BCC**
- Installing or configuring the production mail server, SPF, or DKIM
- A screen for viewing the email log or test mail files
- Retrying failed sends
