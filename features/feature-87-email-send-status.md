# Feature: Email Send Status Dialog

**Feature ID:** 87
**Branch pattern:** `feature/87-email-send-status`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "Update all send buttons actions to show a status dialog show the number of emails attempted and the number successfully sent so the users will know that something happened."

Interpreted as:
- Today each email dialog's **Send** shows its "Sent N, skipped N, failed N" result as a small alert at the bottom of a scrolling dialog, so users often miss that anything happened.
- After confirming **Send**, a status dialog opens on top of the email dialog. It shows "Sending N emails…" while the request runs, then the number attempted, sent, skipped, and failed, with each skipped or failed person and the reason.
- Clarified:
  - It applies to the three **Send** buttons: **Email team** (trip page), **Email flight itinerary** (Flights page), and **Email people** (People page).
  - The reserved-role emails sent when a trip is saved and **Send reset link** on Forgot password are not changed (counts there would reveal whether an account exists).
  - **OK** closes the email dialog too when every email was sent; otherwise it returns to the email dialog with the user's choices kept.

**Depends on:**
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md) (Email team dialog and results)
- [Feature 62 — Email People](feature-62-people-email.md) (Email people dialog)
- [Feature 86 — Flight Itinerary Email](feature-86-flight-itinerary-email.md) (Email flight itinerary dialog)

---

## User Stories

### US-87.1: See what happened when I send email

**As** someone sending email from **Email team**, **Email flight itinerary**, or **Email people**
**I want** a status dialog showing how many emails were attempted and how many were sent
**So that** I know the send happened and whether anyone was missed

**Acceptance:** see Gherkin scenarios under US-87.1.

### US-87.2: The same status on every email dialog

**As** staff using any of the email dialogs
**I want** the same status dialog on each of them
**So that** sending works the same way everywhere

**Acceptance:** see Gherkin scenarios under US-87.2.

---

## Requirements

### Functional Requirements

