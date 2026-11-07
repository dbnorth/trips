# Feature: Trip Arrival Document Download

**Feature ID:** 126
**Branch pattern:** `feature/126-trip-arrival-download`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** "create a spec to add a button to download the Trip Arrival document on the Participant Trip page if the document has been uploaded for the trip. Put a button in the Trip Info section above the Trip Leader heading. Make a button that says Download Trip Arrival Document". Clarified: only **Approved** participants see it, the same people who may open the PDF today. It downloads the file rather than opening it. The existing **Trip arrival info** link in **My Trip Info** is removed.
**Depends on:** [Feature 76 — Trip Arrival Info](feature-76-trip-arrival-info.md), [Feature 119 — My Trip Page](feature-119-my-trip-page.md)

Today an approved participant finds the Trip Arrival PDF as a small "Trip arrival info" link low in **My Trip Info**, and it opens in a new tab. This feature moves it to a clear **Download Trip Arrival Document** button in **Trip Info**, directly above **Trip Leaders**, and saves the file to the participant's device.

---

## User Stories

### US-126.1: Download the trip arrival document

**As an** approved participant
**I want** a **Download Trip Arrival Document** button in **Trip Info** on **My Trip**
**So that** I can save the arrival information for the trip

**Priority:** P1
**Independent test:** An Approved participant opens **My Trip** for a trip with a Trip Arrival PDF. **Trip Info** shows **Download Trip Arrival Document** directly above **Trip Leaders**. Choosing it saves `Trip Arrival - <trip name>.pdf`. **My Trip Info** no longer shows **Trip arrival info**.
**Acceptance scenarios:** see ### US-126.1

---

## Requirements

### Functional Requirements

- **FR-001**: The **My Trip** page's **Trip Info** section MUST show a button labeled **Download Trip Arrival Document**, with a download icon, directly above the **Trip Leaders** heading (after the **Location** / **Dates** / **Status** row).
- **FR-002**: The button MUST show only when `myTripInfo.hasArrivalPdf` is true. That is the existing rule: the caller is an approved Trip Participant or Trip Leader of the trip, and the trip has a Trip Arrival PDF (Feature 76). It never shows for Incomplete, Pre-Approved, Declined, or Cancelled applications, or when no PDF is uploaded.
- **FR-003**: Choosing the button MUST download the PDF using the existing Trip Arrival PDF endpoint and save it as `Trip Arrival - <trip name>.pdf`. It MUST NOT open a new tab. While downloading, the button shows a loading state.
- **FR-004**: If the download fails, **Trip Info** MUST show the error "Unable to download the Trip Arrival Document." under the button.
- **FR-005**: The **Trip arrival info** heading and link in **My Trip Info** MUST be removed, along with its "Unable to open the Trip Arrival PDF." error.
- **FR-006**: Who may get the PDF, and staff upload, replace, remove, and email attachments, stay unchanged (Feature 76). Staff keep the **Trip arrival info** section on **View Trip**.

---

## Assumptions

- The saved file name matches the name staff see on **View Trip**: `Trip Arrival - <trip name>.pdf`.
- No API change is needed. The page fetches the existing endpoint and saves the response as a file.

## Edge Cases

- No Trip Arrival PDF on the trip → no button.
- Staff remove the PDF after the page loaded → download fails with "Unable to download the Trip Arrival Document."; reloading the page hides the button.
- The participant is Pre-Approved → no button, even when the trip has a PDF.
- A Trip Leader who is approved on the trip and opens **My Trip** → sees the button (same rule as today).

## Success Criteria

- **SC-001**: Approved participants download the Trip Arrival PDF from **Trip Info** with one click.
- **SC-002**: No one else sees the button, and the PDF's access rules are unchanged.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Unchanged. The existing endpoint returns the PDF only to trip staff and approved Trip Participants / Trip Leaders of the trip (`403` otherwise).

---

## Key Entities

