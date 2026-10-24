# Feature: Trip Arrival Info

**Feature ID:** 76
**Branch pattern:** `feature/76-trip-arrival-info`
**Status:** Implemented
**Created:** 2026-10-22
**Input:** "Add a feature for Trip Arrival Info. This will allow upload of a Trip Arrival PDF file for a trip and a Trip Arrival Email Template that includes an attachment of the Trip Arrival PDF. Add an attachment field for Email templates that allows a {{}} that specifies the file to attach. Add {{TRIP_ARRIVAL_PDF}} definition so it can be included as an email attachment in the Template."

Clarified with the requester:
- The PDF is uploaded, replaced, viewed, and removed on **View Trip** by trip staff (Trip Leader of the trip, Org Admin of its organization, System Admin).
- When an email's **Attachment** names the Trip Arrival PDF and the trip has none, that email is **skipped** with a reason.
- Seed **two** Trip Arrival templates per organization: a **Trip Participant** template sent by staff from **Email team**, and a **Scheduled** template sent automatically before the trip starts.
- **Approved** participants (and approved Trip Leaders) of the trip may also open the PDF from **My Trip Info**.

Today `emailTemplate.attachment` (STRING(500)) exists in the table but nothing reads or writes it, and every template email is plain text with no attachments.

**Depends on:**
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md)
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md)
- [Feature 43 — Email Delivery](feature-43-email-delivery.md)
- [Feature 44 — Daily Scheduled Emails](feature-44-daily-scheduled-emails.md)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md)
- [Feature 61 — Trip Page My Travel Details](feature-61-trip-page-my-travel-details.md)

---

## User Stories

### US-76.1: Staff upload a trip's arrival PDF
**As a** Trip Leader, Org Admin, or System Admin  
**I want** to upload, replace, view, and remove one **Trip Arrival PDF** on View Trip  
**So that** arrival instructions (airport pickup, hotel, contacts) are kept with the trip and can be emailed

**Priority:** P1  
**Independent test:** On View Trip, upload `arrival.pdf` → **Trip arrival info** shows "Trip Arrival - Guatemala Clinic.pdf"; **Replace** with another PDF → the link opens the new file; **Remove** → "No Trip Arrival PDF."  
**Acceptance scenarios:** see ### US-76.1

### US-76.2: Templates name attachments with tokens
**As an** Org Admin writing email templates  
**I want** an **Attachment** field that holds attachment tokens such as `{{TRIP_ARRIVAL_PDF}}`  
**So that** any template can send the trip's file with the email

**Priority:** P1  
**Independent test:** In the template form choose `{{TRIP_ARRIVAL_PDF}}` from **Attachment**'s **Insert token** and save → reopening shows `{{TRIP_ARRIVAL_PDF}}`; typing `{{TRIP_NAME}}` there → "Attachment may only list attachment tokens."  
**Acceptance scenarios:** see ### US-76.2

### US-76.3: Emails carry the arrival PDF
**As** trip staff  
**I want** emails from a template with `{{TRIP_ARRIVAL_PDF}}` in **Attachment** to include the trip's PDF  
**So that** every participant receives the arrival information as a file

**Priority:** P1  
**Independent test:** Guatemala Clinic has a Trip Arrival PDF; Email team sends the **Trip arrival info** template to all accepted participants → each email has the attachment "Trip Arrival - Guatemala Clinic.pdf"  
**Acceptance scenarios:** see ### US-76.3

### US-76.4: Trip Arrival templates are seeded
**As an** Org Admin  
**I want** ready-made Trip Arrival templates, one for Email team and one scheduled before the trip  
**So that** I only need to upload the PDF

**Priority:** P2  
**Independent test:** Run the seeds → the organization has **Trip arrival info** (Trip Participant) and **Trip arrival info (scheduled)** (Scheduled, 3 days before trip start) templates, both with **Attachment** `{{TRIP_ARRIVAL_PDF}}`  
**Acceptance scenarios:** see ### US-76.4

### US-76.5: Approved participants open the arrival PDF
**As an** approved participant  
**I want** to open the Trip Arrival PDF from **My Trip Info**  
**So that** I can find it again without searching my email

