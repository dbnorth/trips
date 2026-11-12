# Organization Admin Guide

This guide is for **Org Admins** setting up and running an organization: its settings, people, trips, worker roles, document types, medical conditions, email templates, and pictures. Running an individual trip's team (approvals, documents, rooming, flights, donations) is in the [Trip staff guide](./trip-staff-guide.md).

Admin pages work on the organization chosen in the menu bar's **Organization** selector. If you administer more than one organization, a note at the top of each page says "Showing … for *organization*."

## Setting up an organization

A typical order:

1. **Organizations → Edit**: contact details, colors, logo, and the participant and medical agreements.
2. **Medical conditions**: the conditions applicants choose from.
3. **Document types**: the documents people upload, with their expiration rules.
4. **Worker roles**: the jobs on a team and the documents each needs.
5. **People**: add staff and give them roles.
6. **Templates**: the emails the organization sends.
7. **Trips**: create trips, with their leaders, roles, and options.
8. **Organizations → Edit → Online donations (Stripe)**: save your Stripe secret key so donors can pay online by card or bank account.

Turn on **Test mode** while you try out email templates. Test mode also switches online donations to your Stripe test key, so you can try payments with Stripe's test cards.

---

# Screen reference

## Home

As an Org Admin, Home shows your organization's name with **Edit** (opens [Edit organization](#add-organization--edit-organization)) and a link to the **Organization trips page** (the public page), then **Organization Trips**.

### Organization Trips

- **Show all trips** — unticked shows only active trips that haven't ended. Tick it to see every trip.

