# Mission Trips — System Overview

Mission Trips helps organizations run short-term mission trips. Organizations publish trips, people create an account and apply, staff review and approve applications and organize rooms and flights, and friends and family donate toward a participant's costs. The system emails participants along the way.

This page lists the major features. Smaller fixes and add-ons are folded into the feature they belong to. Each section ends with the feature specs it comes from (in `features/`) for anyone who wants the details.

---

## Who uses it

| Role | What they do |
|------|--------------|
| **System Admin** | Runs the whole system: every organization, person, trip, and the shared catalogs (document types and their specializations, airports, airlines, email types and tokens). |
| **Org Admin** | Runs one organization: its people, worker roles, medical conditions, trips, applications, donations, rooming, flights, and emails. |
| **Trip Leader** | Manages the trips they lead: applications, team roles, rooming, flights, documents, and team emails. |
| **Trip Participant** | Applies to trips, keeps their profile and documents up to date, sees their next steps, and donates. |
| **Donor / public visitor** | Views public organization and trip pages and donates to a trip or a participant without an account. |

---

## 1. Accounts and sign-in

- Create an account with email and password (at least 8 characters), and sign in. Each sign-in is its own session, lasting 4 hours, so each device signs in and out separately.
- Opening the site on an organization's own web address (its subdomain) signs new accounts up to that organization.
- **Forgot password?** emails a one-time reset link that works for 1 hour. Resetting signs the account out everywhere.
- After 5 wrong passwords in a row, the account is locked for 15 minutes. Repeated attempts from one place are also slowed.
- Only the person themselves or a System Admin can change their password or login email.

*Specs: 1, 15, 68, 70, 71, 72*

## 2. Organizations

- Create and edit organizations: name, logo, colors, contact email, and web address (subdomain).
- Each organization writes its own **participation agreement** and **medical agreement**, which applicants agree to on their application.
- Each organization keeps its own list of **medical conditions** for applicants to choose from.
- **Test mode** sends all of an organization's emails to the organization's own address, so templates can be tried safely.

*Specs: 3, 15, 17, 18, 49*

## 3. People and profiles

- The **People** page lists everyone in an organization. Admins add and edit people and assign organization roles.
- A profile holds name (including middle and preferred names), contact details, address, emergency contact and relationship, a short bio, and a profile photo.
- Health answers live on the profile: allergies, medication and medical conditions, and other languages spoken (including medical terminology).
- A profile must be complete before an application can be submitted.
- Address and document country default to the United States.

*Specs: 2, 11, 14, 16, 20, 31, 32, 33, 36, 37, 65*

## 4. Documents

- People upload documents to their profile (passports, licenses, certifications, diplomas, and other types), each with its file, number, issuing country, and dates.
- Uploaded files are stored encrypted and can be viewed or downloaded by the person and by staff who manage them.
- Which documents a trip role needs, and how specializations work, is in section 6.

*Specs: 4, 35, 63*

## 5. Trips

- Create, edit, and **copy** trips: name, dates, location, description, image, participant cost, deposit, and trip leaders (with one primary leader).
- A trip can **require a passport** that is valid past the end of the trip.
- Trips offer **travel and cost options** (for example, room upgrades) with price adjustments that applicants choose.
- Staff see dashboards of their trips on the home page.

*Specs: 5, 6, 21, 23, 38, 40, 66*

## 6. Trip roles, required documents, and specializations

These pieces work together to make sure everyone on a trip team has the credentials their job needs:

> **Document type** (with a list of specializations) → **worker role** requires certain document types and specializations → each **trip** needs a number of each role → an applicant picks a role → the application can't be submitted until they have what that role requires.

