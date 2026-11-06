# Approve Action Colors

**Feature ID:** 122
**Branch pattern:** `feature/122-approve-action-colors`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** "Update Trip View that shows the Approve button as green for anyone that is Approved and as Orange for anyone that has passed all the tests for approval but is not yet approved." — then: "The 'every profile document has a file' rule should be only the documents required for the trip." — then: "On the approve app button click the Approve App dialog should display missing profile, application, and document list for the app and not allow approval if items are missing." — then: "On the Approve Dialog add an Override Approve that changes status to approve without the checks."

On the trip page (Trip View) each participant row has an application action: **Approve App** for Pre-Approved applications, **View App** for Approved and Cancelled, **Preview App** otherwise. Today it is always the default color, so staff must open each Pre-Approved application to learn whether it can be approved. This feature colors that action: **green** when the person is Approved, **orange** when the application is Pre-Approved and approving it would succeed now (the approval checklist passes). It also narrows the document file rule to the trip's documents: a document on the person's profile that the trip doesn't require no longer needs a file for approval, the missing-items checklist, or My Trips next actions. Approval then checks the whole application: the **Approve App** dialog lists missing profile items, missing application items, and document blockers, and approval is refused while any are missing — unless staff use **Override Approve**, which approves without the checks after a confirmation.

## Clarifications

### Session 2026-11-06

- Q: Which documents must have a file? → A: Only the documents the trip requires of the participant (worker role documents, Passport when required, Doctor Permission when required). "A file for every profile document" is removed everywhere it was checked.
- Q: Which spec holds the change? → A: This one (Feature 122).
- Q: Does the server enforce the profile and application checks, and does the orange color use them? → A: Yes to both. Approving is refused when anything is missing; `readyToApprove` uses the same full check. Trip Leader rows stay exempt.
- Q: Who can use **Override Approve**? → A: Anyone who can already approve the application.
- Q: Confirmation? → A: Yes — "Approve without the missing items?" with Confirm / Cancel.
- Q: Is an override recorded? → A: No; the status simply becomes Approved.
- Q: When is **Override Approve** shown? → A: Only when items are missing (when **Approve App** is disabled).

**Depends on:**
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md) (application statuses, Trip View participant list)
- [Feature 104 — Pre-Approved and Document Review](feature-104-pre-approved-document-review.md) (**Approve App**, approval documents check)
- [Feature 120 — Updated Document Processing](feature-120-updated-document-processing.md) (current document per requirement; `documentsReviewed` / `documentsToReview` on the status endpoint and the colored **Review documents** action)

---

## User Stories

### US-122.1: See who is approved and who is ready to approve

**As** a Trip Leader or Org Admin on the trip page
**I want** the application action to be green for Approved people and orange for Pre-Approved people who pass every approval check
**So that** I can see at a glance whom I can approve now without opening each application

**Priority:** P2
**Independent test:** A trip with one Approved participant, one Pre-Approved participant whose required documents are uploaded, qualifying, and reviewed, and one Pre-Approved participant missing a review: the actions are green **View App**, orange **Approve App**, and default **Approve App**.
**Acceptance scenarios:** see ### US-122.1 under Acceptance Criteria

### US-122.2: Only the trip's documents count for approval

**As** a Trip Leader or Org Admin
**I want** approval to check only the documents the trip requires
**So that** an unrelated profile document without a file doesn't block an otherwise ready participant

**Priority:** P2
**Independent test:** Pre-Approved participant with every trip document uploaded and Reviewed plus a Background check (not required by the trip) without a file: no approval blockers, `readyToApprove` true, **Approve** succeeds.
**Acceptance scenarios:** see ### US-122.2 under Acceptance Criteria

### US-122.3: Approval needs a complete profile and application

**As** a Trip Leader or Org Admin approving an application
**I want** the **Approve App** dialog to list everything still missing — profile items, application items, and documents — and approval to be refused until they are done
**So that** I only approve people whose information is complete

