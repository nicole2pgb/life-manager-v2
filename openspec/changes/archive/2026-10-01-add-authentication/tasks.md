# Tasks

## 1. Dependencies and schema

- [x] 1.1 Install `bcryptjs` (runtime) and `vitest` (dev), add a `test` script to `package.json` (Vitest is used only for the pure-logic tests named in group 2; no other test tooling); verify `npm ls bcryptjs vitest` lists both and `npm test` runs (no tests yet is fine)
- [x] 1.2 Add the `sessions` table to `db/schema.ts` (id, user_id FK → users with cascade delete, unique `token_hash` CHAR(64), created_at, expires_at, index on `user_id`); verify `npx tsc --noEmit` passes
- [x] 1.3 Run `npm run db:generate`, read the generated SQL and confirm it only adds `sessions` with the cascade FK and unique key; run `npm run db:migrate` twice against the local database and verify with `SHOW CREATE TABLE sessions`, and that a second `db:generate` reports no changes
- [x] 1.4 Verify the spec's `sessions` scenarios with manual SQL on the local database: insert with unknown user rejected, duplicate token hash rejected, deleting a user removes its sessions

## 2. Auth core (server-only)

- [x] 2.1 Create `lib/auth/password.ts` (`hashPassword` with bcryptjs cost 12, `verifyPassword`, dummy hash for unknown emails) and `lib/auth/validation.ts` (name, email normalization, 8–72 byte password, confirmation match); verify with Vitest unit tests covering valid input, blank name, bad email, 7-, 8-, 72- and 73-byte passwords, a multibyte password under 72 characters but over 72 bytes, mismatched confirmation, hash is not the plain text, same password hashes differently
- [x] 2.2 Create `db/users.ts` (`findUserByEmail`, `createUser`, both `server-only`; `createUser` maps a MySQL duplicate-key error to a typed "email taken" result); verify `npx tsc --noEmit` and a manual run against the local DB showing duplicate emails in different case are rejected
- [x] 2.3 Create `lib/auth/session.ts`: `createSession` (32-byte random token, store SHA-256 hash, 30-day expiry, set `session` cookie HttpOnly/SameSite=Lax/Path=/Secure-in-production), `deleteSession`, and `getCurrentUser` (cache-wrapped, returns only id/name/email, rejects and removes expired sessions); verify with a Vitest test for the token-hash helper only and manual DB checks for valid, expired, unknown-token and logged-out sessions
- [x] 2.4 Verify the server-only guard by temporarily importing `@/lib/auth/session` from a `"use client"` file, confirming `npm run build` fails, then removing the temporary file

## 3. Registration and login

- [x] 3.1 Add shared form UI in `components/ui` (labelled input with inline error, submit button with pending state, auth card layout with Life Manager logo mark) styled per `docs/ui-reference/login.png`/`register.png` (dark, pink accent, rounded); verify visually at desktop and 375px width with no horizontal overflow
- [x] 3.2 Implement `/register` page and `registerAction` (server validation, duplicate-email field error, hash, create user, start session, redirect to `/profile`, keep name/email on error and clear passwords); verify every registration scenario in `specs/user-authentication/spec.md` in the browser and confirm `users.password_hash` is a bcrypt hash
- [x] 3.3 Implement `/login` page and `loginAction` (case-insensitive email, generic "Invalid email or password", dummy hash compare for unknown emails, replace any existing session on success, redirect to `/profile`); verify success, wrong password, unknown email (identical message), blank fields, and that the old session row is deleted when logging in again
- [x] 3.4 Make `/login` and `/register` redirect to `/profile` when `getCurrentUser()` succeeds; verify signed-in access redirects and a forged session cookie renders the form with no redirect loop

## 4. Protection, profile and logout

- [x] 4.1 Add `proxy.ts` (matcher excluding `_next/static`, `_next/image`, favicon and public assets; redirect to `/login` when the session cookie is absent on protected paths); verify with `curl -I` that `/profile` without a cookie returns a redirect to `/login`
- [x] 4.2 Add `app/(app)/layout.tsx` that calls `getCurrentUser()` and redirects to `/login` when null, and implement `/profile` (initials avatar, name, email, logout button, no hash or session data) per `docs/ui-reference/profile.png` without sidebar or "Open settings"; verify a forged cookie gets no data and two users see only their own details
- [x] 4.3 Implement `logoutAction` (POST form, delete session row, clear cookie, redirect to `/login`); verify the row is gone, replaying the old cookie with `curl` is treated as unauthenticated, and a second browser's session stays valid
- [x] 4.4 Replace `app/page.tsx` with a redirect (`/profile` when signed in, else `/login`) and set app metadata title in `app/layout.tsx`; verify both cases in the browser

## 5. Data scoping and docs

- [x] 5.1 Add an "Authentication and data scoping" section to `docs/architecture.md` stating that user id comes only from `getCurrentUser()`, owned-data access functions take a required `userId` and filter by it, and not-yours behaves as not-found; verify the text matches the spec requirement
- [x] 5.2 Add auth setup/usage notes to `README.md` (register first user, run tests with `npm test`); verify the steps work on a fresh database

## 6. Integration checks

- [x] 6.1 End-to-end pass in the browser: register → profile → reload (still signed in) → logout → `/profile` redirects to `/login` → log in again; verify cookie flags (HttpOnly, SameSite=Lax, Path=/) in dev tools and that it is unreadable from `document.cookie`
- [x] 6.2 Run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build` (without `DATABASE_URL` set); verify all pass
