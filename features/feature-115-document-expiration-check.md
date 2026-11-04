# Document Expiration Check

**Feature ID:** 115
**Branch pattern:** `feature/115-document-expiration-check`
**Status:** Implemented
**Created:** 2026-11-03
**Input:** "add a spec to add expireation check type to document. The possible choices are 1. 90 days after trip end day 2. after trip end date.  Only ask for this value if the document has expiration date check.  Add new check for completed document  to inlcude new expiration date rule (check in application completion messages and check for trip participant missing messages and message on Trip Approval dialog and  trip approval button enable."

Today every document type with an expiration date is checked the same way: the document must expire after the trip's end date (Doctor Permission: on or after). Some documents, like passports, must stay valid for months after travel. Organizations can't require that.

This feature adds an **Expiration check** to each document type that has an expiration date: **After trip end date** (today's rule for most types), **On or after trip end date** (today's Doctor Permission rule), **90 days after trip end date**, or **180 days after trip end date**. Every type, Doctor Permission included, is checked only by its own setting. Every place that decides whether a trip document is complete uses the type's check:
- the participant's next-action messages;
- the Profile trip documents list;
- the documents missing email;
- the trip page's **Missing items**;
- the approval dialog and its **Approve App** button.

## Clarifications

### Session 2026-11-03

- Q: Where does the setting live? → A: On the document type (**Document types** page form), next to **Has Expiration Date**. It shows only while **Has Expiration Date** is ticked.
- Q: What do existing and new document types use? → A: **After trip end date**, so nothing changes until an Org Admin picks the 90-day check.
- Q: How do messages describe the 90-day check? → A: They explain it. For example, "RN License: add this document with an expiration date at least 90 days after the trip ends (06/20/2027)". **After trip end date** keeps today's wording ("…with an expiration date after 03/22/2027").
- Q: Does it apply to Doctor Permission? → A: Yes. Doctor Permission keeps its on-or-after comparison, against the date its check gives.
- Q: Show it on the **Document types** list? → A: Yes, as an **Expiration check** column.
- Q: Should every type follow its setting, with a choice for "on or after"? → A: Yes. Add **On or after trip end date**. Doctor Permission no longer has its own built-in on-or-after comparison; existing Doctor Permission types are set to **On or after trip end date** so they behave as before. This supersedes the earlier Doctor Permission answer.
- Q: Default for new types and other existing types? → A: **After trip end date**.
- Q: Is the 90-day check on or after, or after? → A: Strictly after trip end + 90 days. This supersedes the earlier "on or after" wording for the 90-day check.
- Q: Another choice? → A: Add **180 days after trip end date**, working like the 90-day check (strictly after trip end + 180 days).
- Q: A Doctor Permission type without an expiration date whose document still has one? → A: Unchanged from Feature 102. The application upload stamps the trip end date on it, and it counts for trips ending on or before that date, so a later trip needs a new one.

**Depends on:**
- [Feature 57 — Document Type Expiration Date](feature-57-document-type-expiration-date.md) (`hasExpirationDate`)
- [Feature 94 — Role Document Requirement Message](feature-94-role-document-requirement-message.md) ("what is missing" text)
- [Feature 102 — Pregnancy Doctor Permission](feature-102-pregnancy-doctor-permission.md) (Doctor Permission rule)
- [Feature 104 — Pre-Approved Document Review](feature-104-pre-approved-document-review.md) (approval blockers, **Approve App**)
- [Feature 110 — Update Trip View](feature-110-update-trip-view.md) (participants **Missing items**)
- [Feature 112 — Application and Profile Status Messages](feature-112-application-profile-status-messages.md) (next-action messages, Profile trip documents)
- [Feature 113 — Documents Missing Reminder Email](feature-113-documents-missing-email.md) (`MISSING_DOCUMENTS`, reminder recipients)

---

## User Stories

### US-115.1: Choose how a document's expiration is checked

**As** an Org Admin
**I want** to set whether a document type must expire after the trip ends or at least 90 days after it ends
**So that** documents like passports are valid long enough after travel

**Acceptance:** see Gherkin scenarios under US-115.1.

### US-115.2: See the expiration check in missing document messages

**As** a participant or trip staff
**I want** missing document messages and checks to use each document type's expiration check
**So that** I know a document that expires too soon after the trip still needs replacing