**Priority:** P2
**Independent test:** Pre-Approved participant with every trip document Reviewed but no emergency contact relationship and no funding choice: the dialog lists "Emergency contact relationship" under the profile and "Funding (self-fund and/or raise funds)" under the application, **Approve App** is disabled, approving through the API returns 400, and `readyToApprove` is false.
**Acceptance scenarios:** see ### US-122.3 under Acceptance Criteria

### US-122.4: Override the approval checks

**As** a Trip Leader or Org Admin
**I want** an **Override Approve** action on the **Approve App** dialog when items are missing
**So that** I can approve someone I've decided to accept anyway

**Priority:** P2
**Independent test:** Pre-Approved participant with missing items: **Override Approve** asks "Approve without the missing items?"; confirming approves the application.
**Acceptance scenarios:** see ### US-122.4 under Acceptance Criteria

---

## Requirements

### Functional Requirements

- **FR-001**: `GET /trips/trips/:id/status` adds `readyToApprove` (boolean) to each participant: `true` when the row's status is `pre_approved` and approving it now would pass the approval checklist (FR-007) — the same check `PUT /trips/trip-people-roles/:id` runs when setting `approved`. Otherwise `false`.
- **FR-002**: On the Trip View participant list, the application action (**Approve App** / **View App** / **Preview App**) is colored:
  - **green** (`success`) when the row's status is `approved` (Trip Participant or Trip Leader);
  - **orange** (`warning`) when `readyToApprove` is `true`;
  - the default color otherwise (Incomplete, Pre-Approved not ready, Declined, Cancelled).
- **FR-003**: The color follows the data: after **Approve App** approves a row, or a document is marked Reviewed or un-Reviewed, the participant list reload shows the new color. Label, icon, tooltip, and behavior of the action are unchanged.

#### Trip documents only

- **FR-004**: Approval (`PUT /trips/trip-people-roles/:id` to `approved`, the **Approve App** blocker list, `GET /trips/trip-people-roles/:id/document-review` `approvalBlockers`, and FR-001) no longer requires every person document to have a file. Only the trip's document requirements count (each current document uploaded, qualifying, and Reviewed), so the "A file for every profile document" blocker is removed. The document-review response no longer has `allDocumentsHaveFiles`, and **Review documents** no longer shows "Some profile documents have no file."
- **FR-005**: The trip status `missingItems` (trip page **Missing items**) no longer lists "Upload a file for every profile document".
- **FR-006**: My Trips next actions (`upload-documents` `missingDocuments`) no longer list "A file for every profile document".

#### Approval checklist

- **FR-007**: The approval checklist for a non–Trip Leader row has three lists; Trip Leader rows have none:
  - **profile** — missing profile fields (Feature 112 labels, e.g. "Emergency contact relationship");
  - **application** — missing application items (Feature 28 labels such as "Trip role", "Funding (self-fund and/or raise funds)", "Flight purchase option", "Pregnancy question", "Participant agreement"), without "Profile is not complete" and without document items;
  - **documents** — the approval document blockers (Feature 104 / 120, as narrowed by FR-004).
- **FR-008**: `PUT /trips/trip-people-roles/:id` setting `approved` on a row that isn't already approved, and `POST /trips/trip-people-roles` with status `approved`, are refused with 400 when the checklist isn't empty: "Complete the profile and application before approving." when a profile or application item is missing, otherwise "Upload and review all required documents before approving."
- **FR-009**: `GET /trips/trip-people-roles/:id/document-review` adds `profileMissing` and `applicationMissing` (string arrays) next to `approvalBlockers`.
- **FR-010**: The **Approve App** dialog shows, above the application, one alert per non-empty list: "Before approving, the profile needs:", "Before approving, the application needs:", and the existing "Before approving, these documents need to be uploaded and reviewed:", each with a bulleted list. **Approve App** is disabled while any list has items.

#### Override