- **Trip**: `arrivalPdfFileName` (existing), read only.

---

## API Requirements

No API changes. Uses `GET /trips/trips/:id/arrival-pdf` (Feature 76) and `myTripInfo.hasArrivalPdf` on `GET /trips/trips/browse/:id`.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `MyTripView` **Trip Info** | **Download Trip Arrival Document** button above **Trip Leaders**, when `hasArrivalPdf`; download error under it |
| `MyTripTravelDetails` | **Trip arrival info** heading, link, and error removed |
| `tripServices` | A download of the Trip Arrival PDF that saves it with the file name |

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

### US-126.1 — Download the trip arrival document

#### Scenario: Approved participant sees the download button above Trip Leaders
* **Given** I am approved for a trip that has a Trip Arrival PDF
* **When** I open My Trip
* **Then** Trip Info shows "Download Trip Arrival Document" directly above the Trip Leaders heading
* **And** My Trip Info doesn't show "Trip arrival info"

#### Scenario: No download button without the PDF or approval
* **Given** my application is Pre-Approved, or the trip has no Trip Arrival PDF
* **When** I open My Trip
* **Then** I don't see "Download Trip Arrival Document"

#### Scenario: Download saves the Trip Arrival PDF
* **Given** I see "Download Trip Arrival Document"
* **When** I choose it
* **Then** the Trip Arrival PDF is saved as "Trip Arrival - <trip name>.pdf"
* **And** no new tab opens

#### Scenario: Download failure shows an error
* **Given** I see "Download Trip Arrival Document"
* **When** I choose it and the download fails
* **Then** I see "Unable to download the Trip Arrival Document."

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-126.1 | Approved participant sees the download button above Trip Leaders | `frontend/tests/` MyTripView | `Approved participant sees the download button above Trip Leaders` |
| US-126.1 | No download button without the PDF or approval | `frontend/tests/` MyTripView | `No download button without the PDF or approval` |
| US-126.1 | Download saves the Trip Arrival PDF | `frontend/tests/` MyTripView | `Download saves the Trip Arrival PDF` |
| US-126.1 | Download failure shows an error | `frontend/tests/` MyTripView | `Download failure shows an error` |

The existing `MyTripTravelDetails` test "My Trip Info shows the Trip Arrival PDF link" is removed or changed to check the link is gone, since **FR-005** removes that link.

---

## Agent implementation request

```text
Implement Feature 126 from @features/feature-126-trip-arrival-download.md on branch `feature/126-trip-arrival-download`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/behavior.md in the same PR.
Update docs/user-guide/ (participant-guide.md, trip-staff-guide.md, troubleshooting.md) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (Feature 76 row: **My Trip** shows **Download Trip Arrival Document** in **Trip Info** instead of the **My Trip Info** link; Feature 119 **My Trip** row)

**User guide updates:** `participant-guide.md` (**My Trip** → **Trip Info** gains the button; **My Trip Info** loses **Trip arrival info**), `trip-staff-guide.md` ("Approved team members can open it from **My Trip**" → download it from **Trip Info** on **My Trip**), `troubleshooting.md` (new error message)

---

## Definition of Done

*   [x] **Download Trip Arrival Document** in **Trip Info** above **Trip Leaders**, only when `hasArrivalPdf` (**FR-001**, **FR-002**)
*   [x] Downloads `Trip Arrival - <trip name>.pdf`, with the error message on failure (**FR-003**, **FR-004**)
*   [x] **Trip arrival info** link removed from **My Trip Info** (**FR-005**)
*   [x] Access and staff features unchanged (**FR-006**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/126-trip-arrival-download`; PR → `dev`

---

## Out of Scope

- Letting Pre-Approved or other participants get the PDF
- Opening the PDF in a new tab or a viewer on **My Trip**
- Changes to staff upload, replace, or remove on **View Trip**
- A download button on Home, the browse trip page, or emails
- Showing the button to trip staff who aren't on the trip
