# Feature: Document Types by Organization

**Feature ID:** 91
**Branch pattern:** `feature/91-org-document-types`
**Status:** Implemented
**Created:** 2026-10-27
**Input:** "create a spec to update document types to allow document types by organization. Add the document type to menu bar for org admins. make the database update to make all the current documents types to be set to orgId = 1."

Clarified with the requester:
- Each **document type** belongs to one **organization**. Org Admins manage their organization's document types (today only a System Admin manages one shared list).
- **Document types** appears in the menu bar for Org Admins (as well as System Admin).
- On startup the database gets an organization on every document type; every existing document type is set to **organization 1**. Other organizations start with **no** document types; their Org Admins add their own.
- When a person adds a document in their **Profile**, they choose from the document types of **every organization they belong to**.

**Depends on:**
- [Feature 3 — Organizations and Agreements](feature-3-organizations-and-agreements.md)
- [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md)
- [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md)
- [Feature 25 — Worker Role Required Documents](feature-25-worker-role-required-documents.md) (required document types)
- [Feature 59 — Document Type Specialization List](feature-59-document-type-specialization-list.md)
- [Feature 80 — Trip Master Import](feature-80-trip-master-import.md) (passport document type)

---

## User Stories

### US-91.1: Org Admins manage their organization's document types

**As** an Org Admin
**I want** a **Document types** page for my organization
**So that** I can add and edit the documents my volunteers need without asking a System Admin

**Acceptance:** see Gherkin scenarios under US-91.1.

### US-91.2: Existing document types move to organization 1

**As** a System Admin
**I want** today's document types to belong to organization 1 after the update
**So that** nothing already entered is lost and other organizations start clean

**Acceptance:** see Gherkin scenarios under US-91.2.

### US-91.3: People and worker roles see the right organization's document types

**As** a volunteer or Org Admin
**I want** document type choices limited to the organizations involved
**So that** I don't pick another organization's documents

**Acceptance:** see Gherkin scenarios under US-91.3.

---

## Requirements

### Functional Requirements

**Ownership and management**

- **FR-001**: A document type has a required **organization** (`orgId`). Its fields, specializations (Feature 59), and rules are otherwise unchanged.
- **FR-002**: An Org Admin of the organization, or a System Admin, may create, edit, and delete that organization's document types. Anyone else gets `403` "Forbidden." Creating needs an organization the caller manages; the organization of an existing document type can't be changed.
- **FR-003**: The menu bar shows **Document types** to System Admins and Org Admins (same condition as **Worker roles**). The **Document types** page lists the document types of the organization selected in the menu bar, like **Worker roles**: a System Admin with no organization selected sees "Select an organization using the menu bar to manage document types."; a user who isn't an Org Admin of the selected organization sees "Only organization admins can manage document types."; with the org scope notice on, "Showing document types for <organization>." **Add document type** creates one in that organization.

**Database update**

- **FR-004**: On startup (`ensureSchema`), when `documentTypes` has no `orgId` column, the column is added (FK → `organizations`), every existing document type is set to `orgId = 1`, and the column becomes required. This runs once; later startups change nothing. Person documents, specializations, and worker role links keep pointing at the same document types.
- **FR-005**: The document type seed (`npm run seed`, `documentTypes.json`) adds missing types to **organization 1** (matched by description within organization 1). When organization 1 doesn't exist, the seed adds no document types. The startup defaults (`ensureSchema`: Medical Licence, Passport, Certification, Diploma when no type of that kind exists) follow the same rule: added to organization 1 only.

**Where document types are offered**

- **FR-006**: **Profile** (and **Edit person** for staff) → person documents: the document type choices are the document types of every organization the person belongs to (any organization role), ordered by organization name then description. When the person belongs to more than one organization with document types, each choice shows "<description> (<organization name>)". **Add person** offers the document types of the organization selected in the menu bar.
- **FR-007**: **Apply** and **Edit application** use the document types of the **trip's organization** (for the required-document and passport messages). Worker roles' required documents keep coming from the worker role (Feature 25).
- **FR-008**: **Worker role** form: **Required documents** offers the document types of the worker role's organization. Saving a role with a required document type of another organization → `400` "Required documents must be document types of this organization." A type already on the role before this feature may stay when the role is saved.
- **FR-009**: The Trip Master import (Feature 80) imports passports with the trip organization's first passport-type document type (lowest id); when the trip's organization has none, the summary says "no Passport document type, so the passport wasn't imported." as now. A person who already has a passport-type document of any organization gets no second one.
- **FR-010**: A person document keeps its document type whatever organization it belongs to; existing documents show and count as before (application document checks, **Require Passport**, Documents PDF).

