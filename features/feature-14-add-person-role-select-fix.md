# Feature: Add Person Role Dropdown Does Not Crash

**Feature ID:** 14
**Branch pattern:** `feature/14-add-person-role-select-fix`
**Status:** Ready
**Created:** 2026-09-05
**Input:** Defect — as an admin adding a person, opening the Role select throws `Cannot read properties of undefined (reading 'roleDescription')` in `AddPersonDialog.vue`
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-14.1: Open Role select when adding a person
**As an** Org Admin or System Admin  
**I want** the Role dropdown on Add person to open without an error  
**So that** I can assign an org role and save the new person

**Priority:** P1  
**Independent test:** Mount `AddPersonDialog`, open Role `v-select`, no throw; subtitle shows role description when present  
**Acceptance scenarios:** see ### US-14.1

---

## Requirements

### Functional Requirements

- **FR-001**: `AddPersonDialog.vue` Role `v-select` `#item` slot MUST render each catalog role without throwing when the menu opens.
- **FR-002**: Role list items MUST show `roleName` as the title (existing `item-title="roleName"`) and MUST show `roleDescription` as subtitle when that field is present on the role object.
- **FR-003**: The item slot MUST use the Vuetify 4 `#item` slot shape: the `item` slot prop is the **raw** role object (not `item.raw`). Access description as `item.roleDescription` (safe when missing).
- **FR-004**: Add-person create payload, org/role validation, and System Admin vs Org Admin org pickers MUST remain unchanged from Feature 2.

---

## Assumptions

- Root cause: Vuetify 4 renamed the select item slot payload — `item` is the raw object; `item.raw` is undefined, so `item.raw.roleDescription` throws.
- Role catalog still comes from `GET` roles (`RoleServices.getAll()`); no API change.
- Only `AddPersonDialog.vue` uses this `item.raw.roleDescription` pattern today.

## Edge Cases

- Role with missing/null `roleDescription` → list item still renders; subtitle may be empty/absent; no throw.
- Empty roles list → select shows no items; no throw.

## Success Criteria

- **SC-001**: System Admin or Org Admin can open Add person → Role menu without a runtime error.
- **SC-002**: Automated test for the scenario below passes.

---

## Data Ownership & Isolation

Unchanged from Feature 2.

---

## Key Entities

- **Role** — catalog row with `id`, `roleName`, `roleDescription` (unchanged)

---

## API Requirements

No API change.

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| People → Add person dialog | `AddPersonDialog.vue` | Fix Role `#item` slot for Vuetify 4 (`item.roleDescription`) |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-14.1 — Open Role select when adding a person

#### Scenario: Admin opens Role dropdown on Add person
* **Given** I am an Org Admin or System Admin
* **And** the Add person dialog is open with at least one role loaded
* **When** I open the Role select menu
* **Then** the menu lists roles without a runtime error
* **And** a role with `roleDescription` shows that text as the item subtitle

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-14.1 | Admin opens Role dropdown on Add person | `frontend/tests/AddPersonDialog.test.js` | `Admin opens Role dropdown on Add person` |

---

## Agent implementation request

```text
Implement Feature 14 from @features/feature-14-add-person-role-select-fix.md on branch `feature/14-add-person-role-select-fix`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Living reference: none required unless behavior docs mention this UI detail.
Do not implement behavior not in this spec.
Do not change create-person API or org picker rules (FR-004).
```

**Reference updates:** none (UI slot fix only)

---

## Definition of Done

*   [x] `AddPersonDialog.vue` Role select per **FR-00N**
*   [x] Automated test for the Gherkin scenario
*   [x] `npm test` green (at least frontend suite covering this test)
*   [x] Living reference unchanged (N/A)

## Out of Scope

- Changing which roles appear in the catalog — Feature 2
- Edit person dialog role assignment UX beyond this crash
- Vuetify upgrades unrelated to this slot
