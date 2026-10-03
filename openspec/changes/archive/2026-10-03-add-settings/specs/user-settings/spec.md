# Spec Delta

## Purpose

Defines the Settings screen and the per-user preferences behind it (theme color, week start, daily check-in, life areas): how they are stored, validated and applied across the application, so users can tailor Life Manager to how they plan their week.

## ADDED Requirements

### Requirement: The settings page requires an authenticated user and shows only their settings
The system SHALL provide `/settings` for authenticated users only. A visitor without a valid session MUST be redirected to `/login` and MUST NOT receive any settings data. Settings SHALL be read and written only for the user identified by the server-side session; a user id MUST NOT be accepted from form fields, URL parameters or other request input.

#### Scenario: Unauthenticated visit
- **WHEN** a visitor without a valid session opens `/settings`
- **THEN** they are redirected to `/login` and no settings data is returned

#### Scenario: Two users have independent settings
- **WHEN** user A saves the theme Blue and user B has never saved settings
- **THEN** user B still sees Pink and the defaults, and user A's page shows Blue

#### Scenario: Unauthenticated save
- **WHEN** the save action is invoked without a valid session
- **THEN** nothing is stored and the visitor is redirected to `/login`

### Requirement: Users without saved settings get the documented defaults
A user who has never saved settings (including every existing user at release) SHALL be treated as having: theme color Pink, week start Monday, daily check-in off, check-in time 09:00, and all six life areas selected. Defaults MUST apply on every screen without a settings record having been created. The first successful save SHALL create the user's single settings record; later saves SHALL update it. A user MUST NOT have more than one settings record.

#### Scenario: Existing user opens Settings
- **WHEN** a user who registered before this feature opens `/settings`
- **THEN** Pink is selected, the week starts on Monday, the daily check-in is off at 09:00 and all six life areas are selected

#### Scenario: First save creates the record
- **WHEN** a user without a settings record saves the theme Green
- **THEN** a record exists with theme Green and the defaults for everything else

#### Scenario: Repeated saves
- **WHEN** a user saves settings twice
- **THEN** exactly one record exists and it holds the second save's values

### Requirement: Settings persist across sessions
Saved settings SHALL be stored in the database, not only in the browser, and SHALL be shown again after reload, logout and login, and on another device.

#### Scenario: Persist after logout
- **WHEN** a user saves the theme Purple and week start Sunday, logs out and logs in again
- **THEN** `/settings` shows Purple and Sunday, and the application uses them

### Requirement: The settings page shows theme, weekly rhythm and life areas as in the visual reference
The page SHALL follow the dark layout of `docs/ui-reference/settings.png` and show three cards: "Theme color" with the five choices Pink, Purple, Blue, Green and Red (color swatch and name, the current choice marked); "Weekly rhythm" with a "Week starts on" choice of Monday or Sunday and a "Daily check-in" row with an on/off control and a time input, with a note that the reminder is not actually delivered yet; and "Life areas" with the six areas Career, Fitness, Health, Learning, Personal and Finance as toggles. The current saved values SHALL be preselected. The page SHALL be usable on small screens without horizontal overflow, and every control SHALL be operable by keyboard with a visible focus state and a text label (not color alone). The page SHALL have loading and error states consistent with the other protected pages.

#### Scenario: Current values shown
- **WHEN** a user with saved theme Blue, Sunday, check-in on at 07:30 and the areas Health and Learning opens `/settings`
- **THEN** Blue is marked, Sunday is chosen, the check-in is on with 07:30, and only Health and Learning are selected

#### Scenario: No delivery is promised
- **WHEN** the daily check-in is switched on
- **THEN** the page states that the reminder is not delivered yet, and no notification is ever sent

### Requirement: Settings are saved together and validated on the server
The page SHALL provide one explicit Save button that submits all settings at once; changing a control MUST NOT save anything by itself. Validation MUST be performed on the server: the theme color MUST be one of Pink, Purple, Blue, Green, Red; the week start MUST be Monday or Sunday; the check-in switch MUST be on or off; the check-in time MUST be a valid 24-hour `HH:MM` time; and the selected life areas MUST be a non-empty set of distinct values from the six supported areas. If any value is invalid, nothing SHALL be stored and the form SHALL show an error on the offending field and keep the user's other entries. On success the page SHALL confirm the save and show the saved values. A check-in time submitted while the check-in is off MUST still be validated and stored, so it is kept when the check-in is later switched on.

#### Scenario: Nothing saved before Save
- **WHEN** a user changes the theme selection but does not press Save and reloads the page
- **THEN** the previously saved values are shown and nothing was stored

#### Scenario: Successful save
- **WHEN** a signed-in user selects Green, Sunday, check-in on at 20:00, the areas Career and Fitness, and saves
- **THEN** the values are stored for that user, a confirmation is shown, and reloading the page shows the same values

#### Scenario: Invalid theme rejected
- **WHEN** a request contains the theme `Orange` or no theme
- **THEN** nothing is stored and the form shows an error on the theme field

#### Scenario: Invalid week start rejected
- **WHEN** a request contains the week start `Friday`
- **THEN** nothing is stored and the form shows an error on the week-start field

#### Scenario: Invalid check-in time rejected
- **WHEN** a request contains the time `25:99`, `8am` or an empty value
- **THEN** nothing is stored and the form shows an error on the time field

