# Spec Delta

## REMOVED Requirements

### Requirement: The viewed week is selected by a URL parameter and always runs Monday to Sunday
**Reason**: The week start was fixed to Monday until Settings; it is now the user's week start setting.
**Migration**: Replaced by "The viewed week is selected by a URL parameter and runs seven days from the user's week start".

## ADDED Requirements

### Requirement: The viewed week is selected by a URL parameter and runs seven days from the user's week start
The page SHALL show exactly one calendar week of seven days starting on the authenticated user's week start day (Monday by default), with the day columns in that order. The week SHALL be selected with the query parameter `week` holding a calendar date (`YYYY-MM-DD`); any valid date selects the week that contains it, so the shown week does not depend on which weekday the date is. Without the parameter, or when the value is missing, repeated, not a valid calendar date, or selects a week that is not fully inside the supported date range, the page SHALL show the current week (the week containing today) without an error. Any other week, in the past or in the future, SHALL be viewable. The week start MUST be read from the user's settings and be the same one used by Dashboard and Progress.

#### Scenario: Current week by default
- **WHEN** today is Friday 2026-10-02, the week start is Monday and the user opens `/weekly-overview` without parameters
- **THEN** the week 2026-09-28 to 2026-10-04 is shown

#### Scenario: Any date selects its week
- **WHEN** the week start is Monday and the user opens `/weekly-overview?week=2026-10-07` (a Wednesday)
- **THEN** the week 2026-10-05 to 2026-10-11 is shown

#### Scenario: Sunday week start
- **WHEN** the week start is Sunday and the user opens `/weekly-overview?week=2026-10-07`
- **THEN** the week 2026-10-04 (Sunday) to 2026-10-10 (Saturday) is shown, with the Sunday column first

#### Scenario: Sunday week start without parameter
- **WHEN** today is Friday 2026-10-02 and the week start is Sunday
- **THEN** the week 2026-09-27 to 2026-10-03 is shown

#### Scenario: Invalid week value
- **WHEN** the value is `abc`, `2026-02-30`, empty, or the parameter is given twice
- **THEN** the current week is shown and no error appears

#### Scenario: Week outside the supported range
- **WHEN** the value selects a week of which any day is outside the supported date range
- **THEN** the current week is shown

#### Scenario: Week start changed in Settings
- **WHEN** the user changes the week start and opens the Weekly Overview again
- **THEN** the week shown is the one that contains the selected date (or today) under the new week start
