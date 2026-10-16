# Feature: Email Template Tokens and Preview

**Feature ID:** 40
**Branch pattern:** `feature/40-email-template-tokens`
**Status:** Ready
**Created:** 2026-10-15
**Input:** System admins maintain a token catalog. The template form lists those tokens as a reference and inserts them into the subject or email body. Tokens use `{{TOKEN_CODE}}`. A Preview picks a trip and participant and shows the email with values filled in from the organization, trip, participant, and primary trip leader. Trip leader assignments gain a primary flag.
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 21 — Copy Trip](feature-21-copy-trip.md), [Feature 28 — View Trip Status](feature-28-view-trip-status.md), [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md)

---

## User Stories

### US-40.1: Maintain the token catalog

**As a** System Admin
**I want** to add and edit tokens with a code, a description, and a value source
**So that** template authors have a known list of symbols that fill in real data

**Priority:** P1
**Independent test:** System Admin saves token `TRIP_LEADER_EMAIL` with value source **Primary trip leader email** and sees it again on reload. A user who is not a System Admin cannot create one.
**Acceptance scenarios:** see ### US-40.1

### US-40.2: Insert tokens while editing a template

**As an** Org Admin
**I want** to pick a token from a list and insert it into the subject or email body
**So that** I use the right symbol without typing it from memory

**Priority:** P1
**Independent test:** On the template form, choosing a token from the email body token list places `{{TOKEN_CODE}}` in **Email body**.
**Acceptance scenarios:** see ### US-40.2

### US-40.3: Mark the primary trip leader

**As an** Org Admin
**I want** to mark one trip leader as primary
**So that** trip leader tokens fill in one known person

**Priority:** P1
**Independent test:** Saving a trip with two leaders and one chosen as **Primary trip leader** stores that choice and shows it when the trip reloads.
**Acceptance scenarios:** see ### US-40.3

### US-40.4: Preview a template with values filled in

**As an** Org Admin
**I want** to choose a trip and a participant and see the subject and email body with tokens replaced
**So that** I can check the email before it is ever sent

**Priority:** P1
**Independent test:** Preview for a trip and participant shows the trip name, participant first name, and primary trip leader email where the matching tokens were written.
**Acceptance scenarios:** see ### US-40.4

---

## Requirements

### Functional Requirements

- **FR-001**: `emailToken` MUST store `tokenCode` (required, unique, trimmed, capital letters, digits, and underscores only, starting with a letter), `description` (required, trimmed), and `valueSource` (required, one value from the **Value sources** table below). `tokenCode` is stored without braces.
- **FR-002**: Only a System Admin MAY create, update, or delete a token. Create and edit MUST show fields labeled **Token code**, **Description**, and **Value source**. **Value source** is a dropdown of the **Value sources** table by label. Route `/email-tokens`.
- **FR-003**: Token list MUST return `id`, `tokenCode`, `description`, and `valueSource`. System Admin, Org Admin, and Trip Leader MAY read the list so the template form can show it.
- **FR-004**: A token is written in a template as `{{TOKEN_CODE}}`: two opening braces, the exact token code, two closing braces, with no spaces.
- **FR-005**: The template form (`EmailTemplateFormDialog`) MUST show an **Insert token** dropdown beside **Subject** and another beside **Email body**. Each lists catalog tokens as `{{TOKEN_CODE}} — description`. Choosing one inserts `{{TOKEN_CODE}}` into that field at the cursor, or at the end when the field has no cursor position. The dropdown then clears so another token can be chosen.
- **FR-006**: A trip leader assignment (`tripPeopleRole` with the Trip Leader role) MUST store `isPrimaryLeader`. Each trip has at most one primary leader.
- **FR-007**: Add trip and Edit trip MUST show **Primary trip leader** directly after **Trip leaders** when at least one leader is selected. Its choices are the selected leaders. With one leader, that leader is primary. With more than one, the first selected leader is chosen until the user picks another. Removing the primary leader from **Trip leaders** moves primary to the first remaining leader.
- **FR-008**: Trip create, update, and copy MUST accept `primaryLeaderPeopleId`. It MUST be one of `leaderPeopleIds`, or `400`. When leaders are sent without `primaryLeaderPeopleId`, the first leader becomes primary. Trip get MUST return `primaryLeaderPeopleId`. Copy trip MUST copy the primary leader.
- **FR-009**: `ensureSchema` MUST create `emailToken` and add `tripPeopleRole.isPrimaryLeader` (default false) when missing. On trips that have leaders and no primary, it MUST mark the earliest assigned leader as primary.
- **FR-010**: One server function MUST build token values from an organization, an optional trip, and an optional participant, using the **Value sources** table and its formatting rules. The same function MUST replace each `{{TOKEN_CODE}}` that matches a catalog token with its value. Preview uses it, and later sending can reuse it.
- **FR-011**: A token whose source has no value (for example no deposit, no primary leader, or no participant chosen) MUST become empty text. Text in braces that does not match a catalog token MUST stay as written.
- **FR-012**: The template form MUST show a **Preview** button. It opens a **Preview** dialog with **Trip** (trips in the template’s organization, preset to the template’s trip when it has one) and **Participant** (people with a participant application on that trip, any status). Participant is optional. After a trip is chosen, the dialog MUST show **From email**, **Subject**, and **Email body** with tokens replaced, using the values currently on the form, including unsaved edits.
- **FR-013**: `POST /trips/email-templates/preview` MUST accept `orgId`, `tripId`, optional `personId`, `subject`, and `emailBody`, and return `{ subject, emailBody }` with tokens replaced. The trip MUST belong to that organization (`400`). The person MUST have a participant application on that trip (`400`). The caller MUST be an Org Admin for that organization, a System Admin, or an approved Trip Leader for that trip (`403`).
- **FR-014**: This feature MUST NOT send email or change stored template text. Tokens are replaced only in the preview response.

