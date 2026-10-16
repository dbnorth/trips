# Feature: Participant Trip Role Email Token

**Feature ID:** 48
**Branch pattern:** `feature/48-participant-trip-role-token`
**Status:** Ready
**Created:** 2026-10-16
**Input:** Add **PARTICIPANT_TRIP_ROLE** as an email token and make it fill in when an email template is previewed or sent.
**Depends on:** [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 40 — Email Template Tokens and Preview](feature-40-email-template-tokens.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md)

---

## User Stories

### US-48.1: Use the participant's trip role in an email
**As an** Org Admin or Trip Leader writing an email template
**I want** a `{{PARTICIPANT_TRIP_ROLE}}` token
**So that** emails can tell each participant the role they applied for, such as "Nurse"

**Priority:** P1
**Independent test:** Preview a template whose body contains `{{PARTICIPANT_TRIP_ROLE}}` for a participant who applied as Nurse; the body shows "Nurse".
**Acceptance scenarios:** see ### US-48.1

---

## Requirements

### Functional Requirements

- **FR-001**: The fixed value sources MUST include `participant.tripRole` with the label **Participant trip role**. It is not an email value source, so it cannot be used in **To** or **From email**.
- **FR-002**: The value of `participant.tripRole` MUST be the worker role name of the trip role on the participant's application for the trip (for example "Nurse"). When the person has more than one assignment on the trip, use the earliest one that has a trip role.
- **FR-003**: The value MUST be empty when there is no participant, or the participant has no assignment with a trip role on the trip (for example, a Trip Leader who did not apply for a role).
- **FR-004**: The email token seed MUST add the token **PARTICIPANT_TRIP_ROLE** with value source `participant.tripRole` and description **Participant trip role**. Running the seed again MUST NOT add it twice.
- **FR-005**: Because Preview, the email service, event emails, scheduled emails, and team emails all fill tokens with the same function (Features 40 and 43), `{{PARTICIPANT_TRIP_ROLE}}` MUST be filled in all of them with no other change.

---

## Assumptions

- The token appears in the template form's **Insert token** lists for **Subject** and **Email body** once it is in the catalog (Feature 40); no screen change is needed.
- Existing environments get the token by running `npm run seed` in `backend` after deploy. A System Admin can also add it on the Email tokens screen.

## Edge Cases

- Participant whose application has no trip role chosen yet → empty.
- Trip role whose worker role was renamed → the current worker role name.
- Template previewed with no participant → empty.

## Success Criteria

- **SC-001**: `{{PARTICIPANT_TRIP_ROLE}}` shows the participant's trip role name in Preview and in sent emails.
- **SC-002**: The token is in the seeded catalog.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Token values** | Same as Feature 40: values come from the trip and participant already chosen for the preview or send; no new data access |

---

## Key Entities

- **emailToken** — new seeded row `PARTICIPANT_TRIP_ROLE`
- **tripPeopleRole → tripWorkerRole → workerRole** — source of the role name

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/email-tokens/value-sources` | Includes `{ valueSource: "participant.tripRole", label: "Participant trip role" }` |
| `POST` | `/trips/email-templates/preview` | `{{PARTICIPANT_TRIP_ROLE}}` filled per **FR-002**–**FR-003** |

---

## Screen Requirements

No screen changes.

---

## Data Model Requirements

No schema changes. One new seeded `emailToken` row.

---

## Acceptance Criteria (Gherkin)

### US-48.1 — Use the participant's trip role in an email

#### Scenario: Participant trip role is a value source
* **Given** I am a System Admin
* **When** I load the email token value sources
* **Then** the list includes **Participant trip role** (`participant.tripRole`)

#### Scenario: Preview fills the participant's trip role
* **Given** a token **PARTICIPANT_TRIP_ROLE** with value source **Participant trip role**
* **And** a participant applied to the trip as Nurse
* **When** I preview a template whose body is "Role: {{PARTICIPANT_TRIP_ROLE}}" for that participant
* **Then** the body is "Role: Nurse"

#### Scenario: Participant trip role is empty without a participant
* **Given** a token **PARTICIPANT_TRIP_ROLE** with value source **Participant trip role**
* **When** I preview a template whose body is "Role: {{PARTICIPANT_TRIP_ROLE}}" with no participant
* **Then** the body is "Role: "

#### Scenario: Sent email fills the participant's trip role
* **Given** a token **PARTICIPANT_TRIP_ROLE** with value source **Participant trip role**
* **And** a participant applied to the trip as Nurse
* **When** a template whose subject is "You are our {{PARTICIPANT_TRIP_ROLE}}" is sent to that participant
* **Then** the email's subject is "You are our Nurse"

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-48.1 | Participant trip role is a value source | `backend/tests/email-tokens.test.js` | `Participant trip role is a value source` |
| US-48.1 | Preview fills the participant's trip role | `backend/tests/email-tokens.test.js` | `Preview fills the participant's trip role` |
| US-48.1 | Participant trip role is empty without a participant | `backend/tests/email-tokens.test.js` | `Participant trip role is empty without a participant` |
| US-48.1 | Sent email fills the participant's trip role | `backend/tests/email-tokens.test.js` | `Sent email fills the participant's trip role` |

---

## Agent implementation request

```text
Implement Feature 48 from @features/feature-48-participant-trip-role-token.md on branch `feature/48-participant-trip-role-token`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run backend tests before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (value sources list), `features/reference/behavior.md` (token value for the participant's trip role)

---

## Definition of Done

*   [x] `participant.tripRole` value source and value (**FR-001**–**FR-003**)
*   [x] **PARTICIPANT_TRIP_ROLE** in the email token seed (**FR-004**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] Backend tests green
*   [ ] On `feature/48-participant-trip-role-token`; PR → `dev`

---

## Out of Scope

- Tokens for other assignment fields (status, travel options, flights)
- Listing every role when a person has several assignments on a trip
- Screen changes
