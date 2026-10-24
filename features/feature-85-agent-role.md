# Feature: Agent Role

**Feature ID:** 85
**Branch pattern:** `feature/85-agent-role`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "create spec for new role Agent, the are assigned to an Organization, their Home (dashboard) shows a list of trips like the Trip Admin, their only action is to have the flight icon to see flight page and add segments."

Interpreted as:
- A new organization role **Agent** (e.g. a travel agent who books the organization's flights), assigned like the other organization roles (Feature 2): a System Admin adds it to a person in **Edit person → Organizations**.
- "Trip Admin" is the **Org Admin**, whose Home shows the **Organization Trips** table (View, Status, Room list, Flights, Edit icons, Feature 81).
- Clarified:
  - An Agent's Home shows the same **Organization Trips** table (active trips that haven't ended, **Show all trips** checkbox), with only the **Flights** icon.
  - On the **Flights** page an Agent can do everything staff can: see every participant, edit **Cost** and **Comments** and **Save**, download the **Flights PDF**, and enter **Flight segments**.
  - An Agent's Home doesn't show **My Trips** or **Trips you can apply for**.

**Depends on:**
- [Feature 2 — People and Org Membership](feature-2-people-and-org-membership.md) (organization roles)
- [Feature 30 — Participant Flights](feature-30-participant-flights.md) (Flights page, flight segments)
- [Feature 81 — Row Action Icons](feature-81-row-action-icons.md) (Home **Organization Trips** icons)

---

## User Stories

### US-85.1: A System Admin makes someone an Agent
**As** a System Admin  
**I want** to give a person the **Agent** role in an organization  
**So that** they can book that organization's flights without seeing anything else

**Priority:** P1  
**Independent test:** In **Edit person → Organizations**, choose "Hope Missions" and the role **Agent**, **Add role** → the person has the Agent role in Hope Missions  
**Acceptance scenarios:** see ### US-85.1

### US-85.2: An Agent's Home lists the organization's trips
**As** an Agent  
**I want** my Home to list my organization's trips with a Flights icon  
**So that** I can go straight to the flights I need to book

**Priority:** P1  
**Independent test:** Sign in as an Agent of Hope Missions → Home shows **Organization Trips** with Hope Missions' active trips, each with only a **Flights** icon, and no My Trips or apply sections  
**Acceptance scenarios:** see ### US-85.2

### US-85.3: An Agent books flights on the Flights page
**As** an Agent  
**I want** the trip's **Flights** page with everything on it  
**So that** I can record costs and comments and enter each participant's flight segments

**Priority:** P1  
**Independent test:** As an Agent of Hope Missions, open a Hope Missions trip's Flights page, save a cost, and save flight segments for a participant → both are saved; opening another organization's trip's flights is refused  
**Acceptance scenarios:** see ### US-85.3

---

## Requirements

### Functional Requirements

**Role**

- **FR-001**: The role catalog has a role **Agent** (description "Books flights for the organization's trips"). It's added on startup when missing, so existing databases get it, and is in the seed role list.
- **FR-002**: A System Admin assigns and removes the Agent role in **Edit person → Organizations** like any other organization role (Feature 2); the **Role** list shows it. A person may be an Agent in more than one organization.
- **FR-003**: An **Agent user** is a signed-in user who isn't a System Admin, has the Agent role in at least one organization, and isn't an Org Admin of any organization. Being an Org Admin takes precedence: an Org Admin who is also an Agent keeps the Org Admin experience unchanged.

**Access**

- **FR-004**: An Agent of a trip's organization has the same access as trip staff (Feature 30) to the trip's flights:
  - the Flights board (`GET /trips/trips/:id/flights`)
  - the Flights PDF
  - saving a participant's flight cost and comments (`PUT /trips/trips/:id/flights/:tripPeopleRoleId`)
  - reading and replacing a participant's flight segments
- **FR-005**: The trips list (`GET /trips/trips`) includes the trips of every organization where the user is an Agent.
- **FR-006**: An Agent gets nothing else on a trip. Every other trip endpoint answers an Agent as it answers any user who isn't trip staff (`403` or `404`), for example:
  - trip detail
  - the Trip Status board
  - the room list
  - the participant roster
  - applications, donations, editing the trip
- **FR-007**: An Agent has no access to the flights of a trip in an organization where they aren't an Agent (`403` or `404`, as for any other user).

**Home**

