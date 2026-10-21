# Feature: Email Password Reset and Failed Sign-In Limits

**Feature ID:** 70
**Branch pattern:** `feature/70-password-reset-and-login-limits`
**Status:** Implemented
**Created:** 2026-10-20
**Input:** "Add an email password reset for users and also add a limit to failed password attempts (recommended plan for this)." Today a user who forgets their password has no way back in, and the only reset endpoint (`POST /trips/reset-password`) sets a password from an email alone and is merely switched off in production. Sign-in has no limit on attempts (ADR-0002: "Rate limiting / lockout — Not implemented"; security audit issue 3), so passwords can be guessed online.
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md)

---

## Recommended plan

1. **Forgot password by email.** The user enters their email; if it belongs to an account, the app emails a one-time link that expires in **1 hour**. The link opens a page to choose a new password. The answer is the same whether or not the email has an account, so the page cannot be used to find out who has one.
2. **Reset links are safe to store.** The link carries a long random token; only its SHA-256 hash is saved, each link works once, and requesting a new link cancels older ones.
3. **A reset ends every session.** Setting a new password signs the account out everywhere, so anyone using a stolen session is cut off.
4. **Account lockout.** After **5** wrong passwords in a row, the account is locked for **15 minutes**; while locked, even the right password is refused. A successful sign-in clears the count, and resetting the password unlocks the account at once.
5. **Per-IP rate limit.** Each IP address gets at most **20** failed sign-ins and **10** reset requests per **15 minutes**, which slows guessing across many accounts.
6. **Retire the old endpoint.** The email-only `POST /trips/reset-password` is replaced by the token version.

---

## User Stories

### US-70.1: Reset a forgotten password by email
**As a** user who forgot my password  
**I want** to get a reset link by email and choose a new password  
**So that** I can sign in again without asking an admin

**Priority:** P1  
**Independent test:** Request a reset for a known email → one email with a link; open it, set a new password → sign in with the new password works and the old one does not  
**Acceptance scenarios:** see ### US-70.1

### US-70.2: Reset links cannot be misused
**As a** user  
**I want** reset links to be one-time, short-lived, and not to reveal whether an email has an account  
**So that** no one else can use them to take over or discover my account

**Priority:** P1  
**Independent test:** An expired, used, or replaced link → `400`; a reset request for an unknown email gets the same answer as a known one and sends nothing  
**Acceptance scenarios:** see ### US-70.2

### US-70.3: Repeated wrong passwords are stopped
**As a** user  
**I want** my account locked for a while after repeated wrong passwords, and floods of attempts from one place slowed  
**So that** my password cannot be guessed

**Priority:** P1  
**Independent test:** 5 wrong passwords → the 6th attempt (even with the right password) → `429`; after 15 minutes, or after a password reset, sign-in works  
**Acceptance scenarios:** see ### US-70.3

---

## Requirements

### Functional Requirements

**Forgot password**

- **FR-001**: The **Sign in** page (Login) and the apply-flow sign-in page MUST show a **Forgot password?** link that opens the **Forgot password** page (`/forgot-password`), with the email already typed carried over.
- **FR-002**: The **Forgot password** page MUST ask for **Email** and **Send reset link**. After sending it MUST hide the form and show "If an account exists for that email, we sent a link to reset your password. The link expires in 1 hour." with **Back to sign in**.
- **FR-003**: `POST /trips/forgot-password` `{ email }` (no authentication) MUST respond `200` with `{ message }` set to the FR-002 text whether or not the email (trimmed, lower-cased) belongs to a user. A missing email → `400` "Email is required.".
- **FR-004**: When the email belongs to a user, the system MUST create a reset token (32 random bytes, URL-safe), store only its SHA-256 hash with the user, an expiry of **1 hour**, and no used time; mark the user's earlier unused tokens used; and email the link `<APP_URL>/reset-password?token=<token>`.
- **FR-005**: The reset email MUST come from "Mission Trips" `<notifications@missiontrips.app>` (Feature 43 delivery, file or SMTP), with subject "Reset your Mission Trips password" and body:
  ```
  Hi <first name>,

  We received a request to reset the password for your Mission Trips account. To choose a new password, open this link within 1 hour:

  <link>

  If you did not ask to reset your password, you can ignore this email. Your password will not change.

  Mission Trips
  ```
  ("Hi," when the user has no person first name.) It MUST be recorded in the email log with the link replaced by `[reset link]`, so the log never holds a working token. A delivery failure is logged on the server and the response is still the FR-003 `200`.
