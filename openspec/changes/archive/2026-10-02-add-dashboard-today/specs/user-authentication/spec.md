# Spec Delta

## MODIFIED Requirements

### Requirement: Users can register with name, email and password
The system SHALL let a visitor create an account at `/register` by submitting name, email, password and password confirmation. All validation MUST be performed on the server. The name MUST be non-empty after trimming and at most 255 characters. The email MUST be a syntactically valid address of at most 255 characters and is stored trimmed and lower-cased. The password MUST be 8 to 72 bytes long, measured as its UTF-8 encoding (not as a character count), because bcrypt ignores input beyond 72 bytes; it MUST equal the confirmation. On success the system SHALL create the user, sign them in, and redirect to `/dashboard`.

#### Scenario: Successful registration
- **WHEN** a visitor submits a valid name, an unused email, a valid password and a matching confirmation
- **THEN** a user row is created, a session is started, and the visitor lands on `/dashboard`

#### Scenario: Passwords do not match
- **WHEN** the password and the confirmation differ
- **THEN** no user is created and the form shows an error on the confirmation field

#### Scenario: Password too short or too long
- **WHEN** the password's UTF-8 encoding is shorter than 8 bytes or longer than 72 bytes
- **THEN** no user is created and the form shows an error on the password field that states the limit in bytes

#### Scenario: Multibyte password measured in bytes
- **WHEN** a password of 30 characters that each encode to 3 bytes (90 bytes) is submitted
- **THEN** it is rejected as too long, and a password of exactly 72 bytes is accepted

#### Scenario: Email already registered
- **WHEN** a visitor registers with an email that already exists, in any letter case
- **THEN** no user is created and the form shows that the email is already in use

#### Scenario: Invalid or missing fields
- **WHEN** the name is blank or the email is not a valid address
- **THEN** no user is created and each invalid field shows its own error

#### Scenario: Entered values are kept on error
- **WHEN** registration fails validation
- **THEN** the name and email fields keep their entered values and both password fields are cleared

### Requirement: Users can log in with email and password
The system SHALL let a visitor sign in at `/login` with email and password. The email match MUST be case-insensitive. On success the system SHALL start a session and redirect to `/dashboard`. On any failure the system MUST show one generic message ("Invalid email or password") that does not reveal whether the email is registered, and the work performed MUST NOT differ detectably between an unknown email and a wrong password.

#### Scenario: Successful login
- **WHEN** a registered user submits their email (in any letter case) and correct password
- **THEN** a session is started and they land on `/dashboard`

#### Scenario: Wrong password
- **WHEN** a registered email is submitted with a wrong password
- **THEN** no session is started and the generic error is shown

#### Scenario: Unknown email
- **WHEN** an unregistered email is submitted
- **THEN** no session is started and the same generic error is shown

#### Scenario: Blank fields
- **WHEN** the email or password is empty
- **THEN** no session is started and the form shows which field is required

### Requirement: Application routes are protected
The system SHALL treat every route except `/login` and `/register` (and framework static assets) as protected, including `/dashboard`, `/tasks` and `/profile`. A request without a valid session MUST be redirected to `/login`. A request to `/login` or `/register` with a valid session MUST be redirected to `/dashboard`. The route proxy MAY perform an optimistic cookie-presence check, but every protected page and every Server Action MUST additionally verify the session against the database before returning or changing data.

#### Scenario: Unauthenticated access to a protected page
- **WHEN** a visitor without a session requests `/profile` or `/dashboard`
- **THEN** they are redirected to `/login` and no profile or task data is rendered

#### Scenario: Authenticated user opens the login page
- **WHEN** a signed-in user requests `/login` or `/register`
- **THEN** they are redirected to `/dashboard`

#### Scenario: Cookie present but session invalid
- **WHEN** a request carries a session cookie that the database does not accept and requests `/profile`
- **THEN** the page does not render user data and the visitor is redirected to `/login`

#### Scenario: Root path
- **WHEN** a visitor requests `/`
- **THEN** a signed-in user is redirected to `/dashboard` and everyone else to `/login`
