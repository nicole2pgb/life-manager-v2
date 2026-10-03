# Proposal

## Why

All MVP features (account, tasks, recurrence, Dashboard, Weekly Overview, Progress, Settings) are implemented and merged, but the "9. MVP Quality" backlog section is untouched. An audit of `main` found gaps: missing error/not-found/loading boundaries on several routes, no test that walks the core user flow, no consolidated responsive and browser check (including a known Safari rendering issue on Progress), and a backlog that still shows implemented sections as open. This change closes those gaps so the MVP can be called complete, without adding features.

The existing top navigation (all six entries, with Profile and Settings as plain entries and logout on the Profile page) is kept for the MVP. The UI reference screenshots (sidebar, user menu) are inspiration, not a requirement; a sidebar, mobile navigation pattern or user-menu dropdown is deferred to post-MVP.

## What Changes

- **Navigation (verify only):** keep the current top navigation unchanged in structure. Verify it is usable and readable on desktop and at 375 px, and make only small responsive fixes (spacing, wrapping, tap-target size) if testing shows an actual usability or layout problem.
- **Error and not-found states:** add a root `not-found`, a route-group `error` boundary and a `global-error` boundary; add `loading` boundaries for `profile`, `tasks/new` and `tasks/[id]/edit`; a missing, malformed or foreign task shows a consistent not-found state inside the existing frame.
- **Form validation pass:** review login, register, task and settings forms for consistent, accessible field errors and preserved input; fix inconsistencies found without changing validation rules.
- **Responsive and browser verification:** check every page at 375 px, tablet and desktop widths in Chrome and Safari (plus Firefox if available); investigate and fix the known Safari Progress rendering issue; record the result in the change.
- **Core-flow test:** add an automated test of the core flow (register → create one-time and recurring tasks → Today → complete → Weekly Overview and Progress → log out → log in and find the data persisted, plus isolation between two users) at the Server Action/data layer, running against the disposable test database like the existing DB tests.
- **Docs and cleanup:** tick Foundation and Authentication in `docs/backlog.md` and the completed MVP Quality items, record in `docs/mvp-scope.md` and `docs/ui-guidelines.md` that the sidebar and user-menu dropdown are post-MVP and that the top navigation is the MVP navigation, add those two items to the post-MVP backlog, replace the create-next-app boilerplate in `README.md`, remove unused default `public/*.svg`, and do a final code review.

Non-goals: sidebar, mobile navigation redesign, user-menu dropdown, moving Profile or Settings, Journal, Goals, notifications, animations, deployment, rate limiting, task list search/filter, light theme, pixel-perfect styling, new data model or migrations.

## Capabilities

### New Capabilities
- `app-shell`: quality requirements for the authenticated application frame: the existing navigation stays usable at all widths, every authenticated route has loading, error and not-found states, the core user flow works end to end, and Progress renders correctly in Chrome and Safari.

### Modified Capabilities

None. No requirement of an existing capability changes; navigation entries of Dashboard, Weekly Overview, Settings and Profile are unchanged.

## Impact

- Code: new `not-found.tsx`/`error.tsx`/`global-error.tsx` and per-route `loading.tsx`, small fixes found in the validation, responsive and Safari passes (possibly `components/app-nav.tsx`, `app/(app)/layout.tsx` and `components/progress/*` for small fixes only), a new core-flow test under `app/`.
- Docs: `docs/backlog.md`, `docs/mvp-scope.md`, `docs/ui-guidelines.md`, `README.md`.
- Data: no schema change, no migration. No new runtime dependencies.
