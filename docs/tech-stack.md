# Tech Stack

## Application

- Next.js
- React
- TypeScript
- App Router

## Styling

- Tailwind CSS

## Backend

- Next.js full-stack architecture
- Server-side logic inside the Next.js application

## Database

- MySQL
- Drizzle ORM

## Authentication

- Custom session-based authentication
- Secure HTTP-only session cookie
- bcryptjs for password hashing
- Authentication handled server-side

## Development Environment

- Visual Studio Code
- Claude Code
- OpenSpec

## Version Control

- Git
- GitHub

## AI-Assisted Development

Claude Code is the primary AI coding assistant.

AI should be used for:

- Planning implementations
- Generating code
- Refactoring
- Debugging
- Testing
- Code review

Generated code must be reviewed before it is accepted.

## Prototyping / UI Reference

- Lovable prototype
- Screenshots from the validated prototype

The prototype is a UI and user-flow reference, not the production codebase.

## Deployment

- App: Next.js on Vercel (Node server runtime, HTTPS).
- Database: MySQL 9 on Railway, reached through its public TCP proxy via `DATABASE_URL`.
- Migrations: `npm run db:migrate` is run manually against the production database; it is not part of app start or CI.
- Health check: `GET /api/health` is public and returns `200` (`database: "up"`) or `503` (`database: "down"`). It exposes no environment or error details, so an uptime monitor can poll it.
- CI: `.github/workflows/ci.yml` runs lint, type check, tests and a production build on every pull request to `main`. It needs no secrets or database; the database-backed tests skip themselves without `TEST_DATABASE_URL`.
