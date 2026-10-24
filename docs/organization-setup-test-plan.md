# Organization Data Setup and Test Plan

Use this plan to set up a new organization in Mission Trips with **two real trips**, then test every major feature using those trips and a small set of test people. Part 1 builds the data in the order the system needs it. Part 2 tests each feature with that data. Part 3 is the go-live checklist.

The two trips are chosen to be different on purpose, so one test run covers both kinds of trip:

| | Trip A — Guatemala Hospital Ezel | Trip B — Guatemala Remote Clinic |
|---|---|---|
| Kind | Hospital medical team | Remote medical clinic |
| Passport | Required | Required |
| Cost / deposit | $2,000 / $300 | $650 / $100 |
| Primary leader | Leader Lee | Leader Liz |
| Roles | Doctor, Nurse, General Helper (one spot reserved) | Nurse, General Helper |
| Flights | Organization buys for some participants | Participants buy their own |
| Email | Uses the organization's templates | Has its own "Application approved" template |

The example names, dates, and amounts can be replaced with the organization's actual trips. If you change them, keep the same differences (one trip has a reserved spot and organization-bought flights, the other has its own email template, and so on) and adjust the dates and dollar amounts in the tests to match.

For what each feature does, see [system-overview.md](./system-overview.md). For every profile and application field, see [participant-data.md](./participant-data.md).

**Before you start**

- Turn **Test mode** on for the organization (step 1.1) and leave it on until go-live. Every email the organization sends then goes to the organization's own email address, with "[Test]" at the start of the subject and the intended recipients at the top of the body. No real person gets an email.
- Use email addresses you control for every test person. Many mail services accept "plus" addresses, for example `you+lee@example.com` and `you+nora@example.com`, which all arrive in your own inbox.
- Fill in the **Result** column with Pass or Fail and a note. Record the date and tester at the end.

---

## Part 1 — Data setup

### 1.0 Check the shared catalogs (System Admin)

These lists are shared by all organizations. Make sure they contain what the two trips need.

| Catalog | Needed for these trips |
|---------|------------------------|
| Document types | **Passport** (number required, expires); **Nursing license** (number required, expires); **Board certification** (number required, expires, allows specializations) |
| Specializations | Board certification → **Pediatrics** (plus any others, such as Emergency Medicine) |
| Airports | **ORD** Chicago O'Hare, **DFW** Dallas/Fort Worth, **GUA** Guatemala City La Aurora |
| Airlines | **American Airlines**, **United Airlines** |
| Email types and tokens | The standard email types (application started, submitted, approved; donation received; deposit received; payment complete; application incomplete; deposit due; payment due; pre-departure; trip team update) and tokens (participant name, trip name and dates, balance due, and so on) |

### 1.1 Create the organization (System Admin)

Only a System Admin can create an organization. **Organizations → Add organization**:

| Field | What to enter | Example |
|-------|---------------|---------|
| Name | The organization's name, shown on every page, PDF, and email. | Test Mission Org |
| Address, phone | Mailing address and main phone. | 123 Main St, Tulsa, OK 74101 |
| Email | The organization's email. Test-mode emails go here. | `you+org@example.com` |
| Test mode | On until go-live. | On |
| Website, Facebook page, Instagram | Optional links for the public organization page. | — |
| Logo | Image shown on the organization's pages and PDFs. | logo.png |
| Color family | The color theme for the organization's pages. | Blue |
| Subdomain | Optional web address label. People who create an account at `<subdomain>.<site address>` join this organization automatically. Lowercase, unique. | testorg |
| Participation agreement | The text every applicant agrees to. | The organization's participation agreement |
| Medical agreement | The text applicants who take medication agree to. | The organization's medical agreement |

### 1.2 Add the Org Admin (System Admin)

1. **People → Add person** with the Org Admin's name and email. A sign-in account is created for that email.
2. Give the person the **Org Admin** role in this organization.
3. They set their own password with **Forgot password?** on the sign-in page (or a System Admin sets one in **Edit person**).

