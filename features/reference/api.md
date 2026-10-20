# API Reference

**Status:** living snapshot of Trips on `dev` (Features 1–11).  
**Mount:** `/trips` (`backend/server.js`).  
**Source of truth for new work:** `features/feature-*.md` — this file does **not** authorize scope.

## Conventions

| Topic | Rule |
|-------|------|
| Response shape | Flat JSON (no `{ success, data }` envelope) |
| Errors | `{ "message": "..." }` |
| Auth | `Authorization: Bearer <token>` on authenticated routes |
| Org scope | Optional `X-Acting-Organization-Id` — system admin list/emulate scope; may narrow multi-org lists for non-admins |
| Optimistic updates | Many PUT bodies include `version`; conflict → `409` |
| Static files | `/trips/images`, `/trips/uploads` |

**Auth legend:** **none** · **auth** (`authenticate`) · **sysadmin** (`authenticate` + `requireSystemAdmin`). Finer org/trip gates live in controllers (not repeated on every row).

---

## Feature provenance (endpoint groups)

| Prefix / area | Features |
|---------------|----------|
| Auth (`/login`, `/register`, …) | 1 |
| `/users`, `/roles`, `/people`, `/org-people-roles` | 2, **11** (all-orgs people list) |
| `/organizations` | 3 |
| `/document-types`, `/people/:id/documents` | 4 |
| `/trips` CRUD + image, `/dashboard/*` | 5, **28** (trip status board), **29** (rooming), **30** (flights), **54** (room list PDF), **55** (flights PDF) |
| `/worker-roles`, `/trip-worker-roles`, `/trip-travel-options` | 6 |
| `/medical-conditions` | 17 |
| `/languages` | 31 |
| `/airports`, `/airlines` | **30** |
| `/trips/browse/*`, `/trip-people-roles`, participants CSV | 7, **28** |
| `/donations`, `/donors`, donation/donor CSVs | 8 |
| `/public/*` | 9 |
| `/email-templates` | 10, **39** |
| `/email-types` | **39** |
| `/people-email` | **62** |

---

## Auth — Feature 1

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/trips/login` | none | Sign in; session token |
| `POST` | `/trips/register` | none | Register user + person; optional `orgIds`; optional `subdomain` (Feature 15 — binds Trip Participant to matching org); optional `middleName` (Feature 20); optional `preferredName` (Feature 33 — blank or omitted stores first name + last name) |
| `GET` | `/trips/register/organizations` | none | Orgs for registration UI |
| `GET` | `/trips/register/organizations/by-subdomain/:subdomain` | none | Resolve `{ id, name, subdomain }` or `404` (Feature 15) |
| `POST` | `/trips/logout` | none | Invalidate session (token in body) |
| `POST` | `/trips/change-password` | auth | Change password |
| `POST` | `/trips/reset-password` | none | Dev reset; **403 in production** |
| `GET` | `/trips/me` | auth | Current user context |

---

## Users & roles — Feature 2

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/users` | sysadmin | List users |
| `POST` | `/trips/users` | sysadmin | Create user |
| `PUT` | `/trips/users/:id/link-person` | sysadmin | Link user ↔ person |
| `GET` | `/trips/roles` | auth | Role catalog |

---

