# Feature: Import Trip Master CSV

**Feature ID:** 80
**Branch pattern:** `feature/80-trip-master-import`
**Status:** Implemented
**Created:** 2026-10-24
**Input:** "write a spec to add an action on the trip list to import the data from the Trip Master CSV. Here is a sample trip master CSV with column headings (that don't exactly match our data but are close). ask questions as needed." Sample: `2027_TripMaster_Historical_Data_10-22-26.csv`.

Clarified with the requester:
- The import goes into an **existing trip**: an **Import** action on each Trips list row.
- No preview: the file is imported right away and a summary is shown afterwards.
- A row matches an existing person by **email plus first and last name**; otherwise a new person is created. Family members in the sample share one email.
- Existing people only get **blank fields filled**; nothing is overwritten.
- A **Position Required** with no matching worker role on the trip creates the role, sized to the number of rows with that position.
- **App Received** "X" → **approved**; blank → **incomplete**.
- The **Caregiver Waiting List** section is skipped; the **CANCELLATIONS** section is imported as **cancelled**.
- Also imported: passport, allergies, emergency contact, roommate, and trip options (from Travel Notes and Flight Fee, FR-022–FR-025). Not imported: deposit, funds received, Trip Fee, flight text, name tag, specialty, insurance date.
- Org Admins, System Admins, and the trip's **Trip Leaders** can import.
- Follow-up: "if the participant in the list creates an account in the future will it be linked to this person (email match)?" Today it isn't. **Create account** refuses any email that already belongs to a person (Feature 68), and **Forgot password?** only helps people who already have a login. The requester agreed to two changes:
  - The import stores emails trimmed and lower-cased.
  - **Create account** links to an imported person without a login, choosing by name when family members share an email (FR-017–FR-018).
- Follow-up: "add a standard trip email template that could be used to invite people to set up an account". Added as a seeded **Account invitation** Trip Participant template, sent from **Email team** (Feature 46). Its new **Create account link** token opens **Create account** with the participant's email and name filled in (FR-019–FR-021).
- Follow-up: "update to use the trip notes column to select trip options if there is text that matches the option description. Use the Flight fee column to select the trip option for HTI Purchases flight (value > 0)". Clarified with the requester (FR-022–FR-025):
  - A Travel Notes value matches an option when any significant word matches. In the sample, "HTI - Fri Barceló - Antigua" picks the option "Arrive Friday -Barceló Bar".
  - Flight Fee is HTI's fee for buying the flight, which the flight option's price adjustment already holds ($40). A Flight Fee above $0 selects the flight option, recognized by "flight" or "air" in its description. It still marks the flight booked by the organization, but is no longer saved as the flight cost.
  - "Don't import the participant cost from the CSV. Just set the option and that is it. The trip cost is in the trip and the options are set for add-on costs." **Trip Fee** is no longer imported. The participant cost comes from the trip's cost and the selected options, as when applying (Feature 6).

**Depends on:**
- [Feature 1 — User Authentication](feature-1-user-authentication.md)
- [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md)
- [Feature 6 — Worker Roles and Travel Options](feature-6-worker-roles-and-travel-options.md)
- [Feature 7 — Trip Applications and Participants](feature-7-trip-applications-and-participants.md)
- [Feature 22 — Document Number and Instructions](feature-22-document-number-and-instructions.md)
- [Feature 26 — Role Capacity and Cancel](feature-26-role-capacity-and-cancel.md)
- [Feature 30 — Participant Flights](feature-30-participant-flights.md)
- [Feature 39 — Email Types and Organization Email Templates](feature-39-email-types-and-templates.md)
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md) (primary trip leader, tokens)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md)
- [Feature 64 — Encrypt Personal Data Columns](feature-64-encrypt-personal-data-columns.md)
- [Feature 68 — Add Person Existing Email](feature-68-add-person-existing-email.md)
- [Feature 77 — HTML Emails, Rich Text Editor, and Picture Library](feature-77-html-email-pictures.md) (HTML template bodies and links)

---

## The Trip Master CSV

The file has a title row, then a **two-row header**: each column's name is its first header-row text joined with its second header-row text, e.g. "Position Required" + "In Yellow", "First" + "Name". Names are compared ignoring case, extra spaces, and the trailing words noted below. Columns are found by name, not position. Column names may differ slightly from the sample; the import uses the names below.

