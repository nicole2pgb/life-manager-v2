# Design

## Context

Observed in the current code:

- `recurrence_rules` (PK `task_id`, `type`, `weekdays` JSON of ISO numbers Mon=1…Sun=7, `times_per_week` 1–7) already exists with DB check constraints; `createTask` inserts a `none` rule. `task_completions` has a unique `(task_id, completed_on)` index and cascades on task deletion.
- `db/tasks.ts` derives `completed` as "any completion exists" and `setTaskCompleted(false)` deletes all completions of the task. Both are correct for one-time tasks only.
- `lib/tasks/validation.ts` validates title/notes/life area/date choice; `dateKind === null` on update means "leave dates unchanged" (used for completed tasks whose date is locked).
- `lib/dates/calendar-date.ts` is the only place that maps instants to calendar dates; `getUserTimeZone` resolves Europe/Berlin. It has no weekday or week arithmetic yet.
- `user_settings.week_start` exists but there is no settings UI.
- Every data function takes `userId` first and filters by it; foreign tasks behave as not found.

See proposal.md for motivation and specs for behavior.

## Goals / Non-Goals

**Goals:**
- Reuse the existing tables; no migration.
- One pure recurrence module (relevance, week count, labels) usable later by Today/Weekly Overview without redefinition.
- Keep one-time behavior byte-for-byte unchanged.

**Non-Goals:**
- Any Today, Weekly Overview, Progress, settings, notification behavior; completing for non-today dates; missed-occurrence logic; per-user week start.

## Decisions

1. **No schema change; rule is upserted, never deleted.** Every task already has exactly one rule row. Create inserts the chosen rule; update rewrites the row's `type/weekdays/timesPerWeek` in the same transaction as the task update, after the owner-filtered row lock (`lockOwnTask`). Alternative (delete + insert) rejected: needless churn and a window without a rule. DB check constraints stay as the safety net; the app normalizes so they are never the first line of validation.

2. **Weekdays stored as sorted, distinct ISO numbers (Mon=1…Sun=7).** Matches the existing column comment; sorting makes equal selections store identically. Form posts repeated `weekdays` values; server parses strictly (`/^[1-7]$/`).

3. **Validation extends `validateTaskInput`.** New input fields `recurrence`, `weekdays[]`, `timesPerWeek`. Result carries a discriminated `rule` (`none | daily | weekdays{days} | times_per_week{target}`) and the existing `schedule`. Rules: irrelevant fields ignored; recurring + `dateKind` of `scheduled|due` → error on a `recurrence` field; recurring ignores `dateKind: none` silently (the form hides it). The form always submits `recurrence`, so a missing value is an error on both create and update (no "leave unchanged" mode, unlike `dateKind`), which keeps the contract simple. The error-state gains `recurrence`, `weekdays`, `timesPerWeek` keys.

4. **Dates are cleared when a task becomes recurring.** `toColumns` yields null/null for recurring. This keeps the DB check and the "separate semantics" rule true without extra constraints.

5. **Type changes (confirmed).** `updateTask` runs under the owner-filtered row lock and decides from the locked state:
   - recurring → recurring: rule rewritten, completions untouched; the new rule governs relevance from then on.
   - one-time (incomplete) → recurring: dates cleared.
   - one-time **completed** → recurring: outcome `recurrence_locked`, nothing written (consistent with the date lock).
   - recurring → one-time: if `EXISTS (SELECT 1 FROM task_completions WHERE task_id = ?)` → outcome `history_locked`, nothing written; otherwise rule becomes `none` and the submitted date choice is applied. History is never deleted or migrated by an edit (only task deletion cascades). Check and write share one transaction, so a completion racing the edit either lands first (conversion rejected) or after (the one-time task is then simply completed by the normal flow).
   The edit page passes `hasCompletionHistory` to the form so it can disable "Does not repeat" and explain why; this is only a convenience, the server check is authoritative. Conversion is possible only when the task has no completion history at all; there is no history-clearing or history-editing feature, and a user who wants a one-time task while recurring history exists creates a new one-time task. Deleting history on conversion was rejected by product decision.

6. **Completion semantics by rule type, enforced in the data layer.** `completed` in `TaskRecord` becomes: one-time → any completion; recurring → a completion on *today*. `listTasks`/`getTask` receive `today` (from `todayFor(getUserTimeZone)` in the page/action layer, keeping the DB layer clock-free) and the week bounds. `setTaskCompleted` loads the rule and today's completions under the owner-filtered row lock and returns `"ok" | "not_found" | "not_relevant"`. One-time keeps today's logic. For a recurring task, marking done: if a completion for today exists → no-op `ok`; otherwise it calls `isRelevantOn(rule, today, { completionDatesInWeek })` using the week's completion dates read inside the same locked transaction, and only inserts `(taskId, today)` when relevant, else returns `not_relevant`. Because the row lock serializes completion requests per task, two concurrent requests cannot both pass the target check. Un-completing deletes `WHERE task_id = ? AND completed_on = today` and is never rejected for relevance. The action never accepts a date from the request. The action turns `not_relevant` into a user-visible message by redirecting to `/tasks?notice=not-relevant` (a fixed whitelist of notice keys, no free text), rendered as a dismissible alert on the list; the UI also pre-empts this by showing the control disabled with a reason, computed from the same `isRelevantOn` call (`canCompleteToday` on `TaskRecord`). The existing `completedExpr` is parameterized on the rule type via a SQL `CASE` joined to `recurrence_rules`; the one-time branch is unchanged.

