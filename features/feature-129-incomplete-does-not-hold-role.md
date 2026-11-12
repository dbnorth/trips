# Feature: Incomplete Application Does Not Hold a Role

**Feature ID:** 129
**Branch pattern:** `feature/129-incomplete-does-not-hold-role`
**Status:** Implemented
**Created:** 2026-11-11
**Input:** When **Save Incomplete Application** is showing, warn that saving does not secure the role. When **Submit Application** is showing, say that submitting holds the role pending document review. An Incomplete application no longer takes a role spot; submitting (Pre-Approved) is what holds it.
**Depends on:** [Feature 13 — Public Apply to the application page](feature-13-public-apply-to-application-page.md), [Feature 26 — Role capacity and cancel](feature-26-role-capacity-and-cancel.md), [Feature 56 — Reserved role emails](feature-56-reserved-role-emails.md), [Feature 104 — Pre-Approved document review](feature-104-pre-approved-document-review.md)

Today **Save Incomplete Application** and **Submit Application** only describe what the button does. An Incomplete application also takes a role spot, the same as Pre-Approved and Approved, so saving an incomplete application already holds the role. This feature tells the participant what each button means for their role, and changes the spot rule so only a submitted application holds it.

## Clarifications

- Q: Does an Incomplete application take a role spot? → A: No. Only **Pre-Approved** and **Approved** do. This replaces the Feature 26 rule that Incomplete takes a spot.
- Q: Where do the notices show? → A: The **Apply for trip** / **Update application** dialog, and the **Update application** page (the page public Apply opens). Same buttons, same notices.
- Q: What about **Update Application**? → A: Neither notice. That button means the application is already Pre-Approved, so the role is already held.
- Q: What is the exact wording? → A: The sentences below. Spelling and grammar only: "Complete", "application", "Submitting", and "pending review".
- Q: Where do the warning and the notice sit? → A: In the non-scrolling space directly above the buttons. The questions scroll. The alerts stay put with the buttons.
- Q: What happens when **Save Incomplete Application** is clicked? → A: A dialog says "Your application data will be saved, but a role on the trip has not yet been secured." and has an **OK** button. Nothing is saved until **OK**. **OK** saves, then closes that dialog and the application dialog. On the **Update application** page, **OK** saves and leaves the page for Home, as a successful save does today.
- Q: What does the profile documents note say? → A: "All documents for your trips must be uploaded 90 days before the trip starts. You can submit an application and secure a role on the trip without uploading the documents required for the trip." Spelling only: "without" and "documents", and a period at the end.
- Q: Where does My Trip say the role is not secured? → A: On **My Trip Info**, on the line under "Complete missing information on your application and profile so you can submit your application." The line is "You do not have a role secured on this trip. Complete the application and profile required fields and submit the application." Spelling only: "application", and a period at the end. It does not show on Home, or when only the application or only the profile is missing.

---

## User Stories

### US-129.1: The application says whether the role is held

**As** a participant
**I want** the application to say whether saving or submitting holds my role
**So that** I know an incomplete application does not secure it

**Priority:** P1
**Independent test:** Open **Apply for trip** with something missing and read the warning above **Save Incomplete Application**. Complete the profile and application and read the notice above **Submit Application**. Open a Pre-Approved application and see neither notice above **Update Application**.
**Acceptance scenarios:** see ### US-129.1

### US-129.2: Only a submitted application holds a role spot

**As** a participant
**I want** my role spot to be held when I submit, not when I save an incomplete application
**So that** someone else can take the role until I submit

**Priority:** P1
**Independent test:** Two people save incomplete applications on a role that needs one person. **Available** stays 1. The first to submit becomes Pre-Approved and **Available** becomes 0. The second submit is refused and stays Incomplete.
**Acceptance scenarios:** see ### US-129.2

---

## Requirements

### Functional Requirements

