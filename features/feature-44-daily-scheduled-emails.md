# Feature: Daily Scheduled Emails

**Feature ID:** 44
**Branch pattern:** `feature/44-daily-scheduled-emails`
**Status:** Ready
**Created:** 2026-10-15
**Input:** Every morning a backend job sends the **Scheduled** email templates that are due that day. A template's schedule (Feature 42) decides the days: **Daily**, **Weekly** on Tuesdays, or a number of days before the trip starts. Rules written in code for each email type decide which trip participants receive it. The job sends through the email service (Feature 43), records every participant it handles so nobody gets the same email twice in one day, and supports a dry run. On the production server a `systemd` timer starts the job at 7:00 AM.
**Depends on:** [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md), [Feature 42 — Email Template Schedule](feature-42-email-template-schedule.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md)

---

## User Stories

### US-44.1: Send due scheduled emails each morning

**As an** Org Admin
**I want** scheduled templates sent automatically on the days their schedule says
**So that** reminders go out on time without anyone sending them by hand

**Priority:** P1
**Independent test:** On a Tuesday, running the job sends a weekly template to each qualifying participant on the organization's active trips. Running it on a Wednesday sends that template to no one.
**Acceptance scenarios:** see ### US-44.1

### US-44.2: Send each email type only to the participants it is for

**As an** Org Admin
**I want** each reminder to reach only the participants it applies to
**So that** a participant who has already paid does not get a payment reminder

**Priority:** P1
**Independent test:** On a trip with one approved participant who owes money and one who has paid in full, the payment reminder goes only to the participant who owes money.
**Acceptance scenarios:** see ### US-44.2

### US-44.3: Run the job safely

**As an** operator
**I want** reruns to send nothing twice, and a dry run that lists what would go out
**So that** I can restart or test the job without emailing participants again

**Priority:** P1
**Independent test:** Running the job twice for the same date sends each email once. A dry run lists the emails due and sends and records nothing.
**Acceptance scenarios:** see ### US-44.3

---

## Requirements

### Functional Requirements

- **FR-001**: The backend MUST provide the command `npm run send-scheduled-emails` (script `app/scripts/sendScheduledEmails.js`). It accepts `--date=YYYY-MM-DD` to run for another date and `--dry-run`. Without `--date`, the job date is today in the `SCHEDULED_EMAIL_TIMEZONE` time zone (`.env`, default `America/Chicago`).
- **FR-002**: The job MUST consider **Scheduled** templates that have a schedule (Feature 42). **Send Now** templates and **Scheduled** templates with no schedule are ignored.
- **FR-003**: The job MUST consider trips whose status is **active** and whose start date is after the job date. A trip with no start date counts as not started.
- **FR-004**: For each trip, an organization template (no trip) applies when the trip belongs to that organization. When the trip has its own **Scheduled** template of an email type, the organization's **Scheduled** templates of that email type MUST NOT be used for that trip.
- **FR-005**: A template is due on the job date when:
  - **Daily**: every day.
  - **Weekly**: the job date is a Tuesday.
  - **Days before trip start**: the trip's start date is exactly **Days before trip start** days after the job date. Trips with no start date never match.
- **FR-006**: Recipients MUST be the trip's **Trip Participant** assignments chosen by the email type's event code:

  | Event code | Participants who receive it |
  |------------|------------------------------|
  | `application-incomplete` | Application status **incomplete** |
  | `deposit-due` | Status **approved**, the trip deposit is above $0, and amount raised is below the deposit |
  | `payment-due` | Status **approved** and amount owed is above $0 |
  | `pre-departure` | Status **approved** |

  Amount raised and amount owed are worked out the same way as the Feature 40 tokens. Templates whose email type has any other event code, or no email type, send to no one.
- **FR-007**: For each due template and each recipient, the job MUST call the email service (Feature 43) once with that trip and participant.
- **FR-008**: The job MUST record each template, trip, participant, and job date it handles in `scheduledEmailSend` with the result **sent**, **skipped**, or **failed**, the reason, and the `emailLog` id when sent. A template, trip, participant, and date already recorded as **sent** or **skipped** MUST NOT be sent again. One recorded as **failed** MUST be tried again on the next run for that date, and its record updated.
- **FR-009**: A failed email MUST NOT stop the job; it continues with the remaining emails.
- **FR-010**: With `--dry-run`, the job MUST print one line per email it would send (job date, trip, participant, email type, filled **To**, filled **Subject**) and MUST NOT send or record anything.
- **FR-011**: When the job finishes, it MUST write a summary to the application log and the console, for example `Scheduled emails for 2026-10-20: 12 sent, 1 skipped, 0 failed.`
- **FR-012**: The repository MUST include `backend/trips-scheduled-emails.service` (runs `npm run send-scheduled-emails` once, in the same folder and as the same user as `trips-backend.service`) and `backend/trips-scheduled-emails.timer` (`OnCalendar=*-*-* 07:00:00 America/Chicago`, `Persistent=true`). The deploy bundle MUST include both files, and the deploy workflow MUST install them and enable the timer.
- **FR-013**: `ensureSchema` MUST create `scheduledEmailSend` when missing. `backend/.env.example` and the deploy workflow MUST include `SCHEDULED_EMAIL_TIMEZONE`.

