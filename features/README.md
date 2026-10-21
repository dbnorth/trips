# Feature Specifications

Spec-driven development (SDD) source of truth for the **Trips** application.  
No application code may be written unless it maps to a requirement in one of these files.

**Methodology:** [framework.md](./framework.md) — how to write, trace, and ship feature specs.  
**Student guide (requirements):** [writing-feature-requirements.md](./writing-feature-requirements.md) — stories, FRs, initial data model, Gherkin AC.  
**Student guide (design):** [writing-feature-design.md](./writing-feature-design.md) — ownership, API, screens, test map, DoD, out of scope.  
**Student guide (living reference):** [reference/writing-living-reference.md](./reference/writing-living-reference.md) — update api / data-model / behavior in the same PR.

*(Examples in the writing guides often cite the OC CS Speckit Todo sample app — use them as patterns for Trips.)*

These `feature-*.md` files are a **reverse-spec** of the imported Mission Trips codebase (`Status: Shipped`). Automated scenario tests are still to be backfilled per each Test Coverage Map.

**Sprints** live in your agile tool — they are **not** part of these specs.

## Feature catalog

| ID | Summary | File | Branch | Depends on |
|----|---------|------|--------|------------|
| 1 | Email/password accounts, sessions, registration, apply sign-in | [feature-1-user-authentication.md](./feature-1-user-authentication.md) | `feature/1-user-authentication` | — |
| 2 | People profiles, org role assignments, role catalog | [feature-2-people-and-org-membership.md](./feature-2-people-and-org-membership.md) | `feature/2-people-and-org-membership` | 1 |
| 3 | Organizations: CRUD, logo, colors, participant agreement | [feature-3-organizations-and-agreements.md](./feature-3-organizations-and-agreements.md) | `feature/3-organizations-and-agreements` | 1 |
| 4 | Document types and person document uploads | [feature-4-document-types-and-person-documents.md](./feature-4-document-types-and-person-documents.md) | `feature/4-document-types-and-person-documents` | 2 |
| 5 | Trips: CRUD, image, leaders, staff dashboards | [feature-5-trip-catalog-management.md](./feature-5-trip-catalog-management.md) | `feature/5-trip-catalog-management` | 2, 3 |
| 6 | Worker roles, per-trip staffing quantities, travel and cost options | [feature-6-worker-roles-and-travel-options.md](./feature-6-worker-roles-and-travel-options.md) | `feature/6-worker-roles-and-travel-options` | 4, 5 |
| 7 | Browse and apply to trips, application statuses, staff approve/decline, participant CSV | [feature-7-trip-applications-and-participants.md](./feature-7-trip-applications-and-participants.md) | `feature/7-trip-applications-and-participants` | 2, 3, 5, 6 |
| 8 | Donations and donors: staff entry, donor CRUD, CSV exports | [feature-8-donors-and-donations.md](./feature-8-donors-and-donations.md) | `feature/8-donors-and-donations` | 7 |
| 9 | Public org, trip, and participant pages; public donations | [feature-9-public-fundraising-pages.md](./feature-9-public-fundraising-pages.md) | `feature/9-public-fundraising-pages` | 5, 7, 8 |
| 10 | Email template CRUD (organization and trip) and copy-from | [feature-10-email-templates.md](./feature-10-email-templates.md) | `feature/10-email-templates` | 3, 5 |
| 11 | Fix: system admin sees own row on People with All organizations | [feature-11-people-list-all-orgs-includes-admin.md](./feature-11-people-list-all-orgs-includes-admin.md) | `feature/11-people-list-all-orgs-includes-admin` | 2 |
| 12 | Encrypt person pictures and documents at rest (**superseded by Feature 63**; never implemented) | [feature-12-encrypt-person-media.md](./feature-12-encrypt-person-media.md) | `feature/12-encrypt-person-media` | 2, 4 |
| 13 | Public Apply goes to the application page (spec file missing) | [feature-13-public-apply-to-application-page.md](./feature-13-public-apply-to-application-page.md) | `feature/13-public-apply-to-application-page` | 1, 7, 9 |
| 14 | Fix: Add person Role select error | [feature-14-add-person-role-select-fix.md](./feature-14-add-person-role-select-fix.md) | `feature/14-add-person-role-select-fix` | 2 |
| 15 | Organization subdomain assigns new accounts to that organization | [feature-15-organization-subdomain-registration.md](./feature-15-organization-subdomain-registration.md) | `feature/15-organization-subdomain-registration` | 1, 3 |
| 16 | Address and document country default to United States | [feature-16-default-country-united-states.md](./feature-16-default-country-united-states.md) | `feature/16-default-country-united-states` | 2, 3, 4, 5, 8 |
| 17 | Organization medical conditions list on applications | [feature-17-org-medical-conditions.md](./feature-17-org-medical-conditions.md) | `feature/17-org-medical-conditions` | 2, 3, 7 |
| 18 | Organization medical agreement on applications | [feature-18-org-medical-agreement.md](./feature-18-org-medical-agreement.md) | `feature/18-org-medical-agreement` | 3, 7, 17 |
| 19 | Pregnancy questions on applications | [feature-19-pregnancy-health-questions.md](./feature-19-pregnancy-health-questions.md) | `feature/19-pregnancy-health-questions` | 2, 4, 7 |
| 20 | Person middle name | [feature-20-person-middle-name.md](./feature-20-person-middle-name.md) | `feature/20-person-middle-name` | 1, 2 |
| 21 | Copy trip | [feature-21-copy-trip.md](./feature-21-copy-trip.md) | `feature/21-copy-trip` | 5, 6 |
| 22 | Document types: document number required flag and instructions | [feature-22-document-number-and-instructions.md](./feature-22-document-number-and-instructions.md) | `feature/22-document-number-and-instructions` | 4 |
| 23 | Trip Require Passport for applications | [feature-23-trip-require-passport.md](./feature-23-trip-require-passport.md) | `feature/23-trip-require-passport` | 4, 5, 7, 22 |
| 24 | Diploma document type | [feature-24-document-type-diploma.md](./feature-24-document-type-diploma.md) | `feature/24-document-type-diploma` | 4, 22 |
| 25 | Required document types per worker role | [feature-25-worker-role-required-documents.md](./feature-25-worker-role-required-documents.md) | `feature/25-worker-role-required-documents` | 4, 6, 7, 22 |
| 26 | Role capacity counts; application cancel and uncancel | [feature-26-role-capacity-and-cancel.md](./feature-26-role-capacity-and-cancel.md) | `feature/26-role-capacity-and-cancel` | 6, 7 |
| 27 | Message listing why the application submit button is hidden | [feature-27-application-submit-unavailable-info.md](./feature-27-application-submit-unavailable-info.md) | `feature/27-application-submit-unavailable-info` | 7 |
| 28 | Trip Status board | [feature-28-view-trip-status.md](./feature-28-view-trip-status.md) | `feature/28-view-trip-status` | 5, 6, 7, 8, 27 |
| 29 | Trip rooming list | [feature-29-rooming-list.md](./feature-29-rooming-list.md) | `feature/29-rooming-list` | 5, 7 |
| 30 | Participant flights and segments; airport and airline catalogs | [feature-30-participant-flights.md](./feature-30-participant-flights.md) | `feature/30-participant-flights` | 5, 7 |
| 31 | Person other languages | [feature-31-person-other-languages.md](./feature-31-person-other-languages.md) | `feature/31-person-other-languages` | 2, 7 |
| 32 | Emergency contact relationship | [feature-32-emergency-contact-relationship.md](./feature-32-emergency-contact-relationship.md) | `feature/32-emergency-contact-relationship` | 2 |
| 33 | Person preferred name | [feature-33-person-preferred-name.md](./feature-33-person-preferred-name.md) | `feature/33-person-preferred-name` | 1, 2, 20 |
| 34 | Document specializations | [feature-34-document-specializations.md](./feature-34-document-specializations.md) | `feature/34-document-specializations` | 4, 12, 22 |
| 35 | Person document Add Document dialog | [feature-35-person-document-dialog.md](./feature-35-person-document-dialog.md) | `feature/35-person-document-dialog` | 4, 22, 34 |
| 36 | Allergies description hint | [feature-36-allergies-description-hint.md](./feature-36-allergies-description-hint.md) | `feature/36-allergies-description-hint` | 2 |
| 37 | Bio moved below Birthdate on person form | [feature-37-person-bio-below-birthdate.md](./feature-37-person-bio-below-birthdate.md) | `feature/37-person-bio-below-birthdate` | 2 |
| 38 | Trip deposit | [feature-38-trip-deposit.md](./feature-38-trip-deposit.md) | `feature/38-trip-deposit` | 5, 21 |
| 39 | Email types; template email type and function code | [feature-39-email-types-and-templates.md](./feature-39-email-types-and-templates.md) | `feature/39-email-types-and-templates` | 3, 10 |
| 40 | Email tokens and template preview | [feature-40-email-template-tokens.md](./feature-40-email-template-tokens.md) | `feature/40-email-template-tokens` | 5, 7, 21, 28, 39 |
| 41 | Email template To field | [feature-41-email-template-to-address.md](./feature-41-email-template-to-address.md) | `feature/41-email-template-to-address` | 39, 40 |
| 42 | Scheduled template schedule (daily, weekly Tuesday, days before start) | [feature-42-email-template-schedule.md](./feature-42-email-template-schedule.md) | `feature/42-email-template-schedule` | 39, 41 |
| 43 | Email delivery service (file or SMTP) and email log | [feature-43-email-delivery.md](./feature-43-email-delivery.md) | `feature/43-email-delivery` | 40, 41 |
| 44 | Daily scheduled email job | [feature-44-daily-scheduled-emails.md](./feature-44-daily-scheduled-emails.md) | `feature/44-daily-scheduled-emails` | 39, 42, 43 |
| 45 | Send Now event emails for applications and donations; email log template, trip, and person | [feature-45-send-now-event-emails.md](./feature-45-send-now-event-emails.md) | `feature/45-send-now-event-emails` | 7, 8, 39, 43 |
| 46 | Email team dialog on the trip page; Trip Participant templates | [feature-46-email-trip-team.md](./feature-46-email-trip-team.md) | `feature/46-email-trip-team` | 7, 39, 42, 43, 45 |
| 47 | Application: profile box without a field list; no missing-items list on a first application; profile health answers display-only | [feature-47-simplify-application-warnings.md](./feature-47-simplify-application-warnings.md) | `feature/47-simplify-application-warnings` | 7, 17, 19, 27, 31 |
| 48 | Email token PARTICIPANT_TRIP_ROLE (participant's trip role name) | [feature-48-participant-trip-role-token.md](./feature-48-participant-trip-role-token.md) | `feature/48-participant-trip-role-token` | 6, 7, 40, 43 |
| 49 | Organization test mode: all its emails go to the organization email, first line names the intended recipient | [feature-49-organization-email-test-mode.md](./feature-49-organization-email-test-mode.md) | `feature/49-organization-email-test-mode` | 3, 43, 44, 45, 46 |
| 50 | SMTP password read from AWS Secrets Manager (local agent) when `SMTP_PASSWORD_SECRET_ID` is set | [feature-50-aws-secrets-smtp-password.md](./feature-50-aws-secrets-smtp-password.md) | `feature/50-aws-secrets-smtp-password` | 43 |
| 51 | All email From `"<sender> via Mission Trips" <notifications@missiontrips.app>`, Reply-To the template From; replaces `EMAIL_SENDER` | [feature-51-sender-via-mission-trips.md](./feature-51-sender-via-mission-trips.md) | `feature/51-sender-via-mission-trips` | 40, 41, 43, 46 |
| 52 | Email tokens for a participant financial statement: trip cost, trip options, airfare, total, participant donations, trip donations, balance due | [feature-52-participant-financial-tokens.md](./feature-52-participant-financial-tokens.md) | `feature/52-participant-financial-tokens` | 6, 7, 8, 30, 40 |
| 53 | Participants donate to themselves (when approved) and teammates; donors linked to a person; staff donor lookup falls back to a person; participant donations found by donor link | [feature-53-participant-donations.md](./feature-53-participant-donations.md) | `feature/53-participant-donations` | 7, 8, 9, 45, 52 |
| 54 | **Room list PDF** button on the Room List page: trip and hotel info, room assignments ordered by room number with name, passport number and expiration (from the passport document), and email | [feature-54-room-list-pdf.md](./feature-54-room-list-pdf.md) | `feature/54-room-list-pdf` | 4, 22, 29, 30 |
| 55 | **Flights PDF** button on the Flights page: one block per participant (by last and first name) with booked by (`Org` / `Participant`) and their Arrival and Return segments (airline, flight number, airports, departure and arrival with weekday `MM/dd/yyyy` and AM/PM times) | [feature-55-flights-pdf.md](./feature-55-flights-pdf.md) | `feature/55-flights-pdf` | 30, 54 |
| 56 | **Reserved role emails**: staff reserve trip-role slots by email (up to open slots); a matching applicant is placed in and locked to the reserved role; role lists add **Reserved** and Available = Needed − Signed up − Reserved | [feature-56-reserved-role-emails.md](./feature-56-reserved-role-emails.md) | `feature/56-reserved-role-emails` | 6, 7, 26, 28 |
| 57 | **Has Expiration Date** checkbox on document types: when unchecked, document entry hides and does not require Expiration date (stored null), and application document checks (role-required documents, Require Passport) accept the uploaded file without an expiration check | [feature-57-document-type-expiration-date.md](./feature-57-document-type-expiration-date.md) | `feature/57-document-type-expiration-date` | 4, 22, 23, 25, 35 |
| 58 | **Documents PDF** action on each trip-page participant row: first page with organization header, "Documents for <name>", trip info, and the list of document details; then one page per document and specialization with the participant name, details, and the uploaded file (images, converted HEIC, or the uploaded PDF's pages) | [feature-58-participant-documents-pdf.md](./feature-58-participant-documents-pdf.md) | `feature/58-participant-documents-pdf` | 4, 7, 22, 34, 54, 57 |
| 59 | **Specialization list** on document types (Allow Specialization): person specializations are chosen from the list on the profile document dialog; worker roles can require specializations of their required documents, and applications stay incomplete until they are added; existing free-text specializations are removed; worker role **License required** removed; Worker Roles list shows required documents | [feature-59-document-type-specialization-list.md](./feature-59-document-type-specialization-list.md) | `feature/59-document-type-specialization-list` | 4, 25, 34, 35, 47, 57, 58 |
| 60 | **My Trips next actions** on the participant home: under each upcoming trip, the next steps by status — incomplete: complete the application (missing documents named, **Update App** / **Cancel App**); applied: waiting on approval; approved: make the deposit or a donation toward the amount owed (**Donate**), and enter flight info when buying their own ticket (**Enter Flights**; participants may edit their own segments); submit an incomplete application with nothing missing (**Submit App**); "all ready" when nothing is left; rows highlighted orange / yellow / green; the same actions in the trip page's **My Trip Info** | [feature-60-my-trips-next-actions.md](./feature-60-my-trips-next-actions.md) | `feature/60-my-trips-next-actions` | 7, 26, 28, 30, 38, 53, 59 |
| 61 | **Trip page travel details** in **My Trip Info** (incomplete / applied / approved): my room (hotel, room type, roommates, check-in, check-out = check-in + nights), my flight segments (Arrival then Return; **Edit Flights** when I buy my own ticket), and my selected trip options with price adjustments | [feature-61-trip-page-my-travel-details.md](./feature-61-trip-page-my-travel-details.md) | `feature/61-trip-page-my-travel-details` | 6, 7, 29, 30, 53, 60 |
| 62 | **Email people** from the People page (System Admin / Org Admin of the acting org): new template function code **Person** (organization only, no trip tokens); dialog picks a Person template (subject and body editable for this send), **Trips** and **Roles** (worker roles on those trips) multi-selects with **All**; recipients are approved Trip Participants matching both, each once; with a single trip selected, that trip's **Trip Participant** templates are offered too (trip tokens filled); Preview, "Are you sure?", and sent / skipped / failed results as Email team | [feature-62-people-email.md](./feature-62-people-email.md) | `feature/62-people-email` | 2, 6, 7, 39, 40, 43, 46, 49 |
| 63 | **Encrypt person documents on disk**: person document and specialization uploads stored AES-256-GCM encrypted (never unencrypted on disk) and decrypted for view, download, and the Documents PDF; key from AWS Secrets Manager (`FILE_ENCRYPTION_KEY_SECRET_ID`, shared agent call with Feature 50) or `FILE_ENCRYPTION_KEY` in development; old unencrypted files still served; supersedes Feature 12 | [feature-63-encrypt-person-documents.md](./feature-63-encrypt-person-documents.md) | `feature/63-encrypt-person-documents` | 4, 34, 50, 58 |
| 64 | **Encrypt personal and medical data in the database**: person birthdate, address, phone, emergency contact name and phone, allergies, medication, and medical conditions; application pregnancy and due date; document numbers; donor address and phone, stored AES-256-GCM encrypted (`enc1:` text values) by the Sequelize models; medical conditions move to an encrypted ID list on the person (removed conditions ignored); key from its own AWS secret (`PII_ENCRYPTION_KEY_SECRET_ID`) or `PII_ENCRYPTION_KEY`, loaded at startup (server will not start without it); one-time `npm run encrypt-personal-data` encrypts existing values | [feature-64-encrypt-personal-data-columns.md](./feature-64-encrypt-personal-data-columns.md) | `feature/64-encrypt-personal-data-columns` | 2, 4, 8, 17, 19, 32, 50, 63 |
| 65 | Fix: replacing a profile picture, organization logo, or trip image with the same image type deleted the new file ("Cannot GET"); uploads are now saved with a unique time-stamped name (`person-<id>-<uploadTime><ext>`, `org-…`, `trip-…`) so the previous file is deleted safely and browsers show the new image | [feature-65-fix-image-replace.md](./feature-65-fix-image-replace.md) | `feature/65-fix-image-replace` | 2, 3, 5 |
| 66 | Fix: a copied trip shares its source trip's image file, and replacing either trip's image or deleting either trip deleted it for both; a trip image file is now deleted only when no other trip still uses it | [feature-66-shared-trip-image-kept.md](./feature-66-shared-trip-image-kept.md) | `feature/66-shared-trip-image-kept` | 5, 21, 65 |
| 67 | Trip page **profile dialog** (participant name link) and **application dialog** (**View App** / **Approve App** / **Preview App**) show a two-column label and value table (label ≈ 40%, wrapping values, row dividers) instead of labels stacked above values; application section headings stay full width above their tables; same fields, values, Missing indicators, and actions | [feature-67-two-column-trip-dialogs.md](./feature-67-two-column-trip-dialogs.md) | `feature/67-two-column-trip-dialogs` | 2, 7, 47 |
| 68 | Security fix: **Add person** with an email that already belongs to a user or person is refused (`409` "A person with this email already exists.") and changes nothing — previously it overwrote that user's password, merged profile fields, and added them to the admin's organization (account takeover); applies to System Admins too; dialog shows the message and stays open; **Create account** likewise refuses an email already in use (`409`) without changing the existing account | [feature-68-add-person-existing-email.md](./feature-68-add-person-existing-email.md) | `feature/68-add-person-existing-email` | 1, 2, 14 |
| 69 | Security fix: the **participant CSV** (`GET /trips/export/trips/:tripId/participants.csv`), the **trip roster** (`GET /trips/trip-people-roles?tripId=`), and a **single application** (`GET /trips/trip-people-roles/:id`) are trip-staff only (System Admin, Org Admin of the trip's organization, approved Trip Leader of the trip) — previously any approved Trip Participant could read teammates' personal and medical data; participants get `403` "Forbidden." (applicants read their own application through the browse endpoint); the **Donations** page no longer loads the roster for non-staff and hides the Participants count, **Add donation**, and **Edit** for them, and its donation dialog lists only trips where the user is staff; participants still donate to teammates through **Donate** (recipient ids and names from the browse endpoint, unchanged) | [feature-69-staff-only-participant-data.md](./feature-69-staff-only-participant-data.md) | `feature/69-staff-only-participant-data` | 7, 8, 33, 53 |

Suggested reading order follows **Depends on** (1 → 2/3 → 4 → 5 → 6 → 7 → 8/9/10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38 → 39 → 40 → 41 → 42/43 → 44 → 45 → 46 → 47 → 48 → 49 → 50 → 51 → 52 → 53 → 54 → 55 → 56 → 57 → 58 → 59 → 60 → 61 → 62 → 63 → 64 → 65 → 66 → 67 → 68 → 69).

New features: follow [framework.md](./framework.md#feature-spec-template) — **Status**, **Input**, **FR-00N**, **SC-00N**, **Key Entities**, Gherkin, **Agent implementation request**, **Definition of Done**. Give each catalog row a one-line **Summary** so agents can find features without opening every spec.

**Branch roles:** `main` = scaffold-only starter kit · `dev` = integration · `feature/N-*` = feature work (branch from `dev`).

## Living reference

Keep snapshots in sync when schema, API, or product rules change — **in the same PR as implementation** (required DoD; see [Merge checklist + Agility sync](./framework.md#merge-checklist--agility-sync)). Each `feature-N-*.md` includes an **Agent implementation request** block so Cursor updates reference during implementation ([framework.md](./framework.md#agent-implementation-request)). Spec evolution after merge: [prefer a new feature delta](./framework.md#spec-evolution-after-merge).

| File | Purpose |
|------|---------|
| [reference/README.md](./reference/README.md) | How to maintain reference docs |
| [reference/writing-living-reference.md](./reference/writing-living-reference.md) | Student guide — writing/updating living reference |
| [reference/data-model.md](./reference/data-model.md) | Current database tables (update in feature PR when schema changes) |
| [reference/api.md](./reference/api.md) | Current REST API (update in feature PR when API changes) |
| [reference/behavior.md](./reference/behavior.md) | Current product rules (update in feature PR when rules change) |

## Related

- Cursor rules: `.cursor/rules/`
- ADRs: `docs/adr/`
- Quality attributes (NFRs): `docs/nfr/`
- Starter kit notes: `docs/STARTER-KIT.md`