| Column (as in the sample) | Imported to | Rule |
|---|---|---|
| **Position Required** (In Yellow) | Worker role (FR-006) | "Team Leader" → Trip Leader (FR-007) |
| **Volunteer #s** | — | Ignored |
| **App Received** | Application status | "X" → approved, blank → incomplete (FR-008) |
| **E-Mail** | `person.email` | Matching (FR-004) |
| **First Name**, **Middle Name**, **Last Name** | `person.firstName`, `middleName`, `lastName` | Trimmed |
| **Date of Birth** | `person.birthDate` | FR-011 |
| **Age** | — | Ignored (computed) |
| **Phone # Cell** | `person.phoneContryCode`, `phoneNumber` | FR-012 |
| **Travel Notes** | Trip options (`tripPeopleRoleOption`) | FR-023 |
| **Flight Departure**, **Flight Arrival**, **Flight Confirmation**, **Departure City**, **Arrival City** | — | Ignored |
| **Roommate** | `tripPeopleRole.hasPreferredRoommate`, `preferredRoommateNames` | Blank or "None" → not set |
| **Do you Have a Name Tag**, **Name Tag** | — | Ignored |
| **Gender** | `person.gender` | Male / Female (any case) → `male` / `female`; otherwise not set |
| **Address**, **City**, **State**, **Zip** | `person.addLine1`, `city`, `state_prov`, `postalCode` | Zip kept as text (leading zeros); `country` "US" when any address part is given |
| **Emergency Contact** (Name, Address, Phone #) | `person.emergencyContactName`, `emergencyContactPhoneCountryCode`, `emergencyContactPhoneNumber` | FR-013 |
| **Specialty** | — | Ignored |
| **Allergies** | `person.hasAllergies`, `allergiesDescription` | FR-014 |
| **Church Affiliation** | `person.currentChurchHome` | Blank or "N/A" → not set |
| **Passport Number**, **Passport Exp. Date** | Passport `personDocument` | FR-015 |
| **Deposit Amount** | — | Ignored |
| **Flight Fee** | The flight trip option, `tripPeopleRole.flightPurchaseOption` | FR-016, FR-024 |
| **Trip Fee**, **Total Due**, **Funds Received**, **Total Balance Due**, **Ins Date Obtained** | — | Ignored |

**Sections.** Rows are read top to bottom.
- **Main section:** from the first data row up to the first row whose **Position Required** is "Total".
- **Waiting list:** from a row whose **Position Required** starts with "Caregiver Waiting List", or any other value ending in "Waiting List". The section heading row itself can hold a name. These rows are skipped, up to the next section heading.
- **Cancellations:** from a row whose **Position Required** is "CANCELLATIONS" to the end. In the sample these rows leave **Position Required** blank.

---

## User Stories

### US-80.1: Import a Trip Master CSV into a trip
**As** an Org Admin, System Admin, or Trip Leader  
**I want** to import a trip's Trip Master spreadsheet from the Trips list  
**So that** its people and applications don't have to be typed in by hand

**Priority:** P1  
**Independent test:** On the Trips list, **Import** on "Guatemala Clinic 2027", choose the Trip Master CSV → the summary reads "Imported 4 rows: 3 people added, 1 updated, 2 skipped." and View Trip lists the participants with their roles and statuses  
**Acceptance scenarios:** see ### US-80.1

### US-80.2: Reuse people who already exist
**As** trip staff  
**I want** rows matched to existing people, with only their blank details filled in  
**So that** the import doesn't create duplicates or overwrite what people entered themselves

**Priority:** P1  
**Independent test:** Ana Lopez (ana@example.org) already exists with a phone number → importing her row keeps her phone number, fills her blank birth date, and adds her to the trip  
**Acceptance scenarios:** see ### US-80.2

### US-80.3: Positions become the trip's worker roles
**As** trip staff  
**I want** each Position Required to become one of the trip's worker roles  
**So that** imported participants hold the right roles and the trip shows how many of each are needed

**Priority:** P1  
**Independent test:** The file has three "RN Circulator" rows (one empty) and the trip has no such role → the trip gets an "RN Circulator" role needing 3, and both named people hold it  
**Acceptance scenarios:** see ### US-80.3

### US-80.4: Import passports, allergies, emergency contacts, and roommates
**As** trip staff  
**I want** the spreadsheet's passport, allergies, emergency contact, and roommate columns imported  
**So that** the trip's records match the spreadsheet

**Priority:** P2  
**Independent test:** A row with passport 581459085 expiring 2/21/29, allergies "Amoxicillin", emergency contact "Nathan Lowry (937)570-6904", and roommate "Alena Lowry" → all appear on the person and application  
**Acceptance scenarios:** see ### US-80.4

### US-80.7: Travel Notes and Flight Fee select trip options
**As** trip staff  
**I want** the Travel Notes and Flight Fee columns to select each participant's trip options  
**So that** add-on costs, such as arriving Friday or HTI buying the flight, are on their applications

**Priority:** P2  
**Independent test:** The trip costs $950 and has the options "Arrive Friday - Barceló Bar" ($75), "Arrive Saturday", and "HTI Purchase Flights" ($40). Lyle's row has Travel Notes "HTI - Fri Barceló - Antigua" and Flight Fee $40.00 → his application has Arrive Friday and HTI Purchase Flights selected, participant cost 1065, and its flight booked by the organization  
**Acceptance scenarios:** see ### US-80.7

### US-80.5: Imported participants create their own accounts
**As** an imported participant  
**I want** **Create account** with my email to give me my imported profile and trips  
**So that** I see my trip in My Trips without staff re-entering me

**Priority:** P1  
**Independent test:** After the import, Lyle creates an account with lyle@example.org → he is signed in and My Trips lists "Guatemala Clinic 2027" as approved  
**Acceptance scenarios:** see ### US-80.5

### US-80.6: Invite people to create an account
**As** trip staff  
**I want** a standard trip email that invites participants to create their account  
**So that** imported people know to sign up, with the email that links them to their trip

**Priority:** P2  
**Independent test:** On **Email team**, choose the **Account invitation** template and send it to Lyle Lowry → his email has a **Create your account** link that opens **Create account** with lyle@example.org, Lyle, and Lowry filled in  
**Acceptance scenarios:** see ### US-80.6

---

## Requirements

### Functional Requirements

**Import action**

- **FR-001**: Each Trips list row has an **Import** action, next to **Status** and **Flights**. It opens the **Import Trip Master CSV** dialog: a CSV file picker, **Import**, and **Close**.
- **FR-002**: Org Admins of the trip's organization, System Admins, and approved Trip Leaders of the trip can import. Others get `403` "Forbidden.".
- **FR-003**: The file must be a CSV of up to 5 MB with the **First Name**, **Last Name**, **E-Mail**, and **Position Required** columns. Otherwise nothing is imported, and the dialog shows "This file isn't a Trip Master CSV. Missing columns: <names>." (missing names in that order) or "Choose a CSV file up to 5 MB.". The import runs in one transaction: an unexpected error saves nothing.

**People**

- **FR-004**: A row needs a first and last name; rows without both are skipped silently (empty slots, the "Total" row). A row with an email matches the person with the same email, first name, and last name (ignoring case and extra spaces). A row without an email matches a person already on the trip with the same first and last name. Otherwise a new person is created. Two rows that share an email but have different names (family members) become two people.
- **FR-005**: For a matched person, each field from the file is saved only when the person's field is blank. A field the file leaves blank, or that can't be read (FR-011–FR-014), is not saved. A new person gets every readable field. No user account is created and no email is sent. A person not yet in the trip's organization is added to it as a **Trip Participant**, as applying does (Feature 7).

**Roles and applications**

- **FR-006**: **Position Required** (trimmed) matches a trip worker role whose name is the same, ignoring case. If there's no match, the organization's worker role with that name is added to the trip; if the organization has none, one is created. A role's **quantity** becomes the number of main-section rows with that position, counting empty slots, unless it's already higher. Main-section rows with a person but no position get no worker role. The import doesn't enforce capacity (Feature 26).
- **FR-007**: A main-section row whose **Position Required** is "Team Leader" adds the person as an approved **Trip Leader** of the trip, with no worker role. They become the primary trip leader when the trip has none (Feature 40). They also get the organization's **Trip Leader** role when they don't have it, so editing the trip keeps them as a leader.
- **FR-008**: Any other main-section row adds the person as a **Trip Participant** on the trip: **approved** when **App Received** is "X" (any case), otherwise **incomplete**. Cancellations-section rows are added as **cancelled**. They get a worker role only when **Position Required** matches an existing trip role, and never create or resize roles.
- **FR-009**: When the person already has an application on the trip, no second one is added. Its status and role are unchanged, and its blank fields are filled (FR-005). Re-importing the same file therefore adds nothing new.

**Summary**

- **FR-010**: After the import, the dialog shows "Imported N rows: A people added, U updated, S skipped.". Rows with a name count; each is added (new person), updated (existing person), or skipped. Then comes a list of each skipped row and each row with an unread value, by spreadsheet row number and name, e.g. "Row 12 — Bailey Forte: date of birth "13/45/99" wasn't read." Skipped reasons: "On the waiting list." Closing the dialog after an import reloads the Trips list.

**Reading values**

- **FR-011**: Dates may be `M/D/YY`, `M/D/YYYY`, or `MM-DD-YYYY`. For a birth date, a two-digit year is 20YY when that's not after the current year, otherwise 19YY (`8/4/08` → 2008-08-04, `8/7/65` → 1965-08-07). For a passport expiration, a two-digit year is always 20YY.
- **FR-012**: A phone number with 10 digits (ignoring other characters) saves as country code "1" and those 10 digits. Eleven digits starting with 1 save the same way, without the leading 1. Anything else is not read.
- **FR-013**: The emergency contact's phone is the last run of characters that holds 10 digits (FR-012). Its name is the text before that phone, trimmed of spaces and a trailing comma: "Nathan Lowry (937)570-6904" → "Nathan Lowry", "1", "9375706904". With no phone, the whole text is the name. The relationship is left blank.
- **FR-014**: Allergies "None", "No", "N/A", or "NA" (any case) → **Have allergies?** No. Other text → Yes, with the text as the description. Blank → not set.
- **FR-015**: A passport number adds a document of the first **Passport**-type document type (lowest id) with that number and expiration date (FR-011), and no file. It's skipped when the person already has a passport-type document, or when there's no Passport document type. In that case the summary says "Row N — Name: no Passport document type, so the passport wasn't imported."
- **FR-016**: Money like "$40.00", "40", or "$0.00" is read as a number. A **Flight Fee** above $0 sets the application's flight to **booked by the organization** (Feature 30) when its flight purchase option is blank. The flight's **cost** is not set: the Flight Fee is the organization's fee for buying the flight, charged through the flight trip option (FR-024). **Trip Fee** is not imported (FR-025).

**Accounts for imported people**

- **FR-017**: The import saves emails trimmed and lower-cased (`Urvashi.Singh@Example.org` → `urvashi.singh@example.org`), and matches them that way (FR-004).
- **FR-018**: **Create account**, including the apply flow, still refuses an email that belongs to a user (`409` "An account with this email already exists. Please log in instead.", Feature 68). When no user has the email, it no longer refuses an email that belongs only to people without a login. Instead the new login is linked to one of them:
  1. The person with that email whose first and last name match the ones entered (ignoring case and extra spaces).
  2. Otherwise, when exactly one person has that email, that person.
  3. Otherwise (family members share the email and none has the entered name), a new person, as today.

  A linked person keeps their profile, applications, and documents. Their first, middle, last, and preferred names become the ones entered, as when an account is created today. **Add person** (Feature 68) is unchanged. This replaces Feature 68's scenario "Creating an account with the email of a person without a login is refused"; its test is removed.

**Account invitation email**

- **FR-019**: A new seeded token **`CREATE_ACCOUNT_LINK`** has value source `participant.createAccountLink`, labelled "Participant create account link" (Feature 40). It's available wherever participant tokens are. Its value uses the app address (`APP_URL`, as password reset links do; default `http://localhost:8082`):
  - For a participant (or, in a Person template, the person) who has no login, the value is `<APP_URL>/?create=1&email=<email>&firstName=<first name>&lastName=<last name>`. Each value is URL-encoded, and a blank email is left out.
  - For someone who has a login, it's `<APP_URL>/`, the sign-in page.
  - With no person, it's blank.
- **FR-020**: The sign-in page opened with `create=1` shows **Create account** instead of signing in. Its **Email**, **First name**, and **Last name** fields are filled from `email`, `firstName`, and `lastName`, and stay editable. **Preferred name** defaults from the names as usual. Without `create=1` the page is unchanged. Creating the account then follows FR-018, so the filled-in name picks the right person when family members share an email.
- **FR-021**: The email type seed adds **`account-invite`** ("Account invitation", event code `team-email`, which nothing sends automatically). The template seed adds an **Account invitation** template for the seed organization, used from **Email team** (Feature 46):
  - Function code **Trip Participant**, From `{{ORG_EMAIL}}`, To `{{PARTICIPANT_EMAIL}}`.
  - Subject "Create your account for {{TRIP_NAME}}".
  - HTML body (Feature 77):

  ```html
  <p>Hi {{PARTICIPANT_FIRST_NAME}},</p>
  <p>You're on the team for {{TRIP_NAME}} in {{TRIP_LOCATION}}, {{TRIP_START_DATE}} to {{TRIP_END_DATE}}. Please create your {{ORG_NAME}} account so you can see your trip, finish your application, and keep your details up to date.</p>
  <p><a href="{{CREATE_ACCOUNT_LINK}}">Create your account</a></p>
  <p>Please use this email address, {{PARTICIPANT_EMAIL}}, so your account is linked to your trip. If you already have an account, the link takes you to sign in.</p>
  <p>If you have questions, contact your trip leader, {{LEADER_FIRST_NAME}} {{LEADER_LAST_NAME}}, at {{LEADER_EMAIL}}.</p>
  <p>Blessings,<br>{{ORG_NAME}}<br>{{ORG_WEBSITE}}</p>
  ```

  As with the other seeds, `npm run seed` adds the type, token, and template when they are missing and changes nothing that exists. Staff send it from **Email team**, choosing **Selected participants** or **All potential participants**. All potential participants includes imported people who are incomplete.

**Trip options**

- **FR-022**: The import selects trip options (Feature 6) on each row's application, from **Travel Notes** (FR-023) and **Flight Fee** (FR-024). As when applying, at most one option per **Trip Option N** set is selected. A set that already has a selected option on the application is left alone, so re-importing changes nothing and choices a participant made aren't overwritten. An option that would give the application a second selected option with days before (or after) the trip is not selected (Feature 78). The summary then says "Row N — Name: trip option "<description>" wasn't selected: <the Feature 78 message>".
- **FR-023**: Words are compared ignoring case and accents ("Barcelo" = "Barceló"), and are split at anything that isn't a letter or digit. An option's **keywords** are the words of three or more characters in its description that appear in no other option description on the trip. "HTI" in "HTI Name Tag" and "HTI Purchase Flights", or "Arrive" in "Arrive Friday" and "Arrive Saturday", are therefore not keywords. A Travel Notes word of three or more characters matches a keyword that starts with it ("Fri" matches "Friday"). In each set, the option with the most matched keywords is selected. When several options tie, none in that set is selected, and the summary says "Row N — Name: travel notes "<notes>" match more than one option in Trip Option <N>." The flight options (FR-024) are never selected from Travel Notes.
- **FR-024**: A **flight option** is a trip option with a word starting with "flight" or "air" in its description ("HTI Purchase Flights", "HTI arrange for air travel"). A **Flight Fee** above $0 selects the trip's first flight option (lowest set, then lowest id). A Flight Fee of $0, blank, or unread selects none. A trip without a flight option has none selected; FR-016 still applies.
- **FR-025**: **Trip Fee** isn't imported. When the import selects options on an application, its **participant cost** becomes its current participant cost (or, when blank, the trip's participant cost) plus the price adjustments of the options the import selected. This matches applying, where the stored participant cost includes the selected options (Feature 6). An application with no options selected by the import keeps its participant cost, so a blank cost still shows the trip's cost.

