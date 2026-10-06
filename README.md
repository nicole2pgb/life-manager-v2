# Life Manager

Web app for managing tasks and checking weekly progress: manage tasks → complete today's tasks → check weekly progress. Built with Next.js, React, TypeScript, Tailwind, MySQL and Drizzle, with custom session authentication. Product and architecture docs live in `docs/`; feature specs in `openspec/`.

## Local Database Setup

Life Manager stores its data in MySQL (8.0.16 or newer, for `CHECK` constraint support) via Drizzle ORM.

1. Install and start a local MySQL server.
2. Create an empty database and a user with access to it (choose your own names and password), for example:

   ```sql
   CREATE DATABASE life_manager CHARACTER SET utf8mb4;
   ```

3. Copy the template and fill in your own values. `.env.local` is git-ignored; never commit real credentials:

   ```bash
   cp .env.example .env.local
   ```

   ```
   DATABASE_URL=mysql://<user>:<password>@localhost:3306/<database>
   ```

4. Apply the migrations:

   ```bash
   npm run db:migrate
   ```

Other scripts: `npm run db:generate` creates a new migration after editing `db/schema.ts`; `npm run db:studio` opens Drizzle Studio.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) after the database setup above. Before a change is complete, `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build` must pass.

## Deployment & Monitoring

The app runs on Vercel with a Railway MySQL database (see `docs/tech-stack.md`). Required production environment variable: `DATABASE_URL` (optional: `APP_TIME_ZONE`). Apply migrations manually with `npm run db:migrate` against the production database.

- **Health check:** `GET /api/health` is public and returns `{"status":"ok","database":"up",...}` with HTTP 200, or HTTP 503 with `"database":"down"` when MySQL is unreachable. Point an uptime monitor at it.
- **CI:** every pull request to `main` runs `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build` in GitHub Actions (`.github/workflows/ci.yml`). No secrets or database are used; the database-backed tests skip themselves.

## Authentication

The app requires an account. After `npm run db:migrate` and `npm run dev`, open http://localhost:3000, choose **Create account**, and register with a name, email and a password of 8–72 bytes (UTF-8). You are then signed in and land on `/dashboard`; **Log out** ends the session. Sessions last 30 days.

Run the unit tests (authentication, calendar dates, task validation, recurrence) with `npm test`.

The database-backed tests (`db/`, `app/**/actions.test.ts` and the core-flow test `app/core-flow.test.ts`) are skipped unless `TEST_DATABASE_URL` points at a migrated MySQL database, for example `TEST_DATABASE_URL="$DATABASE_URL" npm test`. They create users with unique `@example.test` emails and delete them afterwards, but use a disposable database rather than one holding data you care about.
