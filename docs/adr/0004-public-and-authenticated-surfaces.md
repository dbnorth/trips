# ADR-0004: Public and authenticated application surfaces

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** Trips project (reverse-documented from imported Mission Trips codebase)

## Context

Trips has two audiences:

1. **Signed-in operators and applicants** — home, people, trips, applications, donations admin, templates.
2. **Anonymous visitors** — organization marketing pages, trip overviews, participant fundraising pages, and public donation submit.

If public pages reused authenticated staff APIs, every visitor would need an account, or staff endpoints would have to be left open. If all fundraising required login, donation conversion would drop.

## Decision

Expose **two explicit surfaces** on the same Express app and Vue SPA:

| Surface | API | UI | Auth |
|---------|-----|----|------|
| **Authenticated app** | `/trips/*` (non-public routers) | `/home`, `/trips`, `/people`, … | Bearer session required |
| **Public fundraising / marketing** | `/trips/public/*` | `/org/:slug`, `/trip/:slug`, `/donate/...`, apply funnel entry | No Bearer; limited write: `POST /public/donations` |

### Rules

1. **Public GET** returns only data intended for publication (e.g. active trips, approved participants) as implemented in public controllers.
2. **Public POST** is limited to donation creation (creates/updates donor + donation) — not roster or org admin mutations.
3. **Apply CTA** from public pages routes into authenticated apply (`/apply/sign-in`, `/apply/create-account` → browse/apply) — Feature 1 + 7.
4. **MenuBar hidden** on public/donate routes so marketing pages stay chrome-light (`App.vue`).
5. Slug matching treats spaces as `_` for shareable URLs.

```text
Visitor ──► Public Vue routes ──► /trips/public/* ──► MySQL (filtered reads / donation write)
Applicant ──► Apply auth ──► Bearer ──► /trips/trips/browse/* …
Staff ──► App routes ──► Bearer + RBAC ──► /trips/organizations, /trips/trips, …
```

## Consequences

### Positive

- Clear security boundary: unauthenticated code paths are named `/public`.
- Shareable donate URLs without forcing accounts.
- One deployable frontend/backend pair.

### Negative / tradeoffs

- Public donation endpoint is a write surface that must stay tightly validated.
- Slug collisions / rename edge cases need careful handling.
- Duplicated trip “shape” between public and authenticated serializers.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **Require login for all donations** | Rejects anonymous donor UX the product implements. |
| **Separate public static site + different API host** | Extra deploy; current code colocates surfaces. |
| **Open staff donation APIs without auth** | Unsafe; not implemented. |
| **Magic-link only public access** | Not present in codebase. |

## Related artifacts

- ADRs: [ADR-0001](./0001-client-server-multi-org-architecture.md), [ADR-0002](./0002-layered-security-and-rbac.md)
- Features: [Feature 9](../../features/feature-9-public-fundraising-pages.md), [Feature 1](../../features/feature-1-user-authentication.md), [Feature 8](../../features/feature-8-donors-and-donations.md)
- Implementation: `backend/app/routes/public.routes.js`, `frontend/src/services/publicServices.js`, public views under `frontend/src/views/`
