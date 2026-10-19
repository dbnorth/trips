# Feature: Email People

**Feature ID:** 62
**Branch pattern:** `feature/62-people-email`
**Status:** Implemented
**Created:** 2026-10-18
**Input:** Add an Email button to the People page. It displays a send email dialog that allows selection of an email template, and selection of people by the trips they are approved on (multi-select with All) and their role on the trip they are approved on (multi-select with All).
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md), [Feature 40 — Email Template Tokens and Preview](feature-40-email-template-tokens.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md), [Feature 46 — Email Trip Team](feature-46-email-trip-team.md), [Feature 49 — Organization Email Test Mode](feature-49-organization-email-test-mode.md)

---

## User Stories

### US-62.1: Write Person email templates
**As an** Org Admin
**I want** an email template function code **Person** that is not tied to a trip
**So that** I can write messages for people across trips

**Priority:** P1
**Independent test:** An Org Admin saves an organization template with function code **Person**; it is stored with no schedule and no trip.
**Acceptance scenarios:** see ### US-62.1

### US-62.2: Choose people by trip and role
**As an** Org Admin
**I want** the People page **Email** dialog to pick recipients by the trips they are approved on and their role on those trips
**So that** I can reach, for example, every approved nurse on this year's trips

**Priority:** P1
**Independent test:** With trips "Guatemala Clinic" and "Honduras Build", choosing Trips "Guatemala Clinic" and Roles "Nurse" lists only the approved Trip Participants on Guatemala Clinic whose trip role is Nurse; choosing **All** trips and **All** roles lists every approved Trip Participant on the organization's trips, each person once.
**Acceptance scenarios:** see ### US-62.2

### US-62.3: Preview and send the email
**As an** Org Admin
**I want** to edit the subject and body for this send, preview it for a recipient, confirm, and see the results
**So that** I know what was sent and to whom

**Priority:** P1
**Independent test:** Choosing a Person template, Trips **All**, Roles **All**, then **Send** → "Are you sure?" "Send this email to 3 people?" → confirming sends 3 emails and shows "Sent 3, skipped 0, failed 0".
**Acceptance scenarios:** see ### US-62.3

### US-62.4: Use trip templates for a single trip
**As an** Org Admin
**I want** the trip's **Trip Participant** templates offered when I select a single trip
**So that** I can send trip messages (e.g. the financial statement) to just the nurses on that trip

**Priority:** P2
**Independent test:** With Trips "Guatemala Clinic" only, **Template** also lists the Trip Participant templates of Guatemala Clinic and of the organization; previewing one as Ana fills `{{TRIP_NAME}}` with "Guatemala Clinic". Selecting a second trip removes them.
**Acceptance scenarios:** see ### US-62.4

---

## Requirements

### Functional Requirements

**Person templates (Feature 39)**

- **FR-001**: **Function code** MUST add **Person** (after **Trip Participant**) in the template form and the template API. A **Person** template is saved with no schedule (like **Send Now**) and is sent only from the People page **Email** dialog.
- **FR-002**: **Person** MUST be allowed only on organization templates (no trip). Saving a trip template with **Person** → `400` "Person templates cannot belong to a trip."; the template form does not offer **Person** for a trip template.
- **FR-003**: When a **Person** template is sent, its tokens MUST be filled from the template's organization and the recipient person only. Trip, participant trip (trip role, costs, donations, amounts), and primary trip leader tokens come out empty. No trip is used.

**Email button and access**

- **FR-004**: The People page (`/people`) MUST show **Email** beside **Add person**. It is enabled under the same rule as **Add person** (an organization is selected, i.e. the acting organization); a System Admin viewing all organizations sees it disabled.
- **FR-005**: Only a System Admin or an Org Admin of the acting organization MAY use the People email API; anyone else → `403` "Forbidden.". With no acting organization → `400` "Select an organization in the menu bar.".

**Dialog — template and message**

- **FR-006**: **Email** MUST open the **Email people** dialog. **Template** lists the acting organization's **Person** templates ordered by subject. Choosing one fills **Subject** and **Email body**, which are editable for this send only (the template is not changed).