- **FR-008**: An Agent user's Home shows:
  - the selected organization's name as a heading, with no **Edit** button and no **Organization trips page** link
  - the **Organization Trips** card, the same as the Org Admin's: the organization's trips sorted by start date then name, columns **Name**, **Location**, **Start**, **End**, **Status**, **Actions**. By default only active trips that haven't ended show; **Show all trips** shows the rest. The empty messages are unchanged.
  - in **Actions**, only the **Flights** icon (`mdi-airplane`, tooltip "Flights"), which opens the trip's Flights page
- **FR-009**: An Agent user's Home doesn't show:
  - the **Trips** card with **My Trips** and **Trips you can apply for**
  - the profile warning ("Please update your profile to continue.")
  - the dashboard count cards and CSV export buttons
- **FR-010**: The organization is the one selected in the menu bar. An Agent in several organizations picks it with the menu bar's **Organization** selector (shown when they have more than one); with one organization, that one is used.

**Navigation**

- **FR-011**: An Agent user can open only **Home** and a trip's **Flights** page, plus the public pages (sign-in, public trip and organization pages, donation pages). Any other app page sends them to Home. The menu bar shows only **Dashboard** for them, plus the **Organization** selector and the user menu.
- **FR-012**: On the **Flights** page, an Agent user's back button reads **Back to home** and goes to Home (others still see **Back to trips**).

---

## Assumptions

- Agents aren't also trip leaders or participants. A person who is an Agent and has a trip role gets the Agent experience (FR-003, FR-009, FR-011); give them a separate login if they need both.
- Only a System Admin assigns organization roles, as today; an Org Admin can't make someone an Agent.
- An Agent signs in with their own login, created when the System Admin adds the person with an email (Feature 2).

## Edge Cases

- An Agent in Hope Missions and Grace Church: the **Organization** selector switches between them, and Home lists the selected organization's trips.
- An Agent whose organization has no active trips that haven't ended → "No active trips that have not ended. Check “Show all trips” to include other trips."
- An Agent types the URL of the trip page, Trip Status, or the room list → sent to Home.
- An Agent of Hope Missions types the Flights URL of a Grace Church trip → the page shows the server's error and no participants.
- The Agent role is removed while they're signed in → their next request is refused, as for any role change.

## Success Criteria

- **SC-001**: An Agent can book a trip's flights (cost, comments, segments, PDF) without seeing applications, documents, medical data, donations, or other organizations' trips.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

An Agent sees, for trips of their own organizations only, what the Flights page and Flight segments dialog show:
- participant names
- who books the flight
- requested flight info and flight notes
- planned and actual arrival and departure
- cost, comments, segments

They can't read profiles, documents, medical data, applications, donations, rooming, or any other organization's trips. Enforcement is on the server (FR-004–FR-007); hiding screens (FR-008–FR-012) isn't the control.

---

## Key Entities

- **role** — new seeded row **Agent**.
- **orgPeopleRole** — unchanged; an Agent is a person with the Agent role in an organization.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| GET | `/trips/roles` | Lists **Agent** (FR-001) |
| GET | `/trips/trips` | Includes the trips of the caller's Agent organizations (FR-005) |
| GET | `/trips/trips/:id/flights` | Allowed for an Agent of the trip's organization (FR-004) |
| GET | `/trips/trips/:id/flights/pdf` | Same |
| PUT | `/trips/trips/:id/flights/:tripPeopleRoleId` | Same |
| GET / PUT | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | Same |
| All other trip endpoints | | Unchanged; an Agent is refused like any non-staff user (FR-006) |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Edit person → Organizations** (System Admin) | **Agent** in the **Role** list (FR-002) |
| **Home** | For an Agent user: organization heading, **Organization Trips** with only the **Flights** icon; no Trips (My Trips / apply) card, profile warning, or count cards (FR-008–FR-010) |
| **Flights** page | **Back to home** for an Agent user (FR-012); otherwise unchanged |
| Router | An Agent user may open only Home, Flights, and public pages (FR-011) |

---

## Data Model Requirements

| Table | Change |
|-------|--------|
| role | Seeded row `Agent` ("Books flights for the organization's trips"), added on startup when missing |

---

## Acceptance Criteria (Gherkin)

Background:
- Organizations "Hope Missions" and "Grace Church".
- Trips:
  - "Guatemala Clinic 2027": Hope Missions, active, starts in the future, with participant Ana Lopez (approved; the organization books her flight).
  - "Honduras 2025": Hope Missions, ended.
  - "Peru Build 2027": Grace Church, active.
- Alex Agent has a login and the Agent role in Hope Missions only.

### US-85.1 — A System Admin makes someone an Agent

#### Scenario: The Agent role can be given to a person in an organization
* **Given** the app has started
* **Then** the role list includes **Agent**
* **When** a System Admin gives Alex the **Agent** role in Hope Missions
* **Then** Alex has the Agent role in Hope Missions

