# Feature: Person Middle Name

**Feature ID:** 20
**Branch pattern:** `feature/20-person-middle-name`
**Status:** Done
**Created:** 2026-09-05
**Input:** Add an optional middle name on the person, shown after the first name field on create-account and add/edit person forms
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md)

---

## User Stories

### US-20.1: Enter middle name when creating an account
**As a** visitor creating an account  
**I want** an optional Middle name field after First name  
**So that** my legal / preferred name can include a middle name from the start

**Priority:** P1  
**Independent test:** Login create-account and Apply create-account show Middle name after First name; register API accepts and stores it on the person  
**Acceptance scenarios:** see ### US-20.1

### US-20.2: Enter middle name when adding or editing a person
**As a** staff user (or self editing my profile)  
**I want** an optional Middle name field after First name on Add person and Edit person  
**So that** I can record or update a person’s middle name

**Priority:** P1  
**Independent test:** AddPersonDialog and EditPersonDialog show Middle name after First name; create/update person persist it  
**Acceptance scenarios:** see ### US-20.2

---

## Requirements

### Functional Requirements

- **FR-001**: `person` MUST support optional `middleName` (`STRING`, nullable). Empty / whitespace-only input MUST be stored as `null` (or empty cleared to null — same trim-to-null pattern as other optional person strings).
- **FR-002**: Middle name MUST **not** be required for registration or for person create/update API validation (blank may still be saved). Middle name MUST be **required for person profile completeness** (same gate as first/last name): an incomplete middle name MUST keep trip applications from reaching **applied** / complete status until set.
- **FR-003**: `POST /trips/register` MUST accept optional `middleName` and persist it on the created Person (with first/last name).
- **FR-004**: Person create and update APIs MUST accept optional `middleName` and return it on person payloads (including get-by-id / list where first/last already appear).
- **FR-005**: Create-account UIs MUST show a **Middle name** field **immediately after** the **First name** field (before **Last name**):
  - Login page create-account form
  - Apply create-account view (`ApplyCreateAccountView`)
- **FR-006**: Staff / profile person UIs MUST show a **Middle name** field **immediately after** the **First name** field (before **Last name**):
  - Add person dialog
  - Edit person dialog
- **FR-007**: View person profile (and similar read-only person name displays that list first/last as separate fields) MUST show middle name when present (e.g. a **Middle name** row, or include it in the composed display name). Lists that show `firstName lastName` MUST include middle name when present (e.g. `First Middle Last`), without inventing new list columns beyond updating the existing name string. **Public person URL slugs** (donate / fundraising participant paths) MUST continue to use **first name + last name only** (exclude middle name).
- **FR-008**: Schema migration / `ensureSchema` MUST add `middleName` for existing databases (nullable; existing rows remain null).

---

## Assumptions

- Middle name is demographic data on **Person**, not on User (User stays auth-only).
- Registration may omit middle name; the applicant must fill it before the application is complete.
- Label is exactly **Middle name** (title case consistent with **First name** / **Last name**).
- Autocomplete MAY use `additional-name` where browsers support it; not required for acceptance.
- Donor first/last fields (Feature 8) are **out of scope** — donors are not persons.

## Edge Cases

- Register / save with middle name omitted or blank → person.middleName is null; no error on register/save.
- Profile / application completeness treats missing middle name like missing first or last name.
- Very long middle names → same string length limits as first/last if the model uses unbounded STRING; do not invent a new max unless first/last already have one.
- Existing persons without middle name continue to display as `First Last` only.

## Success Criteria

- **SC-001**: Create-account and add/edit person UIs show Middle name after First name.
- **SC-002**: Register and person create/update persist and reload `middleName`.
- **SC-003**: Display/list name strings include middle name when set; public URL slugs exclude middle name.
- **SC-004**: Profile completeness (application applied) requires middle name.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `middleName` belongs to the person record. Same read/write gates as other person name fields (self, Org Admin for org members, System Admin as today).

---

## Key Entities

