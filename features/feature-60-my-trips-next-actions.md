# Feature: My Trips Next Actions

**Feature ID:** 60
**Branch pattern:** `feature/60-my-trips-next-actions`
**Status:** Implemented
**Created:** 2026-10-18
**Input:** On the participant home page, under each upcoming trip in **My Trips**, show the participant's possible next actions for that trip — complete the application (naming missing documents), wait for approval, make the deposit, make a donation toward the full payment, or enter their flight info when they buy their own ticket — each with a button that opens an existing (or new) dialog to complete it.
**Depends on:** [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md), [Feature 28 — View Trip Status](feature-28-view-trip-status.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 38 — Trip Deposit](feature-38-trip-deposit.md), [Feature 53 — Participant Donations](feature-53-participant-donations.md), [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md)

---

## User Stories

### US-60.1: See what to do next on each upcoming trip
**As a** participant
**I want** each upcoming trip in **My Trips** to show my next actions underneath it
**So that** I know what is left before the trip without opening each trip

**Priority:** P1
**Independent test:** With an incomplete application on an upcoming trip and an applied one on another, the home page shows "Complete your application." under the first and "Waiting on approval." under the second; a past trip shown with **Show all my trips** has no next actions.
**Acceptance scenarios:** see ### US-60.1

### US-60.2: Complete an incomplete application
**As a** participant with an incomplete application
**I want** to see which documents are missing and go straight to updating or cancelling the application
**So that** I can finish it or free my slot

**Priority:** P1
**Independent test:** An incomplete application whose role requires Board certification with Pediatrics shows "Missing documents: Board certification (Pediatrics)" with **Update App** and **Cancel App** buttons that open the existing application dialog and cancel confirmation.
**Acceptance scenarios:** see ### US-60.2

### US-60.3: Pay the deposit and the rest of the trip cost
**As an** approved participant
**I want** to be told when my deposit or the rest of my trip cost is still due, with a **Donate** button
**So that** I can pay what is due from the home page

**Priority:** P1
**Independent test:** An approved participant on a trip with a $500 deposit and $200 raised sees "Make your deposit: $200.00 raised of $500.00." with **Donate**; once $500 is raised on an $1,800 trip they see "Make a donation: $1,300.00 still owed." with **Donate**; **Donate** opens the existing Donate dialog for that trip.
**Acceptance scenarios:** see ### US-60.3

### US-60.4: Enter my own flight info
**As an** approved participant who buys my own air ticket
**I want** to be reminded to enter my flights and enter them myself
**So that** the trip staff know my arrival and return

**Priority:** P1
**Independent test:** An approved participant whose application says they buy their own ticket and who has no flight segments sees "Enter your flight info." with **Enter Flights**; the button opens the flight segments dialog, and after saving segments the action no longer shows.
**Acceptance scenarios:** see ### US-60.4

---

## Requirements

### Functional Requirements

**Which trips show next actions**

- **FR-001**: Next actions MUST show only for **My Trips** rows whose trip starts today or later (the same "upcoming" rule the list already uses). Past trips shown with **Show all my trips** MUST NOT show next actions.
- **FR-002**: Next actions MUST show in a row directly under the trip's row in the **My Trips** table, spanning the table width. A trip with no next actions MUST NOT add that row.
- **FR-003**: Cancelled and declined applications MUST NOT show next actions.

**Actions by application status**