- **FR-001**: When the primary button reads **Save Incomplete Application**, the **Apply for trip** / **Update application** dialog and the **Update application** page show a warning alert in the non-scrolling space directly above the buttons: "Saving an Incomplete application does not secure your role on the trip. Complete the application and required profile fields to be able to submit the application which will secure the role." Scrolling the questions does not move it. When the "what's still needed" box is showing, it stays in that same non-scrolling space, above this warning. The warning also shows on a first application, when that box is hidden. The profile warning inside the form stays as it is.
- **FR-002**: When the primary button reads **Submit Application**, both surfaces show an info alert in that same non-scrolling space: "Submitting the application will hold your role on the trip pending review of your documents once they are uploaded."
- **FR-003**: Neither alert shows when the primary button reads **Update Application** (enabled or disabled), when that button is hidden, or when the dialog only offers **OK** because there is no spot.
- **FR-009**: Clicking **Save Incomplete Application** opens a dialog and does not save yet. The dialog reads "Your application data will be saved, but a role on the trip has not yet been secured." Its only button is **OK**. **OK** saves the application, then closes this dialog and the **Apply for trip** / **Update application** dialog. On the **Update application** page, **OK** saves and then goes to Home. **Submit Application** and **Update Application** do not open this dialog. If the save is refused, this dialog closes, the application stays open, and the existing error is shown.
- **FR-010**: On the signed-in person's own Profile, the trip documents note reads "All documents for your trips must be uploaded 90 days before the trip starts. You can submit an application and secure a role on the trip without uploading the documents required for the trip." It is not shown when staff edit someone else's profile. The trip list under it is unchanged.
- **FR-011**: On **My Trip Info**, when the next step reads "Complete missing information on your application and profile so you can submit your application.", the next line is "You do not have a role secured on this trip. Complete the application and profile required fields and submit the application." It is not shown on Home, and not when that next step names only the application or only the profile.
- **FR-004**: A role spot is taken only by a **Pre-Approved** or **Approved** application on that role. **Incomplete**, **Declined**, and **Cancelled** do not take a spot. **Signed up**, **Positions Filled**, **Available**, whether a reservation is filled, and whether a role can be removed all use this set. **Available** stays Number Needed − Signed up − Reserved, floored at 0. Unfilled reservations are unchanged.
- **FR-005**: Saving an application that stays **Incomplete** does not need an open spot and does not change **Signed up** or **Available**. Another person can save an Incomplete application on that role while a spot is still open. Choosing a different role whose **Available** is 0 is still refused with "That trip role has no available positions." unless the person holds a reservation for that role.
- **FR-006**: A save that makes an application **Pre-Approved** takes a spot at that moment. When **Available** is 0 and the person has no reservation for the role, the save is refused with "That trip role has no available positions." and the application stays as it was. This includes **Submit Application** on a role the person is already in. An application that is already **Pre-Approved** or **Approved** already holds its spot; saving it again without leaving the role does not need another spot.
- **FR-007**: **Uncancel** that returns **Incomplete** succeeds even when **Available** is 0. **Uncancel** that returns **Pre-Approved** is still refused with "This role is full. Uncancel is not available." when **Available** is 0 and the person has no reservation for that role.
- **FR-008**: A role can be removed when nobody **Pre-Approved** or **Approved** is in it. **Incomplete** applications do not block removal. The refusal stays "People have signed up for this role. Move or cancel them before removing it." Removing the role clears it on the remaining Incomplete, Declined, and Cancelled applications, as Declined and Cancelled are cleared today.

---

## Assumptions

- "Secures" and "holds" the role mean the application takes a spot under **FR-004**. No new status is added. Submitting a complete application still becomes **Pre-Approved** without checking documents. Documents are still required before staff can approve.
- **Update Application** means the application is already **Pre-Approved** (Feature 104 and Feature 121). The disabled **Update Application** on an active trip is unchanged.
- The spot rule applies to every application on a trip role, Trip Participant and Trip Leader.
- An Incomplete application for the person named on a reservation does not fill that reservation. The reservation keeps holding the spot until that person's application is **Pre-Approved** or **Approved**.
- Cancel confirmation text stays "Cancel this application? Your role slot will be freed." and "Cancel this application? The role slot will be freed."

## Edge Cases

