# Feature: Flight Fee Selects the Flight Trip Option

**Feature ID:** 133
**Branch pattern:** `feature/133-trip-fee-flight-option`
**Status:** Implemented
**Created:** 2026-11-12
**Input:** "If there is a non zero amount in the Flight Fee column then the HTI purchase my flight (plus flight cost) trip option is set, else the Purchase my own flight is set."
**Depends on:** [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md), [Feature 128 — Import Sets the Flight Purchase Choice](feature-128-import-flight-purchase-choice.md)

The Trip Master import selects a flight trip option from **Flight Fee**: an amount above $0 selects the first option whose description has a word starting with "flight" or "air", and any other fee selects none. **Purchase my own flight** is never selected from the fee. This feature selects one of two named options from **Flight Fee** instead. **Trip Fee** is still not read.

## Clarifications

- Q: Which column decides the option? → A: **Flight Fee**. **Trip Fee** is not imported.
- Q: What does a non-zero **Flight Fee** select? → A: The trip option whose description is **HTI purchase my flight (plus flight cost)**.
- Q: What does every other **Flight Fee** select? → A: The trip option whose description is **Purchase my own flight**. That includes blank, $0, and a value that is not a number.
- Q: Does the **Flight Fee** amount become the participant cost or the flight cost? → A: No. Selecting the option adds that option's own price adjustment, as other imported options do. The fee amount itself is not saved.
- Q: Does this change who books the flight? → A: **Booked by** uses the same **Flight Fee** rule, including a choice already saved. Above $0 the organization books the flight; otherwise the participant does. A saved choice that doesn't match is switched.
- Q: Does a second import replace an option already selected in that set? → A: It switches between **Purchase my own flight** and **HTI purchase my flight (plus flight cost)** when the **Flight Fee** calls for the other one. Any other choice already in that set is left alone (Feature 80).

---

## User Stories

### US-133.1: Flight Fee selects the flight trip option

**As** trip staff
**I want** the Trip Master import to choose the flight trip option from **Flight Fee**
**So that** each imported person has either **HTI purchase my flight (plus flight cost)** or **Purchase my own flight**

**Priority:** P1
**Independent test:** On a trip that has both named options, import a row with **Flight Fee** $40.00 and **Trip Fee** $0.00, and a row with **Flight Fee** $0.00 and **Trip Fee** $1,175.00. The first has **HTI purchase my flight (plus flight cost)** selected. The second has **Purchase my own flight** selected.
**Acceptance scenarios:** see ### US-133.1

---

## Requirements

### Functional Requirements

- **FR-001**: For each imported application, the import reads **Flight Fee** with the same money rules as other amounts ("$40.00", "40", and "$0.00" are numbers). A number other than 0 selects the trip option whose description is **HTI purchase my flight (plus flight cost)**. A blank **Flight Fee**, $0, and a value that is not a number select the trip option whose description is **Purchase my own flight**. Descriptions match ignoring case and extra spaces. This replaces Feature 80 **FR-024**: an option is no longer chosen because its description contains "flight" or "air". **Trip Fee** is not imported.
- **FR-002**: The **Flight Fee** amount is not saved as a participant cost, a flight cost, or anything else. When the import selects the option, the application's participant cost becomes its current participant cost (or, when blank, the trip's participant cost) plus that option's price adjustment, together with any other options this import selects on the same row (Feature 80 **FR-025**).
- **FR-003**: When the other of these two flight options is already selected, the import switches to the one **Flight Fee** calls for and changes the participant cost by the difference in their price adjustments. When the selected option already matches the fee, it stays. A set whose selected option is neither of these two is left alone (Feature 80 **FR-022**). When the named option is not on the trip, nothing is selected from **Flight Fee** and the import still succeeds. When more than one option has that description, the first is used (lowest set number, then lowest id).
- **FR-004**: A **Flight Fee** that is not a number is reported in the import summary the same way as other unread amounts: "Row N — Name: flight fee "<value>" wasn't read." The flight option for that row is still **Purchase my own flight** when FR-003 allows a selection. A blank **Flight Fee** is not reported.
- **FR-005**: **Booked by** follows the same **Flight Fee** as the flight option. A number greater than $0 sets it to **organization**. A blank fee, $0, and a value that is not a number set it to **self**. A saved choice that doesn't match is switched. This replaces Feature 128's rule that a saved choice is kept. Travel notes still do not select either named option. Name tags, roommate, flight notes, people, roles, and every other import rule are unchanged.

