# Feature: SMTP Password from AWS Secrets Manager

**Feature ID:** 50
**Branch pattern:** `feature/50-aws-secrets-smtp-password`
**Status:** Implemented
**Created:** 2026-10-16
**Input:** In production the mail server (Amazon SES) password should come from AWS Secrets Manager instead of the `.env` file. The production server runs the AWS Secrets Manager Agent, which answers on `http://localhost:2773/secretsmanager/get?secretId=<name>` when the request carries the header `X-Aws-Parameters-Secrets-Token` with the token stored in `/var/run/awssmatoken`. The secret is named `SES_EMAIL_PASSWORD`.
**Depends on:** [Feature 43 — Email Delivery](feature-43-email-delivery.md)

---

## User Stories

### US-50.1: Read the mail server password from AWS Secrets Manager
**As a** system administrator
**I want** the backend to get the SMTP password from AWS Secrets Manager
**So that** the password is not stored in GitHub or in the production `.env` file

**Priority:** P1
**Independent test:** With `EMAIL_MODE=smtp` and `SMTP_PASSWORD_SECRET_ID=SES_EMAIL_PASSWORD`, sending an email asks the agent for `SES_EMAIL_PASSWORD` and signs in to the mail server with the value it returns.
**Acceptance scenarios:** see ### US-50.1

---

## Requirements

### Functional Requirements

- **FR-001**: A new `.env` setting `SMTP_PASSWORD_SECRET_ID` names the AWS Secrets Manager secret that holds the SMTP password. When it is blank or missing, the SMTP password comes from `SMTP_PASSWORD` exactly as today (Feature 43).
- **FR-002**: When `EMAIL_MODE=smtp`, `SMTP_USER` is set, and `SMTP_PASSWORD_SECRET_ID` is set, the email service MUST get the SMTP password by calling `GET http://localhost:2773/secretsmanager/get?secretId=<SMTP_PASSWORD_SECRET_ID>` with header `X-Aws-Parameters-Secrets-Token` set to the contents of the token file, and use the response's `SecretString` as the password. `SMTP_PASSWORD` is ignored.
- **FR-003**: The token file is `/var/run/awssmatoken`. A new `.env` setting `SECRETS_AGENT_TOKEN_FILE` may give a different path. Surrounding whitespace in the token is removed.
- **FR-004**: The password MUST be read each time an email is sent, so a changed (rotated) secret is used without restarting the backend. The agent caches secrets, so this does not call AWS for every email.
- **FR-005**: When the password cannot be read (token file missing, agent not reachable, agent returns an error status, or no `SecretString`), the email MUST NOT be sent and the send returns failed with the reason "Could not read the SMTP password from AWS Secrets Manager." The cause goes to the application log. The secret value MUST never be written to any log. As with other failed sends (Feature 43), no `emailLog` row is added, and the daily job (Feature 44) tries the email again on its next run.
- **FR-006**: File mode (`EMAIL_MODE=file`) MUST NOT call the agent.
- **FR-007**: The deploy workflow MUST write `SMTP_PASSWORD_SECRET_ID` (from the GitHub variable of the same name) to the production `.env`. `backend/.env.example` lists `SMTP_PASSWORD_SECRET_ID=` and `SECRETS_AGENT_TOKEN_FILE=`.

---

## Assumptions

- The production server already runs the AWS Secrets Manager Agent on port 2773 and writes its token to `/var/run/awssmatoken` (installed outside this feature).
- The server's IAM role can read the secret (`secretsmanager:GetSecretValue` on `SES_EMAIL_PASSWORD`).
- The secret is stored as plain text: its whole `SecretString` is the SMTP password.
- The agent returns the current version (`AWSCURRENT`) when no version stage is given, so no version stage is sent.
- `SMTP_USER` (the SES SMTP username) stays in the `SMTP_USER` setting.

## Edge Cases

- `SMTP_PASSWORD_SECRET_ID` set but `SMTP_USER` blank → no sign-in is used (Feature 43), so the agent is not called.
- The secret is changed in AWS → the next email after the agent's cache expires uses the new password.
- The agent is down while the daily job runs → each email fails with the FR-005 reason; the job continues and retries them on its next run (Feature 44).

## Success Criteria

- **SC-001**: Production sends email through SES with no SMTP password in GitHub or the `.env` file.
- **SC-002**: Development and file mode work exactly as before.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Secret value** | Used only to sign in to the mail server; never logged, stored in the database, or returned by an API |

---

## API Requirements

No endpoint changes.

---

## Screen Requirements

No screen changes.

---

## Data Model Requirements

No database changes.

---

## Configuration

