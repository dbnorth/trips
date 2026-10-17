# Feature: Participant Financial Statement Email Tokens

**Feature ID:** 52
**Branch pattern:** `feature/52-participant-financial-tokens`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Add email value sources and tokens so a template can be a trip financial statement for a participant: trip cost, trip options (each selected trip option with its amount), airfare (when the participant does not pay for the flight), total trip cost, participant donations (money from the participant), trip donations (money from others), and the balance due.
**Depends on:** [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md)

---

## User Stories

### US-52.1: Send a participant their trip financial statement
**As an** Org Admin
**I want** email tokens for a participant's costs, their own donations, donations from others, and balance
**So that** a template can show each participant what the trip costs them, what they have paid, and what they still owe

**Priority:** P1
**Independent test:** A template body with `{{PARTICIPANT_TOTAL_TRIP_COST}}` and `{{PARTICIPANT_BALANCE_DUE}}`, previewed or sent for a participant with a $1,500.00 trip cost, a $200.00 trip option, $800.00 airfare bought by the organization, and $1,000.00 received, shows `$2,500.00` and `$1,500.00`.
**Acceptance scenarios:** see ### US-52.1

---

## Requirements

### Functional Requirements

- **FR-001**: The value source catalog (Feature 40) MUST add the value sources below. All amounts use the existing money format (for example `$1,250.00`). Like the existing amount raised and amount owed, they use the participant's earliest assignment on the trip.

  | Value source | Label | Value |
  |--------------|-------|-------|
  | `participant.tripCost` | Participant trip cost | The participant's cost: the assignment's participant cost, otherwise the trip's participant cost (same rule as amount owed). Blank when unknown |
  | `participant.tripOptions` | Participant trip options | One line per trip option the participant selected (Feature 7): `<description>: <price adjustment>`, ordered by set number, then option order. Blank when none are selected |
  | `participant.tripOptionsTotal` | Participant trip options total | Sum of the selected options' price adjustments; `$0.00` when none |
  | `participant.airfare` | Participant trip airfare | The participant's flight cost (Feature 30) when their application says the **organization** buys the flight and the flight has a cost; otherwise `$0.00` |
  | `participant.totalTripCost` | Participant total trip cost | Trip cost + trip options total + airfare. Blank when the trip cost is unknown |
  | `participant.donations` | Participant donations | One line per participant donation, oldest first: `<date>: <amount>` (date like `October 17, 2026`). Blank when none |
  | `participant.donationsTotal` | Participant donations total | Sum of participant donations; `$0.00` when none |
  | `participant.tripDonations` | Participant trip donations | One line per trip donation, oldest first: `<date>: <amount>`. Blank when none |
  | `participant.tripDonationsTotal` | Participant trip donations total | Sum of trip donations; `$0.00` when none |
  | `participant.balanceDue` | Participant balance due | Total trip cost − participant donations total − trip donations total, never below `$0.00`. Blank when the trip cost is unknown |

- **FR-002**: A **participant donation** is a donation (Feature 8) for this trip and participant whose donor's email matches the participant's email, ignoring case and surrounding spaces. Every other donation for this trip and participant is a **trip donation**, including donations with no donor or no donor email. When the participant has no email, every donation is a trip donation.
- **FR-003**: List values separate their lines with a line break, so each item shows on its own line in the email and in Preview.
- **FR-004**: The token seed MUST add these tokens (only when missing, like other seed tokens):

  | Token code | Value source |
  |------------|--------------|
  | `PARTICIPANT_TRIP_COST` | `participant.tripCost` |
  | `PARTICIPANT_TRIP_OPTIONS` | `participant.tripOptions` |
  | `PARTICIPANT_TRIP_OPTIONS_TOTAL` | `participant.tripOptionsTotal` |
  | `PARTICIPANT_TRIP_AIRFARE` | `participant.airfare` |
  | `PARTICIPANT_TOTAL_TRIP_COST` | `participant.totalTripCost` |
  | `PARTICIPANT_DONATIONS` | `participant.donations` |
  | `PARTICIPANT_DONATIONS_TOTAL` | `participant.donationsTotal` |
  | `PARTICIPANT_TRIP_DONATIONS` | `participant.tripDonations` |
  | `PARTICIPANT_TRIP_DONATIONS_TOTAL` | `participant.tripDonationsTotal` |
  | `PARTICIPANT_BALANCE_DUE` | `participant.balanceDue` |

