# Feature: System Admin Only Password and Login Email Changes

**Feature ID:** 71
**Branch pattern:** `feature/71-system-admin-only-account-changes`
**Status:** Implemented
**Created:** 2026-10-20
**Input:** "Create a feature spec for removing password setting for users except by system admin." Today **Edit person** (`PUT /trips/people/:id`) lets an Org Admin set the password of anyone with any role in their organization, with no check on who owns that account. A security check confirmed that an Org Admin of one organization could set the password of a System Admin, and of another organization's Org Admin, who had a role in their organization, then sign in as them. The same handler lets an Org Admin change the login email of a linked account; with Feature 70's **Forgot password?**, that is a second way to take an account over. The human chose: password setting on Edit person and login email changes become System Admin only; a System Admin setting a password signs that person out everywhere; **Add person** stays as it is.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md), [Feature 68 — Add Person Existing Email](feature-68-add-person-existing-email.md), [Feature 70 — Email Password Reset and Failed Sign-In Limits](feature-70-password-reset-and-login-limits.md)

---

## User Stories

### US-71.1: Only System Admins set other people's passwords
**As a** user  
**I want** only a System Admin to be able to set my password for me  
**So that** an Org Admin of an organization I belong to cannot sign in as me

**Priority:** P1  
**Independent test:** An Org Admin sends a new password for a member → `403` and the member's old password still works; a System Admin does the same → `200`, the new password works, and the member's old session gets `401`  
**Acceptance scenarios:** see ### US-71.1

### US-71.2: Only System Admins change login emails
**As a** user  
**I want** only a System Admin, or me, to change the email I sign in with  
**So that** no one can redirect my account's reset emails to themselves

**Priority:** P1  
**Independent test:** An Org Admin changes a member's email → `403` and the member still signs in with the old email; the member changes their own email → `200`  
**Acceptance scenarios:** see ### US-71.2

---

## Requirements

### Functional Requirements

**Passwords (Edit person)**

- **FR-001**: `PUT /trips/people/:id` with a non-empty `password` for **another** person MUST respond `403` "Forbidden. System admin required to set a password." unless the requester is a System Admin. This applies whoever the person is (member, Org Admin, System Admin).
- **FR-002**: A password for **yourself** keeps today's answer: `400` "Use the current password fields to change your own password." (use **Change password**).
- **FR-003**: When a System Admin sets another person's password (min 8 characters, as today), the system MUST also end **all** of that person's sessions (same as a Feature 70 reset), so they must sign in again with the new password.

**Login emails (Edit person)**

- **FR-004**: `PUT /trips/people/:id` that changes the email of a person **linked to a login account** (`userId` set) MUST respond `403` "Forbidden. System admin required to change a login email." unless the requester is a System Admin or that person. "Changes" means the trimmed, lower-cased email differs from the current one; sending the same email (any case or surrounding spaces) is not a change.
- **FR-005**: An Org Admin MAY still change the email of a person **without** a login account (no `userId`), as today.

**Both**

- **FR-006**: A request refused by FR-001 or FR-004 MUST change nothing: no profile field, email, admin status, password, medical condition, or language is saved. The checks run before any change is made.

**Edit person dialog**

- **FR-007**: The **New password** field (shown today when editing someone else who has a login account) MUST be shown only to System Admins. Org Admins no longer see it.
- **FR-008**: For an Org Admin editing someone else who has a login account, the **Email** field MUST be read-only with the hint "Only a System Admin can change a login email.". System Admins and the person themselves keep the editable field and its hint "Updates the linked user login email".

---

## Assumptions

- **Add person** is unchanged: an Org Admin may still type a password for a **new** account. Feature 68 refuses any email that already belongs to a user or person, so that password can only ever belong to a brand-new account, and the person can choose their own with **Forgot password?** (Feature 70).
- People who forget their password use **Forgot password?** (Feature 70) instead of asking an Org Admin.
- A System Admin setting a password does not clear a Feature 70 sign-in lock; the lock still ends on its own or with a reset.
- `POST /trips/users` (System Admin only) and **Change password** for yourself are unchanged.

