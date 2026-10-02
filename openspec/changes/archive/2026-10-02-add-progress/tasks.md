# Tasks

## 1. Shared day placement (behavior-preserving refactor)

- [x] 1.1 Read the relevant guides in `node_modules/next/dist/docs/` (page `searchParams`/server components, `loading.tsx`/`error.tsx`, `revalidatePath`) and confirm the Dashboard's page, loading and error patterns are still valid for this Next.js version (no code change); verify by noting any deviation before writing the page
- [x] 1.2 Add `dayOccurrence(task, date)` to `lib/tasks/planning.ts` (daily and weekdays from the creation date, dated one-time tasks on `scheduledDate ?? dueDate` and done on any completion, `null` for times-per-week and undated one-time tasks) and verify with unit tests for each rule type, creation-date boundaries, a dated task before its creation date, completions on unplanned days, and the one-time done-regardless-of-completion-date case
- [x] 1.3 Make `weekOccurrences` use `dayOccurrence` for daily, weekdays and one-time tasks (times-per-week unchanged) and verify that the existing `lib/tasks/planning.test.ts` and `db/dashboard.test.ts` pass unchanged, plus a new equivalence test comparing the result with the pre-refactor expectations over mixed tasks and weeks (past, creation week, future)
- [x] 1.4 Refactor `buildWeeklyOverview` in `lib/tasks/weekly-overview.ts` to place daily, weekday and dated one-time entries through `dayOccurrence`, keeping task/day ordering, Open tasks and Weekly frequency as they are; verify that `lib/tasks/weekly-overview.test.ts` and `db/weekly-overview.test.ts` pass **unchanged**, and that its consistency test against `summarizeWeek` still passes

## 2. Progress calculation (pure domain logic)

- [x] 2.1 Add `currentStreak(completionDates, today)` to `lib/tasks/progress.ts` and verify with unit tests for: ends today, today not yet done (continues from yesterday), a missed elapsed day, nothing yesterday and nothing today (0), spanning a week boundary and a month/year boundary, one-day streak, no completions, and duplicates/unordered input
- [x] 2.2 Add `weeklyChange(current, previous)` and `formatPointChange` and verify with unit tests for: unrounded ratios (1/6 vs 1/3 → −17, not −16), a decrease (−9), an increase (`+8% pts`), rounding to zero (`0% pts`, never `-0`), either week with zero planned (null → "No comparison"), and the `Math.round` half-value behavior
- [x] 2.3 Add the daily breakdown (seven days Monday–Sunday with planned/completed from `dayOccurrence`, today flag, future days empty, times-per-week excluded) and verify with unit tests for the spec scenarios: partly done day, future days, no-planned day, times-per-week excluded, dated one-time task on its own day when completed on another day, creation-date boundaries, and "daily sums + times-per-week = weekly" against `summarizeWeek`
- [x] 2.4 Add the life-area breakdown (all six areas in `LIFE_AREAS` order, per-area `summarizeWeek`, `percent: null` when nothing is planned) and `buildProgress` (current week summary, previous week summary, change, days, areas, streak, week range, `hasTasks`); verify with unit tests that the areas add up to the weekly totals, that unused areas are listed as nothing planned, and that Progress's weekly numbers equal `buildDashboard(...).week` for the same data, and that Progress's day counts equal the Weekly Overview column entries for the same week

## 3. Data layer

- [x] 3.1 Generalise `loadPlanningTasks` in `db/tasks.ts` to take a date range (`from`, `to`) instead of one week, with the Dashboard and Weekly Overview passing their week (identical results); verify `db/dashboard.test.ts`, `db/weekly-overview.test.ts` and `db/tasks.test.ts` pass unchanged
- [x] 3.2 Add `listCompletionDates(userId)` (distinct completion dates through the owner-filtered task join) and `getProgress(userId, today, timeZone)` (previous Monday through current Sunday, plus the streak dates); verify with DB tests (style of `db/dashboard.test.ts`, skipped without `TEST_DATABASE_URL`) covering a creation instant near midnight, a streak spanning weeks, one-time and undated-task completions counting for the streak, a task deleted mid-streak shortening it, and weekly totals equal to the Dashboard's
- [x] 3.3 Add a data-isolation test showing another user's tasks and completions never appear in the weekly numbers, areas, days or streak, and that edits and deletions show on the next call; verify the test passes

## 4. Refresh and navigation

- [x] 4.1 Add `revalidatePath("/progress")` to `revalidateTaskPages()` in `app/(app)/tasks/actions.ts` and extend the action tests; verify the tests assert `/tasks`, `/dashboard`, `/weekly-overview` and `/progress` are revalidated and return targets are unchanged
- [x] 4.2 Add "Progress" to `components/app-nav.tsx` after Weekly Overview (no Journal entry); verify in the running app that the entry shows and is marked current on `/progress`

## 5. Progress page

- [x] 5.1 Build `app/(app)/progress/page.tsx` (auth check with redirect to `/login`, today and time zone, `getProgress`, header with eyebrow, title and subtitle, no-tasks empty state with a link to create a task) plus the three stat cards (weekly completion with nothing-planned state, streak with "1 day"/"N days", weekly change with "No comparison"); verify in the running app with no tasks, only undated tasks, and a normal week, and that the signed-out visit redirects to `/login`
- [x] 5.2 Build `DailyChart` (seven bars, today marked, text such as "2 of 4" per day, "No planned" state, future planned days as empty bars, wrapping/no horizontal overflow at 375 px); verify in the running app with daily, weekday, dated one-time and times-per-week tasks that times-per-week tasks never appear in a bar and the bars match the Weekly Overview columns
- [x] 5.3 Build `WeeklyDonut` (SVG ring, percentage and "x/N done" as text, German `formatWeekRange` subtitle, nothing-planned state); verify in the running app that the donut matches the Dashboard's weekly progress and the range reads like "28. September – 4. Oktober 2026"
- [x] 5.4 Build the life-area section (all six areas in order, "x/N" with an accessible progress bar, "Nothing planned" without a percentage); verify in the running app with tasks in one area (the other five show "Nothing planned") and that the area counts add up to the weekly totals
- [x] 5.5 Add `loading.tsx` and `error.tsx` for the route, matching the Dashboard's; verify the loading skeleton shows during navigation and the error state offers a retry (for example by temporarily throwing in the query, then reverting)

## 6. Documentation and final checks

- [x] 6.1 Update `docs/architecture.md` (Progress added to the week-based behavior that changes together with the week start; `dayOccurrence` as the single day-placement definition), `docs/data-model.md` (Progress section: streak, weekly change, daily placement, zero-planned states) and `docs/backlog.md` (check off the six Progress items); verify the documents agree with the spec and with each other
- [x] 6.2 Run the full verification and confirm everything passes: `npm test`, `npm run lint`, `npx tsc --noEmit` and `npm run build`; manually check the flow create task → complete on Dashboard → Progress → Weekly Overview shows consistent numbers, at desktop and 375 px width