---

## Assumptions

- The sample's real personal data is not committed. Tests use a small made-up CSV in the same layout.
- Imported people have US addresses and phone numbers. Other countries can be fixed by hand afterwards.
- The Trip Master file describes one trip. The trip's dates, cost, and travel options are not read from it.
- Staff add the trip's options before importing, with descriptions whose words appear in the Travel Notes ("Arrive Friday - Barceló Bar" for "Fri Barceló"). The import never creates options.
- Flight text and name tags have no place in our data and are ignored.

## Edge Cases

- The same person appears twice in the main section (e.g. Jack Lawler as a Caregiver and on the waiting list) → the main-section row wins; the waiting-list row is skipped.
- A person appears in the main section and in cancellations → the first row adds the application, and the later row only fills blanks (FR-009). Their status stays as the first row set it.
- A position's rows are all empty slots → the role is still created or sized (FR-006), with no participants.
- Names with extra spaces ("Andrea  ") are trimmed before matching and saving.
- Family members who share an email: only the first to create an account gets that email as a login, because a login email belongs to one user. The others need staff to give them their own email (**Edit person**) before creating an account.
- A value in a free-text field holds a line break (e.g. emergency contacts ending in a newline) → trimmed.
- An invitation sent to Kris Smith, who shares Ana's email, goes to ana@example.org with Kris's name in the link, so creating the account from it links to Kris (FR-018, FR-020).
- An invitation sent after the person has created an account links to sign-in (FR-019).
- Travel Notes words that match no keyword, such as "Antigua" or "Room w/Alena Lowry", are ignored silently. Only ties are noted (FR-023).
- A one-option set, such as "HTI Name Tag", is selected only when the notes match one of its keywords ("Tag"). "HTI" alone doesn't select it, because "HTI" is in other options too.
- A trip with no options selects none, and the import's participant costs stay blank (FR-025).
- A participant who later edits their application can change the imported options as usual (Feature 7).

