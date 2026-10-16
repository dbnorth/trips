# Feature: Organization Medical Agreement on Applications

**Feature ID:** 18
**Branch pattern:** `feature/18-org-medical-agreement`
**Status:** Done
**Created:** 2026-09-05
**Input:** Add an org-managed medical agreement (Markdown), edited on Organization add/edit like the participant agreement and stored the same way; show it on the trip application when Take medication? is Yes, with a required “I agree to the medical agreement” checkbox; rename the participant agreement checkbox to “I agree to the Participation agreement”
**Depends on:** [Feature 3 — Organizations & Agreements](feature-3-organizations-and-agreements.md), [Feature 7 — Trip Applications & Participants](feature-7-trip-applications-and-participants.md), [Feature 17 — Organization Medical Conditions & Person Selections](feature-17-org-medical-conditions.md)

---

## User Stories

### US-18.1: Manage organization medical agreement
**As an** Org Admin (or System Admin)  
**I want to** edit Markdown medical agreement text on the organization add/edit UI  
**So that** applicants who take medication can accept our medical terms

**Priority:** P1  
**Independent test:** GET/PUT medical-agreement endpoints; org dialog edit/save like participant agreement  
**Acceptance scenarios:** see ### US-18.1

### US-18.2: Accept medical agreement when taking medication
**As a** trip applicant  
**I want** the medical agreement shown on my application when Take medication? is Yes  
**So that** I can read it and check “I agree to the medical agreement” before submitting

**Priority:** P1  
**Independent test:** Application form shows medical agreement + required checkbox only when `takesMedication === true` and content exists; acceptance persists on the application  
**Acceptance scenarios:** see ### US-18.2

### US-18.3: Clarify participation agreement checkbox label
**As a** trip applicant  
**I want** the participant agreement checkbox to say it is the Participation agreement  
**So that** I can tell it apart from the medical agreement checkbox

**Priority:** P1  
**Independent test:** Participant agreement checkbox label is **I agree to the Participation agreement**  
**Acceptance scenarios:** see ### US-18.3

---

## Requirements

### Functional Requirements

- **FR-001**: Organization MUST support a **medical agreement** stored like the participant agreement: Markdown file(s) under the `agreements/` directory, referenced by a new organization column `medicalAgreementFileName` (parallel to `agreementFileName`).
- **FR-002**: Org Admin for the org or System Admin MUST create/update medical agreement Markdown via authenticated GET/PUT endpoints parallel to participant agreement (`…/medical-agreement`). Saving MUST version the file the same way participant agreements are versioned (timestamped filename + org column update).
- **FR-003**: Organization **Add** and **Edit** dialogs MUST expose medical agreement management next to (or immediately under) the existing **Participant agreement** control — same pattern: status text (“on file” / “not saved yet”) + button to open an editor/preview dialog for Markdown.
- **FR-004**: On trip **application** UIs (apply dialog and update-application page), when the person’s **Take medication?** is **Yes** (`takesMedication === true`) **and** the trip’s organization has medical agreement content, the UI MUST display the rendered medical agreement Markdown (same preview style as the participant agreement section).
- **FR-005**: When the medical agreement section is shown (FR-004), the applicant MUST see a checkbox labeled exactly **I agree to the medical agreement**. Checking it is **required** to submit/complete an application that needs agreement acceptance (same completeness gate pattern as participant `agreementAccepted` when participant agreement content exists).
- **FR-006**: Medical agreement acceptance MUST be stored on the **application** (`tripPeopleRole`), not only in transient UI state: at least `medicalAgreementAccepted` (boolean, default false) and `medicalAgreementDate` (date set when accepted, cleared when unchecked / when section no longer applies).
- **FR-007**: When **Take medication?** is not Yes (`false` / `null` / unanswered), the medical agreement section MUST be **hidden**. Saving the application in that state MUST set `medicalAgreementAccepted` to false and clear `medicalAgreementDate` (do not require medical acceptance).
- **FR-008**: When Take medication? is Yes but the organization has **no** medical agreement content, the medical section MUST follow the participant-agreement empty pattern (info that none is configured; medical acceptance **not** required).
- **FR-009**: Browse/apply and application load payloads MUST include medical agreement Markdown content for the trip’s org when available (parallel to how participant agreement content is already loaded for applications).
- **FR-010**: Staff **view application** UI MUST show whether the medical agreement was accepted (and date if present) when relevant.
- **FR-011**: The participant agreement checkbox label MUST change from **I Agree** to exactly **I agree to the Participation agreement**.
- **FR-012**: The electronic-signature explanatory text (above the typed name field) MUST state that the typed name is the applicant’s electronic signature **for the agreement(s) they accept via the I agree checkboxes** (the Participation agreement checkbox and, when shown, the medical agreement checkbox). Exact required wording:

  > I agree and understand that by typing my name below that it serves as my electronic signature and it is the legal equivalent of my manual/handwritten signature and I consent to be legally bound to each agreement I accept using the **I agree** checkboxes below.

  There is still **one** typed signature name field (no separate medical signature). Medical agreement remains checkbox-only beyond that shared signature.
