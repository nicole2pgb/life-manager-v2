# Design

## Context

See proposal.md for motivation and specs/dashboard-today/spec.md for the behavior.

Current state:
- `lib/tasks/recurrence.ts` is a pure module (`isRelevantOn`, week-count helpers). `isRelevantOn` returns false for one-time tasks and deliberately ignores the creation date; its spec says it must not depend on creation time.
- `lib/dates/calendar-date.ts` provides `calendarDateOf`, `addDays`, `startOfWeek`, `endOfWeek`, `isoWeekday`; `lib/dates/time-zone.ts` (server-only) resolves the application time zone and "today". The architecture doc requires every "today" and instant-to-date conversion to go through these.
- `db/tasks.ts` exposes owner-scoped queries that take `today` as a parameter (no clock in the data layer). `setTaskCompleted` already enforces the completion rules. A one-time task has at most one completion row; recurring tasks have one row per completed date.
- `app/(app)/tasks/actions.ts#setTaskCompletedAction` always redirects to `/tasks` and revalidates only `/tasks`.
- Routes: `/` and the auth pages/actions redirect to `/profile`; `components/app-nav.tsx` has Tasks and Profile.
- No schema change is needed: creation date comes from `tasks.created_at`, completions from `task_completions`.

## Goals / Non-Goals

**Goals:**
- One pure, screen-independent domain module for Today relevance and weekly planned/completed occurrences, reusable by Weekly Overview and Progress.
- A dashboard page that is a thin server-rendered view over one owner-scoped data query.
- Reuse the existing completion logic and server rules instead of duplicating them.

**Non-Goals:**
- No streak, Active routines, weekly-completion card, Settings-dependent behavior, per-user time zone or configurable week start (Monday–Sunday is passed explicitly so a setting can replace it later).
- No change to `isRelevantOn` semantics, to the database schema, or to how completions are stored.
- No past-week navigation UI (the domain function accepts any week, only the dashboard uses the current one).

## Decisions

1. **New pure module `lib/tasks/planning.ts`** (next to `recurrence.ts`, same style: no database, no clock, dates passed in) with:
   - `todayStatus(task, today)`: Today membership for any task, returning `{ listed, done, overdue }`. Recurring tasks delegate to `isRelevantOn` plus "has a completion today"; one-time tasks follow the carry-over/undated/due rules and "completed today". `todayRank` gives the ordering (overdue, open, done today).
   - `weekOccurrences(task, weekStart)`: returns `{ planned, completed }` for one task and one Monday–Sunday week, per the spec definitions (creation-date-aware for recurring, week-of-date for dated one-time, zero for undated).
   - `summarizeWeek(tasks, weekStart)`: sums them and derives the open count and the rounded percentage (null when planned is 0).

   `lib/tasks/dashboard.ts` (`buildDashboard`) assembles Today items, counts and the weekly summary from plain task data, so the data layer stays a thin loader.

   *Why a new module and not extending `isRelevantOn`:* relevance is a per-date question that must stay independent of creation date (existing spec); planned occurrences are a per-week question that must respect creation. Keeping both small and separate avoids weakening the existing contract. *Alternative considered:* adding a creation date parameter to `isRelevantOn`; rejected because it would change a spec'd contract used by completion checks.

2. **Input shape is plain data**: `{ rule, scheduledDate, dueDate, createdOn (CalendarDate), completionDates (all completion dates relevant to the evaluation) }`. The data layer converts `created_at` with `calendarDateOf(createdAt, timeZone)`, so the pure module never sees an instant or a time zone. This keeps time-zone handling in the one existing module.

3. **Week handling**: the module takes an explicit `weekStart` (a Monday calendar date) and uses `addDays`/`startOfWeek`/`endOfWeek`; the dashboard passes `startOfWeek(today)` (Monday default). Counting weekday occurrences from the creation date uses `max(weekStart, createdOn)` through `weekEnd`. Times-per-week: `target` if `createdOn < weekStart`, otherwise `min(target, daysBetween(createdOn, weekEnd) + 1)` and 0 if `createdOn > weekEnd`.

4. **Numerator rules live in the same function** so the invariant `completed <= planned` is local: daily/weekdays count distinct completion dates that are planned days; times-per-week counts completion dates on/after the creation date within the week, capped at the effective target; dated one-time tasks count 1 when the task has any completion. No separate "attribution" step is needed.

5. **One data query, `getDashboard(userId, today, timeZone)`** (in `db/tasks.ts`, reusing the existing selection/mapping helpers): loads the user's tasks with rules, plus completions of those tasks where the date is in the current week **or** the task is one-time (so "completed today" and "completed at all" are known for one-time tasks regardless of date). Everything is filtered by `userId` in SQL like the other queries. It hands the rows to `buildDashboard`, which returns the Today items (already ordered), the weekly summary and counts; ordering lives in the pure modules (open before completed; overdue first; newest created first).
   *Alternative considered:* reusing `listTasks` and filtering in the page; rejected because it lacks creation dates and one-time completion dates and would push domain logic into the view.

6. **Completion reuse and return target**: the dashboard rows submit to `setTaskCompletedAction` with a hidden `returnTo` field. The action accepts only the literals `/dashboard` and `/tasks` (anything else falls back to `/tasks`), runs the existing `setTaskCompleted`, revalidates **both** `/dashboard` and `/tasks`, and redirects to the return target; `not_relevant` redirects to `<returnTo>?notice=not-relevant`. The dashboard renders the existing notice message. Create/edit/delete actions also revalidate `/dashboard`. *Alternative considered:* a separate dashboard action; rejected to avoid two copies of the same rules and tests.

7. **Routing**: change the five redirect sites (`app/page.tsx`, login/register actions, login/register pages) to `/dashboard`; add Dashboard as first link in `AppNav` and point the logo at `/dashboard`. `/profile` keeps working. The proxy needs no change (everything non-public is already protected).

8. **UI**: server component page `app/(app)/dashboard/page.tsx` with `loading.tsx` and `error.tsx` mirroring the Tasks route, plus small presentational components under `components/dashboard/` (header, stat card, task row, weekly progress card, empty states). Reuse the existing completion control styling from `components/tasks`. Layout follows `docs/ui-reference/dashboard.png` minus the excluded panels, in the current top-navigation shell (no sidebar).

9. **Percentage**: `Math.round(completed / planned * 100)`, null when `planned === 0`.

## Risks / Trade-offs

- [Carried-over and undated tasks appear in Today but not in weekly numbers, so "priorities left" can differ from "planned still open"] → both are labelled distinctly; this is a specified product decision.
- [Retroactive recomputation: editing a task's rule changes this week's numbers, and a dated one-time task completed later raises a past week's numbers] → specified behavior; only the current week is shown now, and Progress will decide whether to snapshot.
- [Times-per-week reduced creation-week target differs from the unmodified target used by `isRelevantOn`] → no practical conflict: at most one completion per day, so completions cannot exceed the remaining days; covered by tests.
- [Daylight-saving or time-zone edge cases around creation date and "today"] → all conversions go through the central calendar-date module; tests cover a creation instant near midnight UTC.
- [`returnTo` as an open-redirect vector] → strict whitelist of two literals, never echoing request input into the redirect.
- [Existing auth tests and e2e expectations assert `/profile`] → updated in the same task group as the redirect change.

## Migration Plan

No data migration or schema change. Deploy is a normal release; rollback is reverting the code. Existing sessions keep working; only the landing destination changes.
