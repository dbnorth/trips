# Data Model Reference

**Status:** living snapshot of Trips on `dev` (Features 1–11).  
**ORM:** Sequelize models under `backend/app/models/`.  
**Source of truth for new work:** `features/feature-*.md` — this file does **not** authorize scope.

Notes:
- Fields are those declared on models. Sequelize also adds `createdAt` / `updatedAt` unless disabled.
- Where `allowNull` is omitted → Sequelize default **true**.
- Typo `phoneContryCode` / `assiginmentDateTime` match shipped column names.
- **Encrypted** (Feature 64): `TEXT NULL` column holding `enc1:` + base64(12-byte nonce, AES-256-GCM ciphertext, 16-byte tag); the model encrypts on write and decrypts on read, so the API sees the original type (string, Yes/No as `true`/`false`, `YYYY-MM-DD`). Never filtered, sorted, or joined in SQL. Values without `enc1:` (written before Feature 64) are read as stored.

## Table index

| Table / model | Features | Purpose |
|---------------|----------|---------|
| `user` | 1, 2 | Accounts |
| `sessions` | 1 | Session tokens (TTL ~4h) |
| `passwordResetTokens` | 70 | Hashed one-time password reset tokens |
| `person` | 2, 11 | Profiles |
| `role` | 2 | Role catalog |
| `orgPeopleRole` | 2 | Person ↔ org ↔ role |
| `organization` | 3 | Sponsors / branding / agreement file |
| `documentType` | 4, 22, 24, 25 | Passport / medical licence / certification / diploma catalog |
| `personDocument` | 4, 22 | Uploaded person documents |
| `trip` | 5 | Trip catalog |
| `tripPeopleRole` | 5, 7 | Leaders, applications, participants |
| `workerRole` | 6, 25 | Org worker-role catalog (+ required documents) |
| `workerRoleDocumentType` | 25 | Worker role ↔ required document types |
| `documentTypeSpecialization` | 59 | Specialization names on a document type's list |
| `workerRoleSpecialization` | 59 | Worker role ↔ required specializations |
| `personDocumentSpecialization` | 34, 59 | Specializations (list entry, date, file) on a person document |
| `medicalCondition` | 17 | Org medical-condition catalog (name ≤ 50) |
| `language` | 31 | Global language catalog |
| `personLanguage` | 31 | Person other-language fluency and medical terminology |
| `tripWorkerRole` | 6 | Per-trip role quantities |
| `tripWorkerRoleReservation` | 56 | Trip-role slot reserved for an email |
| `tripTravelOption` | 6 | Travel/cost option sets |
| `tripPeopleRoleOption` | 7 | Selected travel options on an application |
| `tripPeopleRoleExpense` | 74 | Add-on expenses on an application |
| `tripRoomingList` | 29 | Per-trip hotel / check-in / notes |
| `tripRoom` | 29 | Room number, type, nights |
| `tripRoomAssignment` | 29 | Participant ↔ room |
| `airport` | 30 | Global airport catalog |
| `airline` | 30 | Global airline catalog |
| `tripFlight` | 30 | Per-participant flight header |
| `tripFlightSegment` | 30 | Ordered flight segments |
| `donor` | 8, 9 | Donor contacts |
| `tripDonation` | 8, 9 | Donations |
| `emailTemplate` | 10, 39, 41, 42 | Email templates |
| `emailType` | 39 | Email type catalog |
| `emailToken` | 40 | Email template token catalog |
| `emailPicture` | 77 | Organization picture library for email bodies |
| `emailLog` | 1, 43, 45 | Login / email audit; template sends record template, trip, and participant |
| `scheduledEmailSend` | 44 | One row per scheduled template, trip, participant, and job date handled |

---

## `user` — Features 1, 2, 70

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| email | STRING | required, unique |
| password | STRING(255) | required; excluded by `defaultScope` |
| isAdmin | BOOLEAN | required, default `false` |
| passwordSetByUser | BOOLEAN | required, default `false` |
| failedLoginCount | INTEGER | required, default `0`; wrong passwords in a row (Feature 70); excluded by `defaultScope` |
| lockedUntil | DATE | nullable; sign-in refused until then (Feature 70); excluded by `defaultScope` |

`failedLoginCount` and `lockedUntil` are added to existing databases by `ensureSchema`.

**Associations:** `hasMany` sessions; `hasMany` passwordResetTokens (CASCADE); `hasOne` person (`userId`, SET NULL).