## People & org membership — Features 2, 11

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/people` | auth | List people. **Feature 11:** system admin with **no** acting-org header returns **all** persons; with acting org → membership in that org; Org Admin / Trip Leader → Feature 2 scoping |
| `GET` | `/trips/people/org-trip-leaders` | auth | People with Trip Leader org role for `?orgId=` |
| `GET` | `/trips/people/:id` | auth | Person detail |
| `POST` | `/trips/people` | auth | Create person (+ optional org/role); omitted or blank `preferredName` stores first name + last name (Feature 33) |
| `PUT` | `/trips/people/:id` | auth | Update person (`version`); accepts `emergencyContactRelationship` (`spouse`, `father`, `mother`, `child`, `grandmother`, `grandfather`, `other`); `preferredName` blank stores first name + last name, omitted leaves the stored value (Feature 33) |
| `PUT` | `/trips/people/:id/picture` | auth | Upload picture (`multipart` field `picture`) |
| `DELETE` | `/trips/people/:id` | sysadmin | Delete person |
| `GET` | `/trips/org-people-roles` | auth | List org memberships |
| `POST` | `/trips/org-people-roles` | auth | Assign org role |
| `PUT` | `/trips/org-people-roles/:id` | auth | Update membership |
| `DELETE` | `/trips/org-people-roles/:id` | auth | Remove membership |

Optional query: `GET /trips/people?tripId=` intersects with trip assignments.

---

## Organizations — Feature 3

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/organizations` | auth | List (scoped) |
| `GET` | `/trips/organizations/:id` | auth | Detail |
| `POST` | `/trips/organizations` | sysadmin | Create |
| `PUT` | `/trips/organizations/:id` | auth | Update (org admin / sysadmin) |
| `PUT` | `/trips/organizations/:id/logo` | auth | Logo (`multipart` field `logo`) |
| `GET` | `/trips/organizations/:id/agreement` | auth | Agreement markdown |
| `PUT` | `/trips/organizations/:id/agreement` | auth | Save agreement `{ content }` |
| `GET` | `/trips/organizations/:id/medical-agreement` | auth | Medical agreement markdown |
| `PUT` | `/trips/organizations/:id/medical-agreement` | auth | Save medical agreement `{ content }` |
| `DELETE` | `/trips/organizations/:id` | sysadmin | Delete |

Create, update, and detail include `testMode` (boolean, default `false`) — Feature 49.

---