- **FR-013**: Delete organization MUST clean up medical agreement files the same way participant agreement files are cleaned up.

---

## Assumptions

- Participant agreement storage, org editor dialog, application section component, and under-18 adult signer fields already exist (Features 3 and 7).
- `takesMedication` lives on the **person** and is edited on the application health section (Feature 17). The medical agreement gate uses that person field in the application form context (merged with any in-form health edits before save).
- Medical agreement is **per organization**, not per trip.
- Medical agreement does **not** require its own typed signature or adult-signer fields; the existing typed signature / under-18 adult fields remain shared, and the signature text (FR-012) ties that signature to the I agree checkboxes.

## Edge Cases

- User sets Take medication? Yes → accepts medical agreement → switches to No → medical section hides; save clears medical acceptance.
- User accepts medical agreement, then Org Admin replaces MD file → existing applications keep their stored acceptance flags (no forced re-accept in this feature).
- Concurrent org agreement edits → same optimistic/`version` patterns as org profile where already used; file write follows existing agreement save behavior.
- Incomplete profile blocking participant “I agree” remains unchanged; medical checkbox MAY use the same “can agree only when form/profile ready” guard if the shared section pattern already does — do not invent a stricter medical-only gate beyond FR-005.

## Success Criteria

- **SC-001**: Org Admin can save and reload medical agreement Markdown from Organization add/edit.
- **SC-002**: Application shows medical agreement + required **I agree to the medical agreement** only when Take medication? is Yes and content exists; acceptance persists on `tripPeopleRole`.
- **SC-003**: Participant checkbox label is **I agree to the Participation agreement**; signature text explicitly applies to the I agree checkboxes (FR-012).
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Medical agreement files and `medicalAgreementFileName` belong to the organization. Org Admin manages their org; System Admin any org.
- Application acceptance fields are readable/writable under the same trip application access rules as existing agreement fields (applicant for own application; staff for org trips).

---

## Key Entities

