# recurring-tasks Specification

## Purpose

Defines recurring tasks: the supported recurrence rules and their validation, when a recurring task is relevant on a calendar date, how its occurrences are completed per date, and where this capability ends and later features (Today, Weekly Overview, Progress) begin.

## Requirements

### Requirement: A task has one recurrence rule of a supported type
Every task SHALL have exactly one recurrence rule whose type is one of: none (one-time), daily, specific weekdays, or times per week. A specific-weekdays rule SHALL hold between one and seven distinct weekdays (Monday to Sunday). A times-per-week rule SHALL hold a whole-number weekly target from 1 to 7. A rule MUST NOT carry data that does not belong to its type (weekdays only for specific weekdays, a target only for times per week). The rule is owned by its task and is removed with it.

#### Scenario: One-time task keeps its none rule
- **WHEN** a task is created without recurrence
- **THEN** its rule is of type none, exactly as before this change

#### Scenario: Daily rule
- **WHEN** a task is created as "every day"
- **THEN** exactly one rule of type daily exists for it, with no weekdays and no weekly target

#### Scenario: Weekdays rule
- **WHEN** a task is created for Monday and Thursday
- **THEN** its rule is of type specific weekdays holding exactly Monday and Thursday

#### Scenario: Times-per-week rule
- **WHEN** a task is created as "3 times per week"
- **THEN** its rule is of type times per week with a target of 3 and no weekdays

### Requirement: Recurrence input is validated on the server
The server SHALL validate every recurrence submission and MUST NOT rely on the form. The recurrence type MUST be one of the four supported values. For specific weekdays at least one weekday MUST be selected, each MUST be a valid weekday, and duplicates SHALL be treated as one; the stored selection is normalized so that the same set of days is always stored identically. For times per week the target MUST be a whole number from 1 to 7 (no decimals, no text, no blank). Submitted weekdays or targets that do not belong to the chosen type SHALL be ignored, not stored. A recurring task MUST NOT carry a scheduled date or due date: a submission that combines recurrence with a scheduled or due date is rejected with an error on the recurrence field and nothing is saved. Failed validation returns field errors and keeps the entered values.

#### Scenario: Unknown recurrence type
- **WHEN** a request contains a recurrence type other than the four supported ones
- **THEN** nothing is saved and the form shows an error on the recurrence field

#### Scenario: No weekday selected
- **WHEN** specific weekdays is chosen with no weekday
- **THEN** nothing is saved and the form shows an error on the weekdays field

#### Scenario: Invalid weekday value
- **WHEN** a request contains a weekday that is not one of Monday to Sunday (for example 0, 8 or "abc")
- **THEN** nothing is saved and the form shows an error on the weekdays field

#### Scenario: Duplicate weekdays
- **WHEN** Monday is submitted twice together with Thursday
- **THEN** the rule stores Monday and Thursday once each

#### Scenario: Weekly target out of range or malformed
- **WHEN** times per week is chosen with a target of 0, 8, 2.5, "two" or blank
- **THEN** nothing is saved and the form shows an error on the weekly target field

#### Scenario: Weekly target boundaries
- **WHEN** times per week is chosen with a target of 1 or 7
- **THEN** the rule is accepted

#### Scenario: Stray fields ignored
- **WHEN** a daily task is submitted together with weekdays and a weekly target
- **THEN** the rule is stored as daily without weekdays or target

#### Scenario: Recurrence combined with a date
- **WHEN** a request chooses a recurring type and also a scheduled date or due date
- **THEN** nothing is saved and the form shows an error on the recurrence field explaining that recurring tasks have no scheduled or due date

#### Scenario: Owner cannot be chosen by the request
- **WHEN** a recurrence submission carries a user identifier or a rule identifier
- **THEN** it is ignored; the rule always belongs to the authenticated user's task

### Requirement: Relevance of a recurring task on a calendar date is defined in one place
The system SHALL provide one pure definition, independent of any screen, that says whether a task is relevant on a given calendar date, given its rule, its completions and a week. A daily task is relevant on every date. A specific-weekdays task is relevant on a date exactly when that date's weekday is one of its selected weekdays. A times-per-week task has no fixed weekdays: it is relevant on every date of a calendar week as long as the number of completion dates it has in that week is below its target, and it is also relevant on a date on which it has been completed, so that a completed occurrence stays representable as done. Once the target is reached the task is not relevant on the remaining dates of that week (dates without a completion). Relevance is evaluated against the task's current rule: after the rule changes, the new rule governs relevance from then on and earlier completions remain as history. The general task management list is NOT filtered by relevance; it lists all tasks, and filtering by relevance is the job of Today and Weekly Overview. A one-time task is not governed by this definition; its dates keep the meaning defined by Task Management. Relevance MUST NOT depend on the task's creation time, on whether earlier occurrences were missed, or on the scheduled or due date fields, which a recurring task does not have. A calendar week runs Monday to Sunday in this change.

