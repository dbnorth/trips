# Feature: Encrypt Person Documents on Disk (Key from AWS Secrets Manager)

**Feature ID:** 63
**Branch pattern:** `feature/63-encrypt-person-documents`
**Status:** Implemented
**Created:** 2026-10-19
**Input:** Encrypt all uploaded documents and decrypt them for use, so they are stored on the disk as encrypted files. The encryption key is stored in AWS Secrets Manager like the email secret (Feature 50).
**Depends on:** [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 34 — Document Specializations](feature-34-document-specializations.md), [Feature 50 — SMTP Password from AWS Secrets Manager](feature-50-aws-secrets-smtp-password.md), [Feature 58 — Participant Documents PDF](feature-58-participant-documents-pdf.md)
**Supersedes:** [Feature 12 — Encrypt Person Pictures & Documents at Rest](feature-12-encrypt-person-media.md) (never implemented; this feature covers documents only and takes the key from AWS Secrets Manager)

---

## User Stories

### US-63.1: Store uploaded documents encrypted on disk
**As a** system administrator
**I want** every uploaded person document and specialization file written to disk only in encrypted form
**So that** someone who can read the server's files cannot see passports, licences, or other documents

**Priority:** P1
**Independent test:** Upload a PDF as a person document; the file under `documents/people/` does not start with `%PDF` and does not contain the original bytes.
**Acceptance scenarios:** see ### US-63.1

### US-63.2: Documents still open, download, and print
**As a** person or authorized staff member
**I want** view, download, and the Documents PDF to keep working with encrypted files
**So that** nothing changes for the people who use documents

**Priority:** P1
**Independent test:** Upload a document, then download it; the response body equals the uploaded bytes.
**Acceptance scenarios:** see ### US-63.2

### US-63.3: Read the encryption key from AWS Secrets Manager
**As a** system administrator
**I want** the backend to get the document encryption key from AWS Secrets Manager
**So that** the key is not stored in GitHub, the production `.env` file, or the source code

**Priority:** P1
**Independent test:** With `FILE_ENCRYPTION_KEY_SECRET_ID=DOC_ENCRIPTION_KEY`, uploading a document asks the Secrets Manager Agent for `DOC_ENCRIPTION_KEY` and encrypts with the value it returns.
**Acceptance scenarios:** see ### US-63.3

---

## Requirements

### Functional Requirements