## Success Criteria

- **SC-001**: Importing the sample file into an empty trip adds every main-section person and cancellation with the right role and status, in one step.
- **SC-002**: Importing the same file twice gives the same trip as importing it once.
- **SC-003**: No existing person's non-blank field changes.
- **SC-004**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

Only trip staff (FR-002) can import into a trip. People are matched across the whole system by email and name (FR-004), since a person can belong to several organizations. The summary lists only names and row numbers from the uploaded file. The uploaded file is read in memory and not stored. The create account link (FR-019) carries no secret. It only fills in the form, and creating the account still follows FR-018.

---

## Key Entities

No schema change. Writes `person`, `orgPeopleRole`, `personDocument`, `workerRole`, `tripWorkerRole`, `tripPeopleRole`, and `tripPeopleRoleOption` (selected trip options, FR-022). Reads `tripTravelOption`. The seeds add an `emailType`, an `emailToken`, and an `emailTemplate` row (FR-021).

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `POST` | `/trips/register` | none | `409` only when a user has the email; otherwise links to an existing person without a login per FR-018, or creates one as today |
| `POST` | `/trips/trips/:id/import-trip-master` | auth (FR-002) | Multipart field `file` (CSV, ≤ 5 MB). `200` `{ rowCount, added, updated, skipped, notes: [{ row, name, message }] }`. `400` with the FR-003 message; `403` "Forbidden."; `404` "Trip not found." |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Trips** list (`TripsList`) | **Import** action on each row, for the users in FR-002 |
| **Import Trip Master CSV** dialog (`ImportTripMasterDialog`, new) | File picker, **Import**, the FR-003 error, the FR-010 summary and notes, **Close** |
| Sign-in page (`Login`) | `?create=1&email=…&firstName=…&lastName=…` opens **Create account** filled in (FR-020) |

