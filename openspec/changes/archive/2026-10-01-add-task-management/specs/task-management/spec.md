# Spec Delta

## Purpose

Lets an authenticated user keep a personal list of one-time tasks: view, create, edit, delete and mark them completed or incomplete, with every operation strictly limited to the user's own tasks.

## ADDED Requirements

### Requirement: Task pages require an authenticated user
The system SHALL make the task list and every task operation available only to an authenticated user. A visitor without a valid session MUST be redirected to `/login` and MUST NOT receive any task data.

#### Scenario: Unauthenticated visit to the task list
- **WHEN** a visitor without a valid session opens `/tasks`
- **THEN** they are redirected to `/login` and no task data is returned

#### Scenario: Unauthenticated task operation
- **WHEN** a create, edit, delete or complete request is sent without a valid session
- **THEN** no task is created or changed and the request does not succeed

### Requirement: Users see only their own tasks
The system SHALL show at `/tasks` exactly the tasks owned by the authenticated user. For each task it SHALL show the title, the notes (when present), its date (a scheduled date or a due date, when present), the life area and whether the task is completed. Incomplete tasks SHALL be listed before completed tasks, and within each group the most recently created task SHALL come first. When the user has no tasks, the page SHALL show an empty state with a way to create the first task. A task's scheduled date or due date MUST NOT affect whether it is listed: an incomplete task remains listed after its date has passed, with its original date, until the user completes or deletes it, and the passing of a date MUST NEVER automatically hide, complete or delete a task.

#### Scenario: List shows only own tasks
- **WHEN** user A has two tasks and user B has three tasks and user A opens `/tasks`
- **THEN** exactly user A's two tasks are shown and none of user B's

#### Scenario: Task details displayed
- **WHEN** a task with a title, notes and the life area Health is shown
- **THEN** the title, the notes and the Health life area are visible, and the task is displayed as incomplete

#### Scenario: Scheduled date displayed
- **WHEN** a task scheduled for 2026-10-05 is shown
- **THEN** it displays "Scheduled for 05.10.2026" with the day-first German date format, and the date is the same regardless of the viewer's or server's time zone

#### Scenario: Due date displayed
- **WHEN** a task with the due date 2026-10-05 is shown
- **THEN** it displays "Due by 05.10.2026", visibly distinguishable in wording from a scheduled date

#### Scenario: Incomplete task stays after its scheduled date passes
- **WHEN** an incomplete task was scheduled for 2026-10-01 and the current day is 2026-10-05
- **THEN** it is still listed as an open task, still shows "Scheduled for 01.10.2026", and has not been completed or deleted

#### Scenario: Incomplete task stays after its due date passes
- **WHEN** an incomplete task was due by 2026-10-01 and the current day is 2026-10-05
- **THEN** it is still listed as an open task, still shows "Due by 01.10.2026", and has not been completed or deleted

#### Scenario: Task without a date
- **WHEN** a task has neither a scheduled date nor a due date
- **THEN** it is shown without any date text or placeholder

#### Scenario: Task without notes
- **WHEN** a task has no notes
- **THEN** it is shown without a notes line and without placeholder text

#### Scenario: Ordering
- **WHEN** the user has an older incomplete task, a newer incomplete task and a completed task
- **THEN** the newer incomplete task is listed first, then the older incomplete task, then the completed task

#### Scenario: Empty state
- **WHEN** a user with no tasks opens `/tasks`
- **THEN** an empty state is shown with a control that leads to creating a task

### Requirement: Users can create a task
The system SHALL let an authenticated user create a one-time task by submitting a title, optional notes, a date choice and a life area. All validation MUST be performed on the server. The title MUST be non-empty after trimming and at most 255 characters. The notes are optional, are trimmed, MUST be at most 5000 characters, and a blank value is stored as no notes. The life area MUST be one of Career, Fitness, Health, Learning, Personal or Finance. The date choice MUST be exactly one of: no date; scheduled for a specific date; due by a specific date. For the last two a date is required. A date MUST be a real calendar date in the form `YYYY-MM-DD` within the range supported by date storage (1000-01-01 to 9999-12-31); it MAY be in the past, today or the future. The new task SHALL belong to the authenticated user, be incomplete, and be a one-time task. On success the user SHALL be returned to the task list, where the new task appears.