- **FR-004**: **Incomplete** → one action, "Complete your application.", with **Update App** (opens the existing application dialog, as the row's **Update App** does) and **Cancel App** (opens the existing cancel confirmation, as the row's **Cancel App** does). While this action shows, the trip's own row MUST NOT show its **Update App** and **Cancel App** buttons (it keeps **View**). Rows without this action keep their buttons unchanged.
- **FR-005**: When the incomplete application is missing documents, the action MUST add "Missing documents: <names>." listing, in this order: each worker-role required document that is not satisfied, with its missing specializations in parentheses (Feature 25 / Feature 59 labels, e.g. "Board certification (Pediatrics)"); then "Passport" when the trip requires a passport and none qualifies (Feature 23); then "A file for every profile document" when a profile document has no uploaded file (Feature 22). When nothing document-related is missing, the line MUST be omitted.
- **FR-006**: **Applied** → one action, "Waiting on approval.", with no button.
- **FR-007**: **Approved** → payment actions (**FR-008**, **FR-009**) and the flight action (**FR-012**), in that order; each shows only when its rule holds. When none of them holds → "You are all ready for the trip." (**FR-016**).

**Payment actions (approved)**

- **FR-008**: When the trip's deposit is above $0 and the participant's **amount raised** is below the deposit → "Make your deposit: <raised> raised of <deposit>." with **Donate**.
- **FR-009**: Otherwise, when the participant's **amount owed** is above $0 → "Make a donation: <owed> still owed." with **Donate**. The deposit and donation actions MUST NOT show together.
- **FR-010**: **Amount raised** and **amount owed** MUST be the same values as the Trip Status board (Feature 28): raised is the sum of the participant's donations for the trip; owed is `max(0, participant cost − raised)`. When the participant cost is unknown, **FR-009** MUST NOT show. Amounts display like `$1,300.00`.
- **FR-011**: **Donate** MUST open the existing **Donate** dialog (Feature 53) for that trip, with the same **Donate to** list as **My Trip Info** on the trip page ("Yourself" first). After a donation is saved, the home page MUST reload **My Trips** so the actions reflect the new amount raised.

**Flight action (approved)**

- **FR-012**: When the application's flight purchase option is **self** (participant buys their own ticket — Feature 30) and the assignment has no flight segments → "Enter your flight info." with **Enter Flights**.
- **FR-013**: **Enter Flights** MUST open the existing flight segments dialog (`FlightSegmentsDialog`, Feature 30) for the participant's own assignment. After the segments are saved, the home page MUST reload **My Trips**.
- **FR-014**: The participant who owns an assignment MUST be able to get and replace that assignment's flight segments when its flight purchase option is **self**, using the existing segment endpoints with the same validation as staff. They MUST NOT read or change other people's segments, the flight header (purchased, cost, comments), or segments of an assignment where the organization buys the ticket (`403` "Forbidden."). Staff access is unchanged.

**Data source**

- **FR-015**: `GET /trips/trips/browse/mine` MUST return, for each trip, `tripPeopleRoleId` and `nextActions`: an ordered list of `{ code, ... }` with codes `complete-application` (`missingDocuments: string[]`), `wait-approval`, `make-deposit` (`amountRaised`, `deposit`), `make-donation` (`amountOwed`), `enter-flights`, `all-ready`, and `submit-application`. The list follows **FR-001**–**FR-012**, **FR-016** and **FR-018**, and is empty when no action applies. The home page MUST render only what the API returns.
- **FR-016**: An **approved** application on an upcoming trip with no payment or flight action MUST get one action, "You are all ready for the trip." (`all-ready`), with no button.
- **FR-017**: The next-actions row MUST be highlighted by what it asks: **orange** for "Waiting on approval.", **yellow** when the participant must act (complete or submit application, deposit, donation, flights), and **green** for "You are all ready for the trip.".
- **FR-018**: An **incomplete** application with nothing missing — no missing documents (**FR-005**) and no other missing item on the Trip Status board checklist (Feature 28: profile, role, funding, flight preferences, travel options, agreements, pregnancy) — MUST show "Submit your application." (`submit-application`) instead of **FR-004**, with **Submit App** (opens the existing application dialog, where **Submit Application** shows) and **Cancel App**. The trip's own row hides **Update App** and **Cancel App** as in **FR-004**.
- **FR-019**: Closing the application dialog opened from Home (saved or not) MUST reload **My Trips**, so documents uploaded from inside it update the next actions.
- **FR-020**: The trip page (`/browse-trips/:tripId`, opened by **View** from My Trips) MUST show the same next actions in its **My Trip Info** card — same rules, texts, buttons, and highlight (**FR-001**–**FR-018**). While complete- or submit-application shows, the card's own **Update App** MUST be hidden. **Cancel App** opens the existing cancel confirmation. After donating, saving flights, cancelling, or closing the application dialog, the page MUST reload.

