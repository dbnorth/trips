# Feature: User Authentication & Sessions

**Feature ID:** 1
**Branch pattern:** `feature/1-user-authentication`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec of imported Mission Trips auth — email/password accounts, JWT+Session, registration with optional org membership, apply-funnel sign-in
**Related:** `backend/app/controllers/auth.controller.js`, `frontend/src/views/Login.vue`

---

## User Stories

### US-1.1: Register an account
**As a** new applicant or staff candidate  
**I want to** create an account with name, email, password, and optional organizations  
**So that** I can sign in and join trips as a Trip Participant

**Priority:** P1  
**Independent test:** `POST /trips/register` with valid body returns token payload and creates User + Person  
**Acceptance scenarios:** see ### US-1.1 under Acceptance Criteria

### US-1.2: Sign in with email and password
**As a** registered user  
**I want to** sign in with email and password  
**So that** I can access role-scoped Trips screens

**Priority:** P1  
**Independent test:** `POST /trips/login` returns token, personId, orgRoles, tripRoles  
**Acceptance scenarios:** see ### US-1.2 under Acceptance Criteria

### US-1.3: Persist session in the browser
**As a** signed-in user  
**I want** my session stored in `localStorage`  
**So that** refreshes keep me authenticated until logout or expiry

**Priority:** P1  
**Independent test:** After login, `localStorage.user` holds token; axios sends Bearer header  
**Acceptance scenarios:** see ### US-1.3 under Acceptance Criteria

### US-1.4: Sign out and change password
**As a** signed-in user  
**I want to** sign out and change my password  
**So that** I control access on shared devices

**Priority:** P2  
**Independent test:** Logout clears Session token; change-password requires current password  
**Acceptance scenarios:** see ### US-1.4 under Acceptance Criteria

### US-1.5: Guard protected routes and APIs
**As the** application  
**I want** unauthenticated users blocked from private routes and APIs  
**So that** only valid sessions reach Trips data

**Priority:** P1  
**Independent test:** Protected UI → login; API without token → `401`  
**Acceptance scenarios:** see ### US-1.5 under Acceptance Criteria

### US-1.6: Apply-funnel sign-in and create account
**As a** public applicant  
**I want to** sign in or create an account from the apply flow  
**So that** I land on the authenticated trip browse page for that trip

**Priority:** P1  
**Independent test:** `/apply/sign-in` and `/apply/create-account` with `tripId`/`orgId` query → `tripBrowse`  
**Acceptance scenarios:** see ### US-1.6 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: Users MUST authenticate with **email** + **password** (email normalized trim/lowercase).
- **FR-002**: Registration MUST require `firstName`, `lastName`, `email`, and `password` (minimum **8** characters) and MUST create a linked **Person**.
- **FR-003**: Registration MAY accept `orgIds[]` and MUST assign **Trip Participant** org roles for those organizations.
- **FR-004**: Passwords MUST be hashed with bcrypt before persistence; password hashes MUST never be returned by the API (`User` defaultScope excludes password).
- **FR-005**: Sessions MUST use **JWT + Session table**; client sends `Authorization: Bearer <token>`.
- **FR-006**: Session lifetime MUST be **4 hours** (`auth.config.js` `sessionHours`).
- **FR-007**: Login MUST reuse a non-expired Session for the same email when one exists.
- **FR-008**: Auth success payload MUST include `email`, `userId`, `token`, `isAdmin`, `personId`, `firstName`, `lastName`, `orgRoles[]`, `tripRoles[]` (approved trip roles only).
- **FR-009**: `POST /trips/change-password` MUST require authentication, verify current password, and enforce min length 8.
- **FR-010**: `POST /trips/reset-password` MUST be disabled when `NODE_ENV === "production"`.
- **FR-011**: `GET /trips/me` MUST refresh the auth payload for the current session.
- **FR-012**: `GET /trips/register/organizations` MUST list `{id,name}` for registration without authentication.
- **FR-013**: Axios MUST attach Bearer token and, when set, `X-Acting-Organization-Id` from the stored user context.
- **FR-014**: On unauthorized API responses, the frontend MUST clear `user` and redirect to login.

---

## Assumptions

- Catalog roles (**Org Admin**, **Trip Leader**, **Trip Participant**, **Pending User**) are seeded (`npm run seed`).
- System admin is `user.isAdmin === true` (not an org role name).
- Feature specs 2+ depend on this identity and session model.

## Edge Cases

- Duplicate email on register → `409`.
- Invalid login → `401` (same message whether email or password wrong).
- Missing/expired token → `401`; frontend clears session.
- Password shorter than 8 characters → rejected.

