# Architecture

## General

Life Manager uses a simple full-stack Next.js architecture.

The architecture should stay understandable and MVP-focused.
Avoid unnecessary abstractions and over-engineering.

## Source of Truth

The server and persisted database state are the source of truth.

The UI may show temporary interaction states, but persisted application data must come from the server.

## Data Access

UI components must not access MySQL directly.

Database operations should be separated from presentation components.

Flow:

UI → Server Logic → Data Access → MySQL

## User Data

Every user-owned entity must be associated with the authenticated user.

Users must never be able to access or modify another user's tasks or completions.

## Task Logic

Task business logic should be separated from UI rendering.

This includes:

- Task scheduling
- Recurrence calculations
- Completion calculations
- Weekly calculations
- Progress calculations

The same business logic should be reusable across different views.

## Recurrence

Recurrence logic must not be implemented independently inside individual UI components.

Supported recurrence types:

- None / one-time
- Daily
- Specific weekdays
- X times per week

## Authentication

Authentication is handled server-side using session-based authentication.

Passwords must never be stored as plain text.

## MVP Principle

Prefer the simplest implementation that correctly supports the MVP.

Do not introduce additional services, abstractions or infrastructure unless they solve a current requirement.
