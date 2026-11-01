# Org Admins Assign Organization Roles

**Feature ID:** 99
**Branch pattern:** `feature/99-org-admin-assign-roles`
**Status:** Implemented
**Created:** 2026-10-29
**Input:** "write a spec so org admin can add all roles except system admin to people in their org"

Today only a System Admin sees the **Organizations** section of **Edit person** (the person's organization roles, **Remove**, and the **Add Role** form), and only a System Admin can list a person's roles through the API. This feature gives Org Admins that section for the organizations they administer, so they can add any role (Org Admin, Trip Leader, Trip Participant, Pending User, Agent) to people in their organization and remove them. System Admin is not a role: it stays the **System administrator** switch, which only a System Admin sees.

## Clarifications

### Session 2026-10-29

- Q: Can Org Admins remove roles too? → A: Yes, add and remove.
- Q: Protect against an organization losing its admins? → A: Block removing the organization's last Org Admin role.
- Q: Should Org Admins see the person's roles in other organizations? → A: No, only roles in organizations they administer.

**Depends on:**
- [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md) (organization roles, **Edit person**, People page)
- [Feature 11 — People list all orgs includes admin](feature-11-people-list-all-orgs-includes-admin.md) (who appears on an organization's People page)
- [Feature 85 — Agent Role](feature-85-agent-role.md) (the Agent role)

---

## User Stories

### US-99.1: Org Admin adds roles to people in their organization

**As** an Org Admin
**I want** to add any organization role to a person in my organization from **Edit person**
**So that** I don't need a System Admin to make someone a Trip Leader, Agent, or another Org Admin

**Acceptance:** see Gherkin scenarios under US-99.1.

### US-99.2: Org Admin removes roles, keeping at least one Org Admin

**As** an Org Admin
**I want** to remove roles from people in my organization
**So that** roles stay current, without leaving the organization with no Org Admin

**Acceptance:** see Gherkin scenarios under US-99.2.

### US-99.3: Org Admins stay inside their own organizations

**As** a System Admin
**I want** Org Admins limited to their own organizations and kept away from System Admin
**So that** they can't change roles anywhere else

**Acceptance:** see Gherkin scenarios under US-99.3.

---

## Requirements

### Functional Requirements

- **FR-001**: On **Edit person**, an Org Admin sees the **Organizations** section with the same table (Organization, Role, **Remove**) and **Add Role** form as a System Admin. The table lists only the person's roles in organizations the Org Admin administers; with none it shows "No organization assignments.".
- **FR-002**: For an Org Admin, the **Add Role** form's **Organization** list holds the organizations they administer where the person already has a role (each once, by name), with none selected (as for a System Admin, so **Save** doesn't add a role unless one is chosen). **Role** lists every role in the catalog (Org Admin, Trip Leader, Trip Participant, Pending User, Agent), defaulting to Pending User as today. **Add role**, and **Save** with an organization chosen, add the role as they do for a System Admin.
- **FR-003**: `GET /trips/org-people-roles?peopleId=` is allowed for a System Admin (all rows, unchanged) and for a user who is Org Admin of at least one organization, who gets only the person's rows in organizations they administer (an empty list when there are none). Anyone else still gets `403` "Forbidden.".
- **FR-004**: `POST /trips/org-people-roles` by an Org Admin (not System Admin) of the organization also needs the person to already have a role in that organization; otherwise `403` "Forbidden." and nothing is saved. Any catalog role may be assigned. System Admin is unchanged.
- **FR-005**: An Org Admin may remove (`DELETE /trips/org-people-roles/:id`) any role in an organization they administer, including their own roles, except as limited by FR-006.
- **FR-006**: For every caller (System Admin included), removing an organization's only Org Admin role is refused with `400` "An organization must keep at least one Org Admin." and nothing changes. The same applies to `PUT /trips/org-people-roles/:id` when it would change that row's role or organization. **Edit person** shows the message in its error alert.
- **FR-007**: `PUT /trips/org-people-roles/:id` by an Org Admin (not System Admin) may not move a row to an organization they don't administer (`403` "Forbidden.").
- **FR-008**: The **System administrator** switch, and the other System Admin-only controls of **Edit person**, stay hidden from Org Admins; no API change lets an Org Admin set `isAdmin`.

---

## Assumptions

- "People in their organization" means people with at least one role in that organization, the same people the organization's People page lists.
- The role catalog has no System Admin role; System Admin is only the **System administrator** switch.
- When the person is the signed-in Org Admin, the change is saved right away, but the menu bar and other screens may show their old roles until the page is reloaded.

## Edge Cases

- Removing a person's last role in the Org Admin's organization takes them off that organization's People page; the Org Admin can no longer add roles to them there.
- An Org Admin of two organizations sees the person's rows in both and can choose either in **Organization** (only organizations where the person has a role).
- **Save** with no organization chosen in **Add Role** saves the person without adding a role.
- An Org Admin removing their own Org Admin role while another Org Admin remains succeeds; the next request is treated with their remaining roles.
- Adding a role the person already has in that organization → the dialog's existing "This person already has that role for the selected organization." message, as today.
- A System Admin with an organization selected in the menu bar is still limited to that organization, as today.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

An Org Admin reads and changes organization roles only in organizations they administer, and only for people who already belong to them (FR-003, FR-004, FR-007). Roles in other organizations are not returned to them.

---

## Key Entities

- **orgPeopleRole** (orgId, peopleId, roleId): unchanged.

---

## API Requirements

| Method | Path | Change |
|---|---|---|
| `GET` | `/trips/org-people-roles?peopleId=` | Org Admins allowed, rows limited to their organizations (FR-003) |
| `POST` | `/trips/org-people-roles` | Org Admin needs the person to be in the organization (FR-004) |
| `PUT` | `/trips/org-people-roles/:id` | Org Admin can't move a row out of their organizations (FR-007); last Org Admin kept (FR-006) |
| `DELETE` | `/trips/org-people-roles/:id` | Last Org Admin kept (FR-006) |

---

## Screen Requirements

- **Edit person**, **Organizations** section: shown to Org Admins (FR-001, FR-002); refusals shown in its error alert (FR-006).

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Organizations Hope Missions and Grace Outreach exist.
- Olivia is the only Org Admin of Hope Missions and has no role in Grace Outreach.
- Ana Lopez is a Trip Participant in Hope Missions and a Trip Leader in Grace Outreach.
- Ben Ruiz has a role only in Grace Outreach.

### US-99.1 — Org Admin adds roles to people in their organization

#### Scenario: An Org Admin lists only their organization's roles for a person
* **Given** Olivia is signed in
* **When** she lists Ana's organization roles
* **Then** she gets only Ana's Trip Participant role in Hope Missions

#### Scenario: An Org Admin sees the Organizations section for their organization
* **Given** Olivia opens **Edit person** for Ana
* **Then** the **Organizations** table shows "Hope Missions — Trip Participant" and not Grace Outreach
* **And** **Organization** offers only Hope Missions
* **And** **Role** offers Org Admin, Trip Leader, Trip Participant, Pending User, and Agent

#### Scenario: An Org Admin adds any role to a person in their organization
* **Given** Olivia is signed in
* **When** she adds each of Org Admin, Trip Leader, Pending User, and Agent to Ana in Hope Missions
* **Then** each is saved and Ana has all five roles in Hope Missions

#### Scenario: Add role saves from the dialog
* **Given** Olivia opens **Edit person** for Ana
* **When** she chooses **Organization** Hope Missions and **Role** Trip Leader and clicks **Add role**
* **Then** Ana's Trip Leader role in Hope Missions is saved and appears in the table

### US-99.2 — Org Admin removes roles, keeping at least one Org Admin

#### Scenario: An Org Admin removes a role
* **Given** Ana is a Trip Leader in Hope Missions
* **When** Olivia removes that role
* **Then** Ana is no longer a Trip Leader in Hope Missions

#### Scenario: The last Org Admin role cannot be removed
* **Given** Olivia is the only Org Admin of Hope Missions
* **When** Olivia, or a System Admin, removes Olivia's Org Admin role, or changes it to Trip Leader
* **Then** the response is `400` "An organization must keep at least one Org Admin."
* **And** Olivia is still Org Admin of Hope Missions

#### Scenario: An Org Admin role can be removed while another remains
* **Given** Olivia has made Ana an Org Admin of Hope Missions
* **When** Olivia removes her own Org Admin role
* **Then** it is removed and Ana is still Org Admin of Hope Missions

#### Scenario: A refused removal shows the message in the dialog
* **Given** Olivia opens **Edit person** for herself
* **When** she clicks **Remove** on her Org Admin role and the server answers "An organization must keep at least one Org Admin."
* **Then** the dialog shows "An organization must keep at least one Org Admin." and the role stays in the table

### US-99.3 — Org Admins stay inside their own organizations

#### Scenario: An Org Admin cannot change roles in another organization
* **Given** Olivia is signed in
* **When** she adds a role to Ana in Grace Outreach, removes Ana's Grace Outreach role, or moves Ana's Hope Missions role to Grace Outreach
* **Then** each response is `403` "Forbidden." and nothing changes

#### Scenario: An Org Admin cannot add roles to someone outside their organization
* **Given** Olivia is signed in
* **When** she adds Trip Participant to Ben in Hope Missions
* **Then** the response is `403` "Forbidden." and Ben has no role in Hope Missions

#### Scenario: People who aren't Org Admins still cannot list a person's roles
* **Given** Ana is signed in
* **When** she lists Ben's organization roles
* **Then** the response is `403` "Forbidden."

#### Scenario: An Org Admin does not see the System administrator switch
* **Given** Olivia opens **Edit person** for Ana, who has a login
* **Then** the **System administrator** switch is not shown

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-99.1 | An Org Admin lists only their organization's roles for a person | `backend/tests/org-admin-assign-roles.test.js` | `An Org Admin lists only their organization's roles for a person` |
| US-99.1 | An Org Admin sees the Organizations section for their organization | `frontend/tests/EditPersonOrgAdminRoles.test.js` | `An Org Admin sees the Organizations section for their organization` |
| US-99.1 | An Org Admin adds any role to a person in their organization | `backend/tests/org-admin-assign-roles.test.js` | `An Org Admin adds any role to a person in their organization` |
| US-99.1 | Add role saves from the dialog | `frontend/tests/EditPersonOrgAdminRoles.test.js` | `Add role saves from the dialog` |
| US-99.2 | An Org Admin removes a role | `backend/tests/org-admin-assign-roles.test.js` | `An Org Admin removes a role` |
| US-99.2 | The last Org Admin role cannot be removed | `backend/tests/org-admin-assign-roles.test.js` | `The last Org Admin role cannot be removed` |
| US-99.2 | An Org Admin role can be removed while another remains | `backend/tests/org-admin-assign-roles.test.js` | `An Org Admin role can be removed while another remains` |
| US-99.2 | A refused removal shows the message in the dialog | `frontend/tests/EditPersonOrgAdminRoles.test.js` | `A refused removal shows the message in the dialog` |
| US-99.3 | An Org Admin cannot change roles in another organization | `backend/tests/org-admin-assign-roles.test.js` | `An Org Admin cannot change roles in another organization` |
| US-99.3 | An Org Admin cannot add roles to someone outside their organization | `backend/tests/org-admin-assign-roles.test.js` | `An Org Admin cannot add roles to someone outside their organization` |
| US-99.3 | People who aren't Org Admins still cannot list a person's roles | `backend/tests/org-admin-assign-roles.test.js` | `People who aren't Org Admins still cannot list a person's roles` |
| US-99.3 | An Org Admin does not see the System administrator switch | `frontend/tests/EditPersonOrgAdminRoles.test.js` | `An Org Admin does not see the System administrator switch` |

---

## Agent implementation request

```text
Implement Feature 99 from @features/feature-99-org-admin-assign-roles.md on branch `feature/99-org-admin-assign-roles`.

Backend (orgPeopleRole.controller.js): findAll by peopleId for Org Admins limited to their organizations (FR-003); create requires the person to have a role in the org for non-System Admins (FR-004); update blocks moving to an org the Org Admin doesn't administer (FR-007); delete and update keep each organization's last Org Admin role (FR-006).
Frontend (EditPersonDialog.vue): show the Organizations section and load roles for Org Admins, with the Organization list from the shown rows (FR-001, FR-002); Save adds the selected role for Org Admins too; System administrator switch unchanged (FR-008).
Tests per the Test Coverage Map. Update features/reference/behavior.md and api.md.
```

---

## Definition of Done

*   [x] Org Admins see and use the **Organizations** section per **FR-001**, **FR-002**
*   [x] API limits and the last Org Admin rule per **FR-003**–**FR-008**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Letting Org Admins grant or remove System Admin
- Adding people to an organization they don't already belong to (Add person is unchanged)
- Trip roles (Trip Leader / Trip Participant on a trip) and the role catalog itself
- Refreshing the signed-in user's own menu and roles without a reload
