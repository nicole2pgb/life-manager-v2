# Product Backlog

This backlog defines the implementation order for the Life Manager MVP.

Detailed requirements for larger features should be defined through OpenSpec before implementation.

## MVP

### 1. Project Foundation

- [ ] Configure project structure
- [ ] Install required dependencies
- [ ] Configure MySQL
- [ ] Configure Drizzle ORM
- [ ] Create initial database schema
- [ ] Create initial migration

### 2. Authentication & User Account

- [ ] User registration
- [ ] User login
- [ ] Session management
- [ ] Protected application routes
- [ ] User profile
- [ ] User menu
- [ ] Logout
- [ ] User data isolation

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
- [ ] Respect user's week-start preference (deferred to Settings: Monday–Sunday is fixed until then, and all week-based behavior must change together)

### 7. Progress

- [x] Weekly completion rate
- [x] Current streak
- [x] Weekly change
- [x] Daily completion chart
- [x] Weekly completion visualization
- [x] Progress by life area

### 8. Settings

- [ ] Theme color selection
- [ ] Persist selected theme
- [ ] Week-start preference
- [ ] Daily check-in preference
- [ ] Daily check-in time
- [ ] Life-area selection

Note: Daily check-in notifications are not delivered in the MVP.

### 9. MVP Quality

- [ ] Loading states
- [ ] Error states
- [ ] Form validation
- [ ] Responsive layout
- [ ] Complete core user flow test
- [ ] Lint
- [ ] Build
- [ ] Final code review

## Later / Post-MVP

- [ ] Journal
- [ ] Goals
- [ ] Separate habit tracking
- [ ] Real notifications
- [ ] Google Calendar integration
- [ ] AI features
- [ ] Advanced analytics
- [ ] Animations
- [ ] Deployment / production hosting
