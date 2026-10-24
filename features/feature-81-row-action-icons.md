# Feature: Row Action Icons with Tooltips

**Feature ID:** 81
**Branch pattern:** `feature/81-row-action-icons`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "add a spec to convert all the action links to icons with tool tip."

Clarified with the requester:
- **Action links** are the small text buttons that act on one row of a table, list, or card grid (Edit, Delete, Status, Flights, ...).
- Only row actions **on pages** change. Row buttons inside dialogs stay as text.
- Participant calls to action stay as labeled buttons: Home's **My trips** and **Trips you can apply for** buttons, the My Trips next actions, and the trip page and public page buttons.
- Page toolbar buttons (**Add trip**, **Copy**, **Email team**, **Export CSV**, **Back to trips**, ...) are unchanged.

**Depends on:**
- [Feature 3 — Organizations and Agreements](feature-3-organizations-and-agreements.md)
- [Feature 4 — Document Types and Person Documents](feature-4-document-types-and-person-documents.md)
- [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md)
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md)
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md)
- [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md)
- [Feature 10 — Email Templates](feature-10-email-templates.md)
- [Feature 17 — Organization Medical Conditions](feature-17-org-medical-conditions.md)
- [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md)
- [Feature 28 — View Trip Status](feature-28-view-trip-status.md)
- [Feature 29 — Rooming List](feature-29-rooming-list.md)
- [Feature 30 — Participant Flights](feature-30-participant-flights.md)
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md)
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md)
- [Feature 58 — Documents PDF](feature-58-participant-documents-pdf.md)
- [Feature 77 — HTML Emails, Rich Text Editor, and Picture Library](feature-77-html-email-pictures.md)
- [Feature 80 — Import Trip Master CSV](feature-80-trip-master-import.md)

---

## User Stories

### US-81.1: Row actions are icons with tooltips
**As** trip staff or an admin  
**I want** each row's actions shown as small icons that name themselves on hover  
**So that** tables stay compact and readable, especially the Trips list and the trip's participant list

**Priority:** P2  
**Independent test:** On the Trips list, a trip row shows six icons instead of "View Status Room list Flights Import Edit". Hovering the bed icon shows "Room list", and clicking it opens the Room List page as before  
**Acceptance scenarios:** see ### US-81.1

### US-81.2: Actions keep their meaning and behavior
**As** trip staff or an admin  
**I want** the icons to keep each action's color, conditions, and behavior  
**So that** nothing changes except how the actions look

**Priority:** P2  
**Independent test:** On an admin list such as Airports, Delete is a red trash icon labelled "Delete", and clicking it still asks for confirmation. On View Trip, the participant's application icon reads "Approve App" for a pending application and "View App" for an approved one  
**Acceptance scenarios:** see ### US-81.2

---

## Requirements

### Functional Requirements

- **FR-001**: Each row action listed under **Screen Requirements** shows as an icon-only button: small, text variant, with the icon from FR-003 and no visible label.
- **FR-002**: Hovering over or keyboard-focusing an icon shows a tooltip above it with the action's former label, exactly as before ("Room list", "View donations", "Documents PDF"). The icon's accessible name (`aria-label`) is the same label. A disabled icon still shows its tooltip.
- **FR-003**: Icons by action (Material Design Icons). A color is kept only where the text button had one:

  | Action | Icon | Color |
  |---|---|---|
  | View | `mdi-eye` | — |
  | Status | `mdi-clipboard-check-outline` | — |
  | Room list | `mdi-bed` | — |
  | Flights | `mdi-airplane` | — |
  | Import | `mdi-file-import` | — |
  | Edit | `mdi-pencil` | — |
  | Delete | `mdi-delete` | error |
  | Remove | `mdi-minus-circle-outline` | error |
  | View App | `mdi-file-document-outline` | — |
  | Approve App | `mdi-file-check-outline` | — |
  | Preview App | `mdi-file-eye-outline` | — |
  | Cancel | `mdi-cancel` | error |
  | Uncancel | `mdi-restore` | primary |
  | View donations | `mdi-hand-heart` | — |
  | Documents PDF | `mdi-file-pdf-box` | — |
  | Donate page | `mdi-open-in-new` | — |
  | Save | `mdi-content-save` | — |
  | Flight segments | `mdi-airplane-edit` | — |
  | Reserved emails | `mdi-email-lock` | — |
  | Rename | `mdi-rename-box` | — |

