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

- [ ] Create task
- [ ] Edit task
- [ ] Delete task
- [ ] Complete task
- [ ] One-time tasks
- [ ] Notes
- [ ] Life areas

### 4. Recurring Tasks

- [ ] Daily recurrence
- [ ] Specific weekdays
- [ ] X times per week
- [ ] Completion tracking for recurring tasks

### 5. Dashboard / Today

- [ ] Today's relevant tasks
- [ ] Complete tasks from dashboard
- [ ] Weekly progress summary
- [ ] Appropriate empty states

### 6. Weekly Overview

- [ ] Seven-day week view
- [ ] Scheduled tasks per day
- [ ] Weekly-frequency tasks
- [ ] Previous / next week navigation
- [ ] Respect user's week-start preference

### 7. Progress

- [ ] Weekly completion rate
- [ ] Current streak
- [ ] Weekly change
- [ ] Daily completion chart
- [ ] Weekly completion visualization
- [ ] Progress by life area

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