## Document types & person documents — Features 4, 22, 24, 57, 59

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/document-types` | auth | Catalog (any auth user); includes `documentNumberRequired`, `instructions`, `allowSpecialization` (Feature 34), `hasExpirationDate` (Feature 57), `specializations` (`[{ id, name }]` ordered by name, Feature 59); `type` may be `medical_licence`, `passport`, `certification`, or `diploma` |
| `GET` | `/trips/document-types/:id` | auth | Get (sysadmin gate in controller); includes `specializations` |
| `POST` | `/trips/document-types` | auth | Create (sysadmin); optional `documentNumberRequired`, `instructions`, `allowSpecialization`, `hasExpirationDate` (default `true`, Feature 57); `type` includes `diploma` (Feature 24); optional `specializations: [{ name }]` — names required, trimmed, ≤ 100 chars, unique ignoring case; `400` "Add at least one specialization." when `allowSpecialization` is true and the list is empty (Feature 59) |
| `PUT` | `/trips/document-types/:id` | auth | Update (sysadmin); `specializations: [{ id?, name }]` replaces the list when sent — with `id` keeps (and renames) the entry, without adds, left out removes; removing one used by a person document or worker role → `400` "<name> is in use and cannot be removed." and nothing is saved; same name and "Add at least one specialization." rules as `POST` (Feature 59) |
| `DELETE` | `/trips/document-types/:id` | auth | Delete (sysadmin) |
| `GET` | `/trips/people/:id/documents` | auth | List; includes `specializations` (`id`, `documentTypeSpecializationId`, `name` from the list entry, `date`, `documentFileName`) when present; `expirationDate` may be null and `documentType` includes `hasExpirationDate` (Feature 57) |
| `POST` | `/trips/people/:id/documents` | auth | Upload (`multipart` field `document`); optional `documentNumber` (required when type says so); `expirationDate` required only when the type has `hasExpirationDate`, otherwise stored null and any value sent is ignored (`400` "Expiration date is required.", Feature 57); `specializations` JSON (`[{ id?, documentTypeSpecializationId, date, replaceFile }]`) plus `specializationFiles` when the type allows them (Feature 34). `400` "Specialization is not in the list for this document type." / "Each specialization can be added only once per document." (Feature 59) |
| `PUT` | `/trips/people/:id/documents/:documentId` | auth | Update/replace; same `expirationDate` and specialization rules as `POST`; specialization list replaces stored rows when sent and the type allows them |
| `DELETE` | `/trips/people/:id/documents/:documentId` | auth | Delete |
| `GET` | `/trips/people/:id/documents/:documentId/view` | auth | Inline view |
| `GET` | `/trips/people/:id/documents/:documentId/download` | auth | Download |
| `GET` | `/trips/people/:id/documents/:documentId/specializations/:specializationId/view` | auth | Inline view of one specialization file |
| `GET` | `/trips/people/:id/documents/:documentId/specializations/:specializationId/download` | auth | Download one specialization file |

Uploaded document and specialization files are stored encrypted and returned decrypted (Feature 63). Upload, view, download, and the participant documents PDF return `500` "Could not read the document encryption key." when the key cannot be read; view and download return `500` "The document could not be decrypted." for a wrong key or damaged file.

---

## Trips (catalog) — Feature 5

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/trips` | auth | Scoped list + aggregates |
| `GET` | `/trips/trips/:id` | auth | Detail if `canAccessTrip` |
| `GET` | `/trips/trips/:id/status` | auth | Trip Status board (Trip Leader / Org Admin / System Admin): trip summary, roles with capacity counts (incl. `reservedCount`, Feature 56), travel-option columns, participants with status / missing items / owed / raised / selected options — Feature 28 |
| `GET` | `/trips/trips/:id/rooming` | auth | Rooming list load (staff): trip summary, hotel header, rooms, participant assignment grid + roommate prefs — Feature 29 |
| `PUT` | `/trips/trips/:id/rooming` | auth | Upsert rooming hotel header + rooms/assignments from participant grid — Feature 29 |
| `GET` | `/trips/trips/:id/rooming/pdf` | auth | Room list PDF (same staff access as rooming; else `403`/`404`): `application/pdf`, `Content-Disposition: attachment; filename="Room List - <trip name>.pdf"` — Feature 54 |
| `GET` | `/trips/trips/:id/flights` | auth | Participant flights board (staff) — Feature 30 |
| `GET` | `/trips/trips/:id/flights/pdf` | auth | Flights PDF (same staff access as flights; else `403`/`404`): `application/pdf`, `Content-Disposition: attachment; filename="Flights - <trip name>.pdf"` — Feature 55 |
| `GET` | `/trips/trips/:id/participants/:assignmentId/documents/pdf` | auth | Participant documents PDF (Trip Leader of the trip, Org Admin of the trip org, or System Admin; else `403`; unknown trip or assignment not on the trip → `404`): `application/pdf`, `Content-Disposition: attachment; filename="Documents - <first last>.pdf"` — Feature 58 |
| `PUT` | `/trips/trips/:id/flights/:tripPeopleRoleId` | auth | Upsert flight header (purchased, cost, comments) — Feature 30 |
| `GET` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth | List flight segments — Feature 30; also the assignment's own participant when its flight purchase option is `self`, else `403` "Forbidden." (Feature 60) |
| `PUT` | `/trips/trips/:id/flights/:tripPeopleRoleId/segments` | auth | Replace flight segments — Feature 30; also the assignment's own participant when its flight purchase option is `self`, else `403` "Forbidden." (Feature 60) |
| `GET` | `/trips/trips/:id/team-email/templates` | System Admin, Org Admin of the trip org, Trip Leader of the trip | **Trip Participant** templates for the trip and its organization (no trip) — Feature 46 |
| `POST` | `/trips/trips/:id/team-email/preview` | same | Body `{ emailTemplateId, subject, emailBody, sendTo, personIds?, personId }` → `{ from, replyTo, to, subject, body }` for that recipient; sends nothing — Feature 46 |
| `POST` | `/trips/trips/:id/team-email` | same | Body `{ emailTemplateId, subject, emailBody, sendTo, personIds? }`; `sendTo` is `potential` (Trip Participants and Trip Leaders incomplete/applied/approved), `accepted` (Trip Participants approved), or `selected` (`personIds` must be potential recipients); one email per person. One email per recipient to their email → `{ sent, skipped, failed, results: [{ personId, name, status, reason }] }`. `400` for missing/foreign template, empty subject or body, bad `sendTo`, no recipients, or invalid selection — Feature 46 |
| `POST` | `/trips/trips` | auth | Create (+ optional `leaderPeopleIds`, `primaryLeaderPeopleId`, `requirePassport`, `deposit`). `primaryLeaderPeopleId` must be in `leaderPeopleIds` (`400`); omitted → first leader (Feature 40) |
| `POST` | `/trips/trips/:id/copy` | auth | Copy source trip → new trip (name required; leaders and primary trip leader, worker roles, travel options, `requirePassport`, `deposit`; not participants/donations) — Features 21, 23, 38, 40 |
| `PUT` | `/trips/trips/:id` | auth | Update (optional `deposit`, Feature 38; optional `leaderPeopleIds` / `primaryLeaderPeopleId`, Feature 40) |
| `PUT` | `/trips/trips/:id/image` | auth | Image (`multipart` field `image`) |
| `DELETE` | `/trips/trips/:id` | auth | Delete (org admin / sysadmin) |
| `GET` | `/trips/dashboard/org` | auth | Org metrics |
| `GET` | `/trips/dashboard/trip` | auth | Trip metrics |
| `GET` | `/trips/dashboard/participant` | auth | Participant donation totals |