| Column | Shows |
|--------|-------|
| **Name** | The trip. |
| **Leaders** | The trip's leaders. |
| **Participants** | Trip Participants whose application is Incomplete, Pre-Approved, or Approved. Leaders, Declined, and Cancelled aren't counted. The info icon splits the count: "Incomplete: *N*", "Pre-approved: *N*", "Approved: *N*". |
| **Total Roles** | Total of every role's Number Needed. A red info icon lists unfilled roles, for example "Nurse: 2 needed". |
| **Total cost** | Total trip cost of the Pre-Approved and Approved members. |
| **Total donations** | Counted donations to those members plus gifts to the trip (Processing and Failed Stripe payments aren't included). |
| **Status** | The trip status (`active`, `completed`, or `inactive`) and the prep icon: green when all five checks pass, red otherwise. Hover it to see each check: All roles filled, All participants approved, All funds raised, Flights entered for all participants, Room list includes all participants. |
| **Dates** | Start – end. |
| **Actions** | **View** (trip page), **Room list**, **Flights**, **Import**, **Edit**. |

## Trips page

**Trips** in the menu bar. The same table as **Organization Trips** on Home, with every trip.

| Button | What it does |
|--------|--------------|
| **Copy** | Opens [Copy trip](#copy-trip). |
| **Add trip** | Opens [Add trip](#add-trip--edit-trip). |

Messages: "Trip created.", "Trip copied.", "Trip updated."

## Add trip / Edit trip

**Add trip** from the Trips page; **Edit trip** from a row's **Edit** or the trip page.

### Trip details

| Field | Choices | Notes |
|-------|---------|-------|
| **Name** | — | Required. Also used in the trip's public web address. |
| **Status** | `active`, `completed`, `inactive` | Starts as `active`. **active**: open for applying and donating, and listed on the public pages. **completed**: the trip has happened. **inactive**: hidden from applicants and donors (for example, while you're still setting it up, or if it's called off). |
| **Organization** | Your organizations | Required. Read-only if you administer just one. |
| **Location** | — | Where the trip goes, for example a clinic or region. |
| **City** | — | |
| **Country** | Every country | |
| **Start date**, **End date** | Dates | Used for travel dates, document due dates (90 days before the start), and document expiration checks. |
| **Participant cost** | Dollar amount | The default cost per person. Staff can set a different cost for a person. |
| **Deposit** | Dollar amount | The first amount participants are asked to raise. It doesn't change the cost. |
| **Require Passport** | Tick box | When ticked, everyone needs a Passport document that's good for the trip, uploaded and Reviewed, before approval. |
| **Description** | Free text | Shown on the trip pages. |
| **Facebook page URL**, **Instagram ID** | — | The trip's social media. |
| **Upload trip image** | PNG, JPEG, GIF, WebP, or HEIC, up to 2 MB | Shown on the trip pages. |
| **Trip leaders** | People with the Trip Leader role in the organization | Pick any number. If the list is empty, give someone the Trip Leader role on the **People** page first. |
| **Primary trip leader** | The chosen leaders | Starts as the first leader. Used in email tokens such as the leader's name and email. |

### Team roles needed

The worker roles the trip needs. **Add role** opens **Add Role**:

| Field | Notes |
|-------|-------|
| **Worker role** | The organization's active roles not already on the trip. |
| **Number Needed** | How many people the trip needs in that role. Starts at 1. |
| **Reserved emails (optional)** | Emails to hold spots for. Separate them with commas, spaces, or new lines. Can't be more than Number Needed. |

In the roles table, change **Number Needed** in place, or **Remove** a role (not possible once people have signed up). In **Edit trip**, **Reserved emails** on a saved role opens the reservation list (see the [Trip staff guide](./trip-staff-guide.md#team-roles-1)). Changes save with the trip.

### Travel options (Edit trip only)

Options participants choose on their application, such as a room upgrade or an extra day. Fill in the **Add travel option** panel and choose **Add option**:

| Field | Notes |
|-------|-------|
| **Set #** | Options with the same set number form one choice group. In a set with several options, applicants must pick exactly one; a set with one option is an optional checkbox. |
| **Description** | What the option is, for example "Private room". Required. |
| **Price adjustment** | Added to the participant's cost. Use a negative amount to lower it (for example -$50.00), or 0 for no change. Required. |
| **Days before** | Moves the participant's planned arrival earlier by this many days (−365 to 365). |
| **Days after** | Moves the planned departure later by this many days (−365 to 365). For example, "Depart Friday" with −1. |

Each option in the table can be edited in place or removed. Changes save with the trip.

**Save** (or **Add**) saves the trip. If the trip saves but its image, roles, or options don't, the dialog stays open and says so.

## Copy trip

| Field | Notes |
|-------|-------|
| **Name** | The new trip's name. Required. |
| **Trip to copy** | The trip to copy from. |

It copies the details, passport requirement, deposit, leaders, primary leader, roles, travel options, and image. It doesn't copy participants, donations, or the trip arrival PDF.

## Import Trip Master CSV

**Import** on a trip's row loads the team from a Trip Master spreadsheet saved as CSV (up to 5 MB). Choose the file under **Trip Master CSV**, then **Import**.

- The file needs **First Name**, **Last Name**, **E-Mail**, and **Position Required** columns.
- Each position must match one of the trip's roles by name. If any don't, nothing is imported and the dialog says "Add these worker roles to the trip, then import again." with the list.
- People are matched by email and name, or created without a login. Matched people only get blank fields filled.
- "Team Leader" rows become Approved Trip Leaders. Other rows become participants: Pre-Approved when **App Received** is "X", otherwise Incomplete. Rows under "CANCELLATIONS" are cancelled; the waiting list is skipped.
- Travel notes, name tag answers, and departure and arrival cities can fill trip options and flight details. A **Flight Fee** above $0 means the organization books the flight; a blank fee, $0, or a fee that isn't a number means the participant books it. Either is filled in only when the application doesn't already say who books the flight. The fee itself isn't saved as a flight cost.
- The result says "Imported *N* rows: *A* people added, *U* updated, *S* skipped." with a note for each row it couldn't read.

To invite imported people to create a login, send a template that uses the create account link token.

## Organizations page

**Organizations** in the menu bar. Org Admins see their own organization.

| Column | Shows |
|--------|-------|
| **Name** | The organization. |
| **Email** | Its email address. |
| **City** | Its city. |
| **Color** | Its color family. |
| **Actions** | **Edit**. |

## Add organization / Edit organization

| Field | Choices | Notes |
|-------|---------|-------|
| **Name** | — | Required. Also used in the public trips page address. |
| **Subdomain** | — | The organization's own web address. People who create an account there join the organization automatically. Only a System Admin can set it. |
| **Email** | — | The organization's email. Used as the sender for many emails, and where Test mode sends everything. |
| **Test mode** | Tick box | Sends every email for this organization to the organization email instead of the real recipients. Subjects start with "[Test]" and bodies say who it was meant for. Needs an organization email. Online donations use the Stripe test key while it's on. |
| **Stripe secret key** | — | In **Online donations (Stripe)**. Your live Stripe secret key, from the Stripe Dashboard (starts `sk_live_` or `rk_live_`; otherwise "Enter a live Stripe secret key (sk_live_ or rk_live_)."). Needed for online donations when Test mode is off. Once saved it's never shown again: the field stays empty with "A key is saved. Leave blank to keep it."; type a new key to replace it. |
| **Stripe test secret key** | — | Your Stripe test secret key (starts `sk_test_` or `rk_test_`; otherwise "Enter a test Stripe secret key (sk_test_ or rk_test_)."). Used instead of the live key while Test mode is on ("Test mode uses the test key."). Saved and shown the same way. |
| **Ask donors to cover processing fees** | Tick box (off at first) | "Stripe asks card donors to add its processing fee. Turn on only after Stripe approves your account for fee coverage." When ticked, Stripe's credit card payment page offers donors the processing fee on top of their gift, already selected; they can remove it. Stripe works out the fee. Bank account payments are never asked. Stripe offers this only to eligible US nonprofits that have asked Stripe for it; without Stripe's approval, credit card payments fail with "Stripe couldn't start the payment. Please try again." A covered fee shows as **Fee covered** on the donation and never counts toward totals. |
| **Color family** | blue, teal, green, purple, red, orange | The color of the menu bar and main buttons for this organization's users. |
| **Country**, **Address line 1**, **Address line 2**, **City**, **State** / **State / province**, **Postal code** | — | The mailing address. |
| **Phone country code**, **Phone number** | — | The organization's phone. |
| **Website URL** | — | Linked as "Visit website" on the public pages. |
| **Facebook page URL**, **Instagram** | — | Social media. |
| **Upload logo** | PNG, JPEG, GIF, WebP, or HEIC, up to 2 MB | Shown in the menu bar and on public pages and email reports. |
| **Participant agreement** | — | **Edit participant agreement** opens the agreement editor. Shows "Markdown agreement on file." or "No participant agreement saved yet." (Edit only) |
| **Medical agreement** | — | **Edit medical agreement**. Shown only to applicants who take medication. (Edit only) |

### Agreement editor

Titled "Participant agreement — *organization*" or "Medical agreement — *organization*". Switch between **Edit** and **View**.

- **Agreement (Markdown)** — the text. Use a hyphen for bullets ("- Item"), \*\*bold\*\*, and links.
- **View** shows it as applicants will see it.
- **Save** saves a new version. Applicants always see the latest one.

## People page

**People** in the menu bar.

| Filter | What it does |
|--------|--------------|
| **Name** | Matches first, middle, or last name. |
| **Trip** | Shows only people on that trip. |

| Column | Shows |
|--------|-------|
| **Name** | First and last name. |
| **Email** | Their email. |
| **City** | Their city. |
| **Actions** | **Edit** opens **Edit person**. |

| Button | What it does |
|--------|--------------|
| **Email** | Opens [Email people](#email-people). |
| **Add person** | Opens [Add person](#add-person). |

## Add person

| Field | Choices | Notes |
|-------|---------|-------|
| **First name**, **Middle name**, **Last name**, **Preferred name** | — | First and last name are required. |
| **Email** | — | Required. A login is created for this email. An email that already has a person is refused. |
| **Password** | — | Optional. Leave blank to assign a temporary password; the person then uses **Forgot password?** to set their own. At least 8 characters if you set one. |
| **Organization** | Your organizations | Required. Read-only if you administer just one. |
| **Role** | See below | Required. Starts as **Pending User**. |

The rest of the form (address, phone, personal information, emergency contact, health, languages, church) is the same as the profile. See [Edit profile](./participant-guide.md#edit-profile). Documents can be added once the person is saved.

**Role** choices:

| Role | Meaning |
|------|---------|
| **Agent** | A travel agent. Sees only Home and the Flights pages. |
| **Org Admin** | Runs the organization. Sees every admin page. |
| **Pending User** | In the organization, waiting for a role. Sees the participant pages. |
| **Trip Leader** | Can be chosen as a leader on the organization's trips. Runs the trips they lead. |
| **Trip Participant** | Can apply for the organization's trips. |

## Edit person

The person's profile, as described in [Edit profile](./participant-guide.md#edit-profile), plus:

- **Email** is read-only for someone who already has a login ("Only a System Admin can change a login email.").
- **Organizations**: a table of their **Organization** and **Role**, with **Remove** (immediate). In **Add Role**, pick an **Organization** and **Role** and choose **Add role**. A person can have several roles in the same organization. An organization must always keep at least one Org Admin.
- While the person is Pre-Approved or Approved on a trip that hasn't ended, the profile can't be saved with required fields empty.

## Email people

Sends a **Person** template to people across trips.

| Field | Choices | Notes |
|-------|---------|-------|
| **Template** | The organization's Person templates. When exactly one trip is chosen, that trip's Trip Participant templates are added. | Required. |
| **Subject**, **Email body** | — | Filled in from the template; edit them for this send only. |
| **Trips** | **All**, or specific trips | Starts as All. |
| **Roles** | **All**, or specific worker roles on those trips | Starts as All. |

Recipients are Approved participants and leaders on the chosen trips with the chosen roles, each once ("Recipients: *N* person/people"). **Preview** shows one person's email; **Send** asks for confirmation and then shows the sending status.

## Donors page

**Donors** in the menu bar, after **Donations**. Org Admins and System Admins only. A System Admin with **All organizations** selected sees "Select an organization in the menu bar."

Donors belong to the organization selected in the menu bar. The same email can be a donor of another organization. There is no delete.

| Column | Shows |
|--------|-------|
| **Name** | The organization name, or the first and last name. |
| **Family name** | The family name, or blank. |
| **Type** | **Organization** or **Individual**. |
| **Email** | Their email. |
| **City** | Their city. |
| **Status** | **Active**, **Inactive**, or **No Email**. |
| **Actions** | **Edit** opens **Edit donor**. |

The list is ordered by that name: organization name, or last name then first name.

| Button | What it does |
|--------|--------------|
| **Email** | Opens [Email donors](#email-donors). |
| **Import** | Opens [Import donors](#import-donors). |
| **Add donor** | Opens **Add donor**. |

### Add donor / Edit donor

| Field | Notes |
|-------|-------|
| **Donor type** | **Organization** or **Individual**. Starts as **Individual**. Anything else is refused with "Donor type must be Organization or Individual." |
| **Organization name** | Shown for **Organization**. Required ("Organization name is required."). First name, last name, and family name are not stored. |
| **First name** | Shown for **Individual**. Required ("Donor first name is required."). |
| **Last name**, **Family name** | Shown for **Individual**. **Family name** is optional. |
| **Email** | Saved in lowercase. The same email can't be saved twice in one organization ("A donor with this email already exists."). A blank email is allowed. |
| **Address line 1**, **Address line 2**, **City**, **State/province**, **Postal code**, **Country** | The donor's mailing address. |
| **Phone country code**, **Phone number** | Optional. |
| **Donor status** | **Active**, **Inactive**, or **No Email**. Starts as Active. **No Email** means that donor can't be chosen in **Email donors**. It does not stop the **Trip donation** or **Thank you for donation** emails. |

**Save** keeps the donor in this organization. Editing can't move a donor to another organization.

### Import donors

**Import** opens **Import donors**. Choose a **Donor contact list** saved as CSV, then **Import**. The file needs the columns Donor full name, Phone numbers, Email, Full name, Bill address, and Ship address.

A row is added as **Active**. A row updates a donor of this organization when the email matches, when the name in the file is the same name already stored, or when the first and last name match. That update replaces the name and **Donor type**. A donor of another organization is left as they are, and a new donor is added here. A later row for the same donor updates the earlier one. A row with no name, or a name that is only a number, is skipped. An update does not change **Donor status**.

**Donor type** is set from the name. A name that contains & is **Individual**. The whole name is stored as **Family name**, the name before & is the first name, and the last word is the last name. A name that contains church, college, university, company, or c of c, or that is written in all capital letters, is **Organization**. The whole name is stored as **Organization name**. Any other name is **Individual**. The first word is the first name and the last word is the last name, and **Family name** is left blank. A middle name or middle initial is left out. An update sets **Donor type** and that name again.

The name comes from Full name when that cell has text, and otherwise from Donor full name. A trailing (Donor) or (Dpnor) is dropped.

The address comes from Bill address, or from Ship address when the bill address is blank. An address that ends with a two-letter state and a ZIP code fills **State/province**, **Postal code**, and **Country**. The city is the part after the street, or the last word when the street has no street word such as Dr, Rd, or St. A phone like Phone:(615) 370-9849 is saved with country code 1. A blank email, phone, or address on an update leaves what is already stored.

When the file is accepted, the dialog says "Imported *N* rows: *N* added, *N* updated, *N* skipped." **Close** returns to the list.

A file that is not a CSV, or is larger than 5 MB, is refused with "Choose a CSV file up to 5 MB." A file missing one of those columns is refused with "This file isn't a donor contact list. Missing columns: " and the missing column names.

### Email donors

**Email** opens **Email donors**. It sends one email to each checked donor, to that donor's own email.

| Field | Choices | Notes |
|-------|---------|-------|
| **Template** | The organization's Donor templates, by subject | Required. Choosing one fills **Subject** and **Email body**, which you can edit for this send only. When there are none: "No Donor templates. Add one under Email templates." |
| **Subject**, **Email body** | — | Required. |
| **Donors** | **All**, **Donated this year**, or **Donated to a trip** | Starts as **All**. **Donated this year** is a counted donation dated this calendar year. **Donated to a trip** then requires **Trip** (the organization's trips, any status, newest start date first). |
| **Trip** | One of the organization's trips | Shown for **Donated to a trip**. |

The list shows matching donors by the same name order as the Donors page, with a checkbox each and **Select all**. An organization is listed by its organization name. Donors marked **No Email**, and donors with no email address, are left off the list. "Recipients: *N*". **All** includes donors who have never given; the other two choices do not. Changing the choice or the trip clears checks for donors no longer listed.

**Preview** and **Send** stay off until a template is chosen, subject and body are filled in, a trip is chosen when the choice is **Donated to a trip**, and at least one donor is checked.

**Preview as** starts as the first checked donor. **Preview** shows From, Reply-To, To, Subject, and the body for that donor and sends nothing. To is the donor's own email. Organization and donor tokens fill in, including last year's gifts. Trip, participant, leader, and donation tokens are blank.

**Send** asks "Are you sure?" / "Send this email to *N* donors?". One email goes to each checked donor. One skip or failure doesn't stop the rest. The result reads "Sent *N*, skipped *N*, failed *N*" and names each skipped or failed donor with the reason.

## Worker roles page

**Worker roles** in the menu bar. Worker roles are the jobs on a team, such as Nurse, Doctor, or General Helper.

| Column | Shows |
|--------|-------|
| **Name** | The role. |
| **Description** | What the role does. |
| **Required documents** | The document types people in this role must upload, with required specializations in brackets. |
| **Status** | Active or Inactive. |
| **Actions** | **Edit**, and **Delete** (only when no trip uses the role). |

### Add worker role / Edit worker role

| Field | Choices | Notes |
|-------|---------|-------|
| **Name** | — | Required. Must match the "Position Required" column for spreadsheet imports. |
| **Description** | — | Shown to applicants on the trip page. |
| **Required documents** | The organization's document types | Each trip checks these for everyone in this role before approval. |
| **Required specializations for *type*** | That type's specializations | Shown for each required type that allows specializations. People must have each one chosen on their document. |
| **Status** | **Active**, **Inactive** | Only Active roles can be added to trips. |

## Document types page

**Document types** in the menu bar.

| Column | Shows |
|--------|-------|
| **Description** | The document type's name, as people see it. |
| **Type** | Its category. |
| **Expiration check** | How long it must stay valid, or "—" if it doesn't expire. |
| **Actions** | **Edit**, **Delete**. |

### Add document type / Edit document type

| Field | Choices | Notes |
|-------|---------|-------|
| **Description** | — | Required. The name people see, for example "Nursing License". |
| **Type** | See below | Required. |
| **Document number required** | Tick box | People must enter the document's number. |
| **Allow Specialization** | Tick box | People pick specializations (for example Pediatrics) on this document. Add each name in **Specialization name** and choose **Add**. Names must be unique and up to 100 characters. A name in use can't be removed; renaming one renames it everywhere. |
| **Has Expiration Date** | Tick box | Ticked by default. Untick for documents that don't expire, such as a diploma. |
| **Expiration check** | See below | Shown when **Has Expiration Date** is ticked. Starts as After trip end date. |
| **Instructions** | Free text | Shown to people when they upload this type. |

**Type** choices:

| Type | Meaning |
|------|---------|
| **Medical License** | A professional license, such as a nursing or medical license. |
| **Passport** | Used by a trip's **Require Passport** setting. |
| **Certification** | A certificate, such as a board certification or CPR card. |
| **Diploma** | A degree or diploma. |
| **Doctor Permission** | A doctor's note allowing a pregnant participant to travel. Pregnant applicants need one when your organization has a type with this Type. |

**Expiration check** choices. Each is compared with the trip's end date (or start date if it has no end date):

| Choice | The document must expire… |
|--------|---------------------------|
| **After trip end date** | after that date. |
| **On or after trip end date** | on that date or later. |
| **90 days after trip end date** | more than 90 days after it. |
| **180 days after trip end date** | more than 180 days after it. Common for passports. |

## Medical conditions page

**Medical conditions** in the menu bar. Applicants who answer Yes to **Take medication?** pick at least one condition from this list.

| Column | Shows |
|--------|-------|
| **Name** | The condition. |
| **Actions** | **Edit**, **Delete**. |

**Add condition** opens a dialog with **Name** (required, up to 50 characters, unique in the organization).

## Email templates page

**Templates** in the menu bar. Org Admins see every template in the organization. Trip Leaders see a **Trip** picker and only the templates for the trip they choose, and can add templates for their trips.

| Column | Shows |
|--------|-------|
| **Function code** | How it's sent (see below). |
| **Schedule** | For Scheduled templates: Daily, Weekly (Tuesday), "Monthly (day *N*)", Twice monthly (1st and 15th), or "*N* days before trip start". |
| **Email type** | What the email is about. The info icon explains when it's sent. |
| **Subject** | The subject line. |
| **Scope** | The organization (or "Global (master)" for a System Admin's starting templates). |
| **Trip** | The trip, or "All trips" for an organization-wide template. |
| **From email** | The sender. |
| **Actions** | **Edit**. |

| Button | What it does |
|--------|--------------|
| **Email Report** | Downloads a PDF of every template, grouped by function code, with when each is sent ("On Event", "Manual", or its schedule). |
| **Add template** | Opens [Add template](#add-template--edit-template). |

## Add template / Edit template

| Field | Choices | Notes |
|-------|---------|-------|
| **Organization** | Your organizations | Required. Read-only if you have just one. |
| **Email type** | See [Email types](#email-types) | Required. What the email is about. |
| **Function code** | See below | Required. How it's sent. |
| **Schedule** | **Daily**, **Weekly (Tuesday)**, **Monthly (day of month)**, **Twice monthly (1st and 15th)**, **Days before trip start** | Shown and required for Scheduled templates. **Daily** goes every day; **Weekly (Tuesday)** every Tuesday; **Monthly (day of month)** once a month on the **Day of month**; **Twice monthly (1st and 15th)** on the 1st and 15th of each month. |
| **Days before trip start** | 1–365 | Shown for **Days before trip start**. The email goes once, that many days before the trip starts. |
| **Day of month** | 1–31 | Shown and required for **Monthly (day of month)**. If the month is shorter, the email goes on its last day (for example, 31 goes on April 30). |
| **Trip** | **All trips (organization-wide)**, or one trip | A trip's own template replaces the organization's template of the same email type for that trip. |
| **Copy from** | For an organization-wide template: the System Admin's global starting templates. For a trip template: the organization's own templates. | Shown when adding. Copies the From email, To, Schedule, Days before trip start, Day of month, Subject, Content, and Attachment of the chosen template. It doesn't copy the Email type, Function code, or Email body. |
| **Subject** | — | Required. Can include tokens. |
| **From email** | — | Required. One email address or an email token, such as `{{ORG_EMAIL}}`. Replies go here. |
| **To** | — | Required. Email addresses or email tokens, separated by commas. Usually `{{PARTICIPANT_EMAIL}}`. |
| **Email body** | — | Required. See the editor below. |
| **Attachment** | — | Optional. Only `{{TRIP_ARRIVAL_PDF}}`, which attaches the trip's arrival PDF. |
| **Content** | — | Notes about the template. Not sent. |

Each **Insert token** list beside a field adds a token at the cursor. The lists beside **From email** and **To** offer only email tokens, and the one beside **Attachment** only attachment tokens.

**Preview** shows the email with tokens filled in, for a **Trip** and optional **Participant** you choose. **Save** saves the template ("Template saved.").

**Function code** choices:

| Function code | How it's sent |
|---------------|---------------|
| **Send Now** | Automatically, right when its event happens (shown as "On Event"). |
| **Scheduled** | Automatically, each morning, by its **Schedule**, to the people its email type picks. |
| **Trip Participant** | By trip staff, from **Email team** on the trip page or **Email flight itinerary** on the Flights page ("Manual"). |
| **Person** | By Org Admins, from **Email** on the People page ("Manual"). Can't belong to a trip. |
| **Donor** | By Org Admins, from **Email** on the Donors page ("Manual"). Can't belong to a trip ("Donor templates cannot belong to a trip."). |

### The email body editor

| Button | What it does |
|--------|--------------|
| **Bold**, **Italic**, **Underline** | Formats the selected text. |
| **Bulleted list**, **Numbered list** | Starts or ends a list. |
| **Center** | Centers the paragraph. |
| **Link** | Adds a link. **Link address** must start with http://, https://, or mailto:. Leave it empty to remove a link. |
| **Picture** | Inserts a picture from the organization's library, or **Upload** a new one. Drag a corner to resize it (up to 600 pixels wide). |

You can also paste or drag pictures into the body. Pictures in one email must total 5 MB or less.

### Email types

Each template has an email type. Its **Event description** (the info icon in the list) says when it's sent.

| Email type | When it's sent / who gets it |
|------------|------------------------------|
| **Application started** | Send Now: a Trip Participant's application is saved for the first time and is still Incomplete. |
| **Application incomplete reminder** | Scheduled: Trip Participants whose application is still Incomplete. |
| **Application received** | Send Now: an application becomes Pre-Approved. |
| **Application approved** | Send Now: an application is approved, or added as Approved. |
| **Documents missing reminder** | Scheduled: Pre-Approved people missing a trip document, or whose document doesn't meet its expiration check. |
| **Document reload requested** | Send Now: staff choose **Request reload** on a document. Goes to the document's owner. |
| **Deposit due** | Scheduled: Approved people on a trip with a deposit who have raised less than it. |
| **Deposit received** | Send Now: a person's donations first reach the trip deposit. |
| **Payment due reminder** | Scheduled: Approved people who still owe money. |
| **Trip fully paid** | Send Now: a donation brings a person's balance to $0. |
| **Donation received** | Send Now: each time a donation starts counting for a person (a Check or Other is saved, or a Stripe payment succeeds). |
| **Trip donation** | Send Now: each time a donation starts counting. Sent separately to the participant (when the donation is for one) and to the donor (when they have an email), whatever the template's **To**. Not sent for edits or Failed payments. |
| **Pre-departure information** | Scheduled: Approved people. |
| **Trip arrival info (scheduled)** | Scheduled: Approved people. Often attaches the trip arrival PDF. |
| **Trip team update**, **Trip financial statement**, **Trip arrival info**, **Account invitation** | Not automatic. Sent by trip staff from **Email team**. |
| **Flight itinerary** | Not automatic. Sent from **Email flight itinerary** on the Flights page. |
| **People update** | Not automatic. Sent by Org Admins from **Email** on the People page. |
| **Donor update**, **Annual donation** | Not automatic. Sent by Org Admins from **Email** on the Donors page. |
| **Thank you for donation** | Send Now: a donor enters a donation and it starts counting, from a public donation page, Home **Donate**, or My Trip **Make Donation**. Goes to the donor's email only. Staff **Add donation** and staff **Pay with Stripe** do not send it. A bank payment sends it when the payment succeeds, not while it is Processing. Edits and Failed payments do not send it. A donor with no email gets nothing. **No Email** does not stop it. The **Trip donation** email is still sent as well. |

Send Now emails go only to Trip Participants, except **Trip donation**, which also goes to the donor. A person gets each scheduled email at most once a day.

### Email tokens

Tokens are placeholders written as `{{CODE}}` that are filled in for each recipient. Missing information fills in as blank.

| Token | Fills in |
|-------|----------|
| `{{ORG_NAME}}`, `{{ORG_EMAIL}}`, `{{ORG_PHONE}}`, `{{ORG_WEBSITE}}` | The organization's name, email, phone, and website. |
| `{{TRIP_NAME}}`, `{{TRIP_LOCATION}}` | The trip's name and location. |
| `{{TRIP_START_DATE}}`, `{{TRIP_END_DATE}}` | The trip dates. |
| `{{TRIP_COST}}`, `{{TRIP_DEPOSIT}}` | The trip's participant cost and deposit. |
| `{{TRIP_ARRIVAL_PDF}}` | In **Attachment**: attaches the trip's arrival PDF. |
| `{{DOCUMENTS_DUE_DATE}}` | 90 days before the trip starts. |
| `{{PARTICIPANT_FIRST_NAME}}`, `{{PARTICIPANT_LAST_NAME}}`, `{{PARTICIPANT_PREFERRED_NAME}}`, `{{PARTICIPANT_EMAIL}}` | The participant's name and email. |
| `{{PARTICIPANT_TRIP_ROLE}}` | Their worker role. |
| `{{PARTICIPANT_TRIP_COST}}` | Their participant cost. |
| `{{PARTICIPANT_TRIP_OPTIONS}}`, `{{PARTICIPANT_TRIP_OPTIONS_TOTAL}}` | Each chosen trip option with its amount, and their total. |
| `{{PARTICIPANT_TRIP_AIRFARE}}` | Their flight cost. |
| `{{ADDON_EXPENSE}}`, `{{ADDON_EXPENSE_TOTAL}}` | Each add-on expense with its cost, and their total. |
| `{{PARTICIPANT_TOTAL_TRIP_COST}}` | Their total trip cost. |
| `{{PARTICIPANT_AMOUNT_RAISED}}` | All counted donations for them on the trip (Check, Other, and Stripe payments that Succeeded). |
| `{{PARTICIPANT_AMOUNT_OWED}}`, `{{PARTICIPANT_BALANCE_DUE}}` | Total trip cost minus counted donations, never below $0. |
| `{{PARTICIPANT_DONATIONS}}`, `{{PARTICIPANT_DONATIONS_TOTAL}}` | Each counted donation they gave themselves (date and amount), and the total. |
| `{{PARTICIPANT_TRIP_DONATIONS}}`, `{{PARTICIPANT_TRIP_DONATIONS_TOTAL}}` | Each counted donation others gave them, and the total. |
| `{{DONATION_DATE}}`, `{{DONATION_TYPE}}`, `{{DONATION_AMOUNT}}`, `{{DONATION_FEE_COVERED}}` | In the **Trip donation** email and the **Thank you for donation** email: the donation's date, type (Stripe-ACH, Stripe-Credit, Check, or Other), amount (the gift), and the processing fee the donor covered (blank when they didn't). Blank elsewhere. |
| `{{DONOR_FIRST_NAME}}`, `{{DONOR_LAST_NAME}}`, `{{DONOR_EMAIL}}` | The donor's name and email. For an **Organization**, the first-name token is the organization name and the last-name token is blank. Filled in on **Email donors** and **Thank you for donation**. Blank in every other email. |
| `{{DONOR_PREVIOUS_YEAR_DONATIONS}}` | The donor's counted gifts from the previous calendar year, oldest first: date, amount, trip name, and the participant's name when there is one. One gift per line, for example `03/02/2025 — $50.00 — Guatemala Clinic — Pat Lee`. A gift with no participant ends at the trip name. Blank when there were none. Filled in on **Email donors** and **Thank you for donation**. Blank in every other email. |
| `{{DONOR_PREVIOUS_YEAR_TOTAL}}` | The total of that list, or `$0.00` when there were none. Filled in on **Email donors** and **Thank you for donation**. Blank in every other email. |
| `{{PARTICIPANT_ARRIVAL_DATE}}`, `{{PARTICIPANT_DEPARTURE_DATE}}` | Their planned arrival and departure dates. |
| `{{CREATE_ACCOUNT_LINK}}` | A link to create an account with their email and name filled in, or a sign-in link if they already have one. |
| `{{ARRIVAL_FLIGHT}}`, `{{RETURN_FLIGHT}}` | Each flight leg: airline, flight number, airports, dates and times, class, and seat. |
| `{{FLIGHT_CONFIRMATION_NUM}}` | Their flight confirmation number. |
| `{{MISSING_DOCUMENTS}}` | Their missing trip documents, one per line. |
| `{{RELOAD_DOCUMENT}}`, `{{RELOAD_DOCUMENT_TYPE}}`, `{{RELOAD_NOTE}}` | In the reload request email: the document, its type, and the staff note. |
| `{{LEADER_FIRST_NAME}}`, `{{LEADER_LAST_NAME}}`, `{{LEADER_PREFERRED_NAME}}`, `{{LEADER_EMAIL}}`, `{{LEADER_PHONE}}` | The primary trip leader's name, email, and phone. |

Email tokens (usable in **From email** and **To**) are `{{ORG_EMAIL}}`, `{{PARTICIPANT_EMAIL}}`, `{{LEADER_EMAIL}}`, and `{{DONOR_EMAIL}}`. A System Admin can add more tokens.

Emails come from "*sender* via Mission Trips", with replies going to the **From email**. Every email sent is logged.

## Pictures page

**Pictures** in the menu bar: the organization's picture library for email bodies.

- **Upload** adds a picture (PNG, JPEG, GIF, or HEIC, up to 2 MB). Trip Leaders can also upload from the email editor.
- Each picture shows its name and size, with **Rename** (a **Name** up to 100 characters) and **Delete**.
- A picture used in a template can't be deleted ("This picture is used by *N* templates.").
