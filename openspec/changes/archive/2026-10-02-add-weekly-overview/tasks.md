# Tasks

## 1. Week resolution and builder (pure domain logic)

- [x] 1.1 Read the relevant guides in `node_modules/next/dist/docs/` (searchParams, loading/error files, revalidatePath) and note any deviation from the Dashboard page conventions; verify by confirming the Dashboard's `searchParams`, `loading.tsx` and `error.tsx` patterns are still valid for this Next.js version (no code change)
- [x] 1.2 Add `resolveWeek(param, today)` in `lib/tasks/weekly-overview.ts` (single valid calendar date → its Monday; anything else, or a week not fully inside the supported range → current week) plus previous/next week helpers that return nothing at the range edges; verify with unit tests for default, Wednesday input, `abc`, `2026-02-30`, empty, repeated parameter, Sunday input, and the first/last supported weeks
- [x] 1.3 Add `buildWeeklyOverview(tasks, weekStart, today)` day placement for daily, specific-weekday and dated one-time tasks (creation date respected, dated tasks only on their date, no carry-forward, no times-per-week or undated tasks in columns, newest created first); verify with unit tests for each "Seven day columns" scenario
- [x] 1.4 Add done-state rules to the builder (recurring: completion on that date; dated one-time: any completion; completion on an unplanned day ignored; `isToday` only when the date equals today); verify with unit tests for the "Completion state" scenarios incl. a task completed on a different day than its date and a rule change after completion
- [x] 1.5 Add the Weekly frequency list (via `weekOccurrences`, listed when planned > 0, capped counts, creation-week target, future week 0 of N) and the Open tasks list (incomplete undated one-time only); verify with unit tests for the "Weekly frequency" and "Open tasks" scenarios
- [x] 1.6 Add a consistency test: for mixed task sets over past, current and future weeks, day-column entries + frequency planned equals `summarizeWeek(...).planned` and done entries + frequency completed equals `.completed`, with open tasks contributing nothing; verify the test passes

- [x] 1.7 Add `formatWeekRange(start, end)` to `lib/dates/calendar-date.ts` (German long-date style, year shown once when both dates share a year, both years across a year boundary) and verify with unit tests for 2026-09-28 – 2026-10-04 → "28. September – 4. Oktober 2026", 2026-12-28 – 2027-01-03 → "28. Dezember 2026 – 3. Januar 2027", a same-month range and single-digit days

## 2. Data layer

- [x] 2.1 Extract the owner-scoped task and completion loading from `getDashboard` into `loadPlanningTasks(userId, weekStart, timeZone)` in `db/tasks.ts` without behavior change; verify the existing `db/dashboard.test.ts` and `db/tasks.test.ts` pass unchanged
- [x] 2.2 Add `getWeeklyOverview(userId, weekStart, today, timeZone)` returning the built overview; verify with DB tests (style of `db/dashboard.test.ts`, skipped without `TEST_DATABASE_URL`) covering a creation instant near midnight, a dated task completed on another day, completions outside the viewed week, past and future weeks, and equality of the loaded week's totals with the Dashboard's weekly summary for the current week
- [x] 2.3 Add a data-isolation test showing another user's tasks and completions never appear and that edits and deletions show on the next call; verify the test passes

## 3. Refresh and navigation

- [x] 3.1 Add `revalidatePath("/weekly-overview")` to the create, edit, delete and completion actions in `app/(app)/tasks/actions.ts` and extend the action tests; verify the tests assert `/tasks`, `/dashboard` and `/weekly-overview` are revalidated and return targets are unchanged
- [x] 3.2 Add "Weekly Overview" to `components/app-nav.tsx` after Tasks and before Profile; verify in the running app that the entry shows, is marked on `/weekly-overview` and keeps working with `?week=`

## 4. Weekly overview page

- [x] 4.1 Build `app/(app)/weekly-overview/page.tsx` (auth check with redirect to `/login`, week from `searchParams`, heading with the German long-date week range, previous/next links, "This week" link only on other weeks, "Weeks start on Monday" note, no-tasks empty state); verify in the running app: the header reads like "28. September – 4. Oktober 2026", default week, `?week=` any weekday, invalid values, arrows move one week, link hidden on the current week, signed-out redirect
- [x] 4.2 Build `DayColumn` (weekday and day number, today highlight with `aria-current="date"`, items with title linking to `/tasks/<id>/edit`, life area, due marker, done state not by color alone, "nothing planned" empty text, no completion controls) and render seven columns that stack below `lg`; verify in the running app that titles open the edit page without changing completion, and that desktop width and 375 px show no horizontal scroll
- [x] 4.3 Build the Weekly frequency card (title linking to the edit page, life area, "x of N", progress bar with accessible value, empty text) and the Open tasks card (title linking to the edit page, life area, "no due date" hint, empty text); verify in the running app with a 5-times-per-week task, a creation-week task, a task created after the viewed week, and undated tasks
- [x] 4.4 Add `loading.tsx` and `error.tsx` for the route, matching the Dashboard's; verify the loading skeleton shows during navigation and the error state offers a retry (for example by temporarily throwing in the query, then reverting)

## 5. Docs and final checks

- [x] 5.1 Update `docs/architecture.md` (Weekly Overview reuses the planned-occurrence definitions; week start stays Monday until the Settings feature updates all week-based behavior together, listing the places that use it) and `docs/data-model.md` if its week text mentions Weekly Overview as future; check off the Weekly Overview items in `docs/backlog.md` except "Respect user's week-start preference", which is annotated as deferred to Settings; verify the docs match the spec
- [x] 5.2 Run the complete verification and fix any failure: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`; verify all four pass
- [x] 5.3 Walk the core flow in the running app (create daily, weekday, times-per-week, scheduled, due and undated tasks → complete some on the Dashboard → open Weekly Overview, navigate weeks, compare totals with the Dashboard's weekly progress, delete a task); verify every state matches the spec scenarios and that no completion control exists on the page
