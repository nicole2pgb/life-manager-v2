# dashboard-today Specification

## Purpose

Defines the Dashboard / Today screen: which tasks are relevant today, completing them directly, the weekly progress summary and the shared definition of planned occurrences it is based on, so that Weekly Overview and Progress can reuse the same semantics.

## Requirements

### Requirement: The dashboard requires an authenticated user and shows only their data
The system SHALL provide `/dashboard` for authenticated users only. A visitor without a valid session MUST be redirected to `/login` and MUST NOT receive any task data. Every task, rule and completion read for the dashboard MUST be limited to the authenticated user, identified only from the server-side session. "Today" and the current week SHALL be determined through the central calendar-date definition of the application time zone, and the week runs Monday to Sunday.

#### Scenario: Unauthenticated visit
- **WHEN** a visitor without a valid session opens `/dashboard`
- **THEN** they are redirected to `/login` and no task data is returned

#### Scenario: Two users see different dashboards
- **WHEN** user A and user B each open `/dashboard` in their own sessions
- **THEN** each sees only their own tasks and progress

#### Scenario: Day boundary
- **WHEN** the application time zone is Europe/Berlin and the instant is 2026-10-01 23:30 UTC
- **THEN** the dashboard treats 2026-10-02 as today

### Requirement: Today lists the tasks that are relevant today
The dashboard SHALL list, as "Today's tasks", the following tasks of the user and no others.

Recurring tasks: a recurring task is listed when it is relevant today under the recurring-tasks relevance definition, or when it has a completion for today (so that it stays visible as done today, for example a times-per-week task that just reached its weekly target, or a task whose rule changed after being completed today). A times-per-week task whose weekly target was reached on an earlier day is not listed.

One-time tasks, which are not governed by the recurrence relevance definition:
- An incomplete task with a scheduled date is listed on its scheduled date and on every following day while it remains incomplete (carried over). It is not listed before its scheduled date.
- An incomplete task with a due date is listed on every day, including before the deadline, and after the deadline while it remains incomplete.
- An incomplete task without a date is listed.
- A completed one-time task is listed only when it was completed today, shown as completed. A task completed on an earlier day is not listed.

A task that is not complete SHALL never disappear because its date has passed.

#### Scenario: Daily and weekday tasks
- **WHEN** it is Tuesday and the user has a daily task and a Monday-and-Thursday task
- **THEN** the daily task is listed and the Monday-and-Thursday task is not

#### Scenario: Times-per-week target reached earlier in the week
- **WHEN** a 3-times-per-week task was completed on Monday, Tuesday and Wednesday and it is Friday
- **THEN** it is not listed

#### Scenario: Times-per-week target reached today
- **WHEN** a 3-times-per-week task receives its third completion today
- **THEN** it is still listed, shown as done today

#### Scenario: Times-per-week target not yet reached
- **WHEN** a 3-times-per-week task has 1 completion this week and none today
- **THEN** it is listed as open

#### Scenario: Scheduled task on its date
- **WHEN** a one-time task is scheduled for today
- **THEN** it is listed as open

#### Scenario: Scheduled task in the future
- **WHEN** a one-time task is scheduled for tomorrow
- **THEN** it is not listed

#### Scenario: Scheduled task carried over
- **WHEN** an incomplete one-time task was scheduled for three days ago
- **THEN** it is listed as open

#### Scenario: Due-date task before and after the deadline
- **WHEN** an incomplete one-time task is due in five days, and another incomplete one is due yesterday
- **THEN** both are listed as open

#### Scenario: Undated task
- **WHEN** an incomplete one-time task has no date
- **THEN** it is listed as open

#### Scenario: Completed today versus earlier
- **WHEN** one one-time task was completed today and another was completed yesterday
- **THEN** the first is listed as completed and the second is not listed

#### Scenario: Marked incomplete again
- **WHEN** a one-time task completed today is marked incomplete
- **THEN** it is listed as open again

### Requirement: Today's tasks are ordered, labelled and show their life area
Open tasks SHALL be listed before tasks completed today. Among open tasks, overdue tasks SHALL come first; remaining ordering within each group is newest created first. A due-date task whose due date is before today and which is incomplete SHALL be marked "Overdue". A carried-over scheduled task SHALL show its original scheduled date and MUST NOT be marked overdue. Every listed task SHALL show its title and its life area, and recurring tasks SHALL show their recurrence summary, with the weekly count for times-per-week tasks as already defined for the task list. Completed tasks SHALL be distinguishable by more than color. Dates are shown in German format (for example 05.10.2026).

#### Scenario: Open before completed
- **WHEN** the list contains one task completed today and two open tasks
- **THEN** the two open tasks appear above the completed one

#### Scenario: Overdue first among open tasks
- **WHEN** an overdue due-date task and a daily task are both open
- **THEN** the overdue task appears first and carries the "Overdue" marker

