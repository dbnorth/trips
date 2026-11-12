# Rules

The rules Mission Trips enforces, in plain language. For how-to steps, see the guide for your role.

## Application statuses

| Status | Meaning | How it's reached |
|--------|---------|------------------|
| **Incomplete** | Started but not everything is filled in | Saving an application with something missing |
| **Pre-Approved** | Profile and application are complete; the person holds a place on the team | Submitting a complete application (automatic) |
| **Approved** | Accepted onto the team | Staff approve it |
| **Declined** | Not accepted | Staff decline it |
| **Cancelled** | Withdrawn | The participant or staff cancel it |

Incomplete and Pre-Approved are set automatically from what's filled in. Staff set Approved, Declined, and Cancelled.

## Trip statuses

| Status | Meaning |
|--------|---------|
| `active` | Open: listed on the organization's public trips page, open for applying and donating. |
| `completed` | The trip has happened. Not offered for applying or donating. |
| `inactive` | Hidden from applicants and donors. |

Home's **Organization Trips** shows `active` trips that haven't ended unless **Show all trips** is ticked.

## Complete profile

A profile is complete when it has: first, middle, and last name; email; address (line 1, city, state/province, postal code, country); phone country code and number; birthdate; gender; emergency contact name, country code, phone number, and relationship; and current church home with its city and state/province. Also:

- **Have allergies?** Yes → an allergies description.
- Takes medication → at least one medical condition from the organization's list.
- Speaks another language → at least one language with fluency and the medical terminology answer.

Preferred name and bio are optional.

## Complete application

An application is complete when it has:

- a trip role;
- funding: self-fund and/or raise funds;
- roommate names, if "I have a preferred roommate" is ticked;
- a flight purchase choice, and, when the organization buys the flight, preferred departure and return airports, class of travel, preferred airline, and refundable ticket;
- for female applicants, the pregnancy question (and due date if Yes);
- one option from each trip option set that has several options;
- the participation agreement and electronic signature, when the organization has an agreement;
- the medical agreement, when the organization has one and the applicant takes medication;
- an adult signer's name, email, and relationship, for applicants under 18.

Flight notes and **Why go** are optional. **Why go** (up to 2000 characters) is never needed to submit or for approval.

## Submitting

An application becomes **Pre-Approved** when the profile and application are complete. **Documents are not checked when submitting.** They're checked at approval.

## Documents for a trip

### What a trip needs

For each person, a trip needs:

1. every document type their **worker role** requires, with any **required specializations** for that type;
2. a **passport**, if the trip has **Require Passport** ticked;
3. a **Doctor Permission** document, if the applicant answered Yes to "Are you pregnant?" and the organization has a Doctor Permission document type.

Documents on the profile that the trip doesn't need don't matter for that trip, even if they have no file.

### Which document counts

When a person has several documents for one requirement, the trip uses one: the one with a file that expires last (then the latest issue date). Only that one is checked.

### Good for the trip

A document meets a requirement when it has a file and:

