# Design

## Context

See proposal.md for motivation and scope. Current state this design builds on:

- The `tasks`, `recurrence_rules` and `task_completions` tables already exist (`db/schema.ts`), with cascade deletes from task to rule and completions, and a unique `(task_id, completed_on)` index. `LIFE_AREAS` and the `Task` types are exported from the schema.
- Authentication is in place: `getCurrentUser()` in `lib/auth/session.ts` is the only source of the user id; `app/(app)/layout.tsx` redirects unauthenticated visitors; `proxy.ts` is only an optimistic redirect. `docs/architecture.md` requires every user-owned data-access function to take the user id as a required argument and filter by it, and a foreign record to behave as not found.
- Data access lives in `db/` (`db/users.ts` is the pattern: `server-only`, uses `getDb()` and `schema`). Server Actions live next to their route (`app/(auth)/register/actions.ts`) and use `useActionState` forms with a typed form state and server-side validation in `lib/auth/validation.ts`. Pure logic is tested with Vitest under `lib/**`.
- Next.js in this repo has breaking changes (`AGENTS.md`); the implementer must read the relevant guides in `node_modules/next/dist/docs/` (Server Actions / mutating data, `revalidatePath`, `notFound`, error handling, dynamic route params) before writing code.
- The task data model has no "completed" column. Completion is a per-date row in `task_completions`.
- The `tasks` table has no date columns yet; `docs/data-model.md` defines two distinct optional date concepts for one-time tasks (scheduled date, due date), never combined and never used by recurring tasks. `date(..., { mode: "string" })` columns (as used for `task_completions.completed_on`) return `YYYY-MM-DD` strings, so no JS `Date` conversion happens for stored calendar dates.
- There is no time-zone concept anywhere in the app yet, and `docs/architecture.md` now has a "Calendar Dates" section describing the strategy decided in D10.

## Goals / Non-Goals

**Goals:**
- A task flow that is correct and strictly user-scoped, reusing the existing tables; the only schema change is two nullable date columns with a CHECK.
- One central, tested definition of "the user's calendar day" that later features reuse and that can become per-user without touching callers.
- Task logic (validation, completed state) separated from UI so the later Dashboard and Weekly Overview can reuse it.

**Non-Goals:**
- No recurrence behavior, no schedule/week/progress calculations, no `Today` logic. The only recurrence-related behavior is writing a `none` rule on create.
- No behavior driven by the scheduled date or due date (Today eligibility, sorting, overdue styling, relative labels, Weekly Overview/Dashboard treatment).
- No recurrence behavior; enforcing "recurring tasks have no dates" is the recurrence change's job.
- No user-configurable time zone or settings UI.
- No client-side caching or optimistic UI; the server stays the source of truth.
- No API route handlers; Server Actions only.

## Decisions

### D1. Data access in `db/tasks.ts`, user id always required
Functions: `listTasks(userId)`, `getTask(userId, taskId)`, `createTask(userId, input)`, `updateTask(userId, taskId, input)`, `deleteTask(userId, taskId)`, `setTaskCompleted(userId, taskId, completed, completedOn)`. The data layer contains no time logic: the caller passes the completion date (D10). `input` carries `title`, `notes`, `lifeArea` and `schedule`, a discriminated union `{ kind: "none" } | { kind: "scheduled"; date: CalendarDate } | { kind: "due"; date: CalendarDate }` that the data layer maps to the two columns (the other column is always written as `NULL`). Read results expose the same `schedule` shape. Each takes `userId` as its first, required argument and puts `tasks.user_id = userId` in the `WHERE` clause of every query that reads or writes a task, so ownership is enforced in the SQL, not by a prior check that could be skipped. Update/delete return a result based on affected rows (`ok` / `not_found`, and for update also `date_locked`, see D4a); reads return `null`. A foreign task and a missing task are indistinguishable. Completion rows are only reached through a task fetched with the owner filter.

*Alternatives:* check ownership in the action and then query by id only (rejected: one forgotten check leaks data; contradicts `docs/architecture.md`). Row-level security (not available in MySQL).

