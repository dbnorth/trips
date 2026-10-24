# Feature: Trip Add-on Expenses

**Feature ID:** 74
**Branch pattern:** `feature/74-trip-addon-expenses`
**Status:** Implemented
**Created:** 2026-10-22
**Input:** "Add a feature spec to add trip addon expense. An addon expense has a description and a cost. This cost should be included in all total trip costs. On the View Trip the list of participants edit should allow for adding multiple trip expenses. Need to add {{ADDON_EXPENSE}} for email templates that list all the addon expense descriptions and costs. The email templates sub for total cost should include the add-on expenses costs."
Clarified with the requester:
- Add-on expenses belong to **one participant's application** and are entered by staff in the participant **Edit** dialog on View Trip.
- Every total and every "amount owed" uses **one** total trip cost: participant cost + airfare (when the organization books the flight) + add-on expenses.
- Add a total token, `{{ADDON_EXPENSE_TOTAL}}`.
- Participants see their add-on expenses in **My Trip Info**.
- "Participant cost" keeps its current meaning. When a participant applies or edits their application it is saved as the trip cost plus their chosen trip options; staff can override it. Trip options are therefore already inside it and must not be added again.

Today two different totals exist:
- "Amount owed" (Trip Status, My Trips, `{{PARTICIPANT_AMOUNT_OWED}}`, payment-due and payment-complete emails) is participant cost − donations.
- The email statement's `{{PARTICIPANT_TOTAL_TRIP_COST}}` is participant cost + trip options + airfare. This counts trip options twice for participants who applied themselves.

**Depends on:**
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md)
- [Feature 28 — View Trip Status](feature-28-view-trip-status.md)
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md)
- [Feature 44 — Daily Scheduled Emails](feature-44-daily-scheduled-emails.md)
- [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md)
- [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md)
- [Feature 61 — Trip Page My Travel Details](feature-61-trip-page-my-travel-details.md)

---

## User Stories

### US-74.1: Staff add add-on expenses to a participant
**As a** Trip Leader, Org Admin, or System Admin  
**I want** to add, change, and remove any number of add-on expenses (description and cost) on a participant from the **Edit** dialog on View Trip  
**So that** extra charges such as travel insurance or an excursion are part of what the participant owes

**Priority:** P1  
**Independent test:** Edit a participant, add two add-on expenses, save → reopening the dialog shows both; remove one, save → only one remains  
**Acceptance scenarios:** see ### US-74.1

### US-74.2: Every total includes add-on expenses
**As** trip staff and as a participant  
**I want** every total trip cost and amount owed to include airfare the organization books and all add-on expenses  
**So that** Trip Status, My Trips, and every email show the same, complete amount

**Priority:** P1  
**Independent test:** A participant with participant cost $2,250, organization-booked airfare $850, and add-ons $75 + $400 and no donations → Trip Status, My Trips, `{{PARTICIPANT_AMOUNT_OWED}}`, `{{PARTICIPANT_TOTAL_TRIP_COST}}`, and `{{PARTICIPANT_BALANCE_DUE}}` all show $3,575.00  
**Acceptance scenarios:** see ### US-74.2

### US-74.3: Email tokens list add-on expenses
**As an** Org Admin writing email templates  
**I want** `{{ADDON_EXPENSE}}` (each description and cost) and `{{ADDON_EXPENSE_TOTAL}}`  
**So that** financial statements and reminders show what the add-ons are

**Priority:** P2  
**Independent test:** Preview a template with both tokens for the participant above → "Travel insurance: $75.00" and "Antigua weekend excursion: $400.00" on separate lines, and "$475.00"  
**Acceptance scenarios:** see ### US-74.3

### US-74.4: Participants see their add-on expenses
**As a** participant  
**I want** My Trip Info to list my add-on expenses and show my total trip cost  
**So that** I know what I'm being charged for

**Priority:** P2  
**Independent test:** Sign in as the participant above and open the trip page → **My Trip Info** shows **Add-on expenses** with both rows, and **Your trip cost** $3,575.00  
**Acceptance scenarios:** see ### US-74.4

---

## Requirements

### Functional Requirements

**Add-on expenses**

- **FR-001**: An application (trip people role) MUST be able to have any number of **add-on expenses**. Each has:
  - a **Description**: required, trimmed, at most 255 characters;
  - a **Cost**: required, $0.00 or more, at most 2 decimal places.

  They are listed in the order they were entered.
