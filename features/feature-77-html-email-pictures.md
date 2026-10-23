# Feature: HTML Emails, Rich Text Editor, and Picture Library

**Feature ID:** 77
**Branch pattern:** `feature/77-html-email-pictures`
**Status:** Implemented
**Created:** 2026-10-22
**Input:** "The customer wants to add different pictures to emails, so add a feature for HTML emails and the rich text editor and a picture library for each client."

Clarified with the requester:
- Pictures are **embedded** in each email (sent inside the message and shown in the body), so they show even when the reader's mail app blocks remote images.
- Each organization has its own **picture library**. **Org Admins** and **Trip Leaders** may upload pictures; only **Org Admins** (and System Admin) rename and delete them.
- The **rich text editor** replaces the plain **Email body** box in the **template form**, **Email team**, and **Email people**.
- HTML email, the editor, and the picture library are one feature.

Today every email is plain text: `emailDelivery.buildTemplateMessage` sends only `text`, and **Email body** is a plain text area everywhere.

**Depends on:**
- [Feature 39 — Email Types and Templates](feature-39-email-types-and-templates.md)
- [Feature 40 — Email Template Tokens](feature-40-email-template-tokens.md)
- [Feature 43 — Email Delivery](feature-43-email-delivery.md)
- [Feature 46 — Email Trip Team](feature-46-email-trip-team.md)
- [Feature 62 — Email People](feature-62-people-email.md)
- [Feature 76 — Trip Arrival Info](feature-76-trip-arrival-info.md)

---

## User Stories

### US-77.1: Organizations keep a picture library
**As an** Org Admin  
**I want** a **Pictures** page where I upload, rename, and delete my organization's pictures  
**So that** everyone writing our emails uses the same approved pictures

**Priority:** P1  
**Independent test:** On **Pictures**, upload `clinic.jpg` → it shows as "clinic" with a thumbnail; **Rename** it "Clinic team" → the new name shows; **Delete** a picture no template uses → it is gone  
**Acceptance scenarios:** see ### US-77.1

### US-77.2: Write email bodies with formatting and pictures
**As an** Org Admin or Trip Leader  
**I want** a rich text editor for **Email body** with formatting, links, tokens, and pictures from the library  
**So that** emails look like a newsletter instead of plain text

**Priority:** P1  
**Independent test:** In the template form, make "Welcome" bold, insert the "Clinic team" picture and `{{PARTICIPANT_FIRST_NAME}}`, save, and reopen → the body shows the same formatting, picture, and token  
**Acceptance scenarios:** see ### US-77.2

### US-77.3: Emails are sent as HTML with embedded pictures
**As** trip staff  
**I want** template emails (Send Now, Scheduled, Email team, Email people) sent as HTML with their pictures inside  
**So that** participants see the formatted email and pictures without clicking "show images"

**Priority:** P1  
**Independent test:** Email team sends a template with the "Clinic team" picture to Ana → her email has an HTML body showing the picture (embedded), plus a plain-text version  
**Acceptance scenarios:** see ### US-77.3

### US-77.4: Manual sends use the editor too
**As** trip staff sending from **Email team** or **Email people**  
**I want** the same editor for this send's body, with pictures from the library  
**So that** I can add a picture for one email without changing the template

**Priority:** P2  
**Independent test:** In **Email team**, choose a template, insert the "Clinic team" picture, **Preview** → the preview shows the picture; send → each email has it embedded; the template is unchanged  
**Acceptance scenarios:** see ### US-77.4

---

## Requirements

### Functional Requirements

**Picture library**

- **FR-001**: Each organization has a **picture library**. A picture has a **name** (required, up to 100 characters; defaults to the file name without its extension) and an image file: PNG, JPEG, or GIF, up to 2 MB. Otherwise `400` "Upload a PNG, JPEG, or GIF picture." / "The picture must be 2 MB or smaller." / "Name is required.".
- **FR-002**: **Upload**: System Admin, Org Admins of the organization, and Trip Leaders of any trip in the organization. **Rename** and **Delete**: System Admin and Org Admins of the organization only. Anyone else → `403`. Listing: everyone who may upload.
- **FR-003**: A picture used in any template body of its organization cannot be deleted: `400` "This picture is used by N templates.". Deleting removes the file.
- **FR-004**: Picture files are stored under `images/email-pictures/` with unguessable file names (like trip images) so the editor and previews can show them. The API lists only the caller's permitted organizations' pictures.
- **FR-005**: A **Pictures** page (menu bar, Org Admin and System Admin, for the acting organization) shows each picture as a thumbnail with its name and size, with **Upload**, **Rename**, and **Delete** (asks "Delete this picture?").