- **FR-001**: Files uploaded as a person **document** or a person document **specialization** (`POST` / `PUT /trips/people/:id/documents`, fields `document` and `specializationFiles`) MUST be written to `documents/people/` encrypted. The uploaded bytes MUST never be written to disk unencrypted, not even temporarily.
- **FR-002**: Encryption uses **AES-256-GCM** with a new random 12-byte nonce for each file. Each encrypted file is: the 8 ASCII bytes `TRIPSENC`, one version byte `1`, the 12-byte nonce, the ciphertext, then the 16-byte authentication tag.
- **FR-003**: File names, folders, and the stored `documentFileName` values (person document and specialization) stay exactly as today, including the original extension. No database changes.
- **FR-004**: Document **view** and **download** (person document and specialization endpoints) MUST decrypt the file in memory and return the original bytes, with the same access rules, `Content-Type` (from the file extension), and `Content-Disposition` (inline for view, attachment for download, same file name) as today.
- **FR-005**: The **Documents PDF** (Feature 58) MUST decrypt each document and specialization file before adding it to the PDF. A file that cannot be decrypted shows "The file could not be read." on its page, like any other unreadable file.
- **FR-006**: Files written before this feature (not starting with `TRIPSENC`) MUST still be served and added to the Documents PDF as they are. They are not encrypted or changed.
- **FR-007**: A new `.env` setting `FILE_ENCRYPTION_KEY_SECRET_ID` names the AWS Secrets Manager secret holding the key. When it is set, the key MUST be read from the Secrets Manager Agent exactly as Feature 50 reads the SMTP password (same URL, `X-Aws-Parameters-Secrets-Token` header, token file from `SECRETS_AGENT_TOKEN_FILE`, default `/var/run/awssmatoken`). The agent call MUST be shared with Feature 50, not duplicated.
- **FR-008**: When `FILE_ENCRYPTION_KEY_SECRET_ID` is blank or missing, the key comes from the `.env` setting `FILE_ENCRYPTION_KEY` (for development and tests). The agent is not called.
- **FR-009**: The key (`SecretString` or `FILE_ENCRYPTION_KEY`) is 32 random bytes written as base64. Surrounding whitespace is removed. A value that does not decode to exactly 32 bytes counts as a key that cannot be read.
- **FR-010**: The key MUST be read each time a file is encrypted or decrypted (the agent caches it, so this does not call AWS each time).
- **FR-011**: When the key cannot be read (no secret ID and no `FILE_ENCRYPTION_KEY`, token file missing, agent not reachable, agent error status, no `SecretString`, or wrong length), an upload MUST fail with `500` "Could not read the document encryption key." and no file is kept and no row is saved or changed; view and download MUST fail with the same `500` message; the Documents PDF MUST fail with the same `500` message. Documents are never stored unencrypted as a fallback. The cause goes to the application log.
- **FR-012**: When an encrypted file cannot be decrypted (wrong key, damaged, or cut short), view and download MUST fail with `500` "The document could not be decrypted." and return no partial content.
- **FR-013**: The key MUST never be written to any log, stored in the database, or returned by an API.
- **FR-014**: The deploy workflow MUST write `FILE_ENCRYPTION_KEY_SECRET_ID` (from the GitHub secret of the same name, like `SMTP_PASSWORD_SECRET_ID`) to the production `.env`, and MUST NOT write `FILE_ENCRYPTION_KEY`. `backend/.env.example` lists `FILE_ENCRYPTION_KEY_SECRET_ID=` and `FILE_ENCRYPTION_KEY=` (blank, with a comment to generate a key with `openssl rand -base64 32`).
- **FR-015**: **Download** in the browser MUST save the file under its stored file name, including its extension (for example `person-26-1788…-passport.pdf`), so it opens in the right program. The name comes from the response's `Content-Disposition` when the browser can read it, otherwise from the document's or specialization's `documentFileName`. (Locally the API is on another origin and the browser hides `Content-Disposition`; downloads were being saved as `document` with no extension.)

---

## Assumptions

- The production server already runs the AWS Secrets Manager Agent (Feature 50), and its IAM role is given `secretsmanager:GetSecretValue` on the new secret. Creating the secret and granting access happen outside this feature.
- The secret is plain text: its whole `SecretString` is the base64 key.
- Each developer sets their own `FILE_ENCRYPTION_KEY` in `backend/.env`; files encrypted with one developer's key cannot be read with another's.
- Uploads are at most 10 MB (existing limit), so holding a file in memory to encrypt or decrypt is fine.

## Edge Cases

- The secret is changed in AWS → files encrypted with the old key fail with "The document could not be decrypted." Rotating the key safely is out of scope.
- An upload fails validation (bad document type, missing fields) → nothing is written to disk, as today.
- A specialization file is replaced or removed, or a document is deleted → the encrypted file is removed, as today.
- An old unencrypted file and a new encrypted file belong to the same person → both open normally.
- A person document upload with several specialization files → every file is encrypted; if the key cannot be read, none are kept.

## Success Criteria

- **SC-001**: No newly uploaded document or specialization file is readable on disk without the key.
- **SC-002**: View, download, and the Documents PDF return the original content for encrypted and old unencrypted files.
- **SC-003**: Production reads the key from AWS Secrets Manager; the key is not in GitHub or the production `.env`.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

| Rule | Requirement |
|------|-------------|
| **Who may see documents** | Unchanged (Feature 4 person access rules; Feature 58 trip staff rules) |
| **Key** | Held only by the server; used only to encrypt and decrypt document files; never logged, stored in the database, or returned by an API |