- **FR-004**: Every action keeps its order, its conditions for showing (e.g. **Import** only for trip staff, Feature 80; **Cancel** / **Uncancel** by status, Feature 26), its disabled and loading states (**Documents PDF**, Flights **Save**), and what it does when clicked, including links that open in a new tab (**Donate page**). On View Trip, the application icon and tooltip follow its current label: **View App**, **Approve App**, or **Preview App** (Feature 7).
- **FR-005**: A shared component, `RowAction`, draws one icon action: an icon, a label (used for the tooltip and `aria-label`), and the button's usual attributes (color, disabled, loading, link, click). The icons in a row sit on one line with small gaps.
- **FR-006**: Tests that found these actions by their visible text find them by their accessible name (`aria-label`) instead. The tests still cover the same behavior.

---

## Assumptions

- Staff and admins recognize common icons. The tooltip and accessible name cover the rest.
- Material Design Icons 7 (`@mdi/font`, already installed) has every icon in FR-003.

## Edge Cases

- A row with every optional action showing (a cancelled participant: **Uncancel** instead of **Cancel**, and a **Donate page** link) still fits on one line in the Actions column.
- Touch screens have no hover, so tapping an icon runs the action. Its meaning comes from the icon, and screen readers announce its accessible name.
- **Delete** and **Remove** keep their confirmations where they had them.

## Success Criteria

- **SC-001**: No in-scope row action shows a text label; each shows its tooltip and has its accessible name.
- **SC-002**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

No change. Each action keeps its existing visibility rules and API authorization.

---

## Key Entities

None. Frontend only.

---

## API Requirements

None.

---

## Screen Requirements

New component `RowAction` (`frontend/src/components/RowAction.vue`), FR-005. Row actions that change, in their current order:

| Screen | Where | Actions |
|---|---|---|
| **Trips** list (`TripsList`) | Actions column | View, Status, Room list, Flights, Import, Edit |
| **Home** (`Home`) | **Organization Trips** table | View, Status, Room list, Flights, Edit |
| **View Trip** (`TripView`) | Participants Actions column | View App / Approve App / Preview App, Cancel, Uncancel, Edit, View donations, Documents PDF, Donate page |
| **View Trip** (`TripWorkerRolesCard`) | Worker roles rows | Reserved emails, Remove |
| **Trip participants** (`TripPeopleRolesList`) | Actions column | Edit, View donations |
| **Flights** (`TripFlightsView`) | Participant rows | Save, Flight segments |
| **People** (`PeopleList`) | Actions column | Edit |
| **Organizations** (`OrganizationsList`) | Actions column | Edit |
| **Email templates** (`EmailTemplatesList`) | Actions column | Edit |
| **Worker roles** (`WorkerRolesList`) | Actions column | Edit |
| **Donations** (`DonationsList`) | Actions column | Edit |
| **Email tokens** (`EmailTokensList`) | Actions column | Edit, Delete |
| **Airports** (`AirportsList`) | Actions column | Edit, Delete |
| **Airlines** (`AirlinesList`) | Actions column | Edit, Delete |
| **Document types** (`DocumentTypesList`) | Actions column | Edit, Delete |
| **Email types** (`EmailTypesList`) | Actions column | Edit, Delete |
| **Medical conditions** (`MedicalConditionsList`) | Actions column | Edit, Delete |
| **Email pictures** (`EmailPicturesList`) | Each picture card | Rename, Delete |

Unchanged:
- **Row buttons in dialogs:** person documents (`PersonDocumentsCard`, shown in the person dialogs), participant donations, trip roles and options in Add and Edit trip, reserved emails, person organization roles, flight segments, and languages (`PersonProfileFields`).
- **Participant calls to action:**
  - Home **My trips** and **Trips you can apply for** buttons.
  - My Trips next actions (`MyTripNextActions`).
  - Trip page (`TripBrowseView`) buttons, including **Copy link**.
  - Organization trips and public trip page buttons.
- **Page toolbar buttons**, the trip arrival info buttons (`TripArrivalInfo`), the Trips list **Donor link** column, and name links.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background: Org Admin Omar runs "Hope Missions" with trip "Guatemala Clinic 2027". Ana Lopez applied and is pending, Lyle Lowry is approved, and Kris Smith is cancelled. Kris has a donor page link.

### US-81.1 — Row actions are icons with tooltips

#### Scenario: Trips list actions are icons with tooltips
* **When** Omar opens the Trips list
* **Then** the "Guatemala Clinic 2027" row's actions are icon buttons named "View", "Status", "Room list", "Flights", "Import", and "Edit", in that order, with no text labels
* **And** they use the icons `mdi-eye`, `mdi-clipboard-check-outline`, `mdi-bed`, `mdi-airplane`, `mdi-file-import`, and `mdi-pencil`
* **And** clicking "Room list" opens the trip's Room List page