- **FR-011**: When any checklist item is missing, the **Approve App** dialog also shows **Override Approve** (orange, tonal). It asks "Approve without the missing items?" (**Override Approve** / Cancel); confirming sends `PUT /trips/trip-people-roles/:id` with `status: "approved"` and `overrideApprovalChecks: true`, then closes like **Approve App** ("Application approved.").
- **FR-012**: `PUT /trips/trip-people-roles/:id` with `overrideApprovalChecks: true` skips the FR-008 checklist; every other rule (access, version, active trip role) still applies. The flag isn't stored, and nothing records that the approval was an override.

---

## Assumptions

- "Passed all the tests for approval" means the approval checklist (FR-007). A Pre-Approved application can still have gaps — staff can set the status by hand, and a profile can change after submission — so profile and application are checked too.
- Adding a participant directly as Approved (Add Participant) runs the same checklist and has no override; staff add them as Pre-Approved and use **Override Approve** instead.
- Only Pre-Approved rows can turn orange: **Approve App** is offered only for them.
- Approved Trip Leaders are green like Approved participants.

## Edge Cases

- Pre-Approved participant whose role requires no documents and trip requires no Passport → approval passes → orange.
- Pre-Approved Trip Leader row → no document check → orange.
- Document uploaded but not reviewed, or expired for the trip → default color (the **Review documents** action shows orange / not green per Feature 120).
- Approved row whose documents later lapse → still green (it is Approved).
- Cancelled → default **View App**.
- Profile document the trip doesn't require, without a file → ignored by approval, missing items, and next actions.
- Trip-required document without a file → still blocks ("<requirement>: not uploaded"), as it can't qualify.
- Profile or application gap with every document Reviewed → default color, **Approve App** disabled, **Override Approve** shown.
- Nothing missing → no checklist alerts, **Approve App** enabled, no **Override Approve**.
- Pre-Approved Trip Leader row with gaps → no checklist, **Approve App** enabled.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change: the status endpoint keeps its existing access rules (Trip Leader of the trip, Org Admin of its organization, System Admin).

---

## Key Entities

- No new entities or fields. Reads `tripPeopleRole.status` and application answers, the person's profile, the trip role, and the approval documents check.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/trips/:id/status` | Each participant adds `readyToApprove` (FR-001); `missingItems` drops "Upload a file for every profile document" (FR-005) |
| `PUT` | `/trips/trip-people-roles/:id` | Approval no longer needs a file on profile documents the trip doesn't require (FR-004); refused while the checklist has items (FR-008) unless `overrideApprovalChecks: true` (FR-012) |
| `POST` | `/trips/trip-people-roles` | Creating as `approved` is refused while the checklist has items (FR-008) |
| `GET` | `/trips/trip-people-roles/:id/document-review` | No "A file for every profile document" blocker; `allDocumentsHaveFiles` removed (FR-004); adds `profileMissing` and `applicationMissing` (FR-009) |
| `GET` | `/trips/trips/browse/mine` | `upload-documents` `missingDocuments` drops "A file for every profile document" (FR-006) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `TripView` participant list | Application action green when Approved, orange when `readyToApprove`, default otherwise (FR-002) |
| `ReviewDocumentsDialog` | No "Some profile documents have no file." note (FR-004) |
| `ViewTripApplicationDialog` (approve mode) | Profile, application, and document alerts; **Approve App** disabled while any are missing (FR-010); **Override Approve** with confirmation when items are missing (FR-011) |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background for all scenarios: Hope Missions trip "Guatemala Clinic" requires a Passport. Its Nurse role requires an RN License. Lena Ruiz is its Trip Leader (Approved) and is signed in on the trip page.

### US-122.1 — See who is approved and who is ready to approve

#### Scenario: The status endpoint says who is ready to approve
* **Given** Pat Lee is a Pre-Approved Nurse whose current Passport and RN License are uploaded, good for the trip, and Reviewed
* **And** Kim Diaz is a Pre-Approved Nurse whose RN License is uploaded but not Reviewed
* **And** Ava Cruz is an Approved Nurse
* **When** the trip page loads the trip status
* **Then** Pat has `readyToApprove` `true`, Kim `false`, and Ava `false`