---

## Worker roles & travel options — Features 6, 25, 59

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/worker-roles` | auth | Org worker-role catalog (`?orgId=`); includes `requiredDocumentTypes` / `requiredDocumentTypeIds` (Feature 25) and `requiredSpecializations` (`[{ id, name, documentTypeId }]`) / `requiredSpecializationIds` (Feature 59); each required document type includes `allowSpecialization`. No `licenseRequired` on any worker role payload (removed in Feature 59) |
| `GET` | `/trips/worker-roles/:id` | auth | Get |
| `POST` | `/trips/worker-roles` | auth | Create (org admin); `requiredDocumentTypeIds?: number[]` (Feature 25); `requiredSpecializationIds?: number[]` — each must belong to a required document type, else `400` "Required specializations must belong to a required document." (Feature 59) |
| `PUT` | `/trips/worker-roles/:id` | auth | Update; replace required document list when `requiredDocumentTypeIds` sent; replace required specializations when `requiredSpecializationIds` sent (same `400`); removing a required document also removes its required specializations (Feature 59) |
| `DELETE` | `/trips/worker-roles/:id` | auth | Delete |
| `GET` | `/trips/trip-worker-roles` | auth | Needs for `?tripId=`; each role has `signedUpCount`, `reservedCount`, `availableCount` (Feature 26, 56) |
| `POST` | `/trips/trip-worker-roles` | auth | Add role quantity; optional `emails: string[]` reserved with the role (validated like `POST …/reservations`, open slots = quantity; on `400` neither the role nor reservations are saved) — Feature 56 |
| `PUT` | `/trips/trip-worker-roles/:id` | auth | Update quantity; `400` "Remove reserved emails first." when quantity < reservations (Feature 56) |
| `DELETE` | `/trips/trip-worker-roles/:id` | auth | Remove (also removes its reservations) |
| `GET` | `/trips/trip-worker-roles/:id/reservations` | auth + trip staff | `[{ id, email, filled, applicantName, applicationStatus }]` ordered by email — Feature 56 |
| `POST` | `/trips/trip-worker-roles/:id/reservations` | auth + trip staff | Body `{ emails: string[] }`; `201` with created rows; `400` for invalid emails, duplicates on the trip, emails that already applied, or more emails than open slots ("Only N open slots for this role.") — Feature 56 |
| `DELETE` | `/trips/trip-worker-roles/:id/reservations/:reservationId` | auth + trip staff | Remove a reservation — Feature 56 |
| `GET` | `/trips/trip-travel-options` | auth | Options for `?tripId=` |
| `POST` | `/trips/trip-travel-options` | auth | Create |
| `PUT` | `/trips/trip-travel-options/:id` | auth | Update |
| `DELETE` | `/trips/trip-travel-options/:id` | auth | Delete |

---

## Medical conditions — Feature 17

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/medical-conditions` | auth | Org catalog (`?orgId=`) — org members may read |
| `GET` | `/trips/medical-conditions/:id` | auth | Get one |
| `POST` | `/trips/medical-conditions` | auth | Create (org admin) — `name` ≤ 50, unique per org (CI) |
| `PUT` | `/trips/medical-conditions/:id` | auth | Update name |
| `DELETE` | `/trips/medical-conditions/:id` | auth | Delete (cascades person selections) |
| `GET` | `/trips/people/:id` | auth | Includes `medicalConditions` / `medicalConditionIds` (`?orgId=` filters) |
| `PUT` | `/trips/people/:id` | auth | Accepts `medicalConditionIds` + `orgId`; clears org links when `takesMedication` is false |

