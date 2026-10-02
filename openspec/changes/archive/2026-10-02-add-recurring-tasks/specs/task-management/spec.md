# Spec Delta

## MODIFIED Requirements

### Requirement: Users see only their own tasks
The system SHALL show at `/tasks` exactly the tasks owned by the authenticated user. For each task it SHALL show the title, the notes (when present), its date (a scheduled date or a due date, when present; recurring tasks have none), the life area and whether the task is completed. A recurring task SHALL additionally show its recurrence in words (for example "Every day", "Mon, Thu" or "3 times per week"), and a times-per-week task SHALL show its count for the current calendar week. For a one-time task "completed" means it has been completed; for a recurring task it means it is done for today (the current calendar date), and it is never shown as permanently completed. Incomplete tasks SHALL be listed before completed tasks, and within each group the most recently created task SHALL come first. When the user has no tasks, the page SHALL show an empty state with a way to create the first task. Recurring tasks are always listed, and the passing of a day never removes them. A task's scheduled date or due date MUST NOT affect whether it is listed: an incomplete task remains listed after its date has passed, with its original date, until the user completes or deletes it, and the passing of a date MUST NEVER automatically hide, complete or delete a task.

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

#### Scenario: Recurring task displayed
- **WHEN** a task that repeats on Monday and Thursday is shown
- **THEN** it displays "Mon, Thu" (or an equivalent wording naming those days) and no scheduled or due date text

#### Scenario: Daily and weekly-target wording
- **WHEN** a daily task and a 3-times-per-week task are shown
- **THEN** they display "Every day" and "3 times per week" with the count "0 of 3 this week" respectively

#### Scenario: Recurring task done today
- **WHEN** a recurring task has a completion for today's calendar date
- **THEN** it is shown as done, in the completed group, with a filled completion control and struck-through title

#### Scenario: Recurring task open again the next day
- **WHEN** the current calendar date moves to a day for which the recurring task has no completion
- **THEN** it is shown as not done and is listed among the incomplete tasks

#### Scenario: Completion control reflects today's relevance
- **WHEN** a Monday-and-Thursday task is listed on a Tuesday, or a 2-times-per-week task that has reached its target is listed on a day it was not completed
- **THEN** it is still listed, its completion control is not available, and it states why (for example "Not scheduled today" or "Weekly target reached")

#### Scenario: Recurring tasks are not filtered by relevance
- **WHEN** a weekday task for Monday is listed on a Wednesday
- **THEN** it is still listed, because the task management list shows all tasks regardless of today's relevance and relevance filtering belongs to Today and Weekly Overview

### Requirement: Users can create a task
The system SHALL let an authenticated user create a task by submitting a title, optional notes, a recurrence choice, a date choice (one-time tasks only) and a life area. All validation MUST be performed on the server. The title MUST be non-empty after trimming and at most 255 characters. The notes are optional, are trimmed, MUST be at most 5000 characters, and a blank value is stored as no notes. The life area MUST be one of Career, Fitness, Health, Learning, Personal or Finance. The recurrence choice MUST be one of: does not repeat, every day, specific weekdays, times per week, and is validated as defined by the recurring-tasks capability. The date choice applies only when the task does not repeat and MUST be exactly one of: no date; scheduled for a specific date; due by a specific date. For the last two a date is required. A recurring task has no date; combining recurrence with a scheduled or due date is rejected. A date MUST be a real calendar date in the form `YYYY-MM-DD` within the range supported by date storage (1000-01-01 to 9999-12-31); it MAY be in the past, today or the future. The new task SHALL belong to the authenticated user, be incomplete (for a recurring task: not done today), and have exactly one recurrence rule of the chosen type. On success the user SHALL be returned to the task list, where the new task appears.

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

#### Scenario: Create a daily task
- **WHEN** a task is submitted with the recurrence "every day"
- **THEN** it is created without dates, with a daily rule, and appears in the list as "Every day"

#### Scenario: Create a weekday task
- **WHEN** a task is submitted with the recurrence "specific weekdays" and Monday and Thursday selected
- **THEN** it is created with a weekdays rule for those days and no dates

#### Scenario: Create a times-per-week task
- **WHEN** a task is submitted with the recurrence "times per week" and a target of 3
- **THEN** it is created with a times-per-week rule of 3 and no dates

#### Scenario: Invalid recurrence rejected
- **WHEN** a recurring task is submitted with no weekday, an out-of-range target or an unknown recurrence type
- **THEN** no task is created and the form shows an error on the matching recurrence field

#### Scenario: Recurrence with a date rejected
- **WHEN** a request chooses a recurring type together with a scheduled date or due date
- **THEN** no task is created and the form shows an error on the recurrence field

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
- **THEN** the form keeps the entered title, notes, recurrence choice, weekdays, weekly target, date choice, date and life area

#### Scenario: Owner cannot be chosen by the request
- **WHEN** a create request includes a user identifier in its submitted data
- **THEN** the task is still created for the authenticated user and the submitted identifier is ignored