| Setting | Where | Example | Notes |
|---------|-------|---------|-------|
| `SMTP_PASSWORD_SECRET_ID` | `.env`; GitHub variable for deploy | `SES_EMAIL_PASSWORD` | Blank → use `SMTP_PASSWORD` |
| `SECRETS_AGENT_TOKEN_FILE` | `.env` (optional) | `/var/run/awssmatoken` | Default `/var/run/awssmatoken` |

---

## Acceptance Criteria (Gherkin)

### US-50.1 — Read the mail server password from AWS Secrets Manager

#### Scenario: SMTP password comes from AWS Secrets Manager
* **Given** `EMAIL_MODE` is `smtp`, `SMTP_USER` is set, and `SMTP_PASSWORD_SECRET_ID` is `SES_EMAIL_PASSWORD`
* **And** the token file contains `agent-token`
* **And** the agent returns `SecretString` `ses-password` for `SES_EMAIL_PASSWORD`
* **When** a template email is sent
* **Then** the agent is asked for `secretId=SES_EMAIL_PASSWORD` with header `X-Aws-Parameters-Secrets-Token: agent-token`
* **And** the mail server sign-in uses password `ses-password`
* **And** the email is sent

#### Scenario: SMTP password setting is used when no secret is named
* **Given** `EMAIL_MODE` is `smtp`, `SMTP_USER` is set, `SMTP_PASSWORD` is `env-password`, and `SMTP_PASSWORD_SECRET_ID` is blank
* **When** a template email is sent
* **Then** the agent is not called
* **And** the mail server sign-in uses password `env-password`

#### Scenario: Email fails when the secret cannot be read
* **Given** `EMAIL_MODE` is `smtp`, `SMTP_USER` is set, and `SMTP_PASSWORD_SECRET_ID` is `SES_EMAIL_PASSWORD`
* **And** the agent returns an error
* **When** a template email is sent
* **Then** the email is not sent
* **And** the send fails with "Could not read the SMTP password from AWS Secrets Manager."
* **And** no email log row is added

#### Scenario: Email fails when the token file is missing
* **Given** `EMAIL_MODE` is `smtp`, `SMTP_USER` is set, and `SMTP_PASSWORD_SECRET_ID` is `SES_EMAIL_PASSWORD`
* **And** the token file does not exist
* **When** a template email is sent
* **Then** the agent is not called
* **And** the send fails with "Could not read the SMTP password from AWS Secrets Manager."

#### Scenario: File mode does not call the agent
* **Given** `EMAIL_MODE` is `file` and `SMTP_PASSWORD_SECRET_ID` is `SES_EMAIL_PASSWORD`
* **When** a template email is sent
* **Then** the agent is not called
* **And** the email is written to a file

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-50.1 | SMTP password comes from AWS Secrets Manager | `backend/tests/aws-secrets.test.js` | `SMTP password comes from AWS Secrets Manager` |
| US-50.1 | SMTP password setting is used when no secret is named | `backend/tests/aws-secrets.test.js` | `SMTP password setting is used when no secret is named` |
| US-50.1 | Email fails when the secret cannot be read | `backend/tests/aws-secrets.test.js` | `Email fails when the secret cannot be read` |
| US-50.1 | Email fails when the token file is missing | `backend/tests/aws-secrets.test.js` | `Email fails when the token file is missing` |
| US-50.1 | File mode does not call the agent | `backend/tests/aws-secrets.test.js` | `File mode does not call the agent` |

Tests replace `fetch` and the mail transport (`emailTransport.create`) so nothing reaches AWS or a mail server, and point `SECRETS_AGENT_TOKEN_FILE` at a temporary file.

---

## Agent implementation request

```text
Implement Feature 50 from @features/feature-50-aws-secrets-smtp-password.md on branch `feature/50-aws-secrets-smtp-password`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend before finishing.
Update @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Feature 43 row or a new row: SMTP password from AWS Secrets Manager when `SMTP_PASSWORD_SECRET_ID` is set)

---

## Definition of Done

*   [x] SMTP password read from the Secrets Manager Agent when `SMTP_PASSWORD_SECRET_ID` is set; `SMTP_PASSWORD` used otherwise (**FR-001**–**FR-004**)
*   [x] Read failure fails the send with the FR-005 reason, never logs the secret (**FR-005**)
*   [x] File mode never calls the agent (**FR-006**)
*   [x] Deploy workflow and `backend/.env.example` updated (**FR-007**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend
*   [ ] On `feature/50-aws-secrets-smtp-password`; PR → `dev`

---

## Out of Scope

- Installing or configuring the AWS Secrets Manager Agent, the IAM role, or the secret itself
- Reading other settings (database password, `AUTH_SECRET`, `SMTP_USER`) from AWS Secrets Manager
- Secrets stored as JSON key/value pairs
- Asking for a version stage other than the current one
- Calling AWS Secrets Manager directly with the AWS SDK
