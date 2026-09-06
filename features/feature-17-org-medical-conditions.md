# Feature: Organization Medical Conditions & Person Selections

**Feature ID:** 17
**Branch pattern:** `feature/17-org-medical-conditions`
**Status:** Done
**Created:** 2026-09-05
**Input:** If a trip applicant answers the taking-medication question Yes, the form displays a list of medical conditions (name only, max 50 characters) from a list maintained by the org admin (each org has its own list); selected items are saved on the person and reload when they apply for another trip
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 3 — Organizations & Agreements](feature-3-organizations-and-agreements.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md)

---

## User Stories

### US-17.1: Maintain organization medical conditions

**As an** Org Admin  
**I want to** add, edit, and remove medical condition names for my organization  
**So that** applicants can pick from our standard list when they take medication

**Priority:** P1  
**Independent test:** CRUD org-scoped medical conditions (name ≤ 50 chars)  
**Acceptance scenarios:** see ### US-17.1

### US-17.2: Select medical conditions when taking medication

**As a** trip applicant (or person editing their profile)  
**I want** a multi-select of my org’s medical conditions to appear when I answer “Take medication?” Yes  
**So that** I can record which conditions apply to me

**Priority:** P1  
**Independent test:** With `takesMedication = true`, condition list for the trip’s (or acting) org is shown; selections save on the person  
**Acceptance scenarios:** see ### US-17.2

### US-17.3: Reload prior selections on a later application

**As a** trip applicant who already selected medical conditions for an organization  
**I want** those selections pre-checked when I apply to another trip for the same org  
**So that** I do not re-enter the same health information

**Priority:** P1  
**Independent test:** Save selections on person for org A; open a second trip application for org A → same conditions selected  
**Acceptance scenarios:** see ### US-17.3

---

## Requirements

### Functional Requirements

- **FR-001**: Each organization MUST have its own catalog of **medical conditions**. A medical condition record MUST include at least `orgId` and `name`. `name` MUST be required, trimmed, and at most **50** characters.
- **FR-002**: Org Admin MUST create, update, list, and delete medical conditions for their organization. System Admin MUST manage any org’s catalog (same org-scoping pattern as worker roles). List/create MUST be scoped by `orgId` (query and/or acting-org header as existing org catalogs do).
- **FR-003**: Within one organization, medical condition `name` MUST be unique case-insensitively (reject duplicate create/update with a clear `400`/`409` message).
- **FR-004**: When the person’s **Take medication?** answer is **Yes** (`takesMedication === true`), the health section of the person profile UI (used on profile edit and on trip application flows that edit the person profile) MUST display a multi-select (or equivalent multi-choice control) of that organization’s **active catalog** of medical condition names.
- **FR-005**: When **Take medication?** is **No** / false, the medical-conditions control MUST be hidden. Saving with `takesMedication === false` MUST clear that person’s selected medical conditions **for the organization context being edited** (see FR-008).
- **FR-006**: Selected medical conditions MUST be stored on the **person** (not on `tripPeopleRole` / the application row alone), via links to catalog rows (`person` ↔ `medicalCondition`).
- **FR-007**: On later trip applications for the **same organization**, the multi-select MUST reload the person’s previously saved selections for that org’s conditions.
- **FR-008**: **Organization context for the list and selections:**
  - On a **trip application** (browse/apply / application page), use the **trip’s `orgId`**.
  - On **Add/Edit person** (staff or self profile) outside a trip, use the **acting organization** when one is selected; if none is selected and the person has exactly one org membership, use that org; otherwise require an acting org (or hide the condition picker until org context is known) — do not mix catalogs from multiple orgs in one control.
- **FR-009**: Only conditions belonging to the current org context MAY be offered or saved. Saving MUST reject condition ids that do not belong to that `orgId`.
- **FR-010**: When `takesMedication === true`, the person MUST select **at least one** medical condition for the current org before the profile is considered complete for that health requirement (same pattern as allergies description when `hasAllergies` is true). If the org catalog is empty, the UI MUST show a clear message that the org has no conditions configured; profile completeness for medication conditions cannot be satisfied until the catalog has items and at least one is selected (Org Admin must maintain the list).
- **FR-011**: Deleting a medical condition MUST remove any person selections that reference it. Renaming a condition updates the catalog name; existing person links keep the same id and show the new name.
- **FR-012**: Staff viewing a person profile MUST be able to see selected medical condition names for the relevant org context (read-only on view dialogs is enough).
- **FR-013**: Phone dialing codes, free-text medication notes, dosages, and clinical codes are **out of scope** — catalog entries are **name only**.

---

## Assumptions

- `takesMedication` already exists on `person` (Feature 2) and is shown in `PersonProfileFields` (“Take medication?”).
- Org Admin already manages other org catalogs (e.g. worker roles at `/worker-roles`); medical conditions follow a similar CRUD + nav pattern.
- A person may belong to multiple orgs; selections are **per person per condition** (conditions are org-owned), so applying under org B does not show org A’s catalog or force org A’s selections.
- “Apply for another trip” in the input means another trip **for the same organization** (FR-007). Cross-org reuse of names is not automatic.

