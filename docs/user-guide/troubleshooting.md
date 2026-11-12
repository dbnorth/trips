# Troubleshooting

Messages you might see, what they mean, and what to do.

## Signing in

**"An account with this email already exists. Please log in instead."**
You already have an account. Sign in, or use **Forgot password?**.

**"Too many failed sign-in attempts. Try again in 15 minutes or reset your password."**
Five wrong passwords in a row locked the account. Wait 15 minutes, or reset your password to unlock it now.

**"Too many attempts. Please try again later."**
Too many attempts came from your location in a short time. Wait a few minutes.

**"This reset link is invalid or has expired. Please request a new one."**
Reset links work once, for 1 hour, and only the newest one works. Choose **Request a new link**.

**I'm signed out unexpectedly.**
Sign-ins last 4 hours. Resetting your password, or a System Admin setting it, also signs you out everywhere.

## Profile

**"This profile is on an active trip and can't be saved with missing information. Missing: …"**
The person is Pre-Approved or Approved on a trip that hasn't ended, so required profile fields can't be left empty. Fill in the listed items and save again.

**A "Missing:" list shows at the top of the profile.**
Those are the fields still needed for a complete profile. It updates as you type.

**I can't change my sign-in email or password from Edit person.**
Only you (from your own profile) or a System Admin can change them.

**"Middle name is required"**
A complete profile needs a middle name, and the profile can't be saved without one.

**"Country code is required when a phone number is entered."** (or "Phone number is required when a country code is entered.")
Fill in both phone fields, or clear both. Errors for the emergency contact phone start with "Emergency contact: ".

**"Phone must be (xxx) xxx-xxxx"** / **"Country code must be 1–3 digits (e.g. +1)"**
Enter a 10-digit phone number and a 1–3 digit country code.

**"Email already in use by another user."**
Another account signs in with that email. Use a different one.

**"This organization has no medical conditions configured. Ask an organization admin to add them."**
An Org Admin needs to add conditions on the **Medical conditions** page before you can answer Yes to **Take medication?**.

**"Select an organization to choose medical conditions."**
Pick an organization in the menu bar first.

## Documents

**"All documents for your trips must be uploaded 90 days before the trip starts. You can submit an application and secure a role on the trip without uploading the documents required for the trip."**
On your own profile, the trip documents list starts with this note. The 90-day date is when documents should be uploaded. You can still submit a complete application and hold your role before those documents are uploaded. Staff review them before they approve you.

**"Reviewed documents can't be changed."** / **"Untick Reviewed to edit this document."**
Staff have checked this document, so it's locked. Participants: add a new document, or ask trip staff. Staff: untick **Reviewed** first.

**My document shows a red "Expired" tag.**
Its expiration date is today or has passed. Add a current document. The old one keeps the tag, and each trip uses the document that expires last.

**My trip says a document is Missing, but I uploaded it.**
Check the explanation next to it. Common causes: it expires too soon for the trip (a trip can require validity until after it ends, or 90 or 180 days after), a required specialization isn't selected, it has no file, or it's a different document type than the role requires.

**"Each specialization can be added only once per document."**
Remove the duplicate specialization row.

**"This HEIC photo couldn't be read. Upload it as a JPG, PNG, or PDF instead."**
Export the photo as a JPG or PDF and upload that.

## Applications

**Submit Application doesn't appear.**
Something is still missing. Reopen the application: the list above the buttons names what's needed, including "Profile is not complete" with the missing profile fields. If no button shows at all, the trip may have no open spots for you, or your application may not be editable (for example, it's Approved).

**"This Pre-Approved application can't be saved with missing information. Missing: …"** (or **Update Application** is disabled)
A Pre-Approved application on an upcoming trip must stay complete. Fill in the listed items.

**"This application cannot be updated while its status is approved."**
Approved applications can't be edited by the participant, except **Why go** (use **Save Why go**). For anything else, ask your trip staff. They can **Unapprove** it so you can edit it. The same message with "cancelled" or "declined" also appears when saving **Why go** on such an application.

**"You are approved for this trip. You can update Why go or Cancel the application if needed."**
Your application is Approved, so only **Why go** can still be changed. Edit it and choose **Save Why go**.

**"Why go must be 2000 characters or less."**
Shorten your **Why go** story.

**I can't find Why go in Edit participant.** (staff)
Only the participant changes **Why go**, on their application. Staff can give a starting story with **Add participant**.

**"This role is reserved for you." / "Your role on this trip is reserved."**
Staff reserved a spot in that role for your email, so the role can't be changed.

**"Thanks for your interest, but there are no spots available on this trip."** (or "…all remaining spots on this trip are reserved.")
Every spot is taken or reserved for someone else.

**"Choose only one trip option with days before the trip."** (or "…after the trip.")
Only one selected option can move your arrival (or departure) date.

**"You can donate to yourself only on trips where you are pre-approved or approved."**
Self-donations open once your application is submitted and complete.

## Donations and Stripe

