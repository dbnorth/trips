# Feature: Trip Options in the Participant Edit Dialog

**Feature ID:** 92
**Branch pattern:** `feature/92-participant-edit-trip-options`
**Status:** Implemented
**Created:** 2026-10-27
**Input:** "create a spec for the edit participant dialog on the Trip View page to allow the viewing and editing of the trip options for the participant from their application. If changed it should update participant trip cost." Then: "also on the same dialog update so the add Addon Expenses button look more like a button."

Clarified with the requester:
- Changing trip options **adds or subtracts the price difference** to the participant cost, so any adjustment staff already made is kept. For example, $1,550 (trip cost $1,500 plus a $50 staff adjustment) with a +$0 option, switched to a +$150 option, becomes $1,700. The **Participant cost** field updates in the dialog as options change, so staff see the new cost before saving and can still type over it.

**Depends on:**
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md) (trip options, sets, price adjustments, selection rules)
- [Feature 74 — Trip Add-on Expenses](feature-74-trip-addon-expenses.md) (participant **Edit** dialog, total trip cost, cost breakdown)
- [Feature 78 — Days Before and After the Trip](feature-78-days-before-after-trip.md) (one-each days limit, arrival and departure dates)

---

## User Stories

### US-92.1: Staff see and change a participant's trip options

**As** trip staff (Org Admin, System Admin, or Trip Leader of the trip)
**I want** the participant **Edit** dialog on View Trip to show the trip options chosen on the application and let me change them
**So that** I can fix a participant's options without asking them to edit their application

**Acceptance:** see Gherkin scenarios under US-92.1.

### US-92.2: Changing options updates the participant cost

**As** trip staff
**I want** the participant cost to move by the price difference when I change options
**So that** the participant's trip cost and amount owed stay right without recalculating by hand

**Acceptance:** see Gherkin scenarios under US-92.2.

### US-92.3: Add expense looks like a button

**As** trip staff
**I want** the **Add expense** control in the participant **Edit** dialog to look like a button
**So that** I can tell at a glance how to add an add-on expense

**Acceptance:** see Gherkin scenarios under US-92.3.

---

## Requirements

### Functional Requirements

**Showing options**

- **FR-001**: The View Trip participant **Edit** dialog has a **Trip options** section after **Participant cost** (and its "Leave blank to use the trip default…" hint) and before **Add-on expenses**, when the trip has trip options. It lists every trip option by set like the application form: a heading **Trip Option N** per set ("(required)" when the set has more than one option), a checkbox for a set of one, radio buttons for a set of more than one, and each option's description with its price adjustment ("+$150.00", "-$25.00", "$0.00"). The participant's saved selections are checked when the dialog opens. The application form's **Trip price** and **New trip price** lines are not shown. When the trip has no trip options, the section is not shown.
- **FR-002**: Staff can change the selection: pick a different radio button in a set, or check or clear a checkbox. A set of more than one can't be cleared once something is picked (as on the application form), but may be left unanswered if it was unanswered when the dialog opened.

**Updating the participant cost**