---

## Assumptions

- The two descriptions are the whole option description, not a search for a word inside a longer description. **HTI Purchase Flights** does not match either name.
- Both options are in one trip-option set, as on the trips that use these names. A set still has at most one selected option.
- "Blank" for the flight purchase choice still means the application has none stored.

## Edge Cases

- **Flight Fee** "$40.00" and **Trip Fee** "$0.00" → **HTI purchase my flight (plus flight cost)**. The $40 is not added as a flight cost; the option's own price adjustment is.
- **Flight Fee** "$0.00" and **Trip Fee** "$1,175.00" → **Purchase my own flight**. The $1,175 is not imported.
- **Flight Fee** blank → **Purchase my own flight**, with no summary note for the fee.
- **Flight Fee** "tba" → the summary says the flight fee wasn't read, and **Purchase my own flight** is selected when that set is still open.
- The application already has the flight option the **Flight Fee** calls for → that choice stays.
- The application has the other of the two flight options selected → the import switches to the one the **Flight Fee** calls for.
- The trip has neither named option → no flight option is selected from **Flight Fee**, and the import still completes. **HTI Purchase Flights** is not selected.
- Importing the same file again → the selected flight option stays as the first import set it.
- A waiting-list row is still skipped. A cancellation still only fills blank fields.

## Success Criteria

- **SC-001**: A non-zero **Flight Fee** selects **HTI purchase my flight (plus flight cost)** when that option is on the trip and its set is open, including when **Trip Fee** is $0.
- **SC-002**: Every other **Flight Fee** selects **Purchase my own flight** on the same terms, including when **Trip Fee** is a non-zero amount.
- **SC-003**: The same **Flight Fee** decides who books the flight, and switches a saved choice that doesn't match.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. Who may import a Trip Master file stays as Feature 80.

---

## Key Entities

- **TripTravelOption**: the two flight choices, matched by description.
- **TripPeopleRoleOption**: the selected choice on the application. No new field.

---

## API Requirements

None. The import endpoint is unchanged.

---

## Screen Requirements

None. The selected option already shows on the application.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background: the trip costs $950 and has Trip Option 2 "Purchase my own flight" ($0.00) and "HTI purchase my flight (plus flight cost)" ($40.00), plus the sample trip's other options. The sample file's Lyle Lowry row has **Trip Fee** $1,175.00 and **Flight Fee** $40.00. Ana Lopez has **Flight Fee** $0.00. Kris Smith has no **Flight Fee**.

### US-133.1 — Flight Fee selects the flight trip option

#### Scenario: A non-zero Flight Fee selects HTI purchase my flight
* **Given** the sample Trip Master file, with Lyle Lowry's Trip Fee changed to $0.00 and his Flight Fee still $40.00
* **When** the file is imported
* **Then** Lyle Lowry's application has "HTI purchase my flight (plus flight cost)" selected
* **And** his participant cost includes that option's $40.00 adjustment and does not include a flight cost from the Flight Fee
* **And** his flight is booked by the organization

#### Scenario: Any other Flight Fee selects Purchase my own flight
* **Given** the sample Trip Master file, with Lyle Lowry's Flight Fee changed to $0.00 and his Trip Fee still $1,175.00
* **When** the file is imported
* **Then** Lyle Lowry's application has "Purchase my own flight" selected
* **And** his flight purchase choice is self
* **And** Ana Lopez and Kris Smith have "Purchase my own flight" selected

#### Scenario: A flight option already chosen is kept
* **Given** Lyle Lowry already has "HTI purchase my flight (plus flight cost)" selected, and his Flight Fee is $40.00
* **When** the sample file is imported
* **Then** that option stays selected
* **And** "Purchase my own flight" is not selected

#### Scenario: Flight Fee replaces a saved booking choice
* **Given** Lyle Lowry is already booked by the participant, and his Flight Fee is $40.00
* **And** Ana Lopez is already booked by the organization, and her Flight Fee is $0.00
* **When** the sample file is imported
* **Then** Lyle Lowry is booked by the organization
* **And** Ana Lopez is booked by the participant

