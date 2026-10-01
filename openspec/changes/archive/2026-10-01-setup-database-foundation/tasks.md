# Tasks

## 1. Dependencies and environment

- [x] 1.1 Install `drizzle-orm`, `mysql2`, `server-only`, `@next/env` (runtime) and `drizzle-kit` (dev); verify `npm ls drizzle-orm drizzle-kit mysql2 server-only @next/env` lists them and `package.json`/lockfile are updated
- [x] 1.2 Add `.env.example` with a placeholder-only `DATABASE_URL` and a comment to copy it to `.env.local`; add `!.env.example` to `.gitignore`; verify `git status` shows `.env.example` as trackable and `git check-ignore .env.local` still ignores the real file
- [x] 1.3 Add a local-setup section to `README.md` (install MySQL 8+, create an empty database and user, copy `.env.example` to `.env.local`, run `npm run db:migrate`); verify each documented step is accurate when followed on this machine

## 2. Schema

- [x] 2.1 Create `db/schema.ts` with `users` and `user_settings` (unique case-insensitive email, password hash only, settings defaults Pink / Monday / check-in off / 09:00, life areas default all six); verify with `npx tsc --noEmit`
- [x] 2.2 Add `tasks`, `recurrence_rules` and `task_completions` to `db/schema.ts` (life-area enum, one rule per task, unique `(task_id, completed_on)`, `DATE` completion column, cascade foreign keys, checks for the weekly target range and rule-type consistency); verify with `npx tsc --noEmit`
- [x] 2.3 Export the enum value lists (life areas, theme colors, week starts, recurrence types) and inferred row types from `db/schema.ts`; verify a scratch type-check import compiles and no unused exports are left in

## 3. Connection

- [x] 3.1 Create `db/index.ts` (server-only import, lazy `mysql2` pool from `DATABASE_URL`, UTC timezone, pool cached on `globalThis` in development, clear error naming the variable when unset and never printing its value); verify `npx tsc --noEmit` and `npm run lint` pass
- [x] 3.2 Verify the server-only guard by temporarily importing `@/db` from a `"use client"` file and confirming `npm run build` fails, then remove the temporary file
- [x] 3.3 Verify `npm run build` succeeds with no `DATABASE_URL` set (lazy connection)

## 4. Migrations

- [x] 4.1 Create `drizzle.config.ts` (MySQL dialect, `db/schema.ts`, output `drizzle/`, `loadEnvConfig` from `@next/env`, credentials from `DATABASE_URL`) and add `db:generate`, `db:migrate` and `db:studio` scripts to `package.json`; verify `npm run db:generate` starts and reports a clear error when `DATABASE_URL` is missing where one is needed
- [x] 4.2 Generate the initial migration with `npm run db:generate`; read the SQL and confirm it contains all five tables, ENUM columns, the unique keys, the cascade foreign keys and the `CHECK` constraints (hand-fix the schema or migration if drizzle-kit omitted any); verify by attaching the reviewed `drizzle/*.sql` file
- [x] 4.3 Create a scratch local database with credentials the developer supplies, run `npm run db:migrate`, and verify with `SHOW CREATE TABLE` that the tables match the design; run it a second time and verify nothing changes
- [x] 4.4 Run `npm run db:generate` again and verify it reports no changes (schema and migrations in sync)

## 5. Integrity checks

- [x] 5.1 Against the scratch database, run manual SQL to verify each rejection scenario in the spec fails as expected: duplicate email in different case, task with unknown user, completion with unknown task, invalid life area, second recurrence rule for one task, weekly target 0 and 8, duplicate completion for the same task and date, second settings row for one user
- [x] 5.2 Verify cascades in the scratch database: deleting a task removes its rule and completions, and deleting a user removes settings, tasks, rules and completions; verify a `DATE` completion reads back unchanged with the session time zone set to a different offset
- [x] 5.3 Run `npm run lint` and `npm run build`; verify both pass, that no credentials appear in `git diff` or in any tracked file, and that `git status` shows only the intended files (`package.json`, lockfile, `.gitignore`, `.env.example`, `README.md`, `db/`, `drizzle/`, `drizzle.config.ts`)
