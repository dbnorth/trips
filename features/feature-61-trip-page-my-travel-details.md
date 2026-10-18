# Feature: Trip Page My Travel Details

**Feature ID:** 61
**Branch pattern:** `feature/61-trip-page-my-travel-details`
**Status:** Implemented
**Created:** 2026-10-18
**Input:** Update the browse-trips page to add to the trip info section the flight segments, rooming info (hotel, roommate, room type, check-in and check-out dates), and selected trip options.
**Depends on:** [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md), [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 29 — Rooming List](feature-29-rooming-list.md), [Feature 30 — Participant Flights](feature-30-participant-flights.md), [Feature 53 — Participant Donations](feature-53-participant-donations.md), [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md)

---

## User Stories

### US-61.1: See my room on the trip page
**As a** participant
**I want** the trip page's **My Trip Info** to show my hotel, room type, roommates, and check-in / check-out dates
**So that** I know where I am staying and with whom without asking the trip staff

**Priority:** P1
**Independent test:** A participant assigned to a Double room for 5 nights with Ben Ruiz, on a rooming list with hotel "Hotel Casa" and check-in 01/10/2027, sees Hotel "Hotel Casa", Room type "Double", Roommates "Ben Ruiz", Check-in 01/10/2027, Check-out 01/15/2027 in **My Trip Info**.
**Acceptance scenarios:** see ### US-61.1

### US-61.2: See my flights on the trip page
**As a** participant
**I want** **My Trip Info** to list my arrival and return flight segments
**So that** I can check my itinerary in one place

**Priority:** P1
**Independent test:** A participant with one Arrival and one Return segment sees both rows (airline, flight number, from / to airports, departure and arrival date and time) under **Flights** in **My Trip Info**; a participant who buys their own ticket also sees **Edit Flights**, which opens the flight segments dialog.
**Acceptance scenarios:** see ### US-61.2

### US-61.3: See my selected trip options on the trip page
**As a** participant
**I want** **My Trip Info** to list the trip options I selected on my application
**So that** I can confirm my choices

**Priority:** P2
**Independent test:** A participant who selected "Extra beach day (+$150.00)" sees it under **Trip options** in **My Trip Info**.
**Acceptance scenarios:** see ### US-61.3

---

## Requirements

### Functional Requirements

**Where and for whom**

- **FR-001**: The details MUST show in the **My Trip Info** card on the trip page (`/browse-trips/:tripId`, Feature 53), below the existing status / role / cost / donations row, only for the signed-in person's own application.
- **FR-002**: The details MUST show only when that application is **incomplete**, **applied**, or **approved**. Cancelled and declined applications MUST NOT show them.
- **FR-003**: Each part (**Room**, **Flights**, **Trip options**) MUST show only when it has data, per **FR-004**, **FR-007**, and **FR-010**. With no parts, nothing is added to the card.

**Room (Feature 29)**