#### Scenario: Carried-over scheduled task is not overdue
- **WHEN** an incomplete task was scheduled for 28.09.2026 and today is 02.10.2026
- **THEN** it shows "28.09.2026" as its scheduled date and no "Overdue" marker

#### Scenario: Due today is not overdue
- **WHEN** an incomplete task is due today
- **THEN** it is listed without the "Overdue" marker

#### Scenario: Life area shown
- **WHEN** a task with life area Fitness is listed
- **THEN** a Fitness label is shown on its row

### Requirement: Tasks can be completed and un-completed from the dashboard
Each listed task SHALL have a control to mark it done or not done, with an accessible name. It SHALL use the same server-side behavior as completing a task from the task list: one-time tasks get a single completion for today, recurring tasks get a completion for today only while relevant (or already done), un-completing a recurring task removes only today's completion, and repeated requests are idempotent. After the action the user SHALL stay on the dashboard, and the list, the Today count, the "priorities left" count and the weekly progress SHALL reflect the new state, including after a reload. A rejected completion (a recurring task that is no longer relevant today) SHALL show a message on the dashboard and leave the persisted state unchanged. A failed action SHALL show an error message instead of a blank page.

#### Scenario: Complete a one-time task
- **WHEN** the user marks an open one-time task done on the dashboard
- **THEN** it moves to the completed group, counts update, and it stays completed after a reload

#### Scenario: Complete a recurring task
- **WHEN** the user marks a daily task done on the dashboard
- **THEN** a completion for today exists, it is shown as done, and the weekly progress numerator increases by one

#### Scenario: Un-complete
- **WHEN** the user marks a task done today as not done
- **THEN** it is open again and only today's completion is removed

#### Scenario: Rejected completion
- **WHEN** a request marks a Monday-and-Thursday task done on a Tuesday
- **THEN** no completion is recorded, a message is shown on the dashboard, and the state is unchanged

#### Scenario: Stays on the dashboard
- **WHEN** a task is completed from the dashboard
- **THEN** the user remains on `/dashboard`, and `/tasks` shows the same state when opened

### Requirement: Planned occurrences of a week follow one shared definition
The system SHALL define, in one shared place independent of any screen, how many occurrences a task plans in a calendar week (Monday to Sunday) and how many of them are completed. The creation date of a task is the calendar date of its creation instant in the application time zone. The definition is:

- **Daily:** one planned occurrence for each day of the week that is on or after the creation date. A task created before the week plans 7; a task created on Thursday plans 4 (Thursday to Sunday); a task created after the week plans 0.
- **Specific weekdays:** one planned occurrence for each selected weekday that falls on or after the creation date within the week.
- **Times per week:** the weekly target for a week that starts on or after the creation date's week, i.e. any week after the creation week; in the creation week, the smaller of the target and the number of calendar days from the creation date through Sunday; 0 for a week before the creation week.
- **One-time task with a scheduled date or a due date:** one planned occurrence in the week containing that date, whether or not the date is before the task's creation date. A due-date task contributes one occurrence, not one per day. It contributes nothing to any other week.
- **One-time task without a date:** no planned occurrences.

Completed occurrences are only completions that fulfil a planned occurrence:
- Daily and specific-weekdays tasks: a completion counts when its date is a planned day of that week under the task's current rule (and, therefore, not before the creation date). Each day counts at most once.
- Times-per-week tasks: the number of completions in the week on or after the creation date, capped at the week's effective target (including the reduced creation-week target).
- Dated one-time tasks: one completed occurrence in the week of its scheduled or due date when the task has been completed, regardless of the actual completion date.

The planned and completed counts always use the task's current definition (rule, dates). Editing a task recomputes the numbers for the week from that definition. Deleted tasks contribute nothing. Planned counts include days of the week that are still in the future. The completed count never exceeds the planned count.

#### Scenario: Full-week daily task
- **WHEN** a daily task was created last week
- **THEN** it plans 7 occurrences this week

#### Scenario: Daily task created mid-week
- **WHEN** a daily task is created on Thursday of the current week
- **THEN** it plans 4 occurrences this week, and none before Thursday

#### Scenario: Weekday task created mid-week
- **WHEN** a Monday-and-Thursday task is created on Wednesday
- **THEN** it plans 1 occurrence this week (Thursday)

#### Scenario: Weekday task completed on a day that is no longer planned
- **WHEN** a task was completed on Tuesday and its rule is then changed to Monday and Thursday
- **THEN** the Tuesday completion does not count as a completed occurrence this week

#### Scenario: Times-per-week target in a later week
- **WHEN** a 3-times-per-week task was created in an earlier week
- **THEN** it plans 3 occurrences this week

#### Scenario: Times-per-week task created mid-week
- **WHEN** a 3-times-per-week task is created on Saturday
- **THEN** it plans min(3, 2) = 2 occurrences in that week, and 3 in the following weeks

#### Scenario: Times-per-week completions are capped
- **WHEN** a task with an effective target of 2 has 3 stored completions this week
- **THEN** it counts 2 completed occurrences

