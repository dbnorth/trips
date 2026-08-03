# Quality attributes

App-wide non-functional targets for the **Trips** product (multi-organization mission-trip platform).

**Teaching policy:** Specs say *what* to build. This table says *how good* the system should be. Only **Accepted** rows (and feature **Requirements (FR-00N)** / **Success Criteria (SC-00N)**) constrain implementation. **Deferred** is the quality backlog / example. **Out of scope** is what not to build. See [`.cursor/rules/quality-attributes.mdc`](../../.cursor/rules/quality-attributes.mdc).

**Context:** Reverse-documented from the imported application + [ADRs](../adr/README.md). Scenario automation is still backfilling; **Accepted** rows must not regress in code even while Test Coverage Maps catch up.

## Column meanings

| Column | Meaning |
|--------|---------|
| **Target** | Measure or bar — prefer a **number**. Illustrative until Status is **Accepted** and tests enforce it. |
| **Approach** | How the target is realized or limited |
| **Status** | **Accepted** / **Accepted (minimal)** / **Deferred** / **Out of scope** (see below) |
| **Links** | ADR (why), Cursor rule (how), code path, or **—** |

## Status values

| Status | Meaning |
|--------|---------|
| **Accepted** | In force — do not regress |
| **Accepted (minimal)** | Thin bar in force — do not expand |
| **Deferred** | Documented example — not a coding requirement unless a feature spec says so |
| **Out of scope** | Do not invent |

## Links column

| Link type | When |
|-----------|------|
| ADR | Approach decision |
| Cursor rule | Day-to-day agent/code constraint |
| Code path | Concrete implementation |
| **—** | No artifact yet |

## Attribute table

