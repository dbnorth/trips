# Feature: Organization Email Test Mode

**Feature ID:** 49
**Branch pattern:** `feature/49-organization-email-test-mode`
**Status:** Implemented
**Created:** 2026-10-16
**Input:** Add a **Test mode** yes/no field to the organization, editable on the organization edit screen. When an organization is in test mode, every email sent for it goes to the organization's email address instead of the real recipients, and the first line of the email says who it was meant for. This lets the app be tested in production without emailing real people.
**Depends on:** [Feature 3 — Organizations and Agreements](feature-3-organizations-and-agreements.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md), [Feature 44 — Daily Scheduled Emails](feature-44-daily-scheduled-emails.md), [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md), [Feature 46 — Email Trip Team](feature-46-email-trip-team.md)

---

## User Stories

### US-49.1: Turn test mode on for an organization
**As a** System Admin or Org Admin
**I want** a **Test mode** checkbox on the organization
**So that** I can test emails in production without reaching real participants

**Priority:** P1
**Independent test:** Check **Test mode** on Edit organization and save; reopening shows it checked.
**Acceptance scenarios:** see ### US-49.1

### US-49.2: Emails go to the organization while in test mode
**As a** System Admin or Org Admin testing the app
**I want** every email for my organization sent to the organization's email, marked with who it was for
**So that** I can check what each person would receive without sending it to them

**Priority:** P1
**Independent test:** With test mode on and organization email `office@example.org`, an email meant for `ana@example.org` is delivered to `office@example.org` with subject "[Test] …" and starts with "TEST MODE - intended for: ana@example.org".
**Acceptance scenarios:** see ### US-49.2

---

## Requirements

### Functional Requirements

- **FR-001**: The `organization` table MUST have `testMode` (boolean, required, default `false`). Existing organizations MUST get `false`.
- **FR-002**: The organization form (Edit organization and Add organization share it) MUST have a **Test mode** checkbox with the hint "Send every email for this organization to the organization email instead of the real recipients." It saves with the other organization fields. Whoever can edit the organization can change it (System Admin, or Org Admin of that organization).
- **FR-003**: When an email is sent for a trip whose organization has test mode on, the email service (Feature 43) MUST deliver it to the organization's **Email** instead of the real recipients.
- **FR-004**: In test mode the email body MUST start with the line `TEST MODE - intended for: <recipients>`, where `<recipients>` is the real recipient list after tokens are filled (comma-separated when there are several), followed by a blank line and then the normal body. The **Subject** MUST start with `[Test] ` followed by the normal subject. **From** and **Reply-To** are unchanged.
- **FR-005**: In test mode, when the organization has no **Email**, the email MUST NOT be sent to anyone. It is skipped with the reason "Test mode: the organization has no email."
- **FR-006**: The email log row (Feature 43, 45) MUST record where the email actually went (the organization email) as **To**, and the logged content MUST include the test mode first line.
- **FR-007**: Test mode MUST apply to every email that goes through the email service: Send Now event emails (Feature 45), daily scheduled emails (Feature 44), and team emails (Feature 46).
- **FR-008**: When test mode is off, emails MUST be sent exactly as before.

---

## Assumptions

- The organization for an email is the organization of the trip it is sent for. Every email the service sends has a trip, so organization templates and trip templates both follow that trip's organization.
- Preview screens (template Preview, team email Preview) are unchanged and show the real recipients.
- Sign-in "Login" email log rows are not emails and are unchanged.
- In test mode, delivery still follows `EMAIL_MODE` (`file` or `smtp`); only the recipient and first line change.

## Edge Cases

- Test mode on and the real recipient list is empty after tokens are filled → skipped "No recipients." as today (Feature 43); nothing is sent.
- Team email to 10 participants in test mode → 10 emails to the organization email, each naming its participant on the first line.
- Organization email changed while test mode is on → later emails go to the new address.

## Success Criteria

- **SC-001**: With test mode on, no email reaches a real recipient; every email reaches the organization email and names its intended recipient on the first line.
- **SC-002**: With test mode off, email behavior is unchanged.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Who can change test mode** | Same as other organization fields: System Admin, or Org Admin of that organization (`PUT /trips/organizations/:id`) |
| **Which emails** | Only emails for trips of that organization |

---

## Key Entities

