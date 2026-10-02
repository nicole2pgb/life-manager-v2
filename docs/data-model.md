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

Planned later behavior (documented here so later features stay consistent; not part of the Task Management change):

- Scheduled task: becomes relevant on its scheduled date. If it is not completed on that date, it remains an open task after that date until completed or deleted.
- Due-date task: is open up to its deadline (eligible to appear every day up to and including the due date) and, if still incomplete afterward, remains open as overdue until completed or deleted.
- Today, Weekly Overview, overdue presentation and Progress build on these semantics; how each presents them (including where undated tasks appear in the Weekly Overview) is defined in those changes.

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

The task has a weekly completion target (1–7) without fixed weekdays. It is relevant on each day of the current calendar week while the number of completion dates in that week is below the target, and on a day on which it was completed. Once the target is reached it is not relevant on the remaining days of the week; a new week resets the count. Weeks run Monday–Sunday in the MVP (the week-start helpers take a parameter for a later user setting).

Example:

Gym → 3 times per week

### Rules

- Relevance is defined once, in `lib/tasks/recurrence.ts` (`isRelevantOn`); Today and Weekly Overview reuse it. The general task management list is not filtered by relevance.
- A recurring task has no scheduled date or due date.
- A task may change between recurring types at any time; existing completions are kept and the new rule governs relevance from then on.
- An incomplete one-time task may become recurring (its date is cleared); a completed one-time task may not until it is marked incomplete.
- A recurring task may become one-time only if it has no completion history at all; otherwise the change is rejected. History is never deleted or migrated by an edit.
- Whether relevance applies to dates before a task's creation is decided by the Weekly Overview change.

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

Rules:

- Settings belong to exactly one user.
- Settings must persist between sessions.
- Changing the theme color should update the application's accent color.
- Daily check-in configuration does not send actual notifications in the MVP.

---

## Progress

Progress is calculated from tasks, recurrence rules and task completions.

It is not a separate primary data entity in the MVP.

Calculated values include:

- Weekly completion rate
- Current streak
- Weekly change compared with the previous week
- Daily completion for the current week
- Weekly completion visualization
- Completion progress by life area

---

## Data Principles

- Persist application data in MySQL.
- Use Drizzle ORM for database access.
- Store dates consistently. Calendar dates (scheduled dates, due dates, completion dates) are plain dates without time zone; see "Calendar Dates" in `architecture.md` for how "today" is determined.
- Do not duplicate calculated progress data unless necessary.
- Deleting a task must also handle its associated recurrence and completion data safely.
