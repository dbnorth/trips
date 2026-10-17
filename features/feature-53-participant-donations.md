# Feature: Participant Donations and Donor–Person Link

**Feature ID:** 53
**Branch pattern:** `feature/53-participant-donations`
**Status:** Implemented
**Created:** 2026-10-17
**Input:** Allow participants to donate. Their donor record is connected to their person. When staff enter a donation, the donor email lookup also looks up a person when no donor is found, and a donor can be added from the person's details.
**Depends on:** [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md), [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md), [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md), [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md), [Feature 52 — Participant Financial Statement Email Tokens](feature-52-participant-financial-tokens.md)

---

## User Stories

### US-53.1: Donate toward my own trip
**As a** participant approved on a trip
**I want to** record a donation toward my own trip costs
**So that** what I pay myself is credited to me and tied to my donor record

**Priority:** P1
**Independent test:** As an approved participant, `POST /trips/donations/participant` with yourself as the recipient creates a donation for you whose donor is linked to your person.
**Acceptance scenarios:** see ### US-53.1

### US-53.2: Donate toward another participant
**As a** person with an application on a trip
**I want to** donate toward another participant on that trip
**So that** I can support my teammates from inside the app

**Priority:** P1
**Independent test:** `POST /trips/donations/participant` with another approved participant as the recipient creates a donation for them whose donor is linked to the giver's person.
**Acceptance scenarios:** see ### US-53.2

### US-53.3: Signed-in public donations are linked to the donor's person
**As a** signed-in person giving on a public trip or participant page
**I want** my donation tied to my donor record
**So that** my giving is connected to me

**Priority:** P2
**Independent test:** `POST /trips/public/donations` with a valid sign-in token creates a donation whose donor is linked to the signed-in person.
**Acceptance scenarios:** see ### US-53.3

### US-53.4: Staff lookup finds a person when no donor exists
**As an** Org Admin or Trip Leader entering a donation
**I want** the donor email lookup to find a person when no donor has that email
**So that** I can add the donor from the person's details instead of retyping them

**Priority:** P1
**Independent test:** `GET /trips/donors/lookup?email=&tripId=` for an email that only a person in the trip's organization has returns that person's details with `personId`; saving the donation adds a donor linked to that person.
**Acceptance scenarios:** see ### US-53.4

### US-53.5: Participant donations use the donor link
**As an** Org Admin sending financial statements
**I want** a participant's own donations found by their donor link
**So that** the statement does not depend on matching emails

**Priority:** P2
**Independent test:** A donation whose donor is linked to the participant is in `{{PARTICIPANT_DONATIONS}}`; a donation from an unlinked donor with the participant's email is in `{{PARTICIPANT_TRIP_DONATIONS}}`.
**Acceptance scenarios:** see ### US-53.5

---

## Requirements

### Functional Requirements

**Donor–person link**

- **FR-001**: `donor` MUST add optional `personId` (FK → person). A person has at most one linked donor. Deleting the person clears the link. Existing donors are not linked automatically.
- **FR-002**: A person's **linked donor** is the donor whose `personId` is that person. When a flow below needs a person's donor and none is linked, it creates one from the person's first name, last name, email, address, and phone, with status `active` and `personId` set.

**Participant donations (in the app)**

- **FR-003**: A signed-in person with an application on the trip that is incomplete, applied, or approved (the people who can view their donations today) MAY donate on that trip. The recipient MUST be an approved Trip Participant or Trip Leader on the trip (the people on the public trip page).
- **FR-004**: A person MAY name themselves as the recipient only when their own application on the trip is approved. Otherwise → `403` "You can donate to yourself only on trips where you are approved."
- **FR-005**: The donation is recorded for the recipient on the trip with the giver's linked donor (**FR-002**), the entered amount and payment info, and the current date and time. Amount missing or not above `0` → `400` "Donation amount is required." Recipient not allowed by **FR-003** → `400` "Choose a participant on this trip." Giver with no application on the trip → `403` "Forbidden."
- **FR-006**: Donation event emails (Feature 45) are checked as for staff and public donations.
- **FR-007**: **My Trip Info** on the trip page (Feature 7) MUST show **Donate**. It opens a **Donate** dialog with **Donate to** (the recipients from **FR-003**, the signed-in person listed first as "Yourself" when allowed by **FR-004**, otherwise the first recipient selected), **Amount**, and **Payment info**. **Donate** saves; on success the dialog closes, shows "Thank you for your donation!", and **Donations so far** refreshes. No payment is processed.

**Signed-in public donations**