---

## Data Model Requirements

No schema change. Seed data only (FR-021):
- `backend/app/scripts/seedEmailTypes.js`: `account-invite`.
- `backend/app/scripts/seedEmailTokens.js`: `CREATE_ACCOUNT_LINK` → `participant.createAccountLink`.
- `backend/app/data/emailTemplates.json`: the **Account invitation** template.

---

## Acceptance Criteria (Gherkin)

Background: Org Admin Omar runs "Hope Missions" with trip "Guatemala Clinic 2027", participant cost $950. The trip has the worker role "General Surgeon" (quantity 1) and these trip options: Trip Option 1 "HTI Name Tag" ($0); Trip Option 2 "Arrive Friday - Barceló Bar" ($75) and "Arrive Saturday" ($0); Trip Option 3 "HTI Purchase Flights" ($40). A Passport document type exists. Ana Lopez (ana@example.org) already exists, with phone 6155550100 and no birth date. Trip Leader Tom leads the trip; Pat is a Trip Participant on another trip. The test file `trip-master-sample.csv` has the Trip Master layout: a title row, the two header rows, then these rows (spreadsheet rows 4–16):
- Main section (rows 4–9, then "Total" on row 10 and two blank rows):
  - General Surgeon #1: Lyle Lowry, X, lyle@example.org, born 8/7/65, phone (937)570-1507, Male, 1940 Barnhart Road, Troy, OH, 45373; emergency contact "Nathan Lowry (937)570-6904"; allergies Amoxicillin; church "Mid-County church of Christ"; passport 581459085, expiring 2/21/29; roommate "Alena Lowry"; Travel Notes "HTI - Fri Barceló - Antigua"; Trip Fee $1,175.00; Flight Fee $40.00.
  - General Surgeon #2: an empty slot.
  - RN Circulator #3: Ana Lopez, X, ana@example.org, born 1/21/76, phone (406)224-3273, allergies None; Travel Notes "SP - Sat - Antigua"; Flight Fee $0.00.
  - RN Circulator #4: Kris Smith, blank App Received, ana@example.org (shared email).
  - RN Circulator #5: an empty slot.
  - Team Leader: Rick Harper, no email.