- **FR-002**: The participant **Edit** dialog on View Trip MUST have an **Add-on expenses** section after **Participant cost**:
  - one row per expense, with **Description**, **Cost**, and a remove button;
  - an **Add expense** button that adds an empty row;
  - an "Add-on total: $X.XX" line.

  **Save** saves the whole list together with the rest of the dialog. Rows left completely blank are ignored. A row with only one of the two fields filled shows "Each add-on expense needs a description and a cost of $0 or more." and nothing is saved.
- **FR-003**: `PUT /trips/trip-people-roles/:id` MUST accept `addonExpenses` (an array of `{ description, cost }`) and replace the application's add-on expenses with it. When `addonExpenses` is not sent, the list is unchanged. An invalid row → `400` "Each add-on expense needs a description and a cost of $0 or more.", and nothing in the request is saved. Who may call it is unchanged (trip staff).
- **FR-004**: `GET /trips/trip-people-roles?tripId=` (roster) and `GET /trips/trip-people-roles/:id` MUST return each application's `addonExpenses` (`id`, `description`, `cost`, in order).
- **FR-005**: The participant's own application save (`POST`/`PUT` browse apply and edit) MUST NOT change add-on expenses.
- **FR-006**: Deleting an application MUST delete its add-on expenses.

**One total trip cost**

- **FR-007**: One shared calculation MUST define, for an application:
  - **participant cost**: the application's participant cost, otherwise the trip's (unknown when neither is set);
  - **airfare**: the participant's flight cost when the application says the organization books the flight and a cost is entered, otherwise $0;
  - **add-on total**: the sum of the application's add-on expenses;
  - **total trip cost** = participant cost + airfare + add-on total (unknown when participant cost is unknown);
  - **amount owed** = total trip cost − amount raised (all donations for the participant on the trip), never below $0 (unknown when total trip cost is unknown).

  Trip options are **not** added separately; they are already in the participant cost.
