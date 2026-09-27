# Feature: Person Other Languages

**Feature ID:** 31
**Branch pattern:** `feature/31-person-other-languages`
**Status:** Ready
**Created:** 2026-09-27
**Input:** On the person profile, ask whether the person speaks a language other than English; when Yes, collect one or more languages with fluency (Basic or Conversational) and whether they know medical terminology in that language. Store answers on the person so they reload on later trips.
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-31.1: Say whether you speak a language other than English

**As a** person editing my profile (including on a trip application)
**I want** to answer whether I speak a language other than English
**So that** trip staff know if I can help in another language

**Priority:** P1
**Independent test:** Health section shows **Do you speak a language other than English?** as an unanswered Yes/No; No hides language rows; Yes shows them
**Acceptance scenarios:** see ### US-31.1

### US-31.2: Record language, fluency, and medical terminology

**As a** person who speaks a language other than English
**I want** to add each language with fluency (Basic or Conversational) and whether I know medical terminology in that language
**So that** staff can see both general ability and medical vocabulary

**Priority:** P1
**Independent test:** Saving Yes with Spanish / Conversational / medical terminology Yes persists on the person and reloads on a later profile or application load
**Acceptance scenarios:** see ### US-31.2

### US-31.3: Clear languages when the answer is No

**As a** person who changes the answer to No
**I want** saved other-language rows removed
**So that** staff do not see languages I no longer claim

**Priority:** P1
**Independent test:** Saving `speaksOtherLanguage` false deletes that person’s language rows
**Acceptance scenarios:** see ### US-31.3

---

## Requirements

### Functional Requirements

- **FR-001**: The person record MUST store `speaksOtherLanguage` (boolean, nullable). `null` means unanswered. The control MUST start empty (do not default to No).
- **FR-002**: Person profile Health information (Add/Edit person and trip application health sections that edit the person) MUST show, after the medication / medical-conditions controls, a Yes/No labeled **Do you speak a language other than English?**
- **FR-003**: When `speaksOtherLanguage` is not `true`, language rows MUST be hidden. Saving `false` or `null` MUST delete that person’s other-language rows.
- **FR-004**: When `speaksOtherLanguage === true`, the UI MUST allow one or more language rows. Each row MUST include:
  - **Language** — selected from the global language catalog (code + name)
  - **Fluency** — exactly **Basic** (`basic`) or **Conversational** (`conversational`)
  - **Medical terminology** — Yes/No labeled **Do you know medical terminology in this language?** (`knowsMedicalTerminology`)
- **FR-005**: The same person MUST NOT save the same language twice. Duplicate language on one person → `400`.
- **FR-006**: When `speaksOtherLanguage === true`, save MUST require at least one language row, and each row MUST have a catalog language, a fluency of `basic` or `conversational`, and `knowsMedicalTerminology` `true` or `false`. Incomplete rows → `400`.
- **FR-007**: Other-language answers MUST be stored on the **person** (not on `tripPeopleRole`). Opening another trip application for the same person MUST load the same language rows.
- **FR-008**: A global **language** catalog MUST exist (`code` unique, `name`). The app MUST seed languages of the **Western Hemisphere** (the Americas) other than English, using an ISO 639-1 code when one exists and ISO 639-3 otherwise, plus an English name. Authenticated users who can edit a person profile MUST be able to list the catalog for the selector. System Admin catalog CRUD UI is out of scope.
- **FR-009**: Person create/update MUST accept `speaksOtherLanguage` and, when true, `languages: [{ languageId, fluency, knowsMedicalTerminology }]`. GET person MUST return `speaksOtherLanguage` and `languages` (id, code, name, fluency, knowsMedicalTerminology).
- **FR-010**: When `speaksOtherLanguage === true` and there is not at least one complete language row, person **profile completeness** MUST treat **Other languages** as missing (same gate style as medical conditions when taking medication). When the answer is `false`, language rows are not required. Unanswered (`null`) does not by itself add a missing-field label.
- **FR-011**: View person profile MUST show the Yes/No and, when Yes, each language with fluency label and medical-terminology Yes/No.

---

## Assumptions

- English is the application language and is not entered as a row.
- Fluency values are only **Basic** and **Conversational**.
- Medical terminology is a per-language Yes/No, not a second fluency scale.
- The language catalog is global, not per organization.
- Profile completeness follows allergies/medication: the Yes/No may stay unanswered without blocking completeness; a Yes without a complete row does block.

## Edge Cases

- Unanswered Yes/No → rows hidden; no language rows stored; completeness not blocked by this question.
- Yes with zero rows → `400`; profile incomplete (**Other languages**).
- Yes → No on save → all language rows for that person deleted.
- Same language submitted twice → `400`.
- Unknown `languageId` or fluency other than `basic` / `conversational` → `400`.
- Medical terminology omitted on a row → `400`.
- Same person, second trip → GET person returns the previously saved languages.

## Success Criteria

- **SC-001**: Profile and application health UIs ask whether the person speaks a language other than English and, when Yes, collect language, Basic/Conversational fluency, and medical terminology.
- **SC-002**: Answers persist on the person and reload on a later profile or application load.
- **SC-003**: No (or unanswered) clears language rows; duplicates and incomplete rows are rejected.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `speaksOtherLanguage` and language rows belong to the **person**. Access matches existing person profile read/update (self, org staff, system admin as today).
- The language catalog is global reference data (list for authenticated profile editors). No org scoping.

---

## Key Entities