---

## Assumptions

- The **My Trips** row keeps its existing **View** / **Update App** / **Manage App** / **Cancel App** / **Uncancel** buttons, except that **Update App** and **Cancel App** move to the next-actions row for an incomplete application (**FR-004**).
- Participants enter their own flights only when they buy their own ticket and are approved; this is the only new access in this feature.
- "Pending" in the request means the **Applied** status.
- "Collections" means the participant's **amount raised** (all donations for that participant on the trip, as on the Trip Status board).
- The deposit and donation actions are exclusive: until the deposit is reached only the deposit action shows.
- The flight action shows for approved participants only.
- No payment is processed by **Donate** (as Feature 53).

---

## Edge Cases

- Trip deposit blank or $0 → no deposit action; the donation action follows **FR-009**.
- Amount raised already at or above participant cost → no payment action.
- Participant cost unknown → no donation action (a deposit action can still show).
- Self-purchase participant with at least one segment (Arrival or Return) → no flight action.
- The worker role requires a passport-type document and the trip requires a passport → the passport is listed once (as the role document).
- Organization buys the ticket → no flight action; segment endpoints stay staff-only for that assignment.
- A trip that started today is still upcoming and shows actions.
- Incomplete application missing only non-document items (e.g. signature) → "Complete your application." without the missing-documents line.

---

## Success Criteria

- **SC-001**: Every Gherkin scenario has at least one automated test before merge.
- **SC-002**: A participant can reach every next action's dialog from the home page in one click.

---

## Data Ownership & Isolation

- `nextActions` are computed only for the signed-in person's own assignments (as **My Trips** today).
- A participant may get / replace flight segments only for their own assignment with flight purchase option **self** (**FR-014**). Staff access (Org Admin, System Admin, Trip Leader for the trip) is unchanged.
- **Donate** follows Feature 53 rules unchanged.

---

## Key Entities

- **Trip people role (assignment)**: the participant's application on a trip — status, flight purchase option, participant cost; source of the next actions.
- **Trip**: start date, deposit, participant cost, require passport.
- **Trip donation**: donations for the participant on the trip; their sum is the amount raised.
- **Trip flight segment**: the participant's Arrival / Return segments (Feature 30).

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/trips/browse/mine` | auth | Each trip adds `tripPeopleRoleId` and `nextActions` (**FR-015**) |
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo` adds `tripPeopleRoleId` and `nextActions` (**FR-020**) |
| `GET` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth | Also allowed for the assignment's own participant when its flight purchase option is `self`; else `403` (**FR-014**) |
| `PUT` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth | Same as GET; same validation as staff (**FR-014**) |

**`nextActions` example**

```json
[
  { "code": "make-deposit", "amountRaised": 200, "deposit": 500 },
  { "code": "enter-flights" }
]
```

---

## Screen Requirements

| UI | Change |
|----|--------|
| `Home` — **My Trips** table | A next-actions row under each upcoming trip with actions: one line per action (text from **FR-004**–**FR-012**, **FR-016**) with its buttons (**FR-002**), highlighted orange / yellow / green (**FR-017**); the trip row hides **Update App** / **Cancel App** while the complete-application action shows them (**FR-004**) |
| `TripBrowseView` — **My Trip Info** card | The same next actions, buttons, and highlight; header **Update App** hidden while complete/submit application shows (**FR-020**) |
| `MyTripNextActions` (new component) | Shared next-actions box (lines, buttons, highlight) used by Home and the trip page |
| `ApplyTripDialog` / `ConfirmDialog` | Reused for **Update App** / **Cancel App** (**FR-004**) |
| `ParticipantDonateDialog` | Reused for **Donate**; recipients loaded from the trip's **My Trip Info** (**FR-011**) |
| `FlightSegmentsDialog` | Reused for **Enter Flights** on the participant's own assignment (**FR-013**) |

