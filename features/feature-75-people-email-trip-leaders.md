# Feature: Email People Includes Trip Leaders

**Feature ID:** 75
**Branch pattern:** `feature/75-people-email-trip-leaders`
**Status:** Implemented
**Created:** 2026-10-22
**Input:** "Email People is not showing the correct number of Recipients when you pick a trip, or All for both selections." Clarified with the requester: the count should **also include approved Trip Leaders** on the selected trips. Today the **Email people** dialog (Feature 62) counts and emails only approved **Trip Participants** (FR-009: "Trip Leaders are not included"), so a trip with 3 approved participants and 1 Trip Leader shows "3 people". Follow-up: "when All trips is selected the number displayed is 0" — clicking **All** again unticks it, leaving **Trips** empty and the count at 0; the requester chose to have **All** come back instead.
**Depends on:** [Feature 62 — Email People](feature-62-people-email.md)

---

## User Stories

### US-75.1: Email a trip's leaders along with its participants
**As an** Org Admin or System Admin  
**I want** the **Email people** dialog to include the approved Trip Leaders of the selected trips  
**So that** one email reaches everyone going on the trip, and the recipient count matches the team

**Priority:** P2  
**Independent test:** A trip with 3 approved Trip Participants and 1 approved Trip Leader → with **Trips** set to that trip and **Roles** **All**, the dialog shows "4 people"  
**Acceptance scenarios:** see ### US-75.1

### US-75.2: Trips and Roles never end up empty
**As an** Org Admin or System Admin  
**I want** **Trips** and **Roles** to fall back to **All** instead of being left empty  
**So that** the recipient count never drops to 0 just because I unticked **All**

**Priority:** P2  
**Independent test:** With **Trips** **All**, unticking **All** leaves **Trips** at **All** and the count unchanged  
**Acceptance scenarios:** see ### US-75.2

---

## Requirements

### Functional Requirements

- **FR-001**: Feature 62 **FR-009** changes to: recipients MUST be people with an **approved** **Trip Participant** or **Trip Leader** assignment on a selected trip whose trip worker role is a selected role. With **Roles** **All**, every approved Trip Participant and Trip Leader on the selected trips is included, with or without a worker role.
- **FR-002**: Each person is still a recipient once (Feature 62 **FR-010**), even when they are both a Trip Leader and a Trip Participant, or on several selected trips.
- **FR-003**: Preview and send use the same recipients as the count (Feature 62 **FR-011**, **FR-012**). A **Trip Participant** template sent to a Trip Leader is filled from the leader's assignment on the trip, as for any recipient (Feature 62 **FR-018**).
- **FR-004**: Apart from **FR-005**, nothing else in the dialog changes: Trips, Roles, templates, who may use it, and the "N people" label.
- **FR-005**: Feature 62 **FR-007** and **FR-008** gain: unticking **All**, or removing the last selected trip or role (menu or chip), selects **All** again. **Trips** and **Roles** are never empty, and the **All** chip has no remove (X) button. The same applies when **Trips** changes remove every selected role (Feature 62 **FR-008**).

---

## Assumptions

- Trip Leaders usually have no worker role. They are recipients with **Roles** **All**, and with specific roles only when their own assignment has one of the selected roles.
- Only **approved** Trip Leader assignments count, the same rule as participants.

## Edge Cases

- Trip Leader who is also an approved Trip Participant on the same trip → one recipient.
- Trip Leader on two selected trips → one recipient.
- Trip with only a Trip Leader → "1 person" with **Roles** **All**.
- Trip Leader with no email → skipped "No recipients." on send (Feature 43), as for participants.
- Selection that matches nobody (e.g. a role no one on those trips has) → still "0 people" (Feature 62).
- The server still rejects an empty `tripIds` or `workerRoleIds` array with `400` (Feature 62); the dialog no longer sends one.

## Success Criteria

- **SC-001**: For any selection, the recipient count equals the number of distinct approved Trip Participants and Trip Leaders that match it.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass (the Feature 62 scenario that excluded a Trip Leader is updated).

---

## Data Ownership & Isolation

No change. Recipients stay limited to the acting organization's trips; the dialog shows names only.

---

## Key Entities

- **Trip people role** — role (Trip Participant or Trip Leader), status, trip worker role (read only)

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `POST` | `/trips/people-email/recipients` | Org Admin / System Admin | Recipients include approved Trip Leaders (FR-001, FR-002) |
| `POST` | `/trips/people-email/preview` | same | `personId` may be a Trip Leader recipient (FR-003) |
| `POST` | `/trips/people-email` | same | Sends to Trip Leader recipients too (FR-003) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Email people dialog (`PeopleEmailDialog`) | The recipient count and **Preview as** list now include Trip Leaders (FR-001); **Trips** and **Roles** fall back to **All** instead of going empty (FR-005) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-75.1 — Email a trip's leaders along with its participants

