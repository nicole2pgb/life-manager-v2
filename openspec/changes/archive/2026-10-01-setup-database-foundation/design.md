# Design

## Context

The repo is a bare `create-next-app` scaffold (Next.js 16.3.7, App Router, TypeScript, Tailwind, path alias `@/*` → repo root, no `src/`). There is no database code yet. See `proposal.md` for motivation.

Constraints from `docs/`:
- MySQL + Drizzle ORM; UI must never touch the database (`UI → Server Logic → Data Access → MySQL`).
- Every user-owned row is tied to a user; deleting a task must safely remove its recurrence and completions.
- Progress is calculated, not stored.
- Local MySQL only during MVP; no deployment or hosting decisions.
- `.gitignore` ignores `.env*`; Next.js loads `.env.local` itself, but tools outside the Next runtime (drizzle-kit) do not. The bundled Next.js docs recommend `@next/env`'s `loadEnvConfig` for that case.
- A MySQL 9.7 client is installed on the dev machine. Docker is not, so the plan assumes a locally installed MySQL server.

## Goals / Non-Goals

**Goals:**
- One connection module, one schema file and a reproducible migration workflow.
- Constraints in the database (unique, foreign keys, checks) so data integrity does not depend on application code being correct.
- Nothing invented: no credentials, no seed users.

**Non-Goals:**
- Data-access functions, server actions, auth/session tables and password hashing. These belong to later changes.
- Seed data, test database setup, production hosting or connection pooling tuning.
- Any UI, route or Next.js page change.

## Decisions

### 1. Driver and layout: `mysql2` pool, files under `db/`
Use Drizzle's `mysql2` driver with a `mysql2/promise` connection pool created from a single `DATABASE_URL`. Files: `db/index.ts` (client), `db/schema.ts` (all tables), `drizzle.config.ts` (root), `drizzle/` (generated migrations).

- *Why a single `DATABASE_URL`*: one variable is simpler to document and validate than host/port/user/password/name, and drizzle-kit accepts it directly. Format documented in `.env.example` with placeholders only.
- *Why `db/` at the root, not `src/db`*: the project has no `src/` and `@/*` maps to the root, so `@/db` works with no config changes.
- *Why one schema file*: five tables; splitting is an abstraction the MVP does not need (`architecture.md`).
- *Alternative*: `drizzle-orm/mysql2` with separate env vars, or PlanetScale/other drivers. Rejected: more configuration, no benefit for local MySQL.
- The pool is cached on `globalThis` in development so Next.js hot reloading does not open a new pool on every reload.

### 2. Server-only guard
`db/index.ts` imports `server-only` so any Client Component import fails at build time. This enforces the architecture rule mechanically. `drizzle.config.ts` and migration scripts do not import `db/index.ts`, so they are not affected by the guard.

The missing-`DATABASE_URL` check runs when the pool is first created, not at module import, so `next build` does not fail on machines without a database. The error names the variable only.

### 3. Environment loading
- `.env.example` (committed) holds `DATABASE_URL=mysql://<user>:<password>@localhost:3306/<database>` as a placeholder, with a comment to copy it to `.env.local`.
- `.gitignore` gets `!.env.example` so it can be tracked while `.env*` stays ignored.
- `drizzle.config.ts` calls `loadEnvConfig(process.cwd())` from `@next/env` so drizzle-kit reads `.env.local` exactly as Next.js does, with no second env mechanism such as `dotenv`.

### 4. Table design
All tables use `snake_case` names, and columns are mapped from camelCase in TypeScript.

| Table | Key columns | Integrity |
|---|---|---|
| `users` | `id` bigint unsigned auto-increment PK, `name`, `email`, `password_hash`, `created_at` | unique index on `email`; the column uses a case-insensitive collation (`utf8mb4_0900_ai_ci`, the MySQL 8 default) so `A@x.com` and `a@x.com` collide |
| `user_settings` | `user_id` PK + FK → `users` (cascade), `theme_color`, `week_start`, `daily_check_in_enabled`, `daily_check_in_time`, `life_areas` | one row per user by primary key |
| `tasks` | `id` PK, `user_id` FK → `users` (cascade), `title`, `notes` nullable text, `life_area`, `created_at`, `updated_at` | index on `user_id` |
| `recurrence_rules` | `task_id` PK + FK → `tasks` (cascade), `type`, `weekdays`, `times_per_week` | one rule per task by primary key |
| `task_completions` | `id` PK, `task_id` FK → `tasks` (cascade), `completed_on` DATE, `created_at` | unique `(task_id, completed_on)`; the index also serves lookups by task |

