# app-shell Specification

## Purpose

Defines quality requirements for the frame around every authenticated page: the existing navigation stays usable at every width, every route has loading, error and not-found states, and the core user flow and Progress rendering work reliably across browsers.

## Requirements

### Requirement: The existing navigation stays usable and readable at all widths
The authenticated frame SHALL keep its current top navigation with the logo linking to `/dashboard` and the entries Dashboard, Tasks, Weekly Overview, Progress, Profile and Settings, with the current page marked (`aria-current="page"`, also on nested routes such as `/tasks/new`). On desktop and at widths down to 375 px every entry MUST be visible or reachable without horizontal page scrolling, its label MUST be fully readable (not clipped or overlapping), and each entry MUST have a visible keyboard focus state. The navigation structure, entries and order MUST NOT change as part of this requirement; only small layout adjustments (spacing, wrapping, tap-target size) are permitted when needed to meet it.

#### Scenario: Desktop navigation
- **WHEN** a signed-in user views any application page at 1280 px width
- **THEN** all six entries are visible and readable on the top bar with the current page marked

#### Scenario: Nested route marks its section
- **WHEN** a signed-in user opens `/tasks/new`
- **THEN** the "Tasks" entry is marked as current

#### Scenario: Navigation at 375 px
- **WHEN** a signed-in user views any application page at 375 px width
- **THEN** all six entries are reachable, readable and tappable without horizontal page scrolling and without overlapping the logo or the page content

#### Scenario: Keyboard focus
- **WHEN** the user tabs through the navigation
- **THEN** each entry shows a visible focus state

### Requirement: Every authenticated route has loading and error states
Every route in the authenticated application, including `/profile`, `/tasks/new` and `/tasks/[id]/edit`, SHALL show a loading state while its data loads. An unexpected failure in any authenticated route SHALL show an error state inside the existing frame with a way to retry and a link to `/dashboard`, never a blank page or a raw stack trace, and MUST NOT reveal error details beyond a generic message. A failure outside the authenticated frame SHALL show a minimal generic error page with a way to retry.

#### Scenario: Loading
- **WHEN** a user opens `/profile`, `/tasks/new` or a task's edit page and the data takes time
- **THEN** a loading placeholder is shown inside the frame until the page is ready

#### Scenario: Unexpected failure in a route
- **WHEN** rendering `/tasks/new` throws an unexpected error
- **THEN** a generic error state with "Try again" and a link to the dashboard is shown inside the frame and no error message or stack is displayed

#### Scenario: Failure of the frame
- **WHEN** the authenticated frame itself fails to render
- **THEN** a generic error page with a retry control is shown

### Requirement: Unknown pages and unavailable tasks show a not-found state
A request by a signed-in user for a path that does not exist SHALL show a not-found page with a link back to the application (`/dashboard`; a visitor without a session is redirected to `/login` by route protection before any not-found page is shown). A request for a task that does not exist, is malformed, or belongs to another user SHALL show the same not-found state inside the existing frame, indistinguishable from each other.

#### Scenario: Unknown path
- **WHEN** a signed-in user requests `/does-not-exist`
- **THEN** a not-found page is shown with a link to the dashboard

#### Scenario: Unknown path without a session
- **WHEN** a visitor without a session requests `/does-not-exist`
- **THEN** they are redirected to `/login`, as for every protected route

#### Scenario: Another user's task
- **WHEN** a signed-in user opens the edit page of a task owned by another user
- **THEN** the not-found state is shown, identical to the one for a nonexistent task id

### Requirement: Pages are usable in Chrome and Safari without horizontal scrolling
Every page and state of the application (login, register, Dashboard, Tasks, task create and edit, Weekly Overview, Progress, Settings, Profile, not-found and error states) SHALL render correctly and be usable in current Chrome and Safari at 375 px, tablet and desktop widths, with no horizontal page scrolling and no content clipped or overlapping. The Progress page, including its weekly completion donut, daily chart and life-area bars, MUST render the same data and layout in Safari as in Chrome. Browsers that could not be tested MUST be recorded as not verified.

#### Scenario: Progress in Safari
- **WHEN** a user with planned tasks opens `/progress` in Safari at desktop and 375 px width
- **THEN** the weekly donut, daily chart and life-area bars are fully drawn and show the same values and proportions as in Chrome

#### Scenario: Progress with nothing planned
- **WHEN** a user with no planned occurrences opens `/progress` in Chrome and Safari
- **THEN** the empty and "Nothing planned" states render without broken or empty graphics

#### Scenario: Other pages
- **WHEN** any other page is viewed in Chrome and Safari at 375 px and desktop width
- **THEN** it has no horizontal scrolling and all content and controls are reachable

### Requirement: The core user flow works end to end
A user SHALL be able to register, create a one-time and a recurring task, see the relevant tasks on the dashboard, complete a task, see the completion in the Weekly Overview and Progress, log out, and after logging in again find all tasks and completions unchanged. An automated test MUST cover this flow against the persisted database.

#### Scenario: Core flow
- **WHEN** a new user registers, creates a one-time task and a daily task, completes the daily task on the dashboard, views the weekly overview and progress, logs out and logs in again
- **THEN** both tasks are still present, the completion is still recorded, and the weekly overview and progress show it

#### Scenario: Isolation in the flow
- **WHEN** a second user runs the same flow in the same database
- **THEN** neither user sees the other's tasks or completions
