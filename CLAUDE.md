@AGENTS.md

# Life Manager

Life Manager web application. Stack: Next.js 16 / React / TypeScript / Tailwind, MySQL + Drizzle, Vitest, custom session authentication.

## Project docs

- `docs/` is the source of truth for product and architecture documentation.
- OpenSpec (`openspec/`) is used for larger feature changes; use the `/opsx:*` commands.

## Conventions

- Reuse existing domain logic instead of duplicating it.
- Keep user-owned database access scoped to the authenticated user.

## Verification

A feature is complete only when all of these pass:

- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

## Git and OpenSpec

Do not commit, push, merge, delete branches, or archive OpenSpec changes unless explicitly requested.
