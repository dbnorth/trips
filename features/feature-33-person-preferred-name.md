# Feature: Person Preferred Name

**Feature ID:** 33
**Branch pattern:** `feature/33-person-preferred-name`
**Status:** Ready
**Created:** 2026-10-14
**Input:** Add one Preferred name field on the person, after Last name. It defaults to first name plus last name and can include a suffix such as M.D. or R.N. in that same value.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 20 — Person Middle Name](feature-20-person-middle-name.md)

---

## User Stories

### US-33.1: Enter a preferred name when creating an account

**As a** visitor creating an account
**I want** a Preferred name field after Last name that starts as my first and last name
**So that** I can add a suffix such as M.D. or R.N. before I finish registration

**Priority:** P1
**Independent test:** Login create-account and Apply create-account show Preferred name after Last name, prefilled from first and last name; register stores that string
**Acceptance scenarios:** see ### US-33.1

### US-33.2: Enter a preferred name when adding or editing a person

**As a** staff user (or self editing my profile)
**I want** a Preferred name field after Last name on Add person and Edit person
**So that** the person’s preferred name, including a professional suffix, is stored with the profile

**Priority:** P1
**Independent test:** Add person and Edit person show Preferred name after Last name; create and update persist a custom value such as `Ada Applicant, M.D.`
**Acceptance scenarios:** see ### US-33.2

---

## Requirements

### Functional Requirements

- **FR-001**: `person` MUST store `preferredName` (`STRING`, nullable). This is one field. A professional suffix (for example **M.D.** or **R.N.**) is typed into this same string. There is no separate suffix control and no fixed list of suffixes.
- **FR-002**: The default preferred name is the person’s **first name** and **last name** joined by a single space, after trimming each part and dropping a blank part. Middle name is not part of the default.
- **FR-003**: Create-account UIs MUST show a text field labeled **Preferred name** immediately after **Last name** (before Email):
  - Login page create-account form
  - Apply create-account view (`ApplyCreateAccountView`)
  While the user has not edited Preferred name, the field MUST show the **FR-002** default and MUST update when First name or Last name changes. After the user edits Preferred name, later changes to First name or Last name MUST NOT overwrite it. Hint text: **Include a suffix such as M.D. or R.N. if appropriate.**
- **FR-004**: Add person and Edit person MUST show the same **Preferred name** field immediately after **Last name**, with the same default and the same “stop updating once edited” rule as **FR-003**. On Edit person, a stored non-blank `preferredName` is shown as saved. A null `preferredName` shows the **FR-002** default and is still treated as unedited until the user changes it.
- **FR-005**: `POST /trips/register` and person create MUST accept `preferredName`. Omitted or blank MUST be stored as the **FR-002** default from the first and last name on that request. A non-blank value MUST be stored trimmed. If both first and last name are blank, store `null`.
- **FR-006**: Person update MUST accept `preferredName`. A non-blank value is stored trimmed. An explicit blank MUST be stored as the **FR-002** default using the first and last name after that update (incoming names, otherwise the names already stored). Omitting `preferredName` from the body MUST leave the stored value unchanged.
- **FR-007**: GET person MUST return the stored `preferredName` (including `null` when it has never been saved).
- **FR-008**: View person profile MUST show **Preferred name** immediately after **Last name**. When the stored value is null, show the **FR-002** default.
- **FR-009**: Participants CSV MUST include a **Preferred Name** column immediately after **Last Name**. The cell is the stored value, or the **FR-002** default when the stored value is null.
- **FR-010**: `ensureSchema` MUST add `preferredName` on existing databases (nullable; existing rows stay null until a later save).
- **FR-011**: Profile completeness MUST NOT gain a new required check for this field. A blank preferred name is satisfied by the default in **FR-002**.

---

## Assumptions

- Preferred name is on **Person**, not on User.
- **M.D.** and **R.N.** are examples of text the user may type. Any other suffix or wording is allowed in the same field.
- The field is not required on the form. Saving still persists either the typed value or the default.
- Donor first/last fields are not person preferred names.

## Edge Cases

- First name `Ada`, last name `Applicant`, Preferred name left untouched → stored `Ada Applicant`.
- User changes Preferred name to `Ada Applicant, M.D.` → that exact trimmed string is stored, and a later last-name edit does not replace it.
- User clears Preferred name and saves → stored value becomes the current first-name + last-name default, not `null`, when at least one of those names is non-blank.
- Update that does not send `preferredName` → stored value unchanged, including an existing `null`.
- Existing people with `preferredName` null keep `null` in the database. Forms, view profile, and the participants CSV show the default until someone saves.
- Whitespace-only input is treated as blank.

## Success Criteria

- **SC-001**: Create-account, Add person, and Edit person show **Preferred name** after **Last name**, defaulting to first name + last name until the user edits it.
- **SC-002**: Register, person create, and person update persist a custom preferred name and apply the default when the value is blank.
- **SC-003**: View person profile and the participants CSV show the stored preferred name, or the default when it is null.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `preferredName` belongs to the person record. Same read/write gates as first name and last name.

