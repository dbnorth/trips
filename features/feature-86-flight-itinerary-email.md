# Feature: Flight Itinerary Email

**Feature ID:** 86
**Branch pattern:** `feature/86-flight-itinerary-email`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "add spec for emailing of flight itinerary. Add flight itinerary email template and email tokens (ARRIVAL_FLIGHT and RETURN_FLIGHT that show list of all segment information for each flight). This email can be sent from the flight page (by anyone that can view that page). Add button to Email flight itinerary. The dialog would be the same as the Email Trip participant dialog so you could mail all or selected participants."

Interpreted as:
- Two new email tokens, `{{ARRIVAL_FLIGHT}}` and `{{RETURN_FLIGHT}}`, list every segment of the participant's Arrival flight and Return flight (Feature 30 segments), one line per segment.
- A new email type **Flight itinerary** and a seeded **Trip Participant** template of that type.
- The **Flights** page gets **Email flight itinerary**, which opens a dialog that works like **Email team** (Feature 46): choose a template, edit subject and body for this send, send to all potential, all accepted, or selected participants, preview, send.
- Anyone who can open the Flights page can send it: System Admin, Org Admin of the trip's organization, Trip Leader of the trip, and an Agent of the trip's organization (Feature 85).
- Clarified:
  - The dialog offers only templates of the **Flight itinerary** email type.
  - A participant with no flight segments is skipped with "No flight segments.".
  - The template is seeded for the seed organization only; other organizations' Org Admins create their own.
- Follow-up: "add the confirmation number for the flight (entered on segment entry page) and add a {{FLIGHT_CONFIRMATION_NUM}}". The participant's flight gets one optional **Confirmation number**, entered in the **Flight segments** dialog and saved with the segments, and a token `{{FLIGHT_CONFIRMATION_NUM}}` fills it (FR-008, FR-009).

**Depends on:**
- [Feature 30 — Participant Flights](feature-30-participant-flights.md) (flight segments, Flights page)
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md) (tokens, preview)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md) (dialog, recipients, sending)
- [Feature 85 — Agent Role](feature-85-agent-role.md) (Agents on the Flights page)

---

## User Stories

### US-86.1: Flight tokens list each flight's segments
**As** an Org Admin writing a template  
**I want** tokens that list a participant's arrival and return flights  
**So that** one email gives each person their own itinerary

**Priority:** P1  
**Independent test:** Preview a template containing `{{ARRIVAL_FLIGHT}}` and `{{RETURN_FLIGHT}}` for Ana → each lists her segments of that flight, one per line, in segment order  
**Acceptance scenarios:** see ### US-86.1

### US-86.2: Email the flight itinerary from the Flights page
**As** whoever books the trip's flights (trip staff or an Agent)  
**I want** an **Email flight itinerary** button on the Flights page  
**So that** I can send each participant their flights without leaving the page

**Priority:** P1  
**Independent test:** On the Flights page, **Email flight itinerary** → choose the seeded template, **All accepted participants**, **Send** → each accepted participant with segments gets an email with their own flights; those without segments are skipped "No flight segments."  
**Acceptance scenarios:** see ### US-86.2

---

## Requirements

### Functional Requirements

**Tokens**

- **FR-001**: Two new token value sources and seeded tokens:

  | Token | Value source | Description |
  |-------|--------------|-------------|
  | `ARRIVAL_FLIGHT` | `participant.arrivalFlight` | Participant arrival flight |
  | `RETURN_FLIGHT` | `participant.returnFlight` | Participant return flight |
  | `FLIGHT_CONFIRMATION_NUM` | `participant.flightConfirmationNumber` | Participant flight confirmation number (FR-009) |

  The seeds (`npm run seed`) add them when missing, like the other seeded tokens, and they appear in every **Insert token** list for **Subject** and **Email body**.
- **FR-002**: Each token lists the segments of that flight type (**Arrival** or **Return**), ordered by segment number, one segment per line (like the other list tokens). The segments come from the participant's earliest assignment on the trip that is incomplete, applied, or approved and has flight segments. Each line reads:

  `<airline name> <airline code> <flight number>: <departure airport code> (<departure city>) <departure date> <departure time> to <arrival airport code> (<arrival city>) <arrival date> <arrival time>, <cabin class>, seat <seat number>`

  For example: `American Airlines AA 100: BNA (Nashville) March 1, 2027 8:00 AM to MIA (Miami) March 1, 2027 11:00 AM, Economy, seat 12A`.
  - Dates read like `March 1, 2027` and times like `8:00 AM` (12-hour).
  - A blank city leaves out its parentheses; a blank cabin class or seat number leaves out that part and its comma.
  - No segments of that type → empty.
