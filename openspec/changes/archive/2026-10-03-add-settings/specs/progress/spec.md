# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Progress always shows the current Monday–Sunday week`
- TO: `### Requirement: Progress shows the current week according to the user's week start`

## MODIFIED Requirements

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