#### Scenario: A non-zero Flight Fee replaces Purchase my own flight
* **Given** Lyle Lowry already has "Purchase my own flight" selected, and his Flight Fee is $40.00
* **When** the sample file is imported
* **Then** "HTI purchase my flight (plus flight cost)" is selected
* **And** "Purchase my own flight" is not selected

#### Scenario: An unreadable Flight Fee is noted and selects Purchase my own flight
* **Given** a Trip Master row whose Flight Fee is "tba" and whose flight-option set has no selection
* **When** the file is imported
* **Then** the import summary notes that the flight fee "tba" wasn't read
* **And** the application has "Purchase my own flight" selected

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-133.1 | A non-zero Flight Fee selects HTI purchase my flight | `backend/tests/trip-master-import.test.js` | `A non-zero Flight Fee selects HTI purchase my flight` |
| US-133.1 | Any other Flight Fee selects Purchase my own flight | `backend/tests/trip-master-import.test.js` | `Any other Flight Fee selects Purchase my own flight` |
| US-133.1 | A flight option already chosen is kept | `backend/tests/trip-master-import.test.js` | `A flight option already chosen is kept` |
| US-133.1 | Flight Fee replaces a saved booking choice | `backend/tests/trip-master-import.test.js` | `Flight Fee replaces a saved booking choice` |
| US-133.1 | A non-zero Flight Fee replaces Purchase my own flight | `backend/tests/trip-master-import.test.js` | `A non-zero Flight Fee replaces Purchase my own flight` |
| US-133.1 | An unreadable Flight Fee is noted and selects Purchase my own flight | `backend/tests/trip-master-import.test.js` | `An unreadable Flight Fee is noted and selects Purchase my own flight` |

The Feature 80 test `Travel Notes and Flight Fee select trip options` expects Lyle Lowry to have "HTI Purchase Flights" selected because his **Flight Fee** is $40.00. That description is no longer selected. With the two named options on the trip, his **Flight Fee** selects "HTI purchase my flight (plus flight cost)" instead.

---

## Agent implementation request

```text
Implement Feature 133 from @features/feature-133-trip-fee-flight-option.md on branch `feature/133-trip-fee-flight-option`.

In the Trip Master import, read Flight Fee. A number other than 0 selects the trip option "HTI purchase my flight (plus flight cost)". A blank fee, $0, or a value that is not a number selects "Purchase my own flight". Match the description ignoring case and extra spaces. Do not save the Flight Fee amount. Leave a set that already has a selection unchanged. The same Flight Fee still sets who books the flight (Feature 128). Do not read Trip Fee.
Map every Gherkin scenario in the Test Coverage Map. Update the Feature 80 test that expected "HTI Purchase Flights" from the Flight Fee. Run the Trip Master import tests before finishing.
Update @features/reference/behavior.md (the Import Trip Master CSV row) in the same change.
Update docs/user-guide/org-admin-guide.md (the import bullet that says a Flight Fee selects the flight trip option) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Import Trip Master CSV: **Flight Fee** selects **HTI purchase my flight (plus flight cost)** when the amount is a number other than 0, and **Purchase my own flight** otherwise; **Trip Fee** is not imported)

**User guide updates:** `docs/user-guide/org-admin-guide.md` (Import Trip Master CSV: a non-zero **Flight Fee** selects **HTI purchase my flight (plus flight cost)**; any other **Flight Fee** selects **Purchase my own flight**; the same fee says who books the flight; **Trip Fee** is not imported)

---

## Definition of Done

*   [x] **Flight Fee** selects the named flight option per **FR-001** and **FR-002**
*   [x] An option already selected in that set is kept, and a missing option does not fail the import (**FR-003**)
*   [x] An unreadable **Flight Fee** is noted (**FR-004**)
*   [x] The same **Flight Fee** still sets who books the flight (**FR-005**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Saving the **Flight Fee** as a cost
- Importing **Trip Fee**
- Selecting any other trip option from **Flight Fee**
- Creating the two options when the trip does not have them
- Replacing a flight option the application already has in that set