### US-85.2 — An Agent's Home lists the organization's trips

#### Scenario: An Agent's Home lists the organization's trips with only a Flights action
* **When** Alex opens Home
* **Then** the heading is "Hope Missions" with no **Edit** button
* **And** **Organization Trips** lists "Guatemala Clinic 2027" and not "Honduras 2025" or "Peru Build 2027"
* **And** the row's only action is the **Flights** icon, which opens the trip's Flights page
* **And** with **Show all trips** checked, "Honduras 2025" is listed too

#### Scenario: An Agent's Home has no trips to apply for
* **When** Alex opens Home
* **Then** there is no **My Trips** or **Trips you can apply for** section and no profile warning

#### Scenario: An Agent can only open Home and Flights pages
* **When** Alex goes to the trip page, Trip Status, the room list, the Trips list, or People
* **Then** Alex is sent to Home
* **And** Alex can open the Flights page of "Guatemala Clinic 2027"

### US-85.3 — An Agent books flights on the Flights page

#### Scenario: An Agent books flights for the organization's trips
* **When** Alex opens the flights of "Guatemala Clinic 2027"
* **Then** Ana is listed
* **And** Alex can save Ana's cost $650 and comment "Booked on AA"
* **And** Alex can save Ana's flight segments and read them back
* **And** Alex can download the Flights PDF

#### Scenario: An Agent can't open another organization's flights
* **When** Alex opens the flights of "Peru Build 2027"
* **Then** the request is refused

#### Scenario: An Agent gets nothing else on the trip
* **When** Alex requests the trip detail, Trip Status board, or participant roster of "Guatemala Clinic 2027"
* **Then** each request is refused

#### Scenario: The Flights page sends an Agent back to Home
* **When** Alex opens the Flights page
* **Then** the back button reads **Back to home** and goes to Home

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-85.1 | The Agent role can be given to a person in an organization | `backend/tests/agent-role.test.js` | `The Agent role can be given to a person in an organization` |
| US-85.2 | An Agent's Home lists the organization's trips with only a Flights action | `frontend/tests/AgentHome.test.js` | `An Agent's Home lists the organization's trips with only a Flights action` |
| US-85.2 | An Agent's Home has no trips to apply for | `frontend/tests/AgentHome.test.js` | `An Agent's Home has no trips to apply for` |
| US-85.2 | An Agent can only open Home and Flights pages | `frontend/tests/router.test.js` | `An Agent can only open Home and Flights pages` |
| US-85.3 | An Agent books flights for the organization's trips | `backend/tests/agent-role.test.js` | `An Agent books flights for the organization's trips` |
| US-85.3 | An Agent can't open another organization's flights | `backend/tests/agent-role.test.js` | `An Agent can't open another organization's flights` |
| US-85.3 | An Agent gets nothing else on the trip | `backend/tests/agent-role.test.js` | `An Agent gets nothing else on the trip` |
| US-85.3 | The Flights page sends an Agent back to Home | `frontend/tests/TripFlights.test.js` | `The Flights page sends an Agent back to Home` |

---

## Agent implementation request

```text
Implement Feature 85 from @features/feature-85-agent-role.md on branch `feature/85-agent-role`.

Follow layer order in @features/framework.md.
Backend: seed the "Agent" role (seedRoles.js and ensureSchema when missing); ROLE_AGENT and an isAgentForOrg helper in accessControl.js; canManageTripFlights allows an Agent of the trip's org (without widening canAccessTrip); tripListFilter adds Agent org trips.
Frontend: Utils.isAgentUser (Agent role, no Org Admin, not System Admin); Home shows the Organization Trips card for Agent users with only the Flights RowAction, an org heading without Edit / public link, and hides the browse/apply card, profile warning, and count cards; canBrowseAndApplyToTrips false for Agent users; router sends Agent users to Home from every app page except home and tripFlights; TripFlightsView back button "Back to home" for Agent users.
Tests per the Test Coverage Map. Update features/reference (behavior.md, api.md, data-model.md role seed list).
```

---

## Definition of Done

*   [x] **Agent** role seeded and assignable per **FR-001**–**FR-003**
*   [x] Server access per **FR-004**–**FR-007**
*   [x] Home and navigation per **FR-008**–**FR-012**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/` (behavior, api, data-model) updated
*   [ ] PR to `dev`

## Out of Scope

- Org Admins assigning roles
- Limiting an Agent to some trips or some participants (e.g. only organization-booked flights)
- Agent access to Trip Status, the room list, the trip page, applications, documents, or donations
- Emails to Agents
- An Agent who is also a trip leader or participant getting both experiences
