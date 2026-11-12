# Feature: Participant Why Go

**Feature ID:** 125
**Branch pattern:** `feature/125-participant-why-go`
**Status:** Implemented
**Created:** 2026-11-06
**Input:** "create spec that add Why Go entry to participant application (with note that it is used on fund raising page). Remove the ability to edit from Edit Participant on Trip View page". Clarified: **Why go** is optional and doesn't affect completeness or approval. It goes in the application's **Funding** section after **I will raise funds**, always shown. It stays editable after the application is **Approved**. It's removed from **Edit participant**, which opens from both the trip page and the **Trips page for Trip Leaders**. **Add participant** keeps it.
**Depends on:** [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md), [Feature 121 — Complete Data for Active Trips](feature-121-complete-data-for-active-trips.md)

Today **Why go**, the story shown on a participant's fundraising page, can only be typed by trip staff, in **Add participant** or **Edit participant**. The participant, who knows why they're going, can't enter it. This feature moves it to the participant's own application, with a note that donors see it on their fundraising page. Participants can keep updating it after approval, since fundraising goes on until the trip. Staff can no longer change it in **Edit participant**. They can still give a starting story when adding someone.

---

## User Stories

### US-125.1: Tell donors why I'm going

**As a** participant
**I want** to write my **Why go** story on my application
**So that** donors see it on my fundraising page

**Priority:** P1
**Independent test:** A participant types a story in **Why go** on **Apply for trip** and saves. Reopening the application shows the story, and the participant's fundraising page shows it.
**Acceptance scenarios:** see ### US-125.1

### US-125.2: Update my story after approval

**As an** approved participant
**I want** to change **Why go** while the rest of my application stays locked
**So that** my fundraising page stays current until the trip

**Priority:** P1
**Independent test:** An Approved participant opens their application. Every field is read-only except **Why go**. **Save Why go** saves the new story, and the status stays Approved.
**Acceptance scenarios:** see ### US-125.2

### US-125.3: Staff no longer edit Why go

**As** trip staff
**I want** **Edit participant** to leave **Why go** to the participant
**So that** the fundraising story is the participant's own words

**Priority:** P2
**Independent test:** **Edit participant** has no **Why go** field. Saving it doesn't change the participant's story. **Add participant** still has **Why go**.
**Acceptance scenarios:** see ### US-125.3

---

## Requirements

### Functional Requirements

- **FR-001**: The application form (**Apply for trip** dialog and the edit application page) MUST show **Why go** in the **Funding** section, directly after **I will raise funds**, whatever the funding answers are. It is a multi-line text box with a character counter and the persistent hint "Shown on your fundraising page so donors can see why you're going."
- **FR-002**: **Why go** MUST be optional. It MUST NOT be part of profile or application completeness, the "Complete the following to submit your application:" list, the Feature 121 active-trip save check, approval, missing items, or next actions.
- **FR-003**: **Why go** MUST be at most 2000 characters. The form MUST stop typing past 2000. The API MUST refuse longer text with `400` "Why go must be 2000 characters or less."
- **FR-004**: Applying and updating the application MUST accept optional `whygoText`. Saved text is trimmed, and blank is stored empty. When an update leaves it out, the stored story is unchanged. Getting the application MUST return `whygoText`.
- **FR-005**: When the application is **Approved**, the form MUST keep every other field read-only as today, but **Why go** MUST stay editable. A **Save Why go** button MUST show directly below it. Saving shows "Why go saved." and leaves the status, every other answer, and the approval unchanged. No emails are sent.
- **FR-006**: The approved message on the form MUST read "You are approved for this trip. You can update Why go or Cancel the application if needed."
- **FR-007**: A new own-application endpoint MUST save only `whygoText`, using the rules in **FR-003** and **FR-004**. It works for **Incomplete**, **Pre-Approved**, and **Approved** applications on an active trip. Any other status → `400` "This application cannot be updated while its status is <status>." (the existing update message).
- **FR-008**: **Edit participant** (trip page and **Trips page for Trip Leaders**) MUST NOT show **Why go**. The staff participant update MUST leave `whygoText` unchanged even when the request includes it.
- **FR-009**: **Add participant** MUST keep **Why go** (optional) as a starting story, using the 2000-character limit in **FR-003**.
- **FR-010**: Everywhere **Why go** is shown stays the same: the fundraising page, the trip page application dialog, the **Why go** column on the **Trips page for Trip Leaders**, and the **Why Go** column of the participants CSV.