#### Scenario: Scheduled one-time task
- **WHEN** a one-time task is scheduled for a date in the current week
- **THEN** it plans exactly 1 occurrence this week, and plans none in other weeks

#### Scenario: Due-date one-time task
- **WHEN** a one-time task is due on Friday of the current week
- **THEN** it plans exactly 1 occurrence this week, not one per day

#### Scenario: Dated one-time task before its creation date
- **WHEN** a one-time task is created on Wednesday with a scheduled date of Monday of the same week
- **THEN** it plans 1 occurrence this week

#### Scenario: Dated one-time task in a past week
- **WHEN** a one-time task created this week is scheduled for a date in last week
- **THEN** it plans no occurrence this week and 1 in last week

#### Scenario: Completion date differs from the dated week
- **WHEN** a one-time task scheduled for last week is completed this week
- **THEN** it counts as completed in last week's progress and adds nothing to this week's

#### Scenario: Undated and carried-over tasks
- **WHEN** an undated one-time task or an overdue task from a past week is open and listed in Today
- **THEN** it adds no planned occurrence to the current week

#### Scenario: Edit recomputes the week
- **WHEN** a daily task is edited to a Monday-only task in the middle of the week
- **THEN** this week's planned and completed counts are recomputed from the new rule

### Requirement: The dashboard shows the weekly progress summary
The dashboard SHALL show, for the current Monday–Sunday week, the number of completed planned occurrences, the number of planned occurrences, and the completion percentage rounded to a whole number, together with the date range of the week (in German format) and the number of planned occurrences still open. It MUST use the shared definition of planned occurrences. When there are no planned occurrences in the week, it SHALL show an explanatory empty state instead of a percentage, and MUST NOT show 0% or NaN.

#### Scenario: Progress shown
- **WHEN** a week has 33 planned occurrences of which 12 are completed
- **THEN** the dashboard shows "12 of 33", 36%, the week range and 21 still open

#### Scenario: Rounding
- **WHEN** 1 of 3 planned occurrences is completed
- **THEN** the percentage shown is 33%

#### Scenario: Nothing planned
- **WHEN** the user has only undated one-time tasks, or no tasks
- **THEN** the weekly summary shows an empty state explaining that nothing is planned this week and no percentage

#### Scenario: Updates after completion
- **WHEN** a task is completed from the dashboard
- **THEN** the weekly numbers reflect it

### Requirement: The dashboard header, counts and shortcuts
The dashboard SHALL greet the user by name and show today's date, a "priorities left" line stating the number of currently open tasks in Today, a Today count of completed out of listed tasks, a "Quick add task" link to `/tasks/new` and a "View all" link to `/tasks`. It MUST NOT show a streak, an active-routines panel or a separate weekly-completion card in this change.

#### Scenario: Priorities left
- **WHEN** Today lists 6 tasks of which 2 are completed
- **THEN** the dashboard says 4 priorities are left and shows a Today count of 2/6

#### Scenario: Shortcuts
- **WHEN** the user activates "Quick add task" or "View all"
- **THEN** they are taken to `/tasks/new` or `/tasks` respectively

#### Scenario: Excluded features
- **WHEN** the dashboard is rendered
- **THEN** it contains no streak, active-routines panel or duplicate weekly-completion card

### Requirement: The dashboard has appropriate empty states
The dashboard SHALL show a distinct empty state, with a helpful message and a link to create a task where it applies, in each of these cases: the user has no tasks at all; tasks exist but none is listed in Today; every task listed in Today is completed. The empty state for the weekly summary is defined by the weekly progress requirement.

#### Scenario: No tasks at all
- **WHEN** a new user without tasks opens the dashboard
- **THEN** the list area explains there are no tasks yet and links to create one

#### Scenario: Nothing relevant today
- **WHEN** the user has tasks but none is listed today (for example only a task scheduled for tomorrow)
- **THEN** the list area says nothing is planned for today

#### Scenario: Everything done
- **WHEN** all listed tasks are completed
- **THEN** the completed tasks are still shown and a message states that everything for today is done

### Requirement: The dashboard is in the main navigation, follows the visual reference and is usable on small screens
The main navigation SHALL contain the Dashboard, before Tasks and Profile, with the current page indicated. The dashboard SHALL follow the dark theme, cards, accent color and layout of `docs/ui-reference/dashboard.png` where it does not conflict with the scope above, with accessible controls, and MUST remain usable at 375 px width without horizontal scrolling. The route SHALL have loading and error states.

#### Scenario: Navigation entry
- **WHEN** a signed-in user views any application page
- **THEN** the navigation shows Dashboard, Tasks and Profile, with the current page marked

#### Scenario: Small screen
- **WHEN** the dashboard is viewed at 375 px width
- **THEN** all content and controls are reachable without horizontal scrolling

#### Scenario: Data loading fails
- **WHEN** loading the dashboard data fails
- **THEN** an error state with a way to retry is shown instead of a blank or crashed page