---

## Other languages — Feature 31

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/languages` | auth | List global language catalog |
| `GET` | `/trips/people/:id` | auth | Includes `speaksOtherLanguage` and `languages` |
| `PUT` | `/trips/people/:id` | auth | Accepts `speaksOtherLanguage` and `languages`; No/unanswered clears rows; Yes requires language, Basic/Conversational fluency, and medical terminology Yes/No |

---

## Airports & airlines — Feature 30

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/airports` | auth | List airport catalog |
| `POST` | `/trips/airports` | auth (sysadmin) | Create airport |
| `PUT` | `/trips/airports/:id` | auth (sysadmin) | Update airport |
| `DELETE` | `/trips/airports/:id` | auth (sysadmin) | Delete if unused |
| `GET` | `/trips/airlines` | auth | List airline catalog |
| `POST` | `/trips/airlines` | auth (sysadmin) | Create airline |
| `PUT` | `/trips/airlines/:id` | auth (sysadmin) | Update airline |
| `DELETE` | `/trips/airlines/:id` | auth (sysadmin) | Delete if unused |

---

## Applications & participants — Feature 7

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/trips/browse/orgs` | auth | Browse orgs |
| `GET` | `/trips/trips/browse/mine` | auth | My trips; each trip adds `tripPeopleRoleId` and `nextActions` — ordered `{ code, ... }` with `complete-application` (`missingDocuments`), `submit-application` (incomplete with nothing missing on the Trip Status checklist), `wait-approval`, `make-deposit` (`amountRaised`, `deposit`), `make-donation` (`amountOwed`), `enter-flights`, or `all-ready` when an approved application needs nothing else; empty for past trips, cancelled and declined (Feature 60) |
| `GET` | `/trips/trips/browse` | auth | Active trips (`?orgId=`) |
| `GET` | `/trips/trips/browse/:id` | auth | Browse detail + roles/agreements/options; Feature 53 `myTripInfo.donationRecipients` `[{ personId, firstName, lastName }]` (approved Trip Participants and Trip Leaders) when the caller's application is incomplete/applied/approved, else `[]`; roles add `reservedCount`; `myReservedTripWorkerRoleId` (caller's reserved role or `null`) — Feature 56; each role's `workerRole` includes `requiredSpecializations` and `requiredDocumentTypes[].allowSpecialization` — Feature 59; `myTripInfo.tripPeopleRoleId` and `myTripInfo.nextActions` (same codes as `/browse/mine`) — Feature 60; for incomplete/applied/approved, `myTripInfo.room` (`{ hotelName, roomType, roommates, checkInDate, checkOutDate }` from the saved rooming list, or `null`), `flightPurchaseOption`, `flightSegments` (Arrival then Return by segment number: `segmentType`, `segmentNumber`, `airlineName`, `flightNumber`, `departureAirportCode`, `departureDate`, `departureTime`, `arrivalAirportCode`, `arrivalDate`, `arrivalTime`), and `selectedTravelOptions` (`{ id, description, setNumber, priceAdjustment }`); otherwise `null` / `[]` — Feature 61 |
| `POST` | `/trips/trips/browse/:id/apply` | auth | Apply (incl. medical agreement acceptance; `isPregnant` / `pregnancyDueDate` on assignment); sends `application-started` / `application-submitted` event emails — Feature 45; a caller with a reservation is placed in the reserved role (body role ignored, no open-slot check) — Feature 56 |
| `GET` | `/trips/trips/browse/:id/application` | auth | Own application; `myReservedTripWorkerRoleId` — Feature 56; role `workerRole` includes `requiredSpecializations` — Feature 59 |
| `PUT` | `/trips/trips/browse/:id/application` | auth | Update application (incl. pregnancy fields); sends `application-submitted` event emails — Feature 45; `400` "Your role on this trip is reserved." when a reserved caller picks another role — Feature 56 |
| `POST` | `/trips/trips/browse/:id/application/cancel` | auth | Applicant cancel own application (`incomplete`/`applied`/`approved` → `cancelled`) |
| `POST` | `/trips/trips/browse/:id/application/uncancel` | auth | Applicant uncancel → auto `incomplete`/`applied`; fails if role full |
| `GET` | `/trips/trip-people-roles` | auth | Roster (`?tripId=`) |
| `GET` | `/trips/trips/:id/status` | auth | Trip Status board — Feature 28 (also listed under Trips catalog) |
| `GET` | `/trips/trip-people-roles/:id` | auth | One assignment |
| `POST` | `/trips/trip-people-roles` | auth | Staff add participant; sends application event emails for Trip Participants — Feature 45 |
| `POST` | `/trips/trip-people-roles/:id/cancel` | auth | Staff cancel (`incomplete`/`applied`/`approved`) |
| `POST` | `/trips/trip-people-roles/:id/uncancel` | auth | Staff uncancel → auto `incomplete`/`applied`; fails if role full |
| `PUT` | `/trips/trip-people-roles/:id` | auth | Update / approve / decline; sends `application-submitted` / `application-approved` event emails for Trip Participants — Feature 45 |
| `DELETE` | `/trips/trip-people-roles/:id` | auth | Delete |
| `GET` | `/trips/export/trips/:tripId/participants.csv` | auth | Participants CSV; **Preferred Name** column after **Last Name** (Feature 33) |

Browse/apply UI is blocked for system admins (router); see `behavior.md`.

---

## Donors & donations — Feature 8

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/donations` | auth | List (`?tripId=` required); participants see own rows only |
| `POST` | `/trips/donations` | auth | Staff create (nested `donor` / `donorId`); sends donation event emails — Feature 45. Feature 53: `donor.personId` with no `donorId` uses or creates that person's linked donor (person must be in the trip's organization, System Admin any) → otherwise `400` "Person not found." |
| `POST` | `/trips/donations/participant` | auth | Feature 53. Body `{ tripId, personId, amount, paymentInfo }` (`personId` = recipient). Caller needs an incomplete/applied/approved application on the trip → else `403` "Forbidden."; amount above 0 → else `400` "Donation amount is required."; self only when approved → else `403` "You can donate to yourself only on trips where you are approved."; recipient must be an approved Trip Participant or Trip Leader → else `400` "Choose a participant on this trip." Uses the caller's linked donor (created from their person when missing), current date/time; sends donation event emails |
| `PUT` | `/trips/donations/:id` | auth | Update; Feature 53 `donor.personId` as on create |
| `DELETE` | `/trips/donations/:id` | auth | Delete |
| `GET` | `/trips/donors/lookup` | auth | Lookup `?email=`; Feature 53 adds optional `tripId`. Donor by email → donor + `source: "donor"`. Otherwise, for staff who manage donations on `tripId`, a person with the email in the trip's organization (System Admin any): their linked donor (`source: "donor"`) or `{ id: null, personId, firstName, lastName, email, address, phone, status: "active", source: "person" }`. Else `404` "Donor not found." |
| `GET` | `/trips/donors` | auth | List donors |
| `POST` | `/trips/donors` | auth | Create donor (`personId` ignored) |
| `PUT` | `/trips/donors/:id` | auth | Update donor |
| `GET` | `/trips/export/trips/:tripId/donors.csv` | auth | Donors CSV |
| `GET` | `/trips/export/trips/:tripId/donations.csv` | auth | Donations CSV |

