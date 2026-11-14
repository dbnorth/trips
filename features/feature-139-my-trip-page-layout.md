# Feature: My Trip Page Layout

**Feature ID:** 139
**Branch pattern:** `feature/139-my-trip-page-layout`
**Status:** Implemented
**Created:** 2026-11-13
**Input:** "Make the participant My Trip page easier to use: put the person's own trip first, show the money in one line with the actions beside it, and turn the room and flights into short summaries."
**Depends on:** [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md), [Feature 119 — My Trip Page](feature-119-my-trip-page.md), [Feature 126 — Trip Arrival Download](feature-126-trip-arrival-download.md), [Feature 129 — Incomplete Does Not Hold a Role](feature-129-incomplete-does-not-hold-role.md), [Feature 134 — Hide Participant Flight Links](feature-134-hide-participant-flight-links.md), [Feature 138 — Participant Home Trip Cards](feature-138-participant-home-trip-cards.md)

**My Trip** opens with the trip description, picture, and leaders, and the person's status, role, money, room, and flights sit below that. This feature puts the person's own trip first and shortens the room and flight details. The words of the status messages, next steps, funding alerts, and cost lines stay as they are.

## Clarifications

- Q: Which page changes? → A: The participant **My Trip** page, and the organization name and logo on the trip page before applying. Home, staff trip pages, Flights, Room list, public pages, and the application dialog stay as they are.
- Q: What is first? → A: The existing status message, then one summary: trip name, place, **Role**, the Home date line, the application status, the next steps, and one row of filled buttons. There is no **Back to home** button.
- Q: What leaves the top? → A: **My Trip** does not show the description, the picture, or a **Trip Info** section. **Trip Leaders** stay in the summary, under the name, place, role, and date line, with **Download Trip Arrival Document** above them. The trip's own status word (such as `active`) is not shown.
- Q: Where is the money? → A: One line on the summary, "$1,200.00 raised of $1,200.00. Balance $0.00." The cost lines move into **Trip costs**, which starts closed. The funding alert stays under the money line.
- Q: How do the room and flights read? → A: One room line. Each flight is one line under **Arrival** or **Return**. Empty sections say who will fill them in.
- Q: Which buttons move? → A: **Update App**, **Make Donation**, **View donations**, and **Copy link** are filled buttons on one row. **Cancel App** stays beside its next step. There is still no **Add Flights** or **Edit Flights**.

---

## User Stories

### US-139.1: See my own trip first

**As** a participant
**I want** my status, role, dates, and next step at the top of **My Trip**
**So that** I do not read the trip brochure before I know where I stand

**Priority:** P1
**Independent test:** **My Trip** shows the name, role, date line, next step, and **Trip Leaders**, with no description section and no **Back to home** button.
**Acceptance scenarios:** see ### US-139.1

### US-139.2: See what I still owe

**As** a participant who is Incomplete, Pre-Approved, or Approved
**I want** the amount raised and the balance on the summary, with the cost lines available when I ask
**So that** I can pay without reading every cost first

**Priority:** P1
**Independent test:** The summary shows the raised total and balance, **Make Donation** is on the button row when a balance is due, and **Trip costs** starts closed.
**Acceptance scenarios:** see ### US-139.2

### US-139.3: Read my room and flights as sentences

**As** a participant
**I want** the room and each flight as one line
**So that** I can read them without a wide table

**Priority:** P1
**Independent test:** An assigned room is one line, each flight is one line under **Arrival** or **Return**, and empty sections name who fills them in.
**Acceptance scenarios:** see ### US-139.3

---

## Requirements

### Functional Requirements