---

## Data Model Requirements

No schema changes. Uses `tripPeopleRole` (`status`, `flightPurchaseOption`, `participantCost`), `trip` (`startDate`, `deposit`, `participantCost`, `requirePassport`), `tripDonation`, and `tripFlightSegment` as they are today (see `features/reference/data-model.md`).

---

## Acceptance Criteria (Gherkin)

### US-60.1 — See what to do next on each upcoming trip

#### Scenario: My trips returns next actions for upcoming trips only
* **Given** I have an applied application on an upcoming trip and an incomplete application on a trip that ended last month
* **When** I load my trips
* **Then** the upcoming trip has `nextActions` `[{ code: "wait-approval" }]`
* **And** the past trip has `nextActions` `[]`

#### Scenario: Cancelled application has no next actions
* **Given** my application on an upcoming trip is cancelled
* **When** I load my trips
* **Then** that trip has `nextActions` `[]`

#### Scenario: Home shows next actions under the trip
* **Given** My Trips has an upcoming trip whose next actions are wait-approval
* **When** I open the home page
* **Then** the row under that trip shows "Waiting on approval."
* **And** a trip with no next actions has no next-actions row

#### Scenario: Trip page returns my next actions
* **Given** I have an applied application on an upcoming trip
* **When** I open that trip's page
* **Then** `myTripInfo.nextActions` is `[{ code: "wait-approval" }]` and `myTripInfo.tripPeopleRoleId` is my assignment

#### Scenario: Trip page shows my next actions
* **Given** my trip's **My Trip Info** has the next action complete-application with missing documents "Passport"
* **When** I open the trip page
* **Then** **My Trip Info** shows "Complete your application." and "Missing documents: Passport." highlighted yellow, without the card's own **Update App**
* **And** **Update App** opens the application dialog, and **Cancel App** opens the cancel confirmation

#### Scenario: Next-actions rows are highlighted by status
* **Given** My Trips has upcoming trips whose next actions are wait-approval, make-donation, and all-ready
* **When** I open the home page
* **Then** the wait-approval row is orange, the make-donation row is yellow, and the all-ready row is green and shows "You are all ready for the trip."

### US-60.2 — Complete an incomplete application

#### Scenario: Incomplete application lists missing documents
* **Given** my incomplete application's role requires Board certification with Pediatrics, the trip requires a passport, and I have neither
* **When** I load my trips
* **Then** the trip's next action is `complete-application` with `missingDocuments` `["Board certification (Pediatrics)", "Passport"]`

#### Scenario: Passport required by the role and the trip is listed once
* **Given** my incomplete application's role requires a Passport document, the trip requires a passport, and I have none
* **When** I load my trips
* **Then** the trip's next action is `complete-application` with `missingDocuments` `["Passport"]`

#### Scenario: Incomplete application with nothing missing is asked to submit
* **Given** my application on an upcoming trip is incomplete, but my profile, application answers, and documents are all complete
* **When** I load my trips
* **Then** the trip's next actions are `[{ code: "submit-application" }]`

#### Scenario: Submit App opens the application dialog
* **Given** My Trips has an upcoming trip whose next action is submit-application
* **When** I open the home page
* **Then** the yellow row under that trip shows "Submit your application." with **Submit App** and **Cancel App**, and the trip's own row shows neither **Update App** nor **Cancel App**
* **And** **Submit App** opens the application dialog for that trip
* **And** closing the dialog reloads My Trips