**Rich text editor**

- **FR-006**: **Email body** in the template form, **Email team**, and **Email people** is a rich text editor with: **Bold**, **Italic**, **Underline**, **Bulleted list**, **Numbered list**, **Center** (centers the paragraph at the cursor, including a picture in it; choosing it again aligns it left), **Link** (http, https, or mailto), and **Picture**. **Insert token** beside it still inserts the token at the cursor.
- **FR-007**: **Picture** opens a picker of the organization's library (thumbnails and names) and inserts the chosen picture at the cursor, inside the paragraph (so **Center** centers it); the picker also has **Upload** (FR-001/FR-002), which adds the picture to the library and inserts it. Pasting or dropping an image file into the editor does the same upload and insert. Pictures that are not from the library (pasted web images, other organizations' pictures) are removed. A picture in the editor can be resized by dragging its corner handles; it keeps its proportions and is 50 to 600 px wide. A picture never resized shows at its own size, up to 600 px wide.
- **FR-008**: A saved body is HTML. Each picture is stored by its library id, not by a URL, with its width in pixels when it was resized. The server keeps only the FR-006 formatting, paragraphs (with `text-align: center` when centered; any other style is removed), line breaks, links, and library pictures (a width above 600 is saved as 600; a width that is not a whole number is removed), and removes everything else (scripts, styles, other tags and attributes) on save and again when sending.
- **FR-009**: Pictures in one body must come from the template's organization (for manual sends, the trip's or acting organization's) → otherwise `400` "Pictures must come from this organization's library.". The distinct pictures in one body must total 5 MB or less → otherwise `400` "Pictures in one email must total 5 MB or less.". Global templates (no organization) cannot have pictures → `400` "Global templates cannot include pictures.".
- **FR-010**: A body saved before this feature (no HTML tags) is read as plain text: its text is kept as written and each line break becomes a new line, both in the editor and when sending. Seeded templates stay plain text and follow this rule.

**Sending and previews**

- **FR-011**: Every template email (Send Now, Scheduled, Email team, Email people) is sent with an **HTML** body and a **plain-text** version. Tokens fill as today; in HTML, token values are escaped so they show as written. Each picture is embedded in the message (inline attachment referenced from the HTML) and shown at its saved width (as both a `width` attribute and a style, so email clients that ignore styles still size it), or at most 600 px wide when it has none. Previews use the same sizes. The plain-text version has the text, links as `text (url)`, and each picture as `[Picture: <name>]`.
- **FR-012**: A picture deleted or unreadable when an email is built → that email is **skipped** with "Picture <name> is missing." (or "A picture is missing." when the name is unknown), like the Feature 76 attachment rule.
- **FR-013**: Organization test mode (Feature 43) adds "TEST MODE - intended for: <recipients>" as the first line of both versions. File mode (`EMAIL_MODE=file`) writes the plain-text version as today with a `Pictures: <names>` line after `Subject` (and after `Attachments` when present), and writes the HTML beside it as `<same name>.html` with the pictures included so it opens in a browser. `emailLog.content` keeps the plain-text version.
- **FR-014**: Every **Preview** (template preview, Email team, Email people) shows the HTML body with its pictures, in a frame that runs no scripts, or the FR-012 reason when one is missing.

---

## Assumptions