The rest of Part 1 can be done by the Org Admin.

### 1.3 Medical conditions (Org Admin)

Add the conditions applicants choose from when they answer **Take medication?** Yes:

Diabetes, Asthma, High blood pressure, Heart condition, Seizure disorder, Other.

### 1.4 Worker roles (Org Admin)

| Worker role | Required document types | Required specializations | Used on |
|-------------|-------------------------|--------------------------|---------|
| Doctor | Board certification | Pediatrics | Trip A |
| Nurse | Nursing license | none | Trips A and B |
| General Helper | none | none | Trips A and B |

Check that the **Worker Roles** list shows "Board certification (Pediatrics)" for Doctor.

### 1.5 Organization email templates (Org Admin)

Organization templates send for both trips unless a trip has its own template for that email type (Trip B will, in step 1.9). Use **Copy from** to start from an existing template. Every template needs an **Email type**, **From email**, **To**, **Subject**, and **Email body**, and can use tokens.

| Function code | Email type | When it sends |
|---------------|------------|---------------|
| Send Now | Application started | A participant's application is first saved as Incomplete |
| Send Now | Application submitted | An application reaches Applied |
| Send Now | Application approved | Staff approve an application |
| Send Now | Donation received | Any donation is recorded for a participant |
| Send Now | Deposit received | A participant's donations first reach the trip deposit |
| Send Now | Payment complete | A participant's amount owed reaches $0 |
| Scheduled — Weekly (Tuesday) | Application incomplete | Participants with Incomplete applications |
| Scheduled — Weekly (Tuesday) | Deposit due | Approved participants who haven't reached the deposit |
| Scheduled — Weekly (Tuesday) | Payment due | Approved participants who still owe money |
| Scheduled — 5 days before trip start | Pre-departure | Approved participants, before the trip |
| Trip Participant | Trip team update | Available in **Email team** on the trip page |
| Person | Trip team update | Available in **Email people** on the People page |

Open **Preview** on each template and check that the tokens fill in.

### 1.6 Test people

Add these people from **People → Add person**, or have some create their own account on the organization's subdomain (that also tests 2.1). The **Profile setup** column is what each person enters on their own profile before applying.

| Person | Organization role | Profile setup | Trip A | Trip B |
|--------|-------------------|---------------|--------|--------|
| Leader Lee | Trip Leader | Complete profile | Primary leader | — |
| Leader Liz | Trip Leader | Complete profile | — | Primary leader |
| Nurse Nora | Trip Participant | Complete; Passport and Nursing license, both expiring after June 2027 | Nurse | General Helper |
| Doctor Dan | Trip Participant | Complete; Passport; Board certification **without** Pediatrics at first | Doctor | — |
| Helper Hank | Trip Participant | Complete; **no passport** at first | General Helper (then cancels) | General Helper |
| Teen Tim | Trip Participant | Complete; birthdate making him 16; Passport | — | General Helper |
| Pat Patel | Trip Participant | Complete; female; Take medication? Yes with Asthma; Passport; Nursing license | — | Nurse |
| Reserved Rita | (none; she creates her own account) | Complete; Passport | General Helper (reserved) | — |
| Other-Org Olive | Trip Participant in a **different** organization | — | — | — |

### 1.7 Trip A — Guatemala Hospital Ezel (Org Admin)

**Trips → Add trip**:

| Field | Value |
|-------|-------|
| Name | Guatemala Hospital Ezel |
| Location, city, country | Hospital Ezel, the hospital's city, Guatemala |
| Start and end dates | March 6, 2027 – March 13, 2027 |
| Description, image | A short description and a photo for the public trip page |
| Participant cost | $2,000 |
| Deposit | $300 |
| Require passport | On |
| Trip leaders / Primary trip leader | Leader Lee / Leader Lee |
| Status | Active |

**Team roles** (Team roles card on the trip page):

| Role | Number Needed | Reserved emails |
|------|---------------|-----------------|
| Doctor | 1 | — |
| Nurse | 1 | — |
| General Helper | 2 | Reserved Rita's email |