- **FR-008**: These MUST use the FR-007 amount owed:
  - the **Trip Status** board **Amount owed** column;
  - the **My Trips** next step "Make a donation: $X still owed." and whether "You are all ready for the trip." shows;
  - the `{{PARTICIPANT_AMOUNT_OWED}}` token;
  - the **payment-complete** event email (sent when amount owed goes from above $0 to $0 with a new donation);
  - the **payment-due** scheduled email (approved participants with amount owed above $0).

  The **View Trip** participant list MUST show a **Total cost** column right after **Participant cost** with each application's FR-007 total trip cost ("—" when unknown); the roster (`GET /trips/trip-people-roles?tripId=`) returns it as `totalTripCost`. When the total is known, an info icon next to it shows on hover the cost details, one line each with its amount:
  - **Trip cost** (the trip's participant cost, when set);
  - **Trip option: <description>** for each selected trip option;
  - **Cost adjustment** when the participant cost differs from trip cost + selected options (a staff override; may be negative);
  - **Add-on: <description>** for each add-on expense;
  - **Flight** (FR-007 airfare);
  - **Total**.

  The **Trip Status** board MUST show the same **Total cost** column with the same icon and details, followed by **Amount raised** then **Amount owed**.

  The roster and the Trip Status participants return these as `costBreakdown` (`tripCost`, `tripOptions` and `addonExpenses` as `{ description, amount }`, `adjustment`, `airfare`, `totalTripCost`).

  The **Trips** list **Total cost** column MUST be the sum of the FR-007 total trip cost of the trip's approved Trip Leaders and Trip Participants.
- **FR-009**: The email statement tokens MUST use FR-007:
  - `{{PARTICIPANT_TOTAL_TRIP_COST}}` = total trip cost;
  - `{{PARTICIPANT_BALANCE_DUE}}` = total trip cost − participant donations total − trip donations total, never below $0.00.

  `{{PARTICIPANT_TRIP_COST}}`, `{{PARTICIPANT_TRIP_OPTIONS}}`, `{{PARTICIPANT_TRIP_OPTIONS_TOTAL}}`, and `{{PARTICIPANT_TRIP_AIRFARE}}` keep their values; trip options remain an itemized list that is included in the trip cost.
- **FR-010**: Deposit checks (deposit-received event, deposit-due schedule, "Make your deposit" next step) are unchanged: they compare amount raised with the trip deposit.

**Email tokens**

- **FR-011**: New value sources and seeded tokens:
  - `{{ADDON_EXPENSE}}` (value source **Participant add-on expenses**): one line per add-on expense, `<description>: <cost>` (for example "Travel insurance: $75.00"), in order; blank when there are none.
  - `{{ADDON_EXPENSE_TOTAL}}` (value source **Participant add-on expenses total**): the add-on total, `$0.00` when there are none.

  Both use the participant's earliest assignment on the trip (like the other participant financial tokens) and are blank when the email has no trip or participant. The token seed adds both codes, and they appear in **Insert token** and **Preview** like other tokens.

**My Trip Info**

- **FR-012**: `GET /trips/trips/browse/:id` `myTripInfo` MUST add `addonExpenses` (`description`, `cost`) and `totalTripCost` (FR-007).
- **FR-013**: **My Trip Info** on the trip page:
  - **Your trip cost** shows the FR-007 total trip cost;
  - an **Add-on expenses** part (after **Trip options**, only when there are any) lists each as `<description> ($X.XX)`.

---

## Assumptions

- Add-on costs are charges, not discounts; negative amounts are not allowed.
- Airfare is now included in amount owed (it already was in the email statement total). Organizations that book flights will see amounts owed rise by the entered flight cost.
- Participants whose application was added by staff have participant cost = the trip cost (or the staff override); options chosen later by the participant are added when they edit their application, as today.
- The **Participant cost** column on View Trip and the participant CSV keep showing participant cost; View Trip shows the total in its own **Total cost** column.

## Edge Cases

- No add-on expenses → totals as FR-007 with add-on total $0; `{{ADDON_EXPENSE}}` blank, `{{ADDON_EXPENSE_TOTAL}}` "$0.00"; no **Add-on expenses** part in My Trip Info.
- Add-on with cost $0.00 → allowed; listed as "$0.00".
- Participant cost unknown (no trip or application cost) → total and amount owed stay unknown/blank, as today, even with add-ons.
- An add-on is added after the participant had paid in full → amount owed rises above $0; My Trips shows "Make a donation"; payment-due emails resume. No email is sent by the add-on itself.
- A donation pays off the last of the add-ons → payment-complete is sent once.
- Description longer than 255 characters → `400`, nothing saved.
- Two staff edit the same participant → the existing optimistic-concurrency rule on the application applies; the add-on list is saved with the rest of that update.

## Success Criteria

- **SC-001**: For any participant, Trip Status, My Trips, My Trip Info, and every email show the same total and amount owed.
- **SC-002**: The email statement no longer counts trip options twice.
- **SC-003**: Automated tests for every scenario below pass, and existing tests still pass (tests that expected the old totals are updated to FR-007).

---

## Data Ownership & Isolation

Add-on expenses belong to one application. Only trip staff (Trip Leader of the trip, Org Admin of its organization, System Admin) can add, change, or remove them. The participant sees their own in My Trip Info and in emails sent to them; teammates never see them.

---

## Key Entities

- **Trip people role expense** (new, `tripPeopleRoleExpense`) — one add-on expense on an application
- **Trip people role** — participant cost, flight purchase option (read)
- **Trip flight** — cost (read, for airfare)
- **Email token** — two new seeded tokens

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `PUT` | `/trips/trip-people-roles/:id` | auth (trip staff) | Accepts `addonExpenses` and replaces the list; `400` on an invalid row (FR-003) |
| `GET` | `/trips/trip-people-roles` | auth (trip staff) | Each row adds `addonExpenses` (FR-004), `totalTripCost` and `costBreakdown` (FR-008) |
| `GET` | `/trips/trip-people-roles/:id` | auth (trip staff) | Adds `addonExpenses` (FR-004) |
| `GET` | `/trips/trips` | auth | `totalParticipantCost` sums FR-007 total trip costs (FR-008) |
| `GET` | `/trips/trips/:id/status` | auth (trip staff) | `amountOwed` per FR-007; participants add `totalTripCost` and `costBreakdown` (FR-008) |
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo` adds `addonExpenses` and `totalTripCost`; `nextActions` amount owed per FR-007 (FR-008, FR-012) |
| `GET` | `/trips/trips/browse` (My Trips) | auth | `nextActions` amount owed per FR-007 (FR-008) |

Email token preview and sending use the new and changed token values (FR-009, FR-011).

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Edit participant dialog (View Trip) | **Add-on expenses** section after **Participant cost**: rows with **Description**, **Cost**, remove; **Add expense**; "Add-on total" (FR-002) |
| View Trip participant list | **Total cost** column after **Participant cost**, with an info icon showing the cost details on hover (FR-008) |
| Trips list | **Total cost** sums FR-007 total trip costs (FR-008) |
| Trip Status board | **Total cost** column with the details icon, then **Amount raised**, then **Amount owed** per FR-007 (FR-008) |
| Home (My Trips) | "Make a donation" amount per FR-007 |
| Trip page — My Trip Info | **Your trip cost** = total; **Add-on expenses** list (FR-013) |
| Email templates | **Insert token** lists the two new tokens |

---

## Data Model Requirements

New table `tripPeopleRoleExpenses` (model `tripPeopleRoleExpense`), created by `ensureSchema`:

| Field | Type | Rules |
|-------|------|-------|
| id | INTEGER PK | autoIncrement |
| tripPeopleRoleId | INTEGER | required FK → tripPeopleRole, `ON DELETE CASCADE` |
| description | STRING(255) | required |
| cost | DECIMAL(10,2) | required, ≥ 0 |

**Associations:** `tripPeopleRole` `hasMany` `tripPeopleRoleExpense` as `addonExpenses`; expense `belongsTo` `tripPeopleRole`.

Email token seed adds `ADDON_EXPENSE` → `participant.addonExpenses` and `ADDON_EXPENSE_TOTAL` → `participant.addonExpensesTotal` (existing token rows are not changed).

---

## Acceptance Criteria (Gherkin)

Background for the scenarios below:
- Trip "Guatemala Hospital Ezel" costs $2,000 with a $300 deposit.
- Nora is an approved Trip Participant whose application's participant cost is $2,250 (trip cost + Private room $250), with flight purchase option `organization`.
- Nora's flight cost is $850.

### US-74.1 — Staff add add-on expenses to a participant

#### Scenario: Staff save add-on expenses on a participant
* **Given** a Trip Leader of the trip
* **When** they update Nora's application with add-on expenses "Travel insurance" $75 and "Antigua weekend excursion" $400
* **Then** the roster row for Nora returns both add-on expenses in that order

#### Scenario: Saving a shorter list removes add-on expenses
* **Given** Nora has the two add-on expenses above
* **When** a Trip Leader updates Nora's application with only "Travel insurance" $75
* **Then** Nora has one add-on expense, "Travel insurance" $75

#### Scenario: An invalid add-on expense is refused
* **When** a Trip Leader updates Nora's application with status "approved" and an add-on expense with a description and no cost
* **Then** the response is `400` "Each add-on expense needs a description and a cost of $0 or more."
* **And** Nora's application and add-on expenses are unchanged

#### Scenario: The participant's own application edit keeps add-on expenses
* **Given** Nora has the two add-on expenses above
* **When** Nora edits and saves her own application
* **Then** she still has both add-on expenses

#### Scenario: Deleting the application deletes its add-on expenses
* **Given** Nora has the two add-on expenses above
* **When** staff delete Nora's application
* **Then** no add-on expenses remain for it

#### Scenario: Edit dialog adds and removes add-on expenses
* **Given** the Edit participant dialog is open for Nora
* **When** staff click **Add expense** twice, fill "Travel insurance" $75 and "Antigua weekend excursion" $400, remove the second row, and click **Save**
* **Then** the update is sent with `addonExpenses` [{ "Travel insurance", 75 }]
* **And** "Add-on total: $75.00" was shown before saving

### US-74.2 — Every total includes add-on expenses

Nora has add-on expenses "Travel insurance" $75 and "Antigua weekend excursion" $400 and $1,000 in donations.

#### Scenario: Trip Status amount owed includes airfare and add-on expenses
* **When** a Trip Leader opens the Trip Status board
* **Then** Nora's amount owed is 2,575 ($2,250 + $850 + $475 − $1,000)

#### Scenario: View Trip roster returns each participant's total cost
* **When** a Trip Leader loads the View Trip participant list
* **Then** Nora's row has participant cost 2,250 and total trip cost 3,575

#### Scenario: View Trip shows each participant's total cost
* **When** staff open View Trip
* **Then** the participant list has a **Total cost** column right after **Participant cost**
* **And** Nora's row shows "$2,250.00" then "$3,575.00"

#### Scenario: Total cost icon lists the participant's cost details
* **When** staff hover the info icon next to Nora's total cost
* **Then** it lists Trip cost $2,000.00, Trip option: Private room $250.00, Add-on: Travel insurance $75.00, Add-on: Antigua weekend excursion $400.00, Flight $850.00, and Total $3,575.00

#### Scenario: Trip Status shows each participant's total cost with its details
* **When** staff open the Trip Status board
* **Then** the columns **Total cost**, **Amount raised**, and **Amount owed** come in that order
* **And** hovering the icon next to Nora's total lists her cost details as on View Trip

#### Scenario: Total cost details show a staff cost override as an adjustment
* **Given** staff set Nora's participant cost to $2,100
* **When** a Trip Leader loads the View Trip participant list
* **Then** Nora's cost details have a cost adjustment of −150 and a total of 3,425

#### Scenario: Trips list total cost includes airfare and add-on expenses
* **Given** the trip's only other approved member is a Trip Leader with no participant cost of their own
* **When** staff open the Trips list
* **Then** the trip's total cost is 5,575 ($2,000 for the leader + $3,575 for Nora)

#### Scenario: My Trips next step uses the full amount owed
* **When** Nora opens My Trips
* **Then** her next step is "Make a donation: $2,575.00 still owed."

#### Scenario: Email totals include add-on expenses and count trip options once
* **When** the tokens are filled for Nora
* **Then** `{{PARTICIPANT_TOTAL_TRIP_COST}}` is "$3,575.00"
* **And** `{{PARTICIPANT_BALANCE_DUE}}` is "$2,575.00"
* **And** `{{PARTICIPANT_AMOUNT_OWED}}` is "$2,575.00"

#### Scenario: Payment complete waits for the add-on expenses
* **Given** Nora has raised $3,100 (owing $475, the add-ons)
* **When** a $400 donation is recorded for Nora
* **Then** no payment-complete email is sent
* **When** a $75 donation is then recorded for Nora
* **Then** a payment-complete email is sent

#### Scenario: Payment-due reminder includes a participant who owes only add-on expenses
* **Given** Nora has raised $3,100
* **And** a weekly Scheduled payment-due template
* **When** the scheduled job runs on a Tuesday
* **Then** Nora is a recipient

### US-74.3 — Email tokens list add-on expenses

#### Scenario: Add-on expense tokens list each expense and the total
* **When** the tokens are filled for Nora
* **Then** `{{ADDON_EXPENSE}}` is "Travel insurance: $75.00" and "Antigua weekend excursion: $400.00" on separate lines
* **And** `{{ADDON_EXPENSE_TOTAL}}` is "$475.00"

#### Scenario: Add-on expense tokens with no add-on expenses
* **Given** Rita has no add-on expenses
* **When** the tokens are filled for Rita
* **Then** `{{ADDON_EXPENSE}}` is blank
* **And** `{{ADDON_EXPENSE_TOTAL}}` is "$0.00"

### US-74.4 — Participants see their add-on expenses

#### Scenario: My Trip Info returns add-on expenses and the total trip cost
* **When** Nora requests `GET /trips/trips/browse/:id`
* **Then** `myTripInfo.addonExpenses` lists both add-on expenses
* **And** `myTripInfo.totalTripCost` is 3575

#### Scenario: My Trip Info shows add-on expenses and the total trip cost
* **When** Nora opens the trip page
* **Then** **My Trip Info** shows "Travel insurance ($75.00)" and "Antigua weekend excursion ($400.00)" under **Add-on expenses**
* **And** **Your trip cost** is "$3,575.00"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-74.1 | Staff save add-on expenses on a participant | `backend/tests/trip-addon-expenses.test.js` | `Staff save add-on expenses on a participant` |
| US-74.1 | Saving a shorter list removes add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Saving a shorter list removes add-on expenses` |
| US-74.1 | An invalid add-on expense is refused | `backend/tests/trip-addon-expenses.test.js` | `An invalid add-on expense is refused` |
| US-74.1 | The participant's own application edit keeps add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `The participant's own application edit keeps add-on expenses` |
| US-74.1 | Deleting the application deletes its add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Deleting the application deletes its add-on expenses` |
| US-74.1 | Edit dialog adds and removes add-on expenses | `frontend/tests/EditTripParticipantDialog.test.js` | `Edit dialog adds and removes add-on expenses` |
| US-74.2 | Trip Status amount owed includes airfare and add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Trip Status amount owed includes airfare and add-on expenses` |
| US-74.2 | View Trip roster returns each participant's total cost | `backend/tests/trip-addon-expenses.test.js` | `View Trip roster returns each participant's total cost` |
| US-74.2 | View Trip shows each participant's total cost | `frontend/tests/TripView.test.js` | `View Trip shows each participant's total cost` |
| US-74.2 | Total cost icon lists the participant's cost details | `frontend/tests/TripView.test.js` | `Total cost icon lists the participant's cost details` |
| US-74.2 | Trip Status shows each participant's total cost with its details | `frontend/tests/TripStatus.test.js` | `Trip Status shows each participant's total cost with its details` |
| US-74.2 | Total cost details show a staff cost override as an adjustment | `backend/tests/trip-addon-expenses.test.js` | `Total cost details show a staff cost override as an adjustment` |
| US-74.2 | Trips list total cost includes airfare and add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Trips list total cost includes airfare and add-on expenses` |
| US-74.2 | My Trips next step uses the full amount owed | `backend/tests/trip-addon-expenses.test.js` | `My Trips next step uses the full amount owed` |
| US-74.2 | Email totals include add-on expenses and count trip options once | `backend/tests/trip-addon-expenses.test.js` | `Email totals include add-on expenses and count trip options once` |
| US-74.2 | Payment complete waits for the add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Payment complete waits for the add-on expenses` |
| US-74.2 | Payment-due reminder includes a participant who owes only add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Payment-due reminder includes a participant who owes only add-on expenses` |
| US-74.3 | Add-on expense tokens list each expense and the total | `backend/tests/trip-addon-expenses.test.js` | `Add-on expense tokens list each expense and the total` |
| US-74.3 | Add-on expense tokens with no add-on expenses | `backend/tests/trip-addon-expenses.test.js` | `Add-on expense tokens with no add-on expenses` |
| US-74.4 | My Trip Info returns add-on expenses and the total trip cost | `backend/tests/trip-addon-expenses.test.js` | `My Trip Info returns add-on expenses and the total trip cost` |
| US-74.4 | My Trip Info shows add-on expenses and the total trip cost | `frontend/tests/MyTripTravelDetails.test.js` | `My Trip Info shows add-on expenses and the total trip cost` |

---

## Agent implementation request

```text
Implement Feature 74 from @features/feature-74-trip-addon-expenses.md on branch `feature/74-trip-addon-expenses`.

Follow layer order in @features/framework.md.
Data: tripPeopleRoleExpense model + association (addonExpenses), ensureSchema creates the table with ON DELETE CASCADE; seedEmailTokens adds ADDON_EXPENSE and ADDON_EXPENSE_TOTAL; emailTokenValues adds the two value sources.
Backend: one shared helper for FR-007 (participant cost, airfare, add-on total, total trip cost, amount owed) used by trip.controller findStatus, myTripNextActions, emailTokenValues (amount owed, total trip cost, balance due, add-on tokens), eventEmails payment-complete, scheduledEmails payment-due, and tripBrowse myTripInfo. tripPeopleRole.controller update accepts and validates addonExpenses (replace list in the same transaction); roster and findOne include addonExpenses. Browse apply/edit must not touch add-ons.
Frontend: EditTripParticipantDialog Add-on expenses section (FR-002); MyTripTravelDetails Add-on expenses part and TripBrowseView Your trip cost = totalTripCost (FR-013).
Map every Gherkin scenario in the Test Coverage Map; update existing tests that assert the old totals; run backend and frontend `npm test` before finishing.
Living reference: data-model.md (new table, token seeds), api.md (rows above), behavior.md (Feature 74 row; update the financial statement row, Trip Status, My Trips next actions, scheduled and event email rows).
Do not change deposit logic, the participant CSV, the View Trip participant cost column, or how participant cost is saved on apply/edit.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md`, `api.md`, `behavior.md`

---

## Definition of Done

*   [x] Add-on expenses stored, saved, validated, and returned per **FR-001**–**FR-006**
*   [x] One total trip cost and amount owed per **FR-007**, used everywhere per **FR-008**, **FR-009**; deposit unchanged per **FR-010**
*   [x] `{{ADDON_EXPENSE}}` and `{{ADDON_EXPENSE_TOTAL}}` per **FR-011**
*   [x] My Trip Info per **FR-012**, **FR-013**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/data-model.md`, `api.md`, and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Trip-wide add-on expenses that apply to every participant automatically
- Discounts or negative add-on amounts
- Participants adding or editing their own add-on expenses
- Showing add-on expenses or the total in the participant CSV or PDFs
- Emails sent just because an add-on expense was added or changed
- Changing how participant cost is saved when a participant applies or edits (trip cost + selected options)