- Row 13: Caregiver Waiting List: Jack Lawler. Row 14 is blank.
- Row 15: CANCELLATIONS. Row 16: Andrea Fletcher, X, andrea@example.org, Travel Notes "Fri or Sat".

### US-80.1 — Import a Trip Master CSV into a trip

#### Scenario: Import adds people and applications
* **When** Omar imports `trip-master-sample.csv` into "Guatemala Clinic 2027"
* **Then** the response is `rowCount` 6, `added` 4, `updated` 1, `skipped` 1, with the notes "Row 13 — Jack Lawler: On the waiting list." and "Row 16 — Andrea Fletcher: travel notes "Fri or Sat" match more than one option in Trip Option 2."
* **And** Lyle Lowry and Ana Lopez are approved, Kris Smith is incomplete, and Andrea Fletcher is cancelled, all as Trip Participants
* **And** Rick Harper is an approved Trip Leader and the primary trip leader, with Hope Missions' Trip Leader role
* **And** Lyle, Kris, Rick, and Andrea are in Hope Missions as Trip Participants
* **And** no email is sent

#### Scenario: A file that isn't a Trip Master CSV is refused
* **When** Omar imports a CSV whose header has no "Position Required" or "E-Mail" column
* **Then** the response is `400` "This file isn't a Trip Master CSV. Missing columns: E-Mail, Position Required."
* **And** nothing is saved

#### Scenario: Who can import
* **Then** Trip Leader Tom can import into the trip
* **And** Pat gets `403` "Forbidden."

