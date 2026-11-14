# Feature: Participant Home Trip Cards

**Feature ID:** 138
**Branch pattern:** `feature/138-participant-home-trip-cards`
**Status:** Implemented
**Created:** 2026-11-13
**Input:** "Make the participant home page easier to use: one card per trip with the soonest trip first, the next step as the main button, a short progress line once the person is on the trip, apply-for trips as a short list, and the profile warning naming what is missing."
**Depends on:** [Feature 7 — Trip Applications](feature-7-trip-applications-and-participants.md), [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md), [Feature 74 — Trip Add-on Expenses](feature-74-trip-add-on-expenses.md), [Feature 95 — Role Availability](feature-95-role-availability.md), [Feature 112 — My Trip Documents](feature-112-my-trip-documents.md)

Participant Home lists **My Trips** and **Trips you can apply for** as compact tables with icon actions. This feature replaces those two tables with cards. Next-step messages, status names, and the **My Trip** page stay as they are.

## Clarifications

- Q: Which home changes? → A: The participant Home only (the **Trips** card with **My Trips** and **Trips you can apply for**). Trip Leader, Org Admin, Agent, and System Admin homes stay as they are.
- Q: What is on a My Trips card? → A: Trip name (link to **My Trip**), location, one date line, the status chip, the existing next-step block, and one row of filled buttons: **Open My Trip**, **Uncancel** when cancelled, **Update App** or **View App** when that action is not already on the next step, and **Cancel App** when cancel is allowed. No picture. No **More** button.
- Q: What is the date line? → A: The existing date form, "04/22/2026 – 04/26/2026", then a phrase: "160 days away", "1 day away", "Starts today", "In progress", or "Ended".
- Q: What is the main button? → A: Each next-step message keeps its button (**Update App**, **Submit App**, **Update Documents**, **Donate**). **Cancel App** is on the same row as **Open My Trip**, not beside the next-step message. Icon-only row actions go away on these two lists.
- Q: What progress shows? → A: On a Pre-Approved or Approved card, a money line and a documents line when the next step does not already say that fact, and on an Approved card a departure line when an Arrival segment has a departure airport.
- Q: How do apply-for trips look? → A: Cards, soonest first. Trips the person can apply for come before trips with no spot. The availability sentence stays. The name opens the trip page. **Apply** or **Apply for Reserved** is a labeled button. A trip picture shows when the trip has one.
- Q: What does the profile warning add? → A: The same **Missing:** list the profile already shows, under "Please update your profile to continue."
- Q: Does Home title the section or name the organization? → A: No **Trips** title, and no organization name when the person belongs to one organization. The **Organization** list stays when they belong to more than one.

---

## User Stories

### US-138.1: See each of my trips as a card

**As** a participant
**I want** each of my trips as a card, soonest first, with the next step on the card
**So that** I can see what to do without reading a table

**Priority:** P1
**Independent test:** Home shows the soonest upcoming trip first, with its date line, status, next-step message, and **Open My Trip**.
**Acceptance scenarios:** see ### US-138.1

### US-138.2: See progress once I am on the trip

**As** a participant who is Pre-Approved or Approved
**I want** a short line for money, documents, and my first flight when those are not already in the next step
**So that** a ready trip still tells me what I need

**Priority:** P1
**Independent test:** An all-ready trip card shows the raised total, the document count, and the first departure.
**Acceptance scenarios:** see ### US-138.2

### US-138.3: Scan trips I can apply for

**As** a participant
**I want** open trips as a short list with one **Apply** button
**So that** I can apply without a second table

**Priority:** P1
**Independent test:** A trip with open spots shows its picture, dates, availability sentence, and **Apply** before a trip with no spots.
**Acceptance scenarios:** see ### US-138.3

### US-138.4: See which profile fields are missing

**As** a participant with an incomplete profile
**I want** Home to name the missing profile fields
**So that** I know what **Update profile** will ask for

**Priority:** P1
**Independent test:** The Home warning lists the same missing labels as the profile.
**Acceptance scenarios:** see ### US-138.4

---

## Requirements

### Functional Requirements

