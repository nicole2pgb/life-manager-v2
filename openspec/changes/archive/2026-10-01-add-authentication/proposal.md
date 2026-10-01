# Proposal

## Why

The database foundation exists, but the app has no notion of a user: anyone can reach every page and there is no way to tie data to a person. Every later feature (tasks, recurrence, progress, settings) must be scoped to the authenticated user, so authentication and the user-scoping rule have to exist first (backlog item 2, MVP scope "User Account").

## What Changes

- Add registration with name, email, password and password confirmation (server-side validation, case-insensitive unique email, bcrypt hashing).
- Add login with email and password, with a generic failure message that does not reveal whether the email exists.
- Add server-side, database-backed sessions: a random token in an HTTP-only cookie, with only its hash stored in a new `sessions` table; sessions expire and are deleted on logout.
- Add logout, which deletes the session row and clears the cookie.
- Protect application routes: unauthenticated visitors are redirected to `/login`; authenticated visitors are redirected away from `/login` and `/register`. Enforced in a proxy (optimistic redirect) and again in server code (authoritative check).
- Add a `/profile` page showing the authenticated user's name and email, plus a logout control.
- Add a single server-side entry point for "who is the current user", and the rule that every data-access function for user-owned data takes the authenticated user's id and filters by it. No task features are built; the rule is specified and demonstrated on the existing `users` lookups only.
- Add the `bcryptjs` dependency (named in `docs/tech-stack.md`) and a `sessions` table via a new migration.
- Replace the Create Next App placeholder in `app/page.tsx` with a redirect (to `/profile` when signed in, else `/login`).

Out of scope: task management, recurring tasks, dashboard, progress, settings UI and settings rows, sidebar/user menu, password reset, email verification, "remember me", OAuth, rate limiting, profile editing, account deletion.

## Capabilities

### New Capabilities
- `user-authentication`: registration, login, logout, session lifecycle, route protection, the profile page, and the user-data-scoping rule.

### Modified Capabilities
- `database-foundation`: adds a requirement for a `sessions` table (hashed token, owning user, expiry, cascade on user deletion) and extends the "deleting a user" cascade to cover sessions.

## Impact

- New code: `app/(auth)/login`, `app/(auth)/register`, `app/(app)/profile`, server actions, `proxy.ts`, a `lib/auth` module (password, session, current-user helpers), small shared form components.
- Changed code: `db/schema.ts` (+`sessions`), `drizzle/` (new migration), `app/page.tsx`, `app/layout.tsx` (metadata only), `package.json` (+`bcryptjs`).
- No change to the `users` table: it already has name, unique email and `password_hash`.
- Visual guidance from `docs/ui-reference/{login,register,profile}.png` (dark card, pink accent); the sidebar, "Open settings" and prototype disclaimer text are not carried over.