---

## `passwordResetTokens` — Feature 70

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| userId | INTEGER | required FK → user (CASCADE) |
| tokenHash | CHAR(64) | required, unique (`passwordResetTokens_tokenHash_unique`); SHA-256 hex of the emailed token — the token itself is never stored |
| expiresAt | DATE | required; created + 1 hour |
| usedAt | DATE | nullable; set when used or replaced by a newer link |

`createdAt` counts reset emails per user per hour (max 3).

**Associations:** `belongsTo` user.

---

## `sessions` — Feature 1

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| token | STRING(3000) | required |
| email | STRING | required |
| expirationDate | DATE | required |
| userId | INTEGER | required FK → user |

**Associations:** `belongsTo` user (CASCADE).

---

## `person` — Features 2, 11, 64

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| userId | INTEGER | optional FK → user |
| firstName, lastName | STRING | required |
| middleName | STRING | nullable; optional (Feature 20) |
| preferredName | STRING | nullable; blank save stores first name + last name (Feature 33) |
| email | STRING | |
| addLine1, addLine2, city, state_prov, postalCode | Encrypted text | Feature 64 |
| country | STRING(2) | |
| phoneContryCode | STRING(10) | |
| phoneNumber | Encrypted text | Feature 64 |
| birthDate | Encrypted date | `YYYY-MM-DD` (Feature 64) |
| gender | ENUM(`male`,`female`) | |
| emergencyContactName | Encrypted text | Feature 64 |
| emergencyContactPhoneCountryCode | STRING(10) | |
| emergencyContactPhoneNumber | Encrypted text | Feature 64 |
| emergencyContactRelationship | ENUM(`spouse`,`father`,`mother`,`child`,`grandmother`,`grandfather`,`other`) | nullable; labels Spouse, Father, Mother, Child, Grand Mother, Grand Father, Other (Feature 32) |
| hasAllergies | Encrypted Yes/No | nullable; `null` = unanswered; stored as encrypted `1`/`0` (Feature 64) |
| allergiesDescription | Encrypted text | Feature 64 |
| takesMedication | Encrypted Yes/No | nullable; `null` = unanswered (Feature 64) |
| medicalConditionIds | Encrypted ID list | JSON array of `medicalCondition` ids from any organization, ascending; replaces `personMedicalCondition` (Feature 64). Excluded by the default scope; read with `person.unscoped()`. Ids no longer in `medicalCondition` are ignored |
| speaksOtherLanguage | BOOLEAN | nullable; `null` = unanswered (Feature 31) |
| currentChurchHome | STRING(255) | |
| currentChurchHomeCity | STRING(100) | |
| currentChurchHomeStateProv | STRING(100) | |
| picture | STRING(500) | relative path |
| bioText | TEXT | |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` user; `hasMany` orgPeopleRole, tripPeopleRole, personDocument, personLanguage; `hasMany` tripDonation as participant; `hasOne` donor as `donor` (Feature 53).

---

## `role` — Feature 2

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| roleName | STRING(100) | required, unique — seeded: Org Admin, Trip Leader, Trip Participant, Pending User, Agent (Feature 85; added on startup when missing) |
| roleDescription | STRING(500) | |

**Associations:** `hasMany` orgPeopleRole, tripPeopleRole (RESTRICT).

---

## `organization` — Feature 3

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| name | STRING(255) | required |
| addLine1, addLine2, city, state_prov, postalCode | STRING | |
| country | STRING(2) | |
| phoneContryCode | STRING(10) | |
| phoneNumber | STRING(30) | |
| email | STRING | |
| websiteUrl | STRING(500) | |
| facebookPage | STRING(500) | |
| instagram | STRING(255) | |
| logo | STRING(500) | |
| agreementFileName | STRING(500) | Markdown path under `agreements/` |
| medicalAgreementFileName | STRING(500) | Medical agreement Markdown path under `agreements/` |
| colorFamily | STRING(50) | UI theme |
| subdomain | STRING(63) | optional, unique (lowercase); org branded host label — Feature 15 |
| testMode | BOOLEAN | required, default `false`; emails for the org's trips go to the org email — Feature 49 |
| version | INTEGER | required, default `0` |

**Associations:** `hasMany` orgPeopleRole, trip, emailTemplate, workerRole (CASCADE).

---

## `orgPeopleRole` — Feature 2

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | required FK → organization |
| peopleId | INTEGER | required FK → person |
| roleId | INTEGER | required FK → role |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` organization, person, role.