---

## Key Entities

- **Encrypted document file** — `TRIPSENC` + version + nonce + ciphertext + tag, at the path in `personDocument.documentFileName` or `personDocumentSpecialization.documentFileName`
- **Document encryption key** — 32 bytes, base64, in AWS Secrets Manager (production) or `FILE_ENCRYPTION_KEY` (development and tests)

---

## API Requirements

No new endpoints. Changed behavior:

| Method | Endpoint | Change |
|--------|----------|--------|
| `POST` / `PUT` | `/trips/people/:id/documents[/:documentId]` | Files stored encrypted; `500` "Could not read the document encryption key." when the key cannot be read |
| `GET` | `/trips/people/:id/documents/:documentId/view` and `/download` | Decrypt before sending; `500` key or decrypt messages (FR-011, FR-012) |
| `GET` | `/trips/people/:id/documents/:documentId/specializations/:specializationId/view` and `/download` | Same as above |
| `GET` | `/trips/trips/:id/participants/:assignmentId/documents/pdf` (Feature 58) | Decrypt each file; `500` when the key cannot be read |

---

## Screen Requirements

No screen changes.

---

## Data Model Requirements

No database changes.

---

## Configuration

| Setting | Where | Example | Notes |
|---------|-------|---------|-------|
| `FILE_ENCRYPTION_KEY_SECRET_ID` | `.env`; GitHub secret for deploy | `DOC_ENCRIPTION_KEY` | Set → key from the Secrets Manager Agent |
| `FILE_ENCRYPTION_KEY` | `.env` (development and tests only) | output of `openssl rand -base64 32` | Used only when `FILE_ENCRYPTION_KEY_SECRET_ID` is blank |
| `SECRETS_AGENT_TOKEN_FILE` | `.env` (optional) | `/var/run/awssmatoken` | Shared with Feature 50 |

---

## Acceptance Criteria (Gherkin)

### US-63.1 — Store uploaded documents encrypted on disk

#### Scenario: Uploaded document is encrypted on disk
* **Given** `FILE_ENCRYPTION_KEY` is a valid key and I can manage person P
* **When** I upload a PDF document for P
* **Then** the stored file under `documents/people/` starts with `TRIPSENC`
* **And** it does not start with `%PDF` and does not contain the uploaded bytes
* **And** `documentFileName` keeps the original extension

#### Scenario: Uploaded specialization file is encrypted on disk
* **Given** `FILE_ENCRYPTION_KEY` is a valid key and a document type that allows specializations
* **When** I upload a person document with a specialization file
* **Then** the stored specialization file starts with `TRIPSENC` and does not contain the uploaded bytes

#### Scenario: Upload fails and keeps nothing when the key cannot be read
* **Given** `FILE_ENCRYPTION_KEY_SECRET_ID` and `FILE_ENCRYPTION_KEY` are both blank
* **When** I upload a document for person P
* **Then** the response is `500` with "Could not read the document encryption key."
* **And** no new file is in `documents/people/`
* **And** no person document row is added

### US-63.2 — Documents still open, download, and print

#### Scenario: Download returns the original document
* **Given** I uploaded a document for person P with the current key
* **When** I download it
* **Then** the response body equals the uploaded bytes
* **And** the file name in `Content-Disposition` is the same as before this feature

#### Scenario: View returns the original specialization file inline
* **Given** I uploaded a PNG specialization file with the current key
* **When** I view it
* **Then** the response body equals the uploaded bytes with `Content-Type` `image/png` and an inline `Content-Disposition`

#### Scenario: Unencrypted file from before this feature still downloads
* **Given** a person document whose file on disk is an unencrypted PDF
* **When** I download it
* **Then** the response body equals the file on disk

#### Scenario: Unauthorized user still cannot download
* **Given** an encrypted document for person P
* **When** a user who cannot manage P downloads it
* **Then** the response is `403`