- **FR-008**: The public pages MUST send the sign-in token with the public donation when the visitor is signed in. When `POST /trips/public/donations` has a valid token, the donation uses the signed-in person's linked donor. If none is linked, the donor is created from the entered donor details with `personId` set. An existing linked donor is used as it is and not changed. A missing, invalid, or expired token → the donation is saved as today (new unlinked donor). A signed-in person naming themselves as the recipient must meet **FR-004**.

**Staff donor lookup**

- **FR-009**: `GET /trips/donors/lookup` MUST accept optional `tripId`. Lookup order:
  1. A donor with the email (ignoring case) → that donor, with `source: "donor"`.
  2. Otherwise, when the caller can manage donations on `tripId` (Org Admin of the trip's organization, Trip Leader of the trip, or System Admin) and a person with the email (ignoring case) belongs to the trip's organization (an organization role there, or an application on one of its trips; System Admin: any person):
     - the person has a linked donor → that donor, with `source: "donor"`;
     - otherwise → `{ id: null, personId, firstName, lastName, email, addLine1, addLine2, city, state_prov, postalCode, country, phoneContryCode, phoneNumber, status: "active", source: "person" }` from the person.
  3. Otherwise → `404` "Donor not found."
- **FR-010**: The **Add donation** dialog (Feature 8) MUST send the dialog's trip with the lookup. A person result fills the donor fields (editable) and shows "Person found. A donor will be added from their details." With no trip chosen yet, only donors are found.
- **FR-011**: Staff donation create and update MUST accept `donor.personId`. When given and no donor is chosen, the server checks the person as in **FR-009** step 2 (otherwise `400` "Person not found."); if the person already has a linked donor, that donor is used and updated with the entered details; otherwise a new donor is created with the entered details and `personId`. Without `donor.personId`, donor handling is unchanged.

**Financial statement rule (changes Feature 52 FR-002)**

- **FR-012**: A **participant donation** is a donation for the trip and participant whose donor is linked to the participant's person. Every other donation for the trip and participant is a **trip donation**, including donations from an unlinked donor with the participant's email. A participant with no linked donor has only trip donations. Other Feature 52 values are unchanged.

---

## Assumptions

- "Donate" records a donation the same way the public donate form does; payment is handled outside the app and described in **Payment info**.
- The recipient list for in-app donations matches the public trip page: approved Trip Participants and Trip Leaders.
- Staff donor list and donor edit do not show or change `personId`.

## Edge Cases

- Ana's application is applied → she can donate to approved teammates but not to herself.
- Ana already has a linked donor with an old address → in-app and signed-in public donations use it unchanged.
- Staff look up an email that both a donor and a person have → the donor is returned.
- Staff look up an email that only a person in another organization has → `404` (System Admin finds them).
- Two donors share the participant's email but only one is linked → only the linked donor's donations are participant donations.
- A signed-in public donation with an expired token → saved as an anonymous public donation.

## Success Criteria

- **SC-001**: A participant can record donations to themselves and teammates without staff help.
- **SC-002**: Every donation a signed-in person makes is tied to one donor record for that person.
- **SC-003**: Staff can add a donor for an existing person by email without retyping their details.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Participants create donations only on trips where they have an application, and only for approved Trip Participants or Trip Leaders on that trip.
- Participants still see only donations credited to them (Feature 8).
- The person lookup returns person details only to staff who can manage donations on the trip, and only for people in the trip's organization (System Admin: any person).

---

## Key Entities

- **Donor** (adds `personId`), **TripDonation**, **Person**

---

## API Requirements

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `POST` | `/trips/donations/participant` | auth | Body `{ tripId, personId, amount, paymentInfo }`; `personId` is the recipient. Rules in **FR-003**–**FR-006** |
| `POST` | `/trips/public/donations` | optional | Signed-in donations link the donor (**FR-008**) |
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo.donationRecipients` `[{ personId, firstName, lastName }]`: the recipients from **FR-003** when the caller's application is incomplete, applied, or approved, otherwise `[]` (feeds **Donate to**, **FR-007**) |
| `GET` | `/trips/donors/lookup` | auth | Adds optional `tripId` and the person fallback (**FR-009**); donor results include `personId` and `source` |
| `POST` / `PUT` | `/trips/donations`, `/trips/donations/:id` | auth | `donor.personId` accepted (**FR-011**) |

---

## Screen Requirements

| Where | Change |
|-------|--------|
| Trip page **My Trip Info** (`TripBrowseView`) | **Donate** button and new `ParticipantDonateDialog` (**FR-007**) |
| `DonationFormDialog` | Lookup sends the trip; person result notice (**FR-010**) |
| Public trip and participant pages | Public donation sends the sign-in token when signed in (**FR-008**); no visible change |

---

## Data Model Requirements

### `donor`

| Field | Type | Rules |
|-------|------|-------|
| personId | INTEGER | optional FK → person, unique, `ON DELETE SET NULL` |

**Associations:** `donor` `belongsTo` person as `person`; `person` `hasOne` donor as `donor`. Added to `ensureSchema` for existing databases.

---

## Acceptance Criteria (Gherkin)

### US-53.1 — Donate toward my own trip

#### Scenario: Approved participant donates to themselves
* **Given** Ana is an approved Trip Participant on trip T and has no linked donor
* **When** Ana donates `100` to herself on trip T with payment info "Check 1201"
* **Then** a donation of `100` for Ana on trip T exists with payment info "Check 1201"
* **And** its donor is linked to Ana's person with her first name, last name, and email

#### Scenario: A second donation reuses the linked donor
* **Given** Ana has a linked donor
* **When** Ana donates `50` to herself on trip T
* **Then** the donation uses her linked donor
* **And** no new donor is created

#### Scenario: Participant not approved cannot donate to themselves
* **Given** Ana's application on trip T is applied
* **When** Ana donates `100` to herself on trip T
* **Then** the response is `403` "You can donate to yourself only on trips where you are approved."

### US-53.2 — Donate toward another participant

#### Scenario: Participant donates to a teammate
* **Given** Ana's application on trip T is applied
* **And** Ben is an approved Trip Participant on trip T
* **When** Ana donates `75` to Ben on trip T
* **Then** a donation of `75` for Ben on trip T exists
* **And** its donor is linked to Ana's person

#### Scenario: Recipient must be approved on the trip
* **Given** Ana is approved on trip T and Carl's application on trip T is applied
* **When** Ana donates `75` to Carl on trip T
* **Then** the response is `400` "Choose a participant on this trip."

#### Scenario: Person without an application cannot donate
* **Given** Dana has no application on trip T and Ben is approved on trip T
* **When** Dana donates `75` to Ben on trip T
* **Then** the response is `403` "Forbidden."

#### Scenario: Amount is required
* **Given** Ana is approved on trip T
* **When** Ana donates `0` to herself on trip T
* **Then** the response is `400` "Donation amount is required."

### US-53.3 — Signed-in public donations are linked to the donor's person

#### Scenario: Signed-in public donation creates a linked donor
* **Given** Ana is signed in and has no linked donor
* **When** she donates `40` to Ben on the public page with donor first name "Ana"
* **Then** the donation's donor is linked to Ana's person

#### Scenario: Signed-in public donation uses the existing linked donor
* **Given** Ana is signed in and has a linked donor
* **When** she donates `40` to Ben on the public page
* **Then** the donation uses her linked donor
* **And** no new donor is created

#### Scenario: Public donation without sign-in is unchanged
* **Given** no one is signed in
* **When** a visitor donates `40` to Ben on the public page with donor first name "Sam"
* **Then** the donation's donor is not linked to a person

### US-53.4 — Staff lookup finds a person when no donor exists

#### Scenario: Lookup returns a donor first
* **Given** a donor and a person in trip T's organization both have email `ana@example.org`
* **When** an Org Admin looks up `ana@example.org` for trip T
* **Then** the donor is returned with `source` `donor`

#### Scenario: Lookup falls back to a person in the trip's organization
* **Given** no donor has email `ana@example.org`
* **And** Ana, a person in trip T's organization, has email `ana@example.org`
* **When** an Org Admin looks up `ana@example.org` for trip T
* **Then** the response has `id` null, Ana's `personId`, her first name, last name, and email, and `source` `person`

#### Scenario: Lookup returns the person's linked donor
* **Given** Ana has a linked donor whose email is `ana.old@example.org`
* **When** an Org Admin looks up `ana@example.org` for trip T
* **Then** Ana's linked donor is returned with `source` `donor`

#### Scenario: Lookup does not return a person from another organization
* **Given** the only match for `zoe@example.org` is a person with no role or application in trip T's organization
* **When** an Org Admin looks up `zoe@example.org` for trip T
* **Then** the response is `404` "Donor not found."

#### Scenario: Lookup does not return people to non-staff
* **Given** Ana, a person in trip T's organization, has email `ana@example.org` and no donor has it
* **When** a participant on trip T looks up `ana@example.org` for trip T
* **Then** the response is `404` "Donor not found."

#### Scenario: Saving a donation from a person adds a linked donor
* **Given** a lookup returned Ana's person details
* **When** the Org Admin saves a donation for trip T with those donor details and Ana's `personId`
* **Then** a donor linked to Ana's person exists
* **And** the donation uses that donor

### US-53.5 — Participant donations use the donor link

#### Scenario: Only the linked donor counts as a participant donation
* **Given** Ana's linked donor gave `300` on October 1, 2026
* **And** an unlinked donor with email `ana@example.org` gave `100` on October 2, 2026
* **When** a template is sent to Ana
* **Then** `{{PARTICIPANT_DONATIONS}}` is "October 1, 2026: $300.00"
* **And** `{{PARTICIPANT_TRIP_DONATIONS}}` is "October 2, 2026: $100.00"

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-53.1 | Approved participant donates to themselves | `backend/tests/participant-donations.test.js` | `Approved participant donates to themselves` |
| US-53.1 | A second donation reuses the linked donor | `backend/tests/participant-donations.test.js` | `A second donation reuses the linked donor` |
| US-53.1 | Participant not approved cannot donate to themselves | `backend/tests/participant-donations.test.js` | `Participant not approved cannot donate to themselves` |
| US-53.2 | Participant donates to a teammate | `backend/tests/participant-donations.test.js` | `Participant donates to a teammate` |
| US-53.2 | Recipient must be approved on the trip | `backend/tests/participant-donations.test.js` | `Recipient must be approved on the trip` |
| US-53.2 | Person without an application cannot donate | `backend/tests/participant-donations.test.js` | `Person without an application cannot donate` |
| US-53.2 | Amount is required | `backend/tests/participant-donations.test.js` | `Amount is required` |
| US-53.3 | Signed-in public donation creates a linked donor | `backend/tests/participant-donations.test.js` | `Signed-in public donation creates a linked donor` |
| US-53.3 | Signed-in public donation uses the existing linked donor | `backend/tests/participant-donations.test.js` | `Signed-in public donation uses the existing linked donor` |
| US-53.3 | Public donation without sign-in is unchanged | `backend/tests/participant-donations.test.js` | `Public donation without sign-in is unchanged` |
| US-53.4 | Lookup returns a donor first | `backend/tests/participant-donations.test.js` | `Lookup returns a donor first` |
| US-53.4 | Lookup falls back to a person in the trip's organization | `backend/tests/participant-donations.test.js` | `Lookup falls back to a person in the trip's organization` |
| US-53.4 | Lookup returns the person's linked donor | `backend/tests/participant-donations.test.js` | `Lookup returns the person's linked donor` |
| US-53.4 | Lookup does not return a person from another organization | `backend/tests/participant-donations.test.js` | `Lookup does not return a person from another organization` |
| US-53.4 | Lookup does not return people to non-staff | `backend/tests/participant-donations.test.js` | `Lookup does not return people to non-staff` |
| US-53.4 | Saving a donation from a person adds a linked donor | `backend/tests/participant-donations.test.js` | `Saving a donation from a person adds a linked donor` |
| US-53.5 | Only the linked donor counts as a participant donation | `backend/tests/email-financial-tokens.test.js` | `Only the linked donor counts as a participant donation` |

Feature 52's `Participant donations and trip donations are listed separately` test MUST be updated so Ana's own donation comes from her linked donor.

---

## Agent implementation request

```text
Implement Feature 53 from @features/feature-53-participant-donations.md on branch `feature/53-participant-donations`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend (and frontend if touched) before finishing.
Update @features/reference/data-model.md, @features/reference/api.md, and @features/reference/behavior.md in the same PR.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`donor.personId`), `features/reference/api.md` (participant donation endpoint, lookup `tripId` and `source`, public donation optional sign-in, `donor.personId` on staff create/update), `features/reference/behavior.md` (participant donations, linked donor, staff person lookup, Feature 52 participant donation rule)

---

## Definition of Done

*   [x] `donor.personId` with `ensureSchema` (**FR-001**); linked donor found or created (**FR-002**)
*   [x] Participant donation endpoint and rules (**FR-003**–**FR-006**); **Donate** dialog in My Trip Info (**FR-007**)
*   [x] Signed-in public donations linked (**FR-008**)
*   [x] Staff lookup person fallback and dialog notice (**FR-009**, **FR-010**); `donor.personId` on staff save (**FR-011**)
*   [x] Feature 52 participant donation rule uses the donor link (**FR-012**)
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend (and frontend if touched)
*   [ ] On `feature/53-participant-donations`; PR → `dev`

---

## Out of Scope

- Payment processing (card, PayPal, and so on)
- Linking existing donors to people automatically
- Showing a participant the donations they gave to others
- Showing or editing `personId` on the donor list or donor form
- Prefilling the public donate form from the signed-in person
