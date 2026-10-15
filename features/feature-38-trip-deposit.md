# Feature: Trip Deposit

**Feature ID:** 38
**Branch pattern:** `feature/38-trip-deposit`
**Status:** Ready
**Created:** 2026-10-15
**Input:** Add a deposit field to a trip. On the trip forms, put it just after Participant cost.
**Depends on:** [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 21 — Copy Trip](feature-21-copy-trip.md)

---

## User Stories

### US-38.1: Record a trip deposit

**As an** Org Admin or System Admin
**I want** a Deposit field just after Participant cost when I add or edit a trip
**So that** the trip can store the deposit amount

**Priority:** P1
**Independent test:** Add trip shows **Deposit** immediately after **Participant cost**. Saving 500 reloads as 500. A blank deposit saves as null.
**Acceptance scenarios:** see ### US-38.1

---

## Requirements

### Functional Requirements

- **FR-001**: `trip` MUST store `deposit` (`DECIMAL(10,2)`, nullable). Existing trips stay null.
- **FR-002**: Add trip (`AddTripDialog`) and Edit trip (`EditTripDialog`) MUST show a money field labeled **Deposit** immediately after **Participant cost**, before **Require Passport**.
- **FR-003**: Create, update, get, and list MUST accept and return `deposit`. A blank value stores null. The amount uses the same money parsing as **Participant cost** (non-negative dollars and cents).
- **FR-004**: `ensureSchema` MUST add nullable `deposit` when the column is missing.
- **FR-005**: Copy trip MUST copy `deposit` onto the new trip along with the other catalog fields. The source trip stays unchanged.
- **FR-006**: Deposit MUST NOT change participant cost, amount owed, fundraising, or application screens.

---

## Assumptions

- Deposit is optional, the same way Participant cost is optional.
- One deposit amount belongs to the trip, not to each participant.
- The field uses the existing money input.

## Edge Cases

- Blank Deposit → stored null.
- Edit a trip that has no deposit → the field is empty until an amount is entered.
- Copy a trip with a deposit → the new trip has the same deposit.
- Copy a trip with a null deposit → the new trip deposit is null.

## Success Criteria

- **SC-001**: Add trip and Edit trip show **Deposit** immediately after **Participant cost**.
- **SC-002**: A saved deposit reloads on the trip. A blank deposit is null.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- `deposit` is trip catalog data. Create, update, and copy follow the same org gate as other trip fields.

---

## Key Entities

- **Trip** — gains optional `deposit`

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` | `/trips/trips` | Org Admin / System Admin | Accept optional `deposit` |
| `PUT` | `/trips/trips/:id` | as today | Accept optional `deposit` |
| `GET` | `/trips/trips` and `/trips/trips/:id` | as today | Return `deposit` |
| `POST` | `/trips/trips/:id/copy` | as today | Copy `deposit` |

**Payload notes:** `deposit` is a number or null. Blank or omitted on create stores null. On update, a present blank value stores null. Omitting the key on update leaves the stored value unchanged, the same as other trip fields handled by the existing payload picker.

**Status codes:** Unchanged from trip create and update. An unreadable amount is stored as null, matching Participant cost.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `AddTripDialog` | **Deposit** money field immediately after **Participant cost** |
| `EditTripDialog` | Same field, loaded from the trip |

---

## Data Model Requirements

| Column | Type | Rules |
|--------|------|--------|
| `trip.deposit` | DECIMAL(10,2) | nullable; existing rows null |

`ensureSchema` adds the column when it is missing.

---

## Acceptance Criteria (Gherkin)

### US-38.1 — Record a trip deposit

#### Scenario: Trip form shows Deposit after Participant cost
* **Given** I open Add trip
* **Then** I see Participant cost
* **And** Deposit is the next field

#### Scenario: Deposit is saved on the trip
* **Given** I am an org admin or system admin
* **When** I save a trip with Deposit 500
* **Then** loading that trip shows deposit 500

#### Scenario: A blank deposit is saved as empty
* **Given** I am an org admin or system admin
* **When** I save a trip with Deposit left blank
* **Then** loading that trip shows deposit null

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-38.1 | Trip form shows Deposit after Participant cost | `frontend/tests/` AddTripDialog | `Trip form shows Deposit after Participant cost` |
| US-38.1 | Deposit is saved on the trip | `backend/tests/` trips | `Deposit is saved on the trip` |
| US-38.1 | A blank deposit is saved as empty | `backend/tests/` trips | `A blank deposit is saved as empty` |

---

## Agent implementation request

```text
Implement Feature 38 from @features/feature-38-trip-deposit.md on branch `feature/38-trip-deposit`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`trip.deposit`), `features/reference/api.md` (trip create/update/copy), `features/reference/behavior.md` (Deposit follows Participant cost on Add trip and Edit trip)

---

## Definition of Done

*   [x] `deposit` on trip + schema ensure (**FR-001**, **FR-004**)
*   [x] Add trip and Edit trip show **Deposit** after **Participant cost** (**FR-002**)
*   [x] API save, load, and copy include `deposit` (**FR-003**, **FR-005**)
*   [x] Participant cost and fundraising math unchanged (**FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green
*   [ ] On `feature/38-trip-deposit`; PR → `dev`

---

## Out of Scope

- A deposit on each participant
- Showing deposit on browse, apply, public trip, or trip detail pages
- Using deposit in amount owed or amount raised
- Requiring a deposit before a trip can be saved
