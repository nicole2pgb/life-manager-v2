# Spec Delta

## MODIFIED Requirements

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