---

## Assumptions

- The 2000-character limit is new. Existing stories longer than that stay as they are until someone saves the field.
- A cancelled or declined participant's fundraising page isn't changed by this feature.
- Uncancelling keeps the story.

## Edge Cases

- Blank or spaces-only **Why go** → stored empty. The fundraising page shows no story.
- Story of exactly 2000 characters → saved. 2001 characters → `400`.
- **Approved** participant uses **Save Why go** on a trip that has ended or isn't active → refused the same way the application update is today (trip not found).
- **Declined** or **Cancelled** application → **Why go** read-only, with no **Save Why go** button. The endpoint → `400`.
- Staff saves **Edit participant** with an old client that still sends `whygoText` → ignored, and the story is unchanged.
- A Pre-Approved application on an active trip with missing items can't be saved through **Update Application** (Feature 121), but **Why go** isn't one of those items.

## Success Criteria

- **SC-001**: Participants can enter and update **Why go** from their application, including after approval.
- **SC-002**: Staff can't change **Why go** in **Edit participant**, but can set it when adding someone.
- **SC-003**: The fundraising page shows the participant's latest saved story.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Only the signed-in person can save **Why go** on their own application (the existing own-application rules).
- Staff can set it only when creating a participant (**Add participant**).

---

## Key Entities

- **TripPeopleRole**: `whygoText` (TEXT, existing). No schema change. It's now written by the participant's application, and by staff only on create.

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/trips/browse/:id/apply` | auth | Accepts optional `whygoText` (**FR-003**, **FR-004**) |
| `GET` | `/trips/trips/browse/:id/application` | auth | Returns `whygoText` |
| `PUT` | `/trips/trips/browse/:id/application` | auth | Accepts optional `whygoText` (**FR-003**, **FR-004**) |
| `PUT` | `/trips/trips/browse/:id/application/why-go` | auth | New. Body `{ whygoText }`. Saves only the story on the caller's own **Incomplete**, **Pre-Approved**, or **Approved** application. Returns `{ whygoText }`. No status change, no emails |
| `POST` | `/trips/trip-people-roles` | as today | Still accepts `whygoText` (**FR-009**) |
| `PUT` | `/trips/trip-people-roles/:id` | as today | Ignores `whygoText` (**FR-008**) |

**Status codes:** `400` "Why go must be 2000 characters or less."; `400` "This application cannot be updated while its status is <status>." (why-go endpoint on a declined or cancelled application); `404` as today for a missing application or inactive trip.

---

## Screen Requirements

| UI | Change |
|----|--------|
| `ApplyTripDialog`, `EditTripApplicationView` | **Why go** in **Funding** after **I will raise funds**, with hint and 2000-character counter; when Approved, **Why go** stays editable with **Save Why go** below it; approved message per **FR-006** |
| `EditTripParticipantDialog` | **Why go** removed |
| `AddTripParticipantDialog` | Keeps **Why go**, with the 2000-character counter |

---

## Data Model Requirements

None. `tripPeopleRole.whygoText` already exists.

---

## Acceptance Criteria (Gherkin)

### US-125.1 — Tell donors why I'm going

#### Scenario: Why go shows in Funding with the fundraising note
* **Given** I am applying for a trip
* **When** I look at the Funding section
* **Then** I see Why go directly after "I will raise funds"
* **And** it says "Shown on your fundraising page so donors can see why you're going."

#### Scenario: Participant saves Why go on the application
* **Given** I am a participant applying for an active trip
* **When** I apply with Why go "  I want to serve.  "
* **Then** my application's Why go is "I want to serve."
* **When** I update the application with a blank Why go
* **Then** my application has no Why go

#### Scenario: Why go must be 2000 characters or less
* **Given** I am a participant with an application
* **When** I save Why go with 2001 characters
* **Then** the request is rejected with "Why go must be 2000 characters or less."

### US-125.2 — Update my story after approval

#### Scenario: Approved participant updates Why go
* **Given** my application is Approved
* **When** I save Why go "New story" with the why-go endpoint
* **Then** my application's Why go is "New story"
* **And** my status is still Approved and my other answers are unchanged

#### Scenario: Approved application can update Why go only
* **Given** my application is Approved
* **When** I open it
* **Then** Why go is editable and Save Why go shows below it
* **And** the other application fields are read-only
* **And** I see "You are approved for this trip. You can update Why go or Cancel the application if needed."

#### Scenario: Why go can't be changed on a cancelled application
* **Given** my application is Cancelled
* **When** I save Why go with the why-go endpoint
* **Then** the request is rejected with "This application cannot be updated while its status is cancelled."

### US-125.3 — Staff no longer edit Why go

#### Scenario: Edit participant has no Why go
* **Given** I am trip staff editing a participant
* **When** the Edit participant dialog opens
* **Then** I don't see Why go
* **And** saving doesn't send whygoText

#### Scenario: Staff update leaves Why go unchanged
* **Given** a participant whose Why go is "My story"
* **When** trip staff update the participant with whygoText "Staff text"
* **Then** the participant's Why go is still "My story"

#### Scenario: Add participant still saves Why go
* **Given** I am trip staff adding a participant
* **When** I add them with Why go "Starting story"
* **Then** the participant's Why go is "Starting story"

---

## Test Coverage Map

| Story | Scenario | Test file (expected) | `it(...)` description |
|-------|----------|----------------------|------------------------|
| US-125.1 | Why go shows in Funding with the fundraising note | `frontend/tests/` ApplyTripDialog | `Why go shows in Funding with the fundraising note` |
| US-125.1 | Participant saves Why go on the application | `backend/tests/` applications | `Participant saves Why go on the application` |
| US-125.1 | Why go must be 2000 characters or less | `backend/tests/` applications | `Why go must be 2000 characters or less` |
| US-125.2 | Approved participant updates Why go | `backend/tests/` applications | `Approved participant updates Why go` |
| US-125.2 | Approved application can update Why go only | `frontend/tests/` ApplyTripDialog | `Approved application can update Why go only` |
| US-125.2 | Why go can't be changed on a cancelled application | `backend/tests/` applications | `Why go can't be changed on a cancelled application` |
| US-125.3 | Edit participant has no Why go | `frontend/tests/` EditTripParticipantDialog | `Edit participant has no Why go` |
| US-125.3 | Staff update leaves Why go unchanged | `backend/tests/` applications | `Staff update leaves Why go unchanged` |
| US-125.3 | Add participant still saves Why go | `backend/tests/` applications | `Add participant still saves Why go` |

