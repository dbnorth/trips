# Feature: Email Template To Address

**Feature ID:** 41
**Branch pattern:** `feature/41-email-template-to-address`
**Status:** Ready
**Created:** 2026-10-15
**Input:** Organization email templates gain a **To** field. It lists one or more recipients separated by commas. Each recipient is an email address or an email token such as `{{PARTICIPANT_EMAIL}}`. The template form inserts email tokens into **To**, and Preview shows **To** with tokens replaced. **From email** also accepts one email address or one email token such as `{{ORG_EMAIL}}`, and Preview replaces it.
**Depends on:** [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md), [Feature 40 — Email Template Tokens and Preview](feature-40-email-template-tokens.md)

---

## User Stories

### US-41.1: Set who a template is sent to

**As an** Org Admin
**I want** to enter the recipients of a template as email addresses or email tokens
**So that** each template says who receives it, such as the participant or the primary trip leader

**Priority:** P1
**Independent test:** Org Admin saves a template with **To** `{{PARTICIPANT_EMAIL}}, office@example.org` and sees the same value when the template reloads.
**Acceptance scenarios:** see ### US-41.1

### US-41.2: Insert an email token into To

**As an** Org Admin
**I want** to pick an email token from a list beside **To**
**So that** I add recipients without typing token codes from memory

**Priority:** P2
**Independent test:** On the template form, choosing a token from the **To** token list places `{{TOKEN_CODE}}` in **To**. The list shows only tokens whose value is an email address.
**Acceptance scenarios:** see ### US-41.2

### US-41.3: Preview the recipients

**As an** Org Admin
**I want** Preview to show **To** with tokens replaced
**So that** I can check who would receive the email for a trip and participant

**Priority:** P1
**Independent test:** Preview for a trip and participant shows the participant email where `{{PARTICIPANT_EMAIL}}` was written in **To**.
**Acceptance scenarios:** see ### US-41.3

### US-41.4: Send from an email token

**As an** Org Admin
**I want** **From email** to be an email token such as `{{ORG_EMAIL}}`
**So that** templates send from the organization's current email without retyping it

**Priority:** P2
**Independent test:** Org Admin saves **From email** `{{ORG_EMAIL}}`, and Preview shows the organization's email as **From email**.
**Acceptance scenarios:** see ### US-41.4

---

## Requirements

### Functional Requirements

- **FR-001**: `emailTemplate` MUST store `toAddress` (text, up to 1000 characters). It is optional in the table so existing templates still load.
- **FR-002**: The template form (`EmailTemplateFormDialog`) MUST show a **To** field directly after **From email**. Saving from the template form MUST require **To** (`400` "To is required.").
- **FR-003**: **To** holds one or more recipients separated by commas. Spaces around each recipient are ignored. Each recipient MUST be either an email address or a token written as `{{TOKEN_CODE}}` whose catalog value source is an email (**Organization email**, **Participant email**, or **Primary trip leader email**). Any other recipient MUST be rejected with `400` "To must list email addresses or email tokens, separated by commas."
- **FR-004**: The template form MUST show an **Insert token** dropdown beside **To**. It lists only catalog tokens whose value source is an email, as `{{TOKEN_CODE}} — description`. Choosing one inserts `{{TOKEN_CODE}}` into **To** at the cursor, or at the end when the field has no cursor position, then clears the dropdown (same behavior as Feature 40 **FR-005**).
- **FR-005**: Template list and get MUST return `toAddress`. Template create and update MUST accept it.
- **FR-006**: **Copy from** on the template form MUST copy **To** along with the other copied fields.
- **FR-007**: The Preview dialog MUST show **To** directly after **From email**, with tokens replaced by the same server function as Feature 40 **FR-010**. A recipient whose token has no value MUST be left out of the shown list. Recipients are shown separated by a comma and a space.
- **FR-008**: `POST /trips/email-templates/preview` MUST accept `toAddress` and return it with tokens replaced, following **FR-007**.
- **FR-009**: `ensureSchema` MUST add `emailTemplate.toAddress` when missing.
- **FR-010**: This feature MUST NOT send email. **To** and **From email** are stored and previewed only.
- **FR-011**: **From email** MUST hold exactly one sender: an email address or an email token (same email tokens as **FR-003**). Saving from the template form with anything else MUST be rejected with `400` "From email must be an email address or an email token."
- **FR-012**: The template form MUST show an **Insert token** dropdown beside **From email** listing the same email tokens as **FR-004**. Choosing one MUST set **From email** to that `{{TOKEN_CODE}}`, replacing what was there, then clear the dropdown.
- **FR-013**: Preview MUST show **From email** with its token replaced. `POST /trips/email-templates/preview` MUST accept `fromEmail` and return it with tokens replaced.

