# Trip Staff Guide

This guide is for **Trip Leaders** and **Org Admins** running a trip: reviewing applications and documents, approving people, and managing roles, rooming, flights, donations, and team email. System Admins can do everything here too. The first part walks through the work; the [Screen reference](#screen-reference) describes every screen and dialog field by field.

A Trip Leader manages the trips they lead. An Org Admin manages every trip in their organization. Setting up the organization itself (people, trips, worker roles, document types, email templates) is in the [Organization admin guide](./org-admin-guide.md).

## Getting to a trip

- **Org Admins:** **Trips** in the menu bar (or **Organization Trips** on Home). Each row has **View** (the trip page), **Room list**, **Flights**, **Import**, and **Edit**.
- **Trip Leaders:** **Trips** in the menu bar opens the [Trips page for Trip Leaders](#trips-page-for-trip-leaders), which lists each trip's participants. Home lists the trips you lead under "Trips you lead".

## Reviewing documents

Each trip needs certain documents from each person: the documents their worker role requires (with any required specializations), a passport if the trip requires one, and a Doctor Permission document if the person is pregnant and your organization has that document type.

1. Choose **Review documents** on the person's row.
2. For each requirement you'll see the person's documents of that type. The one marked **Used for this trip** is the one that counts: the one that expires last.
3. Choose **View** to see the file, number, and dates. Required specializations show with their own files.
4. Tick **Reviewed** once you've checked it. It saves right away. A document without a file can't be reviewed.

From the viewer you can also:

- **Edit** — correct the document's details or replace its file. First untick **Reviewed**; reviewed documents are locked for everyone.
- **Request reload** — ask the person to upload it again, with an optional note. This unticks **Reviewed** and emails them, if your organization has a "Document reload requested" email template. The document shows "Reload requested" until a new file is uploaded or you mark it Reviewed again.

Reviewed belongs to the document, not the trip. A document reviewed for one trip counts as reviewed for every trip.

## Approving applications

Applications become **Pre-Approved** when the participant submits a complete profile and application. You approve them.

1. Choose **Approve App** on a Pre-Approved row.
2. If anything is missing, the dialog lists it above the application:
   - **Before approving, the profile needs:** — missing profile fields.
   - **Before approving, the application needs:** — missing application answers, such as trip role, funding, flight purchase option, pregnancy question, or agreements.
   - **Before approving, these documents need to be uploaded and reviewed:** — each trip document that's "not uploaded" (including one that doesn't meet the trip's expiration or specialization rules) or "not reviewed".
3. When nothing is missing, choose **Approve App**.

While anything is missing, **Approve App** is disabled.

### Override Approve

If you've decided to accept someone even though items are missing, choose **Override Approve**. It appears only when something is missing. It asks "Approve without the missing items?"; confirm to approve. The application becomes Approved just as with **Approve App**. The override isn't recorded separately, so the missing items are still visible afterwards in the participants table's **Missing items**.

Trip Leader rows don't go through these checks.

### Unapprove, decline, cancel

- **Unapprove** (in **View App** on an Approved application) moves it back to Pre-Approved. Use this when the participant needs to change their application: they can't edit an Approved one themselves.
- To decline, set the status to **Declined** in **Edit**.
- **Cancel** frees the person's role spot; **Uncancel** brings the application back as Incomplete or Pre-Approved, if the role has room.

## Adding and editing participants

- **Add participant** adds someone to the trip directly. Adding someone as Approved runs the same approval checks and has no override. Add them as Pre-Approved and use **Override Approve** if needed.
- **Edit** changes the staff-managed parts of an application: worker role, status, participant cost, trip options, add-on expenses, and **Why go**. The participant's own answers (funding, flights, roommate, agreements, and so on) are changed only by the participant, on their own application.
- **Editing someone's profile:** while they're Pre-Approved or Approved on a trip that hasn't ended, a save that leaves a required profile field empty is refused, with a list of what's missing. You can't change another person's password or sign-in email; only a System Admin can.

## Team roles

Open **Team roles** on the trip page to see each role's Number Needed, sign-ups, and reservations.

- **Add role** adds a role with its Number Needed and optional reserved emails.
- **Reserved emails** holds spots for specific people by email, up to the open spots. When that person applies, they're placed in that role and can't switch. Number Needed can't go below the number of reservations.
- A role with signed-up people can't be removed. Move or cancel them first.

## Rooming

Choose **Room list** on the trip's row.

1. Enter the **Hotel name**, the **Start date** (check-in), and any **Comments**.
2. Give each participant a **Room number**, **Room type**, and **Nights**. People with the same room number share a room, and must have the same room type and nights. Their roommate preferences show alongside.
3. Choose **Save**.

**Room list PDF** prints the saved assignments with passport details, flight arrival times, and emails.

## Flights

Choose **Flights** on the trip's row.

- The board lists each participant with who books their flight (**Booked by**; an info icon shows what they requested), their planned arrival and departure, and their first departure and final arrival.
- Enter a **Cost** and **Comments** on the row and choose its **Save** icon. Cost is only used when the organization books the flight.
- Choose **Flight segments** on a row to enter the arrival and return legs and the confirmation number. Warnings show when the flights don't match the planned dates or the requested airports.
- Participants who book their own tickets enter their own segments.
- **Flights PDF** prints every itinerary. **Email flight itinerary** emails each participant their flights using a Flight itinerary template.

## Donations

The **Donations** page records donations for trips you manage:

- **Add donation** — enter the donor's email and choose **Look up** to find an existing donor or a person in the organization; otherwise enter the donor's details. Then the trip, the participant it's for (optional), the amount, the date, and payment info.
- Donations to a participant reduce that participant's amount owed. Donations without a participant count toward the trip.
- **Export CSV** downloads the trip's donations.

Saving a donation can send donation emails, such as donation received, deposit reached, or fully paid.

## Team email

**Email team** on the trip page sends an email to the team:

1. Choose a template. You can edit the subject and body for this send without changing the template.
2. Choose who gets it in **Send to**.
3. **Preview** shows exactly what one recipient will get.
4. **Send**, then confirm. A status dialog shows how many were sent, skipped, or failed, and why.

## Trip arrival PDF

In **Trip arrival info** on the trip page, upload a PDF (up to 10 MB) with arrival information. You can replace or remove it. Approved team members can open it from **My Trip**, and email templates can attach it.

Only trip staff can see teammates' personal and medical details.

---

# Screen reference

## Trip page

Opened from **View** on a trip's row. The heading is the trip name.

### Header

| Button | What it does |
|--------|--------------|
| **Back to trips** | Returns to the Trips list. |
| **Edit trip** | Opens **Edit trip** (see the [Organization admin guide](./org-admin-guide.md#add-trip--edit-trip)). |
| **Email team** | Opens [Email team](#email-team). |

### Trip details

The trip name, organization, city and country, then:

| Item | Shows |
|------|-------|
| **Status:** | The trip status: `active` (open for applying and donating), `completed`, or `inactive`. |
| **Dates:** | Start and end dates. |
| **Location:** | Where the trip goes. |
| **Leaders:** | The trip's leaders. |
| **Participant cost:** | The trip's default cost per person. |
| **Donor page:** | **Open public donate page** opens the trip's public donation page. |

### Trip Ready

**Trip Ready** (green) when all five checks pass, **Trip Not Ready** (red) otherwise. Each check shows a green tick or a red cross.

| Check | Passes when |
|-------|-------------|
| **All roles filled** | No team role has an open spot. |
| **All participants approved** | Everyone who is Incomplete, Pre-Approved, or Approved is Approved. |
| **All funds raised** | Total cost of the team is covered by total donations. |
| **Flights entered for all participants** | Everyone has at least one arrival and one return segment. |
| **Room list includes all participants** | Everyone has a room assignment. |

### Summary

| Tile | Shows |
|------|-------|
| **Participants** | Number of rows in the participants table. |
| **Cost per participant** | The trip's default cost. |
| **Total donations** | All donations to the trip. |
| **Donations without participant** | Donations given to the trip rather than to a person. |

### Team roles

Click **Team roles** to open it. The heading shows "*X* signed up / *Y* needed".

| Column | Shows |
|--------|-------|
| **Role** | The role, its description, and "Reserved emails: …". |
| **Document type** | The documents the role requires. |
| **Number Needed** | How many people the trip needs. Change it here; it saves right away. It can't go below the number of reserved emails. |
| **Number Signed Up** | Incomplete, Pre-Approved, and Approved applications in this role. |
| **Reserved** | Spots held for specific emails. |
| **Actions** | **Reserved emails** opens the reservation list. **Remove** (red minus, only when nobody has signed up) takes the role off the trip right away. |
| **Filled** | A green tick when every spot is taken, a red icon when spots are open. |

**Add role** opens **Add Role**:

| Field | Notes |
|-------|-------|
| **Worker role** | The organization's active roles not already on the trip. Required. |
| **Number Needed** | Starts at 1. A positive whole number. |
| **Reserved emails (optional)** | Emails to hold spots for. Separate them with commas, spaces, or new lines. Can't be more than Number Needed. |

**Reserved emails — *role*** lists each **Email** with its **Status** ("Reserved", or "Applied — *name* (*status*)") and a **Remove** button, how many open slots are left, and an **Emails to reserve** box with **Add**. An email that already applied to the trip, or is already reserved, can't be added.

### Trip options

Click **Trip options** to open it. Each option set ("Trip Option *N*") lists each option's **Description** and **Price adjustment**. Options are changed in **Edit trip**.

### Trip arrival info

"No Trip Arrival PDF." with **Upload PDF**, or a link to the PDF with **Replace** and **Remove**. PDF only, up to 10 MB.

### Participants

**Download CSV** downloads the team's details (see [Downloads](#downloads)). **Add participant** opens [Add participant](#add-participant).

The **Name** column stays on the left and **Actions** on the right while the other columns scroll sideways.

| Column | Shows |
|--------|-------|
| **Name** | Photo and full name. Click it to see the person's profile. |
| **Role** | The worker role, with "Trip Leader" for leaders. |
| **Status** | Incomplete, Pre-Approved, Approved, Declined, or Cancelled. |
| **Arrives** | Planned arrival date. An info icon explains trip options or add-ons that move it. A warning icon means the arrival flight lands on a different day. |
| **Departs** | Planned departure date, with the same icons for the return flight. |
| **Booked by** | Who buys the flight: the organization's name, "Participant", or "Not chosen". |
| **Missing items** | A red icon listing what's missing from the profile ("Profile is not complete"), the application, and the trip documents (for example "Required role document(s): Nursing License", "Passport document (with valid expiration)", "Doctor Permission document"). |
| **Total cost** | Total trip cost. The info icon shows the breakdown: Trip cost, each trip option, Cost adjustment, each add-on, Flight, Total. |
| **Total donations** | Donations to this person. |
| **Amount owed** | Total cost minus donations. |
| ***Option* (Set *N*)** | One column per trip option: "Yes" when the person chose it. |
| **Actions** | The row actions below. |

### Row actions

| Action | Shows when | What it does |
|--------|------------|--------------|
| **Approve App** | Pre-Approved | Opens the application to approve it. Orange when the person passes every approval check. |
| **View App** | Approved or Cancelled | Opens the application read-only. Green when Approved. |
| **Preview App** | Incomplete or Declined | Opens the application read-only. |
| **Review documents** | The row has a person | Opens [Review documents](#review-documents). Orange when an uploaded document still needs review; green when every requirement is met and Reviewed. |
| **Cancel** (red) | Incomplete, Pre-Approved, or Approved | Asks "Cancel this application? The role slot will be freed." Choose **Cancel App** to confirm. |
| **Uncancel** | Cancelled | Asks "Uncancel this application? It will return to incomplete or pre-approved based on completeness." |
| **Edit** | Always | Opens [Edit participant](#edit-participant). |
| **View donations** | Always | Opens [Donations for *name*](#donations-for-a-participant). |
| **Documents PDF** | Always | Downloads all of the person's documents and files in one PDF. |
| **Donate page** | The row has a person | Opens the person's public fundraising page. |

## Profile dialog

Opened by clicking a name in the participants table. Read-only. If anything is missing, "Profile incomplete. *N* required field(s) missing." and each missing field shows a red **Missing** chip.

It lists the person's photo, then: First name, Middle name, Last name, Preferred name, Email, Address line 1, Address line 2, City, Country, State/province, Postal code, Phone, Birthdate, Gender, Emergency contact name, Emergency contact relationship, Emergency contact phone, Have allergies?, Allergies description, Take medication?, Medical conditions, Do you speak a language other than English?, Other languages (each as "Language — Fluency — Medical terminology: Yes/No"), Current church home, Church city, Church state/province, and Bio.

To change the profile, an Org Admin uses **Edit** on the **People** page.

## Application dialog

Titled **Approve application**, **View application**, or **Preview application**, depending on the row action. A colored chip shows the status.

When approving a Pre-Approved application with gaps, blue boxes list:

- **Before approving, the profile needs:** each missing profile field.
- **Before approving, the application needs:** each missing application item.
- **Before approving, these documents need to be uploaded and reviewed:** each requirement, as "*Requirement*: not uploaded" or "*Requirement*: not reviewed".

Then the application, read-only:

| Section | Shows |
|---------|-------|
| Top | **Trip role** (Trip Participant or Trip Leader), **Worker role**, **Participant cost** |
| **Funding** | **Will self-fund**, **Will raise funds** (Yes/No) |
| **Roommate preference** | **Has preferred roommate**, **Preferred roommate name(s)** |
| **Flight purchase** | **Option** ("Arrange for and purchase my own air travel" or "Organization arranges and purchases air travel"). When the organization books: **Preferred departure airport**, **Preferred return airport**, **Class of travel**, **Refundable ticket**, **Preferred airline**. Always: **Flight notes**. |
| **Selected travel options** | Each chosen option with its price change, or "None selected". |
| **Agreement** | **Participation agreed**, **Signature name**, **Agreement date**, and, if the person takes medication, **Medical agreement agreed** and **Medical agreement date**. |
| **Pregnancy** | **Are you pregnant?** and **Due date** (female applicants). |
| **Adult signer** | **Name**, **Email**, **Relationship** (applicants under 18). |
| **Why go** | The staff-entered story, if any. |

| Button | Shows when | What it does |
|--------|------------|--------------|
| **Close** | Always | Closes the dialog. |
| **Unapprove** | Viewing an Approved application | Moves it back to Pre-Approved so the participant can edit it. |
| **Cancel** | Incomplete, Pre-Approved, or Approved (not in preview) | Cancels after you confirm. |
| **Uncancel** | Cancelled | Uncancels after you confirm. |
| **Override Approve** (orange) | Approving, and something is missing | Asks "Approve without the missing items?"; confirm to approve anyway. |
| **Approve App** | Approving a Pre-Approved application | Approves it. Disabled while anything is missing. |

## Review documents

Titled "Review documents — *name*", with the person's **Role**. If the trip needs nothing from them: "This trip has no required documents for *first name*."

For each requirement (a document type name, "Passport", or "Doctor Permission"):

- "Not uploaded" when the person has no document of that type.
- Otherwise a card per document: its description, a **Used for this trip** chip on the one that counts, its number and expiration date, "Reload requested *date*" if you asked for a new file, **View** (or "No file"), and the **Reviewed** checkbox. Ticking or unticking **Reviewed** saves right away.
- **Required specializations**: each with its date and **View**, or "Not added".

**Close** closes the dialog and refreshes the participants table.

### Document viewer

Shows the file, with **Document number**, **Issue date**, and **Expiration date** (or **Specialization date** for a specialization).

| Button | What it does |
|--------|--------------|
| **Edit** | Opens the edit fields below. Disabled while **Reviewed** is ticked ("Untick Reviewed to edit."). |
| **Request reload** | Opens **Note to participant** (optional, up to 1000 characters, included in the email). **Send request** unticks Reviewed, marks the document "Reload requested", and emails the person. You'll see "Reload requested. Email sent to *name*." or "Reload requested. No email was sent." (add a Send Now template for the Document reload requested email type to send one). |
| **Close** | Closes the viewer. |

**Edit** has the same fields as the participant's **Add Document** dialog (**Document type**, **Document number**, **Country issued**, **Issue date**, **Expiration date**, specializations), with **Replace file** (leave empty to keep the current file). **Save** shows "Document saved."

## Add participant

| Field | Choices | Notes |
|-------|---------|-------|
| **Person** | People you can see who aren't already on this trip | Required. |
| **Role** | Agent, Pending User, Trip Leader, Trip Participant | Required. Starts as **Trip Participant**. Use Trip Participant for team members and Trip Leader for leaders. |
| **Trip worker role** | The trip's team roles, as "*Role* (need *N*)" | The job on the team. "Add roles under Team roles first" if the trip has none. |
| **Status** | Incomplete, Pre-Approved, Approved, Declined, Cancelled | Starts as **Incomplete**. Incomplete and Pre-Approved are worked out from how complete the person is. Approved runs the approval checks. |
| **Participant cost (optional)** | A dollar amount | Leave blank to use the trip's default cost. |
| **Why go** | Free text | The person's story, shown on their fundraising page. |

**Add** shows "Participant added."

## Edit participant

Titled "Edit participant", with the person's name.

| Field | Notes |
|-------|-------|
| **Trip worker role** | The job on the team. A Trip Participant who's Pre-Approved or Approved on an active trip must keep one. |
| **Status** | Incomplete, Pre-Approved, Approved, Declined, Cancelled. Approved runs the approval checks. |
| **Participant cost (optional)** | Blank uses the trip's default cost. |
| **Trip options** | One block per option set (shown only when the trip has options). A set with several options uses round buttons and needs one choice; a single option is a checkbox. Changing a choice adjusts **Participant cost** by the price difference; you can type over the result. |
| **Add-on expenses** | Extra costs for this person, such as a visa fee. Each row has **Description**, **Cost** ($0 or more), **Days before** and **Days after** (whole numbers from −365 to 365; they move the planned arrival or departure). **Add expense** adds a row; the trash icon removes one. "Add-on total" sums them. Only one add-on can have days before, and only one days after. |
| **Why go** | Free text. |

**Save** shows "Participant updated."

## Donations for a participant

Titled "Donations for *name*". Lists each donation's **Date**, **Donor**, and **Amount**, with **Edit** on each row. **Add donation** opens the donation dialog with the person already chosen.

## Email team

Titled **Email team** from the trip page, or **Email flight itinerary** from the Flights page.

| Field | Choices | Notes |
|-------|---------|-------|
| **Email template** | **Email team:** the Trip Participant templates for this trip or organization, plus this trip's Scheduled templates (marked "(Scheduled)"). **Email flight itinerary:** the Flight itinerary templates. | Required. |
| **Subject** | — | Filled in from the template. Edit it for this send only. |
| **Email body** | — | Filled in from the template. Edit it for this send only. The toolbar has Bold, Italic, Underline, Bulleted list, Numbered list, Center, Link, and Picture. |
| **Send to** | See below | Who gets it. |
| **Participants** | The trip's people (leaders marked "(Trip Leader)") | Shown for **Selected participants**. |

**Send to** choices:

| Choice | Who gets it |
|--------|-------------|
| **All potential participants** | Trip Participants and Trip Leaders who are Incomplete, Pre-Approved, or Approved. The default. |
| **All accepted participants** | Approved Trip Participants. |
| **All participants this email is for** | For a Scheduled template: the people its schedule rule picks today. |
| **Selected participants** | Only the people you pick. |

"Recipients: *N* participant(s)" shows the count. **Preview** shows the email for one recipient (**Preview as**), with **From**, **Reply-To**, **To**, **Subject**, **Attachments**, and the body. **Send** asks "Send this email to *N* participant(s)?".

The **Sending email** status dialog shows **Attempted**, **Sent**, **Skipped**, and **Failed**, then lists anyone not sent with the reason. **OK** closes it.

## Room list page

Titled "*Trip* — Rooming". **Back to trips**, **Room list PDF**, and **Save** are at the top.

| Field | Notes |
|-------|-------|
| **Hotel name** | Required once anyone has a room. |
| **Start date** | Check-in date. Required once anyone has a room. |
| **Comments** | Notes for the room list. |

The table lists everyone who is Incomplete, Pre-Approved, or Approved:

| Column | Shows / enter |
|--------|---------------|
| **First name**, **Last name** | The person. |
| **Room number** | Leave blank for no room. People with the same number share a room. |
| **Nights** | How many nights (1 or more). Must match for everyone in a room. |
| **Room type** | **King**, **Double**, or **Triple**: the hotel room type, printed on the room list and shown to the participant. Must match for everyone in a room. |
| **Roommate** | Yes when the person asked for a roommate. |
| **Preferred roommates** | The names they gave. |

**Save** shows "Rooming list saved."

## Flights page

Titled "*Trip* — Flights". **Back to trips**, **Flights PDF**, and **Email flight itinerary** are at the top. The table lists everyone who is Incomplete, Pre-Approved, or Approved:

| Column | Shows / enter |
|--------|---------------|
| **First name**, **Last name** | The person. |
| **Booked by** | The organization's name, "Participant", or "Not chosen". The info icon shows **Requested flight info**: preferred departure and return airports, class of travel, preferred airline, refundable ticket, and flight notes. |
| **Arrives**, **Departs** | Planned travel dates, with the same icons as the trip page. |
| **Cost** | The flight's cost. Disabled when the participant books their own flight. |
| **Comments** | Notes about the booking. |
| **Initial departure** | Date, time, and city of the first arrival leg. A warning shows when it leaves from a different airport than requested. |
| **Final arrival** | Date, time, and city of the last return leg, with the same warning. |
| **Actions** | **Save** saves the row's Cost and Comments ("Saved flight for *name*."). **Flight segments** opens the segments dialog. |

The **Flight segments** dialog is described in the [Participant guide](./participant-guide.md#flight-segments). For staff it also shows **Requested** (the participant's requested airports, class, airline, and refundable choice) and warns "Arrival flight departs from *XXX*, but *YYY* was requested." or "Return flight arrives at *XXX*, but *YYY* was requested."

## Trips page for Trip Leaders

**Trips** in the menu bar for Trip Leaders who aren't Org Admins. (Others reaching this page see the heading **Participants**.)

- **Trip** — pick one of the trips you lead.
- The trip card, with **Edit trip**.
- **Add participant** opens [Add participant](#add-participant).

| Column | Shows |
|--------|-------|
| **Name** | The person. |
| **Role** | Trip Participant or Trip Leader. |
| **Worker role** | The job on the team. |
| **Status** | The application status. |
| **Participant cost** | Their cost, or the trip's default. |
| **Total donations** | Donations to them. |
| **Why go** | Their story. |
| **Actions** | **Edit** and **View donations**. |

## Donations page

**Donations** in the menu bar.

- **Trip** — pick the trip.
- Tiles: **Participants** (staff only), **Cost per participant**, **Total donations**, **Donations without participant**.
- **Export CSV** downloads the trip's donations (amount, date, participant, donor, donor email).
- **Add donation** (trip staff only).

| Column | Shows |
|--------|-------|
| **Date** | When it was given. |
| **Donor** | Who gave it. |
| **Amount** | How much. |
| **Participant** | The person it's for, or blank for the trip. |
| **Actions** | **Edit** (staff only). |

### Add donation / Edit donation

**Donor:**

| Field | Notes |
|-------|-------|
| **Donor email** + **Look up** | Finds an existing donor or a person in the organization and fills in their details. Messages: "Donor found. Review and update details below if needed.", "Person found. A donor will be added from their details.", or "Donor not found. Enter donor details below." |
| **Donor first name** | Required. |
| **Donor last name**, **Donor email** | Optional. |
| **Country**, **Address line 1**, **Address line 2**, **City**, **State** / **State / province**, **Postal code** | The donor's mailing address. |
| **Phone number** | Optional. |
| **Donor status** | **active**, **inactive**, or **dontcontact** (do not contact). Starts as active. It's a note for your records; the system doesn't send donors anything. |

**Donation:**

| Field | Notes |
|-------|-------|
| **Trip** | Required (Donations page only). |
| **Participant** | Optional. Leave blank for a gift to the trip. |
| **Amount** | Required. |
| **Date** | Required. Starts as now. |
| **Payment info** | How it was paid, for example a check number. |

**Save** shows "Donation saved."

## Downloads

| Download | From | Contains |
|----------|------|----------|
| **Download CSV** | Trip page | One row per participant: name, preferred name, email, address, phone, birthdate, gender, emergency contact, allergies, pregnancy, medication, church, bio, documents, trip role, worker role, status, participant cost, total donations, funding, roommate preference, travel options, agreement and signature, adult signer, why go, and assignment date. |
| **Documents PDF** | Trip page row | All of one person's documents and files. |
| **Room list PDF** | Room list page | The saved room assignments with passport details, flight arrival times, and emails. |
| **Flights PDF** | Flights page | Every participant's itinerary. |
| **Export CSV** | Donations page | The trip's donations. |