### Requirement: Users can edit their own tasks
The system SHALL let an authenticated user change the title, notes, life area and recurrence of a task they own, using the same validation rules as creation. While the task is incomplete the user SHALL also be able to add a scheduled date or due date, change it, switch between "scheduled for" and "due by", or remove it, and the chosen date MAY be in the past, today or the future; it only has to be a valid supported calendar date. While the task is completed its scheduled date and due date are preserved and MUST NOT be changed: a request that tries to change them MUST be rejected with an error on the date field and nothing is saved, whereas title, notes and life area of a completed task can still be edited. A completed task that is marked incomplete again becomes fully editable, including its date. The recurrence of a task MAY be changed between the recurring types at any time and the task's completion history is kept. Changing a one-time task to a recurring type clears its scheduled date or due date, and is rejected with an error on the recurrence field while the one-time task is completed (the user must mark it incomplete first, consistent with its date being locked). Changing a recurring task to "does not repeat" is allowed only when the task has no completion history at all (no completion of any date); then it requires the date choice like creation and becomes an incomplete one-time task. When the task has any completion history the change MUST be rejected on the server with an error on the recurrence field and nothing is saved; completion history is never deleted or converted by an edit. The form MUST tell the user, before saving, that such a task cannot be converted to one-time while recurring completion history exists. After a change between recurring types the new rule governs relevance from then on, while existing completions remain as history. Editing without changing the recurrence MUST NOT change the task's owner, creation time, completed state or completion dates. On success the user SHALL be returned to the task list showing the updated task.

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

#### Scenario: Make a one-time task recurring
- **WHEN** a user changes an incomplete task scheduled for a future date to "every day" and saves
- **THEN** the task has a daily rule, no scheduled date and no due date, and the list shows "Every day"

#### Scenario: Completed one-time task cannot become recurring
- **WHEN** a user changes a completed one-time task to a recurring type and saves
- **THEN** nothing is saved and the form shows an error on the recurrence field explaining the task must be marked incomplete first

#### Scenario: Change between recurring types keeps history
- **WHEN** a user changes a daily task that has completions to "3 times per week" and saves
- **THEN** the rule is now times per week with target 3 and the existing completions are unchanged

#### Scenario: Change weekdays
- **WHEN** a user changes the weekdays of a task from Monday and Thursday to Tuesday
- **THEN** the rule holds exactly Tuesday

#### Scenario: Make a recurring task without history one-time
- **WHEN** a user changes a recurring task that has never been completed to "does not repeat" with the date choice "due by" a date and saves
- **THEN** the task is an incomplete one-time task with that due date and a rule of type none

#### Scenario: Recurring task with history cannot become one-time
- **WHEN** a user changes a recurring task that has at least one completion (of any date) to "does not repeat" and saves
- **THEN** nothing is saved, the rule and all completions are unchanged, and the form shows an error on the recurrence field

#### Scenario: Conversion rejection is enforced on the server
- **WHEN** a request to make a recurring task with completion history one-time is submitted directly, bypassing the form, or the history appeared after the form was opened
- **THEN** it is rejected exactly as above

#### Scenario: Form explains the restriction
- **WHEN** the edit form of a recurring task with completion history is shown
- **THEN** "Does not repeat" is not selectable and the form states that the task cannot be converted to one-time while recurring completion history exists

#### Scenario: Form allows conversion without history
- **WHEN** the edit form of a recurring task without any completion is shown
- **THEN** "Does not repeat" is selectable and reveals the normal date choice

#### Scenario: Older history blocks conversion
- **WHEN** a recurring task has a completion on an earlier day, none for today, and the user changes it to "does not repeat"
- **THEN** nothing is saved and the error on the recurrence field explains that it cannot be converted while recurring completion history exists; creating a separate one-time task is the way to get one

#### Scenario: Edit form prefilled with recurrence
- **WHEN** a user opens the edit form for a task repeating on Monday and Thursday
- **THEN** "Specific weekdays" is selected with Monday and Thursday chosen, and no date fields are shown

#### Scenario: Editing a recurring task's title keeps its state
- **WHEN** a user edits only the title of a recurring task that is done today
- **THEN** the task keeps its rule and today's completion

#### Scenario: Notes cleared
- **WHEN** a user empties the notes field of a task that had notes and saves
- **THEN** the task no longer has notes

#### Scenario: Invalid edit rejected
- **WHEN** a user saves an edit with a blank title, an invalid date or a life area outside the supported values
- **THEN** the task is unchanged and the form shows an error on the invalid field

#### Scenario: Editing a completed task
- **WHEN** a user edits the title of a completed task
- **THEN** the task remains completed with the new title