7. **Weekly count in the list query.** A second correlated expression counts distinct completion dates between `weekStart` and `weekEnd` (inclusive) for times-per-week tasks; null otherwise. Week bounds come from the central module. The count handed to the UI is `min(count, target)`: normal completion cannot exceed the target, but lowering the target of a task that already has more completions this week would otherwise show "3 of 2"; the surplus stays stored as history. `isRelevantOn` uses the uncapped count (`>= target`).

8. **Week = Monday–Sunday, fixed in this change.** `startOfWeek(date, weekStart = "Monday")` takes the preference as a parameter so the Settings/Weekly Overview changes can pass `user_settings.week_start` without touching callers' logic. We do not read the setting now because no UI can write it and rows may not exist; hard-coding at the call site (one constant) is the smallest correct choice. Alternative (read setting now) rejected as settings behavior leaking in.

9. **Date arithmetic lives in `lib/dates/calendar-date.ts`.** Add `isoWeekday(date)`, `addDays(date, n)`, `startOfWeek(date, weekStart)`, `endOfWeek`, implemented with `Date.UTC` on the parsed parts (no local-time `Date`, so no DST or server-time-zone drift), following the architecture rule that no other module converts dates. The architecture doc's "Calendar Dates" section is extended.

10. **Relevance module `lib/tasks/recurrence.ts` (pure, no DB, no clock).** Exports `RecurrenceRule` type, `isRelevantOn(rule, date, ctx: { completionDatesInWeek: ReadonlySet<CalendarDate> })` (weekdays: weekday in set; times-per-week: `date` already completed, or `completionDatesInWeek.size < target`; daily: always), `formatRecurrence(rule)` (e.g. "Every day", "Mon, Thu", "3 times per week") and `weekCountLabel`. The same function backs the server-side completion check and the list's `canCompleteToday`, so the rule exists once. Nothing renders Today yet; the function is unit-tested so later features inherit the definition. Relevance deliberately ignores `createdAt`: whether a task applies to dates before it was created is a Weekly Overview/Progress decision.

11. **UI.** `task-form.tsx` gets a "Repeats" radio group (same pill style), seven weekday checkbox pills (Mon→Sun, `name="weekdays"`), and a number input (`min=1 max=7`). The date fieldset renders only when "Does not repeat". Hidden inputs are not used: unchosen sections are simply not rendered, so stray values never post. `task-card.tsx` shows `formatRecurrence` and the weekly count where the date label is shown today. The completion control keeps its form/action; its aria-label wording for recurring tasks is "Mark as done today / not done today". The completion control is rendered disabled with a reason ("Not scheduled today", "Weekly target reached") when `canCompleteToday` is false and the task is not done today; a task done today always keeps an enabled un-complete control. The edit page prefills rule values; the `dateLocked` path remains for completed one-time tasks, and recurrence is submitted alongside.

12. **Ownership.** All new queries live in `db/tasks.ts`, take `userId` first, and reach rules/completions only through the owner-filtered task row (lock or join). No new action reads an id other than `taskId` from the form.

## Risks / Trade-offs

- **Conversion lock can feel strict** (a recurring task with any completion history cannot become one-time) → the form explains it and points to creating a separate one-time task; history clearing or migration is deliberately out of scope. Task deletion stays ordinary deletion and is not part of any conversion flow.
- **Completion check races** → one owner-filtered row lock per task serializes completion, edit and un-completion; the unique `(task_id, completed_on)` index remains as a second safety net; tests cover concurrent completion at the weekly limit.
- **Relevance check uses the current rule only** → after a rule change, history from the old rule may look odd (e.g. a Tuesday completion on a Monday/Thursday task); history is kept untouched and only the current rule governs what can be completed.
- **Displayed weekly count is capped** while stored completions may exceed the target after the target is lowered → surplus is history only; Progress can later decide how to count it.
- **Un-complete is always allowed** even when the task is no longer relevant → avoids trapping users with a stale completion; it cannot create new data.
- **Times-per-week "relevant until target met"** is one reading of a target without fixed weekdays → only `isRelevantOn` encodes it, so Today/Weekly Overview inherit or adjust it in one place.
- **Week fixed to Monday** → Sunday-start users see different counts until Settings lands; documented, parameterized.
- **`completed` depends on `today` passed in** → a page rendered across midnight shows stale state until reload; the server judges relevance at submit time, so a stale page can only produce a rejected request with a message, never a wrong completion.
- **`weekdays` JSON content is not DB-constrained** → validated in the app, normalized on every write, covered by tests.
- **Rejected-completion messaging** uses a redirect with a whitelisted notice key → no free text is reflected, and the list stays a plain server-rendered page.

## Migration Plan

No migration. Existing rows already have `none` rules; deploy is code-only and rollback is reverting code (recurring tasks created meanwhile would then appear as one-time tasks, shown completed if they have completions — acceptable for an MVP, noted for the operator).

## Open Questions

None blocking. Product review has confirmed: weekday tasks complete only on selected days; times-per-week tasks cannot exceed their target; lowering a target below the current count is allowed (all completion rows stay, displayed progress is capped at the target); un-completing is always allowed; rejected completions use the redirect notice; rule changes preserve history and the new rule governs relevance from then on; recurring → one-time only when no completion history exists at all; one-time ↔ recurring as in decision 5.

Deferred to the Weekly Overview change: whether relevance should ignore dates before a task's creation. Deferrable wording detail: the short weekday labels.
