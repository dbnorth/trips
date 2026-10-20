# Feature: Encrypt Personal and Medical Data in the Database (Key from AWS Secrets Manager)

**Feature ID:** 64
**Branch pattern:** `feature/64-encrypt-personal-data-columns`
**Status:** Implemented
**Created:** 2026-10-19
**Input:** Encrypt the PII and medical columns in the database. Medical: allergies, medications, medical conditions, pregnancy, and due date. PII: birthdate, address, phone, emergency contact, and document numbers. Donor address and phone are included. Medical conditions move from link rows to an encrypted list on the person (no clean-up when a condition is removed from an organization's list). Existing values are encrypted by a one-time script. The key is a separate AWS Secrets Manager secret, not the document key.
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 8 — Donors & Donations](feature-8-donors-and-donations.md), [Feature 17 — Org Medical Conditions](feature-17-org-medical-conditions.md), [Feature 19 — Pregnancy Health Questions](feature-19-pregnancy-health-questions.md), [Feature 32 — Emergency Contact Relationship](feature-32-emergency-contact-relationship.md), [Feature 50 — SMTP Password from AWS Secrets Manager](feature-50-aws-secrets-smtp-password.md), [Feature 63 — Encrypt Person Documents on Disk](feature-63-encrypt-person-documents.md)

---

## User Stories

### US-64.1: Store personal and medical data encrypted in the database

**As a** system administrator
**I want** birthdates, addresses, phone numbers, emergency contacts, document numbers, and health answers stored encrypted in MySQL
**So that** a copied database, a database dump, or a leaked backup does not reveal people's personal or medical information

**Priority:** P1
**Independent test:** Save a profile with a birthdate and allergies; selecting the `people` row with SQL shows `enc1:` values, not the birthdate or the allergy text.
**Acceptance scenarios:** see ### US-64.1

### US-64.2: Everything that uses the data keeps working

**As a** person or authorized staff member
**I want** profiles, applications, documents, donors, CSV exports, and PDFs to show the same values as before
**So that** nothing changes for the people who use the app

**Priority:** P1
**Independent test:** Save a profile, then load it; every field equals what was saved.
**Acceptance scenarios:** see ### US-64.2

### US-64.3: Read the encryption key from AWS Secrets Manager

**As a** system administrator
**I want** the backend to get the personal data key from its own AWS Secrets Manager secret
**So that** the key is not in GitHub, the production `.env`, or the source code, and is separate from the document key

**Priority:** P1
**Independent test:** With `PII_ENCRYPTION_KEY_SECRET_ID=PII_ENCRYPTION_KEY`, the server asks the Secrets Manager Agent for `PII_ENCRYPTION_KEY` when it starts and encrypts with the value it returns.
**Acceptance scenarios:** see ### US-64.3

### US-64.4: Encrypt the data already in the database

**As a** system administrator
**I want** a one-time script that encrypts existing values and moves existing medical condition selections
**So that** older records are protected too, not only records saved after this feature

**Priority:** P1
**Independent test:** Run the script against a database with unencrypted values; afterwards every listed column holds only `enc1:` values or `NULL`, and the app shows the same data.
**Acceptance scenarios:** see ### US-64.4

---

## Requirements

### Functional Requirements

- **FR-001**: These columns MUST be stored encrypted (the **encrypted columns**):

  | Table | Columns |
  | ----- | ------- |
  | `people` | `birthDate`, `addLine1`, `addLine2`, `city`, `state_prov`, `postalCode`, `phoneNumber`, `emergencyContactName`, `emergencyContactPhoneNumber`, `hasAllergies`, `allergiesDescription`, `takesMedication`, `medicalConditionIds` (new, FR-008) |
  | `tripPeopleRoles` | `isPregnant`, `pregnancyDueDate` |
  | `personDocuments` | `documentNumber` |
  | `donors` | `addLine1`, `addLine2`, `city`, `state_prov`, `postalCode`, `phoneNumber` |

