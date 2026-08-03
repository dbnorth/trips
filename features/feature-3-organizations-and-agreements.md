# Feature: Organizations & Agreements

**Feature ID:** 3
**Branch pattern:** `feature/3-organizations-and-agreements`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — organization CRUD, logo, branding color, participant agreement markdown
**Depends on:** [Feature 1](feature-1-user-authentication.md)

---

## User Stories

### US-3.1: Administer organizations
**As a** System Admin  
**I want to** create, update, and delete organizations  
**So that** the platform hosts multiple ministry/trip sponsors

**Priority:** P1  
**Independent test:** System admin CRUD `/trips/organizations`  
**Acceptance scenarios:** see ### US-3.1

### US-3.2: Org Admin updates org profile and logo
**As an** Org Admin  
**I want to** edit my organization's contact info, social links, color, and logo  
**So that** public and app branding match the org

**Priority:** P1  
**Independent test:** `PUT /trips/organizations/:id` + logo upload  
**Acceptance scenarios:** see ### US-3.2

### US-3.3: Manage participant agreement
**As an** Org Admin  
**I want to** edit the Markdown participant agreement  
**So that** applicants accept the current terms (Feature 7)

**Priority:** P1  
**Independent test:** GET/PUT `/trips/organizations/:id/agreement`  
**Acceptance scenarios:** see ### US-3.3

---

## Requirements

### Functional Requirements

- **FR-001**: Organization MUST store name, address/phone/email, website, facebook, instagram, `logo`, `agreementFileName`, `colorFamily`, `version`.
- **FR-002**: Only System Admin MAY create or delete organizations.
- **FR-003**: Org Admin for the org or System Admin MAY update organization fields and logo.
- **FR-004**: Authenticated users MAY read organizations they can access (admin: all; else org-admin or trip-leader orgs).
- **FR-005**: Agreement content MUST be stored as a Markdown file referenced by `agreementFileName`.
- **FR-006**: `colorFamily` MUST drive app primary theme when the user acts in that org (`App.vue` / `resolveOrgColor`).
- **FR-007**: Organizations list UI (`/organizations`) MUST be System Admin only in the router.

---

## Assumptions

- Public org page by slug is Feature 9.
- Agreement acceptance on applications is Feature 7.

## Edge Cases

- Delete org cleans up logo and agreement files.
- Optimistic `version` conflicts on concurrent edits.

## Success Criteria

- **SC-001**: System Admin can create an org and Org Admin can edit logo + agreement.
- **SC-002**: Theme primary updates from org `colorFamily`.
- **SC-003**: Scenarios covered by automated tests (backfill).

---

## Data Ownership & Isolation

- Updates require Org Admin for that org or System Admin.
- List endpoints do not expose orgs outside the caller's admin/leader scope (except system admin).

---

## Key Entities

- **Organization**: sponsor entity with branding and agreement file

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/organizations` | Yes | Scoped list |
| `GET` | `/trips/organizations/:id` | Yes | Detail |
| `POST` | `/trips/organizations` | System admin | Create |
| `PUT` | `/trips/organizations/:id` | Org admin / system admin | Update |
| `PUT` | `/trips/organizations/:id/logo` | Org admin / system admin | Logo |
| `GET/PUT` | `/trips/organizations/:id/agreement` | Authenticated (manage gates) | Agreement MD |
| `DELETE` | `/trips/organizations/:id` | System admin | Delete |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/organizations` | `OrganizationsList.vue` (system admin) |
| Dialogs | `AddOrganizationDialog`, `EditOrganizationDialog`, `OrganizationAgreementDialog` |
| Home | Org Admin section with Edit org |

---

## Data Model Requirements

### `organization`
`id`, `name`, address fields, phone/email, `websiteUrl`, `facebookPage`, `instagram`, `logo`, `agreementFileName`, `colorFamily`, `version`

---

## Acceptance Criteria (Gherkin)

### US-3.1 — Administer organizations

#### Scenario: System Admin creates an organization
* **Given** I am a system admin
* **When** I create an organization with a name
* **Then** `POST /trips/organizations` succeeds
* **And** the org appears in the list

#### Scenario: Non-admin cannot create an organization
* **Given** I am not a system admin
* **When** I call `POST /trips/organizations`
* **Then** the API denies the request

### US-3.2 — Org Admin updates org profile and logo

#### Scenario: Org Admin updates branding color and logo
* **Given** I am Org Admin for org A
* **When** I set `colorFamily` and upload a logo
* **Then** the organization record and logo file are updated

### US-3.3 — Manage participant agreement

#### Scenario: Org Admin saves agreement markdown
* **Given** I am Org Admin for org A
* **When** I PUT agreement markdown content
* **Then** subsequent GET returns that content

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-3.1 | System Admin creates an organization | `backend/tests/organizations.test.js` | `System Admin creates an organization` |
| US-3.1 | Non-admin cannot create an organization | `backend/tests/organizations.test.js` | `Non-admin cannot create an organization` |
| US-3.2 | Org Admin updates branding color and logo | `backend/tests/organizations.test.js` | `Org Admin updates branding color and logo` |
| US-3.3 | Org Admin saves agreement markdown | `backend/tests/organizations.test.js` | `Org Admin saves agreement markdown` |

---

## Agent implementation request

```text
Implement Feature 3 from @features/feature-3-organizations-and-agreements.md on branch `feature/3-organizations-and-agreements`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and/or @features/reference/behavior.md in the same PR when this feature changes them.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md`, `features/reference/api.md`, `features/reference/behavior.md`

---

## Definition of Done

*   [x] Implemented in imported codebase (**FR-00N**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [ ] Living reference updated when evolving this feature

## Out of Scope

- Public `/org/:orgSlug` page — Feature 9
- Trip CRUD under an org — Feature 5
