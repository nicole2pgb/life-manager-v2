# Tasks

## 1. Shared domain logic (Today relevance and weekly planned occurrences)

- [x] 1.1 Create `lib/tasks/planning.ts` with the pure Today-membership function for recurring and one-time tasks (scheduled carry-over, due/overdue, undated, completed-today only) and verify with unit tests covering every scenario in "Today lists the tasks that are relevant today"
- [x] 1.2 Add the ordering/overdue helpers (open before completed, overdue first, newest created first; carried-over scheduled not overdue; due today not overdue) and verify with unit tests for the "ordered, labelled" scenarios
- [x] 1.3 Add the planned-occurrence function for one task and one Monday–Sunday week (daily, weekdays, times-per-week incl. reduced creation week, dated one-time in the week of its date, undated = 0, creation after the week = 0) and verify with unit tests for each "Planned occurrences" scenario
- [x] 1.4 Add the completed-occurrence rules (planned days only, times-per-week capped at the effective target, dated one-time counted in its dated week regardless of completion date, completed never exceeds planned) and verify with unit tests including a rule change after completion and a task edited mid-week
- [x] 1.5 Add `summarizeWeek` with whole-number rounding and `null` percentage for zero planned occurrences; verify with tests for 12/33 → 36%, 1/3 → 33% and the empty week
- [x] 1.6 Update `docs/data-model.md` (replace the "Planned later behavior" section with the resolved Today and weekly-progress semantics, update the Recurrence Rule note on creation dates) and the reuse note in `docs/architecture.md`; verify the docs no longer contain "planned later" statements for Today and match the spec

## 2. Data layer

- [x] 2.1 Add the owner-scoped `getDashboard(userId, today, timeZone)` query returning Today items, weekly summary and counts (creation date via `calendarDateOf` with the application time zone; completions of the current week plus one-time completions) and verify with DB tests in the style of `db/tasks.test.ts`, including that a creation instant near midnight maps to the right calendar date in the application time zone
- [x] 2.2 Add a data-isolation test proving another user's tasks and completions never appear in or affect the result, and a test that tasks deleted or edited are reflected on the next call

## 3. Completion action and revalidation

- [x] 3.1 Extend `setTaskCompletedAction` with the whitelisted `returnTo` (`/dashboard` or `/tasks`, anything else → `/tasks`), redirect to the return target, send `not_relevant` to `<returnTo>?notice=not-relevant`, and revalidate both pages; verify with action tests for each target, an unknown target and the rejected completion
- [x] 3.2 Revalidate `/dashboard` in the create, edit and delete actions as well and verify with the existing action test mocks that `revalidatePath` is called for both paths

## 4. Routing and navigation

- [x] 4.1 Redirect to `/dashboard` in `app/page.tsx`, the login and register actions, and the login and register pages (signed-in visitors), and update the affected auth tests; verify the tests pass and no `/profile` landing redirect remains
- [x] 4.2 Add Dashboard as the first link in `components/app-nav.tsx`, point the logo to `/dashboard`, and verify manually that the current page is marked and `/profile` is still reachable

## 5. Dashboard page

- [x] 5.1 Build `app/(app)/dashboard/page.tsx` with header (greeting, date, "N priorities left", Today count, Quick add link, View all link), the Today list with life-area labels, Overdue marker, carried-over scheduled date and completion control posting to the shared action with `returnTo=/dashboard`; verify in the running app against the scenarios (open before completed, completing stays on `/dashboard`)
- [x] 5.2 Build the weekly progress card (completed of planned, rounded percentage, German date range, open count, progress bar) and the three Today empty states plus the empty weekly state; verify in the running app with a new user, a user with only future/undated tasks, and a user with everything done
- [x] 5.3 Add `loading.tsx` and `error.tsx` for the route, show the not-relevant notice on the dashboard, make controls accessible, and verify the page has no horizontal scroll at 375 px and the error state renders when the data query throws
- [x] 5.4 Add component/rendering tests for the list, row states and empty states if the project's test setup supports it; otherwise verify through the manual checks in 5.1–5.3

## 6. Integration and wrap-up

- [x] 6.1 Run the core flow end to end (register → land on `/dashboard` → create one-time and recurring tasks → complete from the dashboard → weekly numbers update → `/tasks` shows the same state) and verify results against the spec scenarios
- [x] 6.2 Run `npm run lint`, `npm test` and `npm run build` and verify all pass
- [x] 6.3 Check off the Dashboard / Today items in `docs/backlog.md` and verify `openspec validate add-dashboard-today --strict` passes
