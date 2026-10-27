# Feature: Trip Master Header Row

**Feature ID:** 90
**Branch pattern:** `feature/90-trip-master-header-row`
**Status:** Implemented
**Created:** 2026-10-27
**Input:** "create a feature to update the import to find the heading line so it does not matter if there is a first line with some text, a blank line or no line before the row of column header"

Interpreted as:
- The Trip Master import (Feature 80) expects row 1 to be a title and rows 2–3 the two-row column header. A file saved without the title row ("First Name, Last Name … not found" on production) or with an extra blank line is refused.
- The import instead **finds** the two header rows: whatever comes before them (a title, a blank line, several lines, or nothing) is ignored.

**Depends on:**
- [Feature 80 — Trip Master Import](feature-80-trip-master-import.md) (columns, sections, summary row numbers)

---

## User Stories

### US-90.1: The import finds the column header wherever it starts

**As** an Org Admin importing a Trip Master
**I want** the import to find the column header rows itself
**So that** a file with or without a title or blank line above the header imports the same way

**Acceptance:** see Gherkin scenarios under US-90.1.

---

## Requirements

### Functional Requirements

- **FR-001**: The **header** is the first pair of consecutive rows, starting in the first **10** rows of the file, whose joined names (Feature 80: each column's two header cells joined, case and extra spaces ignored, trailing words allowed) contain all the required columns: **First Name**, **Last Name**, **E-Mail**, and **Position Required**. Rows before the header are ignored, whatever they hold (title text, a blank line, a line of only commas, or several lines).
- **FR-002**: Data rows start on the row after the header. Everything after that is read as in Feature 80 (sections, "Total", waiting list, cancellations).
- **FR-003**: Row numbers in the summary ("Row N — Name: …") stay the spreadsheet row numbers. With no title row, a person on the 4th line is "Row 4", as the spreadsheet shows it.
- **FR-004**: When no pair of rows in the first 10 has all required columns, the file is refused as now: "This file isn't a Trip Master CSV. Missing columns: <columns>." The columns listed are those missing from the pair that found the most required columns (the earliest such pair on a tie).

---

## Assumptions

- The header is always two rows, as in the Trip Master spreadsheet ("Position Required" over "In Yellow", "First" over "Name", …). A one-row header isn't supported.
- Ten rows is enough room for any title or notes above the header; a header further down is treated as not found.
- The other optional columns (Feature 80, 83, 84) are found in the same header pair as the required ones.

## Edge Cases

- Title row, then header (today's layout) → unchanged; row numbers unchanged.
- Header on the first line → imports; the first person is "Row 3".
- Blank line (or a line of only commas) before the header → imports; rows count the blank line.
- Title, blank line, then header → imports.
- A title row that itself mentions "First Name" → it's only the header when it and the next row hold all four required columns.
- No header in the first 10 rows → FR-004 message; nothing is imported.

## Success Criteria

- **SC-001**: The production Trip Master saved without its title row imports with the same results as the version with the title row (apart from row numbers in the summary).
- **SC-002**: Automated tests for every scenario below pass, and existing Trip Master import tests still pass.

---

## Data Ownership & Isolation

No change (Feature 80).

---

## Key Entities

None changed.

---

## API Requirements

No new endpoint. `POST /trips/trips/:id/import-trip-master` finds the header by FR-001; the FR-004 `400` message is unchanged in wording.

---

## Screen Requirements

None.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Org Admin Omar; trip "Guatemala Clinic 2027" with worker roles "General Surgeon" and "RN Circulator", as in the Feature 80 tests.
- The Feature 80 sample Trip Master (`backend/tests/fixtures/trip-master-sample.csv`): title row "Guatemala Clinic 2027 Trip Master", two header rows, Lyle Lowry on row 4, Andrea Fletcher (cancelled, "Fri or Sat") on row 16.

### US-90.1 — The import finds the column header wherever it starts

#### Scenario: A file without the title row imports
* **When** Omar imports the sample with its title row removed
* **Then** the import adds the same people and applications as the full sample
* **And** the summary says "Row 15 — Andrea Fletcher: travel notes "Fri or Sat" match more than one option in Trip Option 2."

#### Scenario: A blank line before the header is skipped
* **When** Omar imports the sample with the title row replaced by a blank line
* **Then** the import adds the same people and applications as the full sample
* **And** the summary names Andrea Fletcher on row 16
* **And** a line of only commas instead of the blank line imports the same way

#### Scenario: Several lines before the header are skipped
* **When** Omar imports the sample with a blank line added after the title row
* **Then** the import adds the same people and applications as the full sample
* **And** the summary names Andrea Fletcher on row 17

#### Scenario: A file without the header is still refused
* **When** Omar imports a contacts file whose header has only "First Name" and "Last Name"
* **Then** the import is refused with "This file isn't a Trip Master CSV. Missing columns: E-Mail, Position Required."
* **And** nothing is imported

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-90.1 | A file without the title row imports | `backend/tests/trip-master-header-row.test.js` | `A file without the title row imports` |
| US-90.1 | A blank line before the header is skipped | `backend/tests/trip-master-header-row.test.js` | `A blank line before the header is skipped` |
| US-90.1 | Several lines before the header are skipped | `backend/tests/trip-master-header-row.test.js` | `Several lines before the header are skipped` |
| US-90.1 | A file without the header is still refused | `backend/tests/trip-master-import.test.js` | `A file that isn't a Trip Master CSV is refused` (existing) |

---

## Agent implementation request

```text
Implement Feature 90 from @features/feature-90-trip-master-header-row.md on branch `feature/90-trip-master-header-row`.

Backend only. In backend/app/utils/tripMasterCsv.js readTripMaster, find the header pair (FR-001) in the first 10 records instead of records[1]/records[2]; data starts after it; summary row numbers stay spreadsheet rows (FR-003); when none is found return the missing required columns of the pair that found the most (FR-004).
Tests per the Test Coverage Map; existing trip-master-import tests must still pass. Update features/reference/behavior.md (Trip Master import header rule).
```

---

## Definition of Done

*   [x] Header found per **FR-001**, **FR-002**
*   [x] Row numbers per **FR-003**
*   [x] Refusal per **FR-004**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- One-row headers or headers below row 10
- Choosing between several Trip Masters in one file
- Changing column names or which columns are required