**Document types (System Admin)**
- The shared list of documents people can upload, for example Passport, Nursing license, Board certification, Diploma.
- Each type sets:
  - whether a **document number** is required;
  - whether it **has an expiration date** (a diploma doesn't);
  - **instructions** shown when someone uploads it;
  - whether it **allows specializations**, and the list of specialization names (for example, Board certification → Pediatrics, Emergency Medicine).
- A specialization still used by someone's document or by a worker role can't be removed. Renaming one renames it everywhere.

**Specializations on a person's documents**
- When a document's type allows specializations, the person adds them from that type's list, each with a date and its own file (for example, the certificate for that specialty).
- Each specialization can be added only once per document.

**Worker roles (Org Admin)**
- Each organization keeps its own catalog of worker roles, for example Nurse, Doctor, Pharmacist, General Helper.
- A role can **require document types** (a Nurse needs a Nursing license). For a required type that allows specializations, it can also **require specific specializations** (a Doctor needs a Board certification in Pediatrics).
- The Worker Roles list shows each role's required documents, with required specializations in parentheses.

**Roles on a trip (trip staff)**
- On the trip page's **Team roles** card, or when adding or editing a trip, staff add roles with a **Number Needed**.
- Each role shows **Needed**, **Signed up**, **Reserved**, and **Available** (Needed − Signed up − Reserved). Incomplete, applied, and approved applications take a spot; cancelled and declined ones free it.
- Applicants can only choose a role with an available spot. Cancelling frees the spot, and uncancelling works only if the role still has room.

**Reserved spots**
- Staff can **reserve** spots in a role for specific people by email, up to the open spots.
- When that person applies, they're placed in the reserved role and can't switch to another ("This role is reserved for you."). They can uncancel even if the role is otherwise full.
- Everyone else can only take open spots, and Number Needed can't be lowered below the number of reservations.

**How the application checks it**
- To move from **Incomplete** to **Applied**, the applicant needs, for their chosen role:
  - one document of each required type, with a file and an expiration date after the trip ends (no expiration check for types without one);
  - every required specialization on that document;
  - a valid passport when the trip requires one;
  - a file for every document on their profile.
- Anything missing is named, for example "Board certification (Pediatrics, Emergency Medicine)". It shows on the application, on the **Trip Status** board, and in the participant's **My Trips** next steps.
- Staff can review a participant's documents and files in one **Documents PDF**.

*Specs: 6, 22, 23, 24, 25, 26, 34, 56, 57, 58, 59*

## 7. Browsing and applying to trips

- People browse open trips and apply. Public trip pages have an **Apply** button that leads to sign-in and then the application.
- The application collects the team role, travel options, flight preferences, pregnancy questions where they apply, and agreement to the organization's agreements (an adult signer is required for under-18 applicants).
- An application moves through **Incomplete → Applied → Approved** (or **Declined** / **Cancelled**). It reaches **Applied** only when the profile is complete and the role's documents and specializations, and a passport if required, are in place (see section 6).
- The application explains why it can't be submitted yet and what is still missing.
- Applicants and staff can **cancel** and **uncancel** an application.

*Specs: 7, 13, 17, 18, 19, 23, 25, 26, 27, 47*

## 8. My Trips (the participant's home)

- The home page lists the participant's upcoming trips with their **next steps** for each, color-coded: complete or submit the application, wait for approval, pay the deposit or donate toward what's still owed, or enter flight details. When nothing is left, it says "You are all ready for the trip."
- The trip page's **My Trip Info** shows the same next steps plus the participant's room, roommates, flights, and chosen trip options.
- Approved participants get a link to their own public **fundraising page** to share.

*Specs: 60, 61*

## 9. Managing a trip's team (staff)

- The **trip page** lists everyone who applied, with their profile and application shown in easy-to-read two-column dialogs. Staff approve or decline from there.
- The **Trip Status** board shows every applicant's status, what is still missing, amount raised and still owed, and their travel option choices.
- **Documents PDF** gathers one participant's documents and uploaded files into a single PDF.
- The **participant CSV** export lists the team's details.
- Only trip staff (System Admin, Org Admin, Trip Leader) can see teammates' personal and medical details.

*Specs: 7, 28, 58, 67, 69*

## 10. Rooming

- The **Room list** page records the hotel, check-in date, and notes, then assigns each participant a room number, room type, and number of nights. Applicants' roommate preferences are shown alongside.
- **Room list PDF** prints the assignments with passport details, flight arrival times, and emails for the hotel or team.

*Specs: 29, 54*

## 11. Flights

- The **Flights** page records each participant's arrival and return flight segments, using shared airport and airline lists, plus who buys the ticket (the organization or the participant) and its cost.
- Participants who buy their own ticket enter their own flights.
- **Flights PDF** prints every participant's itinerary.

*Specs: 30, 55, 60*

## 12. Donations and fundraising

- Staff record donations and manage **donors**, and export donations and donors to CSV.
- **Public pages** for each organization, trip, and participant let anyone donate without an account.
- Signed-in participants **donate** to themselves or to teammates from the trip page.
- Amount raised and amount owed feed the Trip Status board, My Trips next steps, and financial statement emails. (No card payments are processed; donations are recorded.)

*Specs: 8, 9, 53, 69*

## 13. Email

- **Email templates** belong to an organization or a trip. They use **tokens** (for example, participant name, trip dates, balance due, or a full financial statement) that are filled in for each recipient, and have a **Preview**.
- Templates send in four ways:
  - **Send Now**: automatically when something happens (application started, submitted, or approved; donation received; deposit reached; fully paid).
  - **Scheduled**: by a daily job (daily, weekly on Tuesday, or a number of days before the trip), for example reminders about incomplete applications or payments due.
  - **Email team**: from the trip page to all or selected participants.
  - **Email people**: from the People page to participants across chosen trips and roles.
- All email comes from "*sender* via Mission Trips", with replies going to the organization or leader. Every email sent is logged.

*Specs: 10, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 62*

## 14. Security and privacy

- Every screen and action checks the user's role, so people only see what they're allowed to.
- Uploaded documents are encrypted on disk, and personal and medical details (birthdate, address, phone, emergency contact, health answers, pregnancy, document numbers, donor contact details) are encrypted in the database. The encryption keys are kept in AWS Secrets Manager.
- Recent security fixes:
  - Adding a person can't take over an existing account.
  - Only staff can see teammates' details.
  - Password reset and sign-in limits are in place.
  - Only a System Admin can change someone else's password or login email.
  - Every sign-in gets a fresh session.

*Specs: 63, 64, 68, 69, 70, 71, 72*

---

### Not listed separately

- **11, 14, 65, 66** are bug fixes, folded into their sections above.
- **12** was replaced by 63 and never built.
- **67** is a layout change, folded into "Managing a trip's team".

For the full, current rules see `features/reference/behavior.md`. For the complete feature list see the catalog in `features/README.md`.