---

## Assumptions

- "Organization 1" means the organization with id 1; the production database has it.
- People become members of a trip's organization when they apply (Feature 7), so after saving an application, even as incomplete, the trip organization's document types are offered in their Profile.
- Document type descriptions may repeat across organizations (each organization may have its own "Passport").
- System Admin keeps every ability it has today, scoped by the organization selected in the menu bar.

## Edge Cases

- A person in no organization → no document types to choose; existing documents still show.
- A person in two organizations that both have "Passport" → both listed, with organization names.
- An Org Admin of organization 2 opening a document type of organization 1 by URL or API → `403` "Forbidden."
- Deleting a document type used by a person document → refused as today (RESTRICT).
- A worker role of organization 2 that already requires a type of organization 1 → it stays required; adding another organization-1 type is refused (FR-008).
- Organization 1 missing when the update runs → existing document types are left without an organization and the column stays optional; a System Admin assigns them (out of scope here). Not expected in production.

## Success Criteria

- **SC-001**: After the update, every document type that existed belongs to organization 1, and every person document, specialization, and worker role requirement is unchanged.
- **SC-002**: An Org Admin of organization 2 can create a document type from the menu bar and require it on an organization 2 worker role.
- **SC-003**: Automated tests for every scenario below pass, and existing document type, worker role, person document, application, and Trip Master tests still pass.

---

## Data Ownership & Isolation

- Document types are owned by an organization. Writes: Org Admin of that organization or System Admin.
- Reads: any signed-in user may read an organization's document types (needed to apply to its trips); the person-document choices are limited to the person's organizations (FR-006).

---

## Key Entities