---

## Assumptions

- The job runs once each morning at 7:00 AM Central. To change the time, edit `OnCalendar` in the timer file. `SCHEDULED_EMAIL_TIMEZONE` should match the timer's time zone so the job date is the same calendar day.
- `Persistent=true` runs a missed morning's job as soon as the server is back up that day. A day the server is down entirely is not made up later.
- In development, the command runs by hand. With `EMAIL_MODE=file` (Feature 43), emails land in `backend/test-mail/`.
- Trip leaders do not receive scheduled emails unless the template's **To** lists them, for example `{{LEADER_EMAIL}}`. **To** applies per participant, so a fixed address in **To** receives one copy for each participant.
- The rules in **FR-006** change only through a code change and a spec update.
- **Weekly** means Tuesday, as defined in Feature 42.

## Edge Cases

- Trip starting today or earlier → no scheduled emails for it.
- Trip status **completed** or **inactive** → no scheduled emails.
- Template **5 days before trip start** and trip starting in 4 or 6 days → not due.
- Participant with no email and **To** `{{PARTICIPANT_EMAIL}}` → recorded **skipped**, "No recipients."
- Trip with no participants who match the rule → nothing sent, nothing recorded.
- Two organization templates of the same email type (for example 5 days and 1 day before start) → each is due on its own day.
- Job run twice the same day → the second run sends only previously **failed** emails.
- `--date` not in `YYYY-MM-DD` form → the command prints an error and exits without sending.

## Success Criteria

- **SC-001**: Due scheduled templates reach the right participants each morning with no manual step.
- **SC-002**: No participant receives the same scheduled email twice on one day.
- **SC-003**: An operator can preview a day's emails with a dry run.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Each trip uses only its own organization's templates and its own templates.
- Tokens fill from that trip, its organization, and the one participant being emailed (Feature 43).

---

## Key Entities

- **ScheduledEmailSend** — one row per template, trip, participant, and job date handled
- **EmailTemplate**, **EmailType**, **Trip**, **TripPeopleRole**, **TripDonation** — read only

---

## API Requirements

None. The job runs as a command.

---

## Screen Requirements

None.

---

## Data Model Requirements

### `scheduledEmailSend` (new)

| Column | Type | Rules |
|--------|------|--------|
| id | INTEGER PK | autoIncrement |
| emailTemplateId | INTEGER | required; FK → `emailTemplate.id` |
| tripId | INTEGER | required; FK → `trip.id` |
| personId | INTEGER | required; FK → `person.id` |
| sendDate | DATEONLY | required; the job date |
| status | ENUM(`sent`, `skipped`, `failed`) | required |
| reason | STRING(1000) | skip reason or error message |
| emailLogId | INTEGER | optional; FK → `emailLog.id` when sent |
| createdAt, updatedAt | DATE | Sequelize timestamps |

**Unique:** (`emailTemplateId`, `tripId`, `personId`, `sendDate`)

---

## Acceptance Criteria (Gherkin)

### US-44.1 — Send due scheduled emails each morning

#### Scenario: Weekly template sends on Tuesday
* **Given** a weekly pre-departure template and an active trip with an approved participant
* **When** the job runs for a Tuesday
* **Then** the participant is sent the email

#### Scenario: Weekly template does not send on other days
* **Given** a weekly pre-departure template and an active trip with an approved participant
* **When** the job runs for a Wednesday
* **Then** no email is sent

#### Scenario: Daily template sends every day
* **Given** a daily pre-departure template and an active trip with an approved participant
* **When** the job runs for any date before the trip starts
* **Then** the participant is sent the email

#### Scenario: Days-before template sends that many days before trip start
* **Given** a pre-departure template sent 5 days before trip start
* **And** an active trip starting 2026-11-10 with an approved participant
* **When** the job runs for 2026-11-05
* **Then** the participant is sent the email
* **When** the job runs for 2026-11-06
* **Then** no email is sent

#### Scenario: Trip template replaces the organization template for its trip
* **Given** an organization weekly pre-departure template
* **And** a trip with its own weekly pre-departure template
* **When** the job runs for a Tuesday
* **Then** that trip's participants are sent only the trip template

#### Scenario: Started and inactive trips get no scheduled emails
* **Given** a daily pre-departure template
* **And** a trip that started yesterday and an inactive trip that starts next month
* **When** the job runs
* **Then** no email is sent

#### Scenario: Send Now templates are not sent by the job
* **Given** a Send Now template for an email type with a rule
* **When** the job runs
* **Then** no email is sent

### US-44.2 — Send each email type only to the participants it is for

#### Scenario: Incomplete-application reminder goes only to incomplete applications
* **Given** a daily application-incomplete template
* **And** a trip with one incomplete and one approved participant
* **When** the job runs
* **Then** only the incomplete participant is sent the email