#### Scenario: Trips list imports a Trip Master CSV
* **Given** the import returns `rowCount` 6, `added` 4, `updated` 1, `skipped` 1 and the waiting-list note
* **When** Omar clicks **Import** on "Guatemala Clinic 2027", chooses the file, and clicks **Import**
* **Then** the dialog shows "Imported 6 rows: 4 people added, 1 updated, 1 skipped." and "Row 13 — Jack Lawler: On the waiting list."
* **And** an import refused with "This file isn't a Trip Master CSV. Missing columns: E-Mail." shows that message

### US-80.2 — Reuse people who already exist

#### Scenario: An existing person only gets blank fields filled
* **When** Omar imports the file
* **Then** Ana Lopez is the same person as before, her phone number is still 6155550100, and her birth date is 1976-01-21
* **And** her allergies are saved as **Have allergies?** No
* **And** Kris Smith, who shares Ana's email, is a new person

#### Scenario: Importing again adds nothing new
* **When** Omar imports the file a second time
* **Then** the response is `added` 0, `updated` 5, `skipped` 1
* **And** the trip still has one application each for Lyle, Ana, Kris, Rick, and Andrea
* **And** the same trip options are selected, and Lyle's participant cost is still 1065

### US-80.3 — Positions become the trip's worker roles

#### Scenario: Positions match or create worker roles
* **When** Omar imports the file
* **Then** the trip's "General Surgeon" role has quantity 2, and Lyle holds it
* **And** the trip has a new "RN Circulator" role with quantity 3, held by Ana and Kris
* **And** Rick and Andrea have no worker role

### US-80.4 — Import passports, allergies, emergency contacts, and roommates

#### Scenario: Extra columns are imported
* **When** Omar imports the file
* **Then** Lyle's birth date is 1965-08-07, his phone is "1" / "9375701507", and he is male with address 1940 Barnhart Road, Troy, OH, 45373, US
* **And** his emergency contact is "Nathan Lowry", "1", "9375706904"
* **And** he has allergies "Amoxicillin" and church "Mid-County church of Christ"
* **And** he has a Passport document 581459085 expiring 2029-02-21
* **And** his application has preferred roommate "Alena Lowry"

### US-80.5 — Imported participants create their own accounts

#### Scenario: Create account links to the imported person
* **Given** Omar imported the file
* **When** Lyle creates an account with " Lyle@Example.org ", first name "Lyle", last name "Lowry"
* **Then** he is signed in, and his login is linked to the imported Lyle Lowry with the same birth date and passport
* **And** My Trips lists "Guatemala Clinic 2027" as approved

#### Scenario: Shared email links by name
* **Given** Omar imported the file, so Ana Lopez and Kris Smith share ana@example.org, and Ana has no login
* **When** Kris creates an account with ana@example.org, first name "Kris", last name "Smith"
* **Then** the login is linked to the imported Kris Smith, and Ana Lopez still has no login
* **And** when someone creates an account with ana@example.org named "Jo Smith", it is refused because a user now has that email

#### Scenario: Shared email with no matching name creates a new person
* **Given** two people without a login share fam@example.org: Sam Reed and Lee Reed
* **When** someone creates an account with fam@example.org named "Max Reed"
* **Then** a new person Max Reed is created with the login, and Sam and Lee are unchanged

### US-80.6 — Invite people to create an account

#### Scenario: Seed adds the account invitation template
* **When** the email type, token, and template seeds run
* **Then** the email type `account-invite` and the token `CREATE_ACCOUNT_LINK` (`participant.createAccountLink`) exist
* **And** the seed organization has a **Trip Participant** template of type `account-invite` with subject "Create your account for {{TRIP_NAME}}" and a body linking to `{{CREATE_ACCOUNT_LINK}}`
* **And** running the seeds again adds nothing

#### Scenario: Email team sends the invitation with a create account link
* **Given** Omar imported the file, `APP_URL` is `http://localhost:8082`, and Hope Missions has the seeded **Account invitation** template
* **When** Omar sends it from **Email team** to the selected participants Lyle Lowry and Tom
* **Then** Lyle's email has the subject "Create your account for Guatemala Clinic 2027" and the link `http://localhost:8082/?create=1&email=lyle%40example.org&firstName=Lyle&lastName=Lowry`, labelled "Create your account"
* **And** Tom, who has a login, gets the link `http://localhost:8082/`

#### Scenario: Invitation link opens Create account filled in
* **When** the sign-in page opens with `?create=1&email=lyle%40example.org&firstName=Lyle&lastName=Lowry`
* **Then** it shows **Create account** with Email "lyle@example.org", First name "Lyle", and Last name "Lowry"
* **And** without `create=1` it shows the sign-in form

### US-80.7 — Travel Notes and Flight Fee select trip options

