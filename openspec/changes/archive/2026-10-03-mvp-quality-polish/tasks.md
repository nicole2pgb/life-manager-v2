# Tasks

## 1. Navigation verification (no structural change)

- [x] 1.1 Run the app and check the existing top navigation on every authenticated page at 1280 px, 768 px and 375 px in Chrome: all six entries readable, no overlap with the logo, no horizontal page scroll, current page marked (also on `/tasks/new` and `/tasks/[id]/edit`), visible keyboard focus; record observations in the "Verification" section at the end of this file
- [x] 1.2 Fix only defects actually observed in 1.1 with small spacing/wrapping/tap-target/focus-style changes in `components/app-nav.tsx` or the header in `app/(app)/layout.tsx` (no new entries, menus, sidebar or reordering); verify each fixed defect at the affected width and that the entries and order are unchanged. If no defect was found, record "no change needed"

## 2. Loading, error and not-found states

- [x] 2.1 Add a small shared error-state component and `app/(app)/error.tsx` (generic text, Try again via `retry`, link to dashboard, no `error.message`/digest shown); verify by temporarily throwing in `/tasks/new` locally (reverted before finishing) that the state appears inside the frame
- [x] 2.2 Add `loading.tsx` for `profile`, `tasks/new` and `tasks/[id]/edit`; verify each renders a placeholder (throttle the network or add a temporary delay, reverted before finishing) and shows no horizontal overflow at 375 px
- [x] 2.3 Add `app/(app)/not-found.tsx` (inside the frame) and `app/not-found.tsx` (links to `/dashboard` when signed in, `/login` otherwise); verify `/does-not-exist` signed in (not-found) and signed out (redirect to `/login`), a malformed task id, a nonexistent task id and another user's task id all show the expected not-found state
- [x] 2.4 Add `app/error.tsx` and `app/global-error.tsx` with minimal generic content; verify `npm run build` succeeds and the routes are emitted

## 3. Form validation audit

- [x] 3.1 Audit login, register, task create/edit and settings forms against design Decision 6 and record each finding (fix or accepted) in a "Validation audit" list at the end of this file; verify every form is listed
- [x] 3.2 Fix the findings marked "fix" without changing validation rules; verify with existing validation tests plus new tests for any changed validation helper, and manually submit each form invalid and valid

## 4. Core-flow test

- [x] 4.1 Add a DB-backed test (skipped without `TEST_DATABASE_URL`, existing mocking pattern) that registers a user, creates a one-time and a daily task, checks the dashboard, completes the daily task, checks Weekly Overview and Progress, logs out, logs in and asserts persistence; verify it passes with `TEST_DATABASE_URL` set to a disposable database
- [x] 4.2 Extend the same test with a second user and assert neither sees the other's tasks or completions; verify it passes, that it deletes its users, and that plain `npm test` still passes with the file skipped

## 5. Browser verification and Safari Progress issue

- [x] 5.1 Reproduce the known Safari Progress issue (desktop and 375 px; user with planned tasks, nothing planned, 0%, partial and 100%) and record Safari version, exact symptoms and the affected component in the "Verification" section; verify Chrome renders the same page correctly for comparison. If it cannot be reproduced, record that with the Safari version and stop without changing code
- [x] 5.2 Fix the cause in the smallest affected component under `components/progress/` (see design Decision 3), adding a unit test if pure logic changes; verify the page in Safari and Chrome at both widths and for each data state from 5.1
- [x] 5.3 Check every other page and state listed in the `app-shell` spec at 375 px, 768 px and 1280 px in Chrome and Safari (Firefox if available): no horizontal scroll, controls reachable, visible focus, theme accent applied; record browser/version, page, width and result; list untested browsers as "not verified"
- [x] 5.4 Fix issues found in 5.3 with minimal CSS/markup changes (no navigation restructuring) and re-check each at the affected width and browser; verify each issue is recorded as fixed or explicitly accepted

## 6. Documentation and cleanup

- [x] 6.1 Update `docs/mvp-scope.md`, `docs/ui-guidelines.md` and `docs/backlog.md` as described in design Decision 7 (top navigation is the MVP navigation; sidebar, mobile navigation pattern and user-menu dropdown move to Post-MVP); verify the docs agree with each other and with the implementation
- [x] 6.2 Tick Foundation and Authentication items in `docs/backlog.md` and the MVP Quality items completed in this change; verify each ticked item has matching evidence in code or in the Verification section
- [x] 6.3 Replace the create-next-app boilerplate in `README.md` with project-specific content while keeping the database, authentication and test sections; verify every command in the README runs as written
- [x] 6.4 Delete the unused default `public/*.svg` files after verifying with a repository-wide search that nothing references them; verify `npm run build` still succeeds

## 7. Final verification