---

## Assumptions

- **To** applies to organization templates saved through the template form (Feature 39). Feature 10 global master templates do not gain **To**.
- An email address is text with no spaces, one `@`, and a domain containing a dot (for example `office@example.org`). This feature does not check that the mailbox exists.
- Token codes in **To** follow Feature 40: exact, case-sensitive matches against the catalog.
- Existing templates without **To** keep working. Editing one requires **To** before it saves.
- A participant token in **To** has no value until a participant is chosen in Preview, so it is left out of the shown list until then.
- This feature brings email tokens into **From email**, which Feature 40 left out of scope. Tokens in **Attachment path** stay out of scope.
- A **From email** token with no value (for example `{{ORG_EMAIL}}` when the organization has no email) shows empty in Preview.

## Edge Cases

- Blank **To** on template form save → `400`.
- **To** with an empty entry between commas, such as `a@example.org,,b@example.org` → `400`.
- **To** with text that is neither an email address nor a token, such as `participant` → `400`.
- **To** with a token whose value source is not an email, such as `{{TRIP_NAME}}` → `400`.
- **To** with a token that is not in the catalog → `400`.
- Preview with no participant chosen and **To** `{{PARTICIPANT_EMAIL}}` → **To** shows empty.
- Preview for a trip with no primary leader and **To** `{{LEADER_EMAIL}}, office@example.org` → **To** shows `office@example.org`.
- A token deleted from the catalog after the template was saved stays as written in Preview.
- **From email** with two senders, such as `a@example.org, b@example.org` → `400`.
- **From email** with a token whose value source is not an email, such as `{{TRIP_NAME}}` → `400`.

## Success Criteria

- **SC-001**: Org Admin can save **To** with email addresses and email tokens and see it again.
- **SC-002**: Org Admin can insert an email token into **To** from the list.
- **SC-003**: Preview shows **To** with tokens replaced by real email addresses.
- **SC-004**: Org Admin can use an email token as **From email** and see it replaced in Preview.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- **To** is part of the organization's template and follows the existing template permissions (Feature 39).
- Preview reads only the organization, trip, and participant the caller may already preview (Feature 40).

---

## Key Entities