**Travel and cost options** (one choice per set):

| Set | Option | Price adjustment |
|-----|--------|------------------|
| 1 | Shared room | $0 |
| 1 | Private room | $250 |
| 2 | Return with the team | $0 |
| 2 | Antigua weekend extension (3 nights) | $400 |

### 1.8 Trip B — Guatemala Remote Clinic (Org Admin), by copying Trip A

1. **Trips → Copy**: **Trip to copy** Guatemala Hospital Ezel, **Name** Guatemala Remote Clinic.
2. Check that the copy has Trip A's leaders, passport setting, cost, deposit, role counts, and travel options, and **no** participants or donations (this is test 0.1 below).
3. **Edit** the copy:

| Field | Value |
|-------|-------|
| Location, city, country | The remote clinic, its town, Guatemala |
| Start and end dates | June 12, 2027 – June 19, 2027 |
| Description, image | A short description and a photo |
| Participant cost | $650 |
| Deposit | $100 |
| Require passport | On (kept from the copy) |
| Trip leaders / Primary trip leader | Leader Liz / Leader Liz (remove Leader Lee) |
| Status | Active |

**Team roles** (remove Doctor; change the counts):

| Role | Number Needed | Reserved emails |
|------|---------------|-----------------|
| Nurse | 1 | — |
| General Helper | 4 | — |

**Travel and cost options** (replace the copied ones):

| Set | Option | Price adjustment |
|-----|--------|------------------|
| 1 | Arrive with the team (Saturday) | $0 |
| 1 | Arrive a day early (Friday hotel night) | $75 |

### 1.9 Trip B's own email template (Org Admin)

Add a **Send Now** template for Trip B with email type **Application approved** and a subject that names the trip, for example "You're on the Guatemala Remote Clinic team!". Approvals on Trip B then use this template; approvals on Trip A still use the organization's.

---

## Part 2 — Test plan

Run the tests in order; later tests use the applications and donations created by earlier ones.

### 2.0 Trip setup

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 0.1 | After copying Trip A (step 1.8), open the copy before editing it. | Same leaders, passport setting, cost, deposit, role counts, and travel options; no participants or donations. | |
| 0.2 | On Trip A, try to lower General Helper's Number Needed to 0. | Refused: it can't go below the 1 reserved spot. | |
| 0.3 | Open the home page as the Org Admin. | Both trips show on the staff dashboard. | |

### 2.1 Organization and sign-up

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 1.1 | Open the organization's public page. | Name, logo, colors, and links show; both trips are listed. | |
| 1.2 | On the organization's subdomain, create Reserved Rita's account. | There is no organization picker; Rita is in this organization. | |
| 1.3 | Try to create another account with Rita's email. | "An account with this email already exists. Please log in instead." | |

### 2.2 Accounts and sign-in

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 2.1 | Sign in as each test person. | Each sees only the menus for their role. | |
| 2.2 | Enter a wrong password 5 times for Tim. | The account is locked for 15 minutes; the right password is refused until then. | |
| 2.3 | As Hank, use **Forgot password?**, open the emailed link, set a new password. | Sign-in works with the new password; the link can't be used again; other devices are signed out. | |
| 2.4 | As the Org Admin, open **Edit person** for Nora. | No password field; her sign-in email can't be changed ("Only a System Admin can change a login email."). | |
| 2.5 | Sign in as Nora on two browsers, then sign out on one. | The other browser stays signed in. | |

### 2.3 Profile and documents

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 3.1 | As Pat, answer **Take medication?** Yes. | The medical condition list shows this organization's conditions; at least one is required. | |
| 3.2 | As Nora, upload her Nursing license with a file, number, and dates. | Saved; the file can be viewed and downloaded. | |
| 3.3 | As Dan, open his Board certification and add a specialization. | Only Board certification's specializations are offered; each needs a date and file. (Don't add Pediatrics yet.) | |