| Attribute | Target | Approach | How we verify | Status | Links |
|-----------|--------|----------|---------------|--------|-------|
| **Security** | **100%** of non-public APIs require a valid session (or documented public exception); passwords stored as bcrypt only (**0** plaintext); org/trip actions denied when RBAC fails; system-admin acting org via header only | Email/password; JWT + Session (**4 h**); `accessControl.js` org/trip/system gates; public surface limited to `/trips/public/*` | Auth/RBAC Jest as Test Coverage Maps backfill; manual curl without token → `401`; Feature 1–2, 7, 9 scenarios | Accepted | [ADR-0002](../adr/0002-layered-security-and-rbac.md), [ADR-0004](../adr/0004-public-and-authenticated-surfaces.md), [security.mdc](../../.cursor/rules/security.mdc), [auth-patterns.mdc](../../.cursor/rules/auth-patterns.mdc), [feature-1](../../features/feature-1-user-authentication.md) |
| **Data integrity** | **100%** of trips belong to an org; donations reference trip + donor (+ participant when set); concurrent edits with stale `version` → **409** (no silent overwrite when version sent) | MySQL FKs / Sequelize associations; `optimisticUpdate` on versioned entities | Model associations; conflict scenarios in Features 2/3/5/7/8; [data-model](../../features/reference/data-model.md) | Accepted | [ADR-0003](../adr/0003-mysql-relational-database.md), [ADR-0005](../adr/0005-optimistic-concurrency.md) |
| **Privacy** | **0** password hashes in API JSON; person documents and agreements only via authorized person/org access (or documented public fields) | User `defaultScope` excludes password; document routes use person access gates; public pages expose only published/approved fields | Auth payload inspection; Feature 4 / 9 access scenarios | Accepted (minimal) | [ADR-0002](../adr/0002-layered-security-and-rbac.md), [feature-4](../../features/feature-4-document-types-and-person-documents.md), [feature-9](../../features/feature-9-public-fundraising-pages.md) |
| **Reliability** | Happy-path writes (register, apply, record donation) return success or explicit **4xx/5xx** with `{ message }` — never empty **200** on failure | Single-process Express; validate inputs; fail closed on auth errors | Feature API tests as backfilled | Deferred | — |
| **Availability** | Local/demo usable for a work session when MySQL + API + SPA are up; **no** multi-region or HA SLA | Single-node Node + MySQL (e.g. XAMPP) | Manual smoke | Out of scope | [ADR-0001](../adr/0001-client-server-multi-org-architecture.md) |
| **Performance** | Common authenticated API p95 **&lt; 500 ms** on local stack; primary screens interactive **&lt; 3 s** on a typical laptop | Straightforward Sequelize queries; no caching platform unless a feature requires it | Manual timing / optional later load tests | Deferred | — |
| **Scalability** | Correct for a **single org deployment** scale (tens of concurrent staff/applicants; hundreds of participants per trip) without horizontal scale redesign | Multi-org correctness in one DB, not cluster scale-out | Role/scope tests; manual multi-role check | Out of scope | [ADR-0001](../adr/0001-client-server-multi-org-architecture.md) |
| **Observability** | **100%** of unhandled server errors logged at `error`; HTTP access via morgan→Winston; rotating files under `backend/logs/` | Winston + daily rotate; morgan stream | Spot-check logs on forced errors / local runs | Accepted (minimal) | `backend/app/config/logger.js` |
| **Usability** | New applicant: public trip → create account → open apply in **≤ 5 minutes**; staff: **≤ 2** clicks from Home to open an owned/led trip once signed in | Role-aware Home + MenuBar; apply funnel; Vuetify forms | Manual walkthrough; Feature 1/7/9 Screen Requirements | Deferred | [ui-style-system.mdc](../../.cursor/rules/ui-style-system.mdc), [feature-7](../../features/feature-7-trip-applications-and-participants.md), [feature-9](../../features/feature-9-public-fundraising-pages.md) |
| **Accessibility (a11y)** | Primary flows (login, apply, donate form) keyboard-reachable; aim **WCAG 2.2 AA** when audited; **0** unlabeled icon-only primary CTAs on those flows | Prefer Vuetify semantic components; no dedicated a11y CI gate yet | Manual / optional later | Deferred | [ui-style-system.mdc](../../.cursor/rules/ui-style-system.mdc) |
| **Internationalization (i18n)** | **1** locale (English UI strings) | No i18n framework; country/phone data may list many countries without translating the app chrome | N/A | Out of scope | — |
| **Payments / PCI** | **0** card-number storage or payment-gateway integration in this app | Donations record amount/paymentInfo text for staff/public forms — **not** a card processor | N/A | Out of scope | [feature-8](../../features/feature-8-donors-and-donations.md), [feature-9](../../features/feature-9-public-fundraising-pages.md) |
| **Maintainability** | **100%** Gherkin scenarios mapped in Test Coverage Map before merge of new work; `npm test` green; product changes authorized by `features/feature-*.md` | Speckit SDD + Cursor rules; living reference updated with API/schema/rule changes | Merge checklist; `npm test` | Accepted | [framework.md](../../features/framework.md), [constitution.mdc](../../.cursor/rules/constitution.mdc), [quality-attributes.mdc](../../.cursor/rules/quality-attributes.mdc) |

---

## Feature-local NFRs

If only one feature needs a bar:

1. Put it in that feature’s **Requirements (FR-00N)** or **Success Criteria (SC-00N)**.
2. Add Gherkin when tests must prove it.
3. Optionally link from a row here (“see Feature N **FR-00N** / **SC-00N**”).

Examples: application completeness rules (Feature 7), upload size limits (Features 2/4/5), slug matching (Feature 9).

See [feature spec template](../../features/framework.md#feature-spec-template).

---

## Changing a bar

1. Edit **Target**, **Approach**, **Status**, **Links**. Prefer a number in **Target**.
2. **Approach** change → [ADR](../adr/README.md); add to **Links**.
3. Agent coding constraint → `.cursor/rules/`; add to **Links**.
4. API/schema change → `features/reference/` in the same feature PR ([Agent implementation request](../../features/framework.md#agent-implementation-request)).
5. **Deferred** → **Accepted** only with matching verification.
