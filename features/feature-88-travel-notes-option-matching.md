# Feature: Travel Notes Option Matching

**Feature ID:** 88
**Branch pattern:** `feature/88-travel-notes-option-matching`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "create a spec that updates the options matching rules for the trip notes that select the option from a set that have the most words and No/Not in front of a word select the other option if there are two and no option if only one or more than two." Then: "once a word is used to select an option then that word is not used again to select an option."

Interpreted as:
- The Trip Master import (Feature 80) picks trip options from each row's **Travel Notes**. Today an option's keywords must appear in no other option on the whole trip, so a word used in two sets (such as "Antigua" in "Depart Saturday - stay Friday night in Antigua and depart Saturday" and "Antigua Trip", or "Saturday" in "Arrive Saturday" and "Depart Saturday") never matches anything.
- New rule, set by set:
  - An option's keywords only need to be unique **within its set**. In each set, the option with the most matched words is selected (ties still select none).
  - "No" or "Not" in front of a word turns it around: in a set of two options, the **other** option is selected; in a set of one option, or of more than two, nothing in that set is selected.
  - Once a word has been used to select an option, it isn't used again to select another one. Sets are matched in order of set number, so "Saturday" that picked **Arrive Saturday** doesn't also pick a "Depart Saturday" option.
- Found with the January 2027 Clinica Ezell Trip Master: "SP - Fri Barceló - Antigua" selected **Arrive Friday Barcelo** but not **Antigua Trip**, and "SP - Saturday - Antigua" selected nothing. The Gherkin uses that trip's options reworded to suit these rules (see Assumptions).

**Depends on:**
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md) (option sets)
- [Feature 80 — Trip Master Import](feature-80-trip-master-import.md) (Travel Notes, FR-022–FR-025)
- [Feature 83 — Trip Master Name Tag Option](feature-83-trip-master-name-tag-option.md) (name tag option never picked from notes)

---

## User Stories

### US-88.1: Travel Notes pick the best option in each set

**As** an Org Admin importing a Trip Master
**I want** each set's option chosen from the words that tell that set's options apart
**So that** notes like "Fri Barceló - Antigua" select the options they describe, each word picking one option

**Acceptance:** see Gherkin scenarios under US-88.1.

### US-88.2: "No" or "Not" picks the other option

**As** an Org Admin importing a Trip Master
**I want** "NO Antigua" to mean the participant isn't taking the Antigua option
**So that** they get the other choice when there is exactly one, and nothing is guessed otherwise

**Acceptance:** see Gherkin scenarios under US-88.2.

---

## Requirements

### Functional Requirements

This feature replaces Feature 80 **FR-023**. Feature 80 FR-022 (one option per set, sets already answered are left alone, the days before/after limit), FR-024 (Flight Fee), FR-025 (participant cost), and Feature 83 (name tag) are unchanged.

- **FR-001**: Words are compared as before: ignoring case and accents ("Barcelo" = "Barceló"), split at anything that isn't a letter or digit. A Travel Notes word of three or more characters matches a keyword that starts with it ("Fri" matches "Friday", "Sat" matches "Saturday").
- **FR-002**: Options are matched one **Trip Option N** set at a time, in order of set number (lowest first). A set's **note options** are its options other than flight options (Feature 80 FR-024) and name tag options (Feature 83), which are never selected from Travel Notes. An option's **keywords** are the words of three or more characters in its description that appear in no other note option **of the same set**. In a set with one note option, all its words of three or more characters are keywords.
- **FR-003**: A Travel Notes word directly after "no" or "not" (ignoring case) is **negated**. A negated word is not used for FR-004 matching.
- **FR-004**: In a set where no negated word matches a keyword, the note option with the most matched keywords is selected. When several tie, none in that set is selected, and the summary says "Row N — Name: travel notes "<notes>" match more than one option in Trip Option <N>." (as Feature 80). No match selects none, silently.
- **FR-005**: In a set where a negated word matches a keyword of a note option, FR-004 isn't used for that set:
  - the set has exactly two note options → the **other** option is selected
  - the set has one note option, or more than two → none in that set is selected, silently
- **FR-006**: When FR-004 selects an option, the Travel Notes words that matched its keywords are **used** and aren't matched in later sets. Words aren't used by a tie, by a set where nothing is selected, or by FR-005. A negated word is never used up, so "NO Antigua" applies in every set.
- **FR-007**: Matching (FR-001–FR-006) depends only on the Travel Notes and the trip's options, not on what the application already has. Every option FR-004 or FR-005 picks then goes through Feature 80 FR-022 (only in sets with nothing selected on the application, and not when it breaks the days before/after limit, with that note) and FR-025 (participant cost adds the price adjustments of the options the import selected). Re-importing a file therefore adds options only in sets that are still empty, and never unselects or replaces one.