- **FR-003**: The tokens work wherever participant tokens do (template Preview, Send Now, Scheduled, Email team, Email people with one trip, and FR-005). With no participant they're empty.

**Email type and template**

- **FR-004**: A new seeded email type `flight-itinerary` (**Flight itinerary**, event code `team-email`, which nothing sends automatically), added by the seeds (`npm run seed`) when missing. The template seed adds, for the seed organization, a **Trip Participant** template of that type:
  - **From email** `{{ORG_EMAIL}}`
  - **To** `{{PARTICIPANT_EMAIL}}`
  - **Subject** `Your {{TRIP_NAME}} flight itinerary`
  - **Email body**:

    ```text
    Hi {{PARTICIPANT_FIRST_NAME}},

    Here is your flight itinerary for {{TRIP_NAME}} ({{PARTICIPANT_ARRIVAL_DATE}} to {{PARTICIPANT_DEPARTURE_DATE}}).

    Confirmation number: {{FLIGHT_CONFIRMATION_NUM}}

    Arrival flight:
    {{ARRIVAL_FLIGHT}}

    Return flight:
    {{RETURN_FLIGHT}}

    If anything looks wrong, reply to this email.

    Blessings,
    {{ORG_NAME}}
    ```

  Org Admins create more templates of this type with the existing template form (Function code **Trip Participant**, for the organization or one trip).

**Flights page and dialog**

- **FR-005**: The **Flights** page has an **Email flight itinerary** button beside **Flights PDF**, for everyone who can open the page. It's disabled while the page is loading. It opens the **Email flight itinerary** dialog, which works like **Email team** (Feature 46), with these differences:
  - **Template** lists only the trip's and its organization's **Trip Participant** templates whose email type is **Flight itinerary**, by subject. None → "No flight itinerary templates for this trip." and **Preview** / **Send** disabled.
  - Everything else matches **Email team**:
    - choosing a template fills **Subject** and **Email body**, editable for this send only
    - **Send to**: **All potential participants**, **All accepted participants**, or **Selected participants**, with the recipient count
    - **Preview as** and **Preview**
    - "Are you sure?" with "Send this email to N participants?"
    - one email per recipient to their own email, logged per email
    - the "Sent N, skipped N, failed N" results with each skipped or failed participant and the reason
- **FR-006**: A recipient with no flight segments on the trip (on the assignment FR-002 would use) isn't sent the email. They're counted as skipped with the reason "No flight segments.", and the rest still send. **Preview as** such a participant shows "No flight segments." instead of the preview.
- **FR-007**: The dialog's endpoints allow exactly the users who can open the trip's Flights page (System Admin, Org Admin of the trip's organization, Trip Leader of the trip, Agent of the trip's organization). Anyone else gets `403`, and an unknown trip `404`. A template that isn't a **Flight itinerary** Trip Participant template of the trip or its organization → `400` "Choose a flight itinerary template for this trip.".

**Confirmation number**

- **FR-008**: A participant's flight (`tripFlight`) gets an optional **confirmation number** (`confirmationNumber`, up to 50 characters, blank by default).
  - The **Flight segments** dialog (Flights page, Home, trip page) shows a **Confirmation number** text field directly above **Arrival Flight**, filled with the saved value.
  - Saving the dialog saves it with the segments, trimmed; an empty field saves blank. Longer than 50 characters → "Confirmation number must be 50 characters or fewer." and nothing is saved.
  - Whoever can save the segments can change it: trip staff, Agents, and the participant when they book their own flight (Feature 60).
- **FR-009**: `{{FLIGHT_CONFIRMATION_NUM}}` is the confirmation number of the participant's flight on the assignment FR-002 uses (the earliest incomplete, applied, or approved assignment on the trip with flight segments), or empty. It works wherever the other flight tokens do (FR-003).

---

## Assumptions