---

## `documentType` — Features 4, 22

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| description | STRING(255) | required |
| type | ENUM(`medical_licence`,`passport`,`certification`,`diploma`) | required (`certification` — Feature 22; `diploma` — Feature 24) |
| documentNumberRequired | BOOLEAN | required, default `false` (Feature 22) |
| instructions | TEXT | nullable (Feature 22) |
| allowSpecialization | BOOLEAN | required, default `false` (Feature 34) |
| hasExpirationDate | BOOLEAN | required, default `true` (Feature 57) |

**Associations:** `hasMany` workerRole (SET NULL); `hasMany` personDocument (RESTRICT); `hasMany` documentTypeSpecialization as `specializations` (CASCADE, Feature 59).

---

## `documentTypeSpecialization` — Feature 59

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| documentTypeId | INTEGER | required FK → documentType; CASCADE on delete |
| name | STRING(100) | required, trimmed; unique per document type ignoring case (API) |
| unique | `(documentTypeId, name)` | |

**Associations:** `belongsTo` documentType; `hasMany` personDocumentSpecialization (RESTRICT); `hasMany` workerRoleSpecialization (RESTRICT). An entry used by either cannot be removed from the list.

Dev seed: `backend/app/data/documentTypes.json` via `seedDocumentTypes.js` (part of `npm run seed`) adds missing document types (by description) and their missing specializations.

---

## `personDocument` — Features 4, 22

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| personId | INTEGER | required FK → person |
| documentTypeId | INTEGER | required FK → documentType |
| countryIssued | STRING(2) | |
| documentNumber | Encrypted text | nullable; required by API when type.`documentNumberRequired` (Feature 22); encrypted (Feature 64) |
| issueDate | DATEONLY | |
| expirationDate | DATEONLY | nullable; required by API when type.`hasExpirationDate`, stored null otherwise (Feature 57) |
| documentFileName | STRING(500) | nullable; optional upload (Feature 22) |

**Associations:** `belongsTo` person, documentType; `hasMany` personDocumentSpecialization (CASCADE).

---

## `personDocumentSpecialization` — Features 34, 59

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| personDocumentId | INTEGER | required FK → personDocument; CASCADE on delete |
| documentTypeSpecializationId | INTEGER | required FK → documentTypeSpecialization; RESTRICT on delete; must be on the document type's list (Feature 59; replaces the free-text `name`) |
| specializationDate | DATEONLY | required; API field `date` |
| documentFileName | STRING(500) | required relative path; same storage as person document files |
| unique | `(personDocumentId, documentTypeSpecializationId)` | Feature 59 (created by `ensureSchema`) |

**Associations:** `belongsTo` personDocument, documentTypeSpecialization.

---