#### Scenario: Successful creation
- **WHEN** a signed-in user submits the title "Book dentist", no notes and the life area Health
- **THEN** a task owned by that user is created, is incomplete, and appears in their task list

#### Scenario: Title is trimmed
- **WHEN** a task is submitted with the title "  Call mom  "
- **THEN** it is stored and shown as "Call mom"

#### Scenario: Blank title rejected
- **WHEN** the title is empty or only whitespace
- **THEN** no task is created and the form shows an error on the title field

#### Scenario: Title too long
- **WHEN** the title is longer than 255 characters
- **THEN** no task is created and the form shows an error on the title field

#### Scenario: Notes too long
- **WHEN** the notes are longer than 5000 characters
- **THEN** no task is created and the form shows an error on the notes field

#### Scenario: Blank notes stored as empty
- **WHEN** a task is submitted with notes that are only whitespace
- **THEN** the task is created without notes

#### Scenario: Create without a date
- **WHEN** a task is submitted with the date choice "no date"
- **THEN** the task is created with neither a scheduled date nor a due date

#### Scenario: Create scheduled for today
- **WHEN** a task is submitted as scheduled for today's date
- **THEN** the task is created with that scheduled date and no due date

#### Scenario: Create scheduled for a future date
- **WHEN** a task is submitted as scheduled for a future date
- **THEN** the task is created with that scheduled date and no due date, and the list shows it as "Scheduled for" that date

#### Scenario: Create with a due date of today
- **WHEN** a task is submitted as due by today's date
- **THEN** the task is created with that due date and no scheduled date

#### Scenario: Create with a future due date
- **WHEN** a task is submitted as due by a future date
- **THEN** the task is created with that due date and no scheduled date, and the list shows it as "Due by" that date

#### Scenario: Scheduled date and due date are different
- **WHEN** one task is scheduled for 2026-10-10 and another is due by 2026-10-10
- **THEN** the system stores and shows them as different kinds of date, and a task never has both

#### Scenario: Create scheduled for a past date
- **WHEN** a task is submitted as scheduled for a date before today
- **THEN** the task is created with that scheduled date and appears in the list as an open task

#### Scenario: Create with a past due date
- **WHEN** a task is submitted as due by a date before today
- **THEN** the task is created with that due date and appears in the list as an open task

#### Scenario: Missing date for a date choice
- **WHEN** the choice is "scheduled for" or "due by" and no date is provided
- **THEN** no task is created and the form shows an error on the date field

#### Scenario: Invalid date rejected
- **WHEN** the date is not a real calendar date (for example 2026-02-30 or 2026-13-01) or is not in `YYYY-MM-DD` form
- **THEN** no task is created and the form shows an error on the date field

#### Scenario: Leap day accepted
- **WHEN** the date 2028-02-29 is submitted
- **THEN** it is accepted, while 2027-02-29 is rejected

#### Scenario: Date outside the supported range rejected
- **WHEN** the date is 0999-12-31 or 10000-01-01
- **THEN** no task is created and the form shows an error on the date field

#### Scenario: Unknown date choice rejected
- **WHEN** a request contains a date choice other than the three supported ones
- **THEN** no task is created and the form shows an error on the date field

#### Scenario: Date ignored when the choice is no date
- **WHEN** a request chooses "no date" but still carries a date value
- **THEN** the task is created with no date

#### Scenario: Invalid life area rejected
- **WHEN** a request contains a life area outside the six supported values, or none
- **THEN** no task is created and the form shows an error on the life area field

#### Scenario: Entered values kept on error
- **WHEN** creation fails validation
- **THEN** the form keeps the entered title, notes, date choice, date and life area

#### Scenario: Owner cannot be chosen by the request
- **WHEN** a create request includes a user identifier in its submitted data
- **THEN** the task is still created for the authenticated user and the submitted identifier is ignored