- **Person** — gains optional `middleName`

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` | `/trips/register` | none | Optional body `middleName` → person |
| Existing | Person create / update / get | as today | Accept/return `middleName` |

**Payload notes:** `{ middleName?: string | null }` — trim; blank → null.

**Status codes:** unchanged (`400` only for existing required-field failures; middle name never required).

---

## Screen Requirements

| Route / UI | Change |
|------------|--------|
| Login — create account | **Middle name** after **First name**, before **Last name** |
| Apply create account | Same field order |
| Add person dialog | Same field order |
| Edit person dialog | Same field order |
| View person profile | Show middle name when present |

**UX notes:** Optional field; no asterisk / required rule. Keep density and layout consistent with adjacent name fields (same row pattern if first/last already share a row — place middle between them).

---

## Data Model Requirements

### `people` / `person` (extend)

| Column | Type | Notes |
|--------|------|-------|
| middleName | STRING | nullable; optional |

---

## Acceptance Criteria (Gherkin)

### US-20.1 — Enter middle name when creating an account

#### Scenario: Create-account form shows Middle name after First name
* **Given** I open the Login create-account form (or Apply create-account)
* **When** I view the name fields
* **Then** field order is First name, then Middle name, then Last name
* **And** Middle name is not required

#### Scenario: Registration saves middle name on the person
* **Given** I register with firstName, middleName, lastName, email, and password
* **When** registration succeeds
* **Then** the created person has that middleName stored
* **And** loading the person returns middleName

### US-20.2 — Enter middle name when adding or editing a person

#### Scenario: Add person form shows Middle name after First name
* **Given** I open Add person
* **When** I view the name fields
* **Then** field order is First name, then Middle name, then Last name

#### Scenario: Edit person saves middle name
* **Given** an existing person
* **When** I set Middle name and save
* **Then** the person record stores middleName
* **And** reopening Edit person shows the saved middle name

#### Scenario: Blank middle name clears the value
* **Given** a person with middleName set
* **When** I clear Middle name and save
* **Then** person.middleName is null

#### Scenario: Application completeness requires middle name
* **Given** a person whose profile is otherwise complete but middleName is blank
* **When** application completeness is evaluated
* **Then** the profile is not complete
* **And** the application cannot be status applied until middleName is set

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-20.1 | Create-account form shows Middle name after First name | `frontend/tests/` Login / ApplyCreateAccount | `Create-account form shows Middle name after First name` |
| US-20.1 | Registration saves middle name on the person | `backend/tests/auth.test.js` (or equivalent) | `Registration saves middle name on the person` |
| US-20.2 | Add person form shows Middle name after First name | `frontend/tests/` AddPersonDialog / EditPersonDialog | `Add person form shows Middle name after First name` |
| US-20.2 | Edit person saves middle name | `backend/tests/people.test.js` | `Edit person saves middle name` |
| US-20.2 | Blank middle name clears the value | `backend/tests/people.test.js` | `Blank middle name clears the value` |
| US-20.2 | Application completeness requires middle name | `backend/tests/people.test.js` or applications | `Application completeness requires middle name` |

---

## Agent implementation request

```text
Implement Feature 20 from @features/feature-20-person-middle-name.md on branch `feature/20-person-middle-name`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md` (register + person payloads), optionally `behavior.md` if display-name rules are documented there

---

## Definition of Done

*   [x] `middleName` on person + schema ensure (**FR-001**, **FR-008**)
*   [x] Register + person APIs accept/return middleName (**FR-003**, **FR-004**)
*   [x] Create-account and Add/Edit person UIs show Middle name after First name (**FR-005**, **FR-006**)
*   [x] Display/list names include middle when set; URL slugs exclude middle (**FR-007**)
*   [x] Profile completeness requires middle name (**FR-002**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/20-person-middle-name`; PR → `dev`

---

## Out of Scope

- Making middle name required
- Donor name fields
- Passport / legal-document middle-name validation beyond storing the string
- Renaming “First name” / “Last name” labels
- Separate “preferred name” vs “legal name” models