## `trip` — Feature 5

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | required FK → organization |
| status | ENUM(`active`,`completed`,`inactive`) | required, default `active` |
| name | STRING(255) | required |
| location | STRING(255) | |
| city | STRING(100) | |
| country | STRING(100) | |
| description | TEXT | |
| startDate, endDate | DATEONLY | |
| image | STRING(500) | |
| facebookPage | STRING(500) | |
| instagramId | STRING(255) | |
| participantCost | DECIMAL(10,2) | |
| deposit | DECIMAL(10,2) | nullable (Feature 38) |
| requirePassport | BOOLEAN | required, default `false` (Feature 23) |
| arrivalPdfFileName | STRING(500) | optional; stored Trip Arrival PDF file name under `documents/trips/` (`trip-<id>-arrival-<uploadTime>.pdf`); left out of the default scope and never returned by the API (Feature 76) |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` organization; `hasMany` tripPeopleRole, tripDonation, emailTemplate, tripWorkerRole, tripTravelOption; `hasOne` tripRoomingList (Feature 29).

---

## `tripPeopleRole` — Features 5, 7

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| peopleId | INTEGER | required FK → person |
| roleId | INTEGER | required FK → role |
| tripWorkerRoleId | INTEGER | optional FK → tripWorkerRole |
| status | ENUM(`incomplete`,`applied`,`approved`,`declined`,`cancelled`) | required, default `incomplete`; **capacity** (Feature 26): `incomplete`/`applied`/`approved` occupy a trip worker-role slot; `cancelled`/`declined` do not |
| participantCost | DECIMAL(10,2) | |
| whygoText | TEXT | |
| willSelfFund, willRaiseFunds | BOOLEAN | required, default `false` |
| licenseStatus | ENUM(`yes`,`yes_retired`,`no`) | |
| hasPreferredRoommate | BOOLEAN | required, default `false` |
| preferredRoommateNames | STRING(500) | |
| flightPurchaseOption | ENUM(`self`,`organization`) | nullable; Feature 30 application |
| preferredDepartureAirportId | INTEGER | nullable FK → airport |
| preferredReturnAirportId | INTEGER | nullable FK → airport |
| preferredCabinClass | STRING(50) | nullable |
| preferredAirlineId | INTEGER | nullable FK → airline |
| preferredRefundableTicket | BOOLEAN | nullable; required for `applied` when organization purchases |
| flightNotes | TEXT | nullable; participant's free-text flight notes, also filled by the Trip Master import (Feature 84) |
| agreementAccepted | BOOLEAN | required, default `false` |
| agreementSignatureName | STRING(255) | |
| agreementDate | DATE | |
| agreementAdultFirstName, agreementAdultLastName | STRING(100) | |
| agreementAdultEmail | STRING(255) | |
| agreementAdultRelationship | STRING(100) | |
| medicalAgreementAccepted | BOOLEAN | required, default `false` |
| medicalAgreementDate | DATE | |
| isPregnant | Encrypted Yes/No | nullable; `null` = unanswered; application-scoped (Feature 19); encrypted (Feature 64) |
| pregnancyDueDate | Encrypted date | cleared unless `isPregnant` is true; encrypted (Feature 64) |
| assiginmentDateTime | DATE | |
| medicalAgreementDate | DATE | |
| assiginmentDateTime | DATE | |
| isPrimaryLeader | BOOLEAN | required, default `false`; exactly one Trip Leader row per trip with leaders is `true` (Feature 40) |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` trip, person, role, tripWorkerRole; `hasMany` tripPeopleRoleOption; `hasOne` tripRoomAssignment (Feature 29); `hasOne` tripFlight (Feature 30); `hasMany` tripPeopleRoleExpense as `addonExpenses` (Feature 74).

---

## `tripRoomingList` — Feature 29

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip, **unique** (one list per trip) |
| hotelName | STRING(255) | |
| checkInDate | DATEONLY | |
| notes | TEXT | |

**Associations:** `belongsTo` trip; `hasMany` tripRoom.

---

## `tripRoom` — Feature 29

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripRoomingListId | INTEGER | required FK → tripRoomingList |
| roomNumber | STRING(50) | required |
| roomType | STRING(20) | required; `King` \| `Double` \| `Triple` |
| numberOfNights | INTEGER | required, positive |

**Associations:** `belongsTo` tripRoomingList; `hasMany` tripRoomAssignment.

---

## `tripRoomAssignment` — Feature 29

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripRoomId | INTEGER | required FK → tripRoom |
| tripPeopleRoleId | INTEGER | required FK → tripPeopleRole, **unique** (one room per participant) |

**Associations:** `belongsTo` tripRoom, tripPeopleRole.

---

## `airport` — Feature 30

Seeded from `backend/app/data/airports.json` (OpenFlights IATA set) via `npm run seed:catalogs`.

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| code | STRING(10) | required, unique |
| airportName | STRING(255) | required |
| city | STRING(255) | required |
| country | STRING(100) | required |

**Associations:** `hasMany` tripFlightSegment (as departure/arrival).

---

## `airline` — Feature 30

Seeded from `backend/app/data/airlines.json` (OpenFlights active IATA set) via `npm run seed:catalogs`.

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| code | STRING(10) | required, unique |
| name | STRING(255) | required |

**Associations:** `hasMany` tripFlightSegment.

---

## `tripFlight` — Feature 30

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripPeopleRoleId | INTEGER | required FK → tripPeopleRole, unique |
| purchased | BOOLEAN | required, default `false` |
| cost | DECIMAL(10,2) | nullable |
| comments | TEXT | |

**Associations:** `belongsTo` tripPeopleRole; `hasMany` tripFlightSegment.

---