- **Organization** — owns `medicalAgreementFileName` + Markdown files under `agreements/`
- **TripPeopleRole (application)** — stores `medicalAgreementAccepted` / `medicalAgreementDate`
- **Person** — `takesMedication` gates whether the medical agreement section is shown
- **Trip** — supplies org context for which medical agreement to load

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/organizations/:id/medical-agreement` | Yes (manage/read gates parallel to participant agreement) | Load medical agreement MD + `medicalAgreementFileName` / exists |
| `PUT` | `/trips/organizations/:id/medical-agreement` | Org admin / system admin | Save `{ content }` Markdown; update `medicalAgreementFileName` |
| Existing apply / update application | `/trips/trips/browse/:id/apply`, application update endpoints | Yes | Accept/persist `medicalAgreementAccepted` (+ date server-side as today for participant agreement) |
| Browse/application detail payloads | existing | Yes | Include medical agreement content (and acceptance fields on application) |

**Payload notes:**

- Save medical agreement: `{ content: string }` — same shape as participant agreement PUT.
- Application save includes `medicalAgreementAccepted: boolean` when applicable; server sets/clears `medicalAgreementDate`.
- Enforce FR-007 on save (clear when medication not Yes).

**Status codes:** same family as participant agreement (`400` validation, `403`, `404`).

---

## Screen Requirements

| Route / UI | Change |
|------------|--------|
| Add / Edit organization | **Medical agreement** block parallel to **Participant agreement** (status + Edit medical agreement dialog) |
| Medical agreement editor dialog | Markdown edit + preview (reuse/adapt participant agreement dialog pattern) |
| Apply trip dialog / Update application | Medical agreement section when Take medication? Yes; checkbox **I agree to the medical agreement** |
| Participant / shared agreement controls | Checkbox label → **I agree to the Participation agreement**; signature blurb updated per **FR-012** (applies to the I agree checkboxes) |
| View trip application | Show medical agreement accepted / date when present |

**UX notes:**

- Place medical agreement near the participant agreement on the application form (after health / medication context is clear — typically after health fields or adjacent to participant agreement).
- Prefer one shared signature name field whose explanatory text covers both I agree checkboxes when both are visible; if only the Participation agreement is shown, the same FR-012 wording still applies (it refers to the I agree checkbox(es) below).
- Section title e.g. **Medical agreement**.

---

## Data Model Requirements

### `organization` (extend)

| Column | Type | Notes |
|--------|------|-------|
| medicalAgreementFileName | STRING(500) | nullable; relative path under `agreements/` |

File naming parallel to participant: e.g. `org-{orgId}-medical-agreement.md` and versioned `org-{orgId}-medical-agreement-{stamp}.md`.

### `tripPeopleRole` (extend)

| Column | Type | Notes |
|--------|------|-------|
| medicalAgreementAccepted | BOOLEAN | required, default `false` |
| medicalAgreementDate | DATE | nullable; set when accepted |

No new tables.

---

## Acceptance Criteria (Gherkin)

### US-18.1 — Manage organization medical agreement

#### Scenario: Org Admin saves medical agreement markdown
* **Given** I am Org Admin for organization A
* **When** I PUT medical agreement markdown content for organization A
* **Then** the organization stores a `medicalAgreementFileName`
* **And** GET medical-agreement returns that content

#### Scenario: Medical agreement is editable from organization edit UI
* **Given** I open Edit organization for organization A
* **When** I use the medical agreement editor and save Markdown
* **Then** the UI shows that a medical agreement is on file

### US-18.2 — Accept medical agreement when taking medication

#### Scenario: Medical agreement appears when Take medication is Yes
* **Given** organization A has medical agreement content
* **And** I am on a trip application for organization A
* **And** Take medication? is Yes
* **When** the application form renders
* **Then** I see the medical agreement text
* **And** I see a checkbox labeled "I agree to the medical agreement"

#### Scenario: Medical agreement is hidden when Take medication is not Yes
* **Given** organization A has medical agreement content
* **And** I am on a trip application for organization A
* **When** Take medication? is No or unanswered
* **Then** the medical agreement section is not shown

#### Scenario: Medical agreement acceptance is required when shown
* **Given** Take medication? is Yes and medical agreement content exists
* **And** the medical agreement checkbox is unchecked
* **When** I attempt to submit the application as complete/applied
* **Then** submission is blocked until I check "I agree to the medical agreement"

#### Scenario: Medical agreement acceptance is saved on the application
* **Given** Take medication? is Yes and I check "I agree to the medical agreement"
* **When** I save the application
* **Then** the application record has medicalAgreementAccepted true
* **And** medicalAgreementDate is set

### US-18.3 — Clarify participation agreement checkbox label

#### Scenario: Participation agreement checkbox uses the new label
* **Given** I am on an application with participant agreement content
* **When** the participant agreement section renders
* **Then** the agree checkbox label is "I agree to the Participation agreement"

#### Scenario: Signature text applies to the I agree checkboxes
* **Given** I am on an application with participant agreement content
* **When** the signature explanatory text renders
* **Then** it states that typing my name is my electronic signature for each agreement I accept using the I agree checkboxes below

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-18.1 | Org Admin saves medical agreement markdown | `backend/tests/organizations.test.js` (or `medical-agreement.test.js`) | `Org Admin saves medical agreement markdown` |
| US-18.1 | Medical agreement is editable from organization edit UI | `frontend/tests/` org dialog / agreement dialog | `Medical agreement is editable from organization edit UI` |
| US-18.2 | Medical agreement appears when Take medication is Yes | `frontend/tests/` application / medical agreement section | `Medical agreement appears when Take medication is Yes` |
| US-18.2 | Medical agreement is hidden when Take medication is not Yes | `frontend/tests/` application / medical agreement section | `Medical agreement is hidden when Take medication is not Yes` |
| US-18.2 | Medical agreement acceptance is required when shown | `frontend/tests/` or `backend/tests/` application completeness | `Medical agreement acceptance is required when shown` |
| US-18.2 | Medical agreement acceptance is saved on the application | `backend/tests/` applications | `Medical agreement acceptance is saved on the application` |
| US-18.3 | Participation agreement checkbox uses the new label | `frontend/tests/ParticipantAgreementSection.test.js` (or equivalent) | `Participation agreement checkbox uses the new label` |
| US-18.3 | Signature text applies to the I agree checkboxes | `frontend/tests/ParticipantAgreementSection.test.js` (or equivalent) | `Signature text applies to the I agree checkboxes` |

---

## Agent implementation request

```text
Implement Feature 18 from @features/feature-18-org-medical-agreement.md on branch `feature/18-org-medical-agreement`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/data-model.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
Reuse participant-agreement storage and UI patterns; do not invent a second signature flow for medical.
Gate medical agreement UI on person takesMedication === true (Feature 17).
Change participant checkbox label to "I agree to the Participation agreement" (FR-011).
Update the electronic-signature explanatory text so it explicitly applies to the I agree checkboxes (FR-012).
```

**Reference updates:** `features/reference/api.md`, `data-model.md`, `behavior.md`

---

## Definition of Done

*   [x] Org medical agreement GET/PUT + `medicalAgreementFileName` + file storage (**FR-001**, **FR-002**, **FR-013**)
*   [x] Organization add/edit UI for medical agreement (**FR-003**)
*   [x] Application shows medical agreement when Take medication? Yes; required checkbox; persistence (**FR-004**–**FR-009**)
*   [x] View application shows acceptance (**FR-010**)
*   [x] Participant checkbox label updated (**FR-011**)
*   [x] Signature text states it applies to the I agree checkboxes (**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [x] Living reference updated (api / data-model / behavior)

## Out of Scope

- Separate typed electronic signature / adult-signer fields for the medical agreement
- Per-trip medical agreement overrides (org-level only)
- Forcing re-acceptance when Org Admin changes the Markdown after an applicant already accepted
- Changing Feature 17 medical-condition catalog behavior
- Encrypting agreement Markdown files (see Feature 12 out of scope)
