# Feature: Application Flight Notes

**Feature ID:** 84
**Branch pattern:** `feature/84-application-flight-notes`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "add using the departure city and arrival city imported flight notes in the application."

Interpreted as:
- The application (trip application, Feature 7) has no free-text flight field today; its flight fields are the flight purchase option and the organization booking preferences (Feature 30).
- Clarified: add a **Flight notes** text field to the application. The Trip Master import (Feature 80) fills it from the **Departure City** and **Arrival City** columns, e.g. "Departure city: Nashville. Arrival city: Nashville."
- Participants can read and edit it on their application, and staff see it when viewing the application and on the Flights page.
- Follow-up: "add to display the flight note on the Flight segment entry page below the current participant requested flight info." → the **Flight segments** dialog shows the flight notes under its "Requested: …" line (FR-008).
- Follow-up: "add on the flights page an info icon next to the booked by that on hover shows all the requested participant flight info." Clarified: the icon's tooltip replaces the preferences text under **Booked by** (Feature 73) and holds the flight notes too (FR-007).
- In the real Trip Master, 14 of 50 people have both cities (always the same city in both, e.g. "Nashville", "Dayton, OH"); 36 have neither. Cities aren't matched to airports, because many match several (e.g. "Dayton" → DAY, FFO, MGY).

**Depends on:**
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md)
- [Feature 30 — Participant Flights](feature-30-participant-flights.md) (flight purchase on the application, Flights page)
- [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md)

---

## User Stories

### US-84.1: The import keeps the Trip Master's cities as flight notes
**As** an Org Admin importing a Trip Master  
**I want** each person's Departure City and Arrival City kept on their application  
**So that** whoever books flights knows where people fly from without the spreadsheet

**Priority:** P2  
**Independent test:** Import a file where Lyle's Departure City and Arrival City are "Dayton, OH" → Lyle's application has the flight notes "Departure city: Dayton, OH. Arrival city: Dayton, OH."; Ana, with neither, has none  
**Acceptance scenarios:** see ### US-84.1

### US-84.2: Participants and staff see and edit flight notes
**As** a participant  
**I want** a **Flight notes** box with my flight purchase choice  
**So that** I can tell the trip staff where I'm flying from or anything else about my flights

**As** trip staff  
**I want** to see each participant's flight notes on their application and on the Flights page  
**So that** I can book flights without asking again

**As** trip staff entering flight segments  
**I want** the participant's flight notes right under what they requested  
**So that** I can enter their flights without leaving the dialog

**Priority:** P2  
**Independent test:** Ana enters "Flying from Nashville, back to Memphis" on her application and saves → viewing her application, the Flights page, and her **Flight segments** dialog all show it  
**Acceptance scenarios:** see ### US-84.2

---

## Requirements

### Functional Requirements

**Data**

- **FR-001**: The application (`tripPeopleRole`) gets an optional text field **flight notes** (`flightNotes`, blank by default). It isn't required for any status and isn't a missing item (Feature 27).

**Import**

- **FR-002**: The Trip Master import reads the optional columns **Departure City** and **Arrival City** (by column name, Feature 80 FR-011). A file without them imports as before.
- **FR-003**: When a row has a Departure City or an Arrival City, and its application's flight notes are blank, the import sets them to "Departure city: <Departure City>. Arrival city: <Arrival City>.", leaving out the part whose city is blank (e.g. "Arrival city: Nashville."). Values are trimmed. Flight notes that already have text are left alone (Feature 80 fills only blank fields), so re-importing changes nothing.
- **FR-004**: This applies to every row the import gives an application (main section, Team Leader, cancellations), as with the other application fields. Waiting-list rows still get no application.

**Application form**

- **FR-005**: The apply dialog and the edit-application page show an optional **Flight notes** text area (3 rows, auto-growing) under the **Flight purchase** choices, whichever option is chosen. Its hint is "For example, the city you'll fly from." Saving the application saves it, trimmed; an empty box saves blank. Changing the flight purchase option doesn't clear it.

**Staff views**