## Edge Cases

- Org Admin saves a member's profile with the email unchanged, or only its case changed (" Ana@Example.ORG " for "ana@example.org") → saved (`200`); not treated as a change.
- Org Admin sends a password **and** a first-name change for a member → `403`; the first name is not saved either.
- Org Admin edits their own profile → may change their own email (FR-004 allows the person themselves); their own password still goes through **Change password**.
- System Admin sets the password of another System Admin → allowed; that System Admin is signed out everywhere.
- A person with no login account → no **New password** field (as today); Org Admins may change their email.

## Success Criteria

- **SC-001**: No one except a System Admin can set another user's password or change another user's login email.
- **SC-002**: When a System Admin sets a password, every existing session for that account stops working.
- **SC-003**: Automated tests for every scenario below pass, and existing person and auth tests still pass.

---

## Data Ownership & Isolation

An Org Admin keeps managing profile details of people in their organization, but a person's sign-in credentials (password and login email) can only be changed by that person or a System Admin.

---

## Key Entities

- **Person** — update rules for `email` when linked to a user
- **User** — `password` and `email` changed only by the person themselves or a System Admin
- **Session** — all of a user's sessions are ended when a System Admin sets their password

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `PUT` | `/trips/people/:id` | auth | `password` for someone else → `403` unless System Admin (FR-001); a System Admin setting it ends that user's sessions (FR-003); changing a linked person's email → `403` unless System Admin or self (FR-004); refused requests change nothing (FR-006) |

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| **Edit person** dialog | `EditPersonDialog.vue` | **New password** only for System Admins (FR-007); **Email** read-only for Org Admins editing someone with a login account, hint "Only a System Admin can change a login email." (FR-008) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-71.1 — Only System Admins set other people's passwords

#### Scenario: Org Admin cannot set a member's password
* **Given** an Org Admin of "Org A" and a member "ana@example.org" of "Org A" with password "old-password1"
* **When** the Org Admin updates Ana with password "taken-over-1"
* **Then** the response is `403` "Forbidden. System admin required to set a password."
* **And** Ana signs in with "old-password1" and not with "taken-over-1"

#### Scenario: Org Admin cannot set a System Admin's password
* **Given** an Org Admin of "Org A" and a System Admin who has a role in "Org A"
* **When** the Org Admin updates the System Admin with password "taken-over-1"
* **Then** the response is `403` "Forbidden. System admin required to set a password."
* **And** signing in as the System Admin with "taken-over-1" fails

#### Scenario: A refused password change saves nothing
* **Given** an Org Admin of "Org A" and a member Ana of "Org A"
* **When** the Org Admin updates Ana with first name "Changed" and password "taken-over-1"
* **Then** the response is `403`
* **And** Ana's first name is unchanged

#### Scenario: System Admin sets a password and the person is signed out
* **Given** a System Admin and a member "ana@example.org" who is signed in
* **When** the System Admin updates Ana with password "new-password1"
* **Then** the response is `200`
* **And** Ana's old session token gets `401`
* **And** Ana signs in with "new-password1"

#### Scenario: Edit person shows New password only to System Admins
* **Given** a person with a login account who is not me
* **When** an Org Admin opens Edit person for them
* **Then** there is no **New password** field
* **And** when a System Admin opens Edit person for them, the **New password** field is shown

### US-71.2 — Only System Admins change login emails

#### Scenario: Org Admin cannot change a member's login email
* **Given** an Org Admin of "Org A" and a member "ana@example.org" of "Org A" with a login account
* **When** the Org Admin updates Ana's email to "attacker@example.org"
* **Then** the response is `403` "Forbidden. System admin required to change a login email."
* **And** Ana still signs in with "ana@example.org"

#### Scenario: Org Admin saves a member with the same email
* **Given** an Org Admin of "Org A" and a member "ana@example.org" of "Org A" with a login account
* **When** the Org Admin updates Ana with email " Ana@Example.ORG " and phone number "5551234567"
* **Then** the response is `200` and the phone number is saved

