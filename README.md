# Trips

Spec-Driven Development (SDD) application for **Trips**.

Specifications define *what* to build (`features/`). Cursor rules define *how* (`.cursor/rules/`). Tests verify both.

This repository was generated from the Speckit starter kit and renamed for Trips. Add `features/feature-1-….md` before writing application code.

**Docs:** [features/framework.md](features/framework.md) · [features/README.md](features/README.md) · [docs/adr/README.md](docs/adr/README.md) · [docs/nfr/quality-attributes.md](docs/nfr/quality-attributes.md) · [docs/STARTER-KIT.md](docs/STARTER-KIT.md)

Architecture decisions (Accepted): [ADR-0001](docs/adr/0001-client-server-multi-org-architecture.md) (client–server) · [ADR-0002](docs/adr/0002-layered-security-and-rbac.md) (RBAC) · [ADR-0003](docs/adr/0003-mysql-relational-database.md) (MySQL) · [ADR-0004](docs/adr/0004-public-and-authenticated-surfaces.md) (public vs auth) · [ADR-0005](docs/adr/0005-optimistic-concurrency.md) (versioning)

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vuetify 4, Vite, vue-router, axios |
| Backend | Node.js (ES modules), Express, Sequelize, MySQL |
| Tests | Jest + supertest (backend), Vitest + `@vue/test-utils` (frontend) |

Default ports: frontend `8082`, backend `3200`. API mount: `/trips`.

---

## Getting started

```bash
npm install --prefix frontend
npm install --prefix backend
npm install

# macOS / Linux / Git Bash:
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
# Windows PowerShell / cmd:
#   copy backend\.env.example backend\.env
#   copy backend\.env.test.example backend\.env.test
# Create MySQL databases (trips-db / trips-db-test); set DB_* and AUTH_SECRET

npm test
cd backend && npm run dev
cd frontend && npm run dev
```

Works on **macOS, Windows, and Linux** — use `npm run …` for all tooling (PDF, Agility, bundles).

## Branching

| Branch | Purpose |
|--------|---------|
| `main` | Scaffold only — no feature implementation |
| `dev` | Integration |
| `feature/N-*` | One feature at a time |

```bash
git checkout -b dev
git checkout -b feature/1-short-name
```

## Features (reverse-spec of imported app)

| ID | Capability |
|----|------------|
| 1 | User authentication & sessions |
| 2 | People & org membership |
| 3 | Organizations & agreements |
| 4 | Document types & person documents |
| 5 | Trip catalog management |
| 6 | Worker roles & travel options |
| 7 | Trip applications & participants |
| 8 | Donors & donations |
| 9 | Public fundraising pages |
| 10 | Email templates |

Full table and branch names: [features/README.md](features/README.md).

## Next steps

1. Backfill automated tests mapped in each feature’s **Test Coverage Map**.
2. Prefer a new feature delta (or revise a Shipped spec carefully) when changing product behavior.
3. Keep `features/reference/*` updated in the same PR as API/schema/rule changes.