- **documentType** — new `orgId`.
- **organization** — `hasMany` documentType.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/document-types` | `?orgId=` → that organization's types (any signed-in user); `?personId=` → types of every organization that person belongs to, each with `organization: { id, name }` (the person themself, or a caller who may view that person); neither → System Admin: all types with `organization`, others: types of the caller's organizations. Every row includes `orgId` |
| `GET` | `/trips/document-types/:id` | Org Admin of the type's organization or System Admin; otherwise `403` "Forbidden." |
| `POST` | `/trips/document-types` | Requires `orgId`; caller must be Org Admin of it or System Admin (`403` "Forbidden."); `400` "Organization is required." when missing |
| `PUT` | `/trips/document-types/:id` | Org Admin of the type's organization or System Admin; `orgId` in the body is ignored |
| `DELETE` | `/trips/document-types/:id` | Org Admin of the type's organization or System Admin |
| `POST` / `PUT` | `/trips/worker-roles` | `requiredDocumentTypeIds` must be types of the role's organization (or already required by the role) → else `400` "Required documents must be document types of this organization." |

---

## Screen Requirements

- **Menu bar**: **Document types** for System Admins and Org Admins (FR-003).
- **Document types** page: organization-scoped like **Worker roles** (FR-003).
- **Person documents** card (Profile, Edit person, Add person): choices per FR-006.
- **Apply** / **Edit application**: trip organization's types (FR-007).
- **Worker role** form: role organization's types (FR-008).

---

## Data Model Requirements

| Table | Change |
|-------|--------|
| `documentTypes` | Add `orgId` INTEGER, required, FK → `organizations` (added by `ensureSchema`; existing rows set to 1 — FR-004) |

---

## Acceptance Criteria (Gherkin)

Background:
- Organization 1 "Hope Missions" with Org Admin Omar; organization 2 "Healing Hands" with Org Admin Hana; System Admin Sam.
- Before the update, document types "Passport" (passport) and "Nursing License" (medical licence) exist with no organization; Ana has a "Passport" document; worker role "RN" of Hope Missions requires "Nursing License".

### US-91.2 — Existing document types move to organization 1

#### Scenario: The update puts existing document types in organization 1
* **When** the server starts after the update
* **Then** "Passport" and "Nursing License" belong to Hope Missions
* **And** Ana's Passport document and RN's required "Nursing License" are unchanged
* **And** starting the server again changes nothing

### US-91.1 — Org Admins manage their organization's document types

#### Scenario: Org Admins see Document types in the menu bar
* **When** Hana signs in with Healing Hands selected
* **Then** the menu bar shows **Document types**
* **And** a Trip Participant who isn't an Org Admin doesn't see it

#### Scenario: An Org Admin manages only their organization's document types
* **When** Hana opens **Document types**
* **Then** the list is empty and says "Showing document types for Healing Hands." when the org scope notice is on
* **And** Hana adds "CPR Certificate" (certification), which belongs to Healing Hands
* **And** Hana can't edit or delete "Passport" of Hope Missions ("Forbidden.")
* **And** Omar's list shows "Passport" and "Nursing License" but not "CPR Certificate"

### US-91.3 — People and worker roles see the right organization's document types

#### Scenario: A person chooses from the document types of their organizations
* **Given** Ana belongs to Hope Missions and Healing Hands
* **When** Ana adds a document in her **Profile**
* **Then** the choices are "CPR Certificate (Healing Hands)", "Nursing License (Hope Missions)", and "Passport (Hope Missions)"
* **And** Ben, who belongs only to Healing Hands, sees only "CPR Certificate"

#### Scenario: A worker role requires only its organization's document types
* **When** Hana edits Healing Hands worker role "Medic"
* **Then** **Required documents** offers "CPR Certificate" only
* **And** saving "Medic" with "Passport" of Hope Missions is refused with "Required documents must be document types of this organization."

#### Scenario: The Trip Master import uses the trip organization's passport type
* **Given** a Healing Hands trip and a Trip Master row with a passport number
* **When** Hana imports the Trip Master
* **Then** the summary says "no Passport document type, so the passport wasn't imported."
* **And** after Hana adds a passport-type "Passport" to Healing Hands, the passport is imported with that type

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-91.2 | The update puts existing document types in organization 1 | `backend/tests/org-document-types.test.js` | `The update puts existing document types in organization 1` |
| US-91.1 | Org Admins see Document types in the menu bar | `frontend/tests/OrgDocumentTypes.test.js` | `Org Admins see Document types in the menu bar` |
| US-91.1 | An Org Admin manages only their organization's document types | `backend/tests/org-document-types.test.js` | `An Org Admin manages only their organization's document types` |
| US-91.1 | An Org Admin manages only their organization's document types | `frontend/tests/OrgDocumentTypes.test.js` | `Document types lists the selected organization's types` |
| US-91.3 | A person chooses from the document types of their organizations | `backend/tests/org-document-types.test.js` | `A person chooses from the document types of their organizations` |
| US-91.3 | A person chooses from the document types of their organizations | `frontend/tests/PersonDocumentsCard.test.js` | `Document type choices show organization names` |
| US-91.3 | A worker role requires only its organization's document types | `backend/tests/org-document-types.test.js` | `A worker role requires only its organization's document types` |
| US-91.3 | The Trip Master import uses the trip organization's passport type | `backend/tests/org-document-types.test.js` | `The Trip Master import uses the trip organization's passport type` |

---

## Agent implementation request

```text
Implement Feature 91 from @features/feature-91-org-document-types.md on branch `feature/91-org-document-types`.

Backend: documentType.orgId (model + ensureSchema migration setting existing rows to 1, once); documentType controller access (Org Admin of the type's org or System Admin) and GET filters (?orgId, ?personId, default); seedDocumentTypes into org 1; workerRole required-document org check; Trip Master passport type from the trip's org.
Frontend: MenuBar Document types for Org Admins; DocumentTypesList scoped like WorkerRolesList; DocumentTypeFormDialog sends orgId on create; PersonDocumentsCard (?personId / Add person ?orgId) with organization names when more than one org; ApplyTripDialog / EditTripApplicationView ?orgId=trip org; WorkerRoleFormDialog ?orgId=role org.
Tests per the Test Coverage Map. Update features/reference/ (behavior, api, data-model).
```

---

## Definition of Done

*   [x] Ownership and access per **FR-001**, **FR-002**
*   [x] Menu and page per **FR-003**
*   [x] Database update and seed per **FR-004**, **FR-005**
*   [x] Choices per **FR-006**–**FR-009**; existing documents per **FR-010**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Copying document types between organizations
- Moving a document type to another organization
- Shared (organization-less) document types
- Changing which documents applications require
