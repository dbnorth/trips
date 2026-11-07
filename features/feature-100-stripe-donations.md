# Online Donations with Stripe, Donation Types, Trip Donation Email, and Donation Date Range

**Feature ID:** 100
**Branch pattern:** `feature/100-stripe-donations`
**Status:** Implemented
**Created:** 2026-10-29
**Input:** "write a spec to allow donations by using Square Space. add to all public and participant donation pages a option to pay by Square Space. Use the Square Space documentation to create the interface to Square Space and pass the Trip Name and Participant Name and amount of donation. Record the result of the completed donation in the donation record with date, transaction id from Square Space and any other data returned by square space. Org Admin should still be able to enter donations manually with the amount. Donations records should have a type of SquareSpace, Check (include check number field), or Other. When a successful donation is made an email should be sent with a new Trip Donation email template with tokens for donation date, donation type, donation amount. The template should include trip and participant info. The Donation page should be able to export a CSV of donation of the currently selected donations (start and end date)" — then "change the spec to Use Stripe" — then "add donation payment type to donation. Types are Stripe-ACH, Stripe-Credit, Check, Other. Add any resulting Stripe payment status/tracking fields to the donation table. Add payment selection to Donation page. Enable payment button if a Stripe type or Save for other types" — then "add to send to stripe to ask donor to pay the processing fee. if they do then record the prcessing fee payment amount in a new field in the donation."

Today the public trip and participant donation pages and the signed-in **Donate** and **Make Donation** dialogs record a donation without taking any payment. This feature has donors pay online through **Stripe Checkout** by credit card or bank account (ACH): the app creates a Stripe-hosted payment page named for the trip and participant with the donation amount, and records the donation once Stripe reports it complete, with the Stripe payment details and a payment status. A bank payment stays **Processing** for a few days and counts toward totals only once it **Succeeded**. Every donation has a **Type**: Stripe-ACH, Stripe-Credit, Check (with a check number), or Other. Staff choose the type on the donation form: a Stripe type takes the payment through Stripe, and Check or Other saves as today. Every donation that counts sends a new **Trip donation** email to the donor and the participant. The **Donations** page gets a start and end date that limit the list and its CSV export. An organization that Stripe has approved for fee coverage can have Stripe's card payment page ask donors to also cover the processing fee; a covered fee is recorded on the donation separately from the gift.

## Clarifications

### Session 2026-10-29

- Q: Squarespace has no API for taking a payment from another website. Which provider? → A: First Square; then changed to **Stripe** (Checkout Sessions API). The donation type is **Stripe** (split into Stripe-ACH and Stripe-Credit on 2026-11-06).
- Q: Whose payment account receives the money? → A: Each organization connects its own Stripe account in **Edit organization**; the organization's **Test mode** uses Stripe test mode. Stripe has no separate sandbox address (test or live is set by the key), so each organization saves a live secret key and a test secret key, and **Test mode** picks the test key.
- Q: Which screens get online payment? → A: The public trip donation page, the public participant donation page, and the signed-in **Donate** dialog in **My Trip Info** (updated 2026-11-06 to the Home **Donate** and **My Trip** **Make Donation** dialogs, plus the staff form).
- Q: What happens to recording a donation without paying on those screens? → A: Replaced: donors can only give there by paying with Stripe.
- Q: Who receives the Trip Donation email? → A: Both the donor and the participant.
- Q: Which donations send it? → A: Every new donation, including Check and Other entered by staff.

### Session 2026-11-06

- Q: What are the donation types? → A: **Stripe-ACH**, **Stripe-Credit**, **Check**, **Other** (replacing the single **Stripe** type).
- Q: Which screens get the payment-type choice? → A: The staff donation form offers all four types; a Stripe type shows **Pay with Stripe** instead of **Save**, and Check or Other shows **Save**. The donor screens offer only the two Stripe types.
- Q: How do donors choose ACH or credit? → A: They pick **Credit card** or **Bank account (ACH)** before paying, and Stripe Checkout offers only that method.
- Q: When is an ACH donation recorded? → A: As soon as Checkout completes, with payment status **Processing**, not counted in totals. It updates to **Succeeded** (counted) or **Failed** (never counted) as Stripe reports.
- Q: Which donor screens? → A: The public trip and participant donation pages, the **Donate** dialog on Home **My Trips**, and the **Make Donation** dialog on **My Trip** (Feature 119); both dialogs use the participant donation endpoint this feature removes.
- Q: How is the donor asked to cover the processing fee? → A: On Stripe's own Checkout page, using Stripe's **fee coverage** (`fee_coverage[enabled]` on the Checkout Session). Stripe calculates the fee, shows the offer selected, and the donor may remove it. Fee coverage is a Stripe private preview for eligible US nonprofits, works only for card payments, and needs a preview API version.
- Q: Stripe refuses fee coverage for accounts it hasn't approved. How does the app know when to ask? → A: An organization setting, **Ask donors to cover processing fees**, off by default, which the organization turns on once Stripe approves its account.
- Q: Does a covered fee count toward totals? → A: No. The donation's amount stays the gift and counts as before; the fee is stored in its own field and never counts.
- Q: Which checkouts ask? → A: Every card checkout (public pages, both participant dialogs, and the staff form) for an organization with the setting on. Bank (ACH) checkouts never ask.
- Q: Where is the covered fee shown? → A: A **Fee covered** column on the **Donations** list and in the CSV, the staff donation details, the donor's return page, and a new email token.

**Depends on:**
- [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md) (donations, **Donations** page, staff donation form, donations CSV)
- [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md) (public trip and participant donation pages)
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md) (email types, Send Now templates)
- [Feature 45 — Send Now Event Emails](feature-45-send-now-event-emails.md) (event emails on a new donation)
- [Feature 49 — Organization Email Test Mode](feature-49-organization-email-test-mode.md) (organization **Test mode**)
- [Feature 53 — Participant Donations](feature-53-participant-donations.md) (Home **Donate** dialog, linked donors)
- [Feature 93 — Org Admin Edit Organization](feature-93-org-admin-edit-organization.md) (Org Admins edit their organization)
- [Feature 119 — My Trip Page](feature-119-my-trip-page.md) (**Make Donation** dialog)

---

## User Stories

### US-100.1: Connect an organization's Stripe account

**As** an Org Admin
**I want** to enter my organization's Stripe secret keys
**So that** donations to our trips are paid into our Stripe account

**Acceptance:** see Gherkin scenarios under US-100.1.

### US-100.2: Donors pay with Stripe on the public donation pages

**As** a donor on a public trip or participant donation page
**I want** to pay my donation with Stripe by credit card or bank account
**So that** my gift is actually paid, not just pledged

**Acceptance:** see Gherkin scenarios under US-100.2.

### US-100.3: Participants pay with Stripe from the Donate and Make Donation dialogs

**As** a participant giving to myself or a teammate
**I want** the **Donate** and **Make Donation** dialogs to take me to Stripe to pay
**So that** my donation is paid like any other

**Acceptance:** see Gherkin scenarios under US-100.3.

### US-100.4: A completed Stripe payment is recorded

**As** trip staff
**I want** each paid Stripe checkout recorded once as a donation with its Stripe details
**So that** totals are right and I can match donations to Stripe

**Acceptance:** see Gherkin scenarios under US-100.4.

### US-100.5: Staff record donations by type

**As** an Org Admin (or other trip staff)
**I want** to choose a donation's type, saving a Check or Other by hand and taking a Stripe-ACH or Stripe-Credit payment through Stripe
**So that** every gift is recorded the way it was paid

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