---

## Key Entities

- **Person** — gains `preferredName`

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` | `/trips/register` | none | Optional `preferredName`; blank or omitted → default from first and last name |
| `POST` | `/trips/people` | Yes | Same |
| `PUT` | `/trips/people/:id` | Yes | Accept `preferredName`; omit → unchanged; blank → default |
| `GET` | `/trips/people/:id` | Yes | Return stored `preferredName` |
| `GET` | Participants CSV | Yes | **Preferred Name** column after **Last Name** |

**Payload notes:** `{ preferredName?: string | null }` — trim; blank means “use the default,” not “store null,” on create and on update when the key is present.

**Status codes:** unchanged. Preferred name is never a `400` by itself.

---

## Screen Requirements

| Route / UI | Change |
|------------|--------|
| Login — create account | **Preferred name** after **Last name**, before Email |
| Apply create account | Same field order |
| Add person dialog | Same field order |
| Edit person dialog | Same field order; show stored value, or the default when null |
| View person profile | **Preferred name** row after **Last name** |

**UX notes:** One text field. Hint: **Include a suffix such as M.D. or R.N. if appropriate.** No required rule. While unedited, the field tracks First name and Last name.

---

## Data Model Requirements

### `people` / `person` (extend)

| Column | Type | Notes |
|--------|------|-------|
| preferredName | STRING | nullable; blank saves become the first + last default |

---

## Acceptance Criteria (Gherkin)

### US-33.1 — Enter a preferred name when creating an account

#### Scenario: Create-account form shows Preferred name after Last name
* **Given** I open the Login create-account form (or Apply create-account)
* **When** I view the name fields
* **Then** field order is First name, Middle name, Last name, then Preferred name
* **And** the hint says Include a suffix such as M.D. or R.N. if appropriate.

#### Scenario: Preferred name defaults to first and last name
* **Given** I am on a create-account form
* **When** I enter first name Ada and last name Applicant
* **Then** Preferred name shows Ada Applicant
* **When** I change the last name to Lopez
* **Then** Preferred name shows Ada Lopez

#### Scenario: Registration saves a preferred name with a suffix
* **Given** I register with first name Ada, last name Applicant, and preferred name `Ada Applicant, M.D.`
* **When** registration succeeds
* **Then** the created person stores preferredName `Ada Applicant, M.D.`

### US-33.2 — Enter a preferred name when adding or editing a person

#### Scenario: Add person form shows Preferred name after Last name
* **Given** I open Add person
* **When** I view the name fields
* **Then** Preferred name is immediately after Last name

#### Scenario: Custom preferred name is saved on the person
* **Given** I am editing a person named Ada Applicant
* **When** I set Preferred name to `Ada Applicant, R.N.` and save
* **Then** reloading the person returns preferredName `Ada Applicant, R.N.`

#### Scenario: Blank preferred name saves the default
* **Given** a person named Ada Applicant with a stored preferred name
* **When** I clear Preferred name and save
* **Then** the person stores preferredName `Ada Applicant`

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-33.1 | Create-account form shows Preferred name after Last name | `frontend/tests/Login.test.js` | `Create-account form shows Preferred name after Last name` |
| US-33.1 | Preferred name defaults to first and last name | `frontend/tests/Login.test.js` | `Preferred name defaults to first and last name` |
| US-33.1 | Registration saves a preferred name with a suffix | `backend/tests/auth.test.js` | `Registration saves a preferred name with a suffix` |
| US-33.2 | Add person form shows Preferred name after Last name | `frontend/tests/AddPersonDialog.test.js` | `Add person form shows Preferred name after Last name` |
| US-33.2 | Custom preferred name is saved on the person | `backend/tests/people.test.js` | `Custom preferred name is saved on the person` |
| US-33.2 | Blank preferred name saves the default | `backend/tests/people.test.js` | `Blank preferred name saves the default` |

---

## Agent implementation request

```text
Implement Feature 33 from @features/feature-33-person-preferred-name.md on branch `feature/33-person-preferred-name`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md` (register + person payloads, participants CSV), `features/reference/behavior.md` (default preferred name)

---

## Definition of Done

*   [x] `preferredName` on person + schema ensure (**FR-001**, **FR-010**)
*   [x] Register, create, and update apply the default and return the stored value (**FR-005**, **FR-006**, **FR-007**)
*   [x] Create-account and Add/Edit person show Preferred name after Last name (**FR-003**, **FR-004**)
*   [x] View profile and participants CSV show the stored value or the default (**FR-008**, **FR-009**)
*   [x] Profile completeness is unchanged (**FR-011**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/33-person-preferred-name`; PR → `dev`

---

## Out of Scope

- A separate suffix dropdown or a fixed list limited to M.D. and R.N.
- Putting middle name into the default preferred name
- Replacing list, menu, trip, flight, rooming, or public-page display names with preferred name
- Public person URL slugs (they stay first name + last name)
- Donor name fields
- Requiring preferred name for profile completeness beyond the default
