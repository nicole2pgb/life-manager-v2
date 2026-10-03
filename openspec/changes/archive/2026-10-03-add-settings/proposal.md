# Proposal

## Why

The MVP scope includes a Settings screen, but users cannot yet personalise Life Manager: the accent color is fixed to pink, weeks are fixed to Monday–Sunday, and the life areas offered for tasks cannot be chosen. The `user_settings` table and the week-start parameter on the date helpers already exist and were deliberately left unused until this feature (see `docs/architecture.md`, "Calendar Dates"). Settings is the last open MVP backlog section that changes behavior.

## What Changes

- Add an authenticated `/settings` page (reference: `docs/ui-reference/settings.png`) with three cards: **Theme color**, **Weekly rhythm** (week start, daily check-in) and **Life areas**.
- **Theme color:** Pink (default), Purple, Blue, Green, Red. The saved color is applied as the accent color on all protected pages.
- **Week start:** Monday (default) or Sunday. All week-based behavior switches together: Today / times-per-week counting, planned occurrences, Dashboard weekly progress, Weekly Overview week resolution and display order, and Progress (current/previous week, daily bars).
- **Daily check-in:** enabled/disabled (default off) and a time (default 09:00). Stored only; no reminder or notification is delivered.
- **Life areas:** choose which of the six areas the user works with (default: all six, at least one required). The task create/edit form offers only the selected areas; a task keeps its existing area on edit even if that area was later deselected.
- Settings persist per user in the existing `user_settings` table. A user without a settings row gets the documented defaults and the row is created on first save. **No database migration is needed.**
- Add a "Settings" link to the main navigation.
- Remove the "week start is fixed to Monday" restrictions from the Weekly Overview, Progress, Dashboard and recurring-task specs and the matching notes in `docs/`.

Out of scope (post-MVP): real notifications/reminders, per-user time zone, custom colors, light theme, the user menu dropdown, hiding deselected areas from Progress, changing recurrence weekday numbering or the Monday–Sunday order of the task form's weekday selector, per-control auto-save.

## Capabilities

### New Capabilities
- `user-settings`: the Settings page, per-user persistence with defaults, validation, theme application, life-area selection in the task forms, and the rule that all week-based behavior follows the user's week start.

### Modified Capabilities
- `weekly-overview`: the viewed week and its day order follow the user's week start instead of being fixed to Monday.
- `progress`: the current/previous week and the daily bars follow the user's week start.
- `dashboard-today`: the shared planned-occurrence definition and the weekly summary use the user's week start.
- `recurring-tasks`: times-per-week counting uses the user's calendar week.

## Impact

- **New:** `app/(app)/settings/` (page, loading/error, Server Action), `db/settings.ts` (get-with-defaults, upsert), `lib/settings/` (validation, form state), settings form components.
- **Changed:** `app/(app)/layout.tsx` (apply theme), `app/globals.css` (accent tokens per theme), `components/app-nav.tsx`, `lib/tasks/planning.ts`, `lib/tasks/recurrence.ts`, `lib/tasks/dashboard.ts`, `lib/tasks/weekly-overview.ts`, `lib/tasks/progress.ts`, `db/tasks.ts`, the Weekly Overview, Dashboard and Progress pages/components, `lib/tasks/validation.ts` and the task create/edit pages.
- **Docs:** `docs/architecture.md`, `docs/data-model.md`, `docs/backlog.md` (Settings items, week-start item).
- No new dependencies, no schema change, no API surface beyond one Server Action.
