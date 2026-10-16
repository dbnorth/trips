# Feature: Send Now Event Emails

**Feature ID:** 45
**Branch pattern:** `feature/45-send-now-event-emails`
**Status:** Ready
**Created:** 2026-10-15
**Input:** **Send Now** email templates go out automatically when the event of their email type happens. The events are a participant starting, submitting, or being approved on an application, and a donation for a participant (including reaching the deposit or paying in full). One backend function sends the matching templates for an event, an organization's trip, and a participant, through the email service ([Feature 43](feature-43-email-delivery.md)). The application and donation endpoints call it right after the change is saved.
**Depends on:** [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md), [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md)

---

## User Stories

### US-45.1: Send the templates for an event

**As the** system
**I want** one function that sends every **Send Now** template for an event to a trip participant
**So that** each part of the app sends event emails the same way

**Priority:** P1
**Independent test:** With an organization **Send Now** template for email type event `application-approved`, calling the function for that event, trip, and participant sends one email to the participant.
**Acceptance scenarios:** see ### US-45.1

### US-45.2: Email participants when their application changes

**As a** participant
**I want** an email when I start an application, when it is submitted, and when it is approved
**So that** I know where my application stands without logging in

**Priority:** P1
**Independent test:** When staff change a participant's application from **applied** to **approved**, the participant receives the organization's **Application approved** email.
**Acceptance scenarios:** see ### US-45.2

### US-45.3: Email participants when donations come in

**As a** participant
**I want** an email when a donation is made for me, when I reach the deposit, and when my trip is fully paid
**So that** I can thank donors and track my fundraising

**Priority:** P1
**Independent test:** A public donation that brings a participant from $400 to $600 raised on a trip with a $500 deposit sends both the **Donation received** and **Deposit received** emails.
**Acceptance scenarios:** see ### US-45.3

### US-45.4: Keep working when email fails

**As a** participant or staff member
**I want** my application or donation saved even when an email cannot be sent
**So that** a mail problem never loses my work

**Priority:** P1
**Independent test:** With the mail server down, approving an application still saves and returns success, and the error is in the application log.
**Acceptance scenarios:** see ### US-45.4

### US-45.5: Tell which email went to whom

**As a** system administrator
**I want** each email log row to record the template, trip, and participant it was sent for
**So that** I can tell exactly which email was sent to which address

**Priority:** P2
**Independent test:** After an **Application approved** event email is sent, its email log row has that template's id, the trip's id, and the participant's person id.
**Acceptance scenarios:** see ### US-45.5

---

## Requirements

### Functional Requirements

- **FR-001**: The backend MUST provide one function that takes an event code, a trip, and a participant (person) and sends every matching **Send Now** template through the email service (Feature 43), one call per template, with that trip and participant.
- **FR-002**: Matching templates are **Send Now** templates whose email type has the event code. When the trip has its own **Send Now** template of that email type, only the trip's templates are used. Otherwise the organization's **Send Now** templates of that email type with no trip are used. **Scheduled** templates are never sent by events.
- **FR-003**: Events MUST fire only for **Trip Participant** applications on the trip. Other roles (for example **Trip Leader**) send nothing.
- **FR-004**: Application events MUST fire when an application is saved, based on its status before and after:

  | Event code | Fires when |
  |------------|-----------|
  | `application-started` | An application is created with status **incomplete** |
  | `application-submitted` | An application is created with status **applied**, or its status changes from **incomplete** to **applied** |
  | `application-approved` | An application is created with status **approved**, or its status changes to **approved** from any other status |

- **FR-005**: Application events MUST be checked after these saves:
  - Participant applies: `POST /trips/trips/browse/:id/apply`
  - Participant edits their application: `PUT /trips/trips/browse/:id/application`
  - Staff add an application: `POST /trips/trip-people-roles`
  - Staff update an application: `PUT /trips/trip-people-roles/:id`