- **Person** — `speaksOtherLanguage`
- **Language** — global catalog (`code`, `name`)
- **PersonLanguage** — person + language + fluency + knows medical terminology

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/languages` | Yes | List language catalog for selectors |
| `GET` | `/trips/people/:id` | Yes | Include `speaksOtherLanguage` and `languages` |
| `POST` | `/trips/people` | Yes | Accept the same fields on create |
| `PUT` | `/trips/people/:id` | Yes | Replace language rows per FR-003–FR-006 |

**Illustrative person payload:**

```json
{
  "speaksOtherLanguage": true,
  "languages": [
    {
      "languageId": 1,
      "fluency": "conversational",
      "knowsMedicalTerminology": true
    }
  ]
}
```

**Illustrative GET language row:**

```json
{
  "languageId": 1,
  "code": "es",
  "name": "Spanish",
  "fluency": "conversational",
  "knowsMedicalTerminology": true
}
```

**Status codes:** `200` success; `400` validation; `401` unauthenticated; existing person access `403`/`404`.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `PersonProfileFields` (Add/Edit person, application health) | After medication controls: **Do you speak a language other than English?** When Yes, rows with language autocomplete, fluency **Basic** / **Conversational**, medical terminology Yes/No, and add/remove row |
| View person profile | Show the Yes/No and each language, fluency, and medical terminology when Yes |

---

## Data Model Requirements

### `person` (column)

| Column | Type | Notes |
|--------|------|--------|
| speaksOtherLanguage | BOOLEAN | nullable; `null` = unanswered |

### `language` (new)

| Column | Type | Notes |
|--------|------|--------|
| id | INTEGER PK | autoIncrement |
| code | STRING(10) | required; unique (ISO 639-1 or 639-3) |
| name | STRING(100) | required |

Seeded. No org column.

### `personLanguage` (new)

| Column | Type | Notes |
|--------|------|--------|
| id | INTEGER PK | autoIncrement |
| personId | INTEGER | required FK → person |
| languageId | INTEGER | required FK → language |
| fluency | ENUM(`basic`,`conversational`) | required |
| knowsMedicalTerminology | BOOLEAN | required |
| unique | `(personId, languageId)` | |

**Associations:** Person `hasMany` personLanguage; Language `hasMany` personLanguage. Deleting a person cascades language rows.

---

## Acceptance Criteria (Gherkin)

### US-31.1 — Say whether you speak a language other than English

#### Scenario: Question starts unanswered and rows stay hidden until Yes
* **Given** I am editing a person profile whose other-language answer is unset
* **Then** **Do you speak a language other than English?** has no Yes or No selected
* **And** language rows are not shown

#### Scenario: No hides language rows
* **Given** I am editing a person profile
* **When** I answer **Do you speak a language other than English?** No
* **Then** language rows are not shown

### US-31.2 — Record language, fluency, and medical terminology

#### Scenario: Conversational Spanish with medical terminology is saved on the person
* **Given** the language catalog includes Spanish
* **And** I set **Do you speak a language other than English?** to Yes
* **When** I add Spanish, fluency Conversational, medical terminology Yes, and save the person
* **Then** reloading the person shows Spanish, Conversational, and medical terminology Yes

#### Scenario: Prior languages reload on another trip application
* **Given** my person already has Spanish saved as Conversational with medical terminology Yes
* **When** I open an application for another trip
* **Then** the health section shows that same language row

#### Scenario: Duplicate language is rejected
* **Given** I answer Yes
* **When** I save two rows for the same language
* **Then** the save fails with a validation error

### US-31.3 — Clear languages when the answer is No

#### Scenario: Changing Yes to No removes saved languages
* **Given** my person has a saved Spanish row
* **When** I set **Do you speak a language other than English?** to No and save
* **Then** the person has no other-language rows

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-31.1 | Question starts unanswered and rows stay hidden until Yes | `frontend/tests/PersonProfileFields.test.js` | `Other language question starts unanswered` |
| US-31.1 | No hides language rows | `frontend/tests/PersonProfileFields.test.js` | `Other language rows hidden when answer is No` |
| US-31.2 | Conversational Spanish with medical terminology is saved on the person | `backend/tests/person-languages.test.js` | `Conversational Spanish with medical terminology is saved on the person` |
| US-31.2 | Prior languages reload on another trip application | `backend/tests/person-languages.test.js` | `Prior languages reload on a later person load` |
| US-31.2 | Duplicate language is rejected | `backend/tests/person-languages.test.js` | `Duplicate language is rejected` |
| US-31.3 | Changing Yes to No removes saved languages | `backend/tests/person-languages.test.js` | `Changing Yes to No removes saved languages` |

---

## Agent implementation request

Copy when asking Cursor to implement this feature (`@` this file):

```text
Implement Feature 31 from @features/feature-31-person-other-languages.md on branch `feature/31-person-other-languages`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `api.md`, `data-model.md`, `behavior.md`.

---

## Definition of Done

*   [x] Backend and frontend implemented per this spec (**FR-001**–**FR-011** satisfied)
*   [x] **Success Criteria (SC-001**–**SC-004)** met
*   [x] All mapped tests pass (`npm test`)
*   [x] Test Coverage Map complete
*   [x] `features/reference/data-model.md` updated
*   [x] `features/reference/api.md` updated
*   [x] `features/reference/behavior.md` updated

---

## Out of Scope

- Fluency levels beyond **Basic** and **Conversational** (Fluent, Native, CEFR, ILR)
- English medical-terminology as its own question
- System Admin UI to add or edit languages
- Per-organization language catalogs
- Storing languages on the trip application instead of the person
- Participants CSV columns for languages