---

## Public fundraising — Feature 9

No auth. Slugs: spaces → `_`.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/public/orgs/by-name/:orgSlug` | none | Org + open active trips |
| `GET` | `/trips/public/trips/:tripId` | none | Trip + approved participants |
| `GET` | `/trips/public/trips/by-name/:tripSlug` | none | Trip by slug |
| `GET` | `/trips/public/trips/by-name/:tripSlug/overview` | none | Overview + roles needed (with `reservedCount`; `availableCount` excludes reserved — Feature 56) |
| `GET` | `/trips/public/trips/:tripId/participants/:personId` | none | Participant donate data |
| `GET` | `/trips/public/trips/by-name/:tripSlug/participants/:personSlug` | none | Same by slug |
| `POST` | `/trips/public/donations` | optional | Public donation (`tripId`, `amount`, `donor`, optional `personId`); sends donation event emails — Feature 45. Feature 53: with a valid sign-in token the signed-in person's linked donor is used (created from the entered donor details when missing); naming yourself needs an approved assignment → else `403`. `donor.personId` / `donor.id` in the body are ignored |

---

## Email templates — Feature 10

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/email-templates` | auth | List (org / trip-leader scoped). Includes `emailTypeId`, `functionCode`, `subject`, `fromEmail`, `toAddress`, `emailBody`, `scheduleRule`, and `scheduleDaysBefore` when present |
| `GET` | `/trips/email-templates/copy-sources` | auth | Copy sources (`?tripId=` optional). Includes `toAddress` (Feature 41), `scheduleRule`, and `scheduleDaysBefore` (Feature 42) |
| `POST` | `/trips/email-templates/preview` | System Admin, Org Admin, or Trip Leader of the trip | Body `{ orgId, tripId, personId?, fromEmail?, toAddress?, subject, emailBody }` → `{ fromEmail, toAddress, subject, emailBody }` with `{{TOKEN_CODE}}` tokens replaced. In `toAddress`, recipients that come out empty are left out and the rest are joined with `, ` (Feature 41). Trip not in the organization or person without a participant application on the trip → `400`. Sends no email — Feature 40 |
| `GET` | `/trips/email-templates/:id` | auth | Get |
| `POST` | `/trips/email-templates` | auth | Create. Feature 39 body adds `emailTypeId`, `functionCode` (`Scheduled`, `Send Now`, `Trip Participant` — Feature 46, or `Person` — Feature 62; `Person` on a trip template → `400` "Person templates cannot belong to a trip."), and `emailBody`. Feature 41 adds required `toAddress`: comma-separated email addresses or `{{TOKEN_CODE}}` tokens whose value source is an email; blank → `400` "To is required.", any other recipient → `400`. `fromEmail` must be exactly one email address or email token → otherwise `400`. Feature 42 adds `scheduleRule` (`daily`, `weekly`, `before-start`) and `scheduleDaysBefore`: a `Scheduled` template needs a valid `scheduleRule` → otherwise `400` "Schedule is required for scheduled templates."; `before-start` needs `scheduleDaysBefore` 1–365 → otherwise `400` "Days before trip start must be a whole number from 1 to 365." `Send Now` saves both as `null`; `daily` and `weekly` save `scheduleDaysBefore` as `null` |
| `PUT` | `/trips/email-templates/:id` | auth | Update. Same Feature 39, 41, 42, and 62 fields when present |
| `DELETE` | `/trips/email-templates/:id` | auth | Delete |