## `tripFlightSegment` — Feature 30

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripFlightId | INTEGER | required FK → tripFlight |
| segmentType | ENUM(`arrival`,`return`) | required; default `arrival` |
| segmentNumber | INTEGER | required; unique per flight **and** type |
| departureAirportId | INTEGER | required FK → airport |
| airlineId | INTEGER | required FK → airline |
| flightNumber | STRING(20) | required |
| departureDate | DATEONLY | required |
| departureTime | STRING(5) | required (`HH:MM`) |
| arrivalAirportId | INTEGER | required FK → airport |
| arrivalDate | DATEONLY | required |
| arrivalTime | STRING(5) | required (`HH:MM`) |
| cabinClass | STRING(50) | optional |
| seatNumber | STRING(20) | optional |

**Associations:** `belongsTo` tripFlight, departureAirport, arrivalAirport, airline.

---

## `workerRole` — Feature 6

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | required FK → organization |
| name | STRING(100) | required |
| description | STRING(500) | |
| documentTypeId | INTEGER | optional FK → documentType; **deprecated for writes** (Feature 25 — migrate into join) |
| status | ENUM(`active`,`inactive`) | required, default `active` |

`licenseRequired` was removed in Feature 59 (`ensureSchema` drops the column).

**Associations:** `belongsTo` organization, documentType (legacy); `belongsToMany` documentType as `requiredDocumentTypes` through `workerRoleDocumentType`; `belongsToMany` documentTypeSpecialization as `requiredSpecializations` through `workerRoleSpecialization` (Feature 59); `hasMany` tripWorkerRole.

---

## `workerRoleDocumentType` — Feature 25

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| workerRoleId | INTEGER | required FK → workerRole |
| documentTypeId | INTEGER | required FK → documentType |
| unique | `(workerRoleId, documentTypeId)` | |

**Associations:** `belongsTo` workerRole, documentType.

---

## `workerRoleSpecialization` — Feature 59

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| workerRoleId | INTEGER | required FK → workerRole; CASCADE on delete |
| documentTypeSpecializationId | INTEGER | required FK → documentTypeSpecialization; RESTRICT on delete; its document type must be one of the role's required documents |
| unique | `(workerRoleId, documentTypeSpecializationId)` | |

**Associations:** `belongsTo` workerRole, documentTypeSpecialization.

---

## `medicalCondition` — Feature 17

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | required FK → organization |
| name | STRING(50) | required; unique per org (case-insensitive) |

**Associations:** `belongsTo` organization. People's selections are in the encrypted `person.medicalConditionIds` list (Feature 64; the `personMedicalConditions` table is removed by `npm run encrypt-personal-data`). Deleting a condition does not change people's lists; the id is ignored when read.

---

## `language` — Feature 31

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| code | STRING(10) | required; unique ISO 639-1 or 639-3 |
| name | STRING(100) | required |

Seeded global catalog. No org column.

---

## `personLanguage` — Feature 31

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| personId | INTEGER | required FK → person |
| languageId | INTEGER | required FK → language |
| fluency | ENUM(`basic`,`conversational`) | required |
| knowsMedicalTerminology | BOOLEAN | required |
| unique | `(personId, languageId)` | |

**Associations:** `belongsTo` person (cascade delete), language.

---

## `tripWorkerRole` — Feature 6

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| workerRoleId | INTEGER | required FK → workerRole |
| quantity | INTEGER | required, default `1` |

**Associations:** `belongsTo` trip, workerRole; `hasMany` tripPeopleRole; `hasMany` tripWorkerRoleReservation as `reservations` (Feature 56).

---

## `tripWorkerRoleReservation` — Feature 56

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| tripWorkerRoleId | INTEGER | required FK → tripWorkerRole (removed with the role) |
| email | STRING(255) | required; stored trimmed and lowercased; unique per trip (`tripWorkerRoleReservations_trip_email_unique` on `tripId`, `email`) |

A reservation is **filled** when an `incomplete` / `applied` / `approved` application for the same trip role belongs to a person whose email matches (case-insensitive). Filled state is derived, not stored.

**Associations:** `belongsTo` trip, tripWorkerRole.

---

## `tripTravelOption` — Feature 6

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| description | STRING(500) | required |
| priceAdjustment | DECIMAL(10,2) | required, default `0` |
| setNumber | INTEGER | required, default `1` (one selection per set on applications) |
| daysBefore | INTEGER | required, default `0`; whole number 0–365 (Feature 78; added by `ensureSchema`) |
| daysAfter | INTEGER | required, default `0`; whole number 0–365 (Feature 78; added by `ensureSchema`) |

