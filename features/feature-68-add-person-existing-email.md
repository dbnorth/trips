# Feature: Add Person and Create Account Refuse an Email That Already Exists

**Feature ID:** 68
**Branch pattern:** `feature/68-add-person-existing-email`
**Status:** Implemented
**Created:** 2026-10-20
**Input:** Security defect — **Add person** (`POST /trips/people`) with the email of an existing user overwrote that user's password (when a password was entered), merged the entered profile fields into their record, and added them to the admin's organization. Any Org Admin could take over any account, including a System Admin. Fix: "not being able to save a new person if the email already exists." Follow-up: "this should include a user adding a new account if the email used is already used" — **Create account** (`POST /trips/register`) must likewise never change an existing account.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 14 — Add Person Role Select](feature-14-add-person-role-select-fix.md)

---

## User Stories

### US-68.1: Adding a person never changes an existing account
**As a** user with an account  
**I want** no one to be able to change my password or profile by "adding" a person with my email  
**So that** my account cannot be taken over

**Priority:** P1  
**Independent test:** As an Org Admin, `POST /trips/people` with another user's email and a password → `409`; that user still signs in with their own password  
**Acceptance scenarios:** see ### US-68.1

### US-68.2: Admin is told the email is already in use
**As an** Org Admin or System Admin adding a person  
**I want** a clear message when the email already belongs to someone  
**So that** I know the person was not saved

**Priority:** P1  
**Independent test:** Add person dialog with an existing email shows "A person with this email already exists." and stays open  
**Acceptance scenarios:** see ### US-68.2

### US-68.3: Creating an account never changes an existing account
**As a** user with an account  
**I want** no one to be able to create an account with my email  
**So that** my password, profile, and organizations cannot be changed by signing up

**Priority:** P1  
**Independent test:** `POST /trips/register` with an existing user's email and a different password → `409`; that user still signs in with their own password  
**Acceptance scenarios:** see ### US-68.3

---

## Requirements

### Functional Requirements

