# Design

## Context

Next.js 16 App Router, React 19, Tailwind 4, Drizzle + MySQL (see `db/`). The `users` table already has `name`, a unique case-insensitive `email` and `password_hash`; there is no sessions table, no auth code, no `bcryptjs`, and `app/page.tsx` is still the Create Next App placeholder. `docs/tech-stack.md` prescribes custom session auth, an HTTP-only cookie and `bcryptjs`; `docs/architecture.md` prescribes UI → server logic → data access → MySQL, and says to avoid extra abstractions.

Next 16 specifics (checked in `node_modules/next/dist/docs`): `middleware` is renamed `proxy` (`proxy.ts` at project root, exports `proxy`); `cookies()` is async; mutations use Server Actions. Next's own guidance is that a proxy should only do optimistic checks and the real check belongs next to the data.

## Goals / Non-Goals

**Goals:**
- A small, reviewable auth layer that later features can depend on: one function to get the current user, one rule for scoping queries.
- Sessions that can be revoked server-side (logout, expiry) and leak nothing useful if the DB is read.

**Non-Goals:**
- Any account feature beyond the list in the proposal (reset, verification, rate limiting, multi-device session list).
- A shared app shell/sidebar. Only the auth pages and a bare profile page are built; the shell arrives with the dashboard change.
- An auth library (Auth.js, Lucia, etc.); the tech stack calls for custom auth.

## Decisions

**1. Database sessions with a hashed token, not stateless JWT cookies.**
`sessions(id, user_id → users ON DELETE CASCADE, token_hash CHAR(64) UNIQUE, created_at, expires_at)`. The cookie holds a 32-byte random token (base64url); the DB stores its SHA-256. Hashing means a DB read does not yield usable cookies; SHA-256 (not bcrypt) is right because the token is high-entropy. Logout is a row delete, so it truly revokes. Alternative: signed JWT cookie — no table, but cannot be revoked and needs a secret to manage; rejected for the "server is source of truth" principle.

**2. Fixed 30-day expiry, no sliding renewal.**
Simplest correct behavior for the MVP. Expired rows are deleted lazily when encountered, and on login for that user. The stale cookie is left in place because Server Components cannot modify cookies; the next login, registration or logout replaces or clears it, and it never grants access. Alternative: sliding window — extra writes on every request, deferred.

**3. Cookie: `session`, HttpOnly, SameSite=Lax, Path=/, Secure in production, `Max-Age` 30 days.**
SameSite=Lax plus POST-only Server Actions (which Next additionally protects with an Origin/Host check) covers CSRF without tokens.

**4. Two layers of route protection.**
`proxy.ts` does only an optimistic cookie-presence check, with no DB access: a request without a session cookie to a protected path is redirected to `/login`. The authoritative check is `getCurrentUser()` in server code, called by every protected page/layout and every Server Action; a stale or forged cookie passes the proxy but gets no data and is redirected to `/login`. The "signed-in user visiting `/login` or `/register`" redirect is done by those pages themselves via `getCurrentUser()`, not by the proxy, so a stale cookie can never cause a redirect loop. Alternative: DB check in the proxy — proxy is meant to stay free of shared modules and heavy work; rejected.

**5. Module layout (kept flat, per "no unnecessary abstractions").**
- `lib/auth/password.ts` — `hashPassword`, `verifyPassword` (bcryptjs, cost 12), a precomputed dummy hash for unknown-email timing parity.
- `lib/auth/session.ts` — `createSession(userId)`, `deleteSession()`, `getCurrentUser()` (React `cache`-wrapped, returns `{ id, name, email }` only), cookie set/clear.
- `lib/auth/validation.ts` — field validators returning per-field errors.
- `db/users.ts` — data access: `findUserByEmail`, `createUser`.
- `app/(auth)/login`, `app/(auth)/register`, `app/(app)/profile`, each with a `page.tsx` plus `actions.ts` (Server Actions: `registerAction`, `loginAction`, `logoutAction`).
All of `lib/auth` and `db/*` import `server-only`. Pages and actions call these; UI never touches `db` directly.

**6. Forms use Server Actions with `useActionState`.**
Client form components receive `{ errors, values }` and render inline errors; passwords are never echoed back. Hand-written validators instead of adding zod: four fields, no other consumers yet. Alternative: zod — reasonable later when task forms arrive.

**7. Validation rules.**
Email trimmed and lower-cased, simple `local@domain.tld` regex plus length ≤ 255 (the DB collation already enforces case-insensitive uniqueness; lower-casing keeps stored data tidy). Password 8–72 **bytes of UTF-8** everywhere (spec, validator, error message, tests; never a character count) (bcrypt truncates silently past 72; rejecting is clearer than truncating). Duplicate email: pre-check, and also catch the MySQL duplicate-key error so a race still yields the field error rather than a 500.

**8. Duplicate email is disclosed at registration.**
Stating "email already in use" enumerates accounts, but hiding it needs email verification, which is out of scope. Login stays generic and runs a dummy bcrypt compare for unknown emails to equalize timing.

**9. Registration signs the user in and does not create a `user_settings` row.**
Settings have no UI yet; the settings change will create the row on first use (defaults come from the DB). Avoids coupling auth to an unbuilt feature.

**10. User scoping by function signature.**
`getCurrentUser()` is the only source of the user id. Data-access functions for owned data take `userId: number` as a required first argument and always include `eq(table.userId, userId)` (or join through the task). Not-found and not-yours are indistinguishable. This change has no owned-data queries yet, so the rule is recorded in `docs/architecture.md` for the task changes to follow.

**11. Routes and UI.**
`/` redirects by session state. `/login` and `/register` are a centered card on the dark background with the pink accent per `docs/ui-reference`, reusing shared `Field`/`Button` components in `components/ui`. `/profile` shows initials avatar, name, email and a logout button. Prototype-only strings ("Prototype sign-in…", "Open settings") are dropped. Responsive: card is `max-w-md w-full` with page padding, no horizontal overflow. The app is dark-only for these pages for now.

**12. Testing.**
The repo has no test runner. Add Vitest, scoped to focused pure-logic tests only: password validation (byte limits), password hashing and token hashing. Everything involving the database or browser (register, login, logout, expiry, scoping, route protection) is verified manually per the task list. No e2e framework, no mocked DB, no UI component tests.

## Risks / Trade-offs

- [Stale cookie could cause a redirect loop between `/login` and `/profile`] → Proxy never redirects away from auth pages; only the pages do, based on the database check (decision 4). Test explicitly with a forged cookie.
- [No rate limiting, so password guessing is unthrottled] → bcrypt cost 12 slows each attempt; add throttling as a follow-up before any public deployment.
- [Fixed expiry logs users out after 30 days even if active] → Acceptable for MVP.
- [Account enumeration via registration] → Accepted, see decision 8.
- [`bcryptjs` is pure JS and slower than native] → Mandated by tech stack; ~250 ms at cost 12 is acceptable for login/register only.
- [Cookie only `Secure` in production] → Local HTTP dev needs it off; gated on `NODE_ENV`.

## Migration Plan

1. Add the `sessions` table to `db/schema.ts` and generate one new migration with `npm run db:generate`; review the SQL.
2. Apply with `npm run db:migrate` (additive only; no change to existing tables or data).
3. Rollback: revert the commit and `DROP TABLE sessions`. No data in other tables is affected.