#### Scenario: Complete application buttons open the application dialogs
* **Given** My Trips has an upcoming trip whose next action is complete-application with missing documents "Board certification (Pediatrics)"
* **When** I open the home page
* **Then** the row under that trip shows "Complete your application." and "Missing documents: Board certification (Pediatrics)."
* **And** the trip's own row shows **View** but not **Update App** or **Cancel App**
* **And** **Update App** opens the application dialog for that trip, and **Cancel App** opens the cancel confirmation

### US-60.3 — Pay the deposit and the rest of the trip cost

#### Scenario: Approved participant below the deposit is asked for the deposit
* **Given** I am approved on an upcoming trip costing $1,800 with a $500 deposit, and $200 has been donated for me
* **When** I load my trips
* **Then** the trip's next actions are `[{ code: "make-deposit", amountRaised: 200, deposit: 500 }]`

#### Scenario: Approved participant past the deposit is asked for the rest
* **Given** I am approved on an upcoming trip costing $1,800 with a $500 deposit, and $500 has been donated for me
* **When** I load my trips
* **Then** the trip's next actions are `[{ code: "make-donation", amountOwed: 1300 }]`

#### Scenario: Fully paid participant has no payment action
* **Given** I am approved on an upcoming trip costing $1,800, and $1,800 has been donated for me
* **When** I load my trips
* **Then** the trip's next actions include neither `make-deposit` nor `make-donation`

#### Scenario: Fully ready participant is all ready
* **Given** I am approved and fully paid on an upcoming trip, and the organization buys my ticket
* **When** I load my trips
* **Then** the trip's next actions are `[{ code: "all-ready" }]`

#### Scenario: Donate opens the Donate dialog
* **Given** My Trips has an upcoming trip whose next action is make-deposit with $200 raised of a $500 deposit
* **When** I open the home page and click **Donate**
* **Then** the row shows "Make your deposit: $200.00 raised of $500.00."
* **And** the Donate dialog opens for that trip with "Yourself" first in **Donate to**

### US-60.4 — Enter my own flight info

#### Scenario: Self-purchase participant without segments is asked for flights
* **Given** I am approved and fully paid on an upcoming trip, my application says I buy my own ticket, and I have no flight segments
* **When** I load my trips
* **Then** the trip's next actions are `[{ code: "enter-flights" }]`

#### Scenario: Participant saves their own flight segments
* **Given** I am approved on a trip and my application says I buy my own ticket
* **When** I replace my assignment's flight segments with an Arrival segment
* **Then** the API returns `200` with that segment
* **And** my trips no longer include `enter-flights` for that trip

#### Scenario: Participant cannot change segments when the organization buys the ticket
* **Given** I am approved on a trip and my application says the organization buys my ticket
* **When** I replace my assignment's flight segments
* **Then** the API returns `403` with "Forbidden."

#### Scenario: Participant cannot read another participant's segments
* **Given** another participant on my trip buys their own ticket
* **When** I get their flight segments
* **Then** the API returns `403` with "Forbidden."

