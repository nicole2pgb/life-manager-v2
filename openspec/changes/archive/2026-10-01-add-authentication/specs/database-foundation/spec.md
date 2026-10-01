## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Deleting data cascades safely
Deleting a task MUST also delete its recurrence rule and all of its completions. Deleting a user MUST also delete that user's sessions, settings, tasks, recurrence rules and completions. No orphaned rows may remain.

#### Scenario: Task deletion removes dependent data
- **WHEN** a task with a recurrence rule and several completions is deleted
- **THEN** its recurrence rule and all its completions are removed, and other tasks' data is unaffected

#### Scenario: User deletion removes all owned data
- **WHEN** a user is deleted
- **THEN** no sessions, settings, tasks, recurrence rules or completions belonging to that user remain
