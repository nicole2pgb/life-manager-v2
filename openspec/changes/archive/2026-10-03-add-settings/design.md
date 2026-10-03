# Design

## Context

- `user_settings` already exists (`db/schema.ts`, migration 0000): `user_id` primary key with cascade, `theme_color`, `week_start` (`Monday`/`Sunday`), `daily_check_in_enabled`, `daily_check_in_time` (TIME, default 09:00), `life_areas` (JSON, default all six). Registration does **not** create a row. Nothing reads the table yet.
- Week handling: `startOfWeek` / `endOfWeek` in `lib/dates/calendar-date.ts` already take a `WeekStartDay` argument defaulting to Monday. Call sites that rely on the default, and must change together (listed in `docs/architecture.md`): `lib/tasks/planning.ts` (`todayStatus`, `weekOccurrences`, `summarizeWeek`), `lib/tasks/recurrence.ts` call sites, `lib/tasks/dashboard.ts`, `lib/tasks/weekly-overview.ts` (`resolveWeek`, `adjacentWeeks`, `buildWeeklyOverview`), `lib/tasks/progress.ts`, and `db/tasks.ts` (`weekCompletions`, `getDashboard`, `getWeeklyOverview`, `getProgress`, completion at ~L448). The Weekly Overview page also prints "Weeks start on Monday".
- Authentication: `getCurrentUser()` is the only source of the user id; data access functions take `userId` and filter by it (`docs/architecture.md`). `app/(app)/layout.tsx` already guards the protected group.
- Theme: `app/globals.css` defines `--accent` (pink `#ec6aab`) and Tailwind maps `bg-accent`, `text-accent`, `bg-accent/15` etc. to it. Components already use these tokens, so changing the variable re-themes them.
- Forms: Server Actions with `useActionState` and a form-state module (`lib/tasks/form-state.ts`, `lib/auth/form-state.ts`), server-side validation in `lib/*/validation.ts`.

## Goals / Non-Goals

**Goals:**
- Persist settings per user with defaults and no migration.
- Apply the theme on first render of every protected page.
- Make week start a single value that flows to every week-based computation, so screens cannot disagree.
- Keep recurrence weekday numbering, stored dates and completions untouched.

**Non-Goals:**
- Notifications, scheduling or any delivery for the daily check-in.
- Light theme, custom colors, per-user time zone, user menu dropdown.
- Filtering Progress by selected life areas.

## Decisions

### 1. Lazy defaults with upsert, no row creation at registration
`db/settings.ts` exposes `getUserSettings(userId)` returning the row or the defaults (a single `DEFAULT_SETTINGS` constant mirroring the column defaults), and `saveUserSettings(userId, values)` using `INSERT ... ON DUPLICATE KEY UPDATE`. Existing users need no backfill, and registration stays untouched.
*Alternative:* create the row in `createUser` plus a backfill migration. Rejected: more moving parts, a data migration and a registration failure mode for no user benefit.

