# Email Type Event Description

**Feature ID:** 117
**Branch pattern:** `feature/117-email-type-event-description`
**Status:** Implemented
**Created:** 2026-11-04
**Input:** "write a spec that addes a new field to Email Types for Event Description. Also update the seed to add values for these based on what each event means and/or checks for.  For example: \"This event happens when an application has its first save.\"  \"This rule checks to see if the particant has a non zero balance for their trip.\"  \"This event happens the first time the payments exceed the trip deposit amount\".  Display the new field on the Event types page and and add/edit screen."

An email type's **Event code** (for example `deposit-received` or `payment-due`) decides when its templates are sent, but nothing on the **Email types** page explains what each code means. This feature adds an **Event description** to each email type: a plain sentence saying when the event happens, or what the scheduled rule checks. It shows on the **Email types** list and the add / edit dialog, and the email type seed fills it in for every seeded type.

## Clarifications

### Session 2026-11-04

- Q: Required? → A: No. **Event description** is optional; a System Admin can save an email type without it.
- Q: How does the seed fill existing databases? → A: For each seeded type code, it fills **Event description** only when it is blank, so an admin's own text is never overwritten. New types get it when they are added. Types added by admins (not in the seed) are left alone.
- Q: How does the list show it? → A: Its own **Event description** column with the full text, wrapping.
- Q: Show it on the **Email templates** page? → A: Yes, on the templates list only: an info icon next to each row's **Email type** whose tooltip shows the type's event description, or "No event description." when it has none. Not in the template add / edit dialog.

**Depends on:**
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md) (email types, **Email types** page and dialog)
- [Feature 44 — Daily Scheduled Emails](feature-44-daily-scheduled-emails.md) (scheduled rules)
- [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md) (application and donation events)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md) (`team-email` templates sent by staff)
- [Feature 113 — Documents Missing Reminder Email](feature-113-documents-missing-email.md) (`documents-missing` rule)

---

## User Stories

### US-117.1: Describe what an email type's event means

**As** a System Admin
**I want** to read and edit a plain-language description of each email type's event
**So that** I (and anyone setting up templates) know exactly when its emails are sent

**Acceptance:** see Gherkin scenarios under US-117.1.

### US-117.3: See a template's event description on the templates list

**As** an Org Admin, Trip Leader, or System Admin managing email templates
**I want** to hover an info icon by a template's email type to read its event description
**So that** I know when that template will be sent without opening **Email types**

**Acceptance:** see Gherkin scenarios under US-117.3.

### US-117.2: Seeded email types come with descriptions

**As** a System Admin
**I want** the seed to fill in the event description for every seeded email type
**So that** the descriptions are there without typing them in

**Acceptance:** see Gherkin scenarios under US-117.2.

---

## Requirements

### Functional Requirements

- **FR-001**: `emailType` gains `eventDescription` (TEXT, optional). `ensureSchema` adds the column, empty for existing rows. `POST` / `PUT /trips/email-types` accept it; it is trimmed, and blank saves as `null`. `GET /trips/email-types` and `GET /trips/email-types/:id` return it.
- **FR-002**: The **Email types** page list (`EmailTypesList`) adds an **Event description** column after **Event code**, showing the full text (wrapping) or nothing when blank.
- **FR-003**: The add / edit dialog (`EmailTypeFormDialog`) adds an optional multi-line **Event description** field after **Event code**. Editing shows the saved text. Saving sends the trimmed text; leaving it blank is allowed.
- **FR-004**: The email type seed (`seedEmailTypes.js`) has an event description for every seeded type (see **Seed event descriptions**). It adds missing types with their description, as today, and for each seeded type that already exists with a blank `eventDescription`, it sets the seed description. It never changes a non-blank `eventDescription`, and never changes `description` or `eventCode`. Its summary also reports how many descriptions it filled.
- **FR-005**: The **Email templates** list (`EmailTemplatesList`) shows an info icon (`mdi-information-outline`, accessible name "Event description") after each row's **Email type**. Hovering or focusing it shows a tooltip with the email type's event description, or "No event description." when it is blank. Rows with no email type ("—") have no icon. `GET /trips/email-templates` includes `eventDescription` in each template's `emailType`.

### Seed event descriptions

