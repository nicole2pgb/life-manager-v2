# Spec Delta

## MODIFIED Requirements

### Requirement: Planned occurrences of a week follow one shared definition
The system SHALL define, in one shared place independent of any screen, how many occurrences a task plans in a calendar week (seven days starting on the user's week start day, Monday by default) and how many of them are completed. The creation date of a task is the calendar date of its creation instant in the application time zone. The definition is:

- **Daily:** one planned occurrence for each day of the week that is on or after the creation date. A task created before the week plans 7; with a Monday week start, a task created on Thursday plans 4 (Thursday to Sunday); a task created after the week plans 0.
- **Specific weekdays:** one planned occurrence for each selected weekday that falls on or after the creation date within the week.
- **Times per week:** the weekly target for a week that starts on or after the creation date's week, i.e. any week after the creation week; in the creation week, the smaller of the target and the number of calendar days from the creation date through the last day of the week; 0 for a week before the creation week.
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

#### Scenario: Sunday week start
- **WHEN** the user's week start is Sunday and a daily task created last week is evaluated for the week Sunday 2026-10-04 to Saturday 2026-10-10
- **THEN** it plans 7 occurrences in that week, and a Sunday completion on 2026-10-04 counts in that week, not in the week before

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
The dashboard SHALL show, for the current week (seven days starting on the user's week start day, Monday by default), the number of completed planned occurrences, the number of planned occurrences, and the completion percentage rounded to a whole number, together with the date range of the week (in German format) and the number of planned occurrences still open. It MUST use the shared definition of planned occurrences. When there are no planned occurrences in the week, it SHALL show an explanatory empty state instead of a percentage, and MUST NOT show 0% or NaN.

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

#### Scenario: Week start respected
- **WHEN** the user's week start is Sunday and today is Wednesday 2026-10-07
- **THEN** the summary covers 04.10.2026 – 10.10.2026
