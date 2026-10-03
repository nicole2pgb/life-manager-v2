# Data Model

## Overview

The MVP uses four main data concepts:

- User
- Task
- Recurrence Rule
- Task Completion

Relationships:

User
└── Tasks
├── Recurrence Rule
└── Task Completions

All user data must be isolated by user.

---

## User

Represents a registered Life Manager user.

Required information:

- id
- name
- email
- password hash
- created at

Rules:

- Email must be unique.
- Passwords must never be stored as plain text.
- A user can only access their own data.

---

## Task

Represents something the user wants to complete.

Information:

- id
- user id
- title
- notes (optional)
- created at
- updated at
- life area
- scheduled date (optional, one-time tasks only)
- due date (optional, one-time tasks only)

A task can be:

- One-time
- Recurring

A task always belongs to exactly one user.

### Dates of One-Time Tasks

A one-time task has exactly one of three date behaviors. Scheduled date and due date are two different concepts and are stored separately.

| Behavior | Scheduled date | Due date | Meaning |
| --- | --- | --- | --- |
| No date | empty | empty | Unscheduled, open task. |
| Scheduled for a date | set | empty | The task is meant to happen on exactly that calendar date. Example: "Doctor appointment" on 10.10.2026. |
| Due by a date | empty | set | The task has a deadline. Example: "Submit application" due on 10.10.2026. |

Rules:

- A task never has both a scheduled date and a due date.
- Both are calendar dates (no time of day, no time zone).
- Both are different from a completion date, which records when a task was actually completed. Completing a task does not change them, and they do not change completion.
- A date may be in the past, today or the future; the only restriction is that it is a valid calendar date the database supports.
- While a task is incomplete, the user can add, change, switch (scheduled ↔ due) or remove its date at any time.
- Once a task is completed, its date is preserved and cannot be changed. If the task is marked incomplete again, its date can be edited again.
- Passing a task's date never hides, completes or deletes the task. An incomplete task stays an open task until the user completes or deletes it, and its original scheduled date or due date is kept, so later features can tell the original date from the current day.
- In the MVP UI dates are shown in German format, for example 05.10.2026.

### Today relevance of one-time tasks

Defined in `lib/tasks/planning.ts` (`todayStatus`); the Dashboard / Today feature uses it.

- Scheduled task: listed on its scheduled date and on every following day while it is incomplete (carried over). Not listed before its date. Carried-over tasks keep their original date and are not marked overdue.
- Due-date task: listed every day, before and after the deadline, while it is incomplete. Only an incomplete task whose due date is before today is marked overdue.
- Undated incomplete task: always listed.
- A completed task is listed only on the day it was completed (shown as completed); on later days it is not listed.
- Open tasks come before tasks completed today; overdue tasks come first among open tasks.

### Weekly planned occurrences

Defined in `lib/tasks/planning.ts` (`weekOccurrences`, `summarizeWeek`) for a seven-day week starting on the user's week start (Monday by default; examples below assume Monday); the Dashboard weekly progress uses it, and Weekly Overview and Progress reuse it. The creation date is the calendar date of `created_at` in the application time zone.

- Daily: one occurrence per day of the week on or after the creation date.
- Specific weekdays: one occurrence per selected weekday on or after the creation date.
- Times per week: the weekly target; in the creation week, `min(target, days from the creation date through the last day of the week)`; nothing in earlier weeks.
- One-time task with a scheduled or due date: exactly one occurrence in the week containing that date, even if the date is before the creation date. A due-date task counts once, not per day. It adds nothing to other weeks.
- Undated one-time task: no planned occurrences.
- Completed occurrences: daily/weekday completions count only on planned days under the task's current rule; times-per-week completions on or after the creation date are capped at the week's effective target; a completed dated one-time task counts in its dated week regardless of the completion date. Completed never exceeds planned.
- Numbers always use the task's current definition, so editing a task recomputes the week. Carried-over, overdue and undated tasks appear in Today but add no planned occurrences to the current week.
- The weekly percentage is rounded to a whole number and is not defined (no value) when nothing is planned.

### Weekly Overview placement

The Weekly Overview (`lib/tasks/weekly-overview.ts`) is read-only and shows one seven-day week starting on the user's week start. It follows the planned-occurrence rules above, so its entries add up to the Dashboard's weekly numbers:

- Daily and specific-weekday tasks appear on their planned days, never before the creation date.
- A dated one-time task appears only on its scheduled or due date, shown as done when it is completed (whatever the completion date). Incomplete dated tasks stay on their date: no carry-forward, no overdue or missed state.
- Times-per-week tasks appear only in the Weekly frequency section ("x of N" for the viewed week, with the reduced target in the creation week).
- Incomplete undated one-time tasks are listed under Open tasks, independent of the week; they plan no occurrences.

Recurring tasks never have a scheduled date or due date; see Recurrence Rule.

---

## Recurrence Rule

Defines when a recurring task should appear.

A recurring task is scheduled only by its recurrence rule. It does not use the scheduled date or due date of one-time tasks, and the two must not be combined.

Supported types:

### None / One-time

The task does not repeat.

### Daily

The task is relevant every day.

