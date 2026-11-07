# Feature: Expired Document Marker

**Feature ID:** 124
**Branch pattern:** `feature/124-expired-document-marker`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** "create spec for expire doc update. on profice" — clarified: "Just make sure that each document that is on or passed expiraration date is displayed as expired in its list entry". No "Expires soon" marker. When a newer document of the same type is added, the old one keeps its **Expired** marker.
**Depends on:** [Feature 102 — Pregnancy Doctor Permission](feature-102-pregnancy-doctor-permission.md), [Feature 104 — Pre-Approved Document Review](feature-104-pre-approved-document-review.md), [Feature 120 — Updated Document Processing](feature-120-updated-document-processing.md)

Today the profile's **Documents** table shows a red **Expired** chip only once the expiration date is *before* today, so a document isn't marked on the day it expires. Two other lists of a person's documents never mark expired documents: the **Review documents** dialog staff use, and the short Doctor Permission line in the apply / edit application form. A person returning for a later trip, or staff reviewing them, can't always tell which documents need replacing. This feature uses one rule everywhere: a document is **expired** when it has an expiration date that is today or earlier.

---

## User Stories

### US-124.1: See expired documents on my profile

**As a** participant (or staff editing a person)
**I want** every document that has reached its expiration date marked **Expired** in the profile's document list
**So that** I know what to replace before applying for a later trip

**Priority:** P1
**Independent test:** A person has a document expiring today, one that expired last month, and one expiring tomorrow; the profile's **Documents** table shows **Expired** on the first two and not the third.
**Acceptance scenarios:** see ### US-124.1

### US-124.2: See expired documents when reviewing and applying

**As** trip staff reviewing documents, or a participant filling in an application
**I want** expired documents marked **Expired** in **Review documents** and in the application's Doctor Permission line
**So that** an expired document is never shown as if it were current

**Priority:** P2
**Independent test:** In **Review documents**, a document whose expiration date is today shows **Expired** next to "expires <date>"; one expiring next year doesn't.
**Acceptance scenarios:** see ### US-124.2

---

## Requirements

### Functional Requirements

