# Design

## Context

See proposal.md for motivation and specs/progress/spec.md for the behavior.

Current state:
- `lib/tasks/planning.ts` is pure. `weekOccurrences(task, weekStart)` returns `{ planned, completed }` for a Monday-based week and `summarizeWeek` sums it (percent is `null` when nothing is planned). Its per-type conditions: daily = days `>= createdOn`; weekdays = same plus the weekday filter; one-time = 1 planned if `scheduledDate ?? dueDate` is in the week, completed when the task has any completion; times-per-week = target (reduced in the creation week), completed capped at it.
- `lib/tasks/weekly-overview.ts` (`buildWeeklyOverview`) repeats the day-level conditions inline (creation date, weekday filter, `scheduledDate ?? dueDate` matching a day, `done` rules) and relies on a consistency test against `summarizeWeek` to keep them aligned. Times-per-week uses `weekOccurrences` directly.
- `db/tasks.ts#loadPlanningTasks(userId, weekStart, timeZone)` loads the user's tasks with rules (newest created first), then completions inside `[weekStart, weekStart + 6]` **or** belonging to one-time tasks, and converts `created_at` with `calendarDateOf`. `getDashboard` and `getWeeklyOverview` call it.
- `task_completions` has a unique index on `(task_id, completed_on)`; tasks are filtered by `tasks.user_id` (`tasks_user_id_idx`). Deleting a task cascades to its completions. Completions are only ever recorded for the current date.
- Pages follow the Dashboard / Weekly Overview convention: server component, `getCurrentUser()` + redirect, `getTodayFor` / `getUserTimeZone`, `loading.tsx`, `error.tsx`, `LifeAreaBadge`. `revalidateTaskPages()` in `app/(app)/tasks/actions.ts` revalidates the task-data pages. Nav is `components/app-nav.tsx`. `formatWeekRange` already exists in `lib/dates/calendar-date.ts`. `LIFE_AREAS` in `db/schema.ts` is already in the required order (Career, Fitness, Health, Learning, Personal, Finance).
- Next.js in this repo has breaking changes (AGENTS.md): read the relevant guides in `node_modules/next/dist/docs/` before writing the page.

## Goals / Non-Goals

**Goals:**
- Progress can never disagree with the Dashboard (weekly numbers) or Weekly Overview (day placement): both are computed by the same functions.
- One owner-scoped load of tasks for two weeks, one small owner-scoped query for the streak, and a pure builder over plain data.
- A read-only, server-rendered page with CSS/SVG visuals and no client state.

**Non-Goals:**
- No schema change, no stored/cached progress, no new dependency, no chart library.
- No change to the observable behavior of Dashboard, Weekly Overview or recurrence, and no reading of `user_settings`.
- No week navigation, multi-week history, per-area filtering or any analytics beyond the spec.

## Decisions

1. **Per-day occurrence helper in `planning.ts` is the single source of truth for day placement.**
   `dayOccurrence(task: PlanningTask, date: CalendarDate): { kind: "recurring" | "scheduled" | "due"; done: boolean } | null`.
   - daily: `date >= createdOn` → `{ recurring, done: completionDates.has(date) }`.
   - weekdays: additionally `rule.weekdays.includes(isoWeekday(date))`.
   - one-time: `date === (scheduledDate ?? dueDate)` → `{ scheduled | due, done: completionDates.size > 0 }`.
   - times-per-week and undated one-time: `null` (no day placement, by design).
   `weekOccurrences` then derives daily, weekdays and one-time results by summing `dayOccurrence` over the seven days, so the week numbers and the day placement cannot diverge by construction; times-per-week keeps its own week-level calculation. *Alternative considered:* leaving `weekOccurrences` untouched and only sharing the helper with the two views; rejected because it would leave two copies of the same conditions inside one file. *Risk:* the refactor touches the Dashboard's core numbers; mitigated by the existing `planning.test.ts`, `dashboard.test.ts`, and a new equivalence test (see Risks).

