# Feature: Default Country Selects to United States

**Feature ID:** 16
**Branch pattern:** `feature/16-default-country-united-states`
**Status:** Done
**Created:** 2026-09-05
**Input:** Default address and document country selection lists to United States (`US`) when the form is opened for create / empty state; do **not** default trip country
**Depends on:** [Feature 2 — People & Org Membership](feature-2-people-and-org-membership.md), [Feature 3 — Organizations & Agreements](feature-3-organizations-and-agreements.md), [Feature 4 — Document Types & Person Documents](feature-4-document-types-and-person-documents.md), [Feature 5 — Trip Catalog Management](feature-5-trip-catalog-management.md), [Feature 8 — Donors & Donations](feature-8-donors-and-donations.md)

---

## User Stories

### US-16.1: New address/document forms start with United States selected
**As a** user filling a create/edit form with an address or document country dropdown  
**I want** United States pre-selected when the country is empty  
**So that** I do not have to choose the most common value every time

**Priority:** P2  
**Independent test:** Open Add person / Add org / document “country issued” / donation donor address with empty country → control shows `US`; Add trip country stays empty  
**Acceptance scenarios:** see ### US-16.1

---

## Requirements

### Functional Requirements

- **FR-001**: UI controls that present the shared **country selection list** for **addresses** and **person-document country issued** (`AddressFields` country autocomplete; `CountrySelect` for `countryIssued`) MUST default to **United States**, stored as country code `US` (`US_COUNTRY_CODE` in `locationData.js`), when the bound value is empty (`null`, `undefined`, or `""`) at form init / reset.
- **FR-002**: The default MUST apply on **new / empty** form state (create dialogs and reset forms). Surfaces that currently use these controls include at least:
  - Person address (`AddressFields` in Add/Edit person)
  - Organization address (`AddressFields` in Add/Edit organization)
  - Donor address (`AddressFields` in donation dialogs that use it)
  - Person document **Country issued** (`CountrySelect` on person documents)
- **FR-003**: When loading an **existing** record that already has a non-empty `country` / `countryIssued`, that stored value MUST be shown — do not overwrite with `US`.
- **FR-004**: When loading an existing address/document record whose country is empty/null, the UI MAY show `US` as the default for editing; saving still persists whatever the user leaves selected (including clearing if the control remains clearable — see FR-005).
- **FR-005**: Country selects MAY remain clearable. Clearing is allowed; the default applies when the field is empty at form init / reset, not as a permanent lock.
- **FR-006**: Prefer a shared mechanism in `AddressFields` (and empty-form init / optional `CountrySelect` default for document country issued) so new address screens inherit the behavior.
- **FR-007**: Phone **country code** fields (`PhoneCountryCodeInput` / `phoneContryCode`) are **out of scope** — they are dialing codes, not the country name list.
- **FR-008**: Trip `country` on Add/Edit trip MUST **not** default to United States. Empty trip country stays empty until the user selects a value.

---

## Assumptions

- `US_COUNTRY_CODE` is already `"US"` and United States is already first in `countryItems()`.
- Today empty forms leave country blank until the user picks one.
- No API or schema change is required; default is a UI (and empty-form init) concern.
- Trip destination country is often outside the US, so pre-selecting `US` would be the wrong default.

## Edge Cases

- Edit person/org with `country = "CA"` → stays Canada.
- Edit with address/document `country = null` → UI may show United States until the user changes or clears it.
- User clears the country on a new address/document form → empty is allowed until save validation (if any) applies; do not force-reselect on every keystroke.
- Add trip / edit trip with empty country → Country field remains empty (not `US`).

## Success Criteria

- **SC-001**: Opening Add person, Add organization, and new person-document country-issued controls with empty country shows United States selected.
- **SC-002**: Editing a record with a non-US country still shows that country.
- **SC-003**: Opening Add trip with empty trip country does **not** select United States.
- **SC-004**: Automated tests for the scenarios below pass.

---

## Data Ownership & Isolation

Unchanged.

---

## Key Entities

No new entities. Uses existing `country` / `countryIssued` string fields (ISO-style codes via `resolveCountryCode`).

---

## API Requirements

No API change.

---

## Screen Requirements

| UI | Component | Change |
|----|-----------|--------|
| Shared address block | `AddressFields.vue` | Empty `country` defaults to `US` |
| Person documents | `CountrySelect` for `countryIssued` | Init / default `US` on new document form |
| Add/Edit person, org, donor address | forms using `AddressFields` | Inherit default |
| Add/Edit trip | `CountrySelect` for trip country | **No** default — leave empty |

---

## Data Model Requirements

No schema change.

---

## Acceptance Criteria (Gherkin)

### US-16.1 — New address/document forms start with United States selected

#### Scenario: Address country defaults to United States on Add person
* **Given** I open the Add person dialog with an empty address
* **When** the Country field is shown
* **Then** United States (`US`) is selected

#### Scenario: Trip country does not default on Add trip
* **Given** I open the Add trip dialog with an empty trip country
* **When** the Country field is shown
* **Then** United States (`US`) is **not** selected — the field is empty

#### Scenario: Country issued defaults to United States on new person document
* **Given** I open the form to add a person document with empty country issued
* **When** the Country issued field is shown
* **Then** United States (`US`) is selected

#### Scenario: Existing non-US address country is preserved on edit
* **Given** a person (or org/donor) whose stored country is not `US`
* **When** I open the edit dialog
* **Then** the Country field shows that stored country, not United States

---

## Test Coverage Map

| Story | Scenario | Test file | Test name |
|-------|----------|-----------|-----------|
| US-16.1 | Address country defaults to United States on Add person | `frontend/tests/AddressFields.test.js` | `Address country defaults to United States on Add person` |
| US-16.1 | Trip country does not default on Add trip | `frontend/tests/CountrySelect.test.js` | `Trip country does not default on Add trip` |
| US-16.1 | Country issued defaults to United States on new person document | `frontend/tests/CountrySelect.test.js` | `Country issued defaults to United States on new person document` |
| US-16.1 | Existing non-US address country is preserved on edit | `frontend/tests/AddressFields.test.js` | `Existing non-US address country is preserved on edit` |

---

## Agent implementation request

```text
Implement Feature 16 from @features/feature-16-default-country-united-states.md on branch `feature/16-default-country-united-states`.

Follow layer order in @features/framework.md.
Map every Gherkin scenario in the Test Coverage Map; run `npm test` before finishing.
Update @features/reference/behavior.md in the same PR for the default-country UI rule.
Do not implement behavior not in this spec.
Do not default trip country (FR-008).
Do not change phone country-code fields (FR-007).
Do not change API/schema.
```

**Reference updates:** `features/reference/behavior.md`

---

## Definition of Done

*   [x] Shared address / document country controls default to `US`; trip country does not (**FR-00N**)
*   [x] Automated tests for every Gherkin scenario
*   [x] `npm test` green (frontend coverage for this feature)
*   [x] Living reference updated for the default-country rule

## Out of Scope

- Defaulting phone dialing country codes
- Defaulting trip destination country to United States
- Server-side default on create APIs
- Geolocation-based country detection
- Forcing `US` when the user has cleared the field mid-edit