### 2.4 Applying

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 4.1 | As Nora, apply to **Trip A** as Nurse: Private room, Return with the team, raise funds, preferred roommate Rita, "*Organization* arrange for and purchase my air travel" (ORD / ORD / Economy / American / No), agree and sign. | Status Applied. Emails: Application started and Application submitted. | |
| 4.2 | As Hank, apply to **Trip A**. | Nurse is not offered (filled by Nora). Choose General Helper. Stays Incomplete and names the missing passport. | |
| 4.3 | Check Trip A's **Team roles**. | General Helper: Needed 2, Signed up 1 (Hank), Reserved 1 (Rita), Available 0. | |
| 4.4 | As Hank, cancel the Trip A application, then uncancel it, then cancel it again. | Cancel frees the spot (Available 1); uncancel restores Incomplete; it ends Cancelled. | |
| 4.5 | As Dan, apply to **Trip A** as Doctor. | Stays Incomplete; names "Board certification (Pediatrics)". | |
| 4.6 | As Dan, add Pediatrics (date and file) to his Board certification, then reopen the application and save. | Status Applied. | |
| 4.7 | As Rita, apply to **Trip A**; choose "Arrange for and purchase my own air travel". | General Helper is chosen and locked ("This role is reserved for you."); Applied. | |
| 4.8 | As Hank, upload a passport (expiring after June 2027), then apply to **Trip B** as General Helper with "Arrive a day early". | Applied — the missing-passport block is gone. | |
| 4.9 | As Tim, apply to **Trip B**. | Adult signer is required: adult First name, Last name, Email, Relationship to participant, and "Adult electronic signature (full name)". Applied once filled. | |
| 4.10 | As Pat, apply to **Trip B** as Nurse. | "Are you pregnant?" is asked (Yes requires a due date); the medical agreement is shown and required. Applied once answered. | |
| 4.11 | As Nora, apply to **Trip B** as General Helper. | Applied. | |

### 2.5 Staff review

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 5.1 | As Leader Lee, open Trip A. | Nora, Dan, Rita, and Hank (Cancelled) are listed; profile and application open in readable dialogs. | |
| 5.2 | Open Trip A's **Trip Status** board. | Each applicant's status, what's missing, amount raised and owed (Nora owes $2,250: $2,000 + $250 private room), and options. | |
| 5.3 | As Leader Lee, approve Nora and Rita on Trip A. | Approved; each gets the **organization's** Application approved email. | |
| 5.4 | As Leader Lee, decline Dan. | Declined; Doctor shows Available 1 again. | |
| 5.5 | As Leader Liz, approve Hank, Tim, Pat, and Nora on Trip B. | Approved; each gets **Trip B's own** "You're on the Guatemala Remote Clinic team!" email. | |
| 5.6 | As Leader Lee, try to open Trip B's management pages; as Leader Liz, try Trip A's. | Neither leader can manage the other's trip. | |
| 5.7 | Download Nora's **Documents PDF** from Trip A. | One PDF with her passport, Nursing license, and uploaded files. | |
| 5.8 | Export the participant CSV for each trip. | Each lists only that trip's applicants. | |

### 2.6 My Trips (participant)

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 6.1 | Sign in as Nora. | Both trips listed, each with its own next steps (pay the deposit or donate toward the amount owed). Each trip page shows her own fundraising page link for that trip. | |
| 6.2 | Sign in as Hank. | Trip B with its next steps; Trip A shows as Cancelled with **Uncancel**. | |
| 6.3 | After 2.7, 2.8, and 2.9, sign in as Nora and open Trip A. | "You are all ready for the trip." | |