**Associations:** `belongsTo` trip; `hasMany` tripPeopleRoleOption.

---

## `tripPeopleRoleOption` — Feature 7

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripPeopleRoleId | INTEGER | required FK → tripPeopleRole |
| tripTravelOptionId | INTEGER | required FK → tripTravelOption |
| selected | BOOLEAN | required, default `false` |

**Associations:** `belongsTo` tripPeopleRole, tripTravelOption. No dedicated REST resource.

---

## `tripPeopleRoleExpense` — Feature 74

Table `tripPeopleRoleExpenses`, created by `ensureSchema` when missing.

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement; list order |
| tripPeopleRoleId | INTEGER | required FK → tripPeopleRole, `ON DELETE CASCADE` |
| description | STRING(255) | required, trimmed |
| cost | DECIMAL(10,2) | required, ≥ 0 |
| daysBefore | INTEGER | required, default `0`; whole number 0–365 (Feature 78; added by `ensureSchema`) |
| daysAfter | INTEGER | required, default `0`; whole number 0–365 (Feature 78; added by `ensureSchema`) |

**Associations:** `belongsTo` tripPeopleRole. No dedicated REST resource; saved as a whole list through `PUT /trips/trip-people-roles/:id` `addonExpenses`.

---

## `donor` — Features 8, 9, 64

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| firstName | STRING | required |
| lastName | STRING | |
| addLine1, addLine2, city, state_prov, postalCode | Encrypted text | Feature 64 |
| country | STRING(2) | |
| phoneContryCode | STRING(10) | |
| phoneNumber | Encrypted text | Feature 64 |
| email | STRING | |
| status | ENUM(`active`,`inactive`,`dontcontact`) | required, default `active` |
| personId | INTEGER | optional FK → person, unique (`donors_personId_unique`), `ON DELETE SET NULL`; the person's linked donor (Feature 53) |
| version | INTEGER | required, default `0` |

**Associations:** `hasMany` tripDonation (SET NULL); `belongsTo` person as `person` (Feature 53).

---

