# Spec Delta

## MODIFIED Requirements

### Requirement: Tasks store the MVP task attributes
The system SHALL store for each task: an identifier, the owning user, a required title, optional notes, an optional scheduled date, an optional due date, a required life area, and creation and last-update times. The scheduled date and the due date are separate attributes and each is a calendar date (no time of day, no time zone), distinct from completion dates. A task MUST NOT have both a scheduled date and a due date. A task with neither is an unscheduled task. The life area MUST be one of Career, Fitness, Health, Learning, Personal or Finance.

#### Scenario: Task with optional notes omitted
- **WHEN** a task is stored with a title and life area but no notes
- **THEN** the task is saved with empty notes and its creation and update times are set

#### Scenario: Task with no date
- **WHEN** a task is stored without a scheduled date and without a due date
- **THEN** it reads back with neither date

#### Scenario: Task with a scheduled date
- **WHEN** a task is stored with the scheduled date 2026-10-10 and no due date
- **THEN** it reads back with exactly that scheduled date and no due date

#### Scenario: Task with a due date
- **WHEN** a task is stored with the due date 2026-10-10 and no scheduled date
- **THEN** it reads back with exactly that due date and no scheduled date

#### Scenario: Scheduled date and due date together rejected
- **WHEN** a task is stored with both a scheduled date and a due date
- **THEN** the database rejects the write

#### Scenario: Dates in the past are valid
- **WHEN** a task is stored with a scheduled date or due date earlier than today
- **THEN** the write is accepted, because the database imposes no relation between these dates and the current day

#### Scenario: Dates do not shift
- **WHEN** a scheduled date or due date is stored and read back under a different server or database time zone
- **THEN** the same calendar date is returned

#### Scenario: Existing tasks stay valid after the date columns are added
- **WHEN** the migration that adds the scheduled and due date columns is applied to a database that already contains tasks
- **THEN** all existing tasks remain unchanged and have neither date

#### Scenario: Invalid life area rejected
- **WHEN** a task is stored with a life area outside the six supported values
- **THEN** the database rejects the write

#### Scenario: Update time changes on modification
- **WHEN** an existing task is modified
- **THEN** its last-update time moves forward and its creation time stays the same
