# MVP Scope

## Goal

Build the smallest working version of Life Manager that supports the validated core user flow:

Manage tasks → Complete today's tasks → Check weekly progress

## Included in MVP

### User Account

- Register with name, email and password
- Login
- Logout
- Persistent authenticated session
- Profile screen showing the user's name and email
- User menu with access to Profile, Settings and Logout
- Each user can only access their own data

### Task Management

- Create tasks
- Edit tasks
- Delete tasks
- Complete tasks
- Optional notes
- One-time tasks
- Optional scheduled date or due date for one-time tasks (not both; recurring tasks use neither)

### Recurring Tasks

- Daily
- Specific weekdays
- X times per week

### Dashboard / Today

- Show tasks relevant for today (for one-time tasks with dates, see "Dates of One-Time Tasks" in `data-model.md`)
- Complete tasks directly from the dashboard
- Show current weekly progress

### Weekly Overview

- Seven-day weekly view
- Show scheduled tasks for each day
- Show weekly-frequency tasks
- Navigate between weeks

### Progress

- Weekly completion rate
- Current streak
- Weekly change compared with the previous week
- Daily completion overview for the current week
- Weekly completion visualization
- Progress grouped by life area

### Settings

- Theme color selection:
  - Pink
  - Purple
  - Blue
  - Green
  - Red
- Week start preference
- Daily check-in preference with time and on/off state
- Life area selection:
  - Career
  - Fitness
  - Health
  - Learning
  - Personal
  - Finance

Settings must persist for the authenticated user.

The daily check-in setting is stored in the MVP, but actual reminder delivery or notifications are not part of the MVP.

### Persistence

- Store users, tasks, recurrence information and completions in MySQL

### Basic Application States

- Loading states where necessary
- Useful error states
- Empty states

## Not Included in MVP

- Goals
- Journal
- Separate habit tracking
- AI features
- Google Calendar integration
- Actual notification/reminder delivery
- Advanced analytics beyond the defined Progress screen
- Animations
- Social features

## MVP Success

The MVP is complete when a user can:

1. Create an account and log in.
2. Create one-time and recurring tasks.
3. See what needs to be done today.
4. Complete tasks.
5. View the current week.
6. Understand their weekly progress.
7. Log out and later return to their persisted data.
