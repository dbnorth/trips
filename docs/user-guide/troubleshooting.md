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

**"Reviewed documents can't be changed."** / **"Untick Reviewed to edit this document."**
Staff have checked this document, so it's locked. Participants: add a new document, or ask trip staff. Staff: untick **Reviewed** first.

**My document shows a red "Expired" tag.**
Its expiration date has passed. Add a current document. Each trip uses the document that expires last.

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
Approved applications can't be edited by the participant. Ask your trip staff. They can **Unapprove** it so you can edit it.

**"This role is reserved for you." / "Your role on this trip is reserved."**
Staff reserved a spot in that role for your email, so the role can't be changed.

**"Thanks for your interest, but there are no spots available on this trip."** (or "…all remaining spots on this trip are reserved.")
Every spot is taken or reserved for someone else.

**"Choose only one trip option with days before the trip."** (or "…after the trip.")
Only one selected option can move your arrival (or departure) date.

**"You can donate to yourself only on trips where you are pre-approved or approved."**
Self-donations open once your application is submitted and complete.

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
A role with Incomplete, Pre-Approved, or Approved people can't be removed.

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
