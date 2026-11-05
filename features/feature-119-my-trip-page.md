# My Trip Page

**Feature ID:** 119
**Branch pattern:** `feature/119-my-trip-page`
**Status:** Implemented
**Created:** 2026-11-04
**Input:** "add a spec for the participant trip view page to remove team roles info. Add a section to display Trip financal info (list of all cost, totlal, domaiton, balance, section for Room information (Hotel and roommate) when available other wise \"Not yet available\" , a section for Flight segments when availble (with button to add/edit if they are providing their own flight)  else \"Not yet available\"."

Today one trip page (`/browse-trips/:tripId`, `TripBrowseView`) serves both people deciding whether to apply and people already signed up. Someone signed up still sees **Team roles needed** (only useful before applying), their costs are spread across a "Your trip cost" tile, a "Donations so far" tile, and separate **Trip options** / **Add-on expenses** lists, and the Room and Flights parts simply don't appear until there is data. This feature splits the page in two: the browse page stays as it is for prospective applicants, and a new **My Trip** page (`/my-trips/:tripId`) is for trips the person has an application on. It drops **Team roles needed**, and gives **My Trip Info** three sections: **Trip financial info** (every cost line, total, donations, balance), **Room**, and **Flights**, each saying "Not yet available" until there is something to show.

## Clarifications

### Session 2026-11-04

- Q: Remove **Team roles needed** for whom? → A: Split the page. The browse page stays as it is now for prospective applicants. A new page is for trips the person is signed up for, without **Team roles needed**.
- Q: Cost lines? → A: The same lines as the staff **Total cost** breakdown (Feature 74 / 92): **Trip cost**, each **Trip option: <description>**, **Cost adjustment** (only when not $0), each **Add-on: <description>**, **Flight**; then **Total trip cost**, **Donations**, **Balance**.
- Q: Existing tiles and lists? → A: **Your trip cost**, **Donations so far**, **Trip options**, and **Add-on expenses** are removed from **My Trip Info**; **Trip financial info** replaces them.
- Q: Where do the sections go? → A: Inside **My Trip Info**, after **Status** / **Role**, in the order **Trip financial info**, **Room**, **Flights**.
- Q: Where do the donation buttons go? → A: **View donations** moves from the **My Trip Info** header to the **Donations** line of **Trip financial info**, next to a new **Make Donation** button. **Make Donation** opens a new dialog that donates only toward the participant's own trip (no recipient choice). The header **Donate** button (which let them pick another team member) is removed.
- Q: The "Application submitted. Your organization will review it." message at the top of **My Trip**? → A: Replace it with a message for the application's status, shown whenever the page is open: Incomplete, Pre-Approved with documents still needed, Pre-Approved with documents complete, Approved, Declined ("Your application was not approved for this trip."), Cancelled ("Your application has been cancelled.").

**Depends on:**
- [Feature 53 — Participant Donations](feature-53-participant-donations.md) (**Donate**, donation total)
- [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md) (next actions on the trip page)
- [Feature 61 — Trip Page My Travel Details](feature-61-trip-page-my-travel-details.md) (Room, Flights, **Edit Flights**)
- [Feature 74 — Trip Add-on Expenses](feature-74-trip-addon-expenses.md) (total trip cost, cost breakdown, amount owed)
- [Feature 76 — Trip Arrival Info](feature-76-trip-arrival-info.md) (Trip arrival info link)
- [Feature 78 — Days Before / After Trip](feature-78-days-before-after-trip.md) (Arrive / Depart dates)

---

## User Stories

### US-119.1: Open my own trip page

**As** a Trip Participant (or Trip Leader) with an application on a trip
**I want** a trip page about my trip, not one built for people deciding whether to apply
**So that** I see what matters to me now, without the open-roles table

**Acceptance:** see Gherkin scenarios under US-119.1.

### US-119.2: See my trip's money in one place

**As** a participant
**I want** every cost line, my total, my donations, and my balance together
**So that** I know exactly what I owe and why

**Acceptance:** see Gherkin scenarios under US-119.2.

### US-119.3: See my room and flights, or know they aren't ready

**As** a participant
**I want** my hotel and roommates and my flight segments, or a clear "Not yet available"
**So that** I know whether there's anything to check yet, and can enter my own flights when I book them

