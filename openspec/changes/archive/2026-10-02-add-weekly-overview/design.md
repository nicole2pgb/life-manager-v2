# Design

## Context

See proposal.md for motivation and specs/weekly-overview/spec.md for the behavior.

Current state:
- `lib/tasks/planning.ts` is pure and already week-parameterised: `weekOccurrences(task, weekStart)` returns `{ planned, completed }` for any Monday-based week, `summarizeWeek` sums it. `lib/tasks/recurrence.ts` provides `isRelevantOn`, `formatRecurrence`, `cappedWeekCount`. `lib/dates/calendar-date.ts` provides `addDays`, `startOfWeek`, `isoWeekday`, `parseCalendarDate` (supported range years 1000–9999), `formatCalendarDate` (German numeric format) and `formatLongCalendarDate` (English long form, not suitable here).
- `db/tasks.ts#getDashboard(userId, today, timeZone)` loads the user's tasks with rules (newest created first), then completions where the date is in the current week **or** the task is one-time, converts `created_at` with `calendarDateOf`, and hands plain data to `buildDashboard`. The week is hard-wired to `startOfWeek(today)`.
- `weekOccurrences` for a one-time task is "1 planned, completed if it has any completion" in the week of its date; for recurring tasks it counts only completions on planned days (creation date aware). `isRelevantOn` is deliberately not creation-date aware and returns false for one-time tasks, so it is **not** the right tool for "which day column" (see Decision 1).
- `user_settings.week_start` exists but nothing reads it; all week handling is Monday-based by design.
- Nav is in `components/app-nav.tsx`; task actions revalidate `/tasks` and `/dashboard` in `app/(app)/tasks/actions.ts`.
- The Dashboard page, `loading.tsx`, `error.tsx` and `LifeAreaBadge` set the page conventions to follow. Next.js in this repo has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` (searchParams as a Promise, `loading.tsx`/`error.tsx`, `revalidatePath`) before writing the page.

## Goals / Non-Goals

**Goals:**
- One pure builder that turns plain task data into the week view, reusing `planning.ts` so the overview can never disagree with the Dashboard's weekly numbers.
- A thin server-rendered, read-only page over one owner-scoped query, with no client state beyond links.
- Share the task/completion loading with the Dashboard instead of copying it.

**Non-Goals:**
- No change to `planning.ts`, `recurrence.ts` or `calendar-date.ts` semantics, no schema change, no reading of `user_settings`.
- No completion controls, missed/overdue state, carry-forward, drag-and-drop, or per-user time zone.
- No new client components unless a day column needs one (it should not).

## Decisions

1. **Day placement is its own small function in the builder, built on the same inputs as `weekOccurrences`.**
   - Daily: day `d` of the week where `d >= createdOn`. Weekdays: same plus `rule.weekdays.includes(isoWeekday(d))`. One-time: the day equal to `scheduledDate ?? dueDate` if inside the week. Times-per-week and undated: never in columns.
   - `done` for a recurring entry = `completionDates.has(d)`; for a one-time entry = `completionDates.size > 0`.
   - These are exactly the conditions `weekOccurrences` uses to count planned/completed days, so the invariant "entries + weekly-frequency planned = planned total" holds by construction; a unit test asserts it against `summarizeWeek` for mixed task sets.
   - *Why not `isRelevantOn`:* it ignores the creation date (spec'd), returns false for one-time tasks and, for times-per-week tasks, depends on completions in a way that would put them in columns. *Alternative considered:* deriving columns from `todayStatus` per day; rejected because Today semantics (carry-over, overdue, "completed earlier is hidden") are explicitly different from the overview.

2. **Weekly frequency uses `weekOccurrences` directly.** For each times-per-week task, `{ planned, completed } = weekOccurrences(task, weekStart)`; the task is listed when `planned > 0`. This already encodes the reduced creation-week target, nothing before creation, and the cap at the target. No new counting logic. Progress bar width = `completed / planned`.

3. **Open tasks** = tasks with rule `none`, no scheduled date, no due date and no completion. Taken from the same loaded rows, ordered like the input (newest created first). Not passed to any occurrence function.

4. **Builder shape** (`lib/tasks/weekly-overview.ts`, pure, no clock, no DB, no time zone):
   `buildWeeklyOverview(tasks, weekStart, today) → { weekStart, weekEnd, days: { date, weekday, isToday, items }[7], frequency: FrequencyItem[], openTasks: OpenTaskItem[], hasTasks }`. Input type is the existing `DashboardTaskInput` (`PlanningTask` + id/title/lifeArea), so both screens share one input. `isToday` is `date === today`. Items carry `{ id, title, lifeArea, done, kind: "scheduled" | "due" | "recurring" }`. Weekday names reuse `WEEKDAY_NAMES`.

5. **Shared loader.** Extract the body of `getDashboard` into `loadPlanningTasks(userId, weekStart, timeZone)` in `db/tasks.ts`: owner-scoped task+rule select, then completions with date in `[weekStart, weekStart+6]` or belonging to one-time tasks. `getDashboard` calls it with `startOfWeek(today)` and `getWeeklyOverview(userId, weekStart, today, timeZone)` calls it with the viewed week. One-time completions are loaded without a date filter because dated one-time tasks count as done in their dated week whatever the completion date (and Open tasks need to know a task is completed). Existing Dashboard tests must stay green unchanged. *Alternative considered:* copy the query; rejected (duplicated domain-adjacent logic, drift risk).

6. **Week parsing and navigation** live in a small pure helper next to the builder (`resolveWeek(param, today)`): accepts only a single string; `parseCalendarDate` must succeed; `weekStart = startOfWeek(date)` and `addDays(weekStart, 6)` must also be valid supported dates (otherwise fall back to the current week). Previous/next are `addDays(weekStart, ∓7)`, offered only when the resulting week is fully supported. Links are plain `<Link href="/weekly-overview?week=YYYY-MM-DD">`; the current week is the link without a parameter ("This week"). No redirect or canonicalisation of the incoming URL (an invalid value simply renders the current week). The page reads `searchParams` (a Promise in this Next.js version), so it is dynamic per request, consistent with the Dashboard.

7. **Rendering.** Server components only: `DayColumn` and `FrequencyRow` components under `components/weekly-overview/`, reusing `LifeAreaBadge`. Layout: a `grid-cols-1` stack that becomes seven columns at the `lg` breakpoint (cells min-width 0, text wraps) so there is no horizontal overflow at 375 px. Done is shown with a check icon/label and strikethrough (not color only) and an `aria-label`/visually hidden "done". Today's column gets the accent highlight and `aria-current="date"`. The heading range uses a new pure `formatWeekRange(weekStart, weekEnd)` in `lib/dates/calendar-date.ts` (see Decision 11); weekday short name and day number are in the column header, and any task date shown elsewhere keeps `formatCalendarDate`. Every task title is a `next/link` `Link` to `/tasks/<id>/edit` (the existing edit route); it is a plain navigation link with no form or action, so the page stays free of completion controls. Section headings follow the screenshot: "Weekly frequency", "Open tasks". The page copy states "Weeks start on Monday" to make the fixed week start visible.

8. **Refresh after changes.** Add `revalidatePath("/weekly-overview")` next to the existing `/tasks` and `/dashboard` calls in the create, edit, delete and completion actions; extend the action test mocks accordingly. Return targets are unchanged.

9. **Week start deferred, documented.** The builder and loader take an explicit Monday `weekStart` (the page passes `startOfWeek(date)` with the default argument), so the Settings feature can later pass the user's setting. A note is added to `docs/architecture.md` that Settings must switch Dashboard, recurrence week counting (`todayStatus`, `cappedWeekCount` use sites, `weekCompletions`), planned occurrences and Weekly Overview together. This change does not touch `user_settings`.

10. **Navigation.** Add `{ href: "/weekly-overview", label: "Weekly Overview" }` after Tasks. The prefix match in `AppNav` already handles active state.

11. **Week range formatting.** Add `formatWeekRange(start, end)` next to the other formatters in `lib/dates/calendar-date.ts`: day number with a period, German month name (`Intl.DateTimeFormat("de-DE", { timeZone: "UTC", ... })` on the UTC parts, like `formatLongCalendarDate`, so it cannot shift with the server time zone). Output is `"{d}. {Monat} – {d}. {Monat} {yyyy}"`, with the year omitted on the start when both dates share a year and both years shown otherwise. When start and end share a month the month name is still written twice ("28. September – 4. Oktober" is the common case; "5. Oktober – 11. Oktober 2026" is accepted for consistency). Month names are taken from `Intl`, with a unit test pinning the exact strings so a different ICU version cannot silently change them. *Alternative considered:* a hand-written month-name table; kept as a fallback only if the ICU output proves unstable in tests, since the codebase already uses `Intl` for `formatLongCalendarDate`.

12. **Title links.** Titles link to the existing edit route without a return parameter; after saving, the edit flow behaves as it does today. Returning to the week is done with the browser back button or navigation. A return-to-week parameter is deliberately not added (it would change the task-management capability).

## Risks / Trade-offs

- [Overview and Dashboard drift apart] → Both go through `weekOccurrences`/`summarizeWeek` inputs; a test compares day-column entries plus frequency counts to `summarizeWeek` for the same data, and a DB test asserts the same for the loaded week.
- [Completions of recurring tasks outside the viewed week are not loaded] → Only the viewed week's recurring completions are needed; one-time completions are loaded unfiltered, as in the Dashboard.
- [A task rule edited after completions exist hides completions on now-unplanned days] → Intended and consistent with the weekly-progress rules (completions kept as history, not shown); covered by a spec scenario and a unit test.
- [Seven columns are cramped on medium screens] → Columns only at `lg`; below that the days stack. Long titles wrap.
- [Extreme dates] → Weeks not fully inside the supported range are treated as invalid; arrows are hidden at the edges. Low impact, cheap to guard in `resolveWeek`.
- [Hidden week-start coupling later] → Documented in architecture docs; Settings change must update all week consumers together.
- [Small Dashboard loader refactor] → Behavior-preserving; existing `db/dashboard.test.ts` guards it.

## Assumptions recorded

- Tasks inside a day and in the lists are ordered newest created first, following the project convention (the screenshot's order is not a requirement).
- A due-date entry is labelled "Due" on its column; scheduled entries carry no extra label.
- The screenshot's English range is adapted to a German long-date range (not the numeric format); the "This week · starts Monday" subtitle becomes the subtitle "Weeks start on Monday" always shown (prefixed by "This week" for the current week).
