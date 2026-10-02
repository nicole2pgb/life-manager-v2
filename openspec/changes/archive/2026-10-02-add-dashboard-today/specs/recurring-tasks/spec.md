# Spec Delta

## MODIFIED Requirements

### Requirement: Recurring-task behavior has a defined boundary with later features
This capability SHALL NOT provide a Today/Dashboard view, a Weekly Overview, Progress calculations, reminders or notifications, a settings screen, a configurable week start, completion for past or future dates, or detection of missed occurrences. Those features SHALL reuse the relevance, week and completion definitions of this capability rather than redefine them. Which tasks appear in Today, and how many occurrences a task plans in a week (including how creation dates are treated, and how a times-per-week task is placed in its creation week), are defined by the dashboard-today capability, which builds on this one without changing the relevance definition; relevance itself still does not depend on the creation date. Decisions that belong to later features (which tasks appear on which day of a navigated week, how week start from settings is applied, how progress is rated beyond the weekly summary) are made in their own changes and SHALL reuse those shared planned-occurrence definitions.

#### Scenario: No later-feature screens
- **WHEN** this change is implemented
- **THEN** no Today, Weekly Overview, Progress, settings or notification behavior is added, and the recurrence definitions are available for those features to use

#### Scenario: Today and weekly planning defined elsewhere
- **WHEN** Today or weekly progress needs to know which tasks are relevant or how many occurrences are planned
- **THEN** it uses the relevance definition of this capability together with the planned-occurrence definition of the dashboard-today capability, and creation dates affect planned occurrences but never relevance
