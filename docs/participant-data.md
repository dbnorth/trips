# Participant Data — Profile and Trip Application

This page lists every piece of information the system keeps for a participant: what's on their **profile** (shared by every trip they apply to) and what's on each **trip application**. Labels match the screens.

**Columns:**
- **Required** means needed before an application can move from **Incomplete** to **Applied**. "Optional" fields can be left blank.
- **Encrypted** says whether the value is stored encrypted in the database (AES-256-GCM, Feature 64). Encrypted values are still shown normally to people allowed to see them, but someone reading the database directly sees only scrambled text. "On disk" means an uploaded file stored encrypted in the documents folder (Feature 63).

Only the participant, the Org Admins of organizations they belong to, the Trip Leaders of their trips, and System Admins can see this information. Teammates cannot.

---

## Part 1 — Profile

The participant fills in the profile from **Edit profile**. Admins can edit it from the **People** page.

### Name and contact

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| First name | Legal first name. | Yes | No |
| Middle name | Middle name. | Yes | No |
| Last name | Legal last name. | Yes | No |
| Preferred name | The name to use day to day, including any suffix such as "M.D." or "R.N.". Defaults to first + last name. | Optional | No |
| Email | Email address, also the sign-in email when the person has an account. Only the person or a System Admin can change a sign-in email. | Yes | No |
| Phone country code | Dialing code, for example +1. | Yes | No |
| Phone number | Main phone number. | Yes | Yes |

### Address

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Country | Country of residence. Defaults to United States. | Yes | No |
| Address line 1 | Street address. | Yes | Yes |
| Address line 2 | Apartment, suite, etc. | Optional | Yes |
| City | City. | Yes | Yes |
| State / province | State (a list for the US) or province. | Yes | Yes |
| Postal code | ZIP or postal code. | Yes | Yes |

### Personal

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Birthdate | Date of birth. Used to tell whether an adult must sign the agreement (under 18). | Yes | Yes |
| Gender | Male or Female. Female applicants answer the pregnancy question on each application. | Yes | No |
| Bio | A short description of the person. | Optional | No |
| Profile photo | Picture shown on the profile and on their public fundraising page. | Optional | No |

### Emergency contact

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Emergency contact name | Who to call in an emergency. | Yes | Yes |
| Emergency contact phone country code | Dialing code for the contact's phone. | Yes | No |
| Emergency contact phone | The contact's phone number. | Yes | Yes |
| Emergency contact relationship | Spouse, Father, Mother, Child, Grand Mother, Grand Father, or Other. | Yes | No |

### Church home

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Church name | The person's current church. | Yes | No |
| Church city | City of that church. | Yes | No |
| Church state/province | State or province of that church. | Yes | No |

### Health

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Have allergies? | Yes or No. | Optional | Yes |
| Allergies description | What they are allergic to and how serious it is. | Yes, when allergies is Yes | Yes |
| Take medication? | Yes or No. | Optional | Yes |
| Medical conditions | Conditions chosen from the organization's own list. The person's selections are encrypted; the organization's list of condition names is not. | At least one, when medication is Yes | Yes |

### Other languages

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Do you speak a language other than English? | Yes or No. | Optional | No |
| Language | Each other language spoken (one row per language). | At least one complete row, when Yes | No |
| Fluency | Basic or Conversational. | Yes, per row | No |
| Do you know medical terminology in this language? | Yes or No. | Yes, per row | No |

### Documents

Each document the person uploads (passport, license, certification, diploma, and so on). The document type decides which fields appear.

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Document type | Which kind of document, chosen from the system's list. Some types show instructions. | Yes | No |
| Country issued | Country that issued it. Defaults to United States. | — | No |
| Document number | For example the passport number. Shown only when the type requires it. | When the type requires it | Yes |
| Issue date | Date issued. | — | No |
| Expiration date | Date it expires. Hidden for types without an expiration (for example a diploma). | When the type has one | No |
| File | The uploaded scan or photo (image, HEIC, or PDF). The file name is not encrypted. | Every document needs a file before an application can be submitted | On disk |

**Specializations** (only for document types that allow them, for example a board certification):

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Specialization | Chosen from the document type's list, for example Pediatrics. Each once per document. | Yes, per row | No |
| Date | Date of the specialization. | Yes, per row | No |
| File | Its own uploaded certificate. The file name is not encrypted. | Yes, per row | On disk |

Whether a particular document or specialization is needed depends on the applicant's trip role and on whether the trip requires a passport. See "Trip roles, required documents, and specializations" in [system-overview.md](./system-overview.md).

### Account (people with a sign-in)