### D2. Completed state is derived from `task_completions`; completion is an explicit set, not a blind toggle
A one-time task is completed if at least one completion row exists. `setTaskCompleted(userId, taskId, completed)`:
- `true`: after verifying ownership, if no completion exists for the task, insert one with the `completedOn` calendar date supplied by the action; if one exists, do nothing. The insert uses a no-op on duplicate key so a double-submit cannot error or create two rows.
- `false`: after verifying ownership, delete the task's completion rows.

The list query returns each task with a boolean `completed` (a left join or `EXISTS` subquery), so the list is one query rather than N+1. The action receives the desired state (`completed=true|false` hidden field, the opposite of the currently rendered state), which makes repeated or racing submits idempotent. 

*Alternatives:* add a `completed_at` column to `tasks` (rejected: schema change duplicating `task_completions`, and it conflicts with the documented model where completion is per date, which recurring tasks will need). Blind toggle (rejected: a double click would flip back).

*Date:* `completedOn` comes from the central calendar-date module (D10), computed in the Server Action for the current user's day. It is a completion date only; it is never copied to or compared with `tasks.scheduled_date` or `tasks.due_date`, and completing never touches them. For one-time tasks only the existence of the row matters.

### D3. Create writes the task and a `none` recurrence rule in one transaction
`createTask` inserts into `tasks` (with the owner from the argument) and into `recurrence_rules` (`type: 'none'`) inside a `db.transaction`, so a task never exists without its rule, which later recurrence code can assume ("exactly one rule per task"). Edit does not touch the rule. Delete relies on the existing foreign-key cascades.

