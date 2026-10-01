# UI Guidelines

## Design Goal

The production UI should follow the validated Lovable prototype as closely as reasonably possible while remaining functional and responsive.

Reference screenshots are stored in:

docs/ui-reference/

## General Style

- Dark dashboard interface
- Pink accent color
- Clean and modern appearance
- Rounded cards and controls
- Clear visual hierarchy
- Consistent spacing
- Minimal visual clutter

## Layout

### Desktop

- Persistent navigation sidebar on the left
- Main content area on the right
- Dashboard content organized in cards and sections
- Important information should be visible without unnecessary navigation

### Mobile

- Layout must remain usable on smaller screens
- Content may stack vertically
- Navigation may adapt for mobile
- No horizontal overflow

## Components

Prefer reusable components for repeated UI patterns such as:

- Navigation
- Task cards
- Progress cards
- Buttons
- Forms
- Empty states
- Weekly day columns

Do not create unnecessary abstractions for components that are only used once.

## Interaction

- Completing a task should be quick and obvious.
- Creating and editing tasks should require as few steps as reasonably possible.
- Interactive elements must have clear states.
- Forms should provide useful validation feedback.
- Destructive actions should not be easy to trigger accidentally.

## UI Reference Priority

When implementing a screen:

1. Follow the functional requirements from the OpenSpec change.
2. Use the screenshots as the visual reference.
3. Follow these general UI guidelines.
4. Prefer functionality and usability over pixel-perfect reproduction.

## MVP UI Principle

Do not spend significant development time on:

- Complex animations
- Decorative effects
- Advanced theming
- Pixel-perfect polish

These can be improved after the complete MVP user flow works.

## Available UI References

- `dashboard.png` - Main Today dashboard
- `tasks.png` - Task management screen
- `create-task.png` - Create task form
- `edit-task.png` - Edit task form
- `weekly-overview.png` - Weekly task overview
- `progress.png` - Progress and statistics screen
- `profile.png` - User profile screen
- `settings.png` - Settings screen
- `login.png` - Login screen
- `register.png` - Registration screen
- `user-menu.png` - User menu with profile, settings and logout actions

## Theme Colors

The application uses a dark base theme with a user-selectable accent color.

Supported accent colors:

- Pink
- Purple
- Blue
- Green
- Red

The selected accent color should be applied consistently across interactive and highlighted UI elements.

The default accent color is Pink.