- **FR-001**: `POST /trips/people` MUST respond `409` with "A person with this email already exists." when the entered email (trimmed, lower-cased) matches an existing **user** email or an existing **person** email.
- **FR-002**: On that `409` the system MUST NOT create or change anything: no user or person row created, no password changed, no profile fields changed, no `isAdmin` change, no organization role added, no languages saved.
- **FR-003**: FR-001 and FR-002 apply to every caller, including System Admins.
- **FR-004**: Adding a person with a new email (or no email) MUST work as today: the person (and a login user when an email is given) is created, the organization role is assigned, and the response is `{ person, message: "Person created." }`.
- **FR-005**: The response no longer includes `existingPerson` or `orgRoleCreated`, and the "Existing person updated…" messages are removed.
- **FR-006**: The Add person dialog MUST show the `409` message, keep the dialog open with the entered values, and not report the person as saved. The dialog's error messages (this one and the form checks) show in a fixed area directly above the **Cancel** / **Add** buttons, outside the scrolling form, so they are visible without scrolling.
- **FR-007**: The Add person **Email** hint MUST read "A user login account is created for this email." (the sentence about updating an existing person is removed).
- **FR-008**: `POST /trips/register` (Create account and the apply flow's create account) MUST respond `409` "An account with this email already exists. Please log in instead." when the entered email (trimmed, lower-cased) matches an existing user or person email, and MUST NOT create or change anything: no user or person created, no password changed, no profile fields changed, no organization role added (including from `orgIds` or `subdomain`), no session created.
- **FR-009**: The Create account and apply-flow create account screens keep showing their existing "account already exists" message on that `409`.

---

## Assumptions

- The existing-email check runs before any write, using the same lookups as registration (`findUserByEmail`, `findPersonByEmail`).
- Registration (`POST /trips/register`) already refuses an existing email before any write (Feature 1); FR-008 makes that a stated security rule and adds tests proving nothing on the existing account changes. No registration code change is expected.
- `applyRegistrationPassword` in `userPerson.js` (which could set a password on an existing account) is not called by any route and must not be wired into registration.
- To give an existing person a role in another organization, staff use the organization role assignment (`POST /trips/org-people-roles`), not Add person. Its rules are unchanged here.
- The concurrent case (two adds with the same new email at the same moment) is not handled beyond today's database constraints.

## Edge Cases

- Email differs only by case or surrounding spaces (` Taken@Example.com `) → treated as the same email → `409`.
- Email belongs to a person with no login account → `409`.
- No email entered → person created without a login account, as today.
- Existing email and no password entered → still `409`; nothing changes.

## Success Criteria

- **SC-001**: No request to `POST /trips/people` or `POST /trips/register` can change an existing user's password, email, admin status, profile, or organization roles.
- **SC-002**: Automated tests for every scenario below pass, and existing people tests still pass.

---

## Data Ownership & Isolation

Tightened: Add person can no longer write to a person or user it did not create. Other rules from Feature 2 are unchanged.

---

## Key Entities

- **User** — `email`, `password`, `isAdmin` (unchanged; never written for an existing email)
- **Person** — `email` (unchanged; never written for an existing email)

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/trips/people` | Existing user or person email → `409` "A person with this email already exists." with no changes; success response is `{ person, message }` |
| `POST` | `/trips/register` | Unchanged behavior, now a stated rule: existing user or person email → `409` "An account with this email already exists. Please log in instead." with no changes and no session (FR-008) |

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| People → **Add person** | `AddPersonDialog.vue` | New Email hint (FR-007); error messages (including the `409`) shown in a fixed area above the buttons, and the dialog stays open (FR-006) |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-68.1 — Adding a person never changes an existing account

#### Scenario: Add person with an existing user's email is refused and changes nothing
* **Given** a user "taken@example.com" who signs in with password "original-pass" and has last name "Original"
* **And** I am an Org Admin of a different organization
* **When** I add a person with email "taken@example.com", last name "Changed", password "attacker-pass", and a role in my organization
* **Then** the response is `409` "A person with this email already exists."
* **And** "taken@example.com" still signs in with "original-pass" and not with "attacker-pass"
* **And** their last name is still "Original"
* **And** they have no role in my organization

#### Scenario: Add person with the email of a person without a login is refused
* **Given** a person with email "nologin@example.com" and no login account
* **When** I add a person with email "nologin@example.com"
* **Then** the response is `409` "A person with this email already exists."
* **And** there is still exactly one person with that email and no login account for it

#### Scenario: Email match ignores case and spaces
* **Given** a user "taken@example.com"
* **When** I add a person with email " Taken@Example.COM "
* **Then** the response is `409` "A person with this email already exists."

#### Scenario: System Admin adding an existing email is refused
* **Given** a user "taken@example.com" who signs in with password "original-pass"
* **And** I am a System Admin
* **When** I add a person with email "taken@example.com", password "attacker-pass", and System administrator checked
* **Then** the response is `409` "A person with this email already exists."
* **And** "taken@example.com" still signs in with "original-pass" and is not a System Admin

#### Scenario: Add person with a new email still creates the person
* **Given** I am an Org Admin
* **When** I add a person with email "brand.new@example.com" and a role in my organization
* **Then** the response is `200` with message "Person created."
* **And** the person exists with that role in my organization

### US-68.2 — Admin is told the email is already in use

#### Scenario: Add person dialog shows the existing-email message and stays open
* **Given** the Add person dialog is open
* **When** I save and the server responds `409` "A person with this email already exists."
* **Then** the dialog shows "A person with this email already exists." directly above the buttons, outside the scrolling form
* **And** the dialog stays open and does not report the person as saved

### US-68.3 — Creating an account never changes an existing account

#### Scenario: Creating an account with an email already used is refused and changes nothing
* **Given** a user "taken@example.com" who signs in with password "original-pass", has last name "Original", and belongs to "Other Org"
* **When** someone creates an account with email "taken@example.com", last name "Changed", password "attacker-pass", and organization "New Org"
* **Then** the response is `409` "An account with this email already exists. Please log in instead."
* **And** "taken@example.com" still signs in with "original-pass" and not with "attacker-pass"
* **And** their last name is still "Original"
* **And** they have no role in "New Org"

#### Scenario: Creating an account with the email of a person without a login is refused
* **Given** a person with email "nologin@example.com" and no login account
* **When** someone creates an account with email "nologin@example.com"
* **Then** the response is `409` "An account with this email already exists. Please log in instead."
* **And** there is still exactly one person with that email and no login account for it

#### Scenario: Create account email match ignores case and spaces
* **Given** a user "taken@example.com" who signs in with password "original-pass"
* **When** someone creates an account with email " Taken@Example.COM " and password "attacker-pass"
* **Then** the response is `409` "An account with this email already exists. Please log in instead."
* **And** "taken@example.com" still signs in with "original-pass"

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-68.1 | Add person with an existing user's email is refused and changes nothing | `backend/tests/add-person-existing-email.test.js` | `Add person with an existing user's email is refused and changes nothing` |
| US-68.1 | Add person with the email of a person without a login is refused | `backend/tests/add-person-existing-email.test.js` | `Add person with the email of a person without a login is refused` |
| US-68.1 | Email match ignores case and spaces | `backend/tests/add-person-existing-email.test.js` | `Email match ignores case and spaces` |
| US-68.1 | System Admin adding an existing email is refused | `backend/tests/add-person-existing-email.test.js` | `System Admin adding an existing email is refused` |
| US-68.1 | Add person with a new email still creates the person | `backend/tests/add-person-existing-email.test.js` | `Add person with a new email still creates the person` |
| US-68.2 | Add person dialog shows the existing-email message and stays open | `frontend/tests/AddPersonDialog.test.js` | `Add person dialog shows the existing-email message and stays open` |
| US-68.3 | Creating an account with an email already used is refused and changes nothing | `backend/tests/add-person-existing-email.test.js` | `Creating an account with an email already used is refused and changes nothing` |
| US-68.3 | Creating an account with the email of a person without a login is refused | `backend/tests/add-person-existing-email.test.js` | `Creating an account with the email of a person without a login is refused` |
| US-68.3 | Create account email match ignores case and spaces | `backend/tests/add-person-existing-email.test.js` | `Create account email match ignores case and spaces` |

---

## Agent implementation request

```text
Implement Feature 68 from @features/feature-68-add-person-existing-email.md on branch `feature/68-add-person-existing-email`.

Follow layer order in @features/framework.md.
Backend: person.controller.js create — refuse an existing email before any write (FR-001..FR-005).
Frontend: AddPersonDialog.vue Email hint and 409 handling (FR-006, FR-007).
Registration: prove FR-008 with tests; change auth.controller.js register only if a test shows an existing account can change.
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: update the POST /trips/people and POST /trips/register rows in features/reference/api.md and add the Feature 68 row in features/reference/behavior.md.
Do not change Edit person or organization role assignment.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md` (`POST /trips/people` and `POST /trips/register` `409`), `behavior.md` (Add person and Create account refuse an existing email)

---

## Definition of Done

*   [x] Add person existing-email check per **FR-001**..**FR-005**
*   [x] Add person dialog per **FR-006**, **FR-007**
*   [x] Create account existing-email rule per **FR-008**, **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Org Admins changing the password or email of people in their organization through **Edit person** (`PUT /trips/people/:id`) — separate security fix
- Org Admins adding any existing person to their organization through `POST /trips/org-people-roles` — separate security fix
- A "find existing person and add to my organization" flow
- Login rate limiting and session revocation