- **FR-006**: The staff **View application** dialog shows a **Flight notes** row in its **Flight purchase** table, after the option and preferences, with "—" when blank.
- **FR-007**: On the **Flights** page, the **Booked by** cell shows only who books the flight (Feature 73), followed by an info icon (`mdi-information-outline`, small, `aria-label` "Requested flight info", keyboard focusable) when the participant has requested flight info. The preferences text no longer shows under the value. Hovering or focusing the icon shows a tooltip with the heading "Requested flight info" and one line per item that has a value, in this order:
  - When the organization books the flight: "Preferred departure airport: BNA (Nashville)", "Preferred return airport: BNA (Nashville)", "Class of travel: Economy", "Preferred airline: AA — American Airlines", "Refundable ticket: Yes" (or "No").
  - For either option: "Flight notes: <flight notes>", keeping line breaks.

  A participant with none of these (e.g. books their own flight and has no flight notes) shows no icon.
- **FR-008**: The **Flight segments** dialog (Feature 79; opened from the Flights page, Home, and the trip page) shows "**Flight notes:** <flight notes>" directly below the "**Requested:** …" line. When there is no Requested line (the participant books their own flight, or the organization has no preferences), it shows in that line's place, under **Planned arrival** / **Planned departure**. It shows for either flight purchase option, keeps line breaks, and is hidden when the flight notes are blank. It's read-only there.

---

## Assumptions

- Staff change flight notes through the participant's application (or ask the participant); the staff participant **Edit** dialog doesn't gain the field.
- Flight notes are plain text; line breaks are kept and shown as typed.

## Edge Cases

- Departure City "Nashville", Arrival City blank → "Departure city: Nashville."
- Both cities blank → flight notes stay as they were (blank for new applications).
- The application already has flight notes (typed by the participant or set by an earlier import) → the import leaves them alone.
- A city with extra spaces or a line break ("Nashville ") → trimmed.
- A participant clears the box and saves → flight notes become blank; a later import fills them again from the cities.

## Success Criteria

- **SC-001**: After importing the real Trip Master, the 14 people with cities have flight notes and the others don't.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No change. Flight notes belong to the application: the participant edits their own (Feature 7), and only staff who can already view the application or the trip's Flights page see them (Feature 30).

---

## Key Entities

- **tripPeopleRole** — new `flightNotes`.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| POST | `/trips/trips/:id/import-trip-master` | Fills `flightNotes` (FR-002–FR-004). Response unchanged |
| POST / PUT | The participant apply and update-application endpoints (Feature 7) | Accept optional `flightNotes` (string; trimmed, empty → null) and return it |
| GET | The application endpoints used by the view-application dialog and edit page | Return `flightNotes` |
| GET | The Flights page participants endpoint (Feature 30) | Return `flightNotes` per participant |
| GET | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | Return `flightNotes` (FR-008) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Apply** dialog, **Edit application** page | **Flight notes** text area under **Flight purchase** (FR-005) |
| **View application** dialog | **Flight notes** row in **Flight purchase** (FR-006) |
| **Flights** page | **Booked by**: info icon with the requested flight info and flight notes on hover; the preferences text under the value is removed (FR-007) |
| **Flight segments** dialog (`FlightSegmentsDialog`) | "Flight notes: …" below "Requested: …" (FR-008) |

---

## Data Model Requirements

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| tripPeopleRole | flightNotes | TEXT | nullable; added by `ensureSchema` like other application columns |

---

## Acceptance Criteria (Gherkin)

Background: the Feature 80 Background (trip "Guatemala Clinic 2027", file `trip-master-sample.csv`), where Lyle Lowry's Departure City and Arrival City are "Dayton, OH" and nobody else has a city. Ana Lopez is a participant on the trip with an incomplete application. Trip Leader Tom leads the trip.

### US-84.1 — The import keeps the Trip Master's cities as flight notes

#### Scenario: Departure and arrival cities become flight notes
* **When** Omar imports the file
* **Then** Lyle's application has the flight notes "Departure city: Dayton, OH. Arrival city: Dayton, OH."
* **And** Kris's application has no flight notes

#### Scenario: Flight notes that already have text are kept
* **Given** Lyle already applied to the trip with the flight notes "Flying from Columbus"
* **When** Omar imports the file
* **Then** Lyle's flight notes are still "Flying from Columbus"

### US-84.2 — Participants and staff see and edit flight notes

#### Scenario: A participant saves flight notes on the application
* **When** Ana enters "Flying from Nashville, back to Memphis" in **Flight notes** on her application and saves
* **Then** her application's flight notes are "Flying from Nashville, back to Memphis"

#### Scenario: The application form shows Flight notes under Flight purchase
* **When** Ana opens her application to edit it
* **Then** a **Flight notes** box shows her saved flight notes under the **Flight purchase** choices

