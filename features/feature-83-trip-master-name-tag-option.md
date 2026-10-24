# Feature: Trip Master Name Tag Option

**Feature ID:** 83
**Branch pattern:** `feature/83-trip-master-name-tag-option`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "add a feature to fix the TripMaster import for trips to use the column to set the Trip Option Need HTI Name Tag (No value means check the option)"

Interpreted as:
- **The column** = the Trip Master's **Do you Have a Name Tag** column (header rows "Do you Have a" / "Name Tag"). Feature 80 ignores it today.
- **Need HTI Name Tag** = the trip's name tag trip option (Feature 6), e.g. "Need HTI Name Tag" or "HTI Name Tag".
- In the real file the column holds "Yes" (27 people), "No" (19), or nothing (4). Clarified: everyone who didn't answer "Yes" (so "No" or blank) needs a name tag, and gets the option selected.
- Clarified: this column is the only thing that selects the name tag option. Travel Notes no longer select it (they could before, through the keyword "Tag").
- The **Name Tag** column (the name to print) stays ignored.

**Depends on:**
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md) (trip options and sets)
- [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md) (the import, FR-022–FR-025)

---

## User Stories

### US-83.1: The Name Tag column selects the name tag option
**As** an Org Admin importing a Trip Master  
**I want** everyone who doesn't already have a name tag to get the trip's name tag option  
**So that** I know how many name tags to order without ticking the option by hand

**Priority:** P2  
**Independent test:** Import a file where Lyle answered "Yes", Ana "No", and Kris left it blank → Ana and Kris have "Need HTI Name Tag" selected, Lyle doesn't  
**Acceptance scenarios:** see ### US-83.1

---

## Requirements

### Functional Requirements

- **FR-001**: The import reads the **Do you Have a Name Tag** column (FR-011 of Feature 80: by column name, from the two header rows). It is optional: a file without it imports as before, and selects no name tag option from it.
- **FR-002**: The trip's **name tag option** is its first trip option (lowest set, then lowest id) whose description has the words "name" and "tag", compared as in Feature 80 FR-023 (ignoring case and accents, split at anything that isn't a letter or digit). Examples: "Need HTI Name Tag", "HTI Name Tag", "Name tag (printed)". A trip without one selects nothing from the column, with no summary note.
- **FR-003**: When the file has the column, a row whose value is anything other than "Yes" or "Y" (ignoring case and surrounding spaces) — "No", blank, or other text — selects the name tag option on that row's application. "Yes" or "Y" selects nothing.
- **FR-004**: The name tag option is never selected from Travel Notes, and isn't a candidate when matching notes against the other options in its set (Feature 80 FR-023 treats it as it treats flight options).
- **FR-005**: The Feature 80 option rules still apply to the name tag option:
  - A set that already has a selected option on the application is left alone (FR-022), so re-importing changes nothing and the import never unselects anything.
  - The Feature 78 days check still applies (FR-022).
  - Selecting it adds its price adjustment to the participant cost, which starts from the trip's cost when blank (FR-025).
- **FR-006**: Every row the import gives an application follows FR-003. That includes the Team Leader and the cancellations section, as with the other trip options. Waiting-list rows still get no application.

---

## Assumptions

- Staff name the option so its description has the words "name" and "tag". The import never creates options.
- Name tags are ordered from the trip's option selections (e.g. the Trip Status board's option column), which is outside this feature.

## Edge Cases

- The answer is "yes" or " YES " → treated as "Yes"; no option.
- The answer is "N/A", "Ordered", or anything else that isn't "Yes"/"Y" → the option is selected.
- The name tag option shares a set with other options, and the participant already chose one of them → the set is left alone (FR-005).
- Ana answered "Yes" but already had the name tag option selected → it stays selected (the import never unselects).
- Travel Notes mention "Tag" → ignored for the name tag option (FR-004).
- The name tag option has a price adjustment (e.g. $10) → the participant cost includes it (FR-005).

## Success Criteria

- **SC-001**: After importing, every application from a row that didn't answer "Yes" has the name tag option selected, unless its set already had a selection.
- **SC-002**: Automated tests for every scenario below pass, and the Feature 80 tests pass with the changes listed under **Changes to Feature 80**.

---

## Data Ownership & Isolation

No change. The import stays limited to the trip's organization staff and Trip Leaders (Feature 80), and only selects options on that trip's applications.

---

## Key Entities

No schema change. Writes `tripPeopleRoleOption` (as Feature 80 FR-022) and the application's participant cost (FR-025). Reads `tripTravelOption`.

---

