# Feature: Donor Maintenance

**Feature ID:** 130
**Branch pattern:** `feature/130-donor-maintenance`
**Status:** Implemented
**Created:** 2026-11-12
**Input:** Add Donors list, add, and edit for System Admins and Org Admins. Donors belong to one organization. The list has Email, which opens a dialog to pick a Donor template and donors by All, Donated this year, or a specific trip. Donor status dontcontact is No Email and those donors cannot be selected.
**Depends on:** [Feature 8 — Donors and Donations](feature-8-donors-and-donations.md), [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md), [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md), [Feature 40 — Email Template Tokens and Preview](feature-40-email-template-tokens.md), [Feature 43 — Email Delivery](feature-43-email-delivery.md), [Feature 49 — Organization Email Test Mode](feature-49-organization-email-test-mode.md), [Feature 53 — Participant Donations](feature-53-participant-donations.md), [Feature 62 — Email People](feature-62-people-email.md), [Feature 100 — Stripe Donations](feature-100-stripe-donations.md)

Donors are a single shared list today, with no organization, and staff only reach them from a donation form. This feature gives each donor an organization, adds **Donors** to the System Admin and Org Admin menus, and lets those admins email selected donors from a **Donor** template.

## Clarifications

- Q: Which donors are listed? → A: Donors are organization-specific. The list is the selected organization's donors. A System Admin with **All organizations** must select an organization first.
- Q: What is No Email? → A: No new field. Donor status `dontcontact` is shown as **No Email**. Those donors are left out of the Email dialog and cannot be sent to. The Trip donation thank-you still sends to them.
- Q: How are recipients chosen? → A: **Email** opens a dialog. A choice of **All**, **Donated this year**, or **Donated to a trip** (then a trip list) narrows the donors. Staff check the donors to email. **No Email** donors and donors with no email address are not in that list.
- Q: What is seeded? → A: Tokens `{{DONOR_FIRST_NAME}}`, `{{DONOR_LAST_NAME}}`, and `{{DONOR_EMAIL}}`, plus `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` (date, amount, trip, and participant for the previous calendar year) and `{{DONOR_PREVIOUS_YEAR_TOTAL}}`. Two organization-wide **Donor** templates: a general note, and **Annual donation**. A **Send Now** template **Thank you for donation** sends on a new event when the donor entered the gift. Address and phone are not tokens.
- Q: When does the donor thank-you send? → A: When a donation the donor entered starts counting: the public donation pages, Home **Donate**, and **My Trip** **Make Donation**. Staff **Add donation** and staff **Pay with Stripe** do not send it. It goes to the donor only. The existing Trip donation email is unchanged, so the donor may also receive that one. **No Email** does not stop this thank-you.

---

## User Stories

### US-130.1: Maintain an organization's donors

**As** an Org Admin
**I want** to list, add, and edit the donors of my organization
**So that** donor contact details live with the organization they gave to

**Priority:** P1
**Independent test:** Open **Donors**, add a donor, and see them only on that organization's list. The same email can be a donor of a different organization.
**Acceptance scenarios:** see ### US-130.1

### US-130.2: Write Donor email templates

**As** an Org Admin
**I want** a **Donor** function code and donor name and email tokens
**So that** I can write a message addressed to a donor

**Priority:** P1
**Independent test:** Save an organization template with function code **Donor**. A trip template cannot use **Donor**.
**Acceptance scenarios:** see ### US-130.2

### US-130.3: Email selected donors

**As** an Org Admin
**I want** **Email** on the Donors list to pick a Donor template and the donors who should receive it
**So that** I can write to everyone, to this year's donors, or to the donors of one trip, and skip anyone marked No Email

**Priority:** P1
**Independent test:** With **Donated this year**, check two donors and send. A donor marked **No Email** is not in the list, and posting their id is refused.
**Acceptance scenarios:** see ### US-130.3

---

## Requirements

### Functional Requirements

**Organization donors**

