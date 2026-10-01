# database-foundation Specification

## Purpose

Sets up how Life Manager stores data in MySQL: connection configuration, the MVP data model and its integrity rules, and a repeatable migration workflow that every later feature builds on.

## Requirements

### Requirement: Database connection is configured from the environment
The application SHALL read its MySQL connection settings only from environment variables. Credentials, hosts and passwords MUST NOT be hard-coded in source files or committed to version control.

#### Scenario: Connection settings come from a local env file
- **WHEN** a developer provides the connection settings in their local, git-ignored environment file
- **THEN** both the application and the migration tooling connect to the configured database using those settings

#### Scenario: Missing configuration fails clearly
- **WHEN** the application or the migration tooling tries to connect and the required connection variable is not set
- **THEN** it stops with an error that names the missing variable, does not print any secret value, and does not fall back to a default credential

#### Scenario: No secrets in the repository
- **WHEN** the repository contents are inspected
- **THEN** the only environment template present contains placeholder values, and no file with real database credentials is tracked

### Requirement: Database access is restricted to server code
The database connection MUST only be usable from server-side code. Code that runs in the browser MUST NOT be able to import or reach the database connection.

#### Scenario: Client code cannot import the connection
- **WHEN** a Client Component imports the database connection module
- **THEN** the build fails with an error instead of bundling database code or credentials for the browser

### Requirement: Users are stored with unique email and hashed password
The system SHALL store each user with an identifier, name, email, password hash and creation time. Email MUST be unique across all users, and case must not matter when comparing. The schema MUST NOT provide any column for a plain-text password.

#### Scenario: Duplicate email rejected
- **WHEN** a user row is inserted with an email that already exists, even with different letter case
- **THEN** the database rejects the insert with a uniqueness violation

#### Scenario: Only a password hash is stored
- **WHEN** the users table definition is inspected
- **THEN** it contains a password-hash column and no plain-text password column

### Requirement: Every user-owned record belongs to exactly one user
Tasks and user settings MUST each reference exactly one existing user. Recurrence rules and task completions MUST each reference exactly one existing task, so they belong to that task's user. The database MUST reject records that point to a user or task that does not exist.

#### Scenario: Task without a valid owner rejected
- **WHEN** a task is inserted with no user reference, or with one that points to a user that does not exist
- **THEN** the database rejects the insert

#### Scenario: Completion without a valid task rejected
- **WHEN** a task completion is inserted with a task reference that does not exist
- **THEN** the database rejects the insert

### Requirement: Tasks store the MVP task attributes
The system SHALL store for each task: an identifier, the owning user, a required title, optional notes, a required life area, and creation and last-update times. The life area MUST be one of Career, Fitness, Health, Learning, Personal or Finance.

#### Scenario: Task with optional notes omitted
- **WHEN** a task is stored with a title and life area but no notes
- **THEN** the task is saved with empty notes and its creation and update times are set

#### Scenario: Invalid life area rejected
- **WHEN** a task is stored with a life area outside the six supported values
- **THEN** the database rejects the write

#### Scenario: Update time changes on modification
- **WHEN** an existing task is modified
- **THEN** its last-update time moves forward and its creation time stays the same

### Requirement: Each task has exactly one recurrence rule
The system SHALL store exactly one recurrence rule per task. The rule's type MUST be one of: none (one-time), daily, specific weekdays, or times per week. A specific-weekdays rule SHALL store the selected weekdays. A times-per-week rule SHALL store a weekly target between 1 and 7.

#### Scenario: Second rule for the same task rejected
- **WHEN** a second recurrence rule is inserted for a task that already has one
- **THEN** the database rejects the insert

#### Scenario: Specific weekdays stored
- **WHEN** a recurrence rule of type specific weekdays is stored with Monday and Thursday
- **THEN** reading the rule back returns exactly Monday and Thursday

#### Scenario: Weekly target out of range rejected
- **WHEN** a times-per-week rule is stored with a target of 0 or 8
- **THEN** the database rejects the write

### Requirement: Task completions are recorded per task and calendar date
The system SHALL record each completion as a task plus a calendar date (no time of day), with its own creation time. A task MUST have at most one completion per calendar date. The task itself MUST remain unchanged when a completion is recorded.

#### Scenario: Completing a recurring task on several days
- **WHEN** completions for the same task are recorded on Monday, Wednesday and Friday of one week
- **THEN** three completions exist for that task and the task itself remains unchanged

#### Scenario: Duplicate completion for the same date rejected
- **WHEN** a second completion is recorded for the same task and the same calendar date
- **THEN** the database rejects the insert

#### Scenario: Completion date does not shift
- **WHEN** a completion is stored for a given calendar date and read back
- **THEN** the same calendar date is returned regardless of the server or database time zone

### Requirement: User settings are persisted per user
The system SHALL store at most one settings record per user. It contains the theme color, week start, whether the daily check-in is enabled, the daily check-in time, and the selected life areas. Theme color MUST be one of Pink, Purple, Blue, Green or Red, with Pink as the default. Selected life areas MUST come only from the six supported life areas.

#### Scenario: Defaults applied to a new settings record
- **WHEN** a settings record is created for a user with only the user reference
- **THEN** the theme color is Pink, the week starts on Monday, the daily check-in is disabled with a time of 09:00, and all six life areas are selected

#### Scenario: Second settings record for a user rejected
- **WHEN** a second settings record is inserted for the same user
- **THEN** the database rejects the insert

### Requirement: Sessions are stored with a hashed token, owner and expiry
The system SHALL store each login session with an identifier, the owning user, a hash of the session token, a creation time and an expiry time. The raw session token MUST NOT be stored. The token hash MUST be unique. A session MUST reference exactly one existing user.

#### Scenario: Only a token hash is stored
- **WHEN** the sessions table definition is inspected
- **THEN** it contains a token-hash column and no column that holds the raw token

#### Scenario: Session without a valid owner rejected
- **WHEN** a session is inserted with no user reference, or with one that points to a user that does not exist
- **THEN** the database rejects the insert

#### Scenario: Duplicate token hash rejected
- **WHEN** a second session is inserted with a token hash that already exists
- **THEN** the database rejects the insert

### Requirement: Deleting data cascades safely
Deleting a task MUST also delete its recurrence rule and all of its completions. Deleting a user MUST also delete that user's sessions, settings, tasks, recurrence rules and completions. No orphaned rows may remain.

#### Scenario: Task deletion removes dependent data
- **WHEN** a task with a recurrence rule and several completions is deleted
- **THEN** its recurrence rule and all its completions are removed, and other tasks' data is unaffected

#### Scenario: User deletion removes all owned data
- **WHEN** a user is deleted
- **THEN** no sessions, settings, tasks, recurrence rules or completions belonging to that user remain

### Requirement: Schema changes are applied through versioned migrations
The database schema SHALL be created and changed only through versioned SQL migration files that are committed to the repository and generated from the schema definition. Applying the migrations to an empty database MUST produce the full MVP schema. Applying them again MUST NOT change anything.

#### Scenario: Fresh database set up from migrations
- **WHEN** a developer runs the migrate command against an empty local database
- **THEN** all MVP tables, constraints and indexes are created

#### Scenario: Re-running migrations
- **WHEN** the migrate command runs again with no new migration files
- **THEN** it completes without changing the schema

#### Scenario: Schema definition and migrations stay in sync
- **WHEN** the migration generator runs with no changes to the schema definition
- **THEN** it produces no new migration
