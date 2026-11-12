# Feature: Organization and Trip account number

**Feature ID:** 132
**Branch pattern:** `feature/132-organization-trip-account-number`
**Status:** Implemented
**Created:** 2026-11-12
**Input:** "add a spec to add account numer to Organization and Trip"

An organization and a trip have no place to store an account number. This feature adds an optional **Account number** to each, edited where that record is edited and shown with the trip's details.

## Clarifications

### Session 2026-11-12

- Q: One number shared by the organization and its trips, or one on each? → A: Each has its own. A trip does not inherit the organization's number.
- Q: Required? → A: No. Blank is allowed and is stored as empty.
- Q: What may it contain? → A: Any text, up to 50 characters, with spaces at the ends removed. Longer text is refused with "Account number must be 50 characters or less." It does not have to be unique.
- Q: Where does it show? → A: **Add organization** / **Edit organization** and the **Organizations** list; **Add trip** / **Edit trip**, the trip page's **Trip details**, and **Copy trip** (the new trip keeps the copied number). Not on the Trips table, public pages, emails, or the Trip Master import.

**Depends on:**
- [Feature 3 — Organizations](feature-3-organizations.md) (organization form and list)
- [Feature 5 — Trips](feature-5-trips.md) (trip form and trip page)
- [Feature 21 — Copy Trip](feature-21-copy-trip.md) (copy keeps trip details)

---

## User Stories

### US-132.1: Record an organization's account number

**As** an Org Admin or System Admin
**I want** to save an account number on an organization
**So that** the organization's account is on its record

**Priority:** P1
**Independent test:** Save **Account number** on **Edit organization** and see it on **Organizations**
**Acceptance scenarios:** see ### US-132.1

### US-132.2: Record a trip's account number

**As** a person who can edit a trip
**I want** to save an account number on a trip
**So that** the trip's account is on the trip and on **Trip details**

**Priority:** P1
**Independent test:** Save **Account number** on **Edit trip** and see it under **Trip details**
**Acceptance scenarios:** see ### US-132.2

---

## Requirements

### Functional Requirements

- **FR-001**: `organization` gains optional `accountNumber` (string, up to 50 characters). `ensureSchema` adds the column, empty for organizations already saved. Create and update accept it. The value is trimmed; blank saves as empty. Longer than 50 characters → `400` "Account number must be 50 characters or less." Organization responses include it.
- **FR-002**: **Add organization** and **Edit organization** show optional **Account number** after **Name**. **Organizations** adds an **Account number** column after **Name**. A blank number shows nothing in that column.
- **FR-003**: `trip` gains optional `accountNumber` with the same rules as **FR-001**. Trip create, update, and read include it. The same too-long message is used.
- **FR-004**: **Add trip** and **Edit trip** show optional **Account number** after **Name**. The trip page's **Trip details** shows **Account number:** with the saved number, or nothing when it is blank. The Trips table does not gain a column.
- **FR-005**: **Copy trip** copies **Account number** onto the new trip with the other trip details.
- **FR-006**: The public trip pages, donation pages, email tokens, and the Trip Master import do not show or set **Account number**.

## Assumptions

- The same people who can already create or edit an organization or a trip can set its account number.
- Existing organizations and trips start with no account number.

## Edge Cases

- Spaces around the number are removed before it is saved.
- A number of only spaces is saved as empty.
- Two organizations, or two trips, may use the same number.

## Success Criteria

- **SC-001**: Each Gherkin scenario has an automated test before the feature is merged.

## Key Entities

- **Organization**: gains an optional account number.
- **Trip**: gains its own optional account number, separate from its organization's.

## API Requirements

| Method | Path | Request / response |
|--------|------|--------------------|
| `POST` / `PUT` | `/trips/organizations` and `/trips/organizations/:id` | Optional `accountNumber`. Trimmed; blank → empty. Longer than 50 → `400` "Account number must be 50 characters or less." |
| `GET` | `/trips/organizations` and `/trips/organizations/:id` | Includes `accountNumber`. |
| `POST` / `PUT` | `/trips/trips` and `/trips/trips/:id` | Same `accountNumber` rules. |
| `GET` | `/trips/trips` and `/trips/trips/:id` | Includes `accountNumber`. |
| `POST` | copy trip | The new trip's `accountNumber` is the source trip's. |