#### Scenario: Org Admin can change the email of a person without a login account
* **Given** an Org Admin of "Org A" and a person of "Org A" with no login account
* **When** the Org Admin updates their email to "new@example.org"
* **Then** the response is `200` and the email is "new@example.org"

#### Scenario: A user can change their own login email
* **Given** a signed-in user "ana@example.org"
* **When** she updates her own email to "ana.new@example.org"
* **Then** the response is `200`
* **And** she signs in with "ana.new@example.org"

#### Scenario: System Admin can change a login email
* **Given** a System Admin and a member "ana@example.org" with a login account
* **When** the System Admin updates Ana's email to "ana.new@example.org"
* **Then** the response is `200`
* **And** Ana signs in with "ana.new@example.org"

#### Scenario: Edit person locks the login email for Org Admins
* **Given** a person with a login account who is not me
* **When** an Org Admin opens Edit person for them
* **Then** the **Email** field is read-only with the hint "Only a System Admin can change a login email."
* **And** when a System Admin opens Edit person for them, the **Email** field can be edited

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-71.1 | Org Admin cannot set a member's password | `backend/tests/admin-account-changes.test.js` | `Org Admin cannot set a member's password` |
| US-71.1 | Org Admin cannot set a System Admin's password | `backend/tests/admin-account-changes.test.js` | `Org Admin cannot set a System Admin's password` |
| US-71.1 | A refused password change saves nothing | `backend/tests/admin-account-changes.test.js` | `A refused password change saves nothing` |
| US-71.1 | System Admin sets a password and the person is signed out | `backend/tests/admin-account-changes.test.js` | `System Admin sets a password and the person is signed out` |
| US-71.1 | Edit person shows New password only to System Admins | `frontend/tests/EditPersonDialog.test.js` | `Edit person shows New password only to System Admins` |
| US-71.2 | Org Admin cannot change a member's login email | `backend/tests/admin-account-changes.test.js` | `Org Admin cannot change a member's login email` |
| US-71.2 | Org Admin saves a member with the same email | `backend/tests/admin-account-changes.test.js` | `Org Admin saves a member with the same email` |
| US-71.2 | Org Admin can change the email of a person without a login account | `backend/tests/admin-account-changes.test.js` | `Org Admin can change the email of a person without a login account` |
| US-71.2 | A user can change their own login email | `backend/tests/admin-account-changes.test.js` | `A user can change their own login email` |
| US-71.2 | System Admin can change a login email | `backend/tests/admin-account-changes.test.js` | `System Admin can change a login email` |
| US-71.2 | Edit person locks the login email for Org Admins | `frontend/tests/EditPersonDialog.test.js` | `Edit person locks the login email for Org Admins` |

---

## Agent implementation request

```text
Implement Feature 71 from @features/feature-71-system-admin-only-account-changes.md on branch `feature/71-system-admin-only-account-changes`.

Follow layer order in @features/framework.md.
Backend: person.controller.js `update` — before any change is saved, refuse a password for someone else unless System Admin (FR-001, FR-002) and a changed email on a person with a userId unless System Admin or self (FR-004, FR-005, FR-006). When a System Admin sets a password, end all of that user's sessions (FR-003; same approach as Feature 70's reset).
Frontend: EditPersonDialog.vue — New password field only for System Admins (FR-007); Email read-only with the FR-008 hint for Org Admins editing someone else with a login account.
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: api.md (PUT /trips/people/:id row), behavior.md (Feature 71 row).
Do not change Add person, register, change-password, or POST /trips/users.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md`, `behavior.md`

---

## Definition of Done

*   [x] Password setting per **FR-001**..**FR-003**
*   [x] Login email changes per **FR-004**..**FR-006**
*   [x] Edit person dialog per **FR-007**, **FR-008**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- **Add person**'s Password field (Org Admins keep it for new accounts; see Assumptions)
- Ending other sessions when a user changes their own password, and a new token per sign-in (audit issue 2)
- An admin "send reset link" button, or an admin unlock
- Limits on which organization roles an Org Admin can see or edit beyond the password and login email
