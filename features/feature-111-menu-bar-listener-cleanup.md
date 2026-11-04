# Menu Bar Stops Listening When It Closes

**Feature ID:** 111
**Branch pattern:** `feature/111-menu-bar-listener-cleanup`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "what leftover event handlers? what are they doing?" → "yes write a spec to fix it"

The top menu bar (`MenuBar.vue`) adds four window event listeners when it appears:
- `user-logged-in`
- `user-updated`
- `user-logged-out`
- `organizations-updated`

It never removes them. The app hides the menu bar on the login page (`App.vue`), so every logout removes the menu, and the next login creates a new one with its own four listeners. After several logout / login cycles in one browser tab, copies left by removed menus keep running on every event. Each copy re-reads the stored user, may re-fetch the organization's logo and name (and, for System Admins, the organization list), and re-saves the selected organization. They only ever act on the current account, so they don't show the wrong menu. But they make duplicate requests and storage writes that grow with each logout / login until the page reloads. This feature removes the menu's listeners when the menu is removed.

## Clarifications

### Session 2026-11-03

- Q: Do the leftover listeners cause wrong menu options after switching accounts? → A: No. They read the current account. The reported case was an account that really has the Org Admin role. This feature only stops the duplicate work.

**Depends on:**
- [Feature 1 — User Authentication & Sessions](feature-1-user-authentication.md) (menu bar, login / logout, `user-logged-in` / `user-logged-out` events)

---

## User Stories

### US-111.1: The menu doesn't keep working after it closes

**As** anyone who logs out and back in without reloading the page
**I want** only the menu I can see to react to login and organization changes
**So that** the app doesn't repeat requests and storage writes for menus that are gone

**Acceptance:** see Gherkin scenarios under US-111.1.

---

## Requirements

### Functional Requirements

- **FR-001**: `MenuBar.vue` registers its `user-logged-in`, `user-updated`, `user-logged-out`, and `organizations-updated` window listeners as named handlers and removes the same four in `onUnmounted`.
- **FR-002**: After the menu is removed (for example, by logging out to the login page), those events no longer run its menu refresh, organization loading, or organization saving.
- **FR-003**: The menu that is showing behaves as today:
  - on `user-logged-in` it reloads the user, the organization name / logo, the System Admin organization list, and the user's organization choices;
  - on `user-updated` it reloads the user, the organization name / logo, and the organization choices;
  - on `user-logged-out` it clears its state;
  - on `organizations-updated` it reloads the organization list and the organization name / logo.
- **FR-004**: However many times someone logs out and back in within one tab, each event runs the refresh once, for the menu that is showing.

---

## Assumptions

- Other components that add window listeners are out of scope; `App.vue` already removes its own.
- No change to which menu options each role sees.

## Edge Cases

- The menu is removed while an organization request is still loading → the request may still finish, but no later event reaches the removed menu.
- A full page reload → no listeners carry over (unchanged).

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Logging out and back in several times without reloading triggers one organization logo / name request per `user-updated` event, not one per past login.

---

## Data Ownership & Isolation

No change.

---

## Key Entities

None.

---

## API Requirements

No change.

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `MenuBar` | Removes its four window listeners when it unmounts (FR-001, FR-002); the visible menu still updates on login, user, and organization changes (FR-003) |

---

## Data Model Requirements

No change.

---

## Acceptance Criteria (Gherkin)

Background:
- Olivia is an Org Admin of "Hope Missions", whose organization has no logo stored on her sign-in, so the menu fetches its name and logo.

### US-111.1 — The menu doesn't keep working after it closes

#### Scenario: A closed menu ignores later events
* **Given** Olivia is signed in and the menu bar is showing
* **When** she logs out and the menu bar is removed
* **And** the `user-logged-in`, `user-updated`, and `organizations-updated` events fire
* **Then** the removed menu makes no organization requests and doesn't change the stored user

#### Scenario: Logging out and back in leaves one menu listening
* **Given** Olivia has logged out and back in twice without reloading the page
* **When** the `user-updated` event fires
* **Then** the organization name / logo is requested once

#### Scenario: The visible menu still updates
* **Given** the menu bar is showing for Olivia
* **When** her stored user changes to select another of her organizations and `user-updated` fires
* **Then** the menu shows that organization's name
* **When** `user-logged-out` fires
* **Then** the menu bar is cleared

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-111.1 | A closed menu ignores later events | `frontend/tests/MenuBarListeners.test.js` | `A closed menu ignores later events` |
| US-111.1 | Logging out and back in leaves one menu listening | `frontend/tests/MenuBarListeners.test.js` | `Logging out and back in leaves one menu listening` |
| US-111.1 | The visible menu still updates | `frontend/tests/MenuBarListeners.test.js` | `The visible menu still updates` |

---

## Agent implementation request

```text
Implement Feature 111 from @features/feature-111-menu-bar-listener-cleanup.md on branch `feature/111-menu-bar-listener-cleanup`.

Frontend only. In MenuBar.vue, replace the inline window listeners in onMounted with named handlers (onUserLoggedIn, onUserUpdated, onOrganizationsUpdated; clearUserState for user-logged-out), and remove all four in onUnmounted (import onUnmounted). Keep each handler's current body.
Tests per the Test Coverage Map: mount MenuBar with OrganizationServices mocked (get, getAllForMenu, getLogoUrl), dispatch the window events, and count service calls / check the shown organization name; unmount and re-mount to simulate logout / login. Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] Named handlers removed on unmount per **FR-001**, **FR-002**
*   [x] Visible menu behavior unchanged per **FR-003**
*   [x] One refresh per event after repeated logins per **FR-004**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Changing which menu options each role sees.
- Listener cleanup in other components.
- Removing jack.sprat's (or anyone's) Org Admin role.