- **FR-002**: Each encrypted value is stored as text: `enc1:` followed by base64 of the 12-byte nonce, the ciphertext, and the 16-byte authentication tag. Encryption uses **AES-256-GCM** with a new random 12-byte nonce for every value written.
- **FR-003**: Before encrypting, values are written as text: strings as UTF-8; Yes/No answers as `1` or `0` (so Yes and No encrypt to the same length); dates as `YYYY-MM-DD`; `medicalConditionIds` as a JSON array of numbers in ascending order. `null` is stored as `NULL` and is not encrypted. An empty string is encrypted like any other string.
- **FR-004**: Encryption and decryption MUST happen in the Sequelize models, so every read returns the original value and type (string, `true`/`false`/`null`, `YYYY-MM-DD` date string, array of numbers) and every write path stores only encrypted values. This includes instance saves, `Model.create`, `Model.update`, `bulkCreate`, and `toJSON()`. API request and response shapes do not change.
- **FR-005**: A value that does not start with `enc1:` (written before this feature) MUST be read as it is: `1`/`0` become `true`/`false` for Yes/No columns, and dates stay `YYYY-MM-DD`. It is encrypted the next time it is saved.
- **FR-006**: `ensureSchema` MUST change every encrypted column to `TEXT NULL` when it is not already `TEXT`, keeping existing values (Yes/No become `1`/`0`, dates become `YYYY-MM-DD`). It MUST add `people.medicalConditionIds TEXT NULL` when missing.
- **FR-007**: No query may filter, sort, group, or join on an encrypted column. Validation of these fields (required fields, date format, pregnancy rules, document number required) stays in the API as today.
- **FR-008**: Medical conditions MUST be stored as the encrypted `people.medicalConditionIds` list instead of `personMedicalConditions` rows. Saving the profile for an organization replaces only that organization's IDs in the list and keeps other organizations' IDs, as today. When `takesMedication` is false, that organization's IDs are removed. IDs that must belong to the organization are checked as today.
- **FR-009**: Reading a person's medical conditions MUST look up the IDs in the list and return `medicalConditions` (`id`, `name`, `orgId`) and `medicalConditionIds` as today, including the `?orgId=` filter. IDs not found (the condition was removed from the organization's list) MUST be ignored. Removing a condition from an organization's list does not change any person's list.
- **FR-010**: The `personMedicalCondition` model and its associations MUST be removed, and `ensureSchema` MUST no longer create the `personMedicalConditions` table. Profile completeness (Feature 17), the application profile answers (Feature 47), and the participants CSV MUST use the list.
- **FR-011**: A new `.env` setting `PII_ENCRYPTION_KEY_SECRET_ID` names the AWS Secrets Manager secret holding the key. When set, the key MUST be read with the shared Secrets Manager Agent call used by Features 50 and 63 (same URL, header, and token file). When blank or missing, the key comes from `PII_ENCRYPTION_KEY` (development and tests) and the agent is not called. The key MUST NOT come from `FILE_ENCRYPTION_KEY_SECRET_ID` or `FILE_ENCRYPTION_KEY`.
- **FR-012**: The key is 32 random bytes written as base64; surrounding whitespace is removed; a value that does not decode to exactly 32 bytes counts as a key that cannot be read.
- **FR-013**: The key MUST be read once when a process starts and kept in memory for that process (the API server, the scheduled email job, and the one-time script). A changed secret takes effect after a restart.
- **FR-014**: When the key cannot be read at startup, the process MUST log "Could not read the personal data encryption key." with the cause, and exit with a non-zero code without serving requests or running its job. Data is never stored unencrypted as a fallback.
- **FR-015**: When an `enc1:` value cannot be decrypted (wrong key or damaged), the request MUST fail with `500` "Personal data could not be decrypted." The log names the table, column, and row id, never the value.
- **FR-016**: The key and decrypted values MUST never be written to any log, and the key MUST never be stored in the database or returned by an API.
- **FR-017**: A one-time script `npm run encrypt-personal-data` (`backend/app/scripts/encryptPersonalData.js`) MUST:
  - read the key as in FR-011 and FR-012, and stop with a non-zero exit code and no changes when it cannot;
  - run `ensureSchema` first (FR-006);
  - encrypt every non-null encrypted-column value that does not start with `enc1:`;
  - add each person's `personMedicalConditions` rows to their `medicalConditionIds` list (merged with any IDs already there), then drop the `personMedicalConditions` table;
  - print the number of values encrypted per table and column, never the values;
  - be safe to run again: a second run changes nothing, and a run that stopped partway finishes the job.