- **FR-004**: The **Room** part MUST show when the participant's assignment is on a room in the trip's saved rooming list.
- **FR-005**: It MUST show **Hotel** (rooming list hotel), **Room type** (`King` / `Double` / `Triple`), **Roommates**, **Check-in** (rooming list check-in date), and **Check-out** (check-in date plus the room's number of nights). A blank hotel or check-in shows "—"; with no check-in, check-out shows "—". Dates read `MM/dd/yyyy`.
- **FR-006**: **Roommates** MUST list the first and last names of the other people assigned to the same room, ordered by last then first name, comma-separated; with nobody else in the room it shows "—". Preferred roommate names from the application are not shown here.

**Flights (Feature 30)**

- **FR-007**: The **Flights** part MUST show when the participant's assignment has at least one flight segment.
- **FR-008**: It MUST list Arrival segments then Return segments, each by segment number, with: type (Arrival / Return), airline name, flight number, from (airport code), departure (date and time), to (airport code), arrival (date and time). Date and time read like the Flights page (`MM/dd/yyyy` and 12-hour time with AM/PM).
- **FR-009**: When the application's flight purchase option is **self**, the **Flights** part MUST show **Edit Flights**, which opens the existing flight segments dialog (`FlightSegmentsDialog`) for the participant's own assignment (participant access as Feature 60 **FR-014**). After saving, the page MUST reload. Participants whose organization buys the ticket see the segments without **Edit Flights**.

**Trip options (Features 6, 7)**

- **FR-010**: The **Trip options** part MUST show when the participant selected at least one trip option on the application.
- **FR-011**: It MUST list each selected option's description, ordered by option set then option order; a non-zero price adjustment is added in parentheses, e.g. "Extra beach day (+$150.00)" or "Shared room (−$50.00)".

**Fundraising link (Feature 9)**

- **FR-013**: When the application is **approved** and the trip is **active**, the **My Trip Info** header MUST show **My fundraising page**, a link to the participant's public donate page (`/donate/trip/<trip>/participant/<first_last>`, Feature 9) that opens in a new tab, and **Copy link**, which copies the page's full URL and shows "Link copied.". Otherwise neither shows (the public page only accepts approved participants on active trips).

**Data source**

- **FR-012**: `GET /trips/trips/browse/:id` MUST add to `myTripInfo` (only when **FR-002** holds; otherwise `null` / `[]`): `room` (`{ hotelName, roomType, roommates: string[], checkInDate, checkOutDate }` or `null`), `flightPurchaseOption`, `flightSegments` (ordered per **FR-008**: `{ segmentType, segmentNumber, airlineName, flightNumber, departureAirportCode, departureDate, departureTime, arrivalAirportCode, arrivalDate, arrivalTime }`), and `selectedTravelOptions` (`{ id, description, setNumber, priceAdjustment }`, ordered per **FR-011**). The page MUST render only what the API returns.

---

## Assumptions

- "Trip info section" means **My Trip Info** (the signed-in participant's own trip), since flights, room, and options are personal; the general **Trip Info** card is unchanged.
- Rooming data is the **saved** rooming list (as the Room List PDF); unsaved staff edits are not shown.
- Check-out is derived (check-in + nights); no check-out field is stored.
- Room number and rooming list notes are not shown (not requested).
- Read-only for room and trip options; trip options change through the application (**Update App**).

---

## Edge Cases

- Rooming list exists but the participant is not assigned to a room → no **Room** part.
- Assigned to a room but the list has no hotel or check-in → Hotel / Check-in / Check-out "—".
- Self-purchase participant with no segments → no **Flights** part (an approved participant still gets Feature 60's **Enter Flights** next action).
- Segment with cabin class or seat number → not shown (not requested).
- Trip with travel options but none selected → no **Trip options** part.
- Roommate whose application is cancelled but still on the saved room → still listed (the saved rooming list is the source).

---

## Success Criteria

- **SC-001**: A participant can see their room, flights, and trip options on the trip page without staff help.
- **SC-002**: No participant sees another participant's flights or options; roommates show names only.

---

## Data Ownership & Isolation

- Only the signed-in person's own assignment data is returned in `myTripInfo` (existing Feature 53 rule).
- Roommates expose first and last names of people in the same room only — no contact or other details.
- **Edit Flights** uses the existing participant segment access (Feature 60 **FR-014**); no new write access.

---

## Key Entities

| Entity | Use |
|--------|-----|
| `tripRoomingList`, `tripRoom`, `tripRoomAssignment` | Hotel, check-in, room type, nights, roommates |
| `tripFlight`, `tripFlightSegment`, `airport`, `airline` | Flight segments |
| `tripTravelOption`, `tripPeopleRoleOption` | Selected trip options |
| `tripPeopleRole` | `flightPurchaseOption`, status |

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo` adds `room`, `flightPurchaseOption`, `flightSegments`, `selectedTravelOptions` (**FR-012**) |

**`myTripInfo` additions example**

```json
{
  "room": {
    "hotelName": "Hotel Casa",
    "roomType": "Double",
    "roommates": ["Ben Ruiz"],
    "checkInDate": "2027-01-10",
    "checkOutDate": "2027-01-15"
  },
  "flightPurchaseOption": "self",
  "flightSegments": [
    {
      "segmentType": "arrival",
      "segmentNumber": 1,
      "airlineName": "American Airlines",
      "flightNumber": "100",
      "departureAirportCode": "DFW",
      "departureDate": "2027-01-10",
      "departureTime": "08:30",
      "arrivalAirportCode": "GUA",
      "arrivalDate": "2027-01-10",
      "arrivalTime": "12:00"
    }
  ],
  "selectedTravelOptions": [
    { "id": 4, "description": "Extra beach day", "setNumber": 1, "priceAdjustment": 150 }
  ]
}
```

---

## Screen Requirements

| UI | Change |
|----|--------|
| `TripBrowseView` — **My Trip Info** card | Adds **Room**, **Flights** (with **Edit Flights** for self-purchase), and **Trip options** parts below the existing row (**FR-001**–**FR-011**); header adds **My fundraising page** / **Copy link** when approved on an active trip (**FR-013**) |
| `FlightSegmentsDialog` | Reused for **Edit Flights** (**FR-009**) |

---

## Data Model Requirements

None — reads existing rooming, flight, and travel option tables.

---

## Acceptance Criteria (Gherkin)

### US-61.1 — See my room on the trip page

#### Scenario: Trip page returns my room
* **Given** I am approved on a trip whose saved rooming list has hotel "Hotel Casa" and check-in 2027-01-10, and Ben Ruiz and I are in a Double room for 5 nights
* **When** I open that trip's page
* **Then** `myTripInfo.room` is `{ hotelName: "Hotel Casa", roomType: "Double", roommates: ["Ben Ruiz"], checkInDate: "2027-01-10", checkOutDate: "2027-01-15" }`

#### Scenario: No room part without a room assignment
* **Given** my trip has a saved rooming list but I am not assigned to a room
* **When** I open that trip's page
* **Then** `myTripInfo.room` is `null`

#### Scenario: Trip page shows my room
* **Given** my trip's **My Trip Info** has a room in "Hotel Casa", Double, with roommate Ben Ruiz, check-in 2027-01-10 and check-out 2027-01-15
* **When** I open the trip page
* **Then** **My Trip Info** shows Hotel "Hotel Casa", Room type "Double", Roommates "Ben Ruiz", Check-in "01/10/2027", and Check-out "01/15/2027"

#### Scenario: Approved participant sees my fundraising link
* **Given** I am approved on the active trip "Guatemala Clinic" and my name is Ana Lopez
* **When** I open the trip page
* **Then** the **My Trip Info** header shows **My fundraising page** linking to `/donate/trip/Guatemala_Clinic/participant/Ana_Lopez` in a new tab
* **And** **Copy link** copies that page's full URL and shows "Link copied."

#### Scenario: No fundraising link before approval
* **Given** my application on the active trip is applied
* **When** I open the trip page
* **Then** neither **My fundraising page** nor **Copy link** shows

### US-61.2 — See my flights on the trip page

#### Scenario: Trip page returns my flight segments in order
* **Given** I have a Return segment and an Arrival segment on my trip
* **When** I open that trip's page
* **Then** `myTripInfo.flightSegments` lists the Arrival segment first, then the Return segment, with airline name and airport codes

#### Scenario: Cancelled application has no travel details
* **Given** my application on a trip with my room, flight segments, and selected options is cancelled
* **When** I open that trip's page
* **Then** `myTripInfo.room` is `null`, and `flightSegments` and `selectedTravelOptions` are `[]`

#### Scenario: Self-purchase participant can edit flights from the trip page
* **Given** my trip's **My Trip Info** has an Arrival segment AA 100 from DFW to GUA, and I buy my own ticket
* **When** I open the trip page and click **Edit Flights**
* **Then** the **Flights** part shows "American Airlines", "100", "DFW", and "GUA"
* **And** the flight segments dialog opens for my assignment

#### Scenario: Organization-purchase participant sees flights without Edit Flights
* **Given** my trip's **My Trip Info** has flight segments, and the organization buys my ticket
* **When** I open the trip page
* **Then** the **Flights** part shows my segments without **Edit Flights**

### US-61.3 — See my selected trip options on the trip page

#### Scenario: Trip page returns my selected trip options
* **Given** my trip has options "Extra beach day" (+$150) and "City tour" (+$0), and I selected only "Extra beach day"
* **When** I open that trip's page
* **Then** `myTripInfo.selectedTravelOptions` lists only "Extra beach day" with `priceAdjustment` 150

#### Scenario: Trip page shows my selected trip options
* **Given** my trip's **My Trip Info** has selected options "Extra beach day" (+$150) and "City tour" ($0)
* **When** I open the trip page
* **Then** **Trip options** shows "Extra beach day (+$150.00)" and "City tour"

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-61.1 | Trip page returns my room | `backend/tests/trip-page-travel-details.test.js` | `Trip page returns my room` |
| US-61.1 | No room part without a room assignment | `backend/tests/trip-page-travel-details.test.js` | `No room part without a room assignment` |
| US-61.1 | Trip page shows my room | `frontend/tests/TripBrowseTravelDetails.test.js` | `Trip page shows my room` |
| US-61.1 | Approved participant sees my fundraising link | `frontend/tests/TripBrowseTravelDetails.test.js` | `Approved participant sees my fundraising link` |
| US-61.1 | No fundraising link before approval | `frontend/tests/TripBrowseTravelDetails.test.js` | `No fundraising link before approval` |
| US-61.2 | Trip page returns my flight segments in order | `backend/tests/trip-page-travel-details.test.js` | `Trip page returns my flight segments in order` |
| US-61.2 | Cancelled application has no travel details | `backend/tests/trip-page-travel-details.test.js` | `Cancelled application has no travel details` |
| US-61.2 | Self-purchase participant can edit flights from the trip page | `frontend/tests/TripBrowseTravelDetails.test.js` | `Self-purchase participant can edit flights from the trip page` |
| US-61.2 | Organization-purchase participant sees flights without Edit Flights | `frontend/tests/TripBrowseTravelDetails.test.js` | `Organization-purchase participant sees flights without Edit Flights` |
| US-61.3 | Trip page returns my selected trip options | `backend/tests/trip-page-travel-details.test.js` | `Trip page returns my selected trip options` |
| US-61.3 | Trip page shows my selected trip options | `frontend/tests/TripBrowseTravelDetails.test.js` | `Trip page shows my selected trip options` |

---

## Reference Updates

- `features/reference/api.md` — `GET /trips/trips/browse/:id` `myTripInfo` additions
- `features/reference/behavior.md` — trip page **My Trip Info** travel details row

---

## Definition of Done

*   [x] Room, flights, and trip options shown in **My Trip Info** for incomplete / applied / approved applications (**FR-001**–**FR-011**)
*   [x] **Edit Flights** for self-purchase participants opens the flight segments dialog; page reloads after saving (**FR-009**)
*   [x] API returns the `myTripInfo` additions (**FR-012**)
*   [x] **My fundraising page** / **Copy link** in the **My Trip Info** header when approved on an active trip (**FR-013**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend and frontend
*   [ ] On `feature/61-trip-page-my-travel-details`; PR → `dev`

---

## Out of Scope

- Showing these details on the home page **My Trips** list
- Room number, rooming notes, cabin class, seat number
- Editing room or trip options from the trip page
- Staff views (Room List, Flights, Trip Status pages are unchanged)