- **FR-001**: Confirming **Send** in the "Are you sure?" dialog of **Email team**, **Email flight itinerary**, or **Email people** closes the confirmation and opens the **Email status** dialog on top of the email dialog. While the send request runs it shows "Sending N emails…" (N = the recipient count; "Sending 1 email…" for one) with a progress spinner and no buttons, and it can't be dismissed.
- **FR-002**: When the request finishes, the **Email status** dialog shows:
  - **Attempted**: the number of recipients (sent + skipped + failed)
  - **Sent**, **Skipped**, **Failed**: the counts from the response
  - each skipped or failed person as "<name>: skipped — <reason>" / "<name>: failed — <reason>" ("Participant" when there's no name), in response order
  - an **OK** button
- **FR-003**: The title is **Emails sent** when every email was sent, otherwise **Some emails not sent** (including when none were sent).
- **FR-004**: When the request itself fails (validation `400`, `403`, network, or server error), the **Email status** dialog has the title **Email not sent** and shows the error message (the server's `message`, otherwise "Unable to send email."), with **OK**. Nothing is counted.
- **FR-005**: **OK**:
  - every email sent (no skipped, no failed) → closes the status dialog and the email dialog
  - otherwise (any skipped or failed, or **Email not sent**) → closes the status dialog and leaves the email dialog open with its template, subject, body, and recipients unchanged, so the user can fix the problem and send again
- **FR-006**: The email dialogs no longer show the results alert at the bottom ("N sent, N skipped, N failed." / "Sent N, skipped N, failed N") or the send error alert; FR-002 and FR-004 replace them. Preview and template loading errors still show in the email dialog as today.
- **FR-007**: One shared status dialog component is used by all three email dialogs. No API changes: it uses the existing send responses `{ sent, skipped, failed, results: [{ personId, name, status, reason }] }`.

---

## Assumptions

- "Attempted" means every recipient the request covered, including people skipped before sending (for example no email address or no flight segments).
- In organization test mode (emails redirected to the test address) and in `EMAIL_MODE=file`, an email written or redirected counts as sent, as the response already reports.
- Sending stays one request per send; there is no per-email live progress.

## Edge Cases

- One recipient → "Sending 1 email…" and "Attempted 1".
- Every recipient skipped (e.g. no one has flight segments) → **Some emails not sent**, "Attempted 3", "Sent 0", "Skipped 3", each person listed.
- The user closes the browser tab while sending → nothing new; the server finishes the send as today.
- A `400` such as "Choose at least one participant." → **Email not sent** with that message; **OK** returns to the email dialog.

## Success Criteria

- **SC-001**: After every send from the three email dialogs, the user sees a dialog stating how many emails were attempted and sent.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No change. The status dialog shows only the names and reasons the send response already returns to the sender.

---

## Key Entities

None changed (frontend only).

---

## API Requirements

None. Uses `POST /trips/trips/:id/team-email`, `POST /trips/trips/:id/flight-itinerary-email`, and `POST /trips/people-email` as they are.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Email status** dialog (new shared component) | "Sending N emails…" with spinner, then title per FR-003 / FR-004, **Attempted**, **Sent**, **Skipped**, **Failed**, skipped/failed list, **OK** (FR-001–FR-005). Look: rounded card; a header icon by state (spinner while sending, green check for **Emails sent**, orange alert for **Some emails not sent**, red alert for **Email not sent**) with the title and a summary line ("N of N emails sent"); the four counts as tiles (number above label; **Sent** green, **Skipped** orange and **Failed** red when above 0); the skipped/failed people in a bordered list headed **Not sent**, each with a status icon; the request error in a red tonal alert; **OK** as the primary button |
| **Email team** / **Email flight itinerary** dialog (`TripTeamEmailDialog`) | Opens the status dialog on confirm; results and send-error alerts removed (FR-006) |
| **Email people** dialog (`PeopleEmailDialog`) | Same (FR-006) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions"; Org Admin Omar; trip "Guatemala Clinic 2027".
- Approved Trip Participants Ana Lopez, Ben Cruz, and Cy Diaz on the trip.
- Hope Missions has a **Trip team update** Trip Participant template and a **People update** Person template.

### US-87.1 — See what happened when I send email

#### Scenario: Sending shows a status dialog while the emails go out
* **When** Omar chooses **Trip team update** in **Email team**, sends to **All accepted participants**, and confirms "Send this email to 3 participants?"
* **Then** the **Email status** dialog shows "Sending 3 emails…" with a spinner and no **OK** until the send finishes

#### Scenario: Every email was sent
* **Given** all 3 emails are sent
* **Then** the **Email status** dialog is titled **Emails sent** and shows "Attempted 3", "Sent 3", "Skipped 0", "Failed 0"
* **And** clicking **OK** closes the status dialog and the **Email team** dialog

#### Scenario: Some emails were not sent
* **Given** Ben has no email address and the email to Cy fails with "Connection refused"
* **Then** the **Email status** dialog is titled **Some emails not sent** and shows "Attempted 3", "Sent 1", "Skipped 1", "Failed 1"
* **And** it lists "Ben Cruz: skipped — No recipients." and "Cy Diaz: failed — Connection refused"
* **And** clicking **OK** returns to the **Email team** dialog with **Trip team update**, the subject, the body, and **All accepted participants** still chosen
* **And** the **Email team** dialog shows no results alert

#### Scenario: The send request fails
* **Given** the send request is refused with "Choose a Trip Participant template for this trip."
* **Then** the **Email status** dialog is titled **Email not sent** and shows "Choose a Trip Participant template for this trip."
* **And** clicking **OK** returns to the **Email team** dialog

### US-87.2 — The same status on every email dialog

#### Scenario: Email people shows the status dialog
* **When** Omar sends the **People update** template from **Email people** to 2 people and both are sent
* **Then** the **Email status** dialog is titled **Emails sent** and shows "Attempted 2" and "Sent 2"
* **And** clicking **OK** closes the **Email people** dialog

#### Scenario: Email flight itinerary shows the status dialog
* **When** Omar sends a flight itinerary template from the Flights page to Ana and Ben, and Ben has no flight segments
* **Then** the **Email status** dialog is titled **Some emails not sent** and shows "Attempted 2", "Sent 1", "Skipped 1" and "Ben Cruz: skipped — No flight segments."

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-87.1 | Sending shows a status dialog while the emails go out | `frontend/tests/EmailSendStatus.test.js` | `Sending shows a status dialog while the emails go out` |
| US-87.1 | Every email was sent | `frontend/tests/EmailSendStatus.test.js` | `Every email was sent` |
| US-87.1 | Some emails were not sent | `frontend/tests/EmailSendStatus.test.js` | `Some emails were not sent` |
| US-87.1 | The send request fails | `frontend/tests/EmailSendStatus.test.js` | `The send request fails` |
| US-87.2 | Email people shows the status dialog | `frontend/tests/EmailSendStatus.test.js` | `Email people shows the status dialog` |
| US-87.2 | Email flight itinerary shows the status dialog | `frontend/tests/EmailSendStatus.test.js` | `Email flight itinerary shows the status dialog` |

---

## Agent implementation request

```text
Implement Feature 87 from @features/feature-87-email-send-status.md on branch `feature/87-email-send-status`.

Frontend only. Add a shared EmailSendStatusDialog component (sending state with spinner, results per FR-002/FR-003, error per FR-004, OK per FR-005). Use it from TripTeamEmailDialog (Email team and Email flight itinerary) and PeopleEmailDialog; remove their results and send-error alerts (FR-006). Update existing frontend tests that assert the old results alert.
Tests per the Test Coverage Map. Update features/reference/behavior.md (Feature 46, 62, 86 rows mention the results).
```

---

## Definition of Done

*   [x] Status dialog while sending and with results per **FR-001**–**FR-004**
*   [x] **OK** behavior per **FR-005**
*   [x] Old results and send-error alerts removed per **FR-006**; one shared component per **FR-007**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npm test` green; backend unchanged
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Status dialogs for reserved-role emails on trip save, Forgot password, or event / scheduled emails
- Live per-email progress or sending in the background
- A send history or email log page
- Resending only the failed emails with one click