---

## Assumptions

- Only the one word right after "no" / "not" is negated: "NO Antigua" negates "Antigua"; "not going to Antigua" negates "going" (which matches nothing). "No roommate" negates "roommate", which matches no option.
- A negated word and a plain word can be in the same note; each set is decided on its own ("Sat In - NO Antigua" picks **Arrive Saturday** in one set and turns the Antigua set around in another).
- Because sets are matched in order and words are used once, a word that fits options in two sets selects the one in the lower set only. The January 2027 options had "Antigua" in Trip Option 4 ("Depart Saturday - stay Friday night in Antigua and depart Saturday" / "Depart Friday") and Trip Option 5 ("Antigua Trip"), so Antigua Trip would never be selected. Staff put a choice in one set instead: a two-option set such as "Antigua Trip - stay Friday night" / "Depart Friday", where "Antigua" picks the first and "NO Antigua" the second.
- Option wording that suits the notes staff write (used in the Gherkin Background): the abbreviations they use ("Fri", "Barceló", "Sat", "Antigua"), a day name in one set only, and none of "HTI", "SP", "Room", "will", or "flight" in options picked from notes ("Niether - Will contact HTI" ties with "HTI - Saturday" and "… will be traveling with me").
- Words are used even when the option isn't added because its set already has a selection or the days limit stops it (FR-007), so a re-import matches the same way as the first import.
- The rule is the same for every trip; staff still word option descriptions so notes can match them (Feature 80).

## Edge Cases

- An option whose words all appear in another option of its set (e.g. "Depart Friday" next to "Depart Saturday - stay Friday night in Antigua and depart Saturday") → it has no keywords and is only ever picked by FR-005.
- A negated word matching an option in one set and a plain word matching in another set → each set follows its own rule.
- A set of two where one option is a flight option → it has one note option, so a negated word matching it selects nothing.
- Notes "Fri or Sat" with **Arrive Friday - Barceló** / **Arrive Saturday** / **Neither - contact me about arrival** in one set → tie, nothing selected, tie note (unchanged). "Fri" and "Sat" aren't used by the tie, so they can still match in later sets.
- An option matched by a used word and an unused word ("Saturday - Antigua" against **Antigua Trip - stay Friday night, depart Saturday** after "Saturday" picked **Arrive Saturday**) → it counts only the unused word, and is selected if that's still the most in its set.
- The days before/after limit (Feature 78) can still stop an option FR-005 picks; the note says so.

## Success Criteria

- **SC-001**: Importing the January 2027 Clinica Ezell Trip Master onto a trip with the Background's options selects **Antigua Trip - stay Friday night** for every Travel Notes value that mentions Antigua without "No" in front, **Depart Friday** for every value with "NO Antigua", and an arrival option for every value naming Fri/Barceló or Sat/Saturday, with no ties.
- **SC-002**: Automated tests for every scenario below pass, and existing Trip Master import tests still pass.

---

## Data Ownership & Isolation

No change. The import still only changes the trip being imported, by users who may import it (Feature 80).

---

## Key Entities

- **tripTravelOption** — read (description, set number, price adjustment).
- **tripPeopleRoleOption** — selected options written as before.

---

## API Requirements

No new endpoint. `POST /trips/trips/:id/trip-master-import` selects options by FR-001–FR-007.

---

## Screen Requirements

None.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions"; Org Admin Omar; trip "Clinica Ezell Hospital - January 2027", participant cost $950, with worker role "RN" and these trip options:
  - Trip Option 1: "Need a HTI Name Tag" ($0.00)
  - Trip Option 2: "Purchase my own flight" ($0.00), "HTI purchase my flight (plus flight cost)" (+$40.00)
  - Trip Option 3: "Arrive Friday - Barceló" (+$75.00), "Arrive Saturday" ($0.00), "Neither - contact me about arrival" ($0.00)
  - Trip Option 4: "Antigua Trip - stay Friday night" (+$200.00), "Depart Friday" (+$150.00)
- Omar imports a Trip Master whose RN rows have Flight Fee $0.00, Do you Have a Name Tag "Yes", and these Travel Notes.

### US-88.1 — Travel Notes pick the best option in each set

