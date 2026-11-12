# Feature: Monthly Email Schedules

**Feature ID:** 123
**Branch pattern:** `feature/123-monthly-email-schedules`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** Add two **Schedule** choices for **Scheduled** email templates: **Monthly (day of month)**, where the admin picks the day of the month, and **Twice monthly (1st and 15th)**. When the chosen day doesn't exist in a month (for example the 31st in April), the email goes on that month's last day.
**Depends on:** [Feature 42 — Email Template Schedule](feature-42-email-template-schedule.md), [Feature 44 — Daily Scheduled Emails](feature-44-daily-scheduled-emails.md), [Feature 118 — Email Report](feature-118-email-report.md)

---

## User Stories

### US-123.1: Send a scheduled template once a month on a chosen day

**As an** Org Admin
**I want** to choose **Monthly (day of month)** and a **Day of month** on a scheduled template
**So that** a reminder goes out once a month on the day that suits my organization

**Priority:** P1
**Independent test:** Org Admin saves a **Scheduled** template with **Schedule** **Monthly (day of month)** and **Day of month** `10`; the template reloads with the same values, the list shows `Monthly (day 10)`, and the daily job sends it on the 10th and not on the 11th.
**Acceptance scenarios:** see ### US-123.1

### US-123.2: Send a scheduled template twice a month

**As an** Org Admin
**I want** to choose **Twice monthly (1st and 15th)** on a scheduled template
**So that** a reminder goes out on the 1st and the 15th of every month

**Priority:** P1
**Independent test:** Org Admin saves a **Scheduled** template with **Schedule** **Twice monthly (1st and 15th)**; the list shows `Twice monthly (1st and 15th)`, and the daily job sends it on the 1st and the 15th and not on the 2nd.
**Acceptance scenarios:** see ### US-123.2

---

## Requirements

### Functional Requirements

- **FR-001**: `emailTemplate.scheduleRule` MUST also accept `monthly` and `twice-monthly`, alongside `daily`, `weekly`, and `before-start` (Feature 42).
- **FR-002**: `emailTemplate` MUST store `scheduleDayOfMonth` (whole number, optional). `ensureSchema` MUST add it when missing.
- **FR-003**: The template form's **Schedule** choices MUST be, in order: **Daily**, **Weekly (Tuesday)**, **Monthly (day of month)**, **Twice monthly (1st and 15th)**, **Days before trip start**.
- **FR-004**: When **Schedule** is **Monthly (day of month)**, the form MUST show **Day of month** directly after **Schedule**: a number field from 1 to 31 with the hint "If the month is shorter, the email goes on its last day."
- **FR-005**: Saving a `monthly` template MUST require `scheduleDayOfMonth` as a whole number from 1 to 31 (`400` "Day of month must be a whole number from 1 to 31."). The form MUST show the same message before saving.
- **FR-006**: Saving any template whose `scheduleRule` is not `monthly` MUST store `scheduleDayOfMonth` as empty. Saving a `monthly` or `twice-monthly` template MUST store `scheduleDaysBefore` as empty.
- **FR-007**: Template list, get, and copy sources MUST return `scheduleDayOfMonth`. Create and update MUST accept it. **Copy from** MUST copy it.
- **FR-008**: The template list's **Schedule** column and the Email Report's **When sent** MUST show `Monthly (day N)` for `monthly` and `Twice monthly (1st and 15th)` for `twice-monthly`.
- **FR-009**: The daily scheduled email job MUST treat a `monthly` template as due when the job date's day of the month equals `scheduleDayOfMonth`, or when `scheduleDayOfMonth` is greater than the number of days in the job date's month and the job date is that month's last day. It MUST treat a `twice-monthly` template as due on the 1st and the 15th. Recipients, trips, and the once-a-day rule are unchanged (Feature 44).

---

## Assumptions

- The day of month is fixed per template; there is no "last day of the month" choice beyond the short-month fallback.
- **Twice monthly** days are fixed at the 1st and 15th and are not chosen per template.
- Existing templates keep their schedules; no data migration beyond adding the column.

## Edge Cases