### US-100.8: Bank payments are tracked until they clear

**As** trip staff
**I want** each Stripe donation to show its payment status, and bank payments to count only once they clear
**So that** totals never include money that hasn't arrived

**Acceptance:** see Gherkin scenarios under US-100.8.

### US-100.9: Donors can cover the processing fee

**As** an Org Admin of a nonprofit Stripe has approved for fee coverage
**I want** Stripe's card payment page to ask donors to also cover the processing fee, and the covered fee recorded apart from the gift
**So that** more of each gift reaches the trip and I can see what donors covered

**Acceptance:** see Gherkin scenarios under US-100.9.

---

## Requirements

### Functional Requirements

#### Stripe account (US-100.1)

- **FR-001**: **Edit organization** (and **Add organization**) has an **Online donations (Stripe)** section after **Test mode** with **Stripe secret key** and **Stripe test secret key** (password fields), with the hint "Test mode uses the test key.". A secret key must start with `sk_live_` or `rk_live_`, else "Enter a live Stripe secret key (sk_live_ or rk_live_)."; a test key must start with `sk_test_` or `rk_test_`, else "Enter a test Stripe secret key (sk_test_ or rk_test_)." (also `400` from the API). Keys are stored encrypted, never returned by any API or written to logs, and leaving a field blank keeps the saved key; each field with a saved key has the hint "A key is saved. Leave blank to keep it.". Organization responses add `stripeKeySaved` and `stripeTestKeySaved`. Only those who can edit the organization today (System Admin, Org Admin of the organization) can change these.
- **FR-002**: Online donations are **set up** for an organization when it has the key for its current mode: the test key when **Test mode** is on, otherwise the secret key. The key used is chosen when the checkout is created and the checkout remembers which mode it used.

#### Paying with Stripe (US-100.2, US-100.3)

- **FR-003**: The donor screens are the public trip donation page, the public participant donation page, the **Donate** dialog on Home **My Trips**, and the **Make Donation** dialog on **My Trip**. The public pages keep their donor fields (first name, last name, email) and **Amount**; the **Donate** dialog keeps **Donate to** and **Amount**; the **Make Donation** dialog keeps **Amount**. Each removes **Payment info**, adds **Payment method** after **Amount** (radio: **Credit card**, the default, or **Bank account (ACH)**), and replaces **Donate** with **Pay with Stripe**. Clicking it starts a checkout (FR-005, FR-006) with the chosen method and sends the browser to the returned Stripe page. When online donations aren't set up for the trip's organization, each screen shows "Online donations aren't set up for this organization yet." and no **Payment method** or **Pay with Stripe**.
- **FR-004**: Checkout validation, before calling Stripe: amount of at least $0.50 (Stripe's minimum), else `400` "Donation amount must be at least $0.50."; `paymentMethod` must be `card` or `us_bank_account`, else `400` "Choose Credit card or Bank account (ACH)."; on the public pages, first name and email are required, else `400` "Your first name and email are required."; on the staff form (FR-011), donor first name is required, else `400` "Donor first name is required."; online donations not set up → `400` "Online donations aren't set up for this organization yet.". The recipient rules of today's donation on that screen still apply (public pages: Feature 9 / Feature 53, including naming yourself only when pre-approved or approved, and a recipient who isn't a pre-approved or approved Trip Participant / Trip Leader → `400` "Choose a participant on this trip."; **Donate** and **Make Donation** dialogs: Feature 53 / Feature 119, with the same messages; staff form: Feature 8 / Feature 69).
- **FR-005**: Starting a checkout saves a **donation checkout** (pending) and calls Stripe **Create a Checkout Session** (`POST https://api.stripe.com/v1/checkout/sessions`, form-encoded, authenticated with the organization's key for the mode, header `Idempotency-Key: <checkout token>`, `Stripe-Version` pinned to the API version current at implementation) with:
  - `mode=payment`, `submit_type=donate`;
  - `payment_method_types[0]`: `card` for Credit card (Stripe-Credit) or `us_bank_account` for Bank account (Stripe-ACH);
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
  A card checkout for an organization that asks donors to cover processing fees differs as FR-022 says. It stores the donation type (Stripe-Credit or Stripe-ACH), Stripe's session id, and URL on the checkout and returns `{ checkoutUrl }`. No donation is recorded yet. Stripe refusing or failing → `502` "Stripe couldn't start the payment. Please try again." and the checkout is not kept.
- **FR-006**: The donor on a public page is the signed-in person's linked donor when signed in, otherwise found or created from the entered details as today's public donation does (Feature 53). On the **Donate** and **Make Donation** dialogs it is the signed-in person's linked donor (created from their person when missing). On the staff form it is the donor the form names, found or created as staff **Save** does today (Feature 8), and the form's **Payment info** is kept for the donation. The staff form's donor is found or created when the checkout starts; the others are resolved when the donation is recorded (FR-008).
- **FR-007**: The existing endpoints that record a donation without payment, `POST /trips/public/donations` and `POST /trips/donations/participant` (used by the public pages and both participant dialogs), are removed.

#### Recording the payment (US-100.4)

- **FR-008**: **Checking a checkout** retrieves its session (`GET https://api.stripe.com/v1/checkout/sessions/{id}` with `expand[]=payment_intent.latest_charge`). When the session's `status` is `complete`, it records one donation (in one transaction, at most once per Stripe payment intent) with: the checkout's trip, participant, and donor (FR-006); `amount` = the session's `amount_total` in dollars, less any covered processing fee (FR-023); `dateTime` = the payment intent's `created` time; the checkout's type (**Stripe-Credit** or **Stripe-ACH**); the payment status and payment method fields (FR-018); `stripeCheckoutSessionId`, `stripePaymentIntentId`, `stripeChargeId` (the latest charge id, when there is one), `stripeReceiptUrl` (the latest charge's `receipt_url`, when there is one); and `stripeData` = the session Stripe returned (with the expanded payment intent and charge), as JSON. The checkout becomes `completed` and links the donation. When the payment status is Succeeded, the donation event emails (Feature 45) and the Trip Donation email (FR-013) are sent; a Processing donation sends them when it succeeds (FR-019). A session whose `status` is `expired` makes the checkout `expired`. Anything else leaves it `pending` and records nothing.
- **FR-009**: Stripe returns the donor to `/donate/complete/<token>` after paying (and to the starting page if they cancel). That public page checks the checkout (FR-008) and shows:
  - completed and Succeeded: "Thank you for your donation!", "<amount> to <trip name> for <participant name>" (or "<amount> to <trip name>"), a **Receipt** link to the Stripe receipt (new tab) when there is one, and **Back** to the page the donor started from;
  - completed and Processing: "Thank you for your donation!", the same amount line, "Your bank payment is processing. It usually takes up to 4 business days to clear.", and **Back**;
  - completed and Failed: "Your payment didn't go through." with Stripe's failure reason when there is one, and **Back**;
  - pending: "Waiting for Stripe to confirm your payment…", checking again every 5 seconds up to 6 times, then "Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly." with **Back**;
  - expired: "This donation link has expired." with **Back**;
  - unknown token: "Donation not found.".
  When a completed donation has a covered processing fee (FR-023), the Succeeded and Processing messages add "Thank you for also covering the <fee> processing fee." after the amount line (e.g. "Thank you for also covering the $1.75 processing fee."). Checking a completed checkout again records nothing new.
- **FR-010**: While the server runs, every 10 minutes it checks every pending checkout created in the last 25 hours (FR-008), so a payment is recorded even when the donor never returns to the app, and checks every Processing donation (FR-019). Pending checkouts older than 25 hours become `expired` (Stripe sessions expire after 24 hours). A Stripe error on one checkout or donation is logged and the rest are still checked.

#### Donation types and manual entry (US-100.5)

- **FR-011**: Every donation has a **Type**: **Stripe-ACH**, **Stripe-Credit**, **Check**, or **Other**. **Add donation** on the staff donation form adds **Type** after **Amount**, offering all four (default Other):
  - **Check**: **Check number** (up to 50 characters) appears; the button is **Save**. Saving without a check number → "Check number is required." (also `400` from the API).
  - **Other**: no **Check number**; the button is **Save**; saving clears the check number.
  - **Stripe-ACH** or **Stripe-Credit**: **Check number** and **Date** are hidden (Stripe sets the date) and **Save** is replaced by **Pay with Stripe**. It is enabled when online donations are set up for the trip's organization (FR-002); otherwise the form shows "Online donations aren't set up for this organization yet." and it is disabled. Clicking it checks the form as **Save** does plus the $0.50 minimum, starts a staff checkout (`POST /trips/donations/stripe-checkout`, FR-004–FR-006) with `card` for Stripe-Credit or `us_bank_account` for Stripe-ACH and **Back** returning to the **Donations** page, and sends the browser to Stripe, where staff enter the donor's card or bank details.
  The API refuses a Stripe type on staff create or update with `400` "Use Pay with Stripe for Stripe-ACH and Stripe-Credit donations.", and any other unknown type with `400` "Choose a donation type.". **Edit** of a Check or Other donation offers only Check and Other. Staff entry is otherwise unchanged (amount, date, donor, participant, payment info). Who may add donations is unchanged.
- **FR-012**: A Stripe donation's **Edit** shows **Type** (Stripe-ACH or Stripe-Credit), **Amount**, **Fee covered** (the covered processing fee, FR-023, or "—"), **Date**, **Payment status**, **Payment method** (FR-020), and Stripe's failure reason (when Failed) read-only, plus its Stripe payment intent id with the **Receipt** link; staff may still change its participant, donor, and payment info. An update that changes a Stripe donation's amount, covered fee, date, type, check number, payment status, or Stripe fields → `400` "A Stripe donation's amount, date, and type can't be changed.". Deleting is unchanged (refunds are done in Stripe). On the first startup after this feature, every existing donation gets type Other.

#### Trip Donation email (US-100.6)

- **FR-013**: A new email type **Trip donation** (type code `trip-donation`, event code `trip-donation`) is seeded at startup. When a donation starts counting (FR-018) — a staff Check or Other create, a Stripe donation recorded as Succeeded, or a Processing one that succeeds; not edits, and never for a Failed one — each of the trip's Send Now templates of that type (otherwise its organization's, as Feature 45 chooses templates) is sent separately to the participant's email (when the donation has a participant) and to the donor's email (when the donor has one), each address once; the template's **To** is not used. Tokens fill as for the participant (participant tokens blank without one). Organization **Test mode** applies (Feature 49). Sending never blocks or undoes saving; failures are logged.
- **FR-014**: New value sources `donation.date` "Donation date" (date only, formatted like other date tokens), `donation.type` "Donation type" (Stripe-ACH, Stripe-Credit, Check, or Other), `donation.amount` "Donation amount" (formatted like other money tokens), and `donation.feeCovered` "Donation fee covered" (the covered processing fee, FR-023, formatted like other money tokens; blank when none), with seeded tokens `DONATION_DATE`, `DONATION_TYPE`, `DONATION_AMOUNT`, and `DONATION_FEE_COVERED`. They fill only for the Trip Donation email of a donation, and are blank everywhere else (previews, other sends).
- **FR-015**: `backend/app/data/emailTemplates.json` adds a `trip-donation` Send Now template (From `{{ORG_EMAIL}}`, To `{{PARTICIPANT_EMAIL}}`) with subject "Thank you for your donation to {{TRIP_NAME}}" and a body that thanks the donor and lists the trip (name, location, start and end dates), the participant (first and last name), and the donation (date, type, amount), signed by `{{ORG_NAME}}`.