- **FR-001**: **My Trip** MUST NOT show **Back to home** or **Back to dashboard**.
- **FR-002**: The existing status message MUST stay at the top, with the same six sentences and the same yellow, green, and red backgrounds. Other page messages stay in the alert below it.
- **FR-003**: The summary MUST come next and MUST show, once: the trip name as a heading larger than the Home card name; one place line (city and country when either exists, otherwise the location, otherwise "—"); **Role** (the trip role name, or "—"); the date line from Feature 138; and the application status chip in the upper right, with the same labels and colors as the Home cards (**Approved** is white text on `#2e7d32`). **My Trip** and the trip page before applying MUST NOT show the organization name or logo. The summary MUST NOT repeat the name, place, or dates, and MUST NOT show the trip's own status.
- **FR-004**: The summary MUST show the same next steps **My Trip** shows today, including the role-not-secured sentence. Deposit and donation steps stay off that list. **Cancel App** stays beside its next step and keeps the same confirm dialog.
- **FR-005**: One row of filled buttons on the summary MUST show **Update App** when it shows today, **Make Donation** when the person is Pre-Approved or Approved, **View donations** when donations can be viewed today, and **Copy link** when **My fundraising page** shows. **My fundraising page** stays a link. **Copy link** still shows "Link copied." or "Unable to copy link." Each button does what it does today.
- **FR-006**: For an Incomplete, Pre-Approved, or Approved application, the summary MUST show **Trip Funding**, the same size as **Trip Leaders**, above **My fundraising page**. Under the button row it MUST show "$1,200.00 raised of $1,200.00. Balance $0.00." when the total trip cost is known, using the same dollar format as the cost lines. When the total is unknown, it MUST show "Donations $0.00. Balance not yet available." The existing funding alert, when it applies, MUST show under that line with the same two sentences.
- **FR-007**: Those same applications MUST have a **Trip costs** section that starts closed. Opening it MUST show the cost lines **Trip financial info** shows today: **Trip cost** ("Not yet available" when the total is unknown), each **Trip option**, **Cost adjustment**, each **Add-on**, **Flight**, **Total trip cost**, **Donations**, and **Balance**. The funding alert and the donation buttons MUST NOT be repeated inside it. Declined and Cancelled applications MUST NOT show the money line, the funding alert, or **Trip costs**.
- **FR-008**: For an Incomplete, Pre-Approved, or Approved application, **Room** MUST be inside the summary. It MUST be one line when a room is assigned: the hotel, the room type, the roommate names joined with ", ", and the check-in and check-out dates, with " · " between the parts that exist. A missing part is left out. With no room, the section MUST say "Your room will appear here after staff assign it."
- **FR-009**: For those same applications, **Flights** MUST be inside the summary. It MUST list **Arrival** and then each Arrival segment in segment order, then **Return** and each Return segment in segment order. A heading with no segments is omitted. Each segment is one line: airline and flight number, then " · ", then the departure airport, date, and time, then " → ", then the arrival airport, date, and time. A missing airline, number, airport, date, or time is left out. With no segments, the section MUST say "Your flights will appear here after staff enter them." There is no **Add Flights** or **Edit Flights** button.
- **FR-010**: The summary MUST show **Download Trip Arrival Document** under the same rule as today, then **Trip Leaders** with the same empty sentence, photos, and email addresses, under the name, place, role, and date line. **My Trip** MUST NOT show the trip description, the trip picture, or a **Trip Info** section. Declined and Cancelled applications still show the summary, including **Trip Leaders**, and do not show **Room** or **Flights**.

---

## Assumptions

- The date line uses the same rules as the Home cards, including the viewer's local calendar date.
- Dollar amounts use the same format as **Trip financial info**.
- Flight times use the same hour form as today ("6:03 PM"). Dates use `MM/dd/yyyy`.
- Who may update, cancel, donate, view donations, copy the fundraising link, and download the arrival PDF does not change.
- Feature 134 stays in force: the flight sentences remain, and the buttons stay hidden.

## Edge Cases

