# Data Model Reference

**Status:** living snapshot of Trips on `dev` (Features 1–11).  
**ORM:** Sequelize models under `backend/app/models/`.  
**Source of truth for new work:** `features/feature-*.md` — this file does **not** authorize scope.

Notes:
- Fields are those declared on models. Sequelize also adds `createdAt` / `updatedAt` unless disabled.
- Where `allowNull` is omitted → Sequelize default **true**.
- Typo `phoneContryCode` / `assiginmentDateTime` match shipped column names.

## Table index

| Table / model | Features | Purpose |
|---------------|----------|---------|
| `user` | 1, 2 | Accounts |
| `sessions` | 1 | Session tokens (TTL ~4h) |
| `person` | 2, 11 | Profiles |
| `role` | 2 | Role catalog |
| `orgPeopleRole` | 2 | Person ↔ org ↔ role |
| `organization` | 3 | Sponsors / branding / agreement file |
| `documentType` | 4 | Passport / medical licence catalog |
| `personDocument` | 4 | Uploaded person documents |
| `trip` | 5 | Trip catalog |
| `tripPeopleRole` | 5, 7 | Leaders, applications, participants |
| `workerRole` | 6 | Org worker-role catalog |
| `medicalCondition` | 17 | Org medical-condition catalog (name ≤ 50) |
| `personMedicalCondition` | 17 | Person selected medical conditions |
| `tripWorkerRole` | 6 | Per-trip role quantities |
| `tripTravelOption` | 6 | Travel/cost option sets |
| `tripPeopleRoleOption` | 7 | Selected travel options on an application |
| `donor` | 8, 9 | Donor contacts |
| `tripDonation` | 8, 9 | Donations |
| `emailTemplate` | 10 | Email templates |
| `emailLog` | 1 | Login / email audit (no associations) |

---

## `user` — Features 1, 2

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| email | STRING | required, unique |
| password | STRING(255) | required; excluded by `defaultScope` |
| isAdmin | BOOLEAN | required, default `false` |
| passwordSetByUser | BOOLEAN | required, default `false` |

**Associations:** `hasMany` sessions; `hasOne` person (`userId`, SET NULL).

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

## `person` — Features 2, 11

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| userId | INTEGER | optional FK → user |
| firstName, lastName | STRING | required |
| email | STRING | |
| addLine1, addLine2, city, state_prov, postalCode | STRING | |
| country | STRING(2) | |
| phoneContryCode | STRING(10) | |
| phoneNumber | STRING(30) | |
| birthDate | DATEONLY | |
| gender | ENUM(`male`,`female`) | |
| emergencyContactName | STRING(255) | |
| emergencyContactPhoneCountryCode | STRING(10) | |
| emergencyContactPhoneNumber | STRING(30) | |
| hasAllergies | BOOLEAN | nullable; `null` = unanswered |
| allergiesDescription | TEXT | |
| takesMedication | BOOLEAN | nullable; `null` = unanswered |
| currentChurchHome | STRING(255) | |
| currentChurchHomeCity | STRING(100) | |
| currentChurchHomeStateProv | STRING(100) | |
| picture | STRING(500) | relative path |
| bioText | TEXT | |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` user; `hasMany` orgPeopleRole, tripPeopleRole, personDocument; `hasMany` tripDonation as participant.

---

## `role` — Feature 2

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| roleName | STRING(100) | required, unique — seeded: Org Admin, Trip Leader, Trip Participant, Pending User |
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
| colorFamily | STRING(50) | UI theme |
| subdomain | STRING(63) | optional, unique (lowercase); org branded host label — Feature 15 |
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

## `documentType` — Feature 4

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| description | STRING(255) | required |
| type | ENUM(`medical_licence`,`passport`) | required |

**Associations:** `hasMany` workerRole (SET NULL); `hasMany` personDocument (RESTRICT).

---

## `personDocument` — Feature 4

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| personId | INTEGER | required FK → person |
| documentTypeId | INTEGER | required FK → documentType |
| countryIssued | STRING(2) | |
| issueDate | DATEONLY | |
| expirationDate | DATEONLY | required |
| documentFileName | STRING(500) | required |

**Associations:** `belongsTo` person, documentType.

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
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` organization; `hasMany` tripPeopleRole, tripDonation, emailTemplate, tripWorkerRole, tripTravelOption.

---