- **Email team** still lists every Trip Participant template, including **Flight itinerary** ones; the flight tokens work there too.
- An Agent sends with the template's **From email** (the organization's email in the seeded template), so replies go to the organization.
- The participant's planned arrival/departure dates and flight notes aren't part of the flight tokens; the seeded template shows the dates with `{{PARTICIPANT_ARRIVAL_DATE}}` / `{{PARTICIPANT_DEPARTURE_DATE}}` (Feature 78), so a participant arriving early or leaving late sees their own dates.
- One confirmation number covers the participant's whole trip (arrival and return), as one booking usually does. A second booking's number can go in **Comments** on the Flights page.

## Edge Cases

- Ana has Arrival segments but no Return segments → she's sent the email; `{{RETURN_FLIGHT}}` is empty.
- Ana is both a Trip Leader and a Trip Participant on the trip → one email, using the earliest assignment with segments.
- A segment without a seat number → `American Airlines AA 200: MIA (Miami) March 1, 2027 1:00 PM to GUA (Guatemala City) March 1, 2027 4:30 PM, Economy`.
- An overnight segment → its arrival date is the next day, as entered.
- **Selected participants** with nobody chosen → **Send** disabled, as in **Email team**.
- Every chosen participant lacks segments → "Sent 0, skipped N, failed 0", each "No flight segments.".
- A confirmation number with spaces around it (" QX7P2M ") → saved "QX7P2M".
- Segments saved without a confirmation number → `{{FLIGHT_CONFIRMATION_NUM}}` is empty; the seeded template still shows "Confirmation number:" with nothing after it.

## Success Criteria

- **SC-001**: From the Flights page, one send gives every accepted participant with flights an email listing their own arrival and return segments.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

Each email holds only the recipient's own flights. The dialog shows the trip's participant names, which everyone who can open the Flights page already sees. An Agent can email only participants of their organization's trips, and only with **Flight itinerary** templates. They can't send other templates, edit templates, or email other trips (FR-007).

---

## Key Entities

- **emailToken** — seeded `ARRIVAL_FLIGHT`, `RETURN_FLIGHT`, `FLIGHT_CONFIRMATION_NUM`.
- **tripFlight** — new `confirmationNumber`.
- **emailType** — seeded `flight-itinerary`.
- **emailTemplate** — seeded **Flight itinerary** template for the seed organization.
- **tripFlightSegment** — read for the token values.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| GET | `/trips/trips/:id/flight-itinerary-email/templates` | **Flight itinerary** Trip Participant templates of the trip and its organization (`id`, `tripId`, `subject`, `emailBody`, `fromEmail`, `emailTypeId`), by subject (FR-005, FR-007) |
| POST | `/trips/trips/:id/flight-itinerary-email/preview` | Body and response as `POST /trips/trips/:id/team-email/preview`; a participant without flight segments → `400` "No flight segments." (FR-006) |
| POST | `/trips/trips/:id/flight-itinerary-email` | Body and response as `POST /trips/trips/:id/team-email`; recipients without segments are `skipped` with reason "No flight segments." (FR-006) |
| GET | `/trips/email-tokens/value-sources` | Adds `participant.arrivalFlight` "Participant arrival flight", `participant.returnFlight` "Participant return flight", and `participant.flightConfirmationNumber` "Participant flight confirmation number" (FR-001) |
| GET | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | Returns `confirmationNumber` (string or `null`) (FR-008) |
| PUT | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | Accepts optional `confirmationNumber` (trimmed, empty → `null`, left out → unchanged); over 50 characters → `400` "Confirmation number must be 50 characters or fewer." and nothing is saved (FR-008) |
| GET / POST | `/trips/email-tokens`, `/trips/email-templates/preview` | List the new tokens and fill their values (FR-001–FR-003) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Flights** page | **Email flight itinerary** button beside **Flights PDF** (FR-005) |
| **Email flight itinerary** dialog | **Email team** dialog with the title **Email flight itinerary**, the flight itinerary template list, and the FR-006 skip (FR-005, FR-006) |
| **Flight segments** dialog (`FlightSegmentsDialog`) | **Confirmation number** field above **Arrival Flight**, saved with the segments (FR-008) |
| Template form **Insert token** lists | **Participant arrival flight** / **Participant return flight** / **Participant flight confirmation number** (FR-001) |

---

## Data Model Requirements

