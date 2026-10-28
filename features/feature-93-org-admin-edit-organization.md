# Feature: Org Admins Edit Their Organization

**Feature ID:** 93
**Branch pattern:** `feature/93-org-admin-edit-organization`
**Status:** Implemented
**Created:** 2026-10-27
**Input:** "add a spec for Org Admin to be able to edit their own org. Organization would be available and only their org in the list."

Clarified with the requester:
- The **Organizations** page lists **only the organization selected in the menu bar**, like **Worker roles** and **Document types**. An Org Admin of several organizations switches between them with the menu bar organization selector.

**Depends on:**
- [Feature 3 — Organizations and Agreements](feature-3-organizations-and-agreements.md) (Organizations page, Edit organization dialog, logo, participant agreement)
- [Feature 15 — Organization Subdomain Registration](feature-15-organization-subdomain-registration.md) (subdomain is System Admin only)
- [Feature 18 — Organization Medical Agreement](feature-18-org-medical-agreement.md) (medical agreement in the Edit organization dialog)

---

## User Stories

### US-93.1: Org Admins open Organizations from the menu bar

**As** an Org Admin
**I want** an **Organizations** item in the menu bar that shows my organization
**So that** I can find and edit my organization's details the same way a System Admin does

**Acceptance:** see Gherkin scenarios under US-93.1.

### US-93.2: Org Admins edit only their own organization

**As** an Org Admin
**I want** to edit my organization from the Organizations page
**So that** I can keep its email, address, colors, test mode, logo, and agreements up to date without asking a System Admin

**Acceptance:** see Gherkin scenarios under US-93.2.

---

## Requirements

### Functional Requirements

**Menu and page access**

- **FR-001**: The menu bar shows **Organizations** to System Admins (as today) and to users who are Org Admin of any organization. Other users don't see it.
- **FR-002**: The `/organizations` page opens for System Admins and Org Admins; anyone else is sent to Home (as today for non–System Admins).

**What the page lists**

- **FR-003**: For an Org Admin who isn't a System Admin, the Organizations table lists only the organization selected in the menu bar (the acting organization), and only when they are Org Admin of it. Changing the menu bar selection reloads the page to that organization. When there is no such organization, the table is empty with "No organizations." (Vuetify's empty text is fine).
- **FR-004**: The **Add** button shows only to System Admins. Org Admins can't create organizations (the API already refuses them).
- **FR-005**: System Admins see every organization and **Add**, unchanged.

**Editing**

- **FR-006**: An Org Admin's row has **Edit**, which opens the existing **Edit organization** dialog for that organization: name, email, test mode, address, colors, logo, **Edit participant agreement**, and **Edit medical agreement**. **Subdomain** stays hidden and unchanged for anyone who isn't a System Admin (Feature 15). Saving shows "Organization updated." and refreshes the menu bar's organization name, logo, and color as it does for a System Admin.
- **FR-007**: The API stays as it is and is the safeguard: `PUT /trips/organizations/:id`, its logo, and its agreement endpoints allow System Admins and Org Admins of that organization only; anyone else gets `403` "Forbidden.". A `subdomain` sent by an Org Admin is ignored.

---

## Assumptions

- No backend change is needed: `GET /trips/organizations` already returns only the organizations an Org Admin administers, and updates already check Org Admin of that organization. The page narrows that list to the selected organization in the frontend.
- The **Edit** on the Home organization heading (for Org Admins) is unchanged; this adds a second way in.
- Org Admins may change their organization's **Name** (the API already allows it).

## Edge Cases

- Omar is Org Admin of "Hope Missions" and "Grace Clinics" with "Hope Missions" selected → only Hope Missions is listed; selecting "Grace Clinics" lists only Grace Clinics.
- An Org Admin of "Hope Missions" who is only a Trip Participant in "Grace Clinics" → the menu bar's organization choices for them are the organizations they administer, so Grace Clinics is never listed.
- A Trip Leader (no Org Admin role) types `/organizations` → sent to Home.
- An Org Admin sends `PUT /trips/organizations/<Grace Clinics id>` without being Org Admin there → `403` "Forbidden."; nothing changes.

## Success Criteria

- **SC-001**: An Org Admin can change their organization's email from the Organizations page in under a minute without System Admin help.
- **SC-002**: No Org Admin can see or change another organization from the Organizations page or the API.
- **SC-003**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

An Org Admin sees and edits only organizations they are Org Admin of, and on the page only the one selected in the menu bar. The API enforces the edit rule (FR-007); the page's list is a convenience on top of `GET /trips/organizations`, which already returns only the caller's Org Admin organizations.

---

## Key Entities

- **organization** — read and updated (no schema change).
- **userOrgRole** with role **Org Admin** — decides who sees the page and which organization they may edit.

---

## API Requirements

No change. Existing behavior relied on (covered by tests):