### Requirement: Users can edit their own tasks
The system SHALL let an authenticated user change the title, notes and life area of a task they own, using the same validation rules as creation. While the task is incomplete the user SHALL also be able to add a scheduled date or due date, change it, switch between "scheduled for" and "due by", or remove it, and the chosen date MAY be in the past, today or the future; it only has to be a valid supported calendar date. While the task is completed its scheduled date and due date are preserved and MUST NOT be changed: a request that tries to change them MUST be rejected with an error on the date field and nothing is saved, whereas title, notes and life area of a completed task can still be edited. A completed task that is marked incomplete again becomes fully editable, including its date. Editing MUST NOT change the task's owner, creation time, completed state or completion dates. On success the user SHALL be returned to the task list showing the updated task.

#### Scenario: Successful edit
- **WHEN** a user changes the title of their task to "Book dentist appointment" and saves
- **THEN** the task list shows the new title, and the task keeps its owner, creation time and completed state

#### Scenario: Edit form is prefilled
- **WHEN** a user opens the edit form for their task
- **THEN** the form shows the task's current title, notes, date choice and date ("no date" when none) and life area; for a completed task the date is shown read-only

#### Scenario: Add a date
- **WHEN** a user changes a task with no date to "scheduled for" a future date and saves
- **THEN** the list shows "Scheduled for" that date

#### Scenario: Change a date
- **WHEN** a user changes a task's scheduled date from one future date to another and saves
- **THEN** the list shows the new date and the task is otherwise unchanged

#### Scenario: Switch between scheduled date and due date
- **WHEN** a user changes a task scheduled for a future date to "due by" the same date and saves
- **THEN** the task has that due date and no scheduled date

#### Scenario: Remove a date
- **WHEN** a user changes a task that has a scheduled date or due date to "no date" and saves
- **THEN** the task has neither date and the list shows no date text for it

#### Scenario: Change to a past date
- **WHEN** a user changes an incomplete task's scheduled date or due date to a date before today and saves
- **THEN** the save succeeds and the list shows that past date on the open task

#### Scenario: Edit date of a task whose date has passed
- **WHEN** an incomplete task's date has already passed and the user changes or removes it
- **THEN** the save succeeds

#### Scenario: Date of a completed task cannot be changed
- **WHEN** a user submits a changed, switched or removed date for a completed task
- **THEN** the task is unchanged, nothing is saved, and the form shows an error on the date field explaining the task must be marked incomplete first

#### Scenario: Completed task keeps its date when other fields change
- **WHEN** a user edits only the title of a completed task that has a scheduled date or due date
- **THEN** the save succeeds and the date is unchanged

#### Scenario: Date editable again after marking incomplete
- **WHEN** a completed task is marked incomplete again
- **THEN** its scheduled date or due date, which was preserved, can be changed or removed

#### Scenario: Completed task's date is read-only in the form
- **WHEN** the edit form of a completed task with a due date is shown
- **THEN** the date is displayed but cannot be edited, with a hint that the task must be marked incomplete to change it

#### Scenario: Notes cleared
- **WHEN** a user empties the notes field of a task that had notes and saves
- **THEN** the task no longer has notes

#### Scenario: Invalid edit rejected
- **WHEN** a user saves an edit with a blank title, an invalid date or a life area outside the supported values
- **THEN** the task is unchanged and the form shows an error on the invalid field

#### Scenario: Editing a completed task
- **WHEN** a user edits the title of a completed task
- **THEN** the task remains completed with the new title

### Requirement: Users can delete their own tasks
The system SHALL let an authenticated user delete a task they own. The system MUST require an explicit confirmation before a task is deleted; a single click on the delete control alone MUST NOT delete it. Deleting a task SHALL also remove its recurrence rule and completion records, and MUST NOT affect any other task.

#### Scenario: Delete requires confirmation
- **WHEN** a user activates the delete control of a task
- **THEN** a confirmation step is shown and the task is not deleted until the user confirms

#### Scenario: Cancelling keeps the task
- **WHEN** a user cancels the confirmation step
- **THEN** the task remains in the list unchanged

#### Scenario: Confirmed deletion
- **WHEN** a user confirms deletion of their task
- **THEN** the task disappears from their list and its recurrence rule and completion records no longer exist