### Value sources

| `valueSource` | Label | Value |
|---------------|-------|-------|
| `organization.name` | Organization name | Organization name |
| `organization.email` | Organization email | Organization email |
| `organization.phone` | Organization phone | Organization phone |
| `organization.websiteUrl` | Organization website | Organization website URL |
| `trip.name` | Trip name | Trip name |
| `trip.location` | Trip location | Trip location |
| `trip.startDate` | Trip start date | Trip start date |
| `trip.endDate` | Trip end date | Trip end date |
| `trip.participantCost` | Trip participant cost | Trip participant cost |
| `trip.deposit` | Trip deposit | Trip deposit (Feature 38) |
| `participant.firstName` | Participant first name | Participant first name |
| `participant.lastName` | Participant last name | Participant last name |
| `participant.preferredName` | Participant preferred name | Stored preferred name, else first name + last name (Feature 33) |
| `participant.email` | Participant email | Participant email |
| `participant.amountRaised` | Participant amount raised | Donations to that participant on that trip (Feature 28) |
| `participant.amountOwed` | Participant amount owed | Cost minus amount raised, never below zero (Feature 28) |
| `primaryLeader.firstName` | Primary trip leader first name | Primary leader first name |
| `primaryLeader.lastName` | Primary trip leader last name | Primary leader last name |
| `primaryLeader.preferredName` | Primary trip leader preferred name | Same rule as participant preferred name |
| `primaryLeader.email` | Primary trip leader email | Primary leader email |
| `primaryLeader.phone` | Primary trip leader phone | Primary leader phone |

**Formatting:** Dates show as month name, day, and year (for example `October 1, 2026`). Money shows as US dollars with two decimals (for example `$1,000.00`). Phone shows `+` country code, a space, then the number, or the number alone when there is no country code. Empty or missing values become empty text.

---

## Assumptions

- “Admins” for the token catalog means System Admin.
- The value source list is fixed in the application. A System Admin chooses one per token; this feature adds no free-form formulas or table paths.
- The catalog starts empty. System Admin adds the tokens the organizations need.
- More than one token MAY use the same value source.
- Token codes are matched exactly and are case-sensitive. `{{trip_name}}` does not match `TRIP_NAME`.
- Feature 10 `content` and the global master templates do not gain an insert list or preview.
- The participant’s cost for amount owed follows Feature 28: the application participant cost when set, else the trip participant cost.

## Edge Cases

- Blank token code, description, or value source → `400`.
- Token code with lowercase letters, spaces, or braces → `400`.
- Second token with the same token code → `400`.
- Value source outside the fixed list → `400`.
- Deleting a token leaves templates unchanged. That symbol then stays as written in preview.
- Trip with no leaders → **Primary trip leader** is hidden and primary leader tokens are empty.
- `primaryLeaderPeopleId` not among `leaderPeopleIds` → `400`.
- Preview trip from another organization → `400`.
- Preview participant who has no application on that trip → `400`.
- Preview with no participant chosen → participant tokens are empty.
- Trip with no participants → **Participant** list is empty and preview still works for organization, trip, and leader tokens.
- Unclosed braces such as `{{TRIP_NAME` stay as written.

