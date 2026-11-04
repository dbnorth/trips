# Scheduled Templates in Email Team

**Feature ID:** 114
**Branch pattern:** `feature/114-team-email-scheduled-templates`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "when I try to email team the the scheduled emails for the trip don't show in the list." → "Spec: list Scheduled templates in Email team and send them now only to the participants that template's rule would pick (e.g. Pre-Approved missing documents)"

Today the trip page's **Email team** dialog lists only **Trip Participant** templates (Feature 46). The trip's **Scheduled** reminders, like "Reminder: finish your application" or "Reminder: upload your documents", go out only when the daily job runs. Staff can't send one now, for example right after a deadline changes, without copying it into a Trip Participant template.

This feature lists those Scheduled templates in **Email team**. A Scheduled template goes only to the participants its scheduled rule would pick today (Feature 44), or to a selected subset of them. A send from **Email team** counts as that day's scheduled send, so the daily job doesn't email the same people again that day.

## Clarifications

### Session 2026-11-03

- Q: Who does a Scheduled template go to from **Email team**? → A: Only the **Trip Participant** assignments its email type's scheduled rule picks right now (Feature 44, with Feature 113's `documents-missing`). For example, **Documents missing reminder** goes to pre-approved participants still missing documents. **All potential participants** and **All accepted participants** don't apply.
- Q: Does a send from **Email team** count as the day's scheduled send? → A: Yes. Each person it is sent to (or skipped for) is recorded for that template, trip, and today's date, so the daily job doesn't send it to them again that day.
- Q: Can staff narrow the recipients? → A: Yes. **Selected participants** offers a multi-select of the people the rule picks.

**Depends on:**
- [Feature 44 — Daily Scheduled Email Job](feature-44-daily-scheduled-emails.md) (recipient rules, `scheduledEmailSend`, trip-over-organization template pick)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md) (**Email team** dialog, preview, send)
- [Feature 113 — Documents Missing Reminder Email](feature-113-documents-missing-email.md) (`documents-missing` rule)

---

## User Stories

### US-114.1: See the trip's scheduled reminders in Email team