- **FR-001**: Every donor belongs to one organization (`orgId`, required). The Donors list, add, and edit use the acting organization. With no organization selected → the page asks "Select an organization in the menu bar." and the donor APIs return `400` with that message.
- **FR-002**: Only a System Admin, or an Org Admin of the acting organization, may list, create, or update that organization's donors. Anyone else, including a Trip Leader, → `403` "Forbidden." A donor of another organization is `404` "Donor not found." Create always stores the acting organization; a body `orgId` is ignored. Update cannot move a donor to another organization.
- **FR-003**: **Add donor** and **Edit donor** collect **Donor type**, then the name for that type, then **Email**, **Address line 1**, **Address line 2**, **City**, **State/province**, **Postal code**, **Country**, **Phone country code**, **Phone number**, and **Donor status**. **Donor type** is **Organization** (`organization`) or **Individual** (`individual`), and starts as **Individual**. Any other value → `400` "Donor type must be Organization or Individual." **Individual** shows **First name** (required), **Last name**, and **Family name**, and stores no organization name. **Family name** is optional. **Organization** shows **Organization name** (required) and stores no first name, last name, or family name. Blank first name for an individual → `400` "Donor first name is required." Blank organization name → `400` "Organization name is required." Status choices are **Active** (`active`), **Inactive** (`inactive`), and **No Email** (`dontcontact`). The donation form uses these same name fields and labels. On startup, `ensureSchema` adds `donorType` for donors saved before this field and sets them to **Individual**, and adds `organizationName` and `familyName`. An organization whose name was stored as the first name is moved to **Organization name**, and its first and last name are cleared.
- **FR-004**: Email is stored normalized (trimmed, lowercase). Two donors in the same organization cannot share an email → `400` "A donor with this email already exists." The same email may be a donor of another organization. A blank email is allowed, and more than one donor in an organization may have none.
- **FR-005**: Looking up, reusing, or creating a donor from a donation (staff form, public donate, Stripe checkout, or a person's linked donor) uses the trip's organization only. A matching email in another organization does not count. A person's linked donor is one donor per organization (`personId` unique within the organization, still optional). Creating a linked donor sets that organization.

**Existing donors**

- **FR-006**: On startup, `ensureSchema` sets each existing donor's organization from their donations. Donations in one organization set that organization. Donations in several organizations keep the original donor on the organization of the earliest donation and add one copy per other organization; that organization's donations and checkout rows point at the copy. A copy does not keep `personId`. A donor with no donations uses the organization of their linked person's earliest organization role. A donor with neither donations nor a linked person is deleted.

**Donors page**

- **FR-007**: The menu bar shows **Donors** after **Donations** for a System Admin and for an Org Admin. Trip Leaders, Trip Participants, and Agents do not see it. It opens `/donors`.
- **FR-008**: The list columns are **Name** (the organization name, or first and last name), **Family name**, **Type** (**Organization** or **Individual**), **Email**, **City**, **Status** (**Active**, **Inactive**, or **No Email**), and **Actions** (**Edit**). Rows are ordered by that name: organization name, or last name then first name. **Email**, **Import**, and **Add donor** sit above the list. There is no delete.
- **FR-022**: **Import** opens **Import donors**. The file is a CSV with the columns **Donor full name**, **Phone numbers**, **Email**, **Full name**, **Bill address**, and **Ship address** (a QuickBooks donor contact list), up to 5 MB, read in memory and not stored. No file, a file that is not `.csv`, or a larger file → `400` "Choose a CSV file up to 5 MB." A missing column → `400` "This file isn't a donor contact list. Missing columns: <names>." The same people who may list donors may import (**FR-002**). The response is `{ rowCount, added, updated, skipped }`.
- **FR-023**: Each data row is read as follows. The name is **Full name** when that cell has text, otherwise **Donor full name**. A trailing `(Donor)` or `(Dpnor)` is removed. A name that contains `&` is an **Individual**: **Family name** is the whole name, the name before `&` is the first name, and the last word is the last name. A name that contains church, college, university, company, or c of c, or that is written in all capital letters, is an **Organization** and the whole name is the organization name. Any other name is an **Individual**: the first word is the first name and the last word is the last name, and **Family name** is blank. A middle name or middle initial is left out. A one-word name is the first name and the last name is blank. A blank name, or a name that is only digits, is skipped. Email is stored normalized. **Phone numbers** of the form `Phone:(615) 370-9849` store country code `1` and the 10 digits; any other non-blank phone is stored as the phone number with no country code. The address is **Bill address**, or **Ship address** when the bill address is blank. An address ending in a two-letter state and a ZIP (`12345` or `12345-6789`) sets the state, postal code, and country `US`. The city is the words after the last street word (St, Street, Ave, Avenue, Rd, Road, Dr, Drive, Ln, Lane, Blvd, Boulevard, Ct, Court, Crt, Cir, Circle, Way, Pl, Place, Hwy, Highway, Pkwy, Parkway, Ter, Terr, Terrace, Trl, Trail, Trce, Trace, Path, Pike, Box, Cv, Cove, Crst, Crest). When none of those words appear, the last word is the city. A trailing "Pike Road" is the city. A number right after Box, and a unit that starts with `#`, stay on address line 1. Any other address is stored as address line 1 only.
- **FR-024**: A row whose email matches a donor of this organization updates that donor. Otherwise a donor already stored under that same name updates: the organization name, the family name, the first name, or the first and last name together, compared without letter-case or extra-space differences, and an individual whose new first and last name match. The earliest such donor is updated. The update replaces the stored name and **Donor type**. Every other row is added, **Active**, with no linked person. A match in another organization does not count. A later row in the same file updates the donor an earlier row added or updated. An update writes the name and **Donor type**, and writes email, phone, and address only when that cell has text; it does not change **Donor status** or the linked person. **Donor type** and the stored name are the ones read in **FR-023**. An **Organization** stores that name as **Organization name** and clears first and last name. An **Individual** stores the first and last name and **Family name** and clears the organization name. **Family name** is the whole name when it contains `&`, and blank otherwise. `{{DONOR_FIRST_NAME}}` is the organization name for an organization, and `{{DONOR_LAST_NAME}}` is blank. The dialog shows "Imported N rows: N added, N updated, N skipped."

**Donor templates and tokens**

- **FR-009**: **Function code** adds **Donor** after **Person**. A **Donor** template is organization-only, has no schedule, and is sent only from **Email** on the Donors page. Saving a trip template with **Donor** → `400` "Donor templates cannot belong to a trip." The template form does not offer **Donor** for a trip template. Any other new function code is still rejected, and the allowed list in that message includes **Donor**.
- **FR-010**: The email type seed adds `donor-update` (**Donor update**, event code `team-email`, which nothing sends automatically) with event description "This email is not sent automatically. Org Admins send it from Email on the Donors page." It also adds `annual-donation` (**Annual donation**, event code `team-email`, which nothing sends automatically) with event description "This email is not sent automatically. Org Admins send it from Email on the Donors page." The template seed adds, for the seed organization, two **Donor** templates. The first uses **Donor update**, **From email** `{{ORG_EMAIL}}`, **To** `{{DONOR_EMAIL}}`, subject `A note from {{ORG_NAME}}`, and a body that greets `{{DONOR_FIRST_NAME}}` and names the organization. The second is the **Annual donation** template: same from and to, subject `Your annual donations to {{ORG_NAME}}`, and a body that greets `{{DONOR_FIRST_NAME}}`, includes `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` and `{{DONOR_PREVIOUS_YEAR_TOTAL}}`, and names the organization. The Email Report lists **Donor** after **Person**, with **When sent** "Manual".
- **FR-011**: The token seed adds `DONOR_FIRST_NAME` ("Donor first name"), `DONOR_LAST_NAME` ("Donor last name"), `DONOR_EMAIL` ("Donor email"), `DONOR_PREVIOUS_YEAR_DONATIONS` ("Donor previous year donations"), and `DONOR_PREVIOUS_YEAR_TOTAL` ("Donor previous year total"). They fill on a Donors-page send (**FR-015**) and on the donor thank-you (**FR-020**). In every other email they are blank. `{{DONOR_EMAIL}}` may be used as an email **To** or **From** token.
- **FR-018**: `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` lists that donor's counting donations whose date falls in the previous calendar year, one per line, oldest first (then by id). Each line is `MM/DD/YYYY — $X.XX — <trip name> — <participant first last>`. A donation with no participant omits the participant, ending at the trip name. Dates and amounts use the same formats as other email tokens. The year and each donation's date use the email time zone (America/Chicago unless `SCHEDULED_EMAIL_TIMEZONE` is set). Counting donations are Check, Other, and Stripe **Succeeded**, on trips of the donor's organization. Processing and Failed donations are left out. No such donations → blank.
- **FR-019**: `{{DONOR_PREVIOUS_YEAR_TOTAL}}` is the sum of the donations in **FR-018**, formatted as money. No such donations → `$0.00`. **Donated this year** in the Email dialog uses this same time zone and the current calendar year.
- **FR-020**: The email type seed adds `donor-thank-you` (**Thank you for donation**, event code `donor-thank-you`) with event description "This event happens when a donor enters a donation and it starts counting: a public donation page, Home Donate, or My Trip Make Donation. The email goes to the donor. Staff Add donation and staff Pay with Stripe do not send it." The template seed adds, for the seed organization, a **Send Now** template of that type with **From email** `{{ORG_EMAIL}}`, **To** `{{DONOR_EMAIL}}`, subject `Thank you for your donation`, and a body that greets `{{DONOR_FIRST_NAME}}` and includes `{{DONATION_DATE}}`, `{{DONATION_AMOUNT}}`, `{{TRIP_NAME}}`, and the participant's first and last name. A trip may add its own **Send Now** template of this type; the trip's template is used instead of the organization's, as other Send Now events do.
- **FR-021**: When a donation starts counting, and the donor entered it, each matching **Thank you for donation** template is sent to that donor's email only. The template **To** is not used. The donor entered it on a public donation page, Home **Donate**, or **My Trip** **Make Donation**. Staff **Add donation** (Check or Other) and staff **Pay with Stripe** do not send it. Edits and Failed payments do not send it. A bank payment sends it when the payment succeeds, not while it is Processing. No donor email → nothing is sent. **No Email** does not stop it. Tokens fill from the organization, the trip, the participant (blank when the donation has none), the donation (the same donation tokens as the Trip donation email, including fee covered), and the donor (**FR-011**, **FR-018**, **FR-019**). Test mode applies. A failure is logged and does not undo the donation. The Trip donation email still sends as it does today, including to this donor.

**Email dialog**

- **FR-012**: **Email** opens **Email donors**. **Template** lists the acting organization's **Donor** templates by subject. Choosing one fills **Subject** and **Email body**, which are editable for this send only. With none, the dialog says "No Donor templates. Add one under Email templates."
- **FR-013**: **Donors** is a single choice, starting at **All**: **All** (every donor of the organization), **Donated this year** (a counting donation whose date falls in the current calendar year), or **Donated to a trip**. **Donated to a trip** shows **Trip**, required, listing the organization's trips of any status, newest start date first. A counting donation is Check, Other, or a Stripe donation that **Succeeded**. Changing the choice or the trip clears checks that are no longer listed.
- **FR-014**: The dialog lists the matching donors by last name, then first name, with a checkbox each, and **Select all** for the donors listed. **Status** **No Email** (`dontcontact`) and a donor with no email address are omitted. The dialog shows "Recipients: N".
- **FR-015**: **Preview** shows From, Reply-To, To, Subject, and body for the **Preview as** donor (defaults to the first checked donor) and sends nothing. Tokens come from the organization and that donor. Trip, participant, leader, and donation tokens are blank. **To** is the donor's own email.
- **FR-016**: **Send** asks "Are you sure?" with "Send this email to N donors?". Confirming sends one email per checked donor to that donor's email (the template **To** is not used), logged with no trip. The sender name and test mode use the organization. One skip or failure does not stop the rest. The dialog then shows sent, skipped, and failed counts and each skipped or failed donor with the reason.
- **FR-017**: **Preview** and **Send** stay disabled until a template is chosen, **Subject** and **Email body** are not blank, the trip is chosen when **Donated to a trip** is selected, and at least one donor is checked. The server rejects the same cases with `400`: "Choose a template for this organization.", "Subject is required.", "Email body is required.", "Choose a trip.", "No donors to send to." A checked donor who is **No Email** → `400` "Donors marked No Email can't be emailed." A checked donor with no email → `400` "Enter an email address for every selected donor." A donor or trip from another organization → `400` "Donors must belong to this organization." or "Trips must belong to this organization." The send does not start when any of these fail.

---

## Assumptions

- "Admin" is the System Admin. Trip Leaders keep donation entry and do not get the Donors page.
- "Donated" means a counting donation (Check, Other, or Stripe **Succeeded**), the same gifts that count toward totals. Processing and Failed do not.
- "This year" is the current calendar year, and "previous year" is the calendar year before it. Both use the email time zone (America/Chicago unless `SCHEDULED_EMAIL_TIMEZONE` is set). The donation date is the date part of `dateTime` in that zone.
- **No Email** does not stop the Trip donation thank-you (Feature 100), the donor thank-you (**FR-021**), or any other automatic email.
- The Donors list filters do not change who **Email** can list. The dialog's own choice does.
- Address and phone stay on the donor and stay encrypted (Feature 64). They are not new tokens.
- Deleting a donor is out of scope. The donation form can still create and update a donor in the trip's organization.

## Edge Cases

- System Admin on **All organizations** → "Select an organization in the menu bar." **Donors** is still in the menu.
- Organization with no donors → empty list. **Email** opens with "Recipients: 0".
- **All** includes a donor who has never donated. **Donated this year** and **Donated to a trip** do not.
- A donor who gave to two organizations before this feature → one donor record in each, and each organization's donations point at its own record.
- Same email added in a second organization → both donors exist. Lookup on a trip finds only that trip's organization.
- **No Email** donor, or a donor with no email, included in a send request → `400`, and no email is sent.
- No **Donor** template → **Send** stays disabled.
- Organization in test mode → every email goes to the organization email (Feature 49).
- A donor marked **No Email** still receives the Trip donation thank-you when a donation starts counting, and still receives the donor thank-you when they entered that donation.
- A donor with no counting donations last year → `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` is blank and `{{DONOR_PREVIOUS_YEAR_TOTAL}}` is `$0.00`.
- Staff record a Check, or take a Stripe payment from **Add donation** → the donor thank-you is not sent. The Trip donation email still is.

## Success Criteria

- **SC-001**: An Org Admin can add and edit donors, and those donors appear only for that organization.
- **SC-002**: An Org Admin can send one Donor template to the donors they check, limited by All, this year, or one trip, and cannot include a **No Email** donor.
- **SC-003**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- A donor, a Donor template, and a trip in the Email dialog belong to the acting organization. Another organization's ids are refused (**FR-002**, **FR-017**).
- Only a System Admin or an Org Admin of that organization may open the page or call the donor and donor-email APIs.
- Splitting an existing donor copies contact details into each organization that already had that donor's donations. It does not copy `personId`.

---

## Key Entities

- **Donor**: contact fields and status, now belonging to one organization. **No Email** is status `dontcontact`.
- **Email template**: function code **Donor**, organization only.
- **Email token**: donor first name, last name, email, previous-year donation list, and previous-year total.
- **Trip donation**: unchanged. The donor thank-you is a separate Send Now email to the donor who entered the gift.

---

## API Requirements

Donor list, create, and update stay `GET`/`POST /trips/donors` and `PUT /trips/donors/:id`, scoped by **FR-001** and **FR-002**. `GET /trips/donors` no longer returns every donor.

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/trips/donors` | System Admin, Org Admin of the acting org | That organization's donors, last name then first name |
| `POST` | `/trips/donors` | same | Create in the acting organization |
| `POST` | `/trips/donors/import` | same | Multipart field `file`. Imports a donor contact list (**FR-022**–**FR-024**) → `{ rowCount, added, updated, skipped }` |
| `PUT` | `/trips/donors/:id` | same | Update. Other organization → `404` "Donor not found." |
| `GET` | `/trips/donor-email/options` | same | `{ templates: [{ id, subject, emailBody, fromEmail }], trips: [{ id, name, startDate }] }` |
| `POST` | `/trips/donor-email/recipients` | same | Body `{ scope: "all" \| "this-year" \| "trip", tripId? }` → `[{ id, firstName, lastName, email }]` per **FR-013** and **FR-014** |
| `POST` | `/trips/donor-email/preview` | same | Body `{ emailTemplateId, subject, emailBody, donorId }` → `{ from, replyTo, to, subject, body }`. `donorId` must be sendable → else `400` "Preview donor must be one of the recipients." |
| `POST` | `/trips/donor-email/send` | same | Body `{ emailTemplateId, subject, emailBody, donorIds }` → `{ sent, skipped, failed, results: [{ donorId, name, status, reason? }] }` |

Messages are the sentences in **FR-003**, **FR-004**, and **FR-017**.

---

## Screen Requirements

### Menu

**Donors** follows **Donations** and is visible to System Admins and Org Admins.

### Donors

Heading **Donors**. **Email**, **Import**, and **Add donor** above the table. Columns and status labels are **FR-008**. **Edit** opens **Edit donor**.

### Import donors

**Donor contact list** is the CSV file. **Import** uploads it. The dialog then shows "Imported N rows: N added, N updated, N skipped." **Close** returns to the list.

### Add donor / Edit donor

The fields in **FR-003**, including **Donor type** (**Organization** or **Individual**, starting as **Individual**). **Save** stores the donor. **Cancel** closes without saving. A duplicate email shows "A donor with this email already exists."

### Email donors

**Template**, **Subject**, **Email body**, **Donors** (**All**, **Donated this year**, **Donated to a trip**), **Trip** when that last choice is selected, the checkbox list with **Select all**, "Recipients: N", **Preview as**, **Preview**, and **Send**. **Send** confirms with "Send this email to N donors?"

### Donor status on the donation form

The choices read **Active**, **Inactive**, and **No Email**.

---

## Data Model Requirements

### `donor`

- `orgId` INTEGER, required FK → organization, `ON DELETE CASCADE`.
- Unique (`orgId`, `email`) for a stored email. Blank emails are not unique.
- Unique (`orgId`, `personId`) replaces the unique `personId` index. `personId` stays optional.
- `status` is unchanged: `active`, `inactive`, `dontcontact`. **No Email** is `dontcontact`.
- `donorType` is `organization` or `individual`, required, default `individual`.

No new donor column.

### Email type, template, tokens

- Email types `donor-update`, `annual-donation`, and `donor-thank-you` as **FR-010** and **FR-020**.
- `emailTemplate.functionCode` may be `Donor`.
- Tokens `DONOR_FIRST_NAME` (`donor.firstName`), `DONOR_LAST_NAME` (`donor.lastName`), `DONOR_EMAIL` (`donor.email`), `DONOR_PREVIOUS_YEAR_DONATIONS` (`donor.previousYearDonations`), `DONOR_PREVIOUS_YEAR_TOTAL` (`donor.previousYearTotal`).

---

## Acceptance Criteria (Gherkin)

### US-130.1 — Maintain an organization's donors

#### Scenario: Donors is on the admin menus
* **Given** a System Admin and an Org Admin
* **Then** both see **Donors** after **Donations**
* **And** a Trip Leader does not

#### Scenario: The list is one organization
* **Given** Ana is a donor of Hope Mission and not of Other Mission
* **When** an Org Admin of Hope Mission opens **Donors**
* **Then** Ana is on the list
* **And** an Org Admin of Other Mission does not see Ana
* **When** a System Admin has **All organizations** selected
* **Then** the page says "Select an organization in the menu bar."

#### Scenario: Add donor saves in the organization
* **Given** an Org Admin of Hope Mission
* **When** they add a donor named Pat Lee with email pat@example.com
* **Then** Pat is on Hope Mission's Donors list
* **And** Pat is not a donor of another organization

#### Scenario: The same email may be a donor of another organization
* **Given** pat@example.com is a donor of Hope Mission
* **When** an Org Admin of Other Mission adds a donor with email pat@example.com
* **Then** the donor is saved
* **When** they add pat@example.com again in Other Mission
* **Then** it is refused with "A donor with this email already exists."

#### Scenario: Edit donor keeps the organization
* **Given** Ana is a donor of Hope Mission
* **When** an Org Admin edits Ana's city
* **Then** the city is saved and Ana is still a donor of Hope Mission only

#### Scenario: Donor type is Organization or Individual
* **Given** an Org Admin adds a donor
* **When** they set **Donor type** to **Organization** and save
* **Then** the list shows **Organization**
* **And** the stored type is organization

#### Scenario: A donor type must be Organization or Individual
* **When** a donor is saved with a type other than Organization or Individual
* **Then** it is refused with "Donor type must be Organization or Individual."

#### Scenario: Import sets Donor type from the name
* **Given** an Org Admin of Hope Mission
* **When** they import Aaron Redelsperger, Alison C Jones, Brian, Abilene Christian University, A & L Lawncare, and HOPE FUND
* **Then** Aaron is **Individual** with last name Redelsperger
* **And** Alison is **Individual** with first name Alison and last name Jones
* **And** Brian is **Individual**
* **And** A & L Lawncare is an **Individual** with **Family name** A & L Lawncare, first name A, and last name Lawncare
* **And** the university and HOPE FUND are **Organization**

#### Scenario: Import updates the name and type of an existing donor
* **Given** Alison is already stored as first name Alison C and last name Jones
* **And** Abilene Christian University is already stored as an Individual whose first name is the whole name
* **And** Adam & Deb Dingwell is already stored as an Individual
* **When** the contact list is imported
* **Then** Alison is still one donor, with first name Alison and last name Jones
* **And** Abilene Christian University is one **Organization**
* **And** Adam & Deb Dingwell is one **Individual** with **Family name** Adam & Deb Dingwell, first name Adam, and last name Dingwell

#### Scenario: No Email is the dontcontact status
* **Given** an Org Admin adds a donor
* **When** they set **Donor status** to **No Email** and save
* **Then** the list shows **No Email**
* **And** the stored status is dontcontact

#### Scenario: Import adds donors from the contact list
* **Given** an Org Admin of Hope Mission
* **When** they import a donor contact list whose row is `Aaron  Redelsperger`, email aaronsperger@gmail.com, phone `Phone:(615) 370-9849`, and bill address `607 Quail Meadow Dr Mount Shasta CA 96067-9170`
* **Then** Aaron Redelsperger is an Active donor of Hope Mission
* **And** the city is Mount Shasta, the state is CA, the postal code is 96067-9170, and the phone is 6153709849
* **And** a row whose name is only `60` is not added

#### Scenario: An existing email or the same name is updated
* **Given** Pat Lee, pat@example.com, is a donor of Hope Mission in city Cabot
* **And** Ana Lopez, with no email, is a donor of Hope Mission
* **When** the import has a row with email pat@example.com and city Searcy
* **And** a row named Ana Lopez with email ana@example.com
* **Then** Pat's city is Searcy and there is still one Pat Lee
* **And** Ana's email is ana@example.com and there is still one Ana Lopez

#### Scenario: Import stays in the organization
* **Given** pat@example.com is a donor of Other Mission in city Cabot
* **When** Hope Mission imports that email with city Searcy
* **Then** Hope Mission has its own donor in Searcy
* **And** Other Mission's donor is still in Cabot

#### Scenario: Import needs this contact list
* **When** the file has no Email column
* **Then** it is refused with "This file isn't a donor contact list. Missing columns: Email."

#### Scenario: Import is for organization admins
* **When** a person who is not an Org Admin imports a donor contact list
* **Then** it is refused with "Forbidden."
* **When** a System Admin has **All organizations** selected
* **Then** it is refused with "Select an organization in the menu bar."

#### Scenario: An existing donor who gave to two organizations is split
* **Given** one donor record has a donation on a Hope Mission trip and a donation on an Other Mission trip
* **When** the server starts
* **Then** each organization has its own donor with those contact details
* **And** each donation points at its organization's donor

### US-130.2 — Write Donor email templates

#### Scenario: Donor templates are organization only
* **Given** an Org Admin editing an organization template
* **Then** **Function code** includes **Donor**
* **When** they save it as **Donor**
* **Then** it has no schedule and no trip
* **When** they save a trip template as **Donor**
* **Then** it is refused with "Donor templates cannot belong to a trip."

#### Scenario: Donor tokens fill from the donor
* **Given** a Donor template whose body contains `{{DONOR_FIRST_NAME}}` and `{{DONOR_EMAIL}}`
* **When** it is previewed for Ana, whose email is ana@example.com
* **Then** the body contains Ana and ana@example.com
* **And** `{{TRIP_NAME}}` is blank

#### Scenario: A Donor template is seeded
* **Given** a newly seeded organization
* **Then** it has a **Donor** template with subject "A note from {{ORG_NAME}}"
* **And** the tokens Donor first name, Donor last name, and Donor email exist

#### Scenario: Previous year donations list the date, amount, trip, and participant
* **Given** Ana gave a Succeeded $50.00 on 03/02 of last year to Pat on Guatemala Clinic
* **And** Ana gave a Check $25.00 on 11/20 of last year to the trip Honduras Clinic, with no participant
* **And** Ana gave a Succeeded $10.00 this year, and a Failed Stripe donation last year
* **When** a Donor template containing `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` and `{{DONOR_PREVIOUS_YEAR_TOTAL}}` is previewed for Ana
* **Then** the list is two lines, oldest first: `03/02/YYYY — $50.00 — Guatemala Clinic — Pat Lee` and `11/20/YYYY — $25.00 — Honduras Clinic`, with YYYY the previous calendar year
* **And** the total is $75.00
* **And** the this-year gift and the Failed gift are not listed

#### Scenario: The annual donation template is seeded
* **Given** a newly seeded organization
* **Then** it has an **Annual donation** template with subject "Your annual donations to {{ORG_NAME}}"
* **And** the body contains `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` and `{{DONOR_PREVIOUS_YEAR_TOTAL}}`

#### Scenario: The donor thank-you template is seeded
* **Given** a newly seeded organization
* **Then** it has a **Send Now** template with subject "Thank you for your donation"
* **And** its email type event is donor-thank-you

### US-130.3 — Email selected donors

#### Scenario: All lists donors who can be emailed
* **Given** Hope Mission has Ana (Active, with an email), Ben (No Email, with an email), and Cy (Active, with no email)
* **When** an Org Admin opens **Email donors** with **Donors** **All**
* **Then** only Ana is listed

#### Scenario: Donated this year limits the list
* **Given** Ana has a Succeeded donation dated this calendar year
* **And** Ben has only a Succeeded donation dated last year
* **And** Cy has only a Failed Stripe donation dated this year
* **When** **Donors** is **Donated this year**
* **Then** Ana is listed and Ben and Cy are not

#### Scenario: Donated to a trip lists that trip's donors
* **Given** Ana has a Check donation on Guatemala Clinic
* **And** Ben has a Check donation on Honduras Clinic only
* **When** **Donors** is **Donated to a trip** and **Trip** is Guatemala Clinic
* **Then** Ana is listed and Ben is not

#### Scenario: Send goes to the checked donors
* **Given** Ana and Ben are both listed
* **When** the Org Admin checks Ana only and confirms **Send**
* **Then** one email is sent to Ana's email
* **And** Ben is not emailed
* **And** the dialog shows "Sent 1, skipped 0, failed 0"

#### Scenario: A No Email donor cannot be included
* **Given** Ben's status is dontcontact
* **When** a send request includes Ben
* **Then** it is refused with "Donors marked No Email can't be emailed."
* **And** no email is sent

#### Scenario: The thank-you still goes to a No Email donor
* **Given** Ben's status is dontcontact
* **When** a Check donation from Ben starts counting
* **Then** the Trip donation thank-you is still sent to Ben's email

#### Scenario: A donor who enters a donation is thanked
* **Given** the organization's **Thank you for donation** template
* **When** Ana pays from the public donation page and the payment succeeds
* **Then** that template is sent to Ana's email
* **And** the body greets Ana and includes the donation amount and the trip name
* **And** the participant is not sent this template

#### Scenario: Staff entry does not send the donor thank-you
* **Given** the organization's **Thank you for donation** template
* **When** staff save a Check donation for Ana
* **Then** the donor thank-you is not sent
* **And** the Trip donation email is still sent

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-130.1 | Donors is on the admin menus | `frontend/tests/MenuBar.test.js` | `Donors is on the admin menus` |
| US-130.1 | The list is one organization | `backend/tests/donors.test.js` | `The list is one organization` |
| US-130.1 | Add donor saves in the organization | `backend/tests/donors.test.js` | `Add donor saves in the organization` |
| US-130.1 | The same email may be a donor of another organization | `backend/tests/donors.test.js` | `The same email may be a donor of another organization` |
| US-130.1 | Edit donor keeps the organization | `backend/tests/donors.test.js` | `Edit donor keeps the organization` |
| US-130.1 | Donor type is Organization or Individual | `frontend/tests/DonorsList.test.js` | `Donor type is Organization or Individual` |
| US-130.1 | A donor type must be Organization or Individual | `backend/tests/donors.test.js` | `A donor type must be Organization or Individual` |
| US-130.1 | Import sets Donor type from the name | `backend/tests/donors.test.js` | `Import sets Donor type from the name` |
| US-130.1 | Import updates the name and type of an existing donor | `backend/tests/donors.test.js` | `Import updates the name and type of an existing donor` |
| US-130.1 | No Email is the dontcontact status | `frontend/tests/DonorsList.test.js` | `No Email is the dontcontact status` |
| US-130.1 | Import is on the Donors page | `frontend/tests/DonorsList.test.js` | `Import is on the Donors page` |
| US-130.1 | Import adds donors from the contact list | `backend/tests/donors.test.js` | `Import adds donors from the contact list` |
| US-130.1 | An existing email or the same name is updated | `backend/tests/donors.test.js` | `An existing email or the same name is updated` |
| US-130.1 | Import stays in the organization | `backend/tests/donors.test.js` | `Import stays in the organization` |
| US-130.1 | Import needs this contact list | `backend/tests/donors.test.js` | `Import needs this contact list` |
| US-130.1 | Import is for organization admins | `backend/tests/donors.test.js` | `Import is for organization admins` |
| US-130.1 | An existing donor who gave to two organizations is split | `backend/tests/donors.test.js` | `An existing donor who gave to two organizations is split` |
| US-130.2 | Donor templates are organization only | `backend/tests/donor-email.test.js` | `Donor templates are organization only` |
| US-130.2 | Donor tokens fill from the donor | `backend/tests/donor-email.test.js` | `Donor tokens fill from the donor` |
| US-130.2 | A Donor template is seeded | `backend/tests/donor-email.test.js` | `A Donor template is seeded` |
| US-130.2 | Previous year donations list the date, amount, trip, and participant | `backend/tests/donor-email.test.js` | `Previous year donations list the date, amount, trip, and participant` |
| US-130.2 | The annual donation template is seeded | `backend/tests/donor-email.test.js` | `The annual donation template is seeded` |
| US-130.2 | The donor thank-you template is seeded | `backend/tests/donor-email.test.js` | `The donor thank-you template is seeded` |
| US-130.3 | All lists donors who can be emailed | `frontend/tests/DonorsList.test.js` | `All lists donors who can be emailed` |
| US-130.3 | Donated this year limits the list | `backend/tests/donor-email.test.js` | `Donated this year limits the list` |
| US-130.3 | Donated to a trip lists that trip's donors | `backend/tests/donor-email.test.js` | `Donated to a trip lists that trip's donors` |
| US-130.3 | Send goes to the checked donors | `backend/tests/donor-email.test.js` | `Send goes to the checked donors` |
| US-130.3 | A No Email donor cannot be included | `backend/tests/donor-email.test.js` | `A No Email donor cannot be included` |
| US-130.3 | The thank-you still goes to a No Email donor | `backend/tests/donor-email.test.js` | `The thank-you still goes to a No Email donor` |
| US-130.3 | A donor who enters a donation is thanked | `backend/tests/donor-email.test.js` | `A donor who enters a donation is thanked` |
| US-130.3 | Staff entry does not send the donor thank-you | `backend/tests/donor-email.test.js` | `Staff entry does not send the donor thank-you` |

---

## Agent implementation request

```text
Implement Feature 130 from @features/feature-130-donor-maintenance.md on branch `feature/130-donor-maintenance`.

Make every donor belong to one organization. Add Donors to the System Admin and Org Admin menus with list, add, and edit. Donor status dontcontact is labeled No Email. Do not add a new column for it.
Add function code Donor, tokens DONOR_FIRST_NAME, DONOR_LAST_NAME, DONOR_EMAIL, DONOR_PREVIOUS_YEAR_DONATIONS, and DONOR_PREVIOUS_YEAR_TOTAL, the seeded Donor note template, and the Annual donation template. The previous-year list is one line per counting donation: date, amount, trip, and participant. The total is their sum.
Add a Send Now template Thank you for your donation on event donor-thank-you. Send it only to the donor when they entered the donation and it starts counting (public donation pages, Home Donate, My Trip Make Donation). Do not send it for staff Add donation or staff Pay with Stripe. Leave the Trip donation email unchanged.
Email on the Donors list opens a dialog: pick a Donor template, choose All, Donated this year, or Donated to a trip, and check donors. Leave out No Email donors and donors with no email. Refuse a send that includes them. Do not change the Trip donation thank-you.
Map every Gherkin scenario in the Test Coverage Map. Run `npm test` before finishing.
Update @features/reference/behavior.md, @features/reference/api.md, and @features/reference/data-model.md in the same PR.
Update the affected @docs/user-guide/ files (menu, Donors screens, Donor status label, function code, tokens) and run `npm run user-guide:pdf`.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (`donor.orgId`, unique email per organization, unique person per organization). `features/reference/api.md` (donor list scope, donor-email endpoints). `features/reference/behavior.md` (Donors page, No Email, Donor templates and send rules, the donor thank-you event).

**User guide updates:** `docs/user-guide/getting-started.md` (**Donors** menu). `docs/user-guide/org-admin-guide.md` (Donors list, add, edit, Email donors, **Donor** function code, the donor tokens including the previous-year list and total, the **Annual donation** template, and the **Thank you for donation** event). `docs/user-guide/trip-staff-guide.md` (**Donor status** labels, including **No Email**). `docs/user-guide/glossary.md` (**No Email**). `docs/user-guide/troubleshooting.md` (the refusal sentences). `docs/user-guide/system-admin-guide.md` only if the Email tokens page lists seeded tokens by name.

---

## Definition of Done

*   [x] Donors belong to one organization and existing donors are placed (**FR-001**, **FR-005**, **FR-006**)
*   [x] **Donors** list, add, and edit match **FR-003**, **FR-004**, **FR-007**, and **FR-008**
*   [x] **Import** reads the donor contact list and updates a matching email or the same first and last name (**FR-022**, **FR-023**, **FR-024**)
*   [x] **Donor type** is **Organization** or **Individual** (**FR-003**, **FR-008**, **FR-024**)
*   [x] **Donor** function code, tokens, and seeded templates match **FR-009** through **FR-011**, **FR-018**, **FR-019**, and **FR-020**
*   [x] **Email donors** matches **FR-012** through **FR-017**
*   [x] The donor thank-you sends only when the donor entered the gift (**FR-021**), and the Trip donation email is unchanged
*   [x] Automated tests for every Gherkin scenario
*   [x] Living reference updated in this PR
*   [x] User guide updated and PDFs regenerated
*   [x] `npm test` green
*   [ ] On `feature/130-donor-maintenance`; PR → `dev`

---

## Out of Scope

- A new No Email column. Status `dontcontact` is **No Email**.
- Stopping the Trip donation thank-you, or any other automatic email, for **No Email**.
- Donor address or phone tokens.
- Deleting a donor.
- Trip Leader, Trip Participant, or Agent access to the Donors page.
- Emailing donors from the Donations page or from Email team.