#### Scenario: Daily task
- **WHEN** relevance of a daily task is evaluated for any calendar date
- **THEN** it is relevant

#### Scenario: Weekday task on a selected day
- **WHEN** a task for Monday and Thursday is evaluated for 2026-10-05 (a Monday)
- **THEN** it is relevant

#### Scenario: Weekday task on another day
- **WHEN** the same task is evaluated for 2026-10-06 (a Tuesday)
- **THEN** it is not relevant

#### Scenario: Times-per-week task at 0, 1 and 2 of 3
- **WHEN** a 3-times-per-week task has 0, 1 or 2 completions in the current calendar week and is evaluated for a date without a completion
- **THEN** it is relevant in each case

#### Scenario: Rule change governs relevance from then on
- **WHEN** a daily task with completions is changed to Monday-and-Thursday
- **THEN** its earlier completions remain as history and it is relevant only on Mondays and Thursdays from then on

#### Scenario: Times-per-week task below target
- **WHEN** a 3-times-per-week task has 2 completions in the calendar week of 2026-10-07
- **THEN** it is relevant on 2026-10-07

#### Scenario: Times-per-week task at target
- **WHEN** a 3-times-per-week task has completions on Monday, Wednesday and Friday of the week of 2026-10-05 and is evaluated for Saturday 2026-10-10
- **THEN** it is not relevant on that Saturday

#### Scenario: Completed occurrence stays relevant on its day
- **WHEN** that task is evaluated for Friday 2026-10-09, the day of its third completion
- **THEN** it is relevant (shown as done)

#### Scenario: New week starts counting again
- **WHEN** that task is evaluated for Monday 2026-10-12
- **THEN** the previous week's completions do not count and the task is relevant

#### Scenario: Week boundary
- **WHEN** weeks are determined for Sunday 2026-10-11 and Monday 2026-10-12
- **THEN** they belong to different calendar weeks (Monday 2026-10-05 to Sunday 2026-10-11, and Monday 2026-10-12 onward)

#### Scenario: Weekday and week computed without time-zone drift
- **WHEN** the weekday or week of a calendar date is computed under any server time zone, including across the daylight-saving changes of 2026-03-29 and 2026-10-25
- **THEN** the result is the same, because it depends only on the calendar date

#### Scenario: Today is determined by Europe/Berlin
- **WHEN** it is 2026-10-01 22:30 UTC and a weekday task for Friday is evaluated for "today"
- **THEN** today is Friday 2026-10-02 (Europe/Berlin) and the task is relevant

### Requirement: Recurring tasks are completed per calendar date
Completing a recurring task SHALL record a completion for the current calendar date as determined by the application's calendar-date rules, and the task itself SHALL NOT be marked completed or changed. A completion MUST be accepted only while the task is relevant on the current calendar date (see the relevance requirement): a specific-weekdays task cannot be completed on a day that is not one of its weekdays, and a times-per-week task cannot be completed once its weekly target is reached for the current calendar week. A rejected completion records nothing, changes nothing and gives the user an error message; this rule MUST be enforced on the server, not only by hiding or disabling the control. Marking a task done that is already done today is accepted and leaves exactly one completion. Un-completing SHALL remove only the completion for the current calendar date, MUST NOT remove completions of other dates, and is always accepted (also when the task would not be relevant today, for example after its rule changed). A recurring task is shown as done today exactly when a completion for today exists. At most one completion per task and date exists, so repeated or concurrent completion requests for the same date are idempotent, and concurrent requests MUST NOT push a times-per-week task past its target. Completions for other dates than today cannot be created or removed in this change. Completing a recurring task does not affect any other task.

#### Scenario: Complete today
- **WHEN** a user completes their daily task on 2026-10-05
- **THEN** a completion for 2026-10-05 exists and the task is shown as done today

#### Scenario: Next day starts open
- **WHEN** the same task is viewed on 2026-10-06 without a completion for that date
- **THEN** it is shown as not done and remains a task that can be completed again

#### Scenario: Uncomplete removes only today
- **WHEN** a task has completions for 2026-10-04 and 2026-10-05 and the user marks it incomplete on 2026-10-05
- **THEN** only the completion for 2026-10-05 is removed

