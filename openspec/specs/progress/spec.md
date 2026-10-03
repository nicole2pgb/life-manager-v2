# progress Specification

## Purpose

Defines the Progress screen: a read-only view of the current seven-day week starting on the user's week start (Monday by default) that shows the weekly completion rate, the current streak, the change against the previous week, daily completion, a weekly completion donut and progress by life area, all calculated from the user's tasks, recurrence rules and completions using the shared planned-occurrence definitions.

## Requirements

### Requirement: Progress requires an authenticated user and shows only their data
The system SHALL provide `/progress` for authenticated users only. A visitor without a valid session MUST be redirected to `/login` and MUST NOT receive any task or completion data. Every task, rule and completion read for the page, including the completions used for the streak, MUST be limited to the authenticated user, identified only from the server-side session. "Today" and the current week SHALL be determined through the central calendar-date definition of the application time zone. Progress values are calculated on request from tasks, rules and completions; they MUST NOT be stored.

#### Scenario: Unauthenticated visit
- **WHEN** a visitor without a valid session opens `/progress`
- **THEN** they are redirected to `/login` and no task or completion data is returned

#### Scenario: Two users see different progress
- **WHEN** user A and user B each open `/progress` in their own sessions
- **THEN** each sees only numbers derived from their own tasks and completions, and the other user's completions never extend or break a streak

#### Scenario: Day boundary
- **WHEN** the application time zone is Europe/Berlin and the instant is 2026-10-01 23:30 UTC
- **THEN** Progress treats 2026-10-02 as today

### Requirement: Progress shows the current week according to the user's week start
The page SHALL show the current week (the week containing today), seven days starting on the user's week start day (Monday by default), for weekly completion, daily completion, the weekly donut and life-area progress, and the previous week of the same length for the weekly change. It MUST NOT offer week navigation. The week start MUST be read from the authenticated user's settings and applied to all of these values together, using the same week as Dashboard and Weekly Overview.

#### Scenario: Current week
- **WHEN** today is Friday 2026-10-02 and the week start is Monday
- **THEN** the page covers the week 2026-09-28 to 2026-10-04 and compares it with 2026-09-21 to 2026-09-27

#### Scenario: Current week with Sunday start
- **WHEN** today is Friday 2026-10-02 and the week start is Sunday
- **THEN** the page covers the week 2026-09-27 to 2026-10-03 and compares it with 2026-09-20 to 2026-09-26

#### Scenario: Agrees with the dashboard
- **WHEN** the week start is Sunday
- **THEN** the weekly completed and planned numbers equal those on the dashboard

### Requirement: Weekly completion reuses the shared planned-occurrence definition
The page SHALL show the number of completed and planned occurrences of the current week and the completion percentage rounded to a whole number. The numbers MUST equal the Dashboard's weekly progress for the same data, including times-per-week tasks, dated one-time tasks and the creation-date rules. When no occurrence is planned in the week, the page SHALL show a "nothing planned" state with no percentage and MUST NOT show 0% or NaN.

#### Scenario: Matches the Dashboard
- **WHEN** the current week has 33 planned occurrences of which 12 are completed
- **THEN** Progress shows 12 of 33 and 36%, the same as the Dashboard's weekly progress

#### Scenario: Nothing planned
- **WHEN** the user has no tasks or only undated one-time tasks
- **THEN** the weekly completion shows a "nothing planned" state and no percentage

#### Scenario: Edit recomputes
- **WHEN** a task's recurrence rule is edited
- **THEN** the numbers for the current and previous week use the new rule

### Requirement: The current streak counts consecutive days with a completion
The page SHALL show the current streak as a number of days. A day counts when at least one completion dated that day exists for any of the user's tasks, whatever the task type or whether the weekly numbers count that completion. The streak is the number of consecutive calendar days with a completion ending at today when today has a completion. When today has no completion yet, the streak SHALL continue to be counted from yesterday, so an unfinished today never breaks it. The streak breaks on a fully elapsed day without a completion, and it MAY span week boundaries. With no qualifying day the streak is 0 days. The streak is calculated from actual completion history, so deleting a task, which deletes its completions, can shorten it. The page SHALL write "1 day" for a streak of one and "N days" otherwise.

#### Scenario: Streak ends today
- **WHEN** completions exist on 2026-09-29, 2026-09-30, 2026-10-01 and today 2026-10-02
- **THEN** the streak is 4 days