| Type code | Event code | Event description |
|-----------|-----------|-------------------|
| `apply-started` | `application-started` | This event happens when a Trip Participant's application is saved for the first time and is still incomplete. |
| `apply-incomplete` | `application-incomplete` | This scheduled rule checks whether the Trip Participant's application is still Incomplete. |
| `apply-received` | `application-submitted` | This event happens when a Trip Participant's application becomes Pre-Approved: when an incomplete application is completed, or when the first save is already complete. |
| `apply-approved` | `application-approved` | This event happens when a Trip Participant's application is changed to Approved, or is added as Approved. |
| `documents-missing` | `documents-missing` | This scheduled rule checks whether the Trip Participant's application is Pre-Approved and at least one trip document is still missing, has no file, or has an expiration date that doesn't meet its document type's expiration check. |
| `deposit-due` | `deposit-due` | This scheduled rule checks whether the Trip Participant's application is Approved, the trip has a deposit above $0, and the donations recorded for them on the trip total less than the deposit. |
| `deposit-received` | `deposit-received` | This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount. |
| `payment-due` | `payment-due` | This scheduled rule checks whether the Trip Participant's application is Approved and they still have a balance above $0 for the trip (total trip cost minus donations). |
| `payment-complete` | `payment-complete` | This event happens when a donation brings a Trip Participant's balance for the trip to $0 or less. |
| `donation-received` | `donation-received` | This event happens each time a donation is recorded for a Trip Participant on a trip. |
| `pre-departure` | `pre-departure` | This scheduled rule checks whether the Trip Participant's application is Approved. |
| `trip-arrival-scheduled` | `trip-arrival` | This scheduled rule checks whether the Trip Participant's application is Approved. |
| `team-update` | `team-email` | This email is not sent automatically. Trip staff send it to the trip team from **Email team** on the trip page. |
| `financial-statement` | `team-email` | This email is not sent automatically. Trip staff send it to the trip team from **Email team** on the trip page. |
| `trip-arrival` | `team-email` | This email is not sent automatically. Trip staff send it to the trip team from **Email team** on the trip page. |
| `account-invite` | `team-email` | This email is not sent automatically. Trip staff send it to the trip team from **Email team** on the trip page. |
| `people-update` | `team-email` | This email is not sent automatically. Org Admins send it from **Email** on the People page. |
| `flight-itinerary` | `team-email` | This email is not sent automatically. Trip staff and Agents send it from **Email flight itinerary** on the trip's Flights page. |

In the seed file the bold markers are plain text (no Markdown).

---

## Assumptions

- The descriptions explain the event or rule only. When a scheduled template is sent (daily, weekly, days before start) is still the template's schedule.
- Only System Admins see the **Email types** page, as today. The template add / edit dialog doesn't show the description; the templates list does (FR-005).

## Edge Cases

- An admin cleared a seeded type's description → the next seed run fills it again (it is blank).
- An admin rewrote a seeded type's description → the seed keeps the admin's text.
- An admin-added email type that isn't in the seed → its description is never touched by the seed.
- Description with only spaces → saved as `null`, shown blank.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Email sending is unchanged; `eventDescription` is for people only.

---

## Data Ownership & Isolation

Unchanged: only System Admins create, edit, and delete email types; System Admins, Org Admins, and Trip Leaders can list them (Feature 39).

---

## Key Entities