### 2. One read per request, week start threaded as an argument
Pages and Server Actions call `getUserSettings(user.id)` once and pass `weekStart` explicitly down to `db/tasks.ts` functions and the pure `lib/tasks/*` functions (a required parameter, no default, so TypeScript flags every missed call site). The pure planning/recurrence/progress modules stay free of database access and clock, as today.
*Alternative:* have each `db/tasks.ts` function read the setting itself. Rejected: hidden extra queries, harder to test, and the pure modules would still need the argument. Since `getUserSettings` is called from several server components in one request, wrap it in React `cache()` to avoid duplicate queries.
Removing the Monday default from `startOfWeek`/`endOfWeek` call sites (keep the default parameter in the date helper itself, but app code always passes the user's value) makes "forgot to pass it" greppable.

### 3. Theme applied by a data attribute on the protected layout wrapper
`app/(app)/layout.tsx` reads settings and renders its wrapper `div` with `data-theme="blue"` (lower-case value). `globals.css` keeps `:root` as Pink and adds `[data-theme="purple"] { --accent: …; }` etc. for the other four. Because accent utilities resolve `var(--accent)` on the element, everything inside re-themes with no component changes and no flash (server-rendered). Auth pages sit outside this group and remain pink without extra work. After a save, `revalidatePath("/", "layout")` makes the layout re-render with the new theme.
*Alternative:* set the attribute on `<html>` in the root layout. Rejected: it would force the auth pages to read the session and become dynamic, and they should stay pink anyway.
*Alternative:* client-side theme provider/localStorage. Rejected: flash of default color and not persisted per user.
Exact hex values for Purple, Blue, Green, Red are chosen at implementation; each must keep `--accent-foreground` text at WCAG AA contrast (4.5:1) on accent backgrounds, otherwise the foreground token is overridden per theme.

### 4. One form, one Save action
A single client form component (radio group for theme and week start, switch + `<input type="time">`, checkbox-style toggles for areas) posts to `saveSettingsAction` via `useActionState`. The action: `getCurrentUser()` → parse `FormData` → `validateSettings` (pure, in `lib/settings/validation.ts`, shared constants `THEME_COLORS`, `WEEK_STARTS`, `LIFE_AREAS` from `db/schema.ts`) → `saveUserSettings` → `revalidatePath` → return success state. Errors are returned per field; entered values are echoed back. The time is normalised to `HH:MM:SS` for the TIME column and shown as `HH:MM`.
*Alternative:* auto-save on each control change as the prototype screenshot (no Save button) suggests. Rejected (product decision): needs per-control actions, optimistic UI and race handling; a Save button gives atomic validation of the combined state. There is no per-control auto-save.

### 5. Life areas: constrain the task form only
`lib/tasks/validation.ts` accepts an `allowedAreas` argument; create passes the user's selected areas, edit passes selected areas plus the task's current area. The create/edit pages offer the same list. Progress, Today, Weekly Overview and the task list are unchanged and still show all six areas, so life-area numbers keep adding up to the weekly totals.
*Alternative:* hide deselected areas in Progress too. Rejected (product decision): changes an existing requirement ("covers all six areas") and breaks the totals invariant. Existing tasks are never hidden or rewritten.

### 6. Week start is a stored preference, not a data change
No task, rule or completion is rewritten when the week start changes; every week boundary is recomputed from the date arithmetic at read time. Switching back restores identical numbers. Recurrence weekday numbers stay ISO (Monday = 1). The recurring-task weekday selector in the task form stays visually ordered Monday through Sunday regardless of the week start (product decision); the week start affects week calculations and week-based views only, so `components/tasks/task-form.tsx` is not changed.

### 7. Tests
Pure functions (validation, `planning`/`recurrence`/`progress`/`weekly-overview` with `weekStart = "Sunday"`) get unit tests in the existing Vitest files. DB functions follow the existing `db/*.test.ts` pattern, including cross-user isolation and upsert idempotence. Actions follow `app/(app)/tasks/actions.test.ts`.

## Risks / Trade-offs

- [A call site keeps the Monday default and one screen disagrees] → required `weekStart` parameter on the lib/db functions; a cross-screen test asserting Dashboard, Weekly Overview and Progress cover the same dates for both week starts; grep for `startOfWeek(`/`endOfWeek(` without a second argument in the final check.
- [Weekly Overview `?week=` links bookmarked under one week start land on a different week after the setting changes] → acceptable: any date selects "its" week; documented in the spec.
- [Changing week start mid-week changes "this week" numbers immediately] → expected and stated in the spec; nothing is stored.
- [Theme contrast] → verify AA contrast per theme; per-theme `--accent-foreground` override if needed.
- [Deselected area still on old tasks] → intentional; edit form keeps the task's current area.
- [`revalidatePath` on the whole layout re-renders every page] → negligible at MVP scale.

## Migration Plan

No schema or data migration. Deploy the code; users without a row get defaults. Rollback is a plain code revert; any saved rows remain harmless.

## Confirmed Product Decisions

Confirmed by the product owner before implementation; no open questions remain.

1. **Life areas:** deselecting an area affects task create/edit choices only. Existing tasks keep their area and are never hidden or rewritten. Progress keeps accounting for all six areas.
2. **Save model:** one explicit Save button; no per-control auto-save.
3. **Daily check-in:** default off at 09:00; persistence only. No notifications, scheduling, reminders or background jobs.
4. **Weekday selector:** stays Monday–Sunday even with a Sunday week start.
5. **Navigation:** a normal "Settings" link beside "Profile". The user-menu dropdown from `user-menu.png` is not part of this change.