#### Scenario: Today not done yet
- **WHEN** completions exist on 2026-09-29, 2026-09-30 and 2026-10-01 and today is 2026-10-02 without a completion
- **THEN** the streak is 3 days

#### Scenario: A missed day breaks the streak
- **WHEN** completions exist on 2026-09-28 and 2026-10-01, none on 2026-09-29 or 2026-09-30, and today is 2026-10-02 without a completion
- **THEN** the streak is 1 day

#### Scenario: Yesterday missed and nothing today
- **WHEN** the latest completion is on 2026-09-30 and today is 2026-10-02
- **THEN** the streak is 0 days

#### Scenario: Spans weeks
- **WHEN** there is a completion on every day from Thursday 2026-09-24 to Wednesday 2026-09-30 and today is 2026-09-30
- **THEN** the streak is 7 days

#### Scenario: Any completion counts
- **WHEN** the only completion of a day belongs to an undated one-time task, or to a recurring task whose rule no longer plans that day
- **THEN** that day counts for the streak

#### Scenario: Deleting a task shortens the streak
- **WHEN** the only completion of yesterday belongs to a task and that task is deleted
- **THEN** yesterday no longer counts and the streak is recalculated without it

#### Scenario: Streak never mixes users
- **WHEN** only another user has a completion yesterday
- **THEN** the current user's streak ignores it

### Requirement: Weekly change compares the current week with the previous week in percentage points
The page SHALL show the difference between the current week's completion rate and the previous Monday–Sunday week's completion rate in percentage points. The difference SHALL be calculated from the unrounded completion ratios (completed divided by planned, times 100) and only the resulting difference rounded to a whole number with `Math.round`; it MUST NOT be calculated from already rounded percentages. It SHALL be displayed with a sign and the unit, for example `−8% pts` for a decrease and `+8% pts` for an increase; a difference that rounds to zero SHALL be displayed as `0% pts` (never `-0`). When the current week or the previous week has no planned occurrences, the page SHALL show a neutral "No comparison" state instead of a number. The previous week uses the task's current definition, like every other planned-occurrence number: editing or deleting tasks can change it.

#### Scenario: Decrease
- **WHEN** last week had 9 of 20 completed (45%) and this week 12 of 33 (36.36…%)
- **THEN** the weekly change is `−9% pts`

#### Scenario: Calculated from unrounded ratios
- **WHEN** this week is 1 of 6 (16.67…%, shown as 17%) and last week is 1 of 3 (33.33…%, shown as 33%)
- **THEN** the weekly change is `−17% pts`, because the unrounded difference is −16.67; subtracting the displayed percentages would wrongly give −16

#### Scenario: Rounds to zero
- **WHEN** the unrounded difference is 0.3 or −0.3 percentage points
- **THEN** the page shows `0% pts`

#### Scenario: No comparison
- **WHEN** the previous week has no planned occurrences, or the current week has none
- **THEN** the weekly change shows "No comparison"

#### Scenario: Previous week uses current definitions
- **WHEN** a daily task was created this week
- **THEN** it plans no occurrence in the previous week, and a dated one-time task scheduled in the previous week counts there (completed when it has a completion)

### Requirement: Daily completion shows day-placed occurrences for the current week
The page SHALL show seven bars, in order from the user's week start day (Monday by default), of completed versus planned occurrences per day of the current week. Only occurrences that belong to a specific day SHALL be placed: daily tasks on each day from their creation date, specific-weekday tasks on their selected weekdays from their creation date, and one-time tasks with a scheduled or due date on that date. A dated one-time task SHALL belong to its scheduled or due day and is done on that day whatever date it was completed on. Times-per-week tasks MUST NOT be placed on any day, and undated one-time tasks plan nothing. A day with at least one planned occurrence shows its completed share of planned; a day in the future shows its planned occurrences as incomplete (an empty bar). A day with no planned occurrence SHALL show a "no planned" state and MUST NOT show 0%. Today's bar SHALL be marked. Each bar SHALL expose its numbers (completed of planned) in text, not by the bar alone. Because times-per-week occurrences are intentionally excluded from days, the daily totals MAY be lower than the weekly totals; the day placement itself MUST agree with Weekly Overview for the same week.

#### Scenario: Partly done day
- **WHEN** Wednesday has 4 planned day-placed occurrences of which 2 are completed
- **THEN** Wednesday's bar shows 2 of 4

#### Scenario: Future days
- **WHEN** today is Wednesday and Friday has planned day-placed occurrences
- **THEN** Friday shows them as planned and incomplete (an empty bar), not as "no planned" and not as failed