#### Donations date range and CSV (US-100.7)

- **FR-016**: The **Donations** page adds **Start date** and **End date** (date fields, both optional) after **Trip**. The list shows the selected trip's donations whose date is on or after the start date and on or before the end date (either blank means no limit), and adds a **Fee covered** column after **Amount** (the covered processing fee, FR-023, or "—"), a **Type** column after **Fee covered** (with the check number for Check, e.g. "Check #1042") and a **Status** column after **Type** (Processing, Succeeded, or Failed for Stripe donations; "—" for Check and Other). The summary cards keep showing the whole trip, counting only donations that count (FR-018). A start date after the end date shows "Start date must be on or before End date.", empties the list, and disables **Export CSV**.
- **FR-017**: **Export CSV** downloads the donations the list shows (selected trip, start and end date), newest first, with columns **Date**, **Amount**, **Fee Covered** (blank when none), **Type**, **Check Number**, **Payment Status**, **Payment Method** (FR-020), **Participant**, **Donor**, **Donor Email**, **Payment Info**, **Stripe Payment ID** (payment intent), **Stripe Charge ID**. Every listed donation is included whatever its status. The file is named `trip-<tripId>-donations.csv`, or `trip-<tripId>-donations-<start>-to-<end>.csv` when a date is chosen (a blank side written as `start` / `end`). Who may export is unchanged.

#### Payment status (US-100.8)

- **FR-018**: Every Stripe donation has a **payment status**: **Processing**, **Succeeded**, or **Failed** (Check and Other have none). It is set from the payment intent's `status` when recorded and when checked: `succeeded` → Succeeded; `processing` → Processing; `requires_payment_method` or `canceled` → Failed, with Stripe's failure reason (the payment intent's `last_payment_error.message`, else the latest charge's `failure_message`). Each change sets `paymentStatusUpdatedAt`. A card payment is normally Succeeded when recorded; a bank payment is normally Processing. A donation **counts** when it is Check, Other, or Succeeded. Only counted donations go into any donation total, raised amount, or balance (participant and trip totals, the trips table, **View Trip**, **My Trip**, Home, the **Donations** summary cards, the public pages, and the deposit and fully-paid checks); Processing and Failed donations still show in the **Donations** list and CSV.
- **FR-019**: Every 10 minutes (FR-010) the server checks each Processing donation by retrieving its payment intent (`GET https://api.stripe.com/v1/payment_intents/{id}` with `expand[]=latest_charge`, using the key for the mode its checkout used) and updates its payment status (FR-018), charge id, receipt URL, and payment method fields. When it becomes Succeeded, the donation event emails (Feature 45) and the Trip Donation email (FR-013) are sent once. When it becomes Failed, no email is sent and it never counts. Checking continues until the donation is no longer Processing.
- **FR-020**: Stripe donations store the payment method from the latest charge's `payment_method_details`: the type (`card` or `us_bank_account`), the card brand or bank name, and the last 4 digits. **Payment method** shows as "<Brand> •••• <last4>" for a card (e.g. "Visa •••• 4242") and "<Bank name> •••• <last4>" for a bank account (e.g. "STRIPE TEST BANK •••• 6789"), or "—" when Stripe hasn't reported it.

#### Processing fee coverage (US-100.9)