**Acceptance:** see Gherkin scenarios under US-119.3.

---

## Requirements

### Functional Requirements

- **FR-001**: New route `/my-trips/:tripId` (name `myTrip`, component `MyTripView`), with the same access guard as `tripBrowse`. It loads `GET /trips/trips/browse/:id`. When the response has no application for the caller (`alreadyApplied` false), it redirects (replace) to `tripBrowse` for the same trip.
- **FR-002**: The browse page (`tripBrowse`, `TripBrowseView`) is unchanged for people without an application on the trip: apply invite, **Trip Info** (Location, Participant cost, Status, Trip Leaders, **Team roles needed**). When the response shows the caller has an application (`alreadyApplied` true), it redirects (replace) to `myTrip` for the same trip, so **My Trip Info** is no longer shown on the browse page. After the participant saves a new application from the browse page, it goes to `myTrip`.
- **FR-003**: Links go to the right page: Home **My Trips** row **View** → `myTrip`; Home **Trips you can apply for** row **View** → `tripBrowse`. Other links to `tripBrowse` (apply sign-in / create account) keep working through the FR-002 redirect.
- **FR-004**: `MyTripView` shows the trip heading (as the browse page), then a **Trip Info** card with **Location**, **Dates** (start – end, `MM/dd/yyyy`, "—" when missing), **Status**, and **Trip Leaders** (as the browse page). With no trip leaders, both pages show the plain text "No Trip Leader assigned" (`data-testid="no-trip-leaders"`) in place of the "No trip leaders have been assigned yet." info alert. It has no **Team roles needed** and no **Participant cost** (the financial section covers cost).
- **FR-005**: `MyTripView` then shows **My Trip Info** with the browse page's current header (title, **My fundraising page** / **Copy link**, **Update App**), next actions, **Status** and **Role**, Arrive / Depart dates, and **Trip arrival info**, all as today, and the dialogs they open (apply / update, profile, flight segments, cancel confirmation) behave as on the browse page today. **Your trip cost**, **Donations so far**, **Trip options**, and **Add-on expenses** are removed. The header **Donate** and **View donations** buttons are removed (see FR-011).
- **FR-006**: For an application that is **Incomplete**, **Pre-Approved**, or **Approved**, **My Trip Info** then shows three sections in this order: **Trip financial info** (FR-007), **Room** (FR-008), **Flights** (FR-009). Other statuses (for example Cancelled) show none of the three.
- **FR-007**: **Trip financial info** is a two-column list (label, amount, `$X.XX`, negatives allowed):
  - When the total trip cost is known: **Trip cost** (when the trip has a participant cost), one **Trip option: <description>** per selected option, **Cost adjustment** (only when not $0), one **Add-on: <description>** per add-on expense in entry order, **Flight** (organization-booked airfare, `$0.00` otherwise), then a bold **Total trip cost**.
  - When the total trip cost is unknown: the line "Trip cost: Not yet available" in place of the cost lines and total.
  - Always: **Donations** (the donation total, as "Donations so far" today) and a bold **Balance** (amount owed: total trip cost − donations, never below $0; "Not yet available" when the total is unknown).