#### Scenario: Repeated completion is idempotent
- **WHEN** the completion request for today is processed twice, for example through a double click
- **THEN** exactly one completion for today exists

#### Scenario: Weekday task completed on a selected day
- **WHEN** a user completes a Monday-and-Thursday task on Monday 2026-10-05
- **THEN** a completion for 2026-10-05 is recorded

#### Scenario: Weekday task cannot be completed on another day
- **WHEN** a request marks a Monday-and-Thursday task done on Tuesday 2026-10-06
- **THEN** no completion is recorded, the request is rejected and the user sees an error message

#### Scenario: Rejection is enforced on the server
- **WHEN** a completion request for a non-relevant day is sent directly to the server, bypassing the list
- **THEN** it is rejected exactly as above

#### Scenario: Times-per-week task cannot exceed its target
- **WHEN** a 2-times-per-week task has completions on two days of the current calendar week and a request marks it done on a third day
- **THEN** no completion is recorded, the request is rejected and the user sees an error message

#### Scenario: Concurrent completions at the limit
- **WHEN** two completion requests for the same times-per-week task on different days are processed at the same time with one occurrence left in the week
- **THEN** at most one completion is recorded and the weekly count never exceeds the target

#### Scenario: Completing again on a day already done
- **WHEN** a times-per-week task that reached its target is marked done on a day that already has its completion
- **THEN** the request succeeds without change and exactly one completion exists for that day

#### Scenario: Uncomplete is accepted when not relevant
- **WHEN** a task is done today but its rule was changed so that it is not relevant today, and the user marks it not done
- **THEN** today's completion is removed

#### Scenario: Uncompleting a times-per-week occurrence makes it completable again
- **WHEN** a 2-times-per-week task has reached its target, today's completion is removed, and the user marks it done again today
- **THEN** it is accepted and the count is back at 2 of 2

#### Scenario: Completion on the Berlin day
- **WHEN** a user completes a task at 00:30 Europe/Berlin on 2026-10-02 (2026-10-01 22:30 UTC)
- **THEN** the completion is recorded for 2026-10-02, and relevance is judged for that date

#### Scenario: Past or future dates cannot be targeted
- **WHEN** a completion request tries to specify a date
- **THEN** the date is ignored and only the current calendar date is used

### Requirement: Times-per-week tasks count completions in the current calendar week
For a times-per-week task the system SHALL count its completion dates within the current calendar week (seven days starting on the user's week start day, Monday by default, determined from the current calendar date) and show the count against its target, for example "2 of 3 this week". The count uses distinct completion dates. The shown count MUST NEVER exceed the target: normal completion cannot exceed it (see the completion requirement), and if a rule change leaves more completions in the current week than the new, lower target, the shown count is limited to the target while the surplus completions remain as history and the task counts as having reached its target. Counting starts again with each new calendar week (as defined by the user's week start), which makes the task relevant again.

#### Scenario: Count shown
- **WHEN** a 3-times-per-week task has completions on 2026-10-05 and 2026-10-07 and the current date is 2026-10-08
- **THEN** it shows "2 of 3 this week"

#### Scenario: Target reached
- **WHEN** a 2-times-per-week task has two completions in the current week
- **THEN** it shows "2 of 2 this week" and is not relevant on the remaining days of that week

#### Scenario: Count resets on a new week
- **WHEN** the current date moves from Sunday 2026-10-11 to Monday 2026-10-12
- **THEN** the count for the new week starts at 0 and the task is relevant again

#### Scenario: Target lowered below the existing count
- **WHEN** a task with 3 completions this week is changed from 3 to 2 times per week
- **THEN** it shows "2 of 2 this week", all 3 completions remain stored, and no further completion is accepted this week

#### Scenario: Sunday week start
- **WHEN** the user's week start is Sunday, a 2-times-per-week task has completions on Friday 2026-10-09 and Saturday 2026-10-10, and the current date moves to Sunday 2026-10-11
- **THEN** the count for the new week starts at 0 and the task is relevant again

#### Scenario: Changing the week start recounts the week
- **WHEN** a task has completions on Sunday 2026-10-04 and Monday 2026-10-05 and the user changes the week start from Monday to Sunday while the current date is 2026-10-06
- **THEN** the task shows "2 of N this week" (both completions fall in the Sunday-start week) instead of "1 of N this week"