- **Day of month** `0`, `32`, `2.5`, or blank on a `monthly` template → `400`.
- **Day of month** `31`: due on 01/31, 02/28 (02/29 in a leap year), 03/31, 04/30.
- **Day of month** `29`: due 02/28 in a non-leap year, 02/29 in a leap year.
- Changing **Schedule** from **Monthly** to **Weekly** and saving → `scheduleDayOfMonth` stored empty.
- **Send Now** request that includes `scheduleDayOfMonth` → stored empty, no error.
- The job runs once a day, so a monthly template sends at most once a month per person, and a twice-monthly template twice.

## Success Criteria

- **SC-001**: Org Admin can give a **Scheduled** template a monthly or twice-monthly schedule and see it again.
- **SC-002**: The template list and Email Report show the new schedules.
- **SC-003**: The daily job sends monthly and twice-monthly templates only on their days.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- The schedule is part of the template and follows the existing template permissions (Feature 39).

---

## Key Entities

- **EmailTemplate** — `scheduleRule` gains `monthly` and `twice-monthly`; gains `scheduleDayOfMonth`

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/email-templates` | as today | Returns `scheduleDayOfMonth` |
| `GET` | `/trips/email-templates/:id` | as today | Returns `scheduleDayOfMonth` |
| `POST` | `/trips/email-templates` | as today | Accepts `scheduleRule` `monthly` / `twice-monthly` and `scheduleDayOfMonth`; rules in **FR-005** and **FR-006** |
| `PUT` | `/trips/email-templates/:id` | as today | Same as `POST` |
| `GET` | `/trips/email-templates/copy-sources` | as today | Returns `scheduleDayOfMonth` |

**Status codes:** `400` "Day of month must be a whole number from 1 to 31." when a `monthly` template has no valid day.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `EmailTemplateFormDialog` | **Schedule** gains **Monthly (day of month)** and **Twice monthly (1st and 15th)**; **Day of month** after **Schedule** for Monthly |
| `EmailTemplatesList` | **Schedule** column shows `Monthly (day N)` and `Twice monthly (1st and 15th)` |
| Email Report PDF | **When sent** shows the same text |

---

## Data Model Requirements

### `emailTemplate` changes

| Column | Type | Rules |
|--------|------|--------|
| scheduleRule | STRING(20) | adds `monthly` and `twice-monthly` |
| scheduleDayOfMonth | INTEGER | optional; 1–31 when `scheduleRule` is `monthly`, otherwise empty |

---

## Acceptance Criteria (Gherkin)

### US-123.1 — Send a scheduled template once a month on a chosen day

#### Scenario: Day of month shows for the monthly schedule
* **Given** I am an org admin adding a Scheduled template
* **When** I set Schedule to Monthly (day of month)
* **Then** I see Day of month directly after Schedule
* **When** I set Schedule to Twice monthly (1st and 15th)
* **Then** I do not see Day of month

#### Scenario: Monthly schedule is saved
* **Given** I am an org admin
* **When** I save a Scheduled template with Schedule monthly and Day of month 10
* **Then** loading that template shows Schedule monthly and Day of month 10

#### Scenario: Day of month must be 1 to 31
* **Given** I am an org admin
* **When** I save a Scheduled template with Schedule monthly and Day of month 32
* **Then** the request is rejected with "Day of month must be a whole number from 1 to 31."

#### Scenario: Other schedules store no day of month
* **Given** I am an org admin
* **When** I save a Scheduled template with Schedule weekly and Day of month 10
* **Then** loading that template shows no Day of month

#### Scenario: Template list shows the monthly schedule
* **Given** a Scheduled template with Schedule monthly and Day of month 10
* **When** I open the template list
* **Then** I see "Monthly (day 10)" in the Schedule column

#### Scenario: Monthly template sends on its day
* **Given** an active trip with an incomplete Trip Participant and a monthly application-incomplete template for day 10
* **When** the scheduled email job runs on the 10th
* **Then** the participant is sent the email
* **When** the job runs on the 11th
* **Then** nothing is sent

#### Scenario: Monthly template sends on the last day of a shorter month
* **Given** a monthly application-incomplete template for day 31 and an incomplete Trip Participant
* **When** the scheduled email job runs on April 30
* **Then** the participant is sent the email

### US-123.2 — Send a scheduled template twice a month

#### Scenario: Twice monthly schedule is saved
* **Given** I am an org admin
* **When** I save a Scheduled template with Schedule twice-monthly
* **Then** loading that template shows Schedule twice-monthly and no Day of month

#### Scenario: Template list shows the twice monthly schedule
* **Given** a Scheduled template with Schedule twice-monthly
* **When** I open the template list
* **Then** I see "Twice monthly (1st and 15th)" in the Schedule column

#### Scenario: Twice monthly template sends on the 1st and 15th
* **Given** an active trip with an incomplete Trip Participant and a twice-monthly application-incomplete template
* **When** the scheduled email job runs on the 1st and on the 15th
* **Then** the participant is sent the email each time
* **When** the job runs on the 2nd
* **Then** nothing is sent

#### Scenario: Email Report shows the new schedules
* **Given** a monthly template for day 10 and a twice-monthly template
* **When** I download the Email Report
* **Then** When sent shows "Monthly (day 10)" and "Twice monthly (1st and 15th)"

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-123.1 | Day of month shows for the monthly schedule | `frontend/tests/` EmailTemplateFormDialog | `Day of month shows for the monthly schedule` |
| US-123.1 | Monthly schedule is saved | `backend/tests/` email templates | `Monthly schedule is saved` |
| US-123.1 | Day of month must be 1 to 31 | `backend/tests/` email templates | `Day of month must be 1 to 31` |
| US-123.1 | Other schedules store no day of month | `backend/tests/` email templates | `Other schedules store no day of month` |
| US-123.1 | Template list shows the monthly schedule | `frontend/tests/` EmailTemplatesList | `Template list shows the monthly schedule` |
| US-123.1 | Monthly template sends on its day | `backend/tests/` scheduled emails | `Monthly template sends on its day` |
| US-123.1 | Monthly template sends on the last day of a shorter month | `backend/tests/` scheduled emails | `Monthly template sends on the last day of a shorter month` |
| US-123.2 | Twice monthly schedule is saved | `backend/tests/` email templates | `Twice monthly schedule is saved` |
| US-123.2 | Template list shows the twice monthly schedule | `frontend/tests/` EmailTemplatesList | `Template list shows the twice monthly schedule` |
| US-123.2 | Twice monthly template sends on the 1st and 15th | `backend/tests/` scheduled emails | `Twice monthly template sends on the 1st and 15th` |
| US-123.2 | Email Report shows the new schedules | `backend/tests/` email report PDF | `Email Report shows the new schedules` |

---

## Agent implementation request

```text
Implement Feature 123 from @features/feature-123-monthly-email-schedules.md on branch `feature/123-monthly-email-schedules`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Update docs/user-guide/ (org-admin-guide.md, glossary.md, rules.md, troubleshooting.md) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`emailTemplate.scheduleRule` values, `emailTemplate.scheduleDayOfMonth`), `features/reference/api.md` (schedule rules on template endpoints), `features/reference/behavior.md` (Feature 42 schedule choices, Feature 44 due rules, Feature 118 When sent)

**User guide updates:** `org-admin-guide.md` (template list **Schedule** column, **Schedule** and **Day of month** fields), `glossary.md` (**Schedule**), `rules.md` (when Scheduled emails go), `troubleshooting.md` (day of month message)

---

## Definition of Done

*   [x] `scheduleRule` accepts `monthly` and `twice-monthly`; `emailTemplate.scheduleDayOfMonth` and schema ensure (**FR-001**, **FR-002**)
*   [x] **Schedule** choices and **Day of month** on the template form, validated (**FR-003** to **FR-006**)
*   [x] API returns and accepts `scheduleDayOfMonth`; **Copy from** copies it (**FR-007**)
*   [x] Template list and Email Report show the new schedules (**FR-008**)
*   [x] Daily job sends monthly and twice-monthly templates on their days, with the short-month fallback (**FR-009**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/123-monthly-email-schedules`; PR → `dev`

---

## Out of Scope

- Choosing the two days of the twice-monthly schedule
- A "last day of the month" choice, or several days of the month on one template
- Every-two-months or quarterly schedules
- Choosing the weekday for weekly templates
- A time of day per template (the daily job runs once each morning)
- Changing the seeded templates' schedules