**"Online donations aren't set up for this organization yet."**
The organization hasn't saved the Stripe secret key for its current mode. An Org Admin adds it in **Edit organization** under **Online donations (Stripe)**: the live key when Test mode is off, the test key when it's on.

**"Donation amount must be at least $0.50."**
Stripe's minimum payment is $0.50.

**"Choose Credit card or Bank account (ACH)."**
Pick a **Payment method** before **Pay with Stripe**.

**"Your first name and email are required."**
On the public donation pages, enter your first name and email; Stripe sends the receipt there.

**"Enter a donor name or email to look up."**
**Look up** needs a name or an email.

**"Enter at least two letters of the name, or an email."**
A name search needs at least two letters. An email address is enough on its own.

**"Several donors match. Choose one."**
More than one donor fits that name. Choose the button for the donor you mean.

**"Donor not found. Enter your name and email below."**
No donor of this trip's organization matches. Enter your name and email to give as a new donor.

**"Stripe couldn't start the payment. Please try again."**
Stripe didn't answer or refused the request. Try again in a moment; if it keeps happening, an Org Admin should check that the saved Stripe key is correct and active. If only credit card payments fail, the organization may have **Ask donors to cover processing fees** ticked without Stripe's approval for fee coverage: an Org Admin should untick it in **Edit organization** until Stripe approves the account.

**"Enter a live Stripe secret key (sk_live_ or rk_live_)."** / **"Enter a test Stripe secret key (sk_test_ or rk_test_)."**
The key was pasted into the wrong field or isn't a secret key. Copy the secret (or restricted) key from the Stripe Dashboard: live keys go in **Stripe secret key**, test keys in **Stripe test secret key**.

**"Use Pay with Stripe for Stripe-ACH and Stripe-Credit donations."**
Stripe donations can't be typed in by hand. Choose **Pay with Stripe** to take the payment, or pick Check or Other for a gift you already received.

**"Check number is required."**
A Check donation needs its check number.

**"A Stripe donation's amount, date, and type can't be changed."**
These come from Stripe. Refund or adjust the payment in Stripe instead.

**"Start date must be on or before End date."**
On the **Donations** page, the start date is after the end date. Fix either date.

**"Your payment didn't go through."**
Stripe declined the payment; the reason is shown below the message. Nothing was recorded as paid. Try again with another card or account.

**"Your bank payment is processing. It usually takes up to 4 business days to clear."**
Bank payments take a few days. The donation shows as **Processing** and counts once Stripe reports it **Succeeded**.

**"Your payment hasn't been confirmed yet. If you paid, it will be recorded shortly."**
Stripe hadn't confirmed the payment when the page stopped checking. The app keeps checking every 10 minutes, so a completed payment still shows up.

**"This donation link has expired."**
The Stripe payment page wasn't used within a day. Start a new donation.

**"Donation not found."**
The return link is incomplete or wrong. Check the **Donations** page, or start a new donation.

**"Select an organization in the menu bar."**
**Donors** needs one organization. A System Admin with **All organizations** selected picks an organization in the menu bar.

**"Account number must be 50 characters or less."**
**Account number** on an organization or a trip is longer than 50 characters. Shorten it, or leave it blank.

**"Organization name is required."**
**Donor type** **Organization** needs an **Organization name**.

**"Donor type must be Organization or Individual."**
**Donor type** is **Organization** or **Individual**.

**"Donor first name is required."**
**Add donor** and **Edit donor** need a first name.

**"A donor with this email already exists."**
That email is already a donor of this organization. The same email can still be added for a different organization. **Import** updates that donor instead of adding another.

**"This file isn't a donor contact list. Missing columns: Email."**
**Import donors** needs a CSV with the columns Donor full name, Phone numbers, Email, Full name, Bill address, and Ship address. The message names each column that is missing.

**"Donor templates cannot belong to a trip."**
**Donor** templates are for the organization. Choose **All trips (organization-wide)**, or pick another function code for a trip template.

**"No Donor templates. Add one under Email templates."**
**Email donors** has nothing to send until the organization has a template whose function code is **Donor**.

**"Donors marked No Email can't be emailed."**
A donor whose status is **No Email** was included in the send. Leave them unchecked. **No Email** does not stop a donation thank-you.

**"Enter an email address for every selected donor."**
A checked donor has no email. Add an email on **Edit donor**, or leave them unchecked.

**"Choose a trip."**
**Donated to a trip** needs a **Trip** before the list and the send.

**A donation shows on the Donations page but not in the totals.** (staff)
Its **Status** is **Processing** (a bank payment still clearing) or **Failed**. Only Succeeded Stripe payments, Checks, and Other donations count.

## Flights

**"Each segment requires airports, airline, flight number, and valid departure/arrival date and time."**
Fill in every required field on each leg, or **Delete** the empty leg.

**"Duplicate segment numbers within a flight type are not allowed."**
Give each arrival leg (and each return leg) a different **Segment #**.

**"Segment arrival 2: arrival must not be before departure."**
Check the leg's dates and times.