#### Scenario: Wrong key fails without partial content
* **Given** a document encrypted with one key
* **And** `FILE_ENCRYPTION_KEY` is changed to a different valid key
* **When** I download it
* **Then** the response is `500` with "The document could not be decrypted."

#### Scenario: Downloaded file is saved with its file extension
* **Given** a person document whose `documentFileName` is `people/person-26-1-passport.pdf`
* **And** the download response's `Content-Disposition` cannot be read by the browser
* **When** I click **Download**
* **Then** the file is saved as `person-26-1-passport.pdf`

#### Scenario: Documents PDF includes decrypted files
* **Given** an approved participant with an encrypted PDF document and an encrypted PNG specialization file
* **When** trip staff build that participant's Documents PDF
* **Then** the PDF includes the document's pages and the specialization image, not "The file could not be read."

### US-63.3 — Read the encryption key from AWS Secrets Manager

#### Scenario: Key comes from AWS Secrets Manager
* **Given** `FILE_ENCRYPTION_KEY_SECRET_ID` is `DOC_ENCRIPTION_KEY` and `FILE_ENCRYPTION_KEY` is a different valid key
* **And** the token file contains `agent-token`
* **And** the agent returns a valid base64 key as `SecretString` for `DOC_ENCRIPTION_KEY`
* **When** I upload a document and then download it
* **Then** the agent is asked for `secretId=DOC_ENCRIPTION_KEY` with header `X-Aws-Parameters-Secrets-Token: agent-token`
* **And** the stored file decrypts with the agent's key, not with `FILE_ENCRYPTION_KEY`
* **And** the download returns the uploaded bytes

#### Scenario: Env key is used when no secret is named
* **Given** `FILE_ENCRYPTION_KEY_SECRET_ID` is blank and `FILE_ENCRYPTION_KEY` is a valid key
* **When** I upload a document
* **Then** the agent is not called
* **And** the stored file decrypts with `FILE_ENCRYPTION_KEY`

#### Scenario: Upload fails when the agent returns an error
* **Given** `FILE_ENCRYPTION_KEY_SECRET_ID` is `DOC_ENCRIPTION_KEY`
* **And** the agent returns an error
* **When** I upload a document
* **Then** the response is `500` with "Could not read the document encryption key."
* **And** no new file is in `documents/people/`

#### Scenario: Key of the wrong length is rejected
* **Given** `FILE_ENCRYPTION_KEY_SECRET_ID` is blank and `FILE_ENCRYPTION_KEY` decodes to 16 bytes
* **When** I upload a document
* **Then** the response is `500` with "Could not read the document encryption key."

---

## Test Coverage Map

| Story | Scenario | Test location | `it` / test name |
|-------|----------|---------------|------------------|
| US-63.1 | Uploaded document is encrypted on disk | `backend/tests/document-encryption.test.js` | `Uploaded document is encrypted on disk` |
| US-63.1 | Uploaded specialization file is encrypted on disk | `backend/tests/document-encryption.test.js` | `Uploaded specialization file is encrypted on disk` |
| US-63.1 | Upload fails and keeps nothing when the key cannot be read | `backend/tests/document-encryption.test.js` | `Upload fails and keeps nothing when the key cannot be read` |
| US-63.2 | Download returns the original document | `backend/tests/document-encryption.test.js` | `Download returns the original document` |
| US-63.2 | View returns the original specialization file inline | `backend/tests/document-encryption.test.js` | `View returns the original specialization file inline` |
| US-63.2 | Unencrypted file from before this feature still downloads | `backend/tests/document-encryption.test.js` | `Unencrypted file from before this feature still downloads` |
| US-63.2 | Unauthorized user still cannot download | `backend/tests/document-encryption.test.js` | `Unauthorized user still cannot download` |
| US-63.2 | Wrong key fails without partial content | `backend/tests/document-encryption.test.js` | `Wrong key fails without partial content` |
| US-63.2 | Downloaded file is saved with its file extension | `frontend/tests/personDocumentServices.test.js` | `Downloaded file is saved with its file extension` |
| US-63.2 | Documents PDF includes decrypted files | `backend/tests/document-encryption.test.js` | `Documents PDF includes decrypted files` |
| US-63.3 | Key comes from AWS Secrets Manager | `backend/tests/document-encryption.test.js` | `Key comes from AWS Secrets Manager` |
| US-63.3 | Env key is used when no secret is named | `backend/tests/document-encryption.test.js` | `Env key is used when no secret is named` |
| US-63.3 | Upload fails when the agent returns an error | `backend/tests/document-encryption.test.js` | `Upload fails when the agent returns an error` |
| US-63.3 | Key of the wrong length is rejected | `backend/tests/document-encryption.test.js` | `Key of the wrong length is rejected` |