- Library pictures are not personal data. They are stored unencrypted in the public `images/` folder under unguessable names (like trip images and organization logos); the API never lists another organization's pictures.
- Editor: TipTap (`@tiptap/vue-3` with starter kit, link, underline, image, and text-align extensions). Server cleaning: `sanitize-html`. These are the only new dependencies.
- No text colors, fonts, sizes, right or justified alignment, or tables in this feature. Pictures are resized with the TipTap image extension's built-in drag handles. **Center** uses `@tiptap/extension-text-align` on paragraphs; pictures are inline in paragraphs so they center the same way.
- Emails stay one column; no email layout templates (header/footer frames).
- **Subject**, **From email**, **To**, and **Attachment** stay plain text.

## Edge Cases

- A template body containing `<script>` or `onclick` (typed, pasted, or sent to the API) → removed on save; the rest of the body is kept.
- A token value containing `<b>` → shown as the text `<b>`, not bold.
- The same picture inserted twice in one body → embedded once and shown twice.
- A Trip Leader of trips in two organizations → the picker shows the library of the template's (or trip's) organization only.
- An old plain-text body opened and saved in the editor → saved as HTML with the same text and line breaks.
- Delete a picture used only by a manual send already sent → allowed (sent emails are not templates).
- A Scheduled template whose picture file was removed from disk → each email skipped with FR-012; recorded skipped per Feature 44.
- A body sent to the API with a picture `width="9999"` → saved as `width="600"`; `width="big"` → the width is removed and the picture kept.
- The same picture inserted twice at different widths → embedded once, each shown at its own width.
- Pasting an image larger than 2 MB → "The picture must be 2 MB or smaller." and nothing is inserted.

## Success Criteria

- **SC-001**: An email whose body has pictures always either shows each picture embedded or is skipped with the FR-012 reason; it never links to a remote image.
- **SC-002**: No script or event-handler HTML is ever saved in a template or sent in an email.
- **SC-003**: Automated tests for every scenario below pass, and existing tests still pass.

---

## Data Ownership & Isolation

Each picture belongs to one organization. Only that organization's staff (per FR-002) list, upload, or use it; only its Org Admins (and System Admin) rename or delete it. A template or manual send may only use its own organization's pictures.

---

## Key Entities

- **Email picture** (new) — organization, name, stored file, type, size
- **Email template** — `emailBody` now holds HTML (FR-008)
- **Email log** — `content` keeps the plain-text version (no change)

---

## API Requirements

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `GET` | `/trips/email-pictures?orgId=` | FR-002 upload roles | `[{ id, name, url, contentType, sizeBytes, createdAt }]` by name (new) |
| `POST` | `/trips/email-pictures` | FR-002 upload roles | Multipart `file`, `orgId`, optional `name` → the new picture; `400` per FR-001 (new) |
| `PUT` | `/trips/email-pictures/:id` | System Admin, Org Admin of its organization | `{ name }` → the picture; `400` "Name is required." (new) |
| `DELETE` | `/trips/email-pictures/:id` | System Admin, Org Admin of its organization | Deletes it and its file; `400` per FR-003 (new) |
| `POST` / `PUT` | `/trips/email-templates`, `/trips/email-templates/:id` | as today | `emailBody` cleaned per FR-008; `400` per FR-009 |
| `POST` | `/trips/email-templates/preview`, `/trips/trips/:id/team-email/preview`, `/trips/people-email/preview` | as today | Body HTML returned with pictures as library URLs; adds `pictureError` (FR-012/FR-014) |
| `POST` | `/trips/trips/:id/team-email`, `/trips/people-email` | as today | `emailBody` cleaned per FR-008; `400` per FR-009; FR-012 skips in results |

---

## Screen Requirements

| Screen | Change |
|--------|--------|
| **Pictures** (new, menu bar for Org Admin / System Admin) | Library grid with **Upload**, **Rename**, **Delete** (FR-005) |
| Email template form (`EmailTemplateFormDialog`) | **Email body** becomes the rich text editor with **Picture** (FR-006, FR-007) |
| Email team (`TripTeamEmailDialog`), Email people (`PeopleEmailDialog`) | Same editor for this send's body (FR-006, FR-007) |
| Template preview, Email team preview, Email people preview | HTML body with pictures in a script-free frame (FR-014) |

---

## Data Model Requirements

New table `emailPicture` (created by `sync` / `ensureSchema`):