#### Scenario: A row action shows its label on hover and focus
* **Given** a `RowAction` with icon `mdi-bed` and label "Room list"
* **When** it is hovered, or focused from the keyboard
* **Then** a tooltip reads "Room list"
* **And** the button's accessible name is "Room list" and it has no visible text
* **And** when it is disabled, it still has its accessible name and tooltip

#### Scenario: Organization Trips on Home uses icons
* **When** Omar opens Home
* **Then** the Organization Trips row for "Guatemala Clinic 2027" has icon buttons named "View", "Status", "Room list", "Flights", and "Edit", with no text labels

### US-81.2 — Actions keep their meaning and behavior

#### Scenario: View Trip participant actions keep their labels and colors
* **When** Omar opens View Trip for "Guatemala Clinic 2027"
* **Then** Ana's application icon is named "Approve App" (`mdi-file-check-outline`), and Lyle's is named "View App" (`mdi-file-document-outline`)
* **And** Lyle's row has a red "Cancel" icon (`mdi-cancel`), and Kris's row has an "Uncancel" icon (`mdi-restore`) instead
* **And** Kris's "Donate page" icon links to his donor page in a new tab
* **And** clicking Lyle's "Documents PDF" icon downloads his documents PDF as before

#### Scenario: Delete keeps its color and confirmation
* **Given** the Airports list has airport "GUA" (La Aurora)
* **When** a System Admin views the list
* **Then** its row has an "Edit" icon (`mdi-pencil`) and a red "Delete" icon (`mdi-delete`)
* **And** clicking "Delete" asks "Delete airport "GUA"?", as before

#### Scenario: Existing row action tests use the icon names
* **Then** the Trips list Status, Room list, Flights, and Import tests, the Flights page "Flight segments" test, the View Trip "Documents PDF" test, the Donations "Edit" test, and the Email pictures "Rename" and "Delete" tests find those actions by accessible name and still pass

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-81.1 | Trips list actions are icons with tooltips | `frontend/tests/RowActionIcons.test.js` | `Trips list actions are icons with tooltips` |
| US-81.1 | A row action shows its label on hover and focus | `frontend/tests/RowActionIcons.test.js` | `A row action shows its label on hover and focus` |
| US-81.1 | Organization Trips on Home uses icons | `frontend/tests/RowActionIcons.test.js` | `Organization Trips on Home uses icons` |
| US-81.2 | View Trip participant actions keep their labels and colors | `frontend/tests/RowActionIcons.test.js` | `View Trip participant actions keep their labels and colors` |
| US-81.2 | Delete keeps its color and confirmation | `frontend/tests/RowActionIcons.test.js` | `Delete keeps its color and confirmation` |
| US-81.2 | Existing row action tests use the icon names | `frontend/tests/TripStatus.test.js`, `TripRooming.test.js`, `TripFlights.test.js`, `ImportTripMasterDialog.test.js`, `TripView.test.js`, `DonationsList.test.js`, `EmailPicturesList.test.js` | Existing tests, updated to find actions by accessible name |

---

## Agent implementation request

```text
Implement Feature 81 from @features/feature-81-row-action-icons.md on branch `feature/81-row-action-icons`.

Frontend only. Add components/RowAction.vue (v-tooltip around an icon-only small text v-btn; label → tooltip text and aria-label; pass through color, disabled, loading, href/target/rel, click; tooltip still shows when disabled).
Replace the row actions in every screen listed under Screen Requirements with RowAction and the FR-003 icons, keeping order, v-if conditions, colors, disabled/loading states, and handlers.
Leave dialogs, participant calls to action, and page toolbars unchanged.
Update the existing tests that found these buttons by text to use aria-label; add frontend/tests/RowActionIcons.test.js.
Update features/reference/behavior.md.
```

---

## Definition of Done

*   [x] `RowAction` component per **FR-002** and **FR-005**
*   [x] Every listed row action converted per **FR-001**, **FR-003**, and **FR-004**
*   [x] Existing tests updated per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Frontend `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Row buttons inside dialogs
- Participant calls to action on Home, the trip page, My Trips next actions, and public pages
- Page toolbar buttons and the Trips list **Donor link** column
- New actions, or changes to who sees an action or what it does
- A user setting to show text labels instead of icons