#### Scenario: Enter Flights opens the flight segments dialog
* **Given** My Trips has an upcoming trip whose next action is enter-flights
* **When** I open the home page and click **Enter Flights**
* **Then** the row shows "Enter your flight info."
* **And** the flight segments dialog opens for my assignment on that trip

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-60.1 | My trips returns next actions for upcoming trips only | `backend/tests/my-trips-next-actions.test.js` | `My trips returns next actions for upcoming trips only` |
| US-60.1 | Cancelled application has no next actions | `backend/tests/my-trips-next-actions.test.js` | `Cancelled application has no next actions` |
| US-60.1 | Home shows next actions under the trip | `frontend/tests/HomeNextActions.test.js` | `Home shows next actions under the trip` |
| US-60.1 | Trip page returns my next actions | `backend/tests/my-trips-next-actions.test.js` | `Trip page returns my next actions` |
| US-60.1 | Trip page shows my next actions | `frontend/tests/TripBrowseNextActions.test.js` | `Trip page shows my next actions` |
| US-60.1 | Next-actions rows are highlighted by status | `frontend/tests/HomeNextActions.test.js` | `Next-actions rows are highlighted by status` |
| US-60.2 | Incomplete application lists missing documents | `backend/tests/my-trips-next-actions.test.js` | `Incomplete application lists missing documents` |
| US-60.2 | Passport required by the role and the trip is listed once | `backend/tests/my-trips-next-actions.test.js` | `Passport required by the role and the trip is listed once` |
| US-60.2 | Incomplete application with nothing missing is asked to submit | `backend/tests/my-trips-next-actions.test.js` | `Incomplete application with nothing missing is asked to submit` |
| US-60.2 | Submit App opens the application dialog | `frontend/tests/HomeNextActions.test.js` | `Submit App opens the application dialog` |
| US-60.2 | Complete application buttons open the application dialogs | `frontend/tests/HomeNextActions.test.js` | `Complete application buttons open the application dialogs` |
| US-60.3 | Approved participant below the deposit is asked for the deposit | `backend/tests/my-trips-next-actions.test.js` | `Approved participant below the deposit is asked for the deposit` |
| US-60.3 | Approved participant past the deposit is asked for the rest | `backend/tests/my-trips-next-actions.test.js` | `Approved participant past the deposit is asked for the rest` |
| US-60.3 | Fully paid participant has no payment action | `backend/tests/my-trips-next-actions.test.js` | `Fully paid participant has no payment action` |
| US-60.3 | Fully ready participant is all ready | `backend/tests/my-trips-next-actions.test.js` | `Fully ready participant is all ready` |
| US-60.3 | Donate opens the Donate dialog | `frontend/tests/HomeNextActions.test.js` | `Donate opens the Donate dialog` |
| US-60.4 | Self-purchase participant without segments is asked for flights | `backend/tests/my-trips-next-actions.test.js` | `Self-purchase participant without segments is asked for flights` |
| US-60.4 | Participant saves their own flight segments | `backend/tests/my-trips-next-actions.test.js` | `Participant saves their own flight segments` |
| US-60.4 | Participant cannot change segments when the organization buys the ticket | `backend/tests/my-trips-next-actions.test.js` | `Participant cannot change segments when the organization buys the ticket` |
| US-60.4 | Participant cannot read another participant's segments | `backend/tests/my-trips-next-actions.test.js` | `Participant cannot read another participant's segments` |
| US-60.4 | Enter Flights opens the flight segments dialog | `frontend/tests/HomeNextActions.test.js` | `Enter Flights opens the flight segments dialog` |

---

## Agent implementation request

```text
Implement Feature 60 from @features/feature-60-my-trips-next-actions.md on branch `feature/60-my-trips-next-actions`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend and frontend before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (`/browse/mine` `nextActions`; participant access to own flight segments), `features/reference/behavior.md` (My Trips next actions; Feature 30 flights row — participant self-entry)

---

## Definition of Done

*   [x] My Trips next actions computed by the API and shown under upcoming trips, highlighted by status (**FR-001**–**FR-010**, **FR-012**, **FR-015**–**FR-017**)
*   [x] Next-action buttons open the application, cancel, Donate, and flight segments dialogs; My Trips reloads after donating, saving flights, or closing the application dialog (**FR-004**, **FR-011**, **FR-013**, **FR-018**, **FR-019**)
*   [x] Participant access to their own flight segments when buying their own ticket (**FR-014**)
*   [x] Same next actions in the trip page's **My Trip Info** (**FR-020**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/60-my-trips-next-actions`; PR → `dev`

---

## Out of Scope

- Processing payments (Donate records a donation only, as Feature 53)
- Next actions for staff, Trip Leaders' own trips list, or past trips
- Participants editing the flight header (purchased, cost, comments) or entering flights when the organization buys the ticket
- Email or push reminders for next actions (Features 44 / 45 cover scheduled and event emails)
- Next actions for profile items other than documents (the existing incomplete-profile warning on the application covers them)
