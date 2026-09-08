# Behavior & Rules Reference

**Living snapshot** of **Trips** product rules currently in force (imported baseline).

These files answer: *"What rules does Trips enforce right now?"*  
They do **not** authorize new scope — implement only from `features/feature-*.md`.

| File | Role |
|------|------|
| [api.md](./api.md) | Routes / payloads |
| [data-model.md](./data-model.md) | Tables / columns |
| **This file** | Ownership, status machines, validation, UI rules |

## Core rules (baseline)

| Rule | Enforcement | Provenance |
|------|-------------|------------|
| Auth is email + password; sessions JWT + `sessions` table; TTL **4 hours** | `auth.controller.js`, `auth.config.js` | Feature 1 |
| Passwords bcrypt-hashed; never returned | User `defaultScope` | Feature 1 |
| System admin = `user.isAdmin` | `accessControl.js` | Features 1–10 |
| Org roles via `orgPeopleRole` + role names | `accessControl.js`, seed roles | Feature 2 |
| System admin People list with no acting org (“All organizations”) returns **all** persons, including those with no org membership | `person.controller` `findAll` | Feature 11 |
| Trip role privileges use **approved** `tripPeopleRole` only | `authenticate` loads `tripRoles` | Feature 7 |
| Acting org header `X-Acting-Organization-Id` scopes lists for system admins | Axios + accessControl | Features 2–5 |
| Person optional at register; **required for profile completeness** / application applied; create-account and add/edit person show it after first name; display/list names include it when set; public URL slugs use first+last only | `person.middleName`, Login/Apply create-account, Add/Edit person, `isProfileComplete` | Feature 20 |
| When `takesMedication` is true, ≥1 org medical condition must be selected for profile completeness; catalog is org-scoped; selections persist on the person | `PersonProfileFields`, `person.controller`, `isProfileComplete` | Feature 17 |
| Female applicants answer **Are you pregnant?** on the **application** (after allergies); Yes requires due date and shows doctor travel-clearance document message; stored on `tripPeopleRole` (not person); cleared when not female | `PersonProfileFields` (healthOnly), `pregnancyFields.js`, apply/update application, `isApplicationComplete` | Feature 19 |
| Application status auto `incomplete`/`applied`; staff set `approved`/`declined`/`cancelled`; `applied` also requires all person documents to have uploaded files, every document type required by the selected worker role (with file + expiration past trip end), and a passport document when `trip.requirePassport` is true | `tripParticipantApplicationStatus.js`, apply/edit application UI | Feature 7, Feature 22, Feature 23, Feature 25 |
| Role capacity: `incomplete` + `applied` + `approved` occupy a trip worker-role slot; `cancelled`/`declined` do not; apply/role-switch blocked when `availableCount < 1`; shared helper `tripRoleCapacity.js` | browse/public/trip-worker-role lists, apply/update | Feature 26 |
| Applicant + Trip Leader / Org Admin / System Admin may **Cancel** / **Uncancel** with a styled “Are you sure?” dialog; cancelled apps remain on My Trips and participant lists with **Uncancel**; Uncancel restores auto `incomplete`/`applied` (never auto-`approved`) and fails if role full | `ConfirmDialog.vue`, `applicationCancel.js`, browse cancel/uncancel, staff `/trip-people-roles/:id/cancel|uncancel`, Home / TripView / Apply/Edit/View | Feature 26 |
| Apply / update application: primary Submit/Save is **hidden** when not editable or no available roles (or trip not ready); info alert above the action row lists structural blockers, or when Save Incomplete is shown lists **Profile is not complete** plus incomplete application fields needed to submit; application does **not** ask the license yes/no question (worker-role `licenseRequired` remains for admin/docs only) | `applicationSubmitAvailability.js`, `ApplicationSubmitUnavailableAlert`, ApplyTripDialog, EditTripApplicationView | Feature 27 |
| **Trip Status** board (from TripView or Trips list **Status**): staff-only; heading shows trip + role quantity/signed-up/available (Feature 26 occupancy); table lists all assignments with status, missing profile/application items (Feature 27 labels), amount raised (donation SUM), amount owed `max(0, cost − raised)`, and one column per travel option with selection; participant name opens contact dialog (email, phone, address) | `GET /trips/trips/:id/status`, `TripStatusView`, `PersonContactDialog`, `applicationMissingItems.js` | Feature 28 |
| **Rooming list** (Trips list **Room list**): staff-only; one list per trip (hotel, check-in, notes); participant grid assigns room number / nights / type (King\|Double\|Triple); Save groups into rooms; roommate Yes/No + preferred names display-only from application; conflicting type/nights on same room number → `400` | `GET`/`PUT /trips/trips/:id/rooming`, `TripRoomingView`, `tripRoomingList` / `tripRoom` / `tripRoomAssignment` | Feature 29 |
| **Participant flights** (Trips list **Flights**): staff-only; incomplete/applied/approved only; flight header purchased/cost/comments; Arrival/Return segments with airport/airline catalogs; board shows who purchases from application (and org preference text), plus initial departure (Arrival) and final arrival (Return if any, else Arrival); **application** collects flight purchase option (self vs org arranges) and, when org, preferred airports / class / airline | `GET`/`PUT .../flights`, segments dialog, apply/edit application, `airport` / `airline` / `tripFlight` / `tripFlightSegment` | Feature 30 |
| Worker role may list **multiple required document types** (independent of license required); application submit gated on those uploads | `workerRoleDocumentType`, `WorkerRoleFormDialog`, apply/edit | Feature 25 |
| Under-18 agreement requires adult signer fields | Application completeness helpers | Feature 7 |
| Org medical agreement Markdown (parallel to participant); shown on application when `takesMedication` is Yes; required **I agree to the medical agreement**; participant checkbox label **I agree to the Participation agreement**; shared e-signature text covers I agree checkboxes | `organizationAgreement.js`, org dialogs, `ParticipantAgreementSection`, browse apply/update | Feature 18 |
| System admins cannot use browse/apply UI routes | `router.js` `canBrowseAndApplyToTrips` | Feature 7 |
| Public pages unauthenticated; slug spaces → `_` | `/public/*`, donate URLs | Feature 9 |
| Organization optional unique `subdomain`; create-account on `{subdomain}.…` hides org picker and registers into that org | `organizationSubdomain.js`, `auth.controller` register, Login/Apply create-account | Feature 15 |
| Empty address / person-document country list fields default to United States (`US`) on form init; existing non-empty values preserved; trip destination country does not default; phone dialing codes unchanged | `AddressFields.vue`, person-document form / `CountrySelect` `defaultEmptyToUs`, `US_COUNTRY_CODE` | Feature 16 |
| Org Admin / System Admin may **Copy** a trip (Trips list button + dialog: new **Name** + **Trip to copy**); new trip same org copies catalog fields (including `requirePassport`), leaders, trip worker-role quantities, and travel options; does **not** copy participants or donations | `POST /trips/trips/:id/copy`, `CopyTripDialog`, `TripsList` | Feature 21, Feature 23 |
| Trip **Require Passport** checkbox; when true, application `applied` requires an uploaded passport-type person document with expiration past trip end | `trip.requirePassport`, Add/Edit trip, apply/edit application | Feature 23 |
| Document types may require a **document number** and carry **instructions**; add-document UI shows instructions when set and shows **Document number** only when required (otherwise hidden / stored null); application `applied` requires uploaded document files (and role-required type when set); catalog `type` includes **Diploma** (`diploma`) | `documentType.documentNumberRequired` / `instructions` / `type`, `personDocument.documentNumber`, `DocumentTypeFormDialog`, `PersonDocumentsCard`, apply/edit application | Feature 22, Feature 24 |
| Optimistic concurrency via `version` on key entities | `optimisticUpdate.js` | Features 2–8 |

Expand rows as deltas ship.