- **FR-021**: The **Online donations (Stripe)** section (FR-001) adds an **Ask donors to cover processing fees** checkbox after **Stripe test secret key**, off by default, with the hint "Stripe asks card donors to add its processing fee. Turn on only after Stripe approves your account for fee coverage.". It is the organization's `stripeFeeCoverage` (in organization requests and responses); the same people who can change the keys can change it.
- **FR-022**: A checkout whose payment method is `card` (Stripe-Credit) for an organization with `stripeFeeCoverage` on asks the donor to cover the fee on Stripe's page. Its Create a Checkout Session call (FR-005) instead sends header `Stripe-Version: 2026-08-26.preview`, `allowed_payment_method_types[0]=card` in place of `payment_method_types[0]`, and `fee_coverage[enabled]=true`; everything else is as FR-005. Stripe calculates the fee, shows the offer already selected, and the donor may remove it before paying. The checkout records that it asked (`feeCoverageOffered`). Bank (`us_bank_account`) checkouts and organizations with the setting off never ask and are unchanged. This applies to all four donor screens and the staff form; nothing changes on the app's screens before Stripe.
- **FR-023**: Checking a checkout that asked (FR-022) retrieves its session with header `Stripe-Version: 2026-08-26.preview`. When the completed session has `fee_coverage_cost.amount_total`, the donation's `processingFeeAmount` is that amount in dollars and its `amount` is `amount_total` less it (the gift); otherwise `processingFeeAmount` is empty and `amount` is `amount_total`. Only `amount` counts (FR-018); a covered fee is never part of any donation total, raised amount, or balance. The check answer adds `feeCovered` (the covered fee, or `null`). Donation list rows add `processingFeeAmount`.

---

## Assumptions

- All payments are in USD; Stripe's minimum charge is $0.50.
- Each organization uses its own Stripe account and copies its secret keys from the Stripe Dashboard (a restricted key with Checkout Sessions write and read access is enough); no Stripe Connect or OAuth flow is built.
- Stripe sends the donor its own receipt when the account's receipt emails are on; the Trip Donation email is sent as well.
- Only card (Stripe-Credit) and US bank account (Stripe-ACH, ACH Direct Debit) payments are offered; each organization turns both on in its Stripe Dashboard. No tipping, promotion codes, or tax.
- Stripe fee coverage is a private preview for US nonprofits Stripe classifies as eligible (merchant category 8398); each organization requests access from Stripe before turning on **Ask donors to cover processing fees**. Stripe sets the fee calculation and the default selection, and offers it only for cards. The checkout's inline `price_data` line item is assumed to work with fee coverage (Stripe's examples use a saved price); SC-004 confirms it.
- Bank payments usually clear in up to 4 business days; Stripe's instant bank verification is used, so no microdeposit step is built.
- Donation emails go out only once a donation counts, so a donor whose bank payment fails isn't thanked for money that never arrived; no failure email is sent.
- Stripe is never called in automated tests; tests replace the HTTP calls to Stripe.

## Edge Cases

- A donor cancels or closes Stripe without paying → the checkout stays pending, nothing is recorded, and it expires after 25 hours.
- A donor pays but closes the browser before returning → the background check records it within about 10 minutes (FR-010).
- The return page and the background check run at the same time → only one donation is recorded (unique Stripe payment intent id).
- A bank payment completes Checkout with `payment_status` `unpaid` and a `processing` payment intent → it is recorded as Processing right away and followed until it succeeds or fails (FR-019).
- A bank payment fails days later → the donation becomes Failed, stays in the list and CSV, and never counts, so totals are unchanged.
- Staff start **Pay with Stripe** and cancel on Stripe → they return to the **Donations** page and nothing is recorded.
- A Stripe donation is deleted while Processing → it is no longer checked.
- The organization turns **Test mode** on or off after a checkout started → that checkout keeps the mode and key it started with.
- The organization's key is removed or wrong when a checkout is checked → the check fails, is logged, and the checkout stays pending until it expires.
- The donor is also the participant (a participant giving to themselves) → one Trip Donation email to that address.
- A donation with no participant and a donor without an email → no Trip Donation email.
- Stripe's `amount_total` differs from the checkout amount → the donation records Stripe's amount (less any covered fee).
- A donor removes the fee offer on Stripe's page → the donation has no covered fee and its amount is the full payment.
- An organization turns on **Ask donors to cover processing fees** without Stripe's approval → Stripe refuses card checkouts with `502` "Stripe couldn't start the payment. Please try again." until the setting is turned off; bank checkouts still work.
- The setting changes after a checkout started → that checkout keeps whether it asked.
- A donation with a covered fee is refunded in Stripe → the refund isn't split between the gift and the fee, and the donation is unchanged (refunds are out of scope).

## Success Criteria