| Field | Description | Encrypted |
|-------|-------------|-----------|
| Password | Set by the person (at least 8 characters). Changed with **Change password** or **Forgot password?**. Only a System Admin can set someone else's password. | Hashed: stored one-way, so it can't be read back by anyone |
| System administrator | Yes/No, set only by a System Admin. | No |
| Organization roles | The organizations the person belongs to and their role in each (for example Trip Participant, Org Admin). | No |

---

## Part 2 — Trip application

One application per person per trip. The participant fills it in from **Apply** or **Update App**.

### Application questions

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Trip role | The job they will do on the trip (for example Nurse). Only roles with open spots are listed. A role reserved for them is chosen automatically and locked. | Yes | No |
| Health answers (shown, not edited) | Allergies, medication, medical conditions, and languages from the profile, shown as text with **Update profile**. | Comes from the profile | Stored on the profile (see Health above) |
| Are you pregnant? | Yes or No. Asked of female applicants only. | Yes, for female applicants | Yes |
| Due date | Expected due date. A doctor's travel clearance message is shown. | Yes, when pregnant | Yes |

### Funding

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| I will self-fund | They will pay their own costs. | At least one of the two | No |
| I will raise funds | They will fundraise (their public fundraising page is available once approved). | At least one of the two | No |

### Roommate preference

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| I have a preferred roommate | Checkbox. | Optional | No |
| Preferred roommate name(s) | Who they would like to room with. | Yes, when checked | No |

### Flight purchase

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Flight purchase | "Arrange for and purchase my own air travel" or "*Organization* arrange for and purchase my air travel". | Yes | No |
| Preferred departure airport | Airport they want to fly from. | When the organization buys | No |
| Preferred return airport | Airport they want to return to. | When the organization buys | No |
| Class of travel | Basic Economy, Economy, Premium Economy, Business, or First. | When the organization buys | No |
| Preferred airline | Airline they prefer. | When the organization buys | No |
| Refundable ticket | Yes or No. | When the organization buys | No |

### Travel options

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| Travel options | The trip's optional extras (for example a single room), grouped in sets. Each option shows its price adjustment, which is added to the participant's cost. | One choice per set | No |

### Agreements

| Field | Description | Required | Encrypted |
|-------|-------------|----------|-----------|
| I agree to the Participation agreement | Accepts the organization's participation agreement, shown on the application. The date is recorded. | Yes, when the organization has one | No |
| I agree to the medical agreement | Accepts the organization's medical agreement. Shown only when they take medication. The date is recorded. | Yes, when shown | No |
| Electronic signature (full name) | The participant types their full name to sign. Under 18: "Adult electronic signature (full name)". | Yes, when there is an agreement | No |
| Adult First name, Last name, Email, Relationship to participant | The adult signing for a participant under 18. | Yes, when under 18 | No |

### Status

| Field | Description | Encrypted |
|-------|-------------|-----------|
| Status | **Incomplete** (saved but something is missing), **Applied** (everything is in), **Approved**, **Declined**, or **Cancelled**. The system sets Incomplete and Applied; staff approve or decline. The participant or staff can cancel and uncancel. | No |

The application also checks, before **Applied**, that every profile document has a file, that the trip role's required documents and specializations are present and not expired before the trip ends, and that a valid passport is uploaded when the trip requires one.

---

## Part 3 — Added by staff after applying

| Data | Description | Where | Encrypted |
|------|-------------|-------|-----------|
| Participant cost | The participant's cost for the trip: the trip's cost unless a different cost is stored for this participant. | Shown on the trip page | No |
| Room assignment | Room number, room type (King, Double, or Triple), and number of nights. | Room list | No |
| Flight record | Whether purchased, ticket cost, and comments. | Flights page | No |
| Flight segments | Arrival and return segments: airline, flight number, from and to airports, departure and arrival date and time. Participants who buy their own ticket enter these themselves. | Flights page, or the participant's trip page | No |
| Donations | Donations credited to the participant, which make up "amount raised" and "amount owed". | Donations page, public donate page | No |

---

## Summary — what is encrypted

- **Profile:** phone number, address lines 1 and 2, city, state / province, postal code, birthdate, emergency contact name and phone number, allergies (yes/no and description), medication (yes/no), and medical conditions.
- **Documents:** document numbers in the database; every uploaded document and specialization file on disk.
- **Application:** the pregnancy answer and due date.
- **Passwords** are hashed rather than encrypted, so nobody can read them back.
- **Everything else** (names, email, gender, church, languages, document dates, the profile photo, and all other application and staff data) is stored as plain text.