| Table | Column | Type | Notes |
|-------|--------|------|-------|
| tripFlight | confirmationNumber | STRING(50) | nullable; added by `ensureSchema` |

Seed rows: email tokens `ARRIVAL_FLIGHT`, `RETURN_FLIGHT`, `FLIGHT_CONFIRMATION_NUM`; email type `flight-itinerary`; the seed organization's **Flight itinerary** template.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions"; trip "Guatemala Clinic 2027", March 1–10, 2027.
- Org Admin Omar, Trip Leader Tom, and Agent Alex (Feature 85).
- Airports BNA (Nashville), MIA (Miami), GUA (Guatemala City); airline AA (American Airlines).
- Ana Lopez, approved Trip Participant, has these flight segments:
  - Arrival 1: AA 100, BNA March 1, 2027 08:00 → MIA March 1, 2027 11:00, Economy, seat 12A
  - Arrival 2: AA 200, MIA March 1, 2027 13:00 → GUA March 1, 2027 16:30, Economy, no seat
  - Return 1: AA 300, GUA March 10, 2027 09:00 → BNA March 10, 2027 14:00, Economy, seat 8B
  - Confirmation number "QX7P2M"
- Ben Cruz, approved Trip Participant, has no flight segments.
- Hope Missions has the seeded **Flight itinerary** template and a **Trip team update** Trip Participant template.

### US-86.1 — Flight tokens list each flight's segments

#### Scenario: Flight tokens list each flight's segments
* **When** Omar previews a template with the body "{{FLIGHT_CONFIRMATION_NUM}} / {{ARRIVAL_FLIGHT}} / {{RETURN_FLIGHT}}" for Ana
* **Then** `{{FLIGHT_CONFIRMATION_NUM}}` is "QX7P2M"
* **And** `{{ARRIVAL_FLIGHT}}` is
  ```text
  American Airlines AA 100: BNA (Nashville) March 1, 2027 8:00 AM to MIA (Miami) March 1, 2027 11:00 AM, Economy, seat 12A
  American Airlines AA 200: MIA (Miami) March 1, 2027 1:00 PM to GUA (Guatemala City) March 1, 2027 4:30 PM, Economy
  ```
* **And** `{{RETURN_FLIGHT}}` is "American Airlines AA 300: GUA (Guatemala City) March 10, 2027 9:00 AM to BNA (Nashville) March 10, 2027 2:00 PM, Economy, seat 8B"
* **And** previewing for Ben gives all three tokens empty

#### Scenario: The confirmation number is saved with the flight segments
* **When** Tom saves Ana's flight segments with the confirmation number " LM4K9Z "
* **Then** Ana's flight has the confirmation number "LM4K9Z"
* **And** saving a confirmation number of 51 characters is refused with "Confirmation number must be 50 characters or fewer." and nothing is saved
* **And** saving the segments without a confirmation number keeps "LM4K9Z"

#### Scenario: Seeds add the flight itinerary tokens, type, and template
* **When** the seeds (`npm run seed`) run for the seed organization
* **Then** tokens `ARRIVAL_FLIGHT`, `RETURN_FLIGHT`, and `FLIGHT_CONFIRMATION_NUM` and email type `flight-itinerary` (**Flight itinerary**) exist
* **And** the seed organization has a **Trip Participant** template of that type with subject "Your {{TRIP_NAME}} flight itinerary"

### US-86.2 — Email the flight itinerary from the Flights page

#### Scenario: Only flight itinerary templates are offered
* **When** Tom opens **Email flight itinerary** on the Flights page
* **Then** **Template** lists "Your {{TRIP_NAME}} flight itinerary" and not the **Trip team update** template
* **And** sending with the **Trip team update** template is refused with "Choose a flight itinerary template for this trip."

#### Scenario: The flight itinerary goes to each participant with their own flights
* **When** Tom sends the seeded template to **All accepted participants**
* **Then** Ana gets one email with "Confirmation number: QX7P2M" and listing her two arrival segments and her return segment
* **And** Ben is skipped with "No flight segments."
* **And** the result is "Sent 1, skipped 1, failed 0"

#### Scenario: An Agent can email the flight itinerary
* **When** Alex sends the seeded template to **Selected participants** Ana
* **Then** Ana gets the email

#### Scenario: Only users who can open the Flights page can send it
* **When** Ana (a participant) requests the flight itinerary templates or sends the email
* **Then** the request is refused with `403`