- **FR-006**: At most **3** reset emails per user per hour. Further requests in that hour send nothing and still get the FR-003 `200`.
- **FR-007**: An email that belongs only to a person without a login account sends nothing (FR-003 `200`).

**Reset password**

- **FR-008**: The **Reset password** page (`/reset-password?token=…`) MUST ask for **New password** and **Confirm password** and **Reset password**. It MUST show "Passwords do not match." or "Password must be at least 8 characters." before sending.
- **FR-009**: `POST /trips/reset-password` `{ token, newPassword }` (no authentication) MUST:
  - respond `400` "Password must be at least 8 characters." when `newPassword` is shorter than 8;
  - respond `400` "This reset link is invalid or has expired. Please request a new one." when the token is missing, unknown, already used, or expired;
  - otherwise set the password (bcrypt, `passwordSetByUser` true), mark the token used, end **all** of the user's sessions, clear the user's failed sign-in count and lock (FR-012), and respond `200` "Your password has been reset. Please sign in.".
- **FR-010**: After a successful reset the page MUST go to **Sign in** and show "Your password has been reset. Please sign in.". On the FR-009 invalid-link `400` it MUST show that message with **Request a new link** (to `/forgot-password`). Opening the page with no token shows the invalid-link message straight away.
- **FR-011**: The email-only reset (`POST /trips/reset-password` with `{ email, newPassword }`, Feature 1 FR-010) is removed; the endpoint only accepts FR-009 tokens, in every environment.

**Failed sign-in limits**

- **FR-012**: Each user MUST have a failed sign-in count and a locked-until time. A wrong password adds 1 to the count; at **5** the account is locked for **15 minutes** and the count goes back to 0. A successful sign-in sets the count to 0.
- **FR-013**: While an account is locked, `POST /trips/login` MUST respond `429` "Too many failed sign-in attempts. Try again in 15 minutes or reset your password." without checking the password (the right password is refused too) and without changing the count. When the lock time has passed, sign-in works normally.
- **FR-014**: `POST /trips/login` MUST allow at most **20 failed** attempts (wrong or unknown email or password, or locked) per IP address per **15 minutes**; `POST /trips/forgot-password` and `POST /trips/reset-password` together at most **10** requests per IP per **15 minutes**. Over the limit → `429` "Too many attempts. Please try again later.". Successful sign-ins do not count.
- **FR-015**: The API MUST use the client's IP address as sent by the production reverse proxy (Express `trust proxy` set to the one proxy hop — Apache on the EC2 server), so users behind the same proxy are not limited together.
- **FR-016**: The **Sign in** pages show the `429` messages in their existing error area (no new UI).

---

## Assumptions

- **APP_URL** (new backend setting, e.g. `https://missiontrips.app`) builds the reset link; development defaults to `http://localhost:8082`. It is added to `.env.example` and the production `.env` written by `deploy.yml`.
- Production (AWS EC2) runs behind one reverse proxy: Apache's proxy module on the same server forwards `/trips` to Node and adds the visitor's IP to `X-Forwarded-For`, so `trust proxy` = 1 is correct (FR-015). This holds while nothing else (an AWS load balancer or CloudFront) sits in front of Apache and Node's port is not open to the internet (EC2 security group allows only 80/443). If either changes, the setting changes with it.
- The per-IP limits use `express-rate-limit` with its in-memory store, which fits the single API server (ADR-0001). Counts reset when the server restarts; that is acceptable.
- Locking reveals that an account exists for that email (unknown emails never lock). Registration already reveals this (`409`, Feature 68), so this is accepted.
- Someone who knows a user's email can lock that account for 15 minutes by guessing wrong. The short lock, the per-IP limit, and reset-to-unlock keep this a nuisance, not a takeover.
- Signing in after a reset creates a new session (all old sessions were ended).
- Admins do not get an unlock button; the lock ends on its own or with a reset.

## Edge Cases

- Two reset requests → only the newest link works.
- Reset link opened after the password was already reset with it → invalid-link message.
- Reset for an email with different case or spaces (` Ana@Example.ORG `) → same user.
- 4 wrong passwords, then the right one → signed in and the count goes back to 0; the next 5 wrong passwords lock again.
- A locked account resets its password → unlocked immediately; signs in with the new password.
- A user created by **Add person** with a temporary password can use Forgot password to set their own.

## Success Criteria

- **SC-001**: A user can regain access with only their email inbox, and the reset signs out every existing session.
- **SC-002**: No password can be set without a valid, unused, unexpired emailed token.
- **SC-003**: No account accepts more than 5 wrong passwords in a row without a 15-minute lock, and no IP gets more than 20 failed sign-ins per 15 minutes.
- **SC-004**: Automated tests for every scenario below pass, and existing auth tests still pass.

