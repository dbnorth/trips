# Feature: Send Email "via Mission Trips"

**Feature ID:** 51
**Branch pattern:** `feature/51-sender-via-mission-trips`
**Status:** Implemented
**Created:** 2026-10-16
**Input:** The mail server may only send from our verified domain, so every email must go out from `notifications@missiontrips.app` with a display name that says who it is from, and replies must go to the real sender. Pattern: From `"John Doe via Mission Trips" <notifications@missiontrips.app>`, Reply-To `john.doe@gmail.com`.
**Depends on:** [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md), [Feature 41 — Email Template To Address](feature-41-email-template-to-address.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md), [Feature 46 — Email Trip Team](feature-46-email-trip-team.md)

This feature changes Feature 43: the `EMAIL_SENDER` setting is replaced by the fixed sender below.

---

## User Stories

### US-51.1: Every email comes from Mission Trips on behalf of the real sender
**As a** trip participant
**I want** emails to show who they are from and let me reply to that person
**So that** I know who is writing and my reply reaches them

**Priority:** P1
**Independent test:** A template with **From email** `{{PRIMARY_TRIP_LEADER_EMAIL}}` for a trip led by John Doe (`john.doe@gmail.com`) sends From `"John Doe via Mission Trips" <notifications@missiontrips.app>` with Reply-To `john.doe@gmail.com`.
**Acceptance scenarios:** see ### US-51.1

---

## Requirements

### Functional Requirements

- **FR-001**: Every email the email service sends (event, scheduled, and team emails) MUST be sent from the address `notifications@missiontrips.app`. The address and the name "Mission Trips" are fixed in the code.
- **FR-002**: **Reply-To** MUST be the template's **From email** with tokens filled in (Feature 41), as today. Blank after filling → skipped "No sender." (Feature 43).
- **FR-003**: The From display name MUST be `<sender name> via Mission Trips`, where the sender name is the owner of the template's **From email**:
  - Token with value source **Organization email** → the trip's organization name.
  - Token with value source **Primary trip leader email** → the primary trip leader's first and last name.
  - Token with value source **Participant email** → the participant's first and last name.
  - A typed email address → the first owner whose email matches it (ignoring case), checked in this order: the trip's organization, the primary trip leader, the participant.