Tests replace `fetch` so nothing reaches AWS, point `SECRETS_AGENT_TOKEN_FILE` at a temporary file, and set `FILE_ENCRYPTION_KEY` per test. Existing person document, specialization, and Documents PDF tests set a valid `FILE_ENCRYPTION_KEY` and must keep passing, as must the Feature 50 tests in `backend/tests/aws-secrets.test.js`.

---

## Agent implementation request

```text
Implement Feature 63 from @features/feature-63-encrypt-person-documents.md on branch `feature/63-encrypt-person-documents`.

Follow layer order in @features/framework.md.
Move the Secrets Manager Agent call out of backend/app/utils/emailDelivery.js into a shared util used by both email (Feature 50) and document encryption (FR-007); keep Feature 50 behavior and messages unchanged.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` in backend before finishing.
Update @features/reference/behavior.md and @features/reference/api.md (error responses) in the same PR.
Update .github/workflows/deploy.yml and backend/.env.example (FR-014).
Do not encrypt profile pictures, org logos, trip images, or agreement files, and do not re-encrypt existing files.
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/behavior.md` (new row: person document and specialization files encrypted on disk with AES-256-GCM; key from AWS Secrets Manager when `FILE_ENCRYPTION_KEY_SECRET_ID` is set, otherwise `FILE_ENCRYPTION_KEY`; old unencrypted files still served), `features/reference/api.md` (new `500` messages on document upload, view, download, and Documents PDF)

---

## Definition of Done

*   [x] Document and specialization uploads stored encrypted, never unencrypted on disk (**FR-001**–**FR-003**)
*   [x] View, download, and Documents PDF decrypt; old unencrypted files still served (**FR-004**–**FR-006**)
*   [x] Key from the Secrets Manager Agent when `FILE_ENCRYPTION_KEY_SECRET_ID` is set, otherwise `FILE_ENCRYPTION_KEY`; shared agent call (**FR-007**–**FR-010**)
*   [x] Key and decrypt failures return the FR-011 / FR-012 messages; no unencrypted fallback; key never logged (**FR-011**–**FR-013**)
*   [x] Deploy workflow and `backend/.env.example` updated (**FR-014**)
*   [x] Browser download keeps the file name and extension (**FR-015**)
*   [x] Automated tests for every Gherkin scenario; Feature 50 tests still pass
*   [x] Living reference updated in this PR
*   [x] `npm test` green in backend
*   [ ] On `feature/63-encrypt-person-documents`; PR → `dev`
*   [ ] Ops: create the `DOC_ENCRIPTION_KEY` secret (`openssl rand -base64 32`), grant the server's IAM role read access, set the GitHub secret `FILE_ENCRYPTION_KEY_SECRET_ID` to `DOC_ENCRIPTION_KEY`, and back up the key (losing it makes every encrypted document unreadable)

---

## Out of Scope

- Encrypting person profile pictures, org logos, trip images, or organization agreement files
- Encrypting existing unencrypted files (a one-time migration may be a later feature)
- Key rotation or re-encrypting files with a new key
- Installing or configuring the Secrets Manager Agent, the IAM role, or the secret itself
- Calling AWS Secrets Manager directly with the AWS SDK
- Encrypting database columns