---

## Data Ownership & Isolation

Reset tokens belong to one user and are never returned by the API or stored readable (hash only, link redacted in the email log). Lock and count fields are never returned by the API.

---

## Key Entities

- **User** — adds `failedLoginCount`, `lockedUntil`
- **PasswordResetToken** (new) — `userId`, `tokenHash`, `expiresAt`, `usedAt`
- **Session** — all of a user's sessions are ended on reset
- **EmailLog** — records the reset email with the link redacted

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `POST` | `/trips/forgot-password` | none | **New.** `{ email }` → `200 { message }` always (FR-003); sends the reset email when a user has that email (FR-004..FR-007); `400` without email; per-IP limit `429` (FR-014) |
| `POST` | `/trips/reset-password` | none | **Replaced.** `{ token, newPassword }` → `200` sets password, ends all sessions, unlocks (FR-009); `400` short password or invalid link; per-IP limit `429`; the email-only form is gone in every environment (FR-011) |
| `POST` | `/trips/login` | none | Lock after 5 wrong passwords for 15 minutes → `429` (FR-012, FR-013); per-IP failed-attempt limit `429` (FR-014) |

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| `/` Sign in | `Login.vue` | **Forgot password?** link (FR-001); shows "Your password has been reset. Please sign in." after a reset (FR-010); `429` messages in the error area (FR-016) |
| `/apply/sign-in` | `ApplyAuthView.vue` | **Forgot password?** link (FR-001) |
| `/forgot-password` (public) | `ForgotPasswordView.vue` (new) | Email + **Send reset link**; confirmation message; **Back to sign in** (FR-002) |
| `/reset-password?token=` (public) | `ResetPasswordView.vue` (new) | New + confirm password, **Reset password**; invalid-link message with **Request a new link** (FR-008, FR-010) |

Both new routes are added to the router's public routes.

---

## Data Model Requirements

### `users` (changed)

| Column | Type | Notes |
|--------|------|-------|
| `failedLoginCount` | INT NOT NULL DEFAULT 0 | FR-012; excluded from API JSON |
| `lockedUntil` | DATETIME NULL | FR-012; excluded from API JSON |

Added to existing databases by `ensureSchema` (sync does not alter tables).

### `passwordResetTokens` (new)

| Column | Type | Notes |
|--------|------|-------|
| `id` | INT PK | |
| `userId` | INT NOT NULL FK → `users.id` (cascade delete) | |
| `tokenHash` | CHAR(64) NOT NULL UNIQUE | SHA-256 hex of the emailed token |
| `expiresAt` | DATETIME NOT NULL | created + 1 hour |
| `usedAt` | DATETIME NULL | set when used or replaced |
| `createdAt` / `updatedAt` | DATETIME | FR-006 counts this user's rows created in the last hour |

---

## Acceptance Criteria (Gherkin)

### US-70.1 — Reset a forgotten password by email

#### Scenario: Request a reset link for my account
* **Given** a user "ana@example.org" (first name "Ana")
* **When** someone requests a password reset for " Ana@Example.ORG "
* **Then** the response is `200` "If an account exists for that email, we sent a link to reset your password. The link expires in 1 hour."
* **And** one email to "ana@example.org" with subject "Reset your Mission Trips password" starts "Hi Ana," and contains a `/reset-password?token=` link
* **And** the stored token is a hash, not the token in the link
* **And** the email log entry shows `[reset link]` instead of the link

#### Scenario: Reset the password with the emailed link
* **Given** "ana@example.org" signs in with "old-password" and has a valid reset link
* **When** she resets her password to "new-password1" with that link
* **Then** the response is `200` "Your password has been reset. Please sign in."
* **And** she signs in with "new-password1" and not with "old-password"

#### Scenario: A reset signs out every session
* **Given** "ana@example.org" is signed in on two devices
* **When** she resets her password with a valid link
* **Then** requests with either old session token get `401`

#### Scenario: Forgot password page sends the link and shows the confirmation
* **Given** I am on the Forgot password page
* **When** I enter "ana@example.org" and choose **Send reset link**
* **Then** the reset request is sent for "ana@example.org"
* **And** the page shows "If an account exists for that email, we sent a link to reset your password. The link expires in 1 hour." and no form

#### Scenario: Reset password page checks the passwords before sending
* **Given** I open the Reset password page with a token
* **When** I enter "new-password1" and confirm "different1"
* **Then** I see "Passwords do not match." and nothing is sent