#### Scenario: Staff see flight notes on the application
* **Given** Ana's flight notes are "Flying from Nashville, back to Memphis"
* **When** Tom views her application
* **Then** its **Flight purchase** table shows **Flight notes** "Flying from Nashville, back to Memphis"

#### Scenario: The Flights page shows requested flight info from an info icon
* **Given** the organization books Ana's flight, with preferred departure and return BNA (Nashville), class Economy, airline AA (American Airlines), a refundable ticket, and the flight notes "Flying from Nashville, back to Memphis"
* **And** Ben books his own flight and has no flight notes
* **When** Tom opens the Flights page
* **Then** Ana's **Booked by** cell shows "Hope Missions" and an info icon named "Requested flight info", and no preferences text
* **And** hovering the icon shows "Requested flight info" and the lines "Preferred departure airport: BNA (Nashville)", "Preferred return airport: BNA (Nashville)", "Class of travel: Economy", "Preferred airline: AA — American Airlines", "Refundable ticket: Yes", "Flight notes: Flying from Nashville, back to Memphis", in that order
* **And** Ben's **Booked by** cell shows "Participant" and no info icon

#### Scenario: The Flight segments dialog shows flight notes below the request
* **Given** the organization books Ana's flight, she requested departure BNA, and her flight notes are "Flying from Nashville, back to Memphis"
* **When** Tom opens Ana's **Flight segments** dialog
* **Then** "Flight notes: Flying from Nashville, back to Memphis" shows directly below "Requested: Departure BNA (Nashville)"
* **And** when Ana books her own flight instead, the flight notes line still shows, under the planned dates, with no Requested line

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-84.1 | Departure and arrival cities become flight notes | `backend/tests/trip-master-import.test.js` | `Departure and arrival cities become flight notes` |
| US-84.1 | Flight notes that already have text are kept | `backend/tests/trip-master-import.test.js` | `Flight notes that already have text are kept` |
| US-84.2 | A participant saves flight notes on the application | `backend/tests/applications.test.js` | `A participant saves flight notes on the application` |
| US-84.2 | The application form shows Flight notes under Flight purchase | `frontend/tests/ApplicationFlightNotes.test.js` | `The application form shows Flight notes under Flight purchase` |
| US-84.2 | Staff see flight notes on the application | `frontend/tests/ApplicationFlightNotes.test.js` | `Staff see flight notes on the application` |
| US-84.2 | The Flights page shows requested flight info from an info icon | `frontend/tests/TripFlights.test.js` | `The Flights page shows requested flight info from an info icon` |
| US-84.2 | The Flight segments dialog shows flight notes below the request | `frontend/tests/ApplicationFlightNotes.test.js` | `The Flight segments dialog shows flight notes below the request` |

---

## Agent implementation request

```text
Implement Feature 84 from @features/feature-84-application-flight-notes.md on branch `feature/84-application-flight-notes`.

Follow layer order in @features/framework.md.
Backend: tripPeopleRole.flightNotes (TEXT NULL) in the model and ensureSchema; the participant apply/update-application endpoints accept and return it; the Flights participants endpoint and the flight segments GET return it. Trip Master import: optional "Departure City" / "Arrival City" columns fill blank flightNotes (FR-003).
Frontend: Flight notes textarea in TripApplicationFlightPurchase (apply dialog + edit page), a row in ViewTripApplicationDialog, an info icon after Booked by on TripFlightsView whose tooltip lists the requested flight info and flight notes (replacing the preferences text under it), and "Flight notes: …" below "Requested: …" in FlightSegmentsDialog.
Tests per the Test Coverage Map. Update the Feature 80 column table and features/reference (behavior.md, api.md, data-model.md).
```

---

## Definition of Done

*   [x] `flightNotes` on the application per **FR-001**
*   [x] Import fills flight notes per **FR-002**–**FR-004**
*   [x] Application form, view-application dialog, Flights page, and Flight segments dialog per **FR-005**–**FR-008**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/` (behavior, api, data-model) updated, including the Feature 73 **Booked by** row (preferences text moves into the info icon), and the Feature 80 column table
*   [ ] PR to `dev`

## Out of Scope

- Matching cities to airports or setting the preferred departure/return airports
- Importing **Flight Departure**, **Flight Arrival**, or **Flight Confirmation**, or creating flight segments
- Flight notes in the staff participant **Edit** dialog, the Flights PDF, the Trip Status board, or exports
- A length limit or formatting for flight notes
