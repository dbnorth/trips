# Fix: Clearing the People Name Filter

**Feature ID:** 98
**Branch pattern:** `feature/98-fix-people-name-filter-clear`
**Status:** Implemented
**Created:** 2026-10-29
**Input:** "on the person list page when I enter a filter then try to use the X to clear it it does not clear"

On the **People** page, the **Name** filter's clear button (X) sets the filter to empty (`null`), and the list's name filter then fails (`null.trim()`), so the list stays filtered by the old text. Typing to remove the text works; only the X fails.

**Depends on:**
- [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md) (People page and its filters)

---

## User Stories

### US-98.1: Clear the name filter with the X

**As** a person viewing the People page
**I want** the X on the **Name** filter to clear it
**So that** the full list comes back without deleting the text by hand

**Acceptance:** see Gherkin scenarios under US-98.1.

---

## Requirements

### Functional Requirements

- **FR-001**: Clicking the X on the **Name** filter empties the field and shows every person in the list again (still limited by the **Trip** filter, if one is chosen). Typing a new name afterwards filters as before.

---

## Assumptions

- The **Trip** filter's X already works and is unchanged.

## Edge Cases

- Clearing an already-empty **Name** filter → the full list stays.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change.

---

## Key Entities

None.

---

## API Requirements

None.

---

## Screen Requirements

- **People** page: **Name** filter X (FR-001).

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- The People page lists Ana Lopez and Ben Ruiz.

### US-98.1 — Clear the name filter with the X

#### Scenario: Clearing the name filter shows everyone again
* **Given** the **Name** filter is "Ana" and only Ana Lopez is listed
* **When** the X on the **Name** filter is clicked
* **Then** the **Name** filter is empty and both Ana Lopez and Ben Ruiz are listed
* **And** typing "Ben" then lists only Ben Ruiz

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-98.1 | Clearing the name filter shows everyone again | `frontend/tests/PeopleListNameFilter.test.js` | `Clearing the name filter shows everyone again` |

---

## Agent implementation request

```text
Implement Feature 98 from @features/feature-98-fix-people-name-filter-clear.md on branch `feature/98-fix-people-name-filter-clear`.

In frontend/src/views/PeopleList.vue, make filteredPeople treat a null filterName as empty. Test per the Test Coverage Map. Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] Name filter X clears the filter per **FR-001**
*   [x] Automated test for the Gherkin scenario
*   [x] Frontend `npx vitest run` green (backend unchanged)
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Other filters or pages