#### Scenario: No planned occurrences on a day
- **WHEN** a day has no day-placed occurrence
- **THEN** it shows a "no planned" state, not 0%

#### Scenario: Times-per-week tasks are excluded
- **WHEN** the user has a "3 times per week" task completed on Monday and Wednesday
- **THEN** it adds nothing to any daily bar, and it counts in the weekly completion, the donut and its life area

#### Scenario: Dated one-time task
- **WHEN** a one-time task is scheduled for Tuesday and completed on Thursday
- **THEN** it counts as a completed occurrence on Tuesday and adds nothing to Thursday

#### Scenario: Daily totals may differ from weekly totals
- **WHEN** the week has day-placed occurrences and a times-per-week task
- **THEN** the sum of the daily planned counts equals the weekly planned count minus the times-per-week planned count, and the sum of the daily completed counts equals the weekly completed count minus the times-per-week completed count

#### Scenario: Agrees with Weekly Overview
- **WHEN** the same week is shown in Weekly Overview
- **THEN** each day's planned and completed counts equal the number of entries and done entries in that day's column

#### Scenario: Sunday week start
- **WHEN** the user's week start is Sunday
- **THEN** the bars run Sunday, Monday, ..., Saturday and each bar's numbers equal the entries of the same day in Weekly Overview

### Requirement: The weekly completion donut shows the current week
The page SHALL show a donut for the current week with the whole-number percentage, "completed/planned done" and the week range in the German long-date format of the existing `formatWeekRange` (for example "28. September – 4. Oktober 2026"). When nothing is planned it SHALL show a "nothing planned" state instead of a percentage. The donut's text MUST carry the numbers; the ring alone does not. The page MUST NOT show a multi-week trend or other analytics.

#### Scenario: Donut numbers
- **WHEN** the week has 12 of 33 completed
- **THEN** the donut shows 36%, "12/33 done" and the range "28. September – 4. Oktober 2026"

#### Scenario: Nothing planned
- **WHEN** nothing is planned this week
- **THEN** the donut area states that nothing is planned and shows no percentage

### Requirement: Progress by life area covers all six areas
The page SHALL list all six life areas — Career, Fitness, Health, Learning, Personal, Finance — in that order, each with the completed and planned occurrences of the current week for its tasks (including times-per-week and dated one-time tasks) and a progress bar. An area without planned occurrences SHALL show "Nothing planned" with no percentage and no bar fill, never 0%. The per-area planned and completed counts SHALL add up to the weekly planned and completed counts. Selecting which areas to show is deferred to Settings.

#### Scenario: Areas add up
- **WHEN** the week has 33 planned and 12 completed occurrences across areas
- **THEN** the six areas' planned counts add up to 33 and their completed counts to 12

#### Scenario: Area with nothing planned
- **WHEN** the user has no planned occurrence in Finance this week
- **THEN** Finance is listed with "Nothing planned" and no percentage

#### Scenario: All areas always listed
- **WHEN** the user has tasks in only one area
- **THEN** all six areas are listed, the other five with "Nothing planned"

### Requirement: Progress is reachable from the navigation and stays current
The main navigation SHALL contain a "Progress" entry that is marked as the current page on `/progress`. Creating, editing, deleting, completing and un-completing a task SHALL refresh the Progress page so it never shows data older than the change. The page SHALL be read-only: it offers no way to complete tasks. It MUST NOT add a Journal navigation entry.

#### Scenario: Navigation entry
- **WHEN** the user is on `/progress`
- **THEN** the "Progress" navigation entry is marked as current

#### Scenario: Completion shows up
- **WHEN** a task is completed on the Dashboard and the user then opens `/progress`
- **THEN** the weekly numbers, today's bar, the streak and the life area reflect it

### Requirement: Progress has useful empty, loading and error states
For a user without any task, the page SHALL show an explanatory empty state with a link to create a task, while the streak (0 days) and weekly change ("No comparison") remain consistent. While the page loads it SHALL show a loading state, and when loading fails it SHALL show an error state with a retry. The layout MUST work on mobile without horizontal scrolling.

#### Scenario: New user
- **WHEN** a user without tasks opens `/progress`
- **THEN** the page explains that nothing is planned yet and links to creating a task

#### Scenario: Loading failure
- **WHEN** loading the page's data throws
- **THEN** an error state with a retry is shown instead of broken numbers

#### Scenario: Small screen
- **WHEN** the page is viewed at 375 px width
- **THEN** all sections are readable and the page does not scroll horizontally
