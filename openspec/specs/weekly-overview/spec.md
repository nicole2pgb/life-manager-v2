# weekly-overview Specification

## Purpose

Defines the Weekly Overview screen: a read-only view of one Monday–Sunday week that shows which tasks belong to which day, how often weekly-frequency tasks were done, and which open tasks have no date, so users can see their week at a glance without overloading a single day.

## Requirements

### Requirement: The weekly overview requires an authenticated user and shows only their data
The system SHALL provide `/weekly-overview` for authenticated users only. A visitor without a valid session MUST be redirected to `/login` and MUST NOT receive any task data. Every task, rule and completion read for the page MUST be limited to the authenticated user, identified only from the server-side session. "Today" SHALL be determined through the central calendar-date definition of the application time zone.

#### Scenario: Unauthenticated visit
- **WHEN** a visitor without a valid session opens `/weekly-overview`
- **THEN** they are redirected to `/login` and no task data is returned

#### Scenario: Two users see different weeks
- **WHEN** user A and user B each open `/weekly-overview` in their own sessions
- **THEN** each sees only their own tasks and completions

### Requirement: The viewed week is selected by a URL parameter and always runs Monday to Sunday
The page SHALL show exactly one calendar week, running Monday to Sunday. The week SHALL be selected with the query parameter `week` holding a calendar date (`YYYY-MM-DD`); any valid date selects the week that contains it, so the shown week does not depend on which weekday the date is. Without the parameter, or when the value is missing, repeated, not a valid calendar date, or selects a week that is not fully inside the supported date range, the page SHALL show the current week (the week containing today) without an error. Any other week, in the past or in the future, SHALL be viewable.

The week start is fixed to Monday in this change. The page MUST NOT read the user's week-start setting. Configurable week start is deferred to the Settings feature, which MUST change all week-based behavior (Dashboard, recurring-task week counting, planned occurrences and Weekly Overview) together so they stay consistent.

#### Scenario: Current week by default
- **WHEN** today is Friday 2026-10-02 and the user opens `/weekly-overview` without parameters
- **THEN** the week 2026-09-28 to 2026-10-04 is shown

#### Scenario: Any date selects its week
- **WHEN** the user opens `/weekly-overview?week=2026-10-07` (a Wednesday)
- **THEN** the week 2026-10-05 to 2026-10-11 is shown

#### Scenario: Invalid week value
- **WHEN** the value is `abc`, `2026-02-30`, empty, or the parameter is given twice
- **THEN** the current week is shown and no error appears

#### Scenario: Week outside the supported range
- **WHEN** the value selects a week of which any day is outside the supported date range
- **THEN** the current week is shown

#### Scenario: Week start setting is ignored
- **WHEN** the user's stored week-start setting is Sunday
- **THEN** the page still shows Monday to Sunday weeks

### Requirement: Users can move between weeks
The page SHALL show the date range of the viewed week in a readable German long-date style (day with a period, German month name, for example "28. September – 4. Oktober 2026") rather than in numeric form, and SHALL NOT repeat the year when both ends of the range are in the same year; when the range spans two years, both years are shown (for example "28. Dezember 2026 – 3. Januar 2027"). The page SHALL also provide controls for the previous and the next week, each moving by exactly one week and expressed through the `week` parameter. When the viewed week is not the current week, the page SHALL show a "This week" link that returns to the current week; it MUST NOT be shown when the current week is viewed. A previous or next control whose week would not be fully inside the supported date range SHALL NOT be offered. The controls MUST have accessible names.

#### Scenario: Range within one year
- **WHEN** the week 2026-09-28 to 2026-10-04 is shown
- **THEN** the header reads "28. September – 4. Oktober 2026"

#### Scenario: Range across a year boundary
- **WHEN** the week 2026-12-28 to 2027-01-03 is shown
- **THEN** the header reads "28. Dezember 2026 – 3. Januar 2027"

