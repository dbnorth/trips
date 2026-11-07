# System Admin Guide

This guide is for **System Admins**, who run the whole system. You can do everything an Org Admin and a Trip Leader can, in every organization. See the [Organization admin guide](./org-admin-guide.md) and the [Trip staff guide](./trip-staff-guide.md).

## Choosing an organization

**Emulate org** in the menu bar sets which organization the pages show.

- **All organizations**: the **People** page lists everyone, including people in no organization. **Organizations** lists every organization. Pages that manage one organization's items (**Document types**, **Worker roles**, **Medical conditions**, **Pictures**, **Templates**) say "Select an organization using the menu bar…", and **Add person** and **Add trip** are disabled.
- **An organization**: every page works as it does for that organization's Org Admin.

System Admins can't use the participant pages for browsing and applying to trips.

## Home

- With **All organizations**: "System admin dashboard. Use People and Organizations in the menu, or emulate an organization from the menu bar."
- With an organization: tiles for **Trips**, **Active trips**, **People** (role assignments in the organization), and **Donations total**, then the organization heading and **Organization Trips** (see the [Organization admin guide](./org-admin-guide.md#home)).

## Organizations

On **Organizations**, **Add** creates an organization and **Edit** changes one. Organizations can't be deleted from the screens. The fields are in the [Organization admin guide](./org-admin-guide.md#add-organization--edit-organization). Only you can set:

| Field | Notes |
|-------|-------|
| **Subdomain** | The organization's own web address (for example *name*.your-domain). People who create an account there join the organization automatically. 1–63 lowercase letters, numbers, and hyphens (not at the start or end). www, api, app, admin, and localhost are reserved. |

## People and access

In **Add person** and **Edit person**, you also see:

| Field | Notes |
|-------|-------|
| **System administrator** | Switch. Gives the person full system access. Needs an email. |
| **New password** | Editing someone else who has a login. Leave blank to keep their password. Setting one signs them out everywhere. |
| **Email** | You can change anyone's sign-in email. |
| **Organization** (Add person) | Every organization. |

In **Edit person → Organizations**, you can give roles in any organization. Give the **Agent** role to travel agents who book flights.

---

# Screen reference: shared lists

These lists are shared by every organization. Each list page has an add button, and **Edit** and **Delete** on every row. **Delete** asks for confirmation.

## Email types page

**Email types** in the menu bar. What each email is about. Organizations pick one for each template. The full list is in the [Organization admin guide](./org-admin-guide.md#email-types).

| Column / field | Notes |
|----------------|-------|
| **Type code** | A short unique code, for example `apply-started`. Required. |
| **Description** | The name organizations see in the template's **Email type** list. Required. |
| **Event code** | The system event that sends Send Now and Scheduled templates of this type. Required. Emails are sent automatically only for the event codes the system knows: application-started, application-incomplete, application-submitted, application-approved, documents-missing, document-reload-requested, deposit-due, deposit-received, payment-due, payment-complete, donation-received, trip-donation, pre-departure, trip-arrival. `team-email` is for types sent by hand. |
| **Event description** | Plain-language explanation of when it's sent. Shown in the info icon on the **Email templates** list. |

**Add email type** adds one. A type used by a template can't be deleted ("Email type is used by a template.").

## Email tokens page

**Email tokens** in the menu bar. The fill-in values templates can use. The full list is in the [Organization admin guide](./org-admin-guide.md#email-tokens).

| Column / field | Notes |
|----------------|-------|
| **Token code** | Written in templates as `{{TOKEN_CODE}}`. Capital letters, digits, and underscores, starting with a capital letter. Required and unique. |
| **Description** | Shown in the **Insert token** lists. Required. |
| **Value source** | What the token fills in. Required. Choose from the list below. |

**Add token** adds one.

**Value source** choices:

| Group | Value sources |
|-------|---------------|
| Organization | Organization name, Organization email, Organization phone, Organization website |
| Trip | Trip name, Trip location, Trip start date, Trip end date, Trip participant cost, Trip deposit, Trip arrival PDF (attachment), Trip documents due date (90 days before the start) |
| Participant | Participant first name, last name, preferred name, email, amount raised, amount owed, trip role, trip cost, trip options, trip options total, trip airfare, add-on expenses, add-on expenses total, total trip cost, donations, donations total, trip donations, trip donations total, balance due, arrival date, departure date, create account link, arrival flight, return flight, flight confirmation number, missing documents |
| Document reload | Document to reload, Document type to reload, Reload request note (filled only in the reload request email) |
| Donation | Donation date, Donation type, Donation amount, Donation fee covered (filled only in the Trip donation email) |
| Primary trip leader | Primary trip leader first name, last name, preferred name, email, phone |

Value sources that are emails (Organization email, Participant email, Primary trip leader email) make **email tokens**, usable in **From email** and **To**. Trip arrival PDF makes an **attachment token**, usable in **Attachment**.

## Airports page

**Airports** in the menu bar. Used for flight segments and flight preferences.

| Column / field | Notes |
|----------------|-------|
| **Code** | The airport code, for example DFW. Saved in capitals. Required and unique. |
| **Airport** | The airport's name. Required. |
| **City** | Required. |
| **Country** | Required. |

**Add airport** adds one. An airport used by a flight segment can't be deleted ("Airport is referenced by flight segments.").

## Airlines page

**Airlines** in the menu bar.

| Column / field | Notes |
|----------------|-------|
| **Airline code** (**Code**) | The airline code, for example AA. Saved in capitals. Required and unique. |
| **Airline name** | Required. |

**Add airline** adds one. An airline used by a flight segment can't be deleted ("Airline is referenced by flight segments.").

## Global templates

On **Templates**, a System Admin must emulate an organization first. Global starting templates (shown as "Global (master)" in **Scope**) can be offered in **Copy from** when Org Admins add organization-wide templates.

## Email

- Scheduled emails go out every day at 7:00 AM Central time.
- An organization's **Test mode** sends all its email to the organization's address instead of the real recipients.
- Every email sent is logged.
