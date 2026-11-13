# Feature: Hide Participant Flight Links

**Feature ID:** 134
**Branch pattern:** `feature/134-hide-participant-flight-links`
**Status:** Implemented
**Created:** 2026-11-13
**Input:** "Remove the link for a participant to add or edit a flight. Don't remove any other code; we might add it back."
**Depends on:** [Feature 60 — My Trips Next Actions](feature-60-my-trips-next-actions.md), [Feature 61 — Trip Page My Travel Details](feature-61-trip-page-my-travel-details.md), [Feature 79 — Flights Planned Dates](feature-79-flights-planned-dates.md), [Feature 119 — My Trip Page](feature-119-my-trip-page.md)

A participant who books their own flight can open the flight segments dialog from **Add Flights** or **Edit Flights** on **My Trip**, and from **Enter Flights** or **Edit Flights** on their next steps. This feature stops showing those buttons. The dialog, the code that opens it, and the participant's permission to save their own segments stay in the application so the buttons can be shown again later.

## Clarifications

- Q: Which links come off? → A: Every participant button that opens the flight segments dialog: **Add Flights** and **Edit Flights** on **My Trip** under **Flights**, **Enter Flights** on the "Enter your flight info." next step, and **Edit Flights** on the arrival and return date-mismatch next steps. Those next steps show on **Home** and on **My Trip**.
- Q: What stays? → A: The flight segments dialog, the handlers that open it, and the participant's existing permission to read and save their own segments. Staff and Agents keep **Flight segments** on the Flights page. Saved flights still show on **My Trip**.
- Q: Do the next-step sentences stay? → A: Yes. Only the buttons are hidden.

---

## User Stories

### US-134.1: A participant no longer opens the flight editor

**As a** participant
**I want** no button for adding or editing my flights
**So that** I see my flights without a way to change them

**Priority:** P1
**Independent test:** A participant who books their own flight opens **My Trip**. **Flights** shows their segments, or "Not yet available" when they have none, and has no **Add Flights** or **Edit Flights**. On **Home**, "Enter your flight info." has no **Enter Flights**, and a date-mismatch sentence has no **Edit Flights**.
**Acceptance scenarios:** see ### US-134.1

---

## Requirements

### Functional Requirements

- **FR-001**: **My Trip** MUST NOT show **Add Flights** or **Edit Flights**, including when the participant books their own flight and when they already have segments. **Flights** still lists saved segments, or "Not yet available" when there are none (Feature 119). This replaces the **Add Flights** / **Edit Flights** button in Feature 119 **FR-009** and Feature 61 **FR-009**.
- **FR-002**: Next steps MUST NOT show **Enter Flights** or **Edit Flights**. The sentences stay: "Enter your flight info.", "Your arrival flight lands *date*, but you are planned to arrive *date*.", and "Your return flight leaves *date*, but you are planned to depart *date*." This applies on **Home** under **My Trips** and on **My Trip**. This replaces the buttons in Feature 60 **FR-013** and Feature 79's mismatch **Edit Flights**. The API may still return `enter-flights`, the mismatch actions, and `canEditFlights`.
- **FR-003**: The flight segments dialog, the code that opens it from those buttons, and a participant's permission to get and replace their own segments when they book their own flight (Feature 60 **FR-014**) MUST remain. This feature does not delete that code and does not change who the API allows.
- **FR-004**: Staff and Agent flight editing is unchanged. The Flights page still has **Flight segments**, cost, comments, the Flights PDF, and **Email flight itinerary**.

---

## Assumptions

- "The link" means all four participant buttons that open the same dialog, not only the one under **Flights** on **My Trip**. Leaving **Enter Flights** on **Home** would still let a participant add a flight.
- Hiding a button is enough. The button's component and click handler stay in the source so they can be shown again without being rewritten.

## Edge Cases

- The organization books the flight → **My Trip** already has no **Add Flights** or **Edit Flights**. It still does not.
- The participant has no segments → **Flights** says "Not yet available" and has no **Add Flights**.
- The participant has segments → the segment table still shows, with no **Edit Flights**.
- A date mismatch for a participant who books their own flight → the sentence shows, with no **Edit Flights**. The row stays yellow, as Feature 79 already specifies.
- "Enter your flight info." still shows when that next step applies. It has no button.

## Success Criteria

- **SC-001**: A participant has no **Add Flights**, **Edit Flights**, or **Enter Flights** button on **My Trip** or **Home**.
- **SC-002**: Saved flights still show on **My Trip**, and the next-step sentences still show.
- **SC-003**: The flight segments dialog and the participant segment API remain available to the existing callers.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged. Who may read or save flight segments stays as Feature 60 **FR-014**.