- **FR-006**: Donation events MUST fire when a donation with a participant is created, for that participant and trip:

  | Event code | Fires when |
  |------------|-----------|
  | `donation-received` | Every new donation for the participant |
  | `deposit-received` | The trip deposit is above $0, and amount raised goes from below the deposit to at least the deposit |
  | `payment-complete` | Amount owed goes from above $0 to $0 |

  Amount raised and amount owed are worked out the same way as the Feature 40 tokens. Every event a donation causes MUST fire: one donation can send **Donation received**, **Deposit received**, and **Trip fully paid** together, each with its own templates.
- **FR-007**: Donation events MUST be checked after these saves:
  - Staff record a donation: `POST /trips/donations`
  - Public donation: `POST /trips/public/donations`
- **FR-008**: A donation with no participant, or whose participant has no **Trip Participant** application on the trip, MUST send nothing.
- **FR-009**: Event emails MUST be sent after the change is saved and before the response. A skipped or failed email, or any error while finding or sending templates, MUST NOT change the response or undo the change. Errors are written to the application log.
- **FR-010**: Each event email sent MUST appear in the email log (Feature 43 **FR-011**).
- **FR-011**: Backend tests MUST set the file-mode mail folder to a test folder (`backend/test-mail-test/`) so test runs never write into `backend/test-mail/`. `.gitignore` MUST ignore `backend/test-mail-test/`.
- **FR-012**: Every template email sent through the email service (event emails and Feature 44 scheduled emails) MUST store the template (`emailTemplateId`), trip (`tripId`), and participant (`personId`) on its email log row. Deleting the template, trip, or person MUST keep the email log row and clear only that column. Other email log rows (for example sign-in **Login** rows) leave these columns empty.

---

## Assumptions

- Event emails go to whoever the template's **To** lists, normally `{{PARTICIPANT_EMAIL}}`. Donors are not emailed by this feature.
- A participant who applies with a complete application at once gets **Application received** only, not **Application started**.
- Sending waits for the mail server before the response. With a mail server on the same machine this adds little time. A mail server that hangs delays the response until Nodemailer times out.
- Cancel and uncancel send no event emails.
- Editing or deleting a donation sends no event emails.
- Event codes `application-incomplete`, `deposit-due`, `payment-due`, and `pre-departure` are scheduled reminders (Feature 44) and never fire from events.

## Edge Cases

- No **Send Now** template for the event → nothing sent, no error.
- Trip has its own **Application approved** template → the organization's **Application approved** template is not sent for that trip.
- Staff save an application whose status stays **approved** → nothing sent.
- Staff change an application from **approved** back to **applied** → nothing sent.
- Staff add a **Trip Leader** assignment with status **approved** → nothing sent.
- Donation that takes a participant past the deposit and to $0 owed at once → **Donation received**, **Deposit received**, and **Trip fully paid** all send.
- Donation for a participant who already reached the deposit → **Deposit received** does not send again.
- Trip with no participant cost → **Trip fully paid** never sends.
- Public donation for the trip in general (no participant) → nothing sent.
- Mail server down → the save succeeds with its normal response; the error is in the application log and no email log row is added.
- Template, trip, or person deleted after an email was sent → the email log row stays, with that column empty.

## Success Criteria

- **SC-001**: Participants receive the organization's **Send Now** emails when their application is started, submitted, and approved.
- **SC-002**: Participants receive donation, deposit, and fully paid emails as donations come in.
- **SC-003**: No application or donation save fails because of email.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Templates come only from the trip itself or the trip's organization.
- Tokens fill from that trip, its organization, and the one participant (Feature 43).

---

## Key Entities

- **EmailTemplate**, **EmailType** — read only
- **TripPeopleRole** — application status before and after a save
- **TripDonation** — amount raised before and after a donation
- **EmailLog** — one row per email sent (Feature 43), now with the template, trip, and participant

---

## API Requirements

No new endpoints. These existing endpoints send event emails after saving, with no change to their requests or responses:

| Method | Endpoint | Events |
|--------|----------|--------|
| `POST` | `/trips/trips/browse/:id/apply` | `application-started`, `application-submitted` |
| `PUT` | `/trips/trips/browse/:id/application` | `application-submitted` |
| `POST` | `/trips/trip-people-roles` | `application-started`, `application-submitted`, `application-approved` |
| `PUT` | `/trips/trip-people-roles/:id` | `application-submitted`, `application-approved` |
| `POST` | `/trips/donations` | `donation-received`, `deposit-received`, `payment-complete` |
| `POST` | `/trips/public/donations` | `donation-received`, `deposit-received`, `payment-complete` |