#### Scenario: Marking the last document Reviewed makes the application ready
* **Given** Kim's RN License is not Reviewed
* **When** Lena marks it Reviewed
* **Then** the trip status gives Kim `readyToApprove` `true`

#### Scenario: Trip Leader rows need no documents to be ready
* **Given** Ray Ortiz has a Pre-Approved Trip Leader row and no documents
* **Then** the trip status gives Ray `readyToApprove` `true`

#### Scenario: Approve App is orange when ready and View App is green when Approved
* **Given** the trip status above
* **Then** Ava's **View App** action is green
* **And** Pat's **Approve App** action is orange
* **And** Kim's **Approve App** action and an Incomplete participant's **Preview App** action have the default color

### US-122.2 — Only the trip's documents count for approval

#### Scenario: A profile document the trip doesn't require doesn't block approval
* **Given** Pat is a Pre-Approved Nurse whose current Passport and RN License are uploaded, good for the trip, and Reviewed
* **And** Pat also has a Background check document (not required by the trip) with no file
* **Then** Pat's document review has no approval blockers and the trip status gives Pat `readyToApprove` `true` and no "every profile document" missing item
* **And** Lena can approve Pat's application

### US-122.3 — Approval needs a complete profile and application

#### Scenario: Document review lists missing profile and application items
* **Given** Sam Reyes is a Pre-Approved Nurse whose Passport and RN License are Reviewed
* **And** Sam's profile has no emergency contact relationship and Sam's application has no funding choice
* **When** Lena opens Sam's document review
* **Then** `profileMissing` is ["Emergency contact relationship"], `applicationMissing` is ["Funding (self-fund and/or raise funds)"], and `approvalBlockers` is empty

#### Scenario: An incomplete profile or application blocks approval and the orange color
* **Given** Sam is a Pre-Approved Nurse with an incomplete profile and application and Reviewed documents
* **Then** the trip status gives Sam `readyToApprove` `false`
* **And** approving Sam is refused with "Complete the profile and application before approving." and Sam stays Pre-Approved

#### Scenario: Trip Leader rows are approved without the checklist
* **Given** Ray has a Pre-Approved Trip Leader row with an incomplete profile and application
* **Then** Ray's document review has empty `profileMissing` and `applicationMissing`
* **And** Lena can approve Ray's row

#### Scenario: Approve App lists missing profile, application, and document items
* **Given** Sam's document review lists a profile item, an application item, and a document blocker
* **When** Lena opens **Approve App** for Sam
* **Then** the dialog shows "Before approving, the profile needs:", "Before approving, the application needs:", and "Before approving, these documents need to be uploaded and reviewed:", each with its bulleted items
* **And** **Approve App** is disabled

#### Scenario: A missing profile item alone disables Approve App
* **Given** Sam's document review lists only a missing profile item
* **When** Lena opens **Approve App** for Sam
* **Then** only the profile alert is shown and **Approve App** is disabled

#### Scenario: Nothing missing enables Approve App
* **Given** Pat's document review lists nothing missing
* **When** Lena opens **Approve App** for Pat
* **Then** no checklist alert is shown, **Approve App** is enabled, and **Override Approve** isn't shown

### US-122.4 — Override the approval checks

#### Scenario: Override Approve approves an application with missing items
* **Given** Sam is a Pre-Approved Nurse with an incomplete profile and application and no documents
* **When** Lena approves Sam with `overrideApprovalChecks: true`
* **Then** Sam's application is Approved

