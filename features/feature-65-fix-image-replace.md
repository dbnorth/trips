# Feature: Replacing a Picture, Logo, or Trip Image Keeps the New File

**Feature ID:** 65
**Branch pattern:** `feature/65-fix-image-replace`
**Status:** Implemented
**Created:** 2026-10-19
**Input:** Defect — on AWS, uploading a new profile picture reports success, but `https://missiontrips.app/trips/images/people/person-3.png` then returns "Cannot GET". The same happened for an organization logo (`/trips/images/logos/org-1.png`).
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 3 — Organizations](feature-3-organizations-and-agreements.md), [Feature 5 — Trip Catalog](feature-5-trip-catalog-management.md)

---

## User Stories

### US-65.1: Replace my profile picture
**As a** person (or staff managing a person)  
**I want** a new profile picture to replace the old one  
**So that** the profile shows the new picture instead of a broken image

**Priority:** P1  
**Independent test:** Upload a PNG picture for a person, upload another PNG, then `GET /trips/images/<stored picture>` returns 200  
**Acceptance scenarios:** see ### US-65.1

### US-65.2: Replace an organization logo
**As an** Org Admin or System Admin  
**I want** a new logo to replace the old one  
**So that** the organization pages and PDFs show the new logo

**Priority:** P1  
**Independent test:** Upload a PNG logo, upload another PNG, then the stored logo URL returns 200  
**Acceptance scenarios:** see ### US-65.2

### US-65.3: Replace a trip image
**As** trip staff  
**I want** a new trip image to replace the old one  
**So that** the trip pages show the new image

**Priority:** P1  
**Independent test:** Upload a PNG trip image, upload another PNG, then the stored image URL returns 200  
**Acceptance scenarios:** see ### US-65.3

---

## Requirements

### Functional Requirements

- **FR-001**: A person picture upload MUST be saved as `images/people/person-<personId>-<uploadTime><ext>`, where `<uploadTime>` is the upload time in milliseconds and `<ext>` follows the image type as today (`.png`, `.jpg`, `.gif`, `.webp`). The stored `picture` value is `people/<file name>`.
- **FR-002**: An organization logo upload MUST be saved as `images/logos/org-<orgId>-<uploadTime><ext>`. The stored `logo` value is `logos/<file name>`.
- **FR-003**: A trip image upload MUST be saved as `images/trips/trip-<tripId>-<uploadTime><ext>`. The stored `image` value is `trips/<file name>`.
- **FR-004**: After a replacement upload, the newly uploaded file MUST exist and be served at `/trips/images/<stored value>`. The previous file (under `images/` or `uploads/`) MUST still be deleted, as today.
- **FR-005**: Existing stored values in the old naming (`people/person-3.png`, `logos/org-1.png`, `trips/trip-5.jpg`, and `uploads/…` paths) MUST keep being served as stored and MUST be deleted when replaced. No data migration.
- **FR-006**: Allowed image types, the 2 MB limit, who may upload, and the response body shape (`{ message, picture | logo | image }`) MUST stay unchanged.

---

## Assumptions

- Root cause: the upload middleware writes the new file **before** the controller runs, and the file name depended only on the id and image type. Replacing with the same type gave the new file the same name as the old one, so the controller's "delete the previous file" step deleted the file it had just saved. The database still pointed at it, so the URL returned "Cannot GET". Switching type (PNG → JPG) worked, which made the problem look intermittent.
- A unique name per upload also changes the image URL, so browsers do not keep showing the cached old image after a replacement (the frontend adds no cache-buster).
- Two uploads for the same id in the same millisecond are not a realistic case.
- Pictures, logos, and trip images that were already deleted by this defect cannot be recovered by the fix; they must be uploaded again.

## Edge Cases

- Replacement with a different image type → still works; the old file is deleted.
- First upload (no previous file) → saved and served; nothing deleted.
- Previous file already missing on disk → upload still succeeds (missing file ignored, as today).
- Previous value in the old naming → served until replaced, then deleted (FR-005).

## Success Criteria

- **SC-001**: Replacing a profile picture, organization logo, or trip image with the same image type leaves the new image viewable.
- **SC-002**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

Unchanged from Features 2, 3, and 5.