#### Scenario: Travel Notes and Flight Fee select trip options
* **When** Omar imports the file
* **Then** Lyle's application has "Arrive Friday - Barceló Bar" and "HTI Purchase Flights" selected, participant cost 1065, and its flight booked by the organization, with no flight cost saved
* **And** Ana's application has "Arrive Saturday" selected and participant cost 950
* **And** Andrea's and Kris's applications have no option selected and a blank participant cost
* **And** nobody has "HTI Name Tag" selected

#### Scenario: Options already chosen are kept
* **Given** Ana Lopez already applied to the trip with "Arrive Friday - Barceló Bar" selected and participant cost 1025
* **When** Omar imports the file
* **Then** Ana's application still has only "Arrive Friday - Barceló Bar" selected, and her participant cost is still 1025

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-80.1 | Import adds people and applications | `backend/tests/trip-master-import.test.js` | `Import adds people and applications` |
| US-80.1 | A file that isn't a Trip Master CSV is refused | `backend/tests/trip-master-import.test.js` | `A file that isn't a Trip Master CSV is refused` |
| US-80.1 | Who can import | `backend/tests/trip-master-import.test.js` | `Who can import` |
| US-80.1 | Trips list imports a Trip Master CSV | `frontend/tests/ImportTripMasterDialog.test.js` | `Trips list imports a Trip Master CSV` |
| US-80.2 | An existing person only gets blank fields filled | `backend/tests/trip-master-import.test.js` | `An existing person only gets blank fields filled` |
| US-80.2 | Importing again adds nothing new | `backend/tests/trip-master-import.test.js` | `Importing again adds nothing new` |
| US-80.3 | Positions match or create worker roles | `backend/tests/trip-master-import.test.js` | `Positions match or create worker roles` |
| US-80.4 | Extra columns are imported | `backend/tests/trip-master-import.test.js` | `Extra columns are imported` |
| US-80.5 | Create account links to the imported person | `backend/tests/trip-master-import.test.js` | `Create account links to the imported person` |
| US-80.5 | Shared email links by name | `backend/tests/trip-master-import.test.js` | `Shared email links by name` |
| US-80.5 | Shared email with no matching name creates a new person | `backend/tests/trip-master-import.test.js` | `Shared email with no matching name creates a new person` |
| US-80.6 | Seed adds the account invitation template | `backend/tests/trip-master-import.test.js` | `Seed adds the account invitation template` |
| US-80.6 | Email team sends the invitation with a create account link | `backend/tests/trip-master-import.test.js` | `Email team sends the invitation with a create account link` |
| US-80.6 | Invitation link opens Create account filled in | `frontend/tests/Login.test.js` | `Invitation link opens Create account filled in` |
| US-80.7 | Travel Notes and Flight Fee select trip options | `backend/tests/trip-master-import.test.js` | `Travel Notes and Flight Fee select trip options` |
| US-80.7 | Options already chosen are kept | `backend/tests/trip-master-import.test.js` | `Options already chosen are kept` |

---

## Agent implementation request

```text
Implement Feature 80 from @features/feature-80-trip-master-import.md on branch `feature/80-trip-master-import`.

Follow layer order in @features/framework.md.
Backend: a Trip Master reader (two-row header by column name, sections, value parsing FR-011–FR-016) and POST /trips/trips/:id/import-trip-master in one transaction (FR-002–FR-010, FR-017); register links to an existing person without a login (FR-018); test fixture backend/tests/fixtures/trip-master-sample.csv with made-up people.
Account invitation: CREATE_ACCOUNT_LINK token value (FR-019) and the seeded account-invite type, token, and template (FR-021).
Frontend: Import action on TripsList and ImportTripMasterDialog (file picker, error, summary and notes); Login opens Create account filled in from ?create=1 (FR-020).
Update features/reference (api, behavior).
```

---

## Definition of Done

*   [x] Import action and access per **FR-001**–**FR-003**
*   [x] People, roles, and applications per **FR-004**–**FR-009**
*   [x] Summary per **FR-010**
*   [x] Value reading per **FR-011**–**FR-016**
*   [x] Email saving and **Create account** linking per **FR-017**–**FR-018**
*   [x] Account invitation token, sign-in link, and seeded template per **FR-019**–**FR-021**
*   [x] Trip options from Travel Notes and Flight Fee per **FR-022**–**FR-025**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/api.md` and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- A preview before importing
- Deposits and funds received as donations
- Flight segments from the flight text, name tags, specialties, and insurance dates
- Creating trip options from Travel Notes, or reading the Trip Fee
- Creating user accounts or sending emails during the import (people create their own accounts, FR-018; staff send the invitation themselves, FR-021)
- Seeding the invitation template for organizations other than the seed organization
- Email verification or one-time invitation links
- Creating the trip itself from the file, or reading its dates and costs
- Exporting back to Trip Master format
