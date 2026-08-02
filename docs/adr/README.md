# Architecture Decision Records (ADRs)

Durable **why** decisions for cross-cutting concerns that outlive any single feature spec.

| Artifact | Question |
|----------|----------|
| [Constitution](../../.cursor/rules/constitution.mdc) | What are the non-negotiable laws? |
| [Cursor rules](../../.cursor/rules/) | How must we implement (patterns)? |
| **ADRs** (`docs/adr/`) | Why did we choose this approach? |
| [Feature specs](../../features/) | What must the product do? |
| [Quality attributes](../nfr/README.md) | What app-wide NFR / ility bars apply? |
| [Reference](../../features/reference/) | What exists on `dev` now? |

ADRs do **not** replace feature specs or Cursor rules.

**Student guide:** [writing-adrs.md](./writing-adrs.md) — when to write an ADR, naming, section principles, and checklist.

---

## When to write an ADR

| Situation | Write an ADR? |
|-----------|---------------|
| New product behavior for one feature | No — use `features/feature-N-*.md` |
| Ongoing coding pattern for the team | No — use `.cursor/rules/*.mdc` |
| Significant stack or architecture choice | **Yes** |
| Security or data-isolation model | **Yes** |

---

## File naming

```
docs/adr/
  README.md
  NNNN-short-kebab-title.md
```

- **Number:** four digits, sequential (`0001`, `0002`, …). Never reuse a retired number.
- **Status:** `Proposed` | `Accepted` | `Deprecated` | `Superseded by ADR-NNNN`

---

## Template

```markdown
# ADR-NNNN: Short title

**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR-XXXX](XXXX-title.md)
**Date:** YYYY-MM-DD
**Deciders:** team / role names

## Context

What problem or constraint forced a decision?

## Decision

What we chose, in one or two sentences.

## Consequences

### Positive
- …

### Negative / tradeoffs
- …

## Alternatives considered

| Option | Why not |
|--------|---------|
| … | … |

## Related artifacts

- Feature specs: …
- Cursor rules: …
```

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./0001-client-server-multi-org-architecture.md) | Client–server architecture for multi-organization Trips | Accepted |
| [0002](./0002-layered-security-and-rbac.md) | Layered security and org/trip RBAC | Accepted |
| [0003](./0003-mysql-relational-database.md) | MySQL relational database | Accepted |
| [0004](./0004-public-and-authenticated-surfaces.md) | Public and authenticated application surfaces | Accepted |
| [0005](./0005-optimistic-concurrency.md) | Optimistic concurrency with version columns | Accepted |