#### Scenario: Next and previous week
- **WHEN** the week 2026-09-28 to 2026-10-04 is shown and the user activates "next week" and then "previous week"
- **THEN** the weeks 2026-10-05 to 2026-10-11 and back to 2026-09-28 to 2026-10-04 are shown

#### Scenario: This week link
- **WHEN** a week other than the current one is shown
- **THEN** a "This week" link is present, and activating it shows the current week

#### Scenario: No This week link on the current week
- **WHEN** the current week is shown
- **THEN** no "This week" link is shown

### Requirement: Seven day columns show the tasks that belong to each day
The page SHALL show the seven days of the viewed week in order, each with its weekday and day of month. Each day lists the following tasks of the user and no others:

- **Daily** tasks on every day that is on or after the task's creation date.
- **Specific-weekdays** tasks on each selected weekday that is on or after the task's creation date.
- **One-time tasks with a scheduled date** on that date only, and **one-time tasks with a due date** on the due date only, whether or not the date is before the task's creation date.

A task MUST NOT appear on any other day. In particular: no task appears before its creation date; an incomplete dated task stays on its original date and is not carried into later days or weeks; **times-per-week** tasks and undated one-time tasks never appear in a day column. There is no "missed" or "overdue" state on this page. The creation date is the calendar date of the task's creation instant in the application time zone. Tasks use their current definition, so editing a task changes the week immediately. Within a day, tasks are ordered newest created first.

Every listed task SHALL show its title and its life area, and a task with a due date SHALL be marked as due, so it is distinguishable from a scheduled one. A day without tasks SHALL show that nothing is planned.

#### Scenario: Daily task
- **WHEN** a daily task was created before the viewed week
- **THEN** it appears on all seven days

#### Scenario: Daily task created mid-week
- **WHEN** a daily task was created on Thursday of the viewed week
- **THEN** it appears on Thursday to Sunday and not on Monday to Wednesday

#### Scenario: Task created after the viewed week
- **WHEN** a daily task was created after the viewed week
- **THEN** it does not appear anywhere in that week

#### Scenario: Specific weekdays
- **WHEN** a task is set for Monday and Thursday and was created before the viewed week
- **THEN** it appears on Monday and Thursday only

#### Scenario: Scheduled one-time task
- **WHEN** a one-time task is scheduled for 2026-10-07
- **THEN** it appears on that Wednesday in the week 2026-10-05 to 2026-10-11 and in no other day or week

#### Scenario: Due-date one-time task
- **WHEN** a one-time task is due on 2026-10-09
- **THEN** it appears once, on that Friday, marked as due, and not on the days before or after

#### Scenario: Incomplete dated task is not carried forward
- **WHEN** a one-time task scheduled for last Tuesday is still incomplete and the current week is shown
- **THEN** it appears only on last Tuesday in last week's view, is not shown in the current week, and no missed marker is shown

#### Scenario: Dated task before its creation date
- **WHEN** a task created on 2026-10-06 is scheduled for 2026-10-02
- **THEN** it appears on 2026-10-02 in that week

#### Scenario: Times-per-week and undated tasks are not in day columns
- **WHEN** the user has a 3-times-per-week task and an incomplete undated one-time task
- **THEN** neither appears in any day column

#### Scenario: Day without tasks
- **WHEN** no task belongs to a day
- **THEN** the day column states that nothing is planned

#### Scenario: Editing a task
- **WHEN** a task's recurrence rule or date is changed
- **THEN** the next view of the week shows the task according to the new definition

### Requirement: Completion state is shown but cannot be changed on this page
The page SHALL show whether each listed task is done, distinguishable by more than color, and MUST NOT offer any control to complete or un-complete a task. Links to other pages (see the task title requirement) are not such controls. The state is derived from stored completions:

- A **daily or specific-weekdays** task is done on a day when it has a completion for that date. A completion on a day on which the task is not planned under its current rule is not shown.
- A **dated one-time task** is done, on its scheduled or due date, when the task is completed, whatever the actual completion date.

Completion remains available from Dashboard / Today and Tasks. Past and future days are shown from stored data only; a future day has no completion.

#### Scenario: Done recurring occurrence
- **WHEN** a daily task has a completion for Tuesday of the viewed week
- **THEN** it is shown as done on Tuesday and not done on the other days

#### Scenario: Completion on an unplanned day
- **WHEN** a task for Monday and Thursday has a stored completion on Tuesday
- **THEN** Tuesday does not list the task and nothing is shown as done for that completion

#### Scenario: Dated task completed on another day
- **WHEN** a task scheduled for Wednesday was completed on Friday
- **THEN** it is shown as done on Wednesday and does not appear on Friday

#### Scenario: Read-only
- **WHEN** the page is rendered
- **THEN** it contains no control that marks a task completed or incomplete, and activating a task title does not change its completion

#### Scenario: Today is highlighted
- **WHEN** the viewed week contains today
- **THEN** today's column is visibly highlighted and marked as the current date for assistive technology, and no column is highlighted in other weeks

### Requirement: Weekly frequency shows times-per-week tasks with their progress for the viewed week
The page SHALL show a "Weekly frequency" section listing every times-per-week task that plans at least one occurrence in the viewed week. For each it SHALL show the title, the life area, the completed count and the planned count as "x of N", and a progress bar. N and x follow the shared planned-occurrence definition: N is the weekly target for any week after the task's creation week and the reduced target in the creation week; x is the number of completions in the viewed week on or after the creation date, never more than N. A task whose creation week lies after the viewed week plans nothing and is not listed. Future weeks therefore show 0 of N. Tasks are ordered newest created first. When there is no such task the section SHALL say so.

#### Scenario: Progress in the viewed week
- **WHEN** a 5-times-per-week task created in an earlier week has 2 completions in the viewed week
- **THEN** the section shows "2 of 5" with a progress bar at 40%

#### Scenario: Past and future weeks
- **WHEN** the user views the previous week or a future week
- **THEN** the counts are those of that week; a future week shows 0 of N

#### Scenario: Creation week
- **WHEN** a 3-times-per-week task was created on Saturday of the viewed week
- **THEN** the section shows its progress against a target of 2

#### Scenario: Before the task existed
- **WHEN** the viewed week ends before the task was created
- **THEN** the task is not listed

#### Scenario: Count never exceeds the target
- **WHEN** the target was lowered below the stored completion count
- **THEN** the shown count equals the target

#### Scenario: No weekly-frequency tasks
- **WHEN** the user has no times-per-week tasks planned in the viewed week
- **THEN** the section says so

### Requirement: Open tasks lists incomplete undated one-time tasks independent of the week
The page SHALL show an "Open tasks" section listing the user's incomplete one-time tasks that have neither a scheduled date nor a due date, newest created first, each with its title and life area. The list is the same in every viewed week. These tasks are not assigned to a day column, plan no occurrences and MUST NOT affect any planned or completed count. Completed undated tasks are not listed. Dated tasks, recurring tasks and completed tasks never appear in this section. When there is none, the section SHALL say so.

#### Scenario: Undated incomplete task
- **WHEN** the user has an incomplete one-time task without dates
- **THEN** it is listed under Open tasks in every viewed week, and in no day column

#### Scenario: Completed or dated task
- **WHEN** an undated task is completed, or a task has a scheduled or due date
- **THEN** it is not listed under Open tasks

#### Scenario: No effect on weekly numbers
- **WHEN** undated incomplete tasks are added or removed
- **THEN** no planned or completed count of any week changes

#### Scenario: No open tasks
- **WHEN** the user has no incomplete undated one-time task
- **THEN** the section says there are no open tasks