#### Scenario: Reset password page sends me to sign in after a reset
* **Given** I open the Reset password page with a valid token
* **When** I enter and confirm "new-password1" and choose **Reset password**
* **Then** I am on Sign in with "Your password has been reset. Please sign in."

#### Scenario: Sign in pages link to Forgot password
* **Given** I am on the Sign in page and have typed "ana@example.org"
* **When** I choose **Forgot password?**
* **Then** the Forgot password page opens with "ana@example.org" filled in

### US-70.2 — Reset links cannot be misused

#### Scenario: Reset request for an unknown email reveals nothing
* **Given** no user or person has "nobody@example.org"
* **When** someone requests a password reset for "nobody@example.org"
* **Then** the response is the same `200` message as for a known email
* **And** no email is sent and no reset token is created

#### Scenario: Expired link is refused
* **Given** a reset link for "ana@example.org" created more than 1 hour ago
* **When** it is used to set "new-password1"
* **Then** the response is `400` "This reset link is invalid or has expired. Please request a new one."
* **And** her password is unchanged

#### Scenario: Link works only once
* **Given** "ana@example.org" reset her password with a link
* **When** the same link is used again to set "another-pass1"
* **Then** the response is `400` "This reset link is invalid or has expired. Please request a new one."

#### Scenario: A newer link replaces the older one
* **Given** "ana@example.org" requested two reset links
* **When** the first link is used
* **Then** the response is `400` "This reset link is invalid or has expired. Please request a new one."
* **And** the second link still works

#### Scenario: Reset emails are capped per hour
* **Given** "ana@example.org" requested 3 reset links in the last hour
* **When** she requests another
* **Then** the response is the same `200` message
* **And** no fourth email is sent

#### Scenario: Short new password is refused
* **Given** a valid reset link for "ana@example.org"
* **When** it is used to set "short"
* **Then** the response is `400` "Password must be at least 8 characters."
* **And** the link still works

#### Scenario: Email-only reset no longer works
* **Given** a user "ana@example.org"
* **When** someone posts `{ email: "ana@example.org", newPassword: "attacker-pass" }` to `/trips/reset-password`
* **Then** the response is `400` "This reset link is invalid or has expired. Please request a new one."
* **And** her password is unchanged

### US-70.3 — Repeated wrong passwords are stopped

#### Scenario: Five wrong passwords lock the account
* **Given** a user "ana@example.org" with password "right-pass1"
* **When** someone signs in with a wrong password 5 times
* **Then** each of those responses is `401` "Invalid email or password."
* **And** signing in with "right-pass1" gets `429` "Too many failed sign-in attempts. Try again in 15 minutes or reset your password."

#### Scenario: The lock ends after 15 minutes
* **Given** "ana@example.org" was locked more than 15 minutes ago
* **When** she signs in with "right-pass1"
* **Then** she is signed in

#### Scenario: A successful sign-in clears the count
* **Given** "ana@example.org" entered 4 wrong passwords
* **When** she signs in with "right-pass1" and then enters 4 more wrong passwords
* **Then** she is not locked

#### Scenario: Resetting the password unlocks the account
* **Given** "ana@example.org" is locked
* **When** she resets her password to "new-password1" with a valid link
* **Then** she signs in with "new-password1" at once

#### Scenario: Too many failed sign-ins from one IP address are slowed
* **Given** 20 failed sign-ins from one IP address within 15 minutes, spread across different emails
* **When** another sign-in comes from that IP address
* **Then** the response is `429` "Too many attempts. Please try again later."