---

## Agent implementation request

```text
Implement Feature 125 from @features/feature-125-participant-why-go.md on branch `feature/125-participant-why-go`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md, @features/reference/behavior.md, and @features/reference/data-model.md in the same PR.
Update docs/user-guide/ (participant-guide.md, trip-staff-guide.md, rules.md, glossary.md, troubleshooting.md) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md` (apply, application get / update, new why-go endpoint, trip-people-roles create / update), `features/reference/behavior.md` (application form **Funding** and approved state, **Edit participant** fields), `features/reference/data-model.md` (`tripPeopleRole.whygoText`: who writes it, 2000-character limit)

**User guide updates:** `participant-guide.md` (**Funding** table, **After approval**, **Buttons**, the application overview), `trip-staff-guide.md` (**Edit participant** fields and the staff-managed list, application dialog "staff-entered" wording, **Add participant** note), `rules.md` (staff fields list; **Why go** optional), `glossary.md` (**Why go**), `troubleshooting.md` (new messages)

---

## Definition of Done

*   [x] **Why go** on the application form, optional, with the fundraising note and limit (**FR-001** to **FR-004**)
*   [x] Approved applications can save **Why go** only, with the new endpoint and message (**FR-005** to **FR-007**)
*   [x] **Edit participant** no longer shows or changes **Why go**; **Add participant** keeps it (**FR-008**, **FR-009**)
*   [x] Existing **Why go** displays unchanged (**FR-010**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/125-participant-why-go`; PR → `dev`

---

## Out of Scope

- Making **Why go** required, or adding it to completeness or approval
- Formatting, pictures, or links in **Why go**
- Letting staff edit **Why go** after the participant is added
- Changing how the fundraising page, application dialog, Trip Leaders list, or CSV show **Why go**
- Unlocking any other application field after approval
