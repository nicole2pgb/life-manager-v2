# Tasks

## 1. Calendar-date helpers

- [x] 1.1 Add `isoWeekday`, `addDays`, `startOfWeek`, `endOfWeek` (Monday default, `weekStart` parameter) to `lib/dates/calendar-date.ts` using UTC-only arithmetic; extend `calendar-date.test.ts` with Monday/Sunday boundaries, month/year rollover, leap day, DST dates 2026-03-29 and 2026-10-25 and a changed `process.env.TZ`, and verify `npm test` passes
- [x] 1.2 Extend the "Calendar Dates" section of `docs/architecture.md` with the weekday/week helpers and the Monday-fixed week; verify the text matches the exported names

## 2. Recurrence domain module

- [x] 2.1 Create `lib/tasks/recurrence.ts` with the `RecurrenceRule` type, `isRelevantOn`, `formatRecurrence` and the weekly-count label; verify with `lib/tasks/recurrence.test.ts` covering daily, weekday on/off days, times-per-week at 0/1/2 of 3 / at target / completed-that-day / new week, rule change governing relevance, Berlin "today" near UTC midnight, and no dependence on creation time
- [x] 2.2 Extend `lib/tasks/validation.ts` and `form-state.ts` with recurrence, weekdays and weekly-target parsing, normalization (sorted, distinct), stray-field ignoring, recurring-plus-date rejection and the new error keys; verify in `lib/tasks/tasks.test.ts` (unknown type, empty/invalid/duplicate weekdays, target 0/1/7/8/2.5/blank/text, daily with stray fields, recurrence with date, one-time unchanged)

## 3. Data layer

- [x] 3.1 Update `db/tasks.ts` `createTask` to insert the chosen rule (dates null for recurring) and `TaskRecord` to expose `recurrence`, `canCompleteToday`, `hasCompletionHistory` and the weekly count capped at the target; list/get take `today` and week bounds; verify with DB-backed tests that a created weekday task stores exactly the sorted weekdays and one rule row, and that a target lowered below the stored count shows "2 of 2" while all completions remain
- [x] 3.2 Make `completed` rule-aware (one-time: any completion; recurring: completion on `today`) and add the distinct-dates-in-week count for times-per-week; verify ordering and state with tests including a task done yesterday but not today
- [x] 3.3 Rewrite `updateTask` to upsert the rule under the owner-filtered lock with outcomes `ok | not_found | date_locked | recurrence_locked | history_locked`: clear dates when becoming recurring, reject completed one-time → recurring, reject recurring → one-time when any completion exists, never delete completions; verify each transition with tests, including history kept recurring → recurring, rejection leaving rule and completions byte-identical, a task with only an older completion (none today) still rejected, and conversion allowed only for a task that has never had a completion
- [x] 3.4 Make `setTaskCompleted` rule-aware and return `not_relevant`: for recurring, under the row lock, no-op if already done today, otherwise check `isRelevantOn` with the week's completion dates and insert only today's completion; un-complete deletes only today's and is never rejected; one-time path unchanged; verify with tests for weekday completion on a selected day (ok) and on Tuesday (rejected, nothing written), a 2-times-per-week task rejected on the third day, completing again on an already-done day, un-complete when no longer relevant, idempotent double submit, concurrent completions at the weekly limit never exceeding the target, and one-time regression tests
- [x] 3.5 Add ownership tests: another user's task is not found for edit-with-recurrence, conversion, complete, uncomplete and delete, and rule/completions are cascaded on delete; verify the tests pass

## 4. Server Actions and UI

- [x] 4.1 Update `app/(app)/tasks/actions.ts` to read `recurrence`, `weekdays`, `timesPerWeek` (whitelisted, user id never read), pass `today` and week bounds from the central module, map `recurrence_locked` and `history_locked` to errors on the recurrence field, map `not_relevant` to a redirect to `/tasks?notice=not-relevant` (whitelisted notice keys only), and ignore any date sent for completion; verify with action-level tests or direct form posts that a forged date, a forged user id, a completion on a non-relevant day and a conversion of a task with history are all rejected server-side with nothing written
- [x] 4.2 Update `components/tasks/task-form.tsx`: "Repeats" radio pills, Monday→Sunday weekday toggles, target input, date section only for "Does not repeat", entered values kept on error, "Does not repeat" disabled with an explanation when the task has completion history (passed from the edit page); verify manually at 375 px and desktop in the browser (create, edit, error states)
- [x] 4.3 Update the edit page prefill and `components/tasks/task-card.tsx` (rule wording, capped weekly count, done-today label, accessible control names), the disabled completion control with a reason ("Not scheduled today" / "Weekly target reached") that still leaves un-complete enabled for tasks done today, and the notice alert on `/tasks`; verify each recurrence type renders correctly, the list still shows every task regardless of relevance, and one-time cards are unchanged
- [x] 4.4 Run `npm run lint`, `npx tsc --noEmit`, `npm test` and a manual pass: create/edit/complete/uncomplete/delete one task of each type, reload after each, and confirm Europe/Berlin day behavior using an injected clock in the tests

## 5. Documentation and spec hygiene

- [x] 5.1 Update `docs/data-model.md` (recurrence semantics, completion only while relevant, per-date completion, type-change rules and the history lock, week definition) and tick the Recurring Tasks items in `docs/backlog.md`; verify no statement contradicts the specs
- [x] 5.2 Confirm nothing from Today, Weekly Overview, Progress, settings or notifications was added (diff review against the boundary requirement) and run `openspec validate add-recurring-tasks --strict`; at archive, update the `task-management` Purpose line (it still says "one-time tasks") directly in the main spec
