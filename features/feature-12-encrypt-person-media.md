# Feature: Encrypt Person Pictures & Documents at Rest

**Feature ID:** 12
**Branch pattern:** `feature/12-encrypt-person-media`
**Status:** Ready
**Created:** 2026-08-02
**Input:** Protect person profile pictures and uploaded person documents (passports / medical licences) with encryption at rest on the server filesystem
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md)
**Related:** [Feature 9 — Public Fundraising Pages](feature-9-public-fundraising-pages.md) (participant pictures on public donate pages), [docs/nfr/quality-attributes.md](../docs/nfr/quality-attributes.md) (Privacy)

---

## User Stories

### US-12.1: Store person media encrypted on disk
**As the** system  
**I want** newly uploaded person profile pictures and person documents written to disk only in encrypted form  
**So that** filesystem access alone does not expose passport, licence, or profile image bytes

**Priority:** P1  
**Independent test:** Upload picture/document; on-disk file is not a valid plaintext image/PDF  
**Acceptance scenarios:** see ### US-12.1

### US-12.2: Authorized users still view and download media
**As a** person (self) or authorized admin  
**I want** view/download/picture display to keep working after encryption  
**So that** staff and applicants can use the same flows without handling keys

**Priority:** P1  
**Independent test:** Authenticated view/download/picture endpoints return decrypted content  
**Acceptance scenarios:** see ### US-12.2

### US-12.3: Public fundraising still shows approved participant pictures
**As a** visitor on a public participant donate page  
**I want** to see the participant’s profile picture when the app already exposes it publicly  
**So that** fundraising pages remain usable after pictures are encrypted at rest

**Priority:** P1  
**Independent test:** Public picture URL/stream for an approved public participant returns image bytes  
**Acceptance scenarios:** see ### US-12.3

---

## Requirements

### Functional Requirements

- **FR-001**: Person **profile pictures** (`PUT /trips/people/:id/picture` → files under `images/people/`) and **person documents** (`POST/PUT …/documents` → files under `documents/people/`) MUST be stored on disk **encrypted**. Plaintext bytes MUST NOT remain on disk after a successful upload completes.
- **FR-002**: Encryption MUST use **AES-256-GCM** (or equivalent authenticated encryption). The key MUST come from environment configuration (e.g. `FILE_ENCRYPTION_KEY`), not hardcoded in source. Missing key in production MUST fail closed (refuse uploads / fail startup as implemented — document in Approach).
- **FR-003**: Encrypted files MUST include enough framing (version/nonce/tag) that decrypt can detect ciphertext vs legacy plaintext.
- **FR-004**: Document **view** and **download** endpoints MUST decrypt in memory (or stream decrypt) and return plaintext to **authorized** callers only — same access rules as Feature 4 (self / org admin / system admin). Unauthorized callers MUST still get `403`/`404` as today.
- **FR-005**: Person pictures MUST **not** be served as raw static files from `/trips/images/...` for encrypted media. The app MUST provide:
  - An **authenticated** picture stream for signed-in users who may view that person (same manage/view gates as person profile), and
  - A **public** picture stream (or signed public URL) usable by Feature 9 public participant pages for approved/public-facing participants only — without exposing other persons’ pictures.
- **FR-006**: Frontend picture URLs (`PersonServices.getPictureUrl` and public pages) MUST use the new stream endpoints (or equivalent), not assume anonymous static paths for encrypted people pictures.
- **FR-007**: **Legacy** plaintext files already on disk MUST remain readable: on read, if the file is not valid ciphertext framing, serve as plaintext once. New uploads MUST always write ciphertext. Optional one-time re-encrypt migration MAY be included but is not required for DoD.
- **FR-008**: Org logos, trip images, and organization agreement Markdown files are **out of scope** for this feature (remain as today).
- **FR-009**: DB columns (`person.picture`, `personDocument.documentFileName`) continue to store relative paths only — no requirement to store ciphertext in MySQL.

---

## Assumptions

- Today uploads are plaintext via multer (`images/people`, `documents/people`) and pictures are often loaded via `express.static` `/trips/images`.
- Access control already exists for documents; pictures are the bigger behavioral change because of static + public pages.
- Key management is env-based for this product scale (no HSM / KMS required unless a later ADR says so).
- Privacy NFR remains “Authorized access only”; this feature strengthens **at-rest** protection on the host filesystem.

## Edge Cases

- Wrong or missing `FILE_ENCRYPTION_KEY` after files were encrypted → decrypt fails; API returns `500` with a safe message (no key material in responses).
- Truncated/corrupt ciphertext → fail closed (error), do not return partial plaintext.
- Upload then immediate view/download MUST succeed with the same key.
- Deleting a person document / replacing a picture MUST remove the encrypted file (same cleanup as today).
- Public picture endpoint MUST NOT reveal existence of non-public persons beyond existing Feature 9 not-found behavior.

## Success Criteria

- **SC-001**: After upload, reading the on-disk person picture or document file does not yield a recognizable plaintext image/PDF without the key.
- **SC-002**: Authorized document download returns the original file content.
- **SC-003**: Authenticated UI can display the person picture after upload.
- **SC-004**: Public participant donate page can still display that participant’s picture when Feature 9 already allows it.
- **SC-005**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

- Encryption does not change who may access media — Feature 2/4/9 authorization still applies.
- The server holds the key; clients never receive the encryption key.
- Ciphertext on disk is still sensitive metadata (filenames may include person id); filesystem permissions remain required ops practice.

---

## Key Entities

- **Encrypted person picture file** — ciphertext on disk; path still on `person.picture`
- **Encrypted person document file** — ciphertext on disk; path still on `personDocument.documentFileName`
- **FILE_ENCRYPTION_KEY** — deployment secret (env)

