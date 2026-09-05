# Feature: Organization Subdomain Registration Binding

**Feature ID:** 15
**Branch pattern:** `feature/15-organization-subdomain-registration`
**Status:** Ready
**Created:** 2026-09-05
**Input:** Add an organization `subdomain` field; when a visitor uses a URL whose host subdomain matches that org and creates an account, assign them to that organization and hide the organization picker on the create-account forms
**Depends on:** [Feature 1 — User Authentication](feature-1-user-authentication.md), [Feature 3 — Organizations & Agreements](feature-3-organizations-and-agreements.md)

---

## User Stories

### US-15.1: Configure organization subdomain
**As a** System Admin  
**I want** to set a unique subdomain on an organization  
**So that** visitors can reach the app under that org’s branded host

**Priority:** P1  
**Independent test:** Create/update organization with `subdomain`; uniqueness enforced  
**Acceptance scenarios:** see ### US-15.1

### US-15.2: Register under a matching subdomain without choosing an org
**As a** visitor on `{subdomain}.{app-host}`  
**I want** create-account to join that organization automatically  
**So that** I am not asked to pick an organization

**Priority:** P1  
**Independent test:** `POST /trips/register` with `subdomain` (or resolved org) assigns Trip Participant to that org; Login/Apply create-account hide org picker when host subdomain resolves  
**Acceptance scenarios:** see ### US-15.2

---

## Requirements

### Functional Requirements

- **FR-001**: `organization` MUST support optional `subdomain` (`STRING`, nullable). Empty / null means the org has no branded subdomain.
- **FR-002**: When set, `subdomain` MUST be unique among organizations (case-insensitive). Stored form MUST be lowercase.
- **FR-003**: `subdomain` MUST match a DNS label: `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$` (1–63 chars, alphanumeric, hyphens not at ends). Reserved labels MUST be rejected: `www`, `api`, `app`, `admin`, `localhost` (exact match, case-insensitive before normalize).
- **FR-004**: System Admin create/update organization APIs and Add/Edit organization dialogs MUST allow viewing and editing `subdomain`.
- **FR-005**: The frontend MUST detect the **registration host subdomain** as the leftmost DNS label of `window.location.hostname` when the hostname has **more than two** labels (e.g. `hope.missiontrips.app` → `hope`). Hosts with ≤2 labels (`missiontrips.app`, `localhost`) or IP hosts MUST be treated as **no subdomain context**.
- **FR-006**: When a registration host subdomain is present, the app MUST resolve it to an organization (public lookup). If resolved:
  - Login **create account** and Apply **create account** MUST **not** show the optional organizations multi-select (Feature 1 picker).
  - Registration MUST assign the new user as **Trip Participant** to that organization (same role assignment as Feature 1 `orgIds`).
  - The UI MAY show a short read-only hint such as “Joining {organization name}”.
- **FR-007**: `POST /trips/register` MUST accept optional `subdomain` (string). When `subdomain` is present and matches an organization:
  - The server MUST assign Trip Participant for that org.
  - Client-supplied `orgIds` MUST NOT replace or omit that org; the subdomain org MUST be included. (Implementation MAY ignore other `orgIds` when subdomain is present, or merge subdomain org into `orgIds` — either is fine if subdomain org is always assigned.)
- **FR-008**: When `subdomain` is sent but no organization matches, registration MUST fail with `400` and a clear message (do not silently register with no org).
- **FR-009**: When there is **no** host subdomain context, existing Feature 1 behavior remains: optional org multi-select via `GET /trips/register/organizations` and optional `orgIds` on register.
- **FR-010**: Apply-funnel create-account that already receives `orgId` in the query (Feature 1 / 9 / 13) MUST remain valid. If both query `orgId` and host subdomain are present, **host subdomain wins** for membership assignment and the org picker stays hidden.
- **FR-011**: Staff **Add person** (`AddPersonDialog`) MUST remain unchanged (still requires org selection) — this feature only affects **self-service account creation**.
- **FR-012**: Provide a public (unauthenticated) resolve endpoint, e.g. `GET /trips/register/organizations/by-subdomain/:subdomain`, returning `{ id, name, subdomain }` or `404` if unknown — used by create-account UIs to hide the picker and show the hint.

---

## Assumptions

- Production will use wildcard DNS / TLS for `*.{apex}` pointing at the same frontend app; configuring DNS/CDN is **ops**, not this feature’s product code.
- API may live on a different host than the SPA; therefore registration binding uses an explicit `subdomain` (or resolved org id derived from it) in the register request, **not** the API server’s `Host` header alone.
- Public path-based org pages (`/org/:orgSlug`, Feature 9) are unchanged; subdomain is an alternate entry for the **same SPA**, not a replacement for org slug URLs.
- Existing orgs ship with `subdomain = null` until a System Admin sets one.

## Edge Cases

- Unknown subdomain on host → treat as no binding for UI (show Feature 1 optional picker); if client still posts that unknown `subdomain`, **FR-008** applies.
- Duplicate subdomain on create/update → `400`/`409` with clear message.
- Changing an org’s subdomain does not migrate existing memberships.
- `www.missiontrips.app` → leftmost label `www` is reserved → no org binding (picker shown).
- Local/dev `localhost` / `127.0.0.1` → no subdomain context.

## Success Criteria

- **SC-001**: System Admin can save a unique valid `subdomain` on an organization.
- **SC-002**: On `{subdomain}.…`, create-account hides the org picker and registers the user into that org as Trip Participant.
- **SC-003**: On apex / no subdomain, create-account still offers optional organizations.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Only System Admin may set `subdomain` (same as org create/update today).
- Subdomain → org resolution for registration is intentionally public (read-only id/name/subdomain).
- Membership created by subdomain registration uses the same Trip Participant org role rules as Feature 1.