- A trip with no city, country, or location shows "—" for the place.
- A trip with no dates shows no date line.
- A room with only a hotel shows that hotel and nothing after it.
- A flight with only an airline and a departure airport shows those two parts and omits the arrow when there is no arrival airport, date, or time.
- An unknown total still shows the donations sentence and a closed **Trip costs** section whose **Trip cost** is "Not yet available".
- A paid-up Pre-Approved or Approved trip shows the money line and no funding alert.
- Declined and Cancelled trips show the status message and the summary only.

## Success Criteria

- **SC-001**: The next step and **Trip Leaders** are on the summary, and the page has no **Trip Info** section.
- **SC-002**: The raised total and balance are visible before **Trip costs** is opened.
- **SC-003**: An assigned room and each flight read as one line, and empty sections name who fills them in.
- **SC-004**: **My Trip** has no **Back to home** button.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged. The page still shows only the signed-in person's application, costs, room, and flights for that trip.

---

## Key Entities

No new entity. The page rearranges the trip, application, cost breakdown, room, and flight segments **My Trip** already loads.

---

## API Requirements

None.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **My Trip** | Summary first, **Trip costs** closed, room and flights as lines. No **Trip Info** section, description, or picture. No organization name or logo. |
| Trip page before applying | No organization name or logo. The trip card stays. |

**Order on the page**

1. Status message.
2. Summary: name, place, **Role**, and date line, with the status chip in the upper right; then **Download Trip Arrival Document**, **Trip Leaders**, next steps, **Trip Funding** (the same size as **Trip Leaders**), **My fundraising page**, the button row, the money line, the funding alert, **Trip costs** (closed), **Room**, and **Flights**.

The button row order is **Update App**, **Make Donation**, **View donations**, **Copy link**, including only the buttons FR-005 shows. On a narrow screen the row wraps and the sections stack.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-139.1 — See my own trip first

#### Scenario: My trip comes before the brochure
* **Given** I am Approved on Guatemala Clinic as a Nurse, the trip is in Antigua, Guatemala, and Ada North is a Trip Leader
* **When** I open **My Trip**
* **Then** I see "Guatemala Clinic", "Antigua, Guatemala", "Role: Nurse", and the date line
* **And** the page does not show the trip description
* **And** the page shows the trip name once
* **And** the page does not show the trip status "active"
* **And** Ada North is under **Trip Leaders** in the summary, after the date line

#### Scenario: The next step stays on the summary
* **Given** my application is Incomplete and the next step is "Submit your application."
* **When** I open **My Trip**
* **Then** the summary shows "Submit your application." and **Submit App**
* **And** **Cancel App** is beside that step

#### Scenario: My Trip has no Back to home
* **Given** I am on **My Trip**
* **Then** the page does not show **Back to home**

### US-139.2 — See what I still owe

#### Scenario: The balance is on the summary and the costs start closed
* **Given** I am Approved, I have raised $400.00 of a $1,200.00 total, and my balance is $800.00
* **When** I open **My Trip**
* **Then** the summary shows **Trip Funding**, the same size as **Trip Leaders**, above **My fundraising page**
* **And** the summary shows "$400.00 raised of $1,200.00. Balance $800.00."
* **And** the summary shows "You need more donations to cover your balance of $800.00."
* **And** **Make Donation** and **View donations** are on the button row
* **And** **Total trip cost** is not visible until I open **Trip costs**

#### Scenario: Opening Trip costs shows the breakdown
* **Given** the summary shows a balance
* **When** I open **Trip costs**
* **Then** I see **Trip cost**, **Total trip cost**, **Donations**, and **Balance**

#### Scenario: Copy link stays on the row
* **Given** I am Approved on an active trip and my fundraising page is available
* **When** I choose **Copy link**
* **Then** the page says "Link copied."

### US-139.3 — Read my room and flights as sentences

#### Scenario: The room is one line
* **Given** I am assigned Hope Hotel, a King room, with Ada North, checking in 04/22/2026 and out 04/26/2026
* **When** I open **My Trip**
* **Then** **Room** shows "Hope Hotel · King · Ada North · 04/22/2026 – 04/26/2026"

