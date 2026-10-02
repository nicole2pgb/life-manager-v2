# Proposal

## Why

Dashboard / Today answers "what do I do today?", but users cannot see how their commitments and routines are spread over the week, look back at what they finished, or look ahead without overloading a single day. Weekly Overview is the next step of the MVP flow (manage tasks → complete today's tasks → check weekly progress → view the week). The shared planned-occurrence definitions already exist, so this feature can be built mostly by reuse.

## What Changes

- Add an authenticated, read-only `/weekly-overview` page showing one Monday–Sunday week:
  - **Seven day columns** with the tasks that belong to each day: daily and specific-weekday tasks on their planned days (never before their creation date), and one-time tasks with a scheduled or due date on that date only. Completion state is shown (more than by color); today's column is highlighted when it is in the viewed week.
  - **Weekly frequency** section: times-per-week tasks with "x of N" and a progress bar for the viewed week, using the shared planned-occurrence definition (including the reduced target in the creation week). These tasks never appear in day columns.
  - **Open tasks** section: incomplete one-time tasks without a scheduled or due date. They are not tied to a day, plan no occurrences and do not affect any weekly numbers.
  - **Week navigation**: `?week=YYYY-MM-DD` selects the week; invalid values fall back to the current week; previous/next move by one week; a "This week" link appears when another week is shown; any week can be viewed.
  - **Readable header and task links**: the week range is shown in German long-date style (for example "28. September – 4. Oktober 2026"), and every task title links to the task's existing edit page.
  - **Empty and loading/error states**, and a layout that stacks the seven days vertically on mobile.
- The view is **read-only** with respect to completion: tasks cannot be completed or un-completed here; that stays in Dashboard / Today and Tasks. Titles only link to the edit page.
- Incomplete dated tasks stay on their original date. There is no "missed" state and no carry-forward into later columns; Today's carry-over behavior is unchanged.
- Add "Weekly Overview" to the main navigation, and refresh `/weekly-overview` after task create, edit, delete and completion changes.
- **Week start is fixed to Monday–Sunday.** The `user_settings.week_start` value is deliberately not read. Configurable week start is deferred to the Settings feature, which must update all week-based behavior (Dashboard, recurrence counting, planned occurrences and Weekly Overview) consistently. This keeps Weekly Overview consistent with the current Dashboard and recurrence calculations.
- **Out of scope**: completing tasks from this view, a "missed" state, configurable week start, per-user time zone, drag-and-drop planning, Progress and Journal.
- No breaking changes and no database schema change.

## Capabilities

### New Capabilities
- `weekly-overview`: the `/weekly-overview` page, week selection and navigation, which tasks appear on which day, the Weekly frequency and Open tasks sections, read-only behavior, fixed Monday–Sunday weeks, navigation entry and refresh after task changes, empty/loading/error states.

### Modified Capabilities
<!-- None. The existing requirements stay valid: planned occurrences (dashboard-today), relevance and week handling (recurring-tasks) and the owner scoping (task-management, user-authentication) are reused unchanged. -->

## Impact

- **New code**: `app/(app)/weekly-overview/` (page, loading, error), components for a day column and a weekly-frequency row, a pure builder `lib/tasks/weekly-overview.ts`, and a data-layer query `getWeeklyOverview` in `db/tasks.ts`.
- **Changed code**: `components/app-nav.tsx` (new link), `app/(app)/tasks/actions.ts` (also revalidate `/weekly-overview`), and a small shared loader in `db/tasks.ts` extracted from `getDashboard` so both screens load tasks and completions the same way (Dashboard behavior unchanged).
- **Docs**: `docs/backlog.md` (check off Weekly Overview items on completion), and a note in `docs/architecture.md` that week start stays Monday until the Settings feature changes all week-based behavior together.
- **No** schema change, new dependencies, or changes to existing capability requirements.
