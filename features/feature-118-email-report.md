# Email Report

**Feature ID:** 118
**Branch pattern:** `feature/118-email-report`
**Status:** Implemented
**Created:** 2026-11-04
**Input:** "add a spec to add a Email Report generation on the Email Template page.  Add a Email Report button the when click creates a PDF with a report that list all the emails for the organization group by funciton code, with the subject, When sent (schedule type, \"On Event\", \"Manual\" and event descripition.  Report heading should indicate organization name."

The **Email templates** page lists an organization's templates, but there is no way to hand someone a single document that shows every email the organization sends, when, and why. This feature adds an **Email Report** button that downloads a PDF listing all of the organization's email templates, grouped by function code, with each template's subject, email type, when it is sent, trip, and event description.

## Clarifications

### Session 2026-11-04

- Q: Which templates? → A: All templates of the organization: organization-wide ones and trip-specific ones. A **Trip** column shows the trip name, or "All trips" for organization-wide templates.
- Q: Who sees the button? → A: Org Admins of the selected organization and System Admins with an organization selected. Not Trip Leaders who aren't Org Admins, and not the System Admin global (master templates) view.
- Q: Columns? → A: **Subject**, **Email type**, **When sent**, **Trip**, **Event description**.
- Q: "When sent"? → A: **Scheduled** → the template's schedule as the list shows it (`Daily`, `Weekly (Tuesday)`, `N days before trip start`); **Send Now** → "On Event"; **Trip Participant** and **Person** → "Manual".
- Q: Group order? → A: The function code order of the template form: **Scheduled**, **Send Now**, **Trip Participant**, **Person**. Groups with no templates are left out.

**Depends on:**
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md) (templates, function codes, **Email templates** page)
- [Feature 42 — Email Template Schedule](feature-42-email-template-schedule.md) (schedule labels)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md) (**Trip Participant** templates)
- [Feature 62 — People Email](feature-62-people-email.md) (**Person** templates)
- [Feature 117 — Email Type Event Description](feature-117-email-type-event-description.md) (`emailType.eventDescription`)

---

## User Stories

### US-118.1: Download an organization's email report

**As** an Org Admin (or a System Admin with an organization selected)
**I want** to download a PDF listing every email template of the organization, grouped by function code, with when each is sent and what its event means
**So that** I can review or share the organization's whole email plan in one document

**Acceptance:** see Gherkin scenarios under US-118.1.

---

## Requirements

### Functional Requirements

- **FR-001**: `GET /trips/email-templates/report/pdf` returns the email report PDF for the acting organization (`X-Acting-Organization-Id`, resolved as for the templates list). Allowed for System Admins and Org Admins of that organization; anyone else → `403`. No organization → `400` "Select an organization.". The response is a PDF download named `Email Report - <organization name>.pdf`. The route is registered before `/:id`.
- **FR-002**: The report includes every `emailTemplate` with the organization's `orgId`, both organization-wide (`tripId` null) and trip-specific. Global master templates (`orgId` null) and other organizations' templates are never included.
- **FR-003**: The report heading is the organization header used by the other PDFs (organization logo when it has a PNG / JPEG one, and the organization name), then the title **Email Report**.
- **FR-004**: Templates are grouped by function code, each group under a heading with the function code, in the order **Scheduled**, **Send Now**, **Trip Participant**, **Person**; templates with any other or no function code go last under **No function code**. Groups with no templates are left out. Within a group, templates are ordered by subject (case-insensitive), then by trip (**All trips** first, then trip name).
- **FR-005**: Each group is a table with columns **Subject**, **Email type**, **When sent**, **Trip**, **Event description**:
  - **Subject**: the template subject, or "—".
  - **Email type**: the email type's description, or "—" when the template has no email type.
  - **When sent**: **Scheduled** → `Daily`, `Weekly (Tuesday)`, or `N days before trip start` (`1 day before trip start` for 1), or "—" when the template has no valid schedule; **Send Now** → `On Event`; **Trip Participant** and **Person** → `Manual`; other / no function code → "—".
  - **Trip**: the trip name, or `All trips` for an organization-wide template.
  - **Event description**: the email type's `eventDescription`, or "No event description." when blank; "—" when the template has no email type.
- **FR-006**: With no templates, the PDF still has the heading, followed by "No email templates.".
- **FR-007**: The **Email templates** page (`EmailTemplatesList`) shows an **Email Report** button beside **Add template** when an organization is selected and the user is a System Admin or an Org Admin of that organization. It is not shown in the System Admin global view or to Trip Leaders who aren't Org Admins of the organization. Clicking it downloads the PDF (`exportServices.emailReportPdf`) as `Email Report - <organization name>.pdf`; the button shows a loading state while downloading, and a failure shows the server message (or "Unable to download email report PDF.") in the page's message alert.

---

## Assumptions

- The report reads the saved templates; it sends no email and changes nothing.
- Letter, landscape, like the room list and flights PDFs, so the event descriptions have room.
- "When sent" for **Scheduled** templates is the template's schedule only; who receives the email is described by the event description (Feature 117).

## Edge Cases

- A template with no email type → **Email type** and **Event description** show "—".
- A **Scheduled** template with no schedule saved (older data) → **When sent** "—".
- An organization without a logo, or with a logo that isn't PNG / JPEG → the name only, as in the other PDFs.
- A Trip Leader who calls the endpoint directly → `403`.
- An Org Admin of another organization who sets the header to this organization → `403` (the acting organization resolves only to organizations they administer).

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Templates and email sending are unchanged.

---

## Data Ownership & Isolation

The report includes only the acting organization's templates. Only System Admins and Org Admins of that organization can download it.

---

## Key Entities