#### Scenario: Other tasks unaffected
- **WHEN** a user deletes one of their tasks
- **THEN** all their other tasks and all other users' tasks are unchanged

### Requirement: Users can mark tasks completed and incomplete
The system SHALL let an authenticated user mark a task they own as completed, and mark a completed task as incomplete again, directly from the task list. The new state MUST be persisted on the server, and MUST be shown after a reload. Completing a task SHALL be recorded as a completion for the current calendar date as determined by the application's calendar-date rules (see the requirement on calendar dates); marking it incomplete SHALL remove its completion. The completion date is independent of the task's scheduled date and due date: completing or uncompleting a task MUST NOT change either, and neither date affects whether or when the task can be completed (a task may be completed before, on or after its date). Completing a task preserves its scheduled date or due date. Completing an already completed task or uncompleting an incomplete task MUST leave the task unchanged and MUST NOT create duplicate completion records.

#### Scenario: Complete a task
- **WHEN** a user marks their incomplete task as completed
- **THEN** the task is shown as completed, still appears in the list, and stays completed after a page reload

#### Scenario: Mark a task incomplete again
- **WHEN** a user marks their completed task as incomplete
- **THEN** the task is shown as incomplete and stays incomplete after a page reload

#### Scenario: Repeated completion is idempotent
- **WHEN** a completion request is processed twice for the same incomplete task, for example through a double click
- **THEN** the task is completed and exactly one completion record exists

#### Scenario: Completion preserves the date for later editing
- **WHEN** an incomplete task with a due date is completed and later marked incomplete
- **THEN** its due date is still the original one

#### Scenario: Completion is independent of dates
- **WHEN** a task scheduled for a future date, a task due by a past date and a task with no date are each completed
- **THEN** each becomes completed with a completion recorded for today's calendar date, and their scheduled and due dates are unchanged

#### Scenario: Completion does not alter the task
- **WHEN** a task is completed and later marked incomplete
- **THEN** its title, notes, scheduled date, due date, life area, owner and creation time are unchanged

### Requirement: Calendar dates follow one central definition of the user's day
The system SHALL determine "today" and the calendar date of any instant through one central calendar-date definition, not through ad-hoc conversions at each use. A calendar date is a day (`YYYY-MM-DD`) without time of day or time zone. For the MVP all users SHALL be treated as living in one application-wide time zone, which is configurable by deployment and has a documented default; the definition MUST be structured so that a per-user time zone can be introduced later without changing stored dates or callers' expectations. The calendar date of an instant is the date shown on a wall clock in that time zone at that instant.

#### Scenario: Day boundary ahead of UTC
- **WHEN** the application time zone is ahead of UTC (for example Europe/Berlin) and the instant is 2026-10-01 23:30 UTC
- **THEN** the calendar date is 2026-10-02

#### Scenario: Day boundary behind UTC
- **WHEN** the application time zone is behind UTC (for example America/Los_Angeles) and the instant is 2026-10-02 03:00 UTC
- **THEN** the calendar date is 2026-10-01

#### Scenario: Daylight saving transitions
- **WHEN** the instants just before and after a daylight-saving change in the application time zone are converted
- **THEN** each instant maps to the date on the local wall clock in that zone

#### Scenario: Completion recorded on the user's day
- **WHEN** a user in the application time zone completes a task at 00:30 local time on 2026-10-02 (which is 2026-10-01 22:30 UTC)
- **THEN** the completion is recorded for 2026-10-02

#### Scenario: Stored dates do not shift
- **WHEN** a scheduled date, due date or completion date is stored and read back under a different server or database time zone
- **THEN** the same calendar date is returned

### Requirement: Task operations are scoped to the authenticated user
Every task read and write MUST be limited to tasks owned by the authenticated user. The identity of the user SHALL be taken only from the server-side session, never from form fields, URL parameters or other request input. A task belonging to another user MUST behave exactly like a task that does not exist: the user can neither read, edit, complete, uncomplete nor delete it, and the response MUST NOT reveal whether such a task exists.