- **FR-001**: Participant Home MUST show **My Trips** as one card per trip, in one column. Upcoming trips (start date today or later) come first, soonest start date first, then name. When **Show all my trips** is ticked, past trips follow, latest start date first, then name. The empty messages and the checkbox label stay as they are.
- **FR-002**: Each My Trips card MUST show the trip name linking to **My Trip**, the location (or "—"), **Role** (the participant's trip role name, or "—" when they have none), the date line, and the status chip with the same label as today. **Approved** is white text on dark green (`#2e7d32`). The other statuses keep their current colors. The date line is the start and end in `MM/dd/yyyy` ("04/22/2026 – 04/26/2026", or the one date that exists). After it: "Starts today" when the start date is today; "1 day away" or "N days away" for a later start; "In progress" when the start date is before today and the end date is today or later (or there is no end date); "Ended" when the end date is before today.
- **FR-003**: A card with next steps MUST show those messages, their buttons, and the yellow / orange / green bar already used for next steps. **Cancel App** MUST NOT appear beside a next step. It MUST appear on the same button row as **Open My Trip**, and confirming it MUST use the same dialog as today. **Open My Trip** MUST be a filled button that opens **My Trip**. **Cancel App** stays red.
- **FR-004**: That same row MUST show **Update App** or **View App** when that action would have appeared on the old row and is not already the button on a next step, and **Cancel App** when cancel is allowed. **Uncancel** on a cancelled trip MUST stay on that row, with the same confirm dialog. There is no **More** button.
- **FR-005**: `GET /trips/trips/browse/mine` MUST add `homeCard` on each trip: `amountRaised` (counted donations for this participant, same source as the deposit next step), `totalTripCost` (the participant's total trip cost, or `null` when unknown), `documentsUploaded` and `documentsRequired` (`null` when this person has no required trip documents; otherwise how many of those requirements are met), and `departure` (`null`, or the Arrival segment with the lowest segment number: `airportCode`, `date`, `time`).
- **FR-006**: A Pre-Approved or Approved card MUST show "$1,200.00 raised of $1,200.00." when `totalTripCost` is a number and the next steps do not include a deposit or donation step. It MUST show "2 of 3 documents uploaded." when `documentsRequired` is greater than 0 and the next steps do not include the missing-documents step. An Approved card MUST show "Departs OKC 04/22/2026 6:03 PM." from `departure` when `airportCode` is present, omitting a missing date or time. Other statuses MUST NOT show these lines.
- **FR-007**: **Trips you can apply for** MUST be cards in one column. Trips with **Apply** or **Apply for Reserved** come first, soonest start date first, then name. Trips with no spot follow, in the same order, with no filled button. Each card shows the picture when the trip has one, the name linking to the trip page, location, the date range, and the existing availability sentence. **Apply** and **Apply for Reserved** stay labeled buttons and open the application as they do today.
- **FR-008**: When the profile is incomplete and the account is linked to a person, the warning MUST keep "Please update your profile to continue." and **Update profile**, and MUST list **Missing:** with the same labels, in the same order, as the profile page. The unlinked-account warning stays as it is.
- **FR-009**: Participant Home MUST NOT show a **Trips** title or the organization name when the person belongs to one organization. When they belong to more than one, the **Organization** list stays.

---

## Assumptions

- Next-step sentences, status names, cancel and uncancel dialogs, and who may apply do not change.
- Days away use the viewer's local calendar date.
- Money uses the same dollar format as the next-step sentences.
- The departure time uses the same hour form as flight times elsewhere ("6:03 PM").
- Feature 60 Home tests keep their messages and colors and look at the card instead of a table row.

## Edge Cases

- A trip with only a start date shows that date, then the days phrase.
- A trip with no dates shows the location and status and no date line.
- `totalTripCost` null → no money line. No required documents → no documents line. No Arrival segment, or no departure airport → no departure line.
- A deposit or donation next step already states the money → no second money line. A missing-documents next step → no "2 of 3 documents uploaded." line.
- **Show all my trips** unticked still hides trips that have already started.
- An apply-for trip with no picture shows the card without an image.
- Several organizations still use the **Organization** list. One organization still shows its name.

## Success Criteria

- **SC-001**: The soonest upcoming trip is the first **My Trips** card and shows its next step.
- **SC-002**: An all-ready Approved trip shows the money, document, and departure lines.
- **SC-003**: A trip the person can apply for appears before a trip with no spots, with **Apply**.
- **SC-004**: The profile warning lists the missing fields.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged. `homeCard` is computed for the signed-in person's own applications in the organization they are browsing. Another person's amounts, documents, and flights are not included.

---

## Key Entities

No new entity. `homeCard` is a read-only summary of the participant's existing cost, required documents, and first Arrival segment.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips/browse/mine` | Each trip adds `homeCard`. |

`homeCard`:

| Field | Meaning |
|-------|---------|
| `amountRaised` | Counted donations for this participant on this trip. |
| `totalTripCost` | Total trip cost, or `null` when unknown. |
| `documentsUploaded` | Requirements met, or `null` when none are required. |
| `documentsRequired` | Requirements for this person on this trip, or `null` when none. |
| `departure` | `null`, or `{ airportCode, date, time }` from the first Arrival segment. `date` is `YYYY-MM-DD` or `null`. `time` is `HH:MM` or `null`. |

No other endpoint changes.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| Home, participant **My Trips** | Cards replace the table. |
| Home, **Trips you can apply for** | Cards replace the table. A picture shows when the trip has one. |
| Home, profile warning | **Missing:** list under the existing sentence. |

**My Trips card**

- Left bar when next steps exist: yellow `#fbc02d` when the person must act, orange `#fb8c00` while waiting on staff, green `#43a047` when ready. No bar when there are no next steps.
- Name links to **My Trip**. **Open My Trip** does the same.
- Status chip unchanged.
- Next-step messages and buttons unchanged, except **Cancel App** is on the button row with **Open My Trip**.
- **Uncancel**, **Update App** or **View App**, and **Cancel App** sit on that same row. There is no **More** button.
- Progress lines, when FR-006 shows them, sit under the next step: the money sentence, then the documents sentence, then "Departs …".

**Trips you can apply for card**

- Picture, name, location, "04/22/2026 – 04/26/2026", then the availability sentence ("6 positions available (2 reserved, 4 open)" or "No roles available").
- **Apply** or **Apply for Reserved** when that button exists today. No **View** icon. The name opens the trip page.

Cards use the full width of the **Trips** card and stack on a narrow screen.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-138.1 — See each of my trips as a card

#### Scenario: Home does not title the section or name the one organization
* **Given** I belong to one organization, Helping Hands
* **When** I open Home
* **Then** the page has no **Trips** title
* **And** it does not show "Helping Hands"

#### Scenario: The soonest trip is the first card
* **Given** I have Guatemala Clinic starting 06/08/2027 and Honduras Clinic starting 07/01/2027
* **When** I open Home
* **Then** Guatemala Clinic is the first **My Trips** card
* **And** its date line is "06/08/2027 – 06/18/2027 · 160 days away" when today is 12/30/2026
* **And** the card shows the trip's status and its next-step message

#### Scenario: Open My Trip opens the trip
* **Given** I am on Home and Guatemala Clinic is one of **My Trips**
* **When** I choose **Open My Trip** on that card
* **Then** **My Trip** opens for Guatemala Clinic

#### Scenario: Cancel App is on the button row
* **Given** my Guatemala Clinic application is Incomplete and the next step is "Submit your application."
* **Then** the card shows **Submit App**
* **And** **Cancel App** is on the same row as **Open My Trip**
* **And** choosing **Cancel App** asks "Cancel this application? Your role slot will be freed."

#### Scenario: Past trips follow upcoming trips
* **Given** I have an upcoming trip and a trip that ended last year
* **When** I tick **Show all my trips**
* **Then** the upcoming trip stays first
* **And** the ended trip follows it with "Ended" on its date line

### US-138.2 — See progress once I am on the trip

#### Scenario: A ready trip shows money, documents, and the departure
* **Given** I am Approved on Guatemala Clinic, the next step is "You are all ready for the trip.", I have raised $1,200.00 of a $1,200.00 total, 3 of 3 documents are uploaded, and my first Arrival segment departs OKC on 04/22/2026 at 6:03 PM
* **When** I open Home
* **Then** the card shows "$1,200.00 raised of $1,200.00."
* **And** the card shows "3 of 3 documents uploaded."
* **And** the card shows "Departs OKC 04/22/2026 6:03 PM."

#### Scenario: The next step already states the money and the missing documents
* **Given** my next steps include "Make your deposit: $400.00 raised of $500.00." and a missing-documents step
* **When** I open Home
* **Then** those next-step messages show
* **And** the card does not also show a raised-of line or a documents-uploaded line

### US-138.3 — Scan trips I can apply for

#### Scenario: An open trip comes before a full trip
* **Given** Clinic A has open spots and starts 06/01/2027, and Clinic B has no roles available and starts 05/01/2027
* **When** I open Home
* **Then** Clinic A appears before Clinic B under **Trips you can apply for**
* **And** Clinic A shows **Apply** and its availability sentence
* **And** Clinic B shows "No roles available" and no **Apply** button

#### Scenario: The trip picture and name open the trip page
* **Given** Clinic A has a picture
* **When** I open Home
* **Then** the Clinic A card shows that picture
* **And** choosing the trip name opens the Clinic A trip page

### US-138.4 — See which profile fields are missing

#### Scenario: The warning lists the missing profile fields
* **Given** my profile is missing Phone number and Emergency contact name
* **When** I open Home
* **Then** the warning says "Please update your profile to continue."
* **And** it lists "Phone number" and "Emergency contact name" under **Missing:**
* **And** **Update profile** is on the warning

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-138.1 | Home does not title the section or name the one organization | `frontend/tests/HomeTripCards.test.js` | `Home does not title the section or name the one organization` |
| US-138.1 | The soonest trip is the first card | `frontend/tests/HomeTripCards.test.js` | `The soonest trip is the first card` |
| US-138.1 | Open My Trip opens the trip | `frontend/tests/HomeTripCards.test.js` | `Open My Trip opens the trip` |
| US-138.1 | Cancel App is on the button row | `frontend/tests/HomeTripCards.test.js` | `Cancel App is on the button row` |
| US-138.1 | Past trips follow upcoming trips | `frontend/tests/HomeTripCards.test.js` | `Past trips follow upcoming trips` |
| US-138.2 | A ready trip shows money, documents, and the departure | `frontend/tests/HomeTripCards.test.js` | `A ready trip shows money, documents, and the departure` |
| US-138.2 | The next step already states the money and the missing documents | `frontend/tests/HomeTripCards.test.js` | `The next step already states the money and the missing documents` |
| US-138.2 | homeCard on my trips | `backend/tests/my-trips-home-card.test.js` | `My trips include the home card summary` |
| US-138.3 | An open trip comes before a full trip | `frontend/tests/HomeTripCards.test.js` | `An open trip comes before a full trip` |
| US-138.3 | The trip picture and name open the trip page | `frontend/tests/HomeTripCards.test.js` | `The trip picture and name open the trip page` |
| US-138.4 | The warning lists the missing profile fields | `frontend/tests/HomeTripCards.test.js` | `The warning lists the missing profile fields` |

Update `frontend/tests/HomeNextActions.test.js` so the existing next-step cases find the card. Keep their messages and colors.

---

## Agent implementation request

```text
Implement Feature 138 from @features/feature-138-participant-home-trip-cards.md on branch `feature/138-participant-home-trip-cards`.

Replace the participant Home My Trips table and the Trips you can apply for table with the cards in this spec. Keep next-step sentences, status chips, cancel and uncancel dialogs, and the apply buttons. Add homeCard to GET /trips/trips/browse/mine and show the progress lines only in the cases FR-006 names. Add the Missing list to the profile warning.
Map every Gherkin scenario in the Test Coverage Map. Update HomeNextActions tests to use the card. Run those frontend tests and the backend home-card test before finishing.
Update @features/reference/api.md and @features/reference/behavior.md in the same change.
Update docs/user-guide/participant-guide.md (Home: My Trips, Next steps, Trips you can apply for, and the profile warning) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (`GET /trips/trips/browse/mine` adds `homeCard`); `features/reference/behavior.md` (participant Home cards, progress lines, the button row, profile **Missing:** list)

**User guide updates:** `docs/user-guide/participant-guide.md` (Home **My Trips**, next steps, **Trips you can apply for**, profile warning)

---

## Definition of Done

*   [x] **My Trips** are cards, soonest upcoming first, with the date line and **Open My Trip** (**FR-001**, **FR-002**, **FR-003**)
*   [x] **Cancel App**, **Update App** or **View App**, and **Uncancel** are on the same row as **Open My Trip** (**FR-003**, **FR-004**)
*   [x] `homeCard` is on my trips, and the progress lines follow **FR-005** and **FR-006**
*   [x] **Trips you can apply for** are cards with the picture, availability sentence, and **Apply** (**FR-007**)
*   [x] The profile warning lists missing fields (**FR-008**)
*   [x] Participant Home has no **Trips** title or single organization name (**FR-009**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Changing the **My Trip** page
- Changing Trip Leader, Org Admin, Agent, or System Admin Home
- Changing next-step sentences, status names, or the availability sentence
- Showing **Enter Flights** or **Edit Flights** (Feature 134)
- Putting a picture on a **My Trips** card
- Changing icon actions on any page other than these two Home lists