- **FR-004**: When there is no sender name (a typed address that matches no one, or the owner's name is blank), the display name MUST be just `Mission Trips`.
- **FR-005**: Display names MUST be properly quoted, so names with commas, quotes, or other special characters still produce a valid From.
- **FR-006**: The From is used in both delivery modes: written on the `From:` line of the file in file mode, and sent in smtp mode. The `emailLog` row's From records the full From as sent.
- **FR-007**: Team email Preview (Feature 46) MUST show the same From and Reply-To that sending uses.
- **FR-008**: The `EMAIL_SENDER` setting MUST no longer be used. It is removed from `backend/.env.example` and the deploy workflow.

---

## Assumptions

- `missiontrips.app` is verified with the mail service, so `notifications@missiontrips.app` may send.
- First and last name are joined with one space; a blank part is left out.
- Organization test mode (Feature 49) only changes To, Subject, and body; From and Reply-To follow this feature.

## Edge Cases

- **From email** `{{ORG_EMAIL}}` for organization "Hope Mission" → From `"Hope Mission via Mission Trips" <notifications@missiontrips.app>`, Reply-To the organization email.
- Typed **From email** `office@example.org` that is the organization's email → organization name is used.
- Typed **From email** `someone@else.org` that matches no one → From `"Mission Trips" <notifications@missiontrips.app>`, Reply-To `someone@else.org`.
- Trip with no primary trip leader and **From email** `{{PRIMARY_TRIP_LEADER_EMAIL}}` → filled From is blank → skipped "No sender."
- Organization name `Smith, Jones & Co` → still a valid From.

## Success Criteria

- **SC-001**: Every email is sent from `notifications@missiontrips.app`, names the real sender, and replies go to the real sender.
- **SC-002**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

No change.

---

## API Requirements

No endpoint changes. Team email Preview (`POST /trips/trips/:tripId/team-email/preview`) returns the new `from`.

---

## Screen Requirements

No screen changes. Team email Preview shows the new From.

---

## Data Model Requirements

No database changes.

---

## Acceptance Criteria (Gherkin)

### US-51.1 — Every email comes from Mission Trips on behalf of the real sender

#### Scenario: Primary trip leader sender
* **Given** a trip whose primary trip leader is John Doe with email `john.doe@gmail.com`
* **And** a template whose **From email** is `{{PRIMARY_TRIP_LEADER_EMAIL}}`
* **When** the template is sent to a participant
* **Then** the email is From `"John Doe via Mission Trips" <notifications@missiontrips.app>`
* **And** its Reply-To is `john.doe@gmail.com`
* **And** the email log row's From is `"John Doe via Mission Trips" <notifications@missiontrips.app>`

#### Scenario: Organization sender
* **Given** a trip of organization "Hope Mission" with email `office@example.org`
* **And** a template whose **From email** is `{{ORG_EMAIL}}`
* **When** the template is sent to a participant
* **Then** the email is From `"Hope Mission via Mission Trips" <notifications@missiontrips.app>`
* **And** its Reply-To is `office@example.org`

#### Scenario: Participant sender
* **Given** a participant Ana Lopez with email `ana@example.org`
* **And** a template whose **From email** is `{{PARTICIPANT_EMAIL}}`
* **When** the template is sent to Ana
* **Then** the email is From `"Ana Lopez via Mission Trips" <notifications@missiontrips.app>`
* **And** its Reply-To is `ana@example.org`

#### Scenario: Typed address that matches the organization
* **Given** a trip of organization "Hope Mission" with email `office@example.org`
* **And** a template whose **From email** is `Office@Example.org`
* **When** the template is sent to a participant
* **Then** the email is From `"Hope Mission via Mission Trips" <notifications@missiontrips.app>`
* **And** its Reply-To is `Office@Example.org`

#### Scenario: Typed address that matches no one
* **Given** a template whose **From email** is `someone@else.org`
* **When** the template is sent to a participant
* **Then** the email is From `"Mission Trips" <notifications@missiontrips.app>`
* **And** its Reply-To is `someone@else.org`

#### Scenario: Sender name with special characters
* **Given** a trip of organization `Smith, Jones & "Co"`
* **And** a template whose **From email** is `{{ORG_EMAIL}}`
* **When** the template is sent to a participant
* **Then** the From display name is `Smith, Jones & "Co" via Mission Trips`
* **And** the From address is `notifications@missiontrips.app`

#### Scenario: Team email preview shows the sender
* **Given** a Trip Participant template whose **From email** is `{{ORG_EMAIL}}` for organization "Hope Mission" with email `office@example.org`
* **When** a Trip Leader previews a team email
* **Then** the preview From is `"Hope Mission via Mission Trips" <notifications@missiontrips.app>`
* **And** the preview Reply-To is `office@example.org`

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-51.1 | Primary trip leader sender | `backend/tests/email-sender.test.js` | `Primary trip leader sender` |
| US-51.1 | Organization sender | `backend/tests/email-sender.test.js` | `Organization sender` |
| US-51.1 | Participant sender | `backend/tests/email-sender.test.js` | `Participant sender` |
| US-51.1 | Typed address that matches the organization | `backend/tests/email-sender.test.js` | `Typed address that matches the organization` |
| US-51.1 | Typed address that matches no one | `backend/tests/email-sender.test.js` | `Typed address that matches no one` |
| US-51.1 | Sender name with special characters | `backend/tests/email-sender.test.js` | `Sender name with special characters` |
| US-51.1 | Team email preview shows the sender | `backend/tests/email-sender.test.js` | `Team email preview shows the sender` |

Existing Feature 43, 44, 46, and 50 tests that set `EMAIL_SENDER` or check the old From are updated to the new From.

---

## Agent implementation request

```text
Implement Feature 51 from @features/feature-51-sender-via-mission-trips.md on branch `feature/51-sender-via-mission-trips`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend before finishing.
Update @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Feature 43 row: fixed sender `notifications@missiontrips.app` with `<sender name> via Mission Trips` and Reply-To; `EMAIL_SENDER` removed; Feature 46 preview From)

---

## Definition of Done

*   [x] Every email From `"<sender name> via Mission Trips" <notifications@missiontrips.app>` with Reply-To the filled template From (**FR-001**–**FR-005**)
*   [x] File, smtp, email log, and team email Preview use the new From (**FR-006**, **FR-007**)
*   [x] `EMAIL_SENDER` removed from code, `backend/.env.example`, and the deploy workflow (**FR-008**)
*   [x] Automated tests for every Gherkin scenario; existing tests updated
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend
*   [ ] On `feature/51-sender-via-mission-trips`; PR → `dev`

---

## Out of Scope

- Making the sender address or "Mission Trips" configurable
- A **From name** field on templates
- Using the preferred name or first name only
- Changing which addresses a template's **From email** may hold (Feature 41)
