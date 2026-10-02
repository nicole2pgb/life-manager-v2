# Spec Delta

## MODIFIED Requirements

### Requirement: Users can mark tasks completed and incomplete
The system SHALL let an authenticated user mark a task they own as completed, and mark a completed task as incomplete again, directly from the task list or from the dashboard. The new state MUST be persisted on the server, and MUST be shown after a reload. For a recurring task the control marks it done or not done for the current calendar date only, as defined by the recurring-tasks capability: the task itself is never completed, marking it done is accepted only while the task is relevant today, and un-completing removes only today's completion and is always accepted. The rest of this requirement describes one-time tasks. Completing a task SHALL be recorded as a completion for the current calendar date as determined by the application's calendar-date rules (see the requirement on calendar dates); marking it incomplete SHALL remove its completion. The completion date is independent of the task's scheduled date and due date: completing or uncompleting a task MUST NOT change either, and neither date affects whether or when the task can be completed (a task may be completed before, on or after its date). Completing a task preserves its scheduled date or due date. Completing an already completed task or uncompleting an incomplete task MUST leave the task unchanged and MUST NOT create duplicate completion records. After the operation the user SHALL return to the page it was started from (the task list or the dashboard), and both pages MUST show the new state; only those two pages are valid return targets, and any other requested target MUST fall back to the task list. Creating, editing and deleting a task likewise refresh both pages.

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

#### Scenario: Completed from the dashboard
- **WHEN** a user completes a task from the dashboard
- **THEN** they stay on the dashboard, and the task list shows the task completed when opened

#### Scenario: Completed from the list stays on the list
- **WHEN** a user completes a task from the task list
- **THEN** they stay on the task list, and the dashboard shows the same state when opened

#### Scenario: Unknown return target
- **WHEN** a completion request names a return target other than the task list or the dashboard
- **THEN** the completion is processed and the user is returned to the task list

#### Scenario: Task changes refresh the dashboard
- **WHEN** a task is created, edited or deleted
- **THEN** the dashboard shows the change when it is opened next