#### Scenario: Each flight is one line
* **Given** my Arrival segment is American Airlines 100 from OKC on 04/22/2026 at 6:03 PM to RIC at 9:00 PM, and I have a Return segment
* **When** I open **My Trip**
* **Then** **Arrival** shows "American Airlines 100 · OKC 04/22/2026 6:03 PM → RIC 04/22/2026 9:00 PM"
* **And** **Return** follows **Arrival**
* **And** the page has no **Edit Flights** button

#### Scenario: Empty room and flights say who fills them in
* **Given** I am Approved and I have no room and no flights
* **When** I open **My Trip**
* **Then** **Room** says "Your room will appear here after staff assign it."
* **And** **Flights** says "Your flights will appear here after staff enter them."

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-139.1 | My trip comes before the brochure | `frontend/tests/MyTripView.test.js` | `My trip comes before the brochure` |
| US-139.1 | The next step stays on the summary | `frontend/tests/MyTripView.test.js` | `The next step stays on the summary` |
| US-139.1 | My Trip has no Back to home | `frontend/tests/MyTripView.test.js` | `My Trip has no Back to home` |
| US-139.2 | The balance is on the summary and the costs start closed | `frontend/tests/MyTripView.test.js` | `The balance is on the summary and the costs start closed` |
| US-139.2 | Opening Trip costs shows the breakdown | `frontend/tests/MyTripView.test.js` | `Opening Trip costs shows the breakdown` |
| US-139.2 | Copy link stays on the row | `frontend/tests/MyTripView.test.js` | `Copy link stays on the row` |
| US-139.3 | The room is one line | `frontend/tests/MyTripTravelDetails.test.js` | `The room is one line` |
| US-139.3 | Each flight is one line | `frontend/tests/MyTripTravelDetails.test.js` | `Each flight is one line` |
| US-139.3 | Empty room and flights say who fills them in | `frontend/tests/MyTripTravelDetails.test.js` | `Empty room and flights say who fills them in` |

Update the existing **My Trip** tests that look for **Back to dashboard**, the flight table, or the **Trip financial info** heading so they match this layout.

---

## Agent implementation request

```text
Implement Feature 139 from @features/feature-139-my-trip-page-layout.md on branch `feature/139-my-trip-page-layout`.

Rearrange the participant My Trip page as this spec describes. Keep the status sentences, next-step sentences, funding alerts, cost lines, arrival download, trip leaders, and the fundraising link. Do not add Add Flights or Edit Flights.
Map every Gherkin scenario in the Test Coverage Map. Update existing My Trip tests that assert the old heading, table, or button label. Run frontend/tests/MyTripView.test.js and frontend/tests/MyTripTravelDetails.test.js before finishing.
Update @features/reference/behavior.md in the same change. No API change.
Update docs/user-guide/participant-guide.md (My Trip) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (participant **My Trip** order, summary, **Trip costs**, room line, flight lines)

**User guide updates:** `docs/user-guide/participant-guide.md` (**My Trip**)

---

## Definition of Done

*   [x] **My Trip** has no **Back to home** button and no **Trip Info** section (**FR-001**, **FR-002**, **FR-003**, **FR-010**)
*   [x] Next steps and **Cancel App** stay put, and the action buttons are one filled row (**FR-004**, **FR-005**)
*   [x] The money line is on the summary and **Trip costs** starts closed (**FR-006**, **FR-007**)
*   [x] Room and flights are one line each, with the empty sentences (**FR-008**, **FR-009**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/behavior.md` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Changing Home, the trip page before applying, staff pages, Flights, or Room list
- Changing status sentences, next-step sentences, funding alerts, or cost-line labels
- Showing **Add Flights** or **Edit Flights** (Feature 134)
- Adding **View App** or moving **Cancel App** off the next step
- Changing who may donate, copy the fundraising link, or download the arrival PDF