- [x] 7.1 Run `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`; verify all pass, and run the DB-backed tests against a disposable database and report the result
- [x] 7.2 Review the full diff for leftover temporary changes (forced throws, delays), duplicated logic and unused code, and confirm no navigation structure change slipped in; verify `git status` shows only intended files
- [x] 7.3 Run `openspec validate mvp-quality-polish --strict` and confirm the Verification section is complete; verify validation passes (archiving is done only on explicit request)

## Validation audit

Static review of the code (browser submission of each form is still part of 3.2):

- Login: field errors with `aria-invalid`/`aria-describedby` via `Field`, form-level `role="alert"` message, email preserved, submit disabled while pending. Accepted: password is not preserved after an error (intentional).
- Register: same as login; name and email preserved. Accepted: passwords are cleared on error; focus does not move to the first invalid field (short form).
- Task create/edit: per-field errors with `aria-describedby`, all entered values preserved (controlled state), server is the authority. **Fix:** the weekday toggle group did not reference `weekdays-error`; added `aria-describedby` to the group (`components/tasks/task-form.tsx`). Accepted: focus does not move to the first invalid field.
- Settings: per-field errors with `aria-describedby`, form-level `role="alert"`, saved confirmation, values kept after save, submit disabled while pending. No findings.

## Verification

Chrome: headless Google Chrome driven over the DevTools protocol against the production build, with temporary `qa-polish-*@example.test` users and data that were deleted afterwards (the database matched its pre-test snapshot exactly). Safari: checked manually by the user after the fixes below. Firefox: **not verified** (not required for the MVP).

Widths 375, 768 and 1280 px; pages: login, register, dashboard (with data and empty), tasks, task create, task edit, weekly overview, progress (with data and empty), settings, profile, not-found variants.

- Navigation (1.1/1.2): at 375 px the six entries were 490 px wide, so every authenticated page scrolled horizontally (Settings ended at 506 px). Fixed with `flex-wrap` on the nav and `whitespace-nowrap` on the links (`components/app-nav.tsx`); entries and order unchanged. After the fix: all six entries visible on two rows at 375 px, one row at 768 and 1280, no clipped labels, no overlap with the logo, current page marked (also `/tasks/new` and `/tasks/[id]/edit`), focus ring visible on every entry, link height 36 px.
- Long unbreakable titles: a 70+ character word made the dashboard (663 px wide) and the task list (587 px) scroll horizontally at 375 px. Fixed by replacing `break-words` with `wrap-anywhere` on task titles (`task-card`, `today-row`, weekly overview title link) and the dashboard greeting.
- After the fixes: 48 page/width combinations in Chrome, no horizontal scroll and no element outside the viewport.
- Not-found (2.3): `/does-not-exist` signed in shows the not-found page; signed out redirects to `/login`; a nonexistent, malformed and another user's task id all show the same not-found state inside the navigation frame.
- Loading (2.2): with a temporary 4 s delay, `/profile`, `/tasks/new` and `/tasks/[id]/edit` showed the busy placeholder inside the frame at 375 and 1280 px, no horizontal scroll. Temporary code reverted.
- Error state (2.1): with a temporary throw, the error state showed inside the frame with "Try again" and "Go to dashboard", no error text. This also showed that the five older per-route `error.tsx` files (dashboard, tasks, weekly-overview, progress, settings) had no dashboard link, so they were removed and those routes use the shared `app/(app)/error.tsx`. Temporary code reverted.
- Validation in Chrome (3.2): login, register, task and settings forms show field errors with `aria-invalid`/`aria-describedby` and keep entered values; a valid task and a valid settings save succeed. Found and fixed a real bug: after a failed task-form submit React reset the form, so the recurrence radio showed "Does not repeat" while the weekday picker was open and a resubmit would have sent the wrong recurrence. The task form now submits like the settings form (`onSubmit` + `startTransition`), and the radio keeps its state.
- Safari (5.1–5.4, manual, by the user): the authenticated app, including Progress and the main pages, at normal and narrow/mobile width. Progress rendered correctly, the weekly completion, daily completion and life-area graphics looked correct, and there was no clipping or horizontal scrolling; the navigation stayed usable at narrow width. The previously observed Safari Progress issue was **not reproduced**; no Safari-specific change was made (5.2: nothing to fix).
- Tests: `app/core-flow.test.ts` (9 tests) and the existing DB-backed tests pass against the local database (311 passed); without `TEST_DATABASE_URL` 245 pass and 66 are skipped. `tsc`, lint and build pass.
- Final run (7.1–7.3): DB-backed suite 311 passed; `npm test` without a database 245 passed, 66 skipped; lint, `tsc --noEmit` and build pass; `openspec validate mvp-quality-polish --strict` valid. The database matched the pre-test snapshot in every table and no `@example.test` users remained. Diff review found no temporary edits, debug code, secrets, stray files or unrelated changes.