#### Scenario: Too many reset requests from one IP address are slowed
* **Given** 10 reset requests from one IP address within 15 minutes
* **When** another reset request comes from that IP address
* **Then** the response is `429` "Too many attempts. Please try again later."

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-70.1 | Request a reset link for my account | `backend/tests/password-reset.test.js` | `Request a reset link for my account` |
| US-70.1 | Reset the password with the emailed link | `backend/tests/password-reset.test.js` | `Reset the password with the emailed link` |
| US-70.1 | A reset signs out every session | `backend/tests/password-reset.test.js` | `A reset signs out every session` |
| US-70.1 | Forgot password page sends the link and shows the confirmation | `frontend/tests/PasswordReset.test.js` | `Forgot password page sends the link and shows the confirmation` |
| US-70.1 | Reset password page checks the passwords before sending | `frontend/tests/PasswordReset.test.js` | `Reset password page checks the passwords before sending` |
| US-70.1 | Reset password page sends me to sign in after a reset | `frontend/tests/PasswordReset.test.js` | `Reset password page sends me to sign in after a reset` |
| US-70.1 | Sign in pages link to Forgot password | `frontend/tests/PasswordReset.test.js` | `Sign in pages link to Forgot password` |
| US-70.2 | Reset request for an unknown email reveals nothing | `backend/tests/password-reset.test.js` | `Reset request for an unknown email reveals nothing` |
| US-70.2 | Expired link is refused | `backend/tests/password-reset.test.js` | `Expired link is refused` |
| US-70.2 | Link works only once | `backend/tests/password-reset.test.js` | `Link works only once` |
| US-70.2 | A newer link replaces the older one | `backend/tests/password-reset.test.js` | `A newer link replaces the older one` |
| US-70.2 | Reset emails are capped per hour | `backend/tests/password-reset.test.js` | `Reset emails are capped per hour` |
| US-70.2 | Short new password is refused | `backend/tests/password-reset.test.js` | `Short new password is refused` |
| US-70.2 | Email-only reset no longer works | `backend/tests/password-reset.test.js` | `Email-only reset no longer works` |
| US-70.3 | Five wrong passwords lock the account | `backend/tests/login-limits.test.js` | `Five wrong passwords lock the account` |
| US-70.3 | The lock ends after 15 minutes | `backend/tests/login-limits.test.js` | `The lock ends after 15 minutes` |
| US-70.3 | A successful sign-in clears the count | `backend/tests/login-limits.test.js` | `A successful sign-in clears the count` |
| US-70.3 | Resetting the password unlocks the account | `backend/tests/login-limits.test.js` | `Resetting the password unlocks the account` |
| US-70.3 | Too many failed sign-ins from one IP address are slowed | `backend/tests/login-limits.test.js` | `Too many failed sign-ins from one IP address are slowed` |
| US-70.3 | Too many reset requests from one IP address are slowed | `backend/tests/login-limits.test.js` | `Too many reset requests from one IP address are slowed` |

---

## Agent implementation request

```text
Implement Feature 70 from @features/feature-70-password-reset-and-login-limits.md on branch `feature/70-password-reset-and-login-limits`.

Follow layer order in @features/framework.md.
Data: passwordResetToken model (new table, created by sync); users.failedLoginCount and users.lockedUntil (model + ensureSchema add-column for existing databases; excluded from User defaultScope JSON).
Backend: auth.controller.js forgotPassword (FR-003..FR-007) and token resetPassword (FR-009, FR-011, replacing the email-only version); login lockout (FR-012, FR-013). Send the reset email through emailDelivery.js (add a small exported sender for fixed system messages that reuses deliver/readSettings and writes emailLog with the link redacted). APP_URL setting with development default.
Backend: express-rate-limit (in-memory) on /login (failed only), /forgot-password and /reset-password (FR-014); app.set("trust proxy", 1) in server.js (FR-015). Tests must be able to reset the limiters between tests and set a test IP (X-Forwarded-For).
Frontend: ForgotPasswordView, ResetPasswordView, public routes, Forgot password? links on Login and ApplyAuthView, post-reset message on Login (FR-001, FR-002, FR-008, FR-010, FR-016).
Config: APP_URL in backend/.env.example and in the production .env written by .github/workflows/deploy.yml.
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: api.md (forgot-password, reset-password, login rows), data-model.md (users columns, passwordResetTokens), behavior.md (Feature 70 row; replace the dev reset rule). Update ADR-0002 (lockout and rate limiting implemented; reset-password row) and docs/nfr/quality-attributes.md Security Approach.
Do not change change-password, register, or session reuse on login.
Do not implement behavior not in this spec.
```

**Reference updates:** `api.md`, `data-model.md`, `behavior.md`; ADR-0002 and `docs/nfr/quality-attributes.md` (Security approach)

---

## Definition of Done

*   [x] Forgot password request and email per **FR-001**..**FR-007**
*   [x] Token reset per **FR-008**..**FR-011**
*   [x] Account lockout and per-IP limits per **FR-012**..**FR-016**
*   [x] `users` columns and `passwordResetTokens` table per Data Model Requirements
*   [x] `APP_URL` in `.env.example` and the deploy workflow
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/*`, ADR-0002, and quality attributes updated
*   [x] PR to `dev`

## Out of Scope

- Ending other sessions when a signed-in user changes their password (`POST /trips/change-password`), and issuing a new token per sign-in instead of reusing the live one (audit issue 3, remainder)
- Rate limiting **Create account** (`POST /trips/register`) and other endpoints
- Stronger password rules (length beyond 8, complexity, breached-password checks)
- Admin unlock, admin-triggered reset emails, or a reset-email template editable per organization
- CAPTCHA, two-factor sign-in, or emailing the user when their account is locked