### Specific Weekdays

The task is relevant only on the selected weekdays (stored as ISO weekday numbers, Monday = 1 … Sunday = 7, sorted and distinct; at least one).

Example:

Monday + Thursday

### Times Per Week

The task has a weekly completion target (1–7) without fixed weekdays. It is relevant on each day of the current calendar week while the number of completion dates in that week is below the target, and on a day on which it was completed. Once the target is reached it is not relevant on the remaining days of the week; a new week resets the count. Weeks start on the user's week start setting (Monday by default).

Example:

Gym → 3 times per week

### Rules

- Relevance is defined once, in `lib/tasks/recurrence.ts` (`isRelevantOn`); Today reuses it. The general task management list is not filtered by relevance. Weekly Overview does not use `isRelevantOn`: it places tasks per day by the planned-occurrence rules (see "Weekly Overview placement").
- A recurring task has no scheduled date or due date.
- A task may change between recurring types at any time; existing completions are kept and the new rule governs relevance from then on.
- An incomplete one-time task may become recurring (its date is cleared); a completed one-time task may not until it is marked incomplete.
- A recurring task may become one-time only if it has no completion history at all; otherwise the change is rejected. History is never deleted or migrated by an edit.
- Relevance (`isRelevantOn`) does not depend on the creation date. The creation date only limits planned occurrences of a week; see "Weekly planned occurrences".

---

## Task Completion

Represents the completion of a task on a specific date.

Information:

- id
- task id
- completion date
- created at

This allows recurring tasks to remain as tasks while individual occurrences can be completed independently.

Example:

Gym
Weekly target: 3

Monday → completed
Wednesday → completed
Friday → completed

The Gym task itself is not deleted or permanently marked as completed.

Rules for recurring tasks:

- A completion is recorded only for the current calendar date, and only while the task is relevant that day (a weekday task not on other days; a times-per-week task not beyond its weekly target). Re-completing a day that is already done changes nothing.
- Un-completing removes only the current day's completion and is always allowed.
- A shown weekly count never exceeds the target. If the target is lowered below the stored count, all completion rows stay and the count is shown as the target.

---

## User Settings

Represents persisted preferences for a user.

Information includes:

- user id
- theme color
- week start
- daily check-in enabled
- daily check-in time
- selected life areas

Supported theme colors:

- Pink
- Purple
- Blue
- Green
- Red

Supported life areas:

- Career
- Fitness
- Health
- Learning
- Personal
- Finance

Defaults (used for a user who never saved settings; the row is created on the first save, not at registration): theme Pink, week start Monday, daily check-in off at 09:00, all six life areas selected.

Rules:

- Settings belong to exactly one user.
- Settings must persist between sessions.
- Changing the theme color should update the application's accent color.
- Daily check-in configuration does not send actual notifications in the MVP.
- Week start (Monday or Sunday) decides the first day of every week-based calculation and view (see `architecture.md`); it never rewrites tasks, recurrence rules or completions, and recurrence weekdays stay ISO numbers.
- Selected life areas (at least one) limit the choices in the task create/edit forms only. Existing tasks keep their area and Progress still covers all six areas.

---

## Progress

Progress is calculated from tasks, recurrence rules and task completions.

It is not a separate primary data entity in the MVP.

Calculated values for the Progress screen (`lib/tasks/progress.ts`), always for the current week (seven days from the user's week start); nothing is stored:

- **Weekly completion rate and weekly completion visualization:** the week's completed and planned occurrences from `summarizeWeek`, the same numbers as the Dashboard. No percentage when nothing is planned.
- **Current streak:** consecutive calendar days with at least one completion of any of the user's tasks (any completion row, whether or not the weekly numbers count it). It ends today if today has a completion; otherwise it continues from yesterday, so an unfinished today never breaks it. A fully elapsed day without a completion breaks it. It can span weeks. Deleting a task deletes its completions and can shorten the streak.
- **Weekly change:** current week's completion rate minus the previous week's, in percentage points. It is calculated from the unrounded ratios and only the difference is rounded (`Math.round`); shown as `−8% pts`, `+8% pts` or `0% pts`. "No comparison" when either week has no planned occurrences. The previous week uses current task definitions, like all planned-occurrence numbers.
- **Daily completion:** completed versus planned per day, from `dayOccurrence`. Only day-bound occurrences are placed (daily, specific weekdays, dated one-time tasks on their date); times-per-week tasks are on no day. Future planned days show as incomplete; a day with nothing planned shows a "no planned" state, not 0%. Daily totals can therefore be lower than the weekly totals.
- **Completion by life area:** `summarizeWeek` per life area, for all six areas (times-per-week tasks included, so the areas add up to the weekly totals). An area with nothing planned shows "Nothing planned", not 0%.

---

## Data Principles

- Persist application data in MySQL.
- Use Drizzle ORM for database access.
- Store dates consistently. Calendar dates (scheduled dates, due dates, completion dates) are plain dates without time zone; see "Calendar Dates" in `architecture.md` for how "today" is determined.
- Do not duplicate calculated progress data unless necessary.
- Deleting a task must also handle its associated recurrence and completion data safely.