**Single trip — trip templates (Feature 46)**

- **FR-016**: When the selected trips come to exactly one trip (one trip chosen, or **All** in an organization with one trip), **Template** MUST also list that trip's **Trip Participant** templates — the trip's own and its organization's with no trip, as Email team lists them — after the Person templates, each labelled "Trip Participant — <subject>". With more than one trip, they are not listed.
- **FR-017**: When **Trips** changes from one trip to more than one (or to a different trip) while a Trip Participant template is chosen, the template, **Subject**, and **Email body** MUST be cleared.
- **FR-018**: A Trip Participant template MUST be filled and sent as Email team does for that trip: tokens from the organization, the trip, the recipient's assignment on the trip (trip role, costs, donations, amounts), and the primary trip leader; sender name and test mode from the trip's organization; each email logged with the trip. The server rejects a Trip Participant template unless the selected trips are exactly one trip and the template belongs to that trip or its organization (no trip) → `400` "Trip Participant templates need exactly one trip selected.".

**Dialog — recipients**

- **FR-007**: **Trips** MUST be a multi-select of every trip in the acting organization (any status, past included), newest start date first, with **All** as the first choice. Choosing **All** selects every trip; choosing a single trip after **All** replaces **All** with that trip. It starts as **All**.
- **FR-008**: **Roles** MUST be a multi-select, with **All** first, of the worker roles (Feature 6) on the selected trips, each name once, ordered by name. When **Trips** changes, roles no longer on any selected trip are removed from the selection. **All** works as in **FR-007** and starts selected.
- **FR-009**: Recipients MUST be people with an **approved** Trip Participant assignment on a selected trip whose trip worker role is a selected role. With **Roles** **All**, every approved Trip Participant on the selected trips is included, with or without a worker role. Trip Leaders are not included unless they have such an assignment.
- **FR-010**: Each person MUST be a recipient once, however many selected trips or roles they match. The dialog shows the recipient count ("N people") and updates it when **Trips** or **Roles** changes.

**Dialog — preview, send, results (as Feature 46)**

- **FR-011**: **Preview** MUST show From, Reply-To, To, Subject, and body for the **Preview as** recipient (the recipients by last then first name; defaults to the first), with tokens filled per **FR-003** (Person) or **FR-018** (Trip Participant). Preview sends nothing.
- **FR-012**: **Send** MUST ask "Are you sure?" with "Send this email to N people?". Confirming sends one email per recipient to that person's own email (the template **To** is not used) through the email service (Feature 43), logged per email (with no trip for a Person template).
- **FR-013**: For a Person template, the sender name and organization test mode (Feature 49) MUST use the template's organization, since no trip is sent.
- **FR-014**: One skip or failure MUST NOT stop the rest. The dialog shows sent, skipped, and failed counts and each skipped or failed person with the reason.
- **FR-015**: **Send** and **Preview** are disabled until a template is chosen, **Subject** and **Email body** are not blank, and there is at least one recipient. The server rejects the same cases with `400`: "Choose a template for this organization.", "Subject is required.", "Email body is required.", "No people to send to.".

---

## Assumptions

