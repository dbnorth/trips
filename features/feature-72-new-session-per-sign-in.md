# Feature: New Session for Every Sign-In

**Feature ID:** 72
**Branch pattern:** `feature/72-new-session-per-sign-in`
**Status:** Implemented
**Created:** 2026-10-20
**Input:** "Create a feature that creates a new session record and new token on each sign in." Today `POST /trips/login` looks for a live session for the account's email and, if one exists, returns **that same token** (`createOrReuseSession` in `auth.controller.js`). Every device and every sign-in shares one token: signing in again never gives a fresh token, so a stolen token stays the one the real user is handed, and signing out on one device signs out all of them (security audit issue 2, first part).
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 70 — Email Password Reset and Failed Sign-In Limits](feature-70-password-reset-and-login-limits.md)

---

## User Stories

### US-72.1: Each sign-in gets its own session
**As a** user  
**I want** every sign-in to give me a new session token of my own  
**So that** no one else's copy of an earlier token is ever handed back to me, and each device is signed in separately

**Priority:** P1  
**Independent test:** Sign in twice with the same account → two different tokens and two session rows; signing out with one token leaves the other working  
**Acceptance scenarios:** see ### US-72.1

---

## Requirements

### Functional Requirements

- **FR-001**: Every successful `POST /trips/login` MUST create a **new** session row (token, email, `userId`, expiry now + 4 hours) and return its token. An existing session MUST never be reused or returned, whether or not it is still valid.
- **FR-002**: Every session token MUST be unique, including two sign-ins of the same account within the same second (the JWT gets a random unique id, `jti`, so the value always differs).
- **FR-003**: Signing in MUST NOT end the account's other live sessions; each stays valid until it expires (4 hours), is signed out, or is ended by a password reset (Feature 70) or a System Admin password change (Feature 71).
- **FR-004**: `POST /trips/logout` MUST end only the session whose token is sent; the account's other sessions keep working.
- **FR-005**: At each successful sign-in, the system MUST delete that user's sessions that are expired or already ended (empty token), so old rows do not pile up. Live sessions are kept (FR-003).
- **FR-006**: **Create account** (`POST /trips/register`) MUST use the same session creation as FR-001 and FR-002.
- **FR-007**: The "Login" entry written to the email log at each sign-in stays as today.

---

## Assumptions

- Several live sessions per account are expected (phone, laptop, a second browser). There is no cap on how many; each lasts at most 4 hours.
- The browser already stores whatever token the sign-in response returns, so no frontend change is needed.
- The `sessions` table already allows several rows per user; no schema change.

## Edge Cases

- Sign in on device A, then on device B → A and B have different tokens; both work.
- Sign out on A → A's token gets `401`; B still works.
- Sign in twice in the same second → two different tokens.
- A user with an expired session and a signed-out session signs in → both old rows are deleted; the new session is the only row (plus any other live ones).
- Wrong password → no session is created and nothing is deleted.

## Success Criteria

- **SC-001**: No sign-in response ever contains a token that was issued before that sign-in.
- **SC-002**: Signing out on one device never signs out another.
- **SC-003**: Automated tests for every scenario below pass, and existing auth tests still pass.

---

## Data Ownership & Isolation

Each session belongs to one user and one sign-in. Tokens are returned only in the response to the sign-in (or account creation) that created them.

---

## Key Entities

- **Session** — one row per sign-in; expired and ended rows of the user are deleted at sign-in

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `POST` | `/trips/login` | none | Always creates a new session and returns its new, unique token (FR-001, FR-002); deletes the user's expired or ended sessions (FR-005); other live sessions stay (FR-003) |
| `POST` | `/trips/register` | none | New account's session created the same way (FR-006) |
| `POST` | `/trips/logout` | none | Ends only the session for the token sent (FR-004) |

---

## Screen Requirements

None.

---

## Data Model Requirements

None (`sessions` already allows several rows per user).

---

## Acceptance Criteria (Gherkin)

### US-72.1 — Each sign-in gets its own session

#### Scenario: Signing in twice gives two different tokens
* **Given** a user "ana@example.org"
* **When** she signs in twice
* **Then** the two tokens are different
* **And** she has two session rows
* **And** both tokens work for `GET /trips/me`

#### Scenario: Signing in never returns an earlier token
* **Given** "ana@example.org" signed in and got token T1, which is still valid
* **When** she signs in again
* **Then** the response token is not T1

#### Scenario: Two sign-ins in the same second get different tokens
* **Given** the clock is fixed at one moment
* **When** "ana@example.org" signs in twice
* **Then** the two tokens are different

#### Scenario: Signing out on one device keeps the other signed in
* **Given** "ana@example.org" signed in on two devices with tokens T1 and T2
* **When** she signs out with T1
* **Then** T1 gets `401` on `GET /trips/me`
* **And** T2 still gets `200`

#### Scenario: Sign-in removes expired and ended sessions
* **Given** "ana@example.org" has one expired session, one signed-out session, and one live session
* **When** she signs in
* **Then** the expired and signed-out sessions are deleted
* **And** the live session and the new session remain

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-72.1 | Signing in twice gives two different tokens | `backend/tests/session-per-sign-in.test.js` | `Signing in twice gives two different tokens` |
| US-72.1 | Signing in never returns an earlier token | `backend/tests/session-per-sign-in.test.js` | `Signing in never returns an earlier token` |
| US-72.1 | Two sign-ins in the same second get different tokens | `backend/tests/session-per-sign-in.test.js` | `Two sign-ins in the same second get different tokens` |
| US-72.1 | Signing out on one device keeps the other signed in | `backend/tests/session-per-sign-in.test.js` | `Signing out on one device keeps the other signed in` |
| US-72.1 | Sign-in removes expired and ended sessions | `backend/tests/session-per-sign-in.test.js` | `Sign-in removes expired and ended sessions` |

---

## Agent implementation request

```text
Implement Feature 72 from @features/feature-72-new-session-per-sign-in.md on branch `feature/72-new-session-per-sign-in`.

Follow layer order in @features/framework.md.
Backend: auth.controller.js — replace createOrReuseSession with a function that always creates a new session (FR-001, FR-006), adds a random jti to the JWT (FR-002), and first deletes the user's expired or empty-token sessions (FR-005); keep the Login email log entry (FR-007). Logout ends only the sent token's session (FR-004).
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: api.md (login, register, logout rows), behavior.md (Feature 72 row), ADR-0002 Layer 1 (Session).
Do not change change-password, session lifetime, or the frontend.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md`, `behavior.md`, ADR-0002

---

## Definition of Done

*   [x] New session and unique token per sign-in per **FR-001**, **FR-002**, **FR-006**
*   [x] Other sessions and sign-out per **FR-003**, **FR-004**
*   [x] Old session cleanup per **FR-005**; email log per **FR-007**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md`, `behavior.md`, and ADR-0002 updated
*   [ ] PR to `dev`

## Out of Scope

- Ending other sessions when a signed-in user changes their own password (`POST /trips/change-password`) — the rest of audit issue 2
- A cap on sessions per account, a "sign out everywhere" button, or a list of signed-in devices
- Storing session tokens hashed, or changing the 4-hour lifetime