| Field | Type | Rules |
|-------|------|-------|
| id | INTEGER | primary key |
| orgId | INTEGER | required; foreign key `organizations.id` |
| name | STRING(100) | required |
| fileName | STRING(255) | required; stored file under `images/email-pictures/` |
| contentType | STRING(50) | `image/png`, `image/jpeg`, or `image/gif` |
| sizeBytes | INTEGER | required |
| createdAt / updatedAt | DATE | |

`emailTemplate.emailBody` (TEXT) holds cleaned HTML (FR-008), or plain text for bodies saved before this feature (FR-010).

---

## Acceptance Criteria (Gherkin)

Background for the scenarios below:
- Organization "Hope Missions" has trip "Guatemala Clinic"; Ana is an approved Trip Participant.
- Omar is Org Admin of Hope Missions and Tess is Trip Leader of Guatemala Clinic.
- Olga is Org Admin of another organization.
- Hope Missions' library has picture "Clinic team" (`clinic.jpg`, 300 KB).

### US-77.1 — Organizations keep a picture library

#### Scenario: Org Admin uploads a picture
* **Given** I am signed in as Omar
* **When** I upload `school.png` to the Hope Missions library
* **Then** the library lists "school" with type `image/png`

#### Scenario: Only PNG, JPEG, or GIF up to 2 MB can be uploaded
* **When** Omar uploads `notes.pdf`
* **Then** the response is `400` "Upload a PNG, JPEG, or GIF picture."
* **When** Omar uploads a 3 MB JPEG
* **Then** the response is `400` "The picture must be 2 MB or smaller."

#### Scenario: Who can upload, rename, and delete pictures
* **Then** Tess can upload a picture to Hope Missions but gets `403` renaming or deleting "Clinic team"
* **And** Olga gets `403` listing or uploading to Hope Missions
* **And** Omar can rename "Clinic team" to "Clinic staff"

#### Scenario: A picture used by a template cannot be deleted
* **Given** a Hope Missions template body includes "Clinic team"
* **When** Omar deletes "Clinic team"
* **Then** the response is `400` "This picture is used by 1 templates."

#### Scenario: Pictures page manages the library
* **Given** I am on **Pictures** for Hope Missions
* **Then** I see "Clinic team" with its thumbnail and size
* **When** I rename it "Clinic staff" and delete another picture, confirming "Delete this picture?"
* **Then** the page shows "Clinic staff" and not the deleted picture

### US-77.2 — Write email bodies with formatting and pictures

#### Scenario: Template body keeps formatting, links, and library pictures
* **When** Omar saves a template whose body has bold text, a link to `https://hope.org`, `{{PARTICIPANT_FIRST_NAME}}`, and "Clinic team"
* **Then** reopening the template returns the same formatting, link, token, and picture

#### Scenario: Unsafe HTML is removed on save
* **When** Omar saves a template whose body has `<script>alert(1)</script>` and `<p onclick="x()">Hi</p>`
* **Then** the saved body is `<p>Hi</p>`

#### Scenario: Pictures must come from the organization's library
* **When** Omar saves a Hope Missions template with a picture from Olga's organization
* **Then** the response is `400` "Pictures must come from this organization's library."

#### Scenario: Editor inserts a library picture
* **Given** the template form is open for Hope Missions
* **When** I choose **Picture** and pick "Clinic team"
* **Then** the email body shows the "Clinic team" picture

#### Scenario: Editor keeps a resized picture's width
* **Given** a template body with "Clinic team" resized to 300 px
* **When** I open it in the editor and edit the text
* **Then** the body still has "Clinic team" at 300 px wide

#### Scenario: Resized pictures keep their width
* **When** Omar saves a template with "Clinic team" at `width="300"` and again at `width="9999"`
* **Then** the saved body has the picture at 300, then at 600
* **And** Email team sends it to Ana with the picture at `width="300"` and the style `width:300px`

#### Scenario: Editor centers text and pictures
* **Given** the editor has the paragraph "Welcome" and a paragraph with "Clinic team"
* **When** I choose **Center** in each paragraph
* **Then** both paragraphs are saved centered