#### Scenario: Opening another user's task for editing
- **WHEN** user A requests the edit page for a task owned by user B
- **THEN** the same not-found response is returned as for a task identifier that does not exist, and none of user B's task data is shown

#### Scenario: Editing another user's task
- **WHEN** user A submits an edit for the identifier of a task owned by user B
- **THEN** user B's task is unchanged and the request fails as not found

#### Scenario: Deleting another user's task
- **WHEN** user A submits a delete for the identifier of a task owned by user B
- **THEN** user B's task still exists and the request fails as not found

#### Scenario: Completing or uncompleting another user's task
- **WHEN** user A submits a complete or incomplete request for the identifier of a task owned by user B
- **THEN** no completion record is created or removed for user B's task and the request fails as not found

#### Scenario: Identifier that does not exist
- **WHEN** a user requests, edits, completes or deletes a task identifier that does not exist or is malformed
- **THEN** the request fails as not found and nothing is changed

### Requirement: Task management creates only one-time tasks
In this capability every task SHALL be a one-time task, stored with a recurrence rule of type none. Scheduled dates and due dates apply only to one-time tasks and MUST NOT be combined with recurrence. The task forms MUST NOT offer recurrence or other fields beyond title, notes, the date choice (with its date) and life area. The scheduled date and due date have no effect on how or whether a task is listed in this capability, and no overdue indication, date-based ordering, Today, Weekly Overview or Progress behavior is provided; the dates are only stored, displayed and editable under the rules above, and are kept unchanged when time passes so later features can compare the original date with the current day.

#### Scenario: Created task is one-time
- **WHEN** a task is created
- **THEN** exactly one recurrence rule of type none exists for it

#### Scenario: Forms show only supported fields
- **WHEN** the create or edit form is shown
- **THEN** it offers title, notes, a date choice with a date field and life area only

#### Scenario: Dates do not change list order or style
- **WHEN** tasks with different scheduled dates, due dates and no dates exist
- **THEN** their order is still incomplete first, then newest created first, and no task is styled as overdue

### Requirement: Date entry makes the two kinds of date understandable
The create and edit forms SHALL present the date choice as three clearly labelled options: "No date", "Scheduled for" (the task happens on that day) and "Due by" (the deadline for the task), each with a short explanatory hint, and SHALL show the date field only when "Scheduled for" or "Due by" is chosen. Selecting "No date" SHALL clear the date. The date field SHALL accept past, current and future dates and SHALL be read-only for a completed task. Dates SHALL be displayed in the German day-first format `DD.MM.YYYY`.

#### Scenario: Choosing a kind of date
- **WHEN** the user opens the create form
- **THEN** "No date" is preselected, no date field is shown, and choosing "Scheduled for" or "Due by" reveals a date field with a hint explaining the difference

#### Scenario: Edit form reflects the stored kind
- **WHEN** the user opens the edit form of a task due by 2026-10-10
- **THEN** "Due by" is selected and the date field holds 2026-10-10

#### Scenario: Date display format
- **WHEN** a date of 2026-10-05 is displayed on the task list
- **THEN** it reads 05.10.2026

### Requirement: Task screens follow the visual reference and are usable on small screens
The task list and the create and edit forms SHALL follow the dark theme with pink accent and rounded cards shown in `docs/ui-reference/tasks.png`, `create-task.png` and `edit-task.png`, showing the life area as a labelled badge, a round completion control and edit and delete controls on each task. Controls MUST have accessible names, and completed tasks MUST be distinguishable by more than color. The pages MUST remain usable at a 375 px viewport width without horizontal scrolling. Failed operations SHALL show a useful error message instead of a blank or crashed page.

#### Scenario: Completed task is visually distinct
- **WHEN** a task is completed
- **THEN** it is shown with a filled completion control and struck-through title

#### Scenario: Small screen layout
- **WHEN** the task list and forms are viewed at 375 px width
- **THEN** all content and controls are reachable without horizontal scrolling

#### Scenario: Operation fails unexpectedly
- **WHEN** saving, completing or deleting a task fails because of a server or database error
- **THEN** the user sees an error message and the previous persisted state remains shown
