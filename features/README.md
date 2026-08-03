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

| ID | File | Branch | Depends on |
|----|------|--------|------------|
| 1 | [feature-1-user-authentication.md](./feature-1-user-authentication.md) | `feature/1-user-authentication` | — |
| 2 | [feature-2-people-and-org-membership.md](./feature-2-people-and-org-membership.md) | `feature/2-people-and-org-membership` | 1 |
| 3 | [feature-3-organizations-and-agreements.md](./feature-3-organizations-and-agreements.md) | `feature/3-organizations-and-agreements` | 1 |
| 4 | [feature-4-document-types-and-person-documents.md](./feature-4-document-types-and-person-documents.md) | `feature/4-document-types-and-person-documents` | 2 |
| 5 | [feature-5-trip-catalog-management.md](./feature-5-trip-catalog-management.md) | `feature/5-trip-catalog-management` | 2, 3 |
| 6 | [feature-6-worker-roles-and-travel-options.md](./feature-6-worker-roles-and-travel-options.md) | `feature/6-worker-roles-and-travel-options` | 4, 5 |
| 7 | [feature-7-trip-applications-and-participants.md](./feature-7-trip-applications-and-participants.md) | `feature/7-trip-applications-and-participants` | 2, 3, 5, 6 |
| 8 | [feature-8-donors-and-donations.md](./feature-8-donors-and-donations.md) | `feature/8-donors-and-donations` | 7 |
| 9 | [feature-9-public-fundraising-pages.md](./feature-9-public-fundraising-pages.md) | `feature/9-public-fundraising-pages` | 5, 7, 8 |
| 10 | [feature-10-email-templates.md](./feature-10-email-templates.md) | `feature/10-email-templates` | 3, 5 |
| 11 | [feature-11-people-list-all-orgs-includes-admin.md](./feature-11-people-list-all-orgs-includes-admin.md) | `feature/11-people-list-all-orgs-includes-admin` | 2 |
| 12 | [feature-12-encrypt-person-media.md](./feature-12-encrypt-person-media.md) | `feature/12-encrypt-person-media` | 2, 4 |

Suggested reading order follows **Depends on** (1 → 2/3 → 4 → 5 → 6 → 7 → 8/9/10 → 11 → 12).

New features: follow [framework.md](./framework.md#feature-spec-template) — **Status**, **Input**, **FR-00N**, **SC-00N**, **Key Entities**, Gherkin, **Agent implementation request**, **Definition of Done**.

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