- its expiration date passes the document type's **expiration check**, compared with the trip's end date (or start date, if there's no end date): after the trip ends, on or after the trip ends, or 90 or 180 days after the trip ends;
- it has every specialization the role requires for that type.

Document types without an expiration date count once a file is uploaded. A Doctor Permission uploaded from the application is dated with the trip's end date, so it also counts for later trips that end on or before that date.

A document is **Expired** from its expiration date on, including that day. The red **Expired** tag shows in a profile's document list, in **Review documents**, and on the application's Doctor Permission line. It compares with today's date, not with a trip, and doesn't change any trip check. Documents without an expiration date never expire.

### Due date

Documents are due **90 days before the trip starts**. The due date is guidance: it's shown in next steps, on the profile, and in reminder emails, but nothing is blocked when it passes. You can submit an application and secure a role before those documents are uploaded.

### Reviewed

Trip staff mark each document **Reviewed** after checking it. Reviewed belongs to the document, so it counts for every trip. A reviewed document can't be edited, replaced, or deleted by anyone until staff untick Reviewed. Changing a document's file or details clears Reviewed.

## Approval

To approve an application, staff need it to pass the **approval checklist**:

1. the **profile** is complete;
2. the **application** is complete;
3. every trip **document** requirement is met and **Reviewed**.

If profile or application items are missing, approval is refused with "Complete the profile and application before approving." If only documents are missing, it's refused with "Upload and review all required documents before approving."

- **Override Approve** lets staff approve anyway, after confirming. Overrides aren't recorded separately.
- **Trip Leader** applications skip the checklist.
- Adding someone directly as Approved (Add participant) runs the same checklist, with no override.

On the trip page, the application action is **orange** for Pre-Approved people who pass the checklist and **green** for Approved people.

## People on an active trip

A person is **on an active trip** while they have a Pre-Approved or Approved application on a trip whose end date (or start date, if there's no end date) is today or later.

While on an active trip:

- **Their profile can't be saved with required fields empty**, by anyone. Changing filled-in values is fine.
- **A Pre-Approved application can't be saved with required items empty.** **Update Application** stays disabled until they're filled in.
- **A Trip Participant who's Pre-Approved or Approved must keep a trip role.** Staff can clear it only when declining or cancelling.

Documents aren't part of these checks.

## Changing an application after approval

- The participant can't edit an Approved application, except **Why go**, which they can still change and save with **Save Why go**.
- Staff can change the staff fields: worker role, status, participant cost, trip options, and add-on expenses. Only the participant changes **Why go** after they're on the trip; staff can give a starting story with **Add participant**.
- To let the participant change their own answers, staff **Unapprove** it (back to Pre-Approved). The participant edits it, and staff approve it again.

## Team roles and spots

- Pre-Approved and Approved applications each take a spot in their role. Incomplete, Declined, and Cancelled ones do not. Submitting a complete application is what holds the spot.
- **Available** = Number Needed − Signed up − Reserved.
- Applicants can choose only roles with an available spot.
- **Reserved spots** are held for specific people by email. A person with a reservation is placed in that role when they apply, can't switch roles, and can uncancel even if the role is full.
- A role with signed-up people can't be removed from the trip, and Number Needed can't drop below its reservations.

## Cancelling and uncancelling

The participant or staff can cancel; both are asked "Are you sure?". Uncancelling brings the application back as Incomplete or Pre-Approved (never straight to Approved), only if the role still has a spot or it was reserved for the person.

## Costs and donations

- **Participant cost** — the trip's cost, or a cost staff set for the person. Trip options adjust it by their price adjustments.
- **Total trip cost** = participant cost + airfare (only when the organization books the flight and a cost is entered) + add-on expenses.
- **Amount owed** (balance) = total trip cost − counted donations, never below $0.
- **Deposit** — the first amount the organization asks participants to raise. It doesn't change the cost.
- A donation given to a participant counts toward their amount raised. Donations without a participant count toward the trip.
- Every donation has a **type**: **Stripe-Credit** (credit card through Stripe), **Stripe-ACH** (bank account through Stripe), **Check** (with a check number), or **Other**.
- Online donations are paid through Stripe Checkout, at least $0.50. They need the organization's Stripe secret key; with **Test mode** on, the test key is used. Without the key for the current mode, donation screens show "Online donations aren't set up for this organization yet."
- A Stripe donation is recorded only after Stripe reports the payment complete, once per payment. Its **payment status** is **Succeeded**, **Processing** (a bank payment clearing, usually up to 4 business days), or **Failed**.
- A donation **counts** when it's Check, Other, or Succeeded. Only counted donations go into amount raised, amount owed, trip totals, the deposit and fully-paid checks, and the public pages. Processing and Failed donations still appear on the **Donations** page and in its CSV.
- When an organization asks donors to cover processing fees, Stripe's credit card page offers the fee on top of the gift (Stripe works out the amount; the donor can remove it). A donation's amount is the gift only; the fee the donor covered is recorded separately as **Fee covered** and never counts toward any total or balance. Bank account payments are never asked.
- A Stripe donation's amount, date, and type can't be changed; refunds are done in Stripe.
- Every donor belongs to one organization. The Donors list, add, edit, and import use the organization selected in the menu bar. The same email may be a donor of another organization, and a blank email is allowed. Lookup and reuse of a donor for a donation use the trip's organization only.
- **Look up** on **Add donation**, and on the public trip and participant donation pages, finds a donor of that trip's organization by name or by email. A name needs at least two letters. Several name matches are listed so one can be chosen. The public pages show the donor's name, and the city and state when they are saved, and the gift is recorded on the donor that was chosen.
- **Import** on **Donors** reads a donor contact list. A row updates a donor of this organization when the email matches, when the name in the file is the same name already stored, or when the first and last name both match. That update replaces the name and **Donor type**. Every other row is added as **Active**. **Donor status** is left as it is on an update.
- **Donor type** is **Organization** or **Individual**. It starts as **Individual**, including for donors saved before the field existed. An **Individual** is named by first and last name, and may have a **Family name**. An **Organization** is named by **Organization name**, and first name, last name, and family name are left blank. **Import** sets the type from the name. A name that contains & is **Individual**: the whole name is **Family name**, the name before & is the first name, and the last word is the last name. Church, college, university, company, c of c, or a name in all capital letters is **Organization** and the whole name is kept. Any other name is **Individual**, using the first and last words and leaving out a middle name or middle initial, with **Family name** blank.
- **Donor status** is **Active**, **Inactive**, or **No Email**. **No Email** leaves the donor off **Email donors**. It does not stop the **Trip donation** email or the **Thank you for donation** email.

## Rooming

- The room list includes everyone who is Incomplete, Pre-Approved, or Approved.
- People with the same room number share a room, and must have the same room type (King, Double, or Triple) and number of nights.
- Once anyone has a room, the hotel name and start date are required.

## Planned travel dates

- **Arrival** = trip start date − the days before the trip of the person's selected trip options and add-on expenses.
- **Departure** = trip end date + the days after.
- At most one selected trip option (and one add-on expense) can have days before, and one can have days after.
- When a person's flights land or leave on a different day than planned, staff see a warning and an Approved participant's next steps say so.

## Email

- **Send Now** emails go out when something happens: application started, submitted, or approved; donation received; deposit reached; fully paid; document reload requested. They go only to Trip Participants.
- Donation emails go out when a donation starts counting (a Check or Other is saved, or a Stripe payment succeeds), not when it's edited and never for a Failed payment. The **Trip donation** email goes to both the participant and the donor.
- **Thank you for donation** goes to the donor when the donor entered a donation that starts counting: a public donation page, Home **Donate**, or My Trip **Make Donation**. A bank payment sends it when the payment succeeds, not while it is Processing. Staff **Add donation** and staff **Pay with Stripe** do not send it. A donor with no email gets nothing. **No Email** does not stop it. The **Trip donation** email is still sent as well.
- **Donor** templates belong to the organization, have no schedule, and are sent only from **Email** on the Donors page. A trip template can't use **Donor**.
- **Scheduled** emails go out each morning to the people their rule picks:
  - application incomplete → Incomplete applications;
  - documents missing → Pre-Approved people missing a trip document;
  - deposit due → Approved people who've raised less than the deposit;
  - payment due → Approved people who still owe money;
  - pre-departure and trip arrival → Approved people.
  A person gets each scheduled email at most once a day.
- A Scheduled template goes out only on the days its **Schedule** picks: every day (**Daily**), every Tuesday (**Weekly (Tuesday)**), once a month on its **Day of month** (**Monthly (day of month)**; in a shorter month, on its last day), on the 1st and 15th (**Twice monthly (1st and 15th)**), or once, that many days before the trip starts (**Days before trip start**).
- A trip's own template is used instead of the organization's for the same email type.
- In **test mode**, an organization's emails go to the organization's address instead of the recipients.
- Emails come from "*sender* via Mission Trips", with replies going to the organization, trip leader, or other sender.

## Privacy and access

- Only trip staff (the trip's Trip Leaders, the organization's Org Admins, and System Admins) see a team's applications and personal and medical details.
- Participants see their own application and can donate to teammates.
- Uploaded documents are encrypted, as are personal and medical details such as birthdate, address, phone numbers, health answers, pregnancy, and document numbers.
- Only the person, or a System Admin, can change their password or sign-in email.
- Each sign-in lasts 4 hours, and each device signs in separately.