---

## Screen Requirements

None.

---

## Data Model Requirements

`emailLog` gains three optional columns, filled on every template email sent (**FR-012**):

| Field | Type | Rules |
|-------|------|-------|
| emailTemplateId | INTEGER | optional; FK → emailTemplate (SET NULL) |
| tripId | INTEGER | optional; FK → trip (SET NULL) |
| personId | INTEGER | optional; FK → person (SET NULL) |

Existing databases get the columns at startup (`ensureSchema`); existing rows leave them empty.

---

## Acceptance Criteria (Gherkin)

### US-45.1 — Send the templates for an event

#### Scenario: Event email uses the trip template over the organization template
* **Given** an organization Send Now template and a trip Send Now template for event application-approved
* **When** the application-approved event fires for a participant on that trip
* **Then** only the trip template is sent

#### Scenario: Event with no Send Now template sends nothing
* **Given** no Send Now template for event application-approved
* **When** the application-approved event fires for a participant
* **Then** no email is sent

#### Scenario: Scheduled templates are not sent by events
* **Given** a Scheduled template whose email type event is application-approved
* **When** the application-approved event fires for a participant
* **Then** no email is sent

### US-45.2 — Email participants when their application changes

#### Scenario: Adding an incomplete application sends Application started
* **Given** an organization Send Now template for event application-started
* **When** staff add a Trip Participant application with status incomplete
* **Then** the participant is sent the Application started email

#### Scenario: Application moving to applied sends Application received
* **Given** an organization Send Now template for event application-submitted
* **And** a participant's application is incomplete
* **When** its status changes to applied
* **Then** the participant is sent the Application received email

#### Scenario: Approving an application sends Application approved
* **Given** an organization Send Now template for event application-approved
* **And** a participant's application is applied
* **When** staff change its status to approved
* **Then** the participant is sent the Application approved email

#### Scenario: Saving an approved application again sends nothing
* **Given** an organization Send Now template for event application-approved
* **And** a participant's application is approved
* **When** staff save it with status approved
* **Then** no email is sent

#### Scenario: Trip Leader assignments send no application emails
* **Given** an organization Send Now template for event application-approved
* **When** staff add a Trip Leader assignment with status approved
* **Then** no email is sent

### US-45.3 — Email participants when donations come in

#### Scenario: Donation for a participant sends Donation received
* **Given** an organization Send Now template for event donation-received
* **When** a public donation is made for a participant
* **Then** the participant is sent the Donation received email

#### Scenario: Donation reaching the deposit sends Deposit received
* **Given** an organization Send Now template for event deposit-received
* **And** a trip with a 500 deposit and a participant who has raised 400
* **When** staff record a 200 donation for that participant
* **Then** the participant is sent the Deposit received email
* **When** staff record another 100 donation for that participant
* **Then** no further Deposit received email is sent

#### Scenario: Donation paying in full sends Trip fully paid
* **Given** an organization Send Now template for event payment-complete
* **And** a trip costing 2000 and a participant who has raised 1500
* **When** staff record a 500 donation for that participant
* **Then** the participant is sent the Trip fully paid email

#### Scenario: One donation sends every event it causes
* **Given** organization Send Now templates for events donation-received, deposit-received, and payment-complete
* **And** a trip costing 2000 with a 500 deposit and a participant who has raised 0
* **When** staff record a 2000 donation for that participant
* **Then** the participant is sent the Donation received, Deposit received, and Trip fully paid emails

#### Scenario: Donation without a participant sends nothing
* **Given** an organization Send Now template for event donation-received
* **When** a public donation is made for the trip with no participant
* **Then** no email is sent

### US-45.4 — Keep working when email fails

#### Scenario: A failed event email does not block the save
* **Given** an organization Send Now template for event application-approved
* **And** the mail server rejects every email
* **When** staff change a participant's application to approved
* **Then** the request succeeds
* **And** the application is approved
* **And** the email log has no new row

