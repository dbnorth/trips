# ADR-0005: Optimistic concurrency with version columns

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** Trips project (reverse-documented from imported Mission Trips codebase)

## Context

Multiple staff (and the applicant) may edit the same person, organization, trip, or application. Last-write-wins without detection can silently overwrite another user’s changes (roster status, agreement fields, costs).

We needed a simple concurrency control that fits Sequelize updates and the existing Vue forms without introducing a full CRDT or row-lock protocol for every request.

## Decision

Use **optimistic concurrency** via integer **`version`** columns on mutable domain entities, updated through `backend/app/utils/optimisticUpdate.js`.

### Mechanism

1. Client reads entity including `version`.
2. Client submits updates with the same `version`.
3. Server compares to current row:
   - Match → apply allowed fields, increment `version`.
   - Mismatch → **`409`** with message to refresh and retry.
4. Frontend helpers (`useVersionConflictForm`, `versionConflict.js`) surface conflicts in dialogs.

### Typical entities

Person, organization, trip, tripPeopleRole, donor, tripDonation, and other models that declare `version` in Sequelize definitions.

## Consequences

### Positive

- Prevents silent overwrites under concurrent staff edits.
- Simple to test (stale version → 409).
- Works with REST PUT payloads already used by the SPA.

### Negative / tradeoffs

- Clients must round-trip `version`; forgetting it can skip the check when `version` is omitted (helper only conflicts when client sends a version).
- Not a substitute for authorization — still combine with [ADR-0002](./0002-layered-security-and-rbac.md).
- High-contention workflows may annoy users with refresh prompts.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Last-write-wins** | Data loss under concurrent edits. |
| **Pessimistic DB row locks** | Heavier; poor fit for SPA request/response. |
| **Event sourcing** | Far beyond current product needs. |
| **ETags / If-Match only** | Possible; codebase standardized on `version` field instead. |

## Related artifacts

- ADRs: [ADR-0002](./0002-layered-security-and-rbac.md), [ADR-0003](./0003-mysql-relational-database.md)
- Features: [Feature 2](../../features/feature-2-people-and-org-membership.md), [Feature 3](../../features/feature-3-organizations-and-agreements.md), [Feature 5](../../features/feature-5-trip-catalog-management.md), [Feature 7](../../features/feature-7-trip-applications-and-participants.md)
- Implementation: `backend/app/utils/optimisticUpdate.js`, `frontend/src/utils/versionConflict.js`, `useVersionConflictForm.js`
- Reference: [behavior.md](../../features/reference/behavior.md)