- **FR-003**: Each time the selection changes, the **Participant cost** field changes by the difference between the new and the previous selected options' price adjustments (new total − previous total). For example, $1,550.00 becomes $1,700.00 when a $0.00 option is swapped for a +$150.00 option, and goes back to $1,550.00 if they swap back. When the field is blank, it starts from the trip's participant cost (the trip default): blank with a $1,500.00 trip default becomes $1,575.00 when a +$75.00 option is checked. When the field is blank and the trip has no participant cost, the field stays blank. A difference of $0.00 leaves the field as it is.
- **FR-004**: Staff may type over **Participant cost** after changing options; **Save** saves whatever the field shows. Later option changes keep adjusting from the typed value.
- **FR-005**: **Save** sends the selected options with the rest of the dialog. Before saving, the dialog refuses a selection with two trip options with days before or two with days after the trip, showing the existing messages "Choose only one trip option with days before the trip." / "Choose only one trip option with days after the trip." (Feature 78, counting days that aren't 0 per Feature 89); nothing is saved. **Cancel** discards option and cost changes.

**API**

- **FR-006**: `PUT /trips/trip-people-roles/:id` accepts an optional `selectedTravelOptionIds` (array of trip option ids). Omitted → the participant's options and cost are unchanged, as today. When sent, it is checked like an application: every id must be a trip option of this trip ("One or more selected travel options are invalid for this trip."), at most one per set ("Only one travel option can be selected per trip option group."), and the one-each days limit (FR-005 messages); any failure → `400` and nothing is saved. A set left unanswered is allowed. The selection replaces the participant's saved options in the same transaction as the rest of the update.
- **FR-007**: When `selectedTravelOptionIds` is sent **without** `participantCost`, the saved participant cost changes by the difference between the new and the old selected options' price adjustments, using the same rules as FR-003 (a blank cost starts from the trip's participant cost; blank with no trip cost stays blank). When `participantCost` is sent too, it is saved as sent (the dialog has already applied the difference).
- **FR-008**: Everything that reads the participant's options and cost follows the saved values with no further change: the View Trip **Participant cost** and **Total cost** columns and the cost-details hover (each **Trip option**, and **Cost adjustment** = participant cost − trip cost − selected options), **Arrives** / **Departs** (option days), Trip Status (option columns, total cost, amount owed), My Trip Info, the application view, and the participant financial statement tokens.

**Add expense button**