- **FR-005**: The new values MUST work everywhere tokens are filled: template Preview (Feature 40), and event, scheduled, and team emails (Features 44–46).
- **FR-006**: Existing values MUST NOT change. **Participant amount raised** stays the sum of all donations, and **Participant amount owed** stays the participant cost minus amount raised (it does not include trip options or airfare). The Trip Status board and scheduled `payment-due` emails are unchanged.
- **FR-007**: The email type seed MUST add `financial-statement` (description **Trip financial statement**, event code `team-email`, which nothing sends automatically), only when missing.
- **FR-008**: The email template seed MUST add a **Trip Participant** template (Feature 46) of type `financial-statement` for the seed organization, only when missing. From `{{ORG_EMAIL}}`, To `{{PARTICIPANT_EMAIL}}`, subject `Your {{TRIP_NAME}} financial statement`. The body greets the participant, gives the trip name, location, dates, and the participant's trip role, then lists trip cost, trip options with their total, airfare, total trip cost, participant donations with their total, trip donations with their total, and balance due, then gives giving information (`{{ORG_WEBSITE}}`) and the primary trip leader's contact. Org Admins send it from **Email team**, so each participant gets their own statement.
---

## Assumptions

- Trip options are the options shown under **Trip options** on the trip (Feature 6 travel options, `tripTravelOption`) with their price adjustment. A negative price adjustment (a discount) lowers the trip options total.
- Tokens are filled only when a template is previewed or sent for a participant on a trip; with no trip or participant the values are blank, like other participant values.
- Donor names are not shown in the participant donations or trip donations lists.

## Edge Cases

- Participant selected no trip options → trip options blank, trip options total `$0.00`.
- Application says the participant buys their own flight, or no purchase option is set → airfare `$0.00` even when a flight cost is entered.
- Organization buys the flight but no cost is entered yet → airfare `$0.00`.
- Participant donations and trip donations exceed the total trip cost → balance due `$0.00`.
- Donor email `Ana@Example.org ` and participant email `ana@example.org` → a participant donation.
- Trip and assignment have no participant cost → trip cost, total trip cost, and balance due are blank; the other values still show.

## Success Criteria

- **SC-001**: An Org Admin can write one template that shows a participant's full financial statement.
- **SC-002**: Existing tokens and money rules are unchanged.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

No change. Values are only filled for the participant the email is sent to or previewed for.

---

## API Requirements

No new endpoints. `GET /trips/email-tokens/value-sources` (Feature 40) lists the new value sources.

---

## Screen Requirements

No new screens. The token form's **Value source** list and the template **Insert token** list show the new entries; Preview shows list values one item per line.

---

## Data Model Requirements

No database changes. New `emailToken` rows come from the token seed; the `financial-statement` `emailType` row and its `emailTemplate` row come from the email type and email template seeds.

---

## Acceptance Criteria (Gherkin)

### US-52.1 — Send a participant their trip financial statement

#### Scenario: Statement values for a participant
* **Given** a trip with participant cost `1500`
* **And** Ana is a Trip Participant on the trip with selected trip options "Single room" (`200`) and "Travel insurance" (`75`)
* **And** Ana's application says the organization buys the flight and her flight cost is `800`
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_TRIP_COST}}` is `$1,500.00`
* **And** `{{PARTICIPANT_TRIP_OPTIONS}}` is "Single room: $200.00" and "Travel insurance: $75.00" on separate lines
* **And** `{{PARTICIPANT_TRIP_OPTIONS_TOTAL}}` is `$275.00`
* **And** `{{PARTICIPANT_TRIP_AIRFARE}}` is `$800.00`
* **And** `{{PARTICIPANT_TOTAL_TRIP_COST}}` is `$2,575.00`

#### Scenario: Airfare is not charged when the participant buys the flight
* **Given** Ana's application says she buys her own flight
* **And** her flight cost is `800`
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_TRIP_AIRFARE}}` is `$0.00`
* **And** the airfare is not in `{{PARTICIPANT_TOTAL_TRIP_COST}}`

#### Scenario: Participant donations and trip donations are listed separately
* **Given** Ana's email is `ana@example.org`
* **And** a donation of `300` on October 1, 2026 from a donor with email `Ana@Example.org`
* **And** a donation of `250` on October 5, 2026 from a donor with email `mary@example.org`
* **And** a donation of `50` on October 9, 2026 with no donor
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_DONATIONS}}` is "October 1, 2026: $300.00"
* **And** `{{PARTICIPANT_DONATIONS_TOTAL}}` is `$300.00`
* **And** `{{PARTICIPANT_TRIP_DONATIONS}}` is "October 5, 2026: $250.00" and "October 9, 2026: $50.00" on separate lines
* **And** `{{PARTICIPANT_TRIP_DONATIONS_TOTAL}}` is `$300.00`

#### Scenario: Balance due
* **Given** Ana's total trip cost is `$2,575.00`
* **And** her participant donations total `$300.00` and her trip donations total `$300.00`
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_BALANCE_DUE}}` is `$1,975.00`

