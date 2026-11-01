# Online Donations with Stripe, Donation Types, Trip Donation Email, and Donation Date Range

**Feature ID:** 100
**Branch pattern:** `feature/100-stripe-donations`
**Status:** Draft
**Created:** 2026-10-29
**Input:** "write a spec to allow donations by using Square Space. add to all public and participant donation pages a option to pay by Square Space. Use the Square Space documentation to create the interface to Square Space and pass the Trip Name and Participant Name and amount of donation. Record the result of the completed donation in the donation record with date, transaction id from Square Space and any other data returned by square space. Org Admin should still be able to enter donations manually with the amount. Donations records should have a type of SquareSpace, Check (include check number field), or Other. When a successful donation is made an email should be sent with a new Trip Donation email template with tokens for donation date, donation type, donation amount. The template should include trip and participant info. The Donation page should be able to export a CSV of donation of the currently selected donations (start and end date)" — then "change the spec to Use Stripe"

Today the public trip and participant donation pages and the signed-in **Donate** dialog record a donation without taking any payment. This feature has donors pay online through **Stripe Checkout**: the app creates a Stripe-hosted payment page named for the trip and participant with the donation amount, and records the donation once Stripe reports it paid, with the Stripe payment details. Staff still enter donations by hand, now with a **Type** (Check, with a check number, or Other). Every new donation sends a new **Trip donation** email to the donor and the participant. The **Donations** page gets a start and end date that limit the list and its CSV export.

## Clarifications

### Session 2026-10-29

- Q: Squarespace has no API for taking a payment from another website. Which provider? → A: First Square; then changed to **Stripe** (Checkout Sessions API). The donation type is **Stripe**.
- Q: Whose payment account receives the money? → A: Each organization connects its own Stripe account in **Edit organization**; the organization's **Test mode** uses Stripe test mode. Stripe has no separate sandbox address (test or live is set by the key), so each organization saves a live secret key and a test secret key, and **Test mode** picks the test key.
- Q: Which screens get online payment? → A: The public trip donation page, the public participant donation page, and the signed-in **Donate** dialog in **My Trip Info**.
- Q: What happens to recording a donation without paying on those screens? → A: Replaced: donors can only give there by paying with Stripe.
- Q: Who receives the Trip Donation email? → A: Both the donor and the participant.
- Q: Which donations send it? → A: Every new donation, including Check and Other entered by staff.

**Depends on:**
- [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md) (donations, **Donations** page, staff donation form, donations CSV)
- [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md) (public trip and participant donation pages)
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md) (email types, Send Now templates)
- [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md) (event emails on a new donation)
- [Feature 49 — Organization Email Test Mode](feature-49-organization-email-test-mode.md) (organization **Test mode**)
- [Feature 53 — Participant Donations](feature-53-participant-donations.md) (**Donate** dialog, linked donors)
- [Feature 93 — Org Admin Edit Organization](feature-93-org-admin-edit-organization.md) (Org Admins edit their organization)

---

## User Stories

### US-100.1: Connect an organization's Stripe account

**As** an Org Admin
**I want** to enter my organization's Stripe secret keys
**So that** donations to our trips are paid into our Stripe account

**Acceptance:** see Gherkin scenarios under US-100.1.

### US-100.2: Donors pay with Stripe on the public donation pages

**As** a donor on a public trip or participant donation page
**I want** to pay my donation with Stripe
**So that** my gift is actually paid, not just pledged

**Acceptance:** see Gherkin scenarios under US-100.2.

### US-100.3: Participants pay with Stripe from the Donate dialog

**As** a participant giving to myself or a teammate
**I want** the **Donate** dialog to take me to Stripe to pay
**So that** my donation is paid like any other

**Acceptance:** see Gherkin scenarios under US-100.3.

### US-100.4: A completed Stripe payment is recorded

**As** trip staff
**I want** each paid Stripe checkout recorded once as a donation with its Stripe details
**So that** totals are right and I can match donations to Stripe

**Acceptance:** see Gherkin scenarios under US-100.4.

### US-100.5: Staff record Check and Other donations

**As** an Org Admin (or other trip staff)
**I want** to enter a donation by hand with its amount, type, and check number
**So that** gifts received outside Stripe are counted

**Acceptance:** see Gherkin scenarios under US-100.5.

### US-100.6: Trip Donation email

**As** a donor or participant
**I want** an email when a donation is made
**So that** I have a record of the gift with the trip and participant

**Acceptance:** see Gherkin scenarios under US-100.6.

### US-100.7: Donations for a date range, with CSV