### Requirement: Users can mark tasks completed and incomplete
The system SHALL let an authenticated user mark a task they own as completed, and mark a completed task as incomplete again, directly from the task list. The new state MUST be persisted on the server, and MUST be shown after a reload. For a recurring task the control marks it done or not done for the current calendar date only, as defined by the recurring-tasks capability: the task itself is never completed, marking it done is accepted only while the task is relevant today, and un-completing removes only today's completion and is always accepted. The rest of this requirement describes one-time tasks. Completing a task SHALL be recorded as a completion for the current calendar date as determined by the application's calendar-date rules (see the requirement on calendar dates); marking it incomplete SHALL remove its completion. The completion date is independent of the task's scheduled date and due date: completing or uncompleting a task MUST NOT change either, and neither date affects whether or when the task can be completed (a task may be completed before, on or after its date). Completing a task preserves its scheduled date or due date. Completing an already completed task or uncompleting an incomplete task MUST leave the task unchanged and MUST NOT create duplicate completion records.

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

#### Scenario: Recurring task completed from the list
- **WHEN** a user completes their recurring task from the list
- **THEN** a completion for today's calendar date is recorded, the task is shown as done today, and it is not permanently completed

#### Scenario: Recurring task marked not done again
- **WHEN** a user marks a recurring task done today as incomplete
- **THEN** only today's completion is removed and earlier days' completions remain

#### Scenario: Recurring task not relevant today cannot be completed
- **WHEN** a request marks a Monday-and-Thursday task done on a Tuesday, or marks a times-per-week task done after its weekly target was reached
- **THEN** no completion is recorded, the request is rejected on the server with a message shown to the user, and the persisted state is unchanged

#### Scenario: One-time completion unchanged
- **WHEN** a one-time task is completed
- **THEN** it behaves exactly as before, with a single completion and its date preserved

### Requirement: Date entry makes the two kinds of date understandable
When the task does not repeat, the create and edit forms SHALL present the date choice as three clearly labelled options: "No date", "Scheduled for" (the task happens on that day) and "Due by" (the deadline for the task), each with a short explanatory hint, and SHALL show the date choice and field only for a task that does not repeat, and the date field only when "Scheduled for" or "Due by" is chosen. Selecting "No date" SHALL clear the date. The date field SHALL accept past, current and future dates and SHALL be read-only for a completed task. Dates SHALL be displayed in the German day-first format `DD.MM.YYYY`.

#### Scenario: Choosing a kind of date
- **WHEN** the user opens the create form
- **THEN** "No date" is preselected, no date field is shown, and choosing "Scheduled for" or "Due by" reveals a date field with a hint explaining the difference

#### Scenario: Edit form reflects the stored kind
- **WHEN** the user opens the edit form of a task due by 2026-10-10
- **THEN** "Due by" is selected and the date field holds 2026-10-10

#### Scenario: Date display format
- **WHEN** a date of 2026-10-05 is displayed on the task list
- **THEN** it reads 05.10.2026

#### Scenario: Dates hidden for recurring tasks
- **WHEN** a recurring type is selected in the form
- **THEN** the date choice and date field are not shown, and they reappear when "does not repeat" is selected again

## REMOVED Requirements

### Requirement: Task management creates only one-time tasks
**Reason**: Recurring tasks are now supported. The rule that a task never combines recurrence with a scheduled or due date, and that dates have no effect on listing, order or overdue state in this capability, is retained by the modified requirements above and by the recurring-tasks capability.
**Migration**: One-time tasks keep a recurrence rule of type none and unchanged behavior. The forms now additionally offer the recurrence choice; the statements that dates do not change list order or style remain true and are covered by the existing ordering scenario of the list requirement.

## ADDED Requirements

### Requirement: Task forms offer recurrence without mixing it with dates
The create and edit forms SHALL offer a "Repeats" choice with the options "Does not repeat", "Every day", "Specific weekdays" and "Times per week", each with a short hint. "Does not repeat" SHALL be preselected on creation and shows the date choice. "Specific weekdays" SHALL show seven weekday toggles (Monday to Sunday, in that order) with accessible names; "Times per week" SHALL show a numeric target input from 1 to 7. Choosing a recurring option hides the date choice and date field. When editing a recurring task that has completion history, the "Does not repeat" option SHALL NOT be selectable and the form SHALL explain that such a task cannot be converted to one-time while recurring completion history exists (the server enforces this independently). Entered values SHALL be kept when validation fails. Controls MUST have accessible names and remain usable at 375 px width without horizontal scrolling, following the existing visual reference. The forms offer no other fields than title, notes, recurrence (with weekdays or target), date choice (one-time only) and life area.

#### Scenario: Create form defaults
- **WHEN** the user opens the create form
- **THEN** "Does not repeat" is preselected, the date choice is shown, and no weekday or target controls are shown

#### Scenario: Choosing specific weekdays
- **WHEN** the user selects "Specific weekdays"
- **THEN** seven weekday toggles Monday to Sunday appear, the date choice is hidden, and none of the toggles is preselected

#### Scenario: Choosing times per week
- **WHEN** the user selects "Times per week"
- **THEN** a target input accepting 1 to 7 appears and the date choice is hidden

#### Scenario: Small screen
- **WHEN** the forms are viewed at 375 px width with "Specific weekdays" selected
- **THEN** all weekday toggles are reachable without horizontal scrolling