- **EmailTemplate** — gains `toAddress`

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/email-templates` | as today | Returns `toAddress` |
| `GET` | `/trips/email-templates/:id` | as today | Returns `toAddress` |
| `POST` | `/trips/email-templates` | as today | Accepts `toAddress`; required on template form saves |
| `PUT` | `/trips/email-templates/:id` | as today | Accepts `toAddress`; required on template form saves |
| `GET` | `/trips/email-templates/copy-sources` | as today | Returns `toAddress` |
| `POST` | `/trips/email-templates/preview` | as today | Accepts `fromEmail` and `toAddress`; returns `{ fromEmail, toAddress, subject, emailBody }` |

**Payload notes:** `toAddress` is stored as entered after trimming the whole value. Preview body is `{ orgId, tripId, personId?, fromEmail, toAddress, subject, emailBody }`.

**Status codes:** `400` when **To** is blank or lists a recipient that is not an email address or an email token, or when **From email** is not exactly one email address or email token.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `EmailTemplateFormDialog` | **Insert token** beside **From email**; **To** after **From email**, with an **Insert token** dropdown. Both list email tokens only |
| Preview dialog | **From email** and **To**, with tokens replaced |

---

## Data Model Requirements

### `emailTemplate` column added by this feature

| Column | Type | Rules |
|--------|------|--------|
| toAddress | STRING(1000) | optional in the table; required on template form saves. Comma-separated email addresses and email tokens |

---

## Acceptance Criteria (Gherkin)

### US-41.1 — Set who a template is sent to

#### Scenario: Template form shows To after From email
* **Given** I am an org admin adding a template
* **Then** I see To directly after From email

#### Scenario: To is saved
* **Given** I am an org admin
* **And** token PARTICIPANT_EMAIL exists with value source participant.email
* **When** I save a template with To "{{PARTICIPANT_EMAIL}}, office@example.org"
* **Then** loading that template shows To "{{PARTICIPANT_EMAIL}}, office@example.org"

#### Scenario: To is required
* **Given** I am an org admin
* **When** I save a template with a blank To
* **Then** the request is rejected

#### Scenario: To rejects a recipient that is not an email or email token
* **Given** I am an org admin
* **And** token TRIP_NAME exists with value source trip.name
* **When** I save a template with To "{{TRIP_NAME}}"
* **Then** the request is rejected

### US-41.2 — Insert an email token into To

#### Scenario: To token list shows only email tokens
* **Given** I am an org admin editing a template
* **And** tokens PARTICIPANT_EMAIL and TRIP_NAME exist
* **When** I open the To token list
* **Then** I see PARTICIPANT_EMAIL
* **And** I do not see TRIP_NAME

### US-41.3 — Preview the recipients

#### Scenario: Preview replaces tokens in To
* **Given** token PARTICIPANT_EMAIL exists with value source participant.email
* **And** a trip has a participant with an email address
* **When** I preview To "{{PARTICIPANT_EMAIL}}, office@example.org" for that trip and participant
* **Then** To shows the participant email followed by office@example.org

### US-41.4 — Send from an email token

#### Scenario: From email accepts an email token
* **Given** I am an org admin
* **And** token ORG_EMAIL exists with value source organization.email
* **When** I save a template with From email "{{ORG_EMAIL}}"
* **Then** loading that template shows From email "{{ORG_EMAIL}}"

#### Scenario: From email rejects two senders
* **Given** I am an org admin
* **When** I save a template with From email "a@example.org, b@example.org"
* **Then** the request is rejected

#### Scenario: Preview replaces the token in From email
* **Given** token ORG_EMAIL exists with value source organization.email
* **And** the organization email is office@example.org
* **When** I preview From email "{{ORG_EMAIL}}" for one of its trips
* **Then** From email shows office@example.org

#### Scenario: Template form sets From email from the token list
* **Given** I am an org admin editing a template
* **And** token ORG_EMAIL exists with value source organization.email
* **When** I choose ORG_EMAIL from the From email token list
* **Then** From email is {{ORG_EMAIL}}

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-41.1 | Template form shows To after From email | `frontend/tests/` EmailTemplateFormDialog | `Template form shows To after From email` |
| US-41.1 | To is saved | `backend/tests/` email templates | `To is saved` |
| US-41.1 | To is required | `backend/tests/` email templates | `To is required` |
| US-41.1 | To rejects a recipient that is not an email or email token | `backend/tests/` email templates | `To rejects a recipient that is not an email or email token` |
| US-41.2 | To token list shows only email tokens | `frontend/tests/` EmailTemplateFormDialog | `To token list shows only email tokens` |
| US-41.3 | Preview replaces tokens in To | `backend/tests/` email templates | `Preview replaces tokens in To` |
| US-41.4 | From email accepts an email token | `backend/tests/` email templates | `From email accepts an email token` |
| US-41.4 | From email rejects two senders | `backend/tests/` email templates | `From email rejects two senders` |
| US-41.4 | Preview replaces the token in From email | `backend/tests/` email templates | `Preview replaces the token in From email` |
| US-41.4 | Template form sets From email from the token list | `frontend/tests/` EmailTemplateFormDialog | `Template form sets From email from the token list` |

---

## Agent implementation request

```text
Implement Feature 41 from @features/feature-41-email-template-to-address.md on branch `feature/41-email-template-to-address`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`emailTemplate.toAddress`), `features/reference/api.md` (template `toAddress` and `fromEmail` rules, preview `fromEmail` and `toAddress`), `features/reference/behavior.md` (To recipients, email tokens in To and From email, preview)

---

## Definition of Done

*   [x] `emailTemplate.toAddress` and schema ensure (**FR-001**, **FR-009**)
*   [x] **To** on the template form, required and validated (**FR-002**, **FR-003**, **FR-005**)
*   [x] **Insert token** beside **To** listing email tokens (**FR-004**)
*   [x] Copy from copies **To** (**FR-006**)
*   [x] Preview shows **To** with tokens replaced (**FR-007**, **FR-008**)
*   [x] No email sent (**FR-010**)
*   [x] **From email** accepts one email address or email token, with an **Insert token** list and Preview replacement (**FR-011**, **FR-012**, **FR-013**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/41-email-template-to-address`; PR → `dev`

---

## Out of Scope

- Sending or scheduling email
- **CC** or **BCC** fields
- Picking recipients from a list of people
- **To** on Feature 10 global master templates
- Tokens in **Attachment path**
- Sending to every participant on a trip from one template entry