### US-45.5 — Tell which email went to whom

#### Scenario: Event email log row records the template, trip, and participant
* **Given** an organization Send Now template for event application-approved
* **When** the application-approved event fires for a participant on a trip
* **Then** the email log row has the template, the trip, and the participant

#### Scenario: Scheduled email log row records the template, trip, and participant
* **Given** a Scheduled daily template for event pre-departure and an approved participant on an active trip
* **When** the scheduled email job runs
* **Then** the email log row has the template, the trip, and the participant

#### Scenario: Deleting a template keeps its email log rows
* **Given** an email was sent from a template
* **When** the template is deleted
* **Then** the email log row remains with its To address and subject
* **And** its template is empty

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-45.1 | Event email uses the trip template over the organization template | `backend/tests/` event emails | `Event email uses the trip template over the organization template` |
| US-45.1 | Event with no Send Now template sends nothing | `backend/tests/` event emails | `Event with no Send Now template sends nothing` |
| US-45.1 | Scheduled templates are not sent by events | `backend/tests/` event emails | `Scheduled templates are not sent by events` |
| US-45.2 | Adding an incomplete application sends Application started | `backend/tests/` event emails | `Adding an incomplete application sends Application started` |
| US-45.2 | Application moving to applied sends Application received | `backend/tests/` event emails | `Application moving to applied sends Application received` |
| US-45.2 | Approving an application sends Application approved | `backend/tests/` event emails | `Approving an application sends Application approved` |
| US-45.2 | Saving an approved application again sends nothing | `backend/tests/` event emails | `Saving an approved application again sends nothing` |
| US-45.2 | Trip Leader assignments send no application emails | `backend/tests/` event emails | `Trip Leader assignments send no application emails` |
| US-45.3 | Donation for a participant sends Donation received | `backend/tests/` event emails | `Donation for a participant sends Donation received` |
| US-45.3 | Donation reaching the deposit sends Deposit received | `backend/tests/` event emails | `Donation reaching the deposit sends Deposit received` |
| US-45.3 | Donation paying in full sends Trip fully paid | `backend/tests/` event emails | `Donation paying in full sends Trip fully paid` |
| US-45.3 | One donation sends every event it causes | `backend/tests/` event emails | `One donation sends every event it causes` |
| US-45.3 | Donation without a participant sends nothing | `backend/tests/` event emails | `Donation without a participant sends nothing` |
| US-45.4 | A failed event email does not block the save | `backend/tests/` event emails | `A failed event email does not block the save` |
| US-45.5 | Event email log row records the template, trip, and participant | `backend/tests/` event emails | `Event email log row records the template, trip, and participant` |
| US-45.5 | Scheduled email log row records the template, trip, and participant | `backend/tests/` event emails | `Scheduled email log row records the template, trip, and participant` |
| US-45.5 | Deleting a template keeps its email log rows | `backend/tests/` event emails | `Deleting a template keeps its email log rows` |

---

## Agent implementation request

```text
Implement Feature 45 from @features/feature-45-send-now-event-emails.md on branch `feature/45-send-now-event-emails`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (event emails sent by the application and donation endpoints), `features/reference/behavior.md` (event codes, when each fires, template choice, failures never block saves), `features/reference/data-model.md` (`emailLog` template, trip, and participant columns)

---

## Definition of Done

*   [x] One function sends the **Send Now** templates for an event, trip, and participant (**FR-001**, **FR-002**, **FR-003**)
*   [x] Application events on the four application endpoints (**FR-004**, **FR-005**)
*   [x] Donation events on the two donation endpoints (**FR-006**, **FR-007**, **FR-008**)
*   [x] Email failures never change the response (**FR-009**); sends logged (**FR-010**)
*   [x] Tests write mail to `backend/test-mail-test/` (**FR-011**)
*   [x] Email log rows record template, trip, and participant (**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/45-send-now-event-emails`; PR → `dev`

---

## Out of Scope

- Emailing donors
- Event emails on cancel, uncancel, decline, or donation edit and delete
- A **Send now** button for staff to send a template by hand
- Queuing or retrying failed event emails
- Scheduled reminders (Feature 44)
