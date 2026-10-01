# Data Model

## Overview

The MVP uses four main data concepts:

- User
- Task
- Recurrence Rule
- Task Completion

Relationships:

User
└── Tasks
├── Recurrence Rule
└── Task Completions

All user data must be isolated by user.

---

## User

Represents a registered Life Manager user.

Required information:

- id
- name
- email
- password hash
- created at

Rules:

- Email must be unique.
- Passwords must never be stored as plain text.
- A user can only access their own data.

---

## Task

Represents something the user wants to complete.

Information:

- id
- user id
- title
- notes (optional)
- created at
- updated at
- life area

A task can be:

- One-time
- Recurring

A task always belongs to exactly one user.

---

## Recurrence Rule

Defines when a recurring task should appear.

Supported types:

### None / One-time

The task does not repeat.

### Daily

The task is scheduled every day.

### Specific Weekdays

The task is scheduled on selected weekdays.

Example:

Monday + Thursday

### Times Per Week

The task has a weekly completion target without fixed weekdays.

Example:

Gym → 3 times per week

---

## Task Completion

Represents the completion of a task on a specific date.

Information:

- id
- task id
- completion date
- created at

This allows recurring tasks to remain as tasks while individual occurrences can be completed independently.

Example:

Gym
Weekly target: 3

Monday → completed
Wednesday → completed
Friday → completed

The Gym task itself is not deleted or permanently marked as completed.

---

## User Settings

Represents persisted preferences for a user.

Information includes:

- user id
- theme color
- week start
- daily check-in enabled
- daily check-in time
- selected life areas

Supported theme colors:

- Pink
- Purple
- Blue
- Green
- Red

Supported life areas:

- Career
- Fitness
- Health
- Learning
- Personal
- Finance

Rules:

- Settings belong to exactly one user.
- Settings must persist between sessions.
- Changing the theme color should update the application's accent color.
- Daily check-in configuration does not send actual notifications in the MVP.

---

## Progress

Progress is calculated from tasks, recurrence rules and task completions.

It is not a separate primary data entity in the MVP.

Calculated values include:

- Weekly completion rate
- Current streak
- Weekly change compared with the previous week
- Daily completion for the current week
- Weekly completion visualization
- Completion progress by life area

---

## Data Principles

- Persist application data in MySQL.
- Use Drizzle ORM for database access.
- Store dates consistently.
- Do not duplicate calculated progress data unless necessary.
- Deleting a task must also handle its associated recurrence and completion data safely.
