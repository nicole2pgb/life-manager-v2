# user-authentication Specification

## Purpose

Lets people create an account, sign in and out with server-side sessions, keeps application routes private, shows the signed-in user's profile, and ensures all user-owned data is scoped to the authenticated user.

## Requirements

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

### Requirement: Passwords are hashed with bcrypt
The system SHALL store only a bcrypt hash of each password (via `bcryptjs`, cost factor 12) in the existing `password_hash` column. Plain-text passwords MUST NOT be stored, logged or returned to the client.

#### Scenario: Stored value is a hash
- **WHEN** a user registers with the password `correct horse`
- **THEN** the stored `password_hash` is a bcrypt hash and does not contain the password

#### Scenario: Same password, different hashes
- **WHEN** two users register with the same password
- **THEN** their stored hashes differ

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

### Requirement: Authentication uses server-side sessions in an HTTP-only cookie
The system SHALL authenticate requests with a session whose state lives in the database. On login or registration it SHALL generate a cryptographically random token, store only its SHA-256 hash with an expiry of 30 days, and send the raw token in a cookie that is `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production. A session is valid only if its token hash exists and its expiry is in the future. The cookie MUST NOT contain user data. An expired or unknown session MUST be rejected and, when its row exists, deleted; clearing the browser cookie at that moment is not required, because cookies cannot be modified while a page renders.

#### Scenario: Cookie attributes
- **WHEN** a session is started
- **THEN** the response sets the session cookie with HttpOnly, SameSite=Lax and Path=/ (and Secure in production), and the cookie value is not readable from client-side JavaScript

#### Scenario: Session survives restart of the browser or server
- **WHEN** a signed-in user returns before the session expires
- **THEN** they are still signed in, because the session is read from the database

#### Scenario: Expired session rejected
- **WHEN** a request carries a cookie whose session has expired
- **THEN** it is treated as unauthenticated and the expired session row is deleted from the database; the stale cookie may remain in the browser until a later login, registration or logout replaces or clears it, and it never grants authenticated access

#### Scenario: Unknown or tampered token
- **WHEN** a request carries a cookie whose token matches no stored session
- **THEN** it is treated as unauthenticated

#### Scenario: Session fixation avoided
- **WHEN** a user logs in while holding an old session cookie
- **THEN** a new token is issued and the old session is deleted

### Requirement: Users can log out
The system SHALL provide a logout control that deletes the current session row, clears the session cookie, and redirects to `/login`. Logout MUST be triggered by a POST (form/Server Action), never by a GET link.

#### Scenario: Logout ends the session
- **WHEN** a signed-in user logs out
- **THEN** their session row is deleted, the cookie is cleared, and they land on `/login`

#### Scenario: Old cookie no longer works
- **WHEN** a request replays the cookie from a session that was logged out
- **THEN** it is treated as unauthenticated

#### Scenario: Other sessions are unaffected
- **WHEN** a user logs out in one browser while signed in on another
- **THEN** the other browser's session remains valid

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

### Requirement: Profile page shows the authenticated user's details
The system SHALL provide `/profile` showing the signed-in user's name and email, an initials avatar, and a logout control. It MUST show only the details of the user identified by the session and MUST NOT expose the password hash or session data.

#### Scenario: Profile shows own details
- **WHEN** a signed-in user opens `/profile`
- **THEN** their name and email are shown with a logout control

#### Scenario: Two users see different profiles
- **WHEN** user A and user B each open `/profile` in their own sessions
- **THEN** each sees only their own name and email

### Requirement: User-owned data is always scoped to the authenticated user
The system SHALL obtain the current user's id only from the validated session, never from request input such as form fields, URL parameters or cookies other than the session token. Every data-access function that reads or writes user-owned data (tasks, recurrence rules, completions, settings) MUST take the user id as a required argument and restrict the query to rows owned by that user, directly or through the owning task. A request for a record owned by another user MUST behave as if the record does not exist.

#### Scenario: Another user's record is not reachable
- **WHEN** user A requests a record by an identifier that belongs to user B
- **THEN** the result is "not found" and nothing about the record is revealed or changed

#### Scenario: User id is not client-supplied
- **WHEN** a form submission or request includes a user id field
- **THEN** the field is ignored and the session's user id is used

#### Scenario: Data access requires an owner
- **WHEN** a data-access function for user-owned data is written
- **THEN** its signature requires the user id and its queries filter by it, so omitting the scope is a type error

### Requirement: Sensitive values stay on the server
Password hashes, raw session tokens and token hashes MUST NOT be sent to the browser in rendered output, Server Action results or logs. Authentication code MUST be importable only from server code.

#### Scenario: Client import blocked
- **WHEN** a Client Component imports the authentication module
- **THEN** the build fails instead of bundling it for the browser

#### Scenario: Action results are minimal
- **WHEN** a registration or login action returns an error state
- **THEN** it contains only field error messages and the non-secret values to re-display (name, email)
