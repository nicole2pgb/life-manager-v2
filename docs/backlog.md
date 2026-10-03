# Product Backlog

This backlog defines the implementation order for the Life Manager MVP.

Detailed requirements for larger features should be defined through OpenSpec before implementation.

## MVP

### 1. Project Foundation

- [x] Configure project structure
- [x] Install required dependencies
- [x] Configure MySQL
- [x] Configure Drizzle ORM
- [x] Create initial database schema
- [x] Create initial migration

### 2. Authentication & User Account

- [x] User registration
- [x] User login
- [x] Session management
- [x] Protected application routes
- [x] User profile
- [x] User menu (Profile and Settings in the top navigation, logout on Profile; dropdown is post-MVP)
- [x] Logout
- [x] User data isolation

### 3. Task Management

- [x] Create task
- [x] Edit task
- [x] Delete task
- [x] Complete task
- [x] One-time tasks
- [x] Optional scheduled date for one-time tasks
- [x] Optional due date for one-time tasks
- [x] Notes
- [x] Life areas

### 4. Recurring Tasks

- [x] Daily recurrence
- [x] Specific weekdays
- [x] X times per week
- [x] Completion tracking for recurring tasks

### 5. Dashboard / Today

- [x] Today's relevant tasks
- [x] Complete tasks from dashboard
- [x] Weekly progress summary
- [x] Appropriate empty states

### 6. Weekly Overview

- [x] Seven-day week view
- [x] Scheduled tasks per day
- [x] Weekly-frequency tasks
- [x] Previous / next week navigation
- [x] Respect user's week-start preference

### 7. Progress

- [x] Weekly completion rate
- [x] Current streak
- [x] Weekly change
- [x] Daily completion chart
- [x] Weekly completion visualization
- [x] Progress by life area

### 8. Settings

- [x] Theme color selection
- [x] Persist selected theme
- [x] Week-start preference
- [x] Daily check-in preference
- [x] Daily check-in time
- [x] Life-area selection

Note: Daily check-in notifications are not delivered in the MVP.

### 9. MVP Quality

- [x] Loading states
- [x] Error states
- [x] Form validation
- [x] Responsive layout
- [x] Complete core user flow test
- [x] Lint
- [x] Build
- [x] Final code review

## Later / Post-MVP

- [ ] Sidebar navigation, mobile navigation pattern and user-menu dropdown
- [ ] Journal
- [ ] Goals
- [ ] Separate habit tracking
- [ ] Real notifications
- [ ] Google Calendar integration
- [ ] AI features
- [ ] Advanced analytics
- [ ] Animations
- [ ] Deployment / production hosting