**Acceptance:** see Gherkin scenarios under US-115.2.

### US-115.3: Approve only when documents meet the expiration check

**As** trip staff approving an application
**I want** the approval dialog to list documents that don't meet their expiration check and keep **Approve App** disabled
**So that** I don't approve someone whose documents expire too soon

**Acceptance:** see Gherkin scenarios under US-115.3.

---

## Requirements

### Functional Requirements

- **FR-001**: `documentType` gains `expirationCheck`, which is `trip_end` (**After trip end date**, the default), `trip_end_on_or_after` (**On or after trip end date**), `trip_end_90` (**90 days after trip end date**), or `trip_end_180` (**180 days after trip end date**). When the column is added, existing Doctor Permission (`doctor_permission`) types with an expiration date get `trip_end_on_or_after` and every other existing type gets `trip_end`; a database that already has an older version of the column gains the new values (and the Doctor Permission update, once, if it didn't have `trip_end_on_or_after`). `POST` / `PUT /trips/document-types` accept it; any other value → `400` "Expiration check must be trip_end, trip_end_on_or_after, trip_end_90, or trip_end_180." When `hasExpirationDate` is false, `trip_end` is stored. `GET` returns it.
- **FR-002**: The document type form (`DocumentTypeFormDialog`) shows an **Expiration check** select after **Has Expiration Date**, with **After trip end date**, **On or after trip end date**, **90 days after trip end date**, and **180 days after trip end date**. It shows only while **Has Expiration Date** is ticked. New types default to **After trip end date**, and editing shows the saved value. The **Document types** list adds an **Expiration check** column showing the label, or "—" when the type has no expiration date.
- **FR-003**: A document's **check date** for a trip uses the trip's compare date (end date, or start date when there is no end date), as today. Every document type, Doctor Permission included, uses only its type's check:
  - `trip_end`: must expire **after** the compare date.
  - `trip_end_on_or_after`: must expire **on or after** the compare date.
  - `trip_end_90`: must expire **after** the compare date plus 90 days.
  - `trip_end_180`: must expire **after** the compare date plus 180 days.

  Types without an expiration date are not checked, as today. The one exception is unchanged from Feature 102: a Doctor Permission document of such a type that has an expiration date (stamped with the trip end by the application upload) counts for trips ending on or before it.
- **FR-004**: Every trip document completeness check uses FR-003 for each document's type:
  - the participant next actions (`submit-application` versus `complete-application`, and `upload-documents` with its `missingDocuments`), on Home My Trips and the trip page's **My Trip Info**;
  - the Profile trip documents list (`GET /trips/trips/browse/mine/documents`, Uploaded / Missing);
  - `MISSING_DOCUMENTS` and the **Documents missing reminder** recipients (scheduled job and **Email team**);
  - the trip page participants table's **Missing items** (`GET /trips/trips/:id/status`);
  - the approval documents check: `GET /trips/trip-people-roles/:id/document-review` (`qualifies` and `approvalBlockers`) and the `400` when changing an application to **Approved**;
  - the application's Doctor Permission check on the Apply / Update application dialog and page.
- **FR-005**: The Feature 94 "what is missing" text names the rule and the check date. The rule text is "after <MM/DD/YYYY>" for `trip_end` (today's text), "on or after <MM/DD/YYYY>" for `trip_end_on_or_after`, "after <MM/DD/YYYY> (90 days after the trip ends)" for `trip_end_90`, and "after <MM/DD/YYYY> (180 days after the trip ends)" for `trip_end_180`, used as:
  - no document of the type: "<name>: add this document with an expiration date <rule text>", followed by the specialization text as today;
  - no expiration date: "add an expiration date <rule text>";
  - expiring too soon: "the expiration date <MM/DD/YYYY> must be <rule text>".
- **FR-006**: On the approval dialog (`ViewTripApplicationDialog`), a document that doesn't meet its expiration check is listed as "<label>: not uploaded" in the approval blockers, and **Approve App** is disabled while any blocker shows (Feature 104). A document that meets the check but isn't reviewed still shows "<label>: not reviewed".

---

## Assumptions

- The 90 days are calendar days added to the trip's compare date.
- The participant documents PDF, the Room list PDF, and the person documents card show expiration dates as before. They don't check the rule.
- Passport required by the trip uses the organization's `passport` type documents' own expiration check.

## Edge Cases

- A trip with no end date → the start date is the compare date, as today; the 90 days are added to it.
- A trip with no dates → nothing is checked for expiration, as today.
- A person has two documents of a 90-day type, one expiring too soon and one late enough → the later one meets the check.
- An Org Admin switches a type from 90 days back to after trip end → checks use the trip end date from then on.
- Expires exactly on trip end + 90 days → does not meet the 90-day check; the next day does.
- Expires exactly on the trip end date → meets **On or after trip end date**, not **After trip end date**.
- A Doctor Permission type whose Org Admin later picks **After trip end date** → a Doctor Permission document expiring on the trip end no longer counts.
- A Doctor Permission type without an expiration date, and a document of it that has one → counts for trips ending on or before that date (Feature 102); the type's **Expiration check** isn't used.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: Existing document types behave exactly as before: Doctor Permission types on **On or after trip end date**, others on **After trip end date**.

---

## Data Ownership & Isolation

No new endpoints. `expirationCheck` is saved and read under the existing document type permissions (Feature 91).

---

## Key Entities

`documentType` gains `expirationCheck`.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/document-types`, `/trips/document-types/:id` | Each type includes `expirationCheck` (FR-001) |
| `POST` / `PUT` | `/trips/document-types`, `/trips/document-types/:id` | Accept `expirationCheck` (`trip_end`, `trip_end_on_or_after`, `trip_end_90`, or `trip_end_180`); `trip_end` stored when `hasExpirationDate` is false (FR-001) |
| `GET` | `/trips/trips/browse/mine`, `/trips/trips/browse/:id`, `/trips/trips/browse/mine/documents`, `/trips/trips/:id/status`, `/trips/trip-people-roles/:id/document-review` | Document checks and missing text use each type's expiration check (FR-003 – FR-005) |
| `PUT` | `/trips/trip-people-roles/:id` (to **Approved**) | The approval documents check uses each type's expiration check (FR-004) |

---

## Screen Requirements

| UI | Behavior |
|----|----------|
| `DocumentTypeFormDialog` | **Expiration check** select, shown only with **Has Expiration Date** (FR-002) |
| `DocumentTypesList` | **Expiration check** column (FR-002) |
| `MyTripNextActions`, Profile trip documents, Trip page **Missing items**, `ViewTripApplicationDialog` | Use the rule and FR-005 text; **Approve App** disabled while blockers show (FR-004 – FR-006) |

---

## Data Model Requirements

| Model | Field | Type | Notes |
|-------|-------|------|-------|
| `documentType` | `expirationCheck` | ENUM(`trip_end`, `trip_end_on_or_after`, `trip_end_90`, `trip_end_180`) | required, default `trip_end`; `ensureSchema` adds the column (or the new values to an older column) and, once, sets existing `doctor_permission` types with an expiration date to `trip_end_on_or_after` |

---

## Acceptance Criteria (Gherkin)

Background:
- Olivia is an Org Admin of "Hope Missions".
- Maria applied for "Guatemala Clinic" (03/15/2027 – 03/22/2027) as Nurse. Nurse requires "RN License", which has an expiration date.
- The trip requires a passport.
- 90 days after the trip ends is 06/20/2027.

### US-115.1 — Choose how a document's expiration is checked

#### Scenario: Expiration check shows only with an expiration date
* **Given** Olivia is adding a document type
* **When** **Has Expiration Date** is ticked
* **Then** **Expiration check** shows with **After trip end date** selected
* **And** its choices are **After trip end date**, **On or after trip end date**, **90 days after trip end date**, and **180 days after trip end date**
* **When** she unticks **Has Expiration Date**
* **Then** **Expiration check** is hidden

#### Scenario: Expiration check saved
* **When** Olivia saves "RN License" with **90 days after trip end date**
* **Then** the document type has `expirationCheck` `trip_end_90`
* **When** she saves it with **On or after trip end date**
* **Then** the document type has `expirationCheck` `trip_end_on_or_after`
* **When** she sends `expirationCheck` "next_year"
* **Then** the response is `400` "Expiration check must be trip_end, trip_end_on_or_after, trip_end_90, or trip_end_180."
* **When** she saves it with **180 days after trip end date**
* **Then** the document type has `expirationCheck` `trip_end_180`

#### Scenario: Existing and no-expiration types use after trip end date
* **Given** a document type was created without an expiration check
* **And** another document type has no expiration date and is saved with `trip_end_90`
* **Then** both have `expirationCheck` `trip_end`

#### Scenario: Document types list shows the expiration check
* **Given** "RN License" uses **90 days after trip end date** and "Diploma" has no expiration date
* **When** Olivia views **Document types**
* **Then** the **Expiration check** column shows "90 days after trip end date" for RN License and "—" for Diploma

### US-115.2 — See the expiration check in missing document messages

#### Scenario: Document expiring too soon after the trip is missing
* **Given** "RN License" uses **90 days after trip end date**
* **And** Maria's pre-approved application has her passport, and an RN License with a file expiring 05/01/2027
* **When** she loads her trips
* **Then** the `upload-documents` action lists "RN License: the expiration date 05/01/2027 must be after 06/20/2027 (90 days after the trip ends)"

#### Scenario: No document names the 90-day rule
* **Given** "RN License" uses **90 days after trip end date**
* **And** Maria has no RN License
* **When** she loads her trips
* **Then** the missing documents include "RN License: add this document with an expiration date after 06/20/2027 (90 days after the trip ends)"

#### Scenario: Document late enough meets the 90-day check
* **Given** "RN License" uses **90 days after trip end date**
* **And** Maria's RN License with a file expires 06/20/2027
* **When** she loads her trip documents
* **Then** RN License is **Missing**
* **When** the RN License expires 06/21/2027 instead
* **Then** RN License is **Uploaded**

#### Scenario: 180 days after trip end date uses trip end plus 180 days
* **Given** "RN License" uses **180 days after trip end date**
* **And** Maria's passport expires in 2035
* **And** Maria's RN License with a file expires 09/18/2027 (180 days after the trip ends)
* **When** she loads her trips
* **Then** the missing documents include "RN License: the expiration date 09/18/2027 must be after 09/18/2027 (180 days after the trip ends)"
* **When** the RN License expires 09/19/2027 instead
* **Then** RN License is **Uploaded**

#### Scenario: After trip end date is unchanged
* **Given** "RN License" uses **After trip end date**
* **And** Maria's RN License with a file expires 05/01/2027 and her passport expires 03/22/2027
* **When** she loads her trip documents
* **Then** RN License is **Uploaded** and Passport is **Missing**

#### Scenario: On or after trip end date accepts the trip end date
* **Given** "RN License" uses **On or after trip end date**
* **And** Maria's passport expires in 2035
* **And** Maria's RN License with a file expires 03/21/2027
* **When** she loads her trips
* **Then** the missing documents include "RN License: the expiration date 03/21/2027 must be on or after 03/22/2027"
* **When** the RN License expires 03/22/2027 instead
* **Then** RN License is **Uploaded**

#### Scenario: Passport type's check applies to the trip passport
* **Given** the "Passport" type uses **90 days after trip end date**
* **And** Maria's passport with a file expires 04/30/2027
* **When** she loads her trip documents
* **Then** Passport is **Missing**

#### Scenario: Trip page missing items use the check
* **Given** "RN License" uses **90 days after trip end date**
* **And** Maria's RN License expires 05/01/2027
* **When** Olivia loads the Guatemala Clinic status
* **Then** Maria's missing items include RN License

#### Scenario: Doctor Permission uses its check
* **Given** "Hope Missions" has a Doctor Permission type using **90 days after trip end date**
* **And** Maria says she is pregnant and her Doctor Permission with a file expires 06/01/2027
* **When** she loads her trips
* **Then** the missing documents include "Doctor Permission"

#### Scenario: Doctor Permission on after trip end date rejects the trip end date
* **Given** "Hope Missions" has a Doctor Permission type using **After trip end date**
* **And** Maria says she is pregnant and her Doctor Permission with a file expires 03/22/2027
* **When** she loads her trips
* **Then** the missing documents include "Doctor Permission"
* **When** the Doctor Permission type uses **On or after trip end date** instead
* **Then** Maria has no missing documents

### US-115.3 — Approve only when documents meet the expiration check

#### Scenario: Approval blocked by the 90-day check
* **Given** "RN License" uses **90 days after trip end date**
* **And** Maria's pre-approved application has a reviewed RN License expiring 05/01/2027 and a reviewed passport expiring in 2030
* **When** Olivia opens the document review for Maria's application
* **Then** the approval blockers include "RN License: not uploaded"
* **When** she changes the application to **Approved**
* **Then** the response is `400`

#### Scenario: Approve App disabled while documents miss the check
* **Given** the document review for Maria's application lists "RN License: not uploaded"
* **When** Olivia views the application
* **Then** the blocker shows and **Approve App** is disabled

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-115.1 | Expiration check shows only with an expiration date | `frontend/tests/DocumentExpirationCheck.test.js` | `Expiration check shows only with an expiration date` |
| US-115.1 | Expiration check saved | `backend/tests/document-expiration-check.test.js` | `Expiration check saved` |
| US-115.1 | Existing and no-expiration types use after trip end date | `backend/tests/document-expiration-check.test.js` | `Existing and no-expiration types use after trip end date` |
| US-115.1 | Document types list shows the expiration check | `frontend/tests/DocumentExpirationCheck.test.js` | `Document types list shows the expiration check` |
| US-115.2 | Document expiring too soon after the trip is missing | `backend/tests/document-expiration-check.test.js` | `Document expiring too soon after the trip is missing` |
| US-115.2 | No document names the 90-day rule | `backend/tests/document-expiration-check.test.js` | `No document names the 90-day rule` |
| US-115.2 | Document late enough meets the 90-day check | `backend/tests/document-expiration-check.test.js` | `Document late enough meets the 90-day check` |
| US-115.2 | 180 days after trip end date uses trip end plus 180 days | `backend/tests/document-expiration-check.test.js` | `180 days after trip end date uses trip end plus 180 days` |
| US-115.2 | After trip end date is unchanged | `backend/tests/document-expiration-check.test.js` | `After trip end date is unchanged` |
| US-115.2 | On or after trip end date accepts the trip end date | `backend/tests/document-expiration-check.test.js` | `On or after trip end date accepts the trip end date` |
| US-115.2 | Passport type's check applies to the trip passport | `backend/tests/document-expiration-check.test.js` | `Passport type's check applies to the trip passport` |
| US-115.2 | Trip page missing items use the check | `backend/tests/document-expiration-check.test.js` | `Trip page missing items use the check` |
| US-115.2 | Doctor Permission uses its check | `backend/tests/document-expiration-check.test.js` | `Doctor Permission uses its check` |
| US-115.2 | Doctor Permission on after trip end date rejects the trip end date | `backend/tests/document-expiration-check.test.js` | `Doctor Permission on after trip end date rejects the trip end date` |
| US-115.3 | Approval blocked by the 90-day check | `backend/tests/document-expiration-check.test.js` | `Approval blocked by the 90-day check` |
| US-115.3 | Approve App disabled while documents miss the check | `frontend/tests/DocumentExpirationCheck.test.js` | `Approve App disabled while documents miss the check` |

---

## Agent implementation request

```text
Implement Feature 115 from @features/feature-115-document-expiration-check.md on branch `feature/115-document-expiration-check`.

Backend: add documentType.expirationCheck (model, ensureSchema column default 'trip_end', controller validation per FR-001). In tripParticipantApplicationStatus.js, compute each document's check date from its documentType.expirationCheck and the trip compare date (FR-003) inside the shared rules (meetsRoleDocumentRule, isRequiredPassportUploaded, isDoctorPermissionUploaded, requiredRoleDocumentMessage), and make every loader that feeds them include expirationCheck on documentType (person documents, worker role required types, approvalDocuments, tripBrowse). FR-005 text for trip_end_90.
Frontend: DocumentTypeFormDialog select (shown with Has Expiration Date), DocumentTypesList column; tripApplicationForm.js Doctor Permission rule uses expirationCheck.
Tests per the Test Coverage Map. Update features/reference/ (data-model.md documentType, api.md document types, behavior.md document and approval rows).
```

---

## Definition of Done

*   [x] `expirationCheck` field, API, and validation per **FR-001**
*   [x] Form select and list column per **FR-002**
*   [x] Check date rule per **FR-003** in every check listed in **FR-004**
*   [x] Missing text per **FR-005**
*   [x] Approval blockers and **Approve App** per **FR-006**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

---

## Out of Scope

- Other expiration checks (for example a custom number of days).
- Checking expiration against the trip start date instead of the end date.
- Changing how a person enters a document's expiration date.
- Changing the 90-day documents due date (Feature 112), which is about when to upload, not how long a document must be valid.
