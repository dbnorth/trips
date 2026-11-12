# Feature: Donor lookup by name or email

**Feature ID:** 131
**Branch pattern:** `feature/131-donor-lookup-by-name`
**Status:** Implemented
**Created:** 2026-11-12
**Input:** On Add donation on the Donations page, and on the public donation pages, search for a donor by name or email.

**Depends on:**
- [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md)
- [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md)
- [Feature 100 — Online Donations with Stripe](feature-100-stripe-donations.md)
- [Feature 130 — Donor Maintenance](feature-130-donor-maintenance.md)

---

## User Stories

### US-131.1: Find a donor by name or email

**As** an organization admin recording a donation
**I want** **Look up** on **Add donation** to accept a name or an email
**So that** I can fill in a donor I know by name

**Priority:** P1
**Independent test:** Look up "Smith" and "Ada@Example.com" on a trip that has those donors
**Acceptance scenarios:** see ### US-131.1

### US-131.2: Find a donor on the public donation page

**As** a person giving on a public donation page
**I want** to look up a donor by name or email
**So that** the gift is recorded on that donor

**Priority:** P1
**Independent test:** Search on the public trip page and pay; the checkout stores that donor
**Acceptance scenarios:** see ### US-131.2

---

## Requirements

### Functional Requirements

- **FR-001**: **Add donation** (Donations list, and the same dialog elsewhere) has **Name or email** and **Look up**. A blank value shows "Enter a donor name or email to look up." Fewer than two letters, and not an email, shows "Enter at least two letters of the name, or an email."
- **FR-002**: An email (the text contains `@`) matches a donor of the trip's organization by that exact email, then a person in that organization, as donor email lookup already does. One donor fills the form: "Donor found. Review and update details below if needed." A person with no donor yet shows "Person found. A donor will be added from their details." No match shows "Donor not found. Enter donor details below." and leaves the email in **Donor email** when the text contains `@`.
- **FR-003**: Any other text matches donors of the trip's organization whose organization name, family name, first name, last name, or shown name contains it, ignoring letter case and extra spaces. At most 20 matches, in the Donors list order. One match fills the form with the donor-found message. More than one shows "Several donors match. Choose one." and a button per match (shown name, then city and state when they are saved, then email when the donor has one). Choosing a button fills the form. No match shows "Donor not found. Enter donor details below." and does not put the name in **Donor email**.
- **FR-004**: The public trip donate page and the participant fundraising page have the same **Name or email** and **Look up**. The search uses that trip's organization only. The response is the donor's id, shown name, city, and state, not email, street address, or phone. Each choice shows the name, then the city and state when they are saved. No match shows "Donor not found. Enter your name and email below." One match, or a chosen match, shows "Donor found." and puts the shown name in **Your first name**. **Pay with Stripe** records the gift on that donor. A donor id that is not in the trip's organization → `404` "Donor not found."
- **FR-005**: A donor of another organization is not a match. An inactive trip → `404` "Trip not found." on the public search.

## Assumptions

- Staff lookup stays available to anyone who can already call donor lookup, and a `tripId` still scopes it to that trip's organization.
- `?email=` on the staff lookup still means an email, so existing callers keep working.

## Edge Cases

- Two donors share a last name → the chooser lists both.
- A one-letter name is refused.
- The public search never includes the donor's email in the response.

## Success Criteria

- **SC-001**: Each Gherkin scenario has an automated test.

## Key Entities

- **Donor**: existing organization donor, found by name or email.

## API Requirements

| Method | Path | Auth | Request / response |
|--------|------|------|--------------------|
| `GET` | `/trips/donors/lookup` | auth | `?q=` name or email, optional `tripId`. Email behavior unchanged. Name → one donor, `{ matches }`, or `404` "Donor not found." Blank → `400` "Enter a donor name or email to look up." Short name → `400` "Enter at least two letters of the name, or an email." |
| `GET` | `/trips/public/donors/search` | none | `?tripId=&q=` → `{ matches: [{ id, name, city, state }] }`. Same blank and short-name messages. Unknown or inactive trip → `404` "Trip not found." |
| `POST` | `/trips/public/donations/stripe-checkout` | optional | `donor.id`, when sent, must be a donor of the trip's organization, and the checkout records that donor. Otherwise `404` "Donor not found." |

## Screen Requirements

**Add donation:** **Name or email** replaces the lookup **Donor email** label. **Donor email** below the name fields stays.

**Trip donate page** and **Participant fundraising page:** **Name or email** and **Look up** sit above **Your first name**.

## Data Model Requirements

No new columns. The checkout already stores `donorId`.

## Acceptance Criteria (Gherkin)

### US-131.1 — Find a donor by name or email

#### Scenario: Add donation finds a donor by name or email
* **Given** Hope Mission has donors Ada Smith, Ben Smith, Hope Church, and Adam & Deb Dingwell
* **When** an admin looks up "Hope Church", "Adam & Deb", "Ada@Example.com", and "Smith" for that trip
* **Then** Hope Church and Adam & Deb Dingwell each fill in as the one match
* **And** the email finds Ada Smith
* **And** "Smith" returns Ada and Ben to choose from
* **And** "A" is refused with "Enter at least two letters of the name, or an email."

### US-131.2 — Find a donor on the public donation page

#### Scenario: The public donation page finds a donor by name without revealing contact details
* **Given** the same trip
* **When** a visitor searches "ada@example.com"
* **Then** the only result is Ada Smith, Cabot, AR
* **And** the response does not include her email
* **And** a donor of another organization is not returned
* **When** the visitor pays with that donor
* **Then** the checkout is stored on Ada Smith
* **And** an unknown donor id is refused with "Donor not found."

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-131.1 | Add donation finds a donor by name or email | `backend/tests/donor-lookup.test.js` | `Add donation finds a donor by name or email` |
| US-131.1 | Add donation finds a donor by name or email | `frontend/tests/StripeDonations.test.js` | `Add donation looks up a donor by name` |
| US-131.2 | The public donation page finds a donor by name without revealing contact details | `backend/tests/donor-lookup.test.js` | `The public donation page finds a donor by name without revealing contact details` |
| US-131.2 | The public donation page finds a donor by name without revealing contact details | `frontend/tests/StripeDonations.test.js` | `The public donation page looks up a donor by name` |

## Agent implementation request

```text
Implement Feature 131 from @features/feature-131-donor-lookup-by-name.md on branch `feature/131-donor-lookup-by-name`.
```

## Definition of Done

*   [x] **Name or email** lookup on **Add donation** (**FR-001**–**FR-003**)
*   [x] Public donation pages search by name or email and record the chosen donor (**FR-004**, **FR-005**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `features/reference/` updated
*   [x] User guide and PDFs updated
*   [ ] PR to `dev`

## Out of Scope

- Searching people by name (email still finds a person, as before).
- Home **Donate** and My Trip **Make Donation**.
