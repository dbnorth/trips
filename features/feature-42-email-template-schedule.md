# Feature: Email Template Schedule

**Feature ID:** 42
**Branch pattern:** `feature/42-email-template-schedule`
**Status:** Ready
**Created:** 2026-10-15
**Input:** A **Scheduled** email template states how often it goes out: **Daily**, **Weekly** (every Tuesday), or a number of **days before trip start**. The schedule is saved with the template and shown in the template list. This feature stores the schedule only; [Feature 44](feature-44-daily-scheduled-emails.md) sends the emails.
**Depends on:** [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md), [Feature 41 — Email Template To Address](feature-41-email-template-to-address.md)

---

## User Stories

### US-42.1: Choose how often a scheduled template is sent

**As an** Org Admin
**I want** to choose **Daily**, **Weekly**, or **Days before trip start** on a scheduled template
**So that** each reminder goes out on the right days without anyone sending it by hand

**Priority:** P1
**Independent test:** Org Admin saves a **Scheduled** template with **Schedule** **Days before trip start** and **Days before trip start** `5`, then sees the same values when the template reloads.
**Acceptance scenarios:** see ### US-42.1

### US-42.2: See each template's schedule in the list

**As an** Org Admin
**I want** the template list to show each template's schedule
**So that** I can check which reminders go out and when without opening each template

**Priority:** P2
**Independent test:** The template list shows `Weekly (Tuesday)` for a weekly template and `5 days before trip start` for a template sent five days before the trip starts.
**Acceptance scenarios:** see ### US-42.2

---

## Requirements

### Functional Requirements

- **FR-001**: `emailTemplate` MUST store `scheduleRule` (text: `daily`, `weekly`, or `before-start`) and `scheduleDaysBefore` (whole number). Both are optional in the table so existing templates still load.
- **FR-002**: The template form (`EmailTemplateFormDialog`) MUST show a **Schedule** field directly after **Function code** when **Function code** is **Scheduled**. Its choices are **Daily**, **Weekly (Tuesday)**, and **Days before trip start**. The field is hidden for **Send Now**.
- **FR-003**: When **Schedule** is **Days before trip start**, the form MUST show **Days before trip start** directly after **Schedule**.
- **FR-004**: Saving a **Scheduled** template from the template form MUST require **Schedule** (`400` "Schedule is required for scheduled templates."). A `scheduleRule` other than `daily`, `weekly`, or `before-start` MUST be rejected with the same message.
- **FR-005**: When **Schedule** is **Days before trip start**, **Days before trip start** MUST be a whole number from 1 to 365 (`400` "Days before trip start must be a whole number from 1 to 365.").
- **FR-006**: Saving a **Send Now** template MUST store `scheduleRule` and `scheduleDaysBefore` as empty. Saving a **Daily** or **Weekly** template MUST store `scheduleDaysBefore` as empty.
- **FR-007**: Template list and get MUST return `scheduleRule` and `scheduleDaysBefore`. Template create and update MUST accept them. Copy sources MUST return them, and **Copy from** MUST copy them.
- **FR-008**: The template list (`EmailTemplatesList`) MUST show a **Schedule** column directly after **Function code**: `Daily`, `Weekly (Tuesday)`, or `N days before trip start` (`1 day before trip start` when N is 1). **Send Now** templates show an empty cell.
- **FR-009**: `ensureSchema` MUST add `emailTemplate.scheduleRule` and `emailTemplate.scheduleDaysBefore` when missing.
- **FR-010**: The template seed (`app/data/emailTemplates.json`, `seedEmailTemplates.js`) MUST set a schedule on each seeded **Scheduled** template: `apply-incomplete`, `deposit-due`, and `payment-due` are **Weekly**, and `pre-departure` is **5 days before trip start**. Seeded templates that exist without a schedule MUST gain it.
- **FR-011**: This feature MUST NOT send email.

---

## Assumptions

- Weekly templates go out on Tuesday. The weekday is fixed and not chosen per template.
- To send a reminder more than once before a trip (for example 5 days and 1 day before), the admin creates one template per reminder, each with its own **Days before trip start**.
- Existing **Scheduled** templates without a schedule keep loading. Editing one requires **Schedule** before it saves.
- **Function code** stays the switch between **Scheduled** and **Send Now** (Feature 39).

## Edge Cases

- **Scheduled** with no **Schedule** → `400`.
- **Days before trip start** with `0`, `366`, `2.5`, or blank → `400`.
- Changing **Function code** from **Scheduled** to **Send Now** and saving → schedule stored empty.
- Changing **Schedule** from **Days before trip start** to **Weekly** and saving → `scheduleDaysBefore` stored empty.
- **Send Now** request that includes a schedule → schedule stored empty, no error.

## Success Criteria

- **SC-001**: Org Admin can give a **Scheduled** template a schedule and see it again.
- **SC-002**: The template list shows each template's schedule.
- **SC-003**: The seeded **Scheduled** templates have schedules after `npm run seed`.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- The schedule is part of the template and follows the existing template permissions (Feature 39).

---

## Key Entities