2. **Weekly Overview reuses the helper.** In `buildWeeklyOverview`, the daily/weekdays/none branches call `dayOccurrence(task, day.date)` for each day and push `{ id, title, lifeArea, done, kind }` when it returns a value; the null result for undated one-time tasks still routes the task to Open tasks, times-per-week still goes to the frequency list. Iteration order (tasks newest first, days in order) is kept so rendered output is identical. No change to `specs/weekly-overview`. The existing `weekly-overview.test.ts` stays green unchanged; the refactor is the only change to that file.

3. **Progress builder** (`lib/tasks/progress.ts`, pure, no clock, DB or time zone):
   `buildProgress(tasks, completionDates, today) → Progress`.
   - `weekStart = startOfWeek(today)`, `previousStart = addDays(weekStart, -7)`.
   - `week = summarizeWeek(tasks, weekStart)`; `previous = summarizeWeek(tasks, previousStart)`.
   - **Weekly change** `weeklyChange(current, previous)`: `null` when either `planned === 0`; otherwise `Math.round((c.completed / c.planned - p.completed / p.planned) * 100)` normalised so `-0` becomes `0`. The unrounded ratios are used, never `percent`. Formatting (`formatPointChange`) returns `−8% pts`, `+8% pts`, `0% pts` (Unicode minus, as in the screenshot). `Math.round` rounds exact halves toward +∞ (−7.5 → −7); that is accepted and noted in a test.
   - **Days**: for each of the 7 dates, loop over tasks and count `dayOccurrence`; result `{ date, weekday, isToday, isFuture, planned, completed }`. Planned `0` renders the "no planned" state. A future day's `completed` is naturally 0 (completions exist only for today and earlier), so it renders as an empty bar without special casing; `isFuture` is only for accessible wording.
   - **Life areas**: for each area in `LIFE_AREAS`, `summarizeWeek(tasks.filter(t => t.lifeArea === area), weekStart)`; yields `{ area, planned, completed, percent }` with `percent: null` when nothing is planned. Because `summarizeWeek` is additive over tasks, the areas sum to the week.
   - **Streak** `currentStreak(completionDates, today)`: put the dates in a `Set`; start at `today` if present, else `addDays(today, -1)`; count backwards with `addDays` while the set has the date. Pure, works across weeks, and a future-dated value (which cannot exist) would simply be ignored. It uses plain dates only, so there is no time-zone or DST issue.
   - The week range text comes from the existing `formatWeekRange(weekStart, endOfWeek(weekStart))`.
   - `hasTasks: tasks.length > 0` drives the empty state.

