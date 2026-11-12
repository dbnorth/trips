# Glossary

**Active trip** — a trip whose end date (or start date, if it has no end date) is today or later. People with a Pre-Approved or Approved application on one must keep their profile complete. Not the same as a trip whose **Status** is `active`.

**Add-on expense** — an extra cost staff add to one person's application, such as a visa fee. It's part of their total trip cost, and can move their planned arrival or departure.

**Agent** — a travel agent role that can manage an organization's flights and nothing else.

**Amount owed / Balance** — total trip cost minus counted donations, never below $0.

**Application** — a person's answers for one trip: trip role, options, funding, flights, roommate, health, and agreements.

**Approval checklist** — what must be true before staff can approve: complete profile, complete application, and every trip document uploaded, good for the trip, and Reviewed.

**Approve App / View App / Preview App** — the trip page action that opens an application. It's named for what you can do: approve it (Pre-Approved), view it (Approved or Cancelled), or preview it (otherwise).

**Attachment token** — a token that attaches a file to an email. The only one is `{{TRIP_ARRIVAL_PDF}}`.

**Booked by** — who buys a participant's flight: the organization, the participant, or not chosen yet.

**Class of travel** — the cabin a participant wants or flies in: Basic Economy, Economy, Premium Economy, Business, or First.

**Color family** — an organization's color (blue, teal, green, purple, red, or orange), used for the menu bar and main buttons.

**Confirmation number** — the airline booking reference for a participant's flights.

**Counted donation** — a donation that goes into totals and balances: a Check, an Other, or a Stripe payment that Succeeded. Processing and Failed Stripe payments don't count.

**Current document** ("Used for this trip") — when a person has several documents for one requirement, the one the trip checks: the one with a file that expires last.

**Deposit** — the first amount a trip asks participants to raise.

**Doctor Permission** — a document from a doctor allowing a pregnant participant to travel.

**Document type** — a kind of document, such as Passport or Nursing License, with its rules (number required, expiration date, expiration check, specializations). Its **Type** is one of Medical License, Passport, Certification, Diploma, or Doctor Permission.

**Donation type** — how a donation was given: Stripe-Credit (credit card through Stripe), Stripe-ACH (bank account through Stripe), Check (with its check number), or Other.

**Donor status** — a note on a donor's record: Active, Inactive, or No Email. **No Email** means the donor is left off **Email donors**. It does not stop donation thank-you emails.

**Donor type** — whether a donor is an Organization or an Individual. An Organization is shown by its organization name. An Individual is shown by first and last name.

**Family name** — the full name of an Individual when that name contains &. The first name is the part before &, and the last name is the last word.

**Email token** — a token that fills in an email address, usable in a template's From email and To: `{{ORG_EMAIL}}`, `{{PARTICIPANT_EMAIL}}`, `{{LEADER_EMAIL}}`, or `{{DONOR_EMAIL}}`.

**Email type** — what an email is about, such as Application approved or Deposit due. Its event description says when it's sent.

**Emulate org** — the System Admin's menu bar selector for viewing the system as one organization.

**Event code** — the system event behind an email type, such as application-approved. Send Now and Scheduled templates are sent for their type's event.

**Expiration check** — how long a document type must stay valid for a trip: after the trip ends, on or after it ends, or 90 or 180 days after it ends.

**Expired** — the red tag on a document from its expiration date on (including that day), shown in the profile's document list, in **Review documents**, and on the application's Doctor Permission line.

**Fee covered** — the Stripe processing fee a donor chose to add on top of a credit card gift, when the organization asks donors to cover processing fees. It's recorded apart from the donation's amount and never counts toward totals.

**Flight segment** — one leg of a flight: airline, flight number, airports, and departure and arrival times. Arrival segments take a person to the trip; return segments bring them home.

**Function code** — how an email template is sent: Send Now (when its event happens), Scheduled (each morning by its schedule), Trip Participant (from Email team), Person (from the People page), or Donor (from the Donors page).

**Missing items** — what's still missing from a person's profile, application, or trip documents, shown on the trip page.

**Next steps / next actions** — the to-do list for each trip on a participant's Home and My Trip page.

**Org Admin** — the person who runs an organization in Mission Trips.

**Organization trips page** — an organization's public page listing its open trips, with View, Donate, and Apply.

**Override Approve** — approving an application even though checklist items are missing, after confirming.

**Participant cost** — the trip's cost for one person, adjusted by their trip options or set by staff.

**Participants (count)** — on the Trips list and the trip page summary, the number of Trip Participants whose application is Incomplete, Pre-Approved, or Approved. Leaders, Declined, and Cancelled applications aren't counted.

**Payment status** — where a Stripe donation stands: Processing (a bank payment still clearing), Succeeded (paid and counted), or Failed (never counted). Check and Other donations have none.

**Pay with Stripe** — the button that sends a donor (or staff taking a payment) to Stripe's secure payment page.

**Pending User** — someone in an organization who hasn't been given another role yet. They see the participant pages.

**Pre-Approved** — the status of a submitted, complete application. The person holds a place on the team while staff review documents.

**Primary trip leader** — the main leader of a trip, used in emails.

**Reserved spot** — a spot in a role held for a specific person's email.

**Reviewed** — staff have checked a document. Reviewed documents are locked.

**Room type** — King, Double, or Triple. Everyone sharing a room has the same room type.

**Schedule** — when a Scheduled template goes out: Daily, Weekly (Tuesday), Monthly on a chosen day of the month, Twice monthly (1st and 15th), or a number of days before the trip starts.

**Specialization** — a sub-type of a document, such as Pediatrics on a board certification, with its own date and file.

**Stripe** — the payment service online donations go through, by credit card or bank account (ACH). Each organization connects its own Stripe account with its secret keys.

**Stripe secret key / Stripe test secret key** — the keys an Org Admin copies from the Stripe Dashboard into Edit organization. The live key takes real payments; the test key is used while Test mode is on. Saved keys are never shown again.

**Subdomain** — an organization's own web address. People who create an account there join it automatically.

**Test mode** — an organization setting that sends all its emails to the organization's own address and uses the Stripe test key for online donations.

**Trip donation email** — the thank-you email sent to the participant and the donor when a donation starts counting.

**Token** — a placeholder in an email template, written as `{{CODE}}`, that's filled in for each recipient, such as the participant's name or balance due.

**Total Roles** — on the Trips list, the total Number Needed across a trip's roles.

**Total trip cost** — participant cost + airfare (when the organization books the flight) + add-on expenses.

**Trip Leader** — a person who runs a trip they lead.

**Trip option / Travel option** — a choice on a trip, such as a room upgrade or an extra travel day, with a price adjustment and optional days before or after the trip. Options with the same set number form one group. Edit trip calls them travel options.

**Trip Ready** — the trip page's prep check: all roles filled, all participants approved, all funds raised, flights entered for everyone, and everyone on the room list.

**Trip role / Worker role** — the job a person does on the team, such as Nurse or General Helper. Each role can require documents. ("Trip role" on the application also means Trip Participant or Trip Leader.)

**Trip Participant** — a person going on a trip.

**Trip status** — `active` (open for applying and donating), `completed` (the trip has happened), or `inactive` (hidden from applicants and donors).

**Value source** — what an email token fills in, such as Participant balance due. Set by a System Admin on the Email tokens page.

**Why go** — a participant's story about why they're going, written on their application (and still editable after approval) and shown on their fundraising page. Staff can give a starting story when adding someone.
