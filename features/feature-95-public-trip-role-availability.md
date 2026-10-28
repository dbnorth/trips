# Feature: Role Availability on Public Trip Pages

**Feature ID:** 95
**Branch pattern:** `feature/95-public-trip-role-availability`
**Status:** Implemented
**Created:** 2026-10-28
**Input:** "add a spec to communicate about trip status on trip signups. On the organization trips page on the card for the trip 1) display the total number of role, the number of reserved roles available and the number of unreserved roles available. If there are no roles available display there no roles available and remove the apply button. Do the same on the public Trip View page."

Clarified with the requester:
- When only reserved positions are left, the button stays but reads **Apply for Reserved**.
- Wording: "6 positions available (2 reserved, 4 open)"; a reserved or open count of 0 is left out.
- The positions available number is the reserved and open counts added together, so the numbers in parentheses always total it (not the trip's total **Number Needed**).

Follow-up (2026-10-28): "If a person is applying and logs in and there are only reserved spots and their email is not on one of the open reserved spots then don't display the application but a dialog with a message that says Thanks for your interest but all remaining spots on this trip are reserved, or if there are no spots at all then Thanks for your interest there are no spots available on this trip." → US-95.2.

Follow-up (2026-10-28): "add that on the home page of users, for trips they are not on add the availability text and use the new plan for Apply button" → FR-010.

Follow-up (2026-10-28): "on the persons home page only make the Apply button available if that person can apply" → FR-010 Apply rule.

Today the organization trips page (`/org/:orgSlug`) cards show the trip image, name, location, dates, and **View** / **Donate** / **Apply**, with nothing about how many people are needed. The public trip page (`/trip/:tripSlug`) lists each role as "N needed" or "Filled", and both pages always show **Apply**, even when the trip is full.

**Depends on:**
- [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md) (organization trips page and public trip page)
- [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md) (signed up and available)
- [Feature 56 — Reserved Role Emails](feature-56-reserved-role-emails.md) (reserved count; Available = Needed − Signed up − Reserved)

---

## User Stories

### US-95.1: Visitors see how many positions are open before applying

**As** someone looking at an organization's upcoming trips
**I want** each trip to show how many positions are available, and how many of those are reserved and how many are open
**So that** I know whether I can still sign up, and I'm not offered **Apply** on a full trip

**Acceptance:** see Gherkin scenarios under US-95.1.

### US-95.2: Signed-in applicants are told when there is no spot for them

**As** someone who signed in to apply for a trip
**I want** to be told right away when every remaining spot is reserved for someone else, or there are no spots at all
**So that** I don't start an application I can't submit

**Acceptance:** see Gherkin scenarios under US-95.2.

---

## Requirements

### Functional Requirements

**Counts**

- **FR-001**: For a trip, using the existing role capacity rules (Features 26 and 56):
  - **reserved** = the sum of each role's unfilled reservations (`reservedCount`)
  - **open** = the sum of each role's **Available** (`availableCount`, which already excludes reserved)
  - **available** = reserved + open

**Availability line**

- **FR-002**: When available > 0, the trip shows "<available> positions available (<parts>)", where `<parts>` is "<reserved> reserved" and/or "<open> open", joined by ", ", leaving out a part whose count is 0; the counts in parentheses always add up to `<available>`. Use "position" when available is 1. Examples: "6 positions available (2 reserved, 4 open)", "4 positions available (4 open)", "2 positions available (2 reserved)", "1 position available (1 open)".
- **FR-003**: When available = 0 (every position is filled, or the trip has no roles), the trip shows "No roles available".

**Apply button**

- **FR-004**: The Apply button follows the counts:
  - open > 0 → **Apply** (unchanged)
  - open = 0 and reserved > 0 → the same button reads **Apply for Reserved** (same action as **Apply**)
  - reserved + open = 0 → no Apply button
  **View** and **Donate** are unchanged.

**Where**

- **FR-005**: The **organization trips page** (`/org/:orgSlug`) shows the line from FR-002 / FR-003 on each trip card, under the dates, and each card's Apply button follows FR-004.
- **FR-006**: The **public trip page** (`/trip/:tripSlug`) shows the line from FR-002 / FR-003 above the **Donate** / **Apply** buttons, and its Apply button follows FR-004. The **Roles needed** table is unchanged.
- **FR-010**: On **Home**, the **Trips you can apply for** table (trips the person isn't on) shows the line from FR-002 / FR-003 in each row's **Status** column (today "—"). Each row shows an Apply button only when the person can apply:
  - open > 0 → **Apply**
  - open = 0 and the person holds a reservation on the trip → **Apply for Reserved**
  - otherwise → no Apply button (including when the only reserved spots are other people's)
  **View** is unchanged.

**No spot for a signed-in applicant**

- **FR-007**: A signed-in person who has **not** applied to the trip (no application of any status) has **no spot** when no role has **Available** > 0 and they hold no reservation on the trip (`myReservedTripWorkerRoleId` is empty). The message is:
  - reserved > 0 → "Thanks for your interest, but all remaining spots on this trip are reserved."
  - reserved = 0 → "Thanks for your interest, but there are no spots available on this trip."
- **FR-008**: On the signed-in trip page (`/browse-trips/:tripId`, where the apply sign-in and create-account pages send the person), when they have no spot, a dialog opens on load with the FR-007 message and **OK** (closes it). The "Thanks for your interest in applying for <trip>!" card with **Apply for this trip** is not shown, so the application isn't offered; the rest of the trip page is unchanged.
- **FR-009**: Anywhere else a new application is opened (the Apply dialog, e.g. **Apply** on Home), when the person has no spot the dialog shows only the FR-007 message and **OK** instead of the application form. Updating an existing application is unchanged.

---

## Assumptions

- The counts are the same ones staff see on Trip Status and the trip's role lists; no new capacity rule.
- Hiding or relabeling the button, and the no-spot message, are display changes only; the apply rules (Feature 26, Feature 56) are unchanged and still block applying to a full role unless the applicant holds a reservation for it.
- The signed-in trip page (`/browse-trips/:tripId`) doesn't show the availability line; it changes only as in FR-008. Home's My Trips table is unchanged.
- On Home, **Apply for Reserved** shows only to the person a reservation is for (FR-010); the public pages don't know who the visitor is, so they follow FR-004.
- A person with a reservation on the trip always gets the application (their reserved role, Feature 56).

## Edge Cases

- Nurse needs 4 (3 signed up, 1 reserved) and Doctor needs 2 (1 signed up, 1 reserved) → "2 positions available (2 reserved)" and **Apply for Reserved**.
- Every position signed up → "No roles available", no Apply button.
- Trip with no roles posted → "No roles available", no Apply button (the public trip page still shows "No roles have been posted for this trip yet." in the Roles needed section).
- A reservation filled by its person's application no longer counts as reserved (Feature 56).
- Someone who already applied (any status, including cancelled) sees their application as today, even when the trip is full.
- A reserved spot for Ana's email and nothing open → Ana gets the application; Ben (not reserved) gets "…all remaining spots on this trip are reserved."

## Success Criteria

- **SC-001**: A visitor can tell from the card or trip page alone how many positions are open or reserved, and isn't offered **Apply** on a full trip.
- **SC-002**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

No change. The counts are totals only; no names or emails of reserved people are exposed.

---

## Key Entities

- **tripWorkerRole** `quantity`, **tripPeopleRole** (occupying statuses), **tripWorkerRoleReservation** — read through the existing `tripRoleCapacity.js` helpers.

---

## API Requirements

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/trips/public/orgs/by-name/:orgSlug` | each trip adds `roleAvailability: { reserved, open }` per FR-001 |
| `GET` | `/trips/public/trips/by-name/:tripSlug/overview` | no change; the page totals `rolesNeeded` (`quantity`, `reservedCount`, `availableCount`) |
| `GET` | `/trips/trips/browse` | each trip adds `roleAvailability: { reserved, open }` per FR-001 and `myReservedTripWorkerRoleId` (the signed-in person's reservation on the trip, or null) (FR-010) |
| `GET` | `/trips/trips/browse/:id` | no change; FR-007 uses `rolesNeeded` (`reservedCount`, `availableCount`), `myReservedTripWorkerRoleId`, and `alreadyApplied` |

---

## Screen Requirements

- **Organization trips page**: availability line on each card per FR-002 / FR-003 / FR-005; Apply button per FR-004.
- **Public trip page**: availability line above the buttons per FR-002 / FR-003 / FR-006; Apply button per FR-004.
- **Home — Trips you can apply for**: availability line in the Status column and Apply button per FR-010.
- **Signed-in trip page**: no-spot dialog on load, apply invite card hidden, per FR-007 / FR-008.
- **Apply dialog**: message and **OK** instead of the form per FR-009.

---

## Data Model Requirements

None.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization "Hope Missions" with the active upcoming trip "Clinica Ezell Hospital - January 2027".
- The trip has roles Nurse (Number Needed 4) and Doctor (Number Needed 2).

### US-95.1 — Visitors see how many positions are open before applying

#### Scenario: Open and reserved positions are shown
* **Given** Nurse has 1 reserved and nothing signed up, and Doctor has 1 reserved and nothing signed up
* **When** a visitor opens the Hope Missions organization trips page
* **Then** the trip's card shows "6 positions available (2 reserved, 4 open)" and an **Apply** button
* **And** the public trip page shows the same line and an **Apply** button

#### Scenario: Only reserved positions are left
* **Given** Nurse has 3 signed up and 1 reserved, and Doctor has 1 signed up and 1 reserved
* **Then** the card and the public trip page show "2 positions available (2 reserved)" and the button reads **Apply for Reserved**

#### Scenario: A full trip has no Apply button
* **Given** Nurse has 4 signed up and Doctor has 2 signed up
* **Then** the card and the public trip page show "No roles available" and no Apply button
* **And** **View** (card) and **Donate** are still shown

#### Scenario: The organization trips API returns the counts
* **Given** Nurse has 2 signed up and 1 reserved, Doctor has 1 signed up and 1 reserved, and a cancelled Nurse application
* **When** `GET /trips/public/orgs/by-name/hope_missions` is called
* **Then** the trip has `roleAvailability` `{ reserved: 2, open: 1 }`
* **And** `GET /trips/trips/browse?orgId=<Hope Missions>` returns the same `roleAvailability` for the trip, with `myReservedTripWorkerRoleId` the Nurse role for Ana and null for Ben

#### Scenario: Home shows availability for trips the person can apply for
* **Given** Ben is signed in and isn't on the trip
* **When** he opens Home
* **Then** the trip's row in **Trips you can apply for** shows "6 positions available (2 reserved, 4 open)" in the Status column with **Apply**
* **And** with only reserved positions left, none of them Ben's, it shows "2 positions available (2 reserved)" and no Apply button
* **And** with only reserved positions left and one reserved for Ben, it shows **Apply for Reserved**
* **And** with none left it shows "No roles available" and no Apply button

### US-95.2 — Signed-in applicants are told when there is no spot for them

#### Scenario: Only reserved spots and the person isn't reserved
* **Given** Nurse has 3 signed up and 1 reserved for "ana@example.com", and Doctor has 1 signed up and 1 reserved for "cy@example.com"
* **When** Ben (ben@example.com) signs in from **Apply** and lands on the trip page
* **Then** a dialog shows "Thanks for your interest, but all remaining spots on this trip are reserved." with **OK**
* **And** the "Apply for this trip" card is not shown

#### Scenario: No spots at all
* **Given** Nurse has 4 signed up and Doctor has 2 signed up
* **When** Ben signs in from **Apply** and lands on the trip page
* **Then** a dialog shows "Thanks for your interest, but there are no spots available on this trip." with **OK**
* **And** the "Apply for this trip" card is not shown

#### Scenario: A reserved person still gets the application
* **Given** only reserved spots are left and one is reserved for "ana@example.com"
* **When** Ana signs in from **Apply** and lands on the trip page
* **Then** no dialog opens and the "Apply for this trip" card is shown

#### Scenario: The Apply dialog shows the message instead of the form
* **Given** only reserved spots are left and Ben isn't reserved
* **When** Ben opens the Apply dialog for the trip (e.g. **Apply** on Home)
* **Then** the dialog shows "Thanks for your interest, but all remaining spots on this trip are reserved." and **OK**, without the application form

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-95.1 | Open and reserved positions are shown | `frontend/tests/OrganizationTripsPage.test.js` | `Card shows open and reserved positions` |
| US-95.1 | Open and reserved positions are shown | `frontend/tests/PublicTripPage.test.js` | `Trip page shows open and reserved positions` |
| US-95.1 | Only reserved positions are left | `frontend/tests/OrganizationTripsPage.test.js` | `Only reserved positions shows Apply for Reserved` |
| US-95.1 | Only reserved positions are left | `frontend/tests/PublicTripPage.test.js` | `Only reserved positions shows Apply for Reserved` |
| US-95.1 | A full trip has no Apply button | `frontend/tests/OrganizationTripsPage.test.js` | `Full trip shows No roles available without Apply` |
| US-95.1 | A full trip has no Apply button | `frontend/tests/PublicTripPage.test.js` | `Full trip shows No roles available without Apply` |
| US-95.1 | The organization trips API returns the counts | `backend/tests/public.test.js` | `Organization trips include role availability` |
| US-95.1 | The organization trips API returns the counts | `backend/tests/applications.test.js` | `Browse trips include role availability` |
| US-95.1 | Home shows availability for trips the person can apply for | `frontend/tests/HomeTripAvailability.test.js` | `Home shows availability and Apply only when the person can apply` |
| US-95.2 | Only reserved spots and the person isn't reserved | `frontend/tests/TripBrowseNoSpot.test.js` | `Only reserved spots shows the reserved message instead of Apply` |
| US-95.2 | No spots at all | `frontend/tests/TripBrowseNoSpot.test.js` | `No spots shows the no spots message instead of Apply` |
| US-95.2 | A reserved person still gets the application | `frontend/tests/TripBrowseNoSpot.test.js` | `A reserved person still sees Apply for this trip` |
| US-95.2 | The Apply dialog shows the message instead of the form | `frontend/tests/ApplyTripDialog.test.js` | `Apply dialog shows the no spot message instead of the form` |

---

## Agent implementation request

```text
Implement Feature 95 from @features/feature-95-public-trip-role-availability.md on branch `feature/95-public-trip-role-availability`.

Backend: in dashboard.controller.js getOrgTripsBySlug, add roleAvailability { reserved, open } to each open trip using withCapacityFields (tripRoleCapacity.js) over the trip's tripWorkerRoles (FR-001).
Frontend: add a small helper (e.g. frontend/src/utils/roleAvailability.js) that builds the FR-002 / FR-003 line and the FR-004 button label (or none) from { reserved, open }, plus a function totalling rolesNeeded for the public trip page. Use it in OrganizationTripsPage.vue (card line under dates, Apply button) and PublicTripPage.vue (line above the buttons, Apply button). Roles needed table unchanged.
No spot (US-95.2): add a helper (same util file) that returns the FR-007 message or "" from { rolesNeeded, myReservedTripWorkerRoleId, alreadyApplied }. In TripBrowseView.vue, when it returns a message after load, open a dialog with the message and OK and hide the apply invite card (FR-008). In ApplyTripDialog.vue, for a new application with a message, show only the message and OK instead of the form (FR-009).
Tests per the Test Coverage Map. Update features/reference/behavior.md (public pages, signed-in trip page, Apply dialog) and features/reference/api.md (orgs/by-name response).
```

---

## Definition of Done

*   [x] Counts per **FR-001**
*   [x] Availability line per **FR-002** / **FR-003**
*   [x] Apply button per **FR-004**
*   [x] Organization trips page per **FR-005**; public trip page per **FR-006**
*   [x] Home trips to apply for per **FR-010**
*   [x] No-spot message per **FR-007**; signed-in trip page per **FR-008**; Apply dialog per **FR-009**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [x] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Changing role capacity, reservation, or apply rules
- Per-role reserved / open columns in the public **Roles needed** table
- The availability line on the signed-in trip page and Home's My Trips table, and staff screens