### D4. Validation in `lib/tasks/validation.ts`, shared by create and edit
A pure function `validateTaskInput({ title, notes, lifeArea, dateKind, date }, { mode })` returns field errors or normalized values (trimmed title, notes trimmed with blank → `null`, life area narrowed to `LifeArea`, and a normalized `schedule`). Rules: title 1–255 chars after trimming; notes ≤ 5000 chars (the column is `TEXT`); life area in `LIFE_AREAS`; `dateKind` one of `none | scheduled | due` (anything else present is an error on the date field); for `none` any submitted `date` is ignored; for `scheduled`/`due` the date is required and must pass `parseCalendarDate` (strict `YYYY-MM-DD`, real date, within MySQL's `DATE` range 1000-01-01..9999-12-31). A date in the past, today or the future is valid; there is no comparison with "today" and no other range limit, so the validator needs no clock or time zone. In `create` mode a missing `dateKind` is an error; in `update` mode a missing `dateKind` means "leave the dates unchanged" (`schedule: undefined`), which is what the form of a completed task submits. Follows the style of `lib/auth/validation.ts` and is unit-tested with Vitest. Task ids from forms/params are parsed as positive integers by a small helper; anything else is treated as not found.

### D4a. Dates are locked while a task is completed
`updateTask(userId, taskId, input)` runs in one transaction: select the task `WHERE id = ? AND user_id = ? FOR UPDATE` (not found → `not_found`), check whether a completion row exists, then:
- task incomplete: write title, notes, life area and, when `input.schedule` is defined, both date columns (the unused one `NULL`);
- task completed: write title, notes and life area; if `input.schedule` is defined and differs from the stored schedule (different kind or day) return `date_locked` and write nothing; if it equals the stored schedule or is undefined, leave the dates as they are.

Doing the check inside the locked transaction (not in the action from a prior read) removes the race between "complete" and "edit date" in two tabs, and covers stale and forged forms. The action maps `date_locked` to an error on the date field ("Mark the task as incomplete to change its date"). Uncompleting deletes the completion row, after which the same function accepts date changes again. No scheduling data is ever modified by `setTaskCompleted`.

### D5. Server Actions in `app/(app)/tasks/actions.ts`
`createTaskAction`, `updateTaskAction`, `deleteTaskAction`, `setTaskCompletedAction`. `setTaskCompletedAction` resolves the user's time zone via `getUserTimeZone(user.id)` and passes `todayFor(timeZone)` to the data layer. Each starts with `getCurrentUser()` and redirects to `/login` when null, reads only the whitelisted form fields (`title`, `notes`, `lifeArea`, `dateKind`, `date`, `taskId`, `completed`; never a user id), validates, calls `db/tasks.ts` with `user.id`, then `revalidatePath('/tasks')` and, for create/update, `redirect('/tasks')`. A `not_found` result calls `notFound()` semantics (for edit/delete from a stale page, redirect to `/tasks` is acceptable; the data is never exposed). Create/update use `useActionState` with a typed `TaskFormState` (`errors`, `values`) like `AuthFormState`; the list-level actions (complete, delete) are plain forms with `<SubmitButton>`-style pending state. Unexpected database errors are not swallowed: create/update return a form-level error message; list actions surface through the route's error boundary (`error.tsx`).

*Alternatives:* Route Handlers + fetch (rejected: more code, no benefit); client-side state with optimistic updates (rejected by the architecture's "server is the source of truth" and MVP principle).

### D6. Routes and UI
- `/tasks` (Server Component): calls `getCurrentUser()`, `listTasks(user.id)`, renders header ("Organize / Tasks"), a "New task" link, the task cards, or the empty state. Add `loading.tsx` and `error.tsx` for the segment.
- `/tasks/new` and `/tasks/[id]/edit`: pages that render one shared `TaskForm` client component (title, notes textarea, the date choice (see "Date UI" below), life-area single-choice pills defaulting to Personal as in the screenshot, Cancel link, submit button). The edit page loads the task with `getTask(user.id, id)` and calls `notFound()` when it is `null`.
- Delete confirmation: the card's delete icon opens an inline confirmation (a small client component with a native `<dialog>` or an inline "Delete this task? Cancel / Delete" row) that submits `deleteTaskAction`. No `window.confirm`, so it is stylable and testable.
- Date UI (makes the two concepts understandable): a "Date" field group with three radio-style pills — **No date** (default), **Scheduled for** (hint: "Happens on this day") and **Due by** (hint: "Deadline for this task") — and a native `<input type="date">` shown only when the second or third is chosen (small client component state; submitted as `date`, with `dateKind` as the chosen kind). The input has no `min`/`max` restriction, so past, today and future dates can be picked. Choosing **No date** hides the field and the server ignores any date value, so this is how a date is removed on edit. The edit page preselects the stored kind and date. For a **completed** task the edit page renders the stored date as read-only text ("Scheduled for 05.10.2026" / "Due by …", or nothing for no date) with the hint "Mark the task as incomplete to change its date" and submits no `dateKind`/`date` fields. The browser's date input uses its own locale format; the list always shows `DD.MM.YYYY`.
- List display: the card shows a muted metadata line "Scheduled for 05.10.2026" or "Due by 05.10.2026" using `formatCalendarDate` (pure string formatting `YYYY-MM-DD` → `DD.MM.YYYY`, no `Date` object, so it cannot shift), and nothing when the task has no date. An incomplete task is listed regardless of how long ago its date was; no overdue styling and no ordering or filtering by date.
- Components: `components/tasks/task-card.tsx` (completion button as a form posting `setTaskCompletedAction`, title with strike-through when completed, life-area badge, notes, edit link, delete control), `task-form.tsx`, `life-area-badge.tsx`. Reuse `Field`, `SubmitButton` and existing tokens (`bg-surface`, `border-border`, `text-accent`); add a textarea/pill-group only where `Field` does not fit. Modals from the screenshots become routes (see D7).
- Navigation: `app/(app)/layout.tsx` gets a minimal top/side nav with Tasks and Profile links (active state), not the full sidebar/user menu. Login/register still redirect to `/profile`.
- Life-area badge colors follow the screenshot using fixed per-area tints; they are not tied to the (future) user accent setting.

### D7. Pages instead of modals for create/edit
The screenshots show dialogs. Dedicated routes need no client-side open/close state, work with the back button and direct links, and keep the form a plain Server-Action form. The card styling matches the dialog. Revisit later (intercepting routes) if the modal feel is wanted.

### D8. Not-found and unauthorized handling
Unauthenticated: redirect to `/login` (layout + each page + each action). Foreign or missing or malformed id: `notFound()` for pages; for actions, a no-op plus redirect to `/tasks`/`notFound()` with no distinguishing message. Returning the same result for both is a spec requirement.

### D9. Testing approach
Vitest is already set up for pure logic only (`vitest.config.mts` includes `lib/**/*.test.ts`, no test database). Add unit tests for `lib/tasks/validation.ts` (including due-date cases) and the id parser, and for `lib/dates/calendar-date.ts` (D10). The date round trips for all three states, the CHECK, the migration on a populated database, ownership and idempotency are verified against local MySQL (see tasks.md). The ownership and idempotency behavior in `db/tasks.ts` is verified against the local MySQL with two real users (scripted manual check or a throwaway script) because no DB test harness exists and adding one is out of scope. If the implementer prefers, `db/tasks.ts` query-building can stay thin so the logic worth testing is in `lib/`.

### D10. Two nullable date columns with a CHECK; calendar days come from one module
**Database representation (chosen).** Add to `tasks` in `db/schema.ts`:
- `scheduledDate: date("scheduled_date", { mode: "string" })` — nullable
- `dueDate: date("due_date", { mode: "string" })` — nullable
- `check("tasks_single_date_check", sql\`${t.scheduledDate} IS NULL OR ${t.dueDate} IS NULL\`)`

State mapping: both `NULL` = no date; only `scheduled_date` set = scheduled for that day; only `due_date` set = due by that day; both set is impossible. One migration generated with `npm run db:generate`: two `ADD ... date` columns and one `ADD CONSTRAINT ... CHECK`. Additive and nullable, so existing rows satisfy the check without a backfill; no indexes now (nothing queries by date yet; the Today/Weekly changes add them when they know their queries). `DATE` carries no time zone and `mode: "string"` avoids JS `Date` conversion, as already done for `task_completions.completed_on`. The existing schema already uses CHECK constraints and the project runs MySQL 8, which enforces them.

Why this over the alternatives:
- *One `due_date` column (previous design)* — rejected: it overloads one field with two meanings, which is exactly what must not happen.
- *A `date_kind` enum plus one `task_date` column* — also valid and also two states + CHECK (`kind = 'none'` iff date is null), but later queries ("due on or before today", "scheduled on day X") need `WHERE kind = ... AND date ...` and the column name says nothing. Two named columns are self-describing, trivially queryable and indexable per concept, and need no enum.
- *Separate `task_dates` table* — rejected: adds a join and a lifecycle for at most one value per task.

Application-level rule, not a database rule: recurring tasks must not carry either date. The check cannot see the recurrence rule (another table), and this change only creates `none` tasks. The recurrence change must reject dates for non-`none` rules (and clear them when a task becomes recurring); `docs/data-model.md` and `docs/architecture.md` state the rule so it cannot be missed.

**Calendar-date strategy.**
- `lib/dates/calendar-date.ts` is pure (no `server-only`, no env, no I/O) and the only place that converts between instants and calendar dates. It exports a `CalendarDate` type (`YYYY-MM-DD` string) and: `calendarDateOf(instant, timeZone)`, `todayFor(timeZone, now = new Date())`, `parseCalendarDate(value)` (strict pattern plus real-date check, rejecting 2026-02-30, 2027-02-29, month 13, extra characters) and `formatCalendarDate(date)` returning the German `DD.MM.YYYY` by rearranging the validated parts. `calendarDateOf` uses `Intl.DateTimeFormat` with the `timeZone` option (`en-CA` parts), which handles DST correctly; no manual offset arithmetic and no `toISOString().slice(0, 10)` anywhere else in the code base. `now` is a parameter so tests inject instants.
- `lib/dates/time-zone.ts` (`server-only`) exports `getUserTimeZone(userId): Promise<string>`, the **single resolver**. In the MVP it ignores `userId` and returns the application time zone from `APP_TIME_ZONE` (IANA name, validated with `Intl.DateTimeFormat`; invalid value fails with a clear error naming the variable) with default `Europe/Berlin`; `.env.example` documents it. Every caller asks for the zone through this function with the user id, so adding a per-user setting later means changing only this function (and adding a settings column) while callers, stored dates and the pure helper stay unchanged.
- **Temporary MVP assumption (documented in `docs/architecture.md`):** all users are treated as living in one application-wide time zone, default Europe/Berlin. A user in another zone will see their "day" roll over at Berlin midnight. This is accepted for the MVP and is not a data problem: stored dates are plain dates.
- Usage now: only `setTaskCompletedAction` needs a clock: it computes `todayFor(await getUserTimeZone(user.id))` for the completion date. Validating, storing and displaying scheduled/due dates needs no zone because they are plain dates and are never compared with today in this change; the future Today, Weekly Overview, overdue and Progress features will compare them with `todayFor` using the same resolver. Dashboard, Weekly Overview and Progress will call the same functions.

*Alternatives:* keep UTC (rejected: records the previous date after local midnight for users ahead of UTC); detect the browser's zone and send it with each request (rejected: client-supplied, spoofable, inconsistent across devices, and it is the user-settings feature's job); full per-user time-zone settings now (rejected as out of scope; the resolver is the extension point).

## Risks / Trade-offs

- [A future query forgets the owner filter] → The user-id-first signature and the SQL-level filter are the convention; the spec scenarios for all four operations are the regression checklist, verified with two users.
- [All users share one time zone in the MVP] → Their completion date can differ from their local day by hours when they live elsewhere; harmless for one-time tasks (only existence is used). The resolver is the single extension point for per-user zones; documented in `docs/architecture.md`; Dashboard/Progress must use the helper, never ad-hoc date math.
- [Wrong or missing `APP_TIME_ZONE`] → Validated at first use with an error naming the variable; default is Europe/Berlin so local development works without configuration.
- [Migration on a populated database] → Additive nullable columns with a CHECK that existing rows satisfy, verified by running it on a database seeded with tasks before migrating (tasks.md 1.4).
- [Date semantics beyond storage are undefined here] → Intentionally: Today eligibility, sorting, overdue state and Weekly Overview behavior belong to later changes (documented in `docs/data-model.md`); this change only stores and displays the dates.
- [A later recurrence change forgets the rule that recurring tasks have no dates] → Documented in `docs/data-model.md` and `docs/architecture.md` and in the `task-management` spec; not enforceable by the CHECK.
- [Open tasks accumulate with old dates] → Intended product behavior (nothing disappears until completed or deleted); how overdue tasks are presented is left to the Today/Weekly/overdue changes, which can rely on the original dates being preserved.
- [Complete and date-edit racing in two tabs] → The date lock is decided inside the locked update transaction (D4a); the loser gets a clear error and nothing is half-saved.
- [Users cannot fix a wrong date on a completed task without uncompleting it] → Accepted; uncompleting is one click and keeps the date.
- [Browser date input differences] → The server validates the submitted string strictly, so the input type is a convenience only.
- [Completed state coupled to `task_completions`] → Matches the documented model, but when recurrence arrives "completed" for a recurring task will mean per date. `setTaskCompleted` and the derived `completed` flag are confined to the one-time case and named accordingly so the recurrence change can extend them rather than rewrite them.
- [Screenshot elements deliberately omitted (recurrence, progress bar, search, filters; the single due-date field is replaced by the three-way date choice)] → The list will look sparser than the reference; listed in the proposal so the reviewer can object.
- [Two quick submits on the same task] → Explicit-state action plus duplicate-key no-op keeps one completion row.
- [Stale page, task deleted elsewhere] → Actions return not found/redirect; no crash.

## Migration Plan

One additive Drizzle migration adds the nullable `tasks.scheduled_date` and `tasks.due_date` columns and the CHECK constraint (apply with `npm run db:migrate` before deploying the code). Existing rows are untouched and have neither date. Rollback: revert the code; the unused nullable columns and constraint may stay (dropping them is a separate, optional migration).

## Open Questions

- Is `Europe/Berlin` the right temporary default time zone? (Assumed from the project's German-language prototype; must be confirmed before apply.)
- Should login/registration land on `/tasks` instead of `/profile` once the dashboard exists? Deferred; that is a `user-authentication` requirement change for a later proposal.
- Should list ordering (for example by date), search or life-area filtering be added? Deferred; the screenshot shows them, but they are not required for basic management.