## `tripDonation` — Features 8, 9

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| personId | INTEGER | optional FK → person (participant) |
| donorId | INTEGER | optional FK → donor |
| amount | DECIMAL(10,2) | required |
| dateTime | DATE | required, default NOW |
| paymentInfo | TEXT | |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` trip; person as `participant`; donor as `donor`.

---

## `emailTemplate` — Features 10, 39

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | optional FK → organization (null = global) |
| tripId | INTEGER | optional FK → trip |
| fromEmail | STRING | |
| functionCode | STRING | |
| subject | STRING(500) | |
| content | TEXT | |
| attachment | STRING(500) | optional; attachment tokens separated by commas, e.g. `{{TRIP_ARRIVAL_PDF}}`; empty or null means no attachments (Feature 76) |
| emailTypeId | INTEGER | optional FK → emailType; required when the template form saves (Feature 39) |
| emailBody | TEXT | optional in the table; required when the template form saves (Feature 39). HTML cleaned on save to paragraphs (only style kept: `text-align:center`), line breaks, bold, italic, underline, lists, links (http, https, mailto), and library pictures as `<img data-picture-id="N" alt="…">` with an optional `width` (whole pixels, at most 600); a body with no HTML tags is read as plain text (Feature 77) |
| toAddress | STRING(1000) | optional in the table; required when the template form saves. Comma-separated email addresses and email tokens (Feature 41) |
| scheduleRule | STRING(20) | optional; `daily`, `weekly` (Tuesday), or `before-start`. Required when the template form saves a `Scheduled` template; empty for `Send Now` (Feature 42) |
| scheduleDaysBefore | INTEGER | optional; 1–365 when `scheduleRule` is `before-start`, otherwise empty (Feature 42) |

**Associations:** `belongsTo` organization, trip, emailType.

`functionCode` stays a string. Saves from the template form store `Scheduled` or `Send Now`.

---

## `emailType` — Feature 39

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| typeCode | STRING | required, unique |
| description | STRING | required |
| eventCode | STRING | required |

**Associations:** `hasMany` emailTemplate (`emailTypeId`, RESTRICT).

---

## `emailToken` — Feature 40

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tokenCode | STRING(100) | required, unique; capital letters, digits, and underscores, starting with a letter |
| description | STRING | required |
| valueSource | STRING(100) | required; one of the fixed value sources in `backend/app/utils/emailTokenValues.js` |

**Associations:** none. Templates write tokens as `{{TOKEN_CODE}}` text.

`seedEmailTokens` adds missing token codes only; Feature 74 adds `ADDON_EXPENSE` → `participant.addonExpenses` and `ADDON_EXPENSE_TOTAL` → `participant.addonExpensesTotal`; Feature 78 adds `PARTICIPANT_ARRIVAL_DATE` → `participant.arrivalDate` and `PARTICIPANT_DEPARTURE_DATE` → `participant.departureDate`.

---

## `emailPicture` — Feature 77

Table `emailPictures`, created by `ensureSchema` when missing.

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement; referenced from template bodies as `data-picture-id` |
| orgId | INTEGER | required FK → organization, `ON DELETE CASCADE` |
| name | STRING(100) | required, trimmed; defaults to the uploaded file name without its extension |
| fileName | STRING(255) | required; random name of the file in `backend/images/email-pictures/` (served at `/trips/images/email-pictures/`) |
| contentType | STRING(50) | required; `image/png`, `image/jpeg`, or `image/gif` |
| sizeBytes | INTEGER | required; at most 2 MB |

**Associations:** `belongsTo` organization. Not deletable while any template body of its organization uses it.

---

## `emailLog` — Features 1, 43, 45

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| toEmail | STRING(1000) | required. For template sends, the filled **To** list (Feature 43) |
| fromEmail | STRING | For template sends, the address the email was sent From |
| dateTime | DATE | required, default NOW |
| subject | STRING(500) | |
| content | TEXT | For template sends, the plain-text body (the plain-text version of HTML emails, Feature 77) |
| emailId | STRING(255) | For template sends, the mail server message ID (smtp mode) or the file name (file mode) |
| emailTemplateId | INTEGER | optional; FK → emailTemplate (SET NULL). For template sends, the template sent (Feature 45) |
| tripId | INTEGER | optional; FK → trip (SET NULL). For template sends, the trip (Feature 45) |
| personId | INTEGER | optional; FK → person (SET NULL). For template sends, the participant (Feature 45) |

**Associations:** `belongsTo` emailTemplate, trip, person (all optional; deleting them keeps the row). No CRUD API. Feature 43 adds one row per template email sent; failed and skipped sends add no row. Sign-in rows (subject **Login**) leave the Feature 45 columns empty.

---

## `scheduledEmailSend` — Feature 44

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| emailTemplateId | INTEGER | required; FK → emailTemplate (CASCADE) |
| tripId | INTEGER | required; FK → trip (CASCADE) |
| personId | INTEGER | required; FK → person (CASCADE) |
| sendDate | DATEONLY | required; the job date |
| status | ENUM(`sent`, `skipped`, `failed`) | required |
| reason | STRING(1000) | skip reason or error message |
| emailLogId | INTEGER | optional; FK → emailLog (SET NULL) when sent |

**Unique:** (`emailTemplateId`, `tripId`, `personId`, `sendDate`). **Associations:** `belongsTo` emailTemplate, trip, person, emailLog. No CRUD API; written only by the daily scheduled email job.

---

## Association diagram (high level)

```text
user ──1:1── person
user ──1:N── sessions

organization ──1:N── orgPeopleRole ──N:1── person
                  └──N:1── role
organization ──1:N── trip ──1:N── tripPeopleRole ──N:1── person / role
                  ├──1:N── tripWorkerRole ──N:1── workerRole
                  │          └──1:N── tripWorkerRoleReservation
                  ├──1:N── tripTravelOption
                  ├──1:N── tripDonation ──N:1── donor / person
                  └──1:1── tripRoomingList ──1:N── tripRoom ──1:N── tripRoomAssignment ──N:1── tripPeopleRole

tripPeopleRole ──1:N── tripPeopleRoleOption ──N:1── tripTravelOption
tripPeopleRole ──1:N── tripPeopleRoleExpense
person ──1:N── personDocument ──N:1── documentType
workerRole ──N:1── documentType (optional)
organization ──1:N── emailTemplate ──N:1── trip (optional)
emailType ──1:N── emailTemplate
emailTemplate ──1:N── scheduledEmailSend ──N:1── trip / person / emailLog (optional)
emailLog ──N:1── emailTemplate / trip / person (all optional)
```