- **EmailTemplate** — gains `scheduleRule` and `scheduleDaysBefore`

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/email-templates` | as today | Returns `scheduleRule`, `scheduleDaysBefore` |
| `GET` | `/trips/email-templates/:id` | as today | Returns `scheduleRule`, `scheduleDaysBefore` |
| `POST` | `/trips/email-templates` | as today | Accepts `scheduleRule`, `scheduleDaysBefore`; rules in **FR-004** to **FR-006** |
| `PUT` | `/trips/email-templates/:id` | as today | Accepts `scheduleRule`, `scheduleDaysBefore`; rules in **FR-004** to **FR-006** |
| `GET` | `/trips/email-templates/copy-sources` | as today | Returns `scheduleRule`, `scheduleDaysBefore` |

**Status codes:** `400` when a **Scheduled** template has no valid **Schedule**, or **Days before trip start** is not a whole number from 1 to 365.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `EmailTemplateFormDialog` | **Schedule** after **Function code** (Scheduled only); **Days before trip start** after **Schedule** (Days before trip start only) |
| `EmailTemplatesList` | **Schedule** column after **Function code** |

---

## Data Model Requirements

### `emailTemplate` columns added by this feature

| Column | Type | Rules |
|--------|------|--------|
| scheduleRule | STRING(20) | optional; `daily`, `weekly`, or `before-start`; required on **Scheduled** template form saves; empty for **Send Now** |
| scheduleDaysBefore | INTEGER | optional; 1–365 when `scheduleRule` is `before-start`, otherwise empty |

---

## Acceptance Criteria (Gherkin)

### US-42.1 — Choose how often a scheduled template is sent

#### Scenario: Schedule shows only for scheduled templates
* **Given** I am an org admin adding a template
* **When** I set Function code to Scheduled
* **Then** I see Schedule directly after Function code
* **When** I set Function code to Send Now
* **Then** I do not see Schedule

#### Scenario: Days before trip start shows for that schedule
* **Given** I am an org admin adding a Scheduled template
* **When** I set Schedule to Days before trip start
* **Then** I see Days before trip start

#### Scenario: Schedule is saved
* **Given** I am an org admin
* **When** I save a Scheduled template with Schedule before-start and Days before trip start 5
* **Then** loading that template shows Schedule before-start and Days before trip start 5

#### Scenario: Schedule is required for scheduled templates
* **Given** I am an org admin
* **When** I save a Scheduled template with no Schedule
* **Then** the request is rejected

#### Scenario: Days before trip start must be 1 to 365
* **Given** I am an org admin
* **When** I save a Scheduled template with Schedule before-start and Days before trip start 0
* **Then** the request is rejected

#### Scenario: Send Now template stores no schedule
* **Given** I am an org admin
* **When** I save a Send Now template with Schedule weekly
* **Then** loading that template shows no Schedule

### US-42.2 — See each template's schedule in the list

#### Scenario: Template list shows the schedule
* **Given** a weekly template and a template sent 5 days before trip start
* **When** I open the template list
* **Then** I see "Weekly (Tuesday)" and "5 days before trip start" in the Schedule column

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-42.1 | Schedule shows only for scheduled templates | `frontend/tests/` EmailTemplateFormDialog | `Schedule shows only for scheduled templates` |
| US-42.1 | Days before trip start shows for that schedule | `frontend/tests/` EmailTemplateFormDialog | `Days before trip start shows for that schedule` |
| US-42.1 | Schedule is saved | `backend/tests/` email templates | `Schedule is saved` |
| US-42.1 | Schedule is required for scheduled templates | `backend/tests/` email templates | `Schedule is required for scheduled templates` |
| US-42.1 | Days before trip start must be 1 to 365 | `backend/tests/` email templates | `Days before trip start must be 1 to 365` |
| US-42.1 | Send Now template stores no schedule | `backend/tests/` email templates | `Send Now template stores no schedule` |
| US-42.2 | Template list shows the schedule | `frontend/tests/` EmailTemplatesList | `Template list shows the schedule` |

---

## Agent implementation request

```text
Implement Feature 42 from @features/feature-42-email-template-schedule.md on branch `feature/42-email-template-schedule`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`emailTemplate.scheduleRule`, `emailTemplate.scheduleDaysBefore`), `features/reference/api.md` (schedule fields and rules on template endpoints), `features/reference/behavior.md` (template schedule choices, Tuesday weekly)

---

## Definition of Done

*   [x] `emailTemplate.scheduleRule`, `emailTemplate.scheduleDaysBefore`, and schema ensure (**FR-001**, **FR-009**)
*   [x] **Schedule** and **Days before trip start** on the template form, required and validated (**FR-002** to **FR-006**)
*   [x] API returns and accepts the schedule; **Copy from** copies it (**FR-007**)
*   [x] **Schedule** column in the template list (**FR-008**)
*   [x] Seeded scheduled templates have schedules (**FR-010**)
*   [x] No email sent (**FR-011**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/42-email-template-schedule`; PR → `dev`

---

## Out of Scope

- Sending email (Feature 43) and the daily job (Feature 44)
- Choosing the weekday for weekly templates
- Days after trip start or after trip end
- A time of day per template (the daily job runs once each morning)
- Schedules on **Send Now** templates or on Feature 10 global master templates
