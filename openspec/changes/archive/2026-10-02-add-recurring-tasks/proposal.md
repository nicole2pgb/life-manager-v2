# Proposal

## Why

Task Management only creates one-time tasks. The MVP also promises recurring tasks (daily, specific weekdays, X times per week) that need minimal manual planning, and the database foundation already stores a recurrence rule per task and completions per calendar date. Without this change, Today, Weekly Overview and Progress have no recurrence behavior to build on.

## What Changes

- Tasks can be created and edited with a recurrence: does not repeat (existing one-time behavior), every day, specific weekdays (one or more of Mon–Sun), or X times per week (1–7).
- Recurrence rules are validated on the server and stored in the existing `recurrence_rules` table (one rule per task, already created as type `none` for one-time tasks). No schema change or migration is expected.
- A recurring task is scheduled only by its rule: it never has a scheduled date or due date, and the date choice is not offered for it.
- Completing a recurring task records a completion for the current Europe/Berlin calendar date only; the task itself is never marked completed. Completion and un-completion are per date and idempotent. The server rejects completion when the task is not relevant today (a weekday task on a non-selected day, a times-per-week task whose weekly target is reached); un-completing today's completion is always allowed.
- The task list still shows all tasks regardless of relevance. For recurring tasks it shows the rule in words, whether the task is done today, and why completion is unavailable when it is not relevant today; a times-per-week task also shows its count (never above its target) for the current calendar week (Monday–Sunday).
- A pure, tested recurrence module defines whether a task is relevant on a given calendar date, and the central calendar-date module gains the day-arithmetic helpers it needs (ISO weekday, week bounds). No screen uses the relevance function yet.
- Changing a task's recurrence: incomplete one-time → recurring clears its date; completed one-time → recurring is rejected; recurring → recurring keeps completion history; recurring → one-time is allowed only when the task has no completion history and is otherwise rejected (history is never deleted or migrated by an edit).
- Task Management's "creates only one-time tasks" restriction, the create/edit forms, the task list and the completion rules are modified accordingly.
- **Out of scope** (later changes): Dashboard/Today, Weekly Overview (week navigation, per-day placement, week-start preference, past or future weeks), Progress (rates, streaks, charts), settings UI, notifications, completing for dates other than today, missed-occurrence tracking.

## Capabilities

### New Capabilities
- `recurring-tasks`: recurrence rule types and validation, relevance of a task on a calendar date, per-date completion of recurring tasks, weekly counting for times-per-week tasks, and the boundary with later features.

### Modified Capabilities
- `task-management`: the list shows recurrence and today's completion state; create and edit forms offer recurrence (and hide dates for recurring tasks); completing/uncompleting becomes per-date for recurring tasks; the "only one-time tasks" requirement is replaced; ownership scoping explicitly covers the recurrence rule.

## Impact

- Code: `db/tasks.ts` (create/update with rule, completion queries by date and week), `lib/tasks/validation.ts` and `form-state.ts`, new `lib/tasks/recurrence.ts`, `lib/dates/calendar-date.ts`, `app/(app)/tasks/actions.ts` and the edit page, `components/tasks/task-form.tsx` and `task-card.tsx`.
- Data: no migration; existing one-time tasks keep their `none` rule and behave as before.
- Docs: `docs/data-model.md` and `docs/backlog.md` updated to reflect the implemented semantics.
- Dependencies: none.