Choices:
- **Auto-increment integer IDs**, not UUIDs. Simple, smallest index, and enough for a single-database MVP. IDs are internal, not exposed as URLs in this change. *Alternative*: UUID/ULID, rejected as unneeded complexity now; it can be revisited if public IDs are ever needed.
- **Enums as MySQL `ENUM` columns** (`mysqlEnum`) for `life_area`, `theme_color`, `week_start` and recurrence `type`. This gives database-level validation for closed sets defined in `docs/data-model.md`. The TypeScript value lists are exported from the schema file and reused as types, so later validation code shares one source.
- **`recurrence_rules` as a separate table keyed by `task_id`**, matching the documented "Recurrence Rule" concept. A one-time task has a rule of type `none`, so every task has exactly one rule and later code never has to branch on a missing row.
- **Weekdays stored as a JSON array** of weekday numbers (ISO 1–7, Monday = 1) in `weekdays`, nullable and used only for `weekdays` type. *Alternative*: a `recurrence_weekdays` child table, or a 7-bit mask. Rejected: a child table adds a table and joins for at most 7 values, and a bitmask is hard to read in the database. JSON keeps the row self-contained; validation of contents happens in the application layer, plus a `CHECK` that the column is set only for the weekdays type.
- **`times_per_week`** is a small unsigned int, nullable, with `CHECK (times_per_week BETWEEN 1 AND 7)` when set, and a `CHECK` tying it to the `times_per_week` type. MySQL 8.0.16+ enforces `CHECK`; the project targets MySQL 8.
- **Selected life areas** in `user_settings.life_areas` are a JSON array of life-area strings. The set is small and closed, only ever read and written together with the settings row, and never queried by element. Default is all six areas. Validation against the allowed values is done in the application layer.
- **`completed_on` is a `DATE`** (no time, no time zone), so the calendar date a user completes something on never shifts with server or DB time zone. Which calendar date counts as "today" is decided by the server logic in later changes. `created_at`/`updated_at` are `TIMESTAMP`/`DATETIME` with `DEFAULT CURRENT_TIMESTAMP` (and `ON UPDATE CURRENT_TIMESTAMP` for `updated_at`), stored in UTC via the connection's `timezone: 'Z'` setting.
- **`daily_check_in_time`** is a `TIME` column, nullable, default `09:00:00`. Confirmed defaults for the settings: `theme_color` = Pink (per `ui-guidelines.md`), `week_start` = Monday, `daily_check_in_enabled` = false (off), `daily_check_in_time` = 09:00.
- **Cascade deletes at the database level** (`ON DELETE CASCADE`) implement "handle its associated recurrence and completion data safely" with one delete statement and no orphans, without depending on application code.
- **No stored progress**: nothing for streaks, rates or per-area totals (`data-model.md`: progress is calculated).
- **No session table here**. `docs/tech-stack.md` says custom session auth; the session table is designed together with login/registration in the Authentication change, so it is not guessed at now.

### 5. Migrations: `drizzle-kit generate` + `migrate`, committed SQL
npm scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), `db:studio` (`drizzle-kit studio`). The generated SQL and its `meta/` journal under `drizzle/` are committed.

- *Why not `drizzle-kit push`*: `push` changes the schema without a migration history. The backlog requires an initial migration, and versioned files keep every developer's database reproducible. `push` is intentionally not exposed as a script.
- The initial migration is generated from the schema and reviewed by reading the SQL before it is applied.

### 6. Versions
`drizzle-orm` ^0.45 and `drizzle-kit` ^0.31 (latest stable at planning time; the `1.0.0-beta` tags are ignored), `mysql2` ^3, `server-only`, `@next/env` matching Next (16.3.7). The APIs used by the Drizzle docs that ship with these versions should be checked at implementation time, since the schema helpers changed between minor releases.

## Risks / Trade-offs

- **[JSON columns for weekdays/life areas are not validated by the database]** → Validate with a shared list of allowed values in the application layer when those features are built; add `CHECK (JSON_VALID(...))`-style checks only if drizzle-kit generates them cleanly.
- **[Drizzle/drizzle-kit MySQL `CHECK`, `ENUM` and JSON default support may differ from what is assumed here]** → Generate the migration, read the SQL, and adjust the schema (e.g. hand-add a check in the migration) before applying it. The tasks include this review step.
- **[Case-insensitive uniqueness depends on the database default collation]** → Set the collation explicitly on the `email` column rather than relying on the server default, and normalise email to lower case in the auth change as a second layer.
- **[Auto-increment IDs are guessable]** → Acceptable because every query must be scoped by the authenticated user (`architecture.md`); that is enforced in the data-access layer of later changes, not by ID secrecy.
- **[Developer must install and start MySQL themselves]** → Documented in the README setup steps; no Docker/compose file is added because nothing in the docs asks for it and Docker is not installed here.
- **[`next build` on a machine without a database]** → The connection is created lazily, so build does not need a database.

## Migration Plan

1. Developer installs/starts a local MySQL 8+ server and creates an empty database and a user of their choice (outside the repo).
2. Copy `.env.example` to `.env.local` and fill in their own `DATABASE_URL`.
3. Run `npm run db:migrate` to create the schema.
4. Rollback: this is the first migration, so rolling back means dropping the local database (or its tables) and re-running `db:migrate`. There is no production data.

## Open Questions

- Whether to store the `email` lower-cased at write time: to be decided in the Authentication change.
