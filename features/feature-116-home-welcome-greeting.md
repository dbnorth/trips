# Home Welcome Greeting

**Feature ID:** 116
**Branch pattern:** `feature/116-home-welcome-greeting`
**Status:** Implemented
**Created:** 2026-11-04
**Input:** "write a spec to add a welcome greeting to the home page for trip particpatns, use their first name in the  greating."

Home opens straight into trip lists, alerts, or dashboard cards, with nothing that greets the person. This feature adds a welcome heading at the top of Home that uses the signed-in person's first name, for example "Welcome, Maria!".

## Clarifications

### Session 2026-11-04

- Q: Who sees the greeting? → A: Every signed-in user on Home: trip participants, pending users, Trip Leaders, Org Admins, Agents, and System Admins.
- Q: Wording? → A: "Welcome, <first name>!"
- Q: First name blank (for example, a System Admin with no person record)? → A: "Welcome!"
- Q: Where? → A: At the top of Home, above the profile warning, the organization heading, and the Trips card.

**Depends on:**
- [Feature 1 — User Authentication](feature-1-user-authentication.md) (sign-in payload `firstName`)
- [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md) (person first name, profile edits)
- [Feature 85 — Agent Role](feature-85-agent-role.md) (Agent Home)

---

## User Stories

### US-116.1: Be welcomed by name on Home

**As** a signed-in user
**I want** Home to greet me by my first name
**So that** the app feels personal and I know I'm signed in as the right person

**Acceptance:** see Gherkin scenarios under US-116.1.

---

## Requirements

### Functional Requirements

- **FR-001**: Home (`Home.vue`) shows a heading "Welcome, <first name>!" as the first item on the page, above the profile warning, the organization heading, the Trips card, the Trip Leader list, and the dashboard cards. It shows for every signed-in user, whatever their roles.
- **FR-002**: The first name is the signed-in user's `firstName` (from sign-in, kept in the stored user), trimmed. When it is blank, the heading reads "Welcome!".
- **FR-003**: When the person saves a new first name in their profile (from Home or the menu bar), the heading shows the new name without signing out.

---

## Assumptions

- Only the first name is used; no middle or last name.
- The greeting is the same at every visit (no "Welcome back").
- No backend change: the sign-in payload and `GET /auth/me` already return `firstName`, and Home already reloads the stored user after a profile save.

## Edge Cases

- First name with spaces around it → trimmed ("  Maria " → "Welcome, Maria!").
- System Admin without a person record → "Welcome!".
- Switching organization in the menu bar → the greeting doesn't change.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Nothing else on Home changes.

---

## Data Ownership & Isolation

No new data or endpoints. The greeting shows only the signed-in user's own first name.

---

## Key Entities

None.

---

## API Requirements

None.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `Home` | "Welcome, <first name>!" (or "Welcome!") heading at the top of the page for every signed-in user (FR-001 – FR-003) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Maria Lopez is a Trip Participant of "Hope Missions".
- Olivia Chen is an Org Admin of "Hope Missions".

### US-116.1 — Be welcomed by name on Home

#### Scenario: Trip participant is welcomed by first name
* **Given** Maria is signed in
* **When** she opens Home
* **Then** the first heading reads "Welcome, Maria!"
* **And** it is above the Trips card

#### Scenario: Staff are welcomed too
* **Given** Olivia is signed in
* **When** she opens Home
* **Then** the first heading reads "Welcome, Olivia!"
* **And** it is above the "Hope Missions" organization heading

#### Scenario: Blank first name shows a plain welcome
* **Given** a System Admin with no first name is signed in
* **When** they open Home
* **Then** the first heading reads "Welcome!"

#### Scenario: Greeting follows a profile name change
* **Given** Maria is on Home
* **When** she changes her first name to "Mari" in her profile and saves
* **Then** the heading reads "Welcome, Mari!"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-116.1 | Trip participant is welcomed by first name | `frontend/tests/HomeWelcomeGreeting.test.js` | `Trip participant is welcomed by first name` |
| US-116.1 | Staff are welcomed too | `frontend/tests/HomeWelcomeGreeting.test.js` | `Staff are welcomed too` |
| US-116.1 | Blank first name shows a plain welcome | `frontend/tests/HomeWelcomeGreeting.test.js` | `Blank first name shows a plain welcome` |
| US-116.1 | Greeting follows a profile name change | `frontend/tests/HomeWelcomeGreeting.test.js` | `Greeting follows a profile name change` |

---

## Agent implementation request

```text
Implement Feature 116 from @features/feature-116-home-welcome-greeting.md on branch `feature/116-home-welcome-greeting`.

Frontend only: in Home.vue add a heading at the top of the page, "Welcome, <first name>!" from the stored user's trimmed firstName, or "Welcome!" when blank, for every signed-in user. It must update when the stored user changes (user-updated / profile save).
Tests per the Test Coverage Map. Update features/reference/behavior.md with a Home greeting row.
```

---

## Definition of Done

*   [x] Greeting heading per **FR-001** and **FR-002**
*   [x] Greeting updates after a profile save per **FR-003**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Time-of-day greetings ("Good morning") or "Welcome back".
- Greetings in emails or on other pages.
- Showing the organization name or role in the greeting.
