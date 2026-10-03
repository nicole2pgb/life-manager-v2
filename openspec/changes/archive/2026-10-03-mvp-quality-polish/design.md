# Design

## Context

- The authenticated frame is `app/(app)/layout.tsx`: a `<header>` with `Logo` and the client component `components/app-nav.tsx` (six links: Dashboard, Tasks, Weekly Overview, Progress, Profile, Settings; `flex-wrap`), then `{children}`. It already loads the user and the theme (`data-theme`). Logout is the control on the Profile page. This navigation is kept for the MVP (see proposal).
- Boundaries today: `loading.tsx`/`error.tsx` for dashboard, tasks, weekly-overview, progress, settings only. No `not-found`, `app/error.tsx` or `global-error.tsx`. The edit page already calls `notFound()` for missing, malformed and foreign tasks. Error boundaries receive `retry` (this Next version, see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`); existing `error.tsx` files already use it.
- Progress graphics: `components/progress/weekly-donut.tsx` is an inline SVG (two circles, `-rotate-90` utility on the `<svg>`, `strokeDasharray`, round linecap) with an absolutely positioned label; `daily-chart.tsx` and `life-area-list.tsx` draw bars. A Safari rendering issue on Progress is known, but its symptoms are not recorded anywhere in the repository, so the first step is to reproduce and describe it.
- Tests: Vitest, `include: lib/**, db/**, app/**/*.test.ts`; DB-backed tests skip unless `TEST_DATABASE_URL` is set and mock `server-only`, `next/cache`, `next/navigation` and the session (see `app/(app)/tasks/actions.test.ts`). There is no component/DOM test setup and no browser test tool in the project.
- `docs/mvp-scope.md` lists a user menu and `docs/ui-guidelines.md` describes a desktop sidebar; both are references that the MVP deliberately does not follow.

## Goals / Non-Goals

**Goals:**
- Every authenticated route has loading/error handling and consistent not-found.
- The existing navigation is verified usable; only small fixes if a real problem shows.
- Progress renders correctly in Chrome and Safari.
- The core flow is protected by an automated test that runs where the existing DB tests run.
- Docs state what the MVP really is.

**Non-Goals:**
- Sidebar, new mobile navigation, user-menu dropdown, moving Profile or Settings (post-MVP).
- Component/DOM or browser E2E test infrastructure (not installed in this change).
- Redesigning pages, animations, light theme, new features, schema changes.

## Decisions

### 1. Navigation: verify first, fix only proven problems
The nav is tested at 375 px, a tablet width and desktop in Chrome and Safari. A fix is made only if a concrete defect is observed (for example clipped labels, overlap with the logo, tap targets too small, missing focus ring, horizontal page scroll). Allowed fixes: padding/gap/wrapping/font-size/tap-target adjustments in `components/app-nav.tsx` and the header classes in `app/(app)/layout.tsx`. Not allowed: changing entries, order, grouping, adding menus, toggles or a sidebar. Each fix is described in the Verification notes with the observed defect.
*Alternative:* adopt the sidebar and user menu from the UI reference. Rejected by decision for the MVP; deferred to post-MVP.

### 2. Boundary layout using the file conventions
- `app/(app)/error.tsx`: catches errors from pages inside the frame; renders inside the layout (the navigation stays). The five older per-route `error.tsx` files (dashboard, tasks, weekly-overview, progress, settings) are removed because they lacked the dashboard link required by the spec and a route-level boundary would otherwise take precedence over the group-level one. New routes (`profile`, `tasks/new`, `tasks/[id]/edit`) get `loading.tsx` and rely on the group-level `error.tsx`. Error text is generic; `error.message` and `digest` are not rendered.
- `app/(app)/not-found.tsx`: rendered inside the frame for `notFound()` from `/tasks/[id]/edit`.
- `app/not-found.tsx`: unmatched URLs; links to `/dashboard` for signed-in users and `/login` otherwise (a Server Component using `getCurrentUser()`). The route proxy already redirects visitors without a session cookie to `/login`, so the `/login` link only serves an invalid or expired session.
- `app/error.tsx` and `app/global-error.tsx`: minimal generic fallbacks for failures outside the frame.
Shared presentation (heading, message, retry button, dashboard link) lives in one small component because several of these files use it. 

### 3. Safari Progress issue: reproduce, isolate, fix at the cause
1. Reproduce in Safari (desktop and 375 px, user with planned tasks, with nothing planned, 0%, partial, 100%) and record exact symptoms and Safari version.
2. Isolate by component (donut, daily chart, life-area bars, stat cards) with browser dev tools.
3. Fix with the smallest change in the affected component, keeping the same data and look. Hypotheses to check, not assumptions: CSS transform utilities applied directly to an SVG element (`-rotate-90` on the `<svg>`), Tailwind color utilities on SVG `stroke`, `stroke-linecap: round` with a zero-length dash at 0%, and percentage heights/flex sizing of the bars. If the cause is elsewhere, the investigation notes say so.
4. Re-check in Chrome so the fix does not regress it. Where the logic involved is pure (for example dash lengths), add a unit test.

### 4. Core-flow test at the Server Action/data layer
One new DB-backed test file (skipped without `TEST_DATABASE_URL`, same mocking pattern as `app/(app)/tasks/actions.test.ts`) drives register → create tasks → `getDashboard` → complete → `getWeeklyOverview`/`getProgress` → logout → login → assert persistence, then repeats with a second user to assert isolation, and cleans up by deleting its users. The session cookie is mocked at the `next/headers` boundary so register/login/logout actions run for real; the clock is fixed like the existing tests.
*Alternative:* Playwright E2E. Rejected here: new dependency and browser binaries, and out of scope per the "do not install" constraint; it can be proposed separately. Rendering and client interactions are covered by the manual pass (Decision 5), not by automation.

### 5. Responsive and browser verification is a recorded manual pass
Every page and state in the `app-shell` spec is checked at 375 px, 768 px and 1280 px in Chrome and Safari (Firefox if available) for: no horizontal scroll, readable text, reachable controls, visible focus, working navigation, theme accent applied. Results go into a "Verification" section in `tasks.md`; untested browsers are listed as not verified.

### 6. Form validation is an audit with a narrow fix scope
Audit login, register, task and settings forms for: a field-level error per invalid field with an associated message (`aria-describedby`), preserved input, pending/disabled submit state, and server-side validation as the authority. Fix inconsistencies in existing components; no validation library and no changed rules. The task form submits through `onSubmit` + `startTransition` like the settings form, because React resets a form after an `action` completes and that put controlled radios back to their initial DOM state after a validation error.

### 7. Docs reflect the MVP decision
`docs/mvp-scope.md`: the "User menu" line is replaced by "Profile and Settings are reachable from the main navigation; logout is available on the Profile screen", and the user-menu dropdown moves to the not-included list. `docs/ui-guidelines.md`: states that the screenshots are inspiration and that the MVP uses a top navigation instead of a sidebar and user-menu dropdown. `docs/backlog.md`: the "User menu" item under Authentication is ticked as met by the navigation plus Profile logout, and "Sidebar navigation / mobile navigation / user-menu dropdown" is added to Later / Post-MVP. These edits record the decision; they do not change product behavior.

## Risks / Trade-offs

- [Safari issue symptoms are unknown] → Task 5 starts by reproducing and recording them; if it cannot be reproduced, the result is recorded as not reproduced with the Safari version tested, and no speculative change is made.
- [No Safari available on the implementing machine] → Safari must be tested on macOS (this machine is Darwin); if unavailable, record "not verified" and ask before closing the change.
- [Small nav fixes could slide into a redesign] → Decision 1 lists what is allowed and what is not.
- [No automated coverage for UI behavior] → Accepted and documented; manual verification is recorded.
- [Core-flow test needs a database] → It follows the existing skip behavior; the implementer runs it against a disposable test database and reports the result.
- [Changing `mvp-scope.md` edits a source-of-truth doc] → The edit only records the user's explicit decision to defer the user menu and sidebar.

## Migration Plan

No data migration. Ship as one change on `feature/mvp-quality-polish`; rollback is reverting the branch.

## Open Questions

None that affect the specs or tasks.