**As** trip staff (System Admin, Org Admin of the trip's organization, or Trip Leader of the trip)
**I want** **Email team** to list the trip's Scheduled templates
**So that** I can send a reminder now instead of waiting for its schedule

**Acceptance:** see Gherkin scenarios under US-114.1.

### US-114.2: Send a scheduled reminder only to the people it is for

**As** trip staff
**I want** a Scheduled template to go only to the participants its rule picks, or a subset of them
**So that** for example only pre-approved participants missing documents get the documents reminder

**Acceptance:** see Gherkin scenarios under US-114.2.

### US-114.3: Don't send the same reminder twice in a day

**As** a participant
**I want** a reminder staff send me today to count as today's scheduled reminder
**So that** I don't get the same email again from the daily job

**Acceptance:** see Gherkin scenarios under US-114.3.

---

## Requirements

### Functional Requirements

- **FR-001**: `GET /trips/trips/:id/team-email/templates` also returns the trip's **Scheduled** templates whose email type's event code has a scheduled recipient rule (`application-incomplete`, `documents-missing`, `deposit-due`, `payment-due`, `pre-departure`, `trip-arrival`). They are picked like the daily job picks them: the trip's own Scheduled template for an email type, otherwise its organization's (no trip). The schedule rule and day don't matter. Each returned template adds `functionCode`. **Trip Participant** templates are listed as before. The flight itinerary list (Feature 86) is unchanged.
- **FR-002**: New `GET /trips/trips/:id/team-email/templates/:templateId/recipients` (same access as **Email team**) returns the people the template's rule picks now. They are the trip's **Trip Participant** assignments that pass the rule, each person once, ordered by assignment: `[{ id, firstName, lastName, email }]`. The rule is the same code the daily job uses. The trip's status and start date don't matter. A template that isn't one of the trip's FR-001 Scheduled templates → `400` "Choose a scheduled template for this trip."
- **FR-003**: In the **Email team** dialog, Scheduled templates show in the template list as "<subject> (Scheduled)". When one is chosen:
  - **Send to** offers **All participants this email is for** (`rule`, the default) and **Selected participants** (`selected`, a multi-select of the FR-002 people);
  - "Recipients: N participants" and **Preview as** use those people;
  - when the rule picks nobody, the dialog shows "No participants this email is for right now." and **Preview** and **Send** are disabled.

  Choosing a **Trip Participant** template again brings back the Feature 46 **Send to** options. **Subject** and **Email body** stay editable for this send only, as before.
- **FR-004**: `POST /trips/trips/:id/team-email/preview` and `POST /trips/trips/:id/team-email` accept a Scheduled template from FR-001. The rule is re-checked when the request arrives:
  - `sendTo` `rule` sends to every FR-002 person.
  - `sendTo` `selected` needs `personIds` that are all FR-002 people; otherwise `400` "Selected participants must be participants this email is for."
  - Any other `sendTo` with a Scheduled template → `400` "Send to must be rule or selected for a scheduled template."
  - `sendTo` `rule` with a Trip Participant template → `400` "Send to must be potential, accepted, or selected."
  - No people → `400` "No participants to send to."
- **FR-005**: Sending a Scheduled template from **Email team** records each recipient in `scheduledEmailSend` for that template, trip, person, and today's date in `SCHEDULED_EMAIL_TIMEZONE` (default `America/Chicago`), with the result (`sent`, `skipped`, or `failed`) and email log id. It updates that day's row when one exists. The daily job then treats them as it does its own sends: sent and skipped are not repeated that day, and failed are retried. The email is always sent when staff send it, even if that day's row already exists. Trip Participant templates record nothing, as before.

---

## Assumptions

- The edited **Subject** and **Email body** are what is sent, as for Trip Participant templates. The saved template is unchanged.
- The daily job is unchanged apart from seeing the rows FR-005 writes.
- Templates whose email type has no scheduled rule (for example event code `team-email`) are not listed, even if their function code is Scheduled. They never send.

## Edge Cases

- Rule picks someone after the dialog opened (for example a participant becomes pre-approved) → **Send** with `rule` includes them, because the rule is re-checked on send.
- A selected person no longer passes the rule when **Send** is pressed → `400` "Selected participants must be participants this email is for."
- The job already sent the reminder today, and staff send it again → it is sent again and that day's row is updated.
- Trip and organization both have a **Documents missing reminder** → only the trip's is listed.
- A person with two Trip Participant assignments that both pass → one email.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: **Email team** with a Trip Participant template behaves as in Feature 46.

---

## Data Ownership & Isolation

Same access as **Email team**: System Admin, Org Admin of the trip's organization, or Trip Leader of the trip. Templates and recipients come only from that trip and its organization.

---

## Key Entities

None new. Reads `emailTemplate`, `emailType`, `tripPeopleRole`, `person`; writes `scheduledEmailSend` and `emailLog`.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips/:id/team-email/templates` | Also returns the trip's Scheduled templates with a recipient rule (trip's own over organization's), each with `functionCode` (FR-001) |
| `GET` | `/trips/trips/:id/team-email/templates/:templateId/recipients` | New. The people a Scheduled template's rule picks now (FR-002) |
| `POST` | `/trips/trips/:id/team-email/preview`, `/trips/trips/:id/team-email` | Accept a Scheduled template with `sendTo` `rule` or `selected` (FR-004); send records `scheduledEmailSend` (FR-005) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripTeamEmailDialog` (**Email team**) | Scheduled templates labelled "(Scheduled)"; for them, **Send to** is **All participants this email is for** or **Selected participants** from the rule's people; recipient count and **Preview as** use those people; empty message when none (FR-003) |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

Background:
- Olivia is an Org Admin of "Hope Missions".
- "Hope Missions" has a **Scheduled** **Documents missing reminder** template ("Reminder: upload your documents for {{TRIP_NAME}}") and a **Trip Participant** template "Team update".
- On the Guatemala Clinic trip:
  - Maria's application is pre-approved and missing her passport;
  - Juan's application is pre-approved with every document uploaded;
  - Ana's application is incomplete.

### US-114.1 — See the trip's scheduled reminders in Email team

#### Scenario: Scheduled templates listed
* **When** Olivia loads the Email team templates for Guatemala Clinic
* **Then** they include "Team update" and the Documents missing reminder, which has `functionCode` "Scheduled"

#### Scenario: Scheduled template labelled in the dialog
* **When** Olivia opens **Email team** on Guatemala Clinic
* **Then** the template list shows "Reminder: upload your documents for {{TRIP_NAME}} (Scheduled)"

#### Scenario: Trip template replaces the organization's
* **Given** Guatemala Clinic has its own Documents missing reminder template
* **When** Olivia loads the Email team templates
* **Then** only the trip's Documents missing reminder is listed

#### Scenario: Scheduled template without a rule not listed
* **Given** "Hope Missions" has a Scheduled template whose email type's event code is `team-email`
* **When** Olivia loads the Email team templates
* **Then** that template is not listed

### US-114.2 — Send a scheduled reminder only to the people it is for

#### Scenario: Recipients are the people the rule picks
* **When** Olivia loads the recipients of the Documents missing reminder for Guatemala Clinic
* **Then** only Maria is returned

#### Scenario: Send to options for a scheduled template
* **Given** the Documents missing reminder picks Maria
* **When** Olivia chooses it in **Email team**
* **Then** **Send to** shows **All participants this email is for** and **Selected participants**
* **And** "Recipients: 1 participant" shows

#### Scenario: Nobody to send to
* **Given** the Documents missing reminder picks nobody
* **When** Olivia chooses it in **Email team**
* **Then** "No participants this email is for right now." shows
* **And** **Send** is disabled

#### Scenario: Send goes only to the rule's people
* **When** Olivia sends the Documents missing reminder with **All participants this email is for**
* **Then** only Maria is emailed

#### Scenario: Selected participants must be the rule's people
* **When** Olivia sends the Documents missing reminder to selected participants Maria and Juan
* **Then** the response is `400` "Selected participants must be participants this email is for."

#### Scenario: Potential or accepted refused for a scheduled template
* **When** Olivia sends the Documents missing reminder with **Send to** `potential`
* **Then** the response is `400` "Send to must be rule or selected for a scheduled template."

### US-114.3 — Don't send the same reminder twice in a day

#### Scenario: Email team send counts as today's scheduled send
* **Given** the Documents missing reminder is scheduled **Daily**
* **And** Olivia sent it to Maria from **Email team** today
* **When** the scheduled email job runs today
* **Then** Maria is not emailed again

#### Scenario: Trip Participant template records nothing
* **When** Olivia sends "Team update" to all potential participants
* **Then** no scheduled send is recorded

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-114.1 | Scheduled templates listed | `backend/tests/team-email-scheduled-templates.test.js` | `Scheduled templates listed` |
| US-114.1 | Scheduled template labelled in the dialog | `frontend/tests/TeamEmailScheduledTemplates.test.js` | `Scheduled template labelled in the dialog` |
| US-114.1 | Trip template replaces the organization's | `backend/tests/team-email-scheduled-templates.test.js` | `Trip template replaces the organization's` |
| US-114.1 | Scheduled template without a rule not listed | `backend/tests/team-email-scheduled-templates.test.js` | `Scheduled template without a rule not listed` |
| US-114.2 | Recipients are the people the rule picks | `backend/tests/team-email-scheduled-templates.test.js` | `Recipients are the people the rule picks` |
| US-114.2 | Send to options for a scheduled template | `frontend/tests/TeamEmailScheduledTemplates.test.js` | `Send to options for a scheduled template` |
| US-114.2 | Nobody to send to | `frontend/tests/TeamEmailScheduledTemplates.test.js` | `Nobody to send to` |
| US-114.2 | Send goes only to the rule's people | `backend/tests/team-email-scheduled-templates.test.js` | `Send goes only to the rule's people` |
| US-114.2 | Selected participants must be the rule's people | `backend/tests/team-email-scheduled-templates.test.js` | `Selected participants must be the rule's people` |
| US-114.2 | Potential or accepted refused for a scheduled template | `backend/tests/team-email-scheduled-templates.test.js` | `Potential or accepted refused for a scheduled template` |
| US-114.3 | Email team send counts as today's scheduled send | `backend/tests/team-email-scheduled-templates.test.js` | `Email team send counts as today's scheduled send` |
| US-114.3 | Trip Participant template records nothing | `backend/tests/team-email-scheduled-templates.test.js` | `Trip Participant template records nothing` |

---

## Agent implementation request

```text
Implement Feature 114 from @features/feature-114-team-email-scheduled-templates.md on branch `feature/114-team-email-scheduled-templates`.

Backend: in scheduledEmails.js export what Email team needs — the event codes with a rule, the trip-over-organization pick, and a function returning the people a template's rule picks on a trip (reuse RECIPIENT_RULES and templatesForTrip). In tripTeamEmail.controller.js, TEAM_EMAIL lists Trip Participant templates plus the trip's picked Scheduled templates (with functionCode); add GET /trips/:id/team-email/templates/:templateId/recipients; readTeamEmailRequest handles sendTo rule/selected for Scheduled templates per FR-004; send records scheduledEmailSend per FR-005 (today via todayInTimeZone). Flight itinerary kind unchanged.
Frontend: TripTeamEmailDialog labels Scheduled templates "(Scheduled)", loads the recipients endpoint when one is chosen, swaps Send to options, and shows the empty message; tripServices gets the recipients call.
Tests per the Test Coverage Map. Update features/reference/ (behavior.md Email team and scheduled job rows, api.md team-email rows).
```

---

## Definition of Done

*   [x] Scheduled templates in the Email team list per **FR-001**
*   [x] Recipients endpoint per **FR-002**
*   [x] Dialog Send to, count, and empty message per **FR-003**
*   [x] Preview / send rules per **FR-004**
*   [x] Scheduled send recorded per **FR-005**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Listing **Send Now** or **Person** templates in **Email team**.
- Changing the daily job's schedule, rules, or which trips it runs for.
- Sending Scheduled templates from the People page **Email** dialog.
- A history screen of scheduled sends.
