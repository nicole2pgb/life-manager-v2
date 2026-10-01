# Proposal

## Why

Every MVP feature in `docs/backlog.md` (authentication, tasks, recurrence, dashboard, weekly overview, progress, settings) needs persisted data. `docs/tech-stack.md` and `docs/data-model.md` set MySQL and Drizzle ORM as the persistence layer, but the project is still a bare `create-next-app` scaffold with no database dependencies, connection, schema or migrations. Backlog item "1. Project Foundation" has to be finished before any feature work can start.

## What Changes

- Add the database dependencies: Drizzle ORM, the `mysql2` driver, `drizzle-kit` for migrations, and `@next/env` so tooling outside the Next.js runtime reads the same `.env*` files.
- Add a server-only database connection module that reads its configuration from environment variables, never from hard-coded values, and cannot be imported into Client Components.
- Add a committed `.env.example` that lists the required variables with placeholder values only. Real credentials stay in the git-ignored `.env.local`.
- Define the initial Drizzle schema for the MVP data model in `docs/data-model.md`: `users`, `user_settings`, `tasks`, `recurrence_rules`, `task_completions`.
- Enforce the documented rules in the schema: unique email, password hash only, every user-owned row tied to a user, cascading deletes from task to recurrence rule and completions, and one completion per task per date.
- Add a `drizzle.config.ts` and npm scripts to generate, apply and inspect migrations, then generate and commit the initial SQL migration.
- Out of scope: application features, server actions, data-access functions beyond the connection, authentication and session logic, and UI.

## Capabilities

### New Capabilities
- `database-foundation`: MySQL connection configuration, the MVP persistence schema and its integrity rules, and the migration workflow that every later feature builds on.

### Modified Capabilities
<!-- None: openspec/specs/ is empty; this is the project's first capability. -->

## Impact

- **Dependencies**: adds `drizzle-orm`, `mysql2`, `server-only` and `@next/env` (runtime), and `drizzle-kit` (dev).
- **New files**: `db/index.ts` (connection), `db/schema.ts` (tables), `drizzle.config.ts`, `drizzle/` (generated migrations), `.env.example`.
- **Modified files**: `package.json` (dependencies and `db:*` scripts), `.gitignore` (add an exception so `.env.example` is committed, because `.env*` is currently ignored).
- **Local environment**: each developer needs a local MySQL 8 server and database. Credentials are set by the developer in `.env.local` and are never committed.
- **Later changes**: authentication will add its own session storage table. Task, recurrence, progress and settings features will build data-access functions on top of this schema.