#### Scenario: Centered paragraphs are kept
* **When** Omar saves a template with a centered "Welcome" paragraph, a centered "Clinic team" picture, and `<p style="text-align: right; color: red">Bye</p>`
* **Then** the saved body keeps both centered paragraphs and saves "Bye" with no style
* **And** Email team sends it to Ana with both paragraphs centered

### US-77.3 — Emails are sent as HTML with embedded pictures

#### Scenario: Email team sends HTML with the picture embedded
* **Given** a Trip Participant template whose body is "Hi {{PARTICIPANT_FIRST_NAME}}" in bold and "Clinic team"
* **When** Tess sends it from Email team to Ana in SMTP mode
* **Then** Ana's email has HTML with "Hi Ana" in bold and the picture referenced as an embedded image
* **And** the picture is attached inline once
* **And** the plain-text version reads "Hi Ana" and "[Picture: Clinic team]"

#### Scenario: Token values are escaped in HTML
* **Given** Ana's first name is "<b>Ana</b>"
* **When** the template is sent to Ana
* **Then** the HTML shows `&lt;b&gt;Ana&lt;/b&gt;` as text

#### Scenario: Old plain-text bodies still send
* **Given** a template whose body is "Hello\nSee you soon" saved before this feature
* **When** it is sent to Ana
* **Then** the plain-text version is "Hello\nSee you soon" and the HTML shows the two lines

#### Scenario: A missing picture skips the email
* **Given** the "Clinic team" file has been removed from disk
* **When** Tess sends that template to Ana
* **Then** the result is skipped "Picture Clinic team is missing."

#### Scenario: File mode writes the HTML beside the text
* **Given** `EMAIL_MODE=file`
* **When** the template is sent to Ana
* **Then** the email file has `Pictures: Clinic team` after `Subject`
* **And** an `.html` file with the same name holds the HTML with the picture included

### US-77.4 — Manual sends use the editor too

#### Scenario: Email team sends an edited body with a picture
* **When** Tess sends from Email team with a body she changed to include "Clinic team"
* **Then** Ana's email has the picture embedded
* **And** the template's saved body is unchanged

#### Scenario: Email team preview shows the picture
* **Given** Email team is open with a body that includes "Clinic team"
* **When** I choose **Preview**
* **Then** the preview frame shows the picture and the filled-in body

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-77.1 | Org Admin uploads a picture | `backend/tests/html-email-pictures.test.js` | `Org Admin uploads a picture` |
| US-77.1 | Only PNG, JPEG, or GIF up to 2 MB can be uploaded | `backend/tests/html-email-pictures.test.js` | `Only PNG, JPEG, or GIF up to 2 MB can be uploaded` |
| US-77.1 | Who can upload, rename, and delete pictures | `backend/tests/html-email-pictures.test.js` | `Who can upload, rename, and delete pictures` |
| US-77.1 | A picture used by a template cannot be deleted | `backend/tests/html-email-pictures.test.js` | `A picture used by a template cannot be deleted` |
| US-77.1 | Pictures page manages the library | `frontend/tests/EmailPicturesList.test.js` | `Pictures page manages the library` |
| US-77.2 | Template body keeps formatting, links, and library pictures | `backend/tests/html-email-pictures.test.js` | `Template body keeps formatting, links, and library pictures` |
| US-77.2 | Unsafe HTML is removed on save | `backend/tests/html-email-pictures.test.js` | `Unsafe HTML is removed on save` |
| US-77.2 | Pictures must come from the organization's library | `backend/tests/html-email-pictures.test.js` | `Pictures must come from the organization's library` |
| US-77.2 | Editor inserts a library picture | `frontend/tests/RichTextEditor.test.js` | `Editor inserts a library picture` |
| US-77.2 | Editor keeps a resized picture's width | `frontend/tests/RichTextEditor.test.js` | `Editor keeps a resized picture's width` |
| US-77.2 | Resized pictures keep their width | `backend/tests/html-email-pictures.test.js` | `Resized pictures keep their width` |
| US-77.2 | Editor centers text and pictures | `frontend/tests/RichTextEditor.test.js` | `Editor centers text and pictures` |
| US-77.2 | Centered paragraphs are kept | `backend/tests/html-email-pictures.test.js` | `Centered paragraphs are kept` |
| US-77.3 | Email team sends HTML with the picture embedded | `backend/tests/html-email-pictures.test.js` | `Email team sends HTML with the picture embedded` |
| US-77.3 | Token values are escaped in HTML | `backend/tests/html-email-pictures.test.js` | `Token values are escaped in HTML` |
| US-77.3 | Old plain-text bodies still send | `backend/tests/html-email-pictures.test.js` | `Old plain-text bodies still send` |
| US-77.3 | A missing picture skips the email | `backend/tests/html-email-pictures.test.js` | `A missing picture skips the email` |
| US-77.3 | File mode writes the HTML beside the text | `backend/tests/html-email-pictures.test.js` | `File mode writes the HTML beside the text` |
| US-77.4 | Email team sends an edited body with a picture | `backend/tests/html-email-pictures.test.js` | `Email team sends an edited body with a picture` |
| US-77.4 | Email team preview shows the picture | `frontend/tests/TripTeamEmailDialog.test.js` | `Email team preview shows the picture` |