**As** trip staff
**I want** to choose a start and end date on the **Donations** page and export those donations
**So that** I can reconcile a period's gifts

**Acceptance:** see Gherkin scenarios under US-100.7.

---

## Requirements

### Functional Requirements

#### Stripe account (US-100.1)

- **FR-001**: **Edit organization** (and **Add organization**) has an **Online donations (Stripe)** section after **Test mode** with **Stripe secret key** and **Stripe test secret key** (password fields), with the hint "Test mode uses the test key.". A secret key must start with `sk_live_` or `rk_live_`, else "Enter a live Stripe secret key (sk_live_ or rk_live_)."; a test key must start with `sk_test_` or `rk_test_`, else "Enter a test Stripe secret key (sk_test_ or rk_test_)." (also `400` from the API). Keys are stored encrypted, never returned by any API or written to logs, and leaving a field blank keeps the saved key; each field with a saved key has the hint "A key is saved. Leave blank to keep it.". Organization responses add `stripeKeySaved` and `stripeTestKeySaved`. Only those who can edit the organization today (System Admin, Org Admin of the organization) can change these.
- **FR-002**: Online donations are **set up** for an organization when it has the key for its current mode: the test key when **Test mode** is on, otherwise the secret key. The key used is chosen when the checkout is created and the checkout remembers which mode it used.

#### Paying with Stripe (US-100.2, US-100.3)