## Screen Requirements

**Organizations:** column **Account number** after **Name**.

**Add organization** / **Edit organization:** **Account number** after **Name**.

**Add trip** / **Edit trip:** **Account number** after **Name**.

**Trip page** **Trip details:** **Account number:** when one is saved.

## Data Model Requirements

| Table | Column | Rules |
|-------|--------|--------|
| `organization` | `accountNumber` | STRING(50), optional. `ensureSchema` adds it. |
| `trip` | `accountNumber` | STRING(50), optional. `ensureSchema` adds it. |

## Acceptance Criteria (Gherkin)

### US-132.1 — Record an organization's account number

#### Scenario: An organization saves an account number
* **Given** an Org Admin of Hope Mission
* **When** they set **Account number** to "  4500  " and save
* **Then** the organization stores "4500"
* **And** the **Organizations** list shows 4500 in **Account number**

#### Scenario: An organization account number may be blank
* **When** they clear **Account number** and save
* **Then** the organization has no account number
* **And** that column on **Organizations** is blank

#### Scenario: An organization account number is at most 50 characters
* **When** they save an account number longer than 50 characters
* **Then** it is refused with "Account number must be 50 characters or less."

### US-132.2 — Record a trip's account number

#### Scenario: A trip saves an account number
* **Given** a trip editor for Summer Outreach
* **When** they set **Account number** to "7712" and save
* **Then** the trip stores "7712"
* **And** **Trip details** shows **Account number:** 7712

#### Scenario: Copy trip keeps the account number
* **Given** Summer Outreach has account number 7712
* **When** they copy the trip
* **Then** the new trip's account number is 7712

#### Scenario: A trip account number is at most 50 characters
* **When** they save an account number longer than 50 characters
* **Then** it is refused with "Account number must be 50 characters or less."

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-132.1 | An organization saves an account number | `backend/tests/organizations.test.js` | `An organization saves an account number` |
| US-132.1 | An organization saves an account number | `frontend/tests/Organizations.test.js` | `An organization saves an account number` |
| US-132.1 | An organization account number may be blank | `backend/tests/organizations.test.js` | `An organization account number may be blank` |
| US-132.1 | An organization account number is at most 50 characters | `backend/tests/organizations.test.js` | `An organization account number is at most 50 characters` |
| US-132.2 | A trip saves an account number | `backend/tests/trips.test.js` | `A trip saves an account number` |
| US-132.2 | A trip saves an account number | `frontend/tests/Trips.test.js` | `A trip saves an account number` |
| US-132.2 | Copy trip keeps the account number | `backend/tests/trips.test.js` | `Copy trip keeps the account number` |
| US-132.2 | A trip account number is at most 50 characters | `backend/tests/trips.test.js` | `A trip account number is at most 50 characters` |

Test file names follow the files that already cover organizations and trips. If a listed frontend file does not exist, add the scenario to the frontend test that mounts that form.

## Agent implementation request

```text
Implement Feature 132 from @features/feature-132-organization-trip-account-number.md on branch `feature/132-organization-trip-account-number`.

Add optional accountNumber (50 characters) to organization and trip, including ensureSchema. Show Account number on the organization form and Organizations list, and on the trip form, Trip details, and Copy trip. Update features/reference/ and docs/user-guide/ (then npm run user-guide:pdf). Do not show it on public pages, in emails, or in the Trip Master import.
```

## Definition of Done

*   [x] **Account number** on organization create, update, list, and read (**FR-001**, **FR-002**)
*   [x] **Account number** on trip create, update, read, **Trip details**, and **Copy trip** (**FR-003**, **FR-004**, **FR-005**)
*   [x] Public pages, emails, and Trip Master import leave it alone (**FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide and PDFs updated
*   [ ] PR to `dev`

## Out of Scope

- Requiring an account number, or making it unique.
- Showing it on the Trips table, public pages, or donation pages.
- An email token for the account number.
- Setting it from the Trip Master import.
- Using the number in Stripe or anywhere else that charges a card.