---

## Agent implementation request

```text
Implement Feature 77 from @features/feature-77-html-email-pictures.md on branch `feature/77-html-email-pictures`.

Follow layer order in @features/framework.md.
Data: new emailPicture model/table (orgId, name, fileName, contentType, sizeBytes).
Backend: multer upload (PNG/JPEG/GIF, 2 MB) to images/email-pictures/ with random names; email-pictures controller and routes with FR-002 access (Trip Leader = leader of any trip in the org) and the in-use delete check. A shared emailHtml util: sanitize-html with the FR-008 allow list (library pictures stored as <img data-picture-id>), plain-text-body detection and conversion (FR-010), picture validation (FR-009), token substitution with HTML escaping, and the plain-text version (FR-011). emailDelivery.buildTemplateMessage builds html + text, embeds pictures as inline cid attachments (once each, max 600 px wide), skips per FR-012, applies test mode to both versions, and file mode writes the Pictures line and the .html file. Template create/update and the Email team / Email people sends clean and validate the body. Previews return HTML with picture URLs and pictureError.
Frontend: add TipTap; a RichTextEditor component (FR-006 toolbar, Picture picker with Upload, paste/drop upload, token insertion at the cursor) used by EmailTemplateFormDialog, TripTeamEmailDialog, and PeopleEmailDialog; previews render HTML in a sandboxed iframe; new Pictures page (EmailPicturesList) with route and menu item for Org Admin / System Admin.
Map every Gherkin scenario in the Test Coverage Map; run backend and frontend `npm test` before finishing.
Living reference: data-model.md (emailPicture, emailBody HTML), api.md (rows above), behavior.md (new Feature 77 row; update the template, token/preview, delivery, Email team, and Email people rows).
Do not add colors, fonts, alignment, tables, picture resizing, layout templates, remote (linked) images, or HTML in Subject / From / To / Attachment.
Do not implement behavior not in this spec.
```

**Reference updates:** `data-model.md`, `api.md`, `behavior.md`

---

## Definition of Done

*   [x] Picture library, access, and **Pictures** page per **FR-001**–**FR-005**
*   [x] Rich text editor, picture picker, and body cleaning per **FR-006**–**FR-010**
*   [x] HTML sending, embedded pictures, file/test mode, and previews per **FR-011**–**FR-014**
*   [x] Automated tests for every Gherkin scenario
*   [x] Backend and frontend `npm test` green
*   [x] `features/reference/data-model.md`, `api.md`, and `behavior.md` updated
*   [ ] PR to `dev`

## Out of Scope

- Text colors, fonts, sizes, right or justified alignment, tables, and picture cropping or typed picture sizes
- Email layout templates (headers, footers, branded frames)
- Linking to remote images instead of embedding
- HTML in **Subject**, **From email**, **To**, or **Attachment**
- Picture folders, tags, or search in the library
- Storing the HTML version in `emailLog` or showing sent emails in the app
- Converting existing plain-text templates to HTML in the database