- A role that needs one person, with two Incomplete applications → **Signed up** is 0 and **Available** is 1. The first submit becomes **Pre-Approved**, **Signed up** is 1, and **Available** is 0. The second submit is refused and stays Incomplete.
- A complete application on a role that fills before the person clicks **Submit Application** → the notice is still showing, the save is refused with "That trip role has no available positions.", and the application stays Incomplete.
- A Pre-Approved person updates the same role while **Available** is 0 → the update is saved. They already hold the spot.
- Uncancel of a cancelled application that comes back Incomplete, while the role is full of Pre-Approved people → succeeds, and **Available** does not change.
- Uncancel that would come back Pre-Approved on that full role → "This role is full. Uncancel is not available."
- A reserved person's Incomplete application → **Reserved** still counts that email, and **Signed up** does not. After they submit, **Signed up** includes them and **Reserved** no longer does.
- A role whose only applications are Incomplete → **Remove** succeeds and those applications no longer have that role.
- A Trip Master import that creates Incomplete applications → those rows do not count as signed up. The import itself is unchanged.

## Success Criteria

- **SC-001**: Both application surfaces show the warning only with **Save Incomplete Application** and the notice only with **Submit Application**, using the sentences in **FR-001** and **FR-002**.
- **SC-002**: Incomplete applications do not change **Signed up** or **Available**. A submit that is accepted does.
- **SC-003**: A submit, an uncancel to Pre-Approved, and a role removal follow **FR-006**, **FR-007**, and **FR-008**, including the existing refusal sentences.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. Who may apply, update, cancel, uncancel, and remove a role stays as it is today.

---

## Key Entities

- **TripPeopleRole** (the application): **Pre-Approved** and **Approved** take a role spot. **Incomplete** does not. No new field.
- **Trip worker role**: **Signed up** counts only applications that take a spot. **Available** is Number Needed minus that count minus unfilled reservations.

---

## API Requirements

No new endpoint and no new field. `signedUpCount` and `availableCount` on trip role lists follow **FR-004**. A refused submit or uncancel uses the existing messages in **FR-006** and **FR-007** and does not change the application.

---

## Screen Requirements

### Apply for trip / Update application dialog

The dialog title is **Apply for trip** or **Update application**. The questions scroll inside the dialog. The footer does not. The warning and the notice sit in that footer, directly above **Close** and the primary button. The "what's still needed" box stays in the footer too, above the new alert.

### Update application page

The page heading is **Update application**. The questions scroll. The warning and the notice stay in the non-scrolling space directly above **Close** and the primary button, with the "what's still needed" box above the new alert when that box is showing.

The warning is a warning alert. The submit sentence is an info alert.

### Profile documents

On the signed-in person's own Profile, the Documents section's trip list starts with "All documents for your trips must be uploaded 90 days before the trip starts. You can submit an application and secure a role on the trip without uploading the documents required for the trip."

### My Trip Info

When the next step reads "Complete missing information on your application and profile so you can submit your application.", the next line is "You do not have a role secured on this trip. Complete the application and profile required fields and submit the application."

### Role not secured

Opened by **Save Incomplete Application** on either surface. The message is "Your application data will be saved, but a role on the trip has not yet been secured." The only button is **OK**. No other button, field, or checklist changes.

---

## Data Model Requirements

No schema change. Capacity for `tripPeopleRoles.status` is **Pre-Approved** and **Approved** only.

---

## Acceptance Criteria (Gherkin)

### US-129.1 — The application says whether the role is held

#### Scenario: Saving an incomplete application warns that the role is not secured
* **Given** a trip role with an open spot
* **And** the participant's profile or application is missing something required to submit
* **When** they open **Apply for trip**
* **Then** a warning in the non-scrolling space above **Save Incomplete Application** reads "Saving an Incomplete application does not secure your role on the trip. Complete the application and required profile fields to be able to submit the application which will secure the role."
* **And** scrolling the questions leaves the warning in place above the button

#### Scenario: Save Incomplete Application confirms before it saves
* **Given** the primary button reads **Save Incomplete Application**
* **When** the participant clicks **Save Incomplete Application**
* **Then** a dialog reads "Your application data will be saved, but a role on the trip has not yet been secured."
* **And** its only button is **OK**
* **And** the application is not saved yet
* **When** the participant clicks **OK**
* **Then** the application is saved as Incomplete
* **And** the confirmation dialog and the **Apply for trip** dialog are both closed
* **Given** the same button on the **Update application** page
* **When** the participant clicks **OK**
* **Then** the application is saved as Incomplete
* **And** the confirmation dialog closes and the participant is on Home

#### Scenario: Submitting says the role will be held
* **Given** the participant's profile and application are complete
* **And** the application is not yet Pre-Approved
* **When** they open the application dialog
* **Then** an info notice in the non-scrolling space above **Submit Application** reads "Submitting the application will hold your role on the trip pending review of your documents once they are uploaded."
* **And** the incomplete-application warning is not shown