- **FR-001**: A person document MUST count as **expired** when it has an expiration date and that date is on or before today (the viewer's local date). A document with no expiration date is never expired.
- **FR-002**: The profile **Documents** table (own **Profile** and **People → Edit person**) MUST show the red **Expired** chip in the **Expiration date** column for every expired document (FR-001). This replaces the "before today" check (Feature 120).
- **FR-003**: Each document entry in the **Review documents** dialog MUST show a red **Expired** chip after "expires <date>" when the document is expired (FR-001).
- **FR-004**: Each document in the apply / edit application Doctor Permission line MUST show a red **Expired** chip after "expires <date>" when the document is expired (FR-001).
- **FR-005**: An expired document MUST keep its **Expired** chip when a newer document of the same type is added. The row's actions are unchanged: no new buttons, and Reviewed rows still hide **Edit** and **Delete** (Feature 120).
- **FR-006**: The marker is display only. Trip requirement checks, the current document choice, approval, missing items, next actions, and emails are unchanged (Features 115, 120).

---

## Assumptions

- "Today" is the date on the viewer's device, as the profile chip uses today.
- The red chip and the label **Expired** are the same as the existing profile chip.

## Edge Cases

- Expiration date today → **Expired**. Tomorrow → not expired.
- No expiration date (a type without one, or left blank) → never **Expired**.
- A Reviewed expired document → **Expired**, with **Edit** and **Delete** still hidden.
- Old and renewed passport on one profile → the old one shows **Expired**, the renewed one doesn't.
- The application's Doctor Permission line lists only documents valid through the trip's end (Feature 102). So the chip appears there only when the trip's end date is today or earlier, for example staff opening an application after the trip ended.
- A document can be **Expired** in **Review documents** and still be marked **Used for this trip** if no newer document exists. Both chips show.

## Success Criteria

- **SC-001**: Every list of a person's documents marks a document **Expired** from its expiration date on.
- **SC-002**: No trip check, email, or permission changes.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- No change. Each list keeps its existing access rules (Features 104, 120).

---

## Key Entities

- **PersonDocument**: `expirationDate` is read only; no schema change.

---

## API Requirements

No API changes.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `PersonDocumentsCard` (profile **Documents** table) | **Expired** chip from the expiration date on (was: after it) |
| `PersonDocumentsCard` with a single document type (application Doctor Permission line) | **Expired** chip after "expires <date>" |
| `ReviewDocumentsDialog` document entries | **Expired** chip after "expires <date>" |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-124.1 — See expired documents on my profile

#### Scenario: Document expiring today shows as expired
* **Given** my profile has a document with expiration date today
* **When** I open my profile's Documents table
* **Then** that document shows a red "Expired" chip

#### Scenario: Document expiring tomorrow is not expired
* **Given** my profile has a document with expiration date tomorrow and one with no expiration date
* **When** I open my profile's Documents table
* **Then** neither document shows "Expired"

#### Scenario: Replaced document stays expired
* **Given** my profile has a Reviewed passport that expired last month and a new passport expiring in five years
* **When** I open my profile's Documents table
* **Then** the old passport shows "Expired" and has no Edit or Delete
* **And** the new passport doesn't show "Expired"

### US-124.2 — See expired documents when reviewing and applying

#### Scenario: Review documents shows expired documents
* **Given** a participant has a passport with expiration date today and another expiring next year
* **When** trip staff open Review documents for them
* **Then** the passport expiring today shows "Expired"
* **And** the passport expiring next year doesn't

#### Scenario: Doctor Permission line shows expired documents
* **Given** an application for a trip that ended yesterday and a Doctor Permission document with expiration date today
* **When** the application form shows the Doctor Permission line
* **Then** the document shows "Expired" after its expiration date

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-124.1 | Document expiring today shows as expired | `frontend/tests/` ExpiredDocumentMarker | `Document expiring today shows as expired` |
| US-124.1 | Document expiring tomorrow is not expired | `frontend/tests/` ExpiredDocumentMarker | `Document expiring tomorrow is not expired` |
| US-124.1 | Replaced document stays expired | `frontend/tests/` ExpiredDocumentMarker | `Replaced document stays expired` |
| US-124.2 | Review documents shows expired documents | `frontend/tests/` ExpiredDocumentMarker | `Review documents shows expired documents` |
| US-124.2 | Doctor Permission line shows expired documents | `frontend/tests/` ExpiredDocumentMarker | `Doctor Permission line shows expired documents` |

---

## Agent implementation request

```text
Implement Feature 124 from @features/feature-124-expired-document-marker.md on branch `feature/124-expired-document-marker`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/behavior.md in the same PR.
Update docs/user-guide/ (participant-guide.md, trip-staff-guide.md, rules.md, glossary.md, troubleshooting.md) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Feature 120 row: the Expired chip shows from the expiration date on, and also in **Review documents** and the application Doctor Permission line)

**User guide updates:** `participant-guide.md` (document table and **Expiration date** field: "on or after" its date; the application Doctor Permission line), `trip-staff-guide.md` (**Review documents** entries), `rules.md` (the Expired rule), `glossary.md` (**Expired**), `troubleshooting.md` (the "red Expired tag" entry)

---

## Definition of Done

*   [x] Expired means an expiration date today or earlier, in every list (**FR-001**)
*   [x] Profile **Documents** table uses the rule (**FR-002**, **FR-005**)
*   [x] **Review documents** and the application Doctor Permission line show **Expired** (**FR-003**, **FR-004**)
*   [x] No change to checks, emails, or permissions (**FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/124-expired-document-marker`; PR → `dev`

---

## Out of Scope

- An "Expires soon" marker or warning before the expiration date
- An **Update** or **Replace** button, or a banner listing expired documents
- Hiding, archiving, or deleting expired documents
- Marking the requirement lines in **All documents for your trips** (they already say Uploaded or Missing per trip)
- The document viewer's detail line
- Changing any trip check, email, or the current document choice
