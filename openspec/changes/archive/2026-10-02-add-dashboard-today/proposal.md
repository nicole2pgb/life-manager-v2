# Proposal

## Why

Users can manage tasks and recurring tasks, but nothing answers "what needs to be done today?" or "how is my week going?". Dashboard / Today is the core of the MVP flow (manage tasks → complete today's tasks → check weekly progress) and the home screen the app should open on. The Today and weekly-progress semantics also have to be defined once, so Weekly Overview and Progress can reuse them instead of redefining them.

## What Changes

- Add an authenticated `/dashboard` page showing:
  - **Today's tasks**: relevant recurring tasks plus open one-time tasks (scheduled and carried over, due and overdue, undated) and tasks completed today. Open tasks come first, overdue tasks first among them; completed-today tasks come last.
  - **Direct completion**: each task can be marked done or not done from the Dashboard, with the existing server rules.
  - **Weekly progress**: completed / planned occurrences for the current Monday–Sunday week, with a whole-number percentage.
  - **Empty states**: no tasks at all, nothing relevant today, everything done today, no planned occurrences this week.
  - A Today count, a "N priorities left" greeting line, a "Quick add task" link to `/tasks/new`, a "View all" link to `/tasks`, and the life area on every task.
- Define the shared weekly planned-occurrence semantics (recurring and one-time), including creation-week rules and which completions count. Weekly Overview and Progress will reuse them.
- Define Today relevance for one-time tasks, which `isRelevantOn` deliberately leaves out.
- Make the Dashboard the authenticated landing page and add it to the main navigation.
- Let the completion action return to the page it was triggered from (Dashboard or Tasks) and revalidate `/dashboard` as well as `/tasks`. The same revalidation applies to create, edit and delete.
- **Out of scope**: Streak, Active routines, a separate weekly-completion card, week-start or other Settings-dependent behavior (Monday–Sunday is fixed for now), a per-user time zone.
- **BREAKING (behavioral)**: after login, registration, visiting `/login` or `/register` while signed in, and visiting `/`, users land on `/dashboard` instead of `/profile`. `/profile` stays reachable through the navigation.

## Capabilities

### New Capabilities
- `dashboard-today`: the `/dashboard` page, Today relevance of tasks, completion from the Dashboard, weekly progress and its shared planned-occurrence semantics, and empty states.

### Modified Capabilities
- `user-authentication`: post-registration, post-login, signed-in `/login` and `/register`, and `/` now go to `/dashboard`; `/dashboard` is a protected route.
- `recurring-tasks`: the boundary with later features now states that Today and weekly progress are defined by `dashboard-today`, and the open question about relevance before a task's creation is resolved for planned occurrences.
- `task-management`: completing or un-completing a task from the task list or the Dashboard returns the user to where they were and refreshes both pages; the main navigation includes the Dashboard.

## Impact

- **New code**: `app/(app)/dashboard/` (page, loading and error states, task rows), a pure domain module next to `lib/tasks/recurrence.ts` for Today relevance and weekly planned occurrences, and a data-layer query for the Dashboard in `db/tasks.ts`.
- **Changed code**: `app/page.tsx`, login and register pages/actions, `components/app-nav.tsx` (and the logo link), `app/(app)/tasks/actions.ts` (return target and revalidation), existing tests that assert `/profile`.
- **Docs**: `docs/data-model.md` ("Dates of One-Time Tasks" planned-later section, recurrence rules), `docs/architecture.md` (reuse note), `docs/backlog.md` (check off Dashboard items on completion).
- **No database schema change**: everything derives from existing task, rule and completion data. No new dependencies.