## Edge Cases

- Org catalog empty + `takesMedication` Yes → show empty-state message; cannot complete medication condition requirement until Org Admin adds conditions.
- User switches Yes → selects conditions → switches to No → save clears that org’s person–condition links.
- User switches No → Yes again → prior selections for that org are gone (cleared on No save); they re-select.
- Condition deleted while selected → link removed; next load no longer shows that item.
- Duplicate name (case-insensitive) in same org → rejected.
- Name longer than 50 characters → rejected by API and UI validation.
- System Admin with “All organizations” and no acting org on person edit → do not show a merged multi-org condition list (FR-008).

## Success Criteria

- **SC-001**: Org Admin can CRUD medical conditions (name ≤ 50) scoped to their org.
- **SC-002**: With Take medication? = Yes, the applicant sees the org’s condition list, can multi-select, and selections persist on the person.
- **SC-003**: Applying to a second trip in the same org reloads the same selections.
- **SC-004**: Take medication? = No hides the list and clears that org’s selections on save.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Medical condition catalog rows belong to one `organization` (`orgId`). Org Admin manages only their org; System Admin may manage any org.
- Person–condition links are readable/writable under the same person access rules as profile update (self, org staff in scope, System Admin). Applicants only mutate their own person selections.
- Listing conditions for an application uses the trip’s org; applicants need read access to that org’s **active catalog** while applying (authenticated GET filtered by `orgId`).

---

## Key Entities

- **MedicalCondition** — org-owned catalog entry (`orgId`, `name`)
- **PersonMedicalCondition** — join between **Person** and **MedicalCondition** (selected conditions for that person)
- **Person** — existing `takesMedication` flag gates the UI
- **Organization** — owns the catalog
- **Trip** — supplies `orgId` context on application flows

---

## API Requirements

| Method   | Endpoint                                 | Auth | Purpose                                                                                                |
| -------- | ---------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------ |
| `GET`    | `/trips/medical-conditions`              | Yes  | List conditions for `?orgId=` (org members / applicants for that org’s trips, Org Admin, System Admin) |
| `GET`    | `/trips/medical-conditions/:id`          | Yes  | Get one (org-scoped access)                                                                            |
| `POST`   | `/trips/medical-conditions`              | Yes  | Create (`orgId`, `name`) — Org Admin / System Admin                                                    |
| `PUT`    | `/trips/medical-conditions/:id`          | Yes  | Update name — Org Admin / System Admin                                                                 |
| `DELETE` | `/trips/medical-conditions/:id`          | Yes  | Delete + cascade person links — Org Admin / System Admin                                               |
| `GET`    | `/trips/people/:id` (or profile payload) | Yes  | Include selected `medicalConditionIds` (and/or nested `{ id, name }`) for response consumers           |
| `PUT`    | `/trips/people/:id` (profile update)     | Yes  | Accept `medicalConditionIds: number[]` when saving profile; enforce FR-005 / FR-009 / FR-010           |

**Payload notes:**

- Create/update condition: `{ orgId, name }` — `name` trimmed, 1–50 chars.
- Person update: `{ …existing person fields, takesMedication, medicalConditionIds?: number[] }`. When `takesMedication` is false, server clears links for the org context implied by the request (e.g. `orgId` query/body for which catalog is being edited) or clears only ids belonging to the submitted org’s catalog. Prefer explicit `orgId` on the person update when saving condition selections so multi-org people are unambiguous.

**Status codes:** `400` validation / wrong org ids; `403` unauthorized; `404` missing; `409` duplicate name in org.

---

## Screen Requirements

| Route / UI                                                            | Change                                                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `/medical-conditions` (new)                                           | Org Admin (and System Admin) list + add/edit/delete dialogs; name field max 50; org picker for System Admin like worker roles |
| App nav                                                               | Link **Medical conditions** near Worker roles / other org admin tools (same audience)                                         |
| `PersonProfileFields` (Add/Edit person, application profile sections) | When Take medication? = Yes, show multi-select of conditions for current org context; hide when No                            |
| View person profile                                                   | Show selected condition names when medication is Yes                                                                          |
| Trip application / browse apply flows                                 | Same profile fields; org context = trip’s organization                                                                        |

**UX notes:**

- Control label e.g. **Medical conditions** (multi-select of names).
- Empty catalog message when Yes and list is empty.
- Client-side max length 50 on admin name field.

---

## Data Model Requirements

### `medicalCondition` (new)

| Column                | Type              | Notes                                     |
| --------------------- | ----------------- | ----------------------------------------- |
| id                    | PK                |                                           |
| orgId                 | FK → organization | required                                  |
| name                  | STRING(50)        | required; unique per org case-insensitive |
| createdAt / updatedAt | timestamps        | as other models                           |

### `personMedicalCondition` (new join)