- **SC-001**: Automated tests for every scenario below pass.
- **SC-002**: A test-mode card payment made through a real Stripe test account (card 4242 4242 4242 4242) is recorded as Stripe-Credit, Succeeded, with its Stripe payment intent id and sends the Trip Donation email (manual check).
- **SC-003**: A test-mode bank payment (Stripe's test bank account) is recorded as Stripe-ACH, Processing and not counted, then becomes Succeeded, counts, and sends the Trip Donation email once Stripe reports it (manual check).
- **SC-004**: For a test-mode Stripe account approved for fee coverage, with **Ask donors to cover processing fees** on, Stripe's card page offers the fee; paying with it recorded the gift as **Amount** and the fee as **Fee covered**, and paying after removing it recorded no fee (manual check).

---

## Data Ownership & Isolation

- Each organization's Stripe keys are used only for its own trips' checkouts; the keys are encrypted at rest and never returned (FR-001).
- A donation checkout is reached only through its random token; the return page shows only that checkout's amount, trip, participant, and receipt.
- Donation list, edit, and export access is unchanged (Feature 8, Feature 69).

---

## Key Entities

- **organization**: adds the Stripe secret key, test secret key, and whether to ask donors to cover processing fees.
- **donationCheckout** (new): one attempt to pay a donation through Stripe, by card or bank account, from a donor screen or the staff form.
- **tripDonation**: adds type, check number, payment status, payment method, covered processing fee, and Stripe payment fields.
- **emailType** / **emailToken**: Trip donation type and the four donation tokens.

---

## API Requirements

| Method | Path | Auth | Change |
|---|---|---|---|
| `PUT` / `POST` | `/trips/organizations…` | as today | Accept `stripeSecretKey` and `stripeTestSecretKey` (blank keeps; prefix checked); responses add `stripeKeySaved`, `stripeTestKeySaved`, never the keys (FR-001); accept and return `stripeFeeCoverage` (FR-021) |
| `GET` | public trip / participant page endpoints | public | Add `onlineDonations` (true when set up for the trip's organization) (FR-003) |
| `GET` | `/trips/trips/browse/:id` | auth | `myTripInfo` adds `onlineDonations` (FR-003) |
| `GET` | `/trips/trips`, `/trips/trips/:id` | auth | Each trip adds `onlineDonations`, used by the staff donation form (FR-011) |
| `POST` | `/trips/public/donations/stripe-checkout` | optional | New. Body `{ tripId, personId?, amount, paymentMethod: "card" \| "us_bank_account", donor: { firstName, lastName, email }, returnPath }` → `{ checkoutUrl }` (FR-004–FR-006) |
| `POST` | `/trips/donations/participant/stripe-checkout` | auth | New. Body `{ tripId, personId, amount, paymentMethod, returnPath }` → `{ checkoutUrl }` (FR-004–FR-006); used by the **Donate** and **Make Donation** dialogs |
| `POST` | `/trips/donations/stripe-checkout` | auth | New. Staff form (FR-011): body `{ tripId, personId?, amount, paymentMethod, donor: { id?, firstName, lastName, email, … as staff create }, paymentInfo, returnPath }` → `{ checkoutUrl }`; same access as staff create |
| `POST` | `/trips/public/donations/stripe-checkout/:token/check` | public | New. Checks the checkout (FR-008) → `{ status: "completed" \| "pending" \| "expired", paymentStatus: "processing" \| "succeeded" \| "failed" \| null, failureMessage, amount, feeCovered, tripName, participantName, receiptUrl, returnPath }`; unknown token → `404` "Donation not found." |
| `POST` | `/trips/public/donations` | — | Removed (FR-007) |
| `POST` | `/trips/donations/participant` | — | Removed (FR-007) |
| `POST` / `PUT` | `/trips/donations`, `/trips/donations/:id` | auth | `donationType` (`Check` / `Other`; `Stripe-ACH` / `Stripe-Credit` → `400`), `checkNumber` (FR-011, FR-012) |
| `GET` | `/trips/donations` | auth | Optional `startDate`, `endDate` (`YYYY-MM-DD`, inclusive); rows add `donationType`, `checkNumber`, `paymentStatus`, `paymentStatusUpdatedAt`, `stripeFailureMessage`, `stripePaymentMethodType`, `stripePaymentMethodBrand`, `stripePaymentMethodLast4`, `stripePaymentIntentId`, `stripeReceiptUrl`, `processingFeeAmount` (FR-016, FR-018, FR-020, FR-023) |
| `GET` | every endpoint returning a donation total, raised amount, or balance | as today | Sums only donations that count (FR-018) |
| `GET` | `/trips/export/trips/:tripId/donations.csv` | auth | Optional `startDate`, `endDate`; new columns and file name (FR-017) |
| `GET` | `/trips/email-tokens/value-sources` | System Admin | Adds `donation.date`, `donation.type`, `donation.amount`, `donation.feeCovered` (FR-014) |

`returnPath` must be a path within the app (starts with a single `/`); anything else is replaced by the trip's public donation page path.

---

## Screen Requirements

- **Edit organization** / **Add organization**: **Online donations (Stripe)** section with **Ask donors to cover processing fees** (FR-001, FR-021).
- Public trip donation page, public participant donation page, Home **Donate** dialog, **My Trip** **Make Donation** dialog: **Payment method** (Credit card / Bank account (ACH)), **Pay with Stripe**, not-set-up message; **Payment info** removed (FR-003).
- New public page `/donate/complete/:token`, including the processing, failed, and covered-fee messages (FR-009).
- Staff donation form: **Type** (Stripe-ACH, Stripe-Credit, Check, Other), **Check number**, **Pay with Stripe** or **Save** by type; read-only Stripe fields with **Fee covered**, **Payment status**, and **Payment method** on **Edit** (FR-011, FR-012, FR-020).
- **Donations** page: **Start date**, **End date**, **Fee covered**, **Type**, and **Status** columns, range-aware **Export CSV** (FR-016, FR-017).

---

## Data Model Requirements

### `organization` (add)

| Field | Type | Rules |
|---|---|---|
| stripeSecretKey | Encrypted text | optional; `sk_live_` / `rk_live_`; never returned (FR-001) |
| stripeTestSecretKey | Encrypted text | optional; `sk_test_` / `rk_test_`; never returned (FR-001) |
| stripeFeeCoverage | BOOLEAN | required, default false; ask card donors to cover processing fees (FR-021) |

### `donationCheckout` (new)

| Field | Type | Rules |
|---|---|---|
| id | INTEGER PK | autoIncrement |
| token | STRING(64) | required, unique, random |
| tripId | INTEGER | required FK → trip (`ON DELETE CASCADE`) |
| personId | INTEGER | optional FK → person (recipient, `ON DELETE SET NULL`) |
| giverPersonId | INTEGER | optional FK → person (signed-in giver, `ON DELETE SET NULL`) |
| donorFirstName, donorLastName, donorEmail | STRING | entered donor details (public pages) |
| donorId | INTEGER | optional FK → donor (staff form, `ON DELETE SET NULL`) |
| paymentInfo | TEXT | optional; staff form **Payment info**, copied to the donation |
| amount | DECIMAL(10,2) | required |
| donationType | ENUM(`Stripe-ACH`,`Stripe-Credit`) | required; from the chosen payment method |
| stripeTestMode | BOOLEAN | required; which key was used (FR-002) |
| feeCoverageOffered | BOOLEAN | required, default false; Stripe was asked to offer fee coverage (FR-022) |
| stripeCheckoutSessionId | STRING(255) | from Stripe |
| stripeCheckoutUrl | TEXT | from Stripe |
| returnPath | STRING(500) | where **Back** and Stripe's cancel go |
| status | ENUM(`pending`,`completed`,`expired`) | required, default `pending` |
| tripDonationId | INTEGER | optional FK → tripDonation (`ON DELETE SET NULL`) |
| createdAt, updatedAt | DATE | |

### `tripDonation` (add)

| Field | Type | Rules |
|---|---|---|
| donationType | ENUM(`Stripe-ACH`,`Stripe-Credit`,`Check`,`Other`) | required, default `Other`; existing rows `Other` |
| checkNumber | STRING(50) | required for Check, null otherwise |
| processingFeeAmount | DECIMAL(10,2) | optional; processing fee the donor covered on Stripe, not part of `amount` (FR-023) |
| paymentStatus | ENUM(`processing`,`succeeded`,`failed`) | Stripe types only, null for Check and Other (FR-018) |
| paymentStatusUpdatedAt | DATE | set on each payment status change |
| stripeFailureMessage | STRING(500) | optional; Stripe's failure reason when Failed |
| stripePaymentMethodType | STRING(50) | optional; `card` or `us_bank_account` (FR-020) |
| stripePaymentMethodBrand | STRING(100) | optional; card brand or bank name (FR-020) |
| stripePaymentMethodLast4 | STRING(4) | optional (FR-020) |
| stripeCheckoutSessionId | STRING(255) | optional |
| stripePaymentIntentId | STRING(255) | optional, unique |
| stripeChargeId | STRING(255) | optional |
| stripeReceiptUrl | STRING(500) | optional |
| stripeData | TEXT | optional; Stripe session (with payment intent and charge) as JSON |

`ensureSchema` adds the columns (including `donationCheckouts.feeCoverageOffered` on a table created before it) and the payment intent unique index on startup and seeds the email type and tokens; the `donationCheckout` table is created by `sequelize.sync`.

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
* **And** she sees **Ask donors to cover processing fees**, unchecked, with the hint "Stripe asks card donors to add its processing fee. Turn on only after Stripe approves your account for fee coverage."
* **When** she checks it and saves
* **Then** the update sends `stripeFeeCoverage` true

### US-100.2 — Donors pay with Stripe on the public donation pages

#### Scenario: A public donor starts a Stripe payment
* **Given** Hope Missions has its Stripe secret key saved
* **When** a donor, Carl Diaz (carl@example.com), starts a $50.00 credit card checkout for Ana on the public participant page
* **Then** Stripe **Create a Checkout Session** is called with the secret key, `mode=payment`, `submit_type=donate`, `payment_method_types[0]=card`, name "Guatemala Clinic 2027 – Ana Lopez", `unit_amount` 5000 `usd`, description "Trip: Guatemala Clinic 2027; Participant: Ana Lopez; Donor: Carl Diaz", `customer_email` carl@example.com, `success_url` `/donate/complete/<token>`, and `cancel_url` the participant page
* **And** the response is `{ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_1" }`
* **And** a pending checkout with type Stripe-Credit is saved and no donation is recorded

#### Scenario: A bank account checkout offers only ACH
* **Given** Hope Missions has its Stripe secret key saved
* **When** Carl starts a $50.00 checkout for Ana with payment method `us_bank_account`
* **Then** Stripe is called with `payment_method_types[0]=us_bank_account` and no other payment method type
* **And** the pending checkout has type Stripe-ACH

#### Scenario: Test mode uses the test key
* **Given** Hope Missions has both keys saved and Test mode on
* **When** a donor starts a checkout for the trip
* **Then** Stripe is called with the test secret key and name "Guatemala Clinic 2027"

#### Scenario: Checkout input is validated
* **Given** Hope Missions has its Stripe secret key saved
* **When** a public donor starts a checkout for $0.25, without an email, or with payment method "paypal"
* **Then** the responses are `400` "Donation amount must be at least $0.50.", `400` "Your first name and email are required.", and `400` "Choose Credit card or Bank account (ACH)." and Stripe is not called

#### Scenario: Online donations not set up
* **Given** Hope Missions has only a test key saved and Test mode off
* **When** a donor opens the public participant page for Ana, or starts a checkout through the API
* **Then** the page shows "Online donations aren't set up for this organization yet." and no **Payment method** or **Pay with Stripe**
* **And** the API answers `400` "Online donations aren't set up for this organization yet."

#### Scenario: The public page sends the donor to Stripe
* **Given** the public participant page for Ana with online donations set up
* **Then** **Payment method** offers **Credit card** (selected) and **Bank account (ACH)**, and there is no **Payment info**
* **When** the donor fills in their name, email, and $50, chooses **Bank account (ACH)**, and clicks **Pay with Stripe**
* **Then** the checkout is started for Ana with $50, payment method `us_bank_account`, and the donor's details, and the browser goes to `https://checkout.stripe.com/c/pay/cs_1`

#### Scenario: Donations without payment are no longer accepted
* **When** someone posts to `POST /trips/public/donations` or `POST /trips/donations/participant`
* **Then** the response is `404` and no donation is recorded

### US-100.3 — Participants pay with Stripe from the Donate and Make Donation dialogs

#### Scenario: The Donate and Make Donation dialogs pay with Stripe
* **Given** Ana opens **Donate** on Home **My Trips** with online donations set up
* **Then** it has **Donate to**, **Amount**, **Payment method**, no **Payment info**, and **Pay with Stripe**
* **When** she chooses Yourself, $25, and **Credit card** and clicks **Pay with Stripe**
* **Then** the participant checkout is started for Ana with $25 and payment method `card`, and the browser goes to the Stripe URL
* **And** **Make Donation** on **My Trip** has **Amount**, **Payment method**, no **Payment info**, and **Pay with Stripe**, and starts the same checkout for Ana

#### Scenario: Participant checkouts keep the donation rules
* **Given** Ben has an applied (not approved) application on the trip
* **When** Ben starts a participant checkout for himself
* **Then** the response is `403` "You can donate to yourself only on trips where you are pre-approved or approved." and Stripe is not called

### US-100.4 — A completed Stripe payment is recorded

#### Scenario: A completed payment is recorded once
* **Given** Carl's pending credit card checkout for Ana for $50.00 (session `cs_1`)
* **And** Stripe reports session `cs_1` with `status` `complete`, `payment_status` `paid`, `amount_total` 5000, payment intent `pi_1` (`succeeded`) created 2027-01-15T14:30:00Z, and latest charge `ch_1` with receipt URL `https://pay.stripe.com/receipts/ch_1` paid by a Visa card ending 4242
* **When** the checkout is checked twice
* **Then** exactly one donation exists for Ana: type Stripe-Credit, payment status Succeeded, payment method `card` / "visa" / "4242", amount 50.00, date 2027-01-15 14:30 UTC, session `cs_1`, payment intent `pi_1`, charge `ch_1`, the receipt URL, and the session JSON, with Carl as donor
* **And** it counts toward Ana's donation total
* **And** the checkout is completed and both answers are `completed` with payment status `succeeded`, the amount, trip, participant, and receipt URL
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
* **Given** the checkout check answers `completed` with payment status `succeeded`, $50.00, "Guatemala Clinic 2027", "Ana Lopez", and a receipt URL
* **When** the donor lands on `/donate/complete/<token>`
* **Then** the page shows "Thank you for your donation!", "$50.00 to Guatemala Clinic 2027 for Ana Lopez", a **Receipt** link, and **Back**

#### Scenario: The return page waits for confirmation
* **Given** the checkout check answers `pending` every time
* **When** the donor lands on `/donate/complete/<token>`
* **Then** the page shows "Waiting for Stripe to confirm your payment…", checks 6 more times 5 seconds apart, and then shows "Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly."

### US-100.5 — Staff record donations by type

#### Scenario: Staff record a Check donation
* **Given** Olivia is signed in
* **When** she adds a $100.00 donation for Ana with type Check and check number "1042"
* **Then** it is saved with type Check, check number "1042", and no payment status
* **And** adding one with type Check and no check number is refused with `400` "Check number is required."
* **And** adding one with type Stripe-Credit or Stripe-ACH is refused with `400` "Use Pay with Stripe for Stripe-ACH and Stripe-Credit donations."

#### Scenario: The donation form shows Pay with Stripe or Save by type
* **Given** Olivia opens **Add donation** for a trip whose organization has online donations set up
* **Then** **Type** offers Stripe-ACH, Stripe-Credit, Check, and Other with Other selected, no **Check number**, and **Save**
* **When** she chooses Check
* **Then** **Check number** appears with **Save**, and saving without one shows "Check number is required."
* **When** she chooses Stripe-Credit
* **Then** **Check number** and **Date** are hidden and **Pay with Stripe** replaces **Save**
* **When** she fills in donor Carl, participant Ana, and $75 and clicks **Pay with Stripe**
* **Then** the staff checkout is started with payment method `card` and the browser goes to the Stripe URL
* **And** for an organization without online donations set up, choosing Stripe-ACH shows "Online donations aren't set up for this organization yet." and **Pay with Stripe** is disabled

#### Scenario: Staff take a Stripe payment
* **Given** Hope Missions has its Stripe secret key saved and Olivia is signed in
* **When** she starts a staff checkout for Ana for $75.00 with payment method `us_bank_account`, donor Carl, and payment info "Phone gift"
* **Then** Stripe is called with `payment_method_types[0]=us_bank_account` and `customer_email` carl@example.com
* **And** the pending checkout has type Stripe-ACH, Carl as donor, and payment info "Phone gift", and its **Back** returns to the **Donations** page
* **And** a Trip Participant starting a staff checkout gets `403`

#### Scenario: A Stripe donation's amount can't be changed
* **Given** a recorded Stripe-Credit donation of $50.00
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
* **Then** the file `trip-<tripId>-donations-2027-01-10-to-2027-01-31.csv` has the columns Date, Amount, Fee Covered, Type, Check Number, Payment Status, Payment Method, Participant, Donor, Donor Email, Payment Info, Stripe Payment ID, Stripe Charge ID and one row with type Check and check number 1042

#### Scenario: The Donations page uses the date range
* **Given** Olivia is on the **Donations** page with the trip selected
* **When** she sets **Start date** 2027-01-10 and **End date** 2027-01-31
* **Then** the list is loaded with those dates and **Export CSV** downloads with those dates
* **And** setting **Start date** after **End date** shows "Start date must be on or before End date." and disables **Export CSV**

### US-100.8 — Bank payments are tracked until they clear

#### Scenario: A bank payment is recorded as Processing and not counted
* **Given** Carl's pending bank account checkout for Ana for $50.00 (session `cs_2`)
* **And** Stripe reports session `cs_2` with `status` `complete`, `payment_status` `unpaid`, and payment intent `pi_2` (`processing`) paid from "STRIPE TEST BANK" account ending 6789
* **When** the checkout is checked
* **Then** one donation exists for Ana: type Stripe-ACH, payment status Processing, payment method `us_bank_account` / "STRIPE TEST BANK" / "6789", payment intent `pi_2`
* **And** it doesn't count toward Ana's donation total, the trip's total donations, or her balance
* **And** no donation event email or Trip Donation email is sent
* **And** the answer is `completed` with payment status `processing`

#### Scenario: A processing bank payment that clears is counted and emailed
* **Given** the Processing Stripe-ACH donation for Ana with payment intent `pi_2`
* **And** Stripe reports `pi_2` as `succeeded` with latest charge `ch_2` and a receipt URL
* **When** the background check runs twice
* **Then** the donation's payment status is Succeeded, with charge `ch_2`, the receipt URL, and `paymentStatusUpdatedAt` set
* **And** it counts toward Ana's donation total
* **And** the donation event emails and the Trip Donation email are sent once

#### Scenario: A failed bank payment is marked Failed and never counted
* **Given** the Processing Stripe-ACH donation for Ana with payment intent `pi_2`
* **And** Stripe reports `pi_2` as `requires_payment_method` with `last_payment_error.message` "The customer's bank account has insufficient funds."
* **When** the background check runs
* **Then** the donation's payment status is Failed with that failure reason
* **And** it doesn't count toward any total, no email is sent, and later checks leave it alone

#### Scenario: The return page explains a processing bank payment
* **Given** the checkout check answers `completed` with payment status `processing`, $50.00, "Guatemala Clinic 2027", and "Ana Lopez"
* **When** the donor lands on `/donate/complete/<token>`
* **Then** the page shows "Thank you for your donation!", "$50.00 to Guatemala Clinic 2027 for Ana Lopez", "Your bank payment is processing. It usually takes up to 4 business days to clear.", and **Back**

#### Scenario: The Donations page shows payment status
* **Given** the trip has a Succeeded Stripe-Credit donation paid by Visa ending 4242, a Processing Stripe-ACH donation, a Failed Stripe-ACH donation, and a Check numbered "1042"
* **When** Olivia opens the **Donations** page
* **Then** the **Type** column shows "Stripe-Credit", "Stripe-ACH", "Stripe-ACH", and "Check #1042", and the **Status** column shows "Succeeded", "Processing", "Failed", and "—"
* **And** **Edit** on the Stripe-Credit donation shows **Payment status** "Succeeded" and **Payment method** "Visa •••• 4242" read-only
* **And** the summary cards count only the Succeeded and Check donations

### US-100.9 — Donors can cover the processing fee

#### Scenario: An Org Admin turns on fee coverage
* **Given** Olivia is signed in
* **When** she updates Hope Missions with `stripeFeeCoverage` true
* **Then** the organization response has `stripeFeeCoverage` true
* **And** a new organization has `stripeFeeCoverage` false

#### Scenario: A card checkout asks the donor to cover the processing fee
* **Given** Hope Missions has its Stripe secret key saved and **Ask donors to cover processing fees** on
* **When** Carl starts a $50.00 credit card checkout for Ana on the public participant page
* **Then** Stripe **Create a Checkout Session** is called with header `Stripe-Version: 2026-08-26.preview`, `allowed_payment_method_types[0]=card`, `fee_coverage[enabled]=true`, `unit_amount` 5000, and no `payment_method_types`
* **And** the pending checkout records that it asked for fee coverage

#### Scenario: Bank checkouts and organizations without the setting aren't asked
* **Given** Hope Missions has its Stripe secret key saved and **Ask donors to cover processing fees** on
* **When** Carl starts a $50.00 bank account checkout for Ana
* **Then** Stripe is called with the pinned API version, `payment_method_types[0]=us_bank_account`, and no `fee_coverage`
* **And** with the setting off, a credit card checkout is called with the pinned API version, `payment_method_types[0]=card`, and no `fee_coverage`

#### Scenario: A covered processing fee is recorded apart from the gift
* **Given** Carl's pending $50.00 credit card checkout for Ana that asked for fee coverage
* **And** Stripe reports its session `complete` with `amount_total` 5175, `fee_coverage_cost.amount_total` 175, and payment intent `pi_3` (`succeeded`)
* **When** the checkout is checked
* **Then** the session is retrieved with header `Stripe-Version: 2026-08-26.preview`
* **And** the donation has amount 50.00 and processing fee 1.75
* **And** Ana's donation total grows by $50.00
* **And** the answer has `amount` 50 and `feeCovered` 1.75
* **And** the CSV row has Amount 50.00 and Fee Covered 1.75
* **And** the Trip Donation email fills `DONATION_AMOUNT` with "$50.00" and `DONATION_FEE_COVERED` with "$1.75"

#### Scenario: A donor who removes the fee offer covers no fee
* **Given** a pending $50.00 credit card checkout for Ana that asked for fee coverage
* **And** Stripe reports its session `complete` with `amount_total` 5000 and no `fee_coverage_cost`
* **When** the checkout is checked
* **Then** the donation has amount 50.00 and no processing fee, and the answer's `feeCovered` is null

#### Scenario: Staff and donors see the covered fee
* **Given** the trip has a Succeeded Stripe-Credit donation of $50.00 with a $1.75 covered fee and a Check numbered "1042"
* **When** Olivia opens the **Donations** page
* **Then** the **Fee covered** column shows "$1.75" and "—"
* **And** **Edit** on the Stripe-Credit donation shows **Fee covered** "$1.75" read-only
* **And** when the checkout check answers `completed`, `succeeded`, $50.00, and `feeCovered` 1.75, the return page shows "Thank you for also covering the $1.75 processing fee."

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-100.1 | An Org Admin saves the Stripe keys | `backend/tests/stripe-donations.test.js` | `An Org Admin saves the Stripe keys` |
| US-100.1 | Edit organization shows the Stripe section | `frontend/tests/StripeDonations.test.js` | `Edit organization shows the Stripe section` |
| US-100.2 | A public donor starts a Stripe payment | `backend/tests/stripe-donations.test.js` | `A public donor starts a Stripe payment` |
| US-100.2 | A bank account checkout offers only ACH | `backend/tests/stripe-donations.test.js` | `A bank account checkout offers only ACH` |
| US-100.2 | Test mode uses the test key | `backend/tests/stripe-donations.test.js` | `Test mode uses the test key` |
| US-100.2 | Checkout input is validated | `backend/tests/stripe-donations.test.js` | `Checkout input is validated` |
| US-100.2 | Online donations not set up | `backend/tests/stripe-donations.test.js`, `frontend/tests/StripeDonations.test.js` | `Online donations not set up` |
| US-100.2 | The public page sends the donor to Stripe | `frontend/tests/StripeDonations.test.js` | `The public page sends the donor to Stripe` |
| US-100.2 | Donations without payment are no longer accepted | `backend/tests/stripe-donations.test.js` | `Donations without payment are no longer accepted` |
| US-100.2 | (FR-005 `502`, no Gherkin scenario) | `backend/tests/stripe-donations.test.js` | `Stripe failing to start the payment keeps no checkout` |
| US-100.3 | The Donate and Make Donation dialogs pay with Stripe | `frontend/tests/StripeDonations.test.js` | `The Donate and Make Donation dialogs pay with Stripe` |
| US-100.3 | Participant checkouts keep the donation rules | `backend/tests/stripe-donations.test.js` | `Participant checkouts keep the donation rules` |
| US-100.4 | A completed payment is recorded once | `backend/tests/stripe-donations.test.js` | `A completed payment is recorded once` |
| US-100.4 | An unpaid checkout isn't recorded | `backend/tests/stripe-donations.test.js` | `An unpaid checkout isn't recorded` |
| US-100.4 | The background check records a payment the donor didn't return from | `backend/tests/stripe-donations.test.js` | `The background check records a payment the donor didn't return from` |
| US-100.4 | The return page thanks the donor | `frontend/tests/StripeDonations.test.js` | `The return page thanks the donor` |
| US-100.4 | The return page waits for confirmation | `frontend/tests/StripeDonations.test.js` | `The return page waits for confirmation` |
| US-100.5 | Staff record a Check donation | `backend/tests/stripe-donations.test.js` | `Staff record a Check donation` |
| US-100.5 | The donation form shows Pay with Stripe or Save by type | `frontend/tests/StripeDonations.test.js` | `The donation form shows Pay with Stripe or Save by type` |
| US-100.5 | Staff take a Stripe payment | `backend/tests/stripe-donations.test.js` | `Staff take a Stripe payment` |
| US-100.5 | A Stripe donation's amount can't be changed | `backend/tests/stripe-donations.test.js` | `A Stripe donation's amount can't be changed` |
| US-100.5 | Existing donations become Other | `backend/tests/stripe-donations.test.js` | `Existing donations become Other` |
| US-100.6 | A new donation emails the donor and the participant | `backend/tests/stripe-donations.test.js` | `A new donation emails the donor and the participant` |
| US-100.7 | The donations list filters by date range | `backend/tests/stripe-donations.test.js` | `The donations list filters by date range` |
| US-100.7 | The CSV exports the selected range | `backend/tests/stripe-donations.test.js` | `The CSV exports the selected range` |
| US-100.7 | The Donations page uses the date range | `frontend/tests/StripeDonations.test.js` | `The Donations page uses the date range` |
| US-100.8 | A bank payment is recorded as Processing and not counted | `backend/tests/stripe-donations.test.js` | `A bank payment is recorded as Processing and not counted` |
| US-100.8 | A processing bank payment that clears is counted and emailed | `backend/tests/stripe-donations.test.js` | `A processing bank payment that clears is counted and emailed` |
| US-100.8 | A failed bank payment is marked Failed and never counted | `backend/tests/stripe-donations.test.js` | `A failed bank payment is marked Failed and never counted` |
| US-100.8 | The return page explains a processing bank payment | `frontend/tests/StripeDonations.test.js` | `The return page explains a processing bank payment` |
| US-100.8 | The Donations page shows payment status | `frontend/tests/StripeDonations.test.js` | `The Donations page shows payment status` |
| US-100.9 | An Org Admin turns on fee coverage | `backend/tests/stripe-donations.test.js` | `An Org Admin turns on fee coverage` |
| US-100.9 | A card checkout asks the donor to cover the processing fee | `backend/tests/stripe-donations.test.js` | `A card checkout asks the donor to cover the processing fee` |
| US-100.9 | Bank checkouts and organizations without the setting aren't asked | `backend/tests/stripe-donations.test.js` | `Bank checkouts and organizations without the setting aren't asked` |
| US-100.9 | A covered processing fee is recorded apart from the gift | `backend/tests/stripe-donations.test.js` | `A covered processing fee is recorded apart from the gift` |
| US-100.9 | A donor who removes the fee offer covers no fee | `backend/tests/stripe-donations.test.js` | `A donor who removes the fee offer covers no fee` |
| US-100.9 | Staff and donors see the covered fee | `frontend/tests/StripeDonations.test.js` | `Staff and donors see the covered fee` |

---

## Agent implementation request

```text
Implement Feature 100 from @features/feature-100-stripe-donations.md on branch `feature/100-stripe-donations`.

Backend: organization Stripe keys (encrypted, prefix-checked, *KeySaved flags); donationCheckout model; a small Stripe client (fetch, form-encoded, key chosen by the organization's Test mode, pinned Stripe-Version) for Create a Checkout Session (payment_method_types card or us_bank_account), Retrieve a Checkout Session (expand payment_intent.latest_charge), and Retrieve a PaymentIntent (expand latest_charge); public, participant, and staff checkout endpoints, check endpoint, 10-minute background check of pending checkouts and Processing donations started from server.js (not in tests); remove the unpaid donation endpoints; tripDonation type (Stripe-ACH, Stripe-Credit, Check, Other), check number, payment status, payment method, and Stripe fields with validation; every donation total, raised amount, and balance sums only counted donations (Check, Other, Succeeded); trip-donation email type, tokens, template JSON, and sending to participant and donor when a donation starts counting; donations list and CSV date range and status columns; organization stripeFeeCoverage, which makes card checkouts send Stripe-Version 2026-08-26.preview, allowed_payment_method_types[0]=card, and fee_coverage[enabled]=true, with the covered fee (fee_coverage_cost.amount_total) recorded in tripDonation.processingFeeAmount and taken out of amount. ensureSchema for all schema changes.
Frontend: Stripe section in the organization form; Payment method and Pay with Stripe on DonorTripPage, DonorParticipantPage, ParticipantDonateDialog, MakeDonationDialog; new /donate/complete/:token page with processing and failed messages; Type (four types), Check number, and Pay with Stripe / Save by type in DonationFormDialog, with read-only payment status and method on Edit; Start/End date, Type, and Status columns on DonationsList with range-aware export.
Update docs/user-guide/ and run `npm run user-guide:pdf`.
Tests per the Test Coverage Map, with Stripe HTTP calls replaced. Update features/reference/ (behavior, api, data-model).
```

---

## Definition of Done

*   [x] Stripe keys per **FR-001**, **FR-002**
*   [x] Payment method and Pay with Stripe on all four donor screens per **FR-003**–**FR-007**
*   [x] Payments recorded per **FR-008**–**FR-010**
*   [x] Four donation types, staff Pay with Stripe / Save by type per **FR-011**, **FR-012**
*   [x] Trip Donation email per **FR-013**–**FR-015**
*   [x] Date range, status column, and CSV per **FR-016**, **FR-017**
*   [x] Payment status, counting rule, Processing follow-up, and payment method per **FR-018**–**FR-020**
*   [x] Processing fee coverage per **FR-021**–**FR-023**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend `npm test` and frontend `npx vitest run` green
*   [ ] Manual test-mode card and bank payments per **SC-002**, **SC-003**, and fee coverage per **SC-004**
*   [x] `features/reference/` updated
*   [x] User guide updated and PDFs regenerated
*   [ ] PR to `dev`

## Out of Scope

- Squarespace and Square
- Refunds, disputes, and recurring donations (handled in Stripe)
- Stripe Connect, OAuth, and webhooks (keys are entered by hand; payments are found by checking)
- Payment methods other than card and US bank account (wallets, BNPL, international bank debits), and microdeposit bank verification
- Disputes or reversals after a payment Succeeded (handled in Stripe; the donation stays Succeeded)
- An email when a bank payment fails
- Currencies other than USD, tipping, promotion codes, and tax
- Fee coverage for bank payments (Stripe offers it only for cards), an app-calculated fee, and Stripe's actual processing fee in the donation record (only the fee a donor covered is recorded)
- A donor name token, and changes to the existing Donation received / deposit / payment complete emails
- Choosing Check or Other on the donor screens