## `tripPeopleRole` — Features 5, 7

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| peopleId | INTEGER | required FK → person |
| roleId | INTEGER | required FK → role |
| tripWorkerRoleId | INTEGER | optional FK → tripWorkerRole |
| status | ENUM(`incomplete`,`applied`,`approved`,`declined`,`cancelled`) | required, default `incomplete` |
| participantCost | DECIMAL(10,2) | |
| whygoText | TEXT | |
| willSelfFund, willRaiseFunds | BOOLEAN | required, default `false` |
| licenseStatus | ENUM(`yes`,`yes_retired`,`no`) | |
| hasPreferredRoommate | BOOLEAN | required, default `false` |
| preferredRoommateNames | STRING(500) | |
| agreementAccepted | BOOLEAN | required, default `false` |
| agreementSignatureName | STRING(255) | |
| agreementDate | DATE | |
| agreementAdultFirstName, agreementAdultLastName | STRING(100) | |
| agreementAdultEmail | STRING(255) | |
| agreementAdultRelationship | STRING(100) | |
| assiginmentDateTime | DATE | |
| version | INTEGER | required, default `0` |

**Associations:** `belongsTo` trip, person, role, tripWorkerRole; `hasMany` tripPeopleRoleOption.

---

## `workerRole` — Feature 6

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | required FK → organization |
| name | STRING(100) | required |
| description | STRING(500) | |
| licenseRequired | BOOLEAN | required, default `false` |
| documentTypeId | INTEGER | optional FK → documentType |
| status | ENUM(`active`,`inactive`) | required, default `active` |

**Associations:** `belongsTo` organization, documentType; `hasMany` tripWorkerRole.

---

## `medicalCondition` — Feature 17

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | required FK → organization |
| name | STRING(50) | required; unique per org (case-insensitive) |

**Associations:** `belongsTo` organization; `belongsToMany` person through `personMedicalCondition`.

---

## `personMedicalCondition` — Feature 17

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| personId | INTEGER | required FK → person |
| medicalConditionId | INTEGER | required FK → medicalCondition |
| unique | `(personId, medicalConditionId)` | |

**Associations:** `belongsTo` person, medicalCondition. Deleting a condition cascades join rows.

---

## `tripWorkerRole` — Feature 6

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| workerRoleId | INTEGER | required FK → workerRole |
| quantity | INTEGER | required, default `1` |

**Associations:** `belongsTo` trip, workerRole; `hasMany` tripPeopleRole.

---

## `tripTravelOption` — Feature 6

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| tripId | INTEGER | required FK → trip |
| description | STRING(500) | required |
| priceAdjustment | DECIMAL(10,2) | required, default `0` |
| setNumber | INTEGER | required, default `1` (one selection per set on applications) |

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

## `donor` — Features 8, 9

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| firstName | STRING | required |
| lastName | STRING | |
| addLine1, addLine2, city, state_prov, postalCode | STRING | |
| country | STRING(2) | |
| phoneContryCode | STRING(10) | |
| phoneNumber | STRING(30) | |
| email | STRING | |
| status | ENUM(`active`,`inactive`,`dontcontact`) | required, default `active` |
| version | INTEGER | required, default `0` |

**Associations:** `hasMany` tripDonation (SET NULL).

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

## `emailTemplate` — Feature 10

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| orgId | INTEGER | optional FK → organization (null = global) |
| tripId | INTEGER | optional FK → trip |
| fromEmail | STRING | |
| functionCode | STRING | |
| subject | STRING(500) | |
| content | TEXT | |
| attachment | STRING(500) | |

**Associations:** `belongsTo` organization, trip.

---

## `emailLog` — Feature 1

| Field | Type | Rules |
|-------|------|--------|
| id | INTEGER PK | autoIncrement |
| toEmail | STRING | required |
| fromEmail | STRING | |
| dateTime | DATE | required, default NOW |
| subject | STRING(500) | |
| content | TEXT | |
| emailId | STRING(255) | |

**Associations:** none. No CRUD API.

---

## Association diagram (high level)

```text
user ──1:1── person
user ──1:N── sessions

organization ──1:N── orgPeopleRole ──N:1── person
                  └──N:1── role
organization ──1:N── trip ──1:N── tripPeopleRole ──N:1── person / role
                  ├──1:N── tripWorkerRole ──N:1── workerRole
                  ├──1:N── tripTravelOption
                  └──1:N── tripDonation ──N:1── donor / person

tripPeopleRole ──1:N── tripPeopleRoleOption ──N:1── tripTravelOption
person ──1:N── personDocument ──N:1── documentType
workerRole ──N:1── documentType (optional)
organization ──1:N── emailTemplate ──N:1── trip (optional)
```