| Method | Path | Behavior relied on |
|--------|------|--------------------|
| `GET` | `/trips/organizations` | Org Admin (not System Admin) → only organizations they are Org Admin of |
| `PUT` | `/trips/organizations/:id` | Org Admin of that organization or System Admin; otherwise `403` "Forbidden."; `subdomain` ignored for non–System Admins |
| `POST` | `/trips/organizations` | System Admin only (`403` otherwise) |

---

## Screen Requirements

- **Menu bar**: **Organizations** for System Admins and Org Admins (FR-001).
- **Organizations page**: for Org Admins, only the menu bar's selected organization, no **Add** (FR-003, FR-004); row **Edit** opens Edit organization without **Subdomain** (FR-006).

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Organizations "Hope Missions", "Grace Clinics", and "Mercy Teams".
- Omar is Org Admin of "Hope Missions" and "Grace Clinics", with "Hope Missions" selected in the menu bar.
- Tara is a Trip Leader in "Hope Missions" and not an Org Admin anywhere.
- Sam is a System Admin.

### US-93.1 — Org Admins open Organizations from the menu bar

#### Scenario: The menu bar shows Organizations to Org Admins
* **When** Omar signs in
* **Then** the menu bar shows **Organizations**
* **And** for Tara the menu bar has no **Organizations**, and opening `/organizations` takes her to Home

#### Scenario: Org Admins see only their selected organization
* **When** Omar opens **Organizations**
* **Then** the table lists only "Hope Missions" and there is no **Add** button
* **And** after Omar selects "Grace Clinics" in the menu bar the table lists only "Grace Clinics"
* **And** "Mercy Teams" is never listed

#### Scenario: System Admins still see every organization
* **When** Sam opens **Organizations**
* **Then** the table lists "Grace Clinics", "Hope Missions", and "Mercy Teams" and shows **Add**

### US-93.2 — Org Admins edit only their own organization

#### Scenario: An Org Admin edits their organization
* **When** Omar clicks **Edit** on "Hope Missions", changes **Email** to "office@hopemissions.org", and saves
* **Then** "Organization updated." shows and the row shows "office@hopemissions.org"
* **And** the dialog has no **Subdomain** field

#### Scenario: The API refuses other organizations
* **When** Omar updates "Mercy Teams" through the API
* **Then** the response is `403` "Forbidden." and "Mercy Teams" is unchanged
* **And** when Omar updates "Hope Missions" with a new email and a `subdomain`, the email is saved and the subdomain is unchanged
* **And** when Omar creates an organization through the API the response is `403`

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-93.1 | The menu bar shows Organizations to Org Admins | `frontend/tests/OrgAdminOrganizations.test.js` | `The menu bar shows Organizations to Org Admins` |
| US-93.1 | The menu bar shows Organizations to Org Admins | `frontend/tests/OrgAdminOrganizations.test.js` | `Non Org Admins are sent home from Organizations` |
| US-93.1 | Org Admins see only their selected organization | `frontend/tests/OrgAdminOrganizations.test.js` | `Org Admins see only their selected organization` |
| US-93.1 | Org Admins see only their selected organization | `backend/tests/org-admin-edit-organization.test.js` | `Org Admins list only their organizations` |
| US-93.1 | System Admins still see every organization | `frontend/tests/OrgAdminOrganizations.test.js` | `System Admins still see every organization` |
| US-93.2 | An Org Admin edits their organization | `frontend/tests/OrgAdminOrganizations.test.js` | `An Org Admin edits their organization` |
| US-93.2 | The API refuses other organizations | `backend/tests/org-admin-edit-organization.test.js` | `The API refuses other organizations` |

---

## Agent implementation request

```text
Implement Feature 93 from @features/feature-93-org-admin-edit-organization.md on branch `feature/93-org-admin-edit-organization`.

Frontend only: MenuBar.vue — show Organizations when user.isAdmin || showOrgAdminNav. router.js — let Org Admins open "organizations" (move it into the workerRoles / emailPictures / documentTypes Org Admin guard). OrganizationsList.vue — for non–System Admins keep only the organization whose id is Utils.effectiveOrgId(user) (and reload when the acting/selected organization changes, as WorkerRolesList does); show Add only to System Admins. EditOrganizationDialog already hides Subdomain for non–System Admins.
Backend: no code change; add tests per the Test Coverage Map for the existing list scope and update rules.
Update features/reference/behavior.md (Organizations page access) and api.md only if wording about who may list/update changes.
```

---

## Definition of Done

*   [x] Menu and route access per **FR-001** / **FR-002**
*   [x] Org Admin list per **FR-003** / **FR-004**, System Admin unchanged per **FR-005**
*   [x] Editing per **FR-006**, API rules covered per **FR-007**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Org Admins creating or deleting organizations
- Org Admins changing the subdomain
- Changing which organizations the menu bar selector offers
- The Home organization heading **Edit** (unchanged)