#### Scenario: No life area selected
- **WHEN** a request selects no life area
- **THEN** nothing is stored and the form shows an error that at least one life area is required

#### Scenario: Unknown or duplicate life area rejected
- **WHEN** a request contains a life area outside the six supported values, or the same area twice
- **THEN** nothing is stored and the form shows an error on the life-area field

#### Scenario: Time kept while check-in is off
- **WHEN** a user saves the check-in as off with the time 18:30
- **THEN** the stored time is 18:30 and the page shows it, dimmed, with the check-in off

### Requirement: The daily check-in is stored but never delivered
The daily check-in enabled state and time SHALL be stored for the user and shown in Settings. The system MUST NOT send notifications, emails, push messages or any other reminder, and MUST NOT schedule any reminder, background job or timer for it, in this change.

#### Scenario: Enabled check-in
- **WHEN** a user enables the daily check-in at 09:00
- **THEN** the setting is stored and no reminder of any kind is delivered at 09:00

### Requirement: The selected theme color is the accent color of the protected application
The selected theme color SHALL determine the accent color (highlighted navigation, primary buttons, active states, focus rings, badges and other accent-colored elements) on every page of the authenticated application, on first render without a flash of the default color, and for each user independently. Pink SHALL be the default. The five themes SHALL keep readable text on accent-colored elements and the dark base theme. Pages outside the authenticated application (login, registration) SHALL use Pink.

#### Scenario: Theme applied everywhere
- **WHEN** a user saves the theme Blue and then opens the Dashboard, Tasks, Weekly Overview, Progress, Profile and Settings
- **THEN** each page shows its accent elements in blue and none in pink

#### Scenario: Default theme
- **WHEN** a user has not saved a theme
- **THEN** the accent color is pink on all protected pages

#### Scenario: Theme takes effect after saving
- **WHEN** the user saves a different theme
- **THEN** the Settings page itself and the navigation show the new accent without a manual reload

#### Scenario: Auth pages stay pink
- **WHEN** a user whose theme is Green logs out and opens `/login`
- **THEN** the login page uses the pink accent

### Requirement: All week-based behavior follows the user's week start
The user's week start (Monday or Sunday) SHALL determine, together and consistently, the first day of every calendar week used for: which completions count toward a times-per-week task and when its count resets; the planned and completed occurrences of a week; the Dashboard weekly summary; the weeks shown in Weekly Overview and the order of its day columns; and the current and previous week and the daily bars in Progress. Changing the week start SHALL take effect on these screens at the next page load without altering any stored task, rule or completion. The week start MUST NOT change the numbering of weekdays stored in recurrence rules (Monday = 1 … Sunday = 7) or the meaning of weekday selections in the task form. Streaks, which count consecutive days, are unaffected.

#### Scenario: Screens agree after the change
- **WHEN** a user switches the week start from Monday to Sunday
- **THEN** the Dashboard weekly summary, Weekly Overview current week and Progress current week all cover the same Sunday–Saturday dates

#### Scenario: Stored data unchanged
- **WHEN** the week start is changed
- **THEN** no task, recurrence rule or completion is modified, and switching back restores the previous numbers exactly

#### Scenario: Weekday rules keep their meaning
- **WHEN** a task repeats on Monday and Thursday and the week start is Sunday
- **THEN** it is still planned on Mondays and Thursdays

#### Scenario: Weekday selector order unchanged
- **WHEN** the week start is Sunday and the user opens the create or edit task form with "Specific weekdays"
- **THEN** the weekday toggles are still shown in the order Monday to Sunday

#### Scenario: Streak unaffected
- **WHEN** the week start is changed
- **THEN** the current streak shows the same number

### Requirement: Task forms offer the user's selected life areas
The create and edit task forms SHALL offer only the life areas the user has selected in Settings. The server MUST reject creating a task in a life area that is not currently selected. When editing an existing task whose life area is no longer selected, the form SHALL still offer that area, so the task can be saved without changing it; the user MAY move it to a selected area, after which the deselected area is no longer offered for it. Deselecting an area MUST NOT change, hide or delete existing tasks, and Progress by life area continues to list all six areas as defined by the progress capability. A new task's default life area SHALL be Personal when Personal is selected, otherwise the first selected area in the order Career, Fitness, Health, Learning, Personal, Finance.

#### Scenario: Only selected areas offered
- **WHEN** the user has selected Health and Learning and opens the create-task form
- **THEN** only Health and Learning are offered

#### Scenario: Deselected area rejected on create
- **WHEN** a request creates a task with the life area Finance while Finance is not selected
- **THEN** no task is created and the form shows an error on the life area field

#### Scenario: Existing task keeps its deselected area
- **WHEN** a task in Finance exists, Finance is then deselected, and the user edits only the title
- **THEN** the form offers Finance for this task and the save succeeds with the area unchanged

#### Scenario: Existing tasks stay visible
- **WHEN** an area with tasks is deselected
- **THEN** its tasks still appear in the task list, Today, Weekly Overview and Progress

#### Scenario: Default area
- **WHEN** Personal is not selected and Career and Health are
- **THEN** the create form preselects Career

### Requirement: Settings are reachable from the main navigation
The authenticated navigation SHALL include a "Settings" entry linking to `/settings` and marking it as current while a settings page is shown.

#### Scenario: Navigate to Settings
- **WHEN** a signed-in user selects "Settings" in the navigation
- **THEN** `/settings` opens with the entry marked as current
