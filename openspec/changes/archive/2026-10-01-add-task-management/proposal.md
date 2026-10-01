# Proposal

## Why

Authentication and the database foundation exist, but a signed-in user can do nothing except view their profile. Tasks are the core object of Life Manager (MVP flow: manage tasks → complete today's tasks → check weekly progress), and every later feature (recurrence, dashboard, weekly overview, progress) builds on them. This change delivers the smallest useful slice: a user can keep a personal list of one-time tasks, optionally tied to a date (backlog item 3, MVP scope "Task Management").

## What Changes

- Add a protected `/tasks` page listing the authenticated user's tasks (title, notes, date, life area, completed state), with an empty state.
- Add creating a task: required title, optional notes, a date choice, life area (one of the six supported areas).
- Add editing a task's title, notes, date choice and life area, including changing or removing its date while the task is incomplete.
- Add deleting a task, behind an explicit confirmation step.
- Add marking a task completed and back to incomplete, directly from the list.
- Introduce two distinct date concepts for one-time tasks (terminology used everywhere):
  - **Scheduled date**: the task is meant to happen on exactly that calendar date (e.g. "Doctor appointment" on 10.10.2026).
  - **Due date**: the task's deadline (e.g. "Submit application" due on 10.10.2026).
  - A one-time task has no date, a scheduled date, or a due date, never both. A date may be in the past, today or the future; it only has to be a valid calendar date the database supports.
  - Passing a date never hides, completes or deletes a task: an incomplete task stays listed with its original date until the user completes or deletes it. The original date is preserved so later features can distinguish it from the current day.
  - While a task is incomplete its date can be added, changed, switched between scheduled and due, or removed. While it is completed its date is preserved and cannot be changed (title, notes and life area still can); marking it incomplete again makes the date editable again.
  - Dates are shown in German format (`05.10.2026`) as "Scheduled for …" / "Due by …"; none is shown for tasks without a date.
- Extend `tasks` with two nullable `DATE` columns, `scheduled_date` and `due_date`, plus a CHECK that they are never both set (one new Drizzle migration; existing rows get no date).
- Add a central calendar-date module (`lib/dates/calendar-date.ts`) that defines how "today" and the calendar date of an instant are determined, with one application-wide time zone for the MVP (default `Europe/Berlin`, configurable via `APP_TIME_ZONE`) and a single resolver `getUserTimeZone(userId)` that can later read a per-user time zone. The completion date uses it; scheduled and due dates are plain stored dates that this change never compares with today.
- Add a data-access module for tasks in which every function requires the authenticated user's id and filters by it; a task belonging to another user behaves exactly like a task that does not exist.
- Add Server Actions for create, update, delete and set-completed that take the user id only from `getCurrentUser()`, never from request input, and validate all input on the server.
- Add minimal navigation between Tasks and Profile in the protected layout so the page is reachable.
- Every task is stored with a recurrence rule of type `none` (one-time). A one-time task's completed state is represented by a row in `task_completions`; marking it incomplete removes that row. The completion date is today's calendar date from the central module and is unrelated to the scheduled/due date.
- Update `docs/` so the date concepts are explicit and recurring tasks are documented as never using them.

Out of scope: recurring tasks and the recurrence selector (recurring tasks never use scheduled/due dates, see below), any behavior driven by the dates (Today eligibility, Weekly Overview placement, overdue styling or state, Progress, date-based sorting or filtering, relative labels), user-configurable time zones, progress calculations and the per-task "This week" progress bar, dashboard/Today, settings (including restricting life areas by the user's selection), notifications, goals, habits, journal, Google Calendar, AI features, task search and life-area filtering, the full sidebar and user menu, redirecting login to `/tasks`.

Documented for later, not implemented here (see `docs/data-model.md`): a scheduled task becomes relevant on its scheduled date and, if not completed then, remains an open task afterwards until completed or deleted; a due-date task is open up to its deadline and, if still incomplete afterwards, remains open as overdue until completed or deleted. Today, Weekly Overview, overdue presentation and Progress will build on these semantics; where undated tasks appear is decided in the Weekly Overview change.

## Capabilities

### New Capabilities
- `task-management`: listing, creating, editing, deleting and completing/uncompleting one-time tasks, the scheduled-date / due-date choice and its validation, and strict per-user scoping of all task operations.

### Modified Capabilities
- `database-foundation`: the "Tasks store the MVP task attributes" requirement gains separate optional scheduled-date and due-date attributes that can never both be set. No user-authentication requirement changes (login/register still redirect to `/profile`).

## Impact

- New code: `db/tasks.ts` (data access), `lib/tasks/` (validation, form state), `lib/dates/` (calendar-date module and time-zone resolver), `app/(app)/tasks/` (list page, create and edit pages, Server Actions), task UI components in `components/tasks/`.
- Changed schema: `db/schema.ts` (`tasks.scheduled_date`, `tasks.due_date`, check constraint) and one new migration in `drizzle/`. Additive and nullable, so existing rows stay valid. No new dependencies; `.env.example` gains `APP_TIME_ZONE`.
- Changed code: `app/(app)/layout.tsx` (minimal nav), possibly `components/ui/field.tsx` or a sibling for textarea/choice inputs.
- Docs updated to match: `docs/data-model.md`, `docs/mvp-scope.md`, `docs/backlog.md`, `docs/architecture.md`.
- Visual guidance from `docs/ui-reference/{tasks,create-task,edit-task}.png`. The screenshot's single optional "Due date" field is replaced by the three-way date choice; the "stays under Open tasks" hint, recurrence selector, progress bars, search, filter pills and sidebar are not carried over.

## Assumptions and open points for review

- **Database representation**: two nullable columns plus a CHECK, rather than one date column with a kind column (see design D10).
- **Completed tasks lock their date**: editing the date of a completed task is rejected (and the form shows it read-only); the user marks the task incomplete first. Title, notes and life area stay editable. The lock is decided inside the update transaction (design D4a).
- **Date range**: no product range limit and no past-date restriction; dates are limited only by the technical `DATE` range (1000-01-01 to 9999-12-31).
- **MVP time zone**: all users are treated as living in `Europe/Berlin` (override with `APP_TIME_ZONE`) until per-user time zones exist.
- **Separate pages instead of modals**: create and edit are dedicated routes (`/tasks/new`, `/tasks/[id]/edit`) styled like the screenshots' dialogs.
- **Life areas**: all six are always selectable; the future per-user life-area setting is not applied.