#### Scenario: Balance due never goes below zero
* **Given** Ana's total trip cost is `$1,500.00`
* **And** her participant donations and trip donations total `$1,600.00`
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_BALANCE_DUE}}` is `$0.00`

#### Scenario: Nothing selected or received
* **Given** Ana has no selected trip options, no flight, and no donations
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_TRIP_OPTIONS}}`, `{{PARTICIPANT_DONATIONS}}`, and `{{PARTICIPANT_TRIP_DONATIONS}}` are blank
* **And** `{{PARTICIPANT_TRIP_OPTIONS_TOTAL}}`, `{{PARTICIPANT_TRIP_AIRFARE}}`, `{{PARTICIPANT_DONATIONS_TOTAL}}`, and `{{PARTICIPANT_TRIP_DONATIONS_TOTAL}}` are `$0.00`

#### Scenario: Existing amount owed is unchanged
* **Given** Ana's trip cost is `$1,500.00`, she has a `$200.00` trip option, and she has received `$300.00`
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_AMOUNT_OWED}}` is `$1,200.00`

#### Scenario: Token seed adds the financial tokens
* **Given** none of the financial tokens exist
* **When** the token seed runs
* **Then** all ten tokens in **FR-004** exist with their value sources

#### Scenario: Seed adds the financial statement template
* **Given** the seed organization exists
* **When** the email type, token, and template seeds run
* **Then** email type `financial-statement` exists with event code `team-email`
* **And** the organization has a **Trip Participant** template of that type, from `{{ORG_EMAIL}}` to `{{PARTICIPANT_EMAIL}}`, with subject `Your {{TRIP_NAME}} financial statement`
* **And** its body uses `{{TRIP_NAME}}`, `{{TRIP_LOCATION}}`, `{{TRIP_START_DATE}}`, `{{TRIP_END_DATE}}`, and all ten tokens in **FR-004**

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-52.1 | Statement values for a participant | `backend/tests/email-financial-tokens.test.js` | `Statement values for a participant` |
| US-52.1 | Airfare is not charged when the participant buys the flight | `backend/tests/email-financial-tokens.test.js` | `Airfare is not charged when the participant buys the flight` |
| US-52.1 | Participant donations and trip donations are listed separately | `backend/tests/email-financial-tokens.test.js` | `Participant donations and trip donations are listed separately` |
| US-52.1 | Balance due | `backend/tests/email-financial-tokens.test.js` | `Balance due` |
| US-52.1 | Balance due never goes below zero | `backend/tests/email-financial-tokens.test.js` | `Balance due never goes below zero` |
| US-52.1 | Nothing selected or received | `backend/tests/email-financial-tokens.test.js` | `Nothing selected or received` |
| US-52.1 | Existing amount owed is unchanged | `backend/tests/email-financial-tokens.test.js` | `Existing amount owed is unchanged` |
| US-52.1 | Token seed adds the financial tokens | `backend/tests/email-financial-tokens.test.js` | `Token seed adds the financial tokens` |
| US-52.1 | Seed adds the financial statement template | `backend/tests/email-financial-tokens.test.js` | `Seed adds the financial statement template` |

---

## Agent implementation request

```text
Implement Feature 52 from @features/feature-52-participant-financial-tokens.md on branch `feature/52-participant-financial-tokens`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (value sources list), `features/reference/behavior.md` (financial statement values, participant donation vs trip donation rule)

---

## Definition of Done

*   [x] Ten value sources with the values in **FR-001**, participant donation rule in **FR-002**, line-break lists (**FR-003**)
*   [x] Token seed adds the ten tokens (**FR-004**); run `npm run seed` after deploy
*   [x] Email type and template seeds add the financial statement template (**FR-007**, **FR-008**)
*   [x] Values filled in Preview and all sent emails (**FR-005**); existing values unchanged (**FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend
*   [ ] On `feature/52-participant-financial-tokens`; PR → `dev`

---

## Out of Scope

- A type field on donations (participant donations are found by donor email only)
- Changing amount owed, the Trip Status board, or scheduled `payment-due` emails to include trip options or airfare
- Donor names in the lists
- HTML tables or other formatting beyond one item per line
- Sending the statement automatically (it is sent from **Email team**)