## Success Criteria

- **SC-001**: Every Gherkin scenario maps to at least one automated test (backfill for imported code).
- **SC-002**: Register → login → `/home` → logout works in one manual pass.
- **SC-003**: Apply create-account with orgId lands on browse for the target trip.

---

## Data Ownership & Isolation

- Each User owns at most one Person (`userId`).
- Session tokens are user-scoped; no API in this feature returns another user's password or session list.
- Org/trip role arrays on the payload drive Features 2–9 access control.

---

## Key Entities

- **User**: login account (`email`, hashed `password`, `isAdmin`, `passwordSetByUser`)
- **Session**: server-side token + `expirationDate` + `userId`
- **Person**: profile record created at registration (Feature 2 expands fields)
- **EmailLog**: login audit row written on successful login

---

## API Requirements

API mount: `/trips`.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/register` | No | Create user + person; optional orgIds |
| `GET` | `/trips/register/organizations` | No | Org picker for registration |
| `POST` | `/trips/login` | No | Authenticate; return session payload |
| `POST` | `/trips/logout` | No* | Clear session token (`token` in body) |
| `GET` | `/trips/me` | Yes | Refresh auth payload |
| `POST` | `/trips/change-password` | Yes | Change password |
| `POST` | `/trips/reset-password` | No | Dev-only password reset |

\*Logout identifies the session by body token, not Bearer middleware.

**Success payload (login/register/me)** — flat JSON:
```json
{
  "email": "jane@example.com",
  "userId": 1,
  "token": "<jwt>",
  "isAdmin": false,
  "personId": 2,
  "firstName": "Jane",
  "lastName": "Doe",
  "orgRoles": [{ "orgId": 1, "roleName": "Trip Participant" }],
  "tripRoles": []
}
```

---

## Screen Requirements

| Route | Name | Access |
|-------|------|--------|
| `/` / `/login` | `login` | Public; redirect home if already signed in |
| `/apply/sign-in` | `applyAuth` | Public apply funnel |
| `/apply/create-account` | `applyCreateAccount` | Public apply funnel |
| `/home` | `home` | Requires `user` |

- Login view supports sign-in and register tabs/sections (`Login.vue`).
- MenuBar Profile can open change-password via Edit Person (Feature 2).

---

## Data Model Requirements

### `user`
| Column | Notes |
|--------|-------|
| id | PK |
| email | unique |
| password | hashed; excluded from defaultScope |
| isAdmin | boolean system admin |
| passwordSetByUser | boolean |

### `sessions`
| Column | Notes |
|--------|-------|
| id | PK |
| token | JWT string |
| email | denormalized |
| expirationDate | session end |
| userId | FK → user |

---

## Acceptance Criteria (Gherkin)

### US-1.1 — Register an account

#### Scenario: User registers with valid information
* **Given** I am on the login/register screen
* **When** I submit first name, last name, email, and a password of at least 8 characters
* **Then** the API returns `200`/`201` with a token payload
* **And** a User and Person exist for that email
* **And** `localStorage` key `user` is set

#### Scenario: User registers with optional organizations
* **Given** organizations exist
* **When** I register with `orgIds` containing those organizations
* **Then** OrgPeopleRole rows exist with role **Trip Participant**

#### Scenario: User registers with duplicate email
* **Given** a user with that email already exists
* **When** I submit registration
* **Then** the API returns `409`
* **And** no second User is created

#### Scenario: User registers with password too short
* **Given** I am on the registration form
* **When** I submit a password shorter than 8 characters
* **Then** the request is rejected (client and/or server)

### US-1.2 — Sign in with email and password

#### Scenario: User signs in with valid credentials
* **Given** a registered user
* **When** I submit the correct email and password
* **Then** the API returns `200` with token and roles
* **And** I am redirected to home (or redirect query)

#### Scenario: User signs in with invalid password
* **Given** a registered user
* **When** I submit an incorrect password
* **Then** the API returns `401`
* **And** I remain on the login screen

### US-1.3 — Persist session in the browser

#### Scenario: Authenticated API request includes Bearer token
* **Given** I am signed in
* **When** the frontend calls a protected API
* **Then** the request includes `Authorization: Bearer <token>`

#### Scenario: Expired token clears session
* **Given** my token is expired or revoked
* **When** an API returns unauthorized
* **Then** `localStorage` key `user` is cleared
* **And** I am redirected to login

### US-1.4 — Sign out and change password

#### Scenario: User signs out
* **Given** I am signed in
* **When** I sign out
* **Then** the server session token is cleared
* **And** `localStorage` key `user` is removed
* **And** I am on the login screen

#### Scenario: User changes password
* **Given** I am signed in
* **When** I submit current and new password (min 8)
* **Then** subsequent login works with the new password only

### US-1.5 — Guard protected routes and APIs

#### Scenario: Unauthenticated user opens home
* **Given** I have no session
* **When** I navigate to `/home`
* **Then** I am redirected to login

#### Scenario: API without token is rejected
* **Given** no Authorization header
* **When** I call a protected endpoint
* **Then** the API returns `401`

### US-1.6 — Apply-funnel sign-in and create account

#### Scenario: Applicant creates account from apply flow
* **Given** I open `/apply/create-account` with `orgId` and `tripId` query params
* **When** I register successfully
* **Then** I am routed to `tripBrowse` for that `tripId`

#### Scenario: Already signed-in user hits apply sign-in
* **Given** I have a valid session
* **When** I open `/apply/sign-in` with `tripId`
* **Then** I am redirected to `tripBrowse` for that trip

---

## Test Coverage Map

Each scenario above must map to at least one automated test (backfill).

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-1.1 | User registers with valid information | `backend/tests/auth.test.js`, `frontend/tests/Login.test.js` | `User registers with valid information` |
| US-1.1 | User registers with optional organizations | `backend/tests/auth.test.js` | `User registers with optional organizations` |
| US-1.1 | User registers with duplicate email | `backend/tests/auth.test.js` | `User registers with duplicate email` |
| US-1.1 | User registers with password too short | `backend/tests/auth.test.js`, `frontend/tests/ApplyCreateAccount.test.js` | `User registers with password too short` |
| US-1.2 | User signs in with valid credentials | `backend/tests/auth.test.js`, `frontend/tests/Login.test.js` | `User signs in with valid credentials` |
| US-1.2 | User signs in with invalid password | `backend/tests/auth.test.js`, `frontend/tests/Login.test.js` | `User signs in with invalid password` |
| US-1.3 | Authenticated API request includes Bearer token | `backend/tests/auth.test.js`, `frontend/tests/services.auth.test.js` | `Authenticated API request includes Bearer token` |
| US-1.3 | Expired token clears session | `backend/tests/auth.test.js`, `frontend/tests/services.auth.test.js` | `Expired token clears session` |
| US-1.4 | User signs out | `backend/tests/auth.test.js`, `frontend/tests/Login.test.js` | `User signs out` |
| US-1.4 | User changes password | `backend/tests/auth.test.js` | `User changes password` |
| US-1.5 | Unauthenticated user opens home | `frontend/tests/router.test.js` | `Unauthenticated user opens home` |
| US-1.5 | API without token is rejected | `backend/tests/auth.test.js` | `API without token is rejected` |
| US-1.6 | Applicant creates account from apply flow | `backend/tests/auth.test.js`, `frontend/tests/ApplyCreateAccount.test.js` | `Applicant creates account from apply flow` |
| US-1.6 | Already signed-in user hits apply sign-in | `frontend/tests/router.test.js` | `Already signed-in user hits apply sign-in` |

---

## Agent implementation request

Copy when asking Cursor to implement or evolve this feature (`@` this file):

```text
Implement Feature 1 from @features/feature-1-user-authentication.md on branch `feature/1-user-authentication`.

Follow layer order in @features/framework.md (models → routes → backend tests → frontend → frontend tests).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
If API routes, payloads, schema, or product rules changed per this spec, update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR to match shipped code.
Complete Definition of Done and the merge checklist in @features/framework.md.
Do not implement behavior not in this spec.
```

**Reference updates for this feature:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Backend and frontend implemented per this spec (**FR-00N** satisfied) — reverse-spec of imported code
*   [x] **Success Criteria (SC-00N)** met with automated tests mapped below
*   [x] All mapped tests pass (`npm test`)
*   [x] Test Coverage Map complete with passing `it` blocks
*   [x] Schema/API/behavior reflected in living reference when baselines are filled

## Out of Scope

- Org CRUD, people management, trip applications — Features 2–7
- Public donate pages — Feature 9
- System user admin CRUD (`/users`) — Feature 2
- Apply-funnel post-auth destination is the trip **application** page (`editTripApplication`), not `tripBrowse` — [Feature 13](feature-13-public-apply-to-application-page.md)
- Host subdomain auto-assigning organization on register (hide org picker) — [Feature 15](feature-15-organization-subdomain-registration.md)