- "Role on trip" means the trip worker role (e.g. Nurse, Doctor), the same value as the **Participant trip role** token, not Trip Participant / Trip Leader.
- "Approved on" means a Trip Participant assignment with status **approved** (Feature 46's "accepted participants").
- A person approved on several selected trips gets one email; Person templates carry no trip data, so which trip matched does not matter. Trip Participant templates are only offered for a single trip, so their trip is never ambiguous.
- "Trip templates" means the **Trip Participant** templates Email team offers for that trip (the trip's own and its organization's).
- The template form's existing **Preview** (Feature 40) is unchanged; it still offers a trip and participant.
- The People page's name and trip filters do not affect recipients; recipients come only from the dialog's **Trips** and **Roles**.

---

## Edge Cases

- Organization with no **Person** templates → **Template** is empty with "No Person templates. Add one under Email templates."; **Send** stays disabled.
- Selected trips have no worker roles → **Roles** lists only **All**.
- Selections match nobody → "0 people"; **Preview** and **Send** disabled.
- Recipient with no email → skipped "No recipients." (Feature 43).
- Organization in test mode → every email goes to the organization email (Feature 49).
- A trip template with function code **Person** sent through the API → `400` (**FR-002**).
- Organization with one trip and Trips **All** → that trip's Trip Participant templates are listed (**FR-016**).
- Trip Participant template sent with Trips **All** over several trips, or with another trip's template → `400` (**FR-018**).
- A trip or worker role id from another organization in the request → `400` "Trips must belong to this organization." / "Roles must be on the selected trips.".

---

## Success Criteria

- **SC-001**: An Org Admin can email every approved participant with a given role across chosen trips in one send.
- **SC-002**: No one outside the acting organization's approved participants receives the email, and no one receives it twice.

---

## Data Ownership & Isolation

- Templates, trips, roles, and recipients are limited to the acting organization; ids from another organization → `400`.
- Only System Admin and Org Admin of the acting organization may list, preview, or send (**FR-005**).
- The dialog shows recipients' names only (in **Preview as** and results), never other people's details.

---

## Key Entities

| Entity | Use |
|--------|-----|
| `emailTemplate` | `functionCode` **Person**, organization only; **Trip Participant** for a single trip |
| `trip` | Acting organization's trips |
| `tripWorkerRole`, `workerRole` | Roles on the selected trips |
| `tripPeopleRole` | Approved Trip Participant assignments and their `tripWorkerRoleId` |
| `person` | Recipient name and email |
| `emailLog` | One row per email; `tripId` null for Person templates, the trip for Trip Participant templates |

---

## API Requirements

All under the acting organization (organization scope header, or the Org Admin's only organization); access per **FR-005**.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/people-email/options` | System Admin, Org Admin of the acting org | `{ templates: [{ id, subject, emailBody, fromEmail, emailTypeId }], trips: [{ id, name, startDate, roles: [{ workerRoleId, name }] }] }` (**FR-006**–**FR-008**) |
| `GET` | `/trips/trips/:id/team-email/templates` | existing (Feature 46) | Reused when one trip is selected: that trip's **Trip Participant** templates (**FR-016**) |
| `POST` | `/trips/people-email/recipients` | same | Body `{ tripIds, workerRoleIds }` → `[{ personId, name }]` ordered by last then first name (**FR-009**, **FR-010**) |
| `POST` | `/trips/people-email/preview` | same | Body `{ emailTemplateId, subject, emailBody, tripIds, workerRoleIds, personId }` → `{ from, replyTo, to, subject, body }`; `personId` must be a recipient, else `400` "Preview person must be one of the recipients." (**FR-011**) |
| `POST` | `/trips/people-email` | same | Body `{ emailTemplateId, subject, emailBody, tripIds, workerRoleIds }` → `{ sent, skipped, failed, results: [{ personId, name, status, reason }] }` (**FR-012**–**FR-015**, **FR-018**) |
| `POST` / `PUT` | `/trips/email-templates`, `/trips/email-templates/:id` | existing | Accept function code **Person** on organization templates (**FR-001**, **FR-002**) |

`tripIds` and `workerRoleIds` are each `"all"` or an array of ids. An empty array, or ids outside the acting organization / selected trips → `400` (Edge Cases). `emailTemplateId` may be a Person template of the acting organization, or a Trip Participant template when `tripIds` comes to exactly one trip (**FR-018**).

**Send example**

```json
{
  "emailTemplateId": 12,
  "subject": "Nurse orientation",
  "emailBody": "Hi {{PARTICIPANT_FIRST_NAME}}, ...",
  "tripIds": [5, 8],
  "workerRoleIds": [3]
}
```

---

## Screen Requirements

| UI | Change |
|----|--------|
| `PeopleList` | **Email** button beside **Add person** (**FR-004**) |
| `PeopleEmailDialog` (new) | **Template**, **Subject**, **Email body**, **Trips** (multi-select with **All**), **Roles** (multi-select with **All**), recipient count, **Preview as** + **Preview**, **Send** with "Are you sure?", results (**FR-006**–**FR-015**); Trip Participant templates added for a single trip (**FR-016**, **FR-017**) |
| `EmailTemplateFormDialog` | **Function code** adds **Person** for organization templates only (**FR-001**, **FR-002**) |

---

## Data Model Requirements

None — `emailTemplate.functionCode` stores **Person**; `emailLog.tripId` is already nullable.

---

## Acceptance Criteria (Gherkin)

### US-62.1 — Write Person email templates

#### Scenario: Org Admin saves a Person template
* **Given** I am an Org Admin of "Hope Missions"
* **When** I save an organization template with function code "Person"
* **Then** it is saved with function code "Person", no schedule, and no trip

#### Scenario: Person template cannot belong to a trip
* **Given** I am an Org Admin of the trip's organization
* **When** I save a trip template with function code "Person"
* **Then** the response is `400` "Person templates cannot belong to a trip."

### US-62.2 — Choose people by trip and role

#### Scenario: Options list the organization's Person templates, trips, and roles
* **Given** "Hope Missions" has a Person template, a Trip Participant template, and trips "Guatemala Clinic" (starts 2027-03-01, roles Nurse and Doctor) and "Honduras Build" (starts 2026-06-01, role Builder), and another organization has a trip
* **When** I, an Org Admin acting in "Hope Missions", get the people email options
* **Then** templates lists only the Person template
* **And** trips lists "Guatemala Clinic" then "Honduras Build", with their roles

#### Scenario: Recipients by selected trips and roles
* **Given** on "Guatemala Clinic" Ana (Nurse) and Ben (Doctor) are approved, and Cara (Nurse) has applied; on "Honduras Build" Dan (Builder) is approved
* **When** I request recipients for trips ["Guatemala Clinic"] and roles ["Nurse"]
* **Then** the recipients are only Ana

#### Scenario: All trips and all roles list each approved participant once
* **Given** Ana is approved on both "Guatemala Clinic" and "Honduras Build", Ben is approved on "Guatemala Clinic" with no worker role, and Eve is a Trip Leader on "Honduras Build"
* **When** I request recipients for trips "all" and roles "all"
* **Then** the recipients are Ana and Ben, each once

#### Scenario: Trip Leader cannot use people email
* **Given** I am a Trip Leader but not an Org Admin
* **When** I get the people email options
* **Then** the response is `403` "Forbidden."

#### Scenario: People page Email dialog filters roles by selected trips
* **Given** I am on the People page acting in "Hope Missions"
* **When** I click **Email** and choose Trips "Honduras Build"
* **Then** **Roles** offers **All** and "Builder" only
* **And** the dialog shows the recipient count for that selection

### US-62.3 — Preview and send the email

#### Scenario: Preview fills person tokens and leaves trip tokens empty
* **Given** a Person template with body "Hi {{PARTICIPANT_FIRST_NAME}} from {{ORG_NAME}}{{TRIP_NAME}}" and Ana is a recipient
* **When** I preview as Ana
* **Then** the body is "Hi Ana from Hope Missions"

#### Scenario: Send emails each recipient once and reports results
* **Given** recipients Ana and Ben, and Ben has no email
* **When** I send a Person template to trips "all" and roles "all"
* **Then** the response is `{ sent: 1, skipped: 1, failed: 0 }` with Ben skipped "No recipients."
* **And** one email log row exists for Ana with no trip

#### Scenario: Test mode sends to the organization email
* **Given** "Hope Missions" is in test mode with email "office@hope.org"
* **When** I send a Person template to Ana
* **Then** the email goes to "office@hope.org" with subject starting "[Test] "

#### Scenario: Send asks for confirmation and shows results
* **Given** the **Email people** dialog has a Person template and 3 recipients
* **When** I click **Send** and confirm "Send this email to 3 people?"
* **Then** the dialog shows "Sent 3, skipped 0, failed 0"

### US-62.4 — Use trip templates for a single trip

#### Scenario: Trip template for one trip fills trip tokens
* **Given** "Guatemala Clinic" has a Trip Participant template with body "{{TRIP_NAME}}: {{PARTICIPANT_TRIP_ROLE}}" and Ana is approved on it as Nurse
* **When** I preview that template as Ana with trips ["Guatemala Clinic"] and roles "all"
* **Then** the body is "Guatemala Clinic: Nurse"
* **And** sending it logs Ana's email with the trip "Guatemala Clinic"

#### Scenario: Trip template rejected with more than one trip
* **Given** "Hope Missions" has trips "Guatemala Clinic" and "Honduras Build" and a Trip Participant template
* **When** I send that template with trips "all"
* **Then** the response is `400` "Trip Participant templates need exactly one trip selected."

#### Scenario: Dialog offers trip templates only for a single trip
* **Given** the **Email people** dialog with a Person template "Newsletter", and "Guatemala Clinic" has a Trip Participant template "Packing list"
* **When** I choose Trips "Guatemala Clinic"
* **Then** **Template** lists "Newsletter" and "Trip Participant — Packing list"
* **And** after I choose "Packing list" and add Trips "Honduras Build", **Template** lists only "Newsletter" and the template, **Subject**, and **Email body** are cleared

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-62.1 | Org Admin saves a Person template | `backend/tests/people-email.test.js` | `Org Admin saves a Person template` |
| US-62.1 | Person template cannot belong to a trip | `backend/tests/people-email.test.js` | `Person template cannot belong to a trip` |
| US-62.2 | Options list the organization's Person templates, trips, and roles | `backend/tests/people-email.test.js` | `Options list the organization's Person templates, trips, and roles` |
| US-62.2 | Recipients by selected trips and roles | `backend/tests/people-email.test.js` | `Recipients by selected trips and roles` |
| US-62.2 | All trips and all roles list each approved participant once | `backend/tests/people-email.test.js` | `All trips and all roles list each approved participant once` |
| US-62.2 | Trip Leader cannot use people email | `backend/tests/people-email.test.js` | `Trip Leader cannot use people email` |
| US-62.2 | People page Email dialog filters roles by selected trips | `frontend/tests/PeopleEmailDialog.test.js` | `People page Email dialog filters roles by selected trips` |
| US-62.3 | Preview fills person tokens and leaves trip tokens empty | `backend/tests/people-email.test.js` | `Preview fills person tokens and leaves trip tokens empty` |
| US-62.3 | Send emails each recipient once and reports results | `backend/tests/people-email.test.js` | `Send emails each recipient once and reports results` |
| US-62.3 | Test mode sends to the organization email | `backend/tests/people-email.test.js` | `Test mode sends to the organization email` |
| US-62.3 | Send asks for confirmation and shows results | `frontend/tests/PeopleEmailDialog.test.js` | `Send asks for confirmation and shows results` |
| US-62.4 | Trip template for one trip fills trip tokens | `backend/tests/people-email.test.js` | `Trip template for one trip fills trip tokens` |
| US-62.4 | Trip template rejected with more than one trip | `backend/tests/people-email.test.js` | `Trip template rejected with more than one trip` |
| US-62.4 | Dialog offers trip templates only for a single trip | `frontend/tests/PeopleEmailDialog.test.js` | `Dialog offers trip templates only for a single trip` |

---

## Reference Updates

- `features/reference/api.md` — People email endpoints; template function code **Person**
- `features/reference/behavior.md` — People page **Email** row; Feature 39 row function codes add **Person**; Feature 43 / 49 rows note the template organization is used when no trip is sent

---

## Definition of Done

*   [x] Function code **Person** on organization templates (**FR-001**–**FR-003**)
*   [x] People page **Email** button and access rules (**FR-004**, **FR-005**)
*   [x] **Email people** dialog: template, Trips and Roles multi-selects with **All**, recipient count (**FR-006**–**FR-010**)
*   [x] Preview, confirmation, send, and results (**FR-011**–**FR-015**)
*   [x] Trip Participant templates for a single trip (**FR-016**–**FR-018**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/62-people-email`; PR → `dev`

---

## Out of Scope

- Choosing individual people in the dialog (recipients come from Trips and Roles only)
- Filtering by application status other than approved, or by Trip Leader role
- Scheduled or automatic Person emails
- Attachments or HTML email
- Changing the template form's **Preview** for Person templates
