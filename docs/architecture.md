# Architecture

## General

Life Manager uses a simple full-stack Next.js architecture.

The architecture should stay understandable and MVP-focused.
Avoid unnecessary abstractions and over-engineering.

## Source of Truth

The server and persisted database state are the source of truth.

The UI may show temporary interaction states, but persisted application data must come from the server.

## Data Access

UI components must not access MySQL directly.

Database operations should be separated from presentation components.

Flow:

UI → Server Logic → Data Access → MySQL

## User Data

Every user-owned entity must be associated with the authenticated user.

Users must never be able to access or modify another user's tasks or completions.

## Task Logic

Task business logic should be separated from UI rendering.

This includes:

- Task scheduling
- Recurrence calculations
- Completion calculations
- Weekly calculations
- Progress calculations

The same business logic should be reusable across different views.

## Calendar Dates

Scheduled dates, due dates and completion dates are calendar dates (`YYYY-MM-DD`), not instants.

- All code that needs "today" or the calendar date of an instant must use the central calendar-date module (`lib/dates/calendar-date.ts`). Do not convert dates with `toISOString()` or similar elsewhere.
- The module works with an explicit IANA time zone. In the MVP every user is treated as living in one application-wide time zone (`APP_TIME_ZONE`, default `Europe/Berlin`), resolved through a single function. Per-user time zones are not supported yet.
- Making the time zone user-configurable later only changes that resolver (for example to read it from user settings); callers and stored dates stay the same.
- Scheduled and due dates are plain stored dates and need no time zone to be saved; the time zone matters when they are compared with "today" (Today, Weekly Overview, overdue state, Progress) and when a completion date is recorded.
- Weekday and week arithmetic (`isoWeekday`, `addDays`, `startOfWeek`, `endOfWeek`) lives in the same module and works on the calendar date only (UTC parts, no local time), so it never shifts with the server time zone or daylight-saving changes. Weekdays are ISO numbers (Monday = 1 … Sunday = 7).
- Weeks run Monday–Sunday in the MVP. The week-start argument defaults to Monday; a later user setting only changes the argument callers pass.
- Week start is fixed to Monday everywhere until the Settings feature: `user_settings.week_start` exists but is deliberately not read by Dashboard, Weekly Overview or recurrence counting. When Settings makes it configurable, all week-based behavior must switch together: the Today and times-per-week week counting (`lib/tasks/planning.ts`, `lib/tasks/recurrence.ts` call sites, `weekCompletions` and `getDashboard` in `db/tasks.ts`), planned occurrences, the Dashboard weekly progress, and the Weekly Overview week resolution (`lib/tasks/weekly-overview.ts`). Changing only one of them would make the screens disagree.
- Dashboard, Weekly Overview and Progress reuse this module. Today membership and weekly planned/completed occurrences are defined once, in `lib/tasks/planning.ts` (pure, no database or clock), and those features reuse it as well.

## Recurrence

Recurrence logic must not be implemented independently inside individual UI components.

Recurring tasks are scheduled only by their recurrence rule. The scheduled date and due date exist only for one-time tasks (recurrence type none) and must not be combined with recurrence.

Supported recurrence types:

- None / one-time
- Daily
- Specific weekdays
- X times per week

## Authentication

Authentication is handled server-side using session-based authentication.

Passwords must never be stored as plain text.

### Sessions and data scoping

- Sessions are stored in the `sessions` table; the cookie holds a random token and only its hash is stored.
- `getCurrentUser()` (`lib/auth/session.ts`) is the only source of the current user's id. Never take a user id from form fields, URL parameters or other request input.
- Every data-access function for user-owned data (tasks, recurrence rules, completions, settings) takes the user id as a required argument and filters by it, directly or through the owning task.
- A record that belongs to another user behaves exactly like a record that does not exist (not found).
- Every protected page and Server Action must call `getCurrentUser()`; `proxy.ts` is only an optimistic redirect.

## MVP Principle

Prefer the simplest implementation that correctly supports the MVP.

Do not introduce additional services, abstractions or infrastructure unless they solve a current requirement.