---

## Key Entities

- **Organization** — gains optional unique `subdomain`
- **User** / **Person** / **OrgPeopleRole** — unchanged shapes; registration may auto-create Trip Participant membership

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `POST` | `/trips/organizations` | System Admin | Accept `subdomain` (optional); validate format + uniqueness |
| `PUT` | `/trips/organizations/:id` | System Admin | Accept `subdomain` (optional/clearable); validate |
| `GET` | `/trips/organizations` / `:id` | As today | Include `subdomain` in payloads |
| `GET` | `/trips/register/organizations/by-subdomain/:subdomain` | No | Resolve `{ id, name, subdomain }` or `404` |
| `POST` | `/trips/register` | No | Optional `subdomain`; when present and valid, assign Trip Participant for that org (**FR-007**/**FR-008**) |

---

## Screen Requirements

| Route / UI | View | Change |
|------------|------|--------|
| Organizations add/edit | `AddOrganizationDialog` / `EditOrganizationDialog` (or shared form fields) | Subdomain text field + validation messages |
| `/` login create account | `Login.vue` | If host subdomain resolves → hide org multi-select; send `subdomain` on register; optional “Joining {name}” |
| `/apply/create-account` | `ApplyCreateAccountView.vue` | Same hide/bind behavior when host subdomain resolves |
| People → Add person | `AddPersonDialog.vue` | **No change** (**FR-011**) |

Shared helper recommended: derive host subdomain + resolve via **FR-012** once per create-account screen load.

---

## Data Model Requirements

### `organization` (delta)

| Column | Type | Notes |
|--------|------|--------|
| `subdomain` | `STRING(63)` NULL | Unique (case-insensitive); stored lowercase; null/empty = unset |

Migration / `ensureSchema` (or Sequelize sync alter where used) MUST add the column and unique index.

---

## Acceptance Criteria (Gherkin)

### US-15.1 — Configure organization subdomain

#### Scenario: System Admin sets a unique subdomain on an organization
* **Given** I am a System Admin
* **When** I create or update an organization with subdomain `hope`
* **Then** the organization stores `subdomain` as `hope`
* **And** subsequent GET of that organization includes `subdomain: "hope"`

#### Scenario: Duplicate subdomain is rejected
* **Given** an organization already has subdomain `hope`
* **When** I create or update another organization with subdomain `Hope`
* **Then** the API rejects the change with a client error
* **And** the second organization does not receive `hope`

#### Scenario: Invalid or reserved subdomain is rejected
* **Given** I am a System Admin
* **When** I set subdomain to `www` or `Hope_Mission` or `-bad`
* **Then** the API rejects the change with a client error

### US-15.2 — Register under a matching subdomain without choosing an org

#### Scenario: Visitor registers on org subdomain and joins that org
* **Given** organization “Hope Mission” has subdomain `hope`
* **And** I open the create-account UI with host subdomain `hope`
* **When** I register with valid name, email, and password
* **Then** `POST /trips/register` includes `subdomain` `hope` (or equivalent binding)
* **And** I receive a session token
* **And** I have a Trip Participant org role for Hope Mission
* **And** the create-account form did not require me to select organizations

#### Scenario: Create-account hides organization picker when subdomain resolves
* **Given** organization “Hope Mission” has subdomain `hope`
* **And** the host subdomain is `hope`
* **When** I open Login create-account (or Apply create-account)
* **Then** the organizations multi-select is not shown
* **And** I see that I am joining Hope Mission (name visible)

#### Scenario: Apex host still shows optional organizations
* **Given** I open create-account with no registration host subdomain
* **When** the register form is shown
* **Then** the optional organizations picker is available as in Feature 1

#### Scenario: Unknown subdomain on register is rejected
* **Given** no organization has subdomain `nope`
* **When** I `POST /trips/register` with `subdomain` `nope` and otherwise valid fields
* **Then** the API returns `400`
* **And** no user is created

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-15.1 | System Admin sets a unique subdomain on an organization | `backend/tests/organizations.test.js` | `System Admin sets a unique subdomain on an organization` |
| US-15.1 | Duplicate subdomain is rejected | `backend/tests/organizations.test.js` | `Duplicate subdomain is rejected` |
| US-15.1 | Invalid or reserved subdomain is rejected | `backend/tests/organizations.test.js` | `Invalid or reserved subdomain is rejected` |
| US-15.2 | Visitor registers on org subdomain and joins that org | `backend/tests/auth.test.js` | `Visitor registers on org subdomain and joins that org` |
| US-15.2 | Create-account hides organization picker when subdomain resolves | `frontend/tests/Login.test.js` | `Create-account hides organization picker when subdomain resolves` |
| US-15.2 | Apex host still shows optional organizations | `frontend/tests/Login.test.js` | `Apex host still shows optional organizations` |
| US-15.2 | Unknown subdomain on register is rejected | `backend/tests/auth.test.js` | `Unknown subdomain on register is rejected` |

---

## Agent implementation request

```text
Implement Feature 15 from @features/feature-15-organization-subdomain-registration.md on branch `feature/15-organization-subdomain-registration`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
Do not change AddPersonDialog org requirements (FR-011).
Do not implement DNS/TLS wildcard provisioning.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Schema + org admin UI for `subdomain` (**FR-001**–**FR-004**)
*   [x] Register API + create-account UI binding (**FR-005**–**FR-010**, **FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [x] Living reference updated for subdomain column, resolve endpoint, and register rule

## Out of Scope

- Wildcard DNS / certificate provisioning for `*.apex`
- Changing Feature 9 `/org/:orgSlug` public pages to require subdomains
- Staff Add person org selection — Feature 2 / **FR-011**
- Multi-tenant separate deployments per org
- Email domain–based auto-join