| Column             | Type                             | Notes                                            |
| ------------------ | -------------------------------- | ------------------------------------------------ |
| id                 | PK                               | or composite PK `(personId, medicalConditionId)` |
| personId           | FK → person                      | required                                         |
| medicalConditionId | FK → medicalCondition            | required                                         |
| unique             | `(personId, medicalConditionId)` |                                                  |

Associations: Organization `hasMany` MedicalCondition; Person `belongsToMany` MedicalCondition through PersonMedicalCondition; delete condition cascades join rows.

No change to `takesMedication` column semantics other than gating UI and clearing selections (FR-005).

---

## Acceptance Criteria (Gherkin)

### US-17.1 — Maintain organization medical conditions

#### Scenario: Org Admin creates a medical condition

- **Given** I am Org Admin for organization A
- **When** I create a medical condition named "Diabetes" (≤ 50 characters)
- **Then** it appears in organization A’s medical conditions list
- **And** it does not appear in organization B’s list

#### Scenario: Duplicate condition name in the same org is rejected

- **Given** organization A already has a condition named "Asthma"
- **When** I create another condition named "asthma" for organization A
- **Then** the API rejects the create with a clear error

#### Scenario: Name longer than 50 characters is rejected

- **Given** I am Org Admin for organization A
- **When** I submit a medical condition name with 51 characters
- **Then** the create is rejected

### US-17.2 — Select medical conditions when taking medication

#### Scenario: Condition list appears when Take medication is Yes

- **Given** organization A has medical conditions "Diabetes" and "Asthma"
- **And** I am applying to a trip for organization A (or editing my profile in org A context)
- **When** I set Take medication? to Yes
- **Then** I see a multi-select listing "Diabetes" and "Asthma"

#### Scenario: Condition list is hidden when Take medication is No

- **Given** I am on the person health section
- **When** Take medication? is No
- **Then** the medical conditions multi-select is not shown

#### Scenario: Selected conditions are saved on the person

- **Given** Take medication? is Yes and I select "Diabetes"
- **When** I save my profile
- **Then** my person record retains "Diabetes" as a selected medical condition for that org

### US-17.3 — Reload prior selections on a later application

#### Scenario: Prior selections reload on another trip in the same org

- **Given** I previously saved medical condition "Diabetes" on my person for organization A
- **And** I open an application for a different trip that belongs to organization A
- **When** the health section loads with Take medication? Yes
- **Then** "Diabetes" is already selected

---

## Test Coverage Map

| Story   | Scenario                                                | Test file                                    | Test name                                                 |
| ------- | ------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| US-17.1 | Org Admin creates a medical condition                   | `backend/tests/medical-conditions.test.js`   | `Org Admin creates a medical condition`                   |
| US-17.1 | Duplicate condition name in the same org is rejected    | `backend/tests/medical-conditions.test.js`   | `Duplicate condition name in the same org is rejected`    |
| US-17.1 | Name longer than 50 characters is rejected              | `backend/tests/medical-conditions.test.js`   | `Name longer than 50 characters is rejected`              |
| US-17.2 | Condition list appears when Take medication is Yes      | `frontend/tests/PersonProfileFields.test.js` | `Condition list appears when Take medication is Yes`      |
| US-17.2 | Condition list is hidden when Take medication is No     | `frontend/tests/PersonProfileFields.test.js` | `Condition list is hidden when Take medication is No`     |
| US-17.2 | Selected conditions are saved on the person             | `backend/tests/medical-conditions.test.js`   | `Selected conditions are saved on the person`             |
| US-17.3 | Prior selections reload on another trip in the same org | `backend/tests/medical-conditions.test.js`   | `Prior selections reload on another trip in the same org` |

---

## Agent implementation request

```text
Implement Feature 17 from @features/feature-17-org-medical-conditions.md on branch `feature/17-org-medical-conditions`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
Do not add free-text medication notes, dosages, or cross-org shared catalogs.
Do not store selections only on the application row — they must live on the person (FR-006).
Trip application org context for the list is the trip’s orgId (FR-008).
```

**Reference updates:** `features/reference/api.md`, `data-model.md`, `behavior.md`

---

## Definition of Done

- [x] Org-scoped medical condition CRUD (**FR-001**–**FR-003**, **FR-011**)
- [x] Take medication? Yes shows multi-select; No hides and clears org selections (**FR-004**, **FR-005**)
- [x] Selections saved on person and reload for later same-org applications (**FR-006**, **FR-007**)
- [x] Profile completeness requires ≥1 condition when medication is Yes (**FR-010**)
- [x] Automated tests for every Gherkin scenario
- [x] `npm test` green
- [x] Living reference updated (api / data-model / behavior)

## Out of Scope

- Free-text “list your medications” / dosage / prescribing details
- A single global (cross-org) medical condition catalog
- Storing selections only on `tripPeopleRole` without person persistence
- ICD / clinical coding systems
- Public unauthenticated medical-condition APIs
- Changing the allergies Yes/description behavior (unchanged)