## Success Criteria

- **SC-001**: System Admin can save a token and see its token code, description, and value source again.
- **SC-002**: Org Admin can insert a token into the subject or email body from the list.
- **SC-003**: Org Admin can mark a primary trip leader and see it after reload.
- **SC-004**: Preview shows the organization, trip, participant, and primary trip leader values in place of their tokens.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- The token catalog is system data. Only System Admin writes it. Org Admin and Trip Leader may read it.
- Preview reads only the organization, trip, and participant the caller may already manage for templates.
- The primary leader flag is part of the trip leader assignment and follows the existing trip edit permissions.

---

## Key Entities

- **EmailToken** — token code, description, value source
- **TripPeopleRole (Trip Leader)** — gains a primary leader flag
- **Token values** — built per preview from organization, trip, participant, and primary leader

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/email-tokens` | System Admin, Org Admin, or Trip Leader | List tokens |
| `GET` | `/trips/email-tokens/value-sources` | System Admin | List value sources (`valueSource`, `label`) for the token form |
| `GET` | `/trips/email-tokens/:id` | System Admin | Get one |
| `POST` | `/trips/email-tokens` | System Admin | Create `{ tokenCode, description, valueSource }` |
| `PUT` | `/trips/email-tokens/:id` | System Admin | Update |
| `DELETE` | `/trips/email-tokens/:id` | System Admin | Delete |
| `POST` | `/trips/email-templates/preview` | Org Admin, System Admin, or Trip Leader for the trip | Return `{ subject, emailBody }` with tokens replaced |
| `POST` | `/trips/trips` | as today | Accepts `primaryLeaderPeopleId` |
| `PUT` | `/trips/trips/:id` | as today | Accepts `primaryLeaderPeopleId` |
| `POST` | `/trips/trips/:id/copy` | as today | Copies the primary leader |
| `GET` | `/trips/trips/:id` | as today | Returns `primaryLeaderPeopleId` |

**Payload notes:** Preview body is `{ orgId, tripId, personId?, subject, emailBody }`. Strings are not trimmed in the preview response, so spacing around tokens stays as written.

**Status codes:** `400` for invalid token fields, duplicate token code, unknown value source, invalid primary leader, or a trip or participant that does not match. `403` when the caller may not write tokens or may not preview for that organization or trip.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `/email-tokens` | System Admin list (Token code, Description, Value source) and add/edit dialog. Menu **Email tokens** for System Admin |
| `EmailTemplateFormDialog` | **Insert token** dropdown beside **Subject** and beside **Email body**. **Preview** button |
| Preview dialog | **Trip**, optional **Participant**, then **From email**, **Subject**, and **Email body** with tokens replaced. **Close** button |
| `AddTripDialog`, `EditTripDialog` | **Primary trip leader** after **Trip leaders** when at least one leader is selected |

---

## Data Model Requirements

### `emailToken`

| Column | Type | Rules |
|--------|------|--------|
| id | INTEGER PK | autoIncrement |
| tokenCode | STRING(100) | required, unique, `^[A-Z][A-Z0-9_]*$` |
| description | STRING | required |
| valueSource | STRING(100) | required, one of the **Value sources** |

### `tripPeopleRole` column added by this feature

| Column | Type | Rules |
|--------|------|--------|
| isPrimaryLeader | BOOLEAN | required, default `false`. At most one `true` per trip, on a Trip Leader row |

---

## Acceptance Criteria (Gherkin)

### US-40.1 — Maintain the token catalog

#### Scenario: Token form shows token code, description, and value source
* **Given** I am a system admin adding a token
* **Then** I see Token code, Description, and a Value source dropdown

#### Scenario: Token is saved
* **Given** I am a system admin
* **When** I save a token with token code TRIP_LEADER_EMAIL, description Primary trip leader email, and value source primaryLeader.email
* **Then** loading that token shows those token code, description, and value source values

#### Scenario: A non-admin cannot create a token
* **Given** I am not a system admin
* **When** I create a token
* **Then** the request is forbidden

#### Scenario: Token code must use capital letters, digits, and underscores
* **Given** I am a system admin
* **When** I save a token with token code trip leader
* **Then** the request is rejected

### US-40.2 — Insert tokens while editing a template

#### Scenario: Template form inserts a token into the email body
* **Given** I am an org admin editing a template
* **And** token TRIP_NAME exists
* **When** I choose TRIP_NAME from the Email body token list
* **Then** Email body contains {{TRIP_NAME}}

### US-40.3 — Mark the primary trip leader

#### Scenario: Trip form shows Primary trip leader
* **Given** I am an org admin adding a trip
* **When** I select two trip leaders
* **Then** I see Primary trip leader listing those two leaders

#### Scenario: Primary trip leader is saved
* **Given** I am an org admin
* **When** I save a trip with two leaders and the second leader as primary
* **Then** loading that trip shows the second leader as primary

### US-40.4 — Preview a template with values filled in

#### Scenario: Preview shows trip and participant choices
* **Given** I am an org admin editing a template
* **When** I open Preview
* **Then** I see Trip and Participant choices

#### Scenario: Preview replaces tokens with trip, participant, and leader values
* **Given** tokens TRIP_NAME, PARTICIPANT_FIRST_NAME, and TRIP_LEADER_EMAIL exist
* **And** a trip has a primary leader and a participant
* **When** I preview subject "{{TRIP_NAME}} update" and email body "Hi {{PARTICIPANT_FIRST_NAME}}, contact {{TRIP_LEADER_EMAIL}}" for that trip and participant
* **Then** the subject shows the trip name followed by update
* **And** the email body shows the participant first name and the primary leader email

#### Scenario: Unknown token stays as written
* **Given** no token named NOT_A_TOKEN exists
* **When** I preview email body "Hello {{NOT_A_TOKEN}}"
* **Then** the email body is "Hello {{NOT_A_TOKEN}}"

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-40.1 | Token form shows token code, description, and value source | `frontend/tests/` EmailTokenFormDialog | `Token form shows token code, description, and value source` |
| US-40.1 | Token is saved | `backend/tests/` email tokens | `Token is saved` |
| US-40.1 | A non-admin cannot create a token | `backend/tests/` email tokens | `A non-admin cannot create a token` |
| US-40.1 | Token code must use capital letters, digits, and underscores | `backend/tests/` email tokens | `Token code must use capital letters, digits, and underscores` |
| US-40.2 | Template form inserts a token into the email body | `frontend/tests/` EmailTemplateFormDialog | `Template form inserts a token into the email body` |
| US-40.3 | Trip form shows Primary trip leader | `frontend/tests/` AddTripDialog | `Trip form shows Primary trip leader` |
| US-40.3 | Primary trip leader is saved | `backend/tests/` trips | `Primary trip leader is saved` |
| US-40.4 | Preview shows trip and participant choices | `frontend/tests/` EmailTemplatePreviewDialog | `Preview shows trip and participant choices` |
| US-40.4 | Preview replaces tokens with trip, participant, and leader values | `backend/tests/` email templates | `Preview replaces tokens with trip, participant, and leader values` |
| US-40.4 | Unknown token stays as written | `backend/tests/` email templates | `Unknown token stays as written` |

---

## Agent implementation request

```text
Implement Feature 40 from @features/feature-40-email-template-tokens.md on branch `feature/40-email-template-tokens`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`emailToken`, `tripPeopleRole.isPrimaryLeader`), `features/reference/api.md` (email token routes, template preview, trip `primaryLeaderPeopleId`), `features/reference/behavior.md` (token syntax, value sources, primary trip leader, preview)

---

## Definition of Done

*   [x] `emailToken` catalog, `tripPeopleRole.isPrimaryLeader`, and schema ensure (**FR-001**, **FR-006**, **FR-009**)
*   [x] System Admin token screen and API (**FR-002**, **FR-003**)
*   [x] Insert token lists on the template form (**FR-004**, **FR-005**)
*   [x] Primary trip leader on Add trip, Edit trip, API, and copy (**FR-007**, **FR-008**)
*   [x] Token value builder and substitution (**FR-010**, **FR-011**)
*   [x] Preview dialog and API (**FR-012**, **FR-013**)
*   [x] No email sent and stored template text unchanged (**FR-014**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/40-email-template-tokens`; PR → `dev`

---

## Out of Scope

- Sending or scheduling email
- Conditions, loops, or formulas inside tokens
- Tokens in **From email** or **Attachment path**
- Organization-specific tokens or Org Admin editing of the catalog
- Value sources beyond the **Value sources** table
- Insert list or preview on Feature 10 global master templates
- Showing the primary leader on trip detail, browse, or public pages