---

## People email — Feature 62

Acting organization: the `X-Acting-Organization-Id` header, or the Org Admin's only organization. System Admin or Org Admin of the acting organization; anyone else → `403` "Forbidden."; no acting organization → `400` "Select an organization in the menu bar.". `tripIds` and `workerRoleIds` are each `"all"` or a non-empty array of ids; trips outside the acting organization → `400` "Trips must belong to this organization."; roles not on the selected trips → `400` "Roles must be on the selected trips.".

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/people-email/options` | see above | `{ templates, trips }`: the acting organization's **Person** templates (`id`, `subject`, `emailBody`, `fromEmail`, `emailTypeId`) by subject, and its trips (`id`, `name`, `startDate`, `roles: [{ workerRoleId, name }]` by name) newest start date first |
| `POST` | `/trips/people-email/recipients` | same | Body `{ tripIds, workerRoleIds }` → `[{ personId, name }]` by last then first name: approved Trip Participants on the selected trips with a selected worker role (`"all"` roles includes those with none), each person once |
| `POST` | `/trips/people-email/preview` | same | Body `{ emailTemplateId, subject, emailBody, tripIds, workerRoleIds, personId }` → `{ from, replyTo, to, subject, body }`; `personId` not a recipient → `400` "Preview person must be one of the recipients."; sends nothing |
| `POST` | `/trips/people-email` | same | Body `{ emailTemplateId, subject, emailBody, tripIds, workerRoleIds }` → `{ sent, skipped, failed, results: [{ personId, name, status, reason }] }`, one email per recipient to their email. `emailTemplateId` is a **Person** template of the acting organization (tokens from organization and person; logged with no trip) or, when `tripIds` comes to exactly one trip, a **Trip Participant** template of that trip or its organization (filled as Email team for that trip) — otherwise `400` "Choose a template for this organization." / "Trip Participant templates need exactly one trip selected.". Blank subject / body or no recipients → `400` |

---

## Email types — Feature 39

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/email-types` | System Admin, Org Admin, or Trip Leader | List (`id`, `typeCode`, `description`, `eventCode`) |
| `GET` | `/trips/email-types/:id` | System Admin | Get one |
| `POST` | `/trips/email-types` | System Admin | Create `{ typeCode, description, eventCode }` |
| `PUT` | `/trips/email-types/:id` | System Admin | Update |
| `DELETE` | `/trips/email-types/:id` | System Admin | Delete when no template uses it |