Background: on "Guatemala Clinic", Ana (Nurse) and Ben (Doctor) are approved Trip Participants, Cara (Nurse) has applied, and Lee is the approved Trip Leader with no worker role; on "Honduras Build", Dan (Builder) is an approved Trip Participant and Eve is the approved Trip Leader.

#### Scenario: All roles include the trip's leaders
* **When** I request recipients for trips ["Guatemala Clinic"] and roles "all"
* **Then** the recipients are Ana, Ben, and Lee

#### Scenario: All trips and all roles list each participant and leader once
* **Given** Ana is also approved on "Honduras Build"
* **When** I request recipients for trips "all" and roles "all"
* **Then** the recipients are Ana, Ben, Dan, Eve, and Lee, each once

#### Scenario: A specific role leaves out leaders without that role
* **When** I request recipients for trips ["Guatemala Clinic"] and roles ["Nurse"]
* **Then** the recipients are only Ana

#### Scenario: A Trip Leader can be previewed and emailed
* **Given** a Person template
* **When** I send it for trips ["Guatemala Clinic"] and roles "all"
* **Then** Lee is sent an email
* **And** previewing as Lee succeeds

### US-75.2 — Trips and Roles never end up empty

#### Scenario: Unticking All trips keeps All
* **Given** the Email people dialog is open with **Trips** **All** showing "3 people"
* **When** I untick **All** in **Trips**
* **Then** **Trips** is still **All**
* **And** the dialog still shows "3 people"
* **And** the **All** chip has no remove (X) button

#### Scenario: Removing the last trip or role selects All again
* **Given** **Trips** is "Guatemala Clinic" and **Roles** is "Nurse"
* **When** I remove "Nurse" from **Roles**
* **Then** **Roles** is **All**
* **When** I remove "Guatemala Clinic" from **Trips**
* **Then** **Trips** is **All**
* **And** recipients are requested for trips "all" and roles "all"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-75.1 | All roles include the trip's leaders | `backend/tests/people-email.test.js` | `All roles include the trip's leaders` |
| US-75.1 | All trips and all roles list each participant and leader once | `backend/tests/people-email.test.js` | `All trips and all roles list each participant and leader once` |
| US-75.1 | A specific role leaves out leaders without that role | `backend/tests/people-email.test.js` | `A specific role leaves out leaders without that role` |
| US-75.1 | A Trip Leader can be previewed and emailed | `backend/tests/people-email.test.js` | `A Trip Leader can be previewed and emailed` |
| US-75.2 | Unticking All trips keeps All | `frontend/tests/PeopleEmailDialog.test.js` | `Unticking All trips keeps All` |
| US-75.2 | Removing the last trip or role selects All again | `frontend/tests/PeopleEmailDialog.test.js` | `Removing the last trip or role selects All again` |

---

## Agent implementation request

```text
Implement Feature 75 from @features/feature-75-people-email-trip-leaders.md on branch `feature/75-people-email-trip-leaders`.

Follow layer order in @features/framework.md.
Backend: peopleEmail.controller.js loadRecipients selects approved assignments whose role is Trip Participant or Trip Leader (FR-001), still one recipient per person (FR-002). Preview and send already use loadRecipients (FR-003).
Frontend: PeopleEmailDialog.vue — when a Trips or Roles change (including the roles pruned on a Trips change) would leave the selection empty, set it to All (FR-005).
Map every Gherkin scenario in the Test Coverage Map; update the Feature 62 test "All trips and all roles list each approved participant once", which expected the Trip Leader to be left out; run backend and frontend `npm test` before finishing.
Living reference: api.md (people-email recipients row), behavior.md (Email people row).
Do not change other dialog UI, Email team (Feature 46), or who may use Email people.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md`, `behavior.md`

---

## Definition of Done

*   [x] Recipients include approved Trip Leaders per **FR-001**, once per person per **FR-002**
*   [x] Preview and send per **FR-003**; nothing else changes per **FR-004**
*   [x] **Trips** and **Roles** fall back to **All** per **FR-005**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Applied, incomplete, or other non-approved assignments as recipients
- A separate filter for Trip Leaders vs Trip Participants
- Email team (Feature 46) recipients