---

## Key Entities

- **Person** — `picture` (relative path, unchanged column)
- **Organization** — `logo` (relative path, unchanged column)
- **Trip** — `image` (relative path, unchanged column)

---

## API Requirements

No new endpoints. Only the file name inside the returned and stored path changes.

| Method | Path | Change |
|--------|------|--------|
| `PUT` | `/trips/people/:id/picture` | Stored `picture` is `people/person-<id>-<uploadTime><ext>` |
| `PUT` | `/trips/organizations/:id/logo` | Stored `logo` is `logos/org-<id>-<uploadTime><ext>` |
| `PUT` | `/trips/trips/:id/image` | Stored `image` is `trips/trip-<id>-<uploadTime><ext>` |

---

## Screen Requirements

No screen change.

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-65.1 — Replace my profile picture

#### Scenario: Replacing a profile picture with the same image type keeps the new picture
* **Given** a person whose stored picture is `people/person-<id>.png` and that file exists
* **When** I upload a new PNG picture for that person
* **Then** the response picture is `people/person-<id>-<uploadTime>.png`
* **And** `GET /trips/images/<new picture>` returns 200
* **And** the file `images/people/person-<id>.png` no longer exists

#### Scenario: Replacing a profile picture twice keeps the latest picture
* **Given** a person with no picture
* **When** I upload a PNG picture and then another PNG picture
* **Then** the second response picture differs from the first
* **And** `GET /trips/images/<second picture>` returns 200
* **And** the first picture file no longer exists

### US-65.2 — Replace an organization logo

#### Scenario: Replacing an organization logo with the same image type keeps the new logo
* **Given** I am an Org Admin of an organization whose stored logo is `logos/org-<id>.png` and that file exists
* **When** I upload a new PNG logo
* **Then** the response logo is `logos/org-<id>-<uploadTime>.png`
* **And** `GET /trips/images/<new logo>` returns 200
* **And** the file `images/logos/org-<id>.png` no longer exists

### US-65.3 — Replace a trip image

#### Scenario: Replacing a trip image with the same image type keeps the new image
* **Given** I am an Org Admin of a trip's organization and the trip's stored image is `trips/trip-<id>.png` and that file exists
* **When** I upload a new PNG trip image
* **Then** the response image is `trips/trip-<id>-<uploadTime>.png`
* **And** `GET /trips/images/<new image>` returns 200
* **And** the file `images/trips/trip-<id>.png` no longer exists

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-65.1 | Replacing a profile picture with the same image type keeps the new picture | `backend/tests/image-replace.test.js` | `Replacing a profile picture with the same image type keeps the new picture` |
| US-65.1 | Replacing a profile picture twice keeps the latest picture | `backend/tests/image-replace.test.js` | `Replacing a profile picture twice keeps the latest picture` |
| US-65.2 | Replacing an organization logo with the same image type keeps the new logo | `backend/tests/image-replace.test.js` | `Replacing an organization logo with the same image type keeps the new logo` |
| US-65.3 | Replacing a trip image with the same image type keeps the new image | `backend/tests/image-replace.test.js` | `Replacing a trip image with the same image type keeps the new image` |

Tests remove the image files they create.

---

## Agent implementation request

```text
Implement Feature 65 from @features/feature-65-fix-image-replace.md on branch `feature/65-fix-image-replace`.

Follow layer order in @features/framework.md.
Change only the upload file names in backend/app/config/multer.js (FR-001..FR-003); keep the controllers' previous-file delete (FR-004).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Living reference: add the Feature 65 row to features/reference/behavior.md.
Do not implement behavior not in this spec.
```

**Reference updates:** `behavior.md` (upload file naming and replacement rule)

---

## Definition of Done

*   [x] Upload file names per **FR-001**..**FR-003**
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`
*   [ ] Ops: after deploy, re-upload any profile pictures, logos, and trip images that show as broken

## Out of Scope

- Recovering images already deleted by this defect
- Copied trips (Feature 21) share the source trip's image file, so replacing or deleting the copy's image removes the original trip's image — separate defect
- Backend tests writing image files into the real `backend/images` folder
- Cleaning up orphaned image files
- Frontend changes