- **organization** — new `testMode` field

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/organizations/:id` | Returns `testMode` |
| `POST` | `/trips/organizations` | Accepts `testMode` (default `false`) |
| `PUT` | `/trips/organizations/:id` | Accepts `testMode` |

No new endpoints.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `OrganizationFormFields` (Edit organization, Add organization) | **Test mode** checkbox after **Email**, with the hint in **FR-002** |

---

## Data Model Requirements

| Table | Field | Type | Rules |
|-------|-------|------|-------|
| `organization` | `testMode` | BOOLEAN | required, default `false`; `ensureSchema` adds it to existing databases |

---

## Acceptance Criteria (Gherkin)

### US-49.1 — Turn test mode on for an organization

#### Scenario: Organization form shows Test mode
* **Given** I am editing an organization
* **When** the form opens
* **Then** I see a **Test mode** checkbox after **Email**

#### Scenario: Test mode is saved
* **Given** I am an Org Admin of an organization
* **When** I save the organization with **Test mode** checked
* **Then** reloading the organization shows **Test mode** on

#### Scenario: Test mode is off for a new organization
* **Given** I am a System Admin
* **When** I create an organization without choosing **Test mode**
* **Then** the organization's **Test mode** is off

### US-49.2 — Emails go to the organization while in test mode

#### Scenario: Test mode sends to the organization email
* **Given** an organization with email `office@example.org` and **Test mode** on
* **And** a template for one of its trips addressed to `{{PARTICIPANT_EMAIL}}`
* **When** the template is sent to a participant whose email is `ana@example.org`
* **Then** the email is delivered to `office@example.org`
* **And** its first line is "TEST MODE - intended for: ana@example.org"
* **And** a blank line and the normal body follow
* **And** its subject is "[Test] " followed by the normal subject

#### Scenario: Test mode logs where the email went
* **Given** an organization with email `office@example.org` and **Test mode** on
* **When** an email meant for `ana@example.org` is sent for one of its trips
* **Then** the email log row's **To** is `office@example.org`
* **And** its subject starts with "[Test] "
* **And** its content starts with "TEST MODE - intended for: ana@example.org"

#### Scenario: Test mode without an organization email sends nothing
* **Given** an organization with no email and **Test mode** on
* **When** an email is sent for one of its trips
* **Then** nothing is delivered
* **And** the email is skipped with "Test mode: the organization has no email."

#### Scenario: Test mode off sends to the real recipient
* **Given** an organization with **Test mode** off
* **When** an email meant for `ana@example.org` is sent for one of its trips
* **Then** the email is delivered to `ana@example.org`
* **And** the body has no test mode line
* **And** the subject has no "[Test] " prefix

#### Scenario: Team email in test mode goes to the organization email
* **Given** an organization with email `office@example.org` and **Test mode** on
* **And** two potential participants on one of its trips
* **When** a Trip Leader sends a team email to all potential participants
* **Then** two emails are delivered to `office@example.org`
* **And** each names its own participant on the first line

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-49.1 | Organization form shows Test mode | `frontend/tests/OrganizationFormFields.test.js` | `Organization form shows Test mode` |
| US-49.1 | Test mode is saved | `backend/tests/organization-test-mode.test.js` | `Test mode is saved` |
| US-49.1 | Test mode is off for a new organization | `backend/tests/organization-test-mode.test.js` | `Test mode is off for a new organization` |
| US-49.2 | Test mode sends to the organization email | `backend/tests/organization-test-mode.test.js` | `Test mode sends to the organization email` |
| US-49.2 | Test mode logs where the email went | `backend/tests/organization-test-mode.test.js` | `Test mode logs where the email went` |
| US-49.2 | Test mode without an organization email sends nothing | `backend/tests/organization-test-mode.test.js` | `Test mode without an organization email sends nothing` |
| US-49.2 | Test mode off sends to the real recipient | `backend/tests/organization-test-mode.test.js` | `Test mode off sends to the real recipient` |
| US-49.2 | Team email in test mode goes to the organization email | `backend/tests/organization-test-mode.test.js` | `Team email in test mode goes to the organization email` |

---

## Agent implementation request

```text
Implement Feature 49 from @features/feature-49-organization-email-test-mode.md on branch `feature/49-organization-email-test-mode`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend and frontend before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`organization.testMode`), `features/reference/api.md` (organization create, update, and detail include `testMode`), `features/reference/behavior.md` (test mode redirects email to the organization email with the intended-recipient first line)

---

## Definition of Done

*   [x] `organization.testMode` column, default `false`, added by `ensureSchema` (**FR-001**)
*   [x] **Test mode** checkbox on the organization form, saved through the organization API (**FR-002**)
*   [x] Email service redirects to the organization email with the `[Test] ` subject prefix and the first line, skips when there is no organization email, and logs the real destination (**FR-003**–**FR-006**)
*   [x] Event, scheduled, and team emails follow test mode; test mode off is unchanged (**FR-007**, **FR-008**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/49-organization-email-test-mode`; PR → `dev`

---

## Out of Scope

- Showing test mode on Preview screens or the team email dialog
- A test mode indicator on the organizations list
- A system-wide test mode for all organizations
- Sending to an address other than the organization email