Duplicate `typeCode`, a blank required field, or deleting a type a template still uses → `400`. A caller who is not a System Admin writing a type → `403`. Template save with a function code other than `Scheduled`, `Send Now`, `Trip Participant` (Feature 46), or `Person` (Feature 62) → `400`.

---

## Email tokens — Feature 40

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/trips/email-tokens` | System Admin, Org Admin, or Trip Leader | List (`id`, `tokenCode`, `description`, `valueSource`) ordered by token code |
| `GET` | `/trips/email-tokens/value-sources` | System Admin | Fixed value sources `[{ valueSource, label }]`; includes `participant.tripRole` "Participant trip role" (Feature 48) and the Feature 52 financial sources `participant.tripCost`, `participant.tripOptions`, `participant.tripOptionsTotal`, `participant.airfare`, `participant.totalTripCost`, `participant.donations`, `participant.donationsTotal`, `participant.tripDonations`, `participant.tripDonationsTotal`, `participant.balanceDue` |
| `GET` | `/trips/email-tokens/:id` | System Admin | Get one |
| `POST` | `/trips/email-tokens` | System Admin | Create `{ tokenCode, description, valueSource }` |
| `PUT` | `/trips/email-tokens/:id` | System Admin | Update |
| `DELETE` | `/trips/email-tokens/:id` | System Admin | Delete |

Duplicate `tokenCode`, a token code outside capital letters / digits / underscores, a blank required field, or an unknown `valueSource` → `400`. A caller who is not a System Admin writing a token → `403`.

---

## Models without dedicated routes

| Model | How accessed |
|-------|----------------|
| `tripPeopleRoleOption` | Nested via browse apply / TPR application payloads |
| `emailLog` | Written by auth/login paths and every template email sent (with template, trip, and participant — Feature 45); no CRUD API |

Deep payload/Gherkin detail remains in each `features/feature-N-*.md`.