#### Scenario: An application that already holds the role has neither notice
* **Given** the participant's application is Pre-Approved and complete
* **When** they open the application dialog
* **Then** the primary button reads **Update Application**
* **And** neither the warning nor the submit notice is shown

#### Scenario: The application page shows the same notices
* **Given** the participant is on the **Update application** page
* **When** the primary button reads **Save Incomplete Application**
* **Then** the warning in the first scenario is in the non-scrolling space above that button
* **When** the primary button reads **Submit Application**
* **Then** the notice in the second scenario is in the non-scrolling space above that button
* **And** the warning is not shown

#### Scenario: The profile says documents are not required to secure a role
* **Given** the participant opens their own Profile
* **Then** the trip documents note reads "All documents for your trips must be uploaded 90 days before the trip starts. You can submit an application and secure a role on the trip without uploading the documents required for the trip."

#### Scenario: My Trip Info warns when the application and profile are both incomplete
* **Given** the participant's application is Incomplete
* **And** both the application and the profile are missing required information
* **When** they open **My Trip**
* **Then** under "Complete missing information on your application and profile so you can submit your application." **My Trip Info** shows "You do not have a role secured on this trip. Complete the application and profile required fields and submit the application."
* **And** Home's next steps do not show that line

### US-129.2 — Only a submitted application holds a role spot

#### Scenario: Incomplete applications leave the spot open
* **Given** a role that needs 1 person
* **When** two people each save an Incomplete application for that role
* **Then** **Signed up** is 0 and **Available** is 1

#### Scenario: The first submit holds the spot
* **Given** two Incomplete applications on a role that needs 1 person
* **When** the first person's application becomes complete and they submit
* **Then** that application is Pre-Approved
* **And** **Signed up** is 1 and **Available** is 0
* **When** the second person submits
* **Then** the save is refused with "That trip role has no available positions."
* **And** their application stays Incomplete

#### Scenario: Updating a held role does not need another spot
* **Given** a Pre-Approved application on a role whose **Available** is 0
* **When** the participant updates that same role
* **Then** the update is saved
* **And** the application stays Pre-Approved

#### Scenario: Uncancel holds a spot only when it comes back submitted
* **Given** a role that needs 1 person and is filled by a Pre-Approved application
* **And** a cancelled application on that role that would come back Incomplete
* **When** that cancelled application is uncancelled
* **Then** it becomes Incomplete
* **And** **Available** stays 0
* **Given** another cancelled application on that role that would come back Pre-Approved
* **When** it is uncancelled
* **Then** it is refused with "This role is full. Uncancel is not available."

#### Scenario: Only submitted applications block removing a role
* **Given** a role whose applications are all Incomplete
* **When** the role is removed
* **Then** the role is removed and those applications no longer have it
* **Given** a role with a Pre-Approved application
* **When** the role is removed
* **Then** it is refused with "People have signed up for this role. Move or cancel them before removing it."

#### Scenario: An incomplete application does not fill a reservation
* **Given** a role with one spot reserved for a person's email
* **When** that person saves an Incomplete application
* **Then** **Signed up** is 0 and **Reserved** is 1
* **When** they submit a complete application
* **Then** **Signed up** is 1 and **Reserved** is 0

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-129.1 | Saving an incomplete application warns that the role is not secured | `frontend/tests/ApplyTripDialog.test.js` | `Saving an incomplete application warns that the role is not secured` |
| US-129.1 | Save Incomplete Application confirms before it saves | `frontend/tests/ApplyTripDialog.test.js` | `Save Incomplete Application confirms before it saves` |
| US-129.1 | Save Incomplete Application confirms before it saves | `frontend/tests/EditTripApplication.test.js` | `Save Incomplete Application confirms before it saves` |
| US-129.1 | Submitting says the role will be held | `frontend/tests/ApplyTripDialog.test.js` | `Submitting says the role will be held` |
| US-129.1 | An application that already holds the role has neither notice | `frontend/tests/ApplyTripDialog.test.js` | `An application that already holds the role has neither notice` |
| US-129.1 | The application page shows the same notices | `frontend/tests/EditTripApplication.test.js` | `The application page shows the same notices` |
| US-129.1 | The profile says documents are not required to secure a role | `frontend/tests/ApplicationProfileStatusMessages.test.js` | `The profile says documents are not required to secure a role` |
| US-129.1 | My Trip Info warns when the application and profile are both incomplete | `frontend/tests/TripBrowseNextActions.test.js` | `My Trip Info warns when the application and profile are both incomplete` |
| US-129.2 | Incomplete applications leave the spot open | `backend/tests/applications.test.js` | `Incomplete applications leave the spot open` |
| US-129.2 | The first submit holds the spot | `backend/tests/applications.test.js` | `The first submit holds the spot` |
| US-129.2 | Updating a held role does not need another spot | `backend/tests/applications.test.js` | `Updating a held role does not need another spot` |
| US-129.2 | Uncancel holds a spot only when it comes back submitted | `backend/tests/applications.test.js` | `Uncancel holds a spot only when it comes back submitted` |
| US-129.2 | Only submitted applications block removing a role | `backend/tests/applications.test.js` | `Only submitted applications block removing a role` |
| US-129.2 | An incomplete application does not fill a reservation | `backend/tests/reserved-role-emails.test.js` | `An incomplete application does not fill a reservation` |