## API Requirements

No new endpoint. `POST /trips/trips/:id/import-trip-master` (Feature 80) reads the extra column. Its response doesn't change.

---

## Screen Requirements

None. The Import dialog and its summary don't change.

---

## Data Model Requirements

None.

---

## Changes to Feature 80

The Feature 80 Background and scenarios change as follows (tests in `backend/tests/trip-master-import.test.js`):

- **Background:** the Trip Option 1 option is renamed "Need HTI Name Tag" ($0). In `trip-master-sample.csv`, **Do you Have a Name Tag** is "Yes" for Lyle (already), "No" for Ana, and blank for Kris, Rick, and Andrea.
- **Travel Notes and Flight Fee select trip options:**
  - "nobody has "HTI Name Tag" selected" becomes "Lyle doesn't have "Need HTI Name Tag" selected".
  - Ana's, Kris's, Rick's, and Andrea's applications have "Need HTI Name Tag" selected.
  - Kris's and Andrea's participant cost becomes 950 (the trip's cost plus the $0 option), no longer blank.
- **Options already chosen are kept:** Ana's application also gets "Need HTI Name Tag" (Trip Option 1 had no selection). "Arrive Friday - Barceló Bar" stays her only Trip Option 2 choice, and her participant cost stays 1025.
- **Edge case removed:** "A one-option set, such as "HTI Name Tag", is selected only when the notes match one of its keywords ("Tag")" no longer applies (FR-004).
- The **Do you Have a Name Tag** row of the column table moves from Ignored to "Name tag trip option (Feature 83)". **Name Tag** stays Ignored.

---

## Acceptance Criteria (Gherkin)

Background: the Feature 80 Background, with the changes above. The trip's options are Trip Option 1 "Need HTI Name Tag" ($0); Trip Option 2 "Arrive Friday - Barceló Bar" ($75) and "Arrive Saturday" ($0); Trip Option 3 "HTI Purchase Flights" ($40). In the file, Lyle answered "Yes", Ana "No", and Kris, Rick, and Andrea left **Do you Have a Name Tag** blank.

### US-83.1 — The Name Tag column selects the name tag option

#### Scenario: Everyone without a name tag gets the name tag option
* **When** Omar imports the file
* **Then** Ana's, Kris's, Rick's, and Andrea's applications have "Need HTI Name Tag" selected
* **And** Lyle's application doesn't
* **And** Lyle's other options and participant cost are as in Feature 80 ("Arrive Friday - Barceló Bar", "HTI Purchase Flights", 1065)

#### Scenario: Travel Notes don't select the name tag option
* **Given** Lyle's Travel Notes are "HTI - Fri Barceló - Name Tag - Antigua"
* **When** Omar imports the file
* **Then** Lyle's application doesn't have "Need HTI Name Tag" selected

#### Scenario: A file without the column selects no name tag
* **Given** the file has no **Do you Have a Name Tag** column
* **When** Omar imports it
* **Then** nobody has "Need HTI Name Tag" selected

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-83.1 | Everyone without a name tag gets the name tag option | `backend/tests/trip-master-import.test.js` | `Everyone without a name tag gets the name tag option` |
| US-83.1 | Travel Notes don't select the name tag option | `backend/tests/trip-master-import.test.js` | `Travel Notes don't select the name tag option` |
| US-83.1 | A file without the column selects no name tag | `backend/tests/trip-master-import.test.js` | `A file without the column selects no name tag` |

---

## Agent implementation request

```text
Implement Feature 83 from @features/feature-83-trip-master-name-tag-option.md on branch `feature/83-trip-master-name-tag-option`.

Backend only. In backend/app/utils/tripMasterCsv.js add the optional column "Do you Have a Name Tag" and an isNameTagOption(option) helper (words "name" and "tag"); skip name tag options in chooseNoteOptions like flight options.
In tripMasterImport.controller.js selectTripOptions, when the column is present and the value isn't "yes"/"y", select the trip's first name tag option, under the existing set/days/cost rules.
Update the fixture and Feature 80 tests per "Changes to Feature 80", and add the three scenarios.
Update features/feature-80-trip-master-import.md (column table, edge case, scenarios) and features/reference/behavior.md (Import Trip Master row).
```

---

## Definition of Done

*   [x] Name tag option from the column per **FR-001**–**FR-006**
*   [x] Feature 80 tests and spec updated per **Changes to Feature 80**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Importing the **Name Tag** column (the printed name)
- Unselecting the name tag option when the answer is "Yes"
- A name tag count or order report
- Creating the name tag option when the trip has none
