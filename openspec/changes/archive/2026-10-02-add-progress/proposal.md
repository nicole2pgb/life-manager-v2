# Proposal

## Why

Dashboard / Today shows a single weekly progress number, but users cannot yet see how consistent they are: how this week compares with last week, how many days in a row they got something done, which days and which life areas carried the week. Progress is the last step of the core MVP flow (manage tasks → complete today's tasks → check weekly progress). The planned/completed occurrence definitions already exist, so this feature is mostly reuse plus a small amount of new pure logic.

## What Changes

- Add an authenticated, read-only `/progress` page for the current Monday–Sunday week, with these parts:
  - **Weekly completion**: completed of planned occurrences and the whole-number percentage, from the shared `summarizeWeek`. Shows a "nothing planned" state instead of 0% when nothing is planned.
  - **Current streak**: consecutive calendar days with at least one completion of any of the user's tasks. It may span weeks. It ends today if today has a completion; otherwise it may continue from yesterday (an unfinished today never breaks it). It breaks on a fully elapsed day without a completion. It uses actual completion history, so deleting a task (which deletes its completions) can shorten it.
  - **Weekly change**: current week's completion rate minus the previous week's, in percentage points, computed from the unrounded ratios and then rounded with `Math.round`; shown like `−8% pts` / `+8% pts`, and `0% pts` when it rounds to zero. Shows "No comparison" when either week has no planned occurrences. The previous week uses current task definitions, like all planned-occurrence numbers.
  - **Daily completion chart**: seven bars (Mon–Sun) of completed versus planned per day, for the current week. Only occurrences that belong to a specific day are placed: daily tasks, specific-weekday tasks and dated one-time tasks (on their scheduled or due date, done whatever the completion date). Times-per-week tasks are deliberately not placed on days. Future days with planned occurrences show as empty (incomplete) bars; a day with nothing planned shows a "no planned" state, not 0%. Daily totals may therefore be lower than the weekly totals.
  - **Weekly completion donut**: the current week's percentage as a donut with "x/N done" and the week range in the existing German `formatWeekRange` format. No multi-week trend.
  - **Progress by life area**: all six areas (Career, Fitness, Health, Learning, Personal, Finance) with completed/planned and a bar, for the current week, including times-per-week tasks. An area without planned occurrences shows "Nothing planned", not 0%. Selecting areas is deferred to Settings.
  - Loading and error states, and a responsive layout without horizontal scroll.
- Add "Progress" to the main navigation, and refresh `/progress` after task create, edit, delete and completion changes.
- **Shared day placement**: add a per-day occurrence helper to `lib/tasks/planning.ts` as the single source of truth for which tasks occupy which day. `weekOccurrences` (for daily, weekday and one-time tasks), the Weekly Overview builder and Progress's daily chart all use it. This is a small, behavior-preserving refactor of Weekly Overview, proven by its existing tests plus new equivalence tests.
- **Week start stays fixed to Monday–Sunday** for Progress. `user_settings.week_start` is not read. When Settings makes it configurable, Progress changes together with the Dashboard, Weekly Overview, recurrence week counting and planned occurrences.
- Progress is calculated from tasks, rules and completions on every request; nothing is stored. All data access is owner-scoped.
- **Out of scope**: multi-week trends or any other analytics, per-life-area selection, configurable week start, per-user time zone, completing tasks from Progress, a Journal navigation entry, notifications.
- No breaking changes and no database schema change.

## Capabilities

### New Capabilities
- `progress`: the `/progress` page, its six metrics/visualizations and their exact calculation rules (weekly completion, streak, weekly change, daily completion, weekly donut, life-area progress), zero-planned states, fixed Monday–Sunday weeks, navigation entry, refresh after task changes, loading/error states.

### Modified Capabilities
<!-- None. Weekly Overview's requirements and observable behavior are unchanged; only its internal day placement is shared with Progress. The planned-occurrence definition (dashboard-today), recurrence relevance (recurring-tasks) and owner scoping are reused as they are. -->

## Impact

- **New code**: `app/(app)/progress/` (page, loading, error), chart/stat components under `components/progress/`, a pure builder `lib/tasks/progress.ts` (weekly change, streak, daily and life-area breakdowns), and `getProgress` plus a completion-dates query in `db/tasks.ts`.
- **Changed code**: `lib/tasks/planning.ts` (new per-day helper; `weekOccurrences` reuses it), `lib/tasks/weekly-overview.ts` (uses the helper instead of inline conditions), `loadPlanningTasks` in `db/tasks.ts` (takes a date range instead of one week; Dashboard and Weekly Overview behavior unchanged), `components/app-nav.tsx` (new link), `app/(app)/tasks/actions.ts` (also revalidate `/progress`).
- **Docs**: `docs/architecture.md` (Progress added to the list of week-based behavior that changes together with the week start, and the shared day-placement helper noted), `docs/data-model.md` (Progress section: exact definitions), `docs/backlog.md` (check off Progress items on completion).
- **No** schema change, new dependencies (charts are CSS/SVG), or changes to existing capability requirements.