---

## Key Entities

- **Trip flight segment**: unchanged. No new field.

---

## API Requirements

None. `GET` and `PUT /trips/trips/:id/flights/:tripPeopleRoleId/segments` stay as they are, including a participant saving their own segments when they book their own flight. Next-action payloads stay as they are.

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **My Trip** — **Flights** | No **Add Flights** and no **Edit Flights**. The heading, "Not yet available", and the segment table stay. |
| **Home** — **My Trips** next steps, and **My Trip** next steps | No **Enter Flights** and no **Edit Flights**. The sentences stay. |
| Flights page | No change. **Flight segments** stays for staff and Agents. |

The flight segments dialog is not opened from a participant screen. It stays in the application for the Flights page and for the hidden participant handlers.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-134.1 — A participant no longer opens the flight editor

#### Scenario: My Trip does not offer Add Flights
* **Given** I am a participant who books my own flight and I have no flight segments
* **When** I open **My Trip**
* **Then** **Flights** says "Not yet available"
* **And** there is no **Add Flights** button

#### Scenario: My Trip does not offer Edit Flights
* **Given** I am a participant who books my own flight and I have a flight segment
* **When** I open **My Trip**
* **Then** **Flights** shows that segment
* **And** there is no **Edit Flights** button

#### Scenario: Enter your flight info has no Enter Flights button
* **Given** my next steps include "Enter your flight info."
* **When** I view that step on **Home** or **My Trip**
* **Then** the sentence is shown
* **And** there is no **Enter Flights** button

#### Scenario: A flight date mismatch has no Edit Flights button
* **Given** my next steps include "Your arrival flight lands 06/08/2027, but you are planned to arrive 06/07/2027."
* **And** I book my own flight
* **When** I view that step
* **Then** the sentence is shown
* **And** there is no **Edit Flights** button

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-134.1 | My Trip does not offer Add Flights | `frontend/tests/MyTripView.test.js` | `My Trip does not offer Add Flights` |
| US-134.1 | My Trip does not offer Edit Flights | `frontend/tests/MyTripView.test.js` | `My Trip does not offer Edit Flights` |
| US-134.1 | Enter your flight info has no Enter Flights button | `frontend/tests/HomeNextActions.test.js` | `Enter your flight info has no Enter Flights button` |
| US-134.1 | A flight date mismatch has no Edit Flights button | `frontend/tests/HomeNextActions.test.js` | `A flight date mismatch has no Edit Flights button` |

Existing tests that click **Add Flights**, **Edit Flights**, or **Enter Flights** as a participant are updated to expect those buttons to be absent. Staff **Flight segments** tests stay as they are.

---

## Agent implementation request

```text
Implement Feature 134 from @features/feature-134-hide-participant-flight-links.md on branch `feature/134-hide-participant-flight-links`.

Hide the participant buttons that open the flight segments dialog: Add Flights and Edit Flights under Flights on My Trip, Enter Flights on the "Enter your flight info." next step, and Edit Flights on the arrival and return mismatch next steps. Those next steps are on Home and My Trip. Keep the sentences. Do not delete the flight segments dialog, the handlers that open it, or the participant's permission to read and save their own segments. Do not change the Flights page.
Map every Gherkin scenario in the Test Coverage Map. Update the existing participant tests that expect those buttons. Run those frontend tests before finishing.
Update @features/reference/behavior.md (My Trip Flights button; My Trips next actions Enter Flights and mismatch Edit Flights) in the same change.
Update docs/user-guide/participant-guide.md so it no longer tells a participant to use Add Flights, Edit Flights, or Enter Flights, and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (My Trip **Flights** has no **Add Flights** or **Edit Flights**; next steps keep the flight sentences and do not show **Enter Flights** or **Edit Flights**)

**User guide updates:** `docs/user-guide/participant-guide.md` (Your flights, next steps, the **Flights** screen reference, and Flight segments: a participant sees flights and is not given a button to add or edit them; staff still use the dialog)

---

## Definition of Done

*   [x] **My Trip** does not show **Add Flights** or **Edit Flights** (**FR-001**)
*   [x] Next steps do not show **Enter Flights** or **Edit Flights**, and the sentences remain (**FR-002**)
*   [x] The flight segments dialog, its open handlers, and the participant segment API remain (**FR-003**)
*   [x] Staff and Agent flight editing is unchanged (**FR-004**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Deleting the flight segments dialog or the participant segment endpoints
- Changing who may save segments
- Removing the next-step sentences
- Hiding flights that are already saved
- Changing the Flights page, Flights PDF, or flight itinerary email
- Changing the flight purchase choice on the application
