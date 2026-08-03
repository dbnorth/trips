# ADR-0003: MySQL relational database

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** Trips project (reverse-documented from imported Mission Trips codebase)

## Context

Trips persists users, sessions, people, organizations, trips, applications, donations, documents, and templates. The domain is **relational**: orgs have trips; people have org roles and trip roles; donations link donors, trips, and participants.

[ADR-0001](./0001-client-server-multi-org-architecture.md) requires a shared server database; [ADR-0002](./0002-layered-security-and-rbac.md) requires joins to role tables for authorization.

We needed to decide engine, ORM, and how schema evolves locally.

## Decision

Use **MySQL** with **Sequelize 6** (`mysql2`) and a **normalized relational schema** defined in `backend/app/models/`.

### Stack

| Layer | Choice |
|-------|--------|
| **Database** | MySQL (XAMPP / native / Docker) |
| **ORM** | Sequelize 6, ES modules |
| **Config** | `db.config.js` + `sequelizeInstance.js`; credentials from `.env` |
| **Default DB name** | `missiontrips` (from imported `.env.example`; renameable) |
| **Test DB** | Separate DB via `backend/.env.test` |

### Schema shape (high level)

```text
user ── session
user ── person ──┬── orgPeopleRole ── organization
               │                  └── role
               ├── tripPeopleRole ── trip ── organization
               │                  └── tripWorkerRole ── workerRole
               ├── personDocument ── documentType
               └── tripDonation ── donor
                                 └── trip
```

See [data-model.md](../../features/reference/data-model.md) and feature **Data Model Requirements**.

### Schema evolution

| Environment | Strategy |
|-------------|----------|
| **Development** | `sequelize.sync` with optional `{ alter: true }` when `SEQUELIZE_SYNC_ALTER` is set; `ensureSchema()` for incremental fixes |
| **Production** | Prefer sync without alter; treat model files + ensure scripts as source of truth until formal migrations are adopted |
| **Tests** | Skip listen/sync on import when `NODE_ENV=test`; use dedicated test DB when writing integration suites |

### Query patterns

- Associations registered in `models/index.js`.
- Authorization filters applied in controllers via accessControl helpers.
- `User.unscoped()` only when comparing passwords.
- Many mutable entities carry a **`version`** column ([ADR-0005](./0005-optimistic-concurrency.md)).

### Files on disk (not only DB)

Uploaded images, documents, and agreement markdown live under `backend/images`, `backend/documents`, `backend/agreements` (paths served under `/trips/images` and related routes). Metadata (filenames) is stored in MySQL.

## Consequences

### Positive

- Natural FKs for org → trip → participant → donation.
- MySQL fits XAMPP local workflows.
- Sequelize models map cleanly to SDD data-model sections.
- Separate test database protects developer data.

### Negative / tradeoffs

- MySQL required — not zero-install.
- `alter: true` is unsafe for careless production use.
- File blobs on disk need backup/deploy discipline alongside the DB.
- No formal migration tool in the imported tree yet.

## Alternatives considered

| Option | Why not |
|--------|---------|
| **SQLite** | Weaker multi-writer story; less aligned with shared MySQL deploys. |
| **PostgreSQL** | Fine production choice; imported code and Speckit default to MySQL. |
| **Document DB** | Poor fit for role joins and donation reporting. |
| **Store files only in DB BLOBs** | Not what the code does; disk + filename metadata is simpler for multer. |
| **Prisma** | Viable; Sequelize is what the codebase uses. |

## Related artifacts

- ADRs: [ADR-0001](./0001-client-server-multi-org-architecture.md), [ADR-0005](./0005-optimistic-concurrency.md)
- Reference: [data-model.md](../../features/reference/data-model.md)
- Config: `backend/app/config/db.config.js`, `backend/.env.example`
- Models: `backend/app/models/`
- Scripts: `backend/app/scripts/ensureSchema.js`, `seedRoles.js`