- **FR-008**: **Room**: when the participant is on the saved rooming list, the current room details (Hotel, Room type, Roommates, Check-in, Check-out, as Feature 61); otherwise "Not yet available".
- **FR-009**: **Flights**: when the participant has flight segments, the current segments table (as Feature 61); otherwise "Not yet available". When the participant books their own flight (`flightPurchaseOption` `self`), the section heading has **Add Flights** (no segments) or **Edit Flights** (has segments), opening the flight segments dialog; after saving, the page reloads. Organization-booked participants get no button.
- **FR-010**: `GET /trips/trips/browse/:id` `myTripInfo` adds `costBreakdown` (the staff breakdown: `{ tripCost, tripOptions: [{ description, amount }], adjustment, addonExpenses: [{ description, amount }], airfare, totalTripCost }`) and `amountOwed` (total − donation total, never below 0; `null` when the total is unknown). Nothing else in the response changes; `rolesNeeded` is still returned (the apply dialog uses it).
- **FR-011**: The **Donations** line of **Trip financial info** has, next to the label, **View donations** (the participant's donations dialog, read-only, as the header button did) and, only when the application is **Pre-Approved** or **Approved** (FR-014), **Make Donation**. **Make Donation** opens a **Make Donation** dialog (`MakeDonationDialog`) with the text "Donate toward your trip balance.", **Amount** (required, above $0, otherwise "Donation amount is required.") and optional **Payment info**, and **Cancel** / **Donate**. **Donate** records the donation for the participant on this trip with their linked donor through the existing `POST /trips/donations/participant` (`personId` = the participant), closes the dialog, shows "Thank you for your donation!", and reloads the page (Donations and Balance update). A server error is shown in the dialog.
- **FR-012**: **Arrive** / **Depart** in **My Trip Info** stay the Feature 78 dates (trip start − days before, trip end + days after, from the selected trip options and add-on expenses). When a date is moved from the trip date, it shows the same info icon as the View Trip participant list (`TripDateAdjustment`, aria-label "Days before the trip" / "Days after the trip"), whose tooltip lists each `Trip option: <description>` / `Add-on: <description>` with "N day(s) before" / "N day(s) after" (negative days "N day(s) later" for arrival, "N day(s) earlier" for departure). No icon when nothing moved the date. `GET /trips/trips/browse/:id` `myTripInfo` adds `arrivalAdjustments` and `departureAdjustments` (`[{ type: "option" | "addon", description, days }]`, as the staff list; `[]` when none or outside Incomplete / Pre-Approved / Approved).
- **FR-013**: The top of **My Trip** always shows a status message (`data-testid="my-trip-status-message"`) for the caller's application, replacing "Application submitted. Your organization will review it." (no longer shown on **My Trip**, including right after applying or updating):
  - **Incomplete** (light yellow, `amber-lighten-4`, warning icon): "Application incomplete. Please update your application and profile as needed."
  - **Pre-Approved** with an `upload-documents` next action (light yellow): "You have been Pre-Approved and have a place on the trip, but you still need to complete your documents 90 days prior to the trip."
  - **Pre-Approved** otherwise (light yellow): "Your application and documents are complete and will be reviewed."
  - **Approved** (light green, `green-lighten-4`, success icon): "Congratulations, you have been approved for the trip!"
  - **Declined** (light red, `red-lighten-4`, error icon): "Your application was not approved for this trip."
  - **Cancelled** (light red): "Your application has been cancelled." (replaces the "Application cancelled." message after **Cancel App**)
  
  The message text is bold black on every color.
- **FR-014**: Donations allow **Pre-Approved** as well as **Approved** Trip Participants and Trip Leaders (was Approved only):
  - **Make Donation** (FR-011) shows for Pre-Approved and Approved applications; `POST /trips/donations/participant` and a signed-in self-donation on the public donation page accept a Pre-Approved or Approved recipient (self-donation error now "You can donate to yourself only on trips where you are pre-approved or approved.").
  - `myTripInfo.donationRecipients` (Home **Donate** "Donate to" list, including "Yourself") lists Pre-Approved and Approved Trip Participants and Trip Leaders.
  - The public trip donation page lists, and the public participant donation page (by id or slug) finds, Pre-Approved and Approved Trip Participants and Trip Leaders.
  - **My fundraising page** / **Copy link** in the **My Trip Info** header show for Pre-Approved and Approved (active trip).
  - Next actions: a Pre-Approved application gets the Approved deposit / donation action ("Make your deposit: …" when the deposit isn't met, else "Make a donation: $X still owed." when something is owed, each with **Donate**) after its documents action or "Waiting on approval.".
- **FR-015**: For a **Pre-Approved** or **Approved** application, a message bar (`data-testid="my-trip-funding-message"`, light yellow `amber-lighten-4`, bold black text, as FR-013) shows right after the **Trip financial info** heading, above the cost lines:
  - When the trip deposit is above $0 and **Donations** are below it: "You need to make your trip deposit of $X.XX." (the trip's deposit amount).
  - Otherwise, when the **Balance** is known and above $0: "You need more donations to cover your balance of $X.XX."
  - Otherwise (or for other statuses) no bar.
  
  Because this bar covers them, the next actions under the **My Trip Info** heading on **My Trip** leave out the deposit / donation actions ("Make your deposit: …", "Make a donation: …" and their **Donate**); the row is hidden when nothing else is left. Home **My Trips** still shows them.
- **FR-017**: On the participant Home, each trip name in **My Trips** and **Trips you can apply for** is bold and a link to the same page as the row's **View** (My Trips → `myTrip`; Trips you can apply for → `tripBrowse`).
- **FR-016**: **My Trip** has no separate trip heading card: the organization logo / name stay above (as the browse page), and the heading card's content moves to the top of the **Trip Info** card, under its **Trip Info** title: trip name (`data-testid="my-trip-trip-name"`, large bold `text-h4`), city / country, description, and the trip image on the right. **Location**, **Dates**, **Status**, and **Trip Leaders** follow as before. **My Trip Info** stays a separate card. The browse page keeps its heading card.

---

## Assumptions

- "Signed up" means the caller has any application on the trip (`alreadyApplied`), including Cancelled or Declined ones, so those also open **My Trip**; only the three new sections are limited to Incomplete / Pre-Approved / Approved (FR-006), as the travel details are today.
- **Donations** is the same donation total as today's "Donations so far" (all donations recorded for the participant on the trip).
- The room keeps all of Feature 61's details (Hotel, Room type, Roommates, Check-in, Check-out), not just Hotel and Roommates.
- Staff pages (`TripView`) are unchanged.
- Next actions are empty for trips that have started, so a Pre-Approved application on a past trip shows "Your application and documents are complete and will be reviewed." (FR-013).
- Home keeps its own "Application submitted. Your organization will review it." message after applying from Home.

## Edge Cases

- Trip without a participant cost and no application cost → "Trip cost: Not yet available", Donations shown, Balance "Not yet available".
- Donations above the total → Balance `$0.00`.
- Self-booked with no segments → "Not yet available" and **Add Flights**; organization-booked with no segments → "Not yet available" only.
- Someone opens `/browse-trips/:id` for a trip they applied to (bookmark, sign-in redirect) → lands on **My Trip**.
- Someone opens `/my-trips/:id` with no application → lands on the browse page.
- Cancelling the application on **My Trip** → stays on **My Trip**, status Cancelled, the three sections hidden.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: The browse page looks and works as before for people without an application.

---

## Data Ownership & Isolation

Unchanged: `GET /trips/trips/browse/:id` returns only the caller's own `myTripInfo`.

---

## Key Entities

No changes.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips/browse/:id` | `myTripInfo` adds `costBreakdown` and `amountOwed` (FR-010); `donationRecipients` and `nextActions` include Pre-Approved (FR-014) |
| `POST` | `/trips/donations/participant` | Pre-Approved recipients allowed (FR-014) |
| `GET` | public donor trip / participant pages, `POST` public donation | Pre-Approved members listed / found; Pre-Approved self-donation allowed (FR-014) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `router.js` | New `myTrip` route `/my-trips/:tripId` with the `tripBrowse` guard (FR-001) |
| `MyTripView` (new) | Trip Info without Team roles / Participant cost; My Trip Info with Trip financial info, Room, Flights (FR-004 – FR-009) |
| `TripBrowseView` | Redirects to `myTrip` when the caller has an application; goes to `myTrip` after a new application (FR-002) |
| `Home` | My Trips **View** → `myTrip`; Trips you can apply for **View** → `tripBrowse` (FR-003) |
| `MyTripTravelDetails` | Room / Flights "Not yet available"; **Add Flights** / **Edit Flights**; no Trip options / Add-on expenses lists (FR-008, FR-009, FR-005) |
| `MyTripFinancialInfo` | **View donations** and **Make Donation** on the **Donations** line (FR-011) |
| `MakeDonationDialog` (new) | Amount, Payment info; donates to the participant's own trip (FR-011) |
| `MyTripView` status message | Message for the application's status at the top of the page (FR-013) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Pat is a Trip Participant with an **Approved** application on "Guatemala Clinic" (trip participant cost $1,500.00).
- Pat selected the trip option "Private room" (+$200.00), so Pat's application participant cost is $1,700.00; Pat has the add-on expense "Travel insurance" ($75.00); the organization books Pat's flight with a flight cost of $650.00.
- Donations recorded for Pat on the trip total $1,000.00.
- Quinn has no application on "Guatemala Clinic".

### US-119.1 — Open my own trip page

#### Scenario: My Trips View opens My Trip without team roles
* **When** Pat clicks **View** on "Guatemala Clinic" in **My Trips**
* **Then** Pat is on `/my-trips/<trip id>`
* **And** the page shows **Trip Info** with Location, Dates, Status, and Trip Leaders
* **And** there is no **Team roles needed** and no **Participant cost**
* **And** the trip name, city / country, and description are at the top of **Trip Info**, with no separate trip heading card

#### Scenario: Status message at the top of My Trip
* **When** Pat opens **My Trip** for "Guatemala Clinic"
* **Then** the top of the page shows "Congratulations, you have been approved for the trip!"
* **Given** Pat's application is **Incomplete** instead
* **Then** it shows "Application incomplete. Please update your application and profile as needed."
* **Given** Pat's application is **Pre-Approved** and Pat still needs to upload documents
* **Then** it shows "You have been Pre-Approved and have a place on the trip, but you still need to complete your documents 90 days prior to the trip."
* **Given** Pat's application is **Pre-Approved** and Pat's documents are complete
* **Then** it shows "Your application and documents are complete and will be reviewed."
* **Given** Pat's application is **Declined** instead
* **Then** it shows "Your application was not approved for this trip."
* **Given** Pat's application is **Cancelled** instead
* **Then** it shows "Your application has been cancelled."
* **And** the page never shows "Application submitted. Your organization will review it."

#### Scenario: Trip names on Home link to the trip
* **When** Pat opens Home
* **Then** "Guatemala Clinic" in **My Trips** is bold and links to `/my-trips/<trip id>`
* **And** a trip in **Trips you can apply for** is bold and links to `/browse-trips/<trip id>`

#### Scenario: Browse page stays for prospective applicants
* **When** Quinn opens `/browse-trips/<trip id>`
* **Then** Quinn sees the apply invite and **Team roles needed**

#### Scenario: Each page sends you to the right one
* **When** Pat opens `/browse-trips/<trip id>`
* **Then** Pat is sent to `/my-trips/<trip id>`
* **When** Quinn opens `/my-trips/<trip id>`
* **Then** Quinn is sent to `/browse-trips/<trip id>`

### US-119.2 — See my trip's money in one place

#### Scenario: Trip financial info lists every cost, total, donations, and balance
* **When** Pat opens **My Trip** for "Guatemala Clinic"
* **Then** **Trip financial info** lists Trip cost $1,500.00, Trip option: Private room $200.00, Add-on: Travel insurance $75.00, Flight $650.00, Total trip cost $2,425.00, Donations $1,000.00, Balance $1,425.00
* **And** there is no **Your trip cost**, **Donations so far**, **Trip options**, or **Add-on expenses**

#### Scenario: Donation buttons on the Donations line
* **When** Pat opens **My Trip** for "Guatemala Clinic"
* **Then** the **Donations** line has **View donations** and **Make Donation**
* **And** the **My Trip Info** header has no **Donate** or **View donations**
* **When** Pat clicks **View donations**
* **Then** Pat's donations dialog opens
* **When** Pat clicks **Make Donation**, enters 250 and "Check #1001", and clicks **Donate**
* **Then** a donation of $250.00 is recorded for Pat on "Guatemala Clinic" with payment info "Check #1001"
* **And** the page shows "Thank you for your donation!" and reloads
* **Given** Pat's application is **Pre-Approved** instead
* **Then** the **Donations** line has **View donations** and **Make Donation**
* **Given** Pat's application is **Incomplete** instead
* **Then** the **Donations** line has **View donations** but no **Make Donation**

#### Scenario: Deposit and donation message below the financial info
* **Given** "Guatemala Clinic" has a deposit of $1,500.00
* **When** Pat opens **My Trip** with Donations $1,000.00
* **Then** right after the **Trip financial info** heading a bar shows "You need to make your trip deposit of $1,500.00."
* **Given** the trip has no deposit
* **Then** the bar shows "You need more donations to cover your balance of $1,425.00."
* **Given** Pat's Balance is $0.00
* **Then** no bar is shown
* **Given** Pat's application is **Incomplete**
* **Then** no bar is shown
* **And** the next actions under **My Trip Info** never show "Make your deposit: …" or "Make a donation: …"

#### Scenario: Pre-Approved participants can give and receive donations
* **Given** Pat's application on "Guatemala Clinic" is **Pre-Approved**, the trip has no deposit, and Pat owes $1,425.00
* **When** Pat donates $50.00 to themselves through `POST /trips/donations/participant`
* **Then** the donation is recorded
* **And** `myTripInfo.donationRecipients` includes Pat
* **And** the public trip donation page lists Pat and Pat's public participant donation page loads
* **And** Pat's next actions include "Make a donation: $1,375.00 still owed." after the documents or waiting action
* **Given** Pat's application is **Incomplete** instead
* **Then** a self-donation is refused with "You can donate to yourself only on trips where you are pre-approved or approved."

#### Scenario: Adjusted arrive and depart dates show what moved them
* **Given** "Guatemala Clinic" runs 01/10/2027 – 01/20/2027
* **And** Pat selected the trip option "Arrive early" (2 days before) and has the add-on expense "Extra hotel night" (1 day before, 1 day after)
* **When** Pat opens **My Trip**
* **Then** **Arrive** is 01/07/2027 with an info icon listing "Trip option: Arrive early — 2 days before" and "Add-on: Extra hotel night — 1 day before"
* **And** **Depart** is 01/21/2027 with an info icon listing "Add-on: Extra hotel night — 1 day after"
* **And** `myTripInfo.arrivalAdjustments` / `departureAdjustments` hold those items

#### Scenario: Unknown trip cost
* **Given** a trip with no participant cost, and Pat's application has none
* **When** Pat opens **My Trip** for it
* **Then** **Trip financial info** shows "Trip cost: Not yet available", Donations, and Balance "Not yet available"

#### Scenario: Browse detail includes the cost breakdown and balance
* **When** Pat loads `GET /trips/trips/browse/<trip id>`
* **Then** `myTripInfo.costBreakdown` has `tripCost` 1500, trip option "Private room" 200, add-on "Travel insurance" 75, `airfare` 650, `totalTripCost` 2425
* **And** `myTripInfo.amountOwed` is 1425

### US-119.3 — See my room and flights, or know they aren't ready

#### Scenario: Room and flights not yet available
* **Given** Pat is not on the saved rooming list and has no flight segments
* **When** Pat opens **My Trip**
* **Then** **Room** shows "Not yet available"
* **And** **Flights** shows "Not yet available" with no button

#### Scenario: Room and flights shown when available
* **Given** Pat is in a room at "Hotel Antigua" with roommate "Rita Gomez" and has an Arrival segment
* **When** Pat opens **My Trip**
* **Then** **Room** shows Hotel "Hotel Antigua" and Roommates "Rita Gomez"
* **And** **Flights** shows the Arrival segment

#### Scenario: Self-booked participant adds and edits flights
* **Given** Pat books their own flight and has no flight segments
* **When** Pat opens **My Trip**
* **Then** **Flights** shows "Not yet available" and **Add Flights**
* **When** Pat has an Arrival segment
* **Then** **Flights** shows the segment and **Edit Flights**
* **And** clicking either opens the flight segments dialog

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-119.1 | My Trips View opens My Trip without team roles | `frontend/tests/MyTripView.test.js` | `My Trips View opens My Trip without team roles` |
| US-119.1 | Status message at the top of My Trip | `frontend/tests/MyTripView.test.js` | `Status message at the top of My Trip` |
| US-119.1 | Trip names on Home link to the trip | `frontend/tests/MyTripView.test.js` | `Trip names on Home link to the trip` |
| US-119.1 | Browse page stays for prospective applicants | `frontend/tests/MyTripView.test.js` | `Browse page stays for prospective applicants` |
| US-119.1 | No trip leaders (FR-004) | `frontend/tests/MyTripView.test.js` | `No trip leaders shows plain text on My Trip` |
| US-119.1 | Each page sends you to the right one | `frontend/tests/MyTripView.test.js` | `Each page sends you to the right one` |
| US-119.2 | Trip financial info lists every cost, total, donations, and balance | `frontend/tests/MyTripView.test.js` | `Trip financial info lists every cost, total, donations, and balance` |
| US-119.2 | Donation buttons on the Donations line | `frontend/tests/MyTripView.test.js` | `Donation buttons on the Donations line` |
| US-119.3 | Adjusted arrive and depart dates show what moved them | `frontend/tests/MyTripView.test.js` | `Adjusted arrive and depart dates show what moved them` |
| US-119.3 | Adjusted arrive and depart dates show what moved them (API) | `backend/tests/my-trip-page.test.js` | `Adjusted arrive and depart dates show what moved them` |
| US-119.2 | Deposit and donation message below the financial info | `frontend/tests/MyTripView.test.js` | `Deposit and donation message below the financial info` |
| US-119.2 | Pre-Approved participants can give and receive donations | `backend/tests/my-trip-page.test.js` | `Pre-Approved participants can give and receive donations` |
| US-119.2 | Unknown trip cost | `frontend/tests/MyTripView.test.js` | `Unknown trip cost` |
| US-119.2 | Browse detail includes the cost breakdown and balance | `backend/tests/my-trip-page.test.js` | `Browse detail includes the cost breakdown and balance` |
| US-119.3 | Room and flights not yet available | `frontend/tests/MyTripView.test.js` | `Room and flights not yet available` |
| US-119.3 | Room and flights shown when available | `frontend/tests/MyTripView.test.js` | `Room and flights shown when available` |
| US-119.3 | Self-booked participant adds and edits flights | `frontend/tests/MyTripView.test.js` | `Self-booked participant adds and edits flights` |

Existing tests that mount `TripBrowseView` for **My Trip Info** (`TripBrowseNextActions`, `TripBrowseTravelDetails`, `MyTripTravelDetails`, and any checking `my-trip-cost`, Trip options, or Add-on expenses on the trip page) move to `MyTripView` and follow FR-005 – FR-009.

---

## Agent implementation request

```text
Implement Feature 119 from @features/feature-119-my-trip-page.md on branch `feature/119-my-trip-page`.

Backend: tripBrowse.controller getBrowseTrip — myTripInfo adds costBreakdown (participantCostBreakdown(trip, assignment)) and amountOwed (amountOwed(total, donationTotal)).
Frontend: new MyTripView.vue at /my-trips/:tripId (route myTrip, tripBrowse guard) with the trip heading, Trip Info (Location, Dates, Status, Trip Leaders), and the My Trip Info card moved from TripBrowseView (header, next actions, Status/Role, dialogs) without the cost/donation tiles; new Trip financial info section; MyTripTravelDetails shows Room / Flights with "Not yet available", Add Flights / Edit Flights for self-booked, and drops the Trip options / Add-on expenses lists. TripBrowseView redirects to myTrip when alreadyApplied and after a new application. Home My Trips View → myTrip.
Tests per the Test Coverage Map; move existing My Trip Info tests to MyTripView. Update features/reference/ (api.md browse/:id row, behavior.md trip page travel details row and a My Trip page row).
```

---

## Definition of Done

*   [x] **My Trip** route and redirect per **FR-001**
*   [x] Browse page redirect and after-apply per **FR-002**
*   [x] Home links per **FR-003**
*   [x] Trip Info per **FR-004**
*   [x] My Trip Info header and removed tiles / lists per **FR-005**
*   [x] Sections by status per **FR-006**
*   [x] Trip financial info per **FR-007**
*   [x] Room per **FR-008**
*   [x] Flights and Add / Edit Flights per **FR-009**
*   [x] API `costBreakdown` / `amountOwed` per **FR-010**
*   [x] Donation buttons and **Make Donation** dialog per **FR-011**
*   [x] Arrive / Depart adjustment info icons per **FR-012**
*   [x] Status message per **FR-013**
*   [x] Pre-Approved donations per **FR-014**
*   [x] Deposit / donation message bar per **FR-015**
*   [x] Trip heading inside **Trip Info** per **FR-016**
*   [x] Bold trip name links on the participant Home per **FR-017**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Changes to staff trip pages, the Flights page, or the rooming list.
- Changing how costs, donations, or the balance are calculated.
- Showing roles or open positions on **My Trip**.
- Paying the balance online (Make Donation records the donation; no payment is processed).
- Donating to other team members from **My Trip** (the header **Donate** is removed).