#### Scenario: The Flights page opens Email flight itinerary
* **When** Tom opens the Flights page
* **Then** an **Email flight itinerary** button shows beside **Flights PDF**
* **And** clicking it opens the **Email flight itinerary** dialog with the flight itinerary templates and **Send to** choices **All potential participants**, **All accepted participants**, **Selected participants**

#### Scenario: The Flight segments dialog has a Confirmation number
* **When** Tom opens Ana's **Flight segments** dialog
* **Then** a **Confirmation number** field shows "QX7P2M" above **Arrival Flight**
* **And** changing it to "QX7P2N" and saving sends the confirmation number "QX7P2N" with the segments

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-86.1 | Flight tokens list each flight's segments | `backend/tests/flight-itinerary-email.test.js` | `Flight tokens list each flight's segments` |
| US-86.1 | The confirmation number is saved with the flight segments | `backend/tests/flight-itinerary-email.test.js` | `The confirmation number is saved with the flight segments` |
| US-86.1 | Seeds add the flight itinerary tokens, type, and template | `backend/tests/flight-itinerary-email.test.js` | `Seeds add the flight itinerary tokens, type, and template` |
| US-86.2 | Only flight itinerary templates are offered | `backend/tests/flight-itinerary-email.test.js` | `Only flight itinerary templates are offered` |
| US-86.2 | The flight itinerary goes to each participant with their own flights | `backend/tests/flight-itinerary-email.test.js` | `The flight itinerary goes to each participant with their own flights` |
| US-86.2 | An Agent can email the flight itinerary | `backend/tests/flight-itinerary-email.test.js` | `An Agent can email the flight itinerary` |
| US-86.2 | Only users who can open the Flights page can send it | `backend/tests/flight-itinerary-email.test.js` | `Only users who can open the Flights page can send it` |
| US-86.2 | The Flights page opens Email flight itinerary | `frontend/tests/FlightItineraryEmail.test.js` | `The Flights page opens Email flight itinerary` |
| US-86.2 | The Flight segments dialog has a Confirmation number | `frontend/tests/FlightItineraryEmail.test.js` | `The Flight segments dialog has a Confirmation number` |

---

## Agent implementation request

```text
Implement Feature 86 from @features/feature-86-flight-itinerary-email.md on branch `feature/86-flight-itinerary-email`.

Follow layer order in @features/framework.md.
Backend: tripFlight.confirmationNumber (STRING(50) NULL) in the model and ensureSchema; segments GET returns it and PUT accepts it (FR-008). Value sources participant.arrivalFlight / participant.returnFlight (FR-002 line format) / participant.flightConfirmationNumber in emailTokenValues.js, tokens ARRIVAL_FLIGHT / RETURN_FLIGHT / FLIGHT_CONFIRMATION_NUM in seedEmailTokens.js, email type flight-itinerary in seedEmailTypes.js, the seed template in data/emailTemplates.json. Flight itinerary email endpoints (templates, preview, send) reusing the Email team request/send logic with Flights-page access (canManageTripFlights, incl. Agents), templates limited to the flight-itinerary email type, and the "No flight segments." skip.
Frontend: TripServices calls; TripTeamEmailDialog reused (or parameterized) for the Email flight itinerary dialog; Email flight itinerary button on TripFlightsView; Confirmation number field in FlightSegmentsDialog.
Tests per the Test Coverage Map. Update features/reference (behavior.md, api.md, data-model.md).
```

---

## Definition of Done

*   [x] Tokens per **FR-001**–**FR-003**
*   [x] Email type and seeded template per **FR-004**
*   [x] Flights page button, dialog, skip, and access per **FR-005**–**FR-007**
*   [x] Confirmation number and token per **FR-008**–**FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/` (behavior, api, data-model) updated
*   [ ] PR to `dev`

## Out of Scope

- Sending the itinerary automatically (Send Now on segment save, or Scheduled)
- Separate confirmation numbers for the arrival and return flights, or per segment
- Importing the Trip Master **Flight Confirmation** column (Feature 80 still ignores it)
- Showing the confirmation number on the Flights page, the Flights PDF, or **My Trip Info**
- Attaching the Flights PDF or a per-participant itinerary PDF
- Agents creating or editing templates
- Seeding the template for organizations other than the seed organization