### Requirement: Recurring tasks stay separate from one-time date semantics
A recurring task SHALL be scheduled only by its recurrence rule. It MUST NOT have a scheduled date or due date, MUST NOT be shown as overdue, and MUST NOT be treated as permanently completed. One-time tasks keep their Task Management semantics unchanged: their scheduled and due dates, their date locking while completed, and their single completion.

#### Scenario: Recurring task has no dates
- **WHEN** a recurring task is stored
- **THEN** its scheduled date and due date are both empty

#### Scenario: Recurring task is never overdue or permanently completed
- **WHEN** a recurring task was not done on days it was relevant, or was done on many days
- **THEN** it is shown without an overdue indication and without a permanent completed state

#### Scenario: One-time behavior unchanged
- **WHEN** a one-time task is completed, edited or listed
- **THEN** it behaves exactly as defined before this change

### Requirement: Recurring-task behavior has a defined boundary with later features
This capability SHALL NOT provide a Today/Dashboard view, a Weekly Overview, Progress calculations, reminders or notifications, a settings screen, a configurable week start, completion for past or future dates, or detection of missed occurrences. Those features SHALL reuse the relevance, week and completion definitions of this capability rather than redefine them. Which tasks appear in Today, and how many occurrences a task plans in a week (including how creation dates are treated, and how a times-per-week task is placed in its creation week), are defined by the dashboard-today capability, which builds on this one without changing the relevance definition; relevance itself still does not depend on the creation date. Decisions that belong to later features (which tasks appear on which day of a navigated week, how week start from settings is applied, how progress is rated beyond the weekly summary) are made in their own changes and SHALL reuse those shared planned-occurrence definitions.

#### Scenario: No later-feature screens
- **WHEN** this change is implemented
- **THEN** no Today, Weekly Overview, Progress, settings or notification behavior is added, and the recurrence definitions are available for those features to use

#### Scenario: Today and weekly planning defined elsewhere
- **WHEN** Today or weekly progress needs to know which tasks are relevant or how many occurrences are planned
- **THEN** it uses the relevance definition of this capability together with the planned-occurrence definition of the dashboard-today capability, and creation dates affect planned occurrences but never relevance

### Requirement: Changing between one-time and recurring protects completion history and locked dates
An incomplete one-time task MAY become recurring; its scheduled date or due date is cleared. A completed one-time task MUST NOT become recurring until it is marked incomplete; the request is rejected on the server and nothing is saved. A recurring task MAY become a one-time task only when it has no completion history at all (no completion of any date); otherwise the request MUST be rejected on the server with an error and nothing is changed. Completion history is never deleted, rewritten or converted by an edit. Changing between recurring types is always allowed and preserves existing completions; the new rule governs relevance from then on.

#### Scenario: Incomplete one-time task becomes recurring
- **WHEN** an incomplete one-time task with a due date is changed to "every day"
- **THEN** it has a daily rule and no scheduled or due date

#### Scenario: Completed one-time task cannot become recurring
- **WHEN** a completed one-time task is changed to a recurring type
- **THEN** nothing is saved and an error on the recurrence field says it must be marked incomplete first

#### Scenario: Recurring task without history becomes one-time
- **WHEN** a recurring task with no completions is changed to "does not repeat" with a date choice
- **THEN** it becomes an incomplete one-time task using that date choice

#### Scenario: Recurring task with history cannot become one-time
- **WHEN** a recurring task with at least one completion is changed to "does not repeat"
- **THEN** nothing is changed and an error on the recurrence field explains that it cannot be converted while recurring completion history exists

#### Scenario: Recurring types can be switched
- **WHEN** a task with completions is changed from daily to Monday-and-Thursday or to 3 times per week
- **THEN** the new rule is stored and all existing completions remain unchanged

### Requirement: Recurring task data is limited to its owner
Every read and write of a recurrence rule or a recurring task's completions MUST be limited to tasks owned by the authenticated user, with the user identity taken only from the server-side session. A rule or completion of another user's task behaves exactly like one that does not exist.

#### Scenario: Editing another user's recurrence
- **WHEN** user A submits a recurrence change for a task owned by user B
- **THEN** user B's rule is unchanged and the request fails as not found

#### Scenario: Completing another user's recurring task
- **WHEN** user A submits a complete or incomplete request for a recurring task owned by user B
- **THEN** no completion is created or removed and the request fails as not found

#### Scenario: Converting another user's task
- **WHEN** user A submits a one-time conversion for a recurring task owned by user B
- **THEN** the request fails as not found, indistinguishable from a missing task

#### Scenario: Deleting a recurring task
- **WHEN** a user confirms deletion of their recurring task
- **THEN** its rule and all its completions are removed and no other task is affected