#### Scenario: Keywords only need to be unique within their set
* **When** Ana's Travel Notes are "SP - Fri Barceló - Antigua"
* **Then** her application has **Arrive Friday - Barceló** and **Antigua Trip - stay Friday night** selected
* **And** her participant cost is 1225

#### Scenario: A word that selects an option isn't used again
* **Given** the Trip Option 4 Antigua option is "Antigua Trip - stay Friday night, depart Saturday" instead
* **When** Ben's Travel Notes are "SP - Saturday"
* **Then** his application has **Arrive Saturday** selected and nothing in Trip Option 4
* **And** when Hal's Travel Notes are "SP - Saturday - Antigua", his application has **Arrive Saturday** and **Antigua Trip - stay Friday night, depart Saturday** selected

#### Scenario: Ties still select nothing
* **When** Cy's Travel Notes are "Fri or Sat"
* **Then** nothing in Trip Option 3 or Trip Option 4 is selected
* **And** the summary says "travel notes "Fri or Sat" match more than one option in Trip Option 3."

### US-88.2 — "No" or "Not" picks the other option

#### Scenario: No in front of a word picks the other of two options
* **When** Dee's Travel Notes are "SP - Sat In - NO Antigua - Room w/Soma Chakraborty"
* **Then** her application has **Arrive Saturday** and **Depart Friday** selected
* **And** her participant cost is 1100

#### Scenario: No in front of a word in a set of one or more than two selects nothing
* **Given** the trip also has Trip Option 5: "Volcano hike" (+$60.00)
* **When** Eli's Travel Notes are "SP - Not Barceló - Antigua"
* **Then** nothing in Trip Option 3 is selected
* **And** his application has **Antigua Trip - stay Friday night** selected
* **And** when Fay's Travel Notes are "SP - Saturday - No volcano", her application has **Arrive Saturday** selected and nothing in Trip Option 4 or Trip Option 5

#### Scenario: Re-importing adds options only in empty sets
* **Given** Ana's application already has **Depart Friday** selected and participant cost 1100
* **When** Omar imports her row with Travel Notes "SP - Fri Barceló - Antigua"
* **Then** her application has **Arrive Friday - Barceló** and **Depart Friday** selected, and not **Antigua Trip - stay Friday night**
* **And** her participant cost is 1175

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-88.1 | Keywords only need to be unique within their set | `backend/tests/travel-notes-option-matching.test.js` | `Keywords only need to be unique within their set` |
| US-88.1 | A word that selects an option isn't used again | `backend/tests/travel-notes-option-matching.test.js` | `A word that selects an option isn't used again` |
| US-88.1 | Ties still select nothing | `backend/tests/travel-notes-option-matching.test.js` | `Ties still select nothing` |
| US-88.2 | No in front of a word picks the other of two options | `backend/tests/travel-notes-option-matching.test.js` | `No in front of a word picks the other of two options` |
| US-88.2 | No in front of a word in a set of one or more than two selects nothing | `backend/tests/travel-notes-option-matching.test.js` | `No in front of a word in a set of one or more than two selects nothing` |
| US-88.2 | Re-importing adds options only in empty sets | `backend/tests/travel-notes-option-matching.test.js` | `Re-importing adds options only in empty sets` |

---

## Agent implementation request

```text
Implement Feature 88 from @features/feature-88-travel-notes-option-matching.md on branch `feature/88-travel-notes-option-matching`.

Backend only. Replace chooseNoteOptions in backend/app/utils/tripMasterCsv.js with the per-set rules (FR-001–FR-007): sets in order of set number; note options exclude flight and name tag options; keywords unique within the set; words after "no"/"not" are negated; most matched keywords wins, ties noted; a negated match picks the other of two note options, otherwise none; words that select an option aren't matched in later sets (negated words are never used up); matching ignores what the application already has. Keep selectTripOptions in tripMasterImport.controller.js applying FR-022/FR-025 unchanged.
Tests per the Test Coverage Map; existing trip-master-import tests must still pass. Update features/reference/behavior.md (Trip Master import Travel Notes rule).
```

---

## Definition of Done

*   [x] Per-set keywords and most-matched selection per **FR-001**, **FR-002**, **FR-004**
*   [x] "No" / "Not" per **FR-003**, **FR-005**
*   [x] Words used once per **FR-006**
*   [x] Existing option rules kept per **FR-007**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Unselecting or replacing options already selected on an application
- Negating more than the one word after "no" / "not", or other negative words ("without", "skip")
- Matching Travel Notes against flight or name tag options
- Creating trip options from Travel Notes