- **FR-003**: The public trip donation page and the public participant donation page keep their donor fields (first name, last name, email) and **Amount**, and replace **Donate** with **Pay with Stripe**. The trip page's **Donate** dialog keeps **Donate to** and **Amount**, removes **Payment info**, and replaces **Donate** with **Pay with Stripe**. Clicking it starts a checkout (FR-005, FR-006) and sends the browser to the returned Stripe page. When online donations aren't set up for the trip's organization, each screen shows "Online donations aren't set up for this organization yet." and no **Pay with Stripe**.
- **FR-004**: Checkout validation, before calling Stripe: amount of at least $0.50 (Stripe's minimum), else `400` "Donation amount must be at least $0.50."; on the public pages, first name and email are required, else `400` "Your first name and email are required."; online donations not set up → `400` "Online donations aren't set up for this organization yet.". The recipient rules of today's donation on that screen still apply (public pages: Feature 9 / Feature 53, including naming yourself only when approved; **Donate** dialog: Feature 53, with the same messages).
- **FR-005**: Starting a checkout saves a **donation checkout** (pending) and calls Stripe **Create a Checkout Session** (`POST https://api.stripe.com/v1/checkout/sessions`, form-encoded, authenticated with the organization's key for the mode, header `Idempotency-Key: <checkout token>`, `Stripe-Version` pinned to the API version current at implementation) with:
  - `mode=payment`, `submit_type=donate`;
  - `line_items[0][quantity]=1`;
  - `line_items[0][price_data][currency]=usd`;
  - `line_items[0][price_data][unit_amount]`: the amount in cents;
  - `line_items[0][price_data][product_data][name]`: "<trip name> – <participant first and last name>", or "<trip name>" with no participant;
  - `payment_intent_data[description]`: "Trip: <trip name>; Participant: <participant name or none>; Donor: <donor first and last name>";
  - `metadata[tripName]`, `metadata[participantName]`, and the same keys under `payment_intent_data[metadata]` (participant name blank with none);
  - `client_reference_id`: the checkout token;
  - `customer_email`: the donor's email when known;
  - `success_url`: `<APP_URL>/donate/complete/<token>`;
  - `cancel_url`: `<APP_URL><returnPath>`.
  It stores Stripe's session id and URL on the checkout and returns `{ checkoutUrl }`. No donation is recorded yet. Stripe refusing or failing → `502` "Stripe couldn't start the payment. Please try again." and the checkout is not kept.
- **FR-006**: The donor on a public page is the signed-in person's linked donor when signed in, otherwise found or created from the entered details as today's public donation does (Feature 53). On the **Donate** dialog it is the signed-in person's linked donor (created from their person when missing). The donor is resolved when the donation is recorded (FR-008).
- **FR-007**: The existing endpoints that record a donation without payment, `POST /trips/public/donations` and `POST /trips/donations/participant`, are removed.

#### Recording the payment (US-100.4)

- **FR-008**: **Checking a checkout** retrieves its session (`GET https://api.stripe.com/v1/checkout/sessions/{id}` with `expand[]=payment_intent.latest_charge`). When the session's `payment_status` is `paid`, it records one donation (in one transaction, at most once per Stripe payment intent) with: the checkout's trip, participant, and donor (FR-006); `amount` = the session's `amount_total` in dollars; `dateTime` = the payment intent's `created` time; type **Stripe**; `stripeCheckoutSessionId`, `stripePaymentIntentId`, `stripeChargeId` (the latest charge id), `stripeReceiptUrl` (the latest charge's `receipt_url`); and `stripeData` = the session Stripe returned (with the expanded payment intent and charge), as JSON. The checkout becomes `completed` and links the donation, and the donation event emails (Feature 45) and the Trip Donation email (FR-013) are sent. A session whose `status` is `expired` makes the checkout `expired`. Anything else leaves it `pending` and records nothing.
- **FR-009**: Stripe returns the donor to `/donate/complete/<token>` after paying (and to the starting page if they cancel). That public page checks the checkout (FR-008) and shows:
  - completed: "Thank you for your donation!", "<amount> to <trip name> for <participant name>" (or "<amount> to <trip name>"), a **Receipt** link to the Stripe receipt (new tab) when there is one, and **Back** to the page the donor started from;
  - pending: "Waiting for Stripe to confirm your payment…", checking again every 5 seconds up to 6 times, then "Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly." with **Back**;
  - expired: "This donation link has expired." with **Back**;
  - unknown token: "Donation not found.".
  Checking a completed checkout again records nothing new.
- **FR-010**: While the server runs, every 10 minutes it checks every pending checkout created in the last 25 hours (FR-008), so a payment is recorded even when the donor never returns to the app. Pending checkouts older than 25 hours become `expired` (Stripe sessions expire after 24 hours). A Stripe error on one checkout is logged and the rest are still checked.

#### Donation types and manual entry (US-100.5)

- **FR-011**: Every donation has a **Type**: **Stripe**, **Check**, or **Other**. The staff donation form (**Add donation** / **Edit**) adds **Type** (Check or Other, default Other) after **Amount**, and **Check number** (up to 50 characters) shown only for Check. Saving a Check without a check number → "Check number is required." (also `400` from the API); saving as Other clears the check number. The API refuses type Stripe on staff create or update with `400` "Choose Check or Other.". Staff entry is otherwise unchanged (amount, date, donor, participant, payment info).
- **FR-012**: A Stripe donation's **Edit** shows **Type** "Stripe", **Amount**, and **Date** read-only, plus its Stripe payment intent id with the **Receipt** link; staff may still change its participant, donor, and payment info. An update that changes a Stripe donation's amount, date, type, check number, or Stripe fields → `400` "A Stripe donation's amount, date, and type can't be changed.". Deleting is unchanged (refunds are done in Stripe). On the first startup after this feature, every existing donation gets type Other.

#### Trip Donation email (US-100.6)

- **FR-013**: A new email type **Trip donation** (type code `trip-donation`, event code `trip-donation`) is seeded at startup. On every new donation (staff create, and a recorded Stripe payment; not edits), each of the trip's Send Now templates of that type (otherwise its organization's, as Feature 45 chooses templates) is sent separately to the participant's email (when the donation has a participant) and to the donor's email (when the donor has one), each address once; the template's **To** is not used. Tokens fill as for the participant (participant tokens blank without one). Organization **Test mode** applies (Feature 49). Sending never blocks or undoes saving; failures are logged.
- **FR-014**: New value sources `donation.date` "Donation date" (date only, formatted like other date tokens), `donation.type` "Donation type" (Stripe, Check, or Other), and `donation.amount` "Donation amount" (formatted like other money tokens), with seeded tokens `DONATION_DATE`, `DONATION_TYPE`, and `DONATION_AMOUNT`. They fill only for the Trip Donation email of a donation, and are blank everywhere else (previews, other sends).
- **FR-015**: `backend/app/data/emailTemplates.json` adds a `trip-donation` Send Now template (From `{{ORG_EMAIL}}`, To `{{PARTICIPANT_EMAIL}}`) with subject "Thank you for your donation to {{TRIP_NAME}}" and a body that thanks the donor and lists the trip (name, location, start and end dates), the participant (first and last name), and the donation (date, type, amount), signed by `{{ORG_NAME}}`.

#### Donations date range and CSV (US-100.7)

- **FR-016**: The **Donations** page adds **Start date** and **End date** (date fields, both optional) after **Trip**. The list shows the selected trip's donations whose date is on or after the start date and on or before the end date (either blank means no limit), and adds a **Type** column after **Amount** (with the check number for Check, e.g. "Check #1042"). The summary cards keep showing the whole trip. A start date after the end date shows "Start date must be on or before End date.", empties the list, and disables **Export CSV**.
- **FR-017**: **Export CSV** downloads the donations the list shows (selected trip, start and end date), newest first, with columns **Date**, **Amount**, **Type**, **Check Number**, **Participant**, **Donor**, **Donor Email**, **Payment Info**, **Stripe Payment ID** (payment intent), **Stripe Charge ID**. The file is named `trip-<tripId>-donations.csv`, or `trip-<tripId>-donations-<start>-to-<end>.csv` when a date is chosen (a blank side written as `start` / `end`). Who may export is unchanged.

---

## Assumptions

- All payments are in USD; Stripe's minimum charge is $0.50.
- Each organization uses its own Stripe account and copies its secret keys from the Stripe Dashboard (a restricted key with Checkout Sessions write and read access is enough); no Stripe Connect or OAuth flow is built.
- Stripe sends the donor its own receipt when the account's receipt emails are on; the Trip Donation email is sent as well.
- Stripe's default payment methods for the account are offered; no tipping, promotion codes, or tax.
- Stripe is never called in automated tests; tests replace the HTTP calls to Stripe.

## Edge Cases

- A donor cancels or closes Stripe without paying → the checkout stays pending, nothing is recorded, and it expires after 25 hours.
- A donor pays but closes the browser before returning → the background check records it within about 10 minutes (FR-010).
- The return page and the background check run at the same time → only one donation is recorded (unique Stripe payment intent id).
- A payment method that settles later (e.g. a bank debit) leaves `payment_status` `unpaid` at first → it is recorded only if paid before the checkout expires; later settlement is out of scope.
- The organization turns **Test mode** on or off after a checkout started → that checkout keeps the mode and key it started with.
- The organization's key is removed or wrong when a checkout is checked → the check fails, is logged, and the checkout stays pending until it expires.
- The donor is also the participant (a participant giving to themselves) → one Trip Donation email to that address.
- A donation with no participant and a donor without an email → no Trip Donation email.
- Stripe's `amount_total` differs from the checkout amount → the donation records Stripe's amount.

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: A test-mode payment made through a real Stripe test account (card 4242 4242 4242 4242) is recorded with its Stripe payment intent id and sends the Trip Donation email (manual check).

---

## Data Ownership & Isolation

- Each organization's Stripe keys are used only for its own trips' checkouts; the keys are encrypted at rest and never returned (FR-001).
- A donation checkout is reached only through its random token; the return page shows only that checkout's amount, trip, participant, and receipt.
- Donation list, edit, and export access is unchanged (Feature 8, Feature 69).

---

## Key Entities

- **organization**: adds the Stripe secret key and test secret key.
- **donationCheckout** (new): one attempt to pay a donation through Stripe.
- **tripDonation**: adds type, check number, and Stripe payment fields.
- **emailType** / **emailToken**: Trip donation type and the three donation tokens.

---

## API Requirements

| Method | Path | Auth | Change |
|---|---|---|---|
| `PUT` / `POST` | `/trips/organizations…` | as today | Accept `stripeSecretKey` and `stripeTestSecretKey` (blank keeps; prefix checked); responses add `stripeKeySaved`, `stripeTestKeySaved`, never the keys (FR-001) |
| `GET` | public trip / participant page endpoints | public | Add `onlineDonations` (true when set up for the trip's organization) (FR-003) |
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo` adds `onlineDonations` (FR-003) |
| `POST` | `/trips/public/donations/stripe-checkout` | optional | New. Body `{ tripId, personId?, amount, donor: { firstName, lastName, email }, returnPath }` → `{ checkoutUrl }` (FR-004–FR-006) |
| `POST` | `/trips/donations/participant/stripe-checkout` | auth | New. Body `{ tripId, personId, amount, returnPath }` → `{ checkoutUrl }` (FR-004–FR-006) |
| `POST` | `/trips/public/donations/stripe-checkout/:token/check` | public | New. Checks the checkout (FR-008) → `{ status: "completed" \| "pending" \| "expired", amount, tripName, participantName, receiptUrl, returnPath }`; unknown token → `404` "Donation not found." |
| `POST` | `/trips/public/donations` | — | Removed (FR-007) |
| `POST` | `/trips/donations/participant` | — | Removed (FR-007) |
| `POST` / `PUT` | `/trips/donations`, `/trips/donations/:id` | auth | `donationType` (`Check` / `Other`), `checkNumber` (FR-011, FR-012) |
| `GET` | `/trips/donations` | auth | Optional `startDate`, `endDate` (`YYYY-MM-DD`, inclusive); rows add `donationType`, `checkNumber`, `stripePaymentIntentId`, `stripeReceiptUrl` (FR-016) |
| `GET` | `/trips/export/trips/:tripId/donations.csv` | auth | Optional `startDate`, `endDate`; new columns and file name (FR-017) |
| `GET` | `/trips/email-tokens/value-sources` | System Admin | Adds `donation.date`, `donation.type`, `donation.amount` (FR-014) |

`returnPath` must be a path within the app (starts with a single `/`); anything else is replaced by the trip's public donation page path.

---

## Screen Requirements

- **Edit organization** / **Add organization**: **Online donations (Stripe)** section (FR-001).
- Public trip donation page, public participant donation page, trip page **Donate** dialog: **Pay with Stripe**, not-set-up message (FR-003).
- New public page `/donate/complete/:token` (FR-009).
- Staff donation form: **Type**, **Check number**, read-only Stripe fields (FR-011, FR-012).
- **Donations** page: **Start date**, **End date**, **Type** column, range-aware **Export CSV** (FR-016, FR-017).

---

## Data Model Requirements

### `organization` (add)

| Field | Type | Rules |
|---|---|---|
| stripeSecretKey | Encrypted text | optional; `sk_live_` / `rk_live_`; never returned (FR-001) |
| stripeTestSecretKey | Encrypted text | optional; `sk_test_` / `rk_test_`; never returned (FR-001) |

### `donationCheckout` (new)

| Field | Type | Rules |
|---|---|---|
| id | INTEGER PK | autoIncrement |
| token | STRING(64) | required, unique, random |
| tripId | INTEGER | required FK → trip (`ON DELETE CASCADE`) |
| personId | INTEGER | optional FK → person (recipient, `ON DELETE SET NULL`) |
| giverPersonId | INTEGER | optional FK → person (signed-in giver, `ON DELETE SET NULL`) |
| donorFirstName, donorLastName, donorEmail | STRING | entered donor details (public pages) |
| amount | DECIMAL(10,2) | required |
| stripeTestMode | BOOLEAN | required; which key was used (FR-002) |
| stripeCheckoutSessionId | STRING(255) | from Stripe |
| stripeCheckoutUrl | TEXT | from Stripe |
| returnPath | STRING(500) | where **Back** and Stripe's cancel go |
| status | ENUM(`pending`,`completed`,`expired`) | required, default `pending` |
| tripDonationId | INTEGER | optional FK → tripDonation (`ON DELETE SET NULL`) |
| createdAt, updatedAt | DATE | |

### `tripDonation` (add)

| Field | Type | Rules |
|---|---|---|
| donationType | ENUM(`Stripe`,`Check`,`Other`) | required, default `Other`; existing rows `Other` |
| checkNumber | STRING(50) | required for Check, null otherwise |
| stripeCheckoutSessionId | STRING(255) | optional |
| stripePaymentIntentId | STRING(255) | optional, unique |
| stripeChargeId | STRING(255) | optional |
| stripeReceiptUrl | STRING(500) | optional |
| stripeData | TEXT | optional; Stripe session (with payment intent and charge) as JSON |

`ensureSchema` adds the columns and table on startup and seeds the email type and tokens.

---

## Acceptance Criteria (Gherkin)

Background:
- Organization Hope Missions (email info@hope.org, Test mode off) has trip "Guatemala Clinic 2027" (Guatemala City, March 1–10, 2027).
- Ana Lopez is an approved Trip Participant on the trip.
- Olivia is Org Admin of Hope Missions.
- Stripe calls are replaced in tests; creating a session returns id `cs_1` and URL `https://checkout.stripe.com/c/pay/cs_1`.

### US-100.1 — Connect an organization's Stripe account

#### Scenario: An Org Admin saves the Stripe keys
* **Given** Olivia is signed in
* **When** she updates Hope Missions with Stripe secret key "sk_live_abc" and test secret key "sk_test_xyz"
* **Then** the organization response has `stripeKeySaved` and `stripeTestKeySaved` true and no keys
* **And** the stored keys are encrypted
* **And** updating again with blank keys keeps the saved keys
* **And** saving "sk_test_xyz" as the secret key is refused with `400` "Enter a live Stripe secret key (sk_live_ or rk_live_)."

#### Scenario: Edit organization shows the Stripe section
* **Given** Olivia opens **Edit organization** for Hope Missions, which has both keys saved
* **Then** she sees **Stripe secret key** and **Stripe test secret key**, both empty with the hint "A key is saved. Leave blank to keep it.", and the hint "Test mode uses the test key."

### US-100.2 — Donors pay with Stripe on the public donation pages

#### Scenario: A public donor starts a Stripe payment
* **Given** Hope Missions has its Stripe secret key saved
* **When** a donor, Carl Diaz (carl@example.com), starts a $50.00 checkout for Ana on the public participant page
* **Then** Stripe **Create a Checkout Session** is called with the secret key, `mode=payment`, `submit_type=donate`, name "Guatemala Clinic 2027 – Ana Lopez", `unit_amount` 5000 `usd`, description "Trip: Guatemala Clinic 2027; Participant: Ana Lopez; Donor: Carl Diaz", `customer_email` carl@example.com, `success_url` `/donate/complete/<token>`, and `cancel_url` the participant page
* **And** the response is `{ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_1" }`
* **And** a pending checkout is saved and no donation is recorded

#### Scenario: Test mode uses the test key
* **Given** Hope Missions has both keys saved and Test mode on
* **When** a donor starts a checkout for the trip
* **Then** Stripe is called with the test secret key and name "Guatemala Clinic 2027"

#### Scenario: Checkout input is validated
* **Given** Hope Missions has its Stripe secret key saved
* **When** a public donor starts a checkout for $0.25, or without an email
* **Then** the responses are `400` "Donation amount must be at least $0.50." and `400` "Your first name and email are required." and Stripe is not called

#### Scenario: Online donations not set up
* **Given** Hope Missions has only a test key saved and Test mode off
* **When** a donor opens the public participant page for Ana, or starts a checkout through the API
* **Then** the page shows "Online donations aren't set up for this organization yet." and no **Pay with Stripe**
* **And** the API answers `400` "Online donations aren't set up for this organization yet."

#### Scenario: The public page sends the donor to Stripe
* **Given** the public participant page for Ana with online donations set up
* **When** the donor fills in their name, email, and $50 and clicks **Pay with Stripe**
* **Then** the checkout is started for Ana with $50 and the donor's details, and the browser goes to `https://checkout.stripe.com/c/pay/cs_1`

#### Scenario: Donations without payment are no longer accepted
* **When** someone posts to `POST /trips/public/donations` or `POST /trips/donations/participant`
* **Then** the response is `404` and no donation is recorded

### US-100.3 — Participants pay with Stripe from the Donate dialog

#### Scenario: The Donate dialog pays with Stripe
* **Given** Ana opens **Donate** on the trip page with online donations set up
* **Then** it has **Donate to** and **Amount**, no **Payment info**, and **Pay with Stripe**
* **When** she chooses Yourself and $25 and clicks **Pay with Stripe**
* **Then** the participant checkout is started for Ana with $25 and the browser goes to the Stripe URL

#### Scenario: Participant checkouts keep the donation rules
* **Given** Ben has an applied (not approved) application on the trip
* **When** Ben starts a participant checkout for himself
* **Then** the response is `403` "You can donate to yourself only on trips where you are approved." and Stripe is not called

### US-100.4 — A completed Stripe payment is recorded

#### Scenario: A completed payment is recorded once
* **Given** Carl's pending checkout for Ana for $50.00 (session `cs_1`)
* **And** Stripe reports session `cs_1` with `payment_status` `paid`, `amount_total` 5000, payment intent `pi_1` created 2027-01-15T14:30:00Z, and latest charge `ch_1` with receipt URL `https://pay.stripe.com/receipts/ch_1`
* **When** the checkout is checked twice
* **Then** exactly one donation exists for Ana: type Stripe, amount 50.00, date 2027-01-15 14:30 UTC, session `cs_1`, payment intent `pi_1`, charge `ch_1`, the receipt URL, and the session JSON, with Carl as donor
* **And** the checkout is completed and both answers are `completed` with the amount, trip, participant, and receipt URL
* **And** the donation event emails and the Trip Donation email are sent once

#### Scenario: An unpaid checkout isn't recorded
* **Given** a pending checkout whose Stripe session is `open` and `unpaid`
* **When** it is checked
* **Then** the answer is `pending` and no donation is recorded
* **And** when Stripe later reports the session `expired`, checking it answers `expired`

#### Scenario: The background check records a payment the donor didn't return from
* **Given** two pending checkouts from today, one paid in Stripe and one not, and one pending checkout from 26 hours ago
* **When** the background check runs
* **Then** the paid one is recorded and completed, the unpaid one stays pending, and the 26-hour-old one is expired

#### Scenario: The return page thanks the donor
* **Given** the checkout check answers `completed` with $50.00, "Guatemala Clinic 2027", "Ana Lopez", and a receipt URL
* **When** the donor lands on `/donate/complete/<token>`
* **Then** the page shows "Thank you for your donation!", "$50.00 to Guatemala Clinic 2027 for Ana Lopez", a **Receipt** link, and **Back**

#### Scenario: The return page waits for confirmation
* **Given** the checkout check answers `pending` every time
* **When** the donor lands on `/donate/complete/<token>`
* **Then** the page shows "Waiting for Stripe to confirm your payment…", checks 6 more times 5 seconds apart, and then shows "Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly."

### US-100.5 — Staff record Check and Other donations

#### Scenario: Staff record a Check donation
* **Given** Olivia is signed in
* **When** she adds a $100.00 donation for Ana with type Check and check number "1042"
* **Then** it is saved with type Check and check number "1042"
* **And** adding one with type Check and no check number is refused with `400` "Check number is required."
* **And** adding one with type Stripe is refused with `400` "Choose Check or Other."

#### Scenario: The donation form offers Check and Other
* **Given** Olivia opens **Add donation**
* **Then** **Type** offers Check and Other with Other selected and no **Check number**
* **When** she chooses Check
* **Then** **Check number** appears, and saving without one shows "Check number is required."

#### Scenario: A Stripe donation's amount can't be changed
* **Given** a recorded Stripe donation of $50.00
* **When** Olivia updates its amount to $60.00
* **Then** the response is `400` "A Stripe donation's amount, date, and type can't be changed."
* **And** changing only its payment info succeeds

#### Scenario: Existing donations become Other
* **Given** a donation saved before this feature
* **When** the server starts
* **Then** the donation has type Other

### US-100.6 — Trip Donation email

#### Scenario: A new donation emails the donor and the participant
* **Given** Hope Missions has a Trip donation Send Now template using `DONATION_DATE`, `DONATION_TYPE`, `DONATION_AMOUNT`, `TRIP_NAME`, and `PARTICIPANT_FIRST_NAME`
* **When** Olivia adds a $100.00 Check donation dated 2027-01-20 for Ana from donor Carl (carl@example.com)
* **Then** two emails are sent from the template, one to Ana's email and one to carl@example.com
* **And** each has the donation date formatted as other date tokens, "Check", "$100.00", "Guatemala Clinic 2027", and "Ana" filled in
* **And** the token value sources include "Donation date", "Donation type", and "Donation amount"

### US-100.7 — Donations for a date range, with CSV

#### Scenario: The donations list filters by date range
* **Given** Ana's trip has donations dated 2027-01-05, 2027-01-15, and 2027-02-01
* **When** the list is requested with start date 2027-01-10 and end date 2027-01-31
* **Then** only the 2027-01-15 donation is returned

#### Scenario: The CSV exports the selected range
* **Given** the same donations, the 2027-01-15 one a Check numbered "1042"
* **When** the CSV is requested with start date 2027-01-10 and end date 2027-01-31
* **Then** the file `trip-<tripId>-donations-2027-01-10-to-2027-01-31.csv` has the columns Date, Amount, Type, Check Number, Participant, Donor, Donor Email, Payment Info, Stripe Payment ID, Stripe Charge ID and one row with type Check and check number 1042

#### Scenario: The Donations page uses the date range
* **Given** Olivia is on the **Donations** page with the trip selected
* **When** she sets **Start date** 2027-01-10 and **End date** 2027-01-31
* **Then** the list is loaded with those dates and **Export CSV** downloads with those dates
* **And** setting **Start date** after **End date** shows "Start date must be on or before End date." and disables **Export CSV**

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-100.1 | An Org Admin saves the Stripe keys | `backend/tests/stripe-donations.test.js` | `An Org Admin saves the Stripe keys` |
| US-100.1 | Edit organization shows the Stripe section | `frontend/tests/StripeDonations.test.js` | `Edit organization shows the Stripe section` |
| US-100.2 | A public donor starts a Stripe payment | `backend/tests/stripe-donations.test.js` | `A public donor starts a Stripe payment` |
| US-100.2 | Test mode uses the test key | `backend/tests/stripe-donations.test.js` | `Test mode uses the test key` |
| US-100.2 | Checkout input is validated | `backend/tests/stripe-donations.test.js` | `Checkout input is validated` |
| US-100.2 | Online donations not set up | `backend/tests/stripe-donations.test.js`, `frontend/tests/StripeDonations.test.js` | `Online donations not set up` |
| US-100.2 | The public page sends the donor to Stripe | `frontend/tests/StripeDonations.test.js` | `The public page sends the donor to Stripe` |
| US-100.2 | Donations without payment are no longer accepted | `backend/tests/stripe-donations.test.js` | `Donations without payment are no longer accepted` |
| US-100.3 | The Donate dialog pays with Stripe | `frontend/tests/StripeDonations.test.js` | `The Donate dialog pays with Stripe` |
| US-100.3 | Participant checkouts keep the donation rules | `backend/tests/stripe-donations.test.js` | `Participant checkouts keep the donation rules` |
| US-100.4 | A completed payment is recorded once | `backend/tests/stripe-donations.test.js` | `A completed payment is recorded once` |
| US-100.4 | An unpaid checkout isn't recorded | `backend/tests/stripe-donations.test.js` | `An unpaid checkout isn't recorded` |
| US-100.4 | The background check records a payment the donor didn't return from | `backend/tests/stripe-donations.test.js` | `The background check records a payment the donor didn't return from` |
| US-100.4 | The return page thanks the donor | `frontend/tests/StripeDonations.test.js` | `The return page thanks the donor` |
| US-100.4 | The return page waits for confirmation | `frontend/tests/StripeDonations.test.js` | `The return page waits for confirmation` |
| US-100.5 | Staff record a Check donation | `backend/tests/stripe-donations.test.js` | `Staff record a Check donation` |
| US-100.5 | The donation form offers Check and Other | `frontend/tests/StripeDonations.test.js` | `The donation form offers Check and Other` |
| US-100.5 | A Stripe donation's amount can't be changed | `backend/tests/stripe-donations.test.js` | `A Stripe donation's amount can't be changed` |
| US-100.5 | Existing donations become Other | `backend/tests/stripe-donations.test.js` | `Existing donations become Other` |
| US-100.6 | A new donation emails the donor and the participant | `backend/tests/stripe-donations.test.js` | `A new donation emails the donor and the participant` |
| US-100.7 | The donations list filters by date range | `backend/tests/stripe-donations.test.js` | `The donations list filters by date range` |
| US-100.7 | The CSV exports the selected range | `backend/tests/stripe-donations.test.js` | `The CSV exports the selected range` |
| US-100.7 | The Donations page uses the date range | `frontend/tests/StripeDonations.test.js` | `The Donations page uses the date range` |

---

## Agent implementation request

```text
Implement Feature 100 from @features/feature-100-stripe-donations.md on branch `feature/100-stripe-donations`.

Backend: organization Stripe keys (encrypted, prefix-checked, *KeySaved flags); donationCheckout model; a small Stripe client (fetch, form-encoded, key chosen by the organization's Test mode, pinned Stripe-Version) for Create a Checkout Session and Retrieve a Checkout Session (expand payment_intent.latest_charge); checkout endpoints, check endpoint, 10-minute background check started from server.js (not in tests); remove the unpaid donation endpoints; tripDonation type/check number/Stripe fields with validation; trip-donation email type, tokens, template JSON, and sending to participant and donor; donations list and CSV date range. ensureSchema for all schema changes.
Frontend: Stripe section in the organization form; Pay with Stripe on DonorTripPage, DonorParticipantPage, ParticipantDonateDialog; new /donate/complete/:token page; Type and Check number in DonationFormDialog; Start/End date and Type column on DonationsList with range-aware export.
Tests per the Test Coverage Map, with Stripe HTTP calls replaced. Update features/reference/ (behavior, api, data-model).
```

---

## Definition of Done

*   [ ] Stripe keys per **FR-001**, **FR-002**
*   [ ] Pay with Stripe on all three screens per **FR-003**–**FR-007**
*   [ ] Payments recorded per **FR-008**–**FR-010**
*   [ ] Donation types and manual entry per **FR-011**, **FR-012**
*   [ ] Trip Donation email per **FR-013**–**FR-015**
*   [ ] Date range and CSV per **FR-016**, **FR-017**
*   [ ] Automated tests for every Gherkin scenario
*   [ ] Backend `npm test` and frontend `npx vitest run` green
*   [ ] Manual test-mode payment per **SC-002**
*   [ ] `features/reference/` updated
*   [ ] PR to `dev`

## Out of Scope

- Squarespace and Square
- Refunds, disputes, and recurring donations (handled in Stripe)
- Stripe Connect, OAuth, and webhooks (keys are entered by hand; payments are found by checking)
- Payments that settle after the checkout expires (e.g. delayed bank debits)
- Currencies other than USD, tipping, promotion codes, tax, and Stripe fees in the donation record
- A donor name token, and changes to the existing Donation received / deposit / payment complete emails
- Paying online from the staff donation form