No changes. Reads `emailTemplate`, `emailType`, `trip`, and `organization`.

---

## API Requirements

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `GET` | `/trips/email-templates/report/pdf` | System Admin, or Org Admin of the acting organization | Email report PDF `Email Report - <organization name>.pdf` (FR-001 – FR-006). No organization → `400`; others → `403` |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `EmailTemplatesList` | **Email Report** button beside **Add template** for System Admins / Org Admins with an organization selected; downloads the PDF (FR-007) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Olivia is an Org Admin of "Hope Missions".
- "Hope Missions" has a trip "Guatemala Clinic".
- The "Deposit received" email type has event description "This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount."
- The "Payment due reminder" email type has event description "This scheduled rule checks whether the Trip Participant's application is Approved and they still have a balance above $0 for the trip (total trip cost minus donations)."
- The "Trip team update" email type has no event description.
- "Hope Missions" has these templates:
  - **Scheduled**, weekly, "Payment due reminder", subject "Your balance", organization-wide
  - **Scheduled**, 5 days before trip start, "Payment due reminder", subject "Almost time", for "Guatemala Clinic"
  - **Send Now**, "Deposit received", subject "Deposit received - thank you", organization-wide
  - **Trip Participant**, "Trip team update", subject "Team news", organization-wide
- "Peru Outreach" (another organization) has a **Send Now** template with subject "Peru only".
- A global master template has subject "Master template".

### US-118.1 — Download an organization's email report

#### Scenario: Email report lists the organization's templates by function code
* **When** the email report is built for "Hope Missions"
* **Then** its heading has the organization name "Hope Missions" and the title "Email Report"
* **And** its groups are **Scheduled**, **Send Now**, **Trip Participant**, in that order (no **Person** group)
* **And** the **Scheduled** group lists "Almost time" (When sent "5 days before trip start", Trip "Guatemala Clinic") then "Your balance" (When sent "Weekly (Tuesday)", Trip "All trips"), each with email type "Payment due reminder" and its event description
* **And** the **Send Now** group lists "Deposit received - thank you" with When sent "On Event" and the "Deposit received" event description
* **And** the **Trip Participant** group lists "Team news" with When sent "Manual" and event description "No event description."
* **And** "Peru only" and "Master template" are not in the report

#### Scenario: Org Admin downloads the email report PDF
* **When** Olivia requests `GET /trips/email-templates/report/pdf` for "Hope Missions"
* **Then** the response is a PDF named "Email Report - Hope Missions.pdf"

#### Scenario: Only System Admins and Org Admins can download the email report
* **Given** Tom is a Trip Leader of "Guatemala Clinic" and not an Org Admin
* **When** Tom requests the email report for "Hope Missions"
* **Then** the response is `403`
* **When** a System Admin requests it with no organization selected
* **Then** the response is `400` "Select an organization."

#### Scenario: Email Report button downloads the report
* **Given** Olivia has "Hope Missions" selected
* **When** Olivia opens **Email templates**
* **Then** there is an **Email Report** button
* **When** Olivia clicks **Email Report**
* **Then** the PDF "Email Report - Hope Missions.pdf" is downloaded

#### Scenario: Email Report button only for admins with an organization
* **When** Tom (Trip Leader only) opens **Email templates**
* **Then** there is no **Email Report** button
* **When** a System Admin with no organization selected opens **Email templates**
* **Then** there is no **Email Report** button

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-118.1 | Email report lists the organization's templates by function code | `backend/tests/email-report-pdf.test.js` | `Email report lists the organization's templates by function code` |
| US-118.1 | Org Admin downloads the email report PDF | `backend/tests/email-report-pdf.test.js` | `Org Admin downloads the email report PDF` |
| US-118.1 | Only System Admins and Org Admins can download the email report | `backend/tests/email-report-pdf.test.js` | `Only System Admins and Org Admins can download the email report` |
| US-118.1 | Email Report button downloads the report | `frontend/tests/EmailReport.test.js` | `Email Report button downloads the report` |
| US-118.1 | Email Report button only for admins with an organization | `frontend/tests/EmailReport.test.js` | `Email Report button only for admins with an organization` |

---

## Agent implementation request

```text
Implement Feature 118 from @features/feature-118-email-report.md on branch `feature/118-email-report`.

Backend: new backend/app/utils/emailReportPdf.js with buildEmailReportData(orgId) (organization header, function code groups per FR-004, rows per FR-005) and renderEmailReportPdf(data) using utils/pdf.js (drawOrganizationHeader, drawRow, renderPdf; landscape; "No email templates." when empty). emailTemplate.controller.js: emailReportPdf handler — resolve the acting organization like findAll, 400 "Select an organization." when none, 403 unless System Admin or Org Admin of it, sendPdf as "Email Report - <org name>.pdf". Register GET /report/pdf in emailTemplate.routes.js before /:id.
Frontend: exportServices.emailReportPdf(orgName); EmailTemplatesList "Email Report" button beside Add template per FR-007, with loading and error message.
Tests per the Test Coverage Map. Update features/reference/ (api.md email-templates rows, behavior.md email templates row).
```

---

## Definition of Done

*   [x] Report endpoint and access per **FR-001**
*   [x] Organization templates only per **FR-002**
*   [x] Heading per **FR-003**
*   [x] Groups and order per **FR-004**
*   [x] Columns and When sent per **FR-005**
*   [x] Empty report per **FR-006**
*   [x] **Email Report** button per **FR-007**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- A report for Trip Leaders or for the global master templates.
- Email bodies, From / To addresses, or attachments in the report.
- A generated date, filters, or other formats (CSV, Excel).
- Changing templates or when emails are sent.