#### Scenario: Deposit reminder goes to approved participants below the deposit
* **Given** a daily deposit-due template and a trip with a 500 deposit
* **And** approved participants who have raised 100 and 600
* **When** the job runs
* **Then** only the participant who raised 100 is sent the email

#### Scenario: Payment reminder goes to approved participants who owe money
* **Given** a daily payment-due template and a trip costing 2000
* **And** approved participants who have raised 500 and 2000
* **When** the job runs
* **Then** only the participant who raised 500 is sent the email

#### Scenario: Email types without a rule send nothing
* **Given** a daily Scheduled template whose email type event code is application-approved
* **When** the job runs
* **Then** no email is sent

### US-44.3 — Run the job safely

#### Scenario: Running twice on the same day sends once
* **Given** a due template and a qualifying participant
* **When** the job runs twice for the same date
* **Then** the participant is sent the email once

#### Scenario: Failed email is tried again on the next run
* **Given** the email to a participant failed on the first run for a date
* **When** the job runs again for that date
* **Then** the email is sent
* **And** the record for that participant shows sent

#### Scenario: One failed email does not stop the rest
* **Given** a due template and two qualifying participants
* **And** the email to the first participant fails
* **When** the job runs
* **Then** the second participant is sent the email

#### Scenario: Dry run sends and records nothing
* **Given** a due template and a qualifying participant
* **When** the job runs as a dry run
* **Then** it lists the participant's email
* **And** no email is sent
* **And** nothing is recorded

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-44.1 | Weekly template sends on Tuesday | `backend/tests/` scheduled emails | `Weekly template sends on Tuesday` |
| US-44.1 | Weekly template does not send on other days | `backend/tests/` scheduled emails | `Weekly template does not send on other days` |
| US-44.1 | Daily template sends every day | `backend/tests/` scheduled emails | `Daily template sends every day` |
| US-44.1 | Days-before template sends that many days before trip start | `backend/tests/` scheduled emails | `Days-before template sends that many days before trip start` |
| US-44.1 | Trip template replaces the organization template for its trip | `backend/tests/` scheduled emails | `Trip template replaces the organization template for its trip` |
| US-44.1 | Started and inactive trips get no scheduled emails | `backend/tests/` scheduled emails | `Started and inactive trips get no scheduled emails` |
| US-44.1 | Send Now templates are not sent by the job | `backend/tests/` scheduled emails | `Send Now templates are not sent by the job` |
| US-44.2 | Incomplete-application reminder goes only to incomplete applications | `backend/tests/` scheduled emails | `Incomplete-application reminder goes only to incomplete applications` |
| US-44.2 | Deposit reminder goes to approved participants below the deposit | `backend/tests/` scheduled emails | `Deposit reminder goes to approved participants below the deposit` |
| US-44.2 | Payment reminder goes to approved participants who owe money | `backend/tests/` scheduled emails | `Payment reminder goes to approved participants who owe money` |
| US-44.2 | Email types without a rule send nothing | `backend/tests/` scheduled emails | `Email types without a rule send nothing` |
| US-44.3 | Running twice on the same day sends once | `backend/tests/` scheduled emails | `Running twice on the same day sends once` |
| US-44.3 | Failed email is tried again on the next run | `backend/tests/` scheduled emails | `Failed email is tried again on the next run` |
| US-44.3 | One failed email does not stop the rest | `backend/tests/` scheduled emails | `One failed email does not stop the rest` |
| US-44.3 | Dry run sends and records nothing | `backend/tests/` scheduled emails | `Dry run sends and records nothing` |

---

## Agent implementation request

```text
Implement Feature 44 from @features/feature-44-daily-scheduled-emails.md on branch `feature/44-daily-scheduled-emails`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`scheduledEmailSend`), `features/reference/behavior.md` (daily job, due rules, recipient rules per event code, rerun and dry run)

---

## Definition of Done

*   [ ] `npm run send-scheduled-emails` with `--date` and `--dry-run` (**FR-001**, **FR-010**, **FR-011**)
*   [ ] Template, trip, and due-date selection (**FR-002** to **FR-005**)
*   [ ] Recipient rules per event code (**FR-006**, **FR-007**)
*   [ ] `scheduledEmailSend` records, no duplicates, failed sends retried (**FR-008**, **FR-009**, **FR-013**)
*   [ ] `systemd` service and timer bundled and enabled on deploy (**FR-012**)
*   [ ] Automated tests for every Gherkin scenario
*   [ ] Living reference updated in this PR
*   [ ] `npm test` green
*   [ ] On `feature/44-daily-scheduled-emails`; PR → `dev`

---

## Out of Scope

- **Send Now** emails triggered by events (application submitted, donation received, and so on)
- Recipient rules for event codes other than the four in **FR-006**
- A screen for the send history, a "run now" button, or editing recipient rules
- Making up days the server was down
- Choosing the run time per organization or per template
- Deposit or payment tracking beyond donations (amounts follow Feature 40)