#### Scenario: Override Approve asks first, then approves without the checks
* **Given** Sam's document review lists a missing profile item
* **When** Lena opens **Approve App** for Sam and clicks **Override Approve**
* **Then** she is asked "Approve without the missing items?" and nothing is saved yet
* **When** she confirms
* **Then** the application is saved as Approved with `overrideApprovalChecks: true` and the dialog reports "Application approved."

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-122.1 | The status endpoint says who is ready to approve | `backend/tests/approve-action-colors.test.js` | `The status endpoint says who is ready to approve` |
| US-122.1 | Marking the last document Reviewed makes the application ready | `backend/tests/approve-action-colors.test.js` | `Marking the last document Reviewed makes the application ready` |
| US-122.1 | Trip Leader rows need no documents to be ready | `backend/tests/approve-action-colors.test.js` | `Trip Leader rows need no documents to be ready` |
| US-122.1 | Approve App is orange when ready and View App is green when Approved | `frontend/tests/TripView.test.js` | `Approve App is orange when ready and View App is green when Approved` |
| US-122.2 | A profile document the trip doesn't require doesn't block approval | `backend/tests/approve-action-colors.test.js` | `A profile document the trip doesn't require doesn't block approval` |
| US-122.3 | Document review lists missing profile and application items | `backend/tests/approve-action-colors.test.js` | `Document review lists missing profile and application items` |
| US-122.3 | An incomplete profile or application blocks approval and the orange color | `backend/tests/approve-action-colors.test.js` | `An incomplete profile or application blocks approval and the orange color` |
| US-122.3 | Trip Leader rows are approved without the checklist | `backend/tests/approve-action-colors.test.js` | `Trip Leader rows are approved without the checklist` |
| US-122.3 | Approve App lists missing profile, application, and document items | `frontend/tests/ApproveAppChecklist.test.js` | `Approve App lists missing profile, application, and document items` |
| US-122.3 | A missing profile item alone disables Approve App | `frontend/tests/ApproveAppChecklist.test.js` | `A missing profile item alone disables Approve App` |
| US-122.3 | Nothing missing enables Approve App | `frontend/tests/ApproveAppChecklist.test.js` | `Nothing missing enables Approve App` |
| US-122.4 | Override Approve approves an application with missing items | `backend/tests/approve-action-colors.test.js` | `Override Approve approves an application with missing items` |
| US-122.4 | Override Approve asks first, then approves without the checks | `frontend/tests/ApproveAppChecklist.test.js` | `Override Approve asks first, then approves without the checks` |

Existing tests that relied on "A file for every profile document" are updated: My Trips next actions (FR-006), and `applications.test.js` `Approval waits until all documents are uploaded` now makes the Passport a trip requirement (FR-004). Fixtures that approve participants (event emails, roster, agent role, donations, flights, rooming) now give them a complete profile, a trip role, and complete application answers (FR-008), using the `completePersonProfile`, `createTripWorkerRole`, and `COMPLETE_APPLICATION` test helpers.

---

## Agent implementation request

```text
Implement Feature 122 from @features/feature-122-approve-action-colors.md on branch `feature/122-approve-action-colors`.

Backend:
- trip.controller findStatus: add readyToApprove per participant (status pre_approved and no approval blockers from loadApprovalDocuments; Trip Leader rows need no documents — share the rule with tripPeopleRole.controller approvalDocumentsBlocked).
Frontend:
- TripView: map readyToApprove onto items; color the application RowAction success when approved, warning when readyToApprove (FR-002).
- Remove the "A file for every profile document" check (approvalDocuments, applicationMissingItems, myTripNextActions, ReviewDocumentsDialog note) per FR-004 – FR-006.
Tests per the Test Coverage Map. Update features/reference/ (behavior.md Trip View / document review / approval / next actions rows, api.md status, document-review, and browse/mine rows).
```

---

## Definition of Done

*   [x] `readyToApprove` per **FR-001**
*   [x] Action colors per **FR-002** – **FR-003**
*   [x] Trip documents only per **FR-004** – **FR-006**
*   [x] Approval checklist per **FR-007** – **FR-010**
*   [x] Override per **FR-011** – **FR-012**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Recording or reporting overrides (who overrode and when).
- An override on Add Participant, or anywhere other than the **Approve App** dialog.
- Coloring any other row action, or changing labels, icons, or tooltips.
- Bulk approve.
