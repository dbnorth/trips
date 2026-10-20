# Feature: A Trip Image Shared With a Copied Trip Is Kept

**Feature ID:** 66
**Branch pattern:** `feature/66-shared-trip-image-kept`
**Status:** Implemented
**Created:** 2026-10-19
**Input:** Defect — copying a trip (Feature 21) reuses the source trip's stored image path. Replacing the image on either trip, or deleting either trip, deletes that shared file, so the other trip's image URL returns "Cannot GET".
**Depends on:** [Feature 5 — Trip Catalog](feature-5-trip-catalog-management.md), [Feature 21 — Copy Trip](feature-21-copy-trip.md), [Feature 65 — Image Replace](feature-65-fix-image-replace.md)

---

## User Stories

### US-66.1: Change a copied trip's image without breaking the original
**As** trip staff  
**I want** replacing the image on a copied trip (or on the trip it was copied from) to leave the other trip's image alone  
**So that** both trips keep showing an image

**Priority:** P1  
**Independent test:** Copy a trip that has an image, upload a new image for the copy, then the source trip's image URL still returns 200  
**Acceptance scenarios:** see ### US-66.1

### US-66.2: Delete a copied trip without breaking the original
**As an** Org Admin or System Admin  
**I want** deleting a trip to leave an image file that another trip still uses  
**So that** the remaining trip keeps its image

**Priority:** P1  
**Independent test:** Copy a trip that has an image, delete the copy, then the source trip's image URL still returns 200  
**Acceptance scenarios:** see ### US-66.2

---

## Requirements

### Functional Requirements

- **FR-001**: When a trip image is replaced (`PUT /trips/trips/:id/image`), the previous image file MUST be deleted only if no **other** trip's stored `image` equals the previous value. Otherwise the file MUST be kept.
- **FR-002**: When a trip is deleted (`DELETE /trips/trips/:id`), its image file MUST be deleted only if no **other** trip's stored `image` equals that value. Otherwise the file MUST be kept.
- **FR-003**: "Other trip" means any trip row with a different id, in any organization.
- **FR-004**: Copy trip MUST keep reusing the source trip's stored `image` value (Feature 21 FR-004); no file is duplicated.
- **FR-005**: When no other trip uses the previous image, replacing and deleting MUST behave as today: the file is deleted from `images/` or `uploads/` (Feature 65 FR-004).
- **FR-006**: Responses, permissions, and stored values MUST stay unchanged.

---

## Assumptions

- Trip copies made before this feature already share files with their source; the check in FR-001 and FR-002 protects them with no data migration.
- A trip's `image` is only set by the image upload and by copy trip (`PUT /trips/trips/:id` does not accept `image`), so a stored-value comparison finds every trip using a file.
- Trips are hard-deleted (no soft delete), so a deleted trip no longer counts as using a file.
- Images already deleted by this defect cannot be recovered; they must be uploaded again.

## Edge Cases

- Three trips share one file (a copy of a copy) → the file is deleted only when the last of them replaces its image or is deleted.
- The source trip replaces its image → the copy keeps the old file; the source gets its new time-stamped file (Feature 65).
- The shared file is already missing on disk → replace and delete still succeed (missing file ignored, as today).
- Trip with no image → nothing to delete, as today.

## Success Criteria

- **SC-001**: After replacing the image on, or deleting, one trip of a copied pair, the other trip's image is still viewable.
- **SC-002**: An image file used by no trip is still removed on replace and delete.
- **SC-003**: Automated tests for every scenario below pass.

---

## Data Ownership & Isolation

Unchanged from Features 5 and 21. The "other trip uses this file" check reads trip `image` values across organizations only to decide whether to delete a file; nothing about other organizations' trips is returned.

---

## Key Entities

- **Trip** — `image` (relative path, unchanged column; may be shared by a trip and its copies)

---

## API Requirements

No new endpoints and no response changes.

| Method | Path | Change |
|--------|------|--------|
| `PUT` | `/trips/trips/:id/image` | Previous file deleted only when no other trip uses it |
| `DELETE` | `/trips/trips/:id` | Image file deleted only when no other trip uses it |

---

## Screen Requirements

No screen change.

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-66.1 — Change a copied trip's image without breaking the original

#### Scenario: Replacing a copied trip's image keeps the source trip's image
* **Given** I am an Org Admin, a trip has an image file, and I copied that trip
* **When** I upload a new image for the copy
* **Then** `GET /trips/images/<source trip image>` returns 200
* **And** the source trip's stored image is unchanged

#### Scenario: Replacing the source trip's image keeps the copy's image
* **Given** I am an Org Admin, a trip has an image file, and I copied that trip
* **When** I upload a new image for the source trip
* **Then** `GET /trips/images/<copy's image>` returns 200

#### Scenario: Replacing an image no other trip uses deletes the old file
* **Given** I am an Org Admin and a trip has an image file no other trip uses
* **When** I upload a new image for that trip
* **Then** the old image file no longer exists

### US-66.2 — Delete a copied trip without breaking the original

#### Scenario: Deleting a copied trip keeps the source trip's image
* **Given** I am an Org Admin, a trip has an image file, and I copied that trip
* **When** I delete the copy
* **Then** `GET /trips/images/<source trip image>` returns 200

#### Scenario: Deleting the last trip using an image deletes the file
* **Given** I am an Org Admin, a trip has an image file, and I copied that trip
* **When** I delete the copy and then the source trip
* **Then** the image file no longer exists

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-66.1 | Replacing a copied trip's image keeps the source trip's image | `backend/tests/shared-trip-image.test.js` | `Replacing a copied trip's image keeps the source trip's image` |
| US-66.1 | Replacing the source trip's image keeps the copy's image | `backend/tests/shared-trip-image.test.js` | `Replacing the source trip's image keeps the copy's image` |
| US-66.1 | Replacing an image no other trip uses deletes the old file | `backend/tests/shared-trip-image.test.js` | `Replacing an image no other trip uses deletes the old file` |
| US-66.2 | Deleting a copied trip keeps the source trip's image | `backend/tests/shared-trip-image.test.js` | `Deleting a copied trip keeps the source trip's image` |
| US-66.2 | Deleting the last trip using an image deletes the file | `backend/tests/shared-trip-image.test.js` | `Deleting the last trip using an image deletes the file` |

Tests use the copy endpoint (`POST /trips/trips/:id/copy`) to create the copy and remove the image files they create.

---

## Agent implementation request

```text
Implement Feature 66 from @features/feature-66-shared-trip-image-kept.md on branch `feature/66-shared-trip-image-kept`.

Follow layer order in @features/framework.md.
Change only the image-file deletes in trip.controller.js uploadImage and delete (FR-001, FR-002); copy trip is unchanged (FR-004).
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Living reference: update the Feature 21 copy note and add the Feature 66 row in features/reference/behavior.md.
Do not implement behavior not in this spec.
```

**Reference updates:** `behavior.md` (shared trip image file kept while another trip uses it)

---

## Definition of Done

*   [x] Image-file deletes per **FR-001** and **FR-002**
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green
*   [x] `features/reference/behavior.md` updated
*   [ ] PR to `dev`
*   [ ] Ops: after deploy, re-upload trip images that show as broken

## Out of Scope

- Duplicating the image file when copying a trip (Feature 21 keeps path reuse)
- Recovering trip images already deleted by this defect
- Cleaning up orphaned image files
- Organization logos and profile pictures (never shared between rows)
- Frontend changes