- **FR-009**: The **Add expense** button under the add-on expense rows is an outlined maroon button (`color="primary"`, `variant="outlined"`, default size; the app theme's `secondary` is light grey and looks disabled) with a plus icon before the label "Add expense", instead of the small text-only button. Its place and behavior (adds an empty add-on row) are unchanged.

---

## Assumptions

- The same staff who can open the participant **Edit** dialog today can change options (Org Admin of the trip's organization, System Admin, approved Trip Leader of the trip). No new permission.
- Changing options in this dialog does not change the participant's status. Status rules are unchanged.
- The participant's own application edit is unchanged: it still sets the participant cost to the trip cost plus the selected options (dropping any staff adjustment).
- The dialog reads the options and saved selections from `GET /trips/trip-people-roles/:id`, which already returns `travelOptions` with `selected`.

## Edge Cases

- Ana has a $50 staff adjustment and switches from "Depart Saturday" ($0.00) to "Antigua Trip - stay Friday night" (+$150.00) → $1,700.00; the cost-details hover still shows **Cost adjustment** $50.00.
- Staff switch options back and forth before saving → the field ends at the starting cost plus the net difference.
- An option with a negative price adjustment → the cost goes down by that amount.
- A participant with no saved options on a trip with options → all sets start unanswered; checking options adds their adjustments.
- Staff clear **Participant cost** after changing options → saved blank (the trip default is used), as today.
- Options that were saved but have since been deleted from the trip are not shown and are not part of the difference.

## Success Criteria

- **SC-001**: Staff can change a participant's trip option from View Trip in one dialog, and the participant's total cost and amount owed show the new price immediately after saving.
- **SC-002**: A staff cost adjustment survives an option change.
- **SC-003**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change. Options are saved on the participant's trip assignment (`tripPeopleRoleOption`) by the same trip staff who already update the assignment; trip option ids from another trip are refused (FR-006).

---

## Key Entities

- **tripPeopleRole** — `participantCost` changes by the option price difference (FR-003, FR-007).
- **tripPeopleRoleOption** — the participant's selected trip options, now also saved from the participant **Edit** dialog.
- **tripTravelOption** — read only: `setNumber`, `description`, `priceAdjustment`, `daysBefore`, `daysAfter`.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trip-people-roles/:id` | No change (already returns `travelOptions` with `selected`) |
| `PUT` | `/trips/trip-people-roles/:id` | Optional `selectedTravelOptionIds`; validated per FR-006 (`400` with the messages there); replaces the saved options in the same transaction; without `participantCost` the cost shifts by the price difference (FR-007) |

---

## Screen Requirements

- **View Trip** → participant **Edit** dialog: **Trip options** section after **Participant cost**, before **Add-on expenses** (FR-001); **Participant cost** updates as options change (FR-003); days-limit messages on **Save** (FR-005); **Add expense** is an outlined button with a plus icon (FR-009).

---

## Data Model Requirements

None. `tripPeopleRoleOption` and `tripPeopleRole.participantCost` already exist.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions"; Org Admin Omar; trip "Clinica Ezell Hospital - January 2027" from 2027-01-16 to 2027-01-23 with participant cost $1,500.00.
- Trip Option 1: "Depart Saturday" ($0.00) and "Antigua Trip - stay Friday night" (+$150.00, Days after 1).
- Trip Option 2: "Volcano hike - extra day" (+$75.00, Days after 1).
- Ana is an approved Trip Participant with "Depart Saturday" selected and participant cost $1,550.00 (a $50.00 staff adjustment).
- Ben is an applied Trip Participant with no options selected and a blank participant cost.

### US-92.1 — Staff see and change a participant's trip options

#### Scenario: The Edit dialog shows the participant's trip options
* **When** Omar opens **Edit** for Ana on View Trip
* **Then** a **Trip options** section appears after **Participant cost** and before **Add-on expenses**
* **And** **Trip Option 1 (required)** shows radio buttons with "Depart Saturday" selected and "Antigua Trip - stay Friday night" showing "+$150.00"
* **And** **Trip Option 2** shows an unchecked "Volcano hike - extra day" checkbox showing "+$75.00"

#### Scenario: Staff change a participant's trip option
* **When** Omar selects "Antigua Trip - stay Friday night" for Ana and saves
* **Then** Ana's saved options are "Antigua Trip - stay Friday night" only
* **And** View Trip shows Ana **Departs** 01/24/2027

#### Scenario: Invalid trip option selections are refused
* **When** Omar selects "Antigua Trip - stay Friday night" and checks "Volcano hike - extra day" for Ana and saves
* **Then** the dialog says "Choose only one trip option with days after the trip." and nothing is saved
* **And** an update for Ana with both Trip Option 1 options is refused with `400` "Only one travel option can be selected per trip option group."
* **And** an update for Ana with a trip option of another trip is refused with `400` "One or more selected travel options are invalid for this trip."

#### Scenario: A trip with no trip options shows no section
* **Given** a trip with no trip options
* **When** Omar opens **Edit** for a participant on that trip
* **Then** no **Trip options** section is shown

### US-92.2 — Changing options updates the participant cost

#### Scenario: Participant cost moves by the price difference
* **When** Omar selects "Antigua Trip - stay Friday night" for Ana
* **Then** **Participant cost** shows 1,700.00
* **And** selecting "Depart Saturday" again shows 1,550.00
* **And** after selecting "Antigua Trip - stay Friday night" again and saving, Ana's participant cost is $1,700.00, **Total cost** is $1,700.00, and the cost-details hover shows Trip option "Antigua Trip - stay Friday night" $150.00 and Cost adjustment $50.00

#### Scenario: A blank participant cost starts from the trip cost
* **When** Omar checks "Volcano hike - extra day" for Ben
* **Then** **Participant cost** shows 1,575.00

#### Scenario: Staff may type over the new cost
* **When** Omar selects "Antigua Trip - stay Friday night" for Ana, types 1,600.00 in **Participant cost**, and saves
* **Then** Ana's participant cost is $1,600.00

#### Scenario: The API shifts the cost when only options are sent
* **When** Ana is updated with `selectedTravelOptionIds` of "Antigua Trip - stay Friday night" and no `participantCost`
* **Then** Ana's participant cost is $1,700.00
* **And** an update for Ana without `selectedTravelOptionIds` leaves her options and participant cost unchanged

### US-92.3 — Add expense looks like a button

#### Scenario: Add expense is an outlined button
* **When** Omar opens **Edit** for Ana
* **Then** **Add expense** is an outlined maroon (primary) button with a plus icon
* **And** clicking it adds an empty add-on expense row

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-92.1 | The Edit dialog shows the participant's trip options | `frontend/tests/EditTripParticipantDialog.test.js` | `The Edit dialog shows the participant's trip options` |
| US-92.1 | Staff change a participant's trip option | `backend/tests/participant-trip-options.test.js` | `Staff change a participant's trip option` |
| US-92.1 | Staff change a participant's trip option | `frontend/tests/EditTripParticipantDialog.test.js` | `Save sends the selected trip options` |
| US-92.1 | Invalid trip option selections are refused | `backend/tests/participant-trip-options.test.js` | `Invalid trip option selections are refused` |
| US-92.1 | Invalid trip option selections are refused | `frontend/tests/EditTripParticipantDialog.test.js` | `Two trip options with days after are refused` |
| US-92.1 | A trip with no trip options shows no section | `frontend/tests/EditTripParticipantDialog.test.js` | `A trip with no trip options shows no section` |
| US-92.2 | Participant cost moves by the price difference | `frontend/tests/EditTripParticipantDialog.test.js` | `Participant cost moves by the price difference` |
| US-92.2 | Participant cost moves by the price difference | `backend/tests/participant-trip-options.test.js` | `Saved options and cost show in the cost breakdown` |
| US-92.2 | A blank participant cost starts from the trip cost | `frontend/tests/EditTripParticipantDialog.test.js` | `A blank participant cost starts from the trip cost` |
| US-92.2 | Staff may type over the new cost | `frontend/tests/EditTripParticipantDialog.test.js` | `Staff may type over the new cost` |
| US-92.2 | The API shifts the cost when only options are sent | `backend/tests/participant-trip-options.test.js` | `The API shifts the cost when only options are sent` |
| US-92.3 | Add expense is an outlined button | `frontend/tests/EditTripParticipantDialog.test.js` | `Add expense is an outlined button` |

---

## Agent implementation request

```text
Implement Feature 92 from @features/feature-92-participant-edit-trip-options.md on branch `feature/92-participant-edit-trip-options`.

Backend: tripPeopleRole.controller.js update — accept optional selectedTravelOptionIds; validate with the same rules as apply (move validateSelectedTravelOptionIds / syncTripPeopleRoleOptions / the price-adjustment total out of tripBrowse.controller.js into a shared util rather than duplicating); save options in the existing transaction; when participantCost isn't in the body, shift the cost by (new options total − old options total), starting from the trip's participantCost when blank, leaving it blank when both are blank.
Frontend: EditTripParticipantDialog.vue — load the assignment with TripPeopleRoleServices.get(id) for travelOptions/selected; show a Trip options section after Participant cost using TripApplicationTravelOptions (add a prop to hide the Trip price / New trip price lines); on selection change adjust form.participantCost by the difference per FR-003; check travelOptionDaysError before save; send selectedTravelOptionIds. Make the Add expense button color="primary" variant="outlined" prepend-icon="mdi-plus" (drop variant="text" size="small"; keep data-testid="add-addon-expense").
Tests per the Test Coverage Map. Update features/reference/behavior.md (participant Edit dialog) and api.md (PUT /trips/trip-people-roles/:id).
```

---

## Definition of Done

*   [x] Trip options section per **FR-001** / **FR-002**
*   [x] Live participant cost per **FR-003** / **FR-004**
*   [x] Save and days check per **FR-005**
*   [x] API per **FR-006** / **FR-007**
*   [x] Add expense button per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Changing the participant's own application edit (it still resets the cost to trip cost plus options)
- Recomputing the participant's status when staff change options
- Editing trip options themselves (description, price, days) from this dialog — that stays in **Edit trip**
- Changing options from the Trip Status board or the participant list
