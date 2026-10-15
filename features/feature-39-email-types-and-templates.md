# Feature: Email Types and Organization Email Templates

**Feature ID:** 39
**Branch pattern:** `feature/39-email-types-and-templates`
**Status:** Ready
**Created:** 2026-10-15
**Input:** System admins maintain email types (type code, description, event code). The existing email template data and screen gain an Email type dropdown and a Function code dropdown of Scheduled or Send Now. Organization admins maintain those templates with organization, email type, subject, from email, and email body.
**Depends on:** [Feature 3 — Organizations & Agreements](feature-3-organizations-and-agreements.md), [Feature 10 — Email Templates](feature-10-email-templates.md)

---

## User Stories

### US-39.1: Maintain email types

**As a** System Admin
**I want** to add and edit email types with a type code, description, and event code
**So that** organizations can pick a known kind of email

**Priority:** P1
**Independent test:** System Admin creates an email type and sees type code, description, and event code when it reloads. A user who is not a System Admin cannot create one.
**Acceptance scenarios:** see ### US-39.1

### US-39.2: Maintain an organization email template

**As an** Org Admin
**I want** the existing template form to let me pick an email type and a function code of Scheduled or Send Now
**So that** each organization template is tied to a catalog type and a send timing

**Priority:** P1
**Independent test:** The existing template form shows **Email type** as a dropdown of email types and **Function code** as a dropdown of **Scheduled** and **Send Now**. Saving stores both. The template list shows the email type.
**Acceptance scenarios:** see ### US-39.2

---

## Requirements

### Functional Requirements

- **FR-001**: `emailType` MUST store `typeCode` (required, unique, trimmed), `description` (required, trimmed), and `eventCode` (required, trimmed).
- **FR-002**: Only a System Admin MAY create, update, or delete an email type. Create and edit MUST show fields labeled **Type code**, **Description**, and **Event code**.
- **FR-003**: Email type list and get MUST return `id`, `typeCode`, `description`, and `eventCode`. Org Admin and System Admin MAY read the list so a template can choose a type.
- **FR-004**: The existing `emailTemplate` row MUST store `emailTypeId` (required when the template is saved from this form) and `emailBody` (required). It still stores `orgId`, `subject`, and `fromEmail`.
- **FR-005**: The existing template screen (`EmailTemplatesList` and `EmailTemplateFormDialog`) MUST add **Email type** as a dropdown of the email types from **FR-003**. The list MUST show the selected email type. The form MUST show **Organization**, **Email type**, **Function code**, **Subject**, **From email**, and **Email body**.
- **FR-006**: **Function code** on that form MUST be a dropdown whose only choices are **Scheduled** and **Send Now**. Saving MUST store that choice in `functionCode`. Any other value MUST be rejected with `400`.
- **FR-007**: An Org Admin with one organization sees that organization on the template and cannot pick another. An Org Admin with more than one organization chooses among those organizations. System Admin chooses any organization. Org Admin MAY save a template only for an organization they administer.
- **FR-008**: Saving MUST reject a missing type code, description, event code, organization, email type, function code, subject, from email, or email body with `400`. A duplicate `typeCode` MUST be rejected with `400`.
- **FR-009**: `ensureSchema` MUST add `emailType` and nullable `emailTemplate.emailTypeId` and `emailTemplate.emailBody` when they are missing. Existing template rows keep their current `functionCode` until someone saves them. A stored function code other than **Scheduled** or **Send Now** does not appear as a third dropdown choice; the admin must pick one of those two to save.
- **FR-010**: This feature MUST NOT send email. Trip, attachment, and copy-from on the existing template screen stay as they are. `content` is not removed; **Email body** is the body field this form saves.

---

## Assumptions

- “Admins” for email types means System Admin. “Organization admins” means Org Admin.
- `typeCode` is a short identifier such as `apply-received`. `eventCode` is the name of the event this type belongs to, stored as text. This feature does not define a fixed list of event codes.
- `emailBody` is the message text on the existing template form. Feature 10 `content` is not renamed or backfilled.
- **Function code** choices are exactly **Scheduled** and **Send Now**. They replace free-text entry on the existing template form.
- More than one template for the same organization and email type is allowed.
- `fromEmail` is stored as entered. This feature does not check that it is a deliverable mailbox.

## Edge Cases

- Blank type code, description, or event code → `400`.
- Second email type with the same type code → `400`.
- Org Admin saves a template for an organization they do not administer → `403`.
- Email type used by a template → deleting that email type is rejected with `400` and the type remains.
- Org Admin with no organization → they cannot save a template.
- Existing template whose function code is not Scheduled or Send Now → the dropdown has no selection until the admin chooses one of those two.

## Success Criteria

- **SC-001**: System Admin can save an email type and see its type code, description, and event code again.
- **SC-002**: Org Admin can save a template from the existing screen and see its email type, function code (**Scheduled** or **Send Now**), subject, from email, and email body again.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Email types are system catalog data. Only System Admin writes them. Org Admin may read them.
- An organization email template belongs to one organization. Org Admin writes only within organizations they administer. System Admin may write for any organization.

---

## Key Entities

