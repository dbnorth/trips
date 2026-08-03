# Feature: Email Templates

**Feature ID:** 10
**Branch pattern:** `feature/10-email-templates`
**Status:** Shipped
**Created:** 2026-08-02
**Input:** Reverse-spec — org/trip-scoped email template CRUD and copy-from sources (sending pipeline may be incomplete)
**Depends on:** [Feature 3](feature-3-organizations-and-agreements.md), [Feature 5](feature-5-trip-catalog-management.md)

---

## User Stories

### US-10.1: Manage email templates
**As an** Org Admin or Trip Leader  
**I want to** create and edit email templates scoped to an org and optional trip  
**So that** communications can reuse subject/body/function codes

**Priority:** P2  
**Independent test:** CRUD `/trips/email-templates`  
**Acceptance scenarios:** see ### US-10.1

### US-10.2: Copy template sources
**As** staff  
**I want to** list copy-sources for templates  
**So that** I can clone existing content into a new template

**Priority:** P3  
**Independent test:** `GET /trips/email-templates/copy-sources`  
**Acceptance scenarios:** see ### US-10.2

---

## Requirements

### Functional Requirements

- **FR-001**: EmailTemplate MUST include `orgId`, optional `tripId`, `fromEmail`, `functionCode`, `subject`, `content`, optional `attachment`.
- **FR-002**: Manage templates MUST allow Org Admin, Trip Leader (trip-scoped as implemented), or System Admin.
- **FR-003**: UI route `/templates` MUST gate non-admins to Org Admin or Trip Leader.
- **FR-004**: This feature authorizes **template storage/management** as implemented; bulk sending is out of scope unless separately specified.

---

## Assumptions

- Login writes to `emailLog` are Feature 1 audit only, not this template feature.
- Actual SMTP delivery is not required by this reverse-spec unless present in code paths beyond CRUD.

## Edge Cases

- Trip Leaders limited to templates for trips they lead (as coded).
- Missing required fields → `400`.

## Success Criteria

- **SC-001**: Org Admin creates an org-scoped template with functionCode/subject/content.
- **SC-002**: Copy-sources endpoint returns usable sources for the form.
- **SC-003**: Automated tests (backfill).

---

## Data Ownership & Isolation

- Templates are org-scoped (and optionally trip-scoped); visibility follows manage/list filters in the controller.

---

## Key Entities

- **EmailTemplate**

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET/POST` | `/trips/email-templates` | Yes | List/create |
| `GET/PUT/DELETE` | `/trips/email-templates/:id` | Yes | Manage |
| `GET` | `/trips/email-templates/copy-sources` | Yes | Copy sources |

---

## Screen Requirements

| Route | View |
|-------|------|
| `/templates` | `EmailTemplatesList.vue`, `EmailTemplateFormDialog` |

---

## Data Model Requirements

### `emailTemplate`
`id`, `orgId`, `tripId`, `fromEmail`, `functionCode`, `subject`, `content`, `attachment`

---

## Acceptance Criteria (Gherkin)

### US-10.1 — Manage email templates

#### Scenario: Org Admin creates an email template
* **Given** I am Org Admin for org A
* **When** I create a template with functionCode, subject, and content
* **Then** the template is listed for org A

#### Scenario: Unauthorized user cannot open templates page
* **Given** I am only a Trip Participant with no leader/admin role
* **When** I navigate to `/templates`
* **Then** I am redirected to home

### US-10.2 — Copy template sources

#### Scenario: Staff loads copy-sources
* **Given** I can manage templates
* **When** I request copy-sources
* **Then** the API returns a list usable by the form

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-10.1 | Org Admin creates an email template | `backend/tests/email-templates.test.js` | `Org Admin creates an email template` |
| US-10.1 | Unauthorized user cannot open templates page | `frontend/tests/router.test.js` | `Unauthorized user cannot open templates page` |
| US-10.2 | Staff loads copy-sources | `backend/tests/email-templates.test.js` | `Staff loads copy-sources` |

---

## Agent implementation request

```text
Implement Feature 10 from @features/feature-10-email-templates.md on branch `feature/10-email-templates`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update living reference files in the same PR when this feature changes API/schema/rules.
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

- Automated campaign sending / inbox integration — future feature
- Login emailLog — Feature 1