- **FR-018**: The deploy workflow MUST write `PII_ENCRYPTION_KEY_SECRET_ID` (from the GitHub secret of the same name) to the production `.env`, and MUST NOT write `PII_ENCRYPTION_KEY`. `backend/.env.example` lists `PII_ENCRYPTION_KEY_SECRET_ID=` and `PII_ENCRYPTION_KEY=` (blank, with a comment to generate a key with `openssl rand -base64 32`); `backend/.env.test.example` sets a test-only `PII_ENCRYPTION_KEY` different from `FILE_ENCRYPTION_KEY`.

---

## Assumptions

- The production server runs the AWS Secrets Manager Agent (Features 50 and 63), and its IAM role is given `secretsmanager:GetSecretValue` on the new secret. Creating the secret and granting access happen outside this feature.
- The secret is plain text: its whole `SecretString` is the base64 key.
- Country, phone country codes, emergency contact relationship, gender, names, and email addresses stay unencrypted. Names and emails are needed for sign-in, donor lookup, sorting, and email sending.
- No screen searches or sorts these columns in SQL today (searching happens in the browser on loaded data), so encrypting them does not remove any feature.
- Database backups taken before the script runs still hold unencrypted values; handling old backups is an operations task.

## Edge Cases

- A person has conditions from two organizations → saving the profile for one organization keeps the other's IDs.
- A condition is removed from an organization's list → people who had it no longer show it; if it was their only condition and they take medication, their profile becomes incomplete, as today.
- Existing values encrypted with a different key (another developer's database) → reading fails with "Personal data could not be decrypted."
- The script is run before the new code is deployed → not supported; deploy first, then run the script.
- The server starts with an unencrypted database (script not run yet) → everything is read as before (FR-005), and records are encrypted as they are saved.

## Success Criteria

- **SC-001**: After the script runs, no encrypted column holds a readable value.
- **SC-002**: Every screen, CSV export, PDF, and email shows the same personal and medical values as before.
- **SC-003**: Production reads the key from its own AWS Secrets Manager secret; the key is not in GitHub or the production `.env`.
- **SC-004**: Automated tests for the scenarios below pass, and existing person, application, document, donor, export, and PDF tests keep passing.

---

## Data Ownership & Isolation

| Rule                         | Requirement                                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Who may see the data**     | Unchanged (Features 2, 4, 7, 8, 53 access rules)                                                                             |
| **Key**                      | Held only by the server in memory; used only for the encrypted columns; never logged, stored in the database, or returned by an API |
| **Separate from documents**  | Different secret and setting from the Feature 63 document key                                                                |

---

## Key Entities

- **Encrypted column value** — `enc1:` + base64(nonce + ciphertext + tag), in a `TEXT` column
- **Person medical condition list** — `people.medicalConditionIds`, an encrypted JSON array of `medicalCondition` IDs from any organization
- **Personal data encryption key** — 32 bytes, base64, in AWS Secrets Manager (production) or `PII_ENCRYPTION_KEY` (development and tests)

---

## API Requirements

No new endpoints. Request and response shapes do not change. Changed behavior:

| Method   | Endpoint                                     | Change                                                                                     |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| any      | Any endpoint that reads an encrypted column  | `500` "Personal data could not be decrypted." when a value cannot be decrypted (FR-015)   |
| `GET`    | `/trips/people/:id`                          | `medicalConditions` / `medicalConditionIds` come from the person's list; unknown IDs ignored |
| `PUT`    | `/trips/people/:id`                          | `medicalConditionIds` + `orgId` update the person's list instead of link rows              |
| `DELETE` | `/trips/medical-conditions/:id`              | No longer removes the condition from people's lists (they ignore it)                      |

---

## Screen Requirements

No screen changes.

---

## Data Model Requirements

| Table | Change |
| ----- | ------ |
| `people` | Encrypted columns (FR-001) become `TEXT NULL`; new `medicalConditionIds TEXT NULL` |
| `tripPeopleRoles` | `isPregnant`, `pregnancyDueDate` become `TEXT NULL` |
| `personDocuments` | `documentNumber` becomes `TEXT NULL` |
| `donors` | `addLine1`, `addLine2`, `city`, `state_prov`, `postalCode`, `phoneNumber` become `TEXT NULL` |
| `personMedicalConditions` | Removed (rows moved to `people.medicalConditionIds` by the script) |

---

## Configuration

| Setting                        | Where                               | Example                             | Notes                                                  |
| ------------------------------ | ----------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| `PII_ENCRYPTION_KEY_SECRET_ID` | `.env`; GitHub secret for deploy    | `PII_ENCRYPTION_KEY`                | Set → key from the Secrets Manager Agent at startup    |
| `PII_ENCRYPTION_KEY`           | `.env` (development and tests only) | output of `openssl rand -base64 32` | Used only when `PII_ENCRYPTION_KEY_SECRET_ID` is blank |
| `SECRETS_AGENT_TOKEN_FILE`     | `.env` (optional)                   | `/var/run/awssmatoken`              | Shared with Features 50 and 63                         |

---

## Acceptance Criteria (Gherkin)

### US-64.1 — Store personal and medical data encrypted in the database

#### Scenario: Profile personal and health answers are encrypted

- **Given** `PII_ENCRYPTION_KEY` is a valid key and I can manage person P
- **When** I save P's profile with a birthdate, address, phone, emergency contact name and phone, allergies "Peanuts", and takes medication Yes
- **Then** each of those columns in P's `people` row starts with `enc1:`
- **And** no column contains "Peanuts", the birthdate, or the phone number

#### Scenario: Medical conditions are stored as an encrypted list

- **Given** organization O has medical conditions C1 and C2
- **When** I save P's profile for O with takes medication Yes and conditions C1 and C2
- **Then** P's `medicalConditionIds` starts with `enc1:`
- **And** there is no `personMedicalConditions` table

#### Scenario: Pregnancy answers are encrypted

- **When** I save an application for P with pregnant Yes and due date `2027-03-01`
- **Then** that `tripPeopleRoles` row's `isPregnant` and `pregnancyDueDate` start with `enc1:`

#### Scenario: Document number is encrypted

- **When** I save a person document for P with document number `X1234567`
- **Then** that `personDocuments` row's `documentNumber` starts with `enc1:` and does not contain `X1234567`

#### Scenario: Donor address and phone are encrypted

- **When** a donor is created by staff and another by a public donation, each with an address and phone
- **Then** both `donors` rows have `addLine1`, `city`, `state_prov`, `postalCode`, and `phoneNumber` starting with `enc1:`
- **And** their `email` is unchanged

#### Scenario: Yes and No answers encrypt to the same length

- **When** P1 is saved with has allergies Yes and P2 with has allergies No
- **Then** both `hasAllergies` values have the same length

### US-64.2 — Everything that uses the data keeps working

#### Scenario: Profile returns the saved values

- **Given** I saved P's profile with personal and health answers
- **When** I load P
- **Then** every field equals what I saved, with `hasAllergies` and `takesMedication` as `true`/`false` and `birthDate` as `YYYY-MM-DD`

#### Scenario: Medical conditions are filtered by organization and removed conditions are ignored

- **Given** P's list has condition C1 from organization O1 and C3 from organization O2
- **And** C3 is then removed from O2's list
- **When** I load P with `?orgId=O1`
- **Then** `medicalConditionIds` is `[C1]`
- **And** loading P without `orgId` returns only C1

#### Scenario: Saving conditions for one organization keeps the other's

- **Given** P's list has C1 from O1 and C3 from O2
- **When** I save P's profile for O1 with takes medication No
- **Then** P's list is `[C3]`

#### Scenario: Participants CSV shows decrypted values

- **Given** an approved participant with an address, birthdate, allergies, and pregnancy answers
- **When** staff export the participants CSV
- **Then** the row shows those values as entered

#### Scenario: Room list PDF shows the decrypted passport number

- **Given** a participant in a room with a passport whose document number is `X1234567`
- **When** staff build the room list PDF
- **Then** the PDF includes `X1234567`

#### Scenario: Value saved before this feature still reads

- **Given** P's `phoneNumber` column holds `555-0100` and `hasAllergies` holds `1`, not encrypted
- **When** I load P
- **Then** `phoneNumber` is `555-0100` and `hasAllergies` is `true`

#### Scenario: Wrong key fails without returning data

- **Given** P's profile was saved with one key
- **And** the key in memory is changed to a different valid key
- **When** I load P
- **Then** the response is `500` with "Personal data could not be decrypted."

### US-64.3 — Read the encryption key from AWS Secrets Manager

#### Scenario: Key comes from AWS Secrets Manager once

- **Given** `PII_ENCRYPTION_KEY_SECRET_ID` is `PII_ENCRYPTION_KEY` and `PII_ENCRYPTION_KEY` is a different valid key
- **And** the agent returns a valid base64 key as `SecretString` for `PII_ENCRYPTION_KEY`
- **When** the key is loaded and I save and load two profiles
- **Then** the agent was asked once, for `secretId=PII_ENCRYPTION_KEY`
- **And** the stored values decrypt with the agent's key, not with `PII_ENCRYPTION_KEY`

#### Scenario: Env key is used when no secret is named

- **Given** `PII_ENCRYPTION_KEY_SECRET_ID` is blank and `PII_ENCRYPTION_KEY` is a valid key
- **When** the key is loaded
- **Then** the agent is not called and values decrypt with `PII_ENCRYPTION_KEY`

#### Scenario: Document key is not used

- **Given** `PII_ENCRYPTION_KEY_SECRET_ID` and `PII_ENCRYPTION_KEY` are blank and `FILE_ENCRYPTION_KEY` is a valid key
- **When** the key is loaded
- **Then** loading fails with "Could not read the personal data encryption key."

#### Scenario: Startup stops when the key cannot be read

- **Given** the agent returns an error for the named secret
- **When** the server starts
- **Then** it logs "Could not read the personal data encryption key."
- **And** it exits with a non-zero code without listening for requests

#### Scenario: Key of the wrong length is rejected

- **Given** `PII_ENCRYPTION_KEY` decodes to 16 bytes and no secret is named
- **When** the key is loaded
- **Then** loading fails with "Could not read the personal data encryption key."

### US-64.4 — Encrypt the data already in the database

#### Scenario: Script encrypts existing values and moves conditions

- **Given** person P with unencrypted birthdate, address, and allergies, and `personMedicalConditions` rows for C1 and C2
- **And** an application with unencrypted pregnancy answers, a document with an unencrypted number, and a donor with an unencrypted address
- **When** I run `npm run encrypt-personal-data`
- **Then** every non-null encrypted column value starts with `enc1:`
- **And** P's `medicalConditionIds` decrypts to `[C1, C2]` and the `personMedicalConditions` table is gone
- **And** loading P returns the same values as before the script
- **And** the output lists counts, not values

#### Scenario: Running the script twice changes nothing

- **Given** the script has already run
- **When** I run it again
- **Then** no value changes and every count is 0

#### Scenario: Script stops without a key

- **Given** no personal data key can be read
- **When** I run the script
- **Then** it exits with a non-zero code
- **And** no value or table is changed

---

## Test Coverage Map

| Story   | Scenario                                                                     | Test location                                   | `it` / test name                                                             |
| ------- | ---------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| US-64.1 | Profile personal and health answers are encrypted                            | `backend/tests/personal-data-encryption.test.js` | `Profile personal and health answers are encrypted`                          |
| US-64.1 | Medical conditions are stored as an encrypted list                           | `backend/tests/personal-data-encryption.test.js` | `Medical conditions are stored as an encrypted list`                         |
| US-64.1 | Pregnancy answers are encrypted                                              | `backend/tests/personal-data-encryption.test.js` | `Pregnancy answers are encrypted`                                            |
| US-64.1 | Document number is encrypted                                                 | `backend/tests/personal-data-encryption.test.js` | `Document number is encrypted`                                               |
| US-64.1 | Donor address and phone are encrypted                                        | `backend/tests/personal-data-encryption.test.js` | `Donor address and phone are encrypted`                                      |
| US-64.1 | Yes and No answers encrypt to the same length                                | `backend/tests/personal-data-encryption.test.js` | `Yes and No answers encrypt to the same length`                              |
| US-64.2 | Profile returns the saved values                                             | `backend/tests/personal-data-encryption.test.js` | `Profile returns the saved values`                                           |
| US-64.2 | Medical conditions are filtered by organization and removed conditions are ignored | `backend/tests/personal-data-encryption.test.js` | `Medical conditions are filtered by organization and removed conditions are ignored` |
| US-64.2 | Saving conditions for one organization keeps the other's                     | `backend/tests/personal-data-encryption.test.js` | `Saving conditions for one organization keeps the other's`                   |
| US-64.2 | Participants CSV shows decrypted values                                      | `backend/tests/personal-data-encryption.test.js` | `Participants CSV shows decrypted values`                                    |
| US-64.2 | Room list PDF shows the decrypted passport number                            | `backend/tests/personal-data-encryption.test.js` | `Room list PDF shows the decrypted passport number`                          |
| US-64.2 | Value saved before this feature still reads                                  | `backend/tests/personal-data-encryption.test.js` | `Value saved before this feature still reads`                                |
| US-64.2 | Wrong key fails without returning data                                       | `backend/tests/personal-data-encryption.test.js` | `Wrong key fails without returning data`                                     |
| US-64.3 | Key comes from AWS Secrets Manager once                                      | `backend/tests/personal-data-encryption.test.js` | `Key comes from AWS Secrets Manager once`                                    |
| US-64.3 | Env key is used when no secret is named                                      | `backend/tests/personal-data-encryption.test.js` | `Env key is used when no secret is named`                                    |
| US-64.3 | Document key is not used                                                     | `backend/tests/personal-data-encryption.test.js` | `Document key is not used`                                                   |
| US-64.3 | Startup stops when the key cannot be read                                    | `backend/tests/personal-data-encryption.test.js` | `Startup stops when the key cannot be read`                                  |
| US-64.3 | Key of the wrong length is rejected                                          | `backend/tests/personal-data-encryption.test.js` | `Key of the wrong length is rejected`                                        |
| US-64.4 | Script encrypts existing values and moves conditions                         | `backend/tests/personal-data-encryption.test.js` | `Script encrypts existing values and moves conditions`                       |
| US-64.4 | Running the script twice changes nothing                                     | `backend/tests/personal-data-encryption.test.js` | `Running the script twice changes nothing`                                   |
| US-64.4 | Script stops without a key                                                   | `backend/tests/personal-data-encryption.test.js` | `Script stops without a key`                                                 |

Tests replace `fetch` so nothing reaches AWS, set `PII_ENCRYPTION_KEY` per test, and read raw column values with SQL to check what is stored. The test setup loads the key before any test reads or writes these columns. Existing person, medical condition, application, pregnancy, document, donor, export, and PDF tests must keep passing (updated only where they create `personMedicalConditions` rows directly), as must the Feature 50 and Feature 63 tests.

---

## Agent implementation request

```text
Implement Feature 64 from @features/feature-64-encrypt-personal-data-columns.md on branch `feature/64-encrypt-personal-data-columns`.

Follow layer order in @features/framework.md.
Reuse the shared Secrets Manager Agent call in backend/app/utils/awsSecrets.js (Features 50 and 63); do not change Feature 50 or 63 behavior or messages.
Encrypt and decrypt in the Sequelize models (FR-004) with a key loaded once at process start (FR-013); load it in server.js, sendScheduledEmails.js, the new script, and the test setup.
Replace personMedicalCondition with people.medicalConditionIds (FR-008 – FR-010); the existing one-time takesMedication clean-up in ensureSchema must not fail when personMedicalConditions is gone.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend before finishing.
Update @features/reference/data-model.md, @features/reference/behavior.md, and @features/reference/api.md in the same PR.
Update .github/workflows/deploy.yml, backend/.env.example, and backend/.env.test.example (FR-018).
Do not encrypt names, emails, country, phone country codes, emergency contact relationship, gender, or any column not in FR-001.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/data-model.md` (column types on `people`, `tripPeopleRoles`, `personDocuments`, `donors`; new `people.medicalConditionIds`; `personMedicalCondition` removed; note on encrypted columns), `features/reference/behavior.md` (new row: listed personal and medical columns stored AES-256-GCM encrypted with a key from AWS Secrets Manager when `PII_ENCRYPTION_KEY_SECRET_ID` is set, otherwise `PII_ENCRYPTION_KEY`; server will not start without the key; medical conditions kept as an encrypted ID list, removed conditions ignored), `features/reference/api.md` (new `500` message; medical condition notes on `GET` / `PUT /trips/people/:id` and `DELETE /trips/medical-conditions/:id`)

---

## Definition of Done

- [x] Listed columns stored encrypted on every write path; Yes/No fixed length (**FR-001**–**FR-004**)
- [x] Older unencrypted values still read; columns changed to `TEXT` by `ensureSchema`; no SQL filter or sort on encrypted columns (**FR-005**–**FR-007**)
- [x] Medical conditions moved to the encrypted list; link model and table removed; removed conditions ignored (**FR-008**–**FR-010**)
- [x] Key from its own secret or `PII_ENCRYPTION_KEY`, read once at startup; process stops without it; decrypt failures return the FR-015 message; nothing sensitive logged (**FR-011**–**FR-016**)
- [x] `npm run encrypt-personal-data` script, safe to run again (**FR-017**)
- [x] Deploy workflow, `backend/.env.example`, and `backend/.env.test.example` updated (**FR-018**)
- [x] Automated tests for every Gherkin scenario; existing and Feature 50 / 63 tests still pass
- [x] Living reference updated in this PR
- [x] `npm test` green in backend
- [ ] On `feature/64-encrypt-personal-data-columns`; PR → `dev`
- [ ] Ops, **before deploying**: create the `PII_ENCRYPTION_KEY` secret (`openssl rand -base64 32`), add its ARN to the server IAM policy's `Resource` list, set the GitHub secret `PII_ENCRYPTION_KEY_SECRET_ID` to `PII_ENCRYPTION_KEY`, and back up the key (losing it makes the encrypted data unreadable). The server will not start until this is done.
- [ ] Ops, **after deploying**: back up the database, run `npm run encrypt-personal-data` once on the server, and delete or secure older unencrypted backups

---

## Out of Scope

- Encrypting names, email addresses, country, phone country codes, emergency contact relationship, gender, church fields, bio, application agreement signer fields, or any column not in FR-001
- Searching or sorting by an encrypted column in SQL
- Removing a deleted condition's ID from people's lists
- Key rotation or re-encrypting values with a new key
- Installing or configuring the Secrets Manager Agent, the IAM role, or the secret itself
- MySQL storage-level (tablespace) encryption or EBS encryption
- Encrypting existing database backups