- **EmailType** — type code, description, event code
- **EmailTemplate** — existing template row gains an email type. Function code is **Scheduled** or **Send Now**. Subject, from email, and email body stay on that same row.

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/email-types` | System Admin or Org Admin | List email types |
| `GET` | `/trips/email-types/:id` | System Admin | Get one |
| `POST` | `/trips/email-types` | System Admin | Create |
| `PUT` | `/trips/email-types/:id` | System Admin | Update |
| `DELETE` | `/trips/email-types/:id` | System Admin | Delete when no template uses it |
| `POST` | `/trips/email-templates` | Org Admin or System Admin | Create with `orgId`, `emailTypeId`, `functionCode` (`Scheduled` or `Send Now`), `subject`, `fromEmail`, `emailBody` |
| `PUT` | `/trips/email-templates/:id` | as create, for that template’s organization | Update those fields |
| `GET` | `/trips/email-templates` | as today | Include `emailTypeId`, `functionCode`, `subject`, `fromEmail`, and `emailBody` when present |

**Payload notes:** Email type body is `{ typeCode, description, eventCode }`. Template body for this feature adds `emailTypeId` and `functionCode` on the existing template. `functionCode` MUST be `Scheduled` or `Send Now`. Strings are trimmed. `emailBody` may be long text.

**Status codes:** `400` when a required field is blank or `typeCode` is already used. `403` when the caller cannot administer that organization or is not a System Admin writing email types. `400` when deleting an email type that a template still uses.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `/email-types` | System Admin list and add/edit dialog. Fields **Type code**, **Description**, **Event code** |
| Existing `/templates` list | Show the template’s **Email type** |
| Existing `EmailTemplateFormDialog` | Add **Email type** dropdown. Change **Function code** from free text into a dropdown of **Scheduled** and **Send Now**. Also show **Organization**, **Subject**, **From email**, and **Email body** |

The organization field follows **FR-007**. Email type lists email types by description.

---

## Data Model Requirements

### `emailType`

| Column | Type | Rules |
|--------|------|--------|
| id | INTEGER PK | autoIncrement |
| typeCode | STRING | required, unique |
| description | STRING | required |
| eventCode | STRING | required |

### `emailTemplate` columns added by this feature

| Column | Type | Rules |
|--------|------|--------|
| emailTypeId | INTEGER | nullable FK → emailType; required when saving from the template form in **FR-004** |
| emailBody | TEXT | nullable in the table; required when saving from the template form in **FR-004** |

`functionCode` stays a string. New and updated templates store `Scheduled` or `Send Now` only.

`ensureSchema` creates the table and columns when missing. Existing Feature 10 columns stay.

---

## Acceptance Criteria (Gherkin)

### US-39.1 — Maintain email types

#### Scenario: Email type form shows type code, description, and event code
* **Given** I am a system admin creating an email type
* **Then** I see Type code, Description, and Event code

#### Scenario: Email type is saved
* **Given** I am a system admin
* **When** I save an email type with type code apply-received, description Application received, and event code application-submitted
* **Then** loading that email type shows those type code, description, and event code values

#### Scenario: A non-admin cannot create an email type
* **Given** I am not a system admin
* **When** I create an email type
* **Then** the request is forbidden

### US-39.2 — Maintain an organization email template

#### Scenario: Existing template form has Email type and Function code dropdowns
* **Given** I am an org admin adding an email template
* **And** at least one email type exists
* **Then** I see an Email type dropdown of those email types
* **And** I see a Function code dropdown with Scheduled and Send Now

#### Scenario: Organization email template is saved
* **Given** I am an org admin for an organization
* **And** an email type exists
* **When** I save a template for that organization and email type with function code Send Now, a subject, a from email, and an email body
* **Then** loading that template shows that organization, email type, function code Send Now, subject, from email, and email body

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-39.1 | Email type form shows type code, description, and event code | `frontend/tests/` EmailTypeFormDialog | `Email type form shows type code, description, and event code` |
| US-39.1 | Email type is saved | `backend/tests/` email types | `Email type is saved` |
| US-39.1 | A non-admin cannot create an email type | `backend/tests/` email types | `A non-admin cannot create an email type` |
| US-39.2 | Existing template form has Email type and Function code dropdowns | `frontend/tests/` EmailTemplateFormDialog | `Existing template form has Email type and Function code dropdowns` |
| US-39.2 | Organization email template is saved | `backend/tests/` email templates | `Organization email template is saved` |

---

## Agent implementation request

```text
Implement Feature 39 from @features/feature-39-email-types-and-templates.md on branch `feature/39-email-types-and-templates`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`emailType`, template `emailTypeId` and `emailBody`), `features/reference/api.md` (email type routes and organization template fields), `features/reference/behavior.md` (who maintains email types and organization templates)

---

## Definition of Done

*   [x] `emailType` catalog and schema ensure (**FR-001**, **FR-009**)
*   [x] System Admin email type screen and API (**FR-002**, **FR-003**, **FR-008**)
*   [x] Existing template list and form: Email type dropdown and Function code dropdown of Scheduled and Send Now (**FR-004**–**FR-007**)
*   [x] Trip, attachment, copy-from, and sending stay unchanged (**FR-010**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/39-email-types-and-templates`; PR → `dev`

---

## Out of Scope

- Sending mail or choosing a template when an event happens
- A fixed list of event codes
- Removing trip, attachment, or copy-from from the existing template screen
- Any function code other than Scheduled and Send Now
- Trip Leader maintenance of these organization templates
- One template limit per organization and email type