**Priority:** P2  
**Independent test:** Sign in as an approved participant of Guatemala Clinic → **My Trip Info** shows **Trip arrival info** with "Trip Arrival - Guatemala Clinic.pdf", which opens the PDF; an applied participant sees no link and gets `403` from the file URL  
**Acceptance scenarios:** see ### US-76.5

---

## Requirements

### Functional Requirements

**Trip Arrival PDF**

- **FR-001**: A trip MAY have one **Trip Arrival PDF**. It is shown and downloaded as `Trip Arrival - <trip name>.pdf`.
- **FR-002**: Trip staff (Trip Leader of the trip, Org Admin of the trip's organization, System Admin) MAY upload, replace, and remove it. Only a PDF up to 10 MB is accepted: otherwise `400` "Upload a PDF file." / "The PDF must be 10 MB or smaller.", and nothing changes.
- **FR-003**: The file is stored under `documents/trips/` as `trip-<id>-arrival-<uploadTime>.pdf`, never under the public `images/` folder. Replacing saves the new file and then deletes the old one; removing deletes the file; deleting the trip deletes it. Copying a trip does not copy it.
- **FR-004**: Trip staff and people with an **approved** Trip Participant or Trip Leader assignment on the trip MAY open the PDF (inline, `application/pdf`). Anyone else → `403`; no PDF → `404` "No Trip Arrival PDF.".
- **FR-005**: **View Trip** has a **Trip arrival info** section for trip staff: with no PDF, "No Trip Arrival PDF." and **Upload PDF**; with a PDF, the file name as a link that opens it, **Replace**, and **Remove** (asks "Remove the Trip Arrival PDF?").

**Attachment field and tokens**

- **FR-006**: A new token value source kind, **attachment**, names a file. Its first value source is `trip.arrivalPdf` ("Trip arrival PDF"): the trip's Trip Arrival PDF.
- **FR-007**: The token seed adds `TRIP_ARRIVAL_PDF` → `trip.arrivalPdf` (existing token rows are not changed). In **Subject** and **Email body**, an attachment token fills with the file name (`Trip Arrival - <trip name>.pdf`), or empty when the trip has none.
- **FR-008**: The template form has an optional **Attachment** field after **Email body**, saved in `emailTemplate.attachment`. It lists attachment tokens separated by commas; its **Insert token** lists only attachment tokens and adds the chosen one to the list. Anything else → "Attachment may only list attachment tokens." (form and server `400`). **Copy from** copies **Attachment**. Any function code may have attachments.

**Sending**

- **FR-009**: When a template email is built (Send Now, Scheduled, Email team, Email people), each token in **Attachment** adds its file to the email. When the file is missing (no trip, none uploaded, or the stored file cannot be read), the email is **skipped** with reason "Trip arrival PDF is missing." (`<value source label> is missing.`), and nothing is logged as sent.
- **FR-010**: SMTP mode sends the attachments with the email (`application/pdf`). File mode (`EMAIL_MODE=file`) writes an `Attachments: <file names>` line after `Subject`. Test mode keeps the attachments.
- **FR-011**: Every **Preview** (template preview, Email team, Email people) shows **Attachments** with the file names after **Subject**, or the FR-009 reason when one is missing. Preview still sends nothing.

**Seeded templates**

- **FR-012**: The email type seed adds `trip-arrival` (**Trip arrival info**, event code `team-email`) and `trip-arrival-scheduled` (**Trip arrival info (scheduled)**, event code `trip-arrival`).
- **FR-013**: The template seed adds, for the seed organization, a **Trip Participant** template of type `trip-arrival` and a **Scheduled** template of type `trip-arrival-scheduled` (**Days before trip start**, 3), both From `{{ORG_EMAIL}}`, To `{{PARTICIPANT_EMAIL}}`, **Attachment** `{{TRIP_ARRIVAL_PDF}}`, subject "Arrival information for {{TRIP_NAME}}", and a body that says the arrival information is attached. The seed rejects an invalid **Attachment** as it does an invalid From or To.
- **FR-014**: Scheduled emails (Feature 44) add the event code `trip-arrival` → **approved** Trip Participants.

**My Trip Info**

- **FR-015**: When the signed-in person is approved on the trip and it has a Trip Arrival PDF, **My Trip Info** shows **Trip arrival info** with the file name as a link that opens it.

---

## Assumptions

- The PDF is not personal data, so it is stored unencrypted (unlike Feature 63 person documents), but outside the public folder and served only per FR-004.
- One PDF per trip; a new upload replaces it. Staff tell participants about a replacement by sending the email again.
- The scheduled template's 3 days before start is a seed default; Org Admins can change it like any schedule.
- `trip.arrivalPdf` is the only attachment value source for now; the **attachment** kind lets later features add more without changing the field.

## Edge Cases

- Email team **Trip arrival info** sent for a trip with no PDF → every email skipped "Trip arrival PDF is missing."; the dialog lists them as skipped.
- Scheduled Trip Arrival email due while the trip has no PDF → each participant recorded **skipped** for that date and not retried (Feature 44 rules).
- A **Person** template with an attachment token, sent from Email people with **Trips** **All** → no trip, so every email is skipped with the FR-009 reason.
- **Attachment** lists the same token twice → the file is attached once.
- **Attachment** blank → no attachments; the email is unchanged from today.
- Replace fails validation (not a PDF, too large) → the current PDF stays.
- Stored file missing from disk → opening it returns `404` "No Trip Arrival PDF."; sending skips per FR-009.
- `{{TRIP_ARRIVAL_PDF}}` in **To** or **From email** → rejected as today (not an email token).

## Success Criteria

- **SC-001**: An email from a template whose **Attachment** is `{{TRIP_ARRIVAL_PDF}}` always either carries the trip's current PDF or is skipped with the FR-009 reason; it is never sent without it.
- **SC-002**: Only trip staff and approved members of the trip can open the PDF.
- **SC-003**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

The Trip Arrival PDF belongs to one trip. Only that trip's staff manage it; only staff and approved members of that trip can open it. It is never served from the public `images/` folder, and its stored file name is not returned by the API (responses only say whether one exists).

---

## Key Entities

- **Trip** — new `arrivalPdfFileName`
- **Email template** — `attachment` (existing column, now used)
- **Email token** — new seeded `TRIP_ARRIVAL_PDF`
- **Email type** — two new seeded types
- **Scheduled email send** — records Trip Arrival sends (no change)

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `POST` | `/trips/trips/:id/arrival-pdf` | auth (trip staff) | Multipart `file`; saves or replaces the Trip Arrival PDF → `{ hasArrivalPdf: true }`; `400` per FR-002 (new) |
| `GET` | `/trips/trips/:id/arrival-pdf` | auth (trip staff or approved member) | The PDF inline, `Content-Disposition: inline; filename="Trip Arrival - <trip name>.pdf"`; `403` / `404` per FR-004 (new) |
| `DELETE` | `/trips/trips/:id/arrival-pdf` | auth (trip staff) | Removes it → `{ hasArrivalPdf: false }` (new) |
| `GET` | `/trips/trips/:id` | auth | Adds `hasArrivalPdf` (FR-005) |
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo` adds `hasArrivalPdf` when the caller is approved on the trip, else `false` (FR-015) |
| `POST` / `PUT` | `/trips/email-templates`, `/trips/email-templates/:id` | as today | Accept `attachment`; `400` "Attachment may only list attachment tokens." (FR-008) |
| `GET` | `/trips/email-templates`, `/trips/email-templates/copy-sources` | as today | Include `attachment` (FR-008) |
| `GET` | `/trips/email-tokens/value-sources` | System Admin | Lists `trip.arrivalPdf` "Trip arrival PDF" (FR-006) |
| `POST` | `/trips/email-templates/preview`, `/trips/trips/:id/team-email/preview`, `/trips/people-email/preview` | as today | Add `attachments` (file names) or `attachmentError` (FR-011) |

Email team and Email people sends report FR-009 skips in their existing results.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| View Trip | **Trip arrival info** section for trip staff: upload, link, replace, remove (FR-005) |
| Email template form (`EmailTemplateFormDialog`) | **Attachment** field after **Email body** with its own **Insert token** (attachment tokens only) (FR-008) |
| Template preview, Email team preview, Email people preview | **Attachments** line, or the missing reason (FR-011) |
| Email tokens (System Admin) | **Value source** offers "Trip arrival PDF" (FR-006) |
| Trip page — My Trip Info | **Trip arrival info** link for approved members (FR-015) |

---

## Data Model Requirements

`trip` adds (created by `ensureSchema`):

| Field | Type | Rules |
|-------|------|-------|
| arrivalPdfFileName | STRING(500) | optional; stored file name under `documents/trips/` |

`emailTemplate.attachment` (existing STRING(500)) now holds the FR-008 list; empty or null means no attachments.

Seeds: `seedEmailTokens` adds `TRIP_ARRIVAL_PDF`; `seedEmailTypes` adds `trip-arrival` and `trip-arrival-scheduled`; `data/emailTemplates.json` adds the two FR-013 templates (with `attachment`).

---

## Acceptance Criteria (Gherkin)

Background for the scenarios below:
- Organization "Hope Missions" has trip "Guatemala Clinic" starting 2027-03-10.
- Tess is the Trip Leader, Ana and Ben are approved Trip Participants, and Cara has applied.
- Olga is Org Admin of another organization.
- Token `TRIP_ARRIVAL_PDF` → `trip.arrivalPdf` exists.

### US-76.1 — Staff upload a trip's arrival PDF

#### Scenario: Staff upload a Trip Arrival PDF
* **Given** I am signed in as Tess
* **When** I upload `arrival.pdf` as the Trip Arrival PDF of "Guatemala Clinic"
* **Then** the trip has a Trip Arrival PDF stored under `documents/trips/`
* **And** the trip detail shows `hasArrivalPdf` true

#### Scenario: Replacing the Trip Arrival PDF keeps only the new file
* **Given** "Guatemala Clinic" has a Trip Arrival PDF
* **When** I upload a different PDF
* **Then** opening the Trip Arrival PDF returns the new file
* **And** the old file is deleted

#### Scenario: Only a PDF can be uploaded
* **When** I upload `arrival.png` as the Trip Arrival PDF
* **Then** the response is `400` "Upload a PDF file."
* **And** the trip's Trip Arrival PDF is unchanged

#### Scenario: Staff remove the Trip Arrival PDF
* **Given** "Guatemala Clinic" has a Trip Arrival PDF
* **When** I remove it
* **Then** the file is deleted and the trip detail shows `hasArrivalPdf` false

#### Scenario: Who can open the Trip Arrival PDF
* **Given** "Guatemala Clinic" has a Trip Arrival PDF
* **Then** Tess and Ana can open it as `application/pdf` named "Trip Arrival - Guatemala Clinic.pdf"
* **And** Cara and Olga get `403`

#### Scenario: View Trip manages the Trip Arrival PDF
* **Given** I am on View Trip for "Guatemala Clinic" as trip staff and it has no PDF
* **Then** **Trip arrival info** shows "No Trip Arrival PDF." and **Upload PDF**
* **When** the trip has a Trip Arrival PDF
* **Then** it shows "Trip Arrival - Guatemala Clinic.pdf" with **Replace** and **Remove**

### US-76.2 — Templates name attachments with tokens

#### Scenario: A template saves an attachment token
* **When** I save a template with **Attachment** `{{TRIP_ARRIVAL_PDF}}`
* **Then** the template's `attachment` is `{{TRIP_ARRIVAL_PDF}}`

#### Scenario: Attachment accepts only attachment tokens
* **When** I save a template with **Attachment** `{{TRIP_NAME}}`
* **Then** the response is `400` "Attachment may only list attachment tokens."

#### Scenario: Template form inserts an attachment token
* **Given** the template form is open
* **When** I open **Attachment**'s **Insert token**
* **Then** it lists `{{TRIP_ARRIVAL_PDF}}` and no other tokens
* **When** I choose it
* **Then** **Attachment** is `{{TRIP_ARRIVAL_PDF}}`

### US-76.3 — Emails carry the arrival PDF

#### Scenario: Email team sends the Trip Arrival PDF as an attachment
* **Given** "Guatemala Clinic" has a Trip Arrival PDF
* **And** a Trip Participant template with **Attachment** `{{TRIP_ARRIVAL_PDF}}`
* **When** Tess sends it from Email team to all accepted participants in SMTP mode
* **Then** Ana and Ben each get an email with the attachment "Trip Arrival - Guatemala Clinic.pdf" (`application/pdf`)

#### Scenario: A missing Trip Arrival PDF skips the email
* **Given** "Guatemala Clinic" has no Trip Arrival PDF
* **When** Tess sends that template to all accepted participants
* **Then** the result is sent 0, skipped 2, each "Trip arrival PDF is missing."

#### Scenario: File mode lists the attachment
* **Given** `EMAIL_MODE=file` and "Guatemala Clinic" has a Trip Arrival PDF
* **When** the template is sent to Ana
* **Then** the email file has the line `Attachments: Trip Arrival - Guatemala Clinic.pdf` after `Subject`

#### Scenario: Preview lists the attachment
* **Given** "Guatemala Clinic" has a Trip Arrival PDF
* **When** I preview the template for "Guatemala Clinic" and Ana
* **Then** the preview has `attachments` ["Trip Arrival - Guatemala Clinic.pdf"]
* **And** `{{TRIP_ARRIVAL_PDF}}` in the body fills as "Trip Arrival - Guatemala Clinic.pdf"

### US-76.4 — Trip Arrival templates are seeded

#### Scenario: Seed adds the Trip Arrival token, types, and templates
* **When** the token, type, and template seeds run for the seed organization
* **Then** token `TRIP_ARRIVAL_PDF` → `trip.arrivalPdf` exists
* **And** the organization has a Trip Participant template of type `trip-arrival` and a Scheduled template of type `trip-arrival-scheduled`, 3 days before start, both with **Attachment** `{{TRIP_ARRIVAL_PDF}}`

#### Scenario: Scheduled Trip Arrival email goes to approved participants
* **Given** "Guatemala Clinic" has a Trip Arrival PDF and the organization's scheduled Trip Arrival template
* **When** the scheduled email job runs on 2027-03-07
* **Then** Ana and Ben are sent the email with the attachment
* **And** Cara is not

### US-76.5 — Approved participants open the arrival PDF

#### Scenario: My Trip Info offers the Trip Arrival PDF to approved members
* **Given** "Guatemala Clinic" has a Trip Arrival PDF
* **Then** the trip page data for Ana has `myTripInfo.hasArrivalPdf` true
* **And** for Cara it is false

#### Scenario: My Trip Info shows the Trip Arrival PDF link
* **Given** my trip page data has `hasArrivalPdf` true
* **Then** **My Trip Info** shows **Trip arrival info** with "Trip Arrival - Guatemala Clinic.pdf"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-76.1 | Staff upload a Trip Arrival PDF | `backend/tests/trip-arrival-info.test.js` | `Staff upload a Trip Arrival PDF` |
| US-76.1 | Replacing the Trip Arrival PDF keeps only the new file | `backend/tests/trip-arrival-info.test.js` | `Replacing the Trip Arrival PDF keeps only the new file` |
| US-76.1 | Only a PDF can be uploaded | `backend/tests/trip-arrival-info.test.js` | `Only a PDF can be uploaded` |
| US-76.1 | Staff remove the Trip Arrival PDF | `backend/tests/trip-arrival-info.test.js` | `Staff remove the Trip Arrival PDF` |
| US-76.1 | Who can open the Trip Arrival PDF | `backend/tests/trip-arrival-info.test.js` | `Who can open the Trip Arrival PDF` |
| US-76.1 | View Trip manages the Trip Arrival PDF | `frontend/tests/TripArrivalInfo.test.js` | `View Trip manages the Trip Arrival PDF` |
| US-76.2 | A template saves an attachment token | `backend/tests/trip-arrival-info.test.js` | `A template saves an attachment token` |
| US-76.2 | Attachment accepts only attachment tokens | `backend/tests/trip-arrival-info.test.js` | `Attachment accepts only attachment tokens` |
| US-76.2 | Template form inserts an attachment token | `frontend/tests/EmailTemplateFormDialog.test.js` | `Template form inserts an attachment token` |
| US-76.3 | Email team sends the Trip Arrival PDF as an attachment | `backend/tests/trip-arrival-info.test.js` | `Email team sends the Trip Arrival PDF as an attachment` |
| US-76.3 | A missing Trip Arrival PDF skips the email | `backend/tests/trip-arrival-info.test.js` | `A missing Trip Arrival PDF skips the email` |
| US-76.3 | File mode lists the attachment | `backend/tests/trip-arrival-info.test.js` | `File mode lists the attachment` |
| US-76.3 | Preview lists the attachment | `backend/tests/trip-arrival-info.test.js` | `Preview lists the attachment` |
| US-76.4 | Seed adds the Trip Arrival token, types, and templates | `backend/tests/trip-arrival-info.test.js` | `Seed adds the Trip Arrival token, types, and templates` |
| US-76.4 | Scheduled Trip Arrival email goes to approved participants | `backend/tests/trip-arrival-info.test.js` | `Scheduled Trip Arrival email goes to approved participants` |
| US-76.5 | My Trip Info offers the Trip Arrival PDF to approved members | `backend/tests/trip-arrival-info.test.js` | `My Trip Info offers the Trip Arrival PDF to approved members` |
| US-76.5 | My Trip Info shows the Trip Arrival PDF link | `frontend/tests/MyTripTravelDetails.test.js` | `My Trip Info shows the Trip Arrival PDF link` |

---

## Agent implementation request

```text
Implement Feature 76 from @features/feature-76-trip-arrival-info.md on branch `feature/76-trip-arrival-info`.

Follow layer order in @features/framework.md.
Data: trip.arrivalPdfFileName (ensureSchema); emailTemplate.attachment is already in the table — add it to the model if missing. Seeds: TRIP_ARRIVAL_PDF token, trip-arrival and trip-arrival-scheduled email types, two templates in data/emailTemplates.json (seed copies attachment and validates it).
Backend: multer memory upload for the PDF (10 MB, PDF only) written to documents/trips/; trip controller upload / open / remove with trip-staff and approved-member access; delete the file on replace, remove, and trip delete; copy does not copy it. emailTokenValues: attachment value source kind with trip.arrivalPdf, attachmentsAreValid, text value = file name. emailDelivery.buildTemplateMessage resolves attachments (skip with "<label> is missing."), deliver passes them to Nodemailer and writes the Attachments line in file mode. Template create/update/list/copy-sources handle attachment. Previews return attachments / attachmentError. scheduledEmails adds trip-arrival → approved Trip Participants. Browse myTripInfo and trip detail add hasArrivalPdf.
Frontend: TripArrivalInfo section on View Trip (FR-005); EmailTemplateFormDialog Attachment field + Insert token (FR-008); Attachments line in the three preview dialogs (FR-011); My Trip Info link (FR-015).
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: data-model.md (trip, emailTemplate.attachment, token/type seeds), api.md (rows above), behavior.md (new Feature 76 row; update the token, delivery, scheduled email, Email team, and My Trip Info rows).
Do not encrypt the PDF, add other attachment sources, store attachments in emailLog, or change who can send emails.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md`, `api.md`, `behavior.md`

---

## Definition of Done

*   [x] Trip Arrival PDF upload, replace, open, remove, and access per **FR-001**–**FR-005**
*   [x] Attachment value source, `{{TRIP_ARRIVAL_PDF}}`, and the **Attachment** field per **FR-006**–**FR-008**
*   [x] Sending, file mode, and previews per **FR-009**–**FR-011**
*   [x] Seeded types, templates, and scheduled recipients per **FR-012**–**FR-014**
*   [x] My Trip Info link per **FR-015**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/data-model.md`, `api.md`, and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Attachment files other than the Trip Arrival PDF (person documents, room list, flights PDF)
- More than one arrival file per trip, or file types other than PDF
- Encrypting the Trip Arrival PDF
- Keeping attachments (or their names) in `emailLog`
- Emails sent automatically when the PDF is uploaded or replaced
- Showing the PDF to applied, incomplete, or other non-approved people, or on public trip pages