`emailType` gains `eventDescription`.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/email-types`, `/trips/email-types/:id` | Each type includes `eventDescription` (FR-001) |
| `POST` / `PUT` | `/trips/email-types`, `/trips/email-types/:id` | Accept optional `eventDescription`, trimmed; blank → `null` (FR-001) |
| `GET` | `/trips/email-templates` | Each template's `emailType` includes `eventDescription` (FR-005) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `EmailTypesList` | **Event description** column after **Event code**, full text wrapping (FR-002) |
| `EmailTypeFormDialog` | Optional multi-line **Event description** after **Event code** (FR-003) |
| `EmailTemplatesList` | Info icon after **Email type** with the event description tooltip (FR-005) |

---

## Data Model Requirements

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| `emailType` | `eventDescription` | TEXT | optional; trimmed, blank stored `null`; `ensureSchema` adds the column |

---

## Acceptance Criteria (Gherkin)

Background:
- Sam is a System Admin.
- The email type seed has run.

### US-117.1 — Describe what an email type's event means

#### Scenario: Email types list shows the event description
* **Given** the "Deposit received" email type has event description "This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount."
* **When** Sam opens **Email types**
* **Then** the list has an **Event description** column after **Event code**
* **And** the "Deposit received" row shows that text

#### Scenario: Add and edit an email type's event description
* **When** Sam adds an email type with **Event description** "This event happens when staff mark a trip complete."
* **Then** the dialog sends that text
* **When** Sam edits an email type that has an event description
* **Then** **Event description** shows the saved text

#### Scenario: Event description saved through the API
* **When** Sam creates an email type with `eventDescription` "  This event happens when staff mark a trip complete.  "
* **Then** it is saved as "This event happens when staff mark a trip complete."
* **When** Sam updates it with `eventDescription` "   "
* **Then** `eventDescription` is `null`
* **And** `GET /trips/email-types` includes `eventDescription` for every type

### US-117.3 — See a template's event description on the templates list

#### Scenario: Templates list shows the event description on hover
* **Given** the "Deposit received" email type has event description "This event happens the first time the donations recorded for a Trip Participant on a trip reach or exceed the trip deposit amount."
* **And** the "Trip team update" email type has no event description
* **And** templates use each of them
* **When** Sam opens **Email templates**
* **Then** the "Deposit received" template's **Email type** has an info icon whose tooltip shows that text
* **And** the "Trip team update" template's info icon tooltip shows "No event description."

#### Scenario: Template list includes the event description
* **Given** a template uses the "Deposit received" email type
* **When** Sam loads `GET /trips/email-templates`
* **Then** that template's `emailType.eventDescription` is the type's event description

### US-117.2 — Seeded email types come with descriptions

#### Scenario: Seed fills blank event descriptions
* **Given** the "Payment due reminder" email type exists with no event description
* **When** the email type seed runs
* **Then** its event description is "This scheduled rule checks whether the Trip Participant's application is Approved and they still have a balance above $0 for the trip (total trip cost minus donations)."
* **And** every seeded email type has an event description

#### Scenario: Seed keeps an admin's event description
* **Given** Sam changed the "Application started" event description to "Sent when someone starts an application."
* **And** Sam added an email type "trip-complete" with no event description
* **When** the email type seed runs
* **Then** "Application started" still has "Sent when someone starts an application."
* **And** "trip-complete" still has no event description

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-117.1 | Email types list shows the event description | `frontend/tests/EmailTypeEventDescription.test.js` | `Email types list shows the event description` |
| US-117.1 | Add and edit an email type's event description | `frontend/tests/EmailTypeEventDescription.test.js` | `Add and edit an email type's event description` |
| US-117.1 | Event description saved through the API | `backend/tests/email-type-event-description.test.js` | `Event description saved through the API` |
| US-117.3 | Templates list shows the event description on hover | `frontend/tests/EmailTypeEventDescription.test.js` | `Templates list shows the event description on hover` |
| US-117.3 | Template list includes the event description | `backend/tests/email-type-event-description.test.js` | `Template list includes the event description` |
| US-117.2 | Seed fills blank event descriptions | `backend/tests/email-type-event-description.test.js` | `Seed fills blank event descriptions` |
| US-117.2 | Seed keeps an admin's event description | `backend/tests/email-type-event-description.test.js` | `Seed keeps an admin's event description` |

---

## Agent implementation request

```text
Implement Feature 117 from @features/feature-117-email-type-event-description.md on branch `feature/117-email-type-event-description`.

Backend: add emailType.eventDescription (TEXT, null) to the model and ensureSchema; email type controller accepts it on create/update (trimmed, blank → null) and returns it. seedEmailTypes.js: add eventDescription for every seeded type per the Seed event descriptions table; create missing types with it, and fill it on existing seeded types only when blank; report how many were filled.
Frontend: EmailTypesList Event description column after Event code; EmailTypeFormDialog optional textarea after Event code, loaded on edit and sent trimmed.
Tests per the Test Coverage Map. Update features/reference/ (data-model.md emailType, api.md email-types rows, behavior.md email types row).
```

---

## Definition of Done

*   [x] `eventDescription` field and API per **FR-001**
*   [x] List column per **FR-002**
*   [x] Dialog field per **FR-003**
*   [x] Seed descriptions and blank-only fill per **FR-004**
*   [x] Templates list info icon per **FR-005**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Showing the event description in the email template add / edit dialog.
- Changing when any email is sent.
- Renaming email types or event codes.