### 2.7 Donations

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 7.1 | Signed out, donate $100 to Nora on her **Trip A** fundraising page. | Recorded on Trip A only; Donation received email; Trip A raised $100. | |
| 7.2 | As the Org Admin, **Add donation** of $200 for Nora on Trip A. | Raised reaches the $300 deposit: Donation received and Deposit received emails. | |
| 7.3 | Add $1,950 for Nora on Trip A. | Payment complete email; Trip A owed $0. Her Trip B amounts are unchanged. | |
| 7.4 | Signed out, donate $100 to Hank on Trip B. | Deposit received for Trip B's $100 deposit. | |
| 7.5 | As Hank, **Donate** $10 to Tim from the Trip B page. | **Donate to** lists only Trip B's approved participants and leaders; the $10 is recorded for Tim. | |
| 7.6 | Add $625 for Hank on Trip B. | Payment complete ($650 + $75 early arrival = $725, all raised). | |
| 7.7 | Export donations and donors to CSV. | All test donations, each with its trip. | |

### 2.8 Rooming (Trip A)

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 8.1 | On Trip A's **Room list**, enter the team's hotel, check-in March 6, 2027; put Nora and Rita in room 101 (Double, 7 nights). | Nora's roommate preference (Rita) shows beside her; the assignment saves. | |
| 8.2 | Download the **Room list PDF**. | Room 101 with both names, passport details, arrival times, and emails. | |
| 8.3 | As Nora, open Trip A. | **My Trip Info** shows the hotel, room type, Rita as roommate, and check-in/check-out dates. | |

### 2.9 Flights (Trip A)

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 9.1 | On Trip A's **Flights**, enter Nora's flights (organization buys): arrival ORD→DFW→GUA on March 6, return GUA→DFW→ORD on March 13, cost $850, purchased. | Saved using the airport and airline lists. | |
| 9.2 | As Rita (buys her own), enter her flights from the Trip A page. | Saved; shown on the Flights page. | |
| 9.3 | Download Trip A's **Flights PDF**. | Nora's and Rita's itineraries. | |

### 2.10 Email

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 10.1 | Check the organization inbox after the tests above. | Every email arrived there, subject starting "[Test]", body naming the intended recipient. Trip B approvals used Trip B's template. | |
| 10.2 | **Email team** from Trip A to **All accepted participants**. | Sent for Nora and Rita only (to the organization email in test mode); logged. | |
| 10.3 | **Email people** from the People page for Trip B, General Helper. | Sent for Hank, Tim, and Nora. | |
| 10.4 | (Technical) In the server's `backend` folder, run `npm run send-scheduled-emails -- --dry-run --date=2027-03-01`. | Pre-departure for Trip A's approved participants (5 days before March 6). Nothing is sent. | |
| 10.5 | (Technical) Run the same with `--date=2027-03-02` (a Tuesday). | Weekly reminders for both trips: deposit due and payment due for Rita (Trip A) and Tim, Pat, and Nora (Trip B); none for Nora on Trip A or Hank on Trip B, who have paid. | |

### 2.11 Privacy and access

| # | Steps | Expected result | Result |
|---|-------|-----------------|--------|
| 11.1 | As Nora, view Trip A's team. | She can't see Rita's or Dan's personal or medical details. | |
| 11.2 | As Other-Org Olive, try to open either trip's management pages. | Not allowed. | |
| 11.3 | As the Org Admin, check another organization's people. | Not visible. | |
| 11.4 | As Leader Liz, open Pat's application on Trip B. | Pat's medical details and pregnancy answer are visible to Liz (trip staff). | |

---

## Part 3 — Go-live checklist

| # | Item | Done |
|---|------|------|
| 1 | All Part 2 tests pass, or failures are logged and accepted. | |
| 2 | Agreements, medical conditions, worker roles, and email templates have the final wording. | |
| 3 | Test applications are cancelled and test donations removed on both trips, so team counts and amounts raised start clean. | |
| 4 | Test people are removed or their roles taken away; Rita's reserved spot on Trip A is removed or replaced with a real email. | |
| 5 | Both trips' dates, cost, deposit, leaders, roles, and travel options are final. | |
| 6 | **Test mode** is turned off on the organization. | |
| 7 | One real email (for example, Application started) is confirmed to reach a real recipient. | |

**Sign-off**

| Tester | Date | Organization | Notes |
|--------|------|--------------|-------|
| | | | |