### Requirement: Task titles link to the task's edit page
Every task title shown on the page (in a day column, in Weekly frequency and in Open tasks) SHALL be a link to that task's existing edit page (`/tasks/<id>/edit`). The link only navigates; it MUST NOT change the task or its completion. Access to the edit page remains governed by the task-management capability (a task of another user is not found).

#### Scenario: Title in a day column
- **WHEN** the user activates the title of a task in a day column
- **THEN** they are taken to that task's edit page

#### Scenario: Title in Weekly frequency and Open tasks
- **WHEN** the user activates the title of a task in the Weekly frequency or Open tasks section
- **THEN** they are taken to that task's edit page

#### Scenario: Link does not change state
- **WHEN** the user opens the edit page from the overview and returns without saving
- **THEN** no task and no completion has changed

### Requirement: The overview agrees with the shared weekly planned-occurrence definition
For every viewed week, the occurrences shown on the page SHALL equal the occurrences defined by the weekly planned-occurrence definition used for the Dashboard's weekly progress: the number of task entries across all day columns plus the planned counts of the Weekly frequency section equals the planned total, and the entries shown as done plus the completed counts of the Weekly frequency section equals the completed total. Open tasks contribute nothing. The page does not introduce its own weekly counts.

#### Scenario: Same week as the dashboard
- **WHEN** the current week is shown on `/weekly-overview` and on `/dashboard`
- **THEN** the planned and completed totals derived from the day columns and the Weekly frequency section equal the dashboard's weekly progress numbers

#### Scenario: Mixed tasks
- **WHEN** a week has one daily task created before the week, one due-date task in the week and one 3-times-per-week task with 1 completion
- **THEN** the day columns hold 7 + 1 entries, the Weekly frequency section plans 3, and the totals are 11 planned occurrences and the completions of the week

### Requirement: Weekly Overview is in the main navigation and refreshes after task changes
The main navigation SHALL contain a "Weekly Overview" entry, after Tasks and before Profile, with the current page indicated. After a task is created, edited, deleted, completed or marked incomplete, the next view of `/weekly-overview` MUST show the new state; the return targets of those actions are unchanged.

#### Scenario: Navigation entry
- **WHEN** a signed-in user views any application page
- **THEN** the navigation shows Dashboard, Tasks, Weekly Overview and Profile, with the current page marked

#### Scenario: Completed on the dashboard
- **WHEN** a user completes a daily task from the dashboard and then opens the weekly overview
- **THEN** today's entry for that task is shown as done

#### Scenario: Task deleted
- **WHEN** a user deletes a task and opens the weekly overview
- **THEN** the task appears nowhere on the page

### Requirement: The weekly overview follows the visual reference, has empty, loading and error states, and is usable on small screens
The page SHALL follow the dark theme, cards, accent color and structure of `docs/ui-reference/weekly-overview.png` (heading, week navigation, seven day columns, Weekly frequency and Open tasks cards) where it does not conflict with the requirements above, with accessible controls. Task dates elsewhere on the page use the German numeric format (for example 05.10.2026); the week range header uses the long style defined above. The seven days SHALL be side by side on wide screens and stacked vertically on small screens, and the page MUST remain usable at 375 px width without horizontal scrolling. When the user has no tasks at all, the page SHALL explain this and link to creating a task. The route SHALL have loading and error states.

#### Scenario: Wide screen
- **WHEN** the page is viewed on a desktop-width screen
- **THEN** the seven days are shown side by side in Monday-to-Sunday order

#### Scenario: Small screen
- **WHEN** the page is viewed at 375 px width
- **THEN** the days are stacked vertically in order and all content is reachable without horizontal scrolling

#### Scenario: No tasks at all
- **WHEN** a new user without tasks opens the page
- **THEN** an empty state explains there are no tasks yet and links to creating one

#### Scenario: Data loading fails
- **WHEN** loading the week fails
- **THEN** an error state with a way to retry is shown instead of a blank or crashed page