The Feature 26 test `Incomplete application occupies a role slot` expects an Incomplete application to fill the role and block the next person. That expectation changes: the next person can save an Incomplete application, and **Available** stays 1.

---

## Agent implementation request

```text
Implement Feature 129 from @features/feature-129-incomplete-does-not-hold-role.md on branch `feature/129-incomplete-does-not-hold-role`.

Show the Save Incomplete warning and the Submit notice on the Apply for trip dialog and the Update application page, in the non-scrolling space directly above the buttons. Scrolling the questions does not move them. Do not show either notice for Update Application.
Clicking Save Incomplete Application opens a dialog that says "Your application data will be saved, but a role on the trip has not yet been secured." with only OK. OK saves, then closes that dialog and the application dialog. On the Update application page, OK saves and goes to Home. Submit Application and Update Application save as they do today.
Change role capacity so only Pre-Approved and Approved applications take a spot. Incomplete applications do not. A save that becomes Pre-Approved must be refused with "That trip role has no available positions." when Available is 0 and the person has no reservation, even if they are already in that role.
Map every Gherkin scenario in the Test Coverage Map. Update the Feature 26 test that expects an Incomplete application to occupy a slot. Run `npm test` before finishing.
Update @features/reference/behavior.md and @features/reference/data-model.md in the same PR.
Update the affected @docs/user-guide/ files and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (role capacity: only `pre_approved` and `approved` occupy a slot; submit of an incomplete application checks **Available** even when the role stays the same; uncancel to incomplete does not need a spot). `features/reference/data-model.md` (the `tripPeopleRoles.status` capacity note). No API shape change.

**User guide updates:** `docs/user-guide/participant-guide.md` (saving and submitting, **Positions Filled**, the application buttons, the **OK** dialog "Your application data will be saved, but a role on the trip has not yet been secured.", the profile documents note, and the **My Trip Info** role warning). `docs/user-guide/rules.md` (who takes a spot). `docs/user-guide/trip-staff-guide.md` (**Number Signed Up**). `docs/user-guide/troubleshooting.md` (the remove-role message: Pre-Approved or Approved people; the new **OK** sentence; the profile documents note; the **My Trip Info** role warning).

---

## Definition of Done

*   [x] Notices match **FR-001**, **FR-002**, and **FR-003** on both surfaces
*   [x] The profile trip documents note includes the submit-without-documents sentence (**FR-010**)
*   [x] **My Trip Info** warns under the application-and-profile next step (**FR-011**)
*   [x] **Save Incomplete Application** confirms with **OK** before saving, then closes (**FR-009**)
*   [x] Only Pre-Approved and Approved applications take a spot (**FR-004** through **FR-008**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/129-incomplete-does-not-hold-role`; PR → `dev`

## Out of Scope

- Changing who is counted in **Participants** (Feature 127), the room list, the flight list, team email, donations, or the "all participants approved" check. Those still include Incomplete.
- Changing cancel confirmation text
- Requiring documents before submit, or changing approval
- A notice on staff **View application**
- Stopping two submits that arrive at the same moment from both being accepted