4. **Data layer.**
   - Generalise `loadPlanningTasks(userId, range: { from, to }, timeZone)`: completions in `[from, to]` or belonging to one-time tasks. Dashboard passes `[weekStart, weekStart + 6]`, Weekly Overview the viewed week (identical queries to today), Progress `[previousStart, weekStart + 6]`. One extra week of completions is cheap and gives both weeks from one call. Existing DB tests for the Dashboard and Weekly Overview must pass unchanged.
   - `listCompletionDates(userId)`: `SELECT DISTINCT completed_on FROM task_completions INNER JOIN tasks ON tasks.id = task_completions.task_id WHERE tasks.user_id = ?`. The result is at most one row per active day, uses the existing `tasks_user_id_idx` and the `(task_id, completed_on)` index, needs no new index, and is owner-scoped through the join (another user's completions never appear). It is intentionally unbounded: the streak needs history until the first gap, and a user's distinct completion days stay small for the MVP. *Alternative considered:* a rolling window (for example 60 days) with extension; rejected as extra complexity for a negligible saving. *Alternative considered:* reuse `loadPlanningTasks` completions for the streak; rejected because it only loads a two-week range.
   - `getProgress(userId, today, timeZone)` runs both loads (in parallel) and returns `buildProgress(...)`.

5. **Page and components.** `app/(app)/progress/page.tsx` follows the Dashboard conventions (auth check with redirect, `getTodayFor`, `getUserTimeZone`, `getProgress`). Server components under `components/progress/`:
   - `StatCard` (label, value, caption) for weekly completion, streak ("1 day" / "N days") and weekly change (value or "No comparison", caption "vs. last week").
   - `DailyChart`: seven columns, each a track with a fill height of `completed/planned` and weekday label; today marked (accent label and `aria-current="date"`); each column carries a visually hidden/visible text such as "2 of 4" or "No planned"; the chart itself is a list, not an image. Plain CSS flex, `min-w-0`.
   - `WeeklyDonut`: an inline SVG circle with `stroke-dasharray` for the percent, the percentage and "x/N done" as text in the centre, the German week range under the heading, and a "nothing planned" state instead of the ring when `percent === null`.
   - `LifeAreaRow`: area name (reusing the existing life-area styling where it fits), "x/N", and a `role="progressbar"` bar; "Nothing planned" without a bar fill when `planned === 0`.
   Colors use the existing accent tokens, so a later theme setting applies automatically. The page layout follows the screenshot: three stat cards, then chart + donut, then life areas; they stack below `lg`. The screenshot's eyebrow and subtitle copy are kept; the Journal nav item is not.
   `loading.tsx` / `error.tsx` mirror the Dashboard's.

6. **Navigation and refresh.** Add `{ href: "/progress", label: "Progress" }` to `AppNav` after Weekly Overview. Add `revalidatePath("/progress")` to `revalidateTaskPages()` (all create/edit/delete/complete actions use it); update the action tests that assert the revalidated paths.

7. **Week start deferred, documented.** The builder and loader take explicit Monday-based weeks derived with `startOfWeek(today)`'s default argument, so Settings can later pass the user's setting from one place per feature. `docs/architecture.md` lists Progress among the consumers that must switch together (planning functions, `weekCompletions`, `getDashboard`, Weekly Overview, Progress), and mentions that day placement lives in `dayOccurrence`. `docs/data-model.md`'s Progress section gets the exact definitions (streak, weekly change, daily placement, zero-planned states). `docs/backlog.md` Progress items are ticked when done.

8. **Ordering / sign copy assumptions** (recorded, not product decisions): the positive change is shown as `+8% pts`; the area list order is the `LIFE_AREAS` order; the screenshot's per-area text is "x/N".

## Risks / Trade-offs

- [Refactoring `weekOccurrences` changes the Dashboard's core numbers] → The refactor must be behavior-preserving. Keep the existing `planning.test.ts`, `dashboard.test.ts` and `weekly-overview.test.ts` unchanged and green, and add an equivalence test that checks, over a mixed set of tasks and weeks (creation date before/within/after the week, dated tasks before the creation date, completions on unplanned days, rule changes), that `weekOccurrences` for daily/weekdays/none equals the sum of `dayOccurrence` and that the Overview consistency test still holds. Implement the helper first and run these tests before touching the Overview.
- [Daily totals ≠ weekly totals] → Intentional (times-per-week excluded); the UI does not show a daily sum, and a test pins the relation "daily sums + times-per-week = weekly".
- [The streak counts raw completion rows, the weekly numbers use current rules] → Intentional and specified; a completion on a day the rule no longer plans still counts for the streak but not for the week.
- [Unbounded distinct-date query] → One small row per active day, indexed; revisit only if usage proves otherwise.
- [Deleting a task shortens the streak and changes last week] → Specified behavior (history is deleted with the task; numbers use current definitions).
- [`Math.round` at exact .5 rounds toward +∞ for negatives] → Accepted; pinned by a test so it is not changed accidentally.
- [Hidden week-start coupling later] → Documented in `docs/architecture.md`; Settings must update all week consumers together.
- [The `+`/`−` display glyphs in tests] → Tests use the exact strings (Unicode minus U+2212) so the format cannot drift.

## Open Questions

None that affect specs, approach or tasks.