No new domain tables required unless implementation stores key ids / wrap versions (optional; prefer path-only + file framing).

---

## API Requirements

| Method | Endpoint | Auth | Change |
|--------|----------|------|--------|
| `PUT` | `/trips/people/:id/picture` | Yes | Encrypt before/as write to disk |
| `GET` | `/trips/people/:id/picture` | Yes | **New** (or equivalent): decrypt and stream image for authorized viewers |
| `POST/PUT` | `/trips/people/:id/documents` | Yes | Encrypt file bytes at rest |
| `GET` | `…/documents/:documentId/view` | Yes | Decrypt then inline |
| `GET` | `…/documents/:documentId/download` | Yes | Decrypt then download |
| `GET` | `/trips/public/…/picture` (path as designed) | No* | **New** public stream for Feature 9–eligible participant pictures only |

\*Public picture access limited to participants already exposed by Feature 9 public APIs.

Paths may be adjusted slightly in implementation if needed for routing clarity; Test Coverage Map / living `api.md` must match shipped paths.

**Env:** document `FILE_ENCRYPTION_KEY` in `.env.example` (placeholder only; never commit real keys).

---

## Screen Requirements

| Surface | Change |
|---------|--------|
| Edit Person / profile avatars | Use authenticated picture URL/stream (with Bearer) or blob fetch — not raw `/trips/images/people/...` for encrypted files |
| Person documents view/download | Unchanged UX; backend decrypts |
| Public donor participant page | Load picture via public decrypt stream |
| Trip browse / trip view leader/participant avatars | Use endpoints that can decrypt under existing auth |

No new admin “encryption settings” UI required.

---

## Data Model Requirements

No required schema change. Optional later: `encryptionVersion` on person/document rows — **not** required if framing is in the file.

Update living `data-model.md` only if columns are added; always update `api.md` / `behavior.md` for the new picture endpoints and at-rest rule.

---

## Acceptance Criteria (Gherkin)

### US-12.1 — Store person media encrypted on disk

#### Scenario: Uploaded person document is ciphertext on disk
* **Given** I can edit person P
* **When** I upload a document for P
* **Then** the file stored under `documents/people/` is not readable as the original plaintext PDF/image without the encryption key
* **And** `personDocument.documentFileName` still points at that file

#### Scenario: Uploaded person picture is ciphertext on disk
* **Given** I can edit person P
* **When** I upload a profile picture for P
* **Then** the file stored under `images/people/` is not a plaintext image on disk without the encryption key

### US-12.2 — Authorized users still view and download media

#### Scenario: Authorized user downloads decrypted document
* **Given** an encrypted person document exists for person P
* **And** I am authorized to access P’s documents
* **When** I download the document
* **Then** the response body matches the original uploaded bytes
* **And** an unauthorized user still cannot download it

#### Scenario: Authorized user retrieves decrypted picture
* **Given** an encrypted profile picture exists for person P
* **And** I am authorized to view P
* **When** I request the person picture stream
* **Then** the response is a recognizable image (correct content-type / non-empty body)

### US-12.3 — Public fundraising still shows approved participant pictures

#### Scenario: Public participant page can load encrypted picture
* **Given** an approved participant with a profile picture is visible on a Feature 9 public page
* **When** a visitor requests that participant’s public picture stream
* **Then** the response returns image bytes
* **And** a visitor cannot load a picture for a person not exposed by the public participant API

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-12.1 | Uploaded person document is ciphertext on disk | `backend/tests/media-encryption.test.js` | `Uploaded person document is ciphertext on disk` |
| US-12.1 | Uploaded person picture is ciphertext on disk | `backend/tests/media-encryption.test.js` | `Uploaded person picture is ciphertext on disk` |
| US-12.2 | Authorized user downloads decrypted document | `backend/tests/media-encryption.test.js` | `Authorized user downloads decrypted document` |
| US-12.2 | Authorized user retrieves decrypted picture | `backend/tests/media-encryption.test.js` | `Authorized user retrieves decrypted picture` |
| US-12.3 | Public participant page can load encrypted picture | `backend/tests/media-encryption.test.js` | `Public participant page can load encrypted picture` |

---

## Agent implementation request

```text
Implement Feature 12 from @features/feature-12-encrypt-person-media.md on branch `feature/12-encrypt-person-media`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/api.md and @features/reference/behavior.md (and data-model.md only if schema changes) in the same PR.
Add FILE_ENCRYPTION_KEY to backend/.env.example (placeholder).
Do not encrypt org logos, trip images, or agreement markdown (FR-008).
Do not implement behavior not in this spec.
```

**Reference updates:** `features/reference/api.md`, `features/reference/behavior.md` (and `data-model.md` if columns added)

---

## Definition of Done

*   [ ] Backend encrypt/decrypt for person pictures and documents (**FR-00N**)
*   [ ] Frontend uses non-static picture URLs where required (**FR-006**)
*   [ ] Public participant pictures still work (**FR-005**, US-12.3)
*   [ ] Automated tests for every Gherkin scenario
*   [ ] `npm test` green
*   [ ] Living reference + `.env.example` updated
*   [ ] Ops note: production must set a strong `FILE_ENCRYPTION_KEY` (separate from `AUTH_SECRET`)

## Out of Scope

- Encrypting org logos, trip marketing images, or agreement `.md` files
- Client-side / end-to-end encryption where only the user holds the key
- Key rotation UI, multi-key KMS/HSM, or per-tenant keys
- Encrypting MySQL column values for person demographics
- Changing Feature 4 document-type catalog rules
- PCI / payment card storage (already out of scope app-wide)