**"Cost must be a non-negative number or empty."**
Enter a cost of $0 or more, or leave it blank.

**A flight's Cost box is greyed out.**
The participant books their own flight, so there's no organization cost to record.

## Rooming

**"Hotel name is required when rooms are assigned."** (or "Start date is required when rooms are assigned.")
Fill in **Hotel name** and **Start date** before saving room numbers.

**"Conflicting room type for room 12. All assignees must use the same room type."** (or "…same nights.")
Everyone with the same room number needs the same room type and nights.

## Approval (staff)

**Approve App is disabled.**
The dialog lists what's missing from the profile, the application, or the documents. Fix those, or use **Override Approve** if you've decided to approve anyway.

**"Complete the profile and application before approving."**
Profile or application items are missing. Open **Approve App** to see them.

**"Upload and review all required documents before approving."**
A trip document is missing, doesn't meet the trip's rules, or isn't Reviewed. Use **Review documents**.

**"Trip role is required while the application is Pre-Approved or Approved on an active trip."**
Give the participant a worker role, or set them to Declined or Cancelled if you're removing it.

**"An organization must keep at least one Org Admin."**
Add another Org Admin before removing this one.

## Trips and roles

**"People have signed up for this role. Move or cancel them before removing it."**
A role with Pre-Approved or Approved people can't be removed. Incomplete applications don't block removing it.

**"Your application data will be saved, but a role on the trip has not yet been secured."**
**Save Incomplete Application** asks you to confirm with **OK** before it saves. The application stays Incomplete and does not hold a role spot.

**"You do not have a role secured on this trip. Complete the application and profile required fields and submit the application."**
On **My Trip**, under "Complete missing information on your application and profile so you can submit your application." Fill in the missing application and profile fields, then submit. That holds your role.

**"Remove reserved emails first."**
Number Needed can't go below the number of reserved spots.

**"This role is used on a trip and cannot be deleted."**
Remove the role from every trip before deleting the worker role.

**Import says "Add these worker roles to the trip, then import again."**
Some positions in the spreadsheet don't match the trip's roles. Add those roles to the trip, then import again.

**"Choose a CSV file up to 5 MB."**
Save the spreadsheet as CSV and make sure it's under 5 MB.

**"Reserved emails (3) cannot be more than Number Needed (2)."**
Raise **Number Needed** or reserve fewer emails.

**"*email* has already applied for this trip."** / **"*email* is already reserved on this trip."**
That person already holds a spot, so the email can't be reserved again.

**"Only 2 open slots for this role."**
You tried to reserve more emails than the role has open spots.

**"The PDF must be 10 MB or smaller."** / **"Upload a PDF file."**
The trip arrival file must be a PDF under 10 MB.

**"Unable to download the Trip Arrival Document."**
On **My Trip**, the download didn't finish. Staff may have removed the file since you opened the page. Reload the page: the button disappears if the file is gone, otherwise try again.

**"Select an organization using the menu bar to manage …"**
That page works on one organization. Pick one in the menu bar's **Organization** (or **Emulate org**) selector.

**Add trip or Add person is greyed out.**
A System Admin has **All organizations** selected. Pick an organization first.

**"Subdomain "*name*" is reserved."** / **"That subdomain is already in use."**
Choose a different subdomain. www, api, app, admin, and localhost can't be used.

## Email

**An email wasn't sent ("skipped").**
The status dialog gives the reason, for example "No recipients.", "No sender.", "No flight segments.", "Trip arrival PDF is missing.", or "Test mode: the organization has no email."

**Emails are going to the organization instead of participants.**
The organization's **Test mode** is on. Turn it off in **Organizations → Edit**.

**"Reload requested. No email was sent."**
The reload was recorded, but the organization has no Send Now template for the Document reload requested email type. Add one under **Templates** to email people automatically.

**"No Person templates. Add one under Email templates."**
**Email** on the People page needs a template with the Person function code.

**"Trip Participant templates need exactly one trip selected."**
Pick a single trip in **Trips** to send a trip template.

**"Links must start with http://, https://, or mailto:."**
Type the full web address in **Link address**, including http:// or https://.

**"This picture is used by 2 templates."**
Remove the picture from those templates before deleting it.

**"Pictures in one email must total 5 MB or less."**
Use fewer or smaller pictures.

**"From email must be an email address or an email token."** / **"To must list email addresses or email tokens, separated by commas."**
Use one address or one email token (such as `{{ORG_EMAIL}}`) in From email, and comma-separated addresses or email tokens in To.

**"Day of month must be a whole number from 1 to 31."**
A **Monthly (day of month)** schedule needs a **Day of month** from 1 to 31. Pick 31 to send on the last day of every month.

**"Email type is used by a template."** / **"Airport is referenced by flight segments."** / **"Airline is referenced by flight segments."**
The item is in use, so it can't be deleted.

**A scheduled email didn't go to someone.**
Scheduled emails go only on the days the template's **Schedule** picks, only to people their rule picks (for example, payment due goes to Approved people who still owe money), and at most once a day.
